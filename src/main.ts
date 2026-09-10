/**
 * Cape Town Atlas — application entry.
 *
 * Wires the map, the light, the content and the chrome together, and owns the
 * handful of behaviours that only make sense as a whole: how a place opens, how
 * a route plays, what the URL says, and how the camera is framed around
 * whatever panels are on screen.
 */

import { Atlas, CITY_SHOT, WIDE_SHOT } from "./core/atlas.ts";
import { Lighting, type LightState } from "./core/lighting.ts";

import { StoryPlayer } from "./core/story.ts";
import {
  Store,
  readUrl,
  viewDistrictId,
  viewPlaceId,
  writeUrl,
  type AppSnapshot,
  type BrowseTab,
  type SheetLevel,
} from "./core/state.ts";
import { STYLE_SEED } from "./core/presets.ts";
import { phaseGlyph, phaseLabel } from "./core/sun.ts";
import type { Insets } from "./core/geo.ts";
import { DISTRICT_BY_ID, PLACES, PLACE_BY_ID, STORIES } from "./data/index.ts";
import type { Shot } from "./data/types.ts";
import { Beacons } from "./ui/beacons.ts";
import { DistrictPlates } from "./layers/districts.ts";
import { Identify } from "./ui/identify.ts";
import { Rail } from "./ui/rail.ts";
import { Dossier } from "./ui/dossier.ts";
import { PlayerView } from "./ui/player.ts";
import { Palette } from "./ui/palette.ts";
import { TimeDialog } from "./ui/timedialog.ts";
import { Welcome, renderAbout } from "./ui/about.ts";
import { Toasts } from "./ui/toasts.ts";
import { Toolbar } from "./ui/toolbar.ts";
import { mountStars } from "./layers/stars.ts";
import { loadVisited, markWelcomed, hasSeenWelcome, saveVisited } from "./util/storage.ts";
import { $, must, clamp, isCoarse, prefersReducedMotion, throttle } from "./util/dom.ts";

const COMPACT_BREAKPOINT = 1024;
const SHEET_PEEK = 148;

const app = must("#app");

/** Boot progress, surfaced on the document so a stalled start is diagnosable
 *  from the outside rather than only in the console. */
const stage = (name: string): void => {
  document.documentElement.dataset.boot = name;
};

/* ── state ─────────────────────────────────────────────────────── */

const urlState = readUrl();
const store = new Store({
  view: urlState.view,
  visited: loadVisited(),
  photo: urlState.photo ?? false,
});

const compact = (): boolean => window.innerWidth <= COMPACT_BREAKPOINT;

/* ── scene ─────────────────────────────────────────────────────── */

const initialShot: Shot = urlState.camera
  ? { ...urlState.camera }
  : { ...CITY_SHOT };

const atlas = new Atlas({
  container: must("#map"),
  center: [initialShot.lon, initialShot.lat],
  zoom: initialShot.zoom,
  pitch: initialShot.pitch,
  bearing: initialShot.bearing,
  base: STYLE_SEED.base,
  water: STYLE_SEED.water,
  buildings: store.get().prefs.buildings,
  terrain: store.get().prefs.terrain,
  heightScale: store.get().prefs.heightScale,
});

const stars = document.getElementById("stars") as HTMLCanvasElement;
mountStars(stars);

const lighting = new Lighting({
  atlas,
  useWeather: () => store.get().prefs.liveWeather,
  manualMinutes: () => (store.get().prefs.timeMode === "manual" ? store.get().prefs.manualMinutes : null),
  onState: (state) => onLight(state),
});

const plates = new DistrictPlates(atlas.map, Object.values(DISTRICT_BY_ID));

// Any settle of the map is a moment worth sharing.
atlas.map.on("moveend", () => syncCamera());
// Direct manipulation of the map counts as taking control, on every input
// device — a wheel or pinch must stop the scripted opening just as a drag does.
atlas.map.on("dragstart", () => settled());
atlas.map.on("wheel", () => settled());
atlas.map.on("touchstart", () => settled());

const toasts = new Toasts(must("#toasts"));
const identify = new Identify({
  root: must("#identify"),
  atlas,
  onOpenPlace: (id) => openPlace(id),
});

