/**
 * The walkable city.
 *
 * Turns the baked OpenStreetMap extract into a scene that can be walked at eye
 * level. Two things make this cheap enough to run on a laptop:
 *
 *  - every building becomes one extruded prism merged into a handful of meshes,
 *    grouped by surface kind, so the whole core draws in a few calls rather than
 *    a few thousand;
 *  - nothing is lit per-pixel except by the sun, which is the same solar model
 *    the atlas uses, so the two products agree about what time it is.
 *
 * The result is a miniature: accurate in plan and in height, generous in detail.
 */

import * as THREE from "three";

export interface BakedBuilding {
  /** Flat [x, z, x, z, …] footprint in **decimetres**, local to the bake origin. */
  f: number[];
  /** Height in metres. */
  h: number;
  k: BuildingKind;
  n?: string;
}

export type BuildingKind = "worship" | "commercial" | "industrial" | "residential" | "civic" | "minor" | "general";

export interface BakedRoad {
  p: number[];
  w: number;
  n?: string;
}

export interface BakedArea {
  p: number[];
}

export interface BakedWorld {
  meta: {
    name: string;
    source: string;
    extracted: string;
    origin: { lon: number; lat: number };
    bbox: { south: number; west: number; north: number; east: number };
    counts: { buildings: number; roads: number; green: number; water: number };
    heightStats: { min: number; median: number; max: number };
  };
  buildings: BakedBuilding[];
  roads: BakedRoad[];
  green: BakedArea[];
  water: BakedArea[];
}

export interface CitySurfaces {
  /** Instanced canopies on parks and along the wider streets. */
  trees: THREE.InstancedMesh;
  /** Feet of the walkable city, in the same local metres. */
  ground: THREE.Mesh;
  roads: THREE.Mesh;
  green: THREE.Mesh;
  water: THREE.Mesh;
  /** Extruded buildings, one mesh per kind, merged. */
  walls: Map<BuildingKind, THREE.Mesh>;
  /** Flat outline under each building, which reads as a roof edge from below. */
  roofs: THREE.Mesh;
}

/**
 * Maps a point on the city's local plane to a position in the scene.
 *
 * One set of geometry builders, two worlds: flat for walking the streets,
 * spherical for the little-planet overview. Heights are always radial, which is
 * what lets a building stand up on a curved surface without special cases.
 */
export type Projector = (x: number, z: number, h: number, out: THREE.Vector3) => void;

/** The walkable world: metres, y up. */
export const FLAT: Projector = (x, z, h, out) => {
  out.set(x, h, z);
};

/**
 * The little planet: the same city bent onto a sphere of the given radius.
 *
 * Azimuthal equidistant — distance from the city's centre becomes arc length
 * along the sphere, and the bearing is preserved. The city centre sits at the
 * pole, so the streets fan outward the way the reference's globe does.
 */
export function spherical(radius: number, heightGain = 1): Projector {
  return (x, z, h, out) => {
    const r = Math.hypot(x, z);
    const theta = r / radius;
    const phi = Math.atan2(z, x);
    const sinT = Math.sin(theta);

    // Heights are lifted, and compressed.
    //
    // At true scale a typical eight-metre building is under half a percent of
    // this sphere's diameter — about two pixels — so the city reads as surface
    // noise rather than a city. A linear exaggeration fixes the small buildings
    // and ruins the tall ones: at seven times, the tallest building in the core
    // spikes to 1,214 m against a 900 m radius, and the camera ends up inside a
    // thicket. A power curve lifts the ordinary buildings a great deal and the
    // tall ones only a little, which is what makes a skyline legible.
    const lifted = h <= 0 ? 0 : Math.pow(h, 0.62) * heightGain;
    const ring = radius + lifted;
    out.set(ring * sinT * Math.cos(phi), ring * Math.cos(theta), ring * sinT * Math.sin(phi));
  };
}

const KIND_COLOURS: Record<BuildingKind, number> = {
  worship: 0xe8dcc8,
  commercial: 0xd9cfc0,
  industrial: 0xc9c4bb,
  residential: 0xdfd6c6,
  civic: 0xeae2d2,
  minor: 0xc6c0b6,
  general: 0xd7cec0,
};

/** Ground plane extents, with a margin so the edge is never visible. */
function boundsOf(world: BakedWorld): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const consider = (x: number, z: number): void => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  };
  for (const b of world.buildings) {
    for (let i = 0; i < b.f.length; i += 2) consider(b.f[i], b.f[i + 1]);
  }
  for (const r of world.roads) {
    for (let i = 0; i < r.p.length; i += 2) consider(r.p[i], r.p[i + 1]);
  }
  return { minX, maxX, minZ, maxZ };
}

