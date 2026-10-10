import { CONFIG } from '@/config';
import { normalize, sub } from '@/core/vec';
import type { Vec2 } from '@/core/vec';
import type { BranchId } from './evolution/tree';
import { formKey, TIER_COUNT } from './evolution/tree';
import { botSystem } from './systems/bots';
import { decaySystem } from './systems/decay';
import { eatingSystem } from './systems/eating';
import { applyBranch, evolutionSystem } from './systems/evolution';
import { movementSystem } from './systems/movement';
import { spawnerSystem } from './systems/spawner';
import type { Creature, RoundStats } from './types';
import { World } from './world';

export type GamePhase = 'menu' | 'playing' | 'dead';

/**
 * Orchestrates the simulation for one session: owns the World, runs systems in a fixed order,
 * tracks the player's round, and exposes the small API the UI and renderer need.
 * No DOM access here so the whole thing is testable headlessly.
 */
export class Game {
  readonly world: World;
  phase: GamePhase = 'menu';
  playerName = 'you';
  private revengeKills = 0;
  private lastRound: RoundStats | null = null;

  constructor(seed?: number) {
    this.world = new World(seed);
    // Pre-populate so the arena is alive before the player joins.
    spawnerSystem(this.world);
    for (let i = 0; i < 60 * 6; i++) this.stepWorld(1 / 60);

    this.world.events.on('creatureEaten', ({ eater, prey, revenge }) => {
      if (eater.kind === 'player' && revenge) this.revengeKills++;
      if (prey.kind === 'player') this.onPlayerDied(eater);
    });
  }

  get player(): Creature | null {
    return this.world.player;
  }

  get lastRoundStats(): RoundStats | null {
    return this.lastRound;
  }

  startRound(): Creature {
    const existing = this.world.player;
    const lastKiller = existing?.lastKillerId ?? null;
    if (existing) this.world.removeCreature(existing.id);

    const spawn = this.safeSpawnPoint();
    const player = this.world.spawnCreature(
      'player',
      this.playerName,
      CONFIG.player.startMass,
      spawn,
    );
    player.hue = 165;
    if (lastKiller !== null && this.world.creatures.get(lastKiller)?.alive) {
      player.lastKillerId = lastKiller;
      player.revengeUntil = this.world.time + CONFIG.revenge.windowSec;
    }
    this.world.playerId = player.id;
    this.world.paused = false;
    this.revengeKills = 0;
    this.phase = 'playing';
    return player;
  }

  /** Steer the player toward a world-space point. Called every frame by the input layer. */
  aimAt(worldPoint: Vec2): void {
    const p = this.world.player;
    if (!p || !p.alive || this.world.paused) return;
    const dir = normalize(sub(worldPoint, p.pos));
    // Dead zone near the creature's centre so the player can "idle" by hovering on itself.
    const dead = this.world.radiusFor(p.mass) * 0.35;
    const d = Math.hypot(worldPoint.x - p.pos.x, worldPoint.y - p.pos.y);
    if (d < dead) return;
    p.heading.x = dir.x;
    p.heading.y = dir.y;
  }

  chooseBranch(branch: BranchId): void {
    const p = this.world.player;
    if (!p || !this.world.paused) return;
    applyBranch(this.world, p, branch);
    this.world.paused = false;
  }

  update(dt: number): void {
    if (this.phase === 'menu') {
      this.stepWorld(dt);
      return;
    }
    this.stepWorld(dt);
    evolutionSystem(this.world);
  }

  /** Revenge target if still alive and inside the window. */
  revengeTarget(): Creature | null {
    const p = this.world.player;
    if (!p) return null;
    if (p.lastKillerId === null || this.world.time > p.revengeUntil) return null;
    const k = this.world.creatures.get(p.lastKillerId);
    if (!k?.alive) return null;
    return k;
  }

  private stepWorld(dt: number): void {
    this.world.time += dt;
    botSystem(this.world, dt);
    movementSystem(this.world, dt);
    eatingSystem(this.world, dt);
    decaySystem(this.world, dt);
    spawnerSystem(this.world);
    evolutionSystem(this.world);
  }

  private onPlayerDied(killer: Creature): void {
    const p = this.world.player;
    if (!p) return;
    this.lastRound = this.world.roundStatsFor(p, this.revengeKills);
    this.phase = 'dead';
    this.world.paused = false;
    this.world.events.emit('playerDied', { killer, stats: this.lastRound });
  }

  /** Find a spawn point with no creature that could eat a fresh hatchling nearby. */
  private safeSpawnPoint(): Vec2 {
    const minDist = 420;
    for (let attempt = 0; attempt < 20; attempt++) {
      const pt = this.world.randomPointInArena(300);
      let safe = true;
      for (const c of this.world.creatures.values()) {
        if (!c.alive || c.mass < CONFIG.player.startMass * 1.1) continue;
        if (Math.hypot(c.pos.x - pt.x, c.pos.y - pt.y) < minDist) {
          safe = false;
          break;
        }
      }
      if (safe) return pt;
    }
    return this.world.randomPointInArena(300);
  }

  /** Form key for the round, or null if the player did not complete all tiers. */
  static completedFormKey(stats: RoundStats): number | null {
    return stats.path.length === TIER_COUNT ? formKey(stats.path) : null;
  }
}
