/** Colour maths for the lighting system. All functions take/return sRGB hex. */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const c2 = (v: number): string => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");

export const rgbToHex = ({ r, g, b }: RGB): string => `#${c2(r)}${c2(g)}${c2(b)}`;

/** Linear interpolation in sRGB. Adequate for the small deltas we blend and
 *  cheap enough to run on every sun update. */
export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex({
    r: A.r + (B.r - A.r) * k,
    g: A.g + (B.g - A.g) * k,
    b: A.b + (B.b - A.b) * k,
  });
}

/** Scale brightness, clamped. `amount` > 0 lightens toward white, < 0 darkens. */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return rgbToHex({
    r: r + (target - r) * k,
    g: g + (target - g) * k,
    b: b + (target - b) * k,
  });
}

/** Blend many colours by weight — lets the lighting model average several
 *  incommensurate cues (sun altitude, cloud, time) without hand-tuned branches. */
export function blend(colors: [string, number][]): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (const [hex, w] of colors) {
    if (w <= 0) continue;
    const c = hexToRgb(hex);
    r += c.r * w;
    g += c.g * w;
    b += c.b * w;
    total += w;
  }
  if (total === 0) return "#ffffff";
  return rgbToHex({ r: r / total, g: g / total, b: b / total });
}
