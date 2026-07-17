import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '@/constants';

/**
 * Preloader scene: logo + progress bar. Progress is fed by AssetManager.
 */
export class LoadingScene {
  readonly container = new Container();
  private barFill: Graphics;
  private percentText: Text;
  private readonly barWidth = 420;

  constructor() {
    const bg = new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: 0x0b0716 });
    this.container.addChild(bg);

    const title = new Text({
      text: 'ROYAL FORTUNE',
      style: new TextStyle({
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: '900',
        fontSize: 64,
        fill: 0xffc93c,
        stroke: { color: 0x2a1a00, width: 8 },
        dropShadow: { color: 0xffc93c, blur: 22, distance: 0, alpha: 0.5 },
        letterSpacing: 6,
      }),
    });
    title.anchor.set(0.5);
    title.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 80);
    this.container.addChild(title);

    const barX = (DESIGN_WIDTH - this.barWidth) / 2;
    const barY = DESIGN_HEIGHT / 2 + 30;
    const barBg = new Graphics()
      .roundRect(barX - 4, barY - 4, this.barWidth + 8, 26, 13)
      .fill({ color: 0x1e1433 })
      .stroke({ color: 0xffc93c, width: 2 });
    this.container.addChild(barBg);

    this.barFill = new Graphics();
    this.container.addChild(this.barFill);

    this.percentText = new Text({
      text: '0%',
      style: new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 20,
        fill: 0xcbbcf5,
      }),
    });
    this.percentText.anchor.set(0.5);
    this.percentText.position.set(DESIGN_WIDTH / 2, barY + 52);
    this.container.addChild(this.percentText);

    this.setProgress(0);
  }

  setProgress(progress: number): void {
    const barX = (DESIGN_WIDTH - this.barWidth) / 2;
    const barY = DESIGN_HEIGHT / 2 + 30;
    this.barFill.clear();
    if (progress > 0) {
      this.barFill
        .roundRect(barX, barY, Math.max(18, this.barWidth * progress), 18, 9)
        .fill({ color: 0xffc93c });
    }
    this.percentText.text = `${Math.round(progress * 100)}%`;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
