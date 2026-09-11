/**
 * The diorama camera.
 *
 * The city is looked *at*, from above, the way you look at a model on a table.
 * That is not a compromise: this geometry is extruded footprints, which read
 * beautifully in plan — streets, blocks, roofs and green all separate cleanly
 * from above — and read as blank boxes at eye level, where every wall is an
 * untextured plane.
 *
 * Drag turns the model, scroll moves in, and the camera always looks at the
 * city rather than out of it.
 */

import * as THREE from "three";

/** How far the camera may swing from straight down. */
const MIN_PITCH = 0.34; // ~19° above the horizon
const MAX_PITCH = 1.42; // ~81°, nearly plan
const MIN_DIST = 90;
const MAX_DIST = 3200;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export interface CameraState {
  /** Point the camera orbits, in world metres. */
  targetX: number;
  targetZ: number;
  /** Rotation about the target, radians. */
  bearing: number;
  /** Tilt from the ground plane: small is a low glance, large is near-plan. */
  pitch: number;
  /** Distance from target. */
  distance: number;
}

export class DioramaCamera {
  readonly camera: THREE.PerspectiveCamera;
  state: CameraState;

  /** Where the camera is easing toward; pointer input writes here. */
  private wanted: CameraState;
  private drag = { active: false, x: 0, y: 0, button: 0 };
  private keys = new Set<string>();
  private enabled = true;

  constructor(camera: THREE.PerspectiveCamera, start: Partial<CameraState> = {}) {
    this.camera = camera;
    this.state = {
      targetX: start.targetX ?? 0,
      targetZ: start.targetZ ?? 0,
      bearing: start.bearing ?? -0.5,
      pitch: start.pitch ?? 0.92,
      distance: start.distance ?? 900,
    };
    this.wanted = { ...this.state };
    this.sync();
  }

  attach(element: HTMLElement): () => void {
    const onPointerDown = (e: PointerEvent): void => {
      if (!this.enabled) return;
      this.drag.active = true;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.drag.button = e.button;
      element.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (!this.drag.active || !this.enabled) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;

      // Right button (or a modifier) pans the model instead of turning it.
      if (this.drag.button === 2 || e.shiftKey) {
        // Pan scaled by distance so it feels the same at every zoom.
        const scale = this.wanted.distance * 0.0016;
        const cos = Math.cos(this.wanted.bearing);
        const sin = Math.sin(this.wanted.bearing);
        this.wanted.targetX -= (dx * cos - dy * sin) * scale;
        this.wanted.targetZ -= (dx * sin + dy * cos) * scale;
        return;
      }

      this.wanted.bearing -= dx * 0.0055;
      this.wanted.pitch = clamp(this.wanted.pitch + dy * 0.004, MIN_PITCH, MAX_PITCH);
    };

    const onPointerUp = (e: PointerEvent): void => {
      this.drag.active = false;
      if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
    };

    const onWheel = (e: WheelEvent): void => {
      if (!this.enabled) return;
      e.preventDefault();
      // Proportional zoom: a fixed step feels wrong at both ends of the range.
      const factor = Math.exp(e.deltaY * 0.0011);
      this.wanted.distance = clamp(this.wanted.distance * factor, MIN_DIST, MAX_DIST);
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      this.keys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      this.keys.delete(e.key.toLowerCase());
    };
    const onBlur = (): void => this.keys.clear();

    // Two-finger pinch on touch devices.
    let pinch: { distance: number } | null = null;
    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length === 2) {
        pinch = { distance: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) };
      }
    };
    const onTouchMove = (e: TouchEvent): void => {
      if (e.touches.length !== 2 || !pinch) return;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch.distance > 0) {
        this.wanted.distance = clamp(this.wanted.distance * (pinch.distance / d), MIN_DIST, MAX_DIST);
      }
      pinch.distance = d;
    };
    const onTouchEnd = (): void => {
      pinch = null;
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("contextmenu", (e) => e.preventDefault());
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Ease the camera to a place, framing it. */
  focus(x: number, z: number, distance?: number, pitch?: number): void {
    this.wanted.targetX = x;
    this.wanted.targetZ = z;
    if (distance !== undefined) this.wanted.distance = clamp(distance, MIN_DIST, MAX_DIST);
    if (pitch !== undefined) this.wanted.pitch = clamp(pitch, MIN_PITCH, MAX_PITCH);
  }

  /** Jump without easing, for restoring a view. */
  jump(state: Partial<CameraState>): void {
    Object.assign(this.wanted, state);
    Object.assign(this.state, this.wanted);
    this.sync();
  }

  /** Turn to look at a point without moving the target. */
  face(x: number, z: number): void {
    this.wanted.bearing = Math.atan2(x - this.wanted.targetX, z - this.wanted.targetZ) + Math.PI;
  }

  get distance(): number {
    return this.state.distance;
  }

  update(dt: number): void {
    if (this.enabled) {
      // Arrow keys nudge, for anyone who would rather not drag.
      const spin = 1.4 * dt;
      if (this.keys.has("arrowleft") || this.keys.has("a")) this.wanted.bearing -= spin;
      if (this.keys.has("arrowright") || this.keys.has("d")) this.wanted.bearing += spin;
      if (this.keys.has("arrowup") || this.keys.has("w")) this.wanted.distance = clamp(this.wanted.distance * (1 - dt * 0.9), MIN_DIST, MAX_DIST);
      if (this.keys.has("arrowdown") || this.keys.has("s")) this.wanted.distance = clamp(this.wanted.distance * (1 + dt * 0.9), MIN_DIST, MAX_DIST);
    }

    // Critically damped approach, so the model settles rather than stops.
    const k = 1 - Math.exp(-dt * 6);
    this.state.targetX += (this.wanted.targetX - this.state.targetX) * k;
    this.state.targetZ += (this.wanted.targetZ - this.state.targetZ) * k;
    this.state.bearing += (this.wanted.bearing - this.state.bearing) * k;
    this.state.pitch += (this.wanted.pitch - this.state.pitch) * k;
    this.state.distance += (this.wanted.distance - this.state.distance) * k;

    this.sync();
  }

  /** Distance from the camera to the ground beneath it, for level-of-detail. */
  get zoomLevel(): number {
    return this.state.distance;
  }

  private sync(): void {
    const s = this.state;
    const horizontal = s.distance * Math.cos(s.pitch);
    const vertical = s.distance * Math.sin(s.pitch);
    this.camera.position.set(
      s.targetX + Math.sin(s.bearing) * horizontal,
      vertical,
      s.targetZ + Math.cos(s.bearing) * horizontal,
    );
    this.camera.lookAt(s.targetX, 0, s.targetZ);
  }
}
