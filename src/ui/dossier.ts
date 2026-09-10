/**
 * The dossier: everything the atlas knows about one place, arranged to be read.
 *
 * The hero plate is generated rather than photographed — a drawn motif keyed to
 * the place's kind, in the atlas's own palette — so the product has a coherent
 * visual voice with no stock imagery. Where a Wikipedia article exists, its
 * photograph and extract are offered in an "Archive" section with clear credit,
 * which is both honest about provenance and genuinely useful.
 */

import type { District, Fact, Place, Shot, TimelineEntry } from "../data/types.ts";
import {
  DISTRICT_BY_ID,
  KIND_META,
  PLACES_BY_DISTRICT,
  DISTRICTS,
  accentFor,
  nearby,
  nextPlace,
  prevPlace,
} from "../data/index.ts";
import { el } from "../util/dom.ts";

export interface DossierCallbacks {
  onClose: () => void;
  onSelectPlace: (id: string) => void;
  onSelectDistrict: (id: string) => void;
  onFlyShot: (shot: Shot, label: string) => void;
  onHoverPlace: (id: string | null) => void;
}

interface WikiSummary {
  extract: string;
  image: string | null;
  url: string;
  title: string;
}

const wikiCache = new Map<string, WikiSummary | null>();

async function fetchWiki(title: string): Promise<WikiSummary | null> {
  if (wikiCache.has(title)) return wikiCache.get(title) ?? null;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      extract?: string;
      thumbnail?: { source: string };
      originalimage?: { source: string };
      content_urls?: { desktop?: { page?: string } };
      title?: string;
    };
    const summary: WikiSummary = {
      extract: json.extract ?? "",
      image: json.thumbnail?.source ?? json.originalimage?.source ?? null,
      url: json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      title: json.title ?? title,
    };
    wikiCache.set(title, summary);
    return summary;
  } catch {
    wikiCache.set(title, null);
    return null;
  }
}

/* ── generated plate art ─────────────────────────────────────── */

/** A drawn motif per kind: no photography, a consistent visual language, and
 *  no dependence on a network request to look finished. */
function motif(kind: string, accent: string): string {
  const p = (d: string, o = 1): string => `<path d="${d}" fill="${accent}" opacity="${o}"/>`;
  const line = (d: string, o = 0.5): string =>
    `<path d="${d}" fill="none" stroke="${accent}" stroke-opacity="${o}" stroke-width="1.4"/>`;
  switch (kind) {
    case "nature":
      return p("M0 190 L70 96 L118 148 L166 78 L250 190 Z", 0.9) + p("M170 190 L246 110 L330 190 Z", 0.55) + line("M0 190 H400", 0.4);
    case "beach":
      return (
        line("M0 128 C60 118 120 138 180 128 S300 116 400 128", 0.75) +
        line("M0 150 C60 140 120 160 180 150 S300 138 400 150", 0.5) +
        p("M0 176 L400 160 L400 190 L0 190 Z", 0.35)
      );
    case "museum":
      return (
        p("M60 92 L200 44 L340 92 Z", 0.9) +
        p("M76 100 H324 V110 H76 Z", 0.6) +
        [90, 132, 174, 216, 258, 300].map((x) => `<rect x="${x}" y="116" width="16" height="60" fill="${accent}" opacity="0.5"/>`).join("") +
        p("M66 182 H334 V190 H66 Z", 0.7)
      );
    case "civic":
      return (
        p("M200 40 L232 84 H168 Z", 0.85) +
        p("M186 84 H214 V150 H186 Z", 0.6) +
        p("M120 150 H280 V190 H120 Z", 0.45) +
        line("M110 190 H290", 0.7)
      );
    case "viewpoint":
      return (
        line("M40 186 L200 60 L360 186", 0.8) +
        p("M166 92 L234 92 L234 104 L166 104 Z", 0.6) +
        `<circle cx="200" cy="40" r="12" fill="${accent}" opacity="0.9"/>`
      );
    case "market":
      return (
        p("M70 110 L330 110 L302 190 L98 190 Z", 0.35) +
        line("M70 110 L200 52 L330 110", 0.85) +
        [110, 150, 190, 230, 270].map((x) => `<rect x="${x}" y="130" width="24" height="40" fill="${accent}" opacity="0.55"/>`).join("")
      );
    case "neighbourhood":
      return (
        [0, 1, 2, 3].map((i) => `<rect x="${70 + i * 68}" y="${190 - (46 + (i % 3) * 34)}" width="48" height="${46 + (i % 3) * 34}" fill="${accent}" opacity="${0.42 + (i % 2) * 0.3}"/>`).join("") +
        line("M50 190 H350", 0.6)
      );
    case "sport":
      return (
        `<ellipse cx="200" cy="124" rx="140" ry="62" fill="none" stroke="${accent}" stroke-opacity="0.8" stroke-width="1.6"/>` +
        `<ellipse cx="200" cy="124" rx="60" ry="26" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.2"/>` +
        line("M200 62 V186", 0.4)
      );
    case "hidden":
      return (
        p("M140 100 L260 100 L280 152 L200 190 L120 152 Z", 0.3) +
        line("M140 100 L260 100 L280 152 L200 190 L120 152 Z", 0.85) +
        `<circle cx="200" cy="142" r="14" fill="${accent}" opacity="0.85"/>`
      );
    case "transport":
      return (
        line("M40 150 C120 120 160 180 240 140 S330 108 372 128", 0.8) +
        p("M180 168 H236 L226 188 H190 Z", 0.6)
      );
    default:
      // landmark
      return (
        p("M186 60 L214 60 L220 190 L180 190 Z", 0.75) +
        p("M150 190 H250 L232 150 H168 Z", 0.45) +
        `<rect x="192" y="34" width="16" height="26" fill="${accent}" opacity="0.9"/>`
      );
  }
}

