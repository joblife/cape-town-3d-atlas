/**
 * Bake the walkable city.
 *
 * Stap Kaap renders at street level, where a map renderer cannot help: building
 * geometry has to be real, static and cheap to draw every frame. So the
 * walkable core is extracted from OpenStreetMap once, at build time, and shipped
 * as a single asset the 3D scene can load directly.
 *
 * Source: OpenStreetMap via the Overpass API (© OpenStreetMap contributors, ODbL).
 *
 * Run with `npm run bake:stap`. Writes public/stap/city.json.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../public/stap/city.json");

/**
 * The walkable core: the City Bowl and its immediate neighbours — the Castle and
 * the old town, Bo-Kaap on the slope, the Waterfront and Green Point, and
 * Woodstock over the railway. Wide enough that a walk covers the city people
 * actually mean when they say Cape Town, tight enough to stay one download.
 */
const BBOX = { south: -33.9400, west: 18.3980, north: -33.9000, east: 18.4600 };
/** Public Overpass instances, tried in order: they rate-limit independently, so
 *  a 429 on one is usually a 200 on the next. */
const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

/** Storey height, matching the atlas's convention so the two agree. */
const METRES_PER_LEVEL = 3.2;
const DEFAULT_LEVELS = 2.5;

const round = (n, places) => Number(n.toFixed(places));

async function fetchOverpass(url, query) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const text = await res.text();
  // A rate-limited instance answers 200 with an HTML error page.
  if (!text.trim().startsWith("{")) return { ok: false, reason: "non-JSON body" };
  const json = JSON.parse(text);
  if (json.remark && /error|timeout/i.test(json.remark)) return { ok: false, reason: json.remark.slice(0, 80) };
  return { ok: true, json };
}

