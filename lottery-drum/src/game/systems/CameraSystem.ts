import { Container } from 'pixi.js';
import {
  CAM_CLOSE_FOCUS_Y,
  CAM_CLOSE_ZOOM,
  CAM_IDLE_FOCUS_Y,
  CAM_IDLE_ZOOM,
  DRUM_CENTER_X,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config';
import { EasingFn, easeInOutCubic } from '../utils/easing';
import { clamp, lerp } from '../utils/math';
import { ScreenShake } from '../effects/ScreenShake';

/**
 * Dolly camera. Zoom is applied about a focus point expressed in world
 * coordinates, so the focus stays pinned to the centre of the frame exactly the
 * way the reference push-in behaves.
 *
 * Moves are declarative: `dollyTo` starts a timed, eased transition and
 * `update` advances it with delta time, so the motion is identical at any
 * refresh rate.
 */
export class CameraSystem {
  readonly shake = new ScreenShake();

  private zoom = CAM_IDLE_ZOOM;
  private focusX = DRUM_CENTER_X;
  private focusY = CAM_IDLE_FOCUS_Y;

  private fromZoom = CAM_IDLE_ZOOM;
  private fromFocusX = DRUM_CENTER_X;
  private fromFocusY = CAM_IDLE_FOCUS_Y;
  private toZoom = CAM_IDLE_ZOOM;
  private toFocusX = DRUM_CENTER_X;
  private toFocusY = CAM_IDLE_FOCUS_Y;

  private elapsed = 0;
  private duration = 0;
  private easing: EasingFn = easeInOutCubic;

  constructor(private readonly target: Container) {}

  get currentZoom(): number {
    return this.zoom;
  }

  /** Normalised push-in progress, 0 at the wide framing and 1 at the close-up. */
  get closeness(): number {
    return clamp(
      (this.zoom - CAM_IDLE_ZOOM) / (CAM_CLOSE_ZOOM - CAM_IDLE_ZOOM),
      0,
      1,
    );
  }

  dollyTo(
    zoom: number,
    focusX: number,
    focusY: number,
    duration: number,
    easing: EasingFn = easeInOutCubic,
  ): void {
    this.fromZoom = this.zoom;
    this.fromFocusX = this.focusX;
    this.fromFocusY = this.focusY;
    this.toZoom = zoom;
    this.toFocusX = focusX;
    this.toFocusY = focusY;
    this.duration = Math.max(duration, 0.0001);
    this.elapsed = 0;
    this.easing = easing;
  }

  dollyToClose(duration: number, easing?: EasingFn): void {
    this.dollyTo(CAM_CLOSE_ZOOM, DRUM_CENTER_X, CAM_CLOSE_FOCUS_Y, duration, easing);
  }

  dollyToWide(duration: number, easing?: EasingFn): void {
    this.dollyTo(CAM_IDLE_ZOOM, DRUM_CENTER_X, CAM_IDLE_FOCUS_Y, duration, easing);
  }

  snapWide(): void {
    this.zoom = CAM_IDLE_ZOOM;
    this.focusX = DRUM_CENTER_X;
    this.focusY = CAM_IDLE_FOCUS_Y;
    this.duration = 0;
    this.elapsed = 0;
    this.shake.reset();
    this.apply();
  }

  update(dt: number): void {
    if (this.elapsed < this.duration) {
      this.elapsed = Math.min(this.elapsed + dt, this.duration);
      const t = this.easing(this.elapsed / this.duration);
      this.zoom = lerp(this.fromZoom, this.toZoom, t);
      this.focusX = lerp(this.fromFocusX, this.toFocusX, t);
      this.focusY = lerp(this.fromFocusY, this.toFocusY, t);
    }
    this.shake.update(dt);
    this.apply();
  }

  private apply(): void {
    this.target.scale.set(this.zoom);
    this.target.x = WORLD_WIDTH / 2 - this.focusX * this.zoom + this.shake.offsetX;
    this.target.y = WORLD_HEIGHT / 2 - this.focusY * this.zoom + this.shake.offsetY;
  }
}
