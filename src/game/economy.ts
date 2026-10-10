import { CONFIG } from '@/config';
import type { RoundStats } from './types';

export function coinsForRound(stats: RoundStats): number {
  const { coinsPerMass, coinsPerKill, revengeBonusCoins } = CONFIG.economy;
  return Math.floor(
    stats.maxMass * coinsPerMass +
      stats.kills * coinsPerKill +
      stats.revengeKills * revengeBonusCoins,
  );
}

export interface Progress {
  coins: number;
  bestMass: number;
  totalKills: number;
  rounds: number;
  /** Final forms the player has reached at least once, by form key. */
  formsUnlocked: number[];
  selectedSkin: string;
  ownedSkins: string[];
}

export const DEFAULT_PROGRESS: Readonly<Progress> = Object.freeze({
  coins: 0,
  bestMass: 0,
  totalKills: 0,
  rounds: 0,
  formsUnlocked: [],
  selectedSkin: 'classic',
  ownedSkins: ['classic'],
});

export function mergeProgress(partial: unknown): Progress {
  const base: Progress = { ...DEFAULT_PROGRESS, formsUnlocked: [], ownedSkins: ['classic'] };
  if (typeof partial !== 'object' || partial === null) return base;
  const p = partial as Partial<Record<keyof Progress, unknown>>;
  if (typeof p.coins === 'number' && Number.isFinite(p.coins)) base.coins = Math.max(0, p.coins);
  if (typeof p.bestMass === 'number') base.bestMass = Math.max(0, p.bestMass);
  if (typeof p.totalKills === 'number') base.totalKills = Math.max(0, p.totalKills);
  if (typeof p.rounds === 'number') base.rounds = Math.max(0, p.rounds);
  if (Array.isArray(p.formsUnlocked)) {
    base.formsUnlocked = p.formsUnlocked.filter((n): n is number => typeof n === 'number');
  }
  if (typeof p.selectedSkin === 'string') base.selectedSkin = p.selectedSkin;
  if (Array.isArray(p.ownedSkins)) {
    const owned = p.ownedSkins.filter((s): s is string => typeof s === 'string');
    base.ownedSkins = owned.includes('classic') ? owned : ['classic', ...owned];
  }
  return base;
}

export function recordRound(
  progress: Progress,
  stats: RoundStats,
  formKey: number | null,
): Progress {
  const next: Progress = {
    ...progress,
    formsUnlocked: [...progress.formsUnlocked],
    ownedSkins: [...progress.ownedSkins],
  };
  next.coins += coinsForRound(stats);
  next.bestMass = Math.max(next.bestMass, stats.maxMass);
  next.totalKills += stats.kills;
  next.rounds += 1;
  if (formKey !== null && !next.formsUnlocked.includes(formKey)) next.formsUnlocked.push(formKey);
  return next;
}
