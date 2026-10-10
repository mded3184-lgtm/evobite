# CrazyGames submission checklist

Source: https://docs.crazygames.com/requirements/

## Gameplay requirements

- [x] Immediate entry into gameplay: one click ("Play") from load.
- [x] PEGI 12 compliant: abstract creatures, no blood, no text chat.
- [x] Playable with mouse and with one finger on touch screens.
- [x] Works in an iframe: relative `base: './'`, no top-level navigation, no popups.
- [x] No external links or branding other than the SDK.

## Quality requirements

- [x] Unique name and icon (not confusable with Hole.io / Holey.io / Mope.io).
- [x] Responsive layout from 360 px wide up to 4K; canvas scales with devicePixelRatio ≤ 2.
- [x] No console errors on load (`npm run build && npm run preview`).
- [ ] 16:9 cover (1920×1080), square icon (512×512), 3 screenshots, 10–20 s gameplay video.

## Technical requirements

- [x] Initial download ≤ 50 MB (actual: ~50 KB).
- [x] Total ≤ 250 MB, ≤ 1500 files.
- [x] SDK v3 loaded from `https://sdk.crazygames.com/crazygames-sdk-v3.js`.
- [x] `gameplayStart()` / `gameplayStop()` on round start / death.
- [x] `happytime()` on evolution and revenge kills.
- [x] Midgame ad requested on respawn, with `adError` treated as finished.
- [x] Progress stored through the data module, falling back to `localStorage`.
- [ ] Sound muted while an ad plays (add when audio lands).

## Basic Launch metrics to watch (2 weeks)

| Metric                 | Target  | Lever if low                                                   |
| ---------------------- | ------- | -------------------------------------------------------------- |
| Conversion to gameplay | > 70%   | shorten menu, autofocus Play, remove name field                |
| Average playtime       | > 6 min | lower first threshold, more elite bots, stronger revenge bonus |
| D1 retention           | > 15%   | skins shop, form codex, daily challenge                        |
