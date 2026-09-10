/**
 * Beacons: the atlas's points of interest, drawn as flat DOM so they stay crisp
 * at any device pixel ratio, carry real type, and are reachable by keyboard.
 *
 * Projection runs once per animation frame off MapLibre's render loop. At low
 * altitudes they would be an unreadable cloud of labels, so above a zoom
 * threshold they de-clutter: the most important place in a tangle keeps its
 * label and the rest retire, which is what makes a dense city readable rather
 * than noisy.
 */

import type { Atlas } from "../core/atlas.ts";
import type { Place } from "../data/types.ts";
import { accentFor } from "../data/index.ts";
import { clamp, el } from "../util/dom.ts";

/** Above this zoom every beacon is shown and de-cluttering begins. */
const FULL_DETAIL_ZOOM = 13.4;
/** Below this zoom beacons are suppressed entirely — the city reads as terrain. */
const MIN_ZOOM = 10.6;

/** How many labels the map can carry before it turns to noise. Cape Town's
 *  City Bowl packs eight places into two square kilometres, so this cap does
 *  more work than the collision test — and a phone has far less room than a
 *  desktop, so the width matters as much as the zoom. */
function labelBudget(zoom: number, widthPx: number): number {
  const room = clamp(widthPx / 1500, 0.4, 1.15);
  return Math.round(clamp((3 + (zoom - MIN_ZOOM) * 4.6) * room, 3, 36));
}

interface Beacon {
  place: Place;
  node: HTMLButtonElement;
  /** Measured width, cached until the label changes. */
  width: number;
  height: number;
  x: number;
  y: number;
  visible: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP_Y = 23;
/** Minimum breathing room between two labels, in pixels. */
const LABEL_GAP = 3;

export interface BeaconOptions {
  root: HTMLElement;
  atlas: Atlas;
  places: Place[];
  onSelect: (id: string) => void;
  /** Called on pointer enter/leave, for the identify card. */
  onHover: (place: Place | null, x: number, y: number) => void;
}

export class Beacons {
  private opts: BeaconOptions;
  private list: Beacon[] = [];
  private byId = new Map<string, Beacon>();
  private order = new Map<string, number>();
  private activeId: string | null = null;
  private visited = new Set<string>();
  private enabled = true;
  private scheduled = false;
  private frame: number | null = null;

  constructor(opts: BeaconOptions) {
    this.opts = opts;

    for (const place of opts.places) {
      this.order.set(place.id, this.list.length);
      const accent = accentFor(place);
      const node = el("button", {
        class: "beacon",
        type: "button",
        dataset: { id: place.id },
        title: place.name,
      });
      node.style.setProperty("--beacon-accent", accent);
      node.innerHTML =
        `<span class="beacon__dot"></span>` +
        `<span class="beacon__name"></span>` +
        `<span class="beacon__visit"></span>` +
        `<span class="beacon__pulse"></span>`;
      node.querySelector(".beacon__name")!.textContent = place.short;
      // Start hidden and let the first layout decide: otherwise every node is
      // visible in the DOM before the density pass runs, and `hide()` cannot
      // turn off something it believes was never shown.
      node.style.display = "none";

      node.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.onSelect(place.id);
      });
      node.addEventListener("pointerenter", () => opts.onHover(place, this.px(node), this.py(node)));
      node.addEventListener("pointerleave", () => opts.onHover(null, 0, 0));
      node.addEventListener("focus", () => opts.onHover(place, this.px(node), this.py(node)));
      node.addEventListener("blur", () => opts.onHover(null, 0, 0));

      opts.root.appendChild(node);
      const beacon: Beacon = { place, node, width: 0, height: 0, x: 0, y: 0, visible: false };
      this.list.push(beacon);
      this.byId.set(place.id, beacon);
    }

    const invalidate = (): void => this.schedule();
    opts.atlas.map.on("move", invalidate);
    opts.atlas.map.on("zoom", invalidate);
    opts.atlas.map.on("rotate", invalidate);
    opts.atlas.map.on("pitch", invalidate);
    opts.atlas.map.on("resize", invalidate);
    // A camera restored from a link never moves, so nothing above would fire:
    // lay the labels out once the style and the tiles are actually there.
    opts.atlas.map.on("load", invalidate);
    opts.atlas.map.on("idle", invalidate);

