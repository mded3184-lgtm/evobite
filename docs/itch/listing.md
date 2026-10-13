# itch.io release

Everything for the itch.io project page, in the order the "Create new project" form asks
for it. Upload file: `release/evobite-itch.zip` (built by `npm run release`, no SDK, no ads).

## Basics

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| Title             | EvoBite                                                                            |
| Project URL       | `evobite` (becomes `https://<your-name>.itch.io/evobite`)                          |
| Short description | Eat, grow and evolve: pick a path at every stage and become the apex of the arena. |
| Classification    | Games                                                                              |
| Kind of project   | HTML (playable in the browser)                                                     |
| Release status    | Released                                                                           |
| Pricing           | No payments, or "$0 or donate" if you want tips                                    |
| Uploads           | `evobite-itch.zip`, tick **This file will be played in the browser**               |

## Embed options

| Option                                  | Value                                               |
| --------------------------------------- | --------------------------------------------------- |
| Embed in page / Click to launch in full | Embed in page                                       |
| Viewport dimensions                     | 960 × 540 (the layout is checked down to 800 × 450) |
| Mobile friendly                         | Yes; orientation: Default (both work)               |
| Automatically start on page load        | Off (browsers need a click before sound anyway)     |
| Fullscreen button                       | On                                                  |
| Enable scrollbars                       | Off                                                 |
| SharedArrayBuffer support               | Off (not used)                                      |

## Details

**Description** (itch accepts Markdown-like formatting in its editor):

> Start as a tiny blob in an arena full of AI creatures. Eat glowing food and anything smaller than you, and keep away from anything bigger.
>
> Every time you grow, you evolve. Pick one of two paths at each of four stages: get faster with **Swift**, poison whoever touches you with **Venom**, become a **Hunter** that eats creatures almost your size, or turn into an unstoppable **Titan**. Sixteen final forms, so every round plays differently.
>
> - Boost to catch prey or escape, at the cost of some mass
> - Chain kills into combos and feel every bite: screen shake, impact pauses and an original ambient soundtrack
> - Got eaten? Respawn and take revenge on your killer for a big bonus
> - Earn coins and unlock 10 skins, from Ocean to Galaxy and Rainbow
> - Plays on desktop and mobile, in 11 languages
>
> **Controls**
> PC: mouse to move, hold Space to boost, 1 / 2 to pick an evolution, P to pause.
> Mobile: joystick bottom left, boost button bottom right, tap a card to evolve.
>
> Single-player: the arena is filled with AI creatures, no account or download needed.

| Field           | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Genre           | Action                                                                                                 |
| Tags (max 10)   | arcade, casual, evolution, io, singleplayer, 2d, cute, colorful, mouse, touch-friendly                 |
| AI disclosure   | Answer honestly: the code, text and art were made with an AI assistant (the art is drawn by code).     |
| Inputs          | Mouse, Keyboard, Touchscreen                                                                           |
| Accessibility   | Interactive tutorial (first-round hint card), Subtitles not needed (no speech)                         |
| Languages       | English, Ukrainian, Spanish, Portuguese, French, German, Italian, Polish, Turkish, Russian, Indonesian |
| Average session | A few minutes                                                                                          |
| Community       | Comments                                                                                               |
| Visibility      | Draft first; play it on the page, then switch to Public                                                |

## Images and media (`marketing/store/itch/`)

| Slot                   | File                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cover image (630×500)  | `itch-cover-630x500.png`                                                                                                              |
| Screenshots (in order) | `evobite-gameplay.gif`, `screenshot-1-lobby.png` … `screenshot-6-phone.png`                                                           |
| Gameplay video         | itch only takes a YouTube or Vimeo link: upload `marketing/store/evobite-trailer-landscape-1920x1080.mp4` there first if you want one |

## Page theme (Edit theme)

| Setting           | Value                           |
| ----------------- | ------------------------------- |
| Background        | `#0b1020`                       |
| Second background | `#151c35`                       |
| Text              | `#e8ecf3`                       |
| Link / buttons    | `#35e0a1`                       |
| Embed background  | `#0b1020`                       |
| Font              | Nunito (or the closest offered) |

## Before going public

1. Save as Draft, open the page, press **Run game**, play a round with sound.
2. Try the fullscreen button and a phone (open the draft link on the phone).
3. Check that progress survives a page reload (coins, skins).
4. Switch Visibility to Public.
