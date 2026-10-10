import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/config';
import { Game } from '@/game/game';
import { Rng } from '@/core/rng';

const DT = 1 / 60;

describe('Game', () => {
  it('keeps the arena populated with the configured bots and orbs', () => {
    const game = new Game(1);
    let bots = 0;
    for (const c of game.world.creatures.values()) if (c.kind === 'bot' && c.alive) bots++;
    expect(bots).toBe(CONFIG.bots.count);
    expect(game.world.orbs.length).toBe(CONFIG.orbs.count);
  });

  it('runs a long headless simulation without errors and keeps everyone inside the arena', () => {
    const game = new Game(2);
    game.startRound();
    for (let i = 0; i < 60 * 90; i++) {
      game.update(DT);
      if (game.phase === 'dead') game.startRound();
    }
    for (const c of game.world.creatures.values()) {
      if (!c.alive) continue;
      expect(Math.hypot(c.pos.x, c.pos.y)).toBeLessThanOrEqual(CONFIG.arena.radius + 1);
      expect(Number.isFinite(c.mass)).toBe(true);
      expect(c.mass).toBeGreaterThan(0);
    }
  });

  it('pauses the player and offers a choice at the first threshold, then resumes after choosing', () => {
    const game = new Game(3);
    const player = game.startRound();
    let offered: number | null = null;
    game.world.events.on('evolutionOffer', ({ tier }) => (offered = tier));

    player.mass = CONFIG.evolution.thresholds[0];
    game.update(DT);
    expect(offered).toBe(0);
    expect(game.world.paused).toBe(true);

    const pos = { ...player.pos };
    game.update(DT);
    expect(player.pos).toEqual(pos); // frozen while picker is open

    game.chooseBranch('swift');
    expect(game.world.paused).toBe(false);
    expect(player.path).toEqual(['swift']);
    expect(player.stats.speedMult).toBeCloseTo(1.22);
    game.update(DT);
    expect(player.pos).not.toEqual(pos);
  });

  it('rejects an invalid branch for the current tier', () => {
    const game = new Game(4);
    const player = game.startRound();
    player.mass = CONFIG.evolution.thresholds[0];
    game.update(DT);
    expect(() => {
      game.chooseBranch('venom');
    }).toThrow();
  });

  it('reports a death with round stats and marks the killer for revenge on respawn', () => {
    const game = new Game(5);
    const player = game.startRound();
    player.invulnUntil = 0;
    const killer = game.world.spawnCreature('bot', 'killer', 500, {
      x: player.pos.x,
      y: player.pos.y,
    });
    let died = false;
    game.world.events.on('playerDied', () => (died = true));
    game.update(DT);
    expect(died).toBe(true);
    expect(game.phase).toBe('dead');
    expect(game.lastRoundStats?.maxMass).toBeGreaterThanOrEqual(CONFIG.player.startMass);

    game.startRound();
    expect(game.revengeTarget()?.id).toBe(killer.id);
  });

  it('bots evolve on their own as they grow', () => {
    const game = new Game(6);
    const bot = [...game.world.creatures.values()].find((c) => c.kind === 'bot');
    if (!bot) throw new Error('no bot');
    bot.mass = CONFIG.evolution.thresholds[1] + 1;
    game.update(DT);
    expect(bot.path.length).toBeGreaterThanOrEqual(1);
    expect(game.world.paused).toBe(false);
  });
});

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(99);
    const b = new Rng(99);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
  });
});
