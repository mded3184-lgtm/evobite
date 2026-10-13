/**
 * Store cover art, drawn with the game's own creature renderer so it matches the game.
 * Open /marketing/cover.html?layout=<layout> at the target size and screenshot it
 * (marketing/render-covers.mjs renders every store format).
 */
import '@fontsource-variable/nunito';
import type { BranchId } from '@/game/evolution/tree';
import { getSkin } from '@/game/skins';
import { Rng } from '@/core/rng';
import { drawCreatureArt } from '@/render/creatureArt';

/**
 * landscape / portrait / square: CrazyGames covers (also GD 1280x720).
 * itch: itch.io cover 630x500. banner: GD 1280x550.
 * icon / icon43 / tiny: GD 512x512, 512x384 and 200x120 thumbnails, which GD wants
 * without a title (they're too small for it).
 */
type Layout = 'landscape' | 'portrait' | 'square' | 'itch' | 'banner' | 'icon' | 'icon43' | 'tiny';
const layout = (new URLSearchParams(location.search).get('layout') ?? 'landscape') as Layout;

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const title = document.querySelector<HTMLElement>('.title');
const W = window.innerWidth;
const H = window.innerHeight;
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
const maybeCtx = canvas.getContext('2d');
if (!maybeCtx) throw new Error('Canvas 2D unavailable');
const ctx = maybeCtx;
ctx.scale(dpr, dpr);
const rng = new Rng(7);
const U = Math.min(W, H); // layout unit

interface Placement {
  hero: { x: number; y: number; r: number };
  dir: { x: number; y: number };
  giant: { x: number; y: number; r: number };
  prey: { x: number; y: number; r: number; skin: string }[];
  title: {
    left: number;
    top: number;
    size: number;
    rotate: number;
    center?: boolean;
    stack?: boolean;
  } | null;
}

