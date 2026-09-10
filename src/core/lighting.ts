/**
 * The living light.
 *
 * Owns the clock: it either tracks the real Cape Town sun, or holds a time the
 * visitor has scrubbed to. Each tick it recomputes solar geometry, blends the
 * surface palette, and retargets the map's paint, sky and lights. Weather from
 * Open-Meteo is folded in as a soft veil — cloud flattens the light, wind
 * thickens the haze — which is the single biggest reason the same city reads
 * differently on different days.
 */

import type { Atlas } from "./atlas.ts";
import { gradeAt, horizonAt, lightPosition, type Grade } from "./presets.ts";
import {
  dateAtSiteMinutes,
  formatClock,
  phaseLabel,
  skyAt,
  zonedNow,
  type SkyState,
} from "./sun.ts";
import { mixHex } from "../util/color.ts";
import { raf } from "../util/dom.ts";

export interface Weather {
  temperature: number;
  cloudCover: number;
  windSpeed: number;
  code: number;
  description: string;
  isDay: boolean;
  fetchedAt: number;
}

export interface LightState {
  sky: SkyState;
  grade: Grade;
  /** Effective darkness after weather, 0–1. */
  darkness: number;
  weather: Weather | null;
}

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=-33.9249&longitude=18.4241" +
  "&current=temperature_2m,cloud_cover,wind_speed_10m,weather_code,is_day" +
  "&timezone=Africa%2FJohannesburg";

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export function weatherLabel(code: number): string {
  return WMO[code] ?? (code >= 95 ? "Thunderstorm" : code >= 60 ? "Rain" : "Cloudy");
}

interface LightingDeps {
  atlas: Atlas;
  /** Live weather is on. */
  useWeather: () => boolean;
  /** Manual time in minutes, or null to follow the real clock. */
  manualMinutes: () => number | null;
  /** Rendered when the state changes. */
  onState: (state: LightState) => void;
}

const TICK_MS = 30_000;

export class Lighting {
  private deps: LightingDeps;
  private weather: Weather | null = null;
  private stop: (() => void) | null = null;
  private lastKey = "";
  private state: LightState | null = null;
  private weatherAbort: AbortController | null = null;

  constructor(deps: LightingDeps) {
    this.deps = deps;
  }

  get current(): LightState | null {
    return this.state;
  }

  get currentWeather(): Weather | null {
    return this.weather;
  }

  /** Compute the state for the current clock without applying it. */
  private compute(): LightState {
    const manual = this.deps.manualMinutes();
    const now = new Date();
    const date = manual === null ? now : dateAtSiteMinutes(manual, now);
    const sky = skyAt(date);

    // Weather veils the light: cloud lifts the shadows and desaturates the sun,
    // which is most of the difference between a bright and a flat Cape day.
    const cloud = this.weather ? this.weather.cloudCover / 100 : 0;
    // Cloud takes the edge off the sun's angle without moving it.
    const effectiveAltitude = sky.altitude * (1 - cloud * 0.28);
    const grade = gradeAt(effectiveAltitude, sky.moon.illumination);
    const surfaces = grade.surfaces;

    if (cloud > 0.15) {
      // Overcast light is flatter and greyer than the clear-sky model.
      grade.lightIntensity *= 1 - cloud * 0.45;
      const grey = 0.34 * cloud;
      for (const key of Object.keys(surfaces) as (keyof typeof surfaces)[]) {
        if (key.startsWith("building") || key === "road" || key === "sand") continue;
        surfaces[key] = mixHex(surfaces[key], "#8d9199", grey * 0.5);
      }
    }

    return {
      sky,
      grade,
      darkness: 1 - sky.daylight,
      weather: this.weather,
    };
  }

  /** Apply the current state to the map and announce it. */
  apply(force = false): void {
    const state = this.compute();
    this.state = state;
    const { grade } = state;

    const horizon = horizonAt(grade, state.sky.altitude);
    const out = { ...grade, horizon };

    this.deps.atlas.applyGrade(out);
    this.deps.atlas.applySky(out);
    this.deps.atlas.applyLights(out, lightPosition(state.sky.azimuth, state.sky.altitude), state.sky.azimuth);

    const key = `${Math.round(state.sky.altitude * 4)}:${horizon}:${this.weather?.cloudCover ?? -1}`;
    if (force || key !== this.lastKey) {
      this.lastKey = key;
      this.deps.onState({ ...state, grade: out });
    }
  }

