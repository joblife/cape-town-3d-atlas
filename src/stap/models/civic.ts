/**
 * Civic Cape Town: the fort, the halls and the cathedral.
 *
 * The oldest and most formal buildings in the city, and the ones with the
 * strongest silhouettes — which is what the diorama camera reads.
 */

import * as THREE from "three";
import { model, register, type LandmarkModel } from "./types.ts";

/**
 * The Castle of Good Hope: a five-bastion star fort of 1666.
 *
 * The most distinctive plan in the city, and the one that most rewards being
 * seen from above — a pentagon with a diamond bastion at each corner is
 * unmistakable in outline, so the model leads with that and puts the detail
 * inside it. Real extent about 190 m across the points.
 */
function castle(): LandmarkModel {
  const k = model();
  const STONE = 0xe4d2ab;
  const STONE_DARK = 0xc9b189;
  const ROOF = 0xb5563f;
  const GLASS = 0x2b3a4a;

  const R = 82; // pentagon circumradius, so ~160 m between opposite bastions

  // The moat, as a ring of water the fort sits inside.
  const moat = new THREE.Mesh(
    new THREE.RingGeometry(R * 1.24, R * 1.5, 10),
    new THREE.MeshLambertMaterial({ color: 0x2f7fa8, side: THREE.DoubleSide }),
  );
  moat.rotation.x = -Math.PI / 2;
  k.add(moat, 0, 0.05, 0);

  // The five curtain walls, with a bastion at each vertex.
  const wallH = 11;
  const apexes: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    // -90° so a vertex points at +Z, giving a bastion in front as you approach.
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    apexes.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
  }

  for (let i = 0; i < 5; i++) {
    const a = apexes[i];
    const b = apexes[(i + 1) % 5];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);

    // Curtain wall between the bastions.
    const wall = k.box(len, wallH, 5.5, STONE);
    k.add(wall, mid.x, wallH / 2, mid.z, yaw);
    // A parapet, so the wall has a lip from above.
    const parapet = k.box(len, 1.5, 6.6, STONE_DARK);
    k.add(parapet, mid.x, wallH + 0.75, mid.z, yaw);

    // The bastion: a diamond shouldering out of the corner, the shape that
    // makes a star fort a star fort.
    const bastion = new THREE.Group();
    const outX = a.x * 0.26;
    const outZ = a.z * 0.26;
    const tip = k.box(26, wallH + 1.5, 26, STONE);
    k.add(tip, 0, 0, 0);
    tip.rotation.y = Math.PI / 4;
    const tipParapet = k.box(30, 1.5, 30, STONE_DARK);
    k.add(tipParapet, 0, wallH + 0.75, 0);
    tipParapet.rotation.y = Math.PI / 4;
    k.add(bastion, a.x + outX, 0, a.z + outZ, Math.atan2(outZ, outX));
    k.group.add(bastion);
  }

  // Inside: the Kat balcony range and the long barrack blocks, which is what you
  // actually see over the walls.
  for (const [w, d, h, x, z, yaw] of [
    [74, 13, 13, 0, 21, 0],
    [13, 62, 12, -28, -4, 0],
    [13, 62, 12, 28, -4, 0],
    [64, 12, 11, 0, -34, 0],
  ] as [number, number, number, number, number, number][]) {
    k.block(w, h, d, STONE, x, z, yaw);
    k.gable(w, d, 3.4, ROOF, x, h, z, yaw);
    k.facade(w * 0.86, h * 0.6, 2, Math.max(3, Math.round(w / 9)), STONE, GLASS, x, z + d / 2 + 0.1, yaw);
  }

  // The inner courtyard, and the well at its centre.
  k.plate(26, 0xd8c9a4, 0, 2, 24, 0.08);
  k.column(1.6, 3, STONE_DARK, 0, 2, 10);

  // The bell tower over the Kat: the fort's one vertical accent.
  k.column(4.4, 20, STONE, 0, 33, 8, 0.72);
  k.add(k.cone(5.4, 6, ROOF, 8), 0, 23, 33);
  k.add(k.ball(1.1, 0xd9b44a), 0, 27.4, 33);

  return { group: k.group, radius: R * 1.6, height: 30 };
}

