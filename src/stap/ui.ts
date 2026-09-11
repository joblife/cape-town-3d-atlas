/**
 * Stap Kaap's interface.
 *
 * Built as plain DOM over the 3D canvas — the same approach as the atlas — so the
 * type is real type, the accessibility comes free, and the panels never fight the
 * renderer. Four surfaces, one of which is open at a time: the poster, the walk
 * HUD, a landmark postcard, and the notebook.
 *
 * The city is looked at from above now, so the HUD no longer steers the camera:
 * the masthead and the minimap (built in `main.ts`) do that. What is left here is
 * the poster, the arrival prompt and the three panels.
 */

import { COPY } from "./copy.ts";
import { ARRIVE_RADIUS, type Landmark } from "./landmarks.ts";
import type { Notebook } from "./notebook.ts";
import { DISTRICTS, KIND_META } from "../data/index.ts";
import { el, esc } from "../util/dom.ts";

/** District id → the name a reader sees. */
const DISTRICT_NAMES: Record<string, string> = Object.fromEntries(
  DISTRICTS.map((district) => [district.id, district.name]),
);

/**
 * The keyboard hints, squeezed onto one line for the HUD's foot: the whole
 * table lives in `COPY.controls`, but the walk only needs the first few at a
 * glance.
 */
const CONTROLS_HINT = COPY.controls
  .slice(0, 4)
  .map((row) => `${row.keys} ${row.label.split(/ [—·] /)[0]!.toLowerCase()}`)
  .join(" · ");

/* ── poster ─────────────────────────────────────────────────────── */

export interface LandingCallbacks {
  onEnter: () => void;
}

export class Landing {
  private root: HTMLElement;
  private cta: HTMLButtonElement | null = null;
  private progress: HTMLElement | null = null;
  private fraction = 0;
  private message = 0;
  private override: string | null = null;
  private rotator = 0;

  constructor(root: HTMLElement, private cb: LandingCallbacks) {
    this.root = root;
  }

  render(): void {
    // The shell hands us the poster element itself; make sure it carries the
    // class whether or not the host already declared it.
    this.root.classList.add("poster");

    const scrim = el("div", { class: "poster__scrim", "aria-hidden": "true" });
    const eyebrow = el("p", { class: "poster__eyebrow", text: COPY.hero.eyebrow });
    const title = el("h1", { class: "poster__title", html: esc(COPY.hero.headline).replace(/\n/g, "<br>") });

    const lines = el("div", { class: "poster__lines" });
    for (const line of COPY.hero.lines) lines.append(el("p", { text: line }));

    this.cta = el("button", { class: "poster__cta", type: "button", disabled: true });
    this.cta.append(el("span", { text: COPY.hero.enter }));
    this.cta.addEventListener("click", () => this.cb.onEnter());

    this.progress = el("div", { class: "poster__progress", "aria-live": "polite" });

    const tagline = el("p", { class: "poster__tagline", text: COPY.tagline });

    this.root.replaceChildren(scrim, eyebrow, title, lines, this.cta, this.progress, tagline);
    this.root.hidden = false;
  }

  /** Progress readout while the city streams in: a rotating line and a percentage. */
  setProgress(fraction: number, label?: string): void {
    this.fraction = Math.max(0, Math.min(1, fraction));
    if (label !== undefined) this.override = label;
    this.paintProgress();
    if (this.rotator === 0) {
      this.rotator = window.setInterval(() => {
        this.message += 1;
        this.paintProgress();
      }, 2400);
    }
  }

  setReady(): void {
    this.stopRotator();
    if (this.progress) this.progress.hidden = true;
    if (this.cta) {
      this.cta.disabled = false;
      this.cta.classList.add("is-ready");
    }
  }

  hide(): void {
    this.stopRotator();
    this.root.hidden = true;
  }

  get isHidden(): boolean {
    return this.root.hidden;
  }

  private paintProgress(): void {
    if (!this.progress) return;
    const pct = Math.round(this.fraction * 100);
    const line = this.override ?? COPY.loading[this.message % COPY.loading.length]!;
    this.progress.replaceChildren(el("span", { text: line }), el("span", { text: `${pct}%` }));
    this.progress.setAttribute("aria-label", `${line} ${pct}%`);
  }

