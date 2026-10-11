import { describe, expect, it } from 'vitest';
import { CONFIG } from '@/config';
import { statsForPath } from '@/game/evolution/stats';
import { canEat, eatingSystem, isOverlapping } from '@/game/systems/eating';
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

function worldWith(): World {
  const w = new World(42);
  w.time = 100; // past any spawn protection
  return w;
}

describe('canEat', () => {
  it('requires the configured ratio over prey', () => {
    const w = worldWith();
    const big = spawn(w, 'bot', 'big', 100);
    const small = spawn(w, 'bot', 'small', 100 / CONFIG.creature.eatRatio + 0.01);
    expect(canEat(big, small)).toBe(false);
    small.mass = 100 / CONFIG.creature.eatRatio - 0.01;
    expect(canEat(big, small)).toBe(true);
    expect(canEat(small, big)).toBe(false);
  });

  it('respects armor on the prey and apex on the attacker', () => {
    const w = worldWith();
    const attacker = spawn(w, 'bot', 'a', 130);
    const prey = spawn(w, 'bot', 'p', 100);
    expect(canEat(attacker, prey)).toBe(true);
    prey.stats = statsForPath(['swift', 'armor']);
    expect(canEat(attacker, prey)).toBe(false); // needs 1.5x now
    attacker.mass = 150;
    expect(canEat(attacker, prey)).toBe(true);

    const apex = spawn(w, 'bot', 'apex', 106);
    apex.stats = statsForPath(['swift', 'venom', 'hunter', 'apex']);
    const victim = spawn(w, 'bot', 'v', 100);
    expect(canEat(apex, victim)).toBe(true);
  });
});

describe('eatingSystem', () => {
  it('eats an overlapping smaller creature, absorbs mass and emits an event', () => {
    const w = worldWith();
    const big = spawn(w, 'bot', 'big', 200, { x: 0, y: 0 });
    const small = spawn(w, 'bot', 'small', 20, { x: 5, y: 0 });
    const events: string[] = [];
    w.events.on('creatureEaten', ({ eater, prey }) => events.push(`${eater.name}>${prey.name}`));

    expect(isOverlapping(w, big, small)).toBe(true);
    eatingSystem(w, 1 / 60);

    expect(small.alive).toBe(false);
    expect(big.kills).toBe(1);
    expect(big.mass).toBeCloseTo(200 + 20 * CONFIG.creature.absorbFraction);
    expect(events).toEqual(['big>small']);
  });

  it('does not eat a creature that is only touching at the edge', () => {
    const w = worldWith();
    spawn(w, 'bot', 'big', 200, { x: 0, y: 0 });
    const rBig = w.radiusFor(200);
    const small = spawn(w, 'bot', 'small', 20, { x: rBig, y: 0 });
    eatingSystem(w, 1 / 60);
    expect(small.alive).toBe(true);
  });

  it('spawn protection prevents being eaten but not eating', () => {
    const w = worldWith();
    spawn(w, 'bot', 'big', 200, { x: 0, y: 0 });
    const small = spawn(w, 'bot', 'small', 20, { x: 2, y: 0 });
    small.invulnUntil = w.time + 5;
    eatingSystem(w, 1 / 60);
    expect(small.alive).toBe(true);
    small.invulnUntil = w.time;
    eatingSystem(w, 1 / 60);
    expect(small.alive).toBe(false);
  });

  it('gives the player a revenge bonus when eating their last killer', () => {
    const w = worldWith();
    const player = spawn(w, 'player', 'me', 200, { x: 0, y: 0 });
    const killer = spawn(w, 'bot', 'k', 20, { x: 3, y: 0 });
    w.playerId = player.id;
    player.lastKillerId = killer.id;
    player.revengeUntil = w.time + 10;
    let revenge = false;
    w.events.on('creatureEaten', (e) => (revenge = e.revenge));
    eatingSystem(w, 1 / 60);
    expect(revenge).toBe(true);
    expect(player.mass).toBeCloseTo(
      200 + 20 * CONFIG.creature.absorbFraction + 20 * CONFIG.revenge.bonusMass,
    );
  });

  it('venom drains a touching creature and feeds the attacker', () => {
    const w = worldWith();
    const venom = spawn(w, 'bot', 'v', 50, { x: 0, y: 0 });
    venom.stats = statsForPath(['swift', 'venom']);
    const r = w.radiusFor(50) + w.radiusFor(50) - 1;
    const other = spawn(w, 'bot', 'o', 50, { x: r, y: 0 });
    eatingSystem(w, 1);
    expect(other.mass).toBeLessThan(50);
    expect(venom.mass).toBeGreaterThan(50);
    expect(venom.mass - 50).toBeCloseTo((50 - other.mass) * 0.5);
  });

  it('venom scales with the smaller mass, so a tiny venom creature cannot melt a giant', () => {
    const w = worldWith();
    const tiny = spawn(w, 'bot', 'tiny', 20, { x: 0, y: 0 });
    tiny.stats = statsForPath(['swift', 'venom']);
    const giant = spawn(w, 'bot', 'giant', 400, { x: w.radiusFor(400), y: 0 });
    giant.stats = statsForPath(['swift', 'venom']); // giant also venomous, no armor
    tiny.stats = statsForPath(['swift', 'venom']);
    eatingSystem(w, 1);
    // One second of contact costs the giant at most 4% of the *tiny* mass.
    expect(400 - giant.mass).toBeLessThanOrEqual(20 * 0.04 + 1e-9);
    // And the tiny creature can't farm more than half of that.
    expect(tiny.mass).toBeLessThan(20 + 20 * 0.04);
  });

  it('armor resists venom', () => {
    const w = worldWith();
    const venom = spawn(w, 'bot', 'v', 50, { x: 0, y: 0 });
    venom.stats = statsForPath(['swift', 'venom']);
    const plain = spawn(w, 'bot', 'p', 50, { x: w.radiusFor(50) * 2 - 1, y: 0 });
    const armored = spawn(w, 'bot', 'a', 50, { x: -(w.radiusFor(50) * 2 - 1), y: 0 });
    armored.stats = statsForPath(['bulk', 'armor']);
    eatingSystem(w, 1);
    expect(50 - armored.mass).toBeLessThan((50 - plain.mass) * 0.5);
  });

  it('orbs are eaten with the food multiplier and pulled by grazers', () => {
    const w = worldWith();
    const grazer = spawn(w, 'bot', 'g', 50, { x: 0, y: 0 });
    grazer.stats = statsForPath(['bulk', 'armor', 'grazer']);
    // Inside the magnet radius but outside pickup range.
    const far = w.spawnOrb({ x: w.radiusFor(50) + grazer.stats.magnetRadius * 0.6, y: 0 });
    const near = w.spawnOrb({ x: 1, y: 0 });
    const before = far.pos.x;
    eatingSystem(w, 1 / 60);
    expect(near.alive).toBe(false);
    expect(grazer.mass).toBeCloseTo(50 + near.mass * grazer.stats.foodMult);
    expect(far.pos.x).toBeLessThan(before);
  });
});
