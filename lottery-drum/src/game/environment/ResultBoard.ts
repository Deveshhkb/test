import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLOR_NEON } from '../GameConfig';

/** Red pockets on a European wheel, for colouring the history chips. */
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const COLUMNS = 6;
const ROWS = 2;

/**
 * Content for the left monitor: the game's own result history.
 *
 * This renders the same history the HUD publishes - it is a second view of
 * existing state, not a second source of truth. `setHistory` is called from the
 * game's `historyChanged` event, so the board and the HUD can never disagree.
 */
export class ResultBoard {
  readonly view = new Container();

  private readonly chips: Array<{ box: Graphics; label: Text }> = [];
  private readonly latest: Text;
  private readonly emptyNote: Text;
  private readonly totalLabel: Text;
  private drawCount = 0;

  constructor(width: number, height: number, fontFamily: string) {
    const pad = width * 0.05;

    this.view.addChild(this.buildBackground(width, height));

    const title = new Text({
      text: 'RIWAYAT HASIL',
      style: new TextStyle({
        fontFamily,
        fontSize: height * 0.075,
        fontWeight: '700',
        fill: 0xcfe4f6,
        letterSpacing: 2,
      }),
    });
    title.position.set(-width / 2 + pad, -height / 2 + pad * 0.8);
    this.view.addChild(title);

    // Latest result, called out large on the left of the board.
    const latestBox = new Graphics()
      .roundRect(-width / 2 + pad, -height * 0.16, width * 0.26, height * 0.44, 6)
      .fill({ color: 0x0b1a2a, alpha: 0.9 })
      .roundRect(-width / 2 + pad, -height * 0.16, width * 0.26, height * 0.44, 6)
      .stroke({ width: 1.2, color: COLOR_NEON, alpha: 0.4 });
    this.view.addChild(latestBox);

    const latestCaption = new Text({
      text: 'TERAKHIR',
      style: new TextStyle({
        fontFamily,
        fontSize: height * 0.055,
        fontWeight: '600',
        fill: 0x7fa3c0,
        letterSpacing: 1.5,
      }),
    });
    latestCaption.anchor.set(0.5, 0);
    latestCaption.position.set(-width / 2 + pad + width * 0.13, -height * 0.115);
    this.view.addChild(latestCaption);

    this.latest = new Text({
      text: '—',
      style: new TextStyle({
        fontFamily,
        fontSize: height * 0.24,
        fontWeight: '800',
        fill: 0x8fe8ff,
      }),
    });
    this.latest.anchor.set(0.5, 0.5);
    this.latest.position.set(-width / 2 + pad + width * 0.13, height * 0.09);
    this.view.addChild(this.latest);

    // Grid of previous results.
    const gridX = -width / 2 + pad + width * 0.3;
    const gridW = width - pad * 2 - width * 0.3;
    const cell = Math.min(gridW / COLUMNS, height * 0.19);

    for (let i = 0; i < COLUMNS * ROWS; i++) {
      const cx = gridX + (i % COLUMNS) * cell + cell / 2;
      const cy = -height * 0.14 + Math.floor(i / COLUMNS) * cell * 1.15 + cell / 2;

      const box = new Graphics();
      box.position.set(cx, cy);
      const label = new Text({
        text: '',
        style: new TextStyle({
          fontFamily,
          fontSize: cell * 0.44,
          fontWeight: '700',
          fill: 0xffffff,
        }),
      });
      label.anchor.set(0.5);
      label.position.set(cx, cy);
      this.chips.push({ box, label });
      this.view.addChild(box, label);
    }
    this.cellSize = cell;

    this.emptyNote = new Text({
      text: 'Menunggu undian pertama',
      style: new TextStyle({
        fontFamily,
        fontSize: height * 0.062,
        fill: 0x6b869e,
      }),
    });
    this.emptyNote.position.set(gridX, -height * 0.02);
    this.view.addChild(this.emptyNote);

    this.totalLabel = new Text({
      text: 'TOTAL UNDIAN  0',
      style: new TextStyle({
        fontFamily,
        fontSize: height * 0.055,
        fontWeight: '600',
        fill: 0x6f8ea8,
        letterSpacing: 1.2,
      }),
    });
    this.totalLabel.position.set(-width / 2 + pad, height / 2 - pad * 1.5);
    this.view.addChild(this.totalLabel);

    this.setHistory([]);
  }

  private readonly cellSize: number;

  /** Mirrors the game's history onto the board. */
  setHistory(history: readonly number[]): void {
    const cell = this.cellSize;
    this.emptyNote.visible = history.length === 0;

    for (let i = 0; i < this.chips.length; i++) {
      const { box, label } = this.chips[i];
      const value = history[i];

      box.clear();
      if (value === undefined) {
        label.text = '';
        // Empty slot, so the board still reads as a grid before any draw.
        box.roundRect(-cell * 0.4, -cell * 0.4, cell * 0.8, cell * 0.8, 4).stroke({
          width: 1,
          color: 0x2b4258,
          alpha: 0.55,
        });
        continue;
      }

      const fill = value === 0 ? 0x1c8f52 : RED_NUMBERS.has(value) ? 0xb42f3e : 0x252a33;
      box
        .roundRect(-cell * 0.4, -cell * 0.4, cell * 0.8, cell * 0.8, 4)
        .fill({ color: fill })
        .roundRect(-cell * 0.4, -cell * 0.4, cell * 0.8, cell * 0.32, 4)
        .fill({ color: 0xffffff, alpha: 0.12 });
      if (i === 0) {
        box.roundRect(-cell * 0.44, -cell * 0.44, cell * 0.88, cell * 0.88, 5).stroke({
          width: 1.4,
          color: COLOR_NEON,
          alpha: 0.85,
        });
      }
      label.text = String(value);
    }

    if (history.length > 0) {
      this.latest.text = String(history[0]);
      this.drawCount = Math.max(this.drawCount, history.length);
    }
    this.totalLabel.text = `TOTAL UNDIAN  ${this.drawCount}`;
  }

  /** Counts a completed draw, so the tally survives the history window filling. */
  noteDraw(): void {
    this.drawCount++;
    this.totalLabel.text = `TOTAL UNDIAN  ${this.drawCount}`;
  }

  private buildBackground(width: number, height: number): Graphics {
    const g = new Graphics();
    g.rect(-width / 2, -height / 2, width, height).fill({ color: 0x0a1420 });
    // Panel banding, as a broadcast results board would have.
    g.rect(-width / 2, -height / 2, width, height * 0.16).fill({ color: 0x123048 });
    g.rect(-width / 2, -height / 2 + height * 0.16, width, 1.5).fill({
      color: COLOR_NEON,
      alpha: 0.55,
    });
    g.rect(-width / 2, height / 2 - height * 0.12, width, height * 0.12).fill({
      color: 0x0d2135,
    });
    return g;
  }
}
