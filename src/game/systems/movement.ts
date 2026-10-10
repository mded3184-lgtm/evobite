import { CONFIG } from '@/config';
import { damp, len, normalize } from '@/core/vec';
import type { World } from '../world';

/**
 * Eases each creature's actual direction toward its heading, moves it, and keeps it inside
 * the circular arena with a soft push so sliding along the edge feels natural.
 */
export function movementSystem(world: World, dt: number): void {
  const lambda = CONFIG.player.steerLambda;
  const arenaR = CONFIG.arena.radius;

  for (const c of world.creatures.values()) {
    if (!c.alive) continue;
    if (world.paused && c.kind === 'player') continue;

    // Bigger creatures turn slower: lambda shrinks gently with mass.
    const turn = lambda / (1 + Math.log10(Math.max(1, c.mass)) * 0.35);
    c.dir.x = damp(c.dir.x, c.heading.x, turn, dt);
    c.dir.y = damp(c.dir.y, c.heading.y, turn, dt);
    const n = normalize(c.dir);
    c.dir.x = n.x;
    c.dir.y = n.y;

    const speed = world.speedFor(c);
    c.pos.x += c.dir.x * speed * dt;
    c.pos.y += c.dir.y * speed * dt;

    // Soft circular wall.
    const r = world.radiusFor(c.mass);
    const d = len(c.pos);
    const limit = arenaR - r * 0.5;
    if (d > limit) {
      const push = Math.min(1, (d - limit) / CONFIG.arena.wallPush + 0.15);
      c.pos.x -= (c.pos.x / d) * (d - limit) * push;
      c.pos.y -= (c.pos.y / d) * (d - limit) * push;
      // Hard clamp: the centre can never leave the arena, whatever the soft push did.
      const d2 = len(c.pos);
      const hard = arenaR - r * 0.25;
      if (d2 > hard) {
        c.pos.x *= hard / d2;
        c.pos.y *= hard / d2;
      }
    }
  }
}
