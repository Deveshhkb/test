import { Application } from 'pixi.js';

/** Creates the PixiJS 8 application with DPR-aware, auto-density rendering. */
export async function createRenderer(host: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    width: host.clientWidth || window.innerWidth,
    height: host.clientHeight || window.innerHeight,
    preference: 'webgl',
    powerPreference: 'high-performance',
  });
  app.canvas.style.display = 'block';
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  host.appendChild(app.canvas);
  return app;
}
