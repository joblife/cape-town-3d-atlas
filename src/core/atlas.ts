/**
 * The atlas: owns the MapLibre instance, the camera, and the paint retargeting
 * used by the lighting model. Everything else in the app talks to this object
 * rather than to MapLibre directly.
 */

import { Map as MapLibreMap } from "maplibre-gl";
import type { ErrorEvent, LngLatLike } from "maplibre-gl";
import {
  buildStyle,
  buildingHeight,
  LAYER_BUILDINGS,
  SOURCE_TERRAIN,
  SURFACE_LAYERS,
  TERRAIN_EXAGGERATION,
} from "../map/style.ts";
import { CinematicCamera } from "./camera.ts";
import { shade } from "../util/color.ts";
import type { Insets } from "./geo.ts";
import { NO_INSETS } from "./geo.ts";
import type { Grade, SurfaceKey } from "./presets.ts";

export interface AtlasOptions {
  container: HTMLElement;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  base: string;
  water: string;
  buildings: boolean;
  terrain: boolean;
  heightScale: number;
}

/** The home shot: dense enough that the city reads as a built thing, wide
 *  enough for the mountain wall and the harbour basin to frame it. */
export const CITY_SHOT = { lon: 18.4246, lat: -33.9195, zoom: 14.15, pitch: 62, bearing: -18 };

/** The establishing shot: the whole peninsula head, terrain only, used for the
 *  opening beat before the camera descends into the streets. */
export const WIDE_SHOT = { lon: 18.4055, lat: -33.9385, zoom: 11.4, pitch: 46, bearing: -22 };

export class Atlas {
  readonly map: MapLibreMap;
  readonly camera: CinematicCamera;

  private insets: Insets = NO_INSETS;
  private loaded = false;
  private wantTerrain: boolean;
  private wantBuildings: boolean;
  private heightScale: number;
  private targetGrade: Grade | null = null;
  private readyPromise: Promise<void>;

