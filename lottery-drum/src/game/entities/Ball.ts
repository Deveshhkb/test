import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  BALL_CRIMSON,
  BALL_CRIMSON_DARK,
  BALL_ONYX,
  BALL_ONYX_DARK,
  BALL_RADIUS,
  TRAIL_LENGTH,
  TRAIL_MIN_SPEED,
} from '../config';
import { BallBody } from '../physics/BallBody';
import { clamp } from '../utils/math';

export type BallTint = 'crimson' | 'onyx';

/**
 * The visual half of a lottery ball. Built once and then only transformed, so
 * a running draw allocates nothing. The printed number sits on a small white
 * disc, matching the balls in the reference footage.
 */
export class Ball {
  readonly view = new Container();
  readonly body: BallBody;

  private readonly sphere = new Graphics();
  private readonly face = new Container();
  private readonly label: Text;
  private readonly trail: Graphics[] = [];
  private readonly trailX = new Float32Array(TRAIL_LENGTH);
  private readonly trailY = new Float32Array(TRAIL_LENGTH);
  private trailHead = 0;

  private numberValue = 0;

  constructor(id: number, labelStyle: TextStyle) {
    this.body = new BallBody(id, BALL_RADIUS);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const ghost = new Graphics();
      ghost.visible = false;
      this.trail.push(ghost);
    }

    this.label = new Text({ text: '0', style: labelStyle });
    this.label.anchor.set(0.5);

    const disc = new Graphics()
      .circle(0, 0, BALL_RADIUS * 0.42)
      .fill({ color: 0xf4f4f2 })
      .circle(0, 0, BALL_RADIUS * 0.42)
      .stroke({ width: 1.5, color: 0xc9c9c4, alpha: 0.9 });

    this.face.addChild(disc, this.label);
    this.view.addChild(this.sphere, this.face);
    this.paint('crimson');
  }

  /** Ghost graphics live in a separate layer so they draw under every ball. */
  get trailViews(): readonly Graphics[] {
    return this.trail;
  }

  get number(): number {
    return this.numberValue;
  }

  setNumber(value: number): void {
    this.numberValue = value;
    this.label.text = String(value);
    // Keep two-digit labels inside the disc.
    this.label.scale.set(String(value).length > 1 ? 0.58 : 0.72);
  }

  paint(tint: BallTint): void {
    const base = tint === 'crimson' ? BALL_CRIMSON : BALL_ONYX;
    const shade = tint === 'crimson' ? BALL_CRIMSON_DARK : BALL_ONYX_DARK;
    const r = BALL_RADIUS;

    this.sphere
      .clear()
      .circle(0, 0, r)
      .fill({ color: shade })
      .circle(r * 0.06, r * 0.06, r * 0.94)
      .fill({ color: base })
      // Rim light along the lower-right, as in the studio lighting of the clip.
      .circle(r * 0.3, r * 0.34, r * 0.62)
      .fill({ color: base, alpha: 0.0 })
      .circle(-r * 0.34, -r * 0.36, r * 0.3)
      .fill({ color: 0xffffff, alpha: tint === 'crimson' ? 0.4 : 0.26 })
      .circle(-r * 0.42, -r * 0.44, r * 0.14)
      .fill({ color: 0xffffff, alpha: 0.7 });

    for (const ghost of this.trail) {
      ghost.clear().circle(0, 0, r * 0.92).fill({ color: base, alpha: 1 });
    }
  }

  reset(x: number, y: number): void {
    this.body.reset(x, y);
    this.view.visible = true;
    this.view.alpha = 1;
    this.view.scale.set(1);
    this.trailHead = 0;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailX[i] = x;
      this.trailY[i] = y;
      this.trail[i].visible = false;
    }
  }

  setVisible(visible: boolean): void {
    this.view.visible = visible;
    if (!visible) for (const ghost of this.trail) ghost.visible = false;
  }

  /** Sync the display objects to the simulated body. */
  sync(): void {
    const { position } = this.body;
    this.view.x = position.x;
    this.view.y = position.y;
    this.view.rotation = this.body.rotation * 0.25;

    // The printed face stays upright, like a weighted lottery ball insert.
    this.face.rotation = -this.view.rotation;

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
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const index = (this.trailHead + i) % TRAIL_LENGTH;
      const ghost = this.trail[i];
      const age = (i + 1) / TRAIL_LENGTH;
      ghost.visible = true;
      ghost.x = this.trailX[index];
      ghost.y = this.trailY[index];
      ghost.alpha = 0.45 * age * intensity * this.view.alpha;
      ghost.scale.set(0.72 + age * 0.24);
    }
  }
}