const beacons = new Beacons({
  root: must("#beacons"),
  atlas,
  places: PLACES,
  onSelect: (id) => openPlace(id),
  onHover: (place, x, y) => {
    identify.showPlace(place, x, y);
    if (place) highlightInRail(place.id);
  },
});

/* ── chrome ────────────────────────────────────────────────────── */

const rail = new Rail(must("#rail"), {
  onSelectPlace: (id) => openPlace(id),
  onSelectDistrict: (id) => openDistrict(id),
  onHoverPlace: (id) => {
    if (id) beacons.setActive(id);
    else beacons.setActive(viewPlaceId(store.get().view));
  },
  onPlayStory: (id) => startStory(id),
  onOpenSearch: () => palette.open(),
  onTab: (tab) => setTab(tab),
  onFilter: (kind) => store.update({ filter: kind }),
  onResetProgress: () => {
    store.resetProgress();
    beacons.setVisited([]);
    toasts.show("Progress cleared");
  },
  onExitStory: () => stopStory(),
  onJumpBeat: (index) => void story.goTo(index),
});

const dossier = new Dossier(must("#dossier"), {
  onClose: () => home(),
  onSelectPlace: (id) => openPlace(id),
  onSelectDistrict: (id) => openDistrict(id),
  onFlyShot: (shot, label) => {
    void atlas.camera.flyTo(shot, { swing: 12 });
    toasts.show(label, { key: "view" });
  },
  onHoverPlace: (id) => {
    if (id) beacons.setActive(id);
    else beacons.setActive(viewPlaceId(store.get().view));
  },
});

const player = new PlayerView(must("#player"), {
  onToggle: () => story.toggle(),
  onNext: () => story.next(),
  onPrevious: () => story.previous(),
  onExit: () => stopStory(),
  onJump: (index) => void story.goTo(index),
  onToggleExpand: () => {
    expanded = !expanded;
    player.setExpanded(expanded);
  },
});

let expanded = false;

const story = new StoryPlayer(atlas, {
  onBeat: (beat, index) => {
    player.setBeat(index);
    player.setNarration(beat.narration);
    store.update({ story: { storyId: story.currentStory?.id ?? "", index, playing: story.isPlaying } });
    beacons.setActive(beat.placeId);
    markVisited(beat.placeId);
  },
  onFlying: (flying) => player.setFlying(flying),
  onProgress: (fraction) => player.setProgress(fraction, story.currentIndex),
  onPlayStateChange: (playing) => {
    player.setPlaying(playing);
    const session = store.get().story;
    if (session) store.update({ story: { ...session, playing } });
  },
  onFinished: () => {
    toasts.show("Route complete", { key: "✓" });
  },
});

const palette = new Palette(must<HTMLDialogElement>("#paletteDialog"), {
  onPick: (hit) => {
    if (hit.type === "place") openPlace(hit.id);
    else if (hit.type === "district") openDistrict(hit.id);
    else startStory(hit.id);
  },
});

function renderTimeDialog(): void {
  const state = lighting.current;
  if (state) timeDialog.render(state, store.get().prefs);
}

const timeDialog = new TimeDialog(must<HTMLDialogElement>("#timeDialog"), {
  onScrub: (minutes) => {
    if (minutes === null) {
      store.setPrefs({ timeMode: "auto" });
      lighting.apply(true);
      renderTimeDialog();
      toasts.show("Following the real Cape Town sky");
    } else {
      store.setPrefs({ timeMode: "manual", manualMinutes: minutes });
      lighting.apply(true);
      // Keep the dialog's own clock and arc in step with the live scene.
      renderTimeDialog();
    }
  },
  onSetWeather: (live) => {
    store.setPrefs({ liveWeather: live });
    if (live) void lighting.loadWeather();
    else lighting.clearWeather();
  },
});

const aboutDialog = must<HTMLDialogElement>("#aboutDialog");
renderAbout(aboutDialog, {
  onExperimental: () => {
    store.resetProgress();
    beacons.setVisited([]);
    toasts.show("Progress and preferences cleared");
  },
});

