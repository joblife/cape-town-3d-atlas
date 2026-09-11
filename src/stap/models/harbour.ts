/**
 * The harbour edge: the working Waterfront, the silo museum, the stadium bowl
 * and the lighthouse at Green Point.
 *
 * Four very different plans, chosen so that each is unmistakable in outline
 * from the diorama camera: a sheet of water cut by quays, a honeycomb of tubes,
 * a ring around a green rectangle, and a striped drum on the rocks.
 */

import * as THREE from "three";
import { model, register, type LandmarkModel } from "./types.ts";

/* ── shared geometry ───────────────────────────────────────────────── */

/**
 * A flat rectangle lying in the ground plane. The Kit's `plate` is a circle, so
 * basins, docks, pitches and aprons are built from this instead.
 */
function flatRect(w: number, d: number, colour: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color: colour, flatShading: true }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/**
 * An open-ended tube — a ring you can see through or over. Seating bowls, roof
 * fascias, gallery railings and parapets are all this one shape.
 */
function shell(rTop: number, rBottom: number, height: number, colour: number, segments = 40): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, height, segments, 1, true),
    new THREE.MeshLambertMaterial({ color: colour, flatShading: true, side: THREE.DoubleSide }),
  );
}

/** A flat annulus lying in the ground plane: a plaza, a road, a water ring. */
function annulus(inner: number, outer: number, colour: number, segments = 48): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, segments),
    new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/* ── the models ────────────────────────────────────────────────────── */

/**
 * The V&A Waterfront: the working harbour in the old basins.
 *
 * On this model the subject is the water, not the mall. Two basins and the
 * channel between them take up most of the footprint, ringed by quay walls, and
 * everything else — the swing bridge, the dry dock, the cranes, the sheds and
 * the moored hulls — is arranged around the edge of that water. From above the
 * read is a dark rectangular basin framed by pale quay, with the Victoria Basin
 * roughly twice the Alfred and the dry dock cut into the land to the south.
 */
