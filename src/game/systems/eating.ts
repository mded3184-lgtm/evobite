import { CONFIG } from '@/config';
import { distSq } from '@/core/vec';
import type { Creature, Orb } from '../types';
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
  eater.lastAteAt = world.time;
  prey.alive = false;
  prey.lastKillerId = eater.id;
  world.events.emit('creatureEaten', { eater, prey, revenge });
}

/** World units per grid cell; about the reach of a mid-sized creature. */
const CELL = 160;
/** Cells per side, covering the arena plus a margin for orbs nudged past the wall. */
const GRID_SIZE = Math.ceil((CONFIG.arena.radius * 2 + CELL * 2) / CELL);
const ORIGIN = CONFIG.arena.radius + CELL;

function cellOf(v: number): number {
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((v + ORIGIN) / CELL)));
}

interface OrbGrid {
  /** Orb indices sorted by cell. */
  order: Int32Array;
  /** start[cell]..start[cell + 1] is the cell's slice of `order`. */
  start: Int32Array;
}

let scratch: OrbGrid = {
  order: new Int32Array(0),
  start: new Int32Array(GRID_SIZE * GRID_SIZE + 1),
};

/** Counting sort of orbs into cells. Two passes, no per-tick allocation once warmed up. */
function buildOrbGrid(orbs: readonly Orb[]): OrbGrid {
  if (scratch.order.length < orbs.length) {
    scratch = { order: new Int32Array(orbs.length * 2), start: scratch.start };
  }
  const { order, start } = scratch;
  start.fill(0);
  const cells = new Int32Array(orbs.length);
  for (let i = 0; i < orbs.length; i++) {
    const orb = orbs[i];
    const cell = orb ? cellOf(orb.pos.y) * GRID_SIZE + cellOf(orb.pos.x) : 0;
    cells[i] = cell;
    start[cell + 1] = (start[cell + 1] ?? 0) + 1;
  }
  for (let i = 1; i < start.length; i++) start[i] = (start[i] ?? 0) + (start[i - 1] ?? 0);
  const fill = start.slice(0, start.length - 1);
  for (let i = 0; i < orbs.length; i++) {
    const cell = cells[i] ?? 0;
    order[fill[cell] ?? 0] = i;
    fill[cell] = (fill[cell] ?? 0) + 1;
  }
  return scratch;
}

/**
 * Orb pickup, orb magnet, creature-vs-creature predation and venom drain.
 * Creature pairs are brute force (~30 creatures, under 500 checks); orbs go through a grid.
 */
export function eatingSystem(world: World, dt: number): void {
  const creatures: Creature[] = [];
  for (const c of world.creatures.values()) if (c.alive) creatures.push(c);

  // Orbs, via a uniform grid rebuilt each tick: each creature only tests the orbs in the
  // cells it can reach, instead of every orb in the arena.
  const grid = buildOrbGrid(world.orbs);
  for (const c of creatures) {
    if (world.paused && c.kind === 'player') continue;
    const r = world.radiusFor(c.mass);
    const magnet = c.stats.magnetRadius;
    const magnetSq = (r + magnet) * (r + magnet);
    const pickR = r + CONFIG.orbs.radius * 0.3;
    const pickSq = pickR * pickR;
    const reach = Math.max(pickR, r + magnet);

    const x0 = cellOf(c.pos.x - reach);
    const x1 = cellOf(c.pos.x + reach);
    const y0 = cellOf(c.pos.y - reach);
    const y1 = cellOf(c.pos.y + reach);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = cy * GRID_SIZE + cx;
        const end = grid.start[cell + 1] ?? 0;
        for (let k = grid.start[cell] ?? 0; k < end; k++) {
          const orb = world.orbs[grid.order[k] ?? 0];
          if (!orb?.alive) continue;
          const d2 = distSq(c.pos, orb.pos);
          if (d2 <= pickSq) {
            orb.alive = false;
            c.mass += orb.mass * c.stats.foodMult;
            c.maxMass = Math.max(c.maxMass, c.mass);
            c.lastAteAt = world.time;
            world.events.emit('orbEaten', { eater: c, orb });
          } else if (magnet > 0 && d2 <= magnetSq) {
            const d = Math.sqrt(d2) || 1;
            const pull = 260 * dt;
            orb.pos.x += ((c.pos.x - orb.pos.x) / d) * pull;
            orb.pos.y += ((c.pos.y - orb.pos.y) / d) * pull;
          }
        }
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
