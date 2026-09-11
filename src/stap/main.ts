/**
 * Stap Kaap — a walkable little Cape Town, wrapped onto a globe.
 *
 * The city is built from real OpenStreetMap geometry (see scripts/bake-stap.mjs)
 * and bent onto a sphere, so you stand on it and walk rather than looking at it
 * from outside. Landmarks carry purpose-built models, because they are the point:
 * generic blocks say "a city", a five-bastion star fort says *this* city.
 *
 * No map renderer is involved. A map renderer draws the world from above at
 * scales where a city is a texture; this needs it from a metre away.
 */

import * as THREE from "three";
import "./styles/stap.css";

import { buildCity, cityObjects, spherical, type BakedWorld } from "./city.ts";
import { applyLight, createLight, paintCity } from "./light.ts";
import { buildLandmarks, walkableLandmarks, type Landmark } from "./landmarks.ts";
import { GlobeWalk, placeOnSphere } from "./globewalk.ts";
import { LANDMARK_MODELS } from "./models/types.ts";
import "./models/civic.ts";
import "./models/harbour.ts";
import "./models/living.ts";
import "./models/landscape.ts";
import { Notebook } from "./notebook.ts";
import { Landing, Hud, LandmarkCard, NotebookPanel, LandmarkIndex, toast } from "./ui.ts";
import { dateAtSiteMinutes, zonedNow } from "../core/sun.ts";
import { DISTRICTS } from "../data/index.ts";
import { must, el, raf } from "../util/dom.ts";

const CITY_URL = new URL("../stap/city.json", window.location.href).href;

/**
 * Radius of the globe, in metres.
 *
 * Chosen by solving two competing constraints rather than by eye. Distortion
 * grows the further a flat city wraps: at 900 m the core spans
 * 34°, which keeps footprints recognisable. And curvature only reads if the
 * ground falls away inside the view — from an eye at 320 m the horizon is
 * 980 m away, so a core clipped just inside that shows the city *and* its own
 * horizon in one frame. An earlier 3,465 m globe satisfied neither: it distorted
 * little, but the city ran past the horizon and the world looked flat.
 */
const GLOBE_RADIUS = 1500;

/**
 * Height exaggeration, applied to `h^0.62`: a 4 m shed lifts to about 26 m and
 * the tallest tower to about 270 m. Modest, because a small globe already
 * exaggerates everything simply by being small — a 60 m building on a 1.5 km
 * world is proportionally a skyscraper.
 */
const HEIGHT_GAIN = 11;

/** How high the eye sits when standing. */
const EYE_HEIGHT = 320;

/**
 * How far from the city's centre the globe carries.
 *
 * Tuned so the horizon is visible: the ground falls away within roughly 750 m of
 * a standing eye, so a core wider than this would run past the edge of the world
 * and hide the curve.
 */
const GLOBE_CLIP = 900;

const DISTRICT_NAMES: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.name]));

/** Longitude and latitude of a point in the globe's own coordinates. */
function directionToLonLat(v: THREE.Vector3): { lon: number; lat: number } {
  const n = v.clone().normalize();
  return {
    lat: (Math.asin(Math.max(-1, Math.min(1, n.y))) * 180) / Math.PI,
    lon: (Math.atan2(n.x, -n.z) * 180) / Math.PI,
  };
}

/** The middle of the landmarks: where the city is worth standing. */
function landmarkCentroid(landmarks: Landmark[]): { x: number; z: number } {
  if (landmarks.length === 0) return { x: 0, z: 0 };
  let x = 0;
  let z = 0;
  for (const l of landmarks) {
    x += l.x;
    z += l.z;
  }
  return { x: x / landmarks.length, z: z / landmarks.length };
}

