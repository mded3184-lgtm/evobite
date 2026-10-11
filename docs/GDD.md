# EvoBite — Game Design Document

## One-liner

An eat-and-grow arena where every 30 seconds you choose what you become.

## Core loop (one round, 1–4 minutes)

1. **Hatch** small among orbs and bots with human-looking nicknames. No tutorial.
2. **Eat** orbs and anything you out-mass by the eat ratio. Being eaten is instant death.
3. **Evolve** at mass 30 / 80 / 200 / 480: the player is paused and shown two cards. Pick one.
4. **Hunt** with your build; bigger creatures slowly lose mass, so no giant stays on top forever.
5. **Die**, see your stats and coins, respawn in one click with your killer marked for revenge.

## Evolution tree

| Tier | Mass | Option A (offensive)                                  | Option B (defensive)                                 |
| ---- | ---- | ----------------------------------------------------- | ---------------------------------------------------- |
| 1    | 30   | **Swift** +22% speed                                  | **Bulk** +35% food, −8% speed, +10% absorb           |
| 2    | 80   | **Venom** drain 7%/s of touching creatures, gain half | **Armor** need 1.45× to be eaten, 70% venom resist   |
| 3    | 200  | **Hunter** +60% vision, eat at 1.12×, +8% speed       | **Grazer** orb magnet 150u, +25% food                |
| 4    | 480  | **Apex** eat at 1.05×, +15% absorb                    | **Titan** no decay, need 1.6× to be eaten, −5% speed |

16 final forms, each with a name ("Dart Viper", "Iron Colossus"…) so players talk about builds.
Bots pick branches too, biased by an aggression personality, so the arena contains real builds.

### Why these choices

- Each pair is a real trade-off (risk vs safety), not a stat stick vs a dud.
- Every branch is visible on the body (fins, spikes, ring, halo, crown, glow), so a glance at an
  enemy tells you what you're dealing with.
- The strongest-looking combo (Swift+Venom+Hunter+Apex) is also the most fragile, and the
  tankiest (Bulk+Armor+Grazer+Titan) is slow; neither dominates.

## Boost

Hold to move 65% faster. It burns 3% of your mass per second (at least 1.2 per second) and
stops at mass 16, so a hatchling can't burn itself away. Half of the burned mass drops behind
you as small orbs in your colour: a chase leaves a trail others can feed on. Bots panic-boost
away from a predator that is right on them, and aggressive bots lunge at prey in reach.

## Rules that keep the arena honest

- **Eat ratio**: attacker needs `max(attacker.eatRatio, prey.beEatenRatio)` × prey mass, and the
  prey's centre must be well inside the attacker's body. No "edge-touch" deaths.
- **Spawn protection**: 2 seconds, prevents being eaten, not eating.
- **Decay**: above 150 mass, 1.2%/s of the excess is lost (Titan: 0).
- **Speed**: `420 / mass^0.18`, so a hatchling is ~1.7× faster than a 480-mass giant.
- **Elite bots**: 15% of respawns arrive at 120–380 mass so there is always something to fear
  and something worth hunting.

## Retention hooks

- **Revenge**: your last killer is ringed in red for 45 s after respawn; eating it gives +35%
  bonus mass and +15 coins.
- **Coins**: `0.1 × max mass + 5 × kills + 15 × revenge kills` per round, persisted. Spent on
  skins (next milestone).
- **Form collection**: each completed form is recorded; a "16/16 forms" screen is the long-term
  goal.

## Platform

- CrazyGames SDK v3: `gameplayStart/Stop`, `happytime` on evolution and revenge, midgame ad on
  respawn, data module for progress. Mock adapter everywhere else.
- Mobile first: one-finger drag, large tap targets, picker cards stack on narrow screens.

## Roadmap

1. **MVP (this repo)**: full loop, 8 branches, bots, revenge, coins, HUD, SDK hooks.
2. **Juice pass**: sound (Web Audio, no files), screen shake on kill, eat squash animation.
3. **Shop**: 6–8 skins for coins, 1 rewarded-ad skin.
4. **Form codex**: 16-form grid with silhouettes, unlocked ones in colour.
5. **Daily challenge**: seeded arena with a fixed bot roster and a shareable score.
6. **Metrics-driven tuning**: watch CrazyGames Basic Launch numbers (playtime, conversion,
   D1 retention) and tune thresholds and bot aggression accordingly.