const welcome = new Welcome({
  onTour: () => {
    const pick = STORIES[0];
    if (pick) startStory(pick.id);
  },
  onDistricts: () => setTab("districts"),
  onDismiss: () => markWelcomed(),
});

const toolbar = new Toolbar(atlas, {
  onHome: () => home(),
  onOpenSearch: () => palette.open(),
  onOpenTime: () => {
    timeDialog.open();
    renderTimeDialog();
  },
  onOpenAbout: () => aboutDialog.showModal(),
  onSetPref: (patch) => applyPrefs(patch),
  onTogglePhoto: () => togglePhoto(),
  onShowPlates: () => {
    plates.setVisible(true);
    plates.setActive(viewDistrictId(store.get().view));
    toasts.show("District boundaries on", { key: "D" });
  },
  onSelectDistrict: (id) => openDistrict(id),
  getPrefs: () => store.get().prefs,
});

/* ── light ─────────────────────────────────────────────────────── */

function onLight(state: LightState): void {
  app.dataset.night = String(state.darkness > 0.55);
  stars.style.setProperty("--stars-opacity", String(Math.min(0.75, state.grade.starOpacity)));
  app.style.setProperty("--grade", String(state.grade.grade));
  const clock = `${String(Math.floor(state.sky.minutes / 60)).padStart(2, "0")}:${String(state.sky.minutes % 60).padStart(2, "0")}`;
  toolbar.setTime(phaseGlyph(state.sky), phaseLabel(state.sky), clock);
}

/* ── panels and framing ────────────────────────────────────────── */

function computeInsets(state: AppSnapshot): Insets {
  if (compact()) return { left: 0, right: 0, top: 54, bottom: 0 };
  const styles = getComputedStyle(document.documentElement);
  const railW = parseFloat(styles.getPropertyValue("--rail-w")) || 376;
  const dossierW = parseFloat(styles.getPropertyValue("--dossier-w")) || 468;
  const left = state.view.kind === "city" ? railW : 0;
  const right = state.view.kind === "city" ? 0 : dossierW;
  const bottom = state.story ? 128 : 0;
  return { left, right, top: 58, bottom };
}

function syncInsets(state: AppSnapshot): void {
  const insets = computeInsets(state);
  atlas.setInsets(insets);
  app.style.setProperty("--inset-left", `${insets.left}px`);
  app.style.setProperty("--inset-right", `${insets.right}px`);
}

function syncPanel(state: AppSnapshot): void {
  app.dataset.panel = state.view.kind === "city" ? "index" : "focus";
  app.dataset.mode = state.story ? "tour" : "wander";
  app.dataset.photo = String(state.photo);
  const dossierEl = must("#dossier");
  const closed = state.view.kind === "city";
  dossierEl.setAttribute("aria-hidden", String(closed));
  // `inert` is what actually takes the closed panel out of the tab order and
  // the accessibility tree; aria-hidden alone leaves its controls focusable.
  dossierEl.toggleAttribute("inert", closed);
  if (compact()) app.dataset.sheet = state.view.kind === "city" ? store.get().sheet : "peek";
}

function syncUrl(state: AppSnapshot, replace = true): void {
  const camera = atlas.camera.snapshot();
  writeUrl(
    {
      view: state.view,
      camera: { lon: camera.lon, lat: camera.lat, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing },
      time: state.prefs.timeMode === "manual" ? state.prefs.manualMinutes : undefined,
      photo: state.photo,
    },
    replace,
  );
}

function render(state: AppSnapshot, changed: Set<keyof AppSnapshot>): void {
  rail.render(state);
  toolbar.render(state);
  syncPanel(state);

  if (changed.has("view") || changed.has("visited")) {
    syncInsets(state);
    if (state.view.kind === "place") {
      const place = PLACE_BY_ID[state.view.id];
      if (place) dossier.renderPlace(place, state.visited.length);
    } else if (state.view.kind === "district") {
      const district = DISTRICT_BY_ID[state.view.id];
      if (district) dossier.renderDistrict(district);
    }
  }

  if (changed.has("visited")) {
    beacons.setVisited(state.visited);
    saveVisited(state.visited);
  }
  if (changed.has("story")) {
    syncInsets(state);
  }
  // Navigation creates history entries; incidental state (camera, light,
  // photo mode) only rewrites the current one.
  syncUrl(state, !changed.has("view"));
}

