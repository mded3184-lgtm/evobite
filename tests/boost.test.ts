import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/config';
import { Game } from '@/game/game';
import { boostSystem } from '@/game/systems/boost';
import { botSystem } from '@/game/systems/bots';
import { World } from '@/game/world';

const DT = 1 / 60;

describe('boost', () => {
  it('makes a creature faster', () => {
    const w = new World(1);
    const c = w.spawnCreature('bot', 'c', 50);
    const normal = w.speedFor(c);
    c.boosting = true;
    expect(w.speedFor(c)).toBeCloseTo(normal * CONFIG.boost.speedMult);
  });

  it('burns mass while boosting and drops part of it as orbs behind', () => {
    const w = new World(2);
    const c = w.spawnCreature('bot', 'c', 100, { x: 0, y: 0 });
    c.dir = { x: 1, y: 0 };
    c.boosting = true;
    const orbsBefore = w.orbs.length;
    // Two seconds of boosting.
    for (let i = 0; i < 120; i++) boostSystem(w, DT);
    const burned = 100 - c.mass;
    expect(burned).toBeGreaterThan(CONFIG.boost.minDrainPerSec * 2 * 0.99);
    expect(burned).toBeLessThan(100 * CONFIG.boost.drainRate * 2 * 1.01);
    const dropped = w.orbs.slice(orbsBefore);
    expect(dropped.length).toBeGreaterThan(0);
    // Dropped orbs land behind the creature.
    for (const orb of dropped) expect(orb.pos.x).toBeLessThan(0);
    // Never creates mass: dropped orbs are worth less than what was burned.
    const droppedMass = dropped.reduce((sum, o) => sum + o.mass, 0);
    expect(droppedMass).toBeLessThanOrEqual(burned * CONFIG.boost.dropFraction + 1e-9);
  });

  it('stops at the minimum mass and loses its speed bonus there', () => {
    const w = new World(3);
    const c = w.spawnCreature('bot', 'c', CONFIG.boost.minMass + 0.5);
    c.boosting = true;
    for (let i = 0; i < 600; i++) boostSystem(w, DT);
    expect(c.mass).toBeCloseTo(CONFIG.boost.minMass);
    expect(w.isBoosting(c)).toBe(false);
  });

  it('does nothing when not boosting', () => {
    const w = new World(4);
    const c = w.spawnCreature('bot', 'c', 100);
    boostSystem(w, 1);
    expect(c.mass).toBe(100);
  });

  it('bots panic-boost away from a predator that is right next to them', () => {
    const w = new World(5);
    w.time = 100;
    const bot = w.spawnCreature('bot', 'b', 60, { x: 0, y: 0 });
    const predator = w.spawnCreature('bot', 'p', 400, { x: 90, y: 0 });
    predator.invulnUntil = 0;
    if (!bot.bot) throw new Error('expected a brain');
    bot.bot.thinkTimer = 0;
    bot.bot.caution = 1;
    botSystem(w, DT);
    expect(bot.bot.state).toBe('flee');
    expect(bot.boosting).toBe(true);
  });
});

describe('player boost and pause', () => {
  it('player boost goes through the game API and is blocked while paused', () => {
    const game = new Game(6);
    const p = game.startRound();
    p.mass = 60;
    game.setBoost(true);
    expect(game.playerBoosting).toBe(true);
    game.setPaused(true);
    expect(game.playerBoosting).toBe(false);
    game.setBoost(true);
    expect(game.playerBoosting).toBe(false);
  });

  it('pause freezes the whole world and resume continues it', () => {
    const game = new Game(7);
    game.startRound();
    game.update(DT);
    expect(game.setPaused(true)).toBe(true);
    const time = game.world.time;
    const snapshot = [...game.world.creatures.values()].map((c) => ({ ...c.pos, mass: c.mass }));
    for (let i = 0; i < 120; i++) game.update(DT);
    expect(game.world.time).toBe(time);
    expect([...game.world.creatures.values()].map((c) => ({ ...c.pos, mass: c.mass }))).toEqual(
      snapshot,
    );
    game.setPaused(false);
    game.update(DT);
    expect(game.world.time).toBeGreaterThan(time);
  });

  it('cannot pause outside a live round', () => {
    const game = new Game(8);
    expect(game.setPaused(true)).toBe(false);
    expect(game.isPaused).toBe(false);
  });

  it('a new round always starts unpaused', () => {
    const game = new Game(9);
    game.startRound();
    game.setPaused(true);
    game.startRound();
    expect(game.isPaused).toBe(false);
  });
});
