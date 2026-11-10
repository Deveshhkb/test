import type { Layout } from '../../stores/layoutStore';

/** Computes the adaptive design-space layout for a viewport (CSS px). */
export function computeLayout(vw: number, vh: number): Layout {
  const aspect = vw / Math.max(1, vh);
  let designWidth: number;
  let designHeight: number;
  let orientation: Layout['orientation'];
  if (aspect >= 1) {
    orientation = 'landscape';
    designHeight = 1080;
    designWidth = Math.min(2100, Math.max(1500, Math.round(1080 * aspect)));
  } else {
    orientation = 'portrait';
    designWidth = 1080;
    designHeight = Math.min(2400, Math.max(1500, Math.round(1080 / aspect)));
  }
  const scale = Math.min(vw / designWidth, vh / designHeight);
  return {
    orientation,
    designWidth,
    designHeight,
    scale,
    offsetX: Math.round((vw - designWidth * scale) / 2),
    offsetY: Math.round((vh - designHeight * scale) / 2),
    viewportWidth: vw,
    viewportHeight: vh,
  };
}

/** Positions of the main stage elements in design space. */
export function stagePlacement(l: Layout) {
  if (l.orientation === 'landscape') {
    const frameScale = 1;
    const frameX = l.designWidth - 1088 - Math.max(30, (l.designWidth - 1500) * 0.12);
    const frameY = 98;
    return {
      frameScale,
      frameX,
      frameY,
      characterX: Math.max(200, frameX / 2 - 10),
      characterBottom: 1075,
      characterScale: 0.98,
      characterVisible: true,
    };
  }
  const frameScale = (l.designWidth - 24) / 1088;
  const frameY = 140;
  const frameBottom = frameY + 800 * frameScale;
  const controlsTop = l.designHeight - 400;
  const space = controlsTop - frameBottom;
  return {
    frameScale,
    frameX: 12,
    frameY,
    characterX: 230,
    characterBottom: controlsTop + 120,
    // the full figure must fit between the reels and the controls (feet may tuck behind the bar)
    characterScale: Math.min(0.85, (space + 160) / 1000),
    characterVisible: space >= 440,
  };
}
