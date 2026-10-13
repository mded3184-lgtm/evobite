/**
 * Records the CrazyGames store trailers frame by frame from the dev build.
 *
 *   npm run dev   (in another terminal, port 5173)
 *   node marketing/record-trailer.mjs <outDir> [landscape|portrait]
 *
 * Needs Playwright (`npm i -D playwright` or any install it can resolve) and ffmpeg.
 * The game loop is stopped and stepped exactly 1/30 s per captured frame, so the video is
 * smooth no matter how slow the capture is. An autopilot plays the round: it steers to the
 * nearest prey, boosts in bursts and picks swift → venom → hunter → apex. The player is
 * made uneatable and the arena is fed with prey so all four evolutions fit in ~15 s.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'trailer-out';
const only = process.argv[3];
const FPS = 30;
const GAMEPLAY_SEC = 17.4; // + 0.6 s cover = 18 s
const PICKER_SEC = 0.75;

const FORMATS = {
  landscape: { viewport: { width: 1280, height: 720 }, dpr: 1.5, touch: false, size: '1920x1080' },
  portrait: { viewport: { width: 480, height: 720 }, dpr: 2.25, touch: true, size: '1080x1620' },
};

/** Runs inside the page before each frame. */
function autopilotTick(dt) {
  const g = window.evobite;
  const w = g.world;
  const a = window.__auto;
  const p = w.player;
  if (!p || !p.alive) return { picker: false };
  if (g.isChoosing) {
    a.pickerT += dt;
    return { picker: a.pickerT >= a.pickerHold };
  }
  a.pickerT = 0;
  a.t += dt;
  p.stats.beEatenRatio = 50; // nobody can eat the hero in the trailer
  // No spawn-shield bubble or first-round hint card: they are UI noise in a store video.
  p.invulnUntil = 0;
  document.querySelector('.hud-hint')?.classList.remove('show');

  // Mass schedule so the four evolutions land at a steady rhythm.
  const keys = [
    [0, 14],
    [2.4, 40],
    [5.2, 135],
    [8.6, 360],
    [11.6, 880],
    [15, 960],
  ];
  let target = keys[keys.length - 1][1];
  for (let i = 1; i < keys.length; i++) {
    if (a.t <= keys[i][0]) {
      const [t0, m0] = keys[i - 1];
      const [t1, m1] = keys[i];
      target = m0 + ((m1 - m0) * (a.t - t0)) / (t1 - t0);
      break;
    }
  }
  if (p.mass < target * 0.92) p.mass += (target * 0.92 - p.mass) * Math.min(1, dt * 2.5);
  p.maxMass = Math.max(p.maxMass, p.mass);

  // Steer to the best nearby meal: biggest edible creature, else nearest orb.
  const r = w.radiusFor(p.mass);
  let best = null;
  let bestScore = -Infinity;
  for (const c of w.creatures.values()) {
    if (!c.alive || c.id === p.id || c.mass * p.stats.eatRatio > p.mass) continue;
    const d = Math.hypot(c.pos.x - p.pos.x, c.pos.y - p.pos.y);
    if (d > r * 9 + 500) continue;
    const score = c.mass / (d + r);
    if (score > bestScore) {
      bestScore = score;
      best = c.pos;
    }
  }
  if (!best) {
    let bd = Infinity;
    for (const o of w.orbs) {
      if (!o.alive) continue;
      const d = Math.hypot(o.pos.x - p.pos.x, o.pos.y - p.pos.y);
      if (d < bd) {
        bd = d;
        best = o.pos;
      }
    }
  }
  if (best) {
    const dx = best.x - p.pos.x;
    const dy = best.y - p.pos.y;
    const l = Math.hypot(dx, dy) || 1;
    p.heading.x = dx / l;
    p.heading.y = dy / l;
  }

  // Boost in bursts: show it off early and in the final chase.
  a.burst -= dt;
  if (a.burst < -1.6) a.burst = 0.9;
  p.boosting = (a.burst > 0 || a.t > 13.5) && p.mass > 16;

  // Feed the arena: skinned prey ahead of the hero.
  a.spawnAcc += dt;
  const interval = a.t > 12 ? 0.9 : 0.55;
  if (a.spawnAcc >= interval) {
    a.spawnAcc = 0;
    const skins = ['candy', 'ocean', 'toxic', 'sunset', 'lava', 'rainbow', 'gold', 'shadow'];
    const big = a.t > 12 && Math.random() < 0.5;
    const mass = p.mass * (big ? 0.55 : 0.12 + Math.random() * 0.22);
    const ang = Math.atan2(p.dir.y, p.dir.x) + (Math.random() - 0.5) * 1.4;
    const dist = r * (3 + Math.random() * 2.5) + 120;
    const pos = { x: p.pos.x + Math.cos(ang) * dist, y: p.pos.y + Math.sin(ang) * dist };
    const R = 2400; // keep inside the arena
    const pl = Math.hypot(pos.x, pos.y);
    if (pl < R) {
      const c = w.spawnCreature('bot', '', mass, pos);
      c.invulnUntil = w.time;
      c.skin = skins[Math.floor(Math.random() * skins.length)];
      if (c.bot) c.bot.caution = 0;
    }
  }
  return { picker: false };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});