/** A flat polygon mesh from a list of rings, in the XZ plane at `y`. */
function areaGeometry(areas: BakedArea[], y: number, project: Projector = FLAT): THREE.BufferGeometry {
  const positions: number[] = [];
  const v = new THREE.Vector3();
  const push = (x: number, z: number): void => {
    project(x, z, y, v);
    positions.push(v.x, v.y, v.z);
  };
  for (const area of areas) {
    const p = area.p;
    // Fan triangulation: OSM rings are simple and mostly convex enough for a
    // flat overlay; a stray concavity shows only as a hairline seam at this scale.
    for (let i = 2; i < p.length - 2; i += 2) {
      push(p[0], p[1]);
      push(p[i], p[i + 1]);
      push(p[i + 2], p[i + 3]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Extrude every building of one kind into a single merged geometry.
 *
 * Written by hand rather than via ExtrudeGeometry because unioning thousands of
 * separate extrusions is far slower and produces the same triangles. Vertex
 * colours carry two things a flat material cannot: a darker wall near the
 * ground, which stands in for the shadowing a real street gets from its own
 * buildings, and a per-building roof tone, which is most of what stops a city
 * of boxes reading as one white mass.
 */
function extrudeKind(
  buildings: BakedBuilding[],
  y: number,
  seed: number,
  project: Projector = FLAT,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tri = (x1: number, h1: number, z1: number, x2: number, h2: number, z2: number, x3: number, h3: number, z3: number): void => {
    project(x1, z1, y + h1, a);
    project(x2, z2, y + h2, b);
    project(x3, z3, y + h3, c);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };

  /** Deterministic per-building variation. */
  const hash = (n: number): number => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi];
    const f = b.f;
    const n = f.length / 2;
    const top = y + b.h;
    const r = hash(bi);

    // Roof: a warm terracotta through sand and slate, so a block of buildings
    // reads as many buildings.
    const roofTone = 0.55 + r * 0.45;
    // Plaster, stone, whitewash, brick: a narrow but real spread of wall tones,
    // which is what stops a terrace reading as one long slab.
    const warm = hash(bi * 3.7);
    const wall = [
      0.94 + warm * 0.06,
      0.9 + warm * 0.06 - (1 - warm) * 0.06,
      0.84 + warm * 0.04 - (1 - warm) * 0.1,
    ];
    // Terracotta through sand to slate: the range is wide on purpose, because
    // this is the main thing separating one building from the next.
    const roof = [0.5 + roofTone * 0.5, 0.28 + roofTone * 0.42, 0.2 + roofTone * 0.4];

    // Walls: one quad per edge, shaded from foot to eaves.
    for (let i = 0; i < n; i++) {
      const ax = f[i * 2];
      const az = f[i * 2 + 1];
      const j = (i + 1) % n;
      const bx = f[j * 2];
      const bz = f[j * 2 + 1];
      // Two triangles, wound so the outward face is front-facing. Heights are
      // passed as offsets, so on the sphere the wall follows the curve.
      tri(ax, 0, az, bx, 0, bz, bx, b.h, bz);
      tri(ax, 0, az, bx, b.h, bz, ax, b.h, az);
      // Walls carry the per-building variation, because from the street — and
      // from any camera low enough to make buildings look tall — walls are what
      // you actually see. Roofs are only visible from well above.
      const ys = [y, y, top, y, top, top];
      for (const h of ys) {
        const t = Math.min(1, Math.max(0, (h - y) / Math.max(1, b.h)));
        const sh = 0.58 + t * 0.42;
        colours.push(
          sh * wall[0],
          sh * wall[1],
          sh * wall[2],
        );
      }
    }

    // Roof: a fan, so it is visible from above at any pitch.
    for (let i = 1; i < n - 1; i++) {
      tri(
        f[0], b.h, f[1],
        f[i * 2], b.h, f[i * 2 + 1],
        f[(i + 1) * 2], b.h, f[(i + 1) * 2 + 1],
      );
      colours.push(roof[0], roof[1], roof[2], roof[0], roof[1], roof[2], roof[0], roof[1], roof[2]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Ribbon each street into a flat strip of the right width. */
function roadGeometry(roads: BakedRoad[], y: number, project: Projector = FLAT): THREE.BufferGeometry {
  const positions: number[] = [];
  const v = new THREE.Vector3();
  const push = (x: number, z: number): void => {
    project(x, z, y, v);
    positions.push(v.x, v.y, v.z);
  };
  for (const road of roads) {
    const p = road.p;
    const half = road.w / 2;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i], az = p[i + 1];
      const bx = p[i + 2], bz = p[i + 3];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;
      // Perpendicular, scaled to half the road width.
      const nx = (-dz / len) * half, nz = (dx / len) * half;
      push(ax + nx, az + nz);
      push(bx + nx, bz + nz);
      push(bx - nx, bz - nz);
      push(ax + nx, az + nz);
      push(bx - nx, bz - nz);
      push(ax - nx, az - nz);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export interface BuildOptions {
  /** Ground level in local metres. */
  y?: number;
  /** How to place points. Defaults to flat, walkable metres. */
  project?: Projector;
  /** Sphere radius when projecting onto a planet; draws an ocean beneath. */
  planetRadius?: number;
}

export function buildCity(world: BakedWorld, options: BuildOptions = {}): CitySurfaces {
  const y = options.y ?? 0;
  const project = options.project ?? FLAT;
  const bounds = boundsOf(world);
  const pad = 400;

  let ground: THREE.Mesh;
  if (options.planetRadius) {
    // On a planet the ground is the sphere itself, coloured so the gaps between
    // streets read as land rather than holes.
    ground = new THREE.Mesh(
      new THREE.SphereGeometry(options.planetRadius - 0.6, 96, 64),
      new THREE.MeshLambertMaterial({ color: 0xcdc8b4 }),
    );
    ground.receiveShadow = true;
  } else {
    const groundGeo = new THREE.PlaneGeometry(bounds.maxX - bounds.minX + pad * 2, bounds.maxZ - bounds.minZ + pad * 2);
    groundGeo.rotateX(-Math.PI / 2);
    ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0xcdc8b4 }));
    ground.position.set((bounds.minX + bounds.maxX) / 2, y - 0.15, (bounds.minZ + bounds.maxZ) / 2);
    ground.receiveShadow = true;
  }

  const roads = new THREE.Mesh(
    roadGeometry(world.roads, y + 0.02, project),
    new THREE.MeshBasicMaterial({ color: 0xd8d3c2, transparent: true, opacity: 0.95 }),
  );

  const green = new THREE.Mesh(
    areaGeometry(world.green, y + 0.03, project),
    new THREE.MeshLambertMaterial({ color: 0x7d9057 }),
  );

  const water = new THREE.Mesh(
    areaGeometry(world.water, y + 0.03, project),
    new THREE.MeshLambertMaterial({ color: 0x2f7f9e, transparent: true, opacity: 0.9 }),
  );

  // Group by kind so the whole city is a handful of draw calls.
  const byKind = new Map<BuildingKind, BakedBuilding[]>();
  for (const b of world.buildings) {
    const list = byKind.get(b.k);
    if (list) list.push(b);
    else byKind.set(b.k, [b]);
  }

  const walls = new Map<BuildingKind, THREE.Mesh>();
  let seed = 1;
  for (const [kind, list] of byKind) {
    const mesh = new THREE.Mesh(
      extrudeKind(list, y, seed++, project),
      new THREE.MeshLambertMaterial({ color: KIND_COLOURS[kind], vertexColors: true, flatShading: true }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    walls.set(kind, mesh);
  }

  // A faint cap on every roof, so buildings separate from each other when seen
  // from above and the block reads at a glance.
  const roots: BakedArea[] = world.buildings.map((b) => ({ p: b.f }));
  const roofs = new THREE.Mesh(
    areaGeometry(roots, y + 0.4, project),
    new THREE.MeshBasicMaterial({ color: 0x9c9285, transparent: true, opacity: 0.18 }),
  );

  const trees = options.planetRadius ? treesOnPlanet(world, y, options.planetRadius) : treesFor(world, y);

  return { ground, roads, green, water, walls, roofs, trees };
}

/**
 * Scatter trees.
 *
 * Instanced, so several hundred canopies cost a single draw call. Deterministic
 * placement keeps the city the same on every visit — a city that reshuffles
 * itself on reload reads as broken rather than alive.
 */
function treesFor(world: BakedWorld, y: number): THREE.InstancedMesh {
  const spots: { x: number; z: number; s: number }[] = [];
  let seed = 20260911;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Along and inside parks.
  for (const area of world.green) {
    const p = area.p;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.length; i += 2) {
      if (p[i] < minX) minX = p[i];
      if (p[i] > maxX) maxX = p[i];
      if (p[i + 1] < minZ) minZ = p[i + 1];
      if (p[i + 1] > maxZ) maxZ = p[i + 1];
    }
    const w = maxX - minX;
    const h = maxZ - minZ;
    // Sparse. A park with a hundred canopies in it reads as a green smear from
    // any distance; a dozen reads as a park.
    const count = Math.min(9, Math.max(1, Math.floor((w * h) / 900)));
    for (let i = 0; i < count; i++) {
      spots.push({ x: minX + rand() * w, z: minZ + rand() * h, s: 0.85 + rand() * 0.6 });
    }
  }

  // A loose line of street trees down the wider roads.
  for (const road of world.roads) {
    if (road.w < 6.5) continue;
    const p = road.p;
    for (let i = 0; i < p.length - 2; i += 2) {
      // Street trees are the exception that proves the rule: a city avenue is
      // what tells the eye these are streets and not gaps.
      if (rand() > 0.12) continue;
      spots.push({ x: p[i] + (rand() - 0.5) * 8, z: p[i + 1] + (rand() - 0.5) * 8, s: 0.8 + rand() * 0.45 });
    }
  }

  const geometry = new THREE.ConeGeometry(2.6, 6.4, 6);
  geometry.translate(0, 3.2, 0);
  const material = new THREE.MeshLambertMaterial({ color: 0x3f6b38, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, spots.length));
  const matrix = new THREE.Matrix4();
  spots.forEach((spot, i) => {
    matrix.makeScale(spot.s, spot.s * (0.85 + rand() * 0.5), spot.s);
    matrix.setPosition(spot.x, y, spot.z);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.count = spots.length;
  return mesh;
}

/** Everything the city contributes to a three.js scene, for adding and removing. */
export function cityObjects(surfaces: CitySurfaces): THREE.Object3D[] {
  return [
    surfaces.ground,
    surfaces.roads,
    surfaces.green,
    surfaces.water,
    surfaces.trees,
    ...surfaces.walls.values(),
    surfaces.roofs,
  ];
}

/** Named buildings, for lookup when the walker arrives somewhere. */
export function namedBuildings(world: BakedWorld): { name: string; x: number; z: number; h: number }[] {
  const out: { name: string; x: number; z: number; h: number }[] = [];
  for (const b of world.buildings) {
    if (!b.n) continue;
    let cx = 0, cz = 0;
    for (let i = 0; i < b.f.length; i += 2) {
      cx += b.f[i];
      cz += b.f[i + 1];
    }
    const n = b.f.length / 2;
    out.push({ name: b.n, x: cx / n, z: cz / n, h: b.h });
  }
  return out;
}

/**
 * Trees, placed on a sphere.
 *
 * Instances have to be oriented, not just positioned: a cone upright on a plane
 * leans out of the ground once the ground curves away. Each canopy is aimed
 * along the surface normal instead, which is what keeps a forest on a planet
 * looking planted rather than scattered.
 */
function treesOnPlanet(world: BakedWorld, y: number, radius: number): THREE.InstancedMesh {
  const spots: { x: number; z: number; s: number }[] = [];
  let seed = 20260911;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (const area of world.green) {
    const p = area.p;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.length; i += 2) {
      if (p[i] < minX) minX = p[i];
      if (p[i] > maxX) maxX = p[i];
      if (p[i + 1] < minZ) minZ = p[i + 1];
      if (p[i + 1] > maxZ) maxZ = p[i + 1];
    }
    const w = maxX - minX;
    const h = maxZ - minZ;
    const count = Math.min(9, Math.max(1, Math.floor((w * h) / 900)));
    for (let i = 0; i < count; i++) {
      spots.push({ x: minX + rand() * w, z: minZ + rand() * h, s: 0.85 + rand() * 0.6 });
    }
  }
  for (const road of world.roads) {
    if (road.w < 6.5) continue;
    const p = road.p;
    for (let i = 0; i < p.length - 2; i += 2) {
      if (rand() > 0.12) continue;
      spots.push({ x: p[i] + (rand() - 0.5) * 8, z: p[i + 1] + (rand() - 0.5) * 8, s: 0.8 + rand() * 0.45 });
    }
  }

  const project = spherical(radius);
  const geometry = new THREE.ConeGeometry(2.6, 6.4, 6);
  geometry.translate(0, 3.2, 0);
  const material = new THREE.MeshLambertMaterial({ color: 0x3f6b38, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, spots.length));

  const position = new THREE.Vector3();
  const up = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);

  spots.forEach((spot, i) => {
    project(spot.x, spot.z, y, position);
    // Radial direction is the surface normal for a sphere about the origin.
    up.copy(position).normalize();
    quat.setFromUnitVectors(origin.set(0, 1, 0), up);
    const s = spot.s;
    one.set(s, s * (0.85 + rand() * 0.5), s);
    matrix.compose(position, quat, one);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.count = spots.length;
  return mesh;
}
