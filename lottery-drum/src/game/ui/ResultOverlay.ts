import { BlurFilter, Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  BIG_NUMERAL_SIZE,
  COLOR_GREEN_DOT,
  COLOR_PILL_BG,
  COLOR_RESULT_CYAN,
  COLOR_RESULT_RED,
  PILL_HEIGHT,
  PILL_MIN_WIDTH,
  PILL_OFFSET_Y,
} from '../GameConfig';
import { clamp, lerp } from '../utils/math';

/**
 * The two graphics composited over the drum in the reference:
 *
 *  - a large translucent red numeral behind the glass, and
 *  - a dark "Hasil" pill that morphs from a compact green-dot readout into a
 *    wide glowing cyan number when the draw resolves.
 *
 * Both live in world space, which is why they grow with the camera dolly in
 * the source footage.
 */
export class ResultOverlay {
  /** The large red numeral, composited over the glass and under the pill. */
  readonly numeralLayer = new Container();
  /** The "Hasil" pill, the topmost element in the frame. */
  readonly pillLayer = new Container();

  private readonly bigNumber: Text;
  private readonly pill = new Container();
  private readonly pillBg = new Graphics();
  private readonly pillLabel: Text;
  private readonly pillDot = new Graphics();
  private readonly pillNumber: Text;
  private readonly pillGlow: Text;

  /** 0 = compact green readout, 1 = revealed cyan readout. */
  private revealAmount = 0;
  private pillWidth = PILL_MIN_WIDTH;

  constructor(fontFamily: string) {
    this.bigNumber = new Text({
      text: '19',
      style: new TextStyle({
        fontFamily,
        fontSize: BIG_NUMERAL_SIZE,
        fontWeight: '800',
        fill: COLOR_RESULT_RED,
        letterSpacing: -6,
      }),
    });
    this.bigNumber.anchor.set(0.5);
    this.bigNumber.alpha = 0.8;
    this.numeralLayer.addChild(this.bigNumber);

    this.pillLabel = new Text({
      text: 'Hasil',
      style: new TextStyle({
        fontFamily,
        fontSize: 34,
        fontWeight: '700',
        fill: 0xf2f4f7,
      }),
    });
    this.pillLabel.anchor.set(0, 0.5);

    this.pillNumber = new Text({
      text: '19',
      style: new TextStyle({
        fontFamily,
        fontSize: 40,
        fontWeight: '700',
        fill: 0xf2f4f7,
      }),
    });
    this.pillNumber.anchor.set(0.5);

    // A blurred copy sitting underneath produces the cyan bloom on reveal.
    this.pillGlow = new Text({
      text: '19',
      style: new TextStyle({
        fontFamily,
        fontSize: 40,
        fontWeight: '700',
        fill: COLOR_RESULT_CYAN,
      }),
    });
    this.pillGlow.anchor.set(0.5);
    this.pillGlow.filters = [new BlurFilter({ strength: 10, quality: 3 })];
    this.pillGlow.alpha = 0;

    this.pill.addChild(this.pillBg, this.pillLabel, this.pillDot, this.pillGlow, this.pillNumber);
    this.pill.y = PILL_OFFSET_Y;
    this.pillLayer.addChild(this.pill);

    this.setNumber(19);
    this.layout();
  }

  setNumber(value: number): void {
    const text = String(value);
    this.bigNumber.text = text;
    this.pillNumber.text = text;
    this.pillGlow.text = text;
    this.layout();
  }

  /** Fades the big red numeral out while the camera is deep in the close-up. */
  setBigNumeralAlpha(alpha: number): void {
    this.bigNumber.alpha = alpha;
  }

  /**
   * Drives the compact-to-revealed morph. Called every frame with an eased
   * value so the transition is time-based, not frame-counted.
   */
  setReveal(amount: number): void {
    const t = clamp(amount, 0, 1);
    if (t === this.revealAmount) return;
    this.revealAmount = t;
    this.layout();
  }

  /** The pill widens as the reveal progresses, matching the reference. */
  private layout(): void {
    const t = this.revealAmount;
    const height = lerp(PILL_HEIGHT, PILL_HEIGHT * 1.18, t);

    this.pillLabel.style.fontSize = lerp(34, 42, t);
    const numberSize = lerp(40, 78, t);
    this.pillNumber.style.fontSize = numberSize;
    this.pillGlow.style.fontSize = numberSize;

    // The green status dot only exists in the compact readout.
    const dotAlpha = 1 - clamp(t * 2, 0, 1);
    const dotDiameter = dotAlpha > 0.01 ? 24 : 0;

    this.pillDot
      .clear()
      .circle(0, 0, 12)
      .fill({ color: COLOR_GREEN_DOT, alpha: dotAlpha })
      .circle(-3, -3, 5)
      .fill({ color: 0x9ff0bb, alpha: dotAlpha * 0.8 });
    this.pillDot.visible = dotDiameter > 0;

    // Lay the row out from measured text so it stays centred at any font size.
    const labelWidth = this.pillLabel.width;
    const numberWidth = this.pillNumber.width;
    const gap = lerp(30, 58, t);
    const contentWidth =
      labelWidth + gap + numberWidth + (dotDiameter > 0 ? dotDiameter + gap : 0);

    let cursor = -contentWidth / 2;
    this.pillLabel.x = cursor;
    cursor += labelWidth + gap;
    if (dotDiameter > 0) {
      this.pillDot.x = cursor + dotDiameter / 2;
      cursor += dotDiameter + gap;
    }
    const numberX = cursor + numberWidth / 2;
    this.pillNumber.x = numberX;
    this.pillGlow.x = numberX;

    this.pillNumber.style.fill = t > 0.5 ? COLOR_RESULT_CYAN : 0xf2f4f7;
    this.pillGlow.alpha = t * 0.85;
    this.pillGlow.visible = t > 0.02;

    this.pillWidth = Math.max(PILL_MIN_WIDTH, contentWidth + lerp(150, 260, t));
    const half = this.pillWidth / 2;

    this.pillBg
      .clear()
      .roundRect(-half, -height / 2, this.pillWidth, height, height / 2)
      .fill({ color: COLOR_PILL_BG, alpha: lerp(0.82, 0.88, t) })
      .roundRect(-half, -height / 2, this.pillWidth, height, height / 2)
      .stroke({ width: 1.5, color: 0xffffff, alpha: lerp(0.1, 0.16, t) });
  }
}
