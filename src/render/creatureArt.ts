import type { BranchId } from '@/game/evolution/tree';
import type { Skin } from '@/game/skins';
import type { Vec2 } from '@/core/vec';

/**
 * Pure canvas drawing of one creature: body (with skin), evolution traits and eyes.
 * Shared by the arena renderer and the lobby/shop previews, so a skin looks identical
 * everywhere. Everything is in screen pixels.
 */
export interface CreatureArt {
  x: number;
  y: number;
  /** Radius in pixels. */
  r: number;
  dir: Vec2;
  hue: number;
  skin: Skin | null;
  path: readonly BranchId[];
  /** Seconds, for animated details (venom spin, rainbow). */
  time: number;
  boosting?: boolean;
  /** Red danger glow for creatures that can eat the player. */
  threat?: boolean;
  /** Grazer magnet radius in pixels, 0 to skip. */
  magnetPx?: number;
  /** Slightly brighter body for the player's own creature without a skin. */
  self?: boolean;
  /** Per-creature phase so breathing and blinking aren't in lockstep. */
  phase?: number;
  /** Expression: predators grin with teeth, prey look worried. 'none' skips the mouth. */
  mood?: 'neutral' | 'hungry' | 'scared' | 'none';
  /** 0..1, how wide the mouth is open right after a bite. */
  chomp?: number;
}

// Fixed spot layout (unit circle coords + size) so spots don't flicker frame to frame.
const SPOTS: readonly (readonly [number, number, number])[] = [
  [-0.35, -0.4, 0.2],
  [0.4, -0.2, 0.16],
  [-0.1, 0.35, 0.22],
  [0.45, 0.45, 0.12],
  [-0.55, 0.15, 0.12],
  [0.1, -0.1, 0.1],
];
const STARS: readonly (readonly [number, number])[] = [
  [-0.5, -0.3],
  [0.3, -0.55],
  [0.55, 0.1],
  [-0.2, 0.5],
  [0.1, 0.2],
  [-0.6, 0.35],
  [0.4, 0.55],
];

