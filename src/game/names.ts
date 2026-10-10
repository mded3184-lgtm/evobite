import type { Rng } from '@/core/rng';

/**
 * Bot nicknames. Deliberately look like real player handles: a mix of plain words,
 * leetspeak, numbers and the occasional all-caps rage name.
 */
const WORDS = [
  'nova',
  'pixel',
  'ghost',
  'blaze',
  'frost',
  'viper',
  'echo',
  'storm',
  'luna',
  'rex',
  'zed',
  'kiwi',
  'mango',
  'orbit',
  'drift',
  'sly',
  'bolt',
  'neon',
  'quark',
  'otter',
  'wolf',
  'fang',
  'ash',
  'onyx',
  'jinx',
  'vex',
  'nyx',
  'kai',
  'milo',
  'remy',
];

const PREFIX = ['xx', 'the', 'mr', 'lil', 'big', 'dr', 'its', 'im'];
const SUFFIX = ['xx', 'yt', 'ttv', 'pro', 'gg', '_', '.', 'io'];

export function randomName(rng: Rng): string {
  const word = rng.pick(WORDS);
  const roll = rng.next();
  if (roll < 0.3) return `${word}${String(rng.int(2, 999))}`;
  if (roll < 0.45) return `${rng.pick(PREFIX)}${word}`;
  if (roll < 0.6) return `${word}${rng.pick(SUFFIX)}`;
  if (roll < 0.7) return word.toUpperCase();
  if (roll < 0.8) return `${word}_${rng.pick(WORDS)}`;
  if (roll < 0.88) return word.replace(/a/g, '4').replace(/e/g, '3');
  return word.charAt(0).toUpperCase() + word.slice(1);
}
