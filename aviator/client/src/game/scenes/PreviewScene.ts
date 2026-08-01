import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import { Scene } from './Scene';

/**
 * Phase-1 placeholder scene.
 *
 * Its job is to prove the full pipeline — engine → scene manager → resize →
 * per-frame updates — with a procedurally drawn night sky. The real
 * FlightScene (plane, curve, camera, atmosphere) replaces it in a later
 * phase; the star/cloud drawing here graduates into the SkyManager then.
 */

interface Star {
  sprite: Graphics;
  /** Position as a fraction of the viewport, so resize is free. */
  fx: number;
  fy: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface CloudPuff {
  sprite: Graphics;
  fy: number;
  /** Horizontal drift in viewport-fractions per second. */
  speed: number;
  scale: number;
}

const STAR_COUNT = 90;
const CLOUD_COUNT = 6;

export class PreviewScene extends Scene {
  private readonly sky = new Graphics();
  private readonly starLayer = new Container();
  private readonly cloudLayer = new Container();
  private title!: Text;
  private subtitle!: Text;

  private stars: Star[] = [];
  private clouds: CloudPuff[] = [];
  private width = 0;

  async init(): Promise<void> {
    this.root.addChild(this.sky, this.starLayer, this.cloudLayer);

    const starCount = Math.round(STAR_COUNT * this.engine.quality.particleDensity);
    for (let i = 0; i < starCount; i++) {
      const sprite = new Graphics().circle(0, 0, Math.random() * 1.6 + 0.6).fill(0xffffff);
      this.starLayer.addChild(sprite);
      this.stars.push({
        sprite,
        fx: Math.random(),
        fy: Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const sprite = this.buildCloud();
      this.cloudLayer.addChild(sprite);
      this.clouds.push({
        sprite,
        fy: 0.25 + Math.random() * 0.5,
        speed: 0.01 + Math.random() * 0.02,
        scale: 0.6 + Math.random() * 0.9,
      });
    }

    this.title = new Text({
      text: 'AVIATOR',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '900',
        fontSize: 96,
        letterSpacing: 14,
        fill: 0xffffff,
        dropShadow: { alpha: 0.8, blur: 18, color: 0xe0304f, distance: 0 },
      },
    });
    this.title.anchor.set(0.5);

    this.subtitle = new Text({
      text: 'ENGINE ONLINE',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '600',
        fontSize: 20,
        letterSpacing: 8,
        fill: 0x8fa3c8,
      },
    });
    this.subtitle.anchor.set(0.5);

    this.root.addChild(this.title, this.subtitle);
  }

  update(dt: number, elapsed: number): void {
    for (const star of this.stars) {
      star.sprite.alpha = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase));
    }

    for (const cloud of this.clouds) {
      cloud.sprite.x += cloud.speed * this.width * dt;
      // Wrap with a margin so the cloud fully leaves before re-entering.
      const margin = 220 * cloud.scale;
      if (cloud.sprite.x - margin > this.width) {
        cloud.sprite.x = -margin;
      }
    }

    const pulse = 1 + Math.sin(elapsed * 1.6) * 0.015;
    this.title.scale.set(pulse);
    this.subtitle.alpha = 0.55 + 0.45 * Math.sin(elapsed * 2.2);
  }

  resize(width: number, height: number): void {
    this.width = width;

    this.drawSky(width, height);

    for (const star of this.stars) {
      star.sprite.position.set(star.fx * width, star.fy * height);
    }
    for (const cloud of this.clouds) {
      cloud.sprite.y = cloud.fy * height;
      cloud.sprite.scale.set(cloud.scale * Math.max(0.6, width / 1400));
    }

    // Keep the title readable from phones to 4K monitors.
    const titleScale = Math.min(1, width / 1100);
    this.title.scale.set(titleScale);
    this.title.position.set(width / 2, height * 0.42);
    this.subtitle.scale.set(Math.max(0.7, titleScale));
    this.subtitle.position.set(width / 2, height * 0.42 + 90 * titleScale);
  }

  private drawSky(width: number, height: number): void {
    const gradient = new FillGradient({
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
    this.sky.clear().rect(0, 0, width, height).fill(gradient);
  }

  private buildCloud(): Graphics {
    const cloud = new Graphics();
    // A cluster of soft overlapping ellipses reads as a cloud at low cost.
    const puffs = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffs; i++) {
      cloud
        .ellipse((i - puffs / 2) * 55 + Math.random() * 30, Math.random() * 18, 70, 26)
        .fill({ color: 0xaab6d8, alpha: 0.05 + Math.random() * 0.05 });
    }
    cloud.x = Math.random() * 1600;
    return cloud;
  }

  override destroy(): void {
    this.stars = [];
    this.clouds = [];
    super.destroy();
  }
}
