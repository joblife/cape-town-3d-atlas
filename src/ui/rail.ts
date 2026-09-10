/**
 * The atlas index.
 *
 * One panel with three ways in — places, districts, stories — plus the search
 * affordance and a progress footer. While a story plays the rail becomes that
 * story's flight plan, so the panel always describes the thing the camera is
 * doing.
 */

import { viewDistrictId, viewPlaceId, type AppSnapshot, type BrowseTab } from "../core/state.ts";
import {
  DISTRICTS,
  KIND_META,
  PLACES,
  PLACES_BY_DISTRICT,
  STORIES,
  groupedPlaces,
  storyMeta,
} from "../data/index.ts";
import type { District, Place, PlaceKind, Story } from "../data/types.ts";
import { el } from "../util/dom.ts";

export interface RailCallbacks {
  onSelectPlace: (id: string) => void;
  onSelectDistrict: (id: string) => void;
  onHoverPlace: (id: string | null) => void;
  onPlayStory: (id: string) => void;
  onOpenSearch: () => void;
  onTab: (tab: BrowseTab) => void;
  onFilter: (kind: string | null) => void;
  onResetProgress: () => void;
  onExitStory: () => void;
  onJumpBeat: (index: number) => void;
}

const KIND_FILTERS: PlaceKind[] = [
  "landmark",
  "nature",
  "beach",
  "museum",
  "viewpoint",
  "neighbourhood",
  "civic",
  "market",
];

export class Rail {
  private root: HTMLElement;
  private body: HTMLElement;
  private filters: HTMLElement;
  private foot: HTMLElement;
  private cb: RailCallbacks;
  private lastKey = "";

  constructor(root: HTMLElement, cb: RailCallbacks) {
    this.root = root;
    this.cb = cb;
    this.body = root.querySelector(".rail__body") as HTMLElement;
    this.filters = root.querySelector(".rail__filters") as HTMLElement;
    this.foot = root.querySelector(".rail__foot") as HTMLElement;

    (root.querySelector("#tabPlaces") as HTMLElement).addEventListener("click", () => cb.onTab("places"));
    (root.querySelector("#tabDistricts") as HTMLElement).addEventListener("click", () => cb.onTab("districts"));
    (root.querySelector("#tabStories") as HTMLElement).addEventListener("click", () => cb.onTab("stories"));
    (root.querySelector("#railSearchBtn") as HTMLElement).addEventListener("click", () => cb.onOpenSearch());
  }

  /** Re-render. Cheap enough to run whole: the content is at most ~40 rows. */
  render(state: AppSnapshot): void {
    const key = [
      state.tab,
      state.filter,
      state.visited.length,
      viewDistrictId(state.view) ?? "",
      viewPlaceId(state.view) ?? "",
      state.story ? `${state.story.storyId}:${state.story.index}:${state.story.playing}` : "-",
    ].join("|");
    if (key === this.lastKey) return;
    this.lastKey = key;

    for (const btn of Array.from(this.root.querySelectorAll<HTMLElement>(".seg__btn"))) {
      const on = btn.dataset.tab === state.tab;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", String(on));
    }
    this.root.classList.toggle("rail--story", Boolean(state.story));

    if (state.story) {
      this.filters.replaceChildren();
      this.renderStory(state);
      return;
    }

    this.renderFilters(state);

    if (state.tab === "places") this.renderPlaces(state);
    else if (state.tab === "districts") this.renderDistricts(state);
    else this.renderStories(state);

    this.renderFoot(state);
  }

  /* ── filters ────────────────────────────────────────────────── */

  private renderFilters(state: AppSnapshot): void {
    if (state.tab !== "places") {
      this.filters.replaceChildren();
      return;
    }
    const nodes: HTMLElement[] = [];
    const all = el("button", {
      class: `chip${state.filter === null ? " is-on" : ""}`,
      type: "button",
      text: `All ${PLACES.length}`,
    });
    all.addEventListener("click", () => this.cb.onFilter(null));
    nodes.push(all);

    for (const kind of KIND_FILTERS) {
      const count = PLACES.filter((p) => p.kind === kind).length;
      if (count === 0) continue;
      const meta = KIND_META[kind];
      const chip = el("button", {
        class: `chip${state.filter === kind ? " is-on" : ""}`,
        type: "button",
      });
      chip.append(el("span", { class: "chip__dot" }), el("span", { text: `${meta.label} ${count}` }));
      chip.addEventListener("click", () => this.cb.onFilter(state.filter === kind ? null : kind));
      nodes.push(chip);
    }
    this.filters.replaceChildren(...nodes);
  }

  /* ── places ─────────────────────────────────────────────────── */