async function boot(): Promise<void> {
  const stage = must("#stage");
  const posterEl = must("#poster");
  const hudEl = must("#hud");
  const cardEl = must("#card");
  const notebookEl = must("#notebook");
  const indexEl = must("#index");
  const toastEl = must("#toasts");

  /* ── renderer ──────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Flat colour, as the reference uses. ACES is a film response: it rolls off
  // highlights and desaturates, which turned a bright toy city into a muted one.
  renderer.toneMapping = THREE.NoToneMapping;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  // A wide lens, so the curve of the world is in frame and a district fits
  // without pulling far back.
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 40000);
  camera.up.set(0, 1, 0);

  /* ── the world ─────────────────────────────────────────────────── */
  const notebook = new Notebook();
  const poster = new Landing(posterEl, { onEnter: () => enter() });
  poster.render();
  poster.setProgress(0.05);

  const world = await loadCity(poster);
  const R = GLOBE_RADIUS;

  // The globe carries the dense core, not the whole rectangle.
  //
  // Two reasons, and the second is the important one. The baked area's corners
  // are the sparsest and most distorted part of any spherical wrap. And a city
  // that runs past the horizon hides the horizon: at eye height the ground falls
  // away within about 650 m, so a city three kilometres across fills the view and
  // the curvature — the entire point of standing on a globe — never shows. The
  // core leaves the curve visible.
  const core = clipToCore(world, GLOBE_CLIP);

  const surfaces = buildCity(core, { project: spherical(R, HEIGHT_GAIN), planetRadius: R });
  for (const object of cityObjects(surfaces)) scene.add(object);

  const light = createLight();
  scene.add(light.sun, light.sun.target, light.sky, light.ambient);

  /* ── landmarks ─────────────────────────────────────────────────── */

  const allLandmarks = walkableLandmarks(buildLandmarks(core), core);
  const withModels = allLandmarks.filter((l) => LANDMARK_MODELS[l.place.id]).length;
  console.debug(
    `[stap] ${core.meta.counts.buildings} buildings · ${allLandmarks.length} landmarks · ${withModels} modelled`,
  );

  /** A landmark's point on the globe, lifted by `height` metres. */
  function onGlobe(l: Landmark, height = 0): THREE.Vector3 {
    const r = Math.hypot(l.x, l.z);
    const theta = r / R;
    const phi = Math.atan2(l.z, l.x);
    return new THREE.Vector3(
      (R + height) * Math.sin(theta) * Math.cos(phi),
      (R + height) * Math.cos(theta),
      (R + height) * Math.sin(theta) * Math.sin(phi),
    );
  }

  interface Placed {
    landmark: Landmark;
    label: HTMLElement;
  }
  const placed: Placed[] = [];

  for (const landmark of allLandmarks) {
    const build = Object.prototype.hasOwnProperty.call(LANDMARK_MODELS, landmark.place.id)
      ? LANDMARK_MODELS[landmark.place.id]
      : undefined;
    if (build) {
      const model = build().group;
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      placeOnSphere(model, landmark.x, landmark.z, R);
      scene.add(model);
    }

    // A mast so a landmark can be found from across the globe. Taller where a
    // bespoke model stands, because there is more to clear.
    const mastHeight = build ? 150 : 70;
    const mast = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, mastHeight, 6),
      new THREE.MeshLambertMaterial({ color: 0xfffefa }),
    );
    post.position.y = mastHeight / 2;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(11, 16, 12),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(landmark.accent) }),
    );
    head.position.y = mastHeight + 9;
    mast.add(post, head);
    placeOnSphere(mast, landmark.x, landmark.z, R);
    scene.add(mast);

    const number = String(placed.length + 1).padStart(2, "0");
    const label = el("button", {
      class: "beacon",
      type: "button",
      "aria-label": `${number} ${landmark.place.name}`,
    });
    label.append(
      el("span", { class: "beacon__num", text: number }),
      el("span", { class: "beacon__label", text: landmark.place.short }),
    );
    label.style.setProperty("--beacon-accent", landmark.accent);
    label.addEventListener("click", () => openCard(landmark, notebook.has(landmark.place.id)));
    stage.append(label);

    placed.push({ landmark, label });
  }

  /* ── the walker ────────────────────────────────────────────────── */

  // Stand at the heart of the landmark field, so the first thing visible is the
  // city and not empty ground.
  const focus = landmarkCentroid(allLandmarks);
  const focusDir = onGlobe({ ...allLandmarks[0], x: focus.x, z: focus.z } as Landmark);
  const focusLL = directionToLonLat(focusDir);

  const walk = new GlobeWalk(camera, R, { lon: focusLL.lon, lat: focusLL.lat, heading: 0.35 });
  walk.setHeight(EYE_HEIGHT);
  walk.attach(renderer.domElement);

  /* ── interface ─────────────────────────────────────────────────── */
  let overview = false;
  let entered = false;

  function readNearest(): void {
    const near = nearestGlobeLandmark(allLandmarks, walk.position, R);
    if (near && near.distance < 260) openCard(near.landmark, notebook.has(near.landmark.place.id));
  }

  const hud = new Hud(hudEl, {
    onRead: () => readNearest(),
    onNotebook: () => toggleNotebook(),
    onLandmarks: () => toggleIndex(),
    onTime: () => cycleLight(),
  });

  const card = new LandmarkCard(cardEl, {
    onClose: () => {
      card.close();
      walk.setEnabled(true);
    },
    onWalkHere: (l) => {
      card.close();
      walk.setEnabled(true);
      const ll = directionToLonLat(onGlobe(l));
      walk.standOff(ll.lon, ll.lat, 210, 0);
      toast(toastEl, `Looking at ${l.place.short}`, l.stamp);
    },
  });

  const notebookPanel = new NotebookPanel(notebookEl, {
    onOpenLandmark: (l) => openCard(l, true),
    onWalkTo: (l) => {
      notebookPanel.close();
      walk.setEnabled(true);
      const ll = directionToLonLat(onGlobe(l));
      walk.standOff(ll.lon, ll.lat, 210, 0);
    },
    onClose: () => {
      notebookPanel.close();
      walk.setEnabled(true);
    },
    onClear: () => {
      notebook.clear();
      notebookPanel.render(notebook, allLandmarks, DISTRICT_NAMES);
      toast(toastEl, "Notebook emptied");
    },
  });

  const indexPanel = new LandmarkIndex(indexEl, {
    onPick: (l) => {
      indexPanel.close();
      walk.setEnabled(true);
      const ll = directionToLonLat(onGlobe(l));
      walk.standOff(ll.lon, ll.lat, 200, 0);
      toast(toastEl, `Standing at ${l.place.short}`, l.stamp);
    },
    onClose: () => {
      indexPanel.close();
      walk.setEnabled(true);
    },
  });

  function openCard(landmark: Landmark, alreadyRead: boolean): void {
    const first = notebook.add(landmark.place.id);
    walk.setEnabled(false);
    notebookPanel.close();
    indexPanel.close();
    const order = allLandmarks.findIndex((l) => l.place.id === landmark.place.id) + 1;
    card.open(landmark, alreadyRead || !first, order, allLandmarks.length);
    if (first) toast(toastEl, `${landmark.place.name} added to your notebook`, landmark.stamp);
  }

  function toggleNotebook(): void {
    const opening = !notebookPanel.isOpen;
    notebookPanel.close();
    indexPanel.close();
    card.close();
    walk.setEnabled(!opening);
    if (opening) notebookPanel.render(notebook, allLandmarks, DISTRICT_NAMES);
  }

  function toggleIndex(): void {
    const opening = !indexPanel.isOpen;
    indexPanel.close();
    notebookPanel.close();
    card.close();
    walk.setEnabled(!opening);
    if (opening) indexPanel.render(allLandmarks, new Set(notebook.ids));
  }

  /**
   * Leave the ground, or come back to it.
   *
   * There is no second scene: the world is the globe, so the overview is simply
   * height. Rising is what makes the curvature — and so the whole city — read.
   */
  function toggleOverview(): void {
    overview = !overview;
    walk.setEnabled(!overview);
    walk.setHeight(overview ? 1700 : EYE_HEIGHT);
    toast(toastEl, overview ? "The whole little city" : "Back down to the streets");
  }

  /* ── light ─────────────────────────────────────────────────────── */
  let manualMinutes: number | null = null;
  const presets: (number | null)[] = [null, 7 * 60, 12 * 60, 18 * 60 + 15, 21 * 60];
  let presetIndex = 0;
  let lightDirty = true;
  let lightTick = 0;

  const currentDate = (): Date =>
    manualMinutes === null ? new Date() : dateAtSiteMinutes(manualMinutes, new Date());

  function refreshLight(): void {
    const at = walk.position;
    applyLight(light, currentDate(), { x: at.x, z: at.z });
    paintCity(light, {
      renderer,
      scene,
      ground: surfaces.ground,
      roads: surfaces.roads,
      green: surfaces.green,
      water: surfaces.water,
      walls: surfaces.walls as unknown as Map<string, THREE.Mesh>,
      roofs: surfaces.roofs,
      trees: surfaces.trees,
      markings: surfaces.markings,
    });
  }

  function cycleLight(): void {
    presetIndex = (presetIndex + 1) % presets.length;
    manualMinutes = presets[presetIndex];
    lightDirty = true;
    const wall = zonedNow(currentDate());
    const clock = `${String(Math.floor(wall.minutes / 60)).padStart(2, "0")}:${String(wall.minutes % 60).padStart(2, "0")}`;
    toast(toastEl, manualMinutes === null ? "Following the real sky over Cape Town" : `Light set to ${clock}`);
  }

  /* ── input ─────────────────────────────────────────────────────── */
  window.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    const key = e.key.toLowerCase();
    if (key === "h") toggleNotebook();
    else if (key === "m") toggleIndex();
    else if (key === "v") toggleOverview();
    else if (key === "t") cycleLight();
    else if (key === "e") readNearest();
    else if (e.key === "Escape") {
      card.close();
      notebookPanel.close();
      indexPanel.close();
      walk.setEnabled(true);
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── the loop ──────────────────────────────────────────────────── */
  let last = performance.now();
  const screen = new THREE.Vector3();

  function enter(): void {
    if (entered) return;
    entered = true;
    poster.hide();
    hud.setVisible(true);
  }

  const tick = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (entered) walk.update(dt);

    lightTick += dt;
    if (lightDirty || (lightTick > 30 && manualMinutes === null)) {
      lightTick = 0;
      lightDirty = false;
      refreshLight();
    }

    // Labels, projected from the globe and de-collided: a landmark with no name
    // is a dot in a field of dots.
    const showLabels = entered && !overview;
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const candidates: { item: Placed; x: number; y: number }[] = [];

    if (showLabels) {
      for (const item of placed) {
        screen.copy(onGlobe(item.landmark, 80)).project(camera);
        if (screen.z >= 1 || Math.abs(screen.x) > 1.05 || Math.abs(screen.y) > 1.05) continue;
        candidates.push({
          item,
          x: (screen.x * 0.5 + 0.5) * window.innerWidth,
          y: (-screen.y * 0.5 + 0.5) * window.innerHeight,
        });
      }
    }

    candidates.sort((a, b) => a.y - b.y);
    for (const candidate of candidates) {
      const width = candidate.item.label.offsetWidth || 100;
      const height = candidate.item.label.offsetHeight || 28;
      let y = candidate.y;
      let fits = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        const box = { x: candidate.x - width / 2, y: y - height, w: width, h: height };
        const clash = boxes.some(
          (b) =>
            Math.abs(b.x + b.w / 2 - candidate.x) < (b.w + width) / 2 + 6 &&
            box.y < b.y + b.h + 4 &&
            box.y + box.h > b.y - 4,
        );
        if (!clash) {
          boxes.push(box);
          fits = true;
          break;
        }
        y += height + 3;
      }
      if (!fits) {
        candidate.item.label.classList.remove("is-on");
        continue;
      }
      candidate.item.label.style.transform = `translate(-50%, -100%) translate(${Math.round(candidate.x)}px, ${Math.round(y)}px)`;
      candidate.item.label.classList.add("is-on");
    }
    if (!showLabels) for (const item of placed) item.label.classList.remove("is-on");

    const near = nearestGlobeLandmark(allLandmarks, walk.position, R);
    if (near) {
      hud.setWhere(`${near.landmark.place.short} · ${Math.round(near.distance)} m`);
      hud.setNear(near.distance < 260 ? near.landmark : null, near.distance);
    }

    renderer.render(scene, camera);
  };

  refreshLight();
  poster.setReady();
  raf(tick);

  if (import.meta.env?.DEV || window.location.search.includes("debug")) {
    Object.assign(window, {
      __stap: {
        scene, camera, renderer, world, landmarks: allLandmarks, placed, surfaces, light, walk,
        models: Object.keys(LANDMARK_MODELS),
      },
    });
  }
}

