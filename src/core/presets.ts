/**
 * The lighting model.
 *
 * Rather than three fixed themes, the atlas blends between four measured light
 * states — night, twilight, golden, day — as a continuous function of the real
 * sun's altitude. Every surface in the city has a colour in each state, so the
 * whole miniature moves together through the day instead of switching presets.
 */

import { mixHex } from "../util/color.ts";

export type SurfaceKey =
  | "land"
  | "urban"
  | "grass"
  | "scrub"
  | "forest"
  | "farm"
  | "sand"
  | "rock"
  | "bare"
  | "water"
  | "waterEdge"
  | "wetSand"
  | "road"
  | "roadMajor"
  | "roadCasing"
  | "rail"
  | "pier"
  | "buildingLo"
  | "buildingMid"
  | "buildingHigh";

export interface Theme {
  id: "night" | "twilight" | "golden" | "day";
  /** Solar altitude at which this theme is exact. */
  altitude: number;
  surfaces: Record<SurfaceKey, string>;
  sky: string;
  horizon: string;
  fog: string;
  /** Directional light intensity. In MapLibre this sets the contrast between
   *  lit and shadowed faces: 0 is flat, 1 is graphic. */
  lightIntensity: number;
  /** Building base opacity — slightly translucent by day reads as a model. */
  buildingOpacity: number;
  waterOpacity: number;
  starOpacity: number;
  /** Strength of the lifted, poster-like colour grade. */
  grade: number;
}

/** Shared calm base for every state: the city sits on a soft, even plate so
 *  the three-dimensional forms do the talking. */
const NIGHT: Theme = {
  id: "night",
  altitude: -18,
  surfaces: {
    urban: "#1c2833",
    land: "#0f1a24",
    grass: "#16262a",
    scrub: "#1b2b2d",
    forest: "#122226",
    farm: "#18282a",
    sand: "#3a3830",
    rock: "#2c3846",
    bare: "#26313d",
    water: "#0d2b3e",
    waterEdge: "#1c4a5f",
    wetSand: "#233140",
    road: "#59676f",
    roadMajor: "#93a0a9",
    roadCasing: "#1e2831",
    rail: "#333f4a",
    pier: "#35434f",
    buildingLo: "#63748a",
    buildingMid: "#54637a",
    buildingHigh: "#455466",
  },
  sky: "#060b14",
  horizon: "#13202e",
  fog: "#0d1826",
  lightIntensity: 0.3,
  buildingOpacity: 0.97,
  waterOpacity: 0.94,
  starOpacity: 0.62,
  grade: 0.35,
};

const TWILIGHT: Theme = {
  id: "twilight",
  altitude: -4,
  surfaces: {
    urban: "#2c3844",
    land: "#26323e",
    grass: "#2b3b3a",
    scrub: "#31403d",
    forest: "#22322f",
    farm: "#2b3a35",
    sand: "#3e4038",
    rock: "#32414c",
    bare: "#2d3945",
    water: "#16374e",
    waterEdge: "#1d4963",
    wetSand: "#2b3b46",
    road: "#4d5a68",
    roadMajor: "#6d7c8a",
    roadCasing: "#2b3743",
    rail: "#394450",
    pier: "#394653",
    buildingLo: "#3b495c",
    buildingMid: "#324051",
    buildingHigh: "#2a3849",
  },
  sky: "#101c33",
  horizon: "#2d3b53",
  fog: "#17212d",
  lightIntensity: 0.5,
  buildingOpacity: 0.96,
  waterOpacity: 0.92,
  starOpacity: 0.28,
  grade: 0.28,
};

const GOLDEN: Theme = {
  id: "golden",
  altitude: 3,
  surfaces: {
    urban: "#ab9d81",
    land: "#9d9276",
    grass: "#78854a",
    scrub: "#8d8b5c",
    forest: "#485740",
    farm: "#8b8a58",
    sand: "#d9b47a",
    rock: "#9c928a",
    bare: "#948d74",
    water: "#2f6f92",
    waterEdge: "#6394a5",
    wetSand: "#8d8172",
    road: "#cbb188",
    roadMajor: "#dfc39c",
    roadCasing: "#9c7c58",
    rail: "#8d7558",
    pier: "#a68d70",
    buildingLo: "#ded2b6",
    buildingMid: "#c9bda4",
    buildingHigh: "#b0aca6",
  },
  sky: "#3d4a72",
  horizon: "#f0a86c",
  fog: "#b98a6a",
  lightIntensity: 0.72,
  buildingOpacity: 0.93,
  waterOpacity: 0.9,
  starOpacity: 0,
  grade: 0.16,
};

const DAY: Theme = {
  id: "day",
  altitude: 26,
  surfaces: {
    urban: "#d6d2b4",
    land: "#cbc8a9",
    grass: "#7f9159",
    scrub: "#a4ad83",
    forest: "#4f6b48",
    farm: "#9aa271",
    sand: "#eadfbb",
    rock: "#a8b0a6",
    bare: "#c0c0a2",
    water: "#2f87a8",
    waterEdge: "#74b9cd",
    wetSand: "#cfc09c",
    road: "#dcd6c4",
    roadMajor: "#efe9d8",
    roadCasing: "#a9a58d",
    rail: "#98947f",
    pier: "#c4bca6",
    buildingLo: "#f0ede1",
    buildingMid: "#dcdcc6",
    buildingHigh: "#c3d0ca",
  },
  sky: "#7fa8cc",
  horizon: "#d8e4ea",
  fog: "#c6d4d8",
  lightIntensity: 0.62,
  buildingOpacity: 0.9,
  waterOpacity: 0.88,
  starOpacity: 0,
  grade: 0.08,
};

