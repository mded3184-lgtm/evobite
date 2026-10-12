/**
 * Single source of truth for tunable gameplay numbers.
 * Everything a designer might want to tweak during balancing lives here.
 */
export const CONFIG = {
  arena: {
    /** Arena is a circle; radius in world units. */
    radius: 2600,
    /** Soft wall: creatures slide along the edge instead of stopping dead. */
    wallPush: 400,
  },
  player: {
    startMass: 12,
    /** Target FPS-independent turning smoothness (higher = snappier). */
    steerLambda: 9,
  },
  creature: {
    /** radius = radiusBase * sqrt(mass). */
    radiusBase: 6,
    /** speed = speedBase / mass^speedExp; big creatures are slower. */
    speedBase: 420,
    speedExp: 0.15,
    minSpeed: 95,
    /** Attacker must be this many times heavier than prey to eat it. */
    eatRatio: 1.18,
    /** Prey center must be inside attacker circle by this fraction of prey radius. */
    eatOverlap: 0.4,
    /** Mass retained from eaten creature (rest is "lost" to keep the curve sane). */
    absorbFraction: 0.8,
    /** Mass lost per second as a fraction, applied above decayStartMass. */
    decayRate: 0.01,
    decayStartMass: 300,
    /**
     * Decay speeds up with size: rate x (1 + (mass / decaySoftCap)^2). Barely noticeable at
     * normal sizes, very steep for giants, so nobody grows to fill the arena.
     */
    decaySoftCap: 1000,
  },
  orbs: {
    count: 1100,
    mass: 2,
    radius: 7,
    /** Big orbs: rarer, juicier, slightly off-center from spawn clusters. */
    bigChance: 0.08,
    bigMass: 7,
    bigRadius: 12,
  },
  bots: {
    count: 28,
    /** Bots sense in a radius scaled by their size so big bots hunt further. */
    visionBase: 420,
    /** How often bots re-evaluate their intent, seconds. */
    thinkInterval: 0.25,
    /** Starting mass range so the arena has a pecking order from second one. */
    spawnMassMin: 8,
    spawnMassMax: 60,
    /** Chance a respawning bot starts big-ish, so there is always something to fear. */
    eliteChance: 0.15,
    eliteMassMin: 120,
    eliteMassMax: 380,
    /** Bots start steering off the wall this far from it (plus 1.5x their radius). */
    wallMargin: 220,
    /** Share of bots wearing a shop skin. */
    skinChance: 0.25,
  },
  ads: {
    /** No midgame ad before this many seconds of real play in a session. */
    firstAdAfterSec: 180,
  },
  venom: {
    /** Share of drained mass the venomous creature keeps. */
    gainFraction: 0.5,
  },
  boost: {
    /** Speed multiplier while boosting. */
    speedMult: 1.65,
    /** Mass lost per second as a fraction of current mass... */
    drainRate: 0.03,
    /** ...but never less than this many mass points per second. */
    minDrainPerSec: 1.2,
    /** Boosting stops below this mass so a hatchling can't burn itself to nothing. */
    minMass: 16,
    /** Fraction of burned mass dropped behind as small orbs others can eat. */
    dropFraction: 0.5,
    dropOrbMass: 1.5,
    dropOrbRadius: 5,
    /** Bots only boost above this mass, so small bots don't waste themselves. */
    botMinMass: 30,
  },
  evolution: {
    /** Mass thresholds at which a branch choice is offered. */
    thresholds: [30, 80, 200, 480] as const,
  },
  revenge: {
    /** Bonus mass fraction when you eat the creature that last killed you. */
    bonusMass: 0.35,
    /** Window after respawn in which the killer stays marked, seconds. */
    windowSec: 45,
  },
  economy: {
    coinsPerMass: 0.1,
    coinsPerKill: 5,
    revengeBonusCoins: 15,
  },
  camera: {
    /** View height in world units at mass 1; grows with sqrt(mass). */
    baseView: 620,
    zoomLambda: 2.5,
  },
} as const;

export type Config = typeof CONFIG;