/**
 * Cape Town City Hall: Edwardian, 1905, with the clock tower Mandela spoke from.
 *
 * Reads as a long symmetrical civic frontage with a tower on one end — the
 * asymmetry is the point, and it is what distinguishes it from Parliament.
 */
function cityHall(): LandmarkModel {
  const k = model();
  const STONE = 0xefe3c8;
  const TRIM = 0xd6c39c;
  const ROOF = 0x8d5140;
  const GLASS = 0x2b3a4a;

  const W = 74;
  const D = 30;
  const H = 17;

  k.block(W, H, D, STONE, 0, 0);
  k.gable(W, D, 4.2, ROOF, 0, H, 0);
  // A cornice, which is most of what makes a civic facade read as civic.
  k.add(k.box(W + 2.4, 1.2, D + 2.4, TRIM), 0, H + 0.4, 0);

  // The portico: six columns and a pediment, dead centre.
  const portico = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const x = -9 + i * 3.6;
    const col = k.cyl(0.9, 1.05, 11, STONE, 10);
    k.add(col, x, 5.5, 0);
    k.group.add(portico);
  }
  k.add(portico, 0, 0, D / 2 + 2.6);
  k.add(k.box(24, 1.6, 6, TRIM), 0, 11.6, D / 2 + 2.6);
  const pediment = new THREE.Mesh(new THREE.ConeGeometry(13, 3.4, 3), new THREE.MeshLambertMaterial({ color: TRIM, flatShading: true }));
  pediment.rotation.y = Math.PI / 2;
  k.add(pediment, 0, 14.1, D / 2 + 2.6);

  // Windows along both long faces.
  k.facade(W * 0.84, H * 0.62, 3, 9, STONE, GLASS, 0, D / 2 + 0.12);
  k.facade(W * 0.84, H * 0.62, 3, 9, STONE, GLASS, 0, -D / 2 - 0.12, Math.PI);

  // The clock tower, on the right-hand end, 61 m to the finial.
  const towerX = W / 2 - 4;
  k.column(6.2, 30, STONE, towerX, D / 2 - 2, 12, 0.84);
  k.add(k.box(14, 1.4, 14, TRIM), towerX, 30.6, D / 2 - 2);
  // The clock faces.
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 16),
      new THREE.MeshBasicMaterial({ color: 0xf6f1e4 }),
    );
    const a = (i / 4) * Math.PI * 2;
    face.position.set(towerX + Math.sin(a) * 5.4, 26, D / 2 - 2 + Math.cos(a) * 5.4);
    face.lookAt(towerX + Math.sin(a) * 20, 26, D / 2 - 2 + Math.cos(a) * 20);
    k.group.add(face);
  }
  // A green copper dome, as the real tower has.
  k.add(k.dome(6, 0x5f8f78), towerX, 31.3, D / 2 - 2);
  k.add(k.cyl(0.5, 1.4, 5, 0x5f8f78, 8), towerX, 37, D / 2 - 2);
  k.add(k.ball(1, 0xd9b44a), towerX, 40, D / 2 - 2);

  return { group: k.group, radius: W * 0.72, height: 41 };
}

/**
 * The Houses of Parliament: Victorian Gothic, 1884, and the seat of the national
 * legislature. Long, with a central dome and two wings.
 */
function parliament(): LandmarkModel {
  const k = model();
  const STONE = 0xe8dcc0;
  const TRIM = 0xcbb894;
  const ROOF = 0x6f5a4c;
  const GLASS = 0x2b3a4a;

  const W = 86;
  const D = 34;
  const H = 16;

  k.block(W, H, D, STONE, 0, 0);
  k.add(k.box(W + 2, 1.1, D + 2, TRIM), 0, H + 0.35, 0);
  k.gable(W * 0.34, D, 3.6, ROOF, -W * 0.31, H, 0);
  k.gable(W * 0.34, D, 3.6, ROOF, W * 0.31, H, 0);

  // The central block rises above the wings and carries the dome.
  k.block(W * 0.2, H + 7, D + 5, STONE, 0, 0);
  k.gable(W * 0.2, D + 5, 3, ROOF, 0, H + 7, 0);
  k.add(k.dome(9, 0x6f8f7f), 0, H + 10, 0);
  k.add(k.cyl(0.4, 1.2, 6, 0x6f8f7f, 8), 0, H + 19, 0);
  k.add(k.ball(0.8, 0xd9b44a), 0, H + 22.4, 0);

  k.facade(W * 0.9, H * 0.6, 3, 11, STONE, GLASS, 0, D / 2 + 0.12);
  k.facade(W * 0.9, H * 0.6, 3, 11, STONE, GLASS, 0, -D / 2 - 0.12, Math.PI);

  // Two corner turrets, for the Gothic read.
  for (const x of [-W * 0.34, W * 0.34]) {
    k.column(3.2, H + 9, STONE, x, D / 2 - 3, 10, 0.8);
    k.add(k.cone(3.8, 6, ROOF, 8), x, H + 12, D / 2 - 3);
  }

  return { group: k.group, radius: W * 0.7, height: 39 };
}

