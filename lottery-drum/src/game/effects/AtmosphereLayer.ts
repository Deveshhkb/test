import { Container, Sprite } from 'pixi.js';
import {
  COLOR_NEON,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MACHINE_X,
  MACHINE_Y,
} from '../GameConfig';
import { glowTexture, vignetteTexture } from '../utils/TextureFactory';

/**
 * The finishing pass over the frame: a key glow above the machine, a shallow
 * depth haze, and a vignette.
 *
 * This is what stops a scene assembled from flat shapes reading as evenly lit
 * poster art. The reference studio is mostly deep navy with a handful of small
 * bright accents, and the corners fall away hard; without a vignette every
 * surface competes for attention and nothing reads as lit.
 *
 * It lives outside the camera transform, so it stays locked to the frame while
 * the camera dollies, exactly as a lens effect would.
 */
export class AtmosphereLayer {
  readonly view = new Container();

  private readonly keyGlow: Sprite;
  private readonly haze: Sprite;
  private time = 0;

  constructor() {
    // Soft key wash falling from the lighting rig onto the machine.
    this.keyGlow = new Sprite(glowTexture(0xbfe3ff));
    this.keyGlow.anchor.set(0.5);
    this.keyGlow.width = DESIGN_WIDTH * 0.95;
    this.keyGlow.height = DESIGN_HEIGHT * 1.15;
    this.keyGlow.position.set(MACHINE_X, MACHINE_Y - DESIGN_HEIGHT * 0.1);
    this.keyGlow.alpha = 0.07;
    this.keyGlow.blendMode = 'add';

    // Cool haze sitting in front of the far half of the room.
    this.haze = new Sprite(glowTexture(COLOR_NEON));
    this.haze.anchor.set(0.5);
    this.haze.width = DESIGN_WIDTH * 1.3;
    this.haze.height = DESIGN_HEIGHT * 0.8;
    this.haze.position.set(MACHINE_X, DESIGN_HEIGHT * 0.55);
    this.haze.alpha = 0.05;
    this.haze.blendMode = 'add';

    const vignette = new Sprite(vignetteTexture(0.66, 0.47));
    vignette.width = DESIGN_WIDTH;
    vignette.height = DESIGN_HEIGHT;

    this.view.addChild(this.keyGlow, this.haze, vignette);
    this.view.eventMode = 'none';
  }

  /** The rig lamps breathe very slightly, so the frame is never quite static. */
  update(dt: number): void {
    this.time += dt;
    this.keyGlow.alpha = 0.05 + Math.sin(this.time * 0.6) * 0.008;
    this.haze.alpha = 0.046 + Math.sin(this.time * 0.43 + 1.2) * 0.006;
  }
}
