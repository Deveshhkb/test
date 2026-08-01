import type { Container } from 'pixi.js';
import { CAMERA_CONFIG } from '@/config/flight';
import { damp } from '@/utils/math';

/**
 * Cinematic camera: framing pan, speed-reactive zoom, trauma-based shake.
 *
 * The camera never moves the plane — it transforms the world container
 * (pan/zoom about the viewport centre) and reports its pan so parallax
 * layers can counter-move at their own depth factors.
 *
 * Shake uses the trauma model: impacts add trauma ∈ [0,1], amplitude is
 * trauma² (small hits barely register, crashes slam), decaying linearly.
 * Honors prefers-reduced-motion by disabling shake and roll entirely.
 */
export interface CameraTarget {
  x: number;
  y: number;
}

export class CameraManager {
  private readonly world: Container;
  private readonly reduceMotion: boolean;

  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private trauma = 0;
  private time = 0;
  private viewWidth = 0;
  private viewHeight = 0;

  constructor(world: Container) {
    this.world = world;
    this.reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  get currentPanX(): number {
    return this.panX;
  }

  get currentPanY(): number {
    return this.panY;
  }

  resize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    // Zoom pivots about the viewport centre.
    this.world.pivot.set(width / 2, height / 2);
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number, target: CameraTarget, speed: number): void {
    const cfg = CAMERA_CONFIG;
    this.time += dt;

    // --- Framing pan: keep the plane inside the comfortable frame. -------
    const topLimit = this.viewHeight * cfg.frameTop;
    const rightLimit = this.viewWidth * cfg.frameRight;
    const desiredPanY = Math.max(0, topLimit - target.y);
    const desiredPanX = -Math.max(0, target.x - rightLimit);

    this.panX = damp(this.panX, desiredPanX, cfg.panSmoothness, dt);
    this.panY = damp(this.panY, desiredPanY, cfg.panSmoothness, dt);

    // --- Speed zoom: pull back as the multiplier accelerates. ------------
    const desiredZoom = 1 - Math.min(cfg.maxZoomOut, speed * cfg.maxZoomOut);
    this.zoom = damp(this.zoom, desiredZoom, cfg.zoomSmoothness, dt);

    // --- Shake: layered sines at incommensurate frequencies read as noise.
    this.trauma = Math.max(0, this.trauma - cfg.traumaDecay * dt);
    let shakeX = 0;
    let shakeY = 0;
    let roll = 0;
    if (!this.reduceMotion && this.trauma > 0) {
      const magnitude = this.trauma * this.trauma;
      const amp = magnitude * Math.min(this.viewWidth, this.viewHeight) * cfg.shakeAmplitude;
      shakeX = amp * (Math.sin(this.time * 47.3) * 0.6 + Math.sin(this.time * 91.7) * 0.4);
      shakeY = amp * (Math.sin(this.time * 53.9) * 0.6 + Math.sin(this.time * 77.1) * 0.4);
      roll = magnitude * cfg.shakeRotation * Math.sin(this.time * 31.4);
    }

    // Continuous micro-drift with speed keeps the frame feeling alive even
    // between shakes (also disabled for reduced motion).
    if (!this.reduceMotion) {
      shakeX += Math.sin(this.time * 1.9) * speed * 3;
      shakeY += Math.sin(this.time * 1.3) * speed * 2;
    }

    this.world.scale.set(this.zoom);
    this.world.position.set(
      this.viewWidth / 2 + this.panX + shakeX,
      this.viewHeight / 2 + this.panY + shakeY,
    );
    this.world.rotation = roll;
  }

  reset(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.trauma = 0;
    this.world.rotation = 0;
    this.world.scale.set(1);
    this.world.position.set(this.viewWidth / 2, this.viewHeight / 2);
  }
}
