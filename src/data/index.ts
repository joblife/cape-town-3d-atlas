/**
 * The data index: combines the authored content files, attaches derived
 * relationships (district membership, adjacency, search), and exposes lookups
 * the rest of the app uses. Nothing here mutates the authored content shape.
 */

import type { District, Place, PlaceKind, Story } from "./types.ts";
import { PLACES_CITY_BOWL, PLACES_BO_KAAP, PLACES_CAPE_FLATS } from "./places-city.ts";
import { PLACES_WATERFRONT, PLACES_GREEN_POINT, PLACES_ATLANTIC, PLACES_CAMPS_BAY } from "./places-harbour.ts";
import { PLACES_TABLE_MOUNTAIN, PLACES_DEVILS_PEAK, PLACES_SOUTHERN, PLACES_WOODSTOCK } from "./places-mountain.ts";
import { PLACES_PENINSULA } from "./places-peninsula.ts";
import { DISTRICTS } from "./districts.ts";
import { STORIES } from "./stories.ts";

export { DISTRICTS, STORIES };
export type { District, Place, PlaceKind, Story };

const AUTHORED: Place[] = [
  ...PLACES_CITY_BOWL,
  ...PLACES_BO_KAAP,
  ...PLACES_CAPE_FLATS,
  ...PLACES_WATERFRONT,
  ...PLACES_GREEN_POINT,
  ...PLACES_ATLANTIC,
  ...PLACES_CAMPS_BAY,
  ...PLACES_TABLE_MOUNTAIN,
  ...PLACES_DEVILS_PEAK,
  ...PLACES_SOUTHERN,
  ...PLACES_WOODSTOCK,
  ...PLACES_PENINSULA,
];

const DISTRICT_ORDER: Record<string, number> = Object.fromEntries(DISTRICTS.map((d, i) => [d.id, i]));

/** Places in district order, then in authored order — a stable, geographic
 *  reading order that matches how the district plates present them. */
export const PLACES: Place[] = AUTHORED.map((p, i) => ({ p, i }))
  .sort((a, b) => {
    const da = DISTRICT_ORDER[a.p.district] ?? 99;
    const db = DISTRICT_ORDER[b.p.district] ?? 99;
    return da === db ? a.i - b.i : da - db;
  })
  .map(({ p }) => p);

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(PLACES.map((p) => [p.id, p]));
export const DISTRICT_BY_ID: Record<string, District> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));
export const PLACES_BY_DISTRICT: Record<string, Place[]> = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, PLACES.filter((p) => p.district === d.id)]),
);

export const DISTRICT_ACCENTS = ["#E0A45E", "#C2705E", "#7FA678", "#4E9DB5", "#8E86B8", "#D9A0B4"];

/** Kind metadata drives beacon colour, rail glyphs and plate accents, so the
 *  same taxonomy reads everywhere in the product. */
export const KIND_META: Record<PlaceKind, { label: string; glyph: string; accent: string }> = {
  landmark: { label: "Landmark", glyph: "◆", accent: "#E0A45E" },
  nature: { label: "Nature", glyph: "▲", accent: "#7FA678" },
  beach: { label: "Beach", glyph: "≋", accent: "#4E9DB5" },
  museum: { label: "Museum", glyph: "▣", accent: "#C2705E" },
  viewpoint: { label: "Viewpoint", glyph: "◉", accent: "#D9A0B4" },
  civic: { label: "Civic", glyph: "▤", accent: "#B8A88E" },
  market: { label: "Market", glyph: "▦", accent: "#D2B15E" },
  neighbourhood: { label: "Neighbourhood", glyph: "▩", accent: "#8E86B8" },
  food: { label: "Food", glyph: "✱", accent: "#D98F5E" },
  sport: { label: "Sport", glyph: "◯", accent: "#6FA8A0" },
  transport: { label: "Transport", glyph: "⇄", accent: "#8FA6B8" },
  hidden: { label: "Quiet spot", glyph: "◈", accent: "#9AA091" },
};

export const accentFor = (p: Place): string => KIND_META[p.kind]?.accent ?? "#E0A45E";

const R = 6371;
const rad = (d: number): number => (d * Math.PI) / 180;

export function distanceKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Places nearest a target, excluding itself, biased toward the same district
 *  so "next to this" reads as a coherent neighbourhood rather than a scatter. */
