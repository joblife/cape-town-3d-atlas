/**
 * Search: a command palette over the whole atlas.
 *
 * Places, districts and stories in one list, ranked as you type. Recent visits
 * are offered before you type, because the most likely thing someone wants is
 * where they just were.
 */

import { PLACES, searchPlaces, type SearchHit } from "../data/index.ts";
import { el } from "../util/dom.ts";

export interface PaletteCallbacks {
  onPick: (hit: SearchHit) => void;
}

export class Palette {
  private dialog: HTMLDialogElement;
  private input: HTMLInputElement;
  private results: HTMLElement;
  private cb: PaletteCallbacks;
  private hits: SearchHit[] = [];
  private cursor = 0;
  private visited: string[] = [];

  constructor(dialog: HTMLDialogElement, cb: PaletteCallbacks) {
    this.dialog = dialog;
    this.cb = cb;
    this.dialog.classList.add("sheet-dialog--wide");

    const wrap = el("div", { class: "palette__input-wrap" });
    const glyph = el("span", { class: "palette__glyph", text: "⌕" });
    this.input = el("input", {
      class: "palette__input",
      type: "search",
      placeholder: "Search places, districts, stories…",
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": "Search the atlas",
    });
    const close = el("button", { class: "dlg__close", type: "button", "aria-label": "Close search", text: "✕" });
    close.addEventListener("click", () => this.close());
    wrap.append(glyph, this.input, close);

    this.results = el("div", { class: "palette__results", role: "listbox" });

    const foot = el("div", { class: "palette__foot" });
    foot.append(
      this.legend("↑↓", "navigate"),
      this.legend("↵", "open"),
      this.legend("esc", "close"),
    );

    this.dialog.append(wrap, this.results, foot);

    this.input.addEventListener("input", () => this.query(this.input.value));
    this.input.addEventListener("keydown", (e) => this.onKey(e));
    this.dialog.addEventListener("close", () => this.input.value = "");
  }

  private legend(key: string, label: string): HTMLElement {
    const wrap = el("span");
    wrap.append(el("kbd", { class: "kbd", text: key }), el("span", { text: label }));
    return wrap;
  }

  setVisited(ids: string[]): void {
    this.visited = ids;
  }

  open(seed = ""): void {
    if (!this.dialog.open) this.dialog.showModal();
    this.input.value = seed;
    this.query(seed);
    this.input.focus();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  private query(text: string): void {
    this.hits = text.trim() ? searchPlaces(text, 30) : this.recentHits();
    this.cursor = 0;
    this.render();
  }

  private recentHits(): SearchHit[] {
    const recent = this.visited
      .slice(-6)
      .reverse()
      .map((id) => PLACES.find((p) => p.id === id))
      .filter((p): p is (typeof PLACES)[number] => Boolean(p))
      .map<SearchHit>((p) => ({
        type: "place",
        id: p.id,
        name: p.name,
        sub: "Recently opened",
        meta: p.tagline,
        accent: "#E0A45E",
        glyph: "◷",
        score: 0,
      }));

    const featured = PLACES.filter((p) => p.featured && !this.visited.includes(p.id)).map<SearchHit>((p) => ({
      type: "place",
      id: p.id,
      name: p.name,
      sub: "Worth starting with",
      meta: p.tagline,
      accent: "#E0A45E",
      glyph: "◆",
      score: 0,
    }));

    return [...recent, ...featured].slice(0, 8);
  }

  private render(): void {
    if (this.hits.length === 0) {
      this.results.replaceChildren(
        el("div", { class: "empty", text: "No match. Try a neighbourhood, a beach, or a year." }),
      );
      return;
    }
    const nodes = this.hits.map((hit, i) => {
      const row = el("button", {
        class: `palette__row${i === this.cursor ? " is-cursor" : ""}`,
        type: "button",
        role: "option",
      });
      const glyph = el("span", { class: "palette__glyph", text: hit.glyph });
      glyph.style.color = hit.accent;
      const main = el("span");
      main.append(
        el("div", { class: "pal__name", text: hit.name }),
        el("div", { class: "pal__sub", text: hit.sub }),
      );
      row.append(glyph, main, el("span", { class: "pal__meta", text: hit.meta }));
      row.addEventListener("click", () => this.pick(i));
      row.addEventListener("pointerenter", () => {
        this.cursor = i;
        this.markCursor();
      });
      return row;
    });
    this.results.replaceChildren(...nodes);
  }

  private markCursor(): void {
    const rows = Array.from(this.results.querySelectorAll<HTMLElement>(".palette__row"));
    rows.forEach((row, i) => row.classList.toggle("is-cursor", i === this.cursor));
    rows[this.cursor]?.scrollIntoView({ block: "nearest" });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.cursor = Math.min(this.hits.length - 1, this.cursor + 1);
      this.markCursor();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.cursor = Math.max(0, this.cursor - 1);
      this.markCursor();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.pick(this.cursor);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }
  }

  private pick(index: number): void {
    const hit = this.hits[index];
    if (!hit) return;
    this.close();
    this.cb.onPick(hit);
  }
}