    this.schedule();
  }

  private px(node: HTMLElement): number {
    return parseFloat(node.style.left || "0");
  }

  private py(node: HTMLElement): number {
    return parseFloat(node.style.top || "0");
  }

  setActive(id: string | null): void {
    if (this.activeId === id) return;
    if (this.activeId) this.byId.get(this.activeId)?.node.classList.remove("is-active");
    this.activeId = id;
    if (id) {
      const b = this.byId.get(id);
      b?.node.classList.add("is-active");
      if (b) this.schedule();
    }
  }

  setVisited(ids: string[]): void {
    this.visited = new Set(ids);
    for (const b of this.list) b.node.classList.toggle("is-visited", this.visited.has(b.place.id));
  }

  setVisible(visible: boolean): void {
    this.enabled = visible;
    this.opts.root.style.display = visible ? "" : "none";
    if (visible) this.schedule();
  }

  get isVisible(): boolean {
    return this.enabled;
  }

  /** Nudge the layout after labels or the viewport change. */
  schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.frame = requestAnimationFrame(() => {
      this.scheduled = false;
      this.frame = null;
      this.layout();
    });
  }

  destroy(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.opts.root.replaceChildren();
  }

  /** Priority for de-cluttering: the focused place always wins, then featured
   *  places, then places already visited (the visitor has context for them),
   *  then authored order, which is significance order within each district. */
  private priority(b: Beacon): number {
    if (b.place.id === this.activeId) return -1e6;
    const rank = this.order.get(b.place.id) ?? 0;
    if (b.place.featured) return -1000 + rank;
    if (this.visited.has(b.place.id)) return -500 + rank;
    return rank;
  }

  private layout(): void {
    const map = this.opts.atlas.map;
    // Too early to project anything meaningful; the load and idle handlers will
    // bring us back once there is a map to place labels on.
    if (!map.loaded()) return;

    if (!this.enabled) return;

    const zoom = map.getZoom();
    const canvas = map.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const show = zoom >= MIN_ZOOM;
    if (!show) {
      for (const b of this.list) if (b.visible) this.hide(b);
      return;
    }

    const detail = Math.min(1, Math.max(0, (zoom - MIN_ZOOM) / (FULL_DETAIL_ZOOM - MIN_ZOOM)));

    const candidates: Beacon[] = [];
    for (const b of this.list) {
      let p: { x: number; y: number };
      try {
        p = map.project([b.place.lon, b.place.lat]);
      } catch {
        this.hide(b);
        continue;
      }
      b.x = p.x;
      b.y = p.y - 4;
      const offscreen = p.x < -140 || p.x > w + 140 || p.y < -80 || p.y > h + 90;
      if (offscreen) {
        this.hide(b);
        continue;
      }
      candidates.push(b);
    }

    candidates.sort((a, b) => this.priority(a) - this.priority(b));

    const budget = labelBudget(zoom, w);
    const taken: Rect[] = [];
    let placed = 0;
    for (const b of candidates) {
      if (placed >= budget) {
        this.hide(b);
        continue;
      }
      if (b.width === 0) {
        b.width = b.node.offsetWidth || b.place.short.length * 6.4 + 34;
        b.height = b.node.offsetHeight || 26;
      }
      const importance = b.place.featured ? 2 : this.visited.has(b.place.id) ? 1 : 0;
      let placedY = b.y;
      let ok = false;

      for (let attempt = 0; attempt < 7; attempt++) {
        const top = placedY - b.height;
        // Horizontal proximity plus a genuine vertical interval overlap —
        // comparing bottoms alone lets labels stack on top of each other.
        const clash = taken.some(
          (t) =>
            Math.abs(t.x + t.w / 2 - b.x) < (t.w + b.width) / 2 + 8 &&
            top < t.y + t.h + LABEL_GAP &&
            top + b.height > t.y - LABEL_GAP,
        );
        if (!clash) {
          taken.push({ x: b.x - b.width / 2, y: top, w: b.width, h: b.height });
          ok = true;
          break;
        }
        placedY += GAP_Y;
      }

      // If a label cannot find a home, retire it — unless it is the place the
      // visitor is actually looking at, or the map is far enough out that we
      // should thin aggressively.
      if (!ok && b.place.id === this.activeId) {
        // The place being looked at always keeps its label.
        placedY = b.y;
        taken.push({ x: b.x - b.width / 2, y: placedY - b.height, w: b.width, h: b.height });
        ok = true;
      }

      if (!ok) {
        this.hide(b);
        continue;
      }
      placed++;

      b.node.style.transform = `translate(-50%, -100%) translate(${Math.round(b.x)}px, ${Math.round(placedY)}px)`;
      b.node.style.left = "0";
      b.node.style.top = "0";
      // Style the position via transform only; but the identify card needs
      // coordinates, so record them.
      b.y = placedY;

      if (!b.visible) {
        b.visible = true;
        b.node.style.display = "";
      }
      // Beacons thin out at the far end of the zoom range so the outline of
      // the city is what reads, not the labels.
      const keep = b.place.id === this.activeId || b.place.featured || importance === 1 ? 1 : detail;
      if (keep < 0.999) {
        b.node.style.opacity = String(0.35 + keep * 0.65);
      } else {
        b.node.style.opacity = "";
      }
      b.node.classList.toggle("is-tiny", zoom < 12);
    }
  }

  private hide(b: Beacon): void {
    if (!b.visible) return;
    b.visible = false;
    b.node.style.display = "none";
  }
}