  constructor(options: AtlasOptions) {
    this.heightScale = options.heightScale;

    this.map = new MapLibreMap({
      container: options.container,
      style: buildStyle({ base: options.base, water: options.water }),
      center: options.center,
      zoom: options.zoom,
      pitch: options.pitch,
      bearing: options.bearing,
      maxPitch: 74,
      minZoom: 9.2,
      maxZoom: 18.4,
      attributionControl: false,
      // A city reads truer on a flat plane than on a globe, so projection stays
      // mercator; the terrain supplies all the three-dimensionality needed.
      fadeDuration: 220,
      // Slight restraint on inertia makes the model feel heavier and calmer.
      dragPan: { linearity: 0.32, maxSpeed: 1400 },
      touchPitch: true,
    });

    this.camera = new CinematicCamera({
      map: this.map,
      insets: () => this.insets,
      locked: () => false,
    });

    const ready = Promise.withResolvers<void>();
    this.readyPromise = ready.promise;
    // Nothing may touch terrain, layout or padding before the style has
    // loaded — MapLibre throws rather than queueing.
    this.map.once("load", () => {
      this.loaded = true;
      this.applyInitialState();
      ready.resolve();
    });

    // Map failures are surfaced rather than swallowed: the map is the product.
    this.map.on("error", (e: ErrorEvent) => {
      const message = e.error instanceof Error ? e.error.message : String(e.error ?? e);
      document.documentElement.dataset.mapError = message.slice(0, 300);
      console.error("[atlas] map error:", message);
    });
    this.map.on("style.load", () => {
      document.documentElement.dataset.mapStyle = "loaded";
    });

    this.map.on("styleimagemissing", (e) => {
      if (this.map.hasImage(e.id)) return;
      // OpenMapTiles references a handful of sprites we do not ship; give them
      // an empty image so nothing warns or renders a placeholder.
      this.map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) });
    });

    this.wantTerrain = options.terrain;
    this.wantBuildings = options.buildings;
    this.heightScale = options.heightScale;
  }

  private applyInitialState(): void {
    this.setTerrainEnabled(this.wantTerrain);
    this.setBuildingsVisible(this.wantBuildings);
    this.setHeightScale(this.heightScale);
    this.map.setPadding(this.insets);
  }

  get ready(): Promise<void> {
    return this.readyPromise;
  }

  /* ── framing ─────────────────────────────────────────────────── */

  setInsets(insets: Insets): void {
    this.insets = insets;
    if (this.loaded) this.map.setPadding(insets);
  }

  get currentInsets(): Insets {
    return this.insets;
  }

  /** Projection of a coordinate, in canvas pixels. */
  project(lon: number, lat: number): { x: number; y: number } {
    const p = this.map.project([lon, lat] as LngLatLike);
    return { x: p.x, y: p.y };
  }

  /** Ground elevation under a coordinate, in metres (0 when terrain is off). */
  elevationAt(lon: number, lat: number): number {
    if (!this.loaded) return 0;
    try {
      return this.map.queryTerrainElevation([lon, lat] as LngLatLike) ?? 0;
    } catch {
      return 0;
    }
  }

  /** Wait until the map has actually painted tiles, not merely loaded its style. */
  async idle(timeoutMs = 14000): Promise<void> {
    if (this.map.loaded() && this.map.areTilesLoaded()) return;
    const { promise, resolve } = Promise.withResolvers<void>();
    const done = (): void => {
      this.map.off("idle", done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, timeoutMs);
    this.map.once("idle", done);
    await promise;
  }

  /* ── paint retargeting ───────────────────────────────────────── */

  /**
   * Apply a lighting grade to the live style. Nothing here reloads a style:
   * every property is retargeted, which is what lets the sun move smoothly.
   */
  applyGrade(grade: Grade): void {
    if (!this.loaded) return;
    this.targetGrade = grade;
    const map = this.map;

    for (const [surface, layerIds] of Object.entries(SURFACE_LAYERS) as [SurfaceKey, readonly string[]][]) {
      const color = grade.surfaces[surface];
      if (!color) continue;
      for (const id of layerIds) {
        if (!map.getLayer(id)) continue;
        const type = map.getLayer(id)!.type;
        if (type === "fill") map.setPaintProperty(id, "fill-color", color);
        else if (type === "line") map.setPaintProperty(id, "line-color", color);
      }
    }

    if (map.getLayer("background")) {
      map.setPaintProperty("background", "background-color", grade.surfaces.land);
    }
    if (map.getLayer("water")) {
      map.setPaintProperty("water", "fill-opacity", grade.waterOpacity);
    }
    if (map.getLayer(LAYER_BUILDINGS)) {
      map.setPaintProperty(LAYER_BUILDINGS, "fill-extrusion-color", [
        "case",
        [">=", ["coalesce", ["get", "render_height"], ["*", ["coalesce", ["get", "render_levels"], 2], 3.2], 6.5], 62],
        grade.surfaces.buildingHigh,
        [">=", ["coalesce", ["get", "render_height"], ["*", ["coalesce", ["get", "render_levels"], 2], 3.2], 6.5], 20],
        grade.surfaces.buildingMid,
        grade.surfaces.buildingLo,
      ]);
      map.setPaintProperty(LAYER_BUILDINGS, "fill-extrusion-opacity", grade.buildingOpacity);
    }
    if (map.getLayer("hillshade")) {
      // Relief is exaggerated at night, when form is all the eye has to go on.
      map.setPaintProperty("hillshade", "hillshade-exaggeration", 0.3 + grade.grade * 0.9);
    }
  }

  applySky(grade: Grade): void {
    if (!this.loaded) return;
    try {
      this.map.setSky({
        "sky-color": grade.sky,
        "horizon-color": grade.horizon,
        "fog-color": grade.fog,
        "fog-ground-blend": 0.42,
        "horizon-fog-blend": 0.62,
        "sky-horizon-blend": 0.62,
        "atmosphere-blend": 0.9,
      });
    } catch {
      /* Older builds may reject a key; the base colours still apply. */
    }
  }

  /**
   * Point the scene's single directional light at the real sun. `anchor: "map"`
   * makes the azimuth geographic, so a north-facing wall is in shadow when the
   * sun is in the north — and the shading stays correct as the map rotates.
   */
  applyLights(grade: Grade, position: [number, number, number], sunAzimuth: number): void {
    if (!this.loaded) return;
    this.map.setLight({
      anchor: "map",
      color: grade.sunColor,
      intensity: grade.lightIntensity,
      position,
    });
    // The terrain relief should be lit by the same sun as the buildings.
    if (this.map.getLayer("hillshade")) {
      this.map.setPaintProperty("hillshade", "hillshade-illumination-direction", sunAzimuth);
      this.map.setPaintProperty(
        "hillshade",
        "hillshade-shadow-color",
        shade(grade.surfaces.rock, -0.55),
      );
      this.map.setPaintProperty("hillshade", "hillshade-highlight-color", grade.surfaces.sand);
      this.map.setPaintProperty("hillshade", "hillshade-accent-color", grade.surfaces.rock);
    }
  }

  /* ── layer toggles ───────────────────────────────────────────── */

  setBuildingsVisible(visible: boolean): void {
    this.wantBuildings = visible;
    if (!this.loaded || !this.map.getLayer(LAYER_BUILDINGS)) return;
    this.map.setLayoutProperty(LAYER_BUILDINGS, "visibility", visible ? "visible" : "none");
  }

  setTerrainEnabled(enabled: boolean): void {
    this.wantTerrain = enabled;
    if (!this.loaded) return;
    this.map.setTerrain(enabled ? { source: SOURCE_TERRAIN, exaggeration: TERRAIN_EXAGGERATION } : null);
  }

  setHeightScale(scale: number): void {
    this.heightScale = scale;
    if (!this.loaded || !this.map.getLayer(LAYER_BUILDINGS)) return;
    this.map.setPaintProperty(LAYER_BUILDINGS, "fill-extrusion-height", buildingHeight(scale));
  }

  /* ── vector hit testing ──────────────────────────────────────── */

  /** Topmost building under a screen point, if any. */
  buildingAt(x: number, y: number): { name: string | null; height: number; levels: number } | null {
    if (!this.loaded || !this.map.isStyleLoaded() || !this.map.getLayer(LAYER_BUILDINGS)) return null;
    let features;
    try {
      features = this.map.queryRenderedFeatures([x, y], { layers: [LAYER_BUILDINGS] });
    } catch {
      return null;
    }
    if (!features.length) return null;
    const f = features[0];
    const props = f.properties as Record<string, unknown>;
    const levels = Number(props.render_levels ?? 0);
    const height = Number(
      props.render_height ?? (levels ? levels * 3.2 : 0),
    );
    return {
      name: typeof props.name === "string" ? props.name : null,
      height: Number.isFinite(height) ? height : 0,
      levels: Number.isFinite(levels) ? levels : 0,
    };
  }

  /** Whether terrain is currently active. */
  get heightMultiplier(): number {
    return this.heightScale;
  }

  get lastGrade(): Grade | null {
    return this.targetGrade;
  }

  destroy(): void {
    this.map.remove();
  }
}