function plateSvg(kind: string, accent: string): string {
  return `<svg class="dos__plate-svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="platefade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.22"/>
    </linearGradient></defs>
    <rect width="400" height="250" fill="url(#platefade)"/>
    ${motif(kind, accent)}
  </svg>`;
}

/* ── the dossier ─────────────────────────────────────────────── */

export class Dossier {
  private root: HTMLElement;
  private cb: DossierCallbacks;
  private currentId: string | null = null;
  private wikiToken = 0;
  private scrollEl: HTMLElement;

  constructor(root: HTMLElement, cb: DossierCallbacks) {
    this.root = root;
    this.cb = cb;
    this.scrollEl = el("div", { class: "dos__scroll" });
  }

  private setContent(...nodes: (Node | null)[]): void {
    this.scrollEl.replaceChildren(...nodes.filter((n): n is Node => n !== null));
    this.root.replaceChildren(this.scrollEl);
  }

  /* ── place ──────────────────────────────────────────────────── */

  renderPlace(place: Place, visitedCount: number): void {
    const accent = accentFor(place);
    const district = DISTRICT_BY_ID[place.district];
    const meta = KIND_META[place.kind];
    this.currentId = place.id;
    this.root.style.setProperty("--accent", accent);

    /* hero */
    const hero = el("div", { class: "dos__hero" });
    hero.innerHTML = plateSvg(place.kind, accent);
    const img = el("img", { alt: "" });
    hero.append(img);

    this.loadHeroImage(place, img, hero);

    const grade = el("div", { class: "dos__hero-grade" });
    const heroMeta = el("div", { class: "dos__hero-meta" });

    const eyebrow = el("div", { class: "dos__eyebrow" });
    const kindChip = el("span", { class: "chip" });
    kindChip.append(el("span", { class: "chip__dot" }), el("span", { text: meta.label }));
    eyebrow.append(kindChip);
    if (district) {
      const dChip = el("button", { class: "chip", type: "button" });
      dChip.append(el("span", { text: district.name }));
      dChip.addEventListener("click", () => this.cb.onSelectDistrict(district.id));
      eyebrow.append(dChip);
    }

    heroMeta.append(
      eyebrow,
      el("h2", { class: "dos__name", text: place.name }),
      el("p", { class: "dos__tagline", text: place.tagline }),
    );
    hero.append(grade, heroMeta);

    const close = el("button", { class: "dos__close", type: "button", "aria-label": "Close dossier", text: "✕" });
    close.addEventListener("click", () => this.cb.onClose());
    hero.append(close);

    /* sticky bar */
    const bar = el("div", { class: "dos__bar" });
    const barName = el("span", { class: "dos__bar-name", text: place.name });
    const barMeta = el("span", { class: "dos__bar-meta", text: district?.name ?? "" });
    bar.append(barName, barMeta);

    /* body */
    const body = el("div", { class: "dos__body" });
    body.append(el("p", { class: "dos__standfirst", text: place.standfirst }));

    const actions = el("div", { class: "dos__actions" });
    actions.append(this.action("↻ Establish the shot", () => this.cb.onFlyShot(place.camera.hero, place.name)));
    const closeShot: Shot | undefined = place.camera.close;
    if (closeShot) {
      actions.append(this.action("⌕ Look closer", () => this.cb.onFlyShot(closeShot, place.name)));
    }
    const contextShot: Shot | undefined = place.camera.context;
    if (contextShot) {
      actions.append(this.action("⤢ Pull back", () => this.cb.onFlyShot(contextShot, place.name)));
    }
    actions.append(this.action("⧉ Copy link", () => this.copyLink(place.id), "copy"));
    body.append(actions);

    /* story */
    const story = el("section", { class: "dos__section" });
    story.append(this.sectionHead("The story"));
    const storyBody = el("div", { class: "dos__story" });
    for (const para of place.story) storyBody.append(el("p", { text: para }));
    story.append(storyBody);
    body.append(story);

    /* facts */
    if (place.facts.length > 0) {
      body.append(this.factSection("Key facts", place.facts));
    }

    /* timeline */
    if (place.timeline && place.timeline.length > 0) {
      body.append(this.timelineSection(place.timeline));
    }

    /* what to look for */
    if (place.lookFor && place.lookFor.length > 0) {
      const section = el("section", { class: "dos__section" });
      section.append(this.sectionHead("What to look for"));
      const list = el("ol", { class: "dos__look" });
      for (const item of place.lookFor) list.append(el("li", { text: item }));
      section.append(list);
      body.append(section);
    }

    /* practical */
    if (place.practical && place.practical.length > 0) {
      const section = el("section", { class: "dos__section" });
      section.append(this.sectionHead("If you go"));
      const dl = el("dl", { class: "dos__dl" });
      for (const item of place.practical) {
        const row = el("div");
        row.append(el("dt", { text: item.label }), el("dd", { text: item.value }));
        dl.append(row);
      }
      section.append(dl);
      body.append(section);
    }

    /* archive (loaded asynchronously) */
    const archive = el("section", { class: "dos__section", dataset: { role: "archive" } });
    body.append(archive);

    /* nearby */
    const others = nearby(place, 4);
    if (others.length > 0) {
      const section = el("section", { class: "dos__section" });
      section.append(this.sectionHead("Within reach"));
      const list = el("div", { class: "dos__nearby" });
      for (const other of others) {
        const row = el("button", { class: "prow prow--nested", type: "button" });
        row.append(
          (() => {
            const main = el("span", { class: "prow__main" });
            main.append(
              el("span", { class: "prow__name", text: other.name }),
              el("span", { class: "prow__tag", text: other.tagline }),
            );
            return main;
          })(),
          el("span", { class: "prow__kind", text: KIND_META[other.kind].glyph }),
        );
        row.addEventListener("click", () => this.cb.onSelectPlace(other.id));
        row.addEventListener("pointerenter", () => this.cb.onHoverPlace(other.id));
        row.addEventListener("pointerleave", () => this.cb.onHoverPlace(null));
        list.append(row);
      }
      section.append(list);
      body.append(section);
    }

    /* prev / next */
    const prev = prevPlace(place);
    const next = nextPlace(place);
    const foot = el("div", { class: "dos__foot" });
    foot.append(
      this.navButton(prev, "Previous", false),
      this.navButton(next, "Next", true),
    );
    body.append(foot);

    this.setContent(hero, bar, body);

    // The compact bar appears only once the hero has scrolled away.
    const onScroll = (): void => {
      bar.classList.toggle("is-on", this.scrollEl.scrollTop > 120);
    };
    this.scrollEl.addEventListener("scroll", onScroll, { passive: true });
    this.scrollEl.scrollTop = 0;
    void visitedCount;
  }

