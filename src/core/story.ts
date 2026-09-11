/**
 * Story playback.
 *
 * A story is a sequence of places, each with a shot to hold and a line of
 * narration. The engine flies the camera, holds the shot while the narration
 * reads, then advances. It is the difference between a slideshow and a guided
 * tour: the flight between two stops is composed (a swing in, a settle out),
 * and the visitor can scrub, skip, or walk away at any point without breaking
 * anything.
 */

import type { Atlas } from "./atlas.ts";
import type { Shot, Story } from "../data/types.ts";
import { PLACE_BY_ID } from "../data/index.ts";
import { flightDuration } from "./geo.ts";
import { raf } from "../util/dom.ts";

export interface StoryBeat {
  placeId: string;
  name: string;
  narration: string;
  shot: Shot;
  /** Seconds the camera holds the shot while the narration is read. */
  hold: number;
  /** Seconds of flight before this beat (0 for the first). */
  flight: number;
}

export interface StoryCallbacks {
  onBeat: (beat: StoryBeat, index: number, total: number) => void;
  /** True while the camera is in transit between two stops. */
  onFlying: (flying: boolean) => void;
  onProgress: (fraction: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onFinished: () => void;
}

/** Reading speed used to decide how long a line stays on screen. Words per
 *  second, tuned slow enough to actually read rather than skim. */
const WORDS_PER_SECOND = 2.9;

export class StoryPlayer {
  private atlas: Atlas;
  private callbacks: StoryCallbacks;
  private story: Story | null = null;
  private beats: StoryBeat[] = [];
  private index = 0;
  private playing = false;
  private token = 0;
  private stopFrame: (() => void) | null = null;

  constructor(atlas: Atlas, callbacks: StoryCallbacks) {
    this.atlas = atlas;
    this.callbacks = callbacks;
  }

  get currentStory(): Story | null {
    return this.story;
  }

