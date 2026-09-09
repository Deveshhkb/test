import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { COLOR_GOLD, COLOR_GOLD_DEEP } from '../GameConfig';
import { TAU } from '../utils/math';

/** Standard European wheel order, used by the offline fallback. */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/**
 * Content for the right monitor: a real video surface.
 *
 * The video is a genuine `<video>` element sampled as a Pixi texture, so the
 * picture lives inside the scene - the drum occludes it, the glass reflects
 * over it, and it sits at the monitor's depth. That is only possible for a
 * source the page can actually read: a direct file or stream that permits
 * cross-origin reads. A YouTube embed is a sandboxed cross-origin iframe whose
 * pixels the page may never touch, so it can only be layered over the canvas as
 * a DOM element, where nothing in the scene could overlap it. If you need a
 * YouTube player specifically, that trade-off has to be made deliberately.
 *
 * With no source configured the monitor shows a generated wheel instead, so the
 * set is never a black rectangle.
 */
export class LiveVideoFeed {
  readonly view = new Container();

  private readonly fallback = new Container();
  private readonly wheel = new Container();
  private readonly liveTag: Container;
  private video: HTMLVideoElement | null = null;
  private videoSprite: Sprite | null = null;
  private spinSpeed = 0.34;
  private time = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
    fontFamily: string,
    sourceUrl: string,
  ) {
    this.buildFallback(fontFamily);
    this.view.addChild(this.fallback);

    this.liveTag = this.buildLiveTag(fontFamily);
    this.view.addChild(this.liveTag);

    if (sourceUrl) this.attachVideo(sourceUrl);
  }

  /**
   * Swaps the fallback for a live picture. Safe to call at any time; if the
   * source fails to load the generated wheel simply stays on screen.
   */
  attachVideo(sourceUrl: string): void {
    const video = document.createElement('video');
    video.src = sourceUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';

    video.addEventListener('error', () => this.detachVideo());
    video.addEventListener('canplay', () => {
      if (this.videoSprite || !this.video) return;

      const sprite = new Sprite(Texture.from(video));
      sprite.anchor.set(0.5);
      // Cover the screen without distorting the picture.
      const scale = Math.max(this.width / video.videoWidth, this.height / video.videoHeight);
      sprite.width = video.videoWidth * scale;
      sprite.height = video.videoHeight * scale;

      this.videoSprite = sprite;
      this.fallback.visible = false;
      this.view.addChildAt(sprite, 0);
    });

    this.video = video;
    void video.play().catch(() => {
      // Autoplay refused until a gesture; resume() retries after the first one.
    });
  }

  /** Call after a user gesture: browsers block autoplay before one. */
  resume(): void {
    if (this.video && this.video.paused) void this.video.play().catch(() => undefined);
  }

  private detachVideo(): void {
    this.videoSprite?.destroy();
    this.videoSprite = null;
    this.video = null;
    this.fallback.visible = true;
  }

  update(dt: number): void {
    this.time += dt;
    // The fallback wheel only turns when it is the thing being shown.
    if (this.fallback.visible) this.wheel.rotation = (this.wheel.rotation + this.spinSpeed * dt) % TAU;
    // Broadcast tally light, on either source.
    this.liveTag.alpha = 0.75 + Math.sin(this.time * 3) * 0.25;
  }

  destroy(): void {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    }
    this.video = null;
  }

  /** The "LIVE" tally, so the panel reads as a broadcast feed either way. */
  private buildLiveTag(fontFamily: string): Container {
    const container = new Container();
    const g = new Graphics();
    g.roundRect(0, 0, 62, 22, 3).fill({ color: 0xc0202a, alpha: 0.92 });
    g.circle(12, 11, 4).fill({ color: 0xffffff });
    container.addChild(g);

    const label = new Text({
      text: 'LIVE',
      style: new TextStyle({ fontFamily, fontSize: 13, fontWeight: '800', fill: 0xffffff }),
    });
    label.position.set(24, 4);
    container.addChild(label);
    container.position.set(-this.width / 2 + 14, -this.height / 2 + 14);
    return container;
  }

  private buildFallback(fontFamily: string): void {
    const g = new Graphics();
    g.rect(-this.width / 2, -this.height / 2, this.width, this.height).fill({ color: 0x1b2530 });
    // Letterbox bars, as a broadcast feed would have.
    g.rect(-this.width / 2, -this.height / 2, this.width, this.height * 0.08).fill({
      color: 0x080b10,
    });
    g.rect(-this.width / 2, this.height / 2 - this.height * 0.1, this.width, this.height * 0.1).fill({
      color: 0x080b10,
    });
    this.fallback.addChild(g);

    this.buildWheel(Math.min(this.width, this.height) * 0.54);
    this.fallback.addChild(this.wheel);

    const caption = new Text({
      text: 'LIVE ROULETTE',
      style: new TextStyle({
        fontFamily,
        fontSize: this.height * 0.05,
        fontWeight: '700',
        fill: 0xa8c4dc,
        letterSpacing: 2,
      }),
    });
    caption.anchor.set(0.5, 1);
    caption.position.set(0, this.height / 2 - this.height * 0.02);
    this.fallback.addChild(caption);
  }

  private buildWheel(radius: number): void {
    const g = new Graphics();
    const pockets = WHEEL_ORDER.length;
    const step = TAU / pockets;

    g.circle(0, 0, radius * 1.06).fill({ color: 0x54331c });
    g.circle(0, 0, radius * 1.06).stroke({ width: 2, color: COLOR_GOLD_DEEP, alpha: 0.8 });

    for (let i = 0; i < pockets; i++) {
      const n = WHEEL_ORDER[i];
      const a0 = i * step - step / 2;
      const color = n === 0 ? 0x2ab567 : RED_NUMBERS.has(n) ? 0xd8404f : 0x2a2f36;
      g.moveTo(0, 0).arc(0, 0, radius, a0, a0 + step).closePath().fill({ color });
    }

    g.circle(0, 0, radius * 0.66).fill({ color: 0xa8763c });
    g.circle(0, 0, radius * 0.66).stroke({ width: 1.5, color: COLOR_GOLD_DEEP, alpha: 0.7 });
    g.circle(0, 0, radius * 0.52).fill({ color: 0xc08f4e });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.moveTo(0, 0)
        .lineTo(Math.cos(a) * radius * 0.62, Math.sin(a) * radius * 0.62)
        .stroke({ width: 3, color: COLOR_GOLD, alpha: 0.9 });
    }
    g.circle(0, 0, radius * 0.13).fill({ color: COLOR_GOLD });
    g.circle(0, 0, radius * 0.06).fill({ color: 0xfdeec3 });
    this.wheel.addChild(g);
  }
}

