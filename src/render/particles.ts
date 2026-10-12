import type { Rng } from '@/core/rng';
import type { Vec2 } from '@/core/vec';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

/** Pooled burst particles for eat / evolve feedback. Capped so a feeding frenzy can't tank FPS. */
export class Particles {
  private readonly items: Particle[] = [];
  private static readonly MAX = 600;

  constructor(private readonly rng: Rng) {}

  burst(at: Vec2, hue: number, count: number, speed: number, size: number): void {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= Particles.MAX) return;
      const a = this.rng.next() * Math.PI * 2;
      const v = speed * this.rng.range(0.3, 1);
      const life = this.rng.range(0.25, 0.6);
      this.items.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        maxLife: life,
        size,
        hue,
      });
    }
  }

  /** One spark flung backwards from a boosting creature's tail. */
  trail(at: Vec2, dir: Vec2, hue: number, size: number): void {
    if (this.items.length >= Particles.MAX) return;
    const spread = this.rng.range(-0.6, 0.6);
    const speed = this.rng.range(80, 200);
    const vx = (-dir.x + -dir.y * spread) * speed;
    const vy = (-dir.y + dir.x * spread) * speed;
    const life = this.rng.range(0.25, 0.5);
    this.items.push({ x: at.x, y: at.y, vx, vy, life, maxLife: life, size, hue });
  }

  update(dt: number): void {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      if (!p) continue;
      p.life -= dt;
      if (p.life <= 0) {
        const last = items[items.length - 1];
        if (last) items[i] = last;
        items.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
    }
  }

  draw(ctx: CanvasRenderingContext2D, toScreen: (p: Vec2) => Vec2, scale: number): void {
    for (const p of this.items) {
      const t = p.life / p.maxLife;
      const s = toScreen(p);
      ctx.globalAlpha = t;
      ctx.fillStyle = `hsl(${String(p.hue)} 80% 65%)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1, p.size * scale * t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
