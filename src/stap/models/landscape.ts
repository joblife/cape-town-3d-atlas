/**
 * Landscape Cape Town: the garden, the scar and the hill.
 *
 * Three places that are mostly ground. A park, a memorial and a hill are read
 * from above by their plan long before their elevation — an avenue of trees, an
 * empty plaza with a map set into it, a green dome with a road coiled round it —
 * so each model is laid out as a plan first and only then given height.
 */

import * as THREE from "three";
import { model, register, type LandmarkModel } from "./types.ts";

/**
 * Company's Garden: the VOC kitchen garden of 1652, now the city park.
 *
 * From the diorama camera this is a green field with a double row of oaks ruled
 * down the middle, and that avenue is the whole read — so the avenue carries the
 * model and everything else (the cross and diagonal walks, the fountain, the
 * pond, the beds, the museum) is arranged as a formal plan around it. Government
 * Avenue runs along Z, so the garden's front faces the lower gate; the museum
 * quarter sits on the east edge, where the South African Museum of 1897 and the
 * planetarium actually stand.
 *
 * Real extent roughly 240 m by 200 m. The model is a shade grander, because a
 * park that disappears between the blocks has failed at its only job.
 */
function companysGarden(): LandmarkModel {
  const k = model();
  const LAWN = 0x5f8f78;
  const FOLIAGE = 0x3f8f33;
  const FOLIAGE_LIT = 0x4a9a3d;
  const PATH = 0xe8dcc0;
  const STONE = 0xe4d2ab;
  const TRIM = 0xd6c39c;
  const WATER = 0x2f7fa8;
  const ROOF = 0x8d5140;
  const GLASS = 0x2b3a4a;
  const TRUNK = 0x7a5a3c;
  const WHITE = 0xf0e6d2;

  const R = 118; // the lawn, a shade inside the model's 120 m radius

  // Deterministic scatter: no Math.random, so the garden is the same garden on
  // every reload and on every machine.
  let seed = 1652;
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // The lawn, then the walks laid over it. Each walk sits at its own height so
  // the crossings never z-fight.
  k.plate(R, LAWN, 0, 0, 44, 0.06);

  // Government Avenue, the central walk, running between the two rows of oaks.
  k.add(k.box(22, 0.3, 200, PATH), 0, 0.15, 0);
  // The cross walk, west to east.
  k.add(k.box(220, 0.24, 11, PATH), 0, 0.12, 0);
  // The diagonals, cutting the four quarters.
  for (const yaw of [Math.PI / 4, -Math.PI / 4]) {
    k.add(k.box(9, 0.18, 216, PATH), 0, 0.09, 0, yaw);
  }

  // The oak avenue: two rows, canopies overlapping into one green ribbon. This
  // is the overhead signature — 14 trees a side, straight down the middle.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const z = -84.5 + i * 13;
      const x = side * 11 + (rand() - 0.5) * 1.4;
      const lean = (rand() - 0.5) * 1.8;
      k.column(0.6, 6, TRUNK, x, z + lean, 6);
      k.add(k.ball(5.4, FOLIAGE, 9, 7), x, 8.4, z + lean);
      k.add(k.ball(3.4, FOLIAGE_LIT, 8, 6), x + (rand() - 0.5) * 3.4, 6.6, z + lean + (rand() - 0.5) * 3.4);
    }
  }

  // The pear tree of 1652, still fruiting: one old tree with a crown 21 m
  // across, propped on poles, and now the tallest thing in the garden.
  const PX = -30;
  const PZ = 68;
  k.column(1.9, 9, TRUNK, PX, PZ, 8);
  k.add(k.ball(10.5, FOLIAGE, 10, 8), PX, 13.5, PZ);
  k.add(k.ball(7, FOLIAGE_LIT, 9, 7), PX + 7.5, 11, PZ + 6);
  k.add(k.ball(6.5, FOLIAGE, 9, 7), PX - 8, 11.5, PZ - 5.5);
  for (const a of [0.4, 2.5, 4.6]) {
    const prop = k.cyl(0.22, 0.3, 8, TRUNK, 6);
    prop.rotation.set(0, a, 0.55);
    k.add(prop, PX + Math.sin(a) * 3.4, 3.6, PZ + Math.cos(a) * 3.4);
  }

  // The fountain at the crossing, the formal centre of the garden.
  k.add(k.cyl(8, 8.4, 1.6, STONE, 20), 0, 0.8, 0);
  k.plate(6.6, WATER, 0, 0, 20, 1.7);
  k.add(k.cyl(2.6, 0.9, 0.9, STONE, 14), 0, 2.2, 0);
  k.add(k.cyl(0.5, 0.7, 3.6, WATER, 10), 0, 4.4, 0);
  k.add(k.ball(1.4, WATER, 10, 8), 0, 6.4, 0);

  // The pond, west of the avenue.
  k.plate(21, TRIM, -60, 30, 24, 0.09);
  k.plate(17, WATER, -60, 30, 24, 0.13);

  // Flower beds: the bright plates that give the lawns their formal pattern.
  const beds: [number, number, number, number][] = [
    [-48, 62, 6.5, 0xc25f7a],
    [-78, 54, 5.5, 0xd9b44a],
    [-42, -60, 6, WHITE],
    [-78, -40, 5, 0xc25f7a],
    [46, 64, 6, 0xd9b44a],
    [76, 44, 5.5, 0xc25f7a],
    [44, -60, 6.5, 0x6f8fc0],
    [76, -46, 5, WHITE],
    [-30, 36, 4.5, 0xd9b44a],
    [30, 36, 4.5, 0xc25f7a],
  ];
  for (const [x, z, r, colour] of beds) k.plate(r, colour, x, z, 14, 0.2);

  // A hedge round the lawn, broken at the four gates where the walks run out.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.13 || Math.abs(Math.cos(a)) < 0.13) continue;
    k.block(18.6, 1.7, 1.5, FOLIAGE, Math.sin(a) * 114, Math.cos(a) * 114, a);
  }

  // The museum quarter on the east edge: the South African Museum of 1897, with
  // its portico turned into the garden, and the planetarium dome beside it.
  k.block(24, 15, 46, STONE, 80, -6);
  k.add(k.box(26, 1.2, 48, TRIM), 80, 15.5, -6);
  k.gable(46, 24, 5, ROOF, 80, 15, -6, Math.PI / 2);

  for (const z of [-16, -12, -8, -4, 0, 4]) k.column(1, 11, STONE, 65.4, z, 10);
  k.add(k.box(7, 1.6, 26, TRIM), 64.6, 11.8, -6);
  k.gable(27, 7, 3.2, TRIM, 65, 12.6, -6, Math.PI / 2);

  k.facade(38, 8, 2, 8, STONE, GLASS, 67.8, -6, -Math.PI / 2);
  k.facade(38, 8, 2, 8, STONE, GLASS, 92.2, -6, Math.PI / 2);

  k.add(k.cyl(9, 9, 6, STONE, 20), 80, 3, 34);
  k.add(k.dome(9, WHITE, 20, 10), 80, 6, 34);

  return { group: k.group, radius: 120, height: 25 };
}

