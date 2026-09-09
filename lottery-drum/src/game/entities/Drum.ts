import { Container, Graphics } from 'pixi.js';
import {
  COLOR_GLASS,
  COLOR_GOLD,
  COLOR_GOLD_DEEP,
  COLOR_PEDESTAL,
  COLOR_STEEL,
  DRUM_GLASS_THICKNESS,
  DRUM_HUB_RADIUS,
  DRUM_INNER_RADIUS,
  DRUM_OUTER_RADIUS,
  DRUM_SLOT_COUNT,
  DRUM_SPOKE_COUNT,
  DRUM_SPOKE_HALF_WIDTH,
} from '../config';
import { TAU } from '../utils/math';

/**
 * The draw machine: pedestal, mount, glass cylinder with its slotted rim, and
 * the five-spoke agitator. Balls are rendered between `behind` and `agitator`,
 * which is the stacking the reference footage shows.
 */
export class Drum {
  readonly view = new Container();

  /** Static machine body, drawn under the balls. */
  readonly behind = new Container();
  /** Slotted rim; rotates with the agitator because the whole drum turns. */
  readonly rim = new Container();
  /** Host for the ball layers; the Game fills this in. */
  readonly ballLayer = new Container();
  /** Rotating agitator, drawn over the balls. */
  readonly agitator = new Container();
  /** Near glass wall and highlights, drawn over everything. */
  readonly front = new Container();

  /** Slot cup centres in drum-local space, used to park the winning ball. */
  readonly slotAngles: number[] = [];
  readonly slotRadius: number;

  private readonly spokes = new Graphics();
  private readonly hub = new Graphics();

  constructor() {
    this.slotRadius = DRUM_INNER_RADIUS - 6;
    for (let i = 0; i < DRUM_SLOT_COUNT; i++) {
      this.slotAngles.push((i / DRUM_SLOT_COUNT) * TAU);
    }

    this.buildPedestal();
    this.buildShellBack();
    this.buildAgitator();
    this.buildShellFront();

    this.view.addChild(this.behind, this.ballLayer, this.agitator, this.front);
  }

  /** Drives the rotating parts from the physics world's angle. */
  setAngle(angle: number): void {
    this.agitator.rotation = angle;
    this.rim.rotation = angle;
  }

  private buildPedestal(): void {
    const g = new Graphics();
    const baseTop = DRUM_OUTER_RADIUS + 88;

    // Column under the drum.
    g.roundRect(-96, DRUM_OUTER_RADIUS - 40, 192, 210, 10).fill({ color: COLOR_PEDESTAL });
    g.roundRect(-76, DRUM_OUTER_RADIUS - 30, 152, 190, 8).fill({ color: 0x1c2231 });

    // Servo / release box that the balls drop through.
    g.roundRect(-58, DRUM_OUTER_RADIUS - 46, 116, 62, 6).fill({ color: 0x232a3a });
    g.roundRect(-40, DRUM_OUTER_RADIUS - 34, 80, 34, 4).fill({ color: 0x0e131c });
    for (let i = 0; i < 3; i++) {
      g.rect(-30 + i * 22, DRUM_OUTER_RADIUS - 26, 14, 18).fill({
        color: 0x2f89c9,
        alpha: 0.55,
      });
    }

    // Vertical mount arms flanking the glass, as on the real machine.
    for (const side of [-1, 1]) {
      g.roundRect(side * (DRUM_OUTER_RADIUS - 8) - 9, -DRUM_OUTER_RADIUS * 0.55, 18, baseTop, 6).fill({
        color: 0x11161f,
      });
      g.roundRect(side * (DRUM_OUTER_RADIUS - 8) - 4, -DRUM_OUTER_RADIUS * 0.55, 4, baseTop, 2).fill({
        color: COLOR_STEEL,
        alpha: 0.35,
      });
    }

    // Wide plinth.
    g.roundRect(-190, baseTop + 116, 380, 66, 10).fill({ color: 0x0d111a });
    g.roundRect(-190, baseTop + 116, 380, 10, 6).fill({ color: 0x2a3346 });

    this.behind.addChild(g);
  }

  private buildShellBack(): void {
    const g = new Graphics();

    // Interior of the cylinder: a dark disc with a soft blue cast.
    g.circle(0, 0, DRUM_INNER_RADIUS + 12).fill({ color: 0x0a1220, alpha: 0.92 });
    g.circle(0, 0, DRUM_INNER_RADIUS + 12).fill({ color: 0x123457, alpha: 0.22 });

    // Slotted cups moulded into the inner rim.
    for (const angle of this.slotAngles) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cx = cos * this.slotRadius;
      const cy = sin * this.slotRadius;
      const g2 = new Graphics();
      g2.roundRect(-28, -13, 56, 26, 5).fill({ color: COLOR_GLASS, alpha: 0.09 });
      g2.roundRect(-28, -13, 56, 26, 5).stroke({ width: 2, color: COLOR_GLASS, alpha: 0.24 });
      g2.roundRect(-26, 4, 52, 8, 3).fill({ color: COLOR_STEEL, alpha: 0.2 });
      g2.position.set(cx, cy);
      g2.rotation = angle + Math.PI / 2;
      this.rim.addChild(g2);
    }

