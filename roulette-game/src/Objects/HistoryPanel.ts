import { BitmapText, Container, Graphics } from 'pixi.js';
import { AnimationManager } from '../Managers/AnimationManager';
import { FONT } from '../Game/Fonts';
import { Localization } from '../Localization';
import { HistoryEntry, Orientation, PocketColor, Statistics, Theme } from '../Types';

/** One reusable badge in the history strip. */
interface Badge {
  container: Container;
  background: Graphics;
  label: BitmapText;
}

/**
 * Recent-results strip plus the statistics readout.
 *
 * Badges are pooled: the panel allocates `capacity` of them up front and then
 * only ever re-labels and re-tints them. A hundred rounds later it holds
 * exactly the same objects it started with.
 *
 * The newest result animates in from the left while the rest slide along,
 * which is the motion players use to track "did my number just come up".
 */
export class HistoryPanel extends Container {
  private readonly background = new Graphics();
  private readonly title: BitmapText;
  private readonly badges: Badge[] = [];
  private readonly statsContainer = new Container();
  private readonly statsBars = new Graphics();
  private readonly statsLabels: BitmapText[] = [];

  private badgeSize = 34;
  private gap = 6;
  private capacity: number;
  private showStats = true;
  private lastTopRoundId?: string;

  public constructor(
    private readonly animations: AnimationManager,
    private theme: Theme,
    private localization: Localization,
    capacity = 12,
  ) {
    super();
    this.capacity = capacity;

    this.title = new BitmapText({
      text: localization.t('label.history'),
      style: { fontFamily: FONT.UI, fontSize: 14, fill: theme.textMuted },
    });

    this.addChild(this.background, this.title);

    for (let i = 0; i < capacity; i += 1) this.badges.push(this.createBadge());
    this.statsContainer.addChild(this.statsBars);
    this.addChild(this.statsContainer);
  }

  private createBadge(): Badge {
    const container = new Container();
    const background = new Graphics();
    const label = new BitmapText({
      text: '',
      style: { fontFamily: FONT.NUMBER, fontSize: 18, fill: 0xffffff },
    });
    label.anchor.set(0.5);

    container.addChild(background, label);
    container.visible = false;
    this.addChild(container);

    return { container, background, label };
  }

  /* --------------------------------------------------------------------- */
  /* Layout                                                                */
  /* --------------------------------------------------------------------- */

  /**
   * Fit the panel to a box.
   *
   * The badge count adapts to the available width rather than the width
   * adapting to a fixed count - that is what keeps the strip full on a desktop
   * and uncramped on a phone without a separate portrait layout.
   */
  public resize(
    width: number,
    height: number,
    orientation: Orientation,
    scale: number,
  ): void {
    this.showStats = orientation === Orientation.LANDSCAPE && height > 150 * scale;

    const padding = 12 * scale;
    const titleSize = Math.max(10, 13 * scale);
    this.title.style.fontSize = titleSize;
    this.title.tint = this.theme.textMuted;
    this.title.position.set(padding, padding * 0.7);

    // Size badges to fill the row, then cap so they never become comically
    // large on a wide desktop panel.
    const usableWidth = width - padding * 2;
    const desired = Math.min(this.capacity, Math.max(5, Math.floor(usableWidth / (30 * scale))));
    this.gap = 5 * scale;
    this.badgeSize = Math.min(
      44 * scale,
      (usableWidth - this.gap * (desired - 1)) / Math.max(1, desired),
    );

    const stripTop = padding + titleSize + padding * 0.5;

    this.badges.forEach((badge, index) => {
      const visible = index < desired;
      badge.container.visible = visible && badge.label.text !== '';
      badge.container.position.set(
        padding + index * (this.badgeSize + this.gap) + this.badgeSize / 2,
        stripTop + this.badgeSize / 2,
      );
      badge.label.style.fontSize = this.badgeSize * 0.46;
      this.drawBadgeBackground(badge);
    });

    const stripBottom = stripTop + this.badgeSize + padding * 0.8;

    this.statsContainer.visible = this.showStats;
    this.statsContainer.position.set(padding, stripBottom);

    this.background.clear();
    this.background
      .roundRect(0, 0, width, height, 10 * scale)
      .fill({ color: this.theme.panel, alpha: 0.88 })
      .stroke({ width: Math.max(1, scale), color: this.theme.panelBorder });

    if (this.showStats) this.layoutStats(width - padding * 2, height - stripBottom - padding, scale);
  }

  private drawBadgeBackground(badge: Badge): void {
    const radius = this.badgeSize / 2;
    badge.background.clear();
    badge.background
      .circle(0, 0, radius)
      .fill({ color: (badge.container as Container & { tintColor?: number }).tintColor ?? this.theme.green })
      .stroke({ width: Math.max(1, radius * 0.08), color: 0x000000, alpha: 0.35 });
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.title.tint = theme.textMuted;
  }

  public setLocalization(localization: Localization): void {
    this.localization = localization;
    this.title.text = localization.t('label.history');
  }

  /* --------------------------------------------------------------------- */
  /* Content                                                               */
  /* --------------------------------------------------------------------- */

