import type { Renderer } from 'pixi.js';
import { useLayoutStore, type Layout } from '../../stores/layoutStore';
import { computeLayout } from './layout';

/** Observes the host element and keeps renderer size, DPR and design layout in sync. */
export class ResizeManager {
  private observer: ResizeObserver | null = null;
  private listeners = new Set<(l: Layout) => void>();
  layout: Layout;
  private raf = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly renderer: Renderer,
  ) {
    this.layout = computeLayout(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight);
  }

  start() {
    const schedule = () => {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.apply());
    };
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(schedule);
      this.observer.observe(this.host);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    this.apply();
    this.cleanup = () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }

  private cleanup = () => {};

  onChange(fn: (l: Layout) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  apply() {
    const w = Math.max(1, this.host.clientWidth || window.innerWidth);
    const h = Math.max(1, this.host.clientHeight || window.innerHeight);
    const resolution = Math.min(window.devicePixelRatio || 1, 2);
    if (this.renderer.resolution !== resolution) this.renderer.resolution = resolution;
    this.renderer.resize(w, h, resolution);
    this.layout = computeLayout(w, h);
    useLayoutStore.getState().setLayout(this.layout);
    this.listeners.forEach((fn) => fn(this.layout));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    this.cleanup();
    this.listeners.clear();
  }
}