  private renderPlaces(state: AppSnapshot): void {
    const groups = groupedPlaces();
    const visited = new Set(state.visited);
    const nodes: HTMLElement[] = [];
    let index = 0;

    for (const { district, places } of groups) {
      const filtered = state.filter ? places.filter((p) => p.kind === state.filter) : places;
      if (filtered.length === 0) continue;

      const head = el("div", { class: "rail__group" });
      head.append(
        el("span", { class: "micro", text: district.name }),
        el("span", { class: "data", text: `${String(filtered.length).padStart(2, "0")}` }),
      );
      head.addEventListener("click", () => this.cb.onSelectDistrict(district.id));
      head.style.cursor = "pointer";
      nodes.push(head);

      for (const place of filtered) {
        index++;
        nodes.push(this.placeRow(place, index, viewPlaceId(state.view) === place.id, visited.has(place.id)));
      }
    }

    if (nodes.length === 0) {
      nodes.push(el("div", { class: "empty", text: "Nothing matches that filter." }));
    }
    this.body.replaceChildren(...nodes);
    this.body.scrollTop = 0;
  }

  private placeRow(place: Place, index: number, active: boolean, visited: boolean): HTMLElement {
    const row = el("button", {
      class: `prow${active ? " is-active" : ""}${visited ? " is-visited" : ""}`,
      type: "button",
      dataset: { id: place.id },
      // The list line is truncated by design; the title carries the whole thing.
      title: `${place.name} — ${place.tagline}`,
    });
    row.append(
      el("span", { class: "prow__idx", text: String(index).padStart(2, "0") }),
      (() => {
        const main = el("span", { class: "prow__main" });
        main.append(
          el("span", { class: "prow__name", text: place.name }),
          el("span", { class: "prow__tag", text: place.tagline }),
        );
        return main;
      })(),
      el("span", { class: "prow__kind", text: KIND_META[place.kind].glyph, title: KIND_META[place.kind].label }),
    );
    row.addEventListener("click", () => this.cb.onSelectPlace(place.id));
    row.addEventListener("pointerenter", () => this.cb.onHoverPlace(place.id));
    row.addEventListener("pointerleave", () => this.cb.onHoverPlace(null));
    return row;
  }

  /* ── districts ──────────────────────────────────────────────── */

  private renderDistricts(state: AppSnapshot): void {
    const nodes: HTMLElement[] = [];
    const groups = DISTRICTS.map((district, index) => ({ district, index }));

    for (const { district, index } of groups) {
      const places = PLACES_BY_DISTRICT[district.id] ?? [];
      const done = places.filter((p) => state.visited.includes(p.id)).length;
      const card = el("button", {
        class: `dcard${viewDistrictId(state.view) === district.id ? " is-active" : ""}`,
        type: "button",
      });
      card.style.setProperty("--accent", accentForDistrict(district, index));
      card.append(el("span", { class: "dcard__swatch" }));

      const top = el("span", { class: "dcard__top" });
      top.append(
        el("span", { class: "dcard__name", text: district.name }),
        el("span", { class: "dcard__count", text: `${done}/${places.length}` }),
      );
      card.append(top, el("span", { class: "dcard__sig", text: district.signature }));

      if (done > 0) {
        const bar = el("span", { class: "scard__bar" });
        const fill = el("span");
        fill.style.width = `${(done / Math.max(1, places.length)) * 100}%`;
        bar.append(fill);
        card.append(bar);
      }

      card.addEventListener("click", () => this.cb.onSelectDistrict(district.id));
      nodes.push(card);
    }

    this.body.replaceChildren(...nodes);
  }

  /* ── stories ────────────────────────────────────────────────── */

  private renderStories(state: AppSnapshot): void {
    const nodes: HTMLElement[] = [];

    const intro = el("p", { class: "rail__note" });
    intro.textContent =
      "Each route is an argument about the city, not a list. The camera flies it; you can scrub, skip, or leave at any time.";
    nodes.push(intro);

    for (const story of STORIES) {
      nodes.push(this.storyCard(story, state));
    }

    this.body.replaceChildren(...nodes);
  }

