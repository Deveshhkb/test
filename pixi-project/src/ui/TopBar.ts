import { Graphics, Text, TextStyle } from "pixi.js";
import {
  ResponsiveContainer,
  syncTextResolution,
} from "../core/ResponsiveContainer";
import type { LayoutContext } from "../core/LayoutManager";
import { THEME } from "../config/LayoutConfig";
import { Rect } from "../core/geom";
import { UIButton } from "./UIButton";
import { formatCompact, type GameState } from "../state/GameState";
import { toggleFullscreen } from "../core/InputGuards";

/**
 * Status bar spanning the full usable width.
 *
 * Content degrades gracefully: the title drops away on narrow phones, money
 * values switch to compact notation, and the history toggle only appears in
 * the layout modes where history is a drawer.
 */
export class TopBar extends ResponsiveContainer {
  private readonly bg = new Graphics();
  private readonly title: Text;
  private readonly balance: Text;
  private readonly stake: Text;
  private readonly clock: Text;
  private readonly historyButton: UIButton;
  private readonly fullscreenButton: UIButton;

  constructor(
    private readonly state: GameState,
    onToggleHistory: () => void,
  ) {
    super();
    this.layoutOrder = 10;
    this.addChild(this.bg);

    this.title = this.makeText("DRAGON  TIGER", THEME.accent, "bold");
    this.balance = this.makeText("", THEME.text, "bold");
    this.stake = this.makeText("", THEME.textDim, "normal");
    this.clock = this.makeText("", THEME.textDim, "normal");

    this.historyButton = new UIButton({
      id: "topbar.history",
      label: "History",
      onPress: onToggleHistory,
    });
    this.fullscreenButton = new UIButton({
      id: "topbar.fullscreen",
      label: "⛶",
      onPress: () => void toggleFullscreen(),
    });
    this.addChild(this.historyButton, this.fullscreenButton);

    state.subscribe(() => this.refreshValues());
    this.refreshValues();

    const clockTimer = window.setInterval(() => this.updateClock(), 1000);
    this.on("destroyed", () => window.clearInterval(clockTimer));
    this.updateClock();
  }

  protected onLayout(ctx: LayoutContext): void {
    const region = ctx.regions.topBar;
    const compact = ctx.regions.historyCollapsible;
    const pad = Math.max(8, region.height * 0.16);
    const midY = region.centerY;

    this.bg
      .clear()
      .roundRect(
        region.x,
        region.y - region.height * 0.4,
        region.width,
        region.height * 1.4,
        THEME.radius,
      )
      .fill({ color: THEME.panelFill, alpha: 0.92 })
      .stroke({ width: 1, color: THEME.panelStroke, alpha: 0.8 });

    const fontBase = Math.min(region.height * 0.4, ctx.font(20, 11, 30));

    // ---- right cluster: fullscreen (+ history toggle on small screens) ----
    const btn = Math.max(ctx.minTouch, region.height * 0.62);
    let rightEdge = region.right - pad;

    this.fullscreenButton.visible =
      ctx.device !== "phone" || ctx.orientation === "landscape";
    if (this.fullscreenButton.visible) {
      this.fullscreenButton.setRect(
        new Rect(rightEdge - btn, midY - btn / 2, btn, btn),
        ctx,
      );
      rightEdge -= btn + pad * 0.6;
    }

    this.historyButton.visible = compact;
    if (compact) {
      const w = Math.max(ctx.minTouch * 1.6, region.width * 0.18);
      this.historyButton.setRect(
        new Rect(rightEdge - w, midY - btn / 2, w, btn),
        ctx,
      );
      rightEdge -= w + pad * 0.6;
    }

    // ---- left cluster: title (wide screens only) ----
    this.title.visible = region.width > 520;
    this.title.style.fontSize = fontBase * 1.05;
    this.title.position.set(region.x + pad, midY);
    const leftEdge = this.title.visible
      ? this.title.x + this.title.width + pad
      : region.x + pad;

    // ---- centre cluster: balance + stake, packed into what is left ----
    this.balance.style.fontSize = fontBase;
    this.stake.style.fontSize = fontBase * 0.82;
    const available = Math.max(0, rightEdge - leftEdge);
    const stacked = available < this.balance.width + this.stake.width + pad * 2;

    if (stacked) {
      this.balance.anchor.set(0, 1);
      this.stake.anchor.set(0, 0);
      this.balance.position.set(leftEdge, midY);
      this.stake.position.set(leftEdge, midY);
    } else {
      this.balance.anchor.set(0, 0.5);
      this.stake.anchor.set(1, 0.5);
      this.balance.position.set(leftEdge, midY);
      this.stake.position.set(rightEdge, midY);
    }

    this.clock.visible = !compact && region.width > 900;
    this.clock.style.fontSize = fontBase * 0.8;
    this.clock.anchor.set(1, 0.5);
    this.clock.position.set(
      rightEdge - (stacked ? 0 : this.stake.width + pad),
      midY,
    );

    for (const text of [this.title, this.balance, this.stake, this.clock]) {
      syncTextResolution(text, ctx);
    }
    this.refreshValues();
  }

  private refreshValues(): void {
    const compact = this.balance.style.fontSize < 18;
    const money = compact
      ? formatCompact(this.state.balance)
      : this.state.balance.toLocaleString("en-US");
    this.balance.text = `Balance  ${money}`;
    this.stake.text = `Stake  ${formatCompact(this.state.totalBet)}`;
  }

  private updateClock(): void {
    const now = new Date();
    this.clock.text = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}   ID 12345`;
  }

  private makeText(
    value: string,
    fill: number,
    weight: "bold" | "normal",
  ): Text {
    const text = new Text({
      text: value,
      style: new TextStyle({
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 20,
        fontWeight: weight,
        fill,
      }),
    });
    text.anchor.set(0, 0.5);
    this.addChild(text);
    return text;
  }
}
