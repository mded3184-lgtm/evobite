import { CONFIG } from '@/config';
import { Emitter } from '@/core/events';
import { Rng } from '@/core/rng';
import type { Vec2 } from '@/core/vec';
import type { BranchId } from './evolution/tree';
import { statsForPath } from './evolution/stats';
import type { Creature, CreatureKind, Orb, RoundStats } from './types';

/** Radial exponent for food spawns: a little more food toward the busy middle. */
const FOOD_SPREAD = 0.62;

export interface GameEvents extends Record<string, unknown> {
  orbEaten: { eater: Creature; orb: Orb };
  creatureEaten: { eater: Creature; prey: Creature; revenge: boolean };
  playerDied: { killer: Creature; stats: RoundStats };
  evolutionOffer: { creature: Creature; tier: number };
  evolved: { creature: Creature; branch: BranchId };
}

/**
 * The whole simulation state. Systems are plain functions that take the world and mutate it,
 * which keeps them trivially unit-testable without DOM or canvas.
 */
export class World {
  readonly events = new Emitter<GameEvents>();
  readonly creatures = new Map<number, Creature>();
  readonly orbs: Orb[] = [];
  readonly rng: Rng;
  /** Simulation time in seconds. */
  time = 0;
  playerId: number | null = null;
  /** When true, systems skip the player (used while the evolution picker is open). */
  paused = false;

  private nextId = 1;

  constructor(seed?: number) {
    this.rng = new Rng(seed);
  }

  get player(): Creature | null {
    return this.playerId === null ? null : (this.creatures.get(this.playerId) ?? null);
  }

  radiusFor(mass: number): number {
    return CONFIG.creature.radiusBase * Math.sqrt(mass);
  }

  /** True when the creature is boosting and still has mass to burn. */
  isBoosting(c: Creature): boolean {
    return c.boosting && c.mass > CONFIG.boost.minMass;
  }

  speedFor(c: Creature): number {
    const base = CONFIG.creature.speedBase / Math.pow(c.mass, CONFIG.creature.speedExp);
    const boost = this.isBoosting(c) ? CONFIG.boost.speedMult : 1;
    return Math.max(CONFIG.creature.minSpeed, base) * c.stats.speedMult * boost;
  }

  /**
   * Random point inside the arena. `spread` 0.5 is uniform by area; higher values lean
   * toward the centre (food uses that to make up for being eaten fastest in the middle).
   */
  randomPointInArena(margin = 80, spread = 0.5): Vec2 {
    const r = (CONFIG.arena.radius - margin) * Math.pow(this.rng.next(), spread);
    const a = this.rng.next() * Math.PI * 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  spawnCreature(kind: CreatureKind, name: string, mass: number, pos?: Vec2): Creature {
    const angle = this.rng.next() * Math.PI * 2;
    const c: Creature = {
      id: this.nextId++,
      kind,
      name,
      pos: pos ?? this.randomPointInArena(),
      dir: { x: Math.cos(angle), y: Math.sin(angle) },
      heading: { x: Math.cos(angle), y: Math.sin(angle) },
      mass,
      maxMass: mass,
      path: [],
      stats: statsForPath([]),
      hue: this.rng.int(0, 359),
      skin: null,
      alive: true,
      kills: 0,
      spawnedAt: this.time,
      invulnUntil: this.time + 2,
      lastKillerId: null,
      revengeUntil: 0,
      boosting: false,
      boostDropAcc: 0,
      lastAteAt: -10,
      bot:
        kind === 'bot'
          ? {
              state: 'wander',
              targetId: null,
              wanderAngle: angle,
              thinkTimer: this.rng.range(0, CONFIG.bots.thinkInterval),
              aggression: this.rng.range(0.4, 1),
              caution: this.rng.range(0.4, 1),
              buildPlan: null,
            }
          : null,
    };
    this.creatures.set(c.id, c);
    return c;
  }

  /** Food patch centres; lazily placed, then moved one at a time as they get used. */
  private readonly patches: Vec2[] = [];

  /**
   * Most orbs spawn in patches around centres spread evenly over the arena, so food gathers
   * in clumps worth grazing through. Patches used to grow around existing orbs, which let
   * uneaten food by the wall (bots keep away from it) breed more food there: the outer rim
   * ended up with 7x the average density and the middle with a tenth.
   */
  private orbSpawnPoint(): Vec2 {
    const { clusterChance, clusterSpread, patchCount, patchMoveChance, wallMargin } = CONFIG.orbs;
    const patchMargin = wallMargin + clusterSpread;
    if (this.patches.length === 0) {
      for (let i = 0; i < patchCount; i++) {
        this.patches.push(this.randomPointInArena(patchMargin, FOOD_SPREAD));
      }
    }
    if (this.rng.chance(clusterChance)) {
      const index = this.rng.int(0, this.patches.length - 1);
      const centre = this.patches[index];
      if (centre) {
        const a = this.rng.next() * Math.PI * 2;
        const d = clusterSpread * Math.sqrt(this.rng.next());
        const p = { x: centre.x + Math.cos(a) * d, y: centre.y + Math.sin(a) * d };
        if (this.rng.chance(patchMoveChance))
          this.patches[index] = this.randomPointInArena(patchMargin);
        return p;
      }
    }
    return this.randomPointInArena(wallMargin, FOOD_SPREAD);
  }

  spawnOrb(pos?: Vec2, size?: { mass: number; radius: number; hue: number }): Orb {
    const big = this.rng.chance(CONFIG.orbs.bigChance);
    const orb: Orb = {
      id: this.nextId++,
      pos: pos ?? this.orbSpawnPoint(),
      mass: size?.mass ?? (big ? CONFIG.orbs.bigMass : CONFIG.orbs.mass),
      radius: size?.radius ?? (big ? CONFIG.orbs.bigRadius : CONFIG.orbs.radius),
      hue: size?.hue ?? this.rng.int(0, 359),
      alive: true,
      bornAt: this.time,
      expiresAt: this.time + this.rng.range(CONFIG.orbs.lifeMinSec, CONFIG.orbs.lifeMaxSec),
    };
    this.orbs.push(orb);
    return orb;
  }

  removeCreature(id: number): void {
    this.creatures.delete(id);
  }

  /** Living creatures sorted by mass, largest first. */
  leaderboard(limit = 5): Creature[] {
    const alive: Creature[] = [];
    for (const c of this.creatures.values()) if (c.alive) alive.push(c);
    alive.sort((a, b) => b.mass - a.mass);
    return alive.slice(0, limit);
  }

  rankOf(id: number): number {
    const alive: Creature[] = [];
    for (const c of this.creatures.values()) if (c.alive) alive.push(c);
    alive.sort((a, b) => b.mass - a.mass);
    return alive.findIndex((c) => c.id === id) + 1;
  }

  roundStatsFor(c: Creature, revengeKills: number): RoundStats {
    return {
      maxMass: c.maxMass,
      kills: c.kills,
      revengeKills,
      survivedSec: this.time - c.spawnedAt,
      finalTier: c.path.length,
      path: [...c.path],
    };
  }
}
