import type { Vec2 } from './vec';

/**
 * Unified pointer input. Mouse, touch and pen all collapse to a single "aim point"
 * in screen space, so the creature steers toward wherever the player points or drags.
 * One-finger control is a hard requirement for the mobile share of CrazyGames traffic.
 */
export class Input {
  private readonly aim: Vec2 = { x: 0, y: 0 };
  private active = false;
  private type = 'mouse';

  constructor(private readonly target: HTMLElement) {
    target.addEventListener('pointermove', this.onPointer, { passive: true });
    target.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    target.addEventListener('pointerup', this.onPointerUp, { passive: true });
    target.addEventListener('pointercancel', this.onPointerUp, { passive: true });
    // Prevent the page from scrolling / zooming while dragging on touch screens.
    target.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
      },
      { passive: false },
    );
  }

  /** Aim point in screen pixels, relative to the target element. */
  get aimPoint(): Vec2 {
    return this.aim;
  }

  /** 'mouse', 'pen' or 'touch': whatever moved the pointer last. */
  get pointerType(): string {
    return this.type;
  }

  /** True while a finger is down. Used so a touch player who lifts off coasts rather than stops. */
  get isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.target.removeEventListener('pointermove', this.onPointer);
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.target.removeEventListener('pointerup', this.onPointerUp);
    this.target.removeEventListener('pointercancel', this.onPointerUp);
  }

  private readonly onPointer = (e: PointerEvent): void => {
    this.type = e.pointerType;
    // Touches steer through the virtual joystick, not by aiming at the finger.
    if (e.pointerType === 'touch') return;
    const rect = this.target.getBoundingClientRect();
    this.aim.x = e.clientX - rect.left;
    this.aim.y = e.clientY - rect.top;
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.active = true;
    this.onPointer(e);
  };

  private readonly onPointerUp = (): void => {
    this.active = false;
  };
}
