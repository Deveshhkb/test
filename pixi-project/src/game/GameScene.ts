import { Container, type Texture } from "pixi.js";
import { DESIGN } from "../config/LayoutConfig";
import { ResponsiveContainer } from "../core/ResponsiveContainer";
import { Viewport } from "../core/Viewport";
import type { LayoutContext } from "../core/LayoutManager";
import { GameBoard } from "./GameBoard";
import { TopBar } from "../ui/TopBar";
import { BetPanel } from "../ui/BetPanel";
import { HistoryPanel } from "../ui/HistoryPanel";
import { CHIPS, type BetSpot, type GameState } from "../state/GameState";
import { toggleFullscreen } from "../core/InputGuards";

export interface SceneTextures {
  board: Texture;
  dragon: Texture;
  tiger: Texture;
  chips: Record<string, Texture>;
}

/**
 * Wires the board and the three UI panels together.
 *
 * The scene itself owns no coordinates: the board is fitted by a `Viewport`
 * into `regions.game` and each panel reads its own region, so adding a new
 * panel here needs no changes to any resize code.
 */
export class GameScene extends ResponsiveContainer {
  readonly viewport: Viewport;
  private readonly board: GameBoard;
  private readonly topBar: TopBar;
  private readonly betPanel: BetPanel;
  private readonly historyPanel: HistoryPanel;
  private readonly uiLayer = new Container();

  constructor(
    private readonly state: GameState,
    textures: SceneTextures,
  ) {
    super();
    this.layoutOrder = -20;

    this.viewport = new Viewport(
      DESIGN.width,
      DESIGN.height,
      (ctx) => ctx.regions.game,
      // The board is a wide strip. In portrait it is width-bound, so it is
      // pulled towards the top of its region - "the game fills the upper
      // portion" - rather than floating in the middle of the spare height.
      (ctx) => ({ x: 0.5, y: ctx.orientation === "portrait" ? 0.18 : 0.5 }),
    );
    this.board = new GameBoard(state, textures);
    this.viewport.world.addChild(this.board);
    this.addChild(this.viewport);

    this.historyPanel = new HistoryPanel(state);
    this.betPanel = new BetPanel(state, textures.chips);
    this.topBar = new TopBar(state, () => this.historyPanel.toggle());

    // History last: as a drawer it must draw above the other panels.
    this.uiLayer.addChild(this.topBar, this.betPanel, this.historyPanel);
    this.addChild(this.uiLayer);

    this.board.onZoneTap((spot, global) => this.tryBet(spot, global));
    this.installKeyboard();
  }

  protected onLayout(ctx: LayoutContext): void {
    // Keep in-world text rasterised at the world's effective scale so it stays
    // sharp on Retina panels and after a zoom change.
    this.board.syncResolution(ctx, this.viewport.worldScale);
  }

  private tryBet(spot: BetSpot, global: { x: number; y: number }): void {
    if (this.historyPanel.isOpen) return;
    const chip = this.state.selectedChip;
    if (!this.state.placeBet(spot)) return;
    this.board.placeChip(spot, chip, global);
  }

  /** Desktop keyboard shortcuts; harmless (and inert) on touch devices. */
  private installKeyboard(): void {
    window.addEventListener("keydown", (event) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < CHIPS.length) {
        this.state.selectChip(CHIPS[index]);
        return;
      }
      const spots: Record<string, BetSpot> = {
        d: "dragon",
        t: "tie",
        g: "tiger",
      };
      const key = event.key.toLowerCase();
      if (spots[key]) {
        const center = this.viewport.toStage(
          DESIGN.width / 2,
          DESIGN.height / 2,
        );
        this.tryBet(spots[key], center);
      } else if (key === "c") {
        this.state.clearBets();
      } else if (key === "r") {
        this.state.repeatBets();
      } else if (key === "h") {
        this.historyPanel.toggle();
      } else if (key === "f") {
        void toggleFullscreen();
      }
    });
  }
}
