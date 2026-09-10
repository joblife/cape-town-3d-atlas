/**
 * The identify card: point at the city and it tells you what you are looking
 * at. Hovering a building reports its height from the OpenStreetMap data; the
 * atlas's own places take precedence and offer to open.
 *
 * This is the cheapest way to make a 3D map feel alive — the model stops being
 * a picture and starts answering questions.
 */

import type { Atlas } from "../core/atlas.ts";
import type { Place } from "../data/types.ts";
import { accentFor, KIND_META } from "../data/index.ts";
import { el, throttle } from "../util/dom.ts";

const MIN_ZOOM_FOR_BUILDINGS = 13.6;

export interface IdentifyOptions {
  root: HTMLElement;
  atlas: Atlas;
  onOpenPlace: (id: string) => void;
}

export class Identify {
  private opts: IdentifyOptions;
  private card: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private metaEl: HTMLDivElement;
  private ctaEl: HTMLDivElement;
  private active: Place | null = null;
  private enabled = true;
  private hideTimer = 0;

  constructor(opts: IdentifyOptions) {
    this.opts = opts;
    this.card = el("div", { class: "identify" });
    this.nameEl = el("div", { class: "identify__name" });
    this.metaEl = el("div", { class: "identify__meta" });
    this.ctaEl = el("div", { class: "identify__cta" });
    this.card.append(this.nameEl, this.metaEl, this.ctaEl);
    opts.root.append(this.card);

    const onMove = throttle((x: number, y: number) => this.inspect(x, y), 90);
    opts.atlas.map.on("mousemove", (e) => {
      if (!this.enabled) return;
      if (this.active) return; // a place card is sticky while hovered
      onMove(e.point.x, e.point.y);
    });
    opts.atlas.map.on("mouseout", () => this.hide());
    opts.atlas.map.on("movestart", () => this.hide());
    this.card.addEventListener("click", () => {
      if (this.active) opts.onOpenPlace(this.active.id);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.hide();
  }

  /** Show the card for one of the atlas's places. Sticky until cleared. */
  showPlace(place: Place | null, x: number, y: number): void {
    window.clearTimeout(this.hideTimer);
    if (!place) {
      this.active = null;
      this.hide();
      return;
    }
    this.active = place;
    const meta = KIND_META[place.kind];
    this.nameEl.textContent = place.short;
    this.metaEl.textContent = `${meta.label.toUpperCase()} · ${place.tagline}`;
    this.ctaEl.textContent = "Open the dossier ›";
    this.card.style.setProperty("--beacon-accent", accentFor(place));
    this.place(x, y);
  }

  private inspect(x: number, y: number): void {
    const { atlas } = this.opts;
    if (atlas.map.getZoom() < MIN_ZOOM_FOR_BUILDINGS || atlas.heightMultiplier <= 0) {
      this.hide();
      return;
    }
    const hit = atlas.buildingAt(x, y);
    if (!hit || (hit.height <= 0 && !hit.name)) {
      this.hide();
      return;
    }
    this.active = null;
    this.nameEl.textContent = hit.name ?? "Building";
    const parts: string[] = [];
    if (hit.height > 0) parts.push(`${Math.round(hit.height)} m`);
    if (hit.levels > 0) parts.push(`${hit.levels} ${hit.levels === 1 ? "floor" : "floors"}`);
    parts.push(hit.name ? "OpenStreetMap" : "no name in OpenStreetMap");
    this.metaEl.textContent = parts.join(" · ");
    this.ctaEl.textContent = "";
    this.place(x, y);
  }

  private place(x: number, y: number): void {
    const rect = this.opts.root.getBoundingClientRect();
    const clampedX = Math.min(Math.max(x, 90), rect.width - 90);
    this.card.style.transform = `translate(-50%, calc(-100% - 14px))`;
    this.card.style.left = `${clampedX}px`;
    this.card.style.top = `${Math.max(y, 70)}px`;
    this.card.classList.add("is-on");
  }

  private hide(): void {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.card.classList.remove("is-on"), 120);
  }
}
