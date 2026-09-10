/**
 * Solar and lunar geometry for Cape Town.
 *
 * Everything the lighting system needs is derived here from a single Date, so
 * the atlas can follow the real sky. Almanac accuracy (NOAA formulation): solar
 * altitude/azimuth to ~0.01°, rise/set times to well under a minute, which is
 * far tighter than a city skyline can show.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export const SITE = {
  name: "Cape Town",
  lon: 18.4241,
  lat: -33.9249,
  timeZone: "Africa/Johannesburg",
};

/** Minutes to add to UTC for the given zone on the given instant. */
export function tzOffsetMinutes(date: Date, timeZone: string = SITE.timeZone): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** The wall-clock date/time in the site's zone, as plain numbers. */
export function zonedNow(date: Date, timeZone: string = SITE.timeZone): { y: number; m: number; d: number; minutes: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return { y: p.year, m: p.month, d: p.day, minutes: p.hour * 60 + p.minute };
}

/** Build the Date whose Cape Town wall clock reads the given minutes today. */
export function dateAtSiteMinutes(minutes: number, now: Date = new Date()): Date {
  const { y, m, d } = zonedNow(now);
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offset = tzOffsetMinutes(new Date(utcGuess));
  return new Date(utcGuess + minutes * 60000 - offset * 60000);
}

export function formatClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const mm = Math.floor(wrapped % 60);
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const norm360 = (x: number): number => ((x % 360) + 360) % 360;

/** Days since J2000.0 */
function julianDays(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5 - 2451545.0;
}

export interface Equatorial {
  /** right ascension, degrees */
  ra: number;
  /** declination, degrees */
  dec: number;
  /** ecliptic longitude, degrees */
  lon: number;
}

function sunEquatorial(n: number): Equatorial {
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * DEG;
  const lambda = L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
  const eps = (23.439 - 0.0000004 * n) * DEG;
  const ra = norm360(Math.atan2(Math.cos(eps) * Math.sin(lambda * DEG), Math.cos(lambda * DEG)) * RAD);
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda * DEG)) * RAD;
  return { ra, dec, lon: norm360(lambda) };
}

function moonEquatorial(n: number): Equatorial {
  const L = 218.316 + 13.176396 * n;
  const M = (134.963 + 13.064993 * n) * DEG;
  const F = (93.272 + 13.22935 * n) * DEG;
  const lon = norm360(L + 6.289 * Math.sin(M));
  const lat = 5.128 * Math.sin(F);
  const eps = (23.439 - 0.0000004 * n) * DEG;
  const l = lon * DEG;
  const b = lat * DEG;
  const ra = norm360(
    Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l)) * RAD,
  );
  const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l)) * RAD;
  return { ra, dec, lon };
}

interface AltAz {
  altitude: number;
  azimuth: number;
}

function altAz(eq: Equatorial, n: number, lon: number, lat: number): AltAz {
  // Greenwich mean sidereal time, in hours, then local.
  const gmst = 18.697374558 + 24.06570982441908 * n;
  const lst = norm360((gmst + lon / 15) * 15);
  const H = (lst - eq.ra) * DEG;
  const phi = lat * DEG;
  const d = eq.dec * DEG;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H)) * RAD;
  const azimuth = norm360(180 + Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi)) * RAD);
  return { altitude, azimuth };
}

/** Hour angle at which the sun's centre sits at `altitude`, in degrees.
 *  Returns null when the sun never reaches that altitude on this date. */
function hourAngleAt(altitude: number, dec: number, lat: number): number | null {
  const cosH =
    (Math.sin(altitude * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG)) /
    (Math.cos(lat * DEG) * Math.cos(dec * DEG));
  if (cosH > 1 || cosH < -1) return null;
  return Math.acos(cosH) * RAD;
}

export interface SunTimes {
  solarNoon: number;
  sunrise: number | null;
  sunset: number | null;
  goldenMorningStart: number | null;
  goldenEveningEnd: number | null;
  civilDawn: number | null;
  civilDusk: number | null;
  nauticalDawn: number | null;
  nauticalDusk: number | null;
  /** minutes of daylight, 0 when the sun stays down */
  daylightMinutes: number;
}