const P: Record<Layout, Placement> = {
  landscape: {
    hero: { x: W * 0.6, y: H * 0.67, r: U * 0.25 },
    dir: norm(1, -0.28),
    giant: { x: W * 1.0, y: -H * 0.05, r: U * 0.62 },
    prey: [
      { x: W * 0.86, y: H * 0.45, r: U * 0.07, skin: 'candy' },
      { x: W * 0.93, y: H * 0.72, r: U * 0.055, skin: 'ocean' },
      { x: W * 0.8, y: H * 0.86, r: U * 0.045, skin: 'toxic' },
    ],
    title: { left: W * 0.11, top: H * 0.2, size: U * 0.21, rotate: -4 },
  },
  portrait: {
    hero: { x: W * 0.46, y: H * 0.71, r: U * 0.28 },
    dir: norm(1, -0.45),
    giant: { x: W * 1.08, y: H * 0.28, r: U * 0.5 },
    prey: [
      { x: W * 0.84, y: H * 0.5, r: U * 0.085, skin: 'candy' },
      { x: W * 0.88, y: H * 0.72, r: U * 0.065, skin: 'ocean' },
      { x: W * 0.16, y: H * 0.88, r: U * 0.055, skin: 'toxic' },
    ],
    title: {
      left: W * 0.55,
      top: H * 0.085,
      size: W * 0.28,
      rotate: -4,
      center: true,
      stack: true,
    },
  },
  square: {
    hero: { x: W * 0.47, y: H * 0.71, r: U * 0.22 },
    dir: norm(1, -0.35),
    giant: { x: W * 1.1, y: H * 0.18, r: U * 0.36 },
    prey: [
      { x: W * 0.84, y: H * 0.5, r: U * 0.07, skin: 'candy' },
      { x: W * 0.86, y: H * 0.79, r: U * 0.055, skin: 'ocean' },
    ],
    title: { left: W * 0.54, top: H * 0.19, size: U * 0.175, rotate: -4, center: true },
  },
  itch: {
    hero: { x: W * 0.56, y: H * 0.7, r: U * 0.24 },
    dir: norm(1, -0.3),
    giant: { x: W * 1.06, y: H * 0.05, r: U * 0.5 },
    prey: [
      { x: W * 0.86, y: H * 0.52, r: U * 0.075, skin: 'candy' },
      { x: W * 0.9, y: H * 0.82, r: U * 0.06, skin: 'ocean' },
      { x: W * 0.14, y: H * 0.86, r: U * 0.05, skin: 'toxic' },
    ],
    title: { left: W * 0.5, top: H * 0.1, size: U * 0.2, rotate: -4, center: true },
  },
  banner: {
    hero: { x: W * 0.66, y: H * 0.58, r: H * 0.3 },
    dir: norm(1, -0.25),
    giant: { x: W * 1.0, y: -H * 0.1, r: H * 0.7 },
    prey: [
      { x: W * 0.86, y: H * 0.5, r: H * 0.08, skin: 'candy' },
      { x: W * 0.92, y: H * 0.8, r: H * 0.065, skin: 'ocean' },
      { x: W * 0.45, y: H * 0.85, r: H * 0.05, skin: 'toxic' },
    ],
    title: { left: W * 0.06, top: H * 0.3, size: H * 0.25, rotate: -4 },
  },
  icon: {
    hero: { x: W * 0.43, y: H * 0.58, r: U * 0.3 },
    dir: norm(1, -0.3),
    giant: { x: W * 1.05, y: -H * 0.02, r: U * 0.42 },
    prey: [
      { x: W * 0.87, y: H * 0.76, r: U * 0.085, skin: 'candy' },
      { x: W * 0.62, y: H * 0.93, r: U * 0.06, skin: 'ocean' },
    ],
    title: null,
  },
  icon43: {
    hero: { x: W * 0.44, y: H * 0.6, r: U * 0.3 },
    dir: norm(1, -0.28),
    giant: { x: W * 1.03, y: -H * 0.05, r: U * 0.5 },
    prey: [
      { x: W * 0.86, y: H * 0.66, r: U * 0.09, skin: 'candy' },
      { x: W * 0.92, y: H * 0.9, r: U * 0.065, skin: 'ocean' },
      { x: W * 0.09, y: H * 0.86, r: U * 0.06, skin: 'toxic' },
    ],
    title: null,
  },
  tiny: {
    hero: { x: W * 0.45, y: H * 0.56, r: U * 0.36 },
    dir: norm(1, -0.25),
    giant: { x: W * 1.02, y: -H * 0.1, r: U * 0.55 },
    prey: [{ x: W * 0.84, y: H * 0.65, r: U * 0.12, skin: 'candy' }],
    title: null,
  },
};

function norm(x: number, y: number): { x: number; y: number } {
  const l = Math.hypot(x, y);
  return { x: x / l, y: y / l };
}

