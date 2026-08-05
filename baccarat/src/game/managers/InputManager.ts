import type { Application, Container, FederatedPointerEvent } from "pixi.js";

import type { GameEventMap } from "../events";
import type { EventBus } from "../utils/EventBus";
import { Logger } from "../utils/Logger";
import { isTouchDevice } from "../utils/Helpers";
import type { AudioManager } from "./AudioManager";
import { Sfx } from "./AudioManager";

export interface InteractiveOptions {
  onTap?: (event: FederatedPointerEvent) => void;
  onPressStart?: (event: FederatedPointerEvent) => void;
  onPressEnd?: (event: FederatedPointerEvent) => void;
  onHover?: (hovering: boolean) => void;
  /** Plays the UI click cue on tap. Default true. */
  sound?: boolean;
  cursor?: string;
}

export type ShortcutHandler = () => void;

/**
 * One place for every way a human can touch the game.
 *
 * Beyond wiring Pixi's pointer events it owns three things that are easy to get
 * wrong and painful to debug: unlocking Web Audio on the first real gesture,
 * auto-pausing when the tab is hidden (so a backgrounded table does not burn
 * battery or desync), and removing every listener it added on destroy.
 */
export class InputManager {
  private readonly log = Logger.create("input");
  private readonly app: Application;
  private readonly bus: EventBus<GameEventMap>;
  private readonly audio: AudioManager;

  private readonly shortcuts = new Map<string, ShortcutHandler>();
  private readonly cleanups: Array<() => void> = [];
  private readonly touch = isTouchDevice();

  private enabled = true;
  private onVisibilityChange: (() => void) | null = null;

  constructor(app: Application, bus: EventBus<GameEventMap>, audio: AudioManager) {
    this.app = app;
    this.bus = bus;
    this.audio = audio;
  }

  attach(host: HTMLElement): void {
    // The first gesture anywhere is our licence to start the audio graph.
    const unlock = (): void => this.audio.unlock();
    host.addEventListener("pointerdown", unlock, { passive: true });
    host.addEventListener("keydown", unlock, { passive: true });
    this.cleanups.push(() => {
      host.removeEventListener("pointerdown", unlock);
      host.removeEventListener("keydown", unlock);
    });

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!this.enabled) return;
      const target = event.target as HTMLElement | null;
      // Never steal keys from a host app's form fields.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const handler = this.shortcuts.get(event.key.toLowerCase());
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKeyDown);
    this.cleanups.push(() => window.removeEventListener("keydown", onKeyDown));

    const onContextMenu = (event: Event): void => event.preventDefault();
    host.addEventListener("contextmenu", onContextMenu);
    this.cleanups.push(() => host.removeEventListener("contextmenu", onContextMenu));

    this.onVisibilityChange = (): void => {
      if (document.hidden) this.bus.emit("game:paused", undefined);
      else this.bus.emit("game:resumed", undefined);
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get isTouch(): boolean {
    return this.touch;
  }

  registerShortcut(key: string, handler: ShortcutHandler): () => void {
    const normalised = key.toLowerCase();
    this.shortcuts.set(normalised, handler);
    return () => this.shortcuts.delete(normalised);
  }

  /**
   * Makes a container respond to pointer input with consistent affordances.
   * Returns a disposer so display objects can clean up when pooled.
   */
  makeInteractive(target: Container, options: InteractiveOptions): () => void {
    target.eventMode = "static";
    target.cursor = options.cursor ?? "pointer";

    let pressed = false;

    const onDown = (event: FederatedPointerEvent): void => {
      if (!this.enabled) return;
      pressed = true;
      options.onPressStart?.(event);
    };

    const onUp = (event: FederatedPointerEvent): void => {
      if (!this.enabled || !pressed) return;
      pressed = false;
      options.onPressEnd?.(event);
      if (options.sound !== false) this.audio.play(Sfx.Button);
      options.onTap?.(event);
    };

    const onUpOutside = (event: FederatedPointerEvent): void => {
      if (!pressed) return;
      pressed = false;
      options.onPressEnd?.(event);
    };

    const onOver = (): void => {
      if (!this.enabled || this.touch) return;
      options.onHover?.(true);
    };

    const onOut = (): void => {
      if (this.touch) return;
      options.onHover?.(false);
    };

    target.on("pointerdown", onDown);
    target.on("pointerup", onUp);
    target.on("pointerupoutside", onUpOutside);
    target.on("pointerover", onOver);
    target.on("pointerout", onOut);

    return () => {
      target.off("pointerdown", onDown);
      target.off("pointerup", onUp);
      target.off("pointerupoutside", onUpOutside);
      target.off("pointerover", onOver);
      target.off("pointerout", onOut);
      target.eventMode = "none";
    };
  }

  destroy(): void {
    for (const cleanup of this.cleanups.splice(0)) {
      try {
        cleanup();
      } catch (error) {
        this.log.warn("cleanup failed", error);
      }
    }
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    this.shortcuts.clear();
  }
}
