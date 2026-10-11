import { CONFIG } from '@/config';
import type { BranchId } from '@/game/evolution/tree';
import { TIER_COUNT } from '@/game/evolution/tree';
import { branchName, branchShort } from '@/i18n/gameText';
import { t } from '@/i18n';

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
        `<div class="chip chip-${id}"><b>${branchName(id)}</b><span>${branchShort(id)}</span></div>`,
      );
    } else if (tier === choosingTier) {
      chips.push(`<div class="chip chip-now"><b>?</b><span>${t('chip.choosing')}</span></div>`);
    } else {
      const at = CONFIG.evolution.thresholds[tier] ?? 0;
      chips.push(
        `<div class="chip chip-locked"><b>?</b><span>${t('chip.at', { mass: at })}</span></div>`,
      );
    }
  }
  return chips.join('');
}
