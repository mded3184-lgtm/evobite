import { CONFIG } from '@/config';
import type { BranchId } from '@/game/evolution/tree';
import { BRANCHES, formName, TIER_COUNT } from '@/game/evolution/tree';
import type { MessageKey, Params } from './index';
import { pct, t } from './index';
import { en } from './locales/en';

/**
 * Localized perk text. Numbers are read from the live perk data, so translations never
 * have to be edited when the balance changes.
 */
function params(id: BranchId): Params {
  const p = BRANCHES[id].patch;
  return {
    speed: pct(Math.abs(p.speedMult ?? 0)),
    food: pct(p.foodMult ?? 0),
    absorb: pct(p.absorbMult ?? 0),
    rate: pct(p.venomDps ?? 0),
    resist: pct(p.venomResist ?? 0),
    ratio: pct((p.eatRatio ?? p.beEatenRatio ?? 1) - 1),
    decay: pct(1 - (p.decayMult ?? 1)),
  };
}

const TAGS: Readonly<Record<BranchId, readonly MessageKey[]>> = {
  swift: ['tag.speed'],
  bulk: ['tag.food', 'tag.absorb'],
  venom: ['tag.drain'],
  armor: ['tag.hardToEat', 'tag.venomResist'],
  hunter: ['tag.easierKills', 'tag.absorb', 'tag.speed'],
  grazer: ['tag.magnet'],
  apex: ['tag.easierKills', 'tag.absorb'],
  titan: ['tag.slowDecay', 'tag.hardToEat', 'tag.slower'],
};

export const branchName = (id: BranchId): string => t(`branch.${id}`);
export const branchBlurb = (id: BranchId): string => t(`blurb.${id}`, params(id));
export const branchShort = (id: BranchId): string => t(`short.${id}`, params(id));
export const branchTags = (id: BranchId): string[] => TAGS[id].map((key) => t(key));

/** Complete forms keep their English creature names; partial builds show the latest perk. */
export function localFormName(path: readonly BranchId[]): string {
  if (path.length === 0) return t('form.hatchling');
  if (path.length === TIER_COUNT) return formName(path);
  const last = path[path.length - 1];
  return last ? branchName(last) : t('form.hatchling');
}

function isKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(en, key);
}

export const skinName = (id: string): string => {
  const key = `skin.${id}`;
  return isKey(key) ? t(key) : id;
};

export const baseRules = (): { ratio: string; absorb: string; decayMass: number } => ({
  ratio: pct(CONFIG.creature.eatRatio - 1),
  absorb: pct(CONFIG.creature.absorbFraction),
  decayMass: CONFIG.creature.decayStartMass,
});
