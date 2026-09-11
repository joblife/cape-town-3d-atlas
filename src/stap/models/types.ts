/**
 * Bespoke landmark models.
 *
 * Each landmark gets a purpose-built model, generated procedurally, standing on
 * its own footprint. This is the reason the diorama is worth looking at: generic
 * extruded blocks say "a city", and a five-bastion star fort, a grain silo carved
 * into a museum and a stadium bowl say *this* city. The reference does the same
 * thing with authored Blender models; these are parametric equivalents, built
 * from primitives at runtime so nothing has to be downloaded.
 *
 * Rules for every model:
 *
 * - **Metres**, matching the city. A model that is 60 m across in reality must be
 *   60 m across here, or it will not sit in its own street.
 * - **Origin at the ground, centred on the landmark's coordinate.** The city
 *   places the group; the model does not place itself.
 * - **Front faces +Z.** The city may rotate the group to face a road.
 * - **Low-poly and flat-shaded**, consistent with the rest of the scene. Curves
 *   are cheap: 12–24 radial segments is plenty at diorama scale.
 * - **The silhouette comes first.** From a diorama camera the outline is what
 *   identifies a place; detail is for when the camera comes close.
 * - **A landmark must read as the largest thing in its own neighbourhood.**
 *   Overscale before underscale — a model that disappears among the generic
 *   blocks has failed at its only job.
 */

import * as THREE from "three";

export interface LandmarkModel {
  /** The model, at the right size, origin at ground level, facing +Z. */
  group: THREE.Group;
  /** Approximate footprint radius in metres, for framing and clearance. */
  radius: number;
  /** Total height in metres. */
  height: number;
}

export type LandmarkBuilder = () => LandmarkModel;

/* ── the kit ───────────────────────────────────────────────────────── */

/**
 * Primitives, all flat-shaded and all positioned by the caller.
 *
 * A model is written as a list of these in a group, which keeps each landmark's
 * code readable as a description of the building.
 */
export class Kit {
  readonly group: THREE.Group = new THREE.Group();

  private mat(colour: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: colour, flatShading: true });
  }

  /** Add a mesh to the model at a position, optionally turned about Y. */
  add(mesh: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0): THREE.Object3D {
    mesh.position.set(x, y, z);
    if (yaw) mesh.rotation.y = yaw;
    this.group.add(mesh);
    return mesh;
  }

  box(w: number, h: number, d: number, colour: number): THREE.Mesh {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(colour));
  }

  /** A blocky slab standing on the ground: the workhorse for a building mass. */
  block(w: number, h: number, d: number, colour: number, x = 0, z = 0, yaw = 0): THREE.Mesh {
    const mesh = this.box(w, h, d, colour);
    this.add(mesh, x, h / 2, z, yaw);
    return mesh;
  }

  cyl(rTop: number, rBottom: number, h: number, colour: number, radial = 16): THREE.Mesh {
    return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, radial), this.mat(colour));
  }

  /** A column standing on the ground. */
  column(r: number, h: number, colour: number, x: number, z: number, radial = 16, taper = 1): THREE.Mesh {
    const mesh = this.cyl(r * taper, r, h, colour, radial);
    this.add(mesh, x, h / 2, z);
    return mesh;
  }

  /** A cone, for spires and roofs. */
  cone(r: number, h: number, colour: number, radial = 12): THREE.Mesh {
    return new THREE.Mesh(new THREE.ConeGeometry(r, h, radial), this.mat(colour));
  }

  ball(r: number, colour: number, widthSeg = 16, heightSeg = 12): THREE.Mesh {
    return new THREE.Mesh(new THREE.SphereGeometry(r, widthSeg, heightSeg), this.mat(colour));
  }

  /** The top half of a sphere: a dome, sitting on its rim. */
  dome(r: number, colour: number, widthSeg = 18, heightSeg = 10): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, widthSeg, heightSeg, 0, Math.PI * 2, 0, Math.PI / 2),
      this.mat(colour),
    );
  }

  /** A flat plate lying on the ground: paving, a lawn, a water surface. */
  plate(r: number, colour: number, x = 0, z = 0, segments = 28, y = 0.06): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, segments), this.mat(colour));
    mesh.rotation.x = -Math.PI / 2;
    this.add(mesh, x, y, z);
    return mesh;
  }

  /**
   * A facade: a wall panel with rows of windows.
   *
   * The single highest-value detail in the whole kit. Windows are what separate
   * a building from a box, and one panel per facade is two draw calls (wall and
   * glass) however many windows it carries, because the glazing is one plane.
   */
  facade(
    width: number,
    height: number,
    rows: number,
    cols: number,
    wall: number,
    glass: number,
    x = 0,
    z = 0,
    yaw = 0,
  ): THREE.Group {
    const group = new THREE.Group();

    const wallMesh = this.box(width, height, Math.max(0.4, width * 0.06), wall);
    this.add(wallMesh, 0, height / 2, 0);
    group.add(wallMesh);

    // The glazing sits a hair proud of the wall so it never z-fights.
    const paneW = (width / cols) * 0.56;
    const paneH = (height / rows) * 0.52;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pane = new THREE.Mesh(
          new THREE.PlaneGeometry(paneW, paneH),
          new THREE.MeshBasicMaterial({ color: glass }),
        );
        pane.position.set(
          -width / 2 + (width / cols) * (c + 0.5),
          (height / rows) * (r + 0.62),
          Math.max(0.21, width * 0.031),
        );
        group.add(pane);
      }
    }

    this.add(group, x, 0, z, yaw);
    return group;
  }

  /** A gabled roof, as two slabs meeting at a ridge. */
  gable(width: number, depth: number, rise: number, colour: number, x = 0, y = 0, z = 0, yaw = 0): THREE.Group {
    const group = new THREE.Group();
    const slope = Math.hypot(depth / 2, rise);
    const angle = Math.atan2(rise, depth / 2);
    for (const side of [-1, 1]) {
      const panel = this.box(width, 0.35, slope, colour);
      panel.rotation.x = side * angle;
      panel.position.set(0, y + rise / 2, (side * depth) / 4);
      group.add(panel);
    }
    this.add(group, x, 0, z, yaw);
    return group;
  }
}

/** Start a model. Every builder ends with `kit.group`. */
export function model(): Kit {
  return new Kit();
}

/** Registry, filled by the model modules and read by the city. */
export const LANDMARK_MODELS: Record<string, LandmarkBuilder> = {};

export function register(id: string, builder: LandmarkBuilder): void {
  LANDMARK_MODELS[id] = builder;
}
