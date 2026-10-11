/**
 * Headless balance simulator.
 *
 * Fills the arena with bots locked to each of the 16 builds (evenly), runs several seeds for
 * a few simulated minutes each, and reports how every build and every individual perk performs:
 * average mass while alive, kills and deaths per minute. A perk is balanced when its average is
 * close to its pair's (e.g. Swift vs Bulk).
 *
 *   npm run balance            # default: 6 seeds x 6 minutes
 *   npm run balance -- 10 8    # 10 seeds x 8 minutes
 */
import { CONFIG } from '@/config';
import { statsForPath as statsFor } from '@/game/evolution/stats';
import { BRANCHES, formName, TIERS } from '@/game/evolution/tree';
import type { BranchId } from '@/game/evolution/tree';
import { Game } from '@/game/game';
import type { Creature } from '@/game/types';

const seeds = Number(process.argv[2] ?? 6);
const minutes = Number(process.argv[3] ?? 6);
const DT = 1 / 60;
const PLANS = 1 << TIERS.length;

interface Acc {
  massTime: number;
  aliveTime: number;
  kills: number;
  deaths: number;
  /** Time spent alive with the full 4-tier build. */
  fullTime: number;
  fullMassTime: number;
}
const acc = (): Acc => ({
  massTime: 0,
  aliveTime: 0,
  kills: 0,
  deaths: 0,
  fullTime: 0,
  fullMassTime: 0,
});
const byPlan: Acc[] = Array.from({ length: PLANS }, acc);
const accFor = (plan: number): Acc => {
  const a = byPlan[plan];
  if (!a) throw new RangeError(`No build plan ${String(plan)}`);
  return a;
};

function pathForPlan(plan: number): BranchId[] {
  return TIERS.map((pair, tier) => (plan & (1 << tier) ? pair[1] : pair[0]));
}

for (let seed = 1; seed <= seeds; seed++) {
  const game = new Game(seed * 7919);
  const world = game.world;
  const planOf = new Map<number, number>();
  const population = new Array<number>(PLANS).fill(0);

  const assign = (c: Creature): void => {
    if (!c.bot || planOf.has(c.id)) return;
    let plan = 0;
    for (let p = 1; p < PLANS; p++) if ((population[p] ?? 0) < (population[plan] ?? 0)) plan = p;
    c.bot.buildPlan = plan;
    planOf.set(c.id, plan);
    population[plan] = (population[plan] ?? 0) + 1;
    // Re-derive any branches the bot already took (elites evolve on spawn) to match the plan.
    const want = pathForPlan(plan).slice(0, c.path.length);
    if (want.join() !== c.path.join()) {
      c.path.length = 0;
      for (const id of want) c.path.push(id);
      c.stats = statsFor(c.path);
    }
  };

  world.events.on('creatureEaten', ({ eater, prey }) => {
    const ep = planOf.get(eater.id);
    const pp = planOf.get(prey.id);
    if (ep !== undefined) accFor(ep).kills++;
    if (pp !== undefined) {
      accFor(pp).deaths++;
      population[pp] = (population[pp] ?? 1) - 1;
      planOf.delete(prey.id);
    }
  });

  for (const c of world.creatures.values()) assign(c);
  const steps = Math.round((minutes * 60) / DT);
  for (let i = 0; i < steps; i++) {
    game.update(DT);
    for (const c of world.creatures.values()) {
      if (!c.alive || !c.bot) continue;
      if (!planOf.has(c.id)) assign(c);
      const a = accFor(planOf.get(c.id) ?? 0);
      a.massTime += c.mass * DT;
      a.aliveTime += DT;
      if (c.path.length === TIERS.length) {
        a.fullTime += DT;
        a.fullMassTime += c.mass * DT;
      }
    }
  }
}

// ---- report ---------------------------------------------------------------
const perMin = (n: number, a: Acc): number => (n / Math.max(1e-9, a.aliveTime)) * 60;
const fmt = (n: number, d = 1): string => n.toFixed(d).padStart(7);

const rows = byPlan.map((a, plan) => ({
  plan,
  name: formName(pathForPlan(plan)),
  avgMass: a.massTime / Math.max(1e-9, a.aliveTime),
  fullMass: a.fullMassTime / Math.max(1e-9, a.fullTime),
  kpm: perMin(a.kills, a),
  dpm: perMin(a.deaths, a),
}));

console.log(
  `\nBalance: ${String(seeds)} seeds x ${String(minutes)} min, ${String(CONFIG.bots.count)} bots\n`,
);
console.log('Build'.padEnd(18) + '  avgMass  fullMass  kills/m  deaths/m');
for (const r of [...rows].sort((a, b) => b.avgMass - a.avgMass)) {
  console.log(
    r.name.padEnd(18) +
      fmt(r.avgMass) +
      '  ' +
      fmt(r.fullMass) +
      fmt(r.kpm, 2) +
      '  ' +
      fmt(r.dpm, 2),
  );
}

console.log('\nPerk pairs (mean over builds containing the perk):');
console.log('Perk'.padEnd(10) + ' avgMass  kills/m  deaths/m   vs pair');
TIERS.forEach((pair, tier) => {
  const stat = (bit: 0 | 1): { mass: number; k: number; d: number } => {
    const sel = rows.filter((r) => ((r.plan >> tier) & 1) === bit);
    const m = (f: (r: (typeof rows)[number]) => number): number =>
      sel.reduce((s, r) => s + f(r), 0) / sel.length;
    return { mass: m((r) => r.avgMass), k: m((r) => r.kpm), d: m((r) => r.dpm) };
  };
  const a = stat(0);
  const b = stat(1);
  const pct = (x: number, y: number): string =>
    `${x >= y ? '+' : ''}${(((x - y) / y) * 100).toFixed(0)}%`;
  console.log(
    BRANCHES[pair[0]].name.padEnd(10) +
      fmt(a.mass) +
      fmt(a.k, 2) +
      '  ' +
      fmt(a.d, 2) +
      '   ' +
      pct(a.mass, b.mass).padStart(5),
  );
  console.log(
    BRANCHES[pair[1]].name.padEnd(10) +
      fmt(b.mass) +
      fmt(b.k, 2) +
      '  ' +
      fmt(b.d, 2) +
      '   ' +
      pct(b.mass, a.mass).padStart(5),
  );
});
