# CrazyGames submission checklist

Sources: <https://docs.crazygames.com/requirements/> (gameplay, quality, technical, ads, SDK v3, and the cover and video guidelines). Store texts are in [crazygames/listing.md](crazygames/listing.md).

## Gameplay

- [x] One click from load into gameplay (Play in the lobby; Enter also works).
- [x] PEGI 12: abstract cartoon creatures, no blood, no chat, no user content.
- [x] English is the default language. 11 locales are available; the language follows the browser and can be switched in the lobby.
- [x] Readable at DPR 1 in every CrazyGames iframe size: 800×450, 821×462, 907×510, 1077×606, 1080×607, 1216×684, 1280×720, 1366×768, 1536×864 and 1920×1080. Checked with Playwright: the lobby fits, the HUD doesn't overlap, and the smallest text is ≥ 10 px.
- [x] Same physics on 30/60/144 Hz screens: fixed 60 Hz simulation step.
- [x] No custom fullscreen button, no external links, no other branding.
- [x] Escape isn't used by the game, because it exits fullscreen. Pause is on **P**, and the game also pauses itself when the tab is hidden.

## Mobile

- [x] Touch: fixed joystick and a boost button. Mouse and keyboard work at the same time.
- [x] Portrait and landscape, from 360 px wide. Checked on 7 phone and tablet profiles in both orientations.
- [x] No pinch-zoom or accidental page scroll.

## Technical

- [x] Initial download ≈ 0.3 MB in 8 files (limits: 50 MB, and 20 MB for the mobile homepage).
- [x] Relative paths (`base: './'`), works inside an iframe.
- [x] Tested in Chromium (Chrome/Edge). Only standard Canvas 2D and Web Audio APIs are used, nothing browser-specific.
- [x] SDK v3 loaded with `defer` in `<head>`, so it still runs before the game module but never blocks the first paint; an inline splash shows at once, and boot waits at most 3 s for `init()`. The SDK is skipped when `environment === 'disabled'`.
- [x] `loadingStart()` / `loadingStop()` around boot. Loading stops once the fonts are in and the lobby is interactive.
- [x] `gameplayStart()` / `gameplayStop()` on round start, death, pause/resume and around ads.
- [x] `happytime()` on evolutions and revenge kills.
- [x] Progress is saved through the SDK data module, with `localStorage` as the fallback.
- [x] Every SDK call is guarded, so an SDK error can never freeze the game.

## Ads

- [x] Midgame ads only at a natural break (respawn after death), never during play.
- [x] No ad in the first 3 minutes of play. The SDK also caps midgame ads at one every 3 minutes.
- [x] Sound is muted on `adStarted`, not when the ad is requested, and comes back afterwards.
- [x] The game is paused for the ad. `adError` or a missing ad never blocks: there's a 4 s start timeout and a 45 s hard cap.
- [x] No rewarded ads yet. Possible later addition: "watch an ad to keep 50% of your mass".

## Store assets

- [x] Covers: landscape 1920×1080, portrait 800×1200 and square 800×800. They show the main character and the game name only: no "Play" button, no frames, no screenshots.
- [x] Trailers: landscape 1920×1080 and portrait 1080×1620, 18 s, H.264, silent, under 10 MB each. The first frame is the cover. There is no cursor, text overlay or speed-up.

## Manual steps in the developer portal

1. Upload `evobite-crazygames.zip`, with `index.html` at the root.
2. Open the portal's preview/QA tool and check that the SDK works on the real domain (`environment` should be `crazygames`). This includes the ad flow after 3 minutes.
3. Set orientation to "both" and mark the game as mobile-friendly.
4. Choose category and tags from the listing. Don't choose .io or Multiplayer.
5. Upload the 3 covers and 2 trailers, then paste the description and controls.

## Resubmission after "overall quality" rejection

The first submission was rejected for overall quality. Changes made in response:

- First minute: 12 s spawn shield with a countdown, spawn away from giants, smaller bots around new players, a small ring of orbs at the spawn, and a three-line hint card for the first three rounds.
- Pacing: evolutions at mass 35 / 110 / 260 / 650, checked with `npm run pacing` (a bot playing the player): roughly 12 s, 25 s, ~3 min and ~3–4 min for an unkillable bot. Boost drain is 2%/s and passive decay starts at mass 450.
- Graphics: nebula background with parallax, glowing food patches, breathing and blinking creatures with expressions (predators grin, prey look worried), open-mouth bites, evolution rings and flash, a glowing arena wall and a darkened outside.
- Game feel: screen shake and a camera punch on kills, hit-stop, floating mass numbers, kill combos, and a procedural ambient soundtrack.
- Performance: the background lives in DOM layers moved by compositor transforms (no canvas pixels), orbs are pre-rendered sprites, orb pickup uses a spatial grid, and the renderer drops to 1x resolution and flat orbs by itself when frames stay slow. Measured at 58–60 FPS on every tested size, 51 FPS with a 4x CPU throttle (the pre-rework build managed 33 there).

## Basic Launch metrics to watch (2 weeks)

| Metric                 | Target  | Lever if low                                                   |
| ---------------------- | ------- | -------------------------------------------------------------- |
| Conversion to gameplay | > 70%   | shorten menu, autofocus Play, remove name field                |
| Average playtime       | > 6 min | lower first threshold, more elite bots, stronger revenge bonus |
| D1 retention           | > 15%   | skins shop, form codex, daily challenge                        |
