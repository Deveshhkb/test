import { TextStyle } from "pixi.js";
import { COLORS } from "../config/gameConfig";

const UI_FONT = "Arial, Helvetica, sans-serif";
const DISPLAY_FONT = "Georgia, 'Times New Roman', serif";

/** Shared text styles. Reusing style objects keeps Pixi's text cache small. */
export const TEXT_STYLES = {
  feltTitle: new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: 58,
    fontWeight: "700",
    fill: COLORS.feltPrint,
    letterSpacing: 10,
  }),
  feltHeading: new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: 30,
    fill: COLORS.feltPrint,
    letterSpacing: 3,
  }),
  feltCaption: new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: 21,
    fill: COLORS.feltPrint,
    letterSpacing: 1,
  }),
  feltBanner: new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: 34,
    fontWeight: "700",
    fill: 0xe8f2fb,
    letterSpacing: 4,
  }),
  buttonLabel: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 22,
    fontWeight: "700",
    fill: COLORS.textPrimary,
    letterSpacing: 1.5,
  }),
  buttonLabelSmall: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 17,
    fontWeight: "700",
    fill: COLORS.textPrimary,
    letterSpacing: 1,
    align: "center",
  }),
  statLabel: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 20,
    fontWeight: "700",
    fill: COLORS.textMuted,
    letterSpacing: 2,
  }),
  statValue: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 26,
    fontWeight: "700",
    fill: COLORS.textPrimary,
  }),
  betAmount: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 22,
    fontWeight: "700",
    fill: 0xffe9a8,
    stroke: { color: 0x000000, width: 4 },
  }),
  scoreBadge: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 26,
    fontWeight: "800",
    fill: COLORS.textPrimary,
  }),
  resultBanner: new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: 64,
    fontWeight: "700",
    fill: 0xffffff,
    stroke: { color: 0x000000, width: 8 },
    letterSpacing: 3,
  }),
  resultSub: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 30,
    fontWeight: "700",
    fill: 0xffe9a8,
    stroke: { color: 0x000000, width: 5 },
  }),
  seatHint: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 17,
    fontWeight: "700",
    fill: 0xbcd8ef,
    align: "center",
    letterSpacing: 1,
    lineHeight: 22,
  }),
  limitSign: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 19,
    fontWeight: "700",
    fill: 0xe6f2ff,
  }),
  overlayTitle: new TextStyle({
    fontFamily: DISPLAY_FONT,
    fontSize: 34,
    fontWeight: "700",
    fill: 0xffe9a8,
    letterSpacing: 2,
  }),
  overlayBody: new TextStyle({
    fontFamily: UI_FONT,
    fontSize: 20,
    fill: 0xdfe9f2,
    lineHeight: 31,
    wordWrap: true,
    wordWrapWidth: 664,
  }),
} as const;
