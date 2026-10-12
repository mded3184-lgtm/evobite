import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/config';
import { Game } from '@/game/game';
import { avoidWalls, botSystem } from '@/game/systems/bots';
import { World } from '@/game/world';
import type { Creature } from '@/game/types';
/** Spawn without spawn protection so predation can be tested immediately. */
function spawn(
  w: World,
  kind: 'player' | 'bot',
  name: string,
  mass: number,
  pos?: { x: number; y: number },
): Creature {
  const c = w.spawnCreature(kind, name, mass, pos);
  c.invulnUntil = 0;
  return c;
}

function dot(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return a.x * b.x + a.y * b.y;
}

describe('bot AI', () => {
  it('flees from a nearby predator', () => {
    const w = new World(7);
    w.time = 100;
    const bot = spawn(w, 'bot', 'b', 20, { x: 0, y: 0 });
    spawn(w, 'bot', 'p', 200, { x: 120, y: 0 });
    if (!bot.bot) throw new Error('expected a brain');
    bot.bot.thinkTimer = 0;
    botSystem(w, 1 / 60);
    expect(bot.bot.state).toBe('flee');
    expect(dot(bot.heading, { x: 1, y: 0 })).toBeLessThan(0);
  });

  it('hunts nearby prey when nothing threatens it', () => {
    const w = new World(7);
    w.time = 100;
    const bot = spawn(w, 'bot', 'b', 200, { x: 0, y: 0 });
    spawn(w, 'bot', 'prey', 20, { x: 150, y: 0 });
    if (!bot.bot) throw new Error('expected a brain');
    bot.bot.thinkTimer = 0;
    botSystem(w, 1 / 60);
    expect(bot.bot.state).toBe('hunt');
    expect(dot(bot.heading, { x: 1, y: 0 })).toBeGreaterThan(0.9);
  });

  it('wanders or grazes when alone and keeps a unit heading', () => {
    const w = new World(7);
    const bot = spawn(w, 'bot', 'b', 20, { x: 0, y: 0 });
    if (!bot.bot) throw new Error('expected a brain');
    bot.bot.thinkTimer = 0;
    botSystem(w, 1 / 60);
    expect(['wander', 'graze']).toContain(bot.bot.state);
    expect(Math.hypot(bot.heading.x, bot.heading.y)).toBeCloseTo(1);
  });
});

describe('wall avoidance', () => {
  it('never leaves a bot heading outward when it is at the wall', () => {
    const w = new World(11);
    const R = CONFIG.arena.radius;
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const bot = spawn(w, 'bot', 'b', 40, {
        x: Math.cos(a) * (R - 30),
        y: Math.sin(a) * (R - 30),
      });
      bot.heading = { x: Math.cos(a), y: Math.sin(a) }; // straight into the wall
      avoidWalls(w, bot, null);
      const outward = bot.heading.x * Math.cos(a) + bot.heading.y * Math.sin(a);
      expect(outward).toBeLessThan(0);
      expect(Math.hypot(bot.heading.x, bot.heading.y)).toBeCloseTo(1);
    }
  });

  it('slides along the wall away from the pursuer', () => {
    const w = new World(12);
    const R = CONFIG.arena.radius;
    const bot = spawn(w, 'bot', 'b', 40, { x: R - 40, y: 0 });
    const hunter = spawn(w, 'bot', 'h', 400, { x: R - 300, y: -150 }); // inside and "below"
    bot.heading = { x: 1, y: 0 };
    avoidWalls(w, bot, hunter);
    expect(bot.heading.y).toBeGreaterThan(0); // escapes "up", away from the hunter
    expect(bot.heading.x).toBeLessThan(0.2);
  });

  it('leaves bots far from the wall untouched', () => {
    const w = new World(13);
    const bot = spawn(w, 'bot', 'b', 40, { x: 100, y: 0 });
    bot.heading = { x: 1, y: 0 };
    avoidWalls(w, bot, null);
    expect(bot.heading).toEqual({ x: 1, y: 0 });
  });

  it('bots spend almost no time pinned against the wall in a long simulation', () => {
    const game = new Game(4);
    let near = 0;
    let total = 0;
    for (let i = 0; i < 60 * 40; i++) {
      game.update(1 / 60);
      for (const c of game.world.creatures.values()) {
        if (!c.alive || !c.bot) continue;
        total++;
        const gap =
          CONFIG.arena.radius - Math.hypot(c.pos.x, c.pos.y) - game.world.radiusFor(c.mass) * 0.5;
        if (gap < 15) near++;
      }
    }
    // Before wall avoidance this was ~3.7%, with single bots stuck for over 10 seconds.
    expect(near / total).toBeLessThan(0.005);
  }, 30_000);
});
