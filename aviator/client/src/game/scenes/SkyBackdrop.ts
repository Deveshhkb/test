import { Container, FillGradient, Graphics } from 'pixi.js';
import { createSeededRandom } from '@/utils/random';

/**
 * Layered night-sky backdrop with depth.
 *
 * Three parallax layers (stars, far clouds, near clouds) counter-move
 * against the camera pan at different factors and drift horizontally at a
 * rate that scales with airspeed — the cheap trick that sells forward
 * motion without moving the world. The full weather system (phase 3)
 * extends this class; the layer plumbing is its foundation.
 */

interface StarDef {
  sprite: Graphics;
  fx: number;
  fy: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface CloudDef {
  sprite: Graphics;
  fy: number;
  baseSpeed: number;
  scale: number;
}

const STAR_COUNT = 90;
const FAR_CLOUDS = 4;
const NEAR_CLOUDS = 4;

const PARALLAX = {
  stars: 0.06,
  farClouds: 0.22,
  nearClouds: 0.45,
} as const;

export class SkyBackdrop {
  readonly container = new Container();

  private readonly gradient = new Graphics();
  private readonly starLayer = new Container();
  private readonly farCloudLayer = new Container();
  private readonly nearCloudLayer = new Container();

  private readonly stars: StarDef[] = [];
  private readonly farClouds: CloudDef[] = [];
  private readonly nearClouds: CloudDef[] = [];

  private width = 0;
  private destroyed = false;

  constructor(particleDensity: number) {
    // Seeded so the sky looks identical after a rebuild (context loss).
    const rand = createSeededRandom(0xa71a70);

    this.container.addChild(
      this.gradient,
      this.starLayer,
      this.farCloudLayer,
      this.nearCloudLayer,
    );

    const starCount = Math.round(STAR_COUNT * particleDensity);
    for (let i = 0; i < starCount; i++) {
      const sprite = new Graphics().circle(0, 0, rand() * 1.6 + 0.6).fill(0xffffff);
      this.starLayer.addChild(sprite);
      this.stars.push({
        sprite,
        fx: rand(),
        fy: rand() * 0.72,
        twinkleSpeed: 0.5 + rand() * 2,
        twinklePhase: rand() * Math.PI * 2,
      });
    }

    for (let i = 0; i < FAR_CLOUDS; i++) {
      this.farClouds.push(this.buildCloud(this.farCloudLayer, rand, 0.35, 0.045));
    }
    for (let i = 0; i < NEAR_CLOUDS; i++) {
      this.nearClouds.push(this.buildCloud(this.nearCloudLayer, rand, 0.8, 0.075));
    }
  }

  update(dt: number, elapsed: number, speed: number, panX: number, panY: number): void {
    if (this.destroyed) return;

    for (const star of this.stars) {
      star.sprite.alpha =
        0.35 + 0.65 * Math.abs(Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase));
    }

    // Speed multiplies drift: idle sky breathes, full flight streams past.
    const drift = 1 + speed * 9;
    this.moveClouds(this.farClouds, dt, drift * 0.5);
    this.moveClouds(this.nearClouds, dt, drift);

    // Parallax: each layer counter-follows a fraction of the camera pan.
    this.starLayer.position.set(panX * PARALLAX.stars, panY * PARALLAX.stars);
    this.farCloudLayer.position.set(panX * PARALLAX.farClouds, panY * PARALLAX.farClouds);
    this.nearCloudLayer.position.set(panX * PARALLAX.nearClouds, panY * PARALLAX.nearClouds);
  }

  resize(width: number, height: number): void {
    this.width = width;

    const fill = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x05070f },
        { offset: 0.45, color: 0x0d1630 },
        { offset: 0.8, color: 0x23294f },
        { offset: 1, color: 0x3d2f55 },
      ],
      textureSpace: 'local',
    });
    this.gradient.clear().rect(0, 0, width, height).fill(fill);

    for (const star of this.stars) {
      star.sprite.position.set(star.fx * width, star.fy * height);
    }
    const cloudScale = Math.max(0.6, width / 1400);
    for (const cloud of [...this.farClouds, ...this.nearClouds]) {
      cloud.sprite.y = cloud.fy * height;
      cloud.sprite.scale.set(cloud.scale * cloudScale);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stars.length = 0;
    this.farClouds.length = 0;
    this.nearClouds.length = 0;
    this.container.destroy({ children: true });
  }

  private moveClouds(clouds: CloudDef[], dt: number, driftFactor: number): void {
    for (const cloud of clouds) {
      cloud.sprite.x -= cloud.baseSpeed * this.width * driftFactor * dt;
      const margin = 260 * cloud.sprite.scale.x;
      if (cloud.sprite.x < -margin) {
        cloud.sprite.x = this.width + margin;
      }
    }
  }

  private buildCloud(
    layer: Container,
    rand: () => number,
    scaleBase: number,
    alphaBase: number,
  ): CloudDef {
    const sprite = new Graphics();
    const puffs = 4 + Math.floor(rand() * 3);
    for (let i = 0; i < puffs; i++) {
      sprite
        .ellipse((i - puffs / 2) * 55 + rand() * 30, rand() * 18, 70, 26)
        .fill({ color: 0xaab6d8, alpha: alphaBase + rand() * 0.03 });
    }
    sprite.x = rand() * 1900;
    layer.addChild(sprite);
    return {
      sprite,
      fy: 0.18 + rand() * 0.55,
      baseSpeed: 0.012 + rand() * 0.02,
      scale: scaleBase + rand() * 0.5,
    };
  }
}
