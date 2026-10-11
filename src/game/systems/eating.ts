import { CONFIG } from '@/config';
import { distSq } from '@/core/vec';
import type { Creature } from '../types';
import type { World } from '../world';

/** Returns true when `a` is allowed to eat `b` given both creatures' stats. */
export function canEat(a: Creature, b: Creature): boolean {
  if (!a.alive || !b.alive || a.id === b.id) return false;
  const required = Math.max(a.stats.eatRatio, b.stats.beEatenRatio);
  return a.mass >= b.mass * required;
}

/** Geometric check: prey centre must be well inside the attacker's body. */
export function isOverlapping(world: World, a: Creature, b: Creature): boolean {
  const ra = world.radiusFor(a.mass);
  const rb = world.radiusFor(b.mass);
  const reach = ra - rb * CONFIG.creature.eatOverlap;
  if (reach <= 0) return false;
  return distSq(a.pos, b.pos) <= reach * reach;
}

function touching(world: World, a: Creature, b: Creature): boolean {
  const r = world.radiusFor(a.mass) + world.radiusFor(b.mass);
  return distSq(a.pos, b.pos) <= r * r;
}

/**
 * Venom scales with the *smaller* of the two masses, so a tiny venomous creature can annoy
 * a giant but can't melt it. Draining the giant's own mass made small venom builds farm
 * huge creatures in seconds.
 */
export function applyVenom(world: World, source: Creature, target: Creature, dt: number): void {
  if (source.stats.venomDps <= 0 || target.invulnUntil > world.time) return;
  const base = Math.min(source.mass, target.mass);
  const drained = base * source.stats.venomDps * (1 - target.stats.venomResist) * dt;
  if (drained <= 0) return;
  target.mass = Math.max(1, target.mass - drained);
  source.mass += drained * CONFIG.venom.gainFraction;
  source.maxMass = Math.max(source.maxMass, source.mass);
}

function absorb(world: World, eater: Creature, prey: Creature): void {
  const revenge =
    eater.lastKillerId === prey.id && world.time <= eater.revengeUntil && eater.kind === 'player';
  const fraction = CONFIG.creature.absorbFraction * eater.stats.absorbMult;
  let gained = prey.mass * fraction;
  if (revenge) gained += prey.mass * CONFIG.revenge.bonusMass;
  eater.mass += gained;
  eater.maxMass = Math.max(eater.maxMass, eater.mass);
  eater.kills += 1;
  prey.alive = false;
  prey.lastKillerId = eater.id;
  world.events.emit('creatureEaten', { eater, prey, revenge });
}

/**
 * Orb pickup, orb magnet, creature-vs-creature predation and venom drain.
 * Brute force pair checks: with ~30 creatures and ~500 orbs this is well under 20k
 * distance checks per tick, which is nothing for a 60 Hz loop.
 */
export function eatingSystem(world: World, dt: number): void {
  const creatures: Creature[] = [];
  for (const c of world.creatures.values()) if (c.alive) creatures.push(c);

  // Orbs
  for (const c of creatures) {
    if (world.paused && c.kind === 'player') continue;
    const r = world.radiusFor(c.mass);
    const magnet = c.stats.magnetRadius;
    const magnetSq = (r + magnet) * (r + magnet);
    const pickSq = (r + CONFIG.orbs.radius * 0.3) * (r + CONFIG.orbs.radius * 0.3);

    for (const orb of world.orbs) {
      if (!orb.alive) continue;
      const d2 = distSq(c.pos, orb.pos);
      if (d2 <= pickSq) {
        orb.alive = false;
        c.mass += orb.mass * c.stats.foodMult;
        c.maxMass = Math.max(c.maxMass, c.mass);
        world.events.emit('orbEaten', { eater: c, orb });
      } else if (magnet > 0 && d2 <= magnetSq) {
        const d = Math.sqrt(d2) || 1;
        const pull = 260 * dt;
        orb.pos.x += ((c.pos.x - orb.pos.x) / d) * pull;
        orb.pos.y += ((c.pos.y - orb.pos.y) / d) * pull;
      }
    }
  }

  // Creatures
  for (let i = 0; i < creatures.length; i++) {
    const a = creatures[i];
    if (!a?.alive) continue;
    for (let j = i + 1; j < creatures.length; j++) {
      const b = creatures[j];
      if (!b?.alive) continue;
      if (!touching(world, a, b)) continue;

      // Venom: drain while touching, both directions, respecting resistance.
      applyVenom(world, a, b, dt);
      applyVenom(world, b, a, dt);

      // Predation. Spawn protection blocks being eaten, never eating.
      if (b.invulnUntil <= world.time && canEat(a, b) && isOverlapping(world, a, b)) {
        absorb(world, a, b);
      } else if (a.invulnUntil <= world.time && canEat(b, a) && isOverlapping(world, b, a)) {
        absorb(world, b, a);
        break; // `a` is dead; stop testing it against others.
      }
    }
  }
}
