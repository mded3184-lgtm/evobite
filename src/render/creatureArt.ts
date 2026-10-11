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
  const { x, y, r, dir, path, time } = a;
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

  // Boost afterimages.
  if (a.boosting) {
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.12 * (4 - i);
      ctx.fillStyle = skin ? edge : plain;
      ctx.beginPath();
      ctx.arc(
        x - dir.x * r * 0.55 * i,
        y - dir.y * r * 0.55 * i,
        r * (1 - i * 0.12),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

  // Eyes.
  const hunter = has('hunter');
  const eyeOff = r * 0.38;
  const eyeR = Math.max(1.5, r * (hunter ? 0.2 : 0.16));
  const sx = -dir.y;
  const sy = dir.x;
  for (const sign of [-1, 1]) {
    const ex = x + dir.x * eyeOff + sx * eyeOff * 0.75 * sign;
    const ey = y + dir.y * eyeOff + sy * eyeOff * 0.75 * sign;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hunter ? '#ff3b3b' : '#101418';
    ctx.beginPath();
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
      ctx.arc(ex + dir.x * eyeR * 0.35, ey + dir.y * eyeR * 0.35, eyeR * 0.5, 0, Math.PI * 2);
    }
    ctx.fill();
  }
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
