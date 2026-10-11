import type { StatPatch } from './stats';

/**
 * Evolution tree: 4 tiers, each a binary choice. 2^4 = 16 final forms.
 * Branch ids are stable strings so saved progress survives renames.
 */
export type BranchId =
  'swift' | 'bulk' | 'venom' | 'armor' | 'hunter' | 'grazer' | 'apex' | 'titan';

export interface Branch {
  id: BranchId;
  tier: 0 | 1 | 2 | 3;
  name: string;
  /** One line shown on the choice card. Must be understandable in a 2-second glance. */
  blurb: string;
  /** Short gameplay tags for the card footer. */
  tags: readonly string[];
  patch: StatPatch;
}

export const BRANCHES: Readonly<Record<BranchId, Branch>> = {
  swift: {
    id: 'swift',
    tier: 0,
    name: 'Swift',
    blurb: 'Move 22% faster. Catch prey, escape anything.',
    tags: ['+speed'],
    patch: { speedMult: 0.22 },
  },
  bulk: {
    id: 'bulk',
    tier: 0,
    name: 'Bulk',
    blurb: 'Orbs give 35% more mass. Grow fat, grow fast.',
    tags: ['+food', '-speed'],
    patch: { foodMult: 0.35, speedMult: -0.08, absorbMult: 0.1 },
  },
  venom: {
    id: 'venom',
    tier: 1,
    name: 'Venom',
    blurb: 'Creatures touching you slowly lose mass. You gain half of it.',
    tags: ['drain on touch'],
    patch: { venomDps: 0.04 },
  },
  armor: {
    id: 'armor',
    tier: 1,
    name: 'Armor',
    blurb: 'Enemies need to be 45% bigger to eat you. Shrugs off venom.',
    tags: ['hard to eat', 'venom resist'],
    patch: { beEatenRatio: 1.45, venomResist: 0.7 },
  },
  hunter: {
    id: 'hunter',
    tier: 2,
    name: 'Hunter',
    blurb: 'See prey from afar and need less size advantage to eat.',
    tags: ['+vision', 'easier kills'],
    patch: { senseMult: 0.6, eatRatio: 1.12, speedMult: 0.08 },
  },
  grazer: {
    id: 'grazer',
    tier: 2,
    name: 'Grazer',
    blurb: 'Pull orbs toward you from a distance. Never stop growing.',
    tags: ['orb magnet', '+food'],
    patch: { magnetRadius: 150, foodMult: 0.25 },
  },
  apex: {
    id: 'apex',
    tier: 3,
    name: 'Apex',
    blurb: 'Eat anything even slightly smaller than you. Absorb more of it.',
    tags: ['eat at 5%', '+absorb'],
    patch: { eatRatio: 1.05, absorbMult: 0.15 },
  },
  titan: {
    id: 'titan',
    tier: 3,
    name: 'Titan',
    blurb: 'Never lose mass to decay. Very hard to bring down.',
    tags: ['no decay', 'harder to eat'],
    patch: { decayMult: 0, beEatenRatio: 1.6, speedMult: -0.05 },
  },
};

export const TIERS: readonly (readonly [BranchId, BranchId])[] = [
  ['swift', 'bulk'],
  ['venom', 'armor'],
  ['hunter', 'grazer'],
  ['apex', 'titan'],
];

export const TIER_COUNT = TIERS.length;

export function optionsForTier(tier: number): readonly [BranchId, BranchId] {
  const options = TIERS[tier];
  if (!options) throw new RangeError(`No evolution tier ${String(tier)}`);
  return options;
}

export function isValidPath(path: readonly BranchId[]): boolean {
  if (path.length > TIER_COUNT) return false;
  return path.every((id, tier) => {
    return TIERS[tier]?.includes(id) ?? false;
  });
}

/**
 * Names for the 16 complete forms. Indexed by a 4-bit key where bit i is 1 when the
 * second option was chosen at tier i. Incomplete paths fall back to the last branch name.
 */
const FORM_NAMES: readonly string[] = [
  'Dart Viper', //      swift venom hunter apex
  'Dart Leviathan', //  swift venom hunter titan
  'Dart Wisp', //       swift venom grazer apex
  'Dart Behemoth', //   swift venom grazer titan
  'Bolt Shrike', //     swift armor hunter apex
  'Bolt Bastion', //    swift armor hunter titan
  'Bolt Sylph', //      swift armor grazer apex
  'Bolt Colossus', //   swift armor grazer titan
  'Brute Viper', //     bulk venom hunter apex
  'Brute Leviathan', // bulk venom hunter titan
  'Brute Wisp', //      bulk venom grazer apex
  'Brute Behemoth', //  bulk venom grazer titan
  'Iron Shrike', //     bulk armor hunter apex
  'Iron Bastion', //    bulk armor hunter titan
  'Iron Sylph', //      bulk armor grazer apex
  'Iron Colossus', //   bulk armor grazer titan
];

export function formKey(path: readonly BranchId[]): number {
  let key = 0;
  path.forEach((id, tier) => {
    if (TIERS[tier]?.[1] === id) key |= 1 << tier;
  });
  return key;
}

export function formName(path: readonly BranchId[]): string {
  if (path.length === 0) return 'Hatchling';
  if (path.length === TIER_COUNT) return FORM_NAMES[formKey(path)] ?? 'Unknown';
  const last = path[path.length - 1];
  return last ? BRANCHES[last].name : 'Hatchling';
}
