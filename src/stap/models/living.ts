/**
 * Living Cape Town: the streets people actually use.
 *
 * Bo-Kaap's painted slope, Long Street's iron terraces, Greenmarket Square's
 * craft market, the Auwal Mosque and the Old Biscuit Mill. These are
 * street-scale places rather than monuments, so detail carries more weight here
 * than in the civic set — but each still leads with a silhouette that reads from
 * a diorama camera: a staircase of roofs, a terrace with a continuous iron edge,
 * a grid of coloured canopies, a minaret over a low courtyard, a run of sawtooth
 * over a brick yard.
 */

import * as THREE from "three";
import { model, register, type LandmarkModel } from "./types.ts";

/**
 * Bo-Kaap: the Malay Quarter, on the lower slope of Signal Hill.
 *
 * The signature is the slope itself. Steep cobbled lanes climb the hill between
 * two rows of two-storey houses, and because every house sits on its own terrace
 * above the one below, the roofline becomes a staircase. That staircase — two
 * rows of pitched roofs stepping up and away from the camera — is what says
 * Bo-Kaap from above, so the model is built as eight stone terraces with a pair
 * of painted houses on each, rather than as a flat street. Real extent roughly
 * 130 m along the lane, climbing about 20 m.
 */
function boKaap(): LandmarkModel {
  const k = model();

  const COBBLE = 0x9a9384;
  const TERRACE = 0xcfc0a0;
  const STOEP = 0xdcd0b2;
  const TRIM = 0xd6c39c;
  const GLASS = 0x2b3a4a;
  const DOOR = 0x4a3b2e;
  const TRUNK = 0x6b5a45;
  const LEAF = 0x3f8f33;

  // The famous palette: strong flat colours, a different one for each house,
  // chosen by the household. This is the only district in the city where the
  // paint is the architecture, so the model spends its colour budget here.
  const PAINT = [0xd9738f, 0x8fd0b0, 0xd9a441, 0x6fb3d9, 0xb79fd6, 0xf0e6d2, 0xe07a5f, 0x54b8b0];
  const ROOFS = [0xb5563f, 0x8d5140, 0x5a6472];

  const N = 8; // eight terraces stepping up the hill
  const RISE = 2.6; // each one sits a storey above the last
  const PITCH = 15; // depth of one terrace along the lane
  const LANE = 9; // the cobbled lane between the two rows
  const HOUSE_W = 14.5; // frontage along the lane
  const HOUSE_D = 14; // depth back from the lane
  const FACE = LANE / 2 + 2; // where the house fronts stand, behind the stoeps
  const X = FACE + HOUSE_D / 2;

  for (let i = 0; i < N; i++) {
    const z = ((N - 1) / 2) * PITCH - i * PITCH; // the lane climbs away from +Z
    const t = 0.5 + i * RISE; // terrace level above ground

    // The hillside itself: a stack of stone terraces whose risers are the
    // staircase seen from the air.
    k.block(X * 2, t, PITCH, TERRACE, 0, z);
    k.add(k.box(LANE, 0.16, PITCH, COBBLE), 0, t + 0.08, z); // the stepped lane

    for (const s of [-1, 1]) {
      const paint = PAINT[(i * 2 + (s > 0 ? 0 : 1)) % PAINT.length];
      const h = 8.6 + ((i + (s > 0 ? 1 : 0)) % 3) * 0.7;
      const x = s * X;

      k.add(k.box(HOUSE_D, h, HOUSE_W, paint), x, t + h / 2, z);
      // A pitched roof riding the lane, so the row reads as terraced houses and
      // the ridge line steps with the terraces.
      k.gable(HOUSE_W, HOUSE_D, 2.8, ROOFS[(i + (s > 0 ? 1 : 0)) % ROOFS.length], x, t + h, z, Math.PI / 2);

      // Two storeys of windows facing the lane, and a door at the stoep.
      const front = k.facade(HOUSE_W * 0.74, h * 0.66, 2, 2, paint, GLASS, s * FACE, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      front.position.y = t + 0.9;
      k.add(k.box(0.5, 2.2, 1.4, DOOR), s * (FACE - 0.55), t + 1.1, z);

      // The stoep: a raised platform at every door, a step above the cobbles.
      k.add(k.box(2, 0.45, HOUSE_W * 0.92, STOEP), s * (LANE / 2 + 1), t + 0.22, z);
      if (i % 2 === 0) {
        // Two steps down into the lane.
        k.add(k.box(0.9, 0.3, 2.4, TRIM), s * (LANE / 2 - 0.45), t + 0.15, z - 3);
        k.add(k.box(0.9, 0.15, 2.4, TRIM), s * (LANE / 2 - 1.25), t + 0.07, z - 3);
      }
      if (i % 3 === 1) {
        // A pot plant on the stoep, which is where the greenery in Bo-Kaap is.
        const px = s * (LANE / 2 + 1.6);
        k.add(k.cyl(0.4, 0.5, 0.8, 0xb5563f, 8), px, t + 0.85, z + 4.5);
        k.add(k.cyl(0.12, 0.16, 1.6, TRUNK, 6), px, t + 2.05, z + 4.5);
        k.add(k.ball(1.1, LEAF, 10, 8), px, t + 3.4, z + 4.5);
      }
    }
  }

  // The slope carries on above the top terrace, so the block does not end in a
  // cliff face. Nothing is built on it; it is the mountain.
  k.block(X * 2, 20.5, 9, TERRACE, 0, ((N - 1) / 2) * PITCH - N * PITCH + 3.5);

  return { group: k.group, radius: 70, height: 32 };
}

/**
 * Long Street: the Victorian commercial spine of the city bowl.
 *
 * Two continuous terraces facing each other across a straight street, three and
 * four storeys, rebuilt in the 1890s with cast-iron balconies bolted to the
 * front. The balconies are the whole character of the street: from above they
 * read as a run of thin dark lines and vertical posts along both pavements, so
 * the model builds them as a slab, two rails and a row of slim balusters at
 * every residential floor. Longer and flatter than Bo-Kaap — about 160 m of
 * frontage on each side, and nothing on a slope.
 */
function longStreet(): LandmarkModel {
  const k = model();

  const ROAD = 0x4a5058;
  const PAVEMENT = 0xd6c39c;
  const TRIM = 0xcbb894;
  const GLASS = 0x2b3a4a;
  const IRON = 0x4a5058; // the balconies are almost always painted dark
  const CANOPY = 0x8d5140;
  const WALLS = [0xefe3c8, 0xe8dcc0, 0xf0e6d2, 0xe4d2ab, 0xdfc9a8, 0xd6c39c];
  const ROOFS = [0xb5563f, 0x8d5140, 0x5a6472];

  const PITCH = 18; // one building plot along the street
  const N = 9; // nine plots a side, so a continuous terrace
  const STOREY = 3.5;
  const SHOP = 3.6; // height of the shopfronts at ground level
  const FACE = 10; // the building line, back from the middle of the road
  const DEPTH = 13;
  const X = FACE + DEPTH / 2;
  const RUN = N * PITCH;
  const STOREYS = [4, 3, 4, 3, 4, 3, 4, 3, 3];

  // Carriageway and the two pavements, so the terraces have a street to front.
  k.add(k.box(13, 0.16, RUN, ROAD), 0, 0.08, 0);
  for (const s of [-1, 1]) k.add(k.box(3.5, 0.36, RUN, PAVEMENT), s * 8.25, 0.18, 0);

  for (let i = 0; i < N; i++) {
    const z = (RUN - PITCH) / 2 - i * PITCH;
    const storeys = STOREYS[i];
    const h = storeys * STOREY;

    for (const s of [-1, 1]) {
      const wall = WALLS[(i * 2 + (s > 0 ? 0 : 1)) % WALLS.length];
      const x = s * X;

      k.block(DEPTH, h, PITCH, wall, x, z);
      k.gable(PITCH, DEPTH, 3, ROOFS[(i + (s > 0 ? 1 : 0)) % ROOFS.length], x, h, z, Math.PI / 2);
      // A cornice, which is what stops a shopfront terrace reading as a shed.
      k.add(k.box(DEPTH + 0.8, 0.7, PITCH + 0.8, TRIM), x, h + 0.2, z);

      // Shopfronts: a stall riser, tall glazing, and a canopy over the pavement.
      k.add(k.box(0.6, 0.5, PITCH - 1.6, TRIM), s * (FACE - 0.1), 0.25, z);
      k.add(k.box(0.5, SHOP - 0.9, PITCH - 1.8, GLASS), s * (FACE - 0.2), (SHOP - 0.9) / 2 + 0.5, z);
      k.add(k.box(1.7, 0.25, PITCH - 1.4, CANOPY), s * (FACE - 0.85), SHOP - 0.15, z);

      // Sash windows over the shops.
      const upper = k.facade(PITCH - 0.8, h - SHOP - 0.7, storeys - 1, 4, wall, GLASS, s * FACE, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      upper.position.y = SHOP;

      // The iron lace. A slab to stand on, a rail and a run of slim balusters
      // at every floor above the shops: cheap to build, and the texture it makes
      // from above is the read of the whole street.
      for (let f = 1; f < storeys; f++) {
        const y = SHOP + (f - 1) * STOREY;
        k.add(k.box(1.5, 0.22, PITCH - 1.6, TRIM), s * (FACE - 0.75), y + 0.11, z);
        for (const railY of [0.55, 1.0]) {
          k.add(k.box(0.14, 0.12, PITCH - 1.6, IRON), s * (FACE - 1.45), y + railY, z);
        }
        for (let b = 0; b < 7; b++) {
          const bz = z - (PITCH - 3.2) / 2 + ((PITCH - 3.2) / 6) * b;
          k.add(k.box(0.12, 1.1, 0.12, IRON), s * (FACE - 1.45), y + 0.55, bz);
        }
      }

      // Slim iron posts carrying the balconies up from the pavement.
      const topY = SHOP + (storeys - 2) * STOREY + 1;
      for (const dz of [-6, 0, 6]) k.column(0.15, topY, IRON, s * (FACE - 1.45), z + dz, 6);
    }
  }

  return { group: k.group, radius: 86, height: 18 };
}

/**
 * Greenmarket Square: laid out in 1696, a produce market, a slave market, and
 * now a daily craft market.
 *
 * A paved square with the 1755 Old Town House closing one end and a range of
 * commercial blocks along the other, and in between a grid of small stalls
 * under coloured canopies around a central fountain. From above the square is
 * the plate and the market is the grid of coloured roofs on it, so the stalls
 * are laid out on a regular grid and the canopies alternate in colour rather
 * than being scattered.
 */
function greenmarketSquare(): LandmarkModel {
  const k = model();

  const COBBLE = 0x9a9384;
  const STONE = 0xefe3c8;
  const STONE_2 = 0xe8dcc0;
  const OTHER = 0xd6c39c;
  const TRIM = 0xcbb894;
  const ROOF = 0x8d5140;
  const GLASS = 0x2b3a4a;
  const WATER = 0x2f7fa8;
  const TRUNK = 0x6b5a45;
  const LEAF = 0x3f8f33;
  const WOOD = 0x6b5a45;
  const LAMP = 0x4a5058;
  const CANOPY = [0xc94f4f, 0xd9a441, 0x4f8fc0, 0x5f8f78, 0xd97b4f, 0x8a6fb0, 0xe07a5f, 0x54b8b0];

  // The paved plate, with a kerb around its edge.
  k.add(k.box(60, 0.16, 56, COBBLE), 0, 0.08, 0);
  for (const s of [-1, 1]) {
    k.add(k.box(62, 0.34, 0.9, TRIM), 0, 0.17, s * 28.2);
    k.add(k.box(0.9, 0.34, 54, TRIM), s * 30.2, 0.17, 0);
  }

  // The Old Town House: Cape Rococo, 1755, closing the western side of the
  // square with a pediment gable and a clock over the front door.
  const thX = -37;
  k.block(14, 11, 26, STONE, thX, 0);
  k.add(k.box(15, 1.1, 27, TRIM), thX, 11.2, 0);
  k.gable(26, 14, 3.6, ROOF, thX, 11.6, 0, Math.PI / 2);
  const thFront = k.facade(22, 6.4, 2, 5, STONE, GLASS, -30, 0, Math.PI / 2);
  thFront.position.y = 3.4;
  k.add(k.box(2.2, 0.5, 7, TRIM), -29, 0.25, 0); // stoep at the entrance
  k.add(k.box(0.7, 3, 2.6, WOOD), -29.7, 1.5, 0); // the door

  // The gable, as a three-sided cone turned so its flat face looks out over the
  // square. A cone of three sides is a triangular prism's wedge: exactly the
  // silhouette of a Cape pediment.
  const pediment = k.cone(6, 4.2, TRIM, 3);
  pediment.rotation.y = -Math.PI / 2;
  k.add(pediment, -33, 13.3, 0);
  // The clock, on the face of the gable.
  const dial = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), new THREE.MeshBasicMaterial({ color: 0xf6f1e4 }));
  dial.position.set(-29.85, 13.3, 0);
  dial.lookAt(-20, 13.3, 0);
  k.group.add(dial);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), new THREE.MeshBasicMaterial({ color: 0x2a2f36 }));
  clockFace.position.set(-29.8, 13.3, 0);
  clockFace.lookAt(-20, 13.3, 0);
  k.group.add(clockFace);
  // A little bell turret on the ridge.
  k.add(k.cyl(1.2, 1.5, 3.2, TRIM, 8), thX, 16.6, 0);
  k.add(k.dome(2, 0x5f8f78), thX, 18.2, 0);
  k.add(k.ball(0.6, 0xd9b44a), thX, 20.5, 0);

  // The commercial range opposite: interwar blocks with flat roofs and stepped
  // Art Deco parapets, which is what makes the square an enclosure.
  for (const [wall, h, z, w] of [
    [STONE_2, 12, -17, 18],
    [OTHER, 14, 0, 14],
    [STONE_2, 12, 17, 18],
  ] as [number, number, number, number][]) {
    k.block(12, h, w, wall, 36, z);
    k.add(k.box(12.8, 1.0, w + 0.8, OTHER), 36, h + 0.5, z);
    k.add(k.box(6, 1.8, 5, OTHER), 36, h + 1.4, z);
    const front = k.facade(w - 2, h - 4, 3, 4, wall, GLASS, 30, z, -Math.PI / 2);
    front.position.y = 3.2;
    k.add(k.box(0.5, 2.6, w - 2, GLASS), 29.8, 1.3, z);
  }

  // The fountain at the centre, where the market's two axes cross.
  k.add(k.cyl(4.6, 4.8, 1, STONE, 20), 0, 0.5, 0);
  k.plate(4.2, WATER, 0, 0, 20, 1.02);
  k.add(k.cyl(0.9, 1.2, 2.2, TRIM, 12), 0, 2.1, 0);
  k.add(k.cyl(2.2, 1, 0.7, STONE, 16), 0, 3.5, 0);
  k.add(k.cyl(0.5, 0.6, 1.2, TRIM, 8), 0, 4.4, 0);
  k.add(k.ball(0.7, 0xd9b44a), 0, 5.4, 0);

  // The craft market: a grid of stalls, each a counter under a pitched canopy
  // on four posts. The canopies alternate colour, so the grid reads as a patch
  // of small coloured roofs from above.
  const COLS = [-18, -6, 6, 18];
  const ROWS = [-19, -9.5, 9.5, 19];
  COLS.forEach((sx, ci) => {
    ROWS.forEach((sz, ri) => {
      const colour = CANOPY[(ci * 2 + ri) % CANOPY.length]!;
      k.add(k.box(3.2, 0.95, 2.6, TRIM), sx, 0.48, sz);
      for (const dx of [-1.5, 1.5]) {
        for (const dz of [-1.1, 1.1]) k.column(0.09, 2.6, WOOD, sx + dx, sz + dz, 6);
      }
      k.gable(3.8, 3, 1.1, colour, sx, 2.6, sz, (ci + ri) % 2 === 0 ? 0 : Math.PI / 2);
    });
  });

  // Trees along the two long edges, where there is room for them.
  for (const s of [-1, 1]) {
    for (const [tx, tz] of [
      [25, -22],
      [25, 0],
      [25, 22],
      [10, 25.5],
    ] as [number, number][]) {
      const x = s * tx;
      k.column(0.28, 3.4, TRUNK, x, tz, 7, 0.8);
      k.add(k.ball(1.9, LEAF, 10, 8), x, 4.2, tz);
      k.add(k.ball(1.4, 0x357a2c, 10, 8), x - 0.7, 5.3, tz + 0.5);
      k.add(k.ball(1.2, LEAF, 10, 8), x + 0.8, 5.5, tz - 0.6);
    }
  }

  // Six lamps around the fountain, because the square is lit at night.
  for (const [lx, lz] of [
    [12, 0],
    [-12, 0],
    [0, 12],
    [0, -12],
    [8.5, 8.5],
    [-8.5, -8.5],
  ] as [number, number][]) {
    k.column(0.15, 4.2, LAMP, lx, lz, 6);
    k.add(k.ball(0.35, 0xf6f1e4, 8, 6), lx, 4.4, lz);
  }

  return { group: k.group, radius: 52, height: 21 };
}

