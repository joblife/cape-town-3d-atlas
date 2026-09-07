import { CITY, LANDMARKS } from "./landmarks.js";

const listEl = document.getElementById("landmarkList");
const labelsEl = document.getElementById("mapLabels");
const placeName = document.getElementById("placeName");
const placeDesc = document.getElementById("placeDesc");
const placeCount = document.getElementById("placeCount");
const placeTag = document.getElementById("placeTag");
const loading = document.getElementById("loadingStatus");
const loadingText = document.getElementById("loadingText");

let current = 0;
let touring = false;
let tourTimer = null;
let heightScale = 1;
let map;

const labelBtns = [];

// Build sidebar + floating labels
LANDMARKS.forEach((lm, i) => {
  const n = String(i + 1).padStart(2, "0");
  const b = document.createElement("button");
  b.innerHTML = `<span class="landmark-number">${n}</span><span>${lm.name}</span><span class="arrow">↗</span>`;
  if (i === 0) b.classList.add("active");
  b.addEventListener("click", () => { stopTour(); goTo(i); });
  listEl.appendChild(b);

  const lbl = document.createElement("button");
  lbl.className = "map-label" + (i === 0 ? " active" : "");
  lbl.innerHTML = `<span class="pin-dot"></span>${lm.name}`;
  lbl.addEventListener("click", () => { stopTour(); goTo(i); });
  labelsEl.appendChild(lbl);
  labelBtns.push(lbl);
});

function setPanel(i) {
  current = i;
  const lm = LANDMARKS[i];
  placeName.textContent = lm.name;
  placeDesc.textContent = lm.description;
  placeCount.textContent = `${String(i + 1).padStart(2, "0")} / ${LANDMARKS.length}`;
  placeTag.textContent = lm.tag;
  [...listEl.children].forEach((el, j) => el.classList.toggle("active", j === i));
  labelBtns.forEach((el, j) => el.classList.toggle("active", j === i));
}

function goTo(i, instant = false) {
  setPanel(i);
  const lm = LANDMARKS[i];
  map.flyTo({
    center: [lm.lon, lm.lat],
    zoom: lm.zoom,
    pitch: lm.pitch,
    bearing: lm.bearing ?? -18,
    duration: instant ? 0 : 3800,
    curve: 1.4,
    essential: true,
  });
}

function startTour() {
  touring = true;
  document.getElementById("tourBtn").classList.add("playing");
  document.getElementById("tourLabel").textContent = "Pause the tour";
  goTo(current);
  tourTimer = setInterval(() => {
    goTo((current + 1) % LANDMARKS.length);
  }, 5200);
}
function stopTour() {
  if (!touring) return;
  touring = false;
  clearInterval(tourTimer);
  document.getElementById("tourBtn").classList.remove("playing");
  document.getElementById("tourLabel").textContent = "Take the city tour";
}

document.getElementById("tourBtn").addEventListener("click", () => (touring ? stopTour() : startTour()));
document.getElementById("nextBtn").addEventListener("click", () => { stopTour(); goTo((current + 1) % LANDMARKS.length); });
document.getElementById("mobileToggle").addEventListener("click", (e) => {
  const body = document.getElementById("explorerBody");
  const collapsed = body.classList.toggle("collapsed");
  body.closest(".explorer").classList.toggle("expanded", !collapsed);
  e.currentTarget.setAttribute("aria-expanded", String(!collapsed));
});
// On small screens the explorer starts collapsed so the map stays visible.
if (window.matchMedia("(max-width: 900px)").matches) {
  document.getElementById("explorerBody").classList.add("collapsed");
  document.getElementById("mobileToggle").setAttribute("aria-expanded", "false");
}

