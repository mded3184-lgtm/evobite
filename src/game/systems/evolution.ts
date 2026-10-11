import { CONFIG } from '@/config';
import type { BranchId } from '../evolution/tree';
import { optionsForTier, TIER_COUNT } from '../evolution/tree';
import { statsForPath } from '../evolution/stats';
import type { Creature } from '../types';
import type { World } from '../world';

export function nextThreshold(c: Creature): number | null {
  return CONFIG.evolution.thresholds[c.path.length] ?? null;
}

export function canEvolve(c: Creature): boolean {
  const threshold = nextThreshold(c);
  return threshold !== null && c.mass >= threshold;
}

export function applyBranch(world: World, c: Creature, branch: BranchId): void {
  const tier = c.path.length;
  if (tier >= TIER_COUNT) throw new Error('Creature is already fully evolved');
  const options = optionsForTier(tier);
  if (!options.includes(branch)) {
    throw new Error(`Branch ${branch} is not valid for tier ${String(tier)}`);
  }
  c.path.push(branch);
  c.stats = statsForPath(c.path);
  world.events.emit('evolved', { creature: c, branch });
}

/**
 * Bots pick a branch instantly, with a bias that depends on personality so the arena
 * ends up with a believable mix of builds. The player gets an offer event; the UI pauses
 * the player and calls applyBranch once they choose.
 */
export function evolutionSystem(world: World): void {
  for (const c of world.creatures.values()) {
    if (!c.alive || !canEvolve(c)) continue;
    if (c.kind === 'player') {
      if (!world.paused) {
        world.paused = true;
        world.events.emit('evolutionOffer', { creature: c, tier: c.path.length });
      }
      continue;
    }
    const [first, second] = optionsForTier(c.path.length);
    const brain = c.bot;
    if (brain?.buildPlan != null) {
      applyBranch(world, c, brain.buildPlan & (1 << c.path.length) ? second : first);
      continue;
    }
    // Aggressive bots lean toward the offensive side of each tier (always the first option).
    const offensiveBias = brain ? 0.35 + brain.aggression * 0.4 : 0.5;
    applyBranch(world, c, world.rng.chance(offensiveBias) ? first : second);
  }
}
