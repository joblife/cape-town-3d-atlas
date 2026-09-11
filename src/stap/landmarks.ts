/**
 * Landmarks on foot.
 *
 * The atlas knows 37 places by coordinate; on foot they need a position in the
 * same local metres as the baked city, and a rule for when the walker has
 * arrived. A place with no buildings around it — a summit, a beach — still works:
 * arrival is proximity to the point, not to geometry.
 */

import { PLACES, PLACES_BY_DISTRICT, accentFor, KIND_META } from "../data/index.ts";
import { STAP_META } from "../data/stap.ts";
import type { Place } from "../data/types.ts";
import type { BakedWorld } from "./city.ts";

export interface Landmark {
  place: Place;
  /** Local metres, matching the baked city. */
  x: number;
  z: number;
  /** Anchoring year and notebook line. */
  year: string;
  caption: string;
  stamp: string;
  accent: string;
  glyph: string;
  /** A building near this point, if it has a name, for the arrival line. */
  neighbour: string | null;
}

const RAD = Math.PI / 180;

/** Degrees to the same local metre plane the baker used. */
export function projectToLocal(world: BakedWorld, lon: number, lat: number): { x: number; z: number } {
  const { origin } = world.meta;
  const mPerDegLat = 111132;
  const mPerDegLon = 111320 * Math.cos(origin.lat * RAD);
  return { x: (lon - origin.lon) * mPerDegLon, z: (lat - origin.lat) * mPerDegLat };
}

export function buildLandmarks(world: BakedWorld): Landmark[] {
  const named: { name: string; x: number; z: number }[] = [];
  for (const b of world.buildings) {
    if (!b.n) continue;
    let cx = 0, cz = 0;
    for (let i = 0; i < b.f.length; i += 2) {
      cx += b.f[i];
      cz += b.f[i + 1];
    }
    const n = b.f.length / 2;
    named.push({ name: b.n, x: cx / n, z: cz / n });
  }

  return PLACES.map((place) => {
    const { x, z } = projectToLocal(world, place.lon, place.lat);
    const meta = STAP_META[place.id];
    // The nearest named building gives the arrival a local voice.
    let neighbour: string | null = null;
    let best = 90;
    for (const candidate of named) {
      const d = Math.hypot(candidate.x - x, candidate.z - z);
      if (d < best) {
        best = d;
        neighbour = candidate.name;
      }
    }
    return {
      place,
      x,
      z,
      year: meta?.year ?? "—",
      caption: meta?.caption ?? place.tagline,
      stamp: meta?.stamp ?? "◆",
      accent: accentFor(place),
      glyph: KIND_META[place.kind].glyph,
      neighbour: neighbour && neighbour.toLowerCase() !== place.name.toLowerCase() ? neighbour : null,
    };
  });
}

/** Landmarks inside the baked area — the ones you can actually walk to. */
export function walkableLandmarks(all: Landmark[], world: BakedWorld): Landmark[] {
  const { bbox } = world.meta;
  return all.filter(
    (l) =>
      l.place.lon >= bbox.west - 0.002 &&
      l.place.lon <= bbox.east + 0.002 &&
      l.place.lat >= bbox.south - 0.002 &&
      l.place.lat <= bbox.north + 0.002,
  );
}

/** How close the walker must be for a place to count as reached, in metres. */
export const ARRIVE_RADIUS = 34;

export function nearestLandmark(landmarks: Landmark[], x: number, z: number): { landmark: Landmark; distance: number } | null {
  let best: Landmark | null = null;
  let bestD = Infinity;
  for (const l of landmarks) {
    const d = Math.hypot(l.x - x, l.z - z);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best ? { landmark: best, distance: bestD } : null;
}

/** Which district a landmark belongs to, for colour and grouping. */
export function districtOf(landmark: Landmark): string {
  const groups = PLACES_BY_DISTRICT;
  for (const [id, places] of Object.entries(groups)) {
    if (places.some((p) => p.id === landmark.place.id)) {
      return id;
    }
  }
  return landmark.place.district;
}

/**
 * A point on a street, near a landmark.
 *
 * Walking should start on a road, not at a coordinate that happens to be
 * adjacent to one: an arbitrary offset from a landmark regularly lands inside a
 * building or in a gap between two, where collision leaves the walker with
 * nowhere to go. Roads are the one part of the city guaranteed to be open.
 */
export function streetNear(world: BakedWorld, x: number, z: number): { x: number; z: number } {
  let best = { x, z };
  let bestD = Infinity;
  for (const road of world.roads) {
    const p = road.p;
    // Check every vertex; the network is dense enough that this is within a few
    // metres of the true nearest point for our purposes.
    for (let i = 0; i < p.length; i += 2) {
      const d = (p[i] - x) ** 2 + (p[i + 1] - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: p[i], z: p[i + 1] };
      }
    }
  }
  return best;
}

/**
 * The most built-up point on the street network.
 *
 * Spawning at the street nearest the bake's centre regularly drops the walker in
 * the Foreshore or on a harbour edge, where the city thins out and the view is
 * empty ground — technically correct, and a bad first impression. Scoring every
 * road vertex by how much building stands near it puts the walk where the city
 * actually is.
 */
export function busiestStreet(
  world: BakedWorld,
  radius = 45,
): { x: number; z: number; neighbours: number } {
  // Centroids once, so scoring is a cheap distance test rather than a scan of
  // every footprint for every candidate.
  const centres: number[] = [];
  for (const b of world.buildings) {
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < b.f.length; i += 2) {
      cx += b.f[i];
      cz += b.f[i + 1];
    }
    const n = b.f.length / 2;
    centres.push(cx / n, cz / n);
  }

  let best = { x: 0, z: 0, neighbours: -1 };
  const r2 = radius * radius;
  // Sampling every eighth vertex is plenty: consecutive vertices are a few
  // metres apart and the density field is smooth.
  for (const road of world.roads) {
    const p = road.p;
    for (let i = 0; i < p.length; i += 16) {
      const x = p[i];
      const z = p[i + 1];
      let count = 0;
      for (let c = 0; c < centres.length; c += 2) {
        const dx = centres[c] - x;
        const dz = centres[c + 1] - z;
        if (dx * dx + dz * dz < r2) count++;
      }
      if (count > best.neighbours) best = { x, z, neighbours: count };
    }
  }
  return best;
}
