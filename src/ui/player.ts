/**
 * The story player: one bar at the bottom of the screen that shows where the
 * route is, says what you are looking at, and stays out of the way.
 */

import type { Story } from "../data/types.ts";
import { el } from "../util/dom.ts";

export interface PlayerCallbacks {
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
  onJump: (index: number) => void;
  onToggleExpand: () => void;
}

interface PlayerBeat {
  placeId: string;
  name: string;
  narration: string;
}

export class PlayerView {
  private root: HTMLElement;
  private cb: PlayerCallbacks;
  private progress: HTMLElement;
  private segments: HTMLElement[] = [];
  private playBtn: HTMLButtonElement;
  private narration: HTMLElement;
  private placeEl: HTMLElement;
  private storyEl: HTMLElement;
  private timeEl: HTMLElement;
  private stopsEl: HTMLElement;
  private total = 0;

  constructor(root: HTMLElement, cb: PlayerCallbacks) {
    this.root = root;
    this.cb = cb;

    this.progress = el("div", { class: "player__progress" });

    this.playBtn = el("button", { class: "pbtn pbtn--play", type: "button", "aria-label": "Pause", text: "❙❙" });
    this.playBtn.addEventListener("click", () => cb.onToggle());

    const prev = el("button", { class: "pbtn", type: "button", "aria-label": "Previous stop", text: "‹" });
    prev.addEventListener("click", () => cb.onPrevious());
    const next = el("button", { class: "pbtn", type: "button", "aria-label": "Next stop", text: "›" });
    next.addEventListener("click", () => cb.onNext());
    const expand = el("button", { class: "pbtn", type: "button", "aria-label": "Show the route", text: "≡" });
    expand.addEventListener("click", () => cb.onToggleExpand());

    const ctrls = el("div", { class: "player__ctrls" });
    ctrls.append(prev, this.playBtn, next);

    this.storyEl = el("span", { class: "player__story" });
    this.placeEl = el("span", { class: "player__place" });
    const meta = el("div", { class: "player__meta" });
    meta.append(this.storyEl, this.placeEl);

    this.narration = el("p", { class: "player__narration" });

    const text = el("div", { class: "player__text" });
    text.append(meta, this.narration);

    this.timeEl = el("span", { class: "player__time", text: "" });
    const exit = el("button", { class: "pbtn", type: "button", "aria-label": "Leave the route", text: "✕" });
    exit.addEventListener("click", () => cb.onExit());

    const right = el("div", { class: "player__right" });
    right.append(this.timeEl, expand, exit);

    const row = el("div", { class: "player__row" });
    row.append(ctrls, text, right);

    this.stopsEl = el("div", { class: "player__stops" });

    const cue = el("div", { class: "player__cue" });
    this.root.append(this.progress, row, this.stopsEl, cue);
  }

  /** Build the bar for a story. */
  load(story: Story, beats: PlayerBeat[]): void {
    this.root.hidden = false;
    this.root.style.setProperty("--accent", story.accent);
    this.root.classList.remove("is-expanded");

    this.storyEl.textContent = story.title;
    this.total = beats.length;

    this.segments = beats.map((beat, i) => {
      const seg = el("button", { class: "pseg", type: "button", "aria-label": `Go to ${beat.name}` });
      const base = el("span", { class: "pseg__base" });
      const fill = el("span", { class: "pseg__fill" });
      seg.append(base, fill);
      seg.addEventListener("click", () => this.cb.onJump(i));
      return seg;
    });
    this.progress.replaceChildren(...this.segments);

    this.stopsEl.replaceChildren(
      ...beats.map((beat, i) => {
        const row = el("button", { class: "pstop", type: "button" });
        row.dataset.index = String(i);
        row.append(
          el("span", { class: "pstop__n", text: String(i + 1).padStart(2, "0") }),
          el("span", { class: "pstop__name", text: beat.name }),
        );
        row.addEventListener("click", () => this.cb.onJump(i));
        return row;
      }),
    );
  }

  hide(): void {
    this.root.hidden = true;
    this.root.classList.remove("is-expanded");
  }

  setBeat(index: number): void {
    const seg = this.segments[index];
    if (seg) {
      this.placeEl.textContent = this.stopsEl.children[index]?.querySelector(".pstop__name")?.textContent ?? "";
      if (seg.dataset.first !== "1") {
        this.narration.classList.remove("is-changing");
        // Force reflow so the animation restarts for consecutive beats.
        void this.narration.offsetWidth;
        this.narration.classList.add("is-changing");
        seg.dataset.first = "1";
      }
    }
    for (let i = 0; i < this.segments.length; i++) {
      const fill = this.segments[i].querySelector<HTMLElement>(".pseg__fill");
      if (!fill) continue;
      fill.style.transform = `scaleX(${i < index ? 1 : 0})`;
    }
    for (const row of Array.from(this.stopsEl.querySelectorAll<HTMLElement>(".pstop"))) {
      const i = Number(row.dataset.index);
      row.classList.toggle("is-active", i === index);
      row.classList.toggle("is-done", i < index);
    }
    this.timeEl.textContent = `${index + 1} / ${this.total}`;
  }

  setNarration(text: string): void {
    this.narration.textContent = text;
  }

  /** Overall progress 0–1, filling the current segment. */
  setProgress(fraction: number, index: number): void {
    if (this.total === 0) return;
    const within = Math.max(0, Math.min(1, fraction * this.total - index));
    const fill = this.segments[index]?.querySelector<HTMLElement>(".pseg__fill");
    if (fill) fill.style.transform = `scaleX(${within})`;
  }

  setPlaying(playing: boolean): void {
    this.playBtn.textContent = playing ? "❙❙" : "▶";
    this.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  setFlying(flying: boolean): void {
    this.root.classList.toggle("is-flying", flying);
  }

  setExpanded(expanded: boolean): void {
    this.root.classList.toggle("is-expanded", expanded);
  }
}
