import { Texture } from 'pixi.js';

/**
 * Canvas-backed texture generation with a process-wide cache.
 *
 * Pixi's Graphics cannot express radial or conic gradients, which are exactly
 * what a glossy sphere, a soft glow and a brushed metal ring need. Drawing them
 * once into a canvas and uploading the result gives real shading for the cost of
 * a single texture, and every consumer of the same key shares that upload.
 */
const cache = new Map<string, Texture>();

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

function fromCanvas(key: string, canvas: HTMLCanvasElement): Texture {
  const texture = Texture.from(canvas);
  cache.set(key, texture);
  return texture;
}

function css(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Blend two packed RGB colours. */
export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

/**
 * A lit sphere. The light sits up and to the left, so the terminator falls to
 * the lower right and a narrow rim light picks the silhouette back out of the
 * dark - the same read as the moulded balls in the reference.
 */
export function sphereTexture(base: number, shadow: number, resolution = 256): Texture {
  const key = `sphere:${base}:${shadow}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const pad = resolution * 0.06;
  const size = Math.round(resolution + pad * 2);
  const { canvas, ctx } = makeCanvas(size);
  const c = size / 2;
  const r = resolution / 2;

  // Ambient occlusion just outside the silhouette keeps the ball off the plate.
  const ao = ctx.createRadialGradient(c, c, r * 0.9, c, c, r * 1.12);
  ao.addColorStop(0, 'rgba(0,0,0,0.5)');
  ao.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ao;
  ctx.beginPath();
  ctx.arc(c, c, r * 1.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();

  // Body: bright near the light, falling to the shadow colour at the terminator.
  const body = ctx.createRadialGradient(
    c - r * 0.34,
    c - r * 0.38,
    r * 0.05,
    c - r * 0.1,
    c - r * 0.1,
    r * 1.32,
  );
  body.addColorStop(0, css(mixColor(base, 0xffffff, 0.42)));
  body.addColorStop(0.32, css(base));
  body.addColorStop(0.72, css(mixColor(base, shadow, 0.7)));
  body.addColorStop(1, css(shadow));
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);

  // Bounce light off the plate, low on the sphere.
  const bounce = ctx.createRadialGradient(
    c + r * 0.24,
    c + r * 0.58,
    r * 0.02,
    c + r * 0.24,
    c + r * 0.58,
    r * 0.62,
  );
  bounce.addColorStop(0, css(mixColor(base, 0xffffff, 0.3), 0.5));
  bounce.addColorStop(1, css(base, 0));
  ctx.fillStyle = bounce;
  ctx.fillRect(0, 0, size, size);

  // Rim light along the shadowed edge.
  const rim = ctx.createRadialGradient(c, c, r * 0.82, c, c, r);
  rim.addColorStop(0, 'rgba(255,255,255,0)');
  rim.addColorStop(1, 'rgba(210,228,255,0.4)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, size, size);

  // Specular: a tight core inside a broader falloff.
  const broad = ctx.createRadialGradient(
    c - r * 0.36,
    c - r * 0.4,
    r * 0.02,
    c - r * 0.36,
    c - r * 0.4,
    r * 0.46,
  );
  broad.addColorStop(0, 'rgba(255,255,255,0.62)');
  broad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = broad;
  ctx.fillRect(0, 0, size, size);

  const core = ctx.createRadialGradient(
    c - r * 0.4,
    c - r * 0.45,
    r * 0.01,
    c - r * 0.4,
    c - r * 0.45,
    r * 0.17,
  );
  core.addColorStop(0, 'rgba(255,255,255,0.96)');
  core.addColorStop(0.55, 'rgba(255,255,255,0.4)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.restore();
  return fromCanvas(key, canvas);
}

/** Soft radial glow, used for lights, bloom and the seat flash. */
export function glowTexture(color: number, resolution = 256): Texture {
  const key = `glow:${color}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, ctx } = makeCanvas(resolution);
  const c = resolution / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, css(color, 0.95));
  gradient.addColorStop(0.28, css(color, 0.42));
  gradient.addColorStop(0.62, css(color, 0.12));
  gradient.addColorStop(1, css(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, resolution, resolution);
  return fromCanvas(key, canvas);
}

/** Elliptical contact shadow dropped under a ball or a machine foot. */
export function shadowTexture(resolution = 256): Texture {
  const key = `shadow:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, ctx } = makeCanvas(resolution);
  const c = resolution / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(0,0,0,0.62)');
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.28)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, resolution, resolution);
  return fromCanvas(key, canvas);
}

/**
 * Brushed metal annulus. The sweep runs light at the top-left through dark at
 * the lower-right and back, so a ring built from it reads as a turned surface
 * catching the key light rather than a flat stroke.
 */
export function metalRingTexture(
  outerRadius: number,
  thickness: number,
  tint: number,
  resolution = 512,
): Texture {
  const key = `metal:${outerRadius}:${thickness}:${tint}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, ctx } = makeCanvas(resolution);
  const c = resolution / 2;
  const scale = c / outerRadius;
  const rOuter = outerRadius * scale;
  const rInner = Math.max(1, (outerRadius - thickness) * scale);

  ctx.save();
  // Two independent subpaths. Without the moveTo, canvas joins the second arc
  // to the first with a line and the even-odd fill collapses into a disc.
  ctx.beginPath();
  ctx.moveTo(c + rOuter, c);
  ctx.arc(c, c, rOuter, 0, Math.PI * 2);
  ctx.moveTo(c + rInner, c);
  ctx.arc(c, c, rInner, 0, Math.PI * 2);
  ctx.clip('evenodd');

  const sweep = ctx.createConicGradient
    ? ctx.createConicGradient(-Math.PI * 0.75, c, c)
    : ctx.createLinearGradient(0, 0, resolution, resolution);
  const stops: Array<[number, number]> = [
    [0, mixColor(tint, 0xffffff, 0.42)],
    [0.12, tint],
    [0.28, mixColor(tint, 0x000000, 0.62)],
    [0.45, mixColor(tint, 0xffffff, 0.14)],
    [0.6, mixColor(tint, 0x000000, 0.68)],
    [0.78, mixColor(tint, 0xffffff, 0.26)],
    [1, mixColor(tint, 0xffffff, 0.42)],
  ];
  for (const [stop, color] of stops) sweep.addColorStop(stop, css(color));
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, resolution, resolution);

  // Fine turning lines across the band.
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let radius = rInner + 2; radius < rOuter; radius += 3) {
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  return fromCanvas(key, canvas);
}

/** Vertical linear gradient strip, stretched for panels and lit bars. */
export function verticalGradientTexture(top: number, bottom: number, height = 128): Texture {
  const key = `vgrad:${top}:${bottom}:${height}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, css(top));
  gradient.addColorStop(1, css(bottom));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, height);
  return fromCanvas(key, canvas);
}

export function clearTextureCache(): void {
  for (const texture of cache.values()) texture.destroy(true);
  cache.clear();
}
