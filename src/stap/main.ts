/**
 * Stap Kaap — the walkable miniature Cape Town.
 *
 * A sibling to the atlas, not a copy of it. The atlas is a cinematic fly-through
 * you look *at*; this is a city you stand *in*. It shares the atlas's content,
 * its solar model and its palette, and adds a pedestrian's view over building
 * geometry baked from OpenStreetMap.
 */

import * as THREE from "three";
import "./styles/stap.css";

import { buildCity, cityObjects, spherical, type BakedWorld, type CitySurfaces } from "./city.ts";
import { Walker } from "./walker.ts";
import { applyLight, createLight, paintCity } from "./light.ts";
import { buildLandmarks, walkableLandmarks, nearestLandmark, streetNear, busiestStreet, ARRIVE_RADIUS, type Landmark } from "./landmarks.ts";
import { Notebook } from "./notebook.ts";
import { Landing, Hud, LandmarkCard, NotebookPanel, LandmarkIndex, toast } from "./ui.ts";
import { Figure, PALETTES } from "./figure.ts";
import { COPY } from "./copy.ts";
import { dateAtSiteMinutes, zonedNow } from "../core/sun.ts";
import { DISTRICTS } from "../data/index.ts";
import { el, must, prefersReducedMotion, raf } from "../util/dom.ts";

/** Served from public/stap/city.json; base is relative so it works in a subfolder. */
const CITY_URL = new URL("../stap/city.json", window.location.href).href;
/**
 * Radius of the little planet, in metres.
 *
 * Chosen from the data, not by eye: the baked city extends 3,628 m from its
 * origin, and wrapping a flat city onto a sphere is only distortion-free at the
 * centre. Every metre outward becomes arc, so a square footprint becomes a
 * wedge whose angle grows with distance — at a 900 m radius the city wrapped
 * 231°, far past the equator, and buildings smeared into radial streaks.
 * At this radius the whole city fits inside a 60° cap, where the distortion is
 * gentle enough that streets still look like streets.
 *
 * The trade is that this is a city on a small world rather than a world made of
 * the city: a bespoke globe like the one this is modelled on has its geometry
 * authored on the sphere, which no projection of an existing planar city can
 * match.
 */
const PLANET_RADIUS = 3465;

/**
 * Gain on the planet's height curve, applied to `h^0.62`: a 4 m shed lifts to
 * about 33 m and the tallest tower in the core to about 340 m. Both readable
 * against a 3,465 m radius, neither spiking out of the atmosphere.
 */
const PLANET_HEIGHT_SCALE = 14;

/**
 * How far from the city's centre the planet carries.
 *
 * The baked area is a rectangle, and its corners are the sparsest, most
 * distorted part of any spherical wrap. Keeping the planet to the dense core
 * both removes those streaks and puts the interesting streets in the middle of
 * the view, where the eye lands.
 */
const PLANET_CLIP = 2100;

const DISTRICT_NAMES: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.name]));