/** Query every mirror with growing backoff before giving up. */
async function overpass(query) {
  const errors = [];
  for (let round = 0; round < 3; round++) {
    for (const url of MIRRORS) {
      const host = new URL(url).host;
      try {
        const result = await fetchOverpass(url, query);
        if (result.ok) return result.json;
        errors.push(`${host}: ${result.reason}`);
        console.warn(`  ${host}: ${result.reason}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        errors.push(`${host}: ${reason}`);
        console.warn(`  ${host}: ${reason}`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (round < 2) {
      const wait = 20_000 * (round + 1);
      console.warn(`  all mirrors busy; waiting ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`every Overpass mirror failed:\n  ${errors.join("\n  ")}`);
}

/** Height in metres from OSM tags, preferring an explicit height. */
function heightOf(tags) {
  const h = parseFloat(tags.height);
  if (Number.isFinite(h) && h > 0 && h < 400) return h;
  const levels = parseFloat(tags["building:levels"]);
  if (Number.isFinite(levels) && levels > 0 && levels < 90) return levels * METRES_PER_LEVEL;
  return DEFAULT_LEVELS * METRES_PER_LEVEL;
}

/** Building classification, for colour. Kept small and legible. */
function kindOf(tags) {
  const b = (tags.building || "").toLowerCase();
  const a = (tags.amenity || "").toLowerCase();
  const t = (tags.tourism || "").toLowerCase();
  if (b === "church" || b === "cathedral" || b === "chapel" || b === "mosque" || b === "synagogue") return "worship";
  if (b === "commercial" || b === "retail" || b === "office" || a === "marketplace") return "commercial";
  if (b === "industrial" || b === "warehouse" || b === "hangar") return "industrial";
  if (b === "apartments" || b === "residential" || b === "terrace" || b === "house" || b === "detached") return "residential";
  if (t === "museum" || b === "public" || b === "civic" || b === "government" || a === "townhall" || b === "hospital" || b === "school" || b === "university") return "civic";
  if (b === "roof" || b === "garage" || b === "garages" || b === "shed" || b === "hut") return "minor";
  return "general";
}

function toRadians(d) {
  return (d * Math.PI) / 180;
}

/**
 * Clipping to the box.
 *
 * Overpass returns whole ways that *intersect* the query box, not just the parts
 * inside it, so a road grazing one corner arrives with vertices kilometres
 * beyond it. Left in, those outliers wreck anything that reasons about the city's
 * extent — the densest-street search picked a vertex four kilometres outside the
 * map and the walk spawned in empty veld, five and a half kilometres from the
 * nearest landmark.
 *
 * Sutherland–Hodgman, which is exact for a convex clip region; a rectangle is
 * the easiest convex region there is.
 */
function clipRing(points, box) {
  const edges = [
    { inside: (p) => p[0] >= box.west, cross: (a, b, out) => intersectLon(a, b, box.west, out) },
    { inside: (p) => p[0] <= box.east, cross: (a, b, out) => intersectLon(a, b, box.east, out) },
    { inside: (p) => p[1] >= box.south, cross: (a, b, out) => intersectLat(a, b, box.south, out) },
    { inside: (p) => p[1] <= box.north, cross: (a, b, out) => intersectLat(a, b, box.north, out) },
  ];
  let ring = points;
  for (const edge of edges) {
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const current = ring[i];
      const previous = ring[(i + ring.length - 1) % ring.length];
      const currentIn = edge.inside(current);
      const previousIn = edge.inside(previous);
      if (currentIn) {
        if (!previousIn) out.push(edge.cross(previous, current, []));
        out.push(current);
      } else if (previousIn) {
        out.push(edge.cross(previous, current, []));
      }
    }
    ring = out;
    if (ring.length === 0) return [];
  }
  return ring;
}

function intersectLon(a, b, lon, out) {
  const t = (lon - a[0]) / (b[0] - a[0]);
  out[0] = lon;
  out[1] = a[1] + (b[1] - a[1]) * t;
  return out;
}

function intersectLat(a, b, lat, out) {
  const t = (lat - a[1]) / (b[1] - a[1]);
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = lat;
  return out;
}

/** Split a polyline into the runs of consecutive points inside the box. */
function clipLine(points, box) {
  const runs = [];
  let run = [];
  for (const point of points) {
    const inside =
      point[0] >= box.west && point[0] <= box.east && point[1] >= box.south && point[1] <= box.north;
    if (inside) {
      run.push(point);
    } else if (run.length >= 2) {
      runs.push(run);
      run = [];
    } else {
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

/**
 * Local metre plane centred on the walkable area. The scene is small enough that
 * a tangent plane is indistinguishable from a projection, and it means the 3D
 * engine never has to think in degrees.
 */
const ORIGIN = { lon: (BBOX.west + BBOX.east) / 2, lat: (BBOX.south + BBOX.north) / 2 };
const M_PER_DEG_LAT = 111132;
const M_PER_DEG_LON = 111320 * Math.cos(toRadians(ORIGIN.lat));

/**
 * Project to decimetres and store as integers. At walking pace, and at any zoom
 * this scene is ever viewed from, a tenth of a metre is invisible, and integers
 * keep the payload to a size that streams comfortably.
 */
const project = (lat, lon) => [
  Math.round((lon - ORIGIN.lon) * M_PER_DEG_LON * 10),
  Math.round((lat - ORIGIN.lat) * M_PER_DEG_LAT * 10),
];

async function main() {
  const bbox = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
  console.log(`Baking the walkable city for ${bbox}`);

  // ── buildings ────────────────────────────────────────────────────
  console.log("  fetching buildings…");
  const buildingsRaw = await overpass(`[out:json][timeout:180];
(
  way["building"](${bbox});
  way["building:part"](${bbox});
);
out tags geom;`);

  const buildings = [];
  const named = [];
  for (const el of buildingsRaw.elements) {
    const geom = el.geometry;
    if (!geom || geom.length < 3) continue;
    const clipped = clipRing(geom.map((p) => [p.lon, p.lat]), BBOX);
    if (clipped.length < 3) continue;
    // Round-trip through the original shape so `project` still sees lat/lon.
    const footprint = clipped.map(([lon, lat]) => project(lat, lon));
    // Drop anything degenerate; a zero-area footprint is a rendering artefact.
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of footprint) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    if (maxX - minX < 12 || maxZ - minZ < 12) continue;   // decimetres

    const tags = el.tags || {};
    buildings.push({
      // The id is not needed at runtime; footprints are the identity.
      f: footprint.flat(),
      h: round(heightOf(tags), 1),
      k: kindOf(tags),
      ...(tags.name ? { n: tags.name.slice(0, 48) } : {}),
    });
    if (tags.name) named.push(tags.name);
  }
  console.log(`  ${buildings.length} buildings (${named.length} named)`);

  // ── streets ──────────────────────────────────────────────────────
  console.log("  fetching streets…");
  const roadsRaw = await overpass(`[out:json][timeout:180];
way["highway"](${bbox});
out tags geom;`);

  const roads = [];
  for (const el of roadsRaw.elements) {
    const geom = el.geometry;
    if (!geom || geom.length < 2) continue;
    const tags = el.tags || {};
    const cls = tags.highway;
    if (["proposed", "construction", "raceway", "bus_guideway"].includes(cls)) continue;
    const width = cls === "primary" || cls === "secondary" || cls === "trunk" ? 120 : cls === "tertiary" ? 90 : cls === "residential" ? 70 : 40;
    for (const run of clipLine(geom.map((p) => [p.lon, p.lat]), BBOX)) {
      roads.push({
        p: run.map(([lon, lat]) => project(lat, lon)).flat(),
        w: width,
        ...(tags.name ? { n: tags.name.slice(0, 40) } : {}),
      });
    }
  }
  console.log(`  ${roads.length} street segments`);

  // ── open ground and water, so the walk is not a grid of blocks ───
  console.log("  fetching parks and water…");
  const greenRaw = await overpass(`[out:json][timeout:180];
(
  way["leisure"~"^(park|garden|pitch|playground|common)$"](${bbox});
  way["landuse"~"^(grass|recreation_ground|village_green|cemetery)$"](${bbox});
);
out tags geom;`);
  const green = [];
  for (const el of greenRaw.elements) {
    if (!el.geometry || el.geometry.length < 4) continue;
    const clipped = clipRing(el.geometry.map((p) => [p.lon, p.lat]), BBOX);
    if (clipped.length < 3) continue;
    green.push({ p: clipped.map(([lon, lat]) => project(lat, lon)).flat() });
  }
  console.log(`  ${green.length} green areas`);

  const waterRaw = await overpass(`[out:json][timeout:180];
way["natural"="water"](${bbox});
out tags geom;`);
  const water = [];
  for (const el of waterRaw.elements) {
    if (!el.geometry || el.geometry.length < 4) continue;
    const clipped = clipRing(el.geometry.map((p) => [p.lon, p.lat]), BBOX);
    if (clipped.length < 3) continue;
    water.push({ p: clipped.map(([lon, lat]) => project(lat, lon)).flat() });
  }
  console.log(`  ${water.length} water areas`);

  // ── the world ────────────────────────────────────────────────────
  const heights = buildings.map((b) => b.h).sort((a, b) => a - b);
  const world = {
    meta: {
      name: "Cape Town — the walkable core",
      source: "© OpenStreetMap contributors, ODbL — extracted via Overpass",
      extracted: new Date().toISOString().slice(0, 10),
      origin: ORIGIN,
      bbox: BBOX,
      counts: { buildings: buildings.length, roads: roads.length, green: green.length, water: water.length },
      heightStats: {
        min: heights[0],
        median: heights[Math.floor(heights.length / 2)],
        max: heights[heights.length - 1],
      },
    },
    buildings,
    roads,
    green,
    water,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(world));

  const stats = await import("node:fs/promises").then((fs) => fs.stat(OUT));
  console.log(`\nwrote ${OUT}`);
  console.log(`  ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  heights: ${heights[0]}m → ${heights[heights.length - 1]}m (median ${world.meta.heightStats.median}m)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
