import { CONFIG } from '@/config';
import type { BranchId } from './tree';
import { BRANCHES } from './tree';

/**
 * Derived gameplay multipliers. Every creature carries a Stats object computed from
 * its evolution path, so the simulation never has to look at the path directly.
 */
export interface Stats {
  /** Multiplies base speed. */
  speedMult: number;
  /** Multiplies mass gained from orbs. */
  foodMult: number;
  /** Ratio this creature needs over prey to eat it. Lower is deadlier. */
  eatRatio: number;
  /** Ratio an attacker needs over this creature. Higher is safer. */
  beEatenRatio: number;
  /** Fraction of a touching creature's mass drained per second. 0 = no venom. */
  venomDps: number;
  /** Fraction of incoming venom ignored, 0..1. */
  venomResist: number;
  /** Orbs inside this radius (world units) are pulled toward the creature. */
  magnetRadius: number;
  /** Multiplies sensing range (bot vision, player prey highlight). */
  senseMult: number;
  /** Multiplies passive mass decay. 0 disables decay. */
  decayMult: number;
  /** Multiplies the mass absorbed from eaten creatures. */
  absorbMult: number;
}

export const BASE_STATS: Readonly<Stats> = Object.freeze({
  speedMult: 1,
  foodMult: 1,
  eatRatio: CONFIG.creature.eatRatio,
  beEatenRatio: 1,
  venomDps: 0,
  venomResist: 0,
  magnetRadius: 0,
  senseMult: 1,
  decayMult: 1,
  absorbMult: 1,
});

export type StatPatch = Partial<Stats>;

/** Additive for most fields; eatRatio/beEatenRatio are replaced by the min/max respectively. */
export function applyPatch(base: Stats, patch: StatPatch): Stats {
  const out: Stats = { ...base };
  for (const key of Object.keys(patch) as (keyof Stats)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    switch (key) {
      case 'eatRatio':
        out.eatRatio = Math.min(out.eatRatio, value);
        break;
      case 'beEatenRatio':
        out.beEatenRatio = Math.max(out.beEatenRatio, value);
        break;
      case 'decayMult':
        out.decayMult = Math.min(out.decayMult, value);
        break;
      case 'venomResist':
        out.venomResist = Math.max(out.venomResist, value);
        break;
      case 'magnetRadius':
        out.magnetRadius = Math.max(out.magnetRadius, value);
        break;
      default:
        out[key] = out[key] + value;
    }
  }
  return out;
}

export function statsForPath(path: readonly BranchId[]): Stats {
  let stats: Stats = { ...BASE_STATS };
  for (const id of path) {
    stats = applyPatch(stats, BRANCHES[id].patch);
  }
  // Guard rails so a stacked build can never become degenerate.
  stats.speedMult = Math.max(0.5, stats.speedMult);
  stats.eatRatio = Math.max(1.02, stats.eatRatio);
  return stats;
}
