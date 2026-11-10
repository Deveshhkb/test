import type { ReactNode } from 'react';
import { stagePlacement } from '../game/core/layout';
import { useLayoutStore } from '../stores/layoutStore';

/**
 * React HUD laid out in the same design space as the PixiJS stage, then scaled with a
 * single transform so controls always line up with the reels on every screen size.
 */
export function UiStage({ children }: { children: ReactNode }) {
  const l = useLayoutStore();
  const p = stagePlacement(l);
  const style = {
    width: l.designWidth,
    height: l.designHeight,
    transform: `translate(${l.offsetX}px, ${l.offsetY}px) scale(${l.scale})`,
    '--frame-x': `${p.frameX}px`,
    '--frame-y': `${p.frameY}px`,
    '--frame-w': `${1088 * p.frameScale}px`,
    '--frame-h': `${800 * p.frameScale}px`,
  } as React.CSSProperties;
  return (
    <div className={`ui-stage ${l.orientation}`} style={style} data-orientation={l.orientation}>
      {children}
    </div>
  );
}