function vaWaterfront(): LandmarkModel {
  const k = model();
  const WATER = 0x2f7fa8;
  const DEEP = 0x275f80;
  const QUAY = 0xe8dcc0;
  const COPING = 0xcbb894;
  const DECK = 0xd6c39c;
  const WARE = 0xefe3c8;
  const ROOF = 0xb5563f;
  const GLASS = 0x2b3a4a;
  const STEEL = 0x4a5058;
  const HULL = 0xf0e6d2;
  const HULL_RED = 0xa8402f;

  const QH = 2.4; // quay height above the water
  const WL = 0.2; // the water surface

  /* ── the water first ───────────────────────────────────────────── */

  // Victoria Basin: the big one, cut in the 1890s for the gold and diamond
  // traffic. x −16…118, z −60…60.
  k.add(flatRect(134, 120, WATER), 51, WL, 0);
  // Alfred Basin: the 1860s original, smaller and to the west. x −118…−40.
  k.add(flatRect(78, 90, WATER), -79, WL, 0);
  // The channel between them, narrow enough to bridge. x −40…−16.
  k.add(flatRect(24, 24, WATER), -28, WL, 0);

  /* ── the quay walls ────────────────────────────────────────────── */

  // Victoria Basin, north and south, with a coping course at the water edge so
  // the basin has a visible lip from above.
  k.block(134, QH, 28, QUAY, 51, -74);
  k.add(k.box(134, 0.6, 1.6, COPING), 51, QH + 0.2, -60.8);
  k.block(134, QH, 28, QUAY, 51, 74);
  k.add(k.box(134, 0.6, 1.6, COPING), 51, QH + 0.2, 60.8);
  // East quay, the long working edge.
  k.block(22, QH, 176, QUAY, 129, 0);
  k.add(k.box(1.6, 0.6, 176, COPING), 118.8, QH + 0.2, 0);

  // Alfred Basin: quay on three sides.
  k.block(78, QH, 25, QUAY, -79, -57.5);
  k.add(k.box(78, 0.6, 1.6, COPING), -79, QH + 0.2, -45.8);
  k.block(78, QH, 25, QUAY, -79, 57.5);
  k.add(k.box(78, 0.6, 1.6, COPING), -79, QH + 0.2, 45.8);
  k.block(20, QH, 140, QUAY, -128, 0);
  k.add(k.box(1.6, 0.6, 140, COPING), -118.8, QH + 0.2, 0);

  // The land either side of the channel, tying the two basins together.
  k.block(24, QH, 76, QUAY, -28, -50);
  k.add(k.box(1.6, 0.6, 76, COPING), -39.2, QH + 0.2, -50);
  k.add(k.box(1.6, 0.6, 76, COPING), -16.8, QH + 0.2, -50);
  k.block(24, QH, 76, QUAY, -28, 50);
  k.add(k.box(1.6, 0.6, 76, COPING), -39.2, QH + 0.2, 50);
  k.add(k.box(1.6, 0.6, 76, COPING), -16.8, QH + 0.2, 50);

  // The strip behind the Alfred Basin, and the apron carrying the dry dock.
  k.block(78, QH, 18, QUAY, -79, 79);
  k.block(142, QH, 38, QUAY, -47, 107);
  k.block(28, QH, 38, QUAY, 126, 107);
  k.block(88, QH, 14, QUAY, 68, 119);

  /* ── the Robinson Dry Dock, 1882 ───────────────────────────────── */

  // A flooded rectangle cut into the south apron, with a caisson gate closing
  // its head against the basin. x 24…112, z 88…112.
  k.add(flatRect(88, 24, DEEP), 68, WL, 100);
  k.add(k.box(88, 4.2, 3.6, STEEL), 68, 2.1, 88); // the gate
  // Coping around the rim of the dock.
  k.add(k.box(88, 0.6, 1.6, COPING), 68, QH + 0.2, 111.2);
  k.add(k.box(1.6, 0.6, 24, COPING), 24.8, QH + 0.2, 100);
  k.add(k.box(1.6, 0.6, 24, COPING), 111.2, QH + 0.2, 100);

  // The ship lift: a portal crane straddling the dock head, still raising
  // hulls after 140 years.
  k.column(1.3, 26, STEEL, 116, 92, 8);
  k.column(1.3, 26, STEEL, 116, 108, 8);
  k.add(k.box(16, 2.2, 20, STEEL), 108, 27, 100);
  k.add(k.cyl(0.1, 0.1, 14, STEEL, 6), 100, 19, 100);
  k.add(k.ball(0.9, 0xd9b44a), 100, 11.5, 100);

  /* ── the swing bridge ──────────────────────────────────────────── */

  // The bar across the channel, with its pivot drum on the north bank and a
  // counterweight behind it. From above it is the one clean line crossing the
  // water, which is why it is worth the geometry.
  k.add(k.box(9, 1.4, 30, DECK), -32, 1.7, 0);
  k.add(k.cyl(5.2, 5.6, 4.2, STEEL, 12), -32, 2.1, 15);
  k.add(k.box(7, 2.4, 5, STEEL), -32, 3.0, 21.5);
  k.block(6, 4, 5, 0xf0e6d2, -38, 16);
  k.add(k.box(9, 1.4, 8, DECK), -32, 1.7, -16);

  /* ── cranes ────────────────────────────────────────────────────── */

  /** A quayside crane: a mast, a tilted jib and a counterweight. */
  const crane = (x: number, z: number, yaw: number, mast: number) => {
    const g = new THREE.Group();

    const base = k.cyl(3, 3.6, 1.4, STEEL, 10);
    base.position.y = 0.7;
    g.add(base);

    const column = k.cyl(1.1, 1.6, mast, STEEL, 8);
    column.position.y = mast / 2;
    g.add(column);

    const cabin = k.box(3.4, 3, 3.6, 0xf0e6d2);
    cabin.position.y = mast - 3;
    g.add(cabin);

    // The jib leaves the mast head and rises, so the hook clears the quay.
    const tilt = 0.4;
    const L = mast * 0.85;
    const jib = k.box(0.9, 0.9, L, STEEL);
    jib.rotation.x = -tilt;
    jib.position.set(0, mast + (Math.sin(tilt) * L) / 2, (Math.cos(tilt) * L) / 2);
    g.add(jib);

    const weight = k.box(3, 2.2, 3.4, STEEL);
    weight.position.set(0, mast, -2.6);
    g.add(weight);

    const tipY = mast + Math.sin(tilt) * L;
    const tipZ = Math.cos(tilt) * L;
    const cable = k.cyl(0.09, 0.09, 9, STEEL, 6);
    cable.position.set(0, tipY - 4.5, tipZ);
    g.add(cable);
    const hook = k.ball(0.5, 0xd9b44a);
    hook.position.set(0, tipY - 9.3, tipZ);
    g.add(hook);

    k.add(g, x, 0, z, yaw);
  };

  crane(20, -66, Math.PI, 22);
  crane(62, -66, Math.PI, 24);
  crane(100, -66, Math.PI, 20);
  crane(136, 34, -Math.PI / 2, 22);
  crane(-79, 52, Math.PI, 20);
  crane(-134, -30, Math.PI / 2, 18);

  /* ── warehouses: secondary to the water, but they hold the quay line ── */

  const warehouse = (x: number, z: number, w: number, d: number, h: number, yaw: number) => {
    k.block(w, h, d, WARE, x, z, yaw);
    k.gable(w, d, h * 0.42, ROOF, x, h, z, yaw);
    k.facade(
      w * 0.86,
      h * 0.62,
      2,
      Math.max(3, Math.round(w / 8)),
      WARE,
      GLASS,
      x + Math.sin(yaw) * (d / 2 + 0.14),
      z + Math.cos(yaw) * (d / 2 + 0.14),
      yaw,
    );
  };

  warehouse(0, -79, 26, 15, 9.5, 0);
  warehouse(30, -79, 26, 15, 9.5, 0);
  warehouse(60, -79, 26, 15, 8.5, 0);
  warehouse(90, -79, 22, 15, 10, 0);
  warehouse(20, 77, 34, 15, 10, 0);
  warehouse(90, 77, 30, 15, 8.5, 0);
  warehouse(-79, -58, 40, 12, 9, 0);
  warehouse(-128, 25, 34, 13, 9, Math.PI / 2);
  warehouse(126, 96, 18, 14, 9, Math.PI / 2);

  /* ── moored hulls: low and long, riding in the water ───────────── */

  const boat = (x: number, z: number, yaw: number, len: number, colour: number) => {
    const g = new THREE.Group();
    const beam = len * 0.32;

    const hull = k.box(len, 2.4, beam, colour);
    hull.position.y = 0.9;
    g.add(hull);
    const bow = k.box(len * 0.24, 2.4, beam * 0.5, colour);
    bow.position.set(len * 0.61, 0.9, 0);
    g.add(bow);

    const deck = k.box(len * 0.55, 0.7, beam * 0.82, 0xefe3c8);
    deck.position.set(-len * 0.1, 2.4, 0);
    g.add(deck);
    const house = k.box(len * 0.2, 2.4, beam * 0.7, 0xf0e6d2);
    house.position.set(-len * 0.28, 3.2, 0);
    g.add(house);

    const mast = k.cyl(0.18, 0.26, len * 0.5, STEEL, 6);
    mast.position.set(len * 0.05, 2.4 + len * 0.25, 0);
    g.add(mast);

    k.add(g, x, 0, z, yaw);
  };

  boat(18, -40, 0, 16, HULL);
  boat(46, -40, 0, 20, HULL_RED);
  boat(82, -38, 0, 14, HULL);
  boat(96, 34, Math.PI, 18, HULL);
  boat(-79, -26, 0, 14, HULL_RED);
  boat(-79, 20, 0, 12, HULL);
  boat(96, 100, 0, 22, HULL_RED); // in the dry dock, under the lift

  return { group: k.group, radius: 180, height: 34 };
}