/**
 * Auwal Mosque: Dorp Street, 1794, the first mosque in South Africa.
 *
 * Tuan Guru's mosque is a house-sized building in a residential street, not a
 * monument — plain walls, a small dome, a walled courtyard with a tree. The one
 * element that has to be findable from the air is the slender minaret with its
 * balcony, so the model keeps everything else low and quiet and lets the
 * minaret carry the silhouette.
 */
function auwalMosque(): LandmarkModel {
  const k = model();

  const WALL = 0xf0e6d2;
  const TRIM = 0xd6c39c;
  const GREEN = 0x5f8f78;
  const GLASS = 0x2b3a4a;
  const DARK = 0x3a2c22;
  const PAVE = 0xc9bda0;
  const WATER = 0x2f7fa8;
  const TRUNK = 0x6b5a45;
  const LEAF = 0x3f8f33;

  const MW = 20; // width of the prayer hall
  const MD = 11; // depth
  const MH = 6.4; // eaves height
  const MZ = -13.5; // the hall sits at the back of the plot

  // A hard arch, as a cylinder of half a turn laid so its springing is level.
  const arch = (r: number, depth: number, colour: number): THREE.Mesh => {
    const geo = new THREE.CylinderGeometry(r, r, depth, 12, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    geo.rotateY(Math.PI / 2);
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colour, flatShading: true }));
  };

  // The courtyard, paved, with a low wall around it and a gate on the street.
  k.add(k.box(28, 0.14, 38, PAVE), 0, 0.07, -1);
  k.add(k.box(28, 2.2, 0.6, WALL), 0, 1.1, 16.2); // the street wall
  k.add(k.box(0.6, 2.2, 36, WALL), 14, 1.1, -1.8);
  k.add(k.box(0.6, 2.2, 36, WALL), -14, 1.1, -1.8);
  // The gateway: two piers with a lintel over the gap.
  for (const gx of [-3.6, 3.6]) k.add(k.box(1, 3.2, 1, TRIM), gx, 1.6, 16.2);
  k.add(k.box(4.2, 3.2, 1, WALL), 0, 1.6, 16.2);
  k.add(k.box(8.6, 0.9, 1.2, TRIM), 0, 3.65, 16.2);

  // The prayer hall, with a parapet and a small dome.
  k.block(MW, MH, MD, WALL, 0, MZ);
  k.add(k.box(MW + 1, 0.8, MD + 1, TRIM), 0, MH + 0.4, MZ);
  k.add(k.cyl(3.4, 3.6, 1.2, WALL, 12), 0, MH + 0.8, MZ);
  k.add(k.dome(3.4, GREEN), 0, MH + 1.4, MZ);
  k.add(k.cyl(0.18, 0.3, 1.6, GREEN, 6), 0, MH + 5.4, MZ);
  k.add(k.ball(0.4, 0xd9b44a), 0, MH + 6.4, MZ);

  // Two tall windows high in the wall, and the arched entrance between them on
  // the courtyard side. The door is the one piece of ornament the plain street
  // facade allows itself.
  const front = MZ + MD / 2 + 0.1;
  const windows = k.facade(14, 3, 1, 2, WALL, GLASS, 0, front, 0);
  windows.position.y = 3.4;
  k.add(k.box(3, 2.4, 0.9, DARK), 0, 1.2, front);
  k.add(arch(1.9, 1.3, TRIM), 0, 2.4, front);
  k.add(arch(1.5, 1.0, DARK), 0, 2.4, front);
  for (const dx of [-1.72, 1.72]) k.add(k.box(0.5, 2.4, 1.3, TRIM), dx, 1.2, front);

  // The minaret, at the front corner of the hall: the one vertical accent.
  const mx = 8.8;
  const mz = MZ + MD / 2 - 1;
  k.add(k.cyl(1.1, 1.4, 4.5, WALL, 10), mx, 2.25, mz);
  k.add(k.cyl(0.85, 1, 9, WALL, 10), mx, 9, mz);
  k.add(k.cyl(1.9, 1.9, 0.4, GREEN, 12), mx, 13.7, mz); // the balcony
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(k.box(0.14, 0.8, 0.14, TRIM), mx + Math.sin(a) * 1.7, 14.3, mz + Math.cos(a) * 1.7);
  }
  k.add(k.cyl(0.6, 0.75, 3.2, WALL, 10), mx, 15.9, mz);
  k.add(k.dome(1.3, GREEN), mx, 17.5, mz); // the dome cap
  k.add(k.cyl(0.1, 0.18, 1, GREEN, 6), mx, 19.3, mz);
  k.add(k.ball(0.3, 0xd9b44a), mx, 19.9, mz);

  // The courtyard: a tree, and the ablution basin by the wall.
  k.column(0.4, 3.6, TRUNK, -7.5, 8, 8, 0.8);
  k.add(k.ball(2.6, LEAF, 12, 9), -7.5, 5.2, 8);
  k.add(k.ball(1.8, 0x357a2c, 10, 8), -9.2, 6.4, 9.2);
  k.add(k.box(5, 0.7, 3.2, TRIM), 8, 0.35, 9);
  k.add(k.box(4.4, 0.24, 2.6, WATER), 8, 0.74, 9);

  return { group: k.group, radius: 27, height: 20 };
}

