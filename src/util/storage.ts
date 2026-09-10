/** Local persistence: what the visitor has seen, and how they like the map. */

const NS = "capetown-atlas:v2:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* Private mode or quota — the atlas works fine without persistence. */
  }
}

export const store = {
  get: read,
  set: write,
  remove(key: string): void {
    try {
      localStorage.removeItem(NS + key);
    } catch {
      /* ignore */
    }
  },
};

export interface Prefs {
  /** "auto" follows the real Cape Town sun. */
  timeMode: "auto" | "manual";
  /** Minutes since midnight in Cape Town when timeMode is manual. */
  manualMinutes: number;
  /** Follow actual live weather from Open-Meteo. */
  liveWeather: boolean;
  buildings: boolean;
  beacons: boolean;
  terrain: boolean;
  heightScale: number;
}

export const DEFAULT_PREFS: Prefs = {
  timeMode: "auto",
  manualMinutes: 17 * 60 + 30,
  liveWeather: true,
  buildings: true,
  beacons: true,
  terrain: true,
  // The model is a miniature: the terrain is exaggerated 1.18x and building
  // heights 1.2x so a low-rise city still reads as relief. Both are disclosed
  // in the layers panel and the About dialog.
  heightScale: 1.2,
};

export const loadPrefs = (): Prefs => ({ ...DEFAULT_PREFS, ...read<Partial<Prefs>>("prefs", {}) });
export const savePrefs = (p: Prefs): void => write("prefs", p);

export const loadVisited = (): string[] => read<string[]>("visited", []);
export const saveVisited = (ids: string[]): void => write("visited", ids);

export const hasSeenWelcome = (): boolean => read<boolean>("welcomed", false);
export const markWelcomed = (): void => write("welcomed", true);