export function sunTimes(date: Date, lon = SITE.lon, lat = SITE.lat, tzOffset = tzOffsetMinutes(date)): SunTimes {
  const n = julianDays(date);
  const eq = sunEquatorial(n);
  // Equation of time, minutes.
  let eqTime = 4 * (eq.lon - eq.ra);
  if (eqTime > 20) eqTime -= 1440;
  if (eqTime < -20) eqTime += 1440;

  const noon = 720 - 4 * lon - eqTime + tzOffset;
  const at = (alt: number): { rise: number; set: number } | null => {
    const H = hourAngleAt(alt, eq.dec, lat);
    if (H === null) return null;
    return { rise: noon - 4 * H, set: noon + 4 * H };
  };

  const official = at(-0.833);
  const civil = at(-6);
  const nautical = at(-12);
  const golden = at(6);

  return {
    solarNoon: noon,
    sunrise: official?.rise ?? null,
    sunset: official?.set ?? null,
    goldenMorningStart: golden?.rise ?? null,
    goldenEveningEnd: golden?.set ?? null,
    civilDawn: civil?.rise ?? null,
    civilDusk: civil?.set ?? null,
    nauticalDawn: nautical?.rise ?? null,
    nauticalDusk: nautical?.set ?? null,
    daylightMinutes: official ? official.set - official.rise : 0,
  };
}

export type SkyPhase = "night" | "astronomical" | "nautical" | "blue" | "golden" | "day";

export interface SkyState {
  /** the instant being described */
  date: Date;
  /** Cape Town wall-clock minutes since midnight */
  minutes: number;
  /** Sun altitude above the horizon, degrees (negative = below) */
  altitude: number;
  /** Compass azimuth of the sun, degrees clockwise from north */
  azimuth: number;
  /** Moon altitude/azimuth/illumination */
  moon: { altitude: number; azimuth: number; illumination: number; waxing: boolean };
  /** 0 at night, 1 in full day. Drives light intensity and material blending. */
  daylight: number;
  /** 0 during the day, 1 in deep night */
  nightness: number;
  phase: SkyPhase;
  times: SunTimes;
}

export function skyAt(date: Date, lon = SITE.lon, lat = SITE.lat): SkyState {
  const n = julianDays(date);
  const tz = tzOffsetMinutes(date);
  const sun = altAz(sunEquatorial(n), n, lon, lat);
  const moonEq = moonEquatorial(n);
  const moonPos = altAz(moonEq, n, lon, lat);
  const sunLon = sunEquatorial(n).lon;
  let elongation = norm360(moonEq.lon - sunLon);
  const waxing = elongation < 180;
  const illumination = (1 - Math.cos(elongation * DEG)) / 2;

  const alt = sun.altitude;
  // Smooth day factor: fully dark 6° below the horizon, fully lit 3° above.
  const t = Math.max(0, Math.min(1, (alt + 6) / 9));
  const daylight = t * t * (3 - 2 * t);

  let phase: SkyPhase;
  if (alt > 8) phase = "day";
  else if (alt > -0.833) phase = "golden";
  else if (alt > -6) phase = "blue";
  else if (alt > -12) phase = "nautical";
  else if (alt > -18) phase = "astronomical";
  else phase = "night";

  const wall = zonedNow(date);

  return {
    date,
    minutes: wall.minutes,
    altitude: alt,
    azimuth: sun.azimuth,
    moon: {
      altitude: moonPos.altitude,
      azimuth: moonPos.azimuth,
      illumination,
      waxing,
    },
    daylight,
    nightness: 1 - daylight,
    phase,
    times: sunTimes(date, lon, lat, tz),
  };
}

/** Human label for the current light, e.g. "Golden hour", "Blue hour". */
export function phaseLabel(sky: SkyState): string {
  switch (sky.phase) {
    case "day":
      return "Daylight";
    case "golden":
      return sky.altitude > 3 ? "Late afternoon" : sky.altitude > 0 ? "Golden hour" : "Sunset";
    case "blue":
      return sky.altitude > -3 ? "Blue hour" : "Dusk";
    case "nautical":
      return "Twilight";
    case "astronomical":
      return "Nightfall";
    default:
      return "Night";
  }
}

export function phaseGlyph(sky: SkyState): string {
  switch (sky.phase) {
    case "day":
      return sky.altitude > 45 ? "☀" : "⛅";
    case "golden":
      return sky.altitude > 0 ? "◐" : "◑";
    case "blue":
      return "☾";
    default:
      return sky.moon.illumination > 0.5 ? "☾" : "✦";
  }
}
