/**
 * Reference material: what the atlas is made of, how it is controlled, and
 * where its limits are. Includes the first-run orientation card.
 */

import { PLACES, DISTRICTS, STORIES } from "../data/index.ts";
import { el } from "../util/dom.ts";

export interface AboutOptions {
  onExperimental?: () => void;
}

export function renderAbout(dialog: HTMLDialogElement, options: AboutOptions = {}): void {
  const head = el("div", { class: "dlg__head" });
  head.append(
    el("span", { class: "dlg__title", text: "About this atlas" }),
    el("span", { class: "dlg__sub", text: `${PLACES.length} places · ${DISTRICTS.length} districts · ${STORIES.length} routes` }),
  );
  const close = el("button", { class: "dlg__close", type: "button", "aria-label": "Close", text: "✕" });
  close.addEventListener("click", () => dialog.close());
  head.append(close);

  const body = el("div", { class: "dlg__body" });

  body.append(
    el("p", {
      text:
        "Cape Town Atlas is a three-dimensional reading of a real city. The ground, the roads and the buildings are drawn from the same data OpenStreetMap contributors survey: a thousand square kilometres of coastline, mountain, suburb and harbour, extruded into a model you can fly through.",
    }),
    el("p", {
      text:
        "Nothing here is a photograph. The city is rendered live from vector tiles and elevation data, so it stays current, loads in a few hundred kilobytes, and can be examined from any angle. Where the model is uncertain, the atlas says so — in the facts, not the footnotes.",
    }),
  );

  body.append(el("h3", { text: "How it was built" }));
  body.append(
    el("p", {
      text:
        "Designed, written and engineered with DeepSeek V4.1 Flash, working as an agent across the codebase: content research, the solar and lighting model, the camera, and the interface. The map data is other people's work and is credited above; the atlas built on top of it is machine-written.",
    }),
  );

  body.append(el("h3", { text: "The light" }));
  body.append(
    el("p", {
      text:
        "The sun is real. Solar position is computed for Cape Town's coordinates using the NOAA almanac formulation, to roughly a hundredth of a degree. Move the clock and the shadows, sky, sea and building colour move with it: the four light states — night, twilight, golden, day — are blended continuously by the sun's actual altitude rather than switched between. Live cloud cover from Open-Meteo then flattens and greys the light the way it does outside.",
    }),
  );

  body.append(el("h3", { text: "Getting around" }));
  const keys = el("div", { class: "kbdtable" });
  const rows: [string, string][] = [
    ["⌘K / Ctrl K", "Search the atlas"],
    ["← →", "Previous or next place"],
    ["Space", "Play or pause the current route"],
    ["T", "Open the light control"],
    ["F", "Fly to the whole city"],
    ["P", "Photo mode — hides everything but the map"],
    ["Esc", "Close whatever is open"],
    ["?", "This panel"],
  ];
  for (const [key, label] of rows) {
    keys.append(el("kbd", { class: "kbd", text: key }), el("span", { text: label }));
  }
  body.append(keys);

  body.append(el("h3", { text: "Sources" }));
  const sources = el("ul");
  for (const line of [
    'Buildings, roads, land cover: OpenStreetMap contributors, served as vector tiles by OpenFreeMap (openmaptiles schema). Heights from OSM building:levels and height tags at 3.2 m per level where untagged.',
    "Elevation: Mapzen / AWS Terrain Tiles (SRTM and GMTED2010, courtesy USGS), rendered at 1.18x exaggeration so the relief reads at city scale.",
    "Weather: Open-Meteo, current conditions for central Cape Town.",
    "Place photographs and encyclopaedia extracts: Wikipedia and Wikimedia Commons, credited per place where used.",
  ]) {
    sources.append(el("li", { text: line }));
  }
  body.append(sources);

  body.append(el("h3", { text: "What this is not" }));
  body.append(
    el("p", {
      text:
        "Building geometry is approximated from footprints and storey counts, not surveyed. Interiors, roof shapes and heights of untagged buildings are inferences, and the terrain is smoothed to a 30 m grid. Nothing here is a substitute for looking at the actual place. Timings, prices and opening arrangements change — check before you go.",
    }),
  );

  const foot = el("div", { class: "dlg__foot" });
  const link = el("a", { href: "https://www.openstreetmap.org/copyright", target: "_blank", rel: "noreferrer", text: "© OpenStreetMap contributors" });
  foot.append(link);
  if (options.onExperimental) {
    const reset = el("button", { class: "btn btn--ghost", type: "button", text: "Reset progress and preferences" });
    reset.style.marginLeft = "auto";
    reset.addEventListener("click", () => options.onExperimental?.());
    foot.append(reset);
  }

  dialog.replaceChildren(head, body, foot);
}

export interface WelcomeCallbacks {
  onTour: () => void;
  onDistricts: () => void;
  onDismiss: () => void;
}

/** First-run orientation. Three honest choices rather than a feature list. */
export class Welcome {
  private node: HTMLElement | null = null;
  private cb: WelcomeCallbacks;

  constructor(cb: WelcomeCallbacks) {
    this.cb = cb;
  }

  show(): void {
    if (this.node) return;
    const card = el("div", { class: "welcome", role: "dialog", "aria-label": "Welcome to Cape Town Atlas" });

    const head = el("div", { class: "welcome__head" });
    const text = el("div");
    text.append(
      el("div", { class: "welcome__title", text: "You are looking at Cape Town" }),
      el("div", {
        class: "welcome__line",
        text: "A live model of the city built from OpenStreetMap and real elevation data, lit by the actual position of the sun. Drag to orbit, scroll to move in.",
      }),
    );
    const close = el("button", { class: "welcome__close", type: "button", "aria-label": "Dismiss", text: "✕" });
    close.addEventListener("click", () => this.dismiss());
    head.append(text, close);

    const cards = el("div", { class: "welcome__cards" });
    cards.append(
      this.card("Route", "Follow a guided flight", "Five curated routes with narration and a cinematic camera.", () => {
        this.cb.onTour();
        this.dismiss();
      }),
      this.card("Browse", "Start with a district", "Twelve districts, each with its own essay and places.", () => {
        this.cb.onDistricts();
        this.dismiss();
      }),
      this.card("Explore", "Just wander", "Everything is on the map. Search any time with ⌘K.", () => this.dismiss()),
    );

    card.append(head, cards);
    document.getElementById("app")?.append(card);
    this.node = card;
  }

  get isVisible(): boolean {
    return this.node !== null;
  }

  dismiss(): void {
    if (!this.node) return;
    this.node.remove();
    this.node = null;
    this.cb.onDismiss();
  }

  private card(tag: string, title: string, description: string, onClick: () => void): HTMLElement {
    const node = el("button", { class: "wcard", type: "button" });
    node.append(
      el("div", { class: "wcard__k", text: tag }),
      el("div", { class: "wcard__t", text: title }),
      el("div", { class: "wcard__d", text: description }),
    );
    node.addEventListener("click", onClick);
    return node;
  }
}
