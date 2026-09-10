/** Tiny DOM + math helpers shared by the UI modules. */

export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function must<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const node = root.querySelector<T>(sel);
  if (!node) throw new Error(`Atlas: required element missing: ${sel}`);
  return node;
}

type Props = Record<string, unknown>;

/** Create an element. `class` sets className, `text` sets textContent, `html`
 *  is opt-in for trusted markup we author ourselves. Everything else becomes an
 *  attribute (or a property for `value`/`checked`). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: (Node | string | null | undefined)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "text") node.textContent = String(v);
    else if (k === "html") node.innerHTML = String(v);
    else if (k === "value") (node as HTMLInputElement).value = String(v);
    else if (k === "checked") (node as HTMLInputElement).checked = Boolean(v);
    else if (k === "dataset") Object.assign(node.dataset, v as Record<string, string>);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

export const svg = (markup: string): SVGElement => {
  const wrap = document.createElement("div");
  wrap.innerHTML = markup.trim();
  return wrap.firstElementChild as SVGElement;
};

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const raf = (fn: FrameRequestCallback): (() => void) => {
  let id = 0;
  let stopped = false;
  const loop = (t: number): void => {
    if (stopped) return;
    fn(t);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => {
    stopped = true;
    cancelAnimationFrame(id);
  };
};

export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let last = 0;
  let pending: A | null = null;
  let timer = 0;
  return (...args: A) => {
    const now = performance.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    } else {
      pending = args;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        last = performance.now();
        if (pending) fn(...pending);
        pending = null;
      }, ms - (now - last));
    }
  };
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isCoarse = (): boolean => window.matchMedia("(pointer: coarse)").matches;

/** Escape a string for safe insertion into authored innerHTML. */
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
