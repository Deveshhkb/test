import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import {
  BALL_BLACK,
  BALL_BLACK_SHADOW,
  BALL_RADIUS,
  BALL_RED,
  BALL_RED_SHADOW,
  BALL_TEXTURE_RESOLUTION,
  TRAIL_LENGTH,
  TRAIL_MIN_SPEED,
} from '../GameConfig';
import { BallBody } from './BallBody';
import { clamp } from '../utils/math';
import { shadowTexture, sphereTexture } from '../utils/TextureFactory';

export type BallTint = 'red' | 'black';

/**
 * One numbered ball: a generated lit sphere, a printed number insert, a contact
 * shadow that tracks the light, and motion-blur ghosts.
 *
 * Built once and only ever transformed. The two sphere textures and the shadow
 * are shared across every instance, so eighteen balls cost three uploads.
 */
export class RouletteBall {
  readonly view = new Container();
  readonly body: BallBody;

  private readonly sphere: Sprite;
  private readonly contactShadow: Sprite;
  private readonly face = new Container();
  private readonly label: Text;
  private readonly insert: Graphics;
  private readonly trail: Sprite[] = [];
  private readonly trailX = new Float32Array(TRAIL_LENGTH);
  private readonly trailY = new Float32Array(TRAIL_LENGTH);
  private trailHead = 0;

  private numberValue = 0;

  constructor(id: number, labelStyle: TextStyle) {
    this.body = new BallBody(id, BALL_RADIUS);

    const spriteScale = (BALL_RADIUS * 2) / BALL_TEXTURE_RESOLUTION;

    this.contactShadow = new Sprite(shadowTexture());
    this.contactShadow.anchor.set(0.5);
    this.contactShadow.width = BALL_RADIUS * 2.5;
    this.contactShadow.height = BALL_RADIUS * 1.1;
    this.contactShadow.alpha = 0.4;

    this.sphere = new Sprite(sphereTexture(BALL_RED, BALL_RED_SHADOW, BALL_TEXTURE_RESOLUTION));
    this.sphere.anchor.set(0.5);
    this.sphere.scale.set(spriteScale * 1.12);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const ghost = new Sprite(this.sphere.texture);
      ghost.anchor.set(0.5);
      ghost.scale.set(spriteScale);
      ghost.visible = false;
      this.trail.push(ghost);
    }

    // Printed insert: a recessed white disc carrying the number.
    this.insert = new Graphics();
    this.label = new Text({ text: '0', style: labelStyle });
    this.label.anchor.set(0.5);
    this.face.addChild(this.insert, this.label);

    this.view.addChild(this.sphere, this.face);
    this.paint('red');
  }

  get trailViews(): readonly Sprite[] {
    return this.trail;
  }

  get shadowView(): Sprite {
    return this.contactShadow;
  }

  get number(): number {
    return this.numberValue;
  }

  setNumber(value: number): void {
    this.numberValue = value;
    this.label.text = String(value);
    this.label.scale.set(String(value).length > 1 ? 0.78 : 0.95);
  }

  paint(tint: BallTint): void {
    const texture =
      tint === 'red'
        ? sphereTexture(BALL_RED, BALL_RED_SHADOW, BALL_TEXTURE_RESOLUTION)
        : sphereTexture(BALL_BLACK, BALL_BLACK_SHADOW, BALL_TEXTURE_RESOLUTION);

    this.sphere.texture = texture;
    for (const ghost of this.trail) ghost.texture = texture;

    const r = BALL_RADIUS * 0.44;
    this.insert
      .clear()
      // Recess ring under the insert.
      .circle(0, 0, r + 2.5)
      .fill({ color: 0x000000, alpha: 0.35 })
      .circle(0, 0, r)
      .fill({ color: 0xf6f5f1 })
      .circle(-r * 0.2, -r * 0.24, r * 0.78)
      .fill({ color: 0xffffff })
      .circle(0, 0, r)
      .stroke({ width: 1.2, color: 0xb9b8b2, alpha: 0.9 });

    // Moulded balls carry a second, smaller print above the main face. It sits
    // toward the light so it reads as curving away over the shoulder.
    this.insert
      .ellipse(-BALL_RADIUS * 0.16, -BALL_RADIUS * 0.54, r * 0.3, r * 0.22)
      .fill({ color: 0xe8e7e2, alpha: 0.5 });
  }

  reset(x: number, y: number): void {
    this.body.reset(x, y);
    this.view.visible = true;
    this.view.alpha = 1;
    this.view.scale.set(1);
    this.contactShadow.visible = true;
    this.contactShadow.alpha = 0.4;
    this.trailHead = 0;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailX[i] = x;
      this.trailY[i] = y;
      this.trail[i].visible = false;
    }
  }

  setVisible(visible: boolean): void {
    this.view.visible = visible;
    this.contactShadow.visible = visible;
    if (!visible) for (const ghost of this.trail) ghost.visible = false;
  }

  /**
   * Sync display objects to the simulated body.
   *
   * `depth` is the ball's height in the playfield, normalised to -1 at the top
   * of the drum and +1 at the bottom. Balls low in the bowl are nearer the
   * camera, so they scale up slightly and cast a tighter shadow.
   */
  sync(depth: number): void {
    const { position } = this.body;
    this.view.x = position.x;
    this.view.y = position.y;
    this.view.rotation = this.body.rotation * 0.25;
    this.face.rotation = -this.view.rotation;

    const proximity = clamp((depth + 1) * 0.5, 0, 1);
    this.view.scale.set(0.94 + proximity * 0.1);

    this.contactShadow.x = position.x + 5;
    this.contactShadow.y = position.y + BALL_RADIUS * 0.72;
    this.contactShadow.alpha = (0.2 + proximity * 0.28) * this.view.alpha;
    this.contactShadow.scale.set(
      (BALL_RADIUS * 2.5) / 256,
      ((BALL_RADIUS * 1.1) / 256) * (0.8 + proximity * 0.4),
    );

    this.updateTrail();
  }

  private updateTrail(): void {
    const speed = this.body.speed;
    const visible = this.view.visible && speed > TRAIL_MIN_SPEED;

    this.trailX[this.trailHead] = this.body.position.x;
    this.trailY[this.trailHead] = this.body.position.y;
    this.trailHead = (this.trailHead + 1) % TRAIL_LENGTH;

    if (!visible) {
      for (const ghost of this.trail) ghost.visible = false;
      return;
    }

    const intensity = clamp((speed - TRAIL_MIN_SPEED) / TRAIL_MIN_SPEED, 0, 1);
    const base = (BALL_RADIUS * 2) / 256;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const index = (this.trailHead + i) % TRAIL_LENGTH;
      const ghost = this.trail[i];
      const age = (i + 1) / TRAIL_LENGTH;
      ghost.visible = true;
      ghost.x = this.trailX[index];
      ghost.y = this.trailY[index];
      ghost.alpha = 0.4 * age * intensity * this.view.alpha;
      ghost.scale.set(base * (0.74 + age * 0.24));
    }
  }
}