/**
 * Zeitz MOCAA: the 1921 grain silo, 42 tubes carved into a museum.
 *
 * The tube bundle is the building, so it is built as one: sixteen packed
 * cylinders at varying heights, the rear eight carrying the flat roof slab and
 * the pillowed glass crown above it. From above the read is half flat roof with
 * a faceted glass dome, half a honeycomb of circular tube ends stepping down to
 * the front — the reason the tubes are left at different heights.
 */
function zeitzMocaa(): LandmarkModel {
  const k = model();
  const CONCRETE = 0xd6c39c;
  const CAP = 0xe8dcc0;
  const TRIM = 0xcbb894;
  const GLASS = 0x37506b;
  const GOLD = 0xd9b44a;
  const DARK = 0x2b3a4a;

  const R = 3.4; // tube radius; 7 m centres, so the tubes touch

  // A 4 x 4 bundle: 16 visible tubes standing in for the 42. Rows at z −9 and
  // −2 run full height and carry the roof; the front rows step down.
  const tubes: [number, number, number][] = [];
  const xs = [-10.5, -3.5, 3.5, 10.5];
  const heights: number[][] = [
    [55, 55, 55, 55],
    [55, 55, 55, 55],
    [48, 50, 49, 47],
    [42, 45, 43, 40],
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) tubes.push([xs[c], -9 + r * 7, heights[r][c]]);
  }

  for (const [x, z, h] of tubes) {
    k.add(k.cyl(R, R, h, CONCRETE, 14), x, h / 2, z);
    // A lighter lid on each tube, so the honeycomb reads from directly above
    // instead of becoming one grey mass.
    k.add(k.cyl(R, R, 0.3, CAP, 14), x, h + 0.16, z);
  }

  // The flat roof slab over the tall rear tubes.
  k.add(k.box(32, 3, 17, TRIM), 0, 56.7, -5.5);

  // The pillowed glass crown: a low, wide faceted dome over the void the
  // galleries were cut out of. Squashed so it bulges rather than points.
  const crown = k.dome(10, GLASS, 10, 4);
  crown.scale.y = 0.7;
  k.add(crown, 0, 58.2, -6);
  k.add(k.cyl(10.4, 10.4, 0.8, GOLD, 12), 0, 58.4, -6);

  // The lift tower beside the bundle — the shaft that once carried grain.
  k.block(8, 64, 8, CONCRETE, 24, -6);
  k.facade(6, 48, 10, 4, CONCRETE, DARK, 24, -1.6);
  k.add(k.box(9, 1, 9, TRIM), 24, 64.5, -6);
  k.add(k.ball(0.7, GOLD), 24, 65.6, -6);

  return { group: k.group, radius: 58, height: 66 };
}

