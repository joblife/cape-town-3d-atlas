/**
 * District plates: translucent washes that show the shape of each district on
 * the ground. They appear when the visitor browses districts, so the index has
 * an answer to "where is this?" without a legend.
 */

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { District } from "../data/types.ts";
import { LAYER_BUILDINGS, ramp } from "../map/style.ts";

const SOURCE = "district-plates";
const FILL = "district-fill";
const LINE = "district-outline";
const LABEL = "district-label";

function toFeatureCollection(districts: District[], activeId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: districts.map((d) => ({
      type: "Feature" as const,
      id: d.id,
      properties: {
        id: d.id,
        name: d.name,
        active: d.id === activeId ? 1 : 0,
        color: "#E0A45E",
      },
      geometry: { type: "Polygon" as const, coordinates: [closeRing(d.polygon)] },
    })),
  };
}

/** GeoJSON polygons need an explicitly closed ring. */
function closeRing(ring: [number, number][]): [number, number][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export class DistrictPlates {
  private map: MapLibreMap;
  private districts: District[];
  private activeId: string | null = null;
  private shown = false;
  private installed = false;

  constructor(map: MapLibreMap, districts: District[]) {
    this.map = map;
    this.districts = districts;
  }

  install(): void {
    if (this.installed) return;
    const map = this.map;
    map.addSource(SOURCE, {
      type: "geojson",
      data: toFeatureCollection(this.districts, this.activeId),
    });

    // Sits under the buildings so the city stands on the plate.
    const before = map.getLayer(LAYER_BUILDINGS) ? LAYER_BUILDINGS : undefined;

    map.addLayer(
      {
        id: FILL,
        type: "fill",
        source: SOURCE,
        paint: {
          "fill-color": ["case", ["==", ["get", "active"], 1], "#E0A45E", "#8E86B8"],
          // Zoom must be the top-level input, so the active/inactive
          // difference lives in each stop rather than multiplying outside.
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            ["case", ["==", ["get", "active"], 1], 0.12, 0.05],
            13,
            ["case", ["==", ["get", "active"], 1], 0.11, 0.045],
            16,
            ["case", ["==", ["get", "active"], 1], 0.05, 0.02],
          ],
          "fill-antialias": true,
        },
        layout: { visibility: "none" },
      },
      before,
    );

    map.addLayer(
      {
        id: LINE,
        type: "line",
        source: SOURCE,
        paint: {
          "line-color": ["case", ["==", ["get", "active"], 1], "#F4C890", "#8E86B8"],
          "line-width": ["case", ["==", ["get", "active"], 1], 1.6, 1],
          "line-opacity": ["case", ["==", ["get", "active"], 1], 0.85, 0.34],
          "line-dasharray": [3, 2],
        },
        layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      },
      before,
    );

    // District names ride on the plate itself, so the map explains the index.
    map.addLayer(
      {
        id: LABEL,
        type: "symbol",
        source: SOURCE,
        minzoom: 11.2,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": ramp([[11.2, 11], [15, 15]]),
          "text-transform": "uppercase",
          "text-letter-spacing": 0.18,
          "text-max-width": 9,
          visibility: "none",
        },
        paint: {
          "text-color": ["case", ["==", ["get", "active"], 1], "#FFE2B8", "#D6D0DE"],
          "text-halo-color": "rgba(0,0,0,0.5)",
          "text-halo-width": 1.2,
          "text-opacity": ["case", ["==", ["get", "active"], 1], 0.95, 0.6],
        },
      },
      before,
    );

    this.installed = true;
    if (this.shown) this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    if (!this.installed) return;
    const value = visible ? "visible" : "none";
    for (const id of [FILL, LINE, LABEL]) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", value);
    }
  }

  /** Fade the plates back while a route plays, so they never fight the camera. */
  setEmphasis(dim: boolean): void {
    if (!this.installed || !this.map.getLayer(LINE)) return;
    this.map.setPaintProperty(LINE, "line-opacity-transition", { duration: 500 });
    this.map.setPaintProperty(LINE, "line-opacity", [
      "case",
      ["==", ["get", "active"], 1],
      dim ? 0.4 : 0.85,
      dim ? 0.12 : 0.34,
    ]);
  }

  /** Emphasise one district; null shows every plate at rest. */
  setActive(id: string | null): void {
    if (this.activeId === id) return;
    this.activeId = id;
    if (!this.installed) return;
    const src = this.map.getSource(SOURCE) as GeoJSONSource | undefined;
    src?.setData(toFeatureCollection(this.districts, id) as never);
  }

}