  private stopRotator(): void {
    if (this.rotator !== 0) {
      window.clearInterval(this.rotator);
      this.rotator = 0;
    }
  }
}

/* ── the walk HUD ───────────────────────────────────────────────── */

export interface HudCallbacks {
  onRead: () => void;
  onNotebook: () => void;
  onLandmarks: () => void;
  onTime: () => void;
}

export class Hud {
  private prompt: HTMLElement;
  private promptFill: HTMLElement;
  private promptGlyph: HTMLElement;
  private promptName: HTMLElement;
  private promptKind: HTMLElement;
  private hint: HTMLElement;
  private where: HTMLElement;
  private current: Landmark | null = null;

  constructor(private root: HTMLElement, private cb: HudCallbacks) {
    this.where = el("div", { class: "hud__where" });

    this.promptGlyph = el("span", { class: "hud__prompt-glyph" });
    this.promptName = el("span", { class: "hud__prompt-name" });
    this.promptKind = el("span", { class: "hud__prompt-kind" });
    const line = el("div", { class: "hud__prompt-line" });
    line.append(this.promptGlyph, this.promptName, this.promptKind);

    const go = el("button", { class: "hud__prompt-go", type: "button", text: COPY.arrive, "aria-label": COPY.arrive });
    go.addEventListener("click", () => this.cb.onRead());

    this.promptFill = el("span", { class: "hud__prompt-fill" });

    this.prompt = el("div", { class: "hud__prompt", "aria-hidden": "true" });
    this.prompt.append(line, go, this.promptFill);

    this.hint = el("p", { class: "hud__hint", text: CONTROLS_HINT });
    const foot = el("div", { class: "hud__foot" });
    foot.append(this.hint, el("span", { text: COPY.tagline }));

    this.root.append(this.where, this.prompt, foot);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setHintVisible(visible: boolean): void {
    this.hint.hidden = !visible;
  }

  /** Show or clear the arrival prompt. */
  setNear(landmark: Landmark | null, distance: number): void {
    if (landmark && landmark.place.id === this.current?.place.id) {
      this.promptFill.style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - distance / ARRIVE_RADIUS)).toFixed(3)})`;
      return;
    }
    this.current = landmark;

    if (!landmark) {
      this.prompt.classList.remove("is-on");
      this.prompt.setAttribute("aria-hidden", "true");
      return;
    }

    const kind = KIND_META[landmark.place.kind];
    this.promptGlyph.textContent = landmark.stamp;
    this.promptName.textContent = landmark.place.name;
    this.promptKind.textContent = kind.label;
    this.promptFill.style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - distance / ARRIVE_RADIUS)).toFixed(3)})`;
    this.prompt.classList.add("is-on");
    this.prompt.setAttribute("aria-hidden", "false");
    this.prompt.style.setProperty("--accent", landmark.accent);
  }

  /** Nearest known place name, so the walker always knows where they are. */
  setWhere(text: string): void {
    this.where.textContent = text;
  }

  setHeading(degrees: number): void {
    // The compass is gone — the minimap owns direction now. The heading is still
    // exposed for CSS, so anything that wants to point north can.
    this.root.style.setProperty("--heading", `${((degrees % 360) + 360) % 360}deg`);
  }
}

/* ── landmark postcard ──────────────────────────────────────────── */

export interface CardCallbacks {
  onClose: () => void;
  onWalkHere: (landmark: Landmark) => void;
}

const TABS = ["Overview", "History", "Visit", "Sources"] as const;

export class LandmarkCard {
  private reading: Landmark | null = null;