/**
 * St George's Cathedral: the "people's cathedral", where Tutu preached.
 *
 * A Gothic nave with a bell tower and a spire — the spire is the landmark.
 */
function stGeorges(): LandmarkModel {
  const k = model();
  const STONE = 0xefe6d2;
  const SLATE = 0x5a6472;
  const GLASS = 0x37506b;

  const L = 54;
  const W = 20;
  const H = 15;

  // Nave.
  k.block(W, H, L, STONE);
  k.gable(W, L, 6, SLATE, 0, H, 0, Math.PI / 2);
  // A clerestory, so the nave is not one flat wall.
  k.block(W + 2.2, 4, L * 0.8, STONE, 0, 0);
  k.gable(W + 2.2, L * 0.8, 2.4, SLATE, 0, H + 4, 0, Math.PI / 2);

  k.facade(L * 0.72, 6, 2, 6, STONE, GLASS, W / 2 + 0.1, 0, Math.PI / 2);
  k.facade(L * 0.72, 6, 2, 6, STONE, GLASS, -W / 2 - 0.1, 0, Math.PI / 2);

  // Bell tower at the west end, with a spire above it.
  const towerZ = -L / 2 - 4;
  k.block(11, 30, 11, STONE, 0, towerZ);
  k.add(k.box(13, 1.4, 13, SLATE), 0, 30.4, towerZ);
  k.add(k.cone(8, 22, SLATE, 4), 0, 41, towerZ);
  k.add(k.cyl(0.3, 0.6, 4, SLATE, 6), 0, 54, towerZ);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const opening = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 6),
      new THREE.MeshBasicMaterial({ color: 0x1e2a38 }),
    );
    opening.position.set(Math.sin(a) * 5.6, 24, towerZ + Math.cos(a) * 5.6);
    opening.lookAt(Math.sin(a) * 20, 24, towerZ + Math.cos(a) * 20);
    k.group.add(opening);
  }

  return { group: k.group, radius: 40, height: 56 };
}

/**
 * The Clock Tower at the Victoria Basin: the red harbour control tower of 1882.
 *
 * Small, but the one thing on the waterfront that reads as a landmark from
 * above: a red octagon with a white clock stage and a gabled cap.
 */
function clockTower(): LandmarkModel {
  const k = model();
  const RED = 0xa8402f;
  const CREAM = 0xf0e6d2;
  const SLATE = 0x4a5058;

  // An octagonal base, then the clock stage, then a pyramidal roof.
  k.column(4.6, 12, RED, 0, 0, 8, 0.92);
  k.add(k.cyl(5.2, 5.2, 1, CREAM, 8), 0, 12.5, 0);
  k.column(4.4, 9, CREAM, 0, 0, 8, 1);
  k.add(k.cyl(5, 5, 0.9, RED, 8), 0, 22.4, 0);

  // Clock faces on all four sides.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 16),
      new THREE.MeshBasicMaterial({ color: 0x2a2f36 }),
    );
    face.position.set(Math.sin(a) * 4.5, 18, Math.cos(a) * 4.5);
    face.lookAt(Math.sin(a) * 24, 18, Math.cos(a) * 24);
    k.group.add(face);
  }

  k.add(k.cone(5.6, 7, SLATE, 8), 0, 26.5, 0);
  k.add(k.ball(0.7, 0xd9b44a), 0, 30.2, 0);

  return { group: k.group, radius: 12, height: 31 };
}

register("castle-of-good-hope", castle);
register("city-hall", cityHall);
register("parliament", parliament);
register("st-georges-cathedral", stGeorges);
register("clock-tower", clockTower);
