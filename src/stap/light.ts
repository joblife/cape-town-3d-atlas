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
  const [radial, azimuth, polar] = lightPosition(state.azimuth, state.altitude);

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
  light.sun.intensity = up ? grade.lightIntensity * 3.4 : 0.3;
  light.sun.castShadow = state.altitude > 0.5;

  light.sky.color.copy(hex(grade.sky));
  light.sky.groundColor.copy(hex(grade.surfaces.land));
  light.sky.intensity = up ? 0.4 + grade.lightIntensity * 0.3 : 0.42;

  light.ambient.color.copy(hex(grade.surfaces.land));
  light.ambient.intensity = up ? 0.14 : 0.38;
  void radial;
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
function materialsFor(grade: Grade, kind: BuildingKindName): number {
  const { surfaces } = grade;
  switch (kind) {
    case "ground":
      // Ground well below the buildings, so mass separates from the street.
      // Taken further than the walk's version: seen from planet distance the
      // city is small, and the ground and the buildings have to separate at a
      // glance or the whole thing reads as one tan mass.
      return mixHexToInt(surfaces.urban, "#2f3a2c", 0.62);
    case "road":
      return mixHexToInt(surfaces.road, "#4d5148", 0.5);
    case "green":
      return mixHexToInt(surfaces.grass, "#2f5c2a", 0.35);
    case "water":
      return mixHexToInt(surfaces.water, "#14506e", 0.3);
    case "residential":
      return mixHexToInt(surfaces.buildingLo, "#ffffff", 0.12);
    case "commercial":
      return mixHexToInt(surfaces.buildingMid, "#ffffff", 0.1);
    case "civic":
    case "worship":
      return mixHexToInt(surfaces.buildingLo, "#fff6e2", 0.2);
    case "industrial":
      return mixHexToInt(surfaces.buildingMid, "#c9c3b4", 0.2);
    case "minor":
      return mixHexToInt(surfaces.buildingMid, "#b9b4a8", 0.2);
    default:
      return mixHexToInt(surfaces.buildingMid, "#ffffff", 0.06);
  }
}

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

/** Blend two hex colours and return a three.js-ready integer. */
function mixHexToInt(a: string, b: string, t: number): number {
  const pa = new THREE.Color(a);
  const pb = new THREE.Color(b);
  return pa.lerp(pb, t).getHex();
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
  set(objects.roofs, mixHexToInt(grade.surfaces.sand, "#ffffff", 0.3), 0.34);
  if (objects.trees) {
    // Canopies stay green by day and cool off with the light, like everything else.
    const canopy = (objects.trees as THREE.InstancedMesh).material as THREE.MeshLambertMaterial;
    canopy.color.setHex(mixHexToInt(grade.surfaces.forest, "#2f5c2a", 0.4));
  }

  for (const [kind, mesh] of objects.walls as Map<string, THREE.Mesh>) {
    set(mesh, materialsFor(grade, kind as BuildingKindName));
  }

  objects.scene.background = hex(grade.sky);
  // Fog is a framing tool here, not a constant: across the whole core it should
  // barely register, or a light sky colour washes the city to grey.
  objects.scene.fog = new THREE.Fog(hex(grade.fog).getHex(), 400, 3400);
}