for (const [name, f] of Object.entries(FORMATS)) {
  if (only && only !== name) continue;
  const frames = join(out, `frames-${name}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });

  const ctx = await browser.newContext({
    viewport: f.viewport,
    deviceScaleFactor: f.dpr,
    hasTouch: f.touch,
    isMobile: f.touch,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.addInitScript(() => {
    localStorage.setItem('evobite.muted', '1');
    localStorage.setItem('evobite.lang', 'en');
    localStorage.setItem('evobite.name', 'You');
    Math.random = (() => {
      let s = 1234567;
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    })();
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.evobiteLoop !== undefined);
  await page.waitForTimeout(500);
  await page.click('.btn-play');
  await page.waitForTimeout(100);
  await page.evaluate((hold) => {
    const g = window.evobite;
    window.evobiteLoop.stop();
    g.aimAt = () => undefined;
    g.steer = () => undefined;
    g.setBoost = () => undefined;
    window.__auto = { t: 0, spawnAcc: 0, burst: 0.9, pickerT: 0, pickerHold: hold };
  }, PICKER_SEC);
  await page.evaluate((src) => {
    window.__autoTick = new Function(`return (${src})`)();
  }, autopilotTick.toString());

  const total = Math.round(GAMEPLAY_SEC * FPS);
  for (let i = 0; i < total; i++) {
    const res = await page.evaluate((dt) => {
      const r = window.__autoTick(dt);
      if (!r.picker) window.evobiteLoop.advance(dt);
      return r;
    }, 1 / FPS);
    if (res.picker) {
      await page.keyboard.press('1');
      await page.evaluate((dt) => window.evobiteLoop.advance(dt), 1 / FPS);
    }
    await page.screenshot({
      path: join(frames, `${String(i).padStart(5, '0')}.jpg`),
      type: 'jpeg',
      quality: 92,
    });
    if (i % 60 === 0) {
      const s = await page.evaluate(() => {
        const p = window.evobite.player;
        return p ? `${Math.round(p.mass)} ${p.path.join('/')}` : 'dead';
      });
      console.log(name, i, s);
    }
  }
  await ctx.close();

  // Prepend the matching cover (first frame must be the cover image), then encode.
  const cover = join(out, `cover-${name}.png`);
  const [w, h] = f.size.split('x');
  const video = join(out, `evobite-trailer-${name}-${f.size}.mp4`);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-loop',
    '1',
    '-framerate',
    String(FPS),
    '-t',
    '0.6',
    '-i',
    cover,
    '-framerate',
    String(FPS),
    '-i',
    join(frames, '%05d.jpg'),
    '-filter_complex',
    `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,format=yuv420p[c];` +
      `[1:v]scale=${w}:${h},setsar=1,format=yuv420p[g];[c][g]concat=n=2:v=1[v]`,
    '-map',
    '[v]',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    '-movflags',
    '+faststart',
    video,
  ]);
  console.log('wrote', video);
}
await browser.close();