// Lighting presets — adapted from the Seoul 3D Atlas recipe:
// pale diorama ground, sage vegetation, teal water, warm-white roads,
// white buildings tinted blue-grey with height.
const PRESETS = {
  day: {
    sky: "#d8e7f2", horizon: "#eef2e6", fog: "#e6ede7",
    sun: "#fff2d6", lightIntensity: 1.1, bg: "#a8bfc8",
    base: "#b3b9a1",
    wood: "#4f6b4f", park: "#6e8c5f", fynbos: "#8e9578", farm: "#8b9a79",
    sand: "#eee5d0", rock: "#b6beb4", water: "#3d94b0", fresh: "#2f7e9c",
    road: "#f1ede0", casing: "#cfc8ac",
    bLow: "#f4f2ea", bMid: "#dfe4d6", bHigh: "#b9cdc9",
  },
  sunset: {
    sky: "#edc0b7", horizon: "#f5d9b8", fog: "#ebd7c6",
    sun: "#ffb579", lightIntensity: 0.85, bg: "#4a3a52",
    base: "#c2b493",
    wood: "#4d5c3e", park: "#6d7448", fynbos: "#8d8a6a", farm: "#7f7a5e",
    sand: "#ebcda4", rock: "#a89a86", water: "#739ba9", fresh: "#5f8b9b",
    road: "#f5e3c2", casing: "#d3b98f",
    bLow: "#e8d3ae", bMid: "#d3bda0", bHigh: "#a8bfc0",
  },
  night: {
    sky: "#1c2f45", horizon: "#23353c", fog: "#132633",
    sun: "#8dacd2", lightIntensity: 0.5, bg: "#05070d",
    base: "#23353c",
    wood: "#16281f", park: "#1b3029", fynbos: "#22352b", farm: "#1f2f28",
    sand: "#4c4a3a", rock: "#2e3c42", water: "#205d72", fresh: "#2a7d97",
    road: "#5f6f75", casing: "#3a4a52",
    bLow: "#3d4c5e", bMid: "#33414f", bHigh: "#2a7d97",
  },
};

// Landscape layers added on top of the dark basemap so mountains, parks,
// fynbos slopes and beaches read as a miniature instead of near-black.
const LANDSCAPE_LAYERS = [
  { id: "lc-wood", sourceLayer: "landcover", classes: ["wood", "forest"], key: "wood" },
  { id: "lc-fynbos", sourceLayer: "landcover", classes: ["grass", "scrub"], key: "fynbos" },
  { id: "lc-farm", sourceLayer: "landcover", classes: ["farmland"], key: "farm" },
  { id: "lc-sand", sourceLayer: "landcover", classes: ["sand"], key: "sand" },
  { id: "lc-rock", sourceLayer: "landcover", classes: ["rock"], key: "rock" },
  {
    id: "lu-green", sourceLayer: "landuse", key: "park",
    classes: ["park", "grass", "scrub", "forest", "farmland", "meadow", "garden",
      "golf", "nature_reserve", "pitch", "playground", "cemetery", "stadium"],
  },
  { id: "lu-sand", sourceLayer: "landuse", classes: ["sand", "beach"], key: "sand" },
  { id: "lu-rock", sourceLayer: "landuse", classes: ["rock", "quarry"], key: "rock" },
  { id: "water-fresh", sourceLayer: "water", classes: ["lake", "river", "pond", "dock", "reservoir"], key: "fresh" },
];

function addLandscapeLayers(vtSource) {
  // Drop the stock near-black park/wood fills (wood also references a
  // sprite that doesn't exist, which spams console warnings).
  for (const id of ["landuse_park", "landcover_wood"]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const L of LANDSCAPE_LAYERS) {
    if (map.getLayer(L.id)) continue;
    map.addLayer({
      id: L.id,
      source: vtSource,
      "source-layer": L.sourceLayer,
      type: "fill",
      paint: { "fill-color": "#b3b9a1", "fill-antialias": true },
      filter: ["all",
        ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false],
        ["in", ["get", "class"], ["literal", L.classes]]],
    }, "building");
  }
}

// Seoul-style road wash: warm pale inners, slightly deeper casings.
const ROAD_INNERS = [
  "highway_path", "highway_minor", "highway_major_inner",
  "highway_major_subtle", "highway_motorway_inner", "highway_motorway_subtle",
  "road_pier", "aeroway-taxiway",
];
const ROAD_CASINGS = [
  "highway_major_casing", "highway_motorway_casing",
];
const RAIL_LINES = ["railway", "railway_transit", "railway_minor"];