  start(): void {
    if (this.stop) return;
    this.apply(true);
    const tick = (): void => {
      const now = performance.now();
      if (now - last >= TICK_MS) {
        last = now;
        this.apply();
      }
    };
    let last = performance.now();
    this.stop = raf(tick);
  }

  stopClock(): void {
    this.stop?.();
    this.stop = null;
  }

  /** Fetch live conditions for the city. Safe to call repeatedly. */
  async loadWeather(): Promise<Weather | null> {
    this.weatherAbort?.abort();
    const controller = new AbortController();
    this.weatherAbort = controller;
    try {
      const res = await fetch(WEATHER_URL, { signal: controller.signal });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        current?: {
          temperature_2m: number;
          cloud_cover: number;
          wind_speed_10m: number;
          weather_code: number;
          is_day: number;
        };
      };
      const c = json.current;
      if (!c) return null;
      this.weather = {
        temperature: c.temperature_2m,
        cloudCover: c.cloud_cover,
        windSpeed: c.wind_speed_10m,
        code: c.weather_code,
        description: weatherLabel(c.weather_code),
        isDay: c.is_day === 1,
        fetchedAt: Date.now(),
      };
      if (this.deps.useWeather()) this.apply(true);
      return this.weather;
    } catch {
      return null;
    }
  }

  /** Drop live weather and return to clear skies. */
  clearWeather(): void {
    this.weatherAbort?.abort();
    this.weather = null;
    this.apply(true);
  }

  /** Notification lines for the UI, e.g. "20:12 · Golden hour". */
  describe(): { clock: string; phase: string; detail: string } {
    const state = this.state;
    if (!state) return { clock: "--:--", phase: "", detail: "" };
    const wall = zonedNow(state.sky.date);
    const clock = `${String(Math.floor(wall.minutes / 60)).padStart(2, "0")}:${String(wall.minutes % 60).padStart(2, "0")}`;
    const detail = describeDay(state);
    return { clock, phase: phaseLabel(state.sky), detail };
  }
}

/** A sentence about the shape of the day — useful, not decorative. */
export function describeDay(state: LightState): string {
  const { times } = state.sky;
  if (times.sunrise === null || times.sunset === null) {
    return "The sun stays below the horizon at this latitude today";
  }
  const h = Math.floor(times.daylightMinutes / 60);
  const m = Math.round(times.daylightMinutes % 60);
  return `Sunrise ${formatClock(times.sunrise)} · Sunset ${formatClock(times.sunset)} · ${h}h ${String(m).padStart(2, "0")}m of daylight`;
}

/** Presets offered in the time dialog: real moments worth looking at. */
export function timePresets(date: Date): { id: string; label: string; description: string; minutes: number | null }[] {
  const times = skyAt(date).times;
  return [
    { id: "now", label: "Now", description: "Follow the real Cape Town sky", minutes: null },
    {
      id: "dawn",
      label: "First light",
      description: "The city before the sun clears the Hottentots",
      minutes: times.sunrise !== null ? times.sunrise - 30 : 5 * 60 + 30,
    },
    {
      id: "morning",
      label: "Morning",
      description: "Clean air, long shadows off the mountain",
      minutes: times.sunrise !== null ? times.sunrise + 180 : 9 * 60,
    },
    {
      id: "noon",
      label: "Noon",
      description: "Overhead light, the clearest read of the terrain",
      minutes: times.solarNoon,
    },
    {
      id: "golden",
      label: "Golden hour",
      description: "The Atlantic seaboard at its best",
      minutes: times.sunset !== null ? times.sunset - 45 : 18 * 60,
    },
    {
      id: "blue",
      label: "Blue hour",
      description: "City lights coming on, sky still lit",
      minutes: times.sunset !== null ? times.sunset + 25 : 19 * 60,
    },
    {
      id: "night",
      label: "Night",
      description: "Lit streets, dark mountain, the southern sky",
      minutes: times.sunset !== null ? times.sunset + 150 : 22 * 60,
    },
  ];
}