/**
 * District Six: the memorial to a neighbourhood the state bulldozed.
 *
 * The subject is absence, so the model is deliberately empty: bare, unfinished
 * ground, a paved plaza, and one raised slab in the middle carrying a fine grid
 * of blocks — the streets that were erased, read as a map with a few corners
 * missing. A short arc of plainly new houses holds the back of the plaza; the
 * front is left open. Nothing else is built, because nothing else should be.
 */
function districtSix(): LandmarkModel {
  const k = model();
  const EARTH = 0xcbb894;
  const PAVE = 0xe8dcc0;
  const SLAB = 0xefe3c8;
  const DARK = 0x4a5058;
  const WHITE = 0xf0e6d2;
  const GLASS = 0x2b3a4a;
  const GOLD = 0xd9b44a;
  const ROOF = 0x5a6472;

  // Cleared, unfinished ground: the point of the place is what is not there.
  k.plate(68, EARTH, 0, 0, 40, 0.06);
  // The paved plaza in front of the memorial.
  k.add(k.box(58, 0.3, 44, PAVE), 0, 0.15, 0);

  // The memorial slab itself.
  k.block(44, 1.1, 34, SLAB, 0, 0);

  // The map: a fine grid of blocks with the streets left as the gaps, set a few
  // degrees off the plaza and missing its corners, so it reads as a fragment of
  // a city rather than a chessboard.
  const grid = new THREE.Group();
  const PITCH = 5.3;
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 5; r++) {
      if ((c === 0 || c === 6) && (r === 0 || r === 4)) continue;
      const block = k.box(3.4, 0.5, 3.4, DARK);
      block.position.set((c - 3) * PITCH, 1.35, (r - 2) * PITCH);
      grid.add(block);
    }
  }
  grid.rotation.y = 0.2;
  k.group.add(grid);

  // A few rebuilt houses, modern and plainly new, holding a semicircle at the
  // back and leaving the head of the plaza open to the street.
  const houses = [112, 137, 163, 197, 223, 248];
  for (let i = 0; i < houses.length; i++) {
    const t = (houses[i] * Math.PI) / 180;
    const x = Math.sin(t) * 46;
    const z = Math.cos(t) * 46;
    const yaw = t + Math.PI; // facing the memorial
    const h = 5.2 + (i % 3) * 0.7;
    k.block(9, h, 8, WHITE, x, z, yaw);
    k.add(k.box(10.2, 0.5, 9.2, ROOF), x, h + 0.25, z, yaw);
    k.facade(7.2, 3.2, 1, 3, WHITE, GLASS, x - Math.sin(t) * 4.1, z - Math.cos(t) * 4.1, yaw);
  }

  // The one vertical event: a marker at the head of the plaza, dark stone with
  // a gold edge, like the old street signs kept inside the museum.
  k.block(6.4, 3.4, 0.9, DARK, 0, 29);
  k.add(k.box(6.8, 0.25, 1.2, GOLD), 0, 3.5, 29);

  return { group: k.group, radius: 70, height: 8 };
}