export function nearby(place: Place, limit = 4): Place[] {
  return PLACES.filter((p) => p.id !== place.id)
    .map((p) => ({ p, d: distanceKm(place, p) - (p.district === place.district ? 1.4 : 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ p }) => p);
}

export function prevPlace(place: Place): Place {
  const i = PLACES.findIndex((p) => p.id === place.id);
  return PLACES[(i - 1 + PLACES.length) % PLACES.length];
}

export function nextPlace(place: Place): Place {
  const i = PLACES.findIndex((p) => p.id === place.id);
  return PLACES[(i + 1) % PLACES.length];
}

/* ── search ─────────────────────────────────────────────────────────── */

export interface SearchHit {
  type: "place" | "district" | "story";
  id: string;
  name: string;
  sub: string;
  meta: string;
  accent: string;
  glyph: string;
  score: number;
}

const norm = (s: string): string => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, "");

function scoreText(q: string, text: string, weight: number): number {
  const t = norm(text);
  if (!t) return 0;
  if (t === q) return weight * 1.6;
  if (t.startsWith(q)) return weight * 1.25;
  if (t.includes(q)) return weight;
  // Sub-token match: "art museum" should find "Zeitz MOCAA (contemporary art museum)".
  const tokens = q.split(" ").filter((w) => w.length > 2);
  if (tokens.length > 1) {
    const hits = tokens.filter((w) => t.includes(w)).length;
    if (hits) return weight * 0.6 * (hits / tokens.length);
  }
  return 0;
}

export function searchPlaces(query: string, limit = 24): SearchHit[] {
  const q = norm(query.trim());
  if (!q) return [];

  const results: SearchHit[] = [];

  for (const p of PLACES) {
    let s = scoreText(q, p.name, 10) + scoreText(q, p.short, 8.5) + scoreText(q, p.tagline, 3);
    for (const t of p.tags) s = Math.max(s, scoreText(q, t, 6));
    s = Math.max(s, scoreText(q, p.district.replace("-", " "), 4.5));
    s += scoreText(q, p.standfirst, 1.2) * 0.5;
    if (p.featured) s *= 1.12;
    if (s > 0) {
      results.push({
        type: "place",
        id: p.id,
        name: p.name,
        sub: p.tagline,
        meta: DISTRICT_BY_ID[p.district]?.name ?? "",
        accent: accentFor(p),
        glyph: KIND_META[p.kind].glyph,
        score: s,
      });
    }
  }

  for (const d of DISTRICTS) {
    let s = scoreText(q, d.name, 9) + scoreText(q, d.signature, 2.5);
    for (const w of d.essay) s = Math.max(s, scoreText(q, w, 1.5) * 0.6);
    if (s > 0) {
      results.push({
        type: "district",
        id: d.id,
        name: d.name,
        sub: d.signature,
        meta: `${PLACES_BY_DISTRICT[d.id]?.length ?? 0} places`,
        accent: "#E0A45E",
        glyph: "▩",
        score: s,
      });
    }
  }

  for (const st of STORIES) {
    const s = scoreText(q, st.title, 9) + scoreText(q, st.theme, 5) + scoreText(q, st.thesis, 2);
    if (s > 0) {
      results.push({
        type: "story",
        id: st.id,
        name: st.title,
        sub: st.thesis,
        meta: `${st.stops.length} stops`,
        accent: st.accent,
        glyph: "▶",
        score: s,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ── stories ────────────────────────────────────────────────────────── */

/** Rough flight time for the camera move between two shots, matching the
 *  distance model in core/camera.ts. Kept here so a story's advertised
 *  runtime is the honest duration of what will actually play. */
function flightSeconds(a: { lon: number; lat: number; zoom: number }, b: { lon: number; lat: number; zoom: number }): number {
  const km = distanceKm(a, b);
  const zoomDelta = Math.abs(a.zoom - b.zoom);
  return Math.min(7.2, Math.max(2.6, 1.7 + km * 0.42 + zoomDelta * 0.42));
}

export function storyRuntime(story: Story): number {
  let total = 0;
  for (let i = 0; i < story.stops.length; i++) {
    const stop = story.stops[i];
    total += stop.seconds;
    const next = story.stops[i + 1];
    if (next) {
      const a = PLACE_BY_ID[stop.placeId];
      const b = PLACE_BY_ID[next.placeId];
      if (a && b) {
        const shotA = a.camera[stop.shot ?? "hero"] ?? a.camera.hero;
        const shotB = b.camera[next.shot ?? "hero"] ?? b.camera.hero;
        total += flightSeconds(shotA, shotB);
      }
    }
  }
  return total;
}

export function storyMeta(story: Story): string {
  const mins = Math.max(1, Math.round(storyRuntime(story) / 60));
  return `${story.stops.length} stops · ≈ ${mins} min`;
}

/** Every place grouped by district, in district order. */
export function groupedPlaces(): { district: District; places: Place[] }[] {
  return DISTRICTS.map((district) => ({ district, places: PLACES_BY_DISTRICT[district.id] ?? [] })).filter(
    (g) => g.places.length > 0,
  );
}