store.subscribe(render);

// The camera is part of the state that gets shared, so the URL follows it —
// otherwise a copied link would restore a view from before the last flight.
const syncCamera = throttle(() => syncUrl(store.get(), true), 400);

/* ── actions ───────────────────────────────────────────────────── */

/** The visitor has taken control. Nothing scripted may move the camera after
 *  this point — in particular the timed opening move, which would otherwise
 *  yank the view back mid-navigation. */
let interacted = false;

function settled(): void {
  interacted = true;
  if (welcome.isVisible) welcome.dismiss();
}

function markVisited(id: string): void {
  if (store.get().visited.includes(id)) return;
  store.visit(id);
}

function openPlace(id: string): void {
  const place = PLACE_BY_ID[id];
  if (!place) return;
  settled();
  const state = store.get();
  // A story owns the camera while it plays; opening a place ends the route.
  if (state.story) stopStory(false);

  store.update({ view: { kind: "place", id } });
  beacons.setActive(id);
  markVisited(id);
  plates.setActive(place.district);
  if (compact()) app.dataset.sheet = "peek";
  closeOtherPanels();
  void atlas.camera.flyTo(place.camera.hero, { swing: 11 });
}

function openDistrict(id: string): void {
  const district = DISTRICT_BY_ID[id];
  if (!district) return;
  settled();
  if (store.get().story) stopStory(false);
  store.update({ view: { kind: "district", id } });
  beacons.setActive(null);
  plates.setVisible(true);
  plates.setActive(id);
  if (compact()) app.dataset.sheet = "peek";
  closeOtherPanels();
  void atlas.camera.flyTo(district.center, { swing: -14 });
}

function home(): void {
  settled();
  if (store.get().story) stopStory(false);
  store.update({ view: { kind: "city" } });
  beacons.setActive(null);
  plates.setActive(null);
  beacons.setVisible(store.get().prefs.beacons);
  closeOtherPanels();
  void atlas.camera.flyTo(CITY_SHOT, { swing: 0, pace: 1.05 });
}

function closeOtherPanels(): void {
  toolbar.closePop();
  if (palette.isOpen) palette.close();
  if (timeDialog.isOpen) timeDialog.close();
}

function setTab(tab: BrowseTab): void {
  store.update({ tab });
  if (compact()) app.dataset.sheet = "half";
}

/* ── stories ───────────────────────────────────────────────────── */

function startStory(id: string): void {
  const target = STORIES.find((s) => s.id === id);
  if (!target) return;
  settled();
  store.update({ view: { kind: "city" } });
  plates.setVisible(false);
  beacons.setActive(null);
  closeOtherPanels();
  story.load(target);
  player.load(target, story.beatList);
  store.update({ story: { storyId: id, index: 0, playing: true } });
  if (compact()) app.dataset.sheet = "peek";
  void story.play(0);
}

function stopStory(restore = true): void {
  story.stop();
  player.hide();
  store.update({ story: null });
  if (restore) {
    const last = viewPlaceId(store.get().view);
    if (last) openPlace(last);
  }
}

/* ── preferences ───────────────────────────────────────────────── */

function applyPrefs(patch: Partial<AppSnapshot["prefs"]>): void {
  store.setPrefs(patch);
  const prefs = store.get().prefs;
  if ("buildings" in patch) atlas.setBuildingsVisible(prefs.buildings);
  if ("terrain" in patch) atlas.setTerrainEnabled(prefs.terrain);
  if ("heightScale" in patch) atlas.setHeightScale(prefs.heightScale);
  if ("beacons" in patch) {
    beacons.setVisible(prefs.beacons);
    if (!prefs.beacons) rail.revealActive();
  }
  lighting.apply(true);
}

