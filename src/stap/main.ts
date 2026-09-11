/**
 * Stap Kaap — a miniature Cape Town, looked at from above.
 *
 * A model on a table: streets, blocks, roofs and green all read in plan, which
 * is what extruded footprints are actually good at. The previous version walked
 * the city at eye level, where every wall is an untextured plane; this looks at
 * it, which is both truer to the reference and better for the data.
 *
 * No map renderer is involved. The city is drawn in three.js over geometry baked
 * from OpenStreetMap (see scripts/bake-stap.mjs), because a map renderer cannot
 * supply street-level detail and this scene needs none of what a map renderer is
 * for.
 */

import * as THREE from "three";
import "./styles/stap.css";

import { buildCity, cityObjects, spherical, type BakedWorld } from "./city.ts";
import { applyLight, createLight, paintCity } from "./light.ts";
import { buildLandmarks, walkableLandmarks, nearestLandmark, type Landmark } from "./landmarks.ts";
import { DioramaCamera } from "./camera.ts";
import { Figure, PALETTES } from "./figure.ts";
import { Notebook } from "./notebook.ts";
import { Landing, Hud, LandmarkCard, NotebookPanel, LandmarkIndex, toast } from "./ui.ts";
import { dateAtSiteMinutes, zonedNow } from "../core/sun.ts";
import { DISTRICTS } from "../data/index.ts";
import { must, el, raf } from "../util/dom.ts";

const CITY_URL = new URL("../stap/city.json", window.location.href).href;

/**
 * Radius of the little planet, in metres, for the overview.
 *
 * Derived from the data rather than chosen by eye: the baked city extends
 * 3,628 m from its origin, and wrapping a flat city onto a sphere is only
 * distortion-free at the centre. At this radius the whole thing sits inside a
 * 60° cap, where streets still look like streets.
 */
const PLANET_RADIUS = 3465;
const PLANET_HEIGHT_GAIN = 14;
const PLANET_CLIP = 2100;

const DISTRICT_NAMES: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.name]));

