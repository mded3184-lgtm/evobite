# GameDistribution release

Sources: the GD HTML5 SDK wiki (<https://github.com/GameDistribution/GD-HTML5/wiki>) and GD's
developer and design guidelines. Upload file: `release/evobite-gamedistribution.zip`.

## SDK integration (done in code)

| Requirement (GD wiki)                                          | How EvoBite does it                                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK loaded once, while the game loads, not on a button press   | `src/sdk/gamedistribution.ts` sets `GD_OPTIONS` and adds `main.min.js` during boot; boot waits at most 3 s for `SDK_READY`                                    |
| Pre-roll before play, behind a click                           | First **Play** click of a session calls `gdsdk.showAd()`, the round starts when it's over                                                                     |
| Mid-rolls between sessions, behind a click                     | **Respawn** after death calls `gdsdk.showAd()`; the SDK paces how often ads really show                                                                       |
| Pause and mute on `SDK_GAME_PAUSE`, resume on `SDK_GAME_START` | Sound is suspended when the ad starts; the round only starts or resumes after `SDK_GAME_START`. A pause the SDK starts by itself opens the in-game pause menu |
| Never get stuck                                                | No ad within 6 s counts as "no ad"; a running ad is capped at 60 s; a blocked or missing SDK skips ads                                                        |
| No other ads, no outbound links                                | None in the game; share button is off on GD                                                                                                                   |
| Game id                                                        | Baked in at build time: `GD_GAME_ID=<id> npm run release`                                                                                                     |

Unit tests: `tests/gamedistribution.test.ts`. Checked in a browser with a stand-in SDK:
pre-roll before the first round, no double ad on double click, SDK pause opens the pause
menu, and the game still starts when the SDK is blocked.

## Steps

1. Sign up on <https://developer.gamedistribution.com> and **Upload a new game** to get a
   **Game ID**.
2. Build with that id: `GD_GAME_ID=<your id> npm run release` (or send the id and get the zip
   built), then upload `release/evobite-gamedistribution.zip` (index.html at the root).
3. Open the game from the Upload tab (it runs in an iframe), switch off any ad blocker, press
   Play and **watch the pre-roll to the end**. That activates the SDK flag; GD says this can
   take a while to register.
4. Fill in the details below, upload the thumbnails, then press **Request activation**. GD's
   FAQ says a review can take up to 2 days.

## Details

| Field            | Value                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Title            | EvoBite                                                                                                     |
| Category         | Arcade (alternative: Casual). Not .io/Multiplayer: the arena is single-player against AI                    |
| Tags             | arcade, casual, evolution, eating, animal, skins, 1 player, mouse, touch, mobile                            |
| Mobile ready     | Yes, both orientations                                                                                      |
| Multiplayer      | No                                                                                                          |
| Languages        | English (default) + 10 more, chosen from the browser                                                        |
| Suggested iframe | Responsive; any 16:9 size from 800 × 450 up (GD recommends responsive, with 800 × 600 as the default frame) |

**Description:**

> Start as a tiny blob in an arena full of AI creatures. Eat glowing food and anything smaller than you, and keep away from anything bigger. Every time you grow you evolve: pick one of two paths at each of four stages and become one of 16 forms, from the lightning-fast Dart Viper to the unstoppable Titan. Boost to catch prey, chain kills into combos, take revenge on whoever ate you, and unlock 10 skins with the coins you earn.

**Instructions:**

> Move with the mouse (on mobile: the joystick at the bottom left). Hold Space or the BOOST button to dash, at the cost of some mass. Eat orbs and smaller creatures to grow and avoid bigger ones. When the evolution picker opens, press 1 or 2 (or tap a card) to choose your next perk. Press P to pause.

## Thumbnails (`marketing/store/gamedistribution/`)

| Size       | File              | Notes                                  |
| ---------- | ----------------- | -------------------------------------- |
| 512 × 512  | `gd-512x512.png`  | required, no title (too small for one) |
| 512 × 384  | `gd-512x384.png`  | required, no title                     |
| 200 × 120  | `gd-200x120.png`  | required, no title                     |
| 1280 × 720 | `gd-1280x720.png` | optional, with title                   |
| 1280 × 550 | `gd-1280x550.png` | optional, with title                   |

Video: `marketing/store/evobite-trailer-landscape-1920x1080.mp4` if the form offers a video slot.
