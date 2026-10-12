# CrazyGames store listing

Copy-paste texts for the developer portal submission form. English is the store language.

## Name

EvoBite

## Short description (one line)

Eat, grow and evolve: pick a path at every stage and become the apex predator of the arena.

## Description

Start as a tiny blob in a crowded arena. Eat glowing orbs and smaller creatures to grow, and steer clear of anything bigger than you.

Every time you grow you evolve. Choose one of two paths at each of the four stages: get faster with **Swift**, poison anyone who touches you with **Venom**, become a **Hunter** that eats creatures almost your size, or turn into an unstoppable **Titan**. With 16 different final forms, every round plays out differently.

- Boost to catch prey or escape danger, but it costs you mass.
- Chain kills for combos, and feel every bite: screen shake, slow-motion impacts and a chill original soundtrack.
- Got eaten? Respawn and take **revenge** on your killer for a big bonus.
- Earn coins every round and unlock 10 skins, from Ocean to Galaxy and Rainbow.
- Climb the live leaderboard and reach #1.
- Translated into 11 languages, and plays great on PC and mobile.

## Controls

**PC**

- Mouse: move (your creature follows the cursor)
- Space (hold): boost (costs mass)
- 1 / 2: choose an evolution
- P: pause

**Mobile**

- Joystick (bottom left): move
- Boost button (bottom right): boost
- Tap a card to choose an evolution

## Category and tags

- Category: **Casual**. If CrazyGames asks for an alternative, use Arcade. Don't use **.io** or **Multiplayer**: the arena is filled with AI creatures, and players read the .io and Multiplayer labels as "real people online".
- Tags to pick from the portal list where available: Eating, Evolution, Arena, Animal, Skins, 1 Player, Mouse, Touchscreen, Funny.

## Submission settings

| Field                | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| Orientation (mobile) | Both (landscape and portrait are supported)                              |
| Mobile friendly      | Yes (touch joystick and boost button)                                    |
| Engine               | HTML5 / Other (Vite + TypeScript, Canvas 2D)                             |
| Age rating           | PEGI 12 or lower (cartoon creatures, no blood, no chat)                  |
| Upload               | `evobite-crazygames.zip` (contents of `dist/`, `index.html` at the root) |
| Covers               | `marketing/store/cover-*.png` (1920×1080, 800×1200, 800×800)             |
| Trailers             | landscape 1920×1080 and portrait 1080×1620, 18 s, silent, H.264          |

## Assets

- The covers come from `marketing/cover.html`, drawn with the game's own creature renderer. To re-render them, run `node marketing/render-covers.mjs`.
- The trailers are recorded frame by frame from the dev build with an autopilot. Run `node marketing/record-trailer.mjs`. The first frame is the matching cover. There is no cursor, no text overlay and no fast-forward.
