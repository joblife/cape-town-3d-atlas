/**
 * Application state, and the URL that mirrors it.
 *
 * One small observable store; views read from a snapshot and call the action
 * helpers. The URL is a first-class output: every place, district and story is
 * linkable, and camera position rides along so a copied link restores the exact
 * view someone was looking at.
 */

import type { Prefs } from "../util/storage.ts";
import { loadPrefs, savePrefs } from "../util/storage.ts";

export type Panel = "index" | "focus";
export type BrowseTab = "places" | "districts" | "stories";
export type SheetLevel = "peek" | "half" | "full";

export type View =
  | { kind: "city" }
  | { kind: "place"; id: string }
  | { kind: "district"; id: string };

export interface StorySession {
  storyId: string;
  index: number;
  playing: boolean;
}

export interface AppSnapshot {
  view: View;
  tab: BrowseTab;
  filter: string | null;
  visited: string[];
  prefs: Prefs;
  photo: boolean;
  sheet: SheetLevel;
  story: StorySession | null;
  /** True until the visitor first interacts, for the opening shot. */
  pristine: boolean;
}

type Listener = (state: AppSnapshot, changed: Set<keyof AppSnapshot>) => void;

export class Store {
  private state: AppSnapshot;
  private listeners = new Set<Listener>();

  constructor(initial: Partial<AppSnapshot> = {}) {
    this.state = {
      view: { kind: "city" },
      tab: "places",
      filter: null,
      visited: [],
      prefs: loadPrefs(),
      photo: false,
      sheet: window.innerWidth <= 1024 ? "peek" : "half",
      story: null,
      pristine: true,
      ...initial,
    };
  }

  get(): AppSnapshot {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  update(patch: Partial<AppSnapshot>): void {
    const next = { ...this.state, ...patch };
    const changed = new Set<keyof AppSnapshot>();
    for (const key of Object.keys(patch) as (keyof AppSnapshot)[]) {
      // Identity comparison is enough: every caller passes a fresh object when
      // the value genuinely changed, and reusing a reference means no change.
      if (patch[key] !== undefined && this.state[key] !== next[key]) changed.add(key);
    }
    if (changed.size === 0) return;
    this.state = next;
    for (const fn of this.listeners) fn(this.state, changed);
  }

  setPrefs(patch: Partial<Prefs>): void {
    const prefs = { ...this.state.prefs, ...patch };
    savePrefs(prefs);
    this.update({ prefs });
  }

  /* ── visitation ─────────────────────────────────────────────── */

  visit(id: string): void {
    if (this.state.visited.includes(id)) return;
    this.update({ visited: [...this.state.visited, id] });
  }

  resetProgress(): void {
    this.update({ visited: [] });
  }

  /* ── view helpers ───────────────────────────────────────────── */

  get placeId(): string | null {
    return this.state.view.kind === "place" ? this.state.view.id : null;
  }

  get districtId(): string | null {
    return this.state.view.kind === "district" ? this.state.view.id : null;
  }

  get panel(): Panel {
    return this.state.view.kind === "city" ? "index" : "focus";
  }
}

/** The place a view is showing, if any. */
export const viewPlaceId = (view: View): string | null => (view.kind === "place" ? view.id : null);

/** The district a view is showing, if any. */
export const viewDistrictId = (view: View): string | null => (view.kind === "district" ? view.id : null);

/* ── URL mirroring ──────────────────────────────────────────────── */

export interface UrlState {
  view: View;
  /** Camera, present only when it is worth restoring. */
  camera?: { lon: number; lat: number; zoom: number; pitch: number; bearing: number };
  /** Cape Town minutes when the visitor has pinned a time. */
  time?: number;
  photo?: boolean;
}

const round = (n: number, places: number): number => Number(n.toFixed(places));

export function readUrl(): UrlState {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  let view: View = { kind: "city" };
  const place = params.get("place");
  const district = params.get("district");
  if (place) view = { kind: "place", id: place };
  else if (district) view = { kind: "district", id: district };

  const state: UrlState = { view };

  const cam = params.get("cam");
  if (cam) {
    const [lon, lat, zoom, pitch, bearing] = cam.split(",").map(Number);
    if ([lon, lat, zoom, pitch, bearing].every((n) => Number.isFinite(n))) {
      state.camera = { lon, lat, zoom, pitch, bearing };
    }
  }

  const time = Number(params.get("t"));
  if (Number.isFinite(time) && time >= 0 && time < 1440) state.time = time;
  if (params.get("photo") === "1") state.photo = true;

  return state;
}

export function writeUrl(state: UrlState, replace = true): void {
  const params = new URLSearchParams();
  if (state.view.kind === "place") params.set("place", state.view.id);
  else if (state.view.kind === "district") params.set("district", state.view.id);

  if (state.camera) {
    const { lon, lat, zoom, pitch, bearing } = state.camera;
    params.set("cam", [round(lon, 4), round(lat, 4), round(zoom, 2), round(pitch, 1), round(bearing, 1)].join(","));
  }
  if (state.time !== undefined) params.set("t", String(Math.round(state.time)));
  if (state.photo) params.set("photo", "1");

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

/** Bearing/zoom shown in the map's corner readout. */
export function formatBearing(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return dirs[i];
}
