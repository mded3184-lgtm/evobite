import { CONFIG } from '@/config';
import type { Vec2 } from '@/core/vec';
import type { Game } from '@/game/game';
import type { Creature, Orb } from '@/game/types';
import { canEat } from '@/game/systems/eating';
import { getSkin } from '@/game/skins';
import { t } from '@/i18n';
import { Camera } from './camera';
import { drawCreatureArt } from './creatureArt';
import { Particles } from './particles';

/** Background camera in the lobby zooms as if following a creature of at most this mass. */
const MENU_ZOOM_MASS = 150;
/** Camera pulls out by this factor while the player boosts, to sell the speed. */
const BOOST_ZOOM_KICK = 1.08;
/** Orb hues are quantized to this many buckets so orbs can be drawn in a few batched fills. */
export const ORB_HUE_BUCKETS = 12;
const GRID = 'rgba(255,255,255,0.035)';
const FONT = "'Nunito Variable', 'Nunito', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
/** Nebula tile size in world units; it repeats, so blobs are drawn wrapped at the edges. */
const TILE = 1400;
/** The nebula scrolls slower than the arena, which reads as depth. */
const PARALLAX = 0.4;
/** Nebula tile size in pixels; one tile spans TILE world units on screen. */
const TILE_PX = 512;
/** Orb sprite size in device pixels; big enough for the largest orb glow at DPR 2. */
const ORB_SPRITE_PX = 128;
/** Glow radius as a multiple of the orb's body radius. */
const ORB_GLOW = 2.3;

interface Shake {
  time: number;
  duration: number;
  amplitude: number;
}

interface FloatingText {
  pos: Vec2;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Ring {
  /** Follows a creature while it lives, else stays where it was spawned. */
  follow: Creature | null;
  pos: Vec2;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  width: number;
}

/** 0..1 size factor: a quick overshooting pop on spawn, a shrink over the last second. */
function orbLifeScale(orb: Orb, time: number): number {
  const age = time - orb.bornAt;
  const left = orb.expiresAt - time;
  let k = 1;
  if (age < 0.35) {
    const t = Math.max(0, age / 0.35);
    k = t < 0.7 ? (t / 0.7) * 1.15 : 1.15 - ((t - 0.7) / 0.3) * 0.15;
  }
  if (left < 1) k *= Math.max(0, left);
  return k;
}

/**
 * Canvas 2D renderer. Everything is vector-drawn, so the whole game ships without a single
 * image asset and looks crisp at any DPI.
 */
export class Renderer {
  readonly camera = new Camera();
  readonly particles: Particles;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  /**
   * The background (colour, parallax nebula, vignette) lives in DOM layers behind the
   * transparent canvas. Moving them is a compositor transform, so the background costs no
   * canvas pixels at all: painting it into the canvas every frame halved the frame rate on
   * machines without GPU rasterization.
   */
  private readonly backdrop: HTMLDivElement;
  private readonly nebula: HTMLDivElement;
  private nebulaScale = 0;
  /** Pre-rendered glowing orb per hue bucket, so each orb is one cheap blit. */
  private readonly orbSprites: HTMLCanvasElement[] = [];
  /**
   * Auto quality: when frames stay slow for a couple of seconds, drop to 1x resolution and
   * flat orbs. One-way for the session, so the picture never flickers between modes.
   */
  private lowQuality = false;
  private frameEma = 1000 / 60;
  private lastDrawAt = 0;
  private slowMs = 0;
  private pulse = 0;
  private shake: Shake = { time: 0, duration: 0, amplitude: 0 };
  /** Camera zoom-in punch, 1 right after a kill, decaying to 0. */
  private punch = 0;
  private flash = { alpha: 0, color: '#ffffff' };
  private readonly texts: FloatingText[] = [];
  private readonly rings: Ring[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.particles = new Particles(game.world.rng);
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'backdrop';
    this.nebula = document.createElement('div');
    this.nebula.className = 'backdrop-nebula';
    const tile = this.makeNebulaTile();
    if (tile) this.nebula.style.backgroundImage = `url(${tile.toDataURL()})`;
    const vignette = document.createElement('div');
    vignette.className = 'backdrop-vignette';
    this.backdrop.append(this.nebula, vignette);
    canvas.parentElement?.insertBefore(this.backdrop, canvas);
    this.makeOrbSprites();
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
    });