/** Ordered by solar altitude, ascending. */
const THEMES: Theme[] = [NIGHT, TWILIGHT, GOLDEN, DAY];

export interface Grade {
  /** Blended colour of every ground and building surface. */
  surfaces: Record<SurfaceKey, string>;
  sky: string;
  horizon: string;
  fog: string;
  lightIntensity: number;
  buildingOpacity: number;
  waterOpacity: number;
  starOpacity: number;
  grade: number;
  /** Colour of the light source itself. */
  sunColor: string;
}

const mixNum = (a: number, b: number, t: number): number => a + (b - a) * t;

function themePair(altitude: number): { a: Theme; b: Theme; t: number } {
  if (altitude <= THEMES[0].altitude) return { a: THEMES[0], b: THEMES[0], t: 0 };
  for (let i = 0; i < THEMES.length - 1; i++) {
    const a = THEMES[i];
    const b = THEMES[i + 1];
    if (altitude <= b.altitude) {
      const span = b.altitude - a.altitude;
      // Ease the transition so the dramatic window around the horizon holds.
      const raw = (altitude - a.altitude) / span;
      return { a, b, t: raw * raw * (3 - 2 * raw) };
    }
  }
  return { a: DAY, b: DAY, t: 1 };
}

/** Blend every surface for the given solar altitude. */
export function surfacesAt(altitude: number): Record<SurfaceKey, string> {
  const { a, b, t } = themePair(altitude);
  const out = {} as Record<SurfaceKey, string>;
  for (const key of Object.keys(a.surfaces) as SurfaceKey[]) {
    out[key] = t === 0 ? a.surfaces[key] : t === 1 ? b.surfaces[key] : mixHex(a.surfaces[key], b.surfaces[key], t);
  }
  return out;
}

/** Colour of the light source itself: warm and low at the horizon, near-white
 *  at noon, moonlit blue when the sun is well down. */
export function sunlightColor(altitude: number, moonIllumination = 0.5): string {
  const smooth = (x: number): number => {
    const k = Math.max(0, Math.min(1, x));
    return k * k * (3 - 2 * k);
  };

  // Below the horizon there is no direct sun at all: what is left is scattered
  // skylight, which is blue. Keeping the warm colour past sunset is what turned
  // blue hour red.
  if (altitude < 0) {
    const dusk = smooth((altitude + 7) / 7); // 0 at -7°, 1 at the horizon
    const twilight = mixHex("#9fbde4", "#cdd9ea", moonIllumination);
    return mixHex(twilight, "#ffd9b6", dusk);
  }

  // Daylight: a mild peach at the horizon easing to near-white by mid-morning.
  // Deliberately desaturated — this colour multiplies every lit surface, so a
  // saturated orange repaints the entire city instead of tinting it. The warmth
  // of golden hour belongs in the surfaces, which carry it there honestly.
  return mixHex("#ffd0a4", "#fffcf6", smooth(altitude / 24));
}

export function gradeAt(altitude: number, moonIllumination = 0.5): Grade {
  const { a, b, t } = themePair(altitude);
  return {
    surfaces: surfacesAt(altitude),
    sky: mixHex(a.sky, b.sky, t),
    horizon: mixHex(a.horizon, b.horizon, t),
    fog: mixHex(a.fog, b.fog, t),
    lightIntensity: mixNum(a.lightIntensity, b.lightIntensity, t),
    buildingOpacity: mixNum(a.buildingOpacity, b.buildingOpacity, t),
    waterOpacity: mixNum(a.waterOpacity, b.waterOpacity, t),
    starOpacity: mixNum(a.starOpacity, b.starOpacity, t),
    grade: mixNum(a.grade, b.grade, t),
    sunColor: sunlightColor(altitude, moonIllumination),
  };
}

/**
 * MapLibre's directional light takes `[radial, azimuth, polar]`. With the
 * light anchored to the map, azimuth is measured clockwise from due north and
 * polar runs 0 (directly overhead) to 180 (directly below), so real sun
 * geometry maps onto it without conversion.
 */
export function lightPosition(sunAzimuth: number, sunAltitude: number): [number, number, number] {
  const azimuth = ((sunAzimuth % 360) + 360) % 360;
  if (sunAltitude < 0) {
    // Below the horizon the sun contributes nothing; light the scene from
    // overhead so extrusions keep their form, and let ambient do the work.
    return [1.15, azimuth, 22];
  }
  const polar = Math.max(2, Math.min(89, 90 - sunAltitude));
  // Radial distance collapses as the sun drops, which is what produces the
  // long-raking light of late afternoon.
  const radial = mixNum(0.35, 2.6, Math.max(0, Math.min(1, (sunAltitude + 2) / 40)));
  return [radial, azimuth, polar];
}

/** Warm the horizon in the direction of a low sun — the single strongest cue
 *  that it is early or late in the day. */
export function horizonAt(grade: Grade, sunAltitude: number): string {
  if (sunAltitude > 14 || sunAltitude < -10) return grade.horizon;
  const strength = 1 - Math.min(1, Math.abs(sunAltitude) / 14);
  return mixHex(grade.horizon, "#ffa763", strength * 0.55);
}

/** Colours used for the very first paint, before the light engine reports. */
export const STYLE_SEED = { base: DAY.surfaces.land, water: DAY.surfaces.water };
