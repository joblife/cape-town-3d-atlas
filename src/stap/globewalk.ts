/**
 * Walking the globe.
 *
 * The city is wrapped onto a sphere (see `spherical` in city.ts), and this moves
 * the camera *over* that surface rather than around it: you are standing on the
 * little planet looking across its curve, and you can walk it. That is a
 * different feeling from an orbit — the horizon falls away in every direction,
 * which is what makes it read as a world rather than a model.
 *
 * Position is held as a direction from the sphere's centre, so there is no
 * gimbal to fall into at the poles and no wrapping maths: walking is a rotation
 * about the axis perpendicular to the current heading.
 */

import * as THREE from "three";

/** How far ahead the camera aims, as an angle on the sphere. Roughly a
 *  kilometre of ground at this radius, which puts the horizon near mid-frame. */
const AIM_ANGLE = 0.62;

/** How high the eye sits above the surface, in metres. */
const EYE = 1.75;
const MIN_HEIGHT = 1.75;
const MAX_HEIGHT = 2600;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export interface GlobeCameraState {
  /** Unit vector from the sphere's centre to the walker. */
  up: THREE.Vector3;
  /** Unit tangent vector: the direction the walker faces. */
  forward: THREE.Vector3;
  /** Height above the surface, in metres. */
  height: number;
  /** Roll of the head, radians, for looking up and down. */
  pitch: number;
}

export class GlobeWalk {
  readonly camera: THREE.PerspectiveCamera;
  readonly radius: number;

  private up: THREE.Vector3;
  private forward: THREE.Vector3;
  private wantedHeight: number;
  private height: number;
  private pitch: number;
  private wantedPitch: number;

  private drag = { active: false, x: 0, y: 0 };
  private keys = new Set<string>();
  private enabled = true;
  private pivot = new THREE.Vector3();
  private axis = new THREE.Vector3();
  private scratch = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, radius: number, start: { lon: number; lat: number; heading?: number }) {
    this.camera = camera;
    this.radius = radius;
    this.up = surfaceNormal(start.lon, start.lat);
    this.forward = tangentFor(this.up, start.heading ?? 0);
    this.height = 60;
    this.wantedHeight = 60;
    this.pitch = -0.12;
    this.wantedPitch = -0.12;
    this.sync();
  }

  attach(element: HTMLElement): () => void {
    const onPointerDown = (e: PointerEvent): void => {
      if (!this.enabled) return;
      this.drag.active = true;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      element.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (!this.drag.active || !this.enabled) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      // Dragging turns the walker on the spot and tilts the head; the world
      // stays put, as when you turn to look at something.
      this.turn(-dx * 0.0042);
      this.wantedPitch = clamp(this.wantedPitch - dy * 0.0032, -1.1, 0.85);
    };
    const onPointerUp = (e: PointerEvent): void => {
      this.drag.active = false;
      if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
    };
    const onWheel = (e: WheelEvent): void => {
      if (!this.enabled) return;
      e.preventDefault();
      this.wantedHeight = clamp(this.wantedHeight * Math.exp(e.deltaY * 0.0012), MIN_HEIGHT, MAX_HEIGHT);
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

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** How high the eye sits above the surface. The overview is just height. */
  setHeight(height: number): void {
    this.wantedHeight = clamp(height, MIN_HEIGHT, MAX_HEIGHT);
  }

  /** Where the walker is, in the scene. */
  get positionNow(): THREE.Vector3 {
    return this.position.clone();
  }

  /** Aim the walker at a point on the globe. */
  lookAt(lon: number, lat: number): void {
    this.up.copy(surfaceNormal(lon, lat));
    this.sync();
  }

  /**
   * Stand a little way off a point and face it.
   *
   * The standoff walks *back along the same great circle the landmark lies on*,
   * toward the globe's axis — not along an arbitrary tangent. That matters more
   * than it sounds: stepping off sideways lands the walker on the far side of
   * the city from the place they asked to see, and distances of a kilometre are
   * easy to accumulate on a world this size. Going back along the radial means
   * the walker stays between the landmark and the city centre, so the city is
   * always behind the thing being looked at.
   */
  standOff(lon: number, lat: number, distance: number, lift = 0): void {
    const target = surfaceNormal(lon, lat);
    // The great circle through `target` and the pole is the mapping's own radial,
    // so the axis of that rotation is target × pole.
    this.axis.crossVectors(target, new THREE.Vector3(0, 1, 0));
    if (this.axis.lengthSq() < 1e-6) this.axis.set(1, 0, 0);
    this.axis.normalize();

    const back = distance / this.radius;
    this.pivot.copy(target).applyAxisAngle(this.axis, back).normalize();
    this.up.copy(this.pivot);

    // Face the landmark.
    this.forward.copy(target).addScaledVector(this.up, -target.dot(this.up)).normalize();

    // Eye height scales with how far back we stand, so a wide standoff also
    // lifts the view rather than staring at the ground.
    this.wantedHeight = clamp(Math.max(60, distance * 0.5) + lift, MIN_HEIGHT, MAX_HEIGHT);
    this.height = this.wantedHeight;
    this.wantedPitch = -0.34;
    this.pitch = this.wantedPitch;
    this.sync();
  }

  /** Turn the walker about the local vertical. */
  private turn(radians: number): void {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    // Rodrigues about the up axis: forward is perpendicular to up, so this is a
    // plain rotation in the tangent plane.
    this.axis.crossVectors(this.up, this.forward).normalize();
    this.scratch
      .copy(this.forward)
      .multiplyScalar(cos)
      .addScaledVector(this.axis, sin)
      .normalize();
    this.forward.copy(this.scratch);
  }

  update(dt: number): void {
    if (this.enabled) {
      const WALK = 26 * dt; // metres per step, scaled for a globe this size
      let move = 0;
      let strafe = 0;
      if (this.keys.has("w") || this.keys.has("arrowup")) move += 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) move -= 1;
      if (this.keys.has("a")) strafe -= 1;
      if (this.keys.has("d")) strafe += 1;

      if (move !== 0 || strafe !== 0) {
        const speed = this.keys.has("shift") ? 2.6 : 1;
        const step = WALK * speed;
        const left = this.scratch.crossVectors(this.up, this.forward).normalize().clone();
        // Rotate the up vector about the axis perpendicular to the direction of
        // travel: that is a walk across a sphere.
        if (move !== 0) this.walkAlong(this.forward, move * step);
        if (strafe !== 0) this.walkAlong(left, strafe * step);
      }
    }

    const k = 1 - Math.exp(-dt * 7);
    this.height += (this.wantedHeight - this.height) * k;
    this.pitch += (this.wantedPitch - this.pitch) * k;
    this.sync();
  }

  /** Take a step of `distance` metres along a tangent direction. */
  private walkAlong(direction: THREE.Vector3, distance: number): void {
    const angle = distance / this.radius;
    this.axis.crossVectors(this.up, direction).normalize();
    if (!Number.isFinite(this.axis.x) || this.axis.lengthSq() < 1e-6) return;
    this.pivot.copy(this.up).applyAxisAngle(this.axis, -angle).normalize();
    this.up.copy(this.pivot);
    // Re-square the heading after the step so it stays tangent.
    this.forward.addScaledVector(this.up, -this.forward.dot(this.up)).normalize();
  }

  get position(): THREE.Vector3 {
    return this.scratch.copy(this.up).multiplyScalar(this.radius + this.height);
  }

  /** Where the walker is, in degrees, for a readout. */
  get lonLat(): { lon: number; lat: number } {
    const u = this.up;
    return {
      lat: (Math.asin(clamp(u.y, -1, 1)) * 180) / Math.PI,
      lon: (Math.atan2(u.x, -u.z) * 180) / Math.PI,
    };
  }

  private sync(): void {
    const p = this.position.clone();
    this.camera.position.copy(p);
    this.camera.up.copy(this.up);

    // Aim at the ground ahead, not along the tangent.
    //
    // Pointing along the tangent is the obvious thing and it is wrong: at height
    // the tangent leaves the sphere entirely, so the camera looks up and away and
    // fills the frame with sky. What a person standing on a hill does is look at
    // the ground in front of them. So the target is a point *on the surface*, a
    // rotation away along the heading, with the head pitch lifting or lowering
    // that aim.
    const ahead = this.scratch
      .copy(this.up)
      .applyAxisAngle(this.axis.crossVectors(this.up, this.forward).normalize(), -AIM_ANGLE)
      .normalize();
    const target = ahead.multiplyScalar(this.radius);
    target.addScaledVector(this.up, Math.sin(this.pitch) * this.radius * 0.5);
    this.camera.lookAt(target.x, target.y, target.z);
  }
}

