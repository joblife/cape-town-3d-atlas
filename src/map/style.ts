/**
 * The atlas map style, authored from scratch against the OpenFreeMap vector
 * tiles (OpenMapTiles schema) plus AWS Terrarium elevation.
 *
 * Two rules govern everything here:
 *  1. The style is built once with daylight paint. Changing the light never
 *     swaps the style — it retargets paint properties — so tiles never reload
 *     and the sun can track continuously.
 *  2. Nothing is decorative. Every layer exists to make the city legible as a
 *     three-dimensional object: relief, water edges, road hierarchy, building
 *     mass, and a restrained label set.
 */

import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

export const TILES = {
  vector: "https://tiles.openfreemap.org/planet",
  terrain: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
};

export const SOURCE_VECTOR = "omt";
export const SOURCE_TERRAIN = "terrain";
export const LAYER_BUILDINGS = "atlas-buildings";

const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];

export const TERRAIN_EXAGGERATION = 1.18;

type Layer = LayerSpecification & { id: string };

/** OMT `landcover.class` groups, one layer per surface so each can be tinted. */
const LANDCOVER: { id: string; key: string; classes: string[] }[] = [
  { id: "lc-forest", key: "forest", classes: ["wood"] },
  { id: "lc-grass", key: "grass", classes: ["grass"] },
  { id: "lc-scrub", key: "scrub", classes: ["scrub"] },
  { id: "lc-farm", key: "farm", classes: ["agriculture", "farmland", "crop"] },
  { id: "lc-sand", key: "sand", classes: ["sand"] },
  { id: "lc-rock", key: "rock", classes: ["rock"] },
  { id: "lc-bare", key: "bare", classes: ["bare", "wetland"] },
];

const LANDUSE: { id: string; key: string; classes: string[] }[] = [
  {
    id: "lu-green",
    key: "grass",
    classes: [
      "park", "pitch", "playground", "cemetery", "garden", "golf_course", "nature_reserve",
      "forest", "wood", "grass", "meadow", "village_green", "recreation_ground", "zoo",
      "stadium", "school", "college", "university",
    ],
  },
  { id: "lu-farm", key: "farm", classes: ["farmland", "farm", "orchard", "vineyard", "plant_nursery"] },
  { id: "lu-sand", key: "sand", classes: ["sand", "beach"] },
  { id: "lu-rock", key: "rock", classes: ["rock", "quarry", "scree"] },
];

/** Linear zoom ramp, for sizes that should grow evenly with depth. */
export const ramp = (stops: [number, number][]): ExpressionSpecification =>
  ["interpolate", ["linear"], ["zoom"], ...stops.flat()] as unknown as ExpressionSpecification;

/** Super-linear zoom ramp for road widths, so streets stay legible when a
 *  neighbourhood fills the screen without becoming ribbons when it does not. */
const w = (stops: [number, number][]): ExpressionSpecification =>
  ["interpolate", ["exponential", 1.6], ["zoom"], ...stops.flat()] as unknown as ExpressionSpecification;

const classIn = (classes: string[]): ExpressionSpecification =>
  ["match", ["get", "class"], classes, true, false] as unknown as ExpressionSpecification;

const isPoly = ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false] as unknown as ExpressionSpecification;
const isLine = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false] as unknown as ExpressionSpecification;

export interface StyleOptions {
  /** Opening paint. The light system retargets these immediately after load. */
  base: string;
  water: string;
}

