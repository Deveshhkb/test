export type InputAction = 'draw' | 'toggleDebug' | 'reset';

type ActionHandler = (action: InputAction) => void;

/**
 * Keyboard and pointer input for the canvas. All listeners are registered on
 * construction and torn down by `destroy`, so a React strict-mode double mount
 * cannot leak them.
 */
export class InputManager {
  private readonly handlers = new Set<ActionHandler>();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    switch (event.code) {
      case 'Space':
      case 'Enter':
        event.preventDefault();
        this.dispatch('draw');
        break;
      case 'KeyD':
        this.dispatch('toggleDebug');
        break;
      case 'KeyR':
        this.dispatch('reset');
        break;
      default:
        break;
    }
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.dispatch('draw');
  };

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    this.element.addEventListener('pointerdown', this.onPointerDown);
  }

  on(handler: ActionHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private dispatch(action: InputAction): void {
    for (const handler of this.handlers) handler(action);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.handlers.clear();
  }
}
