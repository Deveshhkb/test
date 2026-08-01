import { Rect, clamp, clampedFraction } from "../core/geom";
import type {
  DeviceClass,
  FoldInfo,
  Insets,
  Orientation,
} from "../core/DeviceInfo";

/** Pixel size of the board artwork file (bord.png). */
export const BOARD_TEXTURE = { width: 1920, height: 1080 } as const;

/**
 * Opaque bounds of that artwork, normalised - measured from the asset's alpha
 * channel. The file carries ~16% transparent padding vertically; fitting the
 * whole file would waste that much of the play area on every screen.
 */
export const BOARD_CONTENT = {
  left: 0.0042,
  top: 0.1611,
  right: 1,
  bottom: 0.837,
} as const;

/**
 * Design-space size of the play area: the board's visible content, not the
 * file. All in-world objects are authored against this box and scaled
 * uniformly as one unit, which is why nothing in the play area can ever
 * stretch or squash.
 */
export const DESIGN = {
  width: Math.round(
    (BOARD_CONTENT.right - BOARD_CONTENT.left) * BOARD_TEXTURE.width,
  ),
  height: Math.round(
    (BOARD_CONTENT.bottom - BOARD_CONTENT.top) * BOARD_TEXTURE.height,
  ),
} as const;

/** Play-area height as a fraction of its width. */
export const BOARD_ASPECT = DESIGN.height / DESIGN.width;

/** Texture-normalised X (0..1 across bord.png) to design-space pixels. */
export const designX = (n: number): number =>
  (n - BOARD_CONTENT.left) * BOARD_TEXTURE.width;

/** Texture-normalised Y (0..1 down bord.png) to design-space pixels. */
export const designY = (n: number): number =>
  (n - BOARD_CONTENT.top) * BOARD_TEXTURE.height;

export type LayoutMode =
  | "desktop"
  | "tablet-landscape"
  | "tablet-portrait"
  | "mobile-landscape"
  | "mobile-portrait";

export interface Regions {
  /** Full usable area after safe-area insets. */
  safe: Rect;
  /** Status/top bar, always spans the full usable width. */
  topBar: Rect;
  /** Where the game board is fitted. */
  game: Rect;
  /** Chip selector + action buttons. */
  bet: Rect;
  /** Round history. Overlays the game when `historyCollapsible` is true. */
  history: Rect;
  /** True on small screens: history is a drawer toggled from the top bar. */
  historyCollapsible: boolean;
  /**
   * Collapsed ("peek") dock for the history in portrait, where the wide board
   * cannot use the full height. Null when there is no room for one, in which
   * case the history is drawer-only.
   */
  historyPeek: Rect | null;
  /** Gap used between docked panels. */
  gutter: number;
}

/**
 * Resolve the layout mode. Driven by the *short* viewport edge plus the device
 * class, so a rotating phone switches mobile-portrait <-> mobile-landscape and
 * never accidentally lands in the desktop layout.
 */
export function resolveMode(
  width: number,
  height: number,
  device: DeviceClass,
  orientation: Orientation,
): LayoutMode {
  const landscape = orientation === "landscape";
  if (device === "phone")
    return landscape ? "mobile-landscape" : "mobile-portrait";
  if (device === "tablet")
    return landscape ? "tablet-landscape" : "tablet-portrait";
  // Desktop browsers get the compact layouts too once the window gets small
  // enough that the docked panels would squeeze the board.
  if (!landscape) return width < 700 ? "mobile-portrait" : "tablet-portrait";
  if (width < 760 || height < 420) return "mobile-landscape";
  if (width < 1024) return "tablet-landscape";
  return "desktop";
}

/**
 * Global UI scale factor. UI text and controls are authored at 1.0 for a
 * 1280x720 window and scale smoothly from there, bounded so they never become
 * unreadable on a 320px phone nor cartoonishly large on a 1440p monitor.
 */
export function resolveUiScale(
  width: number,
  height: number,
  device: DeviceClass,
): number {
  const short = Math.min(width, height);
  const deviceBoost =
    device === "phone" ? 1.35 : device === "tablet" ? 1.12 : 1;
  return clamp((short / 720) * deviceBoost, 0.55, 1.3);
}

/** Minimum tappable size. 48dp is the WCAG / Material touch target guidance. */
export function resolveMinTouchSize(
  device: DeviceClass,
  isTouch: boolean,
): number {
  if (!isTouch) return 28;
  return device === "phone" ? 48 : 44;
}

interface RegionInput {
  width: number;
  height: number;
  mode: LayoutMode;
  safeArea: Insets;
  uiScale: number;
  minTouch: number;
  fold: FoldInfo | null;
}

/**
 * Partition the screen into non-overlapping panel rectangles.
 *
 * Regions are produced by carving slices off a single shrinking rectangle, so
 * "no overlapping UI" is a structural property of the algorithm rather than
 * something that has to be re-checked per breakpoint.
 */
