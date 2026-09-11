/**
 * Content invariants for the atlas.
 *
 * The content layer is authored by hand, so it is the part most likely to drift.
 * This checks the things a reader would notice: unreachable places, coordinates
 * that fall in the sea, cameras that would frame the wrong thing, story stops
 * that point at nothing, and district plates that do not contain their own
 * places.
 *
 * Run with `npm run verify:data`. Exits non-zero on any violation.
 */

import { DISTRICTS, PLACES, STORIES, PLACE_BY_ID, PLACES_BY_DISTRICT } from "../src/data/index.ts";

const PLACE_KINDS = new Set([
  "landmark", "nature", "beach", "museum", "viewpoint", "civic",
  "market", "neighbourhood", "food", "sport", "transport", "hidden",
]);

/** Greater Cape Town, generously bounded: the peninsula plus the Flats. */
const BOUNDS = { west: 18.30, east: 18.62, south: -34.42, north: -33.78 };

const problems = [];
const warn = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

/* ── places ─────────────────────────────────────────────────────── */

const ids = new Set();
for (const p of PLACES) {
  const at = `place "${p.id}"`;
  check(!ids.has(p.id), `${at}: duplicate id`);
  ids.add(p.id);

  check(/^[a-z0-9-]+$/.test(p.id), `${at}: id is not kebab-case`);
  check(p.name && p.name.length > 1, `${at}: missing name`);
  check(Boolean(p.tagline), `${at}: missing tagline`);
  check(p.tagline.length <= 72, `${at}: tagline is ${p.tagline.length} chars`);
  check(PLACE_KINDS.has(p.kind), `${at}: unknown kind "${p.kind}"`);
  check(Boolean(DISTRICTS.find((d) => d.id === p.district)), `${at}: unknown district "${p.district}"`);

  check(
    p.lon > BOUNDS.west && p.lon < BOUNDS.east && p.lat > BOUNDS.south && p.lat < BOUNDS.north,
    `${at}: coordinates ${p.lon},${p.lat} fall outside Cape Town`,
  );

  check(p.standfirst.length > 40, `${at}: standfirst is too short to be useful`);
  check(p.story.length >= 2 && p.story.length <= 5, `${at}: ${p.story.length} story paragraphs`);
  for (const para of p.story) {
    check(para.length > 120, `${at}: a story paragraph is suspiciously short (${para.length} chars)`);
  }

  check(p.facts.length >= 3, `${at}: only ${p.facts.length} facts`);
  for (const f of p.facts) {
    check(Boolean(f.label && f.value), `${at}: fact with an empty label or value`);
    check(f.value.length <= 24, `${at}: fact value "${f.value}" is too long for the grid`);
  }

  check((p.lookFor?.length ?? 0) >= 2, `${at}: fewer than two things to look for`);
  check(p.tags.length >= 3, `${at}: fewer than three search tags`);
  for (const t of p.tags) check(t === t.toLowerCase(), `${at}: tag "${t}" is not lowercase`);

  for (const key of ["hero", "context", "close"]) {
    const shot = p.camera[key];
    if (!shot) continue;
    check(shot.zoom >= 10 && shot.zoom <= 17.2, `${at}: ${key} zoom ${shot.zoom} is outside 10–17.2`);
    check(shot.pitch >= 30 && shot.pitch <= 72, `${at}: ${key} pitch ${shot.pitch} is outside 30–72`);
    check(
      shot.lon > BOUNDS.west - 0.3 && shot.lon < BOUNDS.east + 0.3 && shot.lat > BOUNDS.south - 0.3 && shot.lat < BOUNDS.north + 0.3,
      `${at}: ${key} camera points outside Cape Town`,
    );
  }

  // Selecting a place must centre that place: the marker has to stay at the
  // middle of the frame, so the shots used by the open/"look closer" actions
  // look straight at it. Composition lives in bearing, pitch and zoom instead.
  // `context` is the deliberate exception — it means "show me the surroundings".
  const metres = (a, b) => Math.hypot(a.lon - b.lon, a.lat - b.lat) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  for (const key of ["hero", "close"]) {
    const shot = p.camera[key];
    if (!shot) continue;
    const off = metres(shot, p);
    check(off < 25, `${at}: ${key} camera target is ${Math.round(off)} m from the marker — selecting it would not centre the place`);
  }
  const ctx = p.camera.context;
  if (ctx) {
    // A context shot may look wider, but it must still contain the place.
    check(
      ctx.zoom >= 10 && ctx.zoom <= p.camera.hero.zoom + 3,
      `${at}: context zoom ${ctx.zoom} is far wider than the hero shot`,
    );
  }
}

