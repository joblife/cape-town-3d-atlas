/**
 * Chrome: breadcrumb, layer controls, compass, scale, and the photo mode that
 * clears everything away so the model can be looked at on its own.
 */

import type { Atlas } from "../core/atlas.ts";
import type { AppSnapshot, View } from "../core/state.ts";
import type { Prefs } from "../util/storage.ts";
import { DISTRICT_BY_ID, PLACES, STORIES } from "../data/index.ts";
import { el, throttle } from "../util/dom.ts";
import { formatBearing } from "../core/state.ts";
import { metresForZoom } from "../core/geo.ts";

export interface ToolbarCallbacks {
  onHome: () => void;
  onOpenSearch: () => void;
  onOpenTime: () => void;
  onOpenAbout: () => void;
  onSetPref: (patch: Partial<Prefs>) => void;
  onTogglePhoto: () => void;
  onShowPlates: () => void;
  onSelectDistrict: (id: string) => void;
  getPrefs: () => Prefs;
}

export class Toolbar {
  private atlas: Atlas;
  private cb: ToolbarCallbacks;
  private crumbs: HTMLElement;
  private compass: HTMLElement;
  private scale: HTMLElement;
  private layersPop: HTMLElement;
  private layersBtn: HTMLElement;
  private timeLabel: HTMLElement;
  private timeMeta: HTMLElement;
  private timeGlyph: HTMLElement;
  private pop: HTMLElement | null = null;
  private outsideHandler: ((e: PointerEvent) => void) | null = null;

  constructor(atlas: Atlas, cb: ToolbarCallbacks) {
    this.atlas = atlas;
    this.cb = cb;
    this.crumbs = document.getElementById("crumbs") as HTMLElement;
    this.compass = document.getElementById("compassRose") as HTMLElement;
    this.scale = document.getElementById("scaleText") as HTMLElement;
    this.layersPop = document.getElementById("layersPop") as HTMLElement;
    this.layersBtn = document.getElementById("layersBtn") as HTMLElement;
    this.timeLabel = document.getElementById("timeLabel") as HTMLElement;
    this.timeMeta = document.getElementById("timeMeta") as HTMLElement;
    this.timeGlyph = document.getElementById("timeGlyph") as HTMLElement;

    (document.getElementById("brandBtn") as HTMLElement).addEventListener("click", () => cb.onHome());
    (document.getElementById("searchBtn") as HTMLElement).addEventListener("click", () => cb.onOpenSearch());
    (document.getElementById("timeBtn") as HTMLElement).addEventListener("click", () => cb.onOpenTime());
    (document.getElementById("aboutBtn") as HTMLElement).addEventListener("click", () => cb.onOpenAbout());
    (document.getElementById("photoBtn") as HTMLElement).addEventListener("click", () => cb.onTogglePhoto());
    this.layersBtn.addEventListener("click", () => this.toggleLayers());

    (document.getElementById("zoomInBtn") as HTMLElement).addEventListener("click", () =>
      atlas.map.zoomIn({ duration: 420 }),
    );
    (document.getElementById("zoomOutBtn") as HTMLElement).addEventListener("click", () =>
      atlas.map.zoomOut({ duration: 420 }),
    );
    (document.getElementById("compassBtn") as HTMLElement).addEventListener("click", () => {
      const shot = atlas.camera.snapshot();
      void atlas.camera.flyTo({ ...shot, bearing: 0, pitch: Math.max(38, atlas.map.getPitch() * 0.65) });
    });

    const onMove = throttle(() => this.updateReadouts(), 120);
    atlas.map.on("move", onMove);
    this.updateReadouts();
  }

  setTime(glyph: string, label: string, clock: string): void {
    this.timeGlyph.textContent = glyph;
    this.timeLabel.textContent = label;
    this.timeMeta.textContent = clock;
  }

  render(state: AppSnapshot): void {
    this.renderCrumbs(state);
  }

  private renderCrumbs(state: AppSnapshot): void {
    const nodes: HTMLElement[] = [];
    const city = el("button", { class: "crumbs__item", type: "button" });
    city.append(el("span", { class: "crumbs__dot" }), el("span", { text: "Cape Town" }));
    city.addEventListener("click", () => this.cb.onHome());
    nodes.push(city);

    const view = state.view;
    if (view.kind === "place") {
      const place = PLACES.find((p) => p.id === view.id);
      const district = place ? DISTRICT_BY_ID[place.district] : undefined;
      if (place && district) {
        nodes.push(el("span", { class: "crumbs__sep", text: "/" }));
        const item = el("button", { class: "crumbs__item", type: "button", text: district.name });
        item.addEventListener("click", () => this.cb.onSelectDistrict(district.id));
        nodes.push(item);
        nodes.push(el("span", { class: "crumbs__sep", text: "/" }));
        nodes.push(el("span", { class: "crumbs__item is-here", text: place.short }));
      }
    } else if (view.kind === "district") {
      const district = DISTRICT_BY_ID[view.id];
      if (district) {
        nodes.push(el("span", { class: "crumbs__sep", text: "/" }));
        nodes.push(el("span", { class: "crumbs__item is-here", text: district.name }));
      }
    }

    if (state.story) {
      const story = STORIES.find((s) => s.id === state.story?.storyId);
      if (story) {
        nodes.push(el("span", { class: "crumbs__sep", text: "›" }));
        const chip = el("span", { class: "crumbs__item is-here" });
        chip.append(
          el("span", { class: "crumbs__dot" }),
          el("span", { text: `${story.title} · ${state.story.index + 1}/${story.stops.length}` }),
        );
        nodes.push(chip);
      }
    }

    this.crumbs.replaceChildren(...nodes);
  }