  /**
   * Render a history window.
   *
   * When the newest entry has changed, the leading badge animates in and the
   * strip shifts - otherwise (a resize, a theme change) the update is silent.
   */
  public update(entries: readonly HistoryEntry[], stats: Statistics): void {
    const isNewResult = entries[0] !== undefined && entries[0].roundId !== this.lastTopRoundId;
    this.lastTopRoundId = entries[0]?.roundId;

    this.badges.forEach((badge, index) => {
      const entry = entries[index];

      if (!entry) {
        badge.container.visible = false;
        badge.label.text = '';
        return;
      }

      badge.label.text = String(entry.number);
      const color = this.colorFor(entry.color);
      (badge.container as Container & { tintColor?: number }).tintColor = color;
      this.drawBadgeBackground(badge);
      badge.container.visible = true;
      badge.container.alpha = 1;
      badge.container.scale.set(1);
    });

    if (isNewResult && this.badges[0]?.container.visible) {
      const leading = this.badges[0].container;
      this.animations.fromTo(
        leading,
        { alpha: 0, x: leading.x - this.badgeSize },
        { alpha: 1, x: leading.x, duration: 0.42, ease: AnimationManager.EASE_UI_IN },
      );
      this.animations.fromTo(
        leading.scale,
        { x: 0.4, y: 0.4 },
        { x: 1, y: 1, duration: 0.5, ease: 'back.out(2.2)' },
      );
    }

    if (this.showStats) this.updateStats(stats);
  }

  private colorFor(color: PocketColor): number {
    if (color === PocketColor.RED) return this.theme.red;
    if (color === PocketColor.BLACK) return this.theme.black;
    return this.theme.green;
  }

  /* --------------------------------------------------------------------- */
  /* Statistics                                                            */
  /* --------------------------------------------------------------------- */

  private statsGeometry = { width: 0, height: 0, scale: 1 };

  private layoutStats(width: number, height: number, scale: number): void {
    this.statsGeometry = { width, height, scale };

    // Create labels lazily, then reuse forever.
    const rows = STAT_ROWS.length;
    while (this.statsLabels.length < rows * 2) {
      const label = new BitmapText({
        text: '',
        style: { fontFamily: FONT.UI, fontSize: 12, fill: this.theme.text },
      });
      this.statsLabels.push(label);
      this.statsContainer.addChild(label);
    }

    const rowHeight = Math.min(22 * scale, height / Math.max(1, rows));
    STAT_ROWS.forEach((_, index) => {
      const nameLabel = this.statsLabels[index * 2];
      const valueLabel = this.statsLabels[index * 2 + 1];
      const fontSize = Math.max(9, rowHeight * 0.5);

      nameLabel.style.fontSize = fontSize;
      valueLabel.style.fontSize = fontSize;
      nameLabel.anchor.set(0, 0.5);
      valueLabel.anchor.set(1, 0.5);
      nameLabel.position.set(0, index * rowHeight + rowHeight / 2);
      valueLabel.position.set(width, index * rowHeight + rowHeight / 2);
    });
  }

  /**
   * Percentage bars for the even-money outcomes.
   *
   * Drawn into a single `Graphics` that is cleared and refilled once per round -
   * six bars is nothing, and it keeps the whole panel to one draw call.
   */
  private updateStats(stats: Statistics): void {
    const { width, scale } = this.statsGeometry;
    if (width <= 0) return;

    const rowHeight = Math.min(22 * scale, this.statsGeometry.height / STAT_ROWS.length);
    const total = Math.max(1, stats.total);

    this.statsBars.clear();

    STAT_ROWS.forEach((row, index) => {
      const count = row.select(stats);
      const percent = (count / total) * 100;
      const y = index * rowHeight + rowHeight / 2;
      const barHeight = rowHeight * 0.34;
      const barWidth = width * 0.42;
      const barX = width * 0.34;

      this.statsBars
        .roundRect(barX, y - barHeight / 2, barWidth, barHeight, barHeight / 2)
        .fill({ color: 0x000000, alpha: 0.35 });

      this.statsBars
        .roundRect(
          barX,
          y - barHeight / 2,
          Math.max(1, (barWidth * percent) / 100),
          barHeight,
          barHeight / 2,
        )
        .fill({ color: row.color(this.theme) });

      const nameLabel = this.statsLabels[index * 2];
      const valueLabel = this.statsLabels[index * 2 + 1];
      nameLabel.text = this.localization.t(row.labelKey);
      nameLabel.tint = this.theme.textMuted;
      valueLabel.text = `${percent.toFixed(0)}%`;
      valueLabel.tint = this.theme.text;
    });
  }

  public override destroy(): void {
    for (const badge of this.badges) this.animations.killTweensOf(badge.container);
    super.destroy({ children: true, texture: false });
  }
}

/** Declarative description of the statistics rows - add a row, get a row. */
const STAT_ROWS: ReadonlyArray<{
  labelKey: string;
  select: (stats: Statistics) => number;
  color: (theme: Theme) => number;
}> = [
  { labelKey: 'label.red', select: (s) => s.red, color: (t) => t.red },
  { labelKey: 'label.black', select: (s) => s.black, color: (t) => t.black },
  { labelKey: 'label.odd', select: (s) => s.odd, color: (t) => t.gold },
  { labelKey: 'label.even', select: (s) => s.even, color: (t) => t.gold },
  { labelKey: 'label.low', select: (s) => s.low, color: (t) => t.metal },
  { labelKey: 'label.high', select: (s) => s.high, color: (t) => t.metal },
];