async function boot(): Promise<void> {
  const stage = must("#stage");
  const posterEl = must("#poster");
  const hudEl = must("#hud");
  const cardEl = must("#card");
  const notebookEl = must("#notebook");
  const indexEl = must("#index");
  const toastEl = must("#toasts");

  /* ── renderer and scenes ───────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // No tone mapping. ACES is a film response — it rolls off highlights and
  // desaturates, which is right for a photograph and wrong here: it made a
  // bright toy city read as muted and earthy. The reference is flat,
  // poster-like colour, and that is what this is.
  renderer.toneMapping = THREE.NoToneMapping;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  // A wide lens, as the reference uses: it keeps the streets legible from
  // above and lets a whole district sit in frame without pulling far back.
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 9000);

  // The overview planet is its own scene: the city is a kilometre across, Earth
  // twelve thousand, and mixing them means fighting depth precision for nothing.
  const planetScene = new THREE.Scene();
  const planetCamera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 1, 40000);

  /* ── the city ──────────────────────────────────────────────────── */
  const notebook = new Notebook();
  const poster = new Landing(posterEl, { onEnter: () => enter() });
  poster.render();
  poster.setProgress(0.05);

  const world = await loadCity(poster);
  const surfaces = buildCity(world);
  for (const object of cityObjects(surfaces)) scene.add(object);

  const light = createLight();
  scene.add(light.sun, light.sun.target, light.sky, light.ambient);

  /* ── landmarks ─────────────────────────────────────────────────── */
  const allLandmarks = walkableLandmarks(buildLandmarks(world), world);
  console.debug(`[stap] ${world.meta.counts.buildings} buildings · ${allLandmarks.length} landmarks`);

  // A pin per landmark, rising out of the plan so a place is findable from any
  // angle. Sized in metres, so it stays proportionate at every zoom.
  const pinGroup = new THREE.Group();
  scene.add(pinGroup);
  interface Pin {
    landmark: Landmark;
    post: THREE.Mesh;
    head: THREE.Mesh;
    label: HTMLElement;
    number: string;
  }
  const pins: Pin[] = [];

  for (const landmark of allLandmarks) {
    const accent = new THREE.Color(landmark.accent);
    const height = 34;

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, height, 8),
      new THREE.MeshLambertMaterial({ color: 0xfffefa }),
    );
    post.position.set(landmark.x, height / 2, landmark.z);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(6, 18, 14),
      new THREE.MeshLambertMaterial({ color: accent }),
    );
    head.position.set(landmark.x, height + 5, landmark.z);

    pinGroup.add(post, head);

    // The number is the tie between the pin and the list, exactly as the
    // reference does it: "numbers match the map".
    const number = String(pins.length + 1).padStart(2, "0");
    const label = el("button", { class: "beacon", type: "button", "aria-label": `${number} ${landmark.place.name}` });
    label.append(
      el("span", { class: "beacon__num", text: number }),
      el("span", { class: "beacon__label", text: landmark.place.short }),
    );
    label.style.setProperty("--beacon-accent", landmark.accent);
    label.addEventListener("click", () => openCard(landmark, notebook.has(landmark.place.id)));
    stage.append(label);

    pins.push({ landmark, post, head, label, number });
  }

  /* ── camera ────────────────────────────────────────────────────── */
  // The city opens on the landmark cluster, not on the whole baked area.
  //
  // Fitting everything — all 3.6 km of it — puts the camera ten kilometres out
  // and every landmark becomes a dot, which defeats the point: the landmarks are
  // what this is for. So the view opens close on the heart of the city, where
  // most of them are, and the rest are a drag away.
  const focus = landmarkCentroid(allLandmarks);
  const OPENING_DISTANCE = 900;
  console.debug(
    `[stap] ${allLandmarks.length} landmarks · spread ${Math.round(landmarkSpread(allLandmarks, focus))} m · opening at ${OPENING_DISTANCE} m`,
  );
  const view = new DioramaCamera(camera, {
    targetX: focus.x,
    targetZ: focus.z,
    bearing: -0.5,
    pitch: 0.9,
    distance: OPENING_DISTANCE,
  });
    view.attach(renderer.domElement);

  /* ── pedestrians ───────────────────────────────────────────────── */
  // A dozen figures walking the streets. They are here for scale as much as
  // life: a person on a pavement is the clearest reference for how big the
  // buildings are, which a plan view otherwise leaves ambiguous.
  interface Pedestrian {
    figure: Figure;
    road: number;
    point: number;
    dir: 1 | -1;
    speed: number;
  }
  const walkableRoads = world.roads.filter((r) => r.p.length >= 4);
  const pedestrians: Pedestrian[] = [];
  for (let i = 0; i < 16; i++) {
    const figure = new Figure(PALETTES[(i + 1) % PALETTES.length]);
    figure.setShadow(i < 6);
    figure.setVisible(false);
    scene.add(figure.root);
    pedestrians.push({ figure, road: -1, point: 0, dir: 1, speed: 1.1 + Math.random() * 0.6 });
  }

  function assignRoad(ped: Pedestrian, nearX: number, nearZ: number): void {
    const WANT = 260;
    let best = -1;
    let bestD = Infinity;
    for (let attempt = 0; attempt < 120; attempt++) {
      const index = Math.floor(Math.random() * walkableRoads.length);
      const p = walkableRoads[index].p;
      const at = Math.floor(Math.random() * (p.length / 2)) * 2;
      const d = Math.hypot(p[at] - nearX, p[at + 1] - nearZ);
      if (d < WANT) {
        best = index;
        bestD = d;
        break;
      }
      if (d < bestD) {
        bestD = d;
        best = index;
      }
    }
    if (best < 0) return;
    ped.road = best;
    const p = walkableRoads[best].p;
    ped.point = bestD < WANT ? Math.floor(Math.random() * (p.length / 2)) * 2 : 0;
    ped.dir = Math.random() < 0.5 ? 1 : -1;
  }

  function stepPedestrians(dt: number, px: number, pz: number): void {
    for (const ped of pedestrians) {
      if (ped.road < 0) assignRoad(ped, px, pz);
      const p = walkableRoads[ped.road].p;
      const count = p.length / 2;
      const i = ped.point;
      const nextI = i + ped.dir * 2;

      if (nextI < 0 || nextI >= count * 2) {
        if (Math.random() < 0.5) {
          assignRoad(ped, px, pz);
          continue;
        }
        ped.dir = ped.dir === 1 ? -1 : 1;
        continue;
      }

      const ax = p[i];
      const az = p[i + 1];
      const bx = p[nextI];
      const bz = p[nextI + 1];
      const seg = Math.hypot(bx - ax, bz - az);
      if (seg < 0.01) {
        ped.point = nextI;
        continue;
      }

      const t = Math.min(1, (ped.speed * dt) / seg);
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      ped.figure.place(x, z, Math.atan2(bx - ax, bz - az));
      ped.figure.update(dt, ped.speed);

      const far = (x - px) ** 2 + (z - pz) ** 2 > 520 * 520;
      ped.figure.setVisible(!far);
      if (far) assignRoad(ped, px, pz);

      if (t >= 1) ped.point = nextI;
      else {
        p[i] = x;
        p[i + 1] = z;
      }
    }
  }

  /* ── the overview planet ───────────────────────────────────────── */
  let planet: { group: THREE.Group; radius: number } | null = null;
  function buildPlanet(): void {
    if (planet) return;
    const clipped = clipToCore(world, PLANET_CLIP);
    const planetSurfaces = buildCity(clipped, {
      project: spherical(PLANET_RADIUS, PLANET_HEIGHT_GAIN),
      planetRadius: PLANET_RADIUS,
    });
    const group = new THREE.Group();
    for (const object of cityObjects(planetSurfaces)) {
      object.castShadow = false;
      object.receiveShadow = false;
      group.add(object);
    }
    planet = { group, radius: PLANET_RADIUS };
    planetScene.add(group);
  }

  planetScene.add(new THREE.AmbientLight(0xffffff, 0.66));
  const planetSun = new THREE.DirectionalLight(0xfff1d8, 1.4);
  planetSun.position.set(-620, 520, 560);
  planetScene.add(planetSun);
  planetCamera.position.set(0, PLANET_RADIUS * 1.15, PLANET_RADIUS * 1.3);
  planetCamera.lookAt(0, PLANET_RADIUS * 0.72, 0);

  /* ── interface ─────────────────────────────────────────────────── */
  /** Open whatever the HUD is currently offering. */
  function readNearest(): void {
    const near = nearestLandmark(allLandmarks, view.state.targetX, view.state.targetZ);
    if (near && near.distance < 90) openCard(near.landmark, notebook.has(near.landmark.place.id));
  }

  const hud = new Hud(hudEl, {
    onRead: () => readNearest(),
    onNotebook: () => toggleNotebook(),
    onLandmarks: () => toggleIndex(),
    onTime: () => cycleLight(),
  });

  let overview = false;

  const card = new LandmarkCard(cardEl, {
    onClose: () => {
      card.close();
      view.setEnabled(true);
    },
    onWalkHere: (l) => {
      card.close();
      view.setEnabled(true);
      view.focus(l.x, l.z, 420, 1.0);
      toast(toastEl, `Looking at ${l.place.short}`, l.stamp);
    },
  });

  const notebookPanel = new NotebookPanel(notebookEl, {
    onOpenLandmark: (l) => openCard(l, true),
    onWalkTo: (l) => {
      notebookPanel.close();
      view.setEnabled(true);
      view.focus(l.x, l.z, 420, 1.0);
    },
    onClose: () => {
      notebookPanel.close();
      view.setEnabled(true);
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
      view.setEnabled(true);
      view.focus(l.x, l.z, 400, 1.0);
    },
    onClose: () => {
      indexPanel.close();
      view.setEnabled(true);
    },
  });

  function openCard(landmark: Landmark, alreadyRead: boolean): void {
    const first = notebook.add(landmark.place.id);
    view.setEnabled(false);
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
    view.setEnabled(!opening);
    if (opening) notebookPanel.render(notebook, allLandmarks, DISTRICT_NAMES);
  }

  function toggleIndex(): void {
    const opening = !indexPanel.isOpen;
    indexPanel.close();
    notebookPanel.close();
    card.close();
    view.setEnabled(!opening);
    if (opening) indexPanel.render(allLandmarks, new Set(notebook.ids));
  }

  function toggleOverview(): void {
    if (overview && !planet) return;
    overview = !overview;
    if (overview) buildPlanet();
    view.setEnabled(!overview);
    toast(toastEl, overview ? "The whole city, in one look" : "Back to the streets");
  }

  /* ── light ─────────────────────────────────────────────────────── */
  let manualMinutes: number | null = null;
  const presets: (number | null)[] = [null, 7 * 60, 12 * 60, 18 * 60 + 15, 21 * 60];
  let presetIndex = 0;

  const currentDate = (): Date => (manualMinutes === null ? new Date() : dateAtSiteMinutes(manualMinutes, new Date()));

  function refreshLight(): void {
    applyLight(light, currentDate(), { x: view.state.targetX, z: view.state.targetZ });
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

  let lightTick = 0;
  let lightDirty = true;

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
      view.setEnabled(true);
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    planetCamera.aspect = camera.aspect;
    planetCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── the loop ──────────────────────────────────────────────────── */
  let last = performance.now();
  let entered = false;
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

    if (entered && !overview) {
      view.update(dt);
      stepPedestrians(dt, view.state.targetX, view.state.targetZ);
    }
    if (overview && planet) planet.group.rotation.y += dt * 0.06;

    // Light follows the hour, and the sun follows wherever the camera is
    // looking so the shadow map stays on the part of the city in frame.
    lightTick += dt;
    if (lightDirty || (lightTick > 30 && manualMinutes === null)) {
      lightTick = 0;
      lightDirty = false;
      refreshLight();
    }

    // Landmark labels: projected from the scene, then de-collided.
    //
    // The reference labels its plan, and so does this — a dot with no name is
    // not a landmark. Labels are placed in ascending screen-y so the ones at the
    // back claim their space first, and any that cannot find a home is dropped
    // rather than drawn on top of its neighbour.
    const zoom = view.state.distance;
    const showLabels = !overview && entered && zoom < 2600;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const candidates: { pin: (typeof pins)[number]; x: number; y: number }[] = [];

    for (const pin of pins) {
      if (!showLabels) continue;
      screen.set(pin.landmark.x, 44, pin.landmark.z).project(camera);
      if (screen.z >= 1 || Math.abs(screen.x) > 1.1 || Math.abs(screen.y) > 1.1) continue;
      const x = (screen.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-screen.y * 0.5 + 0.5) * window.innerHeight;
      candidates.push({ pin, x, y });
    }

    candidates.sort((a, b) => a.y - b.y);

    for (const candidate of candidates) {
      const width = candidate.pin.label.offsetWidth || 96;
      const height = candidate.pin.label.offsetHeight || 26;
      let y = candidate.y;
      let fits = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        const box = { x: candidate.x - width / 2, y: y - height, w: width, h: height };
        const clash = placed.some(
          (p) =>
            Math.abs(p.x + p.w / 2 - candidate.x) < (p.w + width) / 2 + 6 &&
            box.y < p.y + p.h + 4 &&
            box.y + box.h > p.y - 4,
        );
        if (!clash) {
          placed.push(box);
          fits = true;
          break;
        }
        y += height + 3;
      }
      if (!fits) {
        candidate.pin.label.classList.remove("is-on");
        continue;
      }
      candidate.pin.label.style.transform = `translate(-50%, -100%) translate(${Math.round(candidate.x)}px, ${Math.round(y)}px)`;
      candidate.pin.label.classList.add("is-on");
    }

    const near = nearestLandmark(allLandmarks, view.state.targetX, view.state.targetZ);
    if (near) {
      hud.setWhere(`${near.landmark.place.short} · ${Math.round(near.distance)} m`);
      hud.setNear(near.distance < 90 ? near.landmark : null, near.distance);
    }

    if (planet && overview) {
      renderer.render(planetScene, planetCamera);
    } else {
      renderer.render(scene, camera);
    }
  };

  refreshLight();
  poster.setReady();
  raf(tick);

  if (import.meta.env?.DEV || window.location.search.includes("debug")) {
    Object.assign(window, {
      __stap: {
        scene, camera, renderer, world, landmarks: allLandmarks, pins, surfaces, light, view, pedestrians,
        get planet() {
          return planet;
        },
      },
    });
  }
}

/** The middle of the landmarks: where the city is worth looking from. */
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

/** How far the landmarks spread from their centre, in metres. */
function landmarkSpread(landmarks: Landmark[], centre: { x: number; z: number }): number {
  let far = 0;
  for (const l of landmarks) far = Math.max(far, Math.hypot(l.x - centre.x, l.z - centre.z));
  return far;
}

/**
 * The part of the baked world worth wrapping onto a planet.
 *
 * The bake is a rectangle and its corners are the sparsest, most distorted part
 * of any spherical wrap, so the planet carries only the dense core.
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
 * Reads with progress when the server advertises a length, otherwise in one go —
 * but either way the bytes reach `toMetres`. An earlier version returned straight
 * from the no-length branch and skipped the unit conversion, which silently put
 * the streets in decimetres while the landmarks were in metres.
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
  if (poster) poster.innerHTML = `<p style="padding:2rem;color:#14235c">Stap Kaap could not start. Reload to try again.</p>`;
});