/**
 * Cape Town Stadium: the 2010 World Cup bowl on Green Point Common.
 *
 * The whole design is a hole with a green rectangle at the bottom of it, so the
 * model leads with exactly that: a raked seating ring, a ribbed outer shell and
 * a flat white roof ring cantilevered over the seats. The pitch is 105 x 68 m
 * with real markings, and the roof opening is wide enough that the pitch is
 * never in shadow from directly above.
 */
function capeTownStadium(): LandmarkModel {
  const k = model();
  const PITCH = 0x3f8f33;
  const APRON = 0x5f8f78;
  const PLAZA = 0xcbb894;
  const WHITE = 0xf0e6d2;
  const SEAT_A = 0x4a5058;
  const SEAT_B = 0x5a6472;
  const GLASS = 0x2b3a4a;

  // The Common around the plaza, and the plaza itself.
  k.add(annulus(102, 130, PLAZA), 0, 0.06, 0);
  k.plate(102, APRON, 0, 0, 40, 0.09);

  // The pitch: 105 x 68 m, long axis along X, sitting just proud of the apron.
  k.add(flatRect(105, 68, PITCH), 0, 0.14, 0);

  const LINE = 0.6;
  const LY = 0.26;
  // Touchlines and goal lines.
  k.add(k.box(105, 0.12, LINE, WHITE), 0, LY, 34);
  k.add(k.box(105, 0.12, LINE, WHITE), 0, LY, -34);
  k.add(k.box(LINE, 0.12, 68, WHITE), 52.5, LY, 0);
  k.add(k.box(LINE, 0.12, 68, WHITE), -52.5, LY, 0);
  // Halfway line and centre circle.
  k.add(k.box(LINE, 0.12, 68, WHITE), 0, LY, 0);
  k.add(annulus(9, 9.5, WHITE, 32), 0, LY, 0);
  // Penalty areas at both ends.
  for (const s of [-1, 1]) {
    k.add(k.box(LINE, 0.12, 40, WHITE), s * 36, LY, 0);
    k.add(k.box(16.5, 0.12, LINE, WHITE), s * 44.25, LY, 20);
    k.add(k.box(16.5, 0.12, LINE, WHITE), s * 44.25, LY, -20);
  }
  // Goals.
  for (const s of [-1, 1]) {
    for (const z of [-3.66, 3.66]) {
      k.add(k.box(0.3, 2.44, 0.3, WHITE), s * 52.5, 1.22, z);
    }
    k.add(k.box(0.3, 0.3, 7.6, WHITE), s * 52.5, 2.44, 0);
  }

  // The seating bowl, as three raked rings stepping up and out from the pitch
  // edge to the facade. Open-ended shells, so the pitch stays visible.
  const tiers: [number, number, number, number][] = [
    [66, 76, 8, SEAT_A],
    [76, 86, 8, SEAT_B],
    [86, 96, 8, SEAT_A],
  ];
  for (let i = 0; i < tiers.length; i++) {
    const [inner, outer, h, colour] = tiers[i];
    k.add(shell(outer, inner, h, colour, 40), 0, i * 8 + h / 2, 0);
  }
  // A walkway band on each tier edge, which is what reads as tiers from above.
  for (const r of [76, 86]) k.add(shell(r + 0.3, r + 0.3, 1.1, 0xefe3c8, 40), 0, r === 76 ? 8 : 16, 0);

  // The outer shell: a glazed ring with vertical ribs, 36 of them.
  k.add(shell(99, 99, 24, GLASS, 40), 0, 12, 0);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    k.add(k.box(1.4, 24, 2.6, WHITE), Math.sin(a) * 100.6, 12, Math.cos(a) * 100.6, a);
  }

  // The roof: one flat white ring floating over the seats on slender struts,
  // cantilevered past the facade on the outside.
  k.add(annulus(70, 112, WHITE, 48), 0, 28, 0);
  k.add(shell(112, 112, 2.2, WHITE, 48), 0, 28, 0);
  k.add(shell(70, 70, 1.6, WHITE, 48), 0, 28.2, 0);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    k.add(k.cyl(0.9, 0.9, 5, WHITE, 6), Math.sin(a) * 94, 26.5, Math.cos(a) * 94);
  }

  return { group: k.group, radius: 130, height: 30 };
}

