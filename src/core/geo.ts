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

/** Convert a lng/lat delta into metres, for elevation-aware framing. */
export function metresForZoom(zoom: number, latitude: number): number {
  const earth = 40075016.686;
  const perPixel = (earth * Math.cos(latitude * DEG)) / (256 * 2 ** zoom);
  return perPixel;
}

/**
 * Given a shot and the wanted screen insets, return the adjusted camera target
 * so the subject lands in the middle of the visible (unpainted) area instead of
 * the middle of the window. Approximates the projection with a local tangent
 * plane, which is indistinguishable at these pitches.
 */
export function offsetForInsets(shot: LngLat & { zoom: number; bearing: number; pitch: number }, insets: Insets): LngLat {
  const dLeft = insets.left - insets.right;
  const dBottom = insets.bottom - insets.top;
  if (dLeft === 0 && dBottom === 0) return { lon: shot.lon, lat: shot.lat };

  const metresPerPixel = metresForZoom(shot.zoom, shot.lat);
  // Shift so the subject moves away from the heavier inset.
  const eastM = (-dLeft / 2) * metresPerPixel;
  const northM = (dBottom / 2) * metresPerPixel;

  // Pitch foreshortens vertical screen motion on the ground plane.
  const pitchFactor = 1 / Math.max(0.25, Math.cos(shot.pitch * DEG));
  const bearingRad = shot.bearing * DEG;
  const eastTotal = eastM + (-northM) * pitchFactor * Math.sin(bearingRad);
  const northTotal = northM * pitchFactor * Math.cos(bearingRad);

  const dLat = (northTotal / 111320) * 1;
  const dLon = eastTotal / (111320 * Math.cos(shot.lat * DEG));
  return { lon: shot.lon + dLon, lat: shot.lat + dLat };
}

/** Snap a bearing to the nearest sensible quadrant so flights turn the short
 *  way round and do not whip the horizon. */
export function shortestTurn(from: number, to: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return from + delta;
}