function togglePhoto(): void {
  const photo = !store.get().photo;
  store.update({ photo });
  if (photo) {
    closeOtherPanels();
    toasts.show("Photo mode — press P to return", { key: "P" });
  }
  syncInsets(store.get());
}

/* ── rail highlighting from the map ────────────────────────────── */

let highlightTimer = 0;
function highlightInRail(id: string): void {
  const state = store.get();
  if (state.view.kind !== "city" || state.tab !== "places") return;
  window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(() => {
    const row = must("#rail").querySelector<HTMLElement>(`.prow[data-id="${id}"]`);
    row?.classList.add("is-active");
    window.setTimeout(() => row?.classList.remove("is-active"), 900);
  }, 60);
}

/* ── keyboard ──────────────────────────────────────────────────── */

window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement | null;
  const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    palette.open();
    return;
  }
  if (typing) return;

  switch (e.key) {
    case "ArrowRight": {
      const cur = viewPlaceId(store.get().view);
      if (cur) {
        const i = PLACES.findIndex((p) => p.id === cur);
        openPlace(PLACES[(i + 1) % PLACES.length].id);
      } else {
        openPlace(PLACES[0].id);
      }
      break;
    }
    case "ArrowLeft": {
      const cur = viewPlaceId(store.get().view);
      if (cur) {
        const i = PLACES.findIndex((p) => p.id === cur);
        openPlace(PLACES[(i - 1 + PLACES.length) % PLACES.length].id);
      }
      break;
    }
    case " ":
      if (store.get().story) {
        e.preventDefault();
        story.toggle();
      }
      break;
    case "f":
    case "F":
      home();
      break;
    case "t":
    case "T":
      timeDialog.toggle();
      if (timeDialog.isOpen) renderTimeDialog();
      break;
    case "p":
    case "P":
      togglePhoto();
      break;
    case "d":
    case "D": {
      plates.setVisible(true);
      plates.setActive(viewDistrictId(store.get().view));
      toasts.show("District boundaries on", { key: "D" });
      break;
    }
    case "?":
      aboutDialog.showModal();
      break;
    case "Escape":
      closeOtherPanels();
      break;
    case "1":
    case "2":
    case "3": {
      const tabs: BrowseTab[] = ["places", "districts", "stories"];
      setTab(tabs[Number(e.key) - 1]);
      break;
    }
    default:
      break;
  }
});

/* ── the opening shot ──────────────────────────────────────────── */

const intro = must("#intro");
let introDone = false;

function endIntro(): void {
  if (introDone) return;
  introDone = true;
  intro.classList.add("is-out");
  store.update({ pristine: false });
  window.setTimeout(() => {
    if (store.get().visited.length === 0 && !hasSeenWelcome()) welcome.show();
  }, 1100);
}

intro.addEventListener("pointerdown", endIntro);
window.addEventListener("keydown", endIntro, { once: true });
window.setTimeout(endIntro, 7000);

/* ── mobile sheet ──────────────────────────────────────────────── */

function installSheet(): void {
  const railEl = must("#rail");
  let startY = 0;
  let dragging = false;
  let startOffset = 0;

  const offsetFor = (level: SheetLevel): number => {
    const h = railEl.offsetHeight;
    if (level === "full") return 0;
    if (level === "half") return h * 0.26;
    return Math.max(0, h - SHEET_PEEK);
  };

  railEl.addEventListener("pointerdown", (e) => {
    if (!compact()) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".rail__body")) return;
    dragging = true;
    startY = e.clientY;
    startOffset = offsetFor((app.dataset.sheet as SheetLevel) ?? "peek");
    railEl.style.transition = "none";
    railEl.setPointerCapture(e.pointerId);
  });

  railEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const max = railEl.offsetHeight - 80;
    const offset = clamp(startOffset + dy, 0, max);
    railEl.style.transform = `translateY(${offset}px)`;
  });

  const finish = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    railEl.style.transition = "";
    railEl.style.transform = "";
    const dy = e.clientY - startY;
    const current = (app.dataset.sheet as SheetLevel) ?? "peek";
    const order: SheetLevel[] = ["peek", "half", "full"];
    const i = order.indexOf(current);
    let next = current;
    if (dy < -70) next = order[Math.min(2, i + 1)];
    else if (dy > 70) next = order[Math.max(0, i - 1)];
    app.dataset.sheet = next;
    store.update({ sheet: next });
  };
  railEl.addEventListener("pointerup", finish);
  railEl.addEventListener("pointercancel", finish);
}

