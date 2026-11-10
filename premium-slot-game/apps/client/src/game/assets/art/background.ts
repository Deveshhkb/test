/**
 * Procedural cyberpunk city backdrop drawn with Canvas2D (original art).
 * Variants re-tint the sky for free spins and the boss arena.
 */
export type BackgroundVariant = 'base' | 'free' | 'boss';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PALETTES: Record<BackgroundVariant, { sky: string[]; neon: string[]; fog: string }> = {
  base: { sky: ['#05020f', '#1a0638', '#3a0d5c', '#5a1470'], neon: ['#ff2bd6', '#29e6ff', '#8b3dff', '#ff7a1a'], fog: 'rgba(255,43,214,0.18)' },
  free: { sky: ['#020814', '#061c3a', '#0d3a66', '#3a1470'], neon: ['#29e6ff', '#8b3dff', '#ff2bd6', '#2cff9a'], fog: 'rgba(41,230,255,0.18)' },
  boss: { sky: ['#0a0206', '#2a0612', '#4a0a24', '#20061a'], neon: ['#ff1f3d', '#ff2bd6', '#ff7a1a', '#8b3dff'], fog: 'rgba(255,31,61,0.16)' },
};

export function drawCityBackground(w: number, h: number, variant: BackgroundVariant = 'base'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const pal = PALETTES[variant];
  const rnd = seeded(variant === 'base' ? 7 : variant === 'free' ? 11 : 13);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  pal.sky.forEach((col, i) => sky.addColorStop(i / (pal.sky.length - 1), col));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // distant glow haze
  const haze = ctx.createRadialGradient(w * 0.55, h * 0.7, 10, w * 0.55, h * 0.7, w * 0.7);
  haze.addColorStop(0, pal.fog.replace(/0\.\d+\)/, '0.45)'));
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);

  // stars / far particles
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.4})`;
    ctx.fillRect(rnd() * w, rnd() * h * 0.45, 1.5, 1.5);
  }

  const layer = (count: number, minH: number, maxH: number, baseY: number, color: string, windowAlpha: number, neonChance: number) => {
    let x = -40;
    while (x < w + 40) {
      const bw = 40 + rnd() * (count > 30 ? 70 : 140);
      const bh = minH + rnd() * (maxH - minH);
      const top = baseY - bh;
      ctx.fillStyle = color;
      ctx.fillRect(x, top, bw, bh + h);
      // antenna
      if (rnd() < 0.3) {
        ctx.fillRect(x + bw / 2 - 2, top - 40, 4, 40);
        ctx.fillStyle = pal.neon[Math.floor(rnd() * pal.neon.length)];
        ctx.fillRect(x + bw / 2 - 3, top - 44, 6, 6);
      }
      // windows
      for (let wy = top + 10; wy < baseY + 200; wy += 14) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 11) {
          if (rnd() < 0.42) {
            const n = pal.neon[Math.floor(rnd() * pal.neon.length)];
            ctx.fillStyle = rnd() < 0.7 ? `rgba(255,220,180,${windowAlpha * rnd()})` : hexA(n, windowAlpha);
            ctx.fillRect(wx, wy, 5, 7);
          }
        }
      }
      // neon edge lines
      if (rnd() < neonChance) {
        const n = pal.neon[Math.floor(rnd() * pal.neon.length)];
        ctx.save();
        ctx.shadowColor = n;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = n;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 2, top + bh * 0.2);
        ctx.lineTo(x + 2, top);
        ctx.lineTo(x + bw - 2, top);
        ctx.stroke();
        ctx.restore();
      }
      x += bw + rnd() * 10;
    }
  };

  layer(40, h * 0.25, h * 0.55, h * 0.78, '#0d0622', 0.35, 0.15);
  layer(25, h * 0.2, h * 0.5, h * 0.88, '#090418', 0.5, 0.35);

  // big neon signs
  const signs = ['HOTEL', 'CYBER', 'NOODLE', '24/7', 'BAR', 'NEO'];
  for (let i = 0; i < 6; i++) {
    const n = pal.neon[i % pal.neon.length];
    const sx = 80 + i * (w / 6) + rnd() * 60;
    const sy = h * (0.25 + rnd() * 0.3);
    ctx.save();
    ctx.translate(sx, sy);
    const vertical = i % 2 === 0;
    ctx.shadowColor = n;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = n;
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(10,4,24,0.85)';
    const text = signs[i];
    if (vertical) {
      const sh = text.length * 34 + 20;
      ctx.fillRect(0, 0, 50, sh);
      ctx.strokeRect(0, 0, 50, sh);
      ctx.fillStyle = n;
      ctx.font = 'bold 28px Orbitron, Arial, sans-serif';
      ctx.textAlign = 'center';
      [...text].forEach((ch, k) => ctx.fillText(ch, 25, 40 + k * 34));
    } else {
      ctx.font = 'bold 34px Orbitron, Arial, sans-serif';
      const tw = ctx.measureText(text).width + 30;
      ctx.fillRect(0, 0, tw, 56);
      ctx.strokeRect(0, 0, tw, 56);
      ctx.fillStyle = n;
      ctx.fillText(text, 15, 40);
    }
    ctx.restore();
  }

  // street level glow
  const street = ctx.createLinearGradient(0, h * 0.8, 0, h);
  street.addColorStop(0, 'rgba(0,0,0,0)');
  street.addColorStop(0.5, pal.fog);
  street.addColorStop(1, 'rgba(5,2,15,0.95)');
  ctx.fillStyle = street;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);

  // reflective wet ground lines
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = pal.neon[i % pal.neon.length];
    ctx.fillRect(rnd() * w, h * 0.92 + rnd() * h * 0.08, 30 + rnd() * 120, 2);
  }
  ctx.globalAlpha = 1;

  // vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  return c;
}

function hexA(hex: string, a: number) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

/** Big flickering neon sign sprite drawn separately so it can animate. */
export function drawNeonSign(text: string, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = 'bold 64px Orbitron, Arial, sans-serif';
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = tw + 80;
  c.height = 130;
  ctx.font = 'bold 64px Orbitron, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  for (const blur of [40, 20, 8]) {
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(text, 40, 65);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(text, 40, 65);
  return c;
}
