/**
 * The southern sky.
 *
 * A single pre-rendered star field, drawn once into an offscreen canvas and
 * screen-blended over the map when the sun is down. Real star positions would
 * need a catalogue for little visual gain; instead the field is generated with
 * a density and brightness distribution that reads as a real sky, and the
 * Southern Cross is placed in the correct direction as an anchor.
 */

const WIDTH = 1600;
const HEIGHT = 900;

/** Deterministic PRNG so the sky is the same every visit. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStarField(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rand = mulberry32(0x5eed);

  // The galactic band: a broad diagonal haze of unresolved starlight.
  const band = ctx.createLinearGradient(0, HEIGHT, WIDTH, HEIGHT * 0.1);
  band.addColorStop(0, "rgba(150,170,220,0)");
  band.addColorStop(0.42, "rgba(168,182,226,0.055)");
  band.addColorStop(0.55, "rgba(190,200,240,0.08)");
  band.addColorStop(0.7, "rgba(150,170,220,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const drawStar = (x: number, y: number, r: number, alpha: number, hue: number): void => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, `hsla(${hue}, 40%, 96%, ${alpha})`);
    g.addColorStop(0.32, `hsla(${hue}, 46%, 88%, ${alpha * 0.5})`);
    g.addColorStop(1, "hsla(220, 40%, 80%, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
  };

  // Magnitude distribution: many faint, few bright — the shape of a real sky.
  const count = 2000;
  for (let i = 0; i < count; i++) {
    const x = rand() * WIDTH;
    const y = rand() * HEIGHT;
    // Bias toward the band.
    const bandPull = Math.abs(y - (HEIGHT - x * 0.55)) / HEIGHT;
    const keep = rand() < 1 - bandPull * 0.55;
    if (!keep) continue;
    const brightness = rand() ** 2.4;
    const r = 0.34 + brightness * 1.5;
    const hue = 200 + rand() * 40 - (rand() < 0.16 ? 30 : 0);
    drawStar(x, y, r, 0.3 + brightness * 0.7, hue);
  }

  // The Southern Cross, placed high in the south-west: the one constellation
  // every visitor to this latitude can actually find.
  const cross: [number, number, number][] = [
    [0.3, 0.24, 1.9],
    [0.335, 0.31, 1.5],
    [0.282, 0.315, 1.3],
    [0.318, 0.395, 1.75],
    [0.352, 0.352, 0.95],
  ];
  for (const [fx, fy, r] of cross) drawStar(fx * WIDTH, fy * HEIGHT, r, 1, 210);

  return canvas;
}

/** Paint the star field into the on-screen canvas, sized to the viewport. */
export function mountStars(canvas: HTMLCanvasElement): () => void {
  const field = createStarField();
  const ctx = canvas.getContext("2d");

  const paint = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Scale the field to cover the viewport, keeping stars round.
    const scale = Math.max(canvas.width / field.width, canvas.height / field.height);
    const dw = field.width * scale;
    const dh = field.height * scale;
    ctx.drawImage(field, (canvas.width - dw) / 2, -dh * 0.08, dw, dh);
  };

  paint();
  const observer = new ResizeObserver(paint);
  observer.observe(canvas);
  return () => observer.disconnect();
}