async function boot(): Promise<void> {
  const stage = must("#stage");
  const landingEl = must("#landing");
  const hudEl = must("#hud");
  const cardEl = must("#card");
  const notebookEl = must("#notebook");
  const indexEl = must("#index");
  const toastEl = must("#toasts");

  /* ── the renderer ──────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 4000);

  // The globe is a second scene rather than a distant object in the first: the
  // city is a kilometre across, Earth is twelve thousand, and putting them in
  // one scene means fighting depth precision and fog for no gain.
  const globeScene = new THREE.Scene();
  const globeCamera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 1, 4000);

  /* ── the city ──────────────────────────────────────────────────── */
  const notebook = new Notebook();
  const landing = new Landing(landingEl, { onEnter: () => enterCity() });
  landing.render();
  landing.setProgress(0.05);

  const world = await loadCity(landing);
  // The overview is the city itself wrapped onto a sphere — the same streets,
  // buildings and trees you can walk, seen as a little planet. It is built on
  // demand: doubling a million triangles of geometry is not worth doing for a
  // view most visitors will look at once.
  let planet: { group: THREE.Group; surfaces: CitySurfaces; radius: number } | null = null;
  function buildPlanet(): void {
    if (planet) return;
    const radius = PLANET_RADIUS;
    const surfaces = buildCity(clipToCore(world, PLANET_CLIP), {
      project: spherical(radius, PLANET_HEIGHT_SCALE),
      planetRadius: radius,
    });
    const group = new THREE.Group();
    for (const object of cityObjects(surfaces)) {
      object.castShadow = false;
      object.receiveShadow = false;
      group.add(object);
    }
    planet = { group, surfaces, radius };
    globeScene.add(group);
  }
  const surfaces = buildCity(world);
  for (const object of cityObjects(surfaces)) scene.add(object);

  const light = createLight();
  scene.add(light.sun, light.sun.target, light.sky, light.ambient);

  /* ── landmarks ─────────────────────────────────────────────────── */
  // The walkable world is the baked core. Places beyond it belong to the atlas,
  // and are not pretended to be reachable on foot.
  const allLandmarks = walkableLandmarks(buildLandmarks(world), world);
  console.debug(
    `[stap] ${world.meta.counts.buildings} buildings · ${allLandmarks.length} walkable landmarks`,
  );
  // Start where the city is densest, on a street: a walk that opens onto empty
  // ground reads as a broken world, however correct the geometry is.
  const startOnStreet = busiestStreet(world);
  console.debug(`[stap] spawning at ${Math.round(startOnStreet.x)}, ${Math.round(startOnStreet.z)} — ${startOnStreet.neighbours} buildings within 45 m`);
  const walker = new Walker(camera, world, { x: startOnStreet.x, z: startOnStreet.z, yaw: 2.3 });
  walker.faceOpenDirection();

  // The walker's own figure. Third person by default, because seeing the person
  // is what makes the city's scale and the pace legible.
  const player = new Figure(PALETTES[0]);
  player.setShadow(true);
  scene.add(player.root);
  walker.setThirdPerson(true);
  walker.setEnabled(false);
  const detach = walker.attach(renderer.domElement);

  /* ── markers: a beacon over each landmark's door ───────────────── */
  const markerGroup = new THREE.Group();
  scene.add(markerGroup);
  const markers = new Map<string, THREE.Mesh>();
  const markerGeo = new THREE.ConeGeometry(2.4, 7, 4);
  markerGeo.rotateX(Math.PI);
  for (const l of allLandmarks) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(l.accent), transparent: true, opacity: 0.92 });
    const cone = new THREE.Mesh(markerGeo, mat);
    // Float it above the local roofline so it is visible from down the street.
    cone.position.set(l.x, markerHeightAt(world, l) + 14, l.z);
    cone.userData.landmark = l;
    markerGroup.add(cone);
    markers.set(l.place.id, cone);
  }

  /* ── pedestrians ────────────────────────────────────────────────── */

  // A handful of figures walking the streets, recycled near the player. They
  // exist to give the city life and a sense of scale: a person on a pavement is
  // the clearest reference for how big the buildings are.
  const PEDESTRIANS = 14;
  interface Pedestrian {
    figure: Figure;
    /** Index into the road currently being walked, and progress along it. */
    road: number;
    point: number;
    dir: 1 | -1;
    speed: number;
  }

  const walkable = world.roads.filter((r) => r.p.length >= 4);
  const pedestrians: Pedestrian[] = [];

  for (let i = 0; i < PEDESTRIANS; i++) {
    const figure = new Figure(PALETTES[(i + 1) % PALETTES.length]);
    figure.setShadow(i < 5);
    figure.setVisible(false);
    scene.add(figure.root);
    pedestrians.push({ figure, road: -1, point: 0, dir: 1, speed: 1.1 + Math.random() * 0.6 });
  }

  /**
   * Send a pedestrian to a road within sight of the player.
   *
   * Sampling the road list at random does not work: with thousands of roads, a
   * handful of samples lands anywhere in the city, and every pedestrian ends up
   * hundreds of metres away, hidden and useless. Rejection sampling against a
   * radius — with the best attempt as a fallback — puts them on the streets
   * around you, which is where they are worth anything.
   */
  function assignRoad(ped: Pedestrian, nearX: number, nearZ: number): void {
    const WANT = 150; // metres: close enough to see
    let best = -1;
    let bestD = Infinity;

    for (let attempt = 0; attempt < 120; attempt++) {
      const index = Math.floor(Math.random() * walkable.length);
      const p = walkable[index].p;
      const at = Math.floor(Math.random() * (p.length / 2)) * 2;
      const d = Math.hypot(p[at] - nearX, p[at + 1] - nearZ);
      if (d < WANT) {
        // Close enough; take it and stop.
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
    const p = walkable[best].p;
    // Start anywhere along it when it is near, so they do not all line up.
    const points = p.length / 2;
    ped.point = bestD < WANT ? Math.floor(Math.random() * points) * 2 : 0;
    ped.dir = Math.random() < 0.5 ? 1 : -1;
  }

  function stepPedestrians(dt: number, px: number, pz: number): void {
    for (const ped of pedestrians) {
      if (ped.road < 0) assignRoad(ped, px, pz);
      const p = walkable[ped.road].p;
      const count = p.length / 2;

      const i = ped.point;
      const nextI = i + ped.dir * 2;
      if (nextI < 0 || nextI >= count * 2) {
        // Turn around at the end of the road, and sometimes strike out for
        // another street rather than ping-ponging.
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
      const yaw = Math.atan2(bx - ax, bz - az);

      ped.figure.place(x, z, yaw);
      ped.figure.update(dt, ped.speed);

      const far = (x - px) ** 2 + (z - pz) ** 2 > 420 * 420;
      ped.figure.setVisible(!far && view === "walk");
      if (far) assignRoad(ped, px, pz);

      // Advance along the segment; when it is covered, step to the next point.
      if (t >= 1) ped.point = nextI;
      else {
        // Rewind to the point so the interpolated position continues smoothly.
        p[i] = x;
        p[i + 1] = z;
      }
    }
  }

  /* ── interface ─────────────────────────────────────────────────── */
  const hud = new Hud(hudEl, {
    onRead: () => readCurrent(),
    onNotebook: () => toggleNotebook(),
    onLandmarks: () => toggleIndex(),
    onTime: () => cycleLight(),
  });

  const card = new LandmarkCard(cardEl, {
    onClose: () => {
      card.close();
      walker.setEnabled(true);
      hud.setVisible(true);
    },
    onWalkHere: (l) => {
      card.close();
      const spot = streetNear(world, l.x, l.z);
      walker.place(spot.x, spot.z, Math.atan2(l.x - spot.x, l.z - spot.z));
      walker.faceOpenDirection();
      walker.setEnabled(true);
      hud.setVisible(true);
      toast(toastEl, `Standing near ${l.place.name}`, l.stamp);
    },
  });

  const notebookPanel = new NotebookPanel(notebookEl, {
    onOpenLandmark: (l) => openCard(l, true),
    onWalkTo: (l) => {
      notebookPanel.close();
      const spot = streetNear(world, l.x, l.z);
      walker.place(spot.x, spot.z, Math.atan2(l.x - spot.x, l.z - spot.z));
      walker.faceOpenDirection();
      walker.setEnabled(true);
      hud.setVisible(true);
    },
    onClose: () => {
      notebookPanel.close();
      walker.setEnabled(true);
      hud.setVisible(true);
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
      const spot = streetNear(world, l.x, l.z);
      walker.place(spot.x, spot.z, Math.atan2(l.x - spot.x, l.z - spot.z));
      walker.setEnabled(true);
      hud.setVisible(true);
      toast(toastEl, `Standing near ${l.place.name}`, l.stamp);
    },
    onClose: () => {
      indexPanel.close();
      walker.setEnabled(true);
      hud.setVisible(true);
    },
  });

  /* ── light, on the real clock ──────────────────────────────────── */
  let manualMinutes: number | null = null;
  const lightPresets: (number | null)[] = [null, 7 * 60, 12 * 60, 18 * 60 + 15, 21 * 60];
  let presetIndex = 0;

  const currentDate = (): Date =>
    manualMinutes === null ? new Date() : dateAtSiteMinutes(manualMinutes, new Date());

  const refreshLight = (): void => {
    applyLight(light, currentDate(), { x: walker.state.x, z: walker.state.z });
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
    });
  };

  function cycleLight(): void {
    presetIndex = (presetIndex + 1) % lightPresets.length;
    manualMinutes = lightPresets[presetIndex];
    refreshLight();
    const wall = zonedNow(currentDate());
    const label = `${String(Math.floor(wall.minutes / 60)).padStart(2, "0")}:${String(wall.minutes % 60).padStart(2, "0")}`;
    toast(toastEl, manualMinutes === null ? "Following the real sky" : `Light set to ${label}`);
  }

  /* ── interaction ───────────────────────────────────────────────── */
  let nearby: { landmark: Landmark; distance: number } | null = null;
  let entered = false;

  function readCurrent(): void {
    if (nearby) openCard(nearby.landmark, false);
  }

  function openCard(landmark: Landmark, alreadyRead: boolean): void {
    const first = notebook.add(landmark.place.id);
    walker.setEnabled(false);
    hud.setVisible(false);
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
    walker.setEnabled(!opening);
    hud.setVisible(!opening);
    if (opening) notebookPanel.render(notebook, allLandmarks, DISTRICT_NAMES);
  }

  function toggleIndex(): void {
    const opening = !indexPanel.isOpen;
    indexPanel.close();
    notebookPanel.close();
    card.close();
    walker.setEnabled(!opening);
    hud.setVisible(!opening);
    if (opening) indexPanel.render(allLandmarks, new Set(notebook.ids));
  }

  function closeAll(): void {
    card.close();
    notebookPanel.close();
    indexPanel.close();
    walker.setEnabled(true);
    hud.setVisible(true);
  }

  window.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    const key = e.key.toLowerCase();
    if (key === "e" && nearby) readCurrent();
    else if (key === "m") toggleIndex();
    else if (key === "h") toggleNotebook();
    else if (key === "g") toggleGlobe();
    else if (e.key === "Escape") closeAll();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── camera: an establishing orbit, then a descent to eye level ── */

  // While the landing is up the city is shown from above, turning slowly, so
  // there is something to look at before you commit to walking. Entering drops
  // the camera to the walker's eye over a second, which reads as arriving.
  const heroCenter = landmarkCentroid(allLandmarks);   // walkable only
  // Close enough that the buildings have mass: from 190 m up, a city whose
  // median building is 8 m tall reduces to a flat texture.
  const hero = { angle: 0.9, radius: 165, height: 62, active: true };
  const descent = { active: false, from: new THREE.Vector3(), at: 0, duration: 1.4 };

  function heroPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      heroCenter.x + Math.cos(hero.angle) * hero.radius,
      hero.height,
      heroCenter.z + Math.sin(hero.angle) * hero.radius,
    );
  }

  function beginDescent(): void {
    descent.active = true;
    descent.at = 0;
    descent.from.copy(camera.position);
  }

  /* ── the globe, and moving between the two views ────────────────── */

  // A sky, not a void: the reference sets its planet against flat colour, and
  // against black the model reads as an unfinished render.
  globeScene.background = new THREE.Color("#122c58");
  globeScene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const planetSun = new THREE.DirectionalLight(0xfff1d8, 1.5);
  planetSun.position.set(-520, 420, 480);
  globeScene.add(planetSun);
  // Framed on the cap with the limb in shot, so it reads as a world rather than
  // a curved plate.
  globeCamera.position.set(0, PLANET_RADIUS * 1.16, PLANET_RADIUS * 1.32);
  globeCamera.lookAt(0, PLANET_RADIUS * 0.72, 0);

  /** 'walk' → 'globe' → 'walk'. The camera pulls back, then the view swaps. */
  type View = "walk" | "globe";
  let view: View = "walk";
  // 0 = city, 1 = globe; drives the crossfade and the pull-back.
  let mix = 0;
  let mixTarget = 0;
  let globeSpinPaused = false;
  let planetSpin = 0;
  let pull = { active: false, at: 0, duration: 1.5, from: new THREE.Vector3(), to: new THREE.Vector3() };

  function toggleGlobe(): void {
    if (view === "walk" && !entered) return;
    buildPlanet();
    view = view === "walk" ? "globe" : "walk";
    mixTarget = view === "globe" ? 1 : 0;
    walker.setEnabled(view === "walk");
    hud.setVisible(view === "walk");
    if (view === "globe") {
      closeAllPanels();
      pull = {
        active: true,
        at: 0,
        duration: 1.6,
        from: camera.position.clone(),
        to: camera.position.clone().add(new THREE.Vector3(0, 420, 520)),
      };
      toast(toastEl, COPY.globeHint);
    } else {
      pull.active = false;
      // Coming back from the overview is an arrival: face the most open
      // direction, so the first press of forward does something.
      walker.faceOpenDirection();
      toast(toastEl, "Back on the street");
    }
  }

  /** Close every panel without re-enabling the walker. */
  function closeAllPanels(): void {
    card.close();
    notebookPanel.close();
    indexPanel.close();
  }

  /* ── the loop ──────────────────────────────────────────────────── */
  let last = performance.now();
  let lightTick = 0;

  const tick = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    walker.update(dt);
    // The player's figure follows the walker exactly; the walker owns position
    // and heading, the figure owns the animation.
    player.place(walker.state.x, walker.state.z, walker.state.yaw);
    player.update(dt, walker.isMoving ? walker.state.speed : 0);
    if (view === "walk" && entered) stepPedestrians(dt, walker.state.x, walker.state.z);

    if (hero.active) {
      // Establishing orbit, slow enough to read as drift rather than motion.
      hero.angle += dt * 0.045;
      const p = heroPosition();
      camera.position.copy(p);
      camera.lookAt(heroCenter.x, 9, heroCenter.z);

      if (descent.active) {
        descent.at += dt;
        const t = Math.min(1, descent.at / descent.duration);
        const eased = t * t * (3 - 2 * t);
        // Hand over to the walker's eye, position and orientation together.
        const eye = new THREE.Vector3(
          walker.state.x,
          1.68,
          walker.state.z,
        );
        camera.position.lerpVectors(descent.from, eye, eased);
        const look = new THREE.Vector3(
          walker.state.x + Math.sin(walker.state.yaw) * 40,
          1.68 + Math.sin(walker.state.pitch) * 40,
          walker.state.z + Math.cos(walker.state.yaw) * 40,
        );
        const target = new THREE.Vector3(heroCenter.x, 12, heroCenter.z);
        look.lerpVectors(target, look, eased);
        camera.lookAt(look);
        if (t >= 1) {
          hero.active = false;
          descent.active = false;
          walker.setEnabled(true);
        }
      }
    }

    light.sun.target.position.set(walker.state.x, 0, walker.state.z);
    void lightTick;

    // Nearest landmark, and the arrival prompt.
    const found = nearestLandmark(allLandmarks, walker.state.x, walker.state.z);
    const within = found && found.distance <= ARRIVE_RADIUS * 3 ? found : null;
    if (!nearby || nearby.landmark.place.id !== within?.landmark.place.id || Math.abs((nearby?.distance ?? 0) - (within?.distance ?? 0)) > 0.5) {
      nearby = within;
      hud.setNear(within?.landmark ?? null, within?.distance ?? 0);
    }

    hud.setHeading((walker.state.yaw * 180) / Math.PI);
    if (found) {
      hud.setWhere(
        found.distance <= ARRIVE_RADIUS * 3
          ? `Near ${found.landmark.place.short}`
          : `Nearest: ${found.landmark.place.short} · ${Math.round(found.distance)} m`,
      );
    }
    if (walker.isMoving) hud.setHintVisible(false);

    // Markers fade with distance so they guide without crowding.
    for (const [, cone] of markers) {
      const l = cone.userData.landmark as Landmark;
      const d = Math.hypot(l.x - walker.state.x, l.z - walker.state.z);
      const mat = cone.material as THREE.MeshBasicMaterial;
      mat.opacity = d > 340 ? 0 : d > 200 ? 0.35 : 0.92;
      cone.rotation.y = now * 0.0006;
    }

    // Keep the city lit by the real clock, without recomputing every frame.
    lightTick += dt;
    if (lightTick > 20) {
      lightTick = 0;
      if (manualMinutes === null) refreshLight();
    }

    // Pull-back: the city camera retreats while the globe fades in over it, so
    // the transition reads as drawing away from the planet rather than a cut.
    if (pull.active) {
      pull.at += dt;
      const t = Math.min(1, pull.at / pull.duration);
      const eased = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(pull.from, pull.to, eased);
      camera.lookAt(walker.state.x, 6, walker.state.z);
      if (t >= 1) pull.active = false;
    }

    mix += (mixTarget - mix) * Math.min(1, dt * 3.4);

    if (planet && mix > 0.002) {
      if (!globeSpinPaused) {
        planet.group.rotation.y += dt * 0.075;
        planetSpin += dt * 0.075;
      }
      renderer.autoClear = mix < 0.998;
      renderer.render(scene, camera);
      renderer.autoClear = true;
      renderer.clearDepth();
      renderer.render(globeScene, globeCamera);
    } else {
      renderer.render(scene, camera);
    }
  };

  function enterCity(): void {
    if (entered) return;
    entered = true;
    landing.hide();
    hud.setVisible(true);
    walker.setEnabled(false);
    if (prefersReducedMotion()) {
      hero.active = false;
      walker.setEnabled(true);
    } else {
      beginDescent();
    }
  }

  refreshLight();
  landing.setReady();
  startLoop();

  if (import.meta.env?.DEV || window.location.search.includes("debug")) {
    Object.assign(window, {
      __stap: {
        scene, camera, renderer, world, landmarks: allLandmarks, walker, markers, hero, surfaces, light,
        player, pedestrians,
        globeScene, globeCamera, get planet() { return planet; },
      },
    });
  }

  function startLoop(): void {
    raf((now) => tick(now));
  }

  void detach;
  void COPY;
  void el;
}

