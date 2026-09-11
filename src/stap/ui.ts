/**
 * Stap Kaap's interface.
 *
 * Built as plain DOM over the 3D canvas — the same approach as the atlas — so the
 * type is real type, the accessibility comes free, and the panels never fight the
 * renderer. Four surfaces, one of which is open at a time: the landing, the walk
 * HUD, a landmark card, and the notebook.
 */

import { COPY } from "./copy.ts";
import type { Landmark } from "./landmarks.ts";
import type { Notebook } from "./notebook.ts";
import { KIND_META } from "../data/index.ts";
import { el, esc } from "../util/dom.ts";

/* ── landing ────────────────────────────────────────────────────── */

export interface LandingCallbacks {
  onEnter: () => void;
}

export class Landing {
  private root: HTMLElement;
  private bar: HTMLElement | null = null;

  constructor(root: HTMLElement, private cb: LandingCallbacks) {
    this.root = root;
  }

  render(): void {
    const hero = el("div", { class: "landing__hero" });
    hero.append(
      el("p", { class: "landing__eyebrow", text: COPY.hero.eyebrow }),
      el("h1", { class: "landing__title", html: esc(COPY.hero.headline).replace(/\n/g, "<br>") }),
    );
    const lines = el("div", { class: "landing__lines" });
    for (const line of COPY.hero.lines) lines.append(el("p", { text: line }));
    hero.append(lines);

    const enter = el("button", { class: "landing__enter", type: "button" });
    enter.append(el("span", { class: "landing__enter-dot" }), el("span", { text: COPY.hero.enter }));
    enter.addEventListener("click", () => this.cb.onEnter());
    hero.append(enter);

    const tagline = el("p", { class: "landing__tagline", text: COPY.tagline });

    const chapters = el("div", { class: "chapters" });
    for (const chapter of COPY.chapters) {
      const card = el("article", { class: "chapter" });
      card.append(
        el("p", { class: "chapter__kicker", text: `${chapter.n} / ${chapter.kicker}` }),
        el("h2", { class: "chapter__title", text: chapter.title }),
        el("p", { class: "chapter__body", text: chapter.body }),
      );
      chapters.append(card);
    }

    const controls = el("div", { class: "controls" });
    controls.append(el("h2", { class: "controls__title", text: COPY.controlsTitle }));
    const table = el("dl", { class: "controls__table" });
    for (const row of COPY.controls) {
      table.append(el("dt", { html: row.keys.split(" ").map((k) => `<kbd>${esc(k)}</kbd>`).join("") }), el("dd", { text: row.label }));
    }
    controls.append(table);

    const note = el("p", { class: "landing__note", text: COPY.honesty });

    this.root.replaceChildren(hero, tagline, chapters, controls, note);
    this.root.hidden = false;
  }

  /** Progress readout while the city streams in. */
  setProgress(fraction: number, label?: string): void {
    if (!this.bar) {
      this.bar = el("div", { class: "landing__progress" });
      this.root.append(this.bar);
    }
    const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
    const line = label ?? COPY.loading[Math.min(COPY.loading.length - 1, Math.floor(fraction * COPY.loading.length))];
    this.bar.replaceChildren(
      el("span", { class: "landing__progress-line", text: line }),
      el("span", { class: "landing__progress-pct", text: `${pct}%` }),
    );
  }

  setReady(): void {
    this.bar?.remove();
    this.bar = null;
    const enter = this.root.querySelector<HTMLButtonElement>(".landing__enter");
    if (enter) {
      enter.disabled = false;
      enter.classList.add("is-ready");
    }
  }

  hide(): void {
    this.root.hidden = true;
  }