function buildingTint(p) {
  const h = ["coalesce", ["get", "render_height"], ["*", ["coalesce", ["get", "render_levels"], 2], 3.2], 0];
  return ["case", [">=", h, 70], p.bHigh, [">=", h, 25], p.bMid, p.bLow];
}

function applyLandscape(name) {
  const p = PRESETS[name];
  if (!map) return;
  for (const L of LANDSCAPE_LAYERS) {
    if (!map.getLayer(L.id)) continue;
    map.setPaintProperty(L.id, "fill-color", p[L.key]);
  }
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", p.water);
  if (map.getLayer("waterway")) map.setPaintProperty("waterway", "line-color", p.water);
  for (const id of ROAD_INNERS) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-color", p.road);
  }
  for (const id of ROAD_CASINGS) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-color", p.casing);
  }
  for (const id of RAIL_LINES) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-color", p.casing);
  }
  try { map.setPaintProperty("background", "background-color", p.base); } catch {}
}

function applyPreset(name) {
  const p = PRESETS[name];
  for (const [id, fn] of [["btnDay", "day"], ["btnSunset", "sunset"], ["btnNight", "night"]]) {
    const el = document.getElementById(id);
    const on = fn === name;
    el.classList.toggle("active", on);
    el.setAttribute("aria-pressed", String(on));
  }
  try {
    map.setSky({ "sky-color": p.sky, "horizon-color": p.horizon, "fog-color": p.fog, "fog-ground-blend": 0.6, "horizon-fog-blend": 0.5, "sky-horizon-blend": 0.5 });
  } catch {}
  try {
    map.setPaintProperty("3d-buildings", "fill-extrusion-color", buildingTint(p));
  } catch {}
  applyLandscape(name);
  try {
    map.setLights([
      { id: "sun", type: "directional", properties: { color: p.sun, intensity: p.lightIntensity, position: name === "night" ? [0.5, 60, 60] : [-30, 55, 80] } },
      { id: "ambient", type: "ambient", properties: { color: name === "night" ? "#8dacd2" : "#ffffff", intensity: name === "night" ? 0.6 : 0.85 } },
    ]);
  } catch {}
}

document.getElementById("btnDay").addEventListener("click", () => applyPreset("day"));
document.getElementById("btnSunset").addEventListener("click", () => applyPreset("sunset"));
document.getElementById("btnNight").addEventListener("click", () => applyPreset("night"));

// Map tools
document.getElementById("zoomIn").addEventListener("click", () => map.zoomIn({ duration: 400 }));
document.getElementById("zoomOut").addEventListener("click", () => map.zoomOut({ duration: 400 }));
document.getElementById("resetView").addEventListener("click", () => {
  stopTour();
  map.flyTo({ center: CITY.center, zoom: CITY.zoom, pitch: CITY.pitch, bearing: CITY.bearing, duration: 2000 });
});
document.getElementById("compassBtn").addEventListener("click", () => {
  map.easeTo({ bearing: 0, pitch: 0, duration: 900 });
});
const layersBtn = document.getElementById("layersBtn");
const layersPanel = document.getElementById("layersPanel");
layersBtn.addEventListener("click", () => {
  const hidden = layersPanel.hidden;
  layersPanel.hidden = !hidden;
  layersBtn.setAttribute("aria-expanded", String(hidden));
});
document.getElementById("tglBuildings").addEventListener("change", (e) => {
  map.setLayoutProperty("3d-buildings", "visibility", e.target.checked ? "visible" : "none");
});
document.getElementById("tglLabels").addEventListener("change", (e) => {
  labelsEl.style.display = e.target.checked ? "block" : "none";
});
document.getElementById("tglTerrain").addEventListener("change", (e) => {
  map.setTerrain(e.target.checked ? { source: "terrain", exaggeration: 1.2 } : null);
});
document.getElementById("heightScale").addEventListener("input", (e) => {
  heightScale = Number(e.target.value);
  updateBuildingHeights();
});
function updateBuildingHeights() {
  try {
    map.setPaintProperty("3d-buildings", "fill-extrusion-height", [
      "*", heightScale,
      ["coalesce", ["get", "render_height"], ["*", ["coalesce", ["get", "render_levels"], 2], 3.2], 7],
    ]);
  } catch {}
}

