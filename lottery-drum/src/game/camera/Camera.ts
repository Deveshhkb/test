import { Container } from 'pixi.js';
import {
  CAM_CLOSE_FOCUS_Y,
  CAM_CLOSE_ZOOM,
  CAM_WIDE_FOCUS_Y,
  CAM_WIDE_ZOOM,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MACHINE_X,
} from '../GameConfig';
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
export class Camera {
  readonly shake = new ScreenShake();

  private zoom = CAM_WIDE_ZOOM;
  private focusX = MACHINE_X;
  private focusY = CAM_WIDE_FOCUS_Y;

  private fromZoom = CAM_WIDE_ZOOM;
  private fromFocusX = MACHINE_X;
  private fromFocusY = CAM_WIDE_FOCUS_Y;
  private toZoom = CAM_WIDE_ZOOM;
  private toFocusX = MACHINE_X;
  private toFocusY = CAM_WIDE_FOCUS_Y;

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
      (this.zoom - CAM_WIDE_ZOOM) / (CAM_CLOSE_ZOOM - CAM_WIDE_ZOOM),
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
    this.dollyTo(CAM_CLOSE_ZOOM, MACHINE_X, CAM_CLOSE_FOCUS_Y, duration, easing);
  }

  /** Frames an arbitrary world point, used to follow the drawn pocket. */
  focusOn(x: number, y: number, zoom: number, duration: number, easing?: EasingFn): void {
    this.dollyTo(zoom, x, y, duration, easing);
  }

  get focus(): { x: number; y: number } {
    this.focusScratch.x = this.focusX;
    this.focusScratch.y = this.focusY;
    return this.focusScratch;
  }

  private readonly focusScratch = { x: 0, y: 0 };

  dollyToWide(duration: number, easing?: EasingFn): void {
    this.dollyTo(CAM_WIDE_ZOOM, MACHINE_X, CAM_WIDE_FOCUS_Y, duration, easing);
  }

  snapWide(): void {
    this.zoom = CAM_WIDE_ZOOM;
    this.focusX = MACHINE_X;
    this.focusY = CAM_WIDE_FOCUS_Y;
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
    this.target.x = DESIGN_WIDTH / 2 - this.focusX * this.zoom + this.shake.offsetX;
    this.target.y = DESIGN_HEIGHT / 2 - this.focusY * this.zoom + this.shake.offsetY;
  }
}