  get isHidden(): boolean {
    return this.root.hidden;
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
  private hint: HTMLElement;
  private compassNeedle: HTMLElement;
  private locationEl: HTMLElement;
  private current: Landmark | null = null;

  constructor(private root: HTMLElement, private cb: HudCallbacks) {
    this.prompt = el("div", { class: "hud__prompt" });
    this.hint = el("div", { class: "hud__hint", text: COPY.walkHint });
    this.compassNeedle = el("span", { class: "compass__needle" });
    this.locationEl = el("span", { class: "hud__where" });

    const compass = el("div", { class: "compass" });
    compass.append(el("span", { class: "compass__n", text: "N" }), this.compassNeedle);

    const bar = el("div", { class: "hud__bar" });
    bar.append(
      this.button("◉", COPY.labels.landmarks, () => cb.onLandmarks()),
      this.button("▤", COPY.labels.notebook, () => cb.onNotebook()),
      this.button("☀", COPY.labels.time, () => cb.onTime()),
    );

    this.root.append(compass, this.locationEl, this.prompt, this.hint, bar);
  }

  private button(glyph: string, label: string, onClick: () => void): HTMLElement {
    const b = el("button", { class: "hud__btn", type: "button", title: label });
    b.append(el("span", { class: "hud__btn-glyph", text: glyph }), el("span", { class: "hud__btn-label", text: label }));
    b.addEventListener("click", onClick);
    return b;
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setHintVisible(visible: boolean): void {
    this.hint.classList.toggle("is-gone", !visible);
  }

  /** Show or clear the arrival prompt. */
  setNear(landmark: Landmark | null, distance: number): void {
    if (landmark?.place.id === this.current?.place.id && landmark) {
      const pct = Math.max(0, Math.min(1, 1 - distance / this.arriveAt));
      const fill = this.prompt.querySelector<HTMLElement>(".hud__prompt-fill");
      if (fill) fill.style.transform = `scaleX(${pct.toFixed(3)})`;
      return;
    }
    this.current = landmark;

    if (!landmark) {
      this.prompt.replaceChildren();
      this.prompt.classList.remove("is-on");
      return;
    }

    const kind = KIND_META[landmark.place.kind];
    this.prompt.replaceChildren();
    const line = el("div", { class: "hud__prompt-line" });
    line.append(
      el("span", { class: "hud__prompt-glyph", text: landmark.stamp }),
      el("span", { class: "hud__prompt-name", text: landmark.place.name }),
      el("span", { class: "hud__prompt-kind", text: kind.label }),
    );
    const bar = el("div", { class: "hud__prompt-bar" });
    const fill = el("span", { class: "hud__prompt-fill" });
    bar.append(fill);
    const go = el("button", { class: "hud__prompt-go", type: "button", text: COPY.arrive });
    go.addEventListener("click", () => this.cb.onRead());
    this.prompt.append(line, bar, go);
    this.prompt.classList.add("is-on");
    this.prompt.style.setProperty("--accent", landmark.accent);
  }

  private get arriveAt(): number {
    return 34;
  }

  /** Nearest known place name, so the walker always knows where they are. */
  setWhere(text: string): void {
    this.locationEl.textContent = text;
  }

  setHeading(degrees: number): void {
    this.compassNeedle.style.transform = `rotate(${-degrees}deg)`;
  }
}

/* ── landmark card ──────────────────────────────────────────────── */

export interface CardCallbacks {
  onClose: () => void;
  onWalkHere: (landmark: Landmark) => void;
}

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

    const head = el("header", { class: "card__head" });
    const eyebrow = el("p", { class: "card__eyebrow" });
    eyebrow.append(
      el("span", { class: "card__stamp", text: landmark.stamp }),
      el("span", { text: `${kind.label} · ${landmark.year}` }),
      el("span", { class: "card__count", text: `${index} / ${total}` }),
    );
    head.append(
      close,
      eyebrow,
      el("h1", { class: "card__title", text: p.name }),
      el("p", { class: "card__standfirst", text: p.standfirst }),
    );
    if (!collected) {
      head.append(el("p", { class: "card__new", text: COPY.newStamp }));
    }

    // Photograph, when Wikipedia has one, credited where it sits.
    const photo = el("figure", { class: "card__photo" });
    photo.append(el("div", { class: "card__photo-fallback", html: `<span>${esc(landmark.stamp)}</span>` }));
    if (p.wiki) void this.loadPhoto(photo, p.wiki, p.name);

    const body = el("div", { class: "card__body" });
    if (p.lookFor?.length) {
      body.append(this.section(COPY.postcard.lookCloser));
      const list = el("ul", { class: "card__list" });
      for (const item of p.lookFor) list.append(el("li", { text: item }));
      body.append(list);
    }

    body.append(this.section(COPY.postcard.story));
    const story = el("div", { class: "card__prose" });
    for (const para of p.story) story.append(el("p", { text: para }));
    body.append(story);

    if (p.facts.length) {
      body.append(this.section(COPY.postcard.facts));
      const grid = el("dl", { class: "card__facts" });
      for (const fact of p.facts) {
        const cell = el("div");
        cell.append(el("dt", { text: fact.label }), el("dd", { text: fact.value }));
        grid.append(cell);
      }
      body.append(grid);
    }

    if (p.timeline?.length) {
      body.append(this.section(COPY.postcard.timeline));
      const tl = el("ol", { class: "card__timeline" });
      for (const entry of p.timeline) {
        const item = el("li");
        item.append(el("span", { class: "card__year", text: entry.year }), el("span", { text: entry.text }));
        tl.append(item);
      }
      body.append(tl);
    }

    if (p.practical?.length) {
      body.append(this.section(COPY.postcard.visit));
      const dl = el("dl", { class: "card__practical" });
      for (const item of p.practical) {
        const row = el("div");
        row.append(el("dt", { text: item.label }), el("dd", { text: item.value }));
        dl.append(row);
      }
      body.append(dl);
    }

    const sources = el("div", { class: "card__sources" });
    sources.append(this.section(COPY.postcard.sources));
    const links = el("p");
    links.append(el("span", { text: `${COPY.postcard.photoCredit}: ` }));
    if (p.wiki) {
      const a = el("a", { href: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wiki)}`, target: "_blank", rel: "noreferrer", text: p.wiki });
      links.append(a, el("span", { text: " · " }));
    }
    const osm = el("a", { href: "https://www.openstreetmap.org/copyright", target: "_blank", rel: "noreferrer", text: "© OpenStreetMap contributors" });
    links.append(osm);
    sources.append(links);
    body.append(sources);

    const foot = el("footer", { class: "card__foot" });
    const walk = el("button", { class: "card__walk", type: "button", text: COPY.walkHere });
    walk.addEventListener("click", () => this.cb.onWalkHere(landmark));
    foot.append(walk);

    this.root.replaceChildren(head, photo, body, foot);
    this.root.hidden = false;
    this.root.scrollTop = 0;
  }

  private section(title: string): HTMLElement {
    const h = el("h2", { class: "card__section" });
    h.append(el("span", { text: title }));
    return h;
  }

  private async loadPhoto(figure: HTMLElement, title: string, name: string): Promise<void> {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as { thumbnail?: { source: string }; originalimage?: { source: string } };
      const src = json.originalimage?.source ?? json.thumbnail?.source;
      if (!src) return;
      const img = el("img", { src, alt: `${name} — photograph from Wikimedia Commons`, loading: "lazy" });
      img.addEventListener("load", () => figure.classList.add("has-photo"));
      figure.prepend(img);
    } catch {
      /* the stamp fallback stands on its own */
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

    const head = el("header", { class: "nb__head" });
    const close = el("button", { class: "card__close", type: "button", "aria-label": "Close", text: "✕" });
    close.addEventListener("click", () => this.cb.onClose());
    head.append(
      close,
      el("p", { class: "nb__kicker", text: COPY.notebook.title }),
      el("h1", { class: "nb__title", text: COPY.notebook.heading }),
      el("p", { class: "nb__intro", text: COPY.notebook.intro }),
    );

    const progress = el("div", { class: "nb__progress" });
    const pct = landmarks.length ? (notebook.size / landmarks.length) * 100 : 0;
    progress.append(
      el("span", { class: "nb__progress-count", text: `${notebook.size} / ${landmarks.length}` }),
      (() => {
        const bar = el("div", { class: "nb__bar" });
        const fill = el("span");
        fill.style.width = `${pct}%`;
        bar.append(fill);
        return bar;
      })(),
      el("span", { class: "nb__saved", text: COPY.notebook.savedNote }),
    );

    const body = el("div", { class: "nb__body" });
    if (notebook.size === 0) {
      body.append(el("p", { class: "nb__empty", text: COPY.notebook.emptyState }));
    }

    // Grouped by district, in walking order, collected first.
    const groups = new Map<string, Landmark[]>();
    for (const l of landmarks) {
      const key = l.place.district;
      const list = groups.get(key);
      if (list) list.push(l);
      else groups.set(key, [l]);
    }

    for (const [districtId, list] of groups) {
      const section = el("section", { class: "nb__group" });
      const done = list.filter((l) => collected.has(l.place.id)).length;
      section.append(
        (() => {
          const h = el("h2", { class: "nb__group-title" });
          h.append(el("span", { text: districtNames[districtId] ?? districtId }), el("span", { class: "nb__group-count", text: `${done}/${list.length}` }));
          return h;
        })(),
      );

      for (const l of list) {
        const isIn = collected.has(l.place.id);
        const row = el("button", { class: `nb__row${isIn ? " is-in" : ""}`, type: "button" });
        row.append(
          el("span", { class: "nb__stamp", text: isIn ? l.stamp : "·" }),
          (() => {
            const main = el("span", { class: "nb__row-main" });
            main.append(
              el("span", { class: "nb__row-name", text: l.place.name }),
              el("span", { class: "nb__row-caption", text: isIn ? l.caption : COPY.notebookExtra.locked }),
            );
            return main;
          })(),
          el("span", { class: "nb__row-year", text: l.year }),
          el("span", { class: "nb__row-go", text: isIn ? COPY.notebookExtra.revisit : COPY.notebookExtra.goThere }),
        );
        row.addEventListener("click", () => (isIn ? this.cb.onOpenLandmark(l) : this.cb.onWalkTo(l)));
        section.append(row);
      }
      body.append(section);
    }

    const foot = el("footer", { class: "nb__foot" });
    const clear = el("button", { class: "nb__clear", type: "button", text: COPY.notebookExtra.clear });
    clear.addEventListener("click", () => this.cb.onClear());
    foot.append(clear);

    this.root.replaceChildren(head, progress, body, foot);
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
    head.append(close, el("p", { class: "nb__kicker", text: COPY.labels.landmarks }), el("h1", { class: "nb__title", text: COPY.indexHeading }));

    const list = el("div", { class: "idx__list" });
    for (const l of landmarks) {
      const row = el("button", { class: "idx__row", type: "button" });
      if (collected.has(l.place.id)) row.classList.add("is-in");
      row.append(
        el("span", { class: "nb__stamp", text: l.stamp }),
        (() => {
          const main = el("span", { class: "nb__row-main" });
          main.append(
            el("span", { class: "nb__row-name", text: l.place.name }),
            el("span", { class: "nb__row-caption", text: l.caption }),
          );
          return main;
        })(),
      );
      row.addEventListener("click", () => this.cb.onPick(l));
      list.append(row);
    }

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
