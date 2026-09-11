/**
 * The walker.
 *
 * First-person movement at eye height through a city made of real footprints.
 * Collision is deliberately simple: every building contributes a bounding box to
 * a coarse grid, and the walker is pushed out of any box it enters. At human
 * walking speed, against thousands of rectangles, that is exact enough to feel
 * solid and cheap enough to run every frame.
 */

import * as THREE from "three";
import { clamp } from "../util/dom.ts";
import type { BakedWorld } from "./city.ts";

/** Eye height above the ground, in metres. */
const EYE = 1.68;
const WALK = 3.1;
const RUN = 7.4;
/** How far the walker's shoulders reach, used for collision. */
const RADIUS = 0.55;
const CELL = 14;

interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface WalkerState {
  x: number;
  z: number;
  /** Yaw in radians, 0 looking down +Z. */
  yaw: number;
  pitch: number;
  moving: boolean;
  running: boolean;
  /**
   * Ground speed in metres per second, eased toward the wanted speed.
   *
   * Instant velocity is the other half of why walking felt wrong: a walker that
   * is at full pace on the first frame and stopped dead on the last has no
   * weight, and no gait animation can be driven convincingly from it.
   */
  speed: number;
}

export class Walker {
  readonly camera: THREE.PerspectiveCamera;
  state: WalkerState;

  private keys = new Set<string>();
  private boxes: Box[] = [];
  private grid = new Map<string, number[]>();
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  private drag = { active: false, x: 0, y: 0 };
  private headBob = 0;
  private enabled = true;
  private thirdPerson = true;

