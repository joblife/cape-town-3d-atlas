/** Transient status messages. Never modal, never blocking, never chatty. */

import { el } from "../util/dom.ts";

export class Toasts {
  private root: HTMLElement;
  private live: HTMLElement[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(message: string, options: { key?: string; timeout?: number } = {}): void {
    const node = el("div", { class: "toast" });
    if (options.key) node.append(el("span", { class: "toast__key", text: options.key }));
    node.append(el("span", { text: message }));
    this.root.append(node);
    this.live.push(node);

    // Keep the stack shallow — more than two at once is noise.
    while (this.live.length > 2) {
      const oldest = this.live.shift();
      oldest?.remove();
    }

    const timeout = options.timeout ?? 3200;
    window.setTimeout(() => {
      node.classList.add("is-out");
      window.setTimeout(() => {
        node.remove();
        this.live = this.live.filter((n) => n !== node);
      }, 300);
    }, timeout);
  }

  clear(): void {
    for (const node of this.live) node.remove();
    this.live = [];
  }
}