  /* ── layers popover ─────────────────────────────────────────── */

  private toggleLayers(): void {
    if (this.pop) {
      this.closePop();
      return;
    }
    this.layersBtn.setAttribute("aria-expanded", "true");
    const pop = el("div", { class: "pop" });
    pop.style.right = "calc(var(--pad) + 48px)";
    pop.style.top = "calc(50% - 120px)";
    this.layersPop.hidden = false;
    this.layersPop.replaceChildren(pop);
    this.pop = pop;
    this.renderLayerRows();

    // Dismiss on an outside press, the way a popover should.
    window.setTimeout(() => {
      this.outsideHandler = (e: PointerEvent): void => {
        if (!this.pop) return;
        const target = e.target as Node;
        if (pop.contains(target) || this.layersBtn.contains(target)) return;
        this.closePop();
      };
      window.addEventListener("pointerdown", this.outsideHandler, true);
    }, 0);
  }

  private renderLayerRows(): void {
    const pop = this.pop;
    if (!pop) return;
    const prefs = this.currentPrefs();
    const rows: HTMLElement[] = [];

    const head = el("div", { class: "pop__head" });
    head.append(el("span", { class: "micro", text: "Layers" }));
    rows.push(head);

    const check = (label: string, on: boolean, onChange: (v: boolean) => void): HTMLElement => {
      const wrap = el("label", { class: "pop__label" });
      const input = el("input", { type: "checkbox", checked: on });
      input.addEventListener("change", () => {
        onChange(input.checked);
        this.renderLayerRows();
      });
      wrap.append(input, el("span", { text: label }));
      return wrap;
    };

    rows.push(check("3D buildings", prefs.buildings, (v) => this.cb.onSetPref({ buildings: v })));
    rows.push(check("Terrain relief", prefs.terrain, (v) => this.cb.onSetPref({ terrain: v })));
    rows.push(check("Place markers", prefs.beacons, (v) => this.cb.onSetPref({ beacons: v })));

    const slider = el("label", { class: "pop__label" });
    const range = el("input", {
      type: "range",
      min: "0.4",
      max: "2",
      step: "0.1",
      value: String(prefs.heightScale),
      "aria-label": "Building height exaggeration",
    });
    slider.append(el("span", { text: "Height" }), range);
    range.addEventListener("input", () => this.cb.onSetPref({ heightScale: Number(range.value) }));
    rows.push(slider);

    rows.push(el("div", { class: "pop__sep" }));

    const plates = el("button", { class: "pop__row", type: "button" });
    plates.append(el("span", { text: "District boundaries" }), el("span", { class: "pop__key", text: "D" }));
    plates.addEventListener("click", () => {
      this.cb.onShowPlates();
      this.closePop();
    });
    rows.push(plates);

    const reset = el("button", { class: "pop__row", type: "button" });
    reset.append(el("span", { text: "Reset the view" }), el("span", { class: "pop__key", text: "F" }));
    reset.addEventListener("click", () => {
      this.cb.onHome();
      this.closePop();
    });
    rows.push(reset);

    pop.replaceChildren(...rows);
  }

  private currentPrefs(): Prefs {
    return this.cb.getPrefs();
  }

  closePop(): void {
    if (this.outsideHandler) {
      window.removeEventListener("pointerdown", this.outsideHandler, true);
      this.outsideHandler = null;
    }
    if (!this.pop) return;
    this.pop = null;
    this.layersPop.hidden = true;
    this.layersPop.replaceChildren();
    this.layersBtn.setAttribute("aria-expanded", "false");
  }

  /* ── readouts ───────────────────────────────────────────────── */

  private updateReadouts(): void {
    const bearing = this.atlas.map.getBearing();
    this.compass.style.transform = `rotate(${-bearing}deg)`;
    this.compass.setAttribute("title", `Facing ${formatBearing(bearing)} · ${Math.round(bearing)}°`);

    const zoom = this.atlas.map.getZoom();
    const center = this.atlas.map.getCenter();
    const metres = metresForZoom(zoom, center.lat) * 110;
    const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    let chosen = nice[nice.length - 1];
    for (const value of nice) {
      if (metres <= value) {
        chosen = value;
        break;
      }
    }
    this.scale.textContent = chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
  }

  /** Statement of what the view is, for status announcements. */
  describeView(view: View): string {
    if (view.kind === "place") return PLACES.find((p) => p.id === view.id)?.name ?? "";
    if (view.kind === "district") return DISTRICT_BY_ID[view.id]?.name ?? "";
    return "The whole city";
  }
}
