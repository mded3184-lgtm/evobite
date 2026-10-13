/**
 * Pacing check: a bot drives the player and we record how long it takes to reach each
 * evolution, how long rounds last, and how fast mass drains at the top.
 *
 *   npm run pacing [seeds] [minutes]
 */
import { CONFIG } from '@/config';
import { Game } from '@/game/game';
import type { BranchId } from '@/game/evolution/tree';
import { TIERS } from '@/game/evolution/tree';

const seeds = Number(process.argv[2] ?? 8);
const minutes = Number(process.argv[3] ?? 8);
/** "immortal": nothing can eat the player, so the numbers show pure growth pace. */
const immortal = process.argv[4] === 'immortal';
const DT = 1 / 60;

// Experiment overrides: PACING='{"orbs":{"count":1200}}' npm run pacing
const patch = process.env.PACING;
if (patch) {
  const merge = (target: Record<string, unknown>, src: Record<string, unknown>): void => {
    for (const [k, v] of Object.entries(src)) {
      const cur = target[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object') {
        merge(cur as Record<string, unknown>, v as Record<string, unknown>);
      } else {
        target[k] = v;
      }
    }
  };
  merge(CONFIG, JSON.parse(patch) as Record<string, unknown>);
}

const tierTimes: number[][] = TIERS.map(() => []);
const roundLengths: number[] = [];
const peakMasses: number[] = [];
let rounds = 0;

for (let seed = 1; seed <= seeds; seed++) {
  const game = new Game(seed * 7919);
  let roundStart = 0;
  let peak = 0;
  const begin = (): void => {
    const p = game.startRound();
    p.bot = {
      state: 'wander',
      targetId: null,
      wanderAngle: 0,
      thinkTimer: 0,
      aggression: 0.85,
      caution: 0.75,
      buildPlan: null,
    };
    roundStart = game.world.time;
    peak = p.mass;
    rounds++;
  };
  game.world.events.on('evolutionOffer', ({ creature, tier }) => {
    if (creature.kind !== 'player') return;
    tierTimes[tier]?.push(game.world.time - roundStart);
    const options = TIERS[tier] ?? ['swift', 'bulk'];
    const pick: BranchId = options[game.world.rng.int(0, 1)] ?? options[0];
    game.chooseBranch(pick);
  });
  begin();
  for (let i = 0; i < 60 * 60 * minutes; i++) {
    game.update(DT);
    const p = game.player;
    if (p?.alive) {
      peak = Math.max(peak, p.mass);
      if (immortal) p.stats.beEatenRatio = 1e9;
    }
    if (game.phase === 'dead') {
      roundLengths.push(game.world.time - roundStart);
      peakMasses.push(peak);
      begin();
    }
  }
}

const median = (xs: number[]): string => {
  if (xs.length === 0) return '   -';
  const s = [...xs].sort((a, b) => a - b);
  return (s[Math.floor(s.length / 2)] ?? 0).toFixed(0).padStart(4);
};
if (immortal) {
  // One endless round per seed: the round length is the whole run.
  // (Rounds that never ended still count for the tier times above.)
}
console.log(
  `${String(rounds)} rounds over ${String(seeds)} x ${String(minutes)} min${immortal ? ' (immortal)' : ''}`,
);
TIERS.forEach((_, i) => {
  const reached = tierTimes[i]?.length ?? 0;
  console.log(
    `evolution ${String(i + 1)} at ${String(CONFIG.evolution.thresholds[i])}: median ${median(tierTimes[i] ?? [])} s, reached in ${String(Math.round((reached / rounds) * 100))}% of rounds`,
  );
});
console.log(`round length: median ${median(roundLengths)} s`);
console.log(`peak mass: median ${median(peakMasses)}`);
for (const m of [100, 200, 300, 450, 600, 800]) {
  const { decayRate, decayStartMass, decaySoftCap } = CONFIG.creature;
  const decay =
    m <= decayStartMass ? 0 : (m - decayStartMass) * decayRate * (1 + (m / decaySoftCap) ** 2);
  const boost = Math.max(CONFIG.boost.minDrainPerSec, CONFIG.boost.drainRate * m);
  console.log(
    `mass ${String(m).padStart(3)}: decay ${decay.toFixed(1)}/s, boost ${boost.toFixed(1)}/s`,
  );
}
