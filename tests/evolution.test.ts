import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  formKey,
  formName,
  isValidPath,
  optionsForTier,
  TIER_COUNT,
  TIERS,
} from '@/game/evolution/tree';
import type { BranchId } from '@/game/evolution/tree';
import { BASE_STATS, statsForPath } from '@/game/evolution/stats';

function allPaths(): BranchId[][] {
  const out: BranchId[][] = [];
  for (let key = 0; key < 1 << TIER_COUNT; key++) {
    out.push(TIERS.map((pair, tier) => (key & (1 << tier) ? pair[1] : pair[0])));
  }
  return out;
}

describe('evolution tree', () => {
  it('has four tiers of two distinct branches each, with matching tier numbers', () => {
    expect(TIER_COUNT).toBe(4);
    TIERS.forEach(([a, b], tier) => {
      expect(a).not.toBe(b);
      expect(BRANCHES[a].tier).toBe(tier);
      expect(BRANCHES[b].tier).toBe(tier);
    });
  });

  it('gives every one of the 16 complete forms a unique name and key', () => {
    const names = new Set<string>();
    const keys = new Set<number>();
    for (const path of allPaths()) {
      expect(isValidPath(path)).toBe(true);
      names.add(formName(path));
      keys.add(formKey(path));
    }
    expect(names.size).toBe(16);
    expect(keys.size).toBe(16);
  });

  it('names each complete form after its actual branches', () => {
    expect(formName(['swift', 'venom', 'hunter', 'apex'])).toBe('Dart Viper');
    expect(formName(['swift', 'venom', 'hunter', 'titan'])).toBe('Dart Leviathan');
    expect(formName(['swift', 'armor', 'hunter', 'apex'])).toBe('Bolt Shrike');
    expect(formName(['bulk', 'venom', 'hunter', 'apex'])).toBe('Brute Viper');
    expect(formName(['bulk', 'armor', 'grazer', 'titan'])).toBe('Iron Colossus');
  });

  it('names incomplete paths after the hatchling or the latest branch', () => {
    expect(formName([])).toBe('Hatchling');
    expect(formName(['swift'])).toBe('Swift');
    expect(formName(['bulk', 'venom'])).toBe('Venom');
  });

  it('rejects out-of-order or over-long paths', () => {
    expect(isValidPath(['venom'])).toBe(false);
    expect(isValidPath(['swift', 'swift'])).toBe(false);
    expect(isValidPath(['swift', 'venom', 'hunter', 'apex', 'apex'])).toBe(false);
    expect(() => optionsForTier(4)).toThrow(RangeError);
  });
});

describe('derived stats', () => {
  it('starts from base stats for an empty path', () => {
    expect(statsForPath([])).toEqual(BASE_STATS);
  });

  it('stacks additive multipliers and keeps the strongest ratio perks', () => {
    const s = statsForPath(['swift', 'armor', 'hunter', 'apex']);
    expect(s.speedMult).toBeCloseTo(1.3);
    expect(s.eatRatio).toBe(1.05); // apex beats hunter's 1.12 and base 1.18
    expect(s.beEatenRatio).toBe(1.5);
    expect(s.venomResist).toBe(0.7);
  });

  it('never lets a build become degenerate', () => {
    for (const path of allPaths()) {
      const s = statsForPath(path);
      expect(s.speedMult).toBeGreaterThanOrEqual(0.5);
      expect(s.eatRatio).toBeGreaterThanOrEqual(1.02);
      expect(s.decayMult).toBeGreaterThanOrEqual(0);
    }
  });

  it('titan slows decay without touching others', () => {
    expect(statsForPath(['bulk', 'venom', 'grazer', 'titan']).decayMult).toBe(0.5);
    expect(statsForPath(['bulk', 'venom', 'grazer', 'apex']).decayMult).toBe(1);
  });
});