/** The unit normal at a longitude and latitude on the shared sphere mapping. */
export function surfaceNormal(lon: number, lat: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ).normalize();
}

/** A unit tangent at `up`, pointing along a compass heading. */
function tangentFor(up: THREE.Vector3, heading: number): THREE.Vector3 {
  // Any vector not parallel to `up` gives a frame; north is the natural choice.
  const north = new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3().crossVectors(north, up);
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
  east.normalize();
  const forwardNorth = new THREE.Vector3().crossVectors(up, east).normalize();
  return forwardNorth
    .multiplyScalar(Math.cos(heading))
    .addScaledVector(east, Math.sin(heading))
    .normalize();
}

void EYE;

/**
 * Stand an object on the sphere at a point given in the city's flat coordinates.
 *
 * Uses the same azimuthal mapping as `spherical` in city.ts, so a model lands
 * exactly where its geometry was projected. The object is rotated so its own +Y
 * follows the surface normal — otherwise a building on a curved world leans out
 * of the ground — and turned so its +Z faces away from the city's centre, which
 * keeps every landmark's front pointing outward and consistent.
 */
export function placeOnSphere(object: THREE.Object3D, x: number, z: number, radius: number): void {
  const r = Math.hypot(x, z);
  const theta = r / radius;
  const phi = Math.atan2(z, x);

  const position = new THREE.Vector3(
    radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.sin(phi),
  );
  object.position.copy(position);

  const up = position.clone().normalize();
  const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

  // The direction of increasing distance from the city centre, in the tangent
  // plane: the derivative of the mapping with respect to theta.
  const outward = new THREE.Vector3(
    Math.cos(theta) * Math.cos(phi),
    -Math.sin(theta),
    Math.cos(theta) * Math.sin(phi),
  ).normalize();

  // Turn about the normal so the model's +Z lines up with that outward tangent.
  const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(align);
  const twist = new THREE.Quaternion().setFromUnitVectors(facing, outward);

  object.quaternion.copy(twist).multiply(align);
}