// Credits modal
const modal = document.getElementById("creditsModal");
document.getElementById("creditsBtn").addEventListener("click", () => modal.showModal());
document.getElementById("aboutBtn").addEventListener("click", () => modal.showModal());
document.getElementById("closeCredits").addEventListener("click", () => modal.close());

// Label projection with simple vertical de-collision
function updateLabels() {
  if (!map) return;
  const w = map.getCanvas().clientWidth, h = map.getCanvas().clientHeight;
  const placed = [];
  LANDMARKS.forEach((lm, i) => {
    const el = labelBtns[i];
    try {
      const pt = map.project([lm.lon, lm.lat]);
      let behind = pt.x < -80 || pt.x > w + 80 || pt.y < -40 || pt.y > h + 40;
      // Simple de-collision: push overlapping labels down
      let y = pt.y;
      for (const q of placed) {
        if (Math.abs(pt.x - q.x) < 110 && Math.abs(y - q.y) < 22) y = q.y + 24;
      }
      if (!behind) placed.push({ x: pt.x, y });
      el.style.display = behind ? "none" : "";
      el.style.left = pt.x + "px";
      el.style.top = y + "px";
    } catch { el.style.display = "none"; }
  });
  const b = map.getBearing();
  document.querySelector(".compass-ring").style.transform = `rotate(${-b}deg)`;
  document.querySelector(".compass-ring").style.display = "inline-block";
}

// Init map
setPanel(0);
map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/dark",
  center: CITY.center,
  zoom: CITY.zoom,
  pitch: CITY.pitch,
  bearing: CITY.bearing,
  maxPitch: 72,
  antialias: true,
  attributionControl: false,
  canvasContextAttributes: { antialias: true },
});
map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
// Supply the one sprite the dark style references but never ships, so the
// missing-image warning stays silent.
map.on("styleimagemissing", (e) => {
  if (map.hasImage(e.id)) return;
  map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) });
});
window.atlasMap = map;

map.on("load", () => {
  loadingText.textContent = "Reading the landscape…";
  // Terrain (Terrarium encoding)
  map.addSource("terrain", {
    type: "raster-dem",
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 15,
    attribution: "Terrain: Mapzen / AWS (SRTM, GMTED2010, USGS)",
  });
  map.setTerrain({ source: "terrain", exaggeration: 1.2 });

  // Sky
  try {
    map.setSky({ "sky-color": PRESETS.day.sky, "horizon-color": PRESETS.day.horizon, "fog-color": PRESETS.day.fog, "fog-ground-blend": 0.6, "horizon-fog-blend": 0.5, "sky-horizon-blend": 0.5 });
  } catch {}

  // 3D buildings from the OpenFreeMap vector source (must be a *vector* source)
  const style = map.getStyle();
  const vtSource =
    Object.keys(style.sources).find((k) => style.sources[k].type === "vector") || "openmaptiles";

  map.addLayer({
    id: "3d-buildings",
    source: vtSource,
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 11.5,
    paint: {
      "fill-extrusion-color": ["case",
        [">=", ["coalesce", ["get", "render_height"], 0], 70], "#b9cdc9",
        [">=", ["coalesce", ["get", "render_height"], 0], 25], "#dfe4d6",
        "#f4f2ea"],
      "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["*", ["coalesce", ["get", "render_levels"], 2], 3.2], 7],
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.92,
      "fill-extrusion-vertical-gradient": true,
    },
  });

  addLandscapeLayers(vtSource);
  applyPreset("day");
  updateBuildingHeights();

  // Fly to first stop once tiles settle
  setTimeout(() => goTo(0), 600);
});

map.on("move", updateLabels);
map.on("render", updateLabels);
map.on("idle", () => { loading.style.display = "none"; });
setTimeout(() => { loading.style.display = "none"; }, 12000);

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") goTo((current + 1) % LANDMARKS.length);
  if (e.key === "ArrowLeft") goTo((current - 1 + LANDMARKS.length) % LANDMARKS.length);
  if (e.key === " ") { e.preventDefault(); touring ? stopTour() : startTour(); }
});
