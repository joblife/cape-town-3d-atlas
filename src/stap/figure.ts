/**
 * A walking figure.
 *
 * Procedurally built and animated: there is no rigged model to load, and for a
 * stylised city of extruded boxes a figure made of boxes is the right register
 * anyway. What matters is that it reads as a person at a glance — proportions,
 * a proper walk cycle, and feet that stay planted.
 *
 * The walk is driven by distance travelled, not by time. That is the whole trick
 * to a procedural walk looking right: advance the cycle by how far the figure has
 * actually moved, and the feet stop sliding. Drive it by a clock instead and the
 * figure skates, which reads as broken no matter how good the animation is.
 */

import * as THREE from "three";

/** Proportions in metres, for a figure about 1.75 m tall. */
const HIP = 0.9;
const SHOULDER = 1.42;
const NECK = 1.5;
const HEAD_R = 0.115;
/** Distance covered by one full cycle of both legs. */
const STRIDE = 1.55;

export interface FigurePalette {
  shirt: number;
  trousers: number;
  skin: number;
  hair: number;
  shoes: number;
}

export const PALETTES: FigurePalette[] = [
  { shirt: 0xc0563c, trousers: 0x2f3a48, skin: 0x8d5a3b, hair: 0x1d1712, shoes: 0x24211e },
  { shirt: 0x3f7d8c, trousers: 0x3b3630, skin: 0x6b4128, hair: 0x120e0b, shoes: 0x1c1a18 },
  { shirt: 0xd8a13f, trousers: 0x33383f, skin: 0xa9714a, hair: 0x2a2118, shoes: 0x2b2724 },
  { shirt: 0x6f7f4a, trousers: 0x2b3038, skin: 0x53331f, hair: 0x100c09, shoes: 0x201d1a },
  { shirt: 0xb8425e, trousers: 0x36323c, skin: 0x8a5836, hair: 0x241b14, shoes: 0x262220 },
  { shirt: 0xe0e0d6, trousers: 0x454a52, skin: 0x7a4c30, hair: 0x1a1512, shoes: 0x2f2b28 },
];

/**
 * Shared geometry, created once.
 *
 * Every figure in the city draws from these, so a dozen pedestrians cost a dozen
 * draw calls per part rather than a dozen sets of buffers.
 */
const geometry = {
  hip: new THREE.BoxGeometry(0.3, 0.2, 0.19),
  torso: new THREE.BoxGeometry(0.36, 0.52, 0.21),
  head: new THREE.BoxGeometry(0.2, 0.23, 0.21),
  cap: new THREE.BoxGeometry(0.22, 0.07, 0.23),
  upperArm: new THREE.BoxGeometry(0.1, 0.26, 0.11),
  lowerArm: new THREE.BoxGeometry(0.088, 0.24, 0.1),
  upperLeg: new THREE.BoxGeometry(0.13, 0.45, 0.14),
  lowerLeg: new THREE.BoxGeometry(0.115, 0.42, 0.125),
  foot: new THREE.BoxGeometry(0.12, 0.07, 0.26),
};

function material(colour: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: colour, flatShading: true });
}

interface Joint {
  pivot: THREE.Group;
}

export class Figure {
  readonly root: THREE.Group;

  private body: THREE.Group;
  private headBone: THREE.Group;
  private armL: Joint;
  private armR: Joint;
  private legL: Joint;
  private legR: Joint;
  private kneeL: Joint;
  private kneeR: Joint;
  private elbowL: Joint;
  private elbowR: Joint;

  /** Cycle position in radians; advances with distance, not with time. */
  private phase = 0;
  /** Ground speed, smoothed so the gait changes gently rather than snapping. */
  private speed = 0;
  private idle = 0;

