import { Container, FillGradient, Graphics, Sprite, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { FRAME_H, FRAME_PAD, FRAME_W, GRID_H, GRID_W, CELL_W } from '../core/constants';

/**
 * Metallic futuristic reel frame with neon borders, glowing corners and animated light strips.
 */
export class ReelFrame extends Container {
  private readonly neon = new Graphics();
  private readonly neonGlow = new Graphics();
  private readonly runners: Sprite[] = [];
  private readonly corners: Sprite[] = [];
  readonly anticipation: Sprite[] = [];
  private t = 0;
  private colorA = 0xff2bd6;
  private colorB = 0x29e6ff;
  private pulse: gsap.core.Tween | null = null;

  constructor(glowTex: Texture) {
    super();
    const metal = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: '#c9cde8' },
        { offset: 0.08, color: '#5d6390' },
        { offset: 0.5, color: '#262a4a' },
        { offset: 0.92, color: '#5d6390' },
        { offset: 1, color: '#b8bde0' },
      ],
      textureSpace: 'local',
    });
    const panel = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: '#140a2e' },
        { offset: 0.5, color: '#0a0620' },
        { offset: 1, color: '#160a34' },
      ],
      textureSpace: 'local',
    });
    const body = new Graphics();
    // outer bevelled metal shell
    body.roundRect(-8, -8, FRAME_W + 16, FRAME_H + 16, 34).fill({ color: 0x05030c, alpha: 0.85 });
    body.roundRect(0, 0, FRAME_W, FRAME_H, 28).fill(metal);
    body.roundRect(10, 10, FRAME_W - 20, FRAME_H - 20, 22).fill({ color: 0x0b0a1c });
    // tech notches on the shell
    for (const x of [FRAME_W * 0.25, FRAME_W * 0.5, FRAME_W * 0.75]) {
      body.roundRect(x - 50, -4, 100, 10, 4).fill({ color: 0x1a1d38 });
      body.roundRect(x - 50, FRAME_H - 6, 100, 10, 4).fill({ color: 0x1a1d38 });
    }
    // reel window panel
    body.roundRect(FRAME_PAD - 6, FRAME_PAD - 6, GRID_W + 12, GRID_H + 12, 14).fill(panel);
    // column separators
    for (let i = 1; i < 6; i++) {
      const x = FRAME_PAD + i * CELL_W;
      body.rect(x - 1, FRAME_PAD, 2, GRID_H).fill({ color: 0x8b3dff, alpha: 0.22 });
    }
    this.addChild(body);
    this.addChild(this.neonGlow, this.neon);
    this.neonGlow.blendMode = 'add';
    this.drawNeon();

    // glowing corners
    const cornerPts = [
      [14, 14],
      [FRAME_W - 14, 14],
      [14, FRAME_H - 14],
      [FRAME_W - 14, FRAME_H - 14],
    ];
    cornerPts.forEach(([x, y], i) => {
      const s = new Sprite(glowTex);
      s.anchor.set(0.5);
      s.position.set(x, y);
      s.scale.set(1.4);
      s.blendMode = 'add';
      s.tint = i % 2 ? this.colorB : this.colorA;
      this.corners.push(s);
      this.addChild(s);
    });

    // light runners travelling around the border
    for (let i = 0; i < 6; i++) {
      const s = new Sprite(glowTex);
      s.anchor.set(0.5);
      s.scale.set(0.55, 0.35);
      s.blendMode = 'add';
      s.tint = i % 2 ? this.colorB : this.colorA;
      this.runners.push(s);
      this.addChild(s);
    }

    // per-reel anticipation glow (hidden)
    for (let i = 0; i < 6; i++) {
      const s = new Sprite(glowTex);
      s.anchor.set(0.5);
      s.position.set(FRAME_PAD + i * CELL_W + CELL_W / 2, FRAME_PAD + GRID_H / 2);
      s.width = CELL_W * 2.2;
      s.height = GRID_H * 1.5;
      s.blendMode = 'add';
      s.tint = 0xff2bd6;
      s.alpha = 0;
      this.anticipation.push(s);
      this.addChild(s);
    }
  }

  private drawNeon() {
    const r = 18;
    const x = FRAME_PAD - 12;
    const y = FRAME_PAD - 12;
    const w = GRID_W + 24;
    const h = GRID_H + 24;
    this.neon.clear();
    this.neon.roundRect(x, y, w, h, r).stroke({ width: 4, color: this.colorA, alpha: 1 });
    this.neon.roundRect(x - 8, y - 8, w + 16, h + 16, r + 6).stroke({ width: 2, color: this.colorB, alpha: 0.9 });
    this.neonGlow.clear();
    this.neonGlow.roundRect(x, y, w, h, r).stroke({ width: 18, color: this.colorA, alpha: 0.22 });
    this.neonGlow.roundRect(x - 8, y - 8, w + 16, h + 16, r + 6).stroke({ width: 14, color: this.colorB, alpha: 0.15 });
  }

  /** Changes the neon palette (e.g. free spins mode). */
  setColors(a: number, b: number) {
    this.colorA = a;
    this.colorB = b;
    this.drawNeon();
    this.corners.forEach((c, i) => (c.tint = i % 2 ? b : a));
    this.runners.forEach((c, i) => (c.tint = i % 2 ? b : a));
  }

  /** Strong frame pulse used on big moments. */
  flash() {
    this.pulse?.kill();
    this.neonGlow.alpha = 1;
    this.pulse = gsap.fromTo(this.neonGlow, { alpha: 3 }, { alpha: 1, duration: 0.6, ease: 'power2.out' });
  }

  update(dtMs: number) {
    this.t += dtMs;
    const x0 = FRAME_PAD - 12;
    const y0 = FRAME_PAD - 12;
    const w = GRID_W + 24;
    const h = GRID_H + 24;
    const per = 2 * (w + h);
    this.runners.forEach((s, i) => {
      let d = ((this.t * 0.22 + (i * per) / this.runners.length) % per + per) % per;
      let x: number, y: number, rot: number;
      if (d < w) [x, y, rot] = [x0 + d, y0, 0];
      else if ((d -= w) < h) [x, y, rot] = [x0 + w, y0 + d, Math.PI / 2];
      else if ((d -= h) < w) [x, y, rot] = [x0 + w - d, y0 + h, 0];
      else [x, y, rot] = [x0, y0 + h - (d - w), Math.PI / 2];
      s.position.set(x, y);
      s.rotation = rot;
    });
    for (const a of this.anticipation) a.visible = a.alpha > 0.01;
    const k = 0.75 + Math.sin(this.t * 0.003) * 0.25;
    this.corners.forEach((c, i) => (c.alpha = i % 2 ? k : 1.5 - k));
  }

  destroy() {
    this.pulse?.kill();
    super.destroy({ children: true });
  }
}
