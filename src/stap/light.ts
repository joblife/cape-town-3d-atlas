/**
 * Stap Kaap's light.
 *
 * The same solar model and the same blended palette as the atlas, applied to a
 * three.js scene instead of a map. Keeping one source of truth means the two
 * products disagree about nothing: if it is golden hour in the atlas, it is
 * golden hour on the street, because both read the same sun.
 */

import * as THREE from "three";
import { gradeAt, lightPosition, type Grade } from "../core/presets.ts";
import { skyAt, type SkyState } from "../core/sun.ts";

export interface StapLight {
  sun: THREE.DirectionalLight;
  sky: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  state: SkyState;
  grade: Grade;
}

/** Convert the palette's hex strings into three.js colours. */
const hex = (value: string): THREE.Color => new THREE.Color(value);

export function createLight(): StapLight {
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.castShadow = true;
  // The walkable core is about 2 km across; a shadow map covering it at 2048
  // gives roughly a metre per texel, which reads well at street level.
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 60;
  sun.shadow.camera.far = 1400;
  // A tight frustum is what makes shadows crisp; it follows the walker, so it
  // only ever needs to cover the streets immediately around them.
  const extent = 210;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.28;

  const sky = new THREE.HemisphereLight(0xffffff, 0x555555, 0.7);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);

  const state = skyAt(new Date());

  return { sun, sky, ambient, state, grade: gradeAt(state.altitude, state.moon.illumination) };
}

export interface ApplyOptions {
  /** Minutes in Cape Town, or null to follow the real time. */
  minutes: number | null;
  /** Elevation of the walker, so the shadow camera tracks them. */
  focus: { x: number; z: number };
}

/** Recompute the light for a moment in time and push it at the scene. */
export function applyLight(light: StapLight, date: Date, focus: { x: number; z: number }): void {
  const state = skyAt(date);
  const grade = gradeAt(state.altitude, state.moon.illumination);
  light.state = state;
  light.grade = grade;

  const up = state.altitude > 0;
  const [, azimuth, polar] = lightPosition(state.azimuth, state.altitude);

  // three.js wants a direction vector, not polar coordinates: rebuild the sun's
  // position from the same numbers the map uses.
  const azimuthRad = (azimuth * Math.PI) / 180;
  const polarRad = (polar * Math.PI) / 180;
  const distance = 620;
  const horizontal = Math.sin(polarRad) * distance;
  light.sun.position.set(
    focus.x + Math.sin(azimuthRad) * horizontal,
    Math.cos(polarRad) * distance,
    focus.z + Math.cos(azimuthRad) * horizontal,
  );
  light.sun.target.position.set(focus.x, 0, focus.z);
  light.sun.target.updateMatrixWorld();

  light.sun.color.copy(hex(grade.sunColor));
  // three.js has no notion of a sun below the horizon; at night the sun's
  // contribution drops to a trace and the hemisphere does the work, which is
  // what makes a lit street read as dark but not black.
  // Light levels are chosen so a surface lands where its colour says it should.
  // With tone mapping off there is no highlight roll-off, so anything summing
  // above 1.0 clips to white — which is what washed the palette out. Sun plus
  // hemisphere plus ambient now total a little over 1 on a fully lit face and
  // about a third in shadow, which reads as bright midday without bleaching.
  light.sun.intensity = up ? grade.lightIntensity * 1.3 : 0.16;
  light.sun.castShadow = state.altitude > 0.5;

  light.sky.color.copy(hex(grade.sky));
  light.sky.groundColor.copy(hex(grade.surfaces.land));
  light.sky.intensity = up ? 0.34 : 0.3;

  light.ambient.color.copy(hex(grade.surfaces.land));
  light.ambient.intensity = up ? 0.1 : 0.22;
}

export interface Getters {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  ground: THREE.Mesh;
  roads: THREE.Mesh;
  green: THREE.Mesh;
  water: THREE.Mesh;
  walls: Map<string, THREE.Mesh>;
  roofs: THREE.Mesh;
  trees?: THREE.Object3D;
  markings?: THREE.Mesh;
}

/**
 * Turn the atlas's map palette into materials for a 3D scene.
 *
 * The maps's colours are chosen to be legible from directly above, where pale
 * means small and the eye is reading symbols. At street level the same colours
 * wash out: every surface lands within a few percent of every other, and the
 * city reads as one flat plane. So the palette is re-derived here — the hue
 * relationships survive, the contrast and saturation do not.
 */
/**
 * The palette, in the reference's register.
 *
 * Deliberately not the atlas's palette. The two products are answering
 * different questions: the atlas is a survey instrument and its colours are
 * muted so that data reads through them; this is a toy city, and its colours are
 * there to be enjoyed. The atlas tokens live on in the chrome of the atlas, not
 * here.
 *
 * Times of day still move these — a warm evening should warm the roofs and the
 * streets, not leave them the same colour at midnight — so the base tones below
 * are modulated by the solar grade rather than replacing it.
 */