  /* ── district ───────────────────────────────────────────────── */

  renderDistrict(district: District): void {
    const index = DISTRICTS.findIndex((d) => d.id === district.id);
    const accent = ["#E0A45E", "#4E9DB5", "#7FA678", "#C2705E", "#8E86B8", "#D9A0B4"][index % 6];
    this.currentId = district.id;
    this.root.style.setProperty("--accent", accent);

    const places = PLACES_BY_DISTRICT[district.id] ?? [];

    const hero = el("div", { class: "dos__hero" });
    hero.style.aspectRatio = "16 / 7";
    hero.innerHTML = plateSvg("neighbourhood", accent);
    const heroMeta = el("div", { class: "dos__hero-meta" });
    const eyebrow = el("div", { class: "dos__eyebrow" });
    eyebrow.append(el("span", { class: "chip", text: "District" }), el("span", { class: "chip", text: `${places.length} places` }));
    heroMeta.append(
      eyebrow,
      el("h2", { class: "dos__name", text: district.name }),
      el("p", { class: "dos__tagline", text: district.signature }),
    );
    hero.append(el("div", { class: "dos__hero-grade" }), heroMeta);
    const close = el("button", { class: "dos__close", type: "button", "aria-label": "Close district", text: "✕" });
    close.addEventListener("click", () => this.cb.onClose());
    hero.append(close);

    const bar = el("div", { class: "dos__bar" });
    bar.append(el("span", { class: "dos__bar-name", text: district.name }));

    const body = el("div", { class: "dos__body" });
    const essay = el("div", { class: "dos__story" });
    for (const para of district.essay) essay.append(el("p", { text: para }));
    body.append(essay);

    const actions = el("div", { class: "dos__actions" });
    actions.append(this.action("▣ Show the district plate", () => this.cb.onFlyShot(district.center, district.name)));
    body.append(actions);

    const section = el("section", { class: "dos__section" });
    section.append(this.sectionHead("Places in this district"));
    const list = el("div", { class: "dos__nearby" });
    places.forEach((place, i) => {
      const row = el("button", { class: "prow", type: "button" });
      row.append(
        el("span", { class: "prow__idx", text: String(i + 1).padStart(2, "0") }),
        (() => {
          const main = el("span", { class: "prow__main" });
          main.append(
            el("span", { class: "prow__name", text: place.name }),
            el("span", { class: "prow__tag", text: place.tagline }),
          );
          return main;
        })(),
        el("span", { class: "prow__kind", text: KIND_META[place.kind].glyph }),
      );
      row.addEventListener("click", () => this.cb.onSelectPlace(place.id));
      row.addEventListener("pointerenter", () => this.cb.onHoverPlace(place.id));
      row.addEventListener("pointerleave", () => this.cb.onHoverPlace(null));
      list.append(row);
    });
    section.append(list);
    body.append(section);

    const foot = el("div", { class: "dos__foot" });
    const prev = DISTRICTS[(index - 1 + DISTRICTS.length) % DISTRICTS.length];
    const next = DISTRICTS[(index + 1) % DISTRICTS.length];
    foot.append(
      this.districtNav(prev, "Previous district", false),
      this.districtNav(next, "Next district", true),
    );
    body.append(foot);

    this.setContent(hero, bar, body);
    const onScroll = (): void => {
      bar.classList.toggle("is-on", this.scrollEl.scrollTop > 80);
    };
    this.scrollEl.addEventListener("scroll", onScroll, { passive: true });
    this.scrollEl.scrollTop = 0;
  }