/**
 * Green Point Lighthouse: first lit 12 April 1824, the oldest working light in
 * the country, raised to 16 m in 1865.
 *
 * A small building, so it is built crisp: five painted bands on a stout tower,
 * a gallery with a railing, a glass lantern and a copper dome, on the rocks the
 * light was put there to warn ships off.
 */
function greenPointLighthouse(): LandmarkModel {
  const k = model();
  const RED = 0xc23b2e;
  const WHITE = 0xf0e6d2;
  const COPPER = 0x5f8f78;
  const GLASS = 0x37506b;
  const ROCK = 0x5a6472;
  const SHELF = 0x4a5058;
  const GOLD = 0xd9b44a;

  // The rocks at Mouille Point: squat boulders, flattened so they stay low.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    const r = 4.4 + (i % 3) * 1.3;
    const boulder = k.ball(1.5 + (i % 4) * 0.45, ROCK, 7, 5);
    boulder.scale.y = 0.45;
    k.add(boulder, Math.sin(a) * r, 0.45, Math.cos(a) * r);
  }
  k.plate(6.6, SHELF, 0, 0, 14, 0.05); // the wet rock shelf under everything

  // The masonry tower: a stout drum on a plinth, five bands tall.
  k.add(k.cyl(4.8, 5.2, 1, WHITE, 16), 0, 0.5, 0);

  const BAND = 1.8;
  for (let i = 0; i < 5; i++) {
    const y = 1 + BAND * i + BAND / 2;
    const rt = 3.3 - i * 0.05;
    const rb = 3.35 - i * 0.05;
    // Alternating red and white: the day mark, so the tower is identifiable in
    // daylight before any light is visible.
    k.add(k.cyl(rt, rb, BAND, i % 2 === 0 ? WHITE : RED, 16), 0, y, 0);
  }

  // Gallery, railing and lantern.
  k.add(k.cyl(4.2, 4.2, 0.5, WHITE, 16), 0, 10.25, 0);
  k.add(shell(3.9, 3.9, 1.2, WHITE, 16), 0, 11.1, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(k.box(0.16, 1.2, 0.16, WHITE), Math.sin(a) * 3.9, 11.1, Math.cos(a) * 3.9);
  }

  k.add(k.cyl(2.2, 2.2, 2.4, GLASS, 16), 0, 11.7, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(k.box(0.22, 2.4, 0.22, WHITE), Math.sin(a) * 2.2, 11.7, Math.cos(a) * 2.2);
  }

  // The copper dome, a vent and the finial.
  k.add(k.dome(2.3, COPPER, 12, 6), 0, 12.9, 0);
  k.add(k.cyl(0.4, 0.8, 0.7, COPPER, 8), 0, 15.45, 0);
  k.add(k.ball(0.32, GOLD), 0, 15.9, 0);

  // The door, facing out to sea at the front.
  k.add(k.box(1.3, 2.4, 0.4, GLASS), 0, 2.2, 3.2);

  return { group: k.group, radius: 13, height: 16 };
}

register("va-waterfront", vaWaterfront);
register("zeitz-mocaa", zeitzMocaa);
register("cape-town-stadium", capeTownStadium);
register("green-point-lighthouse", greenPointLighthouse);