  constructor(palette: FigurePalette = PALETTES[0]) {
    const m = {
      shirt: material(palette.shirt),
      trousers: material(palette.trousers),
      skin: material(palette.skin),
      hair: material(palette.hair),
      shoes: material(palette.shoes),
    };

    this.root = new THREE.Group();
    // Everything hangs off a body group so the whole figure can bob and lean
    // without fighting the root's position and heading.
    this.body = new THREE.Group();
    this.root.add(this.body);

    // ── pelvis and torso ──
    const hips = new THREE.Mesh(geometry.hip, m.trousers);
    hips.position.y = HIP;
    this.body.add(hips);

    const torso = new THREE.Mesh(geometry.torso, m.shirt);
    torso.position.y = HIP + 0.31;
    this.body.add(torso);

    // A narrow neck, so the head does not appear to sit on the shoulders.
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), m.skin);
    neck.position.y = NECK;
    this.body.add(neck);

    // ── head ──
    this.headBone = new THREE.Group();
    this.headBone.position.y = NECK + 0.03;
    const head = new THREE.Mesh(geometry.head, m.skin);
    head.position.y = HEAD_R;
    const cap = new THREE.Mesh(geometry.cap, m.hair);
    cap.position.y = HEAD_R + 0.13;
    this.headBone.add(head, cap);
    this.body.add(this.headBone);

    // ── arms: pivot at the shoulder, mesh hanging below it ──
    const makeArm = (side: number): { shoulder: Joint; elbow: Joint } => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.23, SHOULDER, 0);
      const upper = new THREE.Mesh(geometry.upperArm, m.shirt);
      upper.position.y = -0.13;
      shoulderPivot.add(upper);

      const elbowPivot = new THREE.Group();
      elbowPivot.position.y = -0.26;
      const lower = new THREE.Mesh(geometry.lowerArm, m.skin);
      lower.position.y = -0.12;
      elbowPivot.add(lower);
      shoulderPivot.add(elbowPivot);
      this.body.add(shoulderPivot);
      return { shoulder: { pivot: shoulderPivot }, elbow: { pivot: elbowPivot } };
    };
    const left = makeArm(-1);
    const right = makeArm(1);
    this.armL = left.shoulder;
    this.elbowL = left.elbow;
    this.armR = right.shoulder;
    this.elbowR = right.elbow;

    // ── legs: hip pivot, knee pivot, foot ──
    const makeLeg = (side: number): { hip: Joint; knee: Joint } => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.1, HIP - 0.06, 0);
      const upper = new THREE.Mesh(geometry.upperLeg, m.trousers);
      upper.position.y = -0.225;
      hipPivot.add(upper);

      const kneePivot = new THREE.Group();
      kneePivot.position.y = -0.45;
      const lowerMesh = new THREE.Mesh(geometry.lowerLeg, m.trousers);
      lowerMesh.position.y = -0.21;
      const foot = new THREE.Mesh(geometry.foot, m.shoes);
      foot.position.set(0, -0.42, 0.05);
      kneePivot.add(lowerMesh, foot);
      hipPivot.add(kneePivot);
      this.body.add(hipPivot);
      return { hip: { pivot: hipPivot }, knee: { pivot: kneePivot } };
    };
    const legLeft = makeLeg(-1);
    const legRight = makeLeg(1);
    this.legL = legLeft.hip;
    this.kneeL = legLeft.knee;
    this.legR = legRight.hip;
    this.kneeR = legRight.knee;
  }

  /** Put the figure somewhere and face it a direction. */
  place(x: number, z: number, yaw: number): void {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw;
  }

  /**
   * Advance the animation.
   *
   * `speed` is metres per second; `dt` seconds. The cycle is advanced by the
   * distance actually covered so the feet stay planted.
   */
  update(dt: number, speed: number): void {
    // Smooth the speed so the gait eases in and out instead of snapping.
    this.speed += (speed - this.speed) * Math.min(1, dt * 7);

    const moving = this.speed > 0.15;
    if (moving) {
      this.phase += (this.speed * dt * Math.PI * 2) / STRIDE;
      this.idle = 0;
    } else {
      this.idle += dt;
    }

    const p = this.phase;
    // Gait amplitude scales with pace: a walk swings the limbs more than a
    // shuffle, and running reaches further still.
    const pace = Math.min(1.6, this.speed / 3.1);
    const swing = 0.62 * pace;
    const armSwing = 0.5 * pace;

    if (!moving) {
      // Standing: settle the limbs and breathe.
      const breathe = Math.sin(this.idle * 1.6) * 0.012;
      this.legL.pivot.rotation.x = 0;
      this.legR.pivot.rotation.x = 0;
      this.kneeL.pivot.rotation.x = 0;
      this.kneeR.pivot.rotation.x = 0;
      this.armL.pivot.rotation.x = 0.04;
      this.armR.pivot.rotation.x = 0.04;
      this.elbowL.pivot.rotation.x = -0.12;
      this.elbowR.pivot.rotation.x = -0.12;
      this.body.position.y = breathe;
      this.body.rotation.z = 0;
      this.body.rotation.x = 0;
      this.headBone.rotation.y = Math.sin(this.idle * 0.4) * 0.22;
      return;
    }

    // Legs swing in opposition.
    this.legL.pivot.rotation.x = Math.sin(p) * swing;
    this.legR.pivot.rotation.x = Math.sin(p + Math.PI) * swing;

    // Knees only bend one way, and most during the swing phase — a knee that
    // folds on the planted leg is the classic tell of a fake walk.
    const kneeOf = (phase: number): number => {
      const s = Math.sin(phase - 0.9);
      return s > 0 ? s * 1.15 * pace : 0;
    };
    this.kneeL.pivot.rotation.x = kneeOf(p);
    this.kneeR.pivot.rotation.x = kneeOf(p + Math.PI);

    // Arms counter-swing against the legs, with a little elbow flex.
    this.armL.pivot.rotation.x = Math.sin(p + Math.PI) * armSwing;
    this.armR.pivot.rotation.x = Math.sin(p) * armSwing;
    this.elbowL.pivot.rotation.x = -0.25 - Math.max(0, Math.sin(p + Math.PI)) * 0.35 * pace;
    this.elbowR.pivot.rotation.x = -0.25 - Math.max(0, Math.sin(p)) * 0.35 * pace;
    // A touch of out-swing so the arms clear the body.
    this.armL.pivot.rotation.z = -0.08;
    this.armR.pivot.rotation.z = 0.08;

    // The body rises and falls twice per cycle, and rolls once.
    this.body.position.y = Math.abs(Math.sin(p)) * 0.035 * pace;
    this.body.rotation.z = Math.sin(p) * 0.035 * pace;
    // A slight forward lean that grows with pace, which is what makes running
    // read as running.
    this.body.rotation.x = 0.04 + pace * 0.05;
    this.headBone.rotation.y = -Math.sin(p) * 0.06 * pace;
  }

  /** Cast or stop casting shadows for this figure. */
  setShadow(enabled: boolean): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = enabled;
        object.receiveShadow = false;
      }
    });
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }
}
