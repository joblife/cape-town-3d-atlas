/**
 * Cinematic camera control.
 *
 * A thin, opinionated layer over MapLibre's flying camera:
 *  - arrivals settle rather than stop dead (a short overshoot, then a damped
 *    ease onto the exact shot);
 *  - the frame respects whatever chrome is on screen, so a place is never
 *    parked underneath a panel;
 *  - a user gesture interrupts any flight, except when a story is playing and
 *    has explicitly taken the wheel.
 */

import type { LngLatLike, Map as MapLibreMap } from "maplibre-gl";
import type { Shot } from "../data/types.ts";
import { distanceKm, flightDuration, shortestTurn, type Insets } from "./geo.ts";
import { clamp, prefersReducedMotion } from "../util/dom.ts";

export type FlightResult = "arrived" | "cancelled";

export interface FlightOptions {
  /** Multiplier on the computed duration. */
  pace?: number;
  /** Extra degrees of swing in the approach, 0 for a straight move. */
  swing?: number;
  /** Skip the arrival settle. */
  noSettle?: boolean;
  /** Called if a gesture cancels the flight. */
  onCancel?: () => void;
}

interface CameraDeps {
  map: MapLibreMap;
  /** Pixels currently covered by chrome. */
  insets: () => Insets;
  /** When true, user gestures must not cancel flights (a story is playing). */
  locked: () => boolean;
}

export class CinematicCamera {
  private deps: CameraDeps;
  private token = 0;
  private flying = false;
  /** Shot the camera is aiming at or resting on. */
  private target: Shot;
  private interruptedByUser = false;

  constructor(deps: CameraDeps) {
    this.deps = deps;
    const c = deps.map.getCenter();
    this.target = {
      lon: c.lng,
      lat: c.lat,
      zoom: deps.map.getZoom(),
      pitch: deps.map.getPitch(),
      bearing: deps.map.getBearing(),
    };

    deps.map.on("movestart", (e) => {
      if (!this.flying) return;
      // `e.originalEvent` is present only for genuine user input.
      if (e.originalEvent && !this.deps.locked()) {
        this.interruptedByUser = true;
        this.token++;
        this.flying = false;
      }
    });
  }

  get isFlying(): boolean {
    return this.flying;
  }

  /** The shot the camera is heading for or resting on. */
  get current(): Shot {
    return this.target;
  }

  /** Read the live camera, for persisting a view or seeding a flight. */
  snapshot(): Shot {
    const c = this.deps.map.getCenter();
    return {
      lon: c.lng,
      lat: c.lat,
      zoom: this.deps.map.getZoom(),
      pitch: this.deps.map.getPitch(),
      bearing: this.deps.map.getBearing(),
    };
  }

  /** Take the camera to a shot. Resolves when it arrives or is interrupted. */
  async flyTo(shot: Shot, options: FlightOptions = {}): Promise<FlightResult> {
    const map = this.deps.map;
    const token = ++this.token;
    this.interruptedByUser = false;

    const from = this.snapshot();
    const to = { ...shot };
    // Choose the short way round so the horizon does not spin.
    const bearing = shortestTurn(from.bearing, to.bearing);
    const reduced = prefersReducedMotion();

    if (reduced) {
      map.jumpTo({
        center: [to.lon, to.lat],
        zoom: to.zoom,
        pitch: to.pitch,
        bearing,
        elevation: this.elevationFor(to),
      });
      this.target = { ...to, bearing };
      return "arrived";
    }

    const duration = flightDuration(from, to, options.pace ?? 1);
    const swing = options.swing ?? 0;

    this.flying = true;
    const insets = this.deps.insets();
    // `padding` is what keeps the subject clear of the panels: MapLibre places
    // the camera centre in the middle of the *unpadded* area. Shifting the
    // target as well double-corrected and threw places hundreds of pixels off.
    const framed = { lon: to.lon, lat: to.lat };
    // Long hops arc high and read as flight; short hops stay close to the
    // ground, because pulling the camera out for 400 m is disorienting.
    const km = distanceKm(from, to);
    const curve = clamp(1.02 + km * 0.055, 1.06, 1.62);

    const arrival = this.waitFor("moveend", duration + 1400);
    map.flyTo({
      center: [framed.lon, framed.lat],
      zoom: to.zoom,
      pitch: to.pitch,
      bearing: bearing + swing,
      duration,
      curve,
      padding: insets,
      easing: (t) => 1 - (1 - t) ** 3.2,
      essential: true,
    });

    const first = await arrival;
    if (token !== this.token || first === "timeout" || this.interruptedByUser) {
      this.flying = false;
      options.onCancel?.();
      return "cancelled";
    }

    this.target = { ...to, bearing };

    // Arrival: settle the camera onto the exact shot. Two things happen here,
    // in this order and for a reason.
    //
    // The camera's centre elevation must end up at the height of what it is
    // looking at. A summit looked at from a sea-level plane lands a couple of
    // hundred pixels off centre, because the marker is a ground point that the
    // terrain lifts. `setCenterElevation` cannot run *during* a flight — it
    // stops the animation dead — so it is applied here, on arrival.
    //
    // That change would be a visible jolt on its own, so the settle below
    // always runs and masks it with motion. The last few degrees of swing are
    // the other half of what the settle is for: it reads as a camera operator
    // finding the frame.
    const targetElevation = this.elevationFor(to);
    if (Math.abs(map.transform.elevation - targetElevation) >= 0.5) {
      map.setCenterElevation(targetElevation);
    }

    if (!options.noSettle) {
      const settle = this.waitFor("moveend", 1600);
      map.easeTo({
        center: [framed.lon, framed.lat],
        zoom: to.zoom,
        pitch: to.pitch,
        bearing,
        duration: 780,
        padding: insets,
        easing: (t) => 1 - (1 - t) ** 2,
      });
      const second = await settle;
      if (token !== this.token || second === "timeout") {
        this.flying = false;
        return "cancelled";
      }
    }

    this.flying = false;
    return "arrived";
  }

