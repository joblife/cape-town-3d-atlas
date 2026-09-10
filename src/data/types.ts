/**
 * Data contracts for the atlas. Everything the UI renders comes from here, so
 * these types are the single source of truth for content shape.
 */

/** Camera shot. `zoom`/`pitch`/`bearing` are MapLibre values at the target. */
export interface Shot {
  lon: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
  /** Optional lift (metres) added to the camera target elevation, for summits. */
  lift?: number;
}

export type PlaceCamera = {
  /** Establishing shot used when a place is opened. */
  hero: Shot;
  /** Wider shot used at the start of a story beat. */
  context?: Shot;
  /** Tight shot for detail beats. */
  close?: Shot;
};

export type PlaceKind =
  | "landmark"
  | "nature"
  | "beach"
  | "museum"
  | "viewpoint"
  | "civic"
  | "market"
  | "neighbourhood"
  | "food"
  | "sport"
  | "transport"
  | "hidden";

export interface Fact {
  /** e.g. "Built", "Height", "Opened" */
  label: string;
  /** e.g. "1666", "1,085 m", "1988" */
  value: string;
}

export interface TimelineEntry {
  /** Year or short date, e.g. "1652" or "11 Feb 1990". */
  year: string;
  text: string;
}

export interface Place {
  /** kebab-case slug, unique, used in URLs. */
  id: string;
  name: string;
  /** Two to four words for map beacons and list rows. */
  short: string;
  /** Editorial tag line, sentence case, no full stop, max ~60 chars. */
  tagline: string;
  kind: PlaceKind;
  /** District id from DISTRICTS. */
  district: string;
  lon: number;
  lat: number;
  /** 1–3 sentences. The pitch, not a summary. */
  standfirst: string;
  /** 2–4 paragraphs of real narrative. No marketing adjectives. */
  story: string[];
  /** 4–6 short facts. `value` stays under ~18 chars. */
  facts: Fact[];
  timeline?: TimelineEntry[];
  /** 3–5 observational prompts: what to actually look at on the ground. */
  lookFor?: string[];
  /** Practical notes: getting there, when to go, cost, accessibility. */
  practical?: Fact[];
  camera: PlaceCamera;
  /** Search synonyms and themes. 3–8 lowercase terms. */
  tags: string[];
  /** Wikipedia article title for the optional archival image/extract. */
  wiki?: string;
  /** Featured in the default "arrival" set. */
  featured?: boolean;
}

export interface District {
  id: string;
  name: string;
  /** Short descriptor, e.g. "Cobbles, colour and steep streets". */
  signature: string;
  /** 2–3 paragraphs introducing the district as a whole. */
  essay: string[];
  /** Camera used when the district is opened. */
  center: Shot;
  /** Rough boundary ring, [lon, lat] pairs, 8–16 points, drawn as a soft plate. */
  polygon: [number, number][];
  /** Landmark place ids that sit in this district (filled by the data index). */
  anchors?: string[];
}

export interface StoryStop {
  placeId: string;
  /** One to two sentences spoken while the camera rests here. */
  narration: string;
  /** Which shot of the place to hold. Defaults to "hero". */
  shot?: "hero" | "context" | "close";
  /** Seconds to hold before advancing. 9–20. */
  seconds: number;
}

export interface Story {
  id: string;
  title: string;
  /** e.g. "Six stops · 9 minutes" */
  subtitle: string;
  /** One sentence: what this route argues. */
  thesis: string;
  /** Short theme word for chips, e.g. "Memory". */
  theme: string;
  /** Approximate total runtime in seconds, derived from stops. */
  stops: StoryStop[];
  /** Accent colour for the story's plate, hex. */
  accent: string;
}

export interface AtlasData {
  places: Place[];
  districts: District[];
  stories: Story[];
}