  clear(): void {
    this.currentId = null;
    this.root.setAttribute("aria-hidden", "true");
  }

  get id(): string | null {
    return this.currentId;
  }

  /* ── pieces ─────────────────────────────────────────────────── */

  private sectionHead(text: string): HTMLElement {
    const head = el("div", { class: "dos__section-head" });
    head.append(el("span", { class: "micro", text }));
    return head;
  }

  private action(label: string, fn: () => void, kind?: string): HTMLElement {
    const btn = el("button", { class: `btn${kind === "copy" ? " btn--ghost" : ""}`, type: "button", dataset: { act: kind ?? "" } });
    btn.append(el("span", { class: "btn__icon", text: label.slice(0, 1) }), el("span", { text: label.slice(2) }));
    btn.addEventListener("click", fn);
    return btn;
  }

  private factSection(title: string, facts: Fact[]): HTMLElement {
    const section = el("section", { class: "dos__section" });
    section.append(this.sectionHead(title));
    const dl = el("dl", { class: "dos__facts" });
    for (const fact of facts) {
      const cell = el("div", { class: "dos__fact" });
      cell.append(el("dt", { text: fact.label }), el("dd", { text: fact.value }));
      dl.append(cell);
    }
    section.append(dl);
    return section;
  }

  private timelineSection(entries: TimelineEntry[]): HTMLElement {
    const section = el("section", { class: "dos__section" });
    section.append(this.sectionHead("Timeline"));
    const wrap = el("div", { class: "dos__timeline" });
    for (const entry of entries) {
      const item = el("div", { class: "dos__tl" });
      item.append(
        el("div", { class: "dos__tl-year", text: entry.year }),
        el("div", { class: "dos__tl-text", text: entry.text }),
      );
      wrap.append(item);
    }
    section.append(wrap);
    return section;
  }