  constructor(camera: THREE.PerspectiveCamera, world: BakedWorld, start: { x: number; z: number; yaw?: number }) {
    this.camera = camera;
    this.state = {
      x: start.x,
      z: start.z,
      yaw: start.yaw ?? 0,
      pitch: -0.04,
      moving: false,
      running: false,
      speed: 0,
    };

    // Collect bounding boxes and index them into a coarse grid.
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    world.buildings.forEach((b, index) => {
      let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
      for (let i = 0; i < b.f.length; i += 2) {
        const x = b.f[i];
        const z = b.f[i + 1];
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (z < bz0) bz0 = z;
        if (z > bz1) bz1 = z;
      }
      // Low walls and steps are walked over rather than blocked.
      const box: Box = { minX: bx0, maxX: bx1, minZ: bz0, maxZ: bz1, height: b.h };
      const idx = this.boxes.push(box) - 1;
      if (b.h < 1.4) return;

      const gx0 = Math.floor(bx0 / CELL), gx1 = Math.floor(bx1 / CELL);
      const gz0 = Math.floor(bz0 / CELL), gz1 = Math.floor(bz1 / CELL);
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let gz = gz0; gz <= gz1; gz++) {
          const key = `${gx},${gz}`;
          const list = this.grid.get(key);
          if (list) list.push(idx);
          else this.grid.set(key, [idx]);
        }
      }
      void index;

      if (bx0 < minX) minX = bx0;
      if (bx1 > maxX) maxX = bx1;
      if (bz0 < minZ) minZ = bz0;
      if (bz1 > maxZ) maxZ = bz1;
    });

    this.bounds = { minX: minX - 60, maxX: maxX + 60, minZ: minZ - 60, maxZ: maxZ + 60 };
    // A start that happens to fall inside a building would be trapped: collision
    // rejects every direction, so the walker could never move again.
    this.resolve();
    this.sync();
  }

  /**
   * Push the walker out of any building it is standing inside, along whichever
   * axis is the shorter way out. Runs on spawn and on every teleport.
   */
  private resolve(): void {
    for (let pass = 0; pass < 8; pass++) {
      const s = this.state;
      const gx = Math.floor(s.x / CELL);
      const gz = Math.floor(s.z / CELL);
      let moved = false;

      // Check the cell and its neighbours: a footprint can span several cells.
      for (let dx = -1; dx <= 1 && !moved; dx++) {
        for (let dz = -1; dz <= 1 && !moved; dz++) {
          const near = this.grid.get(`${gx + dx},${gz + dz}`);
          if (!near) continue;
          for (const i of near) {
            const b = this.boxes[i];
            if (b.height < 1.4) continue;
            if (s.x + RADIUS <= b.minX || s.x - RADIUS >= b.maxX) continue;
            if (s.z + RADIUS <= b.minZ || s.z - RADIUS >= b.maxZ) continue;

            // Distances to each edge, plus a margin to clear the wall.
            const left = s.x - (b.minX - RADIUS - 0.4);
            const right = b.maxX + RADIUS + 0.4 - s.x;
            const back = s.z - (b.minZ - RADIUS - 0.4);
            const front = b.maxZ + RADIUS + 0.4 - s.z;
            const best = Math.min(left, right, back, front);
            if (best === left) s.x = b.minX - RADIUS - 0.4;
            else if (best === right) s.x = b.maxX + RADIUS + 0.4;
            else if (best === back) s.z = b.minZ - RADIUS - 0.4;
            else s.z = b.maxZ + RADIUS + 0.4;
            moved = true;
            break;
          }
        }
      }
      if (!moved) return;
    }

    // Still stuck after pushing out of each box in turn. That happens where
    // buildings crowd together — the Castle's outbuildings, say — and being
    // pushed clear of one lands you inside the next. Search outward for a spot
    // that is genuinely free rather than leaving the walker wedged, where every
    // direction is blocked and the walk appears broken.
    const s = this.state;
    for (let ring = 1; ring <= 14; ring++) {
      const step = ring * 2.5;
      const samples = 8 + ring * 4;
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const x = s.x + Math.cos(angle) * step;
        const z = s.z + Math.sin(angle) * step;
        if (!this.blockedAt(x, z)) {
          s.x = x;
          s.z = z;
          return;
        }
      }
    }
  }

  /** Turn movement on or off — used while a panel is open. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.state.moving = false;
    }
  }

  get isMoving(): boolean {
    return this.state.moving;
  }

  /** Place the walker somewhere, immediately, and make sure it is not in a wall. */
  place(x: number, z: number, yaw: number): void {
    this.state.x = x;
    this.state.z = z;
    this.state.yaw = yaw;
    this.resolve();
    this.sync();
  }

  /**
   * Turn to face the most open direction.
   *
   * Spawning at a street vertex regularly puts a wall directly ahead, and a walk
   * that begins with the forward key doing nothing reads as broken even though
   * the collision is working exactly as intended. Sampling the compass and
   * choosing the longest clear line costs a few hundred tests once.
   */
  faceOpenDirection(): void {
    let best = this.state.yaw;
    let bestClear = -1;
    const probes = 24;
    for (let i = 0; i < probes; i++) {
      const yaw = (i / probes) * Math.PI * 2;
      const dx = Math.sin(yaw);
      const dz = Math.cos(yaw);
      let clear = 0;
      // Walk forward in metre steps until something solid is in the way.
      for (let d = 1; d <= 70; d += 2) {
        if (this.blockedAt(this.state.x + dx * d, this.state.z + dz * d)) break;
        clear = d;
      }
      if (clear > bestClear) {
        bestClear = clear;
        best = yaw;
      }
    }
    this.state.yaw = best;
    this.sync();
  }

  /** Is a point inside any solid building? */
  private blockedAt(x: number, z: number): boolean {
    const gx = Math.floor(x / CELL);
    const gz = Math.floor(z / CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const near = this.grid.get(`${gx + dx},${gz + dz}`);
        if (!near) continue;
        for (const i of near) {
          const b = this.boxes[i];
          if (b.height < 1.4) continue;
          if (x + RADIUS > b.minX && x - RADIUS < b.maxX && z + RADIUS > b.minZ && z - RADIUS < b.maxZ) return true;
        }
      }
    }
    return false;
  }

  /** Point the walker at a target, keeping its position. */
  lookAt(x: number, z: number): void {
    this.state.yaw = Math.atan2(x - this.state.x, z - this.state.z);
    this.sync();
  }

  attach(target: HTMLElement): () => void {
    const onKeyDown = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.key === "Shift") this.state.running = true;
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (e.key === "Shift") this.state.running = false;
    };
    const onBlur = (): void => {
      this.keys.clear();
      this.state.running = false;
    };

    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return;
      this.drag.active = true;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      target.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (!this.drag.active || !this.enabled) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.state.yaw -= dx * 0.0035;
      this.state.pitch = Math.max(-0.9, Math.min(0.75, this.state.pitch - dy * 0.0028));
    };
    const onPointerUp = (e: PointerEvent): void => {
      this.drag.active = false;
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerUp);
    };
  }

  /** Advance by `dt` seconds. */
  update(dt: number): void {
    const s = this.state;
    if (!this.enabled) {
      this.sync();
      return;
    }

    let forward = 0;
    let strafe = 0;
    if (this.keys.has("w") || this.keys.has("ArrowUp")) forward += 1;
    if (this.keys.has("s") || this.keys.has("ArrowDown")) forward -= 1;
    if (this.keys.has("a") || this.keys.has("ArrowLeft")) strafe -= 1;
    if (this.keys.has("d") || this.keys.has("ArrowRight")) strafe += 1;

    const moving = forward !== 0 || strafe !== 0;
    s.moving = moving;

    // Ease toward the wanted speed rather than snapping to it. Acceleration is
    // quicker than deceleration, which is how a person actually moves.
    const wanted = moving ? (s.running ? RUN : WALK) : 0;
    const rate = wanted > s.speed ? 9 : 7;
    s.speed += (wanted - s.speed) * Math.min(1, dt * rate);
    if (s.speed < 0.02) s.speed = 0;

    if (moving) {
      const len = Math.hypot(forward, strafe);
      // Yaw is measured from +Z, so forward is (sin, cos).
      const dirX = (Math.sin(s.yaw) * forward + Math.cos(s.yaw) * strafe) / len;
      const dirZ = (Math.cos(s.yaw) * forward - Math.sin(s.yaw) * strafe) / len;
      const step = s.speed * dt;

      // Move one axis at a time so an obstacle on x does not cancel motion on z:
      // sliding along a wall instead of sticking to it.
      this.moveBy(dirX * step, 0);
      this.moveBy(0, dirZ * step);

      // A small bob, scaled by pace, so walking has weight.
      this.headBob += dt * (s.running ? 13 : 8);
    } else {
      this.headBob *= Math.max(0, 1 - dt * 6);
    }

    this.sync();
  }

  /** Move along one axis, then resolve any overlap on that axis. */
  private moveBy(dx: number, dz: number): void {
    const s = this.state;
    const nx = s.x + dx;
    const nz = s.z + dz;

    const gx = Math.floor(nx / CELL);
    const gz = Math.floor(nz / CELL);
    let blocked = false;
    const near = this.grid.get(`${gx},${gz}`);
    if (near) {
      for (const i of near) {
        const b = this.boxes[i];
        if (b.height < 1.4) continue;
        if (
          nx + RADIUS > b.minX &&
          nx - RADIUS < b.maxX &&
          nz + RADIUS > b.minZ &&
          nz - RADIUS < b.maxZ
        ) {
          blocked = true;
          break;
        }
      }
    }

    if (!blocked && nx > this.bounds.minX && nx < this.bounds.maxX && nz > this.bounds.minZ && nz < this.bounds.maxZ) {
      s.x = nx;
      s.z = nz;
    }
  }

  /**
   * Aim the camera.
   *
   * In first person the camera is the head. In third person it sits behind and
   * above the figure on an orbit controlled by pitch — which is what makes the
   * city legible: you can see the figure, and therefore see the scale and the
   * pace, instead of a wall sliding past at eye height.
   */
  private sync(): void {
    const s = this.state;
    this.camera.rotation.order = "YXZ";

    if (this.thirdPerson) {
      const bob = this.headBob === 0 ? 0 : Math.sin(this.headBob) * 0.02;
      // Elevation from pitch: more downward pitch lifts the camera and looks
      // down on the figure.
      const elevation = clamp(0.26 - s.pitch, 0.02, 1.15);
      const distance = 5.2;
      const horizontal = distance * Math.cos(elevation);
      const vertical = distance * Math.sin(elevation);

      const targetX = s.x;
      const targetZ = s.z;
      const targetY = 1.3 + bob;

      // Seen from directly behind, a walk shows almost nothing: the legs swing
      // fore and aft, which is exactly the axis pointing away from the viewer.
      // Swinging the camera round to a three-quarter angle puts the stride
      // across the frame, where it reads.
      const OFFSET = 0.42; // radians, about 24°
      const camYaw = s.yaw + OFFSET;
      const behindX = Math.sin(camYaw);
      const behindZ = Math.cos(camYaw);

      const desiredX = targetX - behindX * horizontal;
      const desiredZ = targetZ - behindZ * horizontal;
      const desiredY = Math.max(0.55, targetY + vertical - 1.35 + 1.35);

      // Pull the camera in if the place it wants to be is inside a building.
      // Without this, standing with your back to a wall puts the camera inside
      // the wall and the view becomes the inside of a box.
      let reach = 1;
      for (let step = 1; step <= 8; step++) {
        const t = step / 8;
        const px = targetX + (desiredX - targetX) * t;
        const pz = targetZ + (desiredZ - targetZ) * t;
        if (this.blockedAt(px, pz)) {
          reach = Math.max(0.18, (step - 1) / 8);
          break;
        }
      }

      this.camera.position.set(
        targetX + (desiredX - targetX) * reach,
        targetY + (desiredY - targetY) * reach,
        targetZ + (desiredZ - targetZ) * reach,
      );
      this.camera.lookAt(targetX, targetY, targetZ);
      return;
    }

    const bob = this.headBob === 0 ? 0 : Math.sin(this.headBob) * 0.035;
    this.camera.position.set(s.x, EYE + bob, s.z);
    this.camera.rotation.y = s.yaw;
    this.camera.rotation.x = s.pitch;
    this.camera.rotation.z = 0;
  }

  /** First person puts the camera in the head; third person stands it behind. */
  setThirdPerson(enabled: boolean): void {
    this.thirdPerson = enabled;
    this.sync();
  }

  get isThirdPerson(): boolean {
    return this.thirdPerson;
  }
}