    game.world.events.on('orbEaten', ({ eater, orb }) => {
      if (this.isVisible(orb.pos)) this.particles.burst(orb.pos, orb.hue, 4, 90, orb.radius * 0.5);
      if (eater.kind !== 'player') return;
      this.pulse = Math.min(1, this.pulse + 0.15);
      if (orb.mass >= CONFIG.orbs.bigMass) {
        this.float(orb.pos, `+${String(Math.round(orb.mass * eater.stats.foodMult))}`, '#ffd34d');
      }
    });
    game.world.events.on('creatureEaten', ({ eater, prey, revenge }) => {
      const world = this.game.world;
      const preyR = world.radiusFor(prey.mass);
      if (this.isVisible(prey.pos)) {
        this.particles.burst(prey.pos, prey.hue, 26, 260, preyR * 0.25);
        this.ring(null, prey.pos, preyR * 0.6, `hsl(${String(prey.hue)} 90% 70%)`, 0.35, 4);
      }
      if (eater.kind !== 'player') return;
      const gained = Math.round(
        prey.mass * CONFIG.creature.absorbFraction * eater.stats.absorbMult +
          (revenge ? prey.mass * CONFIG.revenge.bonusMass : 0),
      );
      this.float(eater.pos, `+${String(gained)}`, revenge ? '#ff4d6d' : '#9dffb0', 1.2);
      // Bigger meal, bigger thump.
      const size = Math.min(1, prey.mass / Math.max(1, eater.mass));
      this.shakeScreen(5 + size * 12, 0.22 + size * 0.15);
      this.punch = 1;
    });
    game.world.events.on('playerDied', ({ killer }) => {
      this.shakeScreen(18, 0.45);
      this.flash = { alpha: 0.35, color: '#ff4d6d' };
      const p = this.game.world.player;
      if (p) this.ring(killer, p.pos, this.game.world.radiusFor(killer.mass), '#ff4d6d', 0.5, 6);
    });
    game.world.events.on('evolved', ({ creature }) => {
      if (creature.kind !== 'player') return;
      const r = this.game.world.radiusFor(creature.mass);
      this.particles.burst(creature.pos, creature.hue, 60, 420, r * 0.3);
      const color = `hsl(${String(creature.hue)} 90% 70%)`;
      this.ring(creature, creature.pos, r, color, 0.7, 6);
      this.ring(creature, creature.pos, r, '#ffffff', 0.9, 3);
      this.flash = { alpha: 0.4, color: '#ffffff' };
      this.shakeScreen(6, 0.3);
    });
  }

  resize(): void {
    this.dpr = Math.min(this.lowQuality ? 1 : 2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.camera.resize(w, h);
    this.nebulaScale = 0; // force a backdrop resize
  }

  screenToWorld(p: Vec2): Vec2 {
    return this.camera.screenToWorld(p);
  }

  /** Nudge the camera; strength in screen pixels, decaying over `duration` seconds. */
  shakeScreen(amplitude: number, duration: number): void {
    if (amplitude < this.shake.amplitude * (1 - this.shake.time / this.shake.duration)) return;
    this.shake = { time: 0, duration, amplitude };
  }

  private float(at: Vec2, text: string, color: string, life = 0.9): void {
    this.texts.push({ pos: { x: at.x, y: at.y }, text, color, life, maxLife: life });
  }

  private ring(
    follow: Creature | null,
    at: Vec2,
    radius: number,
    color: string,
    life: number,
    width: number,
  ): void {
    this.rings.push({
      follow,
      pos: { x: at.x, y: at.y },
      radius,
      color,
      life,
      maxLife: life,
      width,
    });
  }

  update(dt: number): void {
    const world = this.game.world;
    const p = world.player;
    const punchZoom = 1 - this.punch * 0.05;
    if (p?.alive) {
      const kick = (world.isBoosting(p) ? BOOST_ZOOM_KICK : 1) * punchZoom;
      this.camera.follow(p.pos, p.mass, dt, false, kick);
    } else if (p) {
      // Kill cam: watch the killer, but keep the zoom you died with. Following a giant's zoom
      // would pull the camera out over the whole arena and redraw every orb each frame.
      const killer = p.lastKillerId === null ? undefined : world.creatures.get(p.lastKillerId);
      this.camera.follow(killer?.alive ? killer.pos : p.pos, p.mass, dt);
    } else {
      const leader = world.leaderboard(1)[0];
      if (leader) this.camera.follow(leader.pos, Math.min(leader.mass, MENU_ZOOM_MASS), dt);
    }
    this.emitBoostTrails(dt);
    this.particles.update(dt);
    this.pulse = Math.max(0, this.pulse - dt * 1.5);
    this.punch = Math.max(0, this.punch - dt * 4);
    this.shake.time += dt;
    this.flash.alpha = Math.max(0, this.flash.alpha - dt * 1.6);
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const ft = this.texts[i];
      if (!ft) continue;
      ft.life -= dt;
      ft.pos.y -= 55 * dt;
      if (ft.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      if (!ring) continue;
      ring.life -= dt;
      if (ring.follow?.alive) {
        ring.pos.x = ring.follow.pos.x;
        ring.pos.y = ring.follow.pos.y;
      }
      if (ring.life <= 0) this.rings.splice(i, 1);
    }
  }

  private trailAcc = 0;

  /** Sparks from the tails of visible boosting creatures, more for the player. */
  private emitBoostTrails(dt: number): void {
    if (dt <= 0) return;
    this.trailAcc += dt;
    const step = 1 / 40;
    if (this.trailAcc < step) return;
    const ticks = Math.min(4, Math.floor(this.trailAcc / step));
    this.trailAcc -= ticks * step;
    const world = this.game.world;
    for (const c of world.creatures.values()) {
      if (!c.alive || !world.isBoosting(c) || !this.isVisible(c.pos)) continue;
      const r = world.radiusFor(c.mass);
      const count = ticks * (c.kind === 'player' ? 2 : 1);
      for (let i = 0; i < count; i++) {
        this.particles.trail(
          { x: c.pos.x - c.dir.x * r * 0.9, y: c.pos.y - c.dir.y * r * 0.9 },
          c.dir,
          c.hue,
          Math.max(2.5, r * 0.12),
        );
      }
    }
  }

  snapToPlayer(): void {
    const p = this.game.world.player;
    if (p) this.camera.follow(p.pos, p.mass, 0, true);
  }

  /** True once the renderer has switched itself to the cheaper mode. */
  get isLowQuality(): boolean {
    return this.lowQuality;
  }

  private trackFrameTime(): void {
    const now = performance.now();
    const gap = now - this.lastDrawAt;
    this.lastDrawAt = now;
    // Ignore long gaps: tab switches, ads and manual stepping are not slow frames.
    if (gap <= 0 || gap > 250 || this.lowQuality) return;
    this.frameEma += (gap - this.frameEma) * 0.05;
    this.slowMs = this.frameEma > 24 ? this.slowMs + gap : 0;
    if (this.slowMs > 2000) {
      this.lowQuality = true;
      this.resize();
    }
  }

  draw(): void {
    this.trackFrameTime();
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cam.width, cam.height);
    this.updateBackdrop();

    // Screen shake: offset everything drawn in world space, not the HUD.
    const sh = this.shake;
    if (sh.time < sh.duration) {
      const k = sh.amplitude * (1 - sh.time / sh.duration);
      const tm = this.game.world.time + sh.time;
      ctx.translate(Math.sin(tm * 61) * k, Math.cos(tm * 47) * k);
    }

    this.drawGrid();
    this.drawArena();
    this.drawOrbs();
    this.drawCreatures();
    this.drawRings();
    this.particles.draw(ctx, (p) => cam.worldToScreen(p), cam.scale);
    this.drawTexts();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.flash.alpha > 0) {
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, cam.width, cam.height);
      ctx.globalAlpha = 1;
    }
  }

  private isVisible(p: Vec2): boolean {
    const half = this.camera.visibleHalf();
    return Math.abs(p.x - this.camera.pos.x) < half.x && Math.abs(p.y - this.camera.pos.y) < half.y;
  }

  /**
   * One repeating tile of soft coloured clouds and tiny drifting specks, drawn once.
   * Blobs near an edge are drawn again on the opposite side so the tile wraps seamlessly.
   */
  private makeNebulaTile(): HTMLCanvasElement | null {
    const size = TILE_PX;
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const c = tile.getContext('2d');
    if (!c) return null;
    const rng = this.game.world.rng;
    const palette = [
      [240, 70, 55],
      [195, 80, 50],
      [300, 60, 50],
      [160, 70, 45],
      [220, 80, 60],
    ];
    for (let i = 0; i < 9; i++) {
      const x = rng.range(0, size);
      const y = rng.range(0, size);
      const r = rng.range(90, 200);
      const [h, s, l] = palette[i % palette.length] ?? [240, 70, 55];
      const a = rng.range(0.07, 0.13);
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, `hsla(${String(h)}, ${String(s)}%, ${String(l)}%, ${String(a)})`);
          g.addColorStop(1, `hsla(${String(h)}, ${String(s)}%, ${String(l)}%, 0)`);
          c.fillStyle = g;
          c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    // Specks of plankton: far away, so they stay small and soft.
    for (let i = 0; i < 110; i++) {
      const x = rng.range(0, size);
      const y = rng.range(0, size);
      c.globalAlpha = rng.range(0.15, 0.5);
      c.fillStyle = rng.chance(0.3) ? '#9fe8ff' : '#ffffff';
      c.beginPath();
      c.arc(x, y, rng.range(0.6, 1.8), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    return tile;
  }

  /**
   * Moves the nebula layer for parallax. Only the transform changes per frame; the layer
   * is resized (a repaint) only when the zoom has drifted noticeably.
   */
  private updateBackdrop(): void {
    const cam = this.camera;
    const k = (cam.scale * TILE) / TILE_PX; // css px per tile px
    if (Math.abs(k - this.nebulaScale) > this.nebulaScale * 0.04) {
      this.nebulaScale = k;
      const tileCss = TILE_PX * k;
      this.nebula.style.backgroundSize = `${String(tileCss)}px ${String(tileCss)}px`;
      this.nebula.style.width = `${String(cam.width + tileCss * 2)}px`;
      this.nebula.style.height = `${String(cam.height + tileCss * 2)}px`;
    }
    const tileCss = TILE_PX * this.nebulaScale;
    const ox = cam.width / 2 - cam.pos.x * PARALLAX * cam.scale;
    const oy = cam.height / 2 - cam.pos.y * PARALLAX * cam.scale;
    const x = (((ox % tileCss) + tileCss) % tileCss) - tileCss;
    const y = (((oy % tileCss) + tileCss) % tileCss) - tileCss;
    this.nebula.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }

  /** A soft glow and a solid core per hue bucket, baked once. */
  private makeOrbSprites(): void {
    const size = ORB_SPRITE_PX;
    const half = size / 2;
    const core = half / ORB_GLOW;
    for (let b = 0; b < ORB_HUE_BUCKETS; b++) {
      const hue = (b * 360) / ORB_HUE_BUCKETS;
      const sprite = document.createElement('canvas');
      sprite.width = size;
      sprite.height = size;
      const c = sprite.getContext('2d');
      if (c) {
        const g = c.createRadialGradient(half, half, core * 0.6, half, half, half);
        g.addColorStop(0, `hsla(${String(hue)}, 90%, 65%, 0.35)`);
        g.addColorStop(1, `hsla(${String(hue)}, 90%, 65%, 0)`);
        c.fillStyle = g;
        c.fillRect(0, 0, size, size);
        c.fillStyle = `hsl(${String(hue)} 85% 66%)`;
        c.beginPath();
        c.arc(half, half, core, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath();
        c.arc(half - core * 0.3, half - core * 0.3, core * 0.35, 0, Math.PI * 2);
        c.fill();
      }
      this.orbSprites.push(sprite);
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const step = 140;
    const s = cam.scale;
    const half = cam.visibleHalf(0);
    const x0 = Math.floor((cam.pos.x - half.x) / step) * step;
    const y0 = Math.floor((cam.pos.y - half.y) / step) * step;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= cam.pos.x + half.x; x += step) {
      const sx = (x - cam.pos.x) * s + cam.width / 2;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, cam.height);
    }
    for (let y = y0; y <= cam.pos.y + half.y; y += step) {
      const sy = (y - cam.pos.y) * s + cam.height / 2;
      ctx.moveTo(0, sy);
      ctx.lineTo(cam.width, sy);
    }
    ctx.stroke();
  }

  /** Darkens everything beyond the wall and draws the wall as a soft red glow band. */
  private drawArena(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const c = cam.worldToScreen({ x: 0, y: 0 });
    const r = CONFIG.arena.radius * cam.scale;
    // Skip everything while the whole screen is inside the arena, which is most of the time:
    // the outside fill covers the full screen, so it must only run when the wall is in view.
    const halfDiagonal = Math.hypot(cam.width, cam.height) / 2;
    const glow = 34 * cam.scale;
    if (Math.hypot(c.x - cam.width / 2, c.y - cam.height / 2) + halfDiagonal > r - glow) {
      ctx.fillStyle = 'rgba(2, 4, 12, 0.6)';
      ctx.beginPath();
      ctx.rect(0, 0, cam.width, cam.height);
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      const bands: [number, number][] = [
        [34, 0.08],
        [16, 0.18],
        [6, 0.7],
      ];
      for (const [w, a] of bands) {
        ctx.strokeStyle = `rgba(255, 80, 120, ${String(a)})`;
        ctx.lineWidth = Math.max(2, w * cam.scale);
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawOrbs(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const s = cam.scale;
    const half = cam.visibleHalf(20);
    const time = this.game.world.time;
    if (this.lowQuality) {
      this.drawFlatOrbs();
      return;
    }
    for (const orb of this.game.world.orbs) {
      if (!orb.alive) continue;
      if (Math.abs(orb.pos.x - cam.pos.x) > half.x || Math.abs(orb.pos.y - cam.pos.y) > half.y) {
        continue;
      }
      const sprite = this.orbSprites[Math.floor(((orb.hue % 360) / 360) * ORB_HUE_BUCKETS)];
      if (!sprite) continue;
      const p = cam.worldToScreen(orb.pos);
      // Gentle pulse, each orb on its own phase, so the food looks alive; pops in when it
      // appears and shrinks away in its last second.
      const pulse = 1 + 0.1 * Math.sin(time * 2.6 + orb.id * 0.9);
      const life = orbLifeScale(orb, time);
      if (life <= 0.02) continue;
      const g = Math.max(1.5, orb.radius * s * pulse * life) * ORB_GLOW;
      ctx.drawImage(sprite, p.x - g, p.y - g, g * 2, g * 2);
    }
  }

  /** Low-quality orbs: no glow, one batched path per colour, about 12 fills per frame. */
  private drawFlatOrbs(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const s = cam.scale;
    const half = cam.visibleHalf(20);
    const cores: Path2D[] = [];
    for (const orb of this.game.world.orbs) {
      if (!orb.alive) continue;
      if (Math.abs(orb.pos.x - cam.pos.x) > half.x || Math.abs(orb.pos.y - cam.pos.y) > half.y) {
        continue;
      }
      const bucket = Math.floor(((orb.hue % 360) / 360) * ORB_HUE_BUCKETS);
      const core = (cores[bucket] ??= new Path2D());
      const p = cam.worldToScreen(orb.pos);
      const r = Math.max(1.5, orb.radius * s * orbLifeScale(orb, this.game.world.time));
      core.moveTo(p.x + r, p.y);
      core.arc(p.x, p.y, r, 0, Math.PI * 2);
    }
    cores.forEach((path, bucket) => {
      ctx.fillStyle = `hsl(${String((bucket * 360) / ORB_HUE_BUCKETS)} 85% 66%)`;
      ctx.fill(path);
    });
  }

  private drawCreatures(): void {
    const world = this.game.world;
    const cam = this.camera;
    const half = cam.visibleHalf(200);
    const player = world.player;
    const revenge = this.game.revengeTarget();

    const list: Creature[] = [];
    for (const c of world.creatures.values()) {
      if (!c.alive) continue;
      if (Math.abs(c.pos.x - cam.pos.x) > half.x || Math.abs(c.pos.y - cam.pos.y) > half.y)
        continue;
      list.push(c);
    }
    // Small on top of big so prey is never hidden under a predator.
    list.sort((a, b) => b.mass - a.mass);

    for (const c of list) {
      let relation: 'self' | 'prey' | 'threat' | 'neutral' = 'neutral';
      if (player?.alive) {
        if (c.id === player.id) relation = 'self';
        else if (canEat(player, c)) relation = 'prey';
        else if (canEat(c, player)) relation = 'threat';
      }
      this.drawCreature(c, relation, revenge?.id === c.id);
    }
  }

  private drawCreature(
    c: Creature,
    relation: 'self' | 'prey' | 'threat' | 'neutral',
    isRevenge: boolean,
  ): void {
    const ctx = this.ctx;
    const world = this.game.world;
    const cam = this.camera;
    const s = cam.scale;
    const p = cam.worldToScreen(c.pos);
    const r = world.radiusFor(c.mass) * s;
    const shieldLeft = c.invulnUntil - world.time;
    const chomp = Math.max(0, 1 - (world.time - c.lastAteAt) / 0.3);

    drawCreatureArt(ctx, {
      x: p.x,
      y: p.y,
      r,
      dir: c.dir,
      hue: c.hue,
      skin: getSkin(c.skin),
      path: c.path,
      time: world.time,
      boosting: world.isBoosting(c),
      threat: relation === 'threat',
      magnetPx: c.stats.magnetRadius * s,
      self: relation === 'self',
      phase: c.id,
      mood: relation === 'threat' ? 'hungry' : relation === 'prey' ? 'scared' : 'neutral',
      chomp,
    });

    if (shieldLeft > 0) {
      // Spawn shield: a soft bubble, blinking faster as it runs out.
      const fading = shieldLeft < 2 && Math.sin(world.time * 14) < 0;
      if (!fading) {
        const br = r + Math.max(5, r * 0.22);
        ctx.fillStyle = 'rgba(120, 220, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 230, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, br, world.time * 2, world.time * 2 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (relation === 'self') {
        this.label(
          p.x,
          p.y - r - 24,
          t('arena.shield', { s: Math.ceil(shieldLeft) }),
          '#a0e6ff',
          13,
          true,
        );
      }
    }

    if (isRevenge) {
      ctx.strokeStyle = '#ff4d6d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      this.label(p.x, p.y - r - 26, t('arena.revenge'), '#ff4d6d', 13, true);
    }

    // Name + mass. Hide tiny far-away labels, and all labels behind the lobby, to reduce clutter.
    if (r >= 9 && this.game.phase !== 'menu') {
      const size = Math.max(11, Math.min(22, r * 0.32));
      this.label(
        p.x,
        p.y + r + size * 0.9,
        c.name,
        relation === 'prey' ? '#9dffb0' : relation === 'threat' ? '#ff9aa8' : '#e8ecf3',
        size,
        relation === 'self',
      );
    }
  }

  private drawRings(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    for (const ring of this.rings) {
      const k = 1 - ring.life / ring.maxLife;
      const p = cam.worldToScreen(ring.pos);
      const r = ring.radius * cam.scale * (1 + k * 2.2);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = Math.max(1.5, ring.width * (1 - k));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawTexts(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    for (const ft of this.texts) {
      const k = ft.life / ft.maxLife;
      const p = cam.worldToScreen(ft.pos);
      ctx.globalAlpha = Math.min(1, k * 2);
      const size = 18 + (1 - k) * 4;
      this.label(p.x, p.y - 20, ft.text, ft.color, size, true);
    }
    ctx.globalAlpha = 1;
  }

  private label(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    bold: boolean,
  ): void {
    const ctx = this.ctx;
    ctx.font = `${bold ? '800' : '600'} ${String(size)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}
