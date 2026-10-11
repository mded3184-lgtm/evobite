import { CONFIG } from '@/config';
import type { BranchId } from '@/game/evolution/tree';
import { BRANCHES, TIER_COUNT } from '@/game/evolution/tree';

/** Short, always-visible reminder of what each chosen branch does. */
export const BRANCH_SHORT: Readonly<Record<BranchId, string>> = {
  swift: '+22% speed',
  bulk: '+35% from orbs',
  venom: 'drains on touch',
  armor: 'hard to eat',
  hunter: 'eat at +12%',
  grazer: 'pulls orbs',
  apex: 'eat at +5%',
  titan: 'no decay',
};

/** HTML for the build strip: chosen branches as chips, future tiers as locked slots. */
export function buildChipsHtml(
  path: readonly BranchId[],
  choosingTier: number | null = null,
): string {
  const chips: string[] = [];
  for (let tier = 0; tier < TIER_COUNT; tier++) {
    const id = path[tier];
    if (id) {
      chips.push(
        `<div class="chip chip-${id}"><b>${BRANCHES[id].name}</b><span>${BRANCH_SHORT[id]}</span></div>`,
      );
    } else if (tier === choosingTier) {
      chips.push('<div class="chip chip-now"><b>?</b><span>choosing now</span></div>');
    } else {
      const at = CONFIG.evolution.thresholds[tier] ?? 0;
      chips.push(`<div class="chip chip-locked"><b>?</b><span>at ${String(at)}</span></div>`);
    }
  }
  return chips.join('');
}
