import type { Vec2 } from '@/core/vec';
import { el } from './dom';

/** How far (px) the knob can travel from the base centre. */
const RADIUS = 56;
/** Below this fraction of RADIUS the stick is treated as centred (keeps the last heading). */
const DEAD_ZONE = 0.18;

/**
 * Floating virtual joystick for touch screens. Put a thumb down anywhere on the arena and the
 * base appears under it; drag to steer. Releasing keeps the creature moving in its last
 * direction, like most .io games. Only the finger that started the stick controls it, so a
 * second finger is free for the boost button.
 *
 * When idle, a faint "ghost" stick sits in the bottom-left corner to show touch players that
 * the control exists.
 */
export class Joystick {
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private pointerId: number | null = null;
  private origin: Vec2 = { x: 0, y: 0 };
  private offset: Vec2 = { x: 0, y: 0 };
  private enabled = false;

  constructor(surface: HTMLElement, container: HTMLElement) {
    this.base = el('div', 'joystick idle hidden');
    this.knob = el('div', 'joystick-knob');
    this.base.appendChild(this.knob);
    container.appendChild(this.base);

    surface.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  /** Show the stick (during a live round on touch devices) or hide it entirely. */
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (!on) this.release();
    this.base.classList.toggle('hidden', !on);
  }

  /** True while a finger is holding the stick. */
  get active(): boolean {
    return this.pointerId !== null;
  }

  /**
   * Steering direction as a unit vector, or null when the stick is idle or centred
   * (the caller should then keep the current heading).
   */
  get direction(): Vec2 | null {
    if (this.pointerId === null) return null;
    const len = Math.hypot(this.offset.x, this.offset.y);
    if (len < RADIUS * DEAD_ZONE) return null;
    return { x: this.offset.x / len, y: this.offset.y / len };
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (!this.enabled || e.pointerType !== 'touch' || this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.origin = { x: e.clientX, y: e.clientY };
    this.offset = { x: 0, y: 0 };
    this.base.classList.remove('idle');
    this.base.classList.add('held');
    this.place();
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    let dx = e.clientX - this.origin.x;
    let dy = e.clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      // Drag the base along when the thumb goes past the rim, so the stick never "runs out".
      const excess = len - RADIUS;
      this.origin.x += (dx / len) * excess;
      this.origin.y += (dy / len) * excess;
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    this.offset = { x: dx, y: dy };
    this.place();
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.release();
  };

  private release(): void {
    this.pointerId = null;
    this.offset = { x: 0, y: 0 };
    this.base.classList.remove('held');
    this.base.classList.add('idle');
    this.base.style.removeProperty('left');
    this.base.style.removeProperty('top');
    this.knob.style.transform = '';
  }

  private place(): void {
    this.base.style.left = `${String(this.origin.x)}px`;
    this.base.style.top = `${String(this.origin.y)}px`;
    this.knob.style.transform = `translate(${String(this.offset.x)}px, ${String(this.offset.y)}px)`;
  }
}