export function buildStyle(options: StyleOptions): StyleSpecification {
  const layers: Layer[] = [];

  layers.push({
    id: "background",
    type: "background",
    paint: { "background-color": options.base },
  });

  // ── hydrology ────────────────────────────────────────────────
  layers.push({
    id: "water",
    type: "fill",
    source: SOURCE_VECTOR,
    "source-layer": "water",
    filter: ["all", isPoly, ["!=", ["get", "brunnel"], "tunnel"]],
    paint: { "fill-color": options.water, "fill-opacity": 0.9, "fill-antialias": true },
  });
  layers.push({
    id: "water-outline",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "water",
    filter: ["all", isPoly, ["!=", ["get", "brunnel"], "tunnel"]],
    paint: { "line-color": options.water, "line-width": 0.6, "line-opacity": 0.55 },
  });
  layers.push({
    id: "waterway",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "waterway",
    filter: isLine,
    paint: {
      "line-color": options.water,
      "line-width": w([
        [8, 0.6],
        [14, 2.4],
      ]),
      "line-opacity": 0.85,
    },
  });

  // ── land cover and use ───────────────────────────────────────
  for (const { id, key, classes } of LANDCOVER) {
    layers.push({
      id,
      type: "fill",
      source: SOURCE_VECTOR,
      "source-layer": "landcover",
      filter: ["all", isPoly, classIn(classes)],
      paint: { "fill-color": options.base, "fill-opacity": 0.95, "fill-antialias": true },
      metadata: { surface: key },
    });
  }
  for (const { id, key, classes } of LANDUSE) {
    layers.push({
      id,
      type: "fill",
      source: SOURCE_VECTOR,
      "source-layer": "landuse",
      filter: ["all", isPoly, classIn(classes)],
      paint: { "fill-color": options.base, "fill-opacity": 0.82, "fill-antialias": true },
      metadata: { surface: key },
    });
  }

  // Built-up ground reads a shade warmer than open country, which is what makes
  // the city's extent legible from the air.
  layers.push({
    id: "builtup",
    type: "fill",
    source: SOURCE_VECTOR,
    "source-layer": "landuse",
    filter: ["all", isPoly, classIn(["residential", "commercial", "industrial", "retail", "railway", "military"])],
    paint: { "fill-color": options.base, "fill-opacity": 0.72, "fill-antialias": true },
    metadata: { surface: "urban" },
  });

  // ── relief ───────────────────────────────────────────────────
  // Hillshade sits above the land tints so the mountain reads as a form rather
  // than a patch of colour, and its illumination is driven by the real sun.
  layers.push({
    id: "hillshade",
    type: "hillshade",
    source: SOURCE_TERRAIN,
    paint: {
      "hillshade-illumination-anchor": "map",
      "hillshade-exaggeration": 0.62,
      "hillshade-shadow-color": "#1a1a24",
      "hillshade-highlight-color": "#fff4e2",
      "hillshade-accent-color": "#5a5a52",
      "hillshade-method": "combined",
    },
  });

  // ── transport ────────────────────────────────────────────────
  const roadCasing: [string, string[]][] = [
    ["motorway", ["motorway"]],
    ["major", ["trunk", "primary"]],
    ["minor-major", ["secondary", "tertiary"]],
  ];
  for (const [id, classes] of roadCasing) {
    layers.push({
      id: `road-casing-${id}`,
      type: "line",
      source: SOURCE_VECTOR,
      "source-layer": "transportation",
      minzoom: 7,
      filter: ["all", isLine, classIn(classes), ["!=", ["get", "brunnel"], "tunnel"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": options.base,
        "line-width": w([
          [7, 0.8],
          [10, 2.2],
          [14, 7],
          [17, 16],
        ]),
        "line-opacity": 0.9,
      },
      metadata: { surface: "roadCasing" },
    });
  }
  layers.push({
    id: "road-inner-major",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "transportation",
    minzoom: 6,
    filter: ["all", isLine, classIn(["motorway", "trunk", "primary", "secondary", "tertiary"]), ["!=", ["get", "brunnel"], "tunnel"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": options.base,
      "line-width": w([
        [6, 0.4],
        [9, 1.1],
        [12, 2.4],
        [15, 5.2],
        [18, 11],
      ]),
      "line-opacity": 0.95,
    },
    metadata: { surface: "roadMajor" },
  });
  layers.push({
    id: "road-inner-local",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "transportation",
    minzoom: 12,
    filter: ["all", isLine, classIn(["minor", "service", "track"]), ["!=", ["get", "brunnel"], "tunnel"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": options.base,
      "line-width": w([
        [12, 0.5],
        [15, 1.8],
        [18, 5],
      ]),
      "line-opacity": 0.8,
    },
    metadata: { surface: "road" },
  });
  layers.push({
    id: "paths",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "transportation",
    minzoom: 13,
    filter: ["all", isLine, classIn(["path"]), ["!=", ["get", "brunnel"], "tunnel"]],
    paint: {
      "line-color": options.base,
      "line-width": w([
        [13, 0.4],
        [17, 1.4],
      ]),
      "line-dasharray": [2.2, 1.8],
      "line-opacity": 0.6,
    },
    metadata: { surface: "road" },
  });
  layers.push({
    id: "rail",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "transportation",
    minzoom: 11,
    filter: ["all", isLine, classIn(["rail", "transit"]), ["!=", ["get", "brunnel"], "tunnel"]],
    paint: {
      "line-color": options.base,
      "line-width": w([
        [11, 0.5],
        [15, 1.6],
        [18, 3],
      ]),
      "line-dasharray": [3, 2.2],
      "line-opacity": 0.75,
    },
    metadata: { surface: "rail" },
  });
  layers.push({
    id: "pier",
    type: "fill",
    source: SOURCE_VECTOR,
    "source-layer": "transportation",
    minzoom: 11,
    filter: ["all", isPoly, classIn(["pier"])],
    paint: { "fill-color": options.base, "fill-opacity": 0.9 },
    metadata: { surface: "pier" },
  });

  // ── boundaries ───────────────────────────────────────────────
  layers.push({
    id: "boundary-state",
    type: "line",
    source: SOURCE_VECTOR,
    "source-layer": "boundary",
    minzoom: 7,
    filter: ["==", ["get", "admin_level"], 4],
    paint: {
      "line-color": options.base,
      "line-width": 1,
      "line-dasharray": [2.5, 2.5],
      "line-opacity": 0.45,
    },
    metadata: { surface: "rail" },
  });

  // ── buildings ────────────────────────────────────────────────
  // Extruded from OMT render_height / render_levels, tinted by mass. Kept
  // slightly translucent so the terrain and street grid read through the city.
  layers.push({
    id: LAYER_BUILDINGS,
    type: "fill-extrusion",
    source: SOURCE_VECTOR,
    "source-layer": "building",
    minzoom: 12,
    filter: isPoly,
    paint: {
      "fill-extrusion-color": "#efece0",
      "fill-extrusion-height": buildingHeight(),
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.9,
      "fill-extrusion-vertical-gradient": true,
    },
    metadata: { surface: "building" },
  });

  // ── labels ───────────────────────────────────────────────────
  layers.push({
    id: "place-city",
    type: "symbol",
    source: SOURCE_VECTOR,
    "source-layer": "place",
    maxzoom: 13,
    filter: ["all", ["==", ["get", "class"], "city"]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT_BOLD,
      "text-size": ramp([[7, 13], [12, 18]]),
      "text-letter-spacing": 0.18,
      "text-transform": "uppercase",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.55)",
      "text-halo-width": 1.4,
      "text-halo-blur": 1,
      "text-opacity": 0.85,
    },
  });
  layers.push({
    id: "place-suburb",
    type: "symbol",
    source: SOURCE_VECTOR,
    "source-layer": "place",
    minzoom: 11.4,
    maxzoom: 16,
    filter: ["all", ["match", ["get", "class"], ["suburb", "quarter", "neighbourhood"], true, false]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT,
      "text-size": ramp([[11.4, 11], [15, 15]]),
      "text-letter-spacing": 0.08,
      "text-transform": "uppercase",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.45)",
      "text-halo-width": 1.2,
      "text-opacity": 0.68,
    },
  });
  layers.push({
    id: "water-label",
    type: "symbol",
    source: SOURCE_VECTOR,
    "source-layer": "water_name",
    minzoom: 9,
    filter: isLine,
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT,
      "text-size": ramp([[9, 11], [15, 15]]),
      "symbol-placement": "line",
      "text-letter-spacing": 0.22,
      "text-transform": "uppercase",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.4)",
      "text-halo-width": 1,
      "text-opacity": 0.6,
    },
  });
  layers.push({
    id: "peaks",
    type: "symbol",
    source: SOURCE_VECTOR,
    "source-layer": "mountain_peak",
    minzoom: 11,
    filter: ["has", "name"],
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT,
      "text-size": 11,
      "text-transform": "uppercase",
      "text-letter-spacing": 0.1,
      "text-offset": [0, 0.6],
      "text-anchor": "top",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.5)",
      "text-halo-width": 1.2,
      "text-opacity": 0.72,
    },
    metadata: { surface: "rock" },
  });
  layers.push({
    id: "road-label",
    type: "symbol",
    source: SOURCE_VECTOR,
    "source-layer": "transportation_name",
    minzoom: 13.5,
    filter: ["all", isLine, ["!", ["has", "ref"]]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": FONT,
      "text-size": ramp([[13.5, 10.5], [18, 13]]),
      "symbol-placement": "line",
      "text-letter-spacing": 0.06,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.42)",
      "text-halo-width": 1,
      "text-opacity": 0.6,
    },
  });

  return {
    version: 8,
    name: "Cape Town Atlas",
    glyphs: TILES.glyphs,
    sources: {
      [SOURCE_VECTOR]: {
        type: "vector",
        url: TILES.vector,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, via OpenFreeMap',
      },
      [SOURCE_TERRAIN]: {
        type: "raster-dem",
        tiles: [TILES.terrain],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
        attribution: "Elevation: Mapzen / AWS Terrain Tiles (SRTM, GMTED2010, USGS)",
      },
    },
    layers: layers as StyleSpecification["layers"],
    terrain: { source: SOURCE_TERRAIN, exaggeration: TERRAIN_EXAGGERATION },
    light: { anchor: "viewport", position: [1.15, 210, 30], intensity: 1 },
  };
}

/** Extrusion height in metres: tagged height, else levels × 3.2 m, else two
 *  storeys. Matching the ordering OMT uses keeps tall buildings honest. */
export function buildingHeight(scale = 1): ExpressionSpecification {
  const base = [
    "coalesce",
    ["get", "render_height"],
    ["*", ["coalesce", ["get", "render_levels"], 2], 3.2],
    6.5,
  ];
  return (scale === 1 ? base : ["*", scale, base]) as unknown as ExpressionSpecification;
}

export const SURFACE_LAYERS = {
  forest: ["lc-forest"],
  grass: ["lc-grass", "lu-green"],
  scrub: ["lc-scrub"],
  farm: ["lc-farm", "lu-farm"],
  sand: ["lc-sand", "lu-sand"],
  rock: ["lc-rock", "lu-rock"],
  bare: ["lc-bare"],
  urban: ["builtup"],
  water: ["water"],
  waterEdge: ["water-outline", "waterway"],
  road: ["road-inner-local", "paths"],
  roadMajor: ["road-inner-major"],
  roadCasing: ["road-casing-motorway", "road-casing-major", "road-casing-minor-major"],
  rail: ["rail", "boundary-state"],
  pier: ["pier"],
} as const;