  constructor(private root: HTMLElement, private cb: CardCallbacks) {}

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(landmark: Landmark, collected: boolean, index: number, total: number): void {
    this.reading = landmark;
    const p = landmark.place;
    const kind = KIND_META[p.kind];
    this.root.style.setProperty("--accent", landmark.accent);

    const close = el("button", { class: "card__close", type: "button", "aria-label": "Close", text: "✕" });
    close.addEventListener("click", () => this.cb.onClose());

    const back = el("button", { class: "pc__back", type: "button", "aria-label": COPY.labels.landmarks });
    back.append(el("span", { text: `← ${COPY.labels.landmarks}` }));
    back.addEventListener("click", () => this.cb.onClose());

    const head = el("header", { class: "pc__head" });
    head.append(
      el("p", {
        class: "pc__folio",
        text: `STORY ${String(index).padStart(2, "0")} / ${total} · ${DISTRICT_NAMES[p.district] ?? p.district}`,
      }),
      el("h2", { class: "pc__title", text: p.name }),
      back,
    );

    /* left column: the photograph, as a print */
    const frame = el("div", { class: "pc__photo-frame" });
    frame.append(el("span", { text: landmark.stamp }));
    const caption = el("figcaption", { class: "pc__photo-caption", text: p.name });
    const credit = el("p", { class: "pc__credit", hidden: true });
    credit.append(
      el("span", { text: `${COPY.postcard.photoCredit} · ` }),
      el("a", {
        href: "https://commons.wikimedia.org",
        target: "_blank",
        rel: "noreferrer",
        text: "Wikimedia Commons",
      }),
    );
    const photo = el("figure", { class: "pc__photo" });
    photo.append(frame, caption, credit);
    if (p.wiki) void this.loadPhoto(frame, caption, credit, p.wiki, p.name);

    /* right column: the writing */
    const address = el("div", { class: "pc__address" });
    address.append(
      el("p", { class: "pc__greeting", text: `Greetings from ${p.name}` }),
      el("p", { class: "pc__postmark", text: COPY.hero.eyebrow }),
    );

    const stamp = el("div", { class: "pc__stamp" });
    stamp.append(
      el("span", { text: landmark.glyph }),
      el("span", { text: kind.label }),
      el("span", { class: "pc__stamp-year", text: landmark.year }),
    );

    const overview = el("section", { class: "pc__panel", role: "tabpanel" });
    overview.append(
      el("p", { class: "pc__year", text: landmark.year }),
      el("h3", { class: "pc__headline", text: p.tagline }),
      el("p", { class: "pc__summary", text: p.standfirst }),
    );
    if (p.lookFor?.length) {
      const callout = el("aside", { class: "pc__callout" });
      callout.append(el("h4", { class: "pc__callout-h", text: "Look a little closer" }));
      const prompts = el("ul");
      for (const item of p.lookFor) prompts.append(el("li", { text: item }));
      callout.append(prompts);
      overview.append(callout);
    }
    if (p.facts.length) {
      const facts = el("dl", { class: "pc__facts" });
      for (const fact of p.facts) {
        const cell = el("div");
        cell.append(el("dt", { text: fact.label }), el("dd", { text: fact.value }));
        facts.append(cell);
      }
      overview.append(facts);
    }

    const history = el("section", { class: "pc__panel", role: "tabpanel" });
    const prose = el("div", { class: "pc__prose" });
    for (const para of p.story) prose.append(el("p", { text: para }));
    history.append(prose);
    if (p.timeline?.length) {
      const timeline = el("ol", { class: "pc__timeline" });
      for (const entry of p.timeline) {
        const item = el("li");
        item.append(el("strong", { text: entry.year }), el("span", { text: entry.text }));
        timeline.append(item);
      }
      history.append(timeline);
    }

    const visit = el("section", { class: "pc__panel", role: "tabpanel" });
    const visitList = el("dl", { class: "pc__visit" });
    for (const item of p.practical ?? []) {
      const row = el("div");
      row.append(el("dt", { text: item.label }), el("dd", { text: item.value }));
      visitList.append(row);
    }
    visit.append(visitList);

    const sources = el("section", { class: "pc__panel", role: "tabpanel" });
    const sourceList = el("div", { class: "pc__sources" });
    sourceList.append(el("h3", { text: COPY.postcard.sources }));
    const links = el("p");
    if (p.wiki) {
      links.append(
        el("a", {
          href: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wiki)}`,
          target: "_blank",
          rel: "noreferrer",
          text: p.wiki,
        }),
        el("span", { text: " · " }),
      );
    }
    links.append(
      el("a", {
        href: "https://www.openstreetmap.org/copyright",
        target: "_blank",
        rel: "noreferrer",
        text: "© OpenStreetMap contributors",
      }),
    );
    sourceList.append(links);
    sources.append(sourceList);

    const panels = el("div", { class: "pc__panels" });
    const panelEls = [overview, history, visit, sources];
    const tabEls: HTMLButtonElement[] = [];

    const selectTab = (wanted: number): void => {
      tabEls.forEach((tab, i) => {
        tab.classList.toggle("is-on", i === wanted);
        tab.setAttribute("aria-selected", i === wanted ? "true" : "false");
      });
      panelEls.forEach((panel, i) => panel.classList.toggle("is-on", i === wanted));
    };

    const tabs = el("div", { class: "pc__tabs", role: "tablist" });
    panelEls.forEach((panel, i) => {
      panel.id = `pc-panel-${i}`;
      panel.setAttribute("aria-labelledby", `pc-tab-${i}`);
      panels.append(panel);
    });
    TABS.forEach((label, i) => {
      const tab = el("button", {
        class: "pc__tab",
        type: "button",
        role: "tab",
        id: `pc-tab-${i}`,
        "aria-controls": `pc-panel-${i}`,
        text: label,
      });
      tab.addEventListener("click", () => selectTab(i));
      tabEls.push(tab);
      tabs.append(tab);
    });
    selectTab(0);

    const writing = el("div", { class: "pc__writing" });
    writing.append(address, stamp, tabs, panels);

    const grid = el("div", { class: "pc__grid" });
    grid.append(photo, writing);

    const foot = el("footer", { class: "pc__foot" });
    const walk = el("button", {
      class: "pc__action pc__action--primary",
      type: "button",
      text: COPY.walkHere,
    });
    walk.addEventListener("click", () => this.cb.onWalkHere(landmark));
    foot.append(
      walk,
      el("p", { class: "pc__note", text: collected ? COPY.notebook.savedNote : COPY.newStamp }),
    );

    this.root.replaceChildren(close, head, grid, foot);
    this.root.hidden = false;
    this.root.scrollTop = 0;
  }

  private async loadPhoto(
    frame: HTMLElement,
    caption: HTMLElement,
    credit: HTMLElement,
    title: string,
    name: string,
  ): Promise<void> {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        description?: string;
        extract?: string;
        thumbnail?: { source: string };
        originalimage?: { source: string };
      };
      if (json.description) caption.textContent = json.description;
      else if (json.extract) caption.textContent = json.extract;

      const src = json.originalimage?.source ?? json.thumbnail?.source;
      if (!src) return;
      const img = el("img", { src, alt: `${name} — photograph from Wikimedia Commons`, loading: "lazy" });
      img.addEventListener("load", () => {
        frame.replaceChildren(img);
        credit.hidden = false;
      });
      frame.append(img);
    } catch {
      /* the stamp stands on its own */
    }
  }

  close(): void {
    this.root.hidden = true;
    this.reading = null;
  }

  get landmark(): Landmark | null {
    return this.reading;
  }
}

/* ── notebook panel ─────────────────────────────────────────────── */

export interface NotebookCallbacks {
  onOpenLandmark: (landmark: Landmark) => void;
  onWalkTo: (landmark: Landmark) => void;
  onClose: () => void;
  onClear: () => void;
}

export class NotebookPanel {
  constructor(private root: HTMLElement, private cb: NotebookCallbacks) {}

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  render(notebook: Notebook, landmarks: Landmark[], districtNames: Record<string, string>): void {
    const collected = new Set(notebook.ids);

    const close = el("button", { class: "nb__close", type: "button", "aria-label": "Close", text: "✕" });
    close.addEventListener("click", () => this.cb.onClose());

    const head = el("header", { class: "nb__head" });
    head.append(
      el("p", { class: "nb__kicker", text: COPY.notebook.title }),
      el("h2", { class: "nb__title", text: COPY.notebook.heading }),
      el("p", { class: "nb__intro", text: COPY.notebook.intro }),
      close,
    );

    const cta = el("button", { class: "nb__cta", type: "button", text: COPY.notebookExtra.clear });
    cta.addEventListener("click", () => this.cb.onClear());

    const meta = el("div", { class: "nb__meta" });
    meta.append(
      el("div", {
        class: "nb__progress",
        role: "progressbar",
        "aria-valuemin": "0",
        "aria-valuemax": String(landmarks.length),
        "aria-valuenow": String(notebook.size),
        text: `${notebook.size} / ${landmarks.length}`,
      }),
      el("p", { class: "nb__saved", text: COPY.notebook.savedNote }),
    );

    // Grouped by district, in walking order, districts in the order they appear.
    const groups = new Map<string, Landmark[]>();
    for (const landmark of landmarks) {
      const key = landmark.place.district;
      const list = groups.get(key);
      if (list) list.push(landmark);
      else groups.set(key, [landmark]);
    }

    const filter = el("select", { class: "nb__filter", id: "nb-filter", "aria-label": COPY.labels.landmarks });
    filter.append(el("option", { value: "", text: "All districts" }));
    for (const districtId of groups.keys()) {
      filter.append(el("option", { value: districtId, text: districtNames[districtId] ?? districtId }));
    }
    const filterLabel = el("label", { class: "nb__filter-label", for: "nb-filter", text: "Explore a district" });

    const list = el("div", { class: "nb__list" });
    const groupEls: HTMLElement[] = [];
    for (const [districtId, entries] of groups) {
      const section = el("section", { class: "nb__group", dataset: { district: districtId } });
      section.append(
        el("h3", { class: "nb__group-title", text: districtNames[districtId] ?? districtId }),
      );

      for (const landmark of entries) {
        const isIn = collected.has(landmark.place.id);
        const row = el("button", {
          class: "nb__row",
          type: "button",
          "aria-label": `${isIn ? COPY.notebookExtra.revisit : COPY.notebookExtra.goThere}: ${landmark.place.name}`,
        });
        if (isIn) row.classList.add("is-in");
        row.append(
          el("span", { class: "nb__thumb", text: landmark.stamp }),
          el("span", { class: "nb__year", text: landmark.year }),
          el("span", { class: "nb__name", text: landmark.place.name }),
          el("span", { class: "nb__caption", text: landmark.caption }),
          el("span", { class: "nb__state", text: isIn ? "Opened" : "Read story" }),
        );
        row.addEventListener("click", () => (isIn ? this.cb.onOpenLandmark(landmark) : this.cb.onWalkTo(landmark)));
        section.append(row);
      }

      groupEls.push(section);
      list.append(section);
    }

    if (notebook.size === 0) list.append(el("p", { class: "nb__note", text: COPY.notebook.emptyState }));

    filter.addEventListener("change", () => {
      const wanted = filter.value;
      for (const group of groupEls) {
        group.style.display = !wanted || group.dataset.district === wanted ? "" : "none";
      }
    });

    const foot = el("footer", { class: "nb__foot" });
    foot.append(el("p", { class: "nb__note", text: COPY.honesty }));

    this.root.replaceChildren(head, cta, meta, filterLabel, filter, list, foot);
    this.root.hidden = false;
  }

  close(): void {
    this.root.hidden = true;
  }
}

/* ── landmark index ─────────────────────────────────────────────── */

export class LandmarkIndex {
  constructor(private root: HTMLElement, private cb: { onPick: (l: Landmark) => void; onClose: () => void }) {}

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  render(landmarks: Landmark[], collected: Set<string>): void {
    const close = el("button", { class: "card__close", type: "button", "aria-label": "Close", text: "✕" });
    close.addEventListener("click", () => this.cb.onClose());

    const head = el("header", { class: "idx__head" });
    head.append(el("h2", { class: "idx__title", text: COPY.indexHeading }), close);

    const list = el("div", { class: "idx__list" });
    landmarks.forEach((landmark, i) => {
      const isIn = collected.has(landmark.place.id);
      const row = el("button", {
        class: "idx__row",
        type: "button",
        "aria-label": `${isIn ? COPY.notebookExtra.revisit : COPY.notebookExtra.goThere}: ${landmark.place.name}`,
      });
      row.append(
        el("span", { class: "idx__num", text: String(i + 1).padStart(2, "0") }),
        el("span", { text: landmark.place.name }),
        el("span", { text: landmark.caption }),
      );
      row.addEventListener("click", () => this.cb.onPick(landmark));
      list.append(row);
    });

    this.root.replaceChildren(head, list);
    this.root.hidden = false;
  }

  close(): void {
    this.root.hidden = true;
  }
}

/** Toast, used for stamps and small confirmations. */
export function toast(root: HTMLElement, message: string, stamp?: string): void {
  const node = el("div", { class: "toast" });
  if (stamp) node.append(el("span", { class: "toast__stamp", text: stamp }));
  node.append(el("span", { text: message }));
  root.append(node);
  window.setTimeout(() => {
    node.classList.add("is-out");
    window.setTimeout(() => node.remove(), 400);
  }, 3200);
}