/* ── responsive ────────────────────────────────────────────────── */

let lastCompact = compact();
window.addEventListener("resize", () => {
  const now = compact();
  if (now !== lastCompact) {
    lastCompact = now;
    if (now) app.dataset.sheet = store.get().sheet;
    else delete app.dataset.sheet;
  }
  syncInsets(store.get());
  beacons.schedule();
  atlas.map.resize();
});

/* ── boot ──────────────────────────────────────────────────────── */

async function boot(): Promise<void> {
  stage("boot");
  player.setPlaying(true);
  if (compact()) app.dataset.sheet = store.get().sheet;

  // A spinner with no ceiling is a dead end: if the style or its tiles are slow
  // to arrive, retire the overlay anyway and say so, then carry on when the map
  // is genuinely ready. The map paints whenever it can either way.
  const loadingEl = must("#loading");
  const clearLoading = (): void => loadingEl.classList.add("is-done");
  let styleReady = false;
  const ceiling = window.setTimeout(() => {
    if (styleReady) return;
    clearLoading();
    toasts.show("Map data is still arriving — the city will fill in", { key: "…", timeout: 6000 });
  }, 12000);

  await atlas.ready;
  styleReady = true;
  window.clearTimeout(ceiling);
  stage("style");
  plates.install();
  plates.setVisible(false);
  beacons.setVisited(store.get().visited);
  syncInsets(store.get());
  lighting.start();
  stage("lit");

  if (store.get().prefs.liveWeather) void lighting.loadWeather();

  // Restore URL state without animation, then present the city.
  if (urlState.view.kind === "place") {
    const place = PLACE_BY_ID[urlState.view.id];
    if (place) {
      store.update({ view: urlState.view });
      beacons.setActive(place.id);
      if (!urlState.camera) atlas.camera.jumpTo(place.camera.hero);
      markVisited(place.id);
    }
  } else if (urlState.view.kind === "district") {
    plates.setVisible(true);
    plates.setActive(urlState.view.id);
    store.update({ view: urlState.view });
    const district = DISTRICT_BY_ID[urlState.view.id];
    if (district && !urlState.camera) atlas.camera.jumpTo(district.center);
  }

  render(store.get(), new Set<keyof AppSnapshot>(["view", "visited"]));
  beacons.schedule();

  await atlas.idle();
  stage("idle");
  clearLoading();

  // The opening move: hold the whole peninsula while the title sits over it,
  // then descend into the streets where the model has real density. Two beats
  // rather than one long slide — the wide shot explains the land, the arrival
  // explains the city.
  if (!urlState.camera && !prefersReducedMotion() && store.get().view.kind === "city") {
    atlas.camera.jumpTo(WIDE_SHOT);
    window.setTimeout(() => {
      // Only descend if the opening is still the thing being watched.
      if (interacted || store.get().view.kind !== "city") return;
      void atlas.camera.flyTo(CITY_SHOT, { pace: 2.2 });
    }, 2200);
  } else {
    endIntro();
  }

  installSheet();
  if (isCoarse()) beacons.schedule();
  stage("ready");
}

window.addEventListener("atlas:copied", () => toasts.show("Link copied to the clipboard"));

window.addEventListener("popstate", () => {
  const next = readUrl();
  if (next.view.kind === "place") openPlace(next.view.id);
  else if (next.view.kind === "district") openDistrict(next.view.id);
  else home();
});

void boot().catch((error: unknown) => {
  // A failed start must not leave a blank screen: report it plainly.
  stage("failed");
  must("#loadingText").textContent = "The atlas could not start. Reload to try again.";
  console.error("Cape Town Atlas failed to start:", error);
});

/* ── dev conveniences ──────────────────────────────────────────── */

if (import.meta.env?.DEV) {
  Object.assign(window, { atlas, store, lighting, story, plates, beacons, $ });
}
