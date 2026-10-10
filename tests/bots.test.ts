import { describe, expect, it } from 'vitest';
import { botSystem } from '@/game/systems/bots';
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
