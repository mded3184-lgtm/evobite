import { CONFIG } from '@/config';
import { damp } from '@/core/vec';
import type { Vec2 } from '@/core/vec';

/** Follows a target and zooms out as the target grows, with frame-rate independent easing. */
export class Camera {
  readonly pos: Vec2 = { x: 0, y: 0 };
  /** World units visible vertically. */
  viewHeight: number = CONFIG.camera.baseView;
  width = 1;
  height = 1;

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  get scale(): number {
    return this.height / this.viewHeight;
  }

  /** `zoomKick` > 1 pulls the camera out a little, e.g. while the player boosts. */
  follow(target: Vec2, mass: number, dt: number, snap = false, zoomKick = 1): void {
    const desiredView = CONFIG.camera.baseView * (1 + Math.sqrt(mass) * 0.07) * zoomKick;
    if (snap) {
      this.pos.x = target.x;
      this.pos.y = target.y;
      this.viewHeight = desiredView;
      return;
    }
    this.pos.x = damp(this.pos.x, target.x, 12, dt);
    this.pos.y = damp(this.pos.y, target.y, 12, dt);
    this.viewHeight = damp(this.viewHeight, desiredView, CONFIG.camera.zoomLambda, dt);
  }

  worldToScreen(p: Vec2): Vec2 {
    const s = this.scale;
    return {
      x: (p.x - this.pos.x) * s + this.width / 2,
      y: (p.y - this.pos.y) * s + this.height / 2,
    };
  }

  screenToWorld(p: Vec2): Vec2 {
    const s = this.scale;
    return {
      x: (p.x - this.width / 2) / s + this.pos.x,
      y: (p.y - this.height / 2) / s + this.pos.y,
    };
  }

  /** Half extents of the visible world rect, plus a margin for culling. */
  visibleHalf(margin = 60): Vec2 {
    return { x: this.width / this.scale / 2 + margin, y: this.viewHeight / 2 + margin };
  }
}