const PALETTE = {
  /** Grass, verges, parks. */
  green: "#8cc44f",
  greenDeep: "#6ba33c",
  /** Streets: a dark warm grey, the only dark thing in the picture. */
  asphalt: "#3f4550",
  /** The ground under everything else: mown grass in the plan's gaps. */
  earth: "#9fc35c",
  /** Building walls, by kind. */
  wallLo: "#fdf6e6",
  wallMid: "#f6e2bd",
  wallHigh: "#e8c99b",
  wallCivic: "#fdfaf0",
  wallWorship: "#fbf3e2",
  /** Roofs run the warm range, which is what makes a block of buildings read. */
  roofWarm: "#d9714f",
  roofPale: "#e8a97c",
  roofSlate: "#9aa3ad",
  /** Water. */
  water: "#3aa0e0",
  waterEdge: "#8fd0ef",
  /** Markings and any painted surface. */
  paint: "#fffefa",
  /** Trees. */
  foliage: "#3f8f33",
  foliageDeep: "#2f6f27",
} as const;

/** Blend two hex colours and return a three.js-ready integer. */
function mixHexToInt(a: string, b: string, t: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

/** The building kinds the palette distinguishes. */
type BuildingKindName =
  | "ground"
  | "road"
  | "green"
  | "water"
  | "residential"
  | "commercial"
  | "civic"
  | "worship"
  | "industrial"
  | "minor"
  | "general";

/** Darken toward the night palette as the sun drops. */
function nightMix(grade: Grade): number {
  return Math.max(0, Math.min(1, 1 - grade.lightIntensity / 0.72));
}

function materialsFor(grade: Grade, kind: BuildingKindName): number {
  const night = nightMix(grade);

  // Every surface is its daytime colour, darkened toward a cool night tone.
  const at = (day: string): number => mixHexToInt(day, "#1d2740", night * 0.72);

  switch (kind) {
    case "ground":
      // Slightly deeper than the parks so blocks and verges separate in plan.
      return at(PALETTE.earth);
    case "road":
      return at(PALETTE.asphalt);
    case "green":
      return at(PALETTE.green);
    case "water":
      return at(PALETTE.water);
    case "residential":
      return at(PALETTE.wallLo);
    case "general":
      return at(PALETTE.wallMid);
    case "commercial":
      return at(PALETTE.wallHigh);
    case "civic":
      return at(PALETTE.wallCivic);
    case "worship":
      return at(PALETTE.wallWorship);
    case "industrial":
      return at("#dfd6cb");
    default:
      return at(PALETTE.wallMid);
  }
}

/** Repaint every surface from the current grade. */
export function paintCity(light: StapLight, objects: Getters): void {
  const set = (mesh: THREE.Mesh | undefined, colour: number, opacity?: number): void => {
    if (!mesh) return;
    const material = mesh.material as THREE.MeshLambertMaterial | THREE.MeshBasicMaterial;
    material.color.setHex(colour);
    if (opacity !== undefined) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
    }
  };

  const grade = light.grade;
  set(objects.ground, materialsFor(grade, "ground"));
  set(objects.roads, materialsFor(grade, "road"));
  set(objects.green, materialsFor(grade, "green"));
  set(objects.water, materialsFor(grade, "water"), Math.max(0.82, grade.waterOpacity));
  // Roof caps pick up whatever light is going, and give the blocks a bright top
  // edge from above — which is most of what makes a toy city legible.
  // The building shells carry the roof colours in their vertex colours; this
  // cap only deepens the read from above.
  set(objects.roofs, mixHexToInt(PALETTE.roofWarm, "#ffffff", 0.15), 0.16);
  set(objects.markings, mixHexToInt(PALETTE.paint, "#8892a0", nightMix(grade) * 0.6));
  if (objects.trees) {
    const canopy = (objects.trees as THREE.InstancedMesh).material as THREE.MeshLambertMaterial;
    canopy.color.setHex(mixHexToInt(PALETTE.foliage, "#1d2740", nightMix(grade) * 0.72));
  }

  for (const [kind, mesh] of objects.walls as Map<string, THREE.Mesh>) {
    set(mesh, materialsFor(grade, kind as BuildingKindName));
  }

  // A flat sky, in the reference's register, warmed and cooled by the hour
  // rather than swapped for a photograph. Fog is barely there: the horizon of a
  // diorama should be crisp.
  const sky = mixHexToInt("#c9eaf8", "#16224a", nightMix(grade) * 0.85);
  objects.scene.background = new THREE.Color(sky);
  objects.scene.fog = new THREE.Fog(sky, 2600, 7200);
}
