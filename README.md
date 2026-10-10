# EvoBite

**Eat. Grow. Every 30 seconds, choose what you become.**

EvoBite is a browser `.io` arena game built for [CrazyGames](https://www.crazygames.com).
You hatch tiny, eat orbs and anything smaller than you, and at four mass thresholds you pick
one of two evolutions. Four binary choices give 16 final forms, so every round plays differently
and there is always a build you have not tried.

No engine, no image assets: TypeScript + Canvas 2D, ~35 KB of JavaScript.

## Play

- **Move**: mouse, or drag with one finger.
- **Evolve**: click a card, or press `1` / `2`.
- **Respawn**: click, `Space` or `Enter`.

## Why it should work on CrazyGames

| Platform signal        | How EvoBite answers it                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Conversion to gameplay | One click from menu to arena, no tutorial. First evolution offer at ~20 seconds.    |
| Average playtime       | 1–4 minute rounds, instant respawn, revenge marker on your killer.                  |
| Retention              | Coins and unlocked forms persist between sessions (local + CrazyGames data module). |
| Mobile share           | One-finger control, responsive HUD, cards stack vertically on phones.               |
| Technical limits       | Single ~50 KB bundle, far under the 50 MB initial-download rule.                    |

See [docs/GDD.md](docs/GDD.md) for the full design and [docs/CRAZYGAMES.md](docs/CRAZYGAMES.md)
for the submission checklist.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + format + tests
npm run build      # production bundle in dist/
```

### Project layout

```
src/
  config.ts            every tunable number in one place
  core/                loop, input, vectors, seeded RNG, event emitter
  game/
    world.ts           simulation state + spawning
    game.ts            round lifecycle, player control, system ordering
    evolution/         branch tree, 16 form names, derived stats
    systems/           movement, eating, decay, evolution, bot AI, spawner
    economy.ts         coins and persisted progress
  render/              camera, particles, Canvas renderer
  ui/                  HUD, evolution picker, menu and death screens (plain DOM)
  sdk/                 platform adapter: CrazyGames SDK v3 + mock for dev/tests
tests/                 vitest unit tests for all game logic (headless, no DOM)
```

The simulation has no DOM or canvas dependency, so every rule (who can eat whom, venom,
revenge, evolution thresholds, bot decisions) is covered by fast unit tests.

## Balancing

All numbers live in `src/config.ts` and `src/game/evolution/tree.ts`. Change a value, run
`npm run dev`, feel it. The test suite guards invariants (no degenerate builds, creatures stay
inside the arena, 16 unique forms) rather than exact tuning values, so balancing never breaks CI.

## Deployment

- Every push to `main` runs CI and deploys to GitHub Pages (enable Pages → Source: GitHub Actions
  once in the repository settings).
- For CrazyGames, upload the contents of `dist/` as a zip. The SDK script tag is already in
  `index.html`; outside the platform the game silently uses a mock adapter.