    this.behind.addChild(g, this.rim);
  }

  private buildAgitator(): void {
    const half = DRUM_SPOKE_HALF_WIDTH;
    const inner = DRUM_HUB_RADIUS;
    const outer = DRUM_INNER_RADIUS - 4;

    for (let i = 0; i < DRUM_SPOKE_COUNT; i++) {
      const angle = (i / DRUM_SPOKE_COUNT) * TAU;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Brushed steel rod.
      this.spokes
        .moveTo(cos * inner - sin * half, sin * inner + cos * half)
        .lineTo(cos * outer - sin * half, sin * outer + cos * half)
        .lineTo(cos * outer + sin * half, sin * outer - cos * half)
        .lineTo(cos * inner + sin * half, sin * inner - cos * half)
        .closePath()
        .fill({ color: 0xd7dee7, alpha: 0.85 });

      // Paddle block near the rim that scoops the balls.
      const paddle = new Graphics();
      paddle.roundRect(-9, -16, 18, 32, 4).fill({ color: 0xe3e9f0, alpha: 0.9 });
      paddle.roundRect(-9, -16, 18, 32, 4).stroke({ width: 1.5, color: 0x7d8996, alpha: 0.8 });
      paddle.position.set(cos * (outer - 14), sin * (outer - 14));
      paddle.rotation = angle;
      this.agitator.addChild(paddle);
    }

    // Gold and red hub, matching the centre boss in the reference.
    this.hub
      .circle(0, 0, DRUM_HUB_RADIUS + 8)
      .fill({ color: 0x1a1a1e, alpha: 0.9 })
      .circle(0, 0, DRUM_HUB_RADIUS + 4)
      .fill({ color: 0xc4322c })
      .circle(0, 0, DRUM_HUB_RADIUS - 2)
      .fill({ color: COLOR_GOLD_DEEP })
      .circle(0, 0, DRUM_HUB_RADIUS - 9)
      .fill({ color: COLOR_GOLD })
      .circle(-3, -3, DRUM_HUB_RADIUS - 15)
      .fill({ color: 0xfdeec3 });

    this.agitator.addChildAt(this.spokes, 0);
    this.agitator.addChild(this.hub);
  }

  private buildShellFront(): void {
    const g = new Graphics();
    const rOut = DRUM_OUTER_RADIUS;
    const rIn = DRUM_OUTER_RADIUS - DRUM_GLASS_THICKNESS;

    // The glass wall, drawn as a translucent annulus plus an inner lip.
    g.circle(0, 0, rOut).fill({ color: COLOR_GLASS, alpha: 0.1 });
    g.circle(0, 0, rIn).cut();
    g.circle(0, 0, rOut).stroke({ width: 3, color: COLOR_GLASS, alpha: 0.55 });
    g.circle(0, 0, rIn).stroke({ width: 2, color: COLOR_GLASS, alpha: 0.4 });
    g.circle(0, 0, DRUM_INNER_RADIUS + 14).stroke({ width: 2, color: COLOR_GLASS, alpha: 0.22 });

    // Specular sweep on the upper-left of the cylinder.
    g.arc(0, 0, rOut - 9, Math.PI * 1.08, Math.PI * 1.46).stroke({
      width: 12,
      color: 0xffffff,
      alpha: 0.28,
      cap: 'round',
    });
    g.arc(0, 0, rOut - 9, Math.PI * 0.06, Math.PI * 0.3).stroke({
      width: 7,
      color: 0xffffff,
      alpha: 0.14,
      cap: 'round',
    });

    // Hood over the top of the drum where the loader sits.
    g.moveTo(-rOut * 0.62, -rOut * 0.79)
      .arc(0, 0, rOut + 16, Math.PI * 1.22, Math.PI * 1.78)
      .lineTo(rOut * 0.62, -rOut * 0.79)
      .arc(0, 0, rOut - 2, Math.PI * 1.78, Math.PI * 1.22, true)
      .closePath()
      .fill({ color: COLOR_GLASS, alpha: 0.14 });

    // A faint glass edge on the sides so the cylinder reads as 3D.
    for (const side of [-1, 1]) {
      g.ellipse(side * (rOut - 4), 0, 6, rOut * 0.9).fill({ color: 0xffffff, alpha: 0.05 });
    }

    this.front.addChild(g);
  }
}
