import type { Vec2 } from '@/core/vec';
import { el } from './dom';

/** Below this fraction of the stick's travel the input is treated as centred. */
const DEAD_ZONE = 0.18;

/**
 * Fixed virtual joystick for touch screens. The base stays put in the bottom-left corner
 * (positioned by CSS); only the knob moves. A thumb anywhere in the lower-left part of the
 * screen grabs it, so it's easy to hit without looking. Releasing keeps the creature moving
 * in its last direction. Only the finger that grabbed the stick controls it, so a second
 * finger is free for the boost button.
 */
export class Joystick {
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private pointerId: number | null = null;
  private center: Vec2 = { x: 0, y: 0 };
  private travel = 1;
  private offset: Vec2 = { x: 0, y: 0 };
  private enabled = false;

  constructor(surface: HTMLElement, container: HTMLElement) {
    this.base = el('div', 'joystick hidden');
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
    if (len < this.travel * DEAD_ZONE) return null;
    return { x: this.offset.x / len, y: this.offset.y / len };
  }

  /** A touch grabs the stick if it lands near it or anywhere in the lower-left of the screen. */
  private grabs(x: number, y: number): boolean {
    const near = Math.hypot(x - this.center.x, y - this.center.y) <= this.travel * 2.6;
    const zone = x < window.innerWidth * 0.5 && y > window.innerHeight * 0.4;
    return near || zone;
  }

  private measure(): void {
    const r = this.base.getBoundingClientRect();
    this.center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    // The knob may travel until its centre reaches the rim of the base.
    this.travel = r.width / 2;
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (!this.enabled || e.pointerType !== 'touch' || this.pointerId !== null) return;
    this.measure();
    if (!this.grabs(e.clientX, e.clientY)) return;
    this.pointerId = e.pointerId;
    this.base.classList.add('held');
    this.update(e.clientX, e.clientY);
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.update(e.clientX, e.clientY);
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.release();
  };

  private update(x: number, y: number): void {
    let dx = x - this.center.x;
    let dy = y - this.center.y;
    const len = Math.hypot(dx, dy);
    if (len > this.travel) {
      dx = (dx / len) * this.travel;
      dy = (dy / len) * this.travel;
    }
    this.offset = { x: dx, y: dy };
    this.knob.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`;
  }

  private release(): void {
    this.pointerId = null;
    this.offset = { x: 0, y: 0 };
    this.base.classList.remove('held');
    this.knob.style.transform = '';
  }
}