  private navButton(place: Place, label: string, forward: boolean): HTMLElement {
    const btn = el("button", { class: `dos__nav${forward ? " dos__nav--next" : ""}`, type: "button" });
    btn.append(
      el("span", { class: "micro", text: label }),
      el("span", { class: "dos__nav-name", text: place.name }),
    );
    btn.addEventListener("click", () => this.cb.onSelectPlace(place.id));
    return btn;
  }

  private districtNav(district: District, label: string, forward: boolean): HTMLElement {
    const btn = el("button", { class: `dos__nav${forward ? " dos__nav--next" : ""}`, type: "button" });
    btn.append(
      el("span", { class: "micro", text: label }),
      el("span", { class: "dos__nav-name", text: district.name }),
    );
    btn.addEventListener("click", () => this.cb.onSelectDistrict(district.id));
    return btn;
  }

  private async loadHeroImage(place: Place, img: HTMLImageElement, hero: HTMLElement): Promise<void> {
    const token = ++this.wikiToken;
    hero.dataset.loading = "1";
    const summary = place.wiki ? await fetchWiki(place.wiki) : null;
    if (token !== this.wikiToken || this.currentId !== place.id) return;
    hero.dataset.loading = "0";

    if (summary?.image) {
      img.addEventListener("load", () => img.classList.add("is-in"));
      img.src = summary.image;
      img.alt = `${place.name} — photograph from Wikimedia Commons`;
      const credit = el("span", { class: "dos__credit" });
      const link = el("a", { href: summary.url, target: "_blank", rel: "noreferrer" });
      link.textContent = `Wikimedia Commons · ${summary.title}`;
      credit.append(link);
      hero.append(credit);
    }

    if (summary?.extract) {
      const archive = this.scrollEl.querySelector<HTMLElement>('[data-role="archive"]');
      if (!archive) return;
      archive.append(this.sectionHead("From the encyclopaedia"));
      const box = el("div", { class: "dos__archive" });
      if (summary.image) box.append(el("img", { src: summary.image, alt: "", loading: "lazy" }));
      const bodyBox = el("div", { class: "dos__archive-body" });
      bodyBox.append(el("p", { text: summary.extract }));
      const link = el("a", { href: summary.url, target: "_blank", rel: "noreferrer", text: "Read the full article on Wikipedia ↗" });
      bodyBox.append(link);
      box.append(bodyBox);
      archive.append(box);
    }
  }

  private copyLink(placeId: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set("place", placeId);
    url.searchParams.delete("district");
    const text = url.toString();
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    } else {
      const ta = el("textarea");
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    this.cb.onHoverPlace(null);
    window.dispatchEvent(new CustomEvent("atlas:copied", { detail: text }));
  }
}