function background(): void {
  const g = ctx.createRadialGradient(
    W * 0.55,
    H * 0.55,
    U * 0.1,
    W * 0.5,
    H * 0.5,
    Math.max(W, H) * 0.8,
  );
  g.addColorStop(0, '#16224a');
  g.addColorStop(0.55, '#0d1430');
  g.addColorStop(1, '#070b18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Arena grid, faint, in perspective-free squares.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1.5;
  const step = U * 0.11;
  ctx.beginPath();
  for (let x = (W / 2) % step; x < W; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = (H / 2) % step; y < H; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
}

function orbs(count: number): void {
  const hues = [345, 30, 50, 140, 175, 200, 265, 300];
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, H);
    const near = rng.chance(0.18);
    const r = U * (near ? rng.range(0.012, 0.022) : rng.range(0.005, 0.01));
    ctx.save();
    ctx.shadowBlur = near ? r * 2.5 : r;
    ctx.shadowColor = `hsl(${String(hues[i % hues.length])} 90% 60%)`;
    ctx.globalAlpha = near ? 0.95 : 0.75;
    ctx.fillStyle = `hsl(${String(hues[i % hues.length])} 85% 62%)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function creature(
  x: number,
  y: number,
  r: number,
  dir: { x: number; y: number },
  skinId: string,
  path: BranchId[],
  boosting = false,
  mood: 'none' | 'hungry' | 'scared' = 'none',
): void {
  const skin = getSkin(skinId);
  drawCreatureArt(ctx, {
    x,
    y,
    r,
    dir,
    hue: skin?.hue ?? 165,
    skin,
    path,
    time: 0.35,
    boosting,
    magnetPx: 0,
    mood,
  });
}

/** A toothy maw on the leading edge, in front of the eyes: the "bite" in EvoBite. */
function mouth(x: number, y: number, r: number, dir: { x: number; y: number }): void {
  const cx = r * 0.8; // mouth centre along the facing direction
  const ax = r * 0.2; // half-depth (along dir)
  const ay = r * 0.34; // half-width (across dir)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(dir.y, dir.x));
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.985, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#3a0d1d';
  ctx.beginPath();
  ctx.ellipse(cx, 0, ax, ay, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6b9a';
  ctx.beginPath();
  ctx.ellipse(cx + ax * 0.25, ay * 0.55, ax * 0.55, ay * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Teeth around the rim, pointing into the maw.
  ctx.fillStyle = '#ffffff';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const th = Math.PI * 0.5 + (i / (n - 1)) * Math.PI; // inner (back) half of the rim
    for (const flip of [1, -1]) {
      const t = flip === 1 ? th : th + Math.PI;
      const bx = cx + Math.cos(t) * ax;
      const by = Math.sin(t) * ay;
      if (Math.hypot(bx, by) > r * 0.93) continue;
      const nx = cx - bx;
      const ny = -by;
      const nl = Math.hypot(nx, ny) || 1;
      const tx = -ny / nl;
      const ty = nx / nl;
      const w = r * 0.05;
      const len = r * 0.11;
      ctx.beginPath();
      ctx.moveTo(bx + tx * w, by + ty * w);
      ctx.lineTo(bx - tx * w, by - ty * w);
      ctx.lineTo(bx + (nx / nl) * len, by + (ny / nl) * len);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function render(): void {
  const p = P[layout];
  background();
  orbs(layout === 'landscape' ? 70 : 55);

  // The giant looming from the edge: big, dark and a little out of focus for depth.
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.filter = `blur(${String(Math.round(U * 0.006))}px) brightness(0.75)`;
  creature(p.giant.x, p.giant.y, p.giant.r, norm(-1, 0.7), 'galaxy', [
    'bulk',
    'venom',
    'grazer',
    'titan',
  ]);
  ctx.restore();

  // Fleeing prey, looking back at the hero.
  for (const q of p.prey) {
    const away = norm(q.x - p.hero.x, q.y - p.hero.y);
    creature(q.x, q.y, q.r, { x: -away.x, y: -away.y }, q.skin, ['swift'], false, 'scared');
    // Little sweat drop.
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    ctx.ellipse(q.x + q.r * 0.75, q.y - q.r * 0.85, q.r * 0.14, q.r * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hero mid-dash.
  const h = p.hero;
  ctx.save();
  ctx.shadowBlur = h.r * 0.6;
  ctx.shadowColor = 'rgba(53,224,161,0.45)';
  creature(h.x, h.y, h.r, p.dir, 'classic', ['swift', 'venom', 'hunter', 'apex'], true);
  ctx.restore();
  mouth(h.x, h.y, h.r, p.dir);

  // Vignette.
  const v = ctx.createRadialGradient(W / 2, H / 2, U * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  if (title && !p.title) title.style.display = 'none';
  if (title && p.title) {
    const t = p.title;
    title.style.fontSize = `${String(t.size)}px`;
    title.style.top = `${String(t.top)}px`;
    title.classList.toggle('stack', t.stack === true);
    if (t.center) {
      title.style.left = `${String(t.left)}px`;
      title.style.transform = `translateX(-50%) rotate(${String(t.rotate)}deg)`;
    } else {
      title.style.left = `${String(t.left)}px`;
      title.style.transform = `rotate(${String(t.rotate)}deg)`;
    }
  }
  document.body.dataset.ready = '1';
}

void document.fonts.ready.then(render);
