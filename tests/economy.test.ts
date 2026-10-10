import { describe, expect, it } from 'vitest';
import { coinsForRound, DEFAULT_PROGRESS, mergeProgress, recordRound } from '@/game/economy';
import type { RoundStats } from '@/game/types';

const stats: RoundStats = {
  maxMass: 250,
  kills: 3,
  revengeKills: 1,
  survivedSec: 120,
  finalTier: 4,
  path: ['swift', 'venom', 'hunter', 'apex'],
};

describe('economy', () => {
  it('computes coins from mass, kills and revenge', () => {
    expect(coinsForRound(stats)).toBe(Math.floor(250 * 0.1 + 3 * 5 + 15));
  });

  it('records a round into progress immutably', () => {
    const before = mergeProgress(null);
    const after = recordRound(before, stats, 5);
    expect(before).toEqual(DEFAULT_PROGRESS);
    expect(after.rounds).toBe(1);
    expect(after.bestMass).toBe(250);
    expect(after.totalKills).toBe(3);
    expect(after.formsUnlocked).toEqual([5]);
    expect(recordRound(after, stats, 5).formsUnlocked).toEqual([5]);
  });

  it('merges corrupt or partial saved data safely', () => {
    expect(mergeProgress('garbage')).toEqual(DEFAULT_PROGRESS);
    expect(mergeProgress({ coins: -50, formsUnlocked: ['x', 3], ownedSkins: ['gold'] })).toEqual({
      ...DEFAULT_PROGRESS,
      coins: 0,
      formsUnlocked: [3],
      ownedSkins: ['classic', 'gold'],
    });
    expect(mergeProgress({ coins: Number.NaN }).coins).toBe(0);
  });
});
