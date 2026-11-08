/**
 * ONE place to configure the whole project.
 * Design your game at DESIGN_WIDTH x DESIGN_HEIGHT – it is scaled to fit any screen.
 */
export const CONFIG = {
  /** Landscape design size (used when the screen is wider than tall). */
  landscape: { width: 1920, height: 1080 },
  /** Portrait design size (used on phones held upright). Set equal to landscape to disable. */
  portrait: { width: 1080, height: 1920 },
  /**
   * "contain" = whole design always visible (letterbox bars possible)
   * "cover"   = fills the screen, edges may be cropped
   */
  scaleMode: "contain" as "contain" | "cover",
  background: "#1e1e2e",
  /** Cap device pixel ratio for performance on high-DPI phones. */
  maxResolution: 2,
  antialias: true,
};
