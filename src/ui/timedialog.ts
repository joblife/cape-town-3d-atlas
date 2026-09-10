/**
 * The time control.
 *
 * Cape Town's light is its most changeable feature, and this dialog makes that
 * the point: a 24-hour arc showing where the sun actually is, a handle you can
 * drag, and seven moments worth looking at. Scrubbing is live — the city moves
 * as you drag — which turns a settings panel into the most playful thing in the
 * product.
 */

import { describeDay, timePresets, type LightState } from "../core/lighting.ts";
import { formatClock, phaseGlyph, phaseLabel } from "../core/sun.ts";
import { el } from "../util/dom.ts";
import type { Prefs } from "../util/storage.ts";

export interface TimeDialogCallbacks {
  onScrub: (minutes: number | null) => void;
  onSetWeather: (live: boolean) => void;
}

const R = 46;
const CX = 50;
const BASE = 74;

/** Position on the 24-hour arc for a given wall-clock minute. */
function arcPoint(minutes: number): { x: number; y: number } {
  const t = ((minutes % 1440) + 1440) % 1440 / 1440;
  const angle = Math.PI * t;
  return {
    x: CX - R * Math.cos(angle),
    y: BASE - R * Math.sin(angle),
  };
}

function arcPath(from: number, to: number): string {
  const a = arcPoint(from);
  const b = arcPoint(to);
  // Sweep flag stays 0 because the arc is always traversed clockwise on screen.
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

export class TimeDialog {
  private dialog: HTMLDialogElement;
  private cb: TimeDialogCallbacks;
  private clockEl: HTMLElement;
  private phaseEl: HTMLElement;
  private subEl: HTMLElement;
  private svg: SVGSVGElement;
  private sunPath: SVGPathElement;
  private nightPath: SVGPathElement;
  private marker: SVGGElement;
  private markerGlow: SVGCircleElement;
  private hourLabels: SVGGElement;
  private weatherEl: HTMLElement;
  private presetRow: HTMLElement;
  private hit: HTMLElement;
  private state: LightState | null = null;
  private dragging = false;

  constructor(dialog: HTMLDialogElement, cb: TimeDialogCallbacks) {
    this.dialog = dialog;
    this.cb = cb;

    const wrap = el("div", { class: "time__wrap" });

    const head = el("div", { class: "dlg__head" });
    head.append(el("span", { class: "dlg__title", text: "Light" }), el("span", { class: "dlg__sub", text: "Cape Town" }));
    const close = el("button", { class: "dlg__close", type: "button", "aria-label": "Close", text: "✕" });
    close.addEventListener("click", () => this.close());
    head.append(close);

    this.clockEl = el("div", { class: "time__clock", text: "--:--" });
    this.phaseEl = el("div", { class: "time__phase", text: "" });
    const readout = el("div", { class: "time__readout" });
    readout.append(this.clockEl, this.phaseEl);
    this.subEl = el("div", { class: "time__sub", text: "" });

    const sunarc = el("div", { class: "sunarc" });
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("viewBox", "0 0 100 100");
    this.svg.setAttribute("aria-hidden", "true");
    this.svg.innerHTML = `
      <defs>
        <linearGradient id="daygrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#E0A45E"/>
          <stop offset="0.5" stop-color="#F4C890"/>
          <stop offset="1" stop-color="#C2705E"/>
        </linearGradient>
      </defs>
      <path d="M 4 74 A 46 46 0 0 1 96 74" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1.6"/>
    `;
    this.nightPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.nightPath.setAttribute("fill", "none");
    this.nightPath.setAttribute("stroke", "rgba(255,255,255,0.07)");
    this.nightPath.setAttribute("stroke-width", "1.6");
    this.nightPath.setAttribute("stroke-dasharray", "2 2.4");
    this.sunPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.sunPath.setAttribute("fill", "none");
    this.sunPath.setAttribute("stroke", "url(#daygrad)");
    this.sunPath.setAttribute("stroke-width", "2.4");
    this.sunPath.setAttribute("stroke-linecap", "round");

    this.hourLabels = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.hourLabels.setAttribute("fill", "rgba(255,255,255,0.3)");
    this.hourLabels.setAttribute("font-size", "4.6");
    this.hourLabels.setAttribute("text-anchor", "middle");
    this.hourLabels.setAttribute("font-family", "ui-monospace, monospace");

    this.marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.markerGlow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this.markerGlow.setAttribute("r", "7");
    this.markerGlow.setAttribute("fill", "rgba(244,200,144,0.22)");
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "3.1");
    dot.setAttribute("fill", "#F4C890");
    this.marker.append(this.markerGlow, dot);

    this.svg.append(this.nightPath, this.sunPath, this.hourLabels, this.marker);
    this.hit = el("div", {
      class: "sunarc__hit",
      role: "slider",
      tabindex: "0",
      "aria-label": "Time of day",
      "aria-valuemin": "0",
      "aria-valuemax": "1439",
    });
    this.hit.addEventListener("keydown", (e) => this.onKey(e));
    attachDrag(this.hit, {
      onStart: (x) => {
        this.dragging = true;
        this.scrubFromX(x);
      },
      onMove: (x) => {
        if (this.dragging) this.scrubFromX(x);
      },
      onEnd: () => {
        this.dragging = false;
      },
    });

    sunarc.append(this.svg, this.hit);

    const legend = el("div", { class: "sunarc__legend" });
    legend.append(el("span", { text: "00:00" }), el("span", { text: "06:00" }), el("span", { text: "12:00" }), el("span", { text: "18:00" }), el("span", { text: "24:00" }));

    this.presetRow = el("div", { class: "time__presets" });
    this.weatherEl = el("div", { class: "time__weather" });

    wrap.append(head, readout, this.subEl, sunarc, legend, this.presetRow, this.weatherEl);
    this.dialog.append(wrap);
  }

  open(): void {
    if (!this.dialog.open) this.dialog.showModal();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private scrubFromX(clientX: number): void {
    const rect = this.hit.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    this.cb.onScrub(Math.round(t * 1439));
  }

  private onKey(e: KeyboardEvent): void {
    const now = this.state?.sky.minutes ?? 720;
    const step = e.shiftKey ? 60 : 15;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      this.cb.onScrub((now + step) % 1440);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      this.cb.onScrub((now - step + 1440) % 1440);
    } else if (e.key === "Home") {
      e.preventDefault();
      this.cb.onScrub(0);
    } else if (e.key === "End") {
      e.preventDefault();
      this.cb.onScrub(1439);
    }
  }

  /** Paint the dialog from the lighting state. */
  render(state: LightState, prefs: Prefs): void {
    this.state = state;
    const { sky } = state;
    const minutes = sky.minutes;

    this.clockEl.textContent = formatClock(minutes);
    this.phaseEl.textContent = `${phaseGlyph(sky)} ${phaseLabel(sky)}`;
    this.subEl.textContent = describeDay(state);

    /* arc */
    const rise = sky.times.sunrise ?? 360;
    const set = sky.times.sunset ?? 1080;
    this.sunPath.setAttribute("d", arcPath(rise, set));
    this.nightPath.setAttribute("d", `${arcPath(0, rise)} ${arcPath(set, 1440)}`);

    const labels: string[] = [];
    for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
      const angle = (Math.PI * hour * 60) / 1440;
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(CX - (R + 7.5) * Math.cos(angle)));
      label.setAttribute("y", String(BASE - (R + 7.5) * Math.sin(angle) + 1.6));
      label.textContent = String(hour).padStart(2, "0");
      labels.push(label.outerHTML);
    }
    this.hourLabels.innerHTML = labels.join("");

    const pos = arcPoint(minutes);
    this.marker.setAttribute("transform", `translate(${pos.x} ${pos.y})`);
    const lit = sky.altitude > -6;
    this.markerGlow.setAttribute("fill", lit ? "rgba(244,200,144,0.22)" : "rgba(160,190,235,0.2)");
    this.marker.querySelector("circle:last-child")?.setAttribute("fill", lit ? "#F4C890" : "#A8C0E8");

    this.hit.setAttribute("aria-valuenow", String(Math.round(minutes)));
    this.hit.setAttribute("aria-valuetext", `${formatClock(minutes)} — ${phaseLabel(sky)}`);

    /* presets */
    const presets = timePresets(new Date());
    this.presetRow.replaceChildren(
      ...presets.map((preset) => {
        const matches =
          preset.minutes === null
            ? prefs.timeMode === "auto"
            : prefs.timeMode === "manual" && Math.abs(((prefs.manualMinutes - preset.minutes + 720) % 1440) - 720) < 6;
        const chip = el("button", {
          class: `chip${matches ? " is-on" : ""}`,
          type: "button",
          title: preset.description,
          text: preset.label,
        });
        chip.addEventListener("click", () => this.cb.onScrub(preset.minutes));
        return chip;
      }),
    );

    /* weather */
    this.weatherEl.replaceChildren();
    const weather = state.weather;
    const toggle = el("input", { type: "checkbox", checked: prefs.liveWeather, id: "liveWeatherToggle" });
    toggle.addEventListener("change", () => this.cb.onSetWeather(toggle.checked));
    const label = el("label", { for: "liveWeatherToggle" });
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.append(toggle, el("span", { text: "Live weather" }));
    this.weatherEl.append(label);

    const readout = el("span", { class: "data" });
    if (weather) {
      readout.textContent = `${weather.temperature.toFixed(1)}°C · ${weather.description} · ${Math.round(weather.windSpeed)} km/h wind`;
    } else if (prefs.liveWeather) {
      readout.textContent = "fetching…";
    } else {
      readout.textContent = "clear skies (weather off)";
    }
    this.weatherEl.append(readout);
  }
}

interface DragHandlers {
  onStart: (x: number) => void;
  onMove: (x: number) => void;
  onEnd: () => void;
}

/** Pointer drag with capture, wired for both mouse and touch. */
function attachDrag(node: HTMLElement, handlers: DragHandlers): void {
  node.addEventListener("pointerdown", (e) => {
    // Capture keeps the drag alive past the edge of the control, but it can
    // legitimately fail (a pointer released between events); the drag must
    // still start.
    try {
      node.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable — proceed without it */
    }
    handlers.onStart(e.clientX);
  });
  node.addEventListener("pointermove", (e) => {
    handlers.onMove(e.clientX);
  });
  const stop = (e: PointerEvent): void => {
    if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
    handlers.onEnd();
  };
  node.addEventListener("pointerup", stop);
  node.addEventListener("pointercancel", stop);
}
