/**
 * The notebook.
 *
 * What the walker has collected. Deliberately the same shape as the atlas's
 * progress — a set of visited ids, saved to the device — so a place read in one
 * product is already known to the other. That is the point of building both.
 */

import { store } from "../util/storage.ts";

const KEY = "notebook";

export interface NotebookEntry {
  id: string;
  /** When it was reached, ISO date. */
  at: string;
}

export class Notebook {
  private entries: NotebookEntry[] = [];
  private listeners = new Set<() => void>();

  constructor() {
    this.entries = store.get<NotebookEntry[]>(KEY, []);
    // Migrate the atlas's plain id list, so the two products share progress.
    if (this.entries.length === 0) {
      const shared = store.get<string[]>("visited", []);
      if (shared.length > 0) {
        this.entries = shared.map((id) => ({ id, at: new Date().toISOString().slice(0, 10) }));
        this.save();
      }
    }
  }

  get all(): NotebookEntry[] {
    return this.entries;
  }

  get ids(): string[] {
    return this.entries.map((e) => e.id);
  }

  has(id: string): boolean {
    return this.entries.some((e) => e.id === id);
  }

  get size(): number {
    return this.entries.length;
  }

  /** Record a visit. Returns true when this was the first. */
  add(id: string): boolean {
    if (this.has(id)) return false;
    this.entries = [...this.entries, { id, at: new Date().toISOString().slice(0, 10) }];
    this.save();
    this.announce();
    return true;
  }

  clear(): void {
    this.entries = [];
    this.save();
    this.announce();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private announce(): void {
    for (const fn of this.listeners) fn();
  }

  private save(): void {
    store.set(KEY, this.entries);
    // Keep the atlas's list in step, so progress is shared both ways.
    store.set("visited", this.ids);
  }
}