/**
 * The nearest landmark, measured over the surface of the globe.
 *
 * Straight-line distance between two points on a sphere under-reports the far
 * ones, but every distance the HUD shows is short, and a chord is the cheaper
 * and steadier answer here.
 */
function nearestGlobeLandmark(
  landmarks: Landmark[],
  position: THREE.Vector3,
  radius: number,
): { landmark: Landmark; distance: number } | null {
  let best: Landmark | null = null;
  let bestD = Infinity;
  const point = new THREE.Vector3();
  for (const l of landmarks) {
    const r = Math.hypot(l.x, l.z);
    const theta = r / radius;
    const phi = Math.atan2(l.z, l.x);
    point.set(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.cos(theta),
      radius * Math.sin(theta) * Math.sin(phi),
    );
    const d = position.distanceTo(point);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best ? { landmark: best, distance: bestD } : null;
}

/**
 * The inner part of the baked world, by distance from the city's centre.
 *
 * A geometry is kept if any of its points falls inside the radius, so nothing is
 * cut through the middle.
 */
function clipToCore(world: BakedWorld, radius: number): BakedWorld {
  const within = (points: number[]): boolean => {
    for (let i = 0; i < points.length; i += 2) {
      if (points[i] * points[i] + points[i + 1] * points[i + 1] <= radius * radius) return true;
    }
    return false;
  };
  return {
    ...world,
    buildings: world.buildings.filter((b) => within(b.f)),
    roads: world.roads.filter((r) => within(r.p)),
    green: world.green.filter((g) => within(g.p)),
    water: world.water.filter((w) => within(w.p)),
  };
}

/**
 * Load the baked city, reporting progress to the poster.
 *
 * Either branch ends in `toMetres`. An earlier version returned straight from the
 * no-length branch and skipped the conversion, which silently put the streets in
 * decimetres while the landmarks were in metres.
 */
async function loadCity(poster: Landing): Promise<BakedWorld> {
  const res = await fetch(CITY_URL);
  if (!res.ok) throw new Error(`city.json: HTTP ${res.status}`);

  const total = Number(res.headers.get("content-length") ?? 0);
  let text: string;

  if (res.body && total > 0) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let seen = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      seen += value.length;
      poster.setProgress(seen / total);
    }
    const buffer = new Uint8Array(seen);
    let at = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, at);
      at += chunk.length;
    }
    text = new TextDecoder().decode(buffer);
  } else {
    poster.setProgress(0.5);
    text = await res.text();
  }

  return toMetres(JSON.parse(text) as BakedWorld);
}

/** The bake stores integer decimetres; everything downstream is in metres. */
function toMetres(world: BakedWorld): BakedWorld {
  const scale = (values: number[]): void => {
    for (let i = 0; i < values.length; i++) values[i] /= 10;
  };
  for (const b of world.buildings) scale(b.f);
  for (const r of world.roads) {
    scale(r.p);
    r.w /= 10;
  }
  for (const g of world.green) scale(g.p);
  for (const w of world.water) scale(w.p);
  return world;
}

void boot().catch((error: unknown) => {
  console.error("[stap] failed to start:", error);
  const poster = document.getElementById("poster");
  if (poster) {
    poster.innerHTML = `<p style="padding:2rem;color:#14235c">Stap Kaap could not start. Reload to try again.</p>`;
  }
});
