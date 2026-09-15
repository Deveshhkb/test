import { useEffect, type RefObject } from "react";

/**
 * Keeps the sticky strike column pinned to the centre of the scroll port.
 *
 * A sticky offset given in percent resolves against the table's own width, not
 * the visible scroll port, so the offset has to be measured and published as a
 * pixel custom property whenever the container resizes.
 */
export function useCenterStickyOffset(
  ref: RefObject<HTMLElement | null>,
  columnWidthVar = "--strike-col-width",
  offsetVar = "--strike-sticky-left",
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const styles = getComputedStyle(element);
      const columnWidth = Number.parseFloat(styles.getPropertyValue(columnWidthVar)) || 0;
      const offset = Math.max(0, (element.clientWidth - columnWidth) / 2);
      element.style.setProperty(offsetVar, `${Math.round(offset)}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, columnWidthVar, offsetVar]);
}