export function computeRegions(input: RegionInput): Regions {
  const { width, height, mode, safeArea, uiScale, minTouch, fold } = input;
  const gutter = Math.round(clamp(10 * uiScale, 6, 18));

  /**
   * Bars must be able to contain a full-size touch target plus breathing room,
   * otherwise buttons would be clipped by the bar they live in on short
   * screens. This floor wins over the percentage, but never takes more than a
   * quarter of the viewport.
   */
  const barHeight = (preferred: number) =>
    clamp(Math.max(preferred, minTouch + 10), 0, height * 0.25);

  const safe = new Rect(
    safeArea.left,
    safeArea.top,
    Math.max(1, width - safeArea.left - safeArea.right),
    Math.max(1, height - safeArea.top - safeArea.bottom),
  );

  const free = safe.clone();
  let topBar: Rect;
  let bet: Rect;
  let history: Rect;
  let historyCollapsible = false;
  let historyPeek: Rect | null = null;

  switch (mode) {
    case "desktop": {
      topBar = free.carveTop(
        barHeight(clampedFraction(free.height, 0.08, 52, 92)),
      );
      history = free
        .carveLeft(clampedFraction(free.width, 0.15, 170, 300))
        .inset(gutter);
      bet = free
        .carveRight(clampedFraction(free.width, 0.2, 240, 380))
        .inset(gutter);
      break;
    }
    case "tablet-landscape": {
      topBar = free.carveTop(
        barHeight(clampedFraction(free.height, 0.09, 46, 76)),
      );
      history = free
        .carveLeft(clampedFraction(free.width, 0.14, 120, 210))
        .inset(gutter);
      bet = free
        .carveRight(clampedFraction(free.width, 0.21, 175, 290))
        .inset(gutter);
      break;
    }
    case "mobile-landscape": {
      // Short viewport: keep the bar thin and spend the extra horizontal room
      // on a side bet panel so the board keeps a usable height.
      topBar = free.carveTop(
        barHeight(clampedFraction(free.height, 0.13, 34, 58)),
      );
      bet = free
        .carveRight(clampedFraction(free.width, 0.3, 150, 260))
        .inset(gutter / 2);
      history = drawerRect(
        safe,
        topBar,
        "left",
        Math.min(safe.width * 0.45, 280),
        gutter,
      );
      historyCollapsible = true;
      break;
    }
    case "tablet-portrait": {
      topBar = free.carveTop(
        barHeight(clampedFraction(free.height, 0.07, 52, 84)),
      );
      bet = free
        .carveBottom(clampedFraction(free.height, 0.32, 190, 400))
        .inset(gutter);
      history = drawerRect(
        safe,
        topBar,
        "left",
        Math.min(safe.width * 0.55, 360),
        gutter,
      );
      historyCollapsible = true;
      historyPeek = carvePeek(free, gutter, minTouch);
      break;
    }
    case "mobile-portrait":
    default: {
      topBar = free.carveTop(
        barHeight(clampedFraction(free.height, 0.075, 46, 74)),
      );
      // Board on top, controls underneath, thumb-reachable.
      bet = free
        .carveBottom(clampedFraction(free.height, 0.38, 160, 340))
        .inset(gutter / 2);
      history = drawerRect(
        safe,
        topBar,
        "left",
        Math.min(safe.width * 0.78, 320),
        gutter,
      );
      historyCollapsible = true;
      historyPeek = carvePeek(free, gutter, minTouch);
      break;
    }
  }

  const game = free.inset(gutter / 2);
  const regions: Regions = {
    safe,
    topBar,
    game,
    bet,
    history,
    historyCollapsible,
    historyPeek,
    gutter,
  };
  return fold ? avoidFold(regions, fold) : regions;
}

/**
 * Portrait layouts: the board is width-bound, so it only needs `width x 9/16`
 * of the play area. Give it exactly that and hand the leftover height to a
 * collapsed history dock instead of leaving dead space in the middle.
 *
 * Mutates `free`, returning the peek rectangle (or null when it would be too
 * small to be useful).
 */
function carvePeek(free: Rect, gutter: number, minTouch: number): Rect | null {
  const boardHeight = free.width * BOARD_ASPECT;
  const needed = Math.min(free.height, boardHeight + gutter * 2);
  const leftover = free.height - needed;
  if (leftover < minTouch + gutter * 2) return null;

  const peek = new Rect(free.x, free.y + needed, free.width, leftover);
  free.height = needed; // the play area keeps only what the board needs
  return peek.inset(gutter / 2);
}

/** Off-canvas drawer geometry for the collapsible history panel. */
function drawerRect(
  safe: Rect,
  topBar: Rect,
  side: "left" | "right",
  size: number,
  gutter: number,
): Rect {
  const top = topBar.bottom + gutter;
  const rect = new Rect(0, top, size, Math.max(0, safe.bottom - top - gutter));
  rect.x = side === "left" ? safe.x + gutter : safe.right - size - gutter;
  return rect;
}

/**
 * Foldables: keep the board clear of the hinge by shrinking it onto the larger
 * display segment instead of letting content fall into the crease.
 */
function avoidFold(regions: Regions, fold: FoldInfo): Regions {
  const game = regions.game;
  if (fold.hinge === "vertical") {
    const leftRoom = fold.x - game.x;
    const rightRoom = game.right - (fold.x + fold.width);
    if (leftRoom <= 0 || rightRoom <= 0) return regions;
    regions.game =
      leftRoom >= rightRoom
        ? new Rect(game.x, game.y, leftRoom, game.height)
        : new Rect(fold.x + fold.width, game.y, rightRoom, game.height);
  } else {
    const topRoom = fold.y - game.y;
    const bottomRoom = game.bottom - (fold.y + fold.height);
    if (topRoom <= 0 || bottomRoom <= 0) return regions;
    regions.game =
      topRoom >= bottomRoom
        ? new Rect(game.x, game.y, game.width, topRoom)
        : new Rect(game.x, fold.y + fold.height, game.width, bottomRoom);
  }
  return regions;
}

/** Shared visual language, kept in one place so panels stay consistent. */
export const THEME = {
  panelFill: 0x101725,
  panelFillAlt: 0x18213a,
  panelStroke: 0x2f3f63,
  accent: 0xffc94a,
  accentDim: 0x8a6a1f,
  text: 0xf2f5ff,
  textDim: 0x93a1bd,
  dragon: 0x2f7ff2,
  tie: 0x22a04a,
  tiger: 0xe0343f,
  win: 0x4ade80,
  danger: 0xef4444,
  radius: 14,
} as const;
