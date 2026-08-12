import { Container, Graphics } from "pixi.js";
import { COLORS } from "../config/gameConfig";
import { CasinoButton } from "./components/CasinoButton";

export interface ActionBarCallbacks {
  onDeal: () => void;
  onClear: () => void;
  onRepeat: () => void;
  onHit: () => void;
  onStand: () => void;
}

export interface ActionAvailability {
  deal: boolean;
  clear: boolean;
  repeat: boolean;
  hit: boolean;
  stand: boolean;
}

const RAIL_Y = 824;

/**
 * The right-hand control cluster. It swaps between the betting controls
 * (rebet / clear / deal) and the in-hand controls (stand / hit); which set is
 * visible and which buttons are live is decided by the controller from the
 * game state, never by the buttons themselves.
 */
export class ActionBar extends Container {
  private readonly dealButton: CasinoButton;
  private readonly clearButton: CasinoButton;
  private readonly repeatButton: CasinoButton;
  private readonly hitButton: CasinoButton;
  private readonly standButton: CasinoButton;

  constructor(callbacks: ActionBarCallbacks) {
    super();

    this.repeatButton = new CasinoButton({
      width: 92,
      shape: "circle",
      variant: "dark",
      caption: "REBET",
      icon: drawRepeatIcon,
      onTap: callbacks.onRepeat,
    });
    this.repeatButton.position.set(1228, RAIL_Y);

    this.clearButton = new CasinoButton({
      width: 92,
      shape: "circle",
      variant: "red",
      caption: "CLEAR BET",
      icon: drawClearIcon,
      onTap: callbacks.onClear,
    });
    this.clearButton.position.set(1372, RAIL_Y);

    this.dealButton = new CasinoButton({
      width: 122,
      shape: "circle",
      variant: "green",
      caption: "DEAL",
      icon: drawCardsIcon,
      onTap: callbacks.onDeal,
    });
    this.dealButton.position.set(1550, RAIL_Y);

    this.standButton = new CasinoButton({
      width: 186,
      height: 76,
      shape: "pill",
      variant: "red",
      label: "STAND",
      onTap: callbacks.onStand,
    });
    this.standButton.position.set(1352, RAIL_Y);

    this.hitButton = new CasinoButton({
      width: 186,
      height: 76,
      shape: "pill",
      variant: "green",
      label: "HIT",
      onTap: callbacks.onHit,
    });
    this.hitButton.position.set(1556, RAIL_Y);

    this.addChild(
      this.repeatButton,
      this.clearButton,
      this.dealButton,
      this.standButton,
      this.hitButton,
    );
    this.showBettingControls(false);
  }

  showBettingControls(animated = true): void {
    this.repeatButton.setShown(true, animated);
    this.clearButton.setShown(true, animated);
    this.dealButton.setShown(true, animated);
    this.hitButton.setShown(false, animated);
    this.standButton.setShown(false, animated);
  }

  showPlayerControls(animated = true): void {
    this.repeatButton.setShown(false, animated);
    this.clearButton.setShown(false, animated);
    this.dealButton.setShown(false, animated);
    this.hitButton.setShown(true, animated);
    this.standButton.setShown(true, animated);
  }

  setAvailability(availability: ActionAvailability): void {
    this.dealButton.setEnabled(availability.deal);
    this.clearButton.setEnabled(availability.clear);
    this.repeatButton.setEnabled(availability.repeat);
    this.hitButton.setEnabled(availability.hit);
    this.standButton.setEnabled(availability.stand);
  }

  /** Nudges the deal button once a valid bet is on the table. */
  highlightDeal(): void {
    this.dealButton.pulse();
  }
}

function drawCardsIcon(g: Graphics): void {
  g.roundRect(-26, -20, 30, 42, 5)
    .fill({ color: 0xf3efe2 })
    .roundRect(-26, -20, 30, 42, 5)
    .stroke({ width: 2, color: 0x2a2a2a, alpha: 0.6 });
  g.roundRect(-2, -24, 30, 42, 5)
    .fill({ color: 0xffffff })
    .roundRect(-2, -24, 30, 42, 5)
    .stroke({ width: 2, color: 0x2a2a2a, alpha: 0.6 });
  g.circle(13, -3, 7).fill({ color: COLORS.cardRed });
}

function drawClearIcon(g: Graphics): void {
  g.moveTo(-16, -16)
    .lineTo(16, 16)
    .moveTo(16, -16)
    .lineTo(-16, 16)
    .stroke({ width: 8, color: 0xffdede, cap: "round" });
}

function drawRepeatIcon(g: Graphics): void {
  g.arc(0, 0, 17, Math.PI * 0.35, Math.PI * 1.75).stroke({
    width: 6,
    color: COLORS.goldLight,
    cap: "round",
  });
  g.moveTo(9, 3)
    .lineTo(20, 10)
    .lineTo(6, 16)
    .closePath()
    .fill({ color: COLORS.goldLight });
}