export function drawCreatureArt(ctx: CanvasRenderingContext2D, a: CreatureArt): void {
  const { x, dir, path, time } = a;
  const y = a.y;
  const phase = a.phase ?? 0;
  // Breathing: a slow, slight swell so creatures never look like static stickers.
  const r = a.r * (1 + 0.025 * Math.sin(time * 2.4 + phase * 1.7));
  const has = (id: BranchId): boolean => path.includes(id);
  const skin = a.skin;
  const plain = `hsl(${String(a.hue)} 70% ${a.self ? '60' : '52'}%)`;
  const edge = skin?.edge ?? `hsl(${String(a.hue)} 70% 32%)`;
  const accentHue = skin?.style.kind === 'rainbow' ? (time * 90) % 360 : a.hue;

  // Glow: threat (red), titan (own colour) or the shadow skin's aura.
  if (a.threat || has('titan') || skin?.style.kind === 'outline') {
    ctx.shadowBlur = Math.min(40, r * 0.6);
    ctx.shadowColor = a.threat
      ? 'rgba(255,70,90,0.9)'
      : skin?.style.kind === 'outline'
        ? skin.style.glow
        : `hsl(${String(accentHue)} 90% 60%)`;
  }

  // Boost: speed lines and a soft ghost behind, then the body is drawn stretched along the
  // direction of travel (cartoon "dash" squash and stretch).
  const boosting = a.boosting === true;
  if (boosting) {
    drawSpeedLines(ctx, x, y, r, dir, time);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = skin ? edge : plain;
    ctx.beginPath();
    ctx.arc(x - dir.x * r * 0.7, y - dir.y * r * 0.7, r * 0.86, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    const angle = Math.atan2(dir.y, dir.x);
    const wobble = 1 + Math.sin(time * 30) * 0.015;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1.13 * wobble, 0.9 / wobble);
    ctx.rotate(-angle);
    ctx.translate(-x, -y);
  }

  // Swift fins.
  if (has('swift')) {
    const back = { x: -dir.x, y: -dir.y };
    const side = { x: -dir.y, y: dir.x };
    ctx.fillStyle = edge;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side.x * r * 0.55 * sign, y + side.y * r * 0.55 * sign);
      ctx.lineTo(
        x + back.x * r * 1.55 + side.x * r * 0.75 * sign,
        y + back.y * r * 1.55 + side.y * r * 0.75 * sign,
      );
      ctx.lineTo(x + back.x * r * 0.4, y + back.y * r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Venom spikes: shorter and fewer than before, matching the toned-down effect.
  if (has('venom')) {
    ctx.fillStyle = `hsl(${String((accentHue + 120) % 360)} 85% 55%)`;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + time * 0.6;
      const ax = Math.cos(ang);
      const ay = Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(x + ax * r * 0.9 - ay * r * 0.11, y + ay * r * 0.9 + ax * r * 0.11);
      ctx.lineTo(x + ax * r * 1.2, y + ay * r * 1.2);
      ctx.lineTo(x + ax * r * 0.9 + ay * r * 0.11, y + ay * r * 0.9 - ax * r * 0.11);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Body.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = skin ? bodyFill(ctx, skin, x, y, r, time) : plain;
  ctx.fill();
  ctx.shadowBlur = 0;
  if (skin) drawPattern(ctx, skin, x, y, r, time);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, r * (has('bulk') ? 0.16 : 0.08));
  ctx.strokeStyle = skin?.style.kind === 'rainbow' ? `hsl(${String(accentHue)} 80% 45%)` : edge;
  ctx.stroke();

  // Armor ring.
  if (has('armor')) {
    ctx.strokeStyle = 'rgba(220,230,255,0.75)';
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.setLineDash([r * 0.3, r * 0.15]);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Grazer halo.
  if (has('grazer') && a.magnetPx) {
    ctx.strokeStyle = `hsla(${String(accentHue)}, 80%, 70%, 0.25)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(x, y, r + a.magnetPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Apex crown.
  if (has('apex')) {
    ctx.fillStyle = '#ffd34d';
    const cy = y - r * 0.95;
    const w = r * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - w, cy + w * 0.5);
    ctx.lineTo(x - w * 0.6, cy - w * 0.4);
    ctx.lineTo(x - w * 0.2, cy + w * 0.1);
    ctx.lineTo(x, cy - w * 0.6);
    ctx.lineTo(x + w * 0.2, cy + w * 0.1);
    ctx.lineTo(x + w * 0.6, cy - w * 0.4);
    ctx.lineTo(x + w, cy + w * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // Eyes. Prey open them wide, predators narrow them under angry brows.
  const hunter = has('hunter');
  const mood = a.mood ?? 'neutral';
  const eyeOff = r * 0.38;
  const eyeR = Math.max(1.5, r * (hunter ? 0.2 : mood === 'scared' ? 0.19 : 0.16));
  const sx = -dir.y;
  const sy = dir.x;
  const blink = (time * 0.41 + phase * 0.73) % 3.9 < 0.1;
  for (const sign of [-1, 1]) {
    const ex = x + dir.x * eyeOff + sx * eyeOff * 0.75 * sign;
    const ey = y + dir.y * eyeOff + sy * eyeOff * 0.75 * sign;
    if (blink) {
      ctx.strokeStyle = '#101418';
      ctx.lineWidth = Math.max(1, eyeR * 0.35);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - sx * eyeR, ey - sy * eyeR);
      ctx.lineTo(ex + sx * eyeR, ey + sy * eyeR);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hunter ? '#ff3b3b' : '#101418';
    ctx.beginPath();
    const pupil = mood === 'scared' ? 0.38 : 0.5;
    if (hunter) {
      ctx.ellipse(
        ex + dir.x * eyeR * 0.35,
        ey + dir.y * eyeR * 0.35,
        eyeR * 0.25,
        eyeR * 0.6,
        Math.atan2(dir.y, dir.x),
        0,
        Math.PI * 2,
      );
    } else {
      ctx.arc(ex + dir.x * eyeR * 0.35, ey + dir.y * eyeR * 0.35, eyeR * pupil, 0, Math.PI * 2);
    }
    ctx.fill();
    if (mood === 'hungry') {
      // Angry brow: a short slanted line over the eye, dropping toward the nose.
      ctx.strokeStyle = '#101418';
      ctx.lineWidth = Math.max(1, eyeR * 0.3);
      ctx.lineCap = 'round';
      const bx = ex + dir.x * eyeR * 0.3;
      const by = ey + dir.y * eyeR * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx + sx * eyeR * 1.1 * sign, by + sy * eyeR * 1.1 * sign);
      ctx.lineTo(
        bx - sx * eyeR * 0.2 * sign + dir.x * eyeR * 0.55,
        by - sy * eyeR * 0.2 * sign + dir.y * eyeR * 0.55,
      );
      ctx.stroke();
    }
  }

  if (mood !== 'none') drawMouth(ctx, x, y, r, dir, mood, a.chomp ?? 0, edge);

  if (boosting) {
    ctx.restore();
    drawBowWave(ctx, x, y, r, dir, time);
  }
}

/**
 * Mouth on the leading edge, just past the eyes. Neutral is a small smile, prey show a
 * worried "o", predators a toothy grin; any of them opens wide for a moment after a bite.
 */
function drawMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dir: Vec2,
  mood: 'neutral' | 'hungry' | 'scared',
  chomp: number,
  edge: string,
): void {
  const mx = x + dir.x * r * 0.7;
  const my = y + dir.y * r * 0.7;
  const angle = Math.atan2(dir.y, dir.x);
  const dark = '#2a0a16';
  if (chomp > 0.02) {
    // Open maw with a tongue, scaled by how fresh the bite is.
    const open = 0.08 + 0.2 * chomp;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(mx, my, r * open, r * 0.3, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b9a';
    ctx.beginPath();
    ctx.ellipse(
      mx - dir.x * r * open * 0.3,
      my - dir.y * r * open * 0.3,
      r * open * 0.5,
      r * 0.16,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    return;
  }
  if (mood === 'hungry') {
    // Grin: dark slit with a row of teeth along the upper lip.
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(mx, my, r * 0.11, r * 0.32, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    const sx = -dir.y;
    const sy = dir.x;
    for (let i = -1; i <= 1; i++) {
      const tx = mx + sx * r * 0.2 * i - dir.x * r * 0.1;
      const ty = my + sy * r * 0.2 * i - dir.y * r * 0.1;
      ctx.beginPath();
      ctx.moveTo(tx + sx * r * 0.06, ty + sy * r * 0.06);
      ctx.lineTo(tx - sx * r * 0.06, ty - sy * r * 0.06);
      ctx.lineTo(tx + dir.x * r * 0.14, ty + dir.y * r * 0.14);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (mood === 'scared') {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1, r * 0.09), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Neutral: a short closed mouth across the direction of travel. Symmetric on purpose, so
  // it never reads as an eyebrow whichever way the creature faces.
  const sx = -dir.y;
  const sy = dir.x;
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(mx + sx * r * 0.14, my + sy * r * 0.14);
  ctx.lineTo(mx - sx * r * 0.14, my - sy * r * 0.14);
  ctx.stroke();
}

/** Animated streaks trailing behind a boosting creature. */
function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dir: Vec2,
  time: number,
): void {
  const side = { x: -dir.y, y: dir.x };
  ctx.lineCap = 'round';
  // White reads on every skin and on the dark arena.
  ctx.strokeStyle = '#ffffff';
  const lanes = [-0.62, -0.3, 0, 0.3, 0.62];
  lanes.forEach((lane, i) => {
    // Each streak slides backwards and loops, at its own phase and speed.
    const phase = (time * (2.2 + i * 0.37) + i * 0.29) % 1;
    const start = r * (0.9 + phase * 0.9);
    const length = r * (0.7 + ((i * 7) % 5) * 0.12) * (1 - phase * 0.6);
    const off = lane * r * (1 - Math.abs(lane) * 0.25);
    const sx = x - dir.x * start + side.x * off;
    const sy = y - dir.y * start + side.y * off;
    ctx.globalAlpha = 0.55 * (1 - phase);
    ctx.lineWidth = Math.max(1.5, r * (0.09 - Math.abs(lane) * 0.05));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - dir.x * length, sy - dir.y * length);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/** Thin pulsing arc in front of the creature, like air being pushed aside. */
function drawBowWave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dir: Vec2,
  time: number,
): void {
  const angle = Math.atan2(dir.y, dir.x);
  const pulse = (time * 3) % 1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ffffff';
  for (let k = 0; k < 2; k++) {
    const p = (pulse + k * 0.5) % 1;
    ctx.globalAlpha = 0.45 * (1 - p);
    ctx.lineWidth = Math.max(1.5, r * 0.07 * (1 - p * 0.5));
    ctx.beginPath();
    ctx.arc(x, y, r * (1.18 + p * 0.35), angle - 0.75 + p * 0.2, angle + 0.75 - p * 0.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function bodyFill(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  x: number,
  y: number,
  r: number,
  time: number,
): string | CanvasGradient {
  const s = skin.style;
  switch (s.kind) {
    case 'solid':
      return s.color;
    case 'stripes':
      return s.base;
    case 'spots':
      return s.base;
    case 'outline':
      return s.fill;
    case 'gradient':
    case 'stars': {
      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, s.from);
      g.addColorStop(1, s.to);
      return g;
    }
    case 'rainbow': {
      const h = (time * 90) % 360;
      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, `hsl(${String(h)} 90% 62%)`);
      g.addColorStop(0.5, `hsl(${String((h + 120) % 360)} 90% 62%)`);
      g.addColorStop(1, `hsl(${String((h + 240) % 360)} 90% 62%)`);
      return g;
    }
  }
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  x: number,
  y: number,
  r: number,
  time: number,
): void {
  const s = skin.style;
  const patterned = s.kind === 'stripes' || s.kind === 'spots' || s.kind === 'stars';
  if (!patterned && skin.id !== 'gold') return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (s.kind === 'stripes') {
    ctx.strokeStyle = s.stripe;
    ctx.lineWidth = r * 0.22;
    for (let i = -3; i <= 3; i++) {
      const o = i * r * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - r + o, y - r);
      ctx.lineTo(x + r + o, y + r);
      ctx.stroke();
    }
  } else if (s.kind === 'spots') {
    ctx.fillStyle = s.spot;
    for (const [dx, dy, sr] of SPOTS) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, sr * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (s.kind === 'stars') {
    STARS.forEach(([dx, dy], i) => {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time * 3 + i * 1.7);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, Math.max(0.8, r * 0.05), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  } else if (skin.id === 'gold') {
    // Moving shine band.
    // The band sweeps from -0.5 to 1.5 so it fully enters and leaves; stops must stay in [0, 1].
    const t = ((time * 0.6) % 2) - 0.5;
    if (t > -0.15 && t < 1.15) {
      const unit = (v: number): number => Math.min(1, Math.max(0, v));
      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(unit(t - 0.15), 'rgba(255,255,255,0)');
      g.addColorStop(unit(t), 'rgba(255,255,255,0.55)');
      g.addColorStop(unit(t + 0.15), 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}