/** The middle of everywhere there is to walk, used as the orbit's focus. */
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

/**
 * The part of the baked world worth showing on a sphere.
 *
 * Anything whose footprint lies outside `radius` of the origin is dropped —
 * along with any street, park or water entirely beyond it — so the planet shows
 * the city, not the rectangle the city was extracted with.
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

/** Height of the tallest building near a landmark, so the marker clears it. */
function markerHeightAt(world: BakedWorld, landmark: Landmark): number {
  let best = 0;
  for (const b of world.buildings) {
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < b.f.length; i += 2) {
      cx += b.f[i];
      cz += b.f[i + 1];
    }
    const n = b.f.length / 2;
    if (Math.hypot(cx / n - landmark.x, cz / n - landmark.z) < 30 && b.h > best) best = b.h;
  }
  return best;
}

/** Load the baked city, reporting progress to the landing screen. */
async function loadCity(landing: Landing): Promise<BakedWorld> {
  const res = await fetch(CITY_URL);
  if (!res.ok) throw new Error(`city.json: HTTP ${res.status}`);

  // Read with progress when the server advertises a length; otherwise in one
  // go. Either way the bytes end up in the same place — an earlier version
  // returned straight from the no-length branch and skipped the unit conversion
  // below, which put the streets in decimetres while the landmarks were in
  // metres: a silent ten-to-one disagreement that made every position wrong.
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
      landing.setProgress(seen / total);
    }
    const buffer = new Uint8Array(seen);
    let at = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, at);
      at += chunk.length;
    }
    text = new TextDecoder().decode(buffer);
  } else {
    landing.setProgress(0.5);
    text = await res.text();
  }

  return toMetres(JSON.parse(text) as BakedWorld);
}

/**
 * Convert the bake's integer decimetres to metres, once, at the boundary.
 *
 * Everything downstream — eye height, walking speed, collision radii, the
 * spherical projection — is in metres. Converting here means no scale factor has
 * to be carried through the scene, and no two parts of it can disagree.
 */
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
  const loading = document.getElementById("landing");
  if (loading) {
    loading.innerHTML = `<p style="padding:2rem;color:#fff">Stap Kaap could not start. Reload to try again.</p>`;
  }
});
