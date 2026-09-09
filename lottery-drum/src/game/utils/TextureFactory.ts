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

/**
 * One lighting environment for the whole scene.
 *
 * The key is a hard white source above and to the left, as in the reference
 * studio. The fill is the room itself: a dim cyan bounce that wraps the
 * shadow side of everything. Every generated material reads these, so metal,
 * glass and the balls all agree about where the light is coming from.
 */
export const KEY_DIR = { x: -0.55, y: -0.72 };
export const KEY_COLOR = 0xffffff;
export const FILL_COLOR = 0x2f7fa8;
export const AMBIENT_COLOR = 0x0a1626;

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

/** Deterministic per-variant noise, so a ball's marbling never changes. */
function seeded(seed: number): () => number {
  let state = (seed * 0x9e3779b1) >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
export function sphereTexture(
  base: number,
  shadow: number,
  resolution = 256,
  variant = 0,
): Texture {
  const key = `sphere:${base}:${shadow}:${resolution}:${variant}`;
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
  body.addColorStop(0.68, css(mixColor(base, shadow, 0.78)));
  body.addColorStop(1, css(shadow));
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);

  // Moulded lottery balls are marbled, not plain: the reference balls carry
  // swirled veining across the whole surface. Drawn before the bounce, fill and
  // specular so the lighting falls across the pattern instead of under it.
  const rng = seeded(variant * 977 + base);
  const veinDark = css(mixColor(shadow, 0x000000, 0.35), 0.5);
  const veinLight = css(mixColor(base, 0xffffff, 0.55), 0.42);

  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = r * (0.12 + rng() * 0.88);
    const sweep = (0.5 + rng() * 1.6) * (rng() < 0.5 ? 1 : -1);
    const wobble = r * (0.1 + rng() * 0.4);

    const x0 = c + Math.cos(angle) * radius;
    const y0 = c + Math.sin(angle) * radius;
    const x1 = c + Math.cos(angle + sweep) * radius * (0.6 + rng() * 0.7);
    const y1 = c + Math.sin(angle + sweep) * radius * (0.6 + rng() * 0.7);

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(
      c + Math.cos(angle + sweep * 0.5) * (radius + wobble),
      c + Math.sin(angle + sweep * 0.5) * (radius + wobble),
      x1,
      y1,
    );
    ctx.strokeStyle = rng() < 0.62 ? veinDark : veinLight;
    ctx.lineWidth = r * (0.025 + rng() * 0.075);
    ctx.stroke();
  }

  // Fine speckle over the veining, for the grain of a moulded surface.
  for (let i = 0; i < 200; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * r;
    ctx.fillStyle = rng() < 0.5 ? veinDark : veinLight;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius, r * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

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

  // Cyan fill from the room, wrapping the shadow side.
  const fill = ctx.createRadialGradient(
    c + r * 0.5,
    c + r * 0.45,
    r * 0.05,
    c + r * 0.4,
    c + r * 0.4,
    r * 1.05,
  );
  fill.addColorStop(0, css(FILL_COLOR, 0.26));
  fill.addColorStop(0.55, css(FILL_COLOR, 0.08));
  fill.addColorStop(1, css(FILL_COLOR, 0));
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, size, size);

  // Rim light along the shadowed edge, picking the silhouette out of the dark.
  const rim = ctx.createRadialGradient(c, c, r * 0.8, c, c, r);
  rim.addColorStop(0, 'rgba(255,255,255,0)');
  rim.addColorStop(0.78, css(0x9fd8ff, 0.1));
  rim.addColorStop(1, css(0xcfe6ff, 0.42));
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
  // Turned metal has a narrow, very bright band where it faces the key light
  // and falls away hard on either side. A gentle ramp reads as plastic.
  const stops: Array<[number, number]> = [
    [0, mixColor(tint, 0x000000, 0.72)],
    [0.1, mixColor(tint, 0x000000, 0.5)],
    [0.16, mixColor(tint, 0xffffff, 0.86)],
    [0.2, mixColor(tint, 0xffffff, 0.34)],
    [0.3, mixColor(tint, 0x000000, 0.55)],
    [0.44, mixColor(tint, 0x000000, 0.78)],
    [0.56, mixColor(tint, FILL_COLOR, 0.42)],
    [0.66, mixColor(tint, 0xffffff, 0.5)],
    [0.72, mixColor(tint, 0x000000, 0.35)],
    [0.86, mixColor(tint, 0x000000, 0.74)],
    [1, mixColor(tint, 0x000000, 0.72)],
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

/**
 * Soft dark ring, used as ambient occlusion where one part meets another.
 * `softness` is the fraction of the radius the falloff occupies.
 */
export function occlusionRingTexture(softness = 0.35, strength = 0.75, resolution = 256): Texture {
  const key = `ao:${softness}:${strength}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, ctx } = makeCanvas(resolution);
  const c = resolution / 2;
  const gradient = ctx.createRadialGradient(c, c, c * (1 - softness), c, c, c);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.75, `rgba(0,0,0,${strength * 0.5})`);
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  return fromCanvas(key, canvas);
}

/**
 * Screen vignette. Painted over the finished frame, it is what stops a scene
 * built from flat shapes reading as evenly lit poster art: the corners fall
 * away and attention lands on the machine.
 */
export function vignetteTexture(strength = 0.8, inner = 0.32, resolution = 512): Texture {
  const key = `vignette:${strength}:${inner}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, ctx } = makeCanvas(resolution);
  const c = resolution / 2;
  const gradient = ctx.createRadialGradient(c, c, c * inner, c, c, c * 0.95);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.55, `rgba(2,5,10,${strength * 0.22})`);
  gradient.addColorStop(0.82, `rgba(2,5,10,${strength * 0.62})`);
  gradient.addColorStop(1, `rgba(1,3,7,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, resolution, resolution);
  return fromCanvas(key, canvas);
}

/**
 * A lit acrylic panel: bright along one edge, falling to near nothing across
 * its width. The chevron light guides in the reference set are stacks of these.
 */
export function edgeLitPanelTexture(color: number, resolution = 128): Texture {
  const key = `edgelit:${color}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const gradient = ctx.createLinearGradient(0, 0, resolution, 0);
  gradient.addColorStop(0, css(mixColor(color, 0xffffff, 0.9), 1));
  gradient.addColorStop(0.035, css(mixColor(color, 0xffffff, 0.5), 0.8));
  gradient.addColorStop(0.12, css(color, 0.24));
  gradient.addColorStop(0.4, css(color, 0.07));
  gradient.addColorStop(1, css(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, resolution, 1);
  return fromCanvas(key, canvas);
}

/**
 * Anisotropic highlight for a cylindrical rod: dark edges, one bright specular
 * line offset toward the key light. Stretched along a bar it reads as machined
 * steel rather than a flat stroke.
 */
export function rodTexture(tint: number, resolution = 64): Texture {
  const key = `rod:${tint}:${resolution}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const gradient = ctx.createLinearGradient(0, 0, 0, resolution);
  gradient.addColorStop(0, css(mixColor(tint, 0x000000, 0.72)));
  gradient.addColorStop(0.2, css(mixColor(tint, 0xffffff, 0.22)));
  gradient.addColorStop(0.32, css(mixColor(tint, 0xffffff, 0.95)));
  gradient.addColorStop(0.42, css(mixColor(tint, 0xffffff, 0.18)));
  gradient.addColorStop(0.64, css(tint));
  gradient.addColorStop(0.85, css(mixColor(tint, FILL_COLOR, 0.55)));
  gradient.addColorStop(1, css(mixColor(tint, 0x000000, 0.6)));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, resolution);
  return fromCanvas(key, canvas);
}

export function clearTextureCache(): void {
  for (const texture of cache.values()) texture.destroy(true);
  cache.clear();
}
