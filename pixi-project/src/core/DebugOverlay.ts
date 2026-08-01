import { Graphics, Text, TextStyle } from "pixi.js";
import { ResponsiveContainer } from "./ResponsiveContainer";
import type { LayoutContext } from "./LayoutManager";
import type { Regions } from "../config/LayoutConfig";

const REGION_COLORS: Record<string, number> = {
  topBar: 0x00e0ff,
  game: 0xffc94a,
  bet: 0xff5fa2,
  history: 0x7cf67c,
};

/**
 * Development overlay: prints live viewport metrics and outlines the region
 * rectangles. Toggle with F2, or start with `?debug=1`.
 */
export class DebugOverlay extends ResponsiveContainer {
  private readonly outlines = new Graphics();
  private readonly readout: Text;
  private enabled: boolean;

  constructor(enabled = false) {
    super();
    this.layoutOrder = 1000;
    this.eventMode = "none";
    this.enabled = enabled;

    this.addChild(this.outlines);
    this.readout = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 12,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
        lineHeight: 15,
      }),
    });
    this.addChild(this.readout);

    window.addEventListener("keydown", (event) => {
      if (event.key === "F2") this.setEnabled(!this.enabled);
    });
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.refreshLayout();
  }

  protected onLayout(ctx: LayoutContext): void {
    this.visible = this.enabled;
    if (!this.enabled) return;

    this.outlines.clear();
    const regions = ctx.regions;
    for (const key of Object.keys(REGION_COLORS) as Array<keyof Regions>) {
      const rect = regions[key] as {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      this.outlines
        .rect(rect.x, rect.y, rect.width, rect.height)
        .stroke({ width: 2, color: REGION_COLORS[key as string], alpha: 0.9 });
    }

    this.readout.text = [
      `${Math.round(ctx.width)} x ${Math.round(ctx.height)}  (${ctx.aspect.toFixed(2)})`,
      `mode      ${ctx.mode}`,
      `device    ${ctx.device} / ${ctx.orientation}`,
      `dpr       ${ctx.devicePixelRatio} -> render ${ctx.resolution}`,
      `uiScale   ${ctx.uiScale.toFixed(2)}  touch ${ctx.minTouch}px`,
      `safe      ${ctx.safeArea.top}/${ctx.safeArea.right}/${ctx.safeArea.bottom}/${ctx.safeArea.left}`,
      `fold      ${ctx.fold ? ctx.fold.hinge : "none"}`,
      `revision  ${ctx.revision}`,
    ].join("\n");
    this.readout.position.set(ctx.regions.safe.x + 8, ctx.regions.safe.y + 8);
    this.readout.resolution = Math.min(2, ctx.resolution);
  }
}
