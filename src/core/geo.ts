/** Geodesy and framing maths shared by the camera and the data layer. */

const R = 6371;
const DEG = Math.PI / 180;
export interface LngLat {
  lon: number;
  lat: number;
}

export function distanceKm(a: LngLat, b: LngLat): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Screen-space framing budget, in pixels. The camera keeps its subject inside
 *  the area the chrome has not claimed. */
export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const NO_INSETS: Insets = { left: 0, right: 0, top: 0, bottom: 0 };

/**
 * How long a flight between two shots should take. Shared with the data layer
 * so the runtime advertised for a story is the runtime it actually plays.
 */
export function flightDuration(
  a: { lon: number; lat: number; zoom: number },
  b: { lon: number; lat: number; zoom: number },
  pace = 1,
): number {
  const km = distanceKm(a, b);
  const zoomDelta = Math.abs(a.zoom - b.zoom);
  const raw = 1.9 + km * 0.42 + zoomDelta * 0.42;
  return Math.min(7600, Math.max(2600, raw)) * pace;
}

/**
 * Ground metres per screen pixel at a given zoom and latitude.
 *
 * The divisor is 512, not 256: MapLibre renders vector tiles at 512px, so this
 * is the scale the projection actually uses. Verified against the map's own
 * `project()` — at zoom 14.15 and 33.92°S the projection measures 3.594 m/px,
 * which this returns, while a 256px divisor gives 7.145 (exactly double).
 */
export function metresForZoom(zoom: number, latitude: number): number {
  return (40075016.686 * Math.cos(latitude * DEG)) / (512 * 2 ** zoom);
}

/** Snap a bearing to the nearest sensible quadrant so flights turn the short
 *  way round and do not whip the horizon. */
export function shortestTurn(from: number, to: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return from + delta;
}
