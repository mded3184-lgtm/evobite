import type { Vec2 } from '@/core/vec';
import type { BranchId } from './evolution/tree';
import type { Stats } from './evolution/stats';

export type CreatureKind = 'player' | 'bot';

export type BotState = 'wander' | 'hunt' | 'flee' | 'graze';

export interface BotBrain {
  state: BotState;
  targetId: number | null;
  /** Wander heading in radians; drifts slowly so bots don't jitter. */
  wanderAngle: number;
  thinkTimer: number;
  /** Personality knobs so bots don't all behave identically. */
  aggression: number;
  caution: number;
  /**
   * Optional fixed build as a 4-bit form key (bit i set = second option at tier i).
   * Used by the balance simulator; normal bots leave it null and pick by personality.
   */
  buildPlan: number | null;
}

export interface Creature {
  id: number;
  kind: CreatureKind;
  name: string;
  pos: Vec2;
  /** Unit direction the creature is currently moving. */
  dir: Vec2;
  /** Unit direction the creature wants to move. Movement eases dir toward this. */
  heading: Vec2;
  mass: number;
  maxMass: number;
  /** Chosen branches, tier 0 first. Length 0..4. */
  path: BranchId[];
  stats: Stats;
  hue: number;
  /** Cosmetic skin id, or null for the plain hue-based look. */
  skin: string | null;
  alive: boolean;
  kills: number;
  spawnedAt: number;
  invulnUntil: number;
  lastKillerId: number | null;
  revengeUntil: number;
  /** Wants to boost this tick (player input or bot decision). */
  boosting: boolean;
  /** Burned mass waiting to be dropped as an orb. */
  boostDropAcc: number;
  /** World time of the last bite, for the chomp animation. */
  lastAteAt: number;
  bot: BotBrain | null;
}

export interface Orb {
  id: number;
  pos: Vec2;
  mass: number;
  radius: number;
  hue: number;
  alive: boolean;
  /** World time it appeared, for the pop-in animation. */
  bornAt: number;
  /** World time it fades out and respawns elsewhere, so uneaten food never piles up. */
  expiresAt: number;
}

export interface RoundStats {
  maxMass: number;
  kills: number;
  revengeKills: number;
  survivedSec: number;
  finalTier: number;
  path: BranchId[];
}