/* ── districts ──────────────────────────────────────────────────── */

function insidePolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

const districtIds = new Set();
for (const d of DISTRICTS) {
  const at = `district "${d.id}"`;
  check(!districtIds.has(d.id), `${at}: duplicate id`);
  districtIds.add(d.id);
  check(d.essay.length >= 2, `${at}: fewer than two essay paragraphs`);
  for (const para of d.essay) check(para.length > 120, `${at}: a paragraph is suspiciously short`);
  check(d.polygon.length >= 6, `${at}: polygon has only ${d.polygon.length} points`);

  const first = d.polygon[0];
  const last = d.polygon[d.polygon.length - 1];
  check(!(first[0] === last[0] && first[1] === last[1]), `${at}: polygon ring is already closed`);

  check(
    insidePolygon([d.center.lon, d.center.lat], d.polygon),
    `${at}: the district's own centre camera falls outside its boundary`,
  );

  const places = PLACES_BY_DISTRICT[d.id] ?? [];
  check(places.length > 0, `${at}: no places assigned to this district`);
  for (const p of places) {
    if (!insidePolygon([p.lon, p.lat], d.polygon)) {
      warn.push(`${at}: "${p.id}" sits outside the drawn boundary (${p.lon}, ${p.lat})`);
    }
  }
}

check(PLACES.length >= 30, `only ${PLACES.length} places — the roster lost entries`);

/* ── stories ────────────────────────────────────────────────────── */

const storyIds = new Set();
for (const s of STORIES) {
  const at = `story "${s.id}"`;
  check(!storyIds.has(s.id), `${at}: duplicate id`);
  storyIds.add(s.id);
  check(s.stops.length >= 3, `${at}: only ${s.stops.length} stops`);
  check(/^#[0-9A-Fa-f]{6}$/.test(s.accent), `${at}: accent "${s.accent}" is not a hex colour`);
  check(Boolean(s.thesis), `${at}: missing thesis`);
  check(Boolean(s.theme), `${at}: missing theme`);

  const seen = new Set();
  for (const stop of s.stops) {
    check(Boolean(PLACE_BY_ID[stop.placeId]), `${at}: stop references unknown place "${stop.placeId}"`);
    check(!seen.has(stop.placeId), `${at}: visits "${stop.placeId}" twice`);
    seen.add(stop.placeId);
    const words = stop.narration.trim().split(/\s+/).length;
    check(words >= 12 && words <= 60, `${at}: narration for "${stop.placeId}" is ${words} words`);
    check(stop.seconds >= 6 && stop.seconds <= 26, `${at}: "${stop.placeId}" holds for ${stop.seconds}s`);
  }
}

check(STORIES.length >= 3, `only ${STORIES.length} routes`);

/* ── report ─────────────────────────────────────────────────────── */

for (const w of warn) console.log(`warning  ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  error  ${p}`);
  process.exit(1);
}
console.log(
  `\nContent is sound: ${PLACES.length} places, ${DISTRICTS.length} districts, ${STORIES.length} routes` +
    (warn.length ? ` (${warn.length} boundary warnings)` : ""),
);