/**
 * The Old Biscuit Mill: Pyott's 1914 biscuit works on Albert Road, now studios
 * and the Saturday market.
 *
 * A courtyard of brick sheds with sawtooth north-light roofs, a chimney stack
 * and the market in the yard. The sawtooth is the signature — a run of hard
 * parallel ridges over every roof — so each roof is built as a row of triangular
 * prisms, which is both the cheapest way to build it and exactly what the eye is
 * looking for from above.
 */
function oldBiscuitMill(): LandmarkModel {
  const k = model();

  const BRICK = 0x8d5140;
  const BAND = 0xb5563f;
  const TRIM = 0xd6c39c;
  const GLASS = 0x2b3a4a;
  const SLATE = 0x5a6472;
  const PAVE = 0x9a9384;
  const WOOD = 0x6b5a45;
  const CANOPY = [0xd6c39c, 0x5f8f78, 0xb5563f, 0xe4d2ab];

  /**
   * A sawtooth prism: a triangular ridge running across the roof. A three-sided
   * cylinder is a triangular prism, so one mesh per tooth does the job — turned
   * and scaled to the roof it sits on, with the ridge along Z when the range
   * runs along X.
   */
  const prism = (across: number, rise: number, pitch: number, ridgeAlongZ: boolean): THREE.CylinderGeometry => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 3);
    geo.rotateZ(Math.PI / 2);
    geo.rotateX(-Math.PI / 2); // now the flat face is down and the apex up
    geo.scale(across, rise / 1.5, pitch / Math.sqrt(3));
    if (ridgeAlongZ) geo.rotateY(Math.PI / 2);
    return geo;
  };

  /** A run of teeth along the long axis of a range, starting at its eaves. */
  const sawtooth = (
    cx: number,
    cz: number,
    alongZ: boolean,
    run: number,
    across: number,
    base: number,
    rise: number,
    teeth: number,
  ): void => {
    const geo = prism(across, rise, run / teeth, !alongZ);
    const mat = new THREE.MeshLambertMaterial({ color: SLATE, flatShading: true });
    for (let i = 0; i < teeth; i++) {
      const t = -run / 2 + (run / teeth) * (i + 0.5);
      const mesh = new THREE.Mesh(geo, mat);
      k.add(mesh, alongZ ? cx : cx + t, base + rise / 3, alongZ ? cz + t : cz);
    }
  };

  // The yard, and the three ranges around it: two long ones down the sides and
  // one across the back, open to the street at the front.
  k.add(k.box(62, 0.14, 66, PAVE), 0, 0.07, -5);

  k.block(13, 12, 48, BRICK, -24, 0); // west range
  k.add(k.box(13.6, 0.8, 48.6, BAND), -24, 12.1, 0);
  sawtooth(-24, 0, true, 48, 13, 12.4, 2.6, 8);

  k.block(13, 11, 36, BRICK, 24, -6); // east range, shorter, leaving the gate
  k.add(k.box(13.6, 0.8, 36.6, BAND), 24, 11.1, -6);
  sawtooth(24, -6, true, 36, 13, 11.4, 2.4, 6);

  k.block(48, 13, 12, BRICK, 0, -31); // north range
  k.add(k.box(48.6, 0.8, 12.6, BAND), 0, 13.1, -31);
  sawtooth(0, -31, false, 48, 12, 13.4, 2.6, 8);

  // Tall industrial windows facing into the yard.
  const west = k.facade(44, 8.4, 3, 9, BRICK, GLASS, -17.4, 0, Math.PI / 2);
  west.position.y = 2.4;
  const east = k.facade(32, 7.8, 3, 7, BRICK, GLASS, 17.4, -6, -Math.PI / 2);
  east.position.y = 2.2;
  const north = k.facade(44, 9, 3, 9, BRICK, GLASS, 0, -24.9, 0);
  north.position.y = 2.6;

  // The chimney stack at the corner of the two ranges: the mill's landmark.
  k.add(k.cyl(2.2, 3, 26, BRICK, 12), -21, 13, -21);
  k.add(k.cyl(2.4, 2.4, 1, BAND, 12), -21, 26, -21);
  k.add(k.cyl(2, 2.4, 1.2, 0x4a5058, 12), -21, 27.1, -21);

  // The market in the yard: small stalls under pitched canopies.
  for (let i = 0; i < 9; i++) {
    const sx = -11 + (i % 3) * 11;
    const sz = -14 + Math.floor(i / 3) * 12;
    k.add(k.box(3.2, 0.95, 2.6, TRIM), sx, 0.48, sz);
    for (const dx of [-1.5, 1.5]) {
      for (const dz of [-1.1, 1.1]) k.column(0.1, 2.6, WOOD, sx + dx, sz + dz, 6);
    }
    k.gable(3.8, 3, 1.1, CANOPY[i % CANOPY.length]!, sx, 2.6, sz, i % 2 === 0 ? 0 : Math.PI / 2);
  }

  // The gate from Albert Road, between two brick piers with the old name over
  // them.
  for (const gx of [-5.5, 5.5]) k.block(1.4, 4.6, 1.4, BRICK, gx, 24);
  k.add(k.box(12.4, 1.3, 1.1, BAND), 0, 5.25, 24);
  k.add(k.box(7, 1.1, 0.3, 0xf0e6d2), 0, 5.25, 24.6);

  return { group: k.group, radius: 48, height: 28 };
}

register("bo-kaap", boKaap);
register("long-street", longStreet);
register("greenmarket-square", greenmarketSquare);
register("auwal-mosque", auwalMosque);
register("old-biscuit-mill", oldBiscuitMill);
