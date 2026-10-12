import { CONFIG } from '@/config';
import { normalize, sub } from '@/core/vec';
import type { Vec2 } from '@/core/vec';
import type { BranchId } from './evolution/tree';
import { formKey, TIER_COUNT } from './evolution/tree';
import { boostSystem } from './systems/boost';
import { DEFAULT_SKIN_ID, getSkin } from './skins';
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
  playerSkin: string = DEFAULT_SKIN_ID;
  private revengeKills = 0;
  private userPaused = false;
  private lastRound: RoundStats | null = null;
  /** Seconds the simulation still stays frozen after an impact (hit-stop). */
  private hitStop = 0;

  constructor(seed?: number) {
    this.world = new World(seed);
    // Pre-populate so the arena is alive before the player joins.
    spawnerSystem(this.world);
    for (let i = 0; i < 60 * 6; i++) this.stepWorld(1 / 60);

    this.world.events.on('creatureEaten', ({ eater, prey, revenge }) => {
      if (eater.kind === 'player' && revenge) this.revengeKills++;
      if (eater.kind === 'player') this.hitStop = CONFIG.feel.hitStopSec;
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
    const skin = getSkin(this.playerSkin) ?? getSkin(DEFAULT_SKIN_ID);
    player.skin = skin?.id ?? null;
    player.hue = skin?.hue ?? 165;
    // Spawn shield: long enough to find your bearings and eat the welcome orbs.
    player.invulnUntil = this.world.time + CONFIG.player.graceSec;
    this.spawnWelcomeOrbs(spawn);
    if (lastKiller !== null && this.world.creatures.get(lastKiller)?.alive) {
      player.lastKillerId = lastKiller;
      player.revengeUntil = this.world.time + CONFIG.revenge.windowSec;
    }
    this.world.playerId = player.id;
    this.world.paused = false;
    this.userPaused = false;
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

  /** Steer the player in a screen-independent direction (unit vector), e.g. from a joystick. */
  steer(dir: Vec2): void {
    const p = this.world.player;
    if (!p || !p.alive || this.world.paused) return;
    const len = Math.hypot(dir.x, dir.y);
    if (len === 0) return;
    p.heading.x = dir.x / len;
    p.heading.y = dir.y / len;
  }

  chooseBranch(branch: BranchId): void {
    const p = this.world.player;
    if (!p || !this.world.paused) return;
    applyBranch(this.world, p, branch);
    this.world.paused = false;
  }

  update(dt: number): void {
    // Single-player arena: while the player is choosing an evolution or has paused,
    // the whole world freezes, so nobody can sneak up and eat them.
    if (this.isChoosing || this.isPaused) return;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    this.stepWorld(dt);
  }

  /** Seconds of spawn shield the player has left, 0 when none. */
  get shieldLeft(): number {
    const p = this.world.player;
    if (!p?.alive) return 0;
    return Math.max(0, p.invulnUntil - this.world.time);
  }

  /** Player-requested pause. Only meaningful during a live round. */
  get isPaused(): boolean {
    return this.userPaused && this.phase === 'playing';
  }

  /** Returns the new paused state. Ignored outside a live round. */
  setPaused(paused: boolean): boolean {
    this.userPaused = paused && this.phase === 'playing';
    if (this.userPaused) this.setBoost(false);
    return this.userPaused;
  }

  setBoost(on: boolean): void {
    const p = this.world.player;
    if (p) p.boosting = on && p.alive && !this.isChoosing && !this.userPaused;
  }

  /** True when the player is boosting and actually burning mass. */
  get playerBoosting(): boolean {
    const p = this.world.player;
    return p !== null && p.alive && this.world.isBoosting(p);
  }

  /** True while the player has an evolution offer open and the world is frozen. */
  get isChoosing(): boolean {
    return this.phase === 'playing' && this.world.paused;
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
    boostSystem(this.world, dt);
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
    this.hitStop = CONFIG.feel.deathStopSec;
    this.world.events.emit('playerDied', { killer, stats: this.lastRound });
  }

  /** A ring of orbs around the spawn so a hatchling grows from second one. */
  private spawnWelcomeOrbs(at: Vec2): void {
    const { welcomeOrbs, welcomeRadius } = CONFIG.player;
    const rng = this.world.rng;
    for (let i = 0; i < welcomeOrbs; i++) {
      const a = (i / welcomeOrbs) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const d = welcomeRadius * (0.35 + 0.65 * Math.sqrt(rng.next()));
      this.world.spawnOrb({ x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d });
    }
  }

  /**
   * Find a spawn point with nothing that could eat a fresh hatchling nearby, and no giant
   * within a wider radius: the first seconds should be about eating, not fleeing.
   */
  private safeSpawnPoint(): Vec2 {
    const nearDist = 650;
    const giantDist = 1100;
    const giantMass = 100;
    let best: Vec2 | null = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 24; attempt++) {
      const pt = this.world.randomPointInArena(400);
      let score = Infinity;
      for (const c of this.world.creatures.values()) {
        if (!c.alive || c.mass < CONFIG.player.startMass * 1.1) continue;
        const d = Math.hypot(c.pos.x - pt.x, c.pos.y - pt.y);
        const limit = c.mass >= giantMass ? giantDist : nearDist;
        score = Math.min(score, d - limit);
      }
      if (score >= 0) return pt;
      if (score > bestScore) {
        bestScore = score;
        best = pt;
      }
    }
    return best ?? this.world.randomPointInArena(400);
  }

  /** Form key for the round, or null if the player did not complete all tiers. */
  static completedFormKey(stats: RoundStats): number | null {
    return stats.path.length === TIER_COUNT ? formKey(stats.path) : null;
  }
}