/**
 * Signal Hill and the Noon Gun.
 *
 * The hill is the silhouette: a hemisphere squashed and stretched into a ridge,
 * rising straight off the flat ground. Everything else is placed on its surface
 * through hillY, which keeps the road, the scrub and the summit works glued to
 * the slope. The guns stand on a levelled terrace at the top, behind a stone
 * parapet, pointed out to sea over the front of the hill; the road spirals up
 * the back to the parking apron, and gives the one line that breaks the green
 * from directly overhead.
 *
 * The hill is 60 m; the flag on the mast takes the model to 72.
 */
function signalHill(): LandmarkModel {
  const k = model();
  const GRASS = 0x5f8f78;
  const FYNBOS = 0x3f8f33;
  const STONE = 0xe4d2ab;
  const ROAD = 0xcbb894;
  const WHITE = 0xf0e6d2;
  const ROOF = 0xb5563f;
  const IRON = 0x24282e;
  const TIMBER = 0x6a4a33;
  const RED = 0xc0392b;
  const GLASS = 0x2b3a4a;

  const R_HILL = 125;
  const H_HILL = 60;
  const SX = 0.92; // stretched along the ridge
  const SZ = 1.12;

  /** The height of the hill at a point, so nothing has to guess at the slope. */
  const hillY = (x: number, z: number): number => {
    const rr = Math.hypot(x / SX, z / SZ);
    return rr >= R_HILL ? 0 : H_HILL * Math.sqrt(1 - (rr / R_HILL) ** 2);
  };

  const hill = k.dome(R_HILL, GRASS, 26, 9);
  hill.scale.set(SX, H_HILL / R_HILL, SZ);
  k.add(hill, 0, 0, 0);

  // The terraced top: a flat pad on the summit and a lower apron behind it,
  // both cut level, which is what makes the top read as a place.
  k.add(k.cyl(20, 25, 4.6, GRASS, 20), 0, 58.2, 0);
  k.add(k.cyl(14, 16, 5, GRASS, 18), 0, 56.9, -32);

  // The battery: three 18-pounders on carriages behind a low stone parapet,
  // all of it pointed out to sea over the front of the summit.
  for (const x of [-8, 0, 8]) {
    k.add(k.box(2.6, 1.4, 3.6, TIMBER), x, 61.2, 8);
    for (const side of [-1, 1]) {
      const wheel = k.cyl(1, 1, 0.5, TIMBER, 10);
      wheel.rotation.z = Math.PI / 2;
      k.add(wheel, x + side * 1.5, 61.2, 8.6);
    }
    const barrel = k.cyl(0.34, 0.46, 6, IRON, 10);
    barrel.rotation.x = Math.PI / 2 - 0.13; // level, muzzle to +Z
    k.add(barrel, x, 62.3, 9.6);
  }
  for (const [x, z, yaw, w] of [
    [0, 16, 0, 18],
    [-13, 12.5, -0.55, 11],
    [13, 12.5, 0.55, 11],
  ] as [number, number, number, number][]) {
    k.add(k.box(w, 1.6, 2, STONE), x, 61.3, z, yaw);
  }

  // The signalman's cottage: small, white, pitched, at the back of the pad.
  k.add(k.box(7.5, 3.4, 5.5, WHITE), 11, 62.2, -7, 0.25);
  k.gable(7.5, 5.5, 2.2, ROOF, 11, 63.9, -7, 0.25);
  k.add(k.box(5.6, 1.8, 0.3, GLASS), 11.7, 62.2, -4.24, 0.25);
  k.add(k.box(0.9, 2.4, 0.9, STONE), 13.2, 64.6, -8.2);

  // The signal mast: a pole with two yardarms and the warning flag — the thing
  // that told the town below which ships were on the horizon.
  k.add(k.cyl(0.35, 0.45, 11, TIMBER, 8), -13, 66, -4);
  for (const [y, len] of [
    [69, 7],
    [65.5, 5.2],
  ] as [number, number][]) {
    const yard = k.cyl(0.16, 0.16, len, TIMBER, 6);
    yard.rotation.z = Math.PI / 2;
    k.add(yard, -13, y, -4);
  }
  k.add(k.box(3.2, 2, 0.3, RED), -11.4, 70.2, -4);

  // The road, coiled up the back of the hill in a long spiral: slabs laid on the
  // surface and tilted along it, so the drive follows the slope instead of
  // hovering over it.
  const path: THREE.Vector3[] = [];
  const N = 34;
  const TURNS = 1.75;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const phi = -Math.PI * (1 + TURNS) + t * Math.PI * TURNS;
    const rr = 126 - t * 88;
    const x = SX * rr * Math.sin(phi);
    const z = SZ * rr * Math.cos(phi);
    path.push(new THREE.Vector3(x, hillY(x, z) + 0.9, z));
  }
  for (let i = 0; i < N; i++) {
    const a = path[i];
    const b = path[i + 1];
    const seg = k.box(8, 1.4, a.distanceTo(b) * 1.08, ROAD);
    seg.position.copy(a).lerp(b, 0.5);
    k.group.add(seg);
    seg.lookAt(b);
  }

  // Fynbos over the slopes, to give the green a texture and the hill a scale.
  let seed = 1806;
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 64; i++) {
    const rr = 46 + rand() * 76;
    const phi = rand() * Math.PI * 2;
    const x = SX * rr * Math.sin(phi);
    const z = SZ * rr * Math.cos(phi);
    let clear = true;
    for (const p of path) {
      if (Math.hypot(p.x - x, p.z - z) < 8) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;
    const r = 1.5 + rand() * 2;
    const bush = k.ball(r, FYNBOS, 7, 5);
    bush.scale.y = 0.7;
    k.add(bush, x, hillY(x, z) + r * 0.5, z);
  }

  return { group: k.group, radius: 140, height: 72 };
}

register("companys-garden", companysGarden);
register("district-six", districtSix);
register("signal-hill", signalHill);