  get currentIndex(): number {
    return this.index;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get beatList(): StoryBeat[] {
    return this.beats;
  }

  /** Total runtime in seconds, as it will actually play. */
  get totalSeconds(): number {
    return this.beats.reduce((sum, b) => sum + b.flight + b.hold, 0);
  }

  /** Seconds elapsed up to and including the current beat's start. */
  private elapsedTo(index: number): number {
    let total = 0;
    for (let i = 0; i <= index && i < this.beats.length; i++) {
      total += this.beats[i].flight + this.beats[i].hold;
    }
    return total;
  }

  load(story: Story): void {
    this.story = story;
    this.beats = story.stops
      .map((stop, i) => {
        const place = PLACE_BY_ID[stop.placeId];
        if (!place) return null;
        const shot = place.camera[stop.shot ?? "hero"] ?? place.camera.hero;
        const words = stop.narration.split(/\s+/).length;
        // Hold for the longer of the authored time and the time it takes to
        // read the line, so narration is never cut off mid-sentence.
        const hold = Math.max(stop.seconds, Math.ceil(words / WORDS_PER_SECOND) + 2.4);
        return {
          placeId: place.id,
          name: place.name,
          narration: stop.narration,
          shot,
          hold,
          flight: i > 0 ? this.beatsInFlight(story, i - 1, i) : 0,
        } satisfies StoryBeat;
      })
      .filter((b): b is StoryBeat => b !== null);
  }

  private beatsInFlight(story: Story, fromIndex: number, toIndex: number): number {
    const a = this.shotFor(story, fromIndex);
    const b = this.shotFor(story, toIndex);
    if (!a || !b) return 0;
    return flightDuration(a, b) / 1000;
  }

  private shotFor(story: Story, index: number): Shot | null {
    const stop = story.stops[index];
    if (!stop) return null;
    const place = PLACE_BY_ID[stop.placeId];
    if (!place) return null;
    return place.camera[stop.shot ?? "hero"] ?? place.camera.hero;
  }

  async play(from = this.index): Promise<void> {
    if (!this.story || this.beats.length === 0) return;
    this.playing = true;
    this.callbacks.onPlayStateChange(true);
    this.index = Math.max(0, Math.min(this.beats.length - 1, from));
    await this.run(this.index);
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.token++;
    this.stopFrame?.();
    this.stopFrame = null;
    this.callbacks.onPlayStateChange(false);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else void this.play();
  }

  /** Jump to a beat, playing or not. */
  async goTo(index: number, andPlay = this.playing): Promise<void> {
    if (!this.story) return;
    this.index = Math.max(0, Math.min(this.beats.length - 1, index));
    this.token++;
    this.stopFrame?.();
    this.stopFrame = null;
    if (andPlay) {
      this.playing = true;
      this.callbacks.onPlayStateChange(true);
      await this.run(this.index);
    } else {
      this.playing = false;
      this.callbacks.onPlayStateChange(false);
      await this.showBeat(this.index, this.index === 0);
    }
  }

  next(): void {
    void this.goTo(this.index + 1);
  }

  previous(): void {
    void this.goTo(this.index - 1);
  }

  stop(): void {
    this.pause();
    this.story = null;
    this.beats = [];
    this.index = 0;
  }

  /** Fly to and hold a single beat, without continuing. */
  private async showBeat(index: number, instant = false): Promise<void> {
    const beat = this.beats[index];
    if (!beat) return;
    this.callbacks.onBeat(beat, index, this.beats.length);
    if (instant) {
      this.atlas.camera.jumpTo(beat.shot);
      return;
    }
    this.callbacks.onFlying(true);
    await this.atlas.camera.flyTo(beat.shot, { swing: swingFor(index) });
    this.callbacks.onFlying(false);
  }

  /** Walk the whole sequence. Interruptible at any await point via `token`. */
  private async run(startIndex: number): Promise<void> {
    const token = ++this.token;
    this.index = startIndex;

    for (let i = startIndex; i < this.beats.length; i++) {
      if (token !== this.token) return;
      const beat = this.beats[i];
      this.index = i;

      this.callbacks.onBeat(beat, i, this.beats.length);

      // Entering a story from wherever the visitor was: an establishing move
      // that arrives with a swing rather than a straight line.
      this.callbacks.onFlying(true);
      await this.atlas.camera.flyTo(beat.shot, { swing: swingFor(i) });
      this.callbacks.onFlying(false);
      if (token !== this.token) return;

      // Hold while the narration reads, reporting progress for the player bar.
      // A gentle drift keeps the frame alive across a long hold; it is given a
      // little less time than the hold so it is always at rest before the next
      // flight begins.
      this.atlas.camera.drift((beat.hold - 0.5) * 1000, driftFor(i), 0.18);
      const held = await this.hold(beat.hold, token, i);
      if (!held) return;
    }

    if (token === this.token) {
      this.playing = false;
      this.callbacks.onPlayStateChange(false);
      this.callbacks.onProgress(1);
      this.callbacks.onFinished();
    }
  }

  /** Wait out a beat, ticking progress. Resolves false when interrupted. */
  private hold(seconds: number, token: number, index: number): Promise<boolean> {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    const start = performance.now();
    const totalMs = seconds * 1000;
    const tick = (): void => {
      if (token !== this.token) {
        this.stopFrame = null;
        resolve(false);
        return;
      }
      const elapsed = performance.now() - start;
      const beatFraction = Math.min(1, elapsed / totalMs);
      const before = this.elapsedTo(index - 1);
      const within = before + this.beats[index].flight + beatFraction * this.beats[index].hold;
      this.callbacks.onProgress(Math.min(1, within / Math.max(1, this.totalSeconds)));
      if (elapsed >= totalMs) {
        this.stopFrame = null;
        resolve(true);
        return;
      }
    };
    this.stopFrame = raf(tick);
    return promise;
  }
}

/** Each stop swings in from a slightly different side so consecutive flights
 *  do not all rotate the same way, which is what makes a tour feel mechanical. */
function swingFor(index: number): number {
  const pattern = [16, -20, 13, -16, 22, -12, 18];
  return pattern[index % pattern.length];
}

/** Direction of the slow drift during a hold, varied so consecutive stops do
 *  not all creep the same way. */
function driftFor(index: number): number {
  const pattern = [4.0, -3.4, 4.6, -4.0, 3.0, -4.4];
  return pattern[index % pattern.length];
}