  private storyCard(story: Story, state: AppSnapshot): HTMLElement {
    const active = state.story?.storyId === story.id;
    const card = el("button", { class: `scard${active ? " is-active" : ""}`, type: "button" });
    card.style.setProperty("--accent", story.accent);

    const left = el("span");
    left.append(
      el("span", { class: "scard__theme", text: story.theme }),
      el("span", { class: "scard__title", text: story.title }),
      el("span", { class: "scard__thesis", text: story.thesis }),
    );
    const meta = el("span", { class: "scard__meta" });
    meta.append(el("span", { text: storyMeta(story) }));
    left.append(meta);

    if (active && state.story) {
      const bar = el("span", { class: "scard__bar" });
      const fill = el("span");
      fill.style.width = `${((state.story.index + 1) / story.stops.length) * 100}%`;
      bar.append(fill);
      left.append(bar);
    }

    const play = el("span", { class: "scard__play", text: active && state.story?.playing ? "❙❙" : "▶" });
    card.append(left, play);
    card.addEventListener("click", () => this.cb.onPlayStory(story.id));
    return card;
  }

  /* ── story mode: the flight plan ────────────────────────────── */

  private renderStory(state: AppSnapshot): void {
    const session = state.story;
    if (!session) return;
    const story = STORIES.find((s) => s.id === session.storyId);
    if (!story) return;

    const nodes: HTMLElement[] = [];

    const head = el("div", { class: "rail__group" });
    head.append(el("span", { class: "micro", text: story.theme }), el("span", { class: "data", text: `${session.index + 1}/${story.stops.length}` }));
    nodes.push(head);

    const titleBlock = el("div", { class: "rail__note" });
    titleBlock.style.borderLeftColor = story.accent;
    titleBlock.textContent = story.thesis;
    nodes.push(titleBlock);

    story.stops.forEach((stop, i) => {
      const place = PLACES.find((p) => p.id === stop.placeId);
      if (!place) return;
      const row = el("button", { class: `pstop${i === session.index ? " is-active" : ""}${i < session.index ? " is-done" : ""}`, type: "button" });
      row.append(
        el("span", { class: "pstop__n", text: String(i + 1).padStart(2, "0") }),
        el("span", { class: "pstop__name", text: place.name }),
        el("span", { class: "pstop__dur", text: `${stop.seconds}s` }),
      );
      row.addEventListener("click", () => this.cb.onJumpBeat(i));
      nodes.push(row);
    });

    const exit = el("button", { class: "btn btn--ghost btn--block", type: "button", text: "Leave the route" });
    exit.style.margin = "14px 10px 0";
    exit.addEventListener("click", () => this.cb.onExitStory());
    nodes.push(exit);

    this.body.replaceChildren(...nodes);
    const active = this.body.querySelector(".pstop.is-active");
    active?.scrollIntoView({ block: "nearest" });
  }

  /* ── footer ─────────────────────────────────────────────────── */

  private renderFoot(state: AppSnapshot): void {
    const total = PLACES.length;
    const done = state.visited.length;
    const pct = Math.round((done / total) * 100);

    const row = el("div", { class: "progress__row" });
    row.append(
      el("span", { class: "progress__label", text: done === 0 ? "Nothing visited yet" : "Places visited" }),
      el("span", { class: "progress__value", text: `${done} / ${total}` }),
    );
    const bar = el("div", { class: "progress__bar" });
    const fill = el("div", { class: "progress__fill" });
    fill.style.width = `${pct}%`;
    bar.append(fill);

    const actions = el("div", { class: "chiprow" });
    const surprise = el("button", { class: "chip", type: "button", text: "✦ Surprise me" });
    surprise.addEventListener("click", () => {
      const pool = PLACES.filter((p) => !state.visited.includes(p.id));
      const list = pool.length > 0 ? pool : PLACES;
      const pick = list[Math.floor(Math.random() * list.length)];
      this.cb.onSelectPlace(pick.id);
    });
    actions.append(surprise);

    if (done > 0) {
      const reset = el("button", { class: "chip", type: "button", text: "Reset progress" });
      reset.addEventListener("click", () => this.cb.onResetProgress());
      actions.append(reset);
    }

    this.foot.replaceChildren(row, bar, actions);
  }

  /** Scroll the active row into view when selection changes from off-panel. */
  revealActive(): void {
    const active = this.body.querySelector(".prow.is-active");
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

const DISTRICT_ACCENTS: Record<string, string> = {
  "city-bowl": "#E0A45E",
  "bo-kaap": "#C2705E",
  "cape-flats": "#8E86B8",
  waterfront: "#4E9DB5",
  "green-point": "#7FA678",
  "atlantic-seaboard": "#D9A0B4",
  "camps-bay": "#E5B567",
  "table-mountain": "#6FA8A0",
  "devils-peak": "#B08A6E",
  "southern-suburbs": "#7FA678",
  woodstock: "#D2B15E",
  "peninsula-south": "#5E9BB8",
};

function accentForDistrict(district: District, index: number): string {
  return DISTRICT_ACCENTS[district.id] ?? ["#E0A45E", "#4E9DB5", "#7FA678"][index % 3];
}