  /** Move without animation — used when restoring a URL or prefetching. */
  jumpTo(shot: Shot): void {
    this.token++;
    this.flying = false;
    this.deps.map.jumpTo({
      center: [shot.lon, shot.lat],
      zoom: shot.zoom,
      pitch: shot.pitch,
      bearing: shot.bearing,
      elevation: this.elevationFor(shot),
    });
    this.target = { ...shot };
  }

  /**
   * Height the camera should sit at to look at a shot: the ground under the
   * target. Without this the camera keeps whatever height the last place left
   * it, so a place on the mountain is framed from the previous place's
   * altitude and the marker lands a couple of hundred pixels off centre.
   *
   * The terrain grid answers this directly and consistently. An authored
   * override was tried and removed: the cableway's "lift" put the camera at
   * 1,000 m to look at a station the terrain has at 457 m, which is worse than
   * asking the elevation source.
   */
  private elevationFor(shot: Shot): number {
    try {
      return this.deps.map.queryTerrainElevation([shot.lon, shot.lat] as LngLatLike) ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * A slow drift while a story beat is being read.
   *
   * Without it the camera parks for the whole hold — fifteen to twenty seconds
   * of a completely static frame between two-second flights, which reads as a
   * slideshow rather than a guided tour. The movement is deliberately small
   * (a couple of degrees and a slight push) so it registers as life rather than
   * as a camera move competing with the narration.
   *
   * Finishes before the hold does, so the next flight always starts from rest.
   */
  drift(durationMs: number, bearingDeg: number, zoomDelta: number): void {
    if (prefersReducedMotion()) return;
    const map = this.deps.map;
    if (map.isMoving()) return;
    const from = this.snapshot();
    map.easeTo({
      bearing: from.bearing + bearingDeg,
      zoom: from.zoom + zoomDelta,
      duration: Math.max(600, durationMs),
      // Linear: a constant, barely perceptible creep, not a move with a start
      // and an end.
      easing: (t) => t,
    });
  }

  /** A slow unbroken orbit, for the opening and for idle moments. */
  async orbit(seconds: number, degrees = 26): Promise<void> {
    if (prefersReducedMotion()) return;
    const token = ++this.token;
    const start = this.snapshot();
    const settle = this.waitFor("moveend", seconds * 1000 + 1200);
    this.flying = true;
    this.deps.map.easeTo({
      bearing: start.bearing + degrees,
      duration: seconds * 1000,
      easing: (t) => t,
    });
    await settle;
    if (token === this.token) this.flying = false;
  }

  /** Stop any flight and hold the current position. */
  stop(): void {
    this.token++;
    this.flying = false;
    this.deps.map.stop();
  }

  private waitFor(event: "moveend", timeoutMs: number): Promise<"done" | "timeout"> {
    const map = this.deps.map;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v: "done" | "timeout"): void => {
        if (done) return;
        done = true;
        map.off(event, onEnd);
        window.clearTimeout(timer);
        resolve(v);
      };
      const onEnd = (): void => finish("done");
      const timer = window.setTimeout(() => finish("timeout"), timeoutMs);
      map.once(event, onEnd);
    });
  }
}
