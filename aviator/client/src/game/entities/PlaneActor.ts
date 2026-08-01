import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

/**
 * The aircraft — a layered display object, not a flat sprite.
 *
 * Parts (each individually animated in `update`):
 *   fuselage / wings / tail  — vector-drawn once, wobble with turbulence
 *   propeller                — spinning blade pair + motion-blur disc
 *   engine glow              — additive halo that breathes with speed
 *   navigation lights        — port red / starboard green slow blink
 *   tail strobe              — aviation double-flash pattern
 *
 * The scene owns the plane's world position/rotation (it follows the flight
 * path); the actor owns everything that moves *relative to the airframe*,
 * so path-following and airframe life never fight each other.
 */
export interface PlaneUpdateContext {
  dt: number;
  elapsed: number;
  /** Normalised airspeed 0..1 — drives prop rate, glow, turbulence. */
  speed: number;
  crashed: boolean;
}

/** Local-space attachment points (airframe coordinates, nose = +x). */
export const PLANE_ANCHORS = {
  exhaust: { x: -46, y: 4 },
  contrail: { x: -48, y: 0 },
  noseFire: { x: 40, y: 0 },
} as const;

const BLINK_PERIOD = 1.2;
const STROBE_PERIOD = 1.6;

export class PlaneActor {
  readonly container = new Container();

  private readonly airframe = new Container();
  private readonly body = new Graphics();
  private readonly propeller = new Container();
  private readonly propBlades = new Graphics();
  private readonly propDisc = new Graphics();
  private readonly engineGlow: Sprite;
  private readonly navPort: Sprite;
  private readonly navStarboard: Sprite;
  private readonly strobe: Sprite;
  private destroyed = false;

  constructor(softTexture: Texture) {
    this.drawAirframe();

    // Propeller at the nose: two blades plus a translucent disc that fakes
    // motion blur once the blades spin faster than the eye tracks.
    this.propBlades.ellipse(0, -13, 3.2, 13).fill(0x2a2f3a);
    this.propBlades.ellipse(0, 13, 3.2, 13).fill(0x2a2f3a);
    this.propBlades.circle(0, 0, 4.4).fill(0x9aa3b5);
    this.propDisc.circle(0, 0, 27).fill({ color: 0xcfd6e6, alpha: 0.14 });
    this.propDisc.alpha = 0;
    this.propeller.position.set(46, 0);
    this.propeller.addChild(this.propDisc, this.propBlades);

    this.engineGlow = new Sprite(softTexture);
    this.engineGlow.anchor.set(0.5);
    this.engineGlow.position.set(34, 2);
    this.engineGlow.tint = 0xff8a3c;
    this.engineGlow.blendMode = 'add';
    this.engineGlow.alpha = 0;
    this.engineGlow.scale.set(0.9);

    this.navPort = this.buildLight(softTexture, 0xff3b4d, -44, -18, 0.28);
    this.navStarboard = this.buildLight(softTexture, 0x37e07a, -2, 22, 0.28);
    this.strobe = this.buildLight(softTexture, 0xffffff, -40, -20, 0.4);

    this.airframe.addChild(
      this.engineGlow,
      this.body,
      this.propeller,
      this.navPort,
      this.navStarboard,
      this.strobe,
    );
    this.container.addChild(this.airframe);
  }

  update(ctx: PlaneUpdateContext): void {
    if (this.destroyed) return;
    const { dt, elapsed, speed, crashed } = ctx;

    // Propeller: idle tick-over on the ground, blur disc at speed.
    const propRate = crashed ? 2 : 9 + speed * 75;
    this.propBlades.rotation += propRate * dt;
    this.propDisc.alpha = crashed ? 0 : Math.min(1, speed * 2.2);
    this.propBlades.alpha = crashed ? 1 : 1 - Math.min(0.65, speed * 0.9);

    // Engine glow breathes; brighter and faster with airspeed.
    const glowPulse = 0.75 + 0.25 * Math.sin(elapsed * (6 + speed * 14));
    this.engineGlow.alpha = crashed ? 0 : speed * 0.55 * glowPulse;
    this.engineGlow.scale.set(0.8 + speed * 0.5 * glowPulse);

    // Aviation lights: nav lights alternate; strobe double-flashes.
    const blinkT = elapsed % BLINK_PERIOD;
    this.navPort.alpha = blinkT < BLINK_PERIOD / 2 ? 0.95 : 0.15;
    this.navStarboard.alpha = blinkT < BLINK_PERIOD / 2 ? 0.15 : 0.95;
    const strobeT = elapsed % STROBE_PERIOD;
    const strobeOn = strobeT < 0.06 || (strobeT > 0.14 && strobeT < 0.2);
    this.strobe.alpha = strobeOn ? 1 : 0;

    // Airframe turbulence: high-frequency micro-wobble that scales with
    // speed — this is the "feels heavy, alive" detail, kept inside the
    // actor so it never fights the path-following rotation outside.
    if (!crashed) {
      this.airframe.rotation =
        Math.sin(elapsed * 13.7) * 0.012 * speed + Math.sin(elapsed * 5.3) * 0.008 * speed;
      this.airframe.y = Math.sin(elapsed * 9.1) * 1.6 * speed;
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.destroy({ children: true });
  }

  private buildLight(texture: Texture, tint: number, x: number, y: number, scale: number): Sprite {
    const light = new Sprite(texture);
    light.anchor.set(0.5);
    light.position.set(x, y);
    light.tint = tint;
    light.blendMode = 'add';
    light.scale.set(scale);
    light.alpha = 0;
    return light;
  }

  private drawAirframe(): void {
    const g = this.body;

    // Rear wing (drawn first: sits behind the fuselage).
    g.poly([-26, -2, -46, 5, -30, 8]).fill(0xb92844);

    // Fuselage: white hull with a red belly stripe.
    g.ellipse(0, 0, 44, 12).fill(0xf4f6fb);
    g.moveTo(-42, 4).quadraticCurveTo(0, 14, 42, 5).lineTo(42, 9).quadraticCurveTo(0, 18, -42, 9);
    g.fill(0xe0304f);

    // Tail fin.
    g.poly([-28, -3, -46, -22, -37, -22, -24, -6]).fill(0xe0304f);

    // Main wing, swept low across the hull.
    g.poly([6, 2, -14, 22, 0, 24, 18, 6]).fill(0xcf2547);
    // Wing highlight edge.
    g.poly([6, 2, -14, 22, -11, 22, 8, 4]).fill(0xff5c77);

    // Cockpit canopy.
    g.ellipse(14, -6, 11, 6).fill({ color: 0x1c2740, alpha: 0.92 });
    g.ellipse(16, -7.5, 6, 2.5).fill({ color: 0x8fb4e8, alpha: 0.75 });

    // Nose cone.
    g.circle(41, 0, 7).fill(0xe0304f);
    g.circle(41, 0, 7).stroke({ width: 1.5, color: 0xb92844 });
  }
}
