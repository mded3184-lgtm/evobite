import { CONFIG } from '@/config';
import type { Vec2 } from '@/core/vec';
import type { Game } from '@/game/game';
import type { Creature } from '@/game/types';
import { canEat } from '@/game/systems/eating';
import { Camera } from './camera';
import { Particles } from './particles';

const BG = '#0b1020';
const GRID = 'rgba(255,255,255,0.045)';
const WALL = 'rgba(255, 80, 120, 0.55)';

/**
 * Canvas 2D renderer. Everything is vector-drawn, so the whole game ships without a single
 * image asset and looks crisp at any DPI.
 */
export class Renderer {
  readonly camera = new Camera();
  readonly particles: Particles;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.particles = new Particles(game.world.rng);
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
    });

    game.world.events.on('orbEaten', ({ eater, orb }) => {
      if (this.isVisible(orb.pos)) this.particles.burst(orb.pos, orb.hue, 4, 90, orb.radius * 0.5);
      if (eater.kind === 'player') this.pulse = Math.min(1, this.pulse + 0.15);
    });
    game.world.events.on('creatureEaten', ({ prey }) => {
      if (this.isVisible(prey.pos)) {
        this.particles.burst(
          prey.pos,
          prey.hue,
          26,
          260,
          this.game.world.radiusFor(prey.mass) * 0.25,
        );
      }
    });
    game.world.events.on('evolved', ({ creature }) => {
      if (creature.kind === 'player') {
        this.particles.burst(
          creature.pos,
          creature.hue,
          60,
          420,
          this.game.world.radiusFor(creature.mass) * 0.3,
        );
      }
    });
  }

  private pulse = 0;

  resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.camera.resize(w, h);
  }

  screenToWorld(p: Vec2): Vec2 {
    return this.camera.screenToWorld(p);
  }

  update(dt: number): void {
    const world = this.game.world;
    const focus = world.player?.alive ? world.player : world.leaderboard(1)[0];
    if (focus) this.camera.follow(focus.pos, focus.mass, dt);
    this.particles.update(dt);
    this.pulse = Math.max(0, this.pulse - dt * 1.5);
  }

  snapToPlayer(): void {
    const p = this.game.world.player;
    if (p) this.camera.follow(p.pos, p.mass, 0, true);
  }

  draw(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cam.width, cam.height);

    this.drawGrid();
    this.drawArenaWall();
    this.drawOrbs();
    this.drawCreatures();
    this.particles.draw(ctx, (p) => cam.worldToScreen(p), cam.scale);
  }

  private isVisible(p: Vec2): boolean {
    const half = this.camera.visibleHalf();
    return Math.abs(p.x - this.camera.pos.x) < half.x && Math.abs(p.y - this.camera.pos.y) < half.y;
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const step = 120;
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

  private drawArenaWall(): void {
    const ctx = this.ctx;
    const c = this.camera.worldToScreen({ x: 0, y: 0 });
    const r = CONFIG.arena.radius * this.camera.scale;
    ctx.strokeStyle = WALL;
    ctx.lineWidth = Math.max(2, 10 * this.camera.scale);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawOrbs(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const s = cam.scale;
    const half = cam.visibleHalf(20);
    for (const orb of this.game.world.orbs) {
      if (!orb.alive) continue;
      if (Math.abs(orb.pos.x - cam.pos.x) > half.x || Math.abs(orb.pos.y - cam.pos.y) > half.y)
        continue;
      const p = cam.worldToScreen(orb.pos);
      const r = Math.max(1.5, orb.radius * s);
      ctx.fillStyle = `hsl(${String(orb.hue)} 85% 62%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const path = c.path;
    const has = (id: string): boolean => path.includes(id as never);

    const light = relation === 'self' ? 60 : 52;
    const body = `hsl(${String(c.hue)} 70% ${String(light)}%)`;
    const dark = `hsl(${String(c.hue)} 70% 32%)`;

    // Spawn protection shimmer.
    const invuln = c.invulnUntil > world.time;

    // Titan / threat glow.
    if (has('titan') || relation === 'threat') {
      ctx.shadowBlur = Math.min(40, r * 0.6);
      ctx.shadowColor =
        relation === 'threat' ? 'rgba(255,70,90,0.9)' : `hsl(${String(c.hue)} 90% 60%)`;
    }

    // Boost afterimages: fading copies of the body trailing behind.
    if (world.isBoosting(c)) {
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.12 * (4 - i);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(
          p.x - c.dir.x * r * 0.55 * i,
          p.y - c.dir.y * r * 0.55 * i,
          r * (1 - i * 0.12),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Swift fins: two trailing triangles opposite the direction of travel.
    if (has('swift')) {
      const back = { x: -c.dir.x, y: -c.dir.y };
      const side = { x: -c.dir.y, y: c.dir.x };
      ctx.fillStyle = dark;
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(p.x + side.x * r * 0.55 * sign, p.y + side.y * r * 0.55 * sign);
        ctx.lineTo(
          p.x + back.x * r * 1.55 + side.x * r * 0.75 * sign,
          p.y + back.y * r * 1.55 + side.y * r * 0.75 * sign,
        );
        ctx.lineTo(p.x + back.x * r * 0.4, p.y + back.y * r * 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Venom spikes.
    if (has('venom')) {
      ctx.fillStyle = `hsl(${String((c.hue + 120) % 360)} 85% 55%)`;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + world.time * 0.6;
        const ax = Math.cos(a);
        const ay = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(p.x + ax * r * 0.9 - ay * r * 0.12, p.y + ay * r * 0.9 + ax * r * 0.12);
        ctx.lineTo(p.x + ax * r * 1.28, p.y + ay * r * 1.28);
        ctx.lineTo(p.x + ax * r * 0.9 + ay * r * 0.12, p.y + ay * r * 0.9 - ax * r * 0.12);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Body.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = Math.max(1.5, r * (has('bulk') ? 0.16 : 0.08));
    ctx.strokeStyle = dark;
    ctx.stroke();

    // Armor ring.
    if (has('armor')) {
      ctx.strokeStyle = 'rgba(220,230,255,0.75)';
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.setLineDash([r * 0.3, r * 0.15]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Grazer halo: dotted ring at magnet radius.
    if (has('grazer')) {
      ctx.strokeStyle = `hsla(${String(c.hue)}, 80%, 70%, 0.25)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + c.stats.magnetRadius * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Apex crown.
    if (has('apex')) {
      ctx.fillStyle = '#ffd34d';
      const cx = p.x;
      const cy = p.y - r * 0.95;
      const w = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy + w * 0.5);
      ctx.lineTo(cx - w * 0.6, cy - w * 0.4);
      ctx.lineTo(cx - w * 0.2, cy + w * 0.1);
      ctx.lineTo(cx, cy - w * 0.6);
      ctx.lineTo(cx + w * 0.2, cy + w * 0.1);
      ctx.lineTo(cx + w * 0.6, cy - w * 0.4);
      ctx.lineTo(cx + w, cy + w * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Eyes looking along the heading.
    const eyeOff = r * 0.38;
    const eyeR = Math.max(1.5, r * (has('hunter') ? 0.2 : 0.16));
    const fx = c.dir.x;
    const fy = c.dir.y;
    const sx = -fy;
    const sy = fx;
    for (const sign of [-1, 1]) {
      const ex = p.x + fx * eyeOff + sx * eyeOff * 0.75 * sign;
      const ey = p.y + fy * eyeOff + sy * eyeOff * 0.75 * sign;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = has('hunter') ? '#ff3b3b' : '#101418';
      ctx.beginPath();
      if (has('hunter')) {
        ctx.ellipse(
          ex + fx * eyeR * 0.35,
          ey + fy * eyeR * 0.35,
          eyeR * 0.25,
          eyeR * 0.6,
          Math.atan2(fy, fx),
          0,
          Math.PI * 2,
        );
      } else {
        ctx.arc(ex + fx * eyeR * 0.35, ey + fy * eyeR * 0.35, eyeR * 0.5, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    if (invuln) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, world.time * 3, world.time * 3 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (isRevenge) {
      ctx.strokeStyle = '#ff4d6d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      this.label(p.x, p.y - r - 26, 'REVENGE', '#ff4d6d', 13, true);
    }

    // Name + mass. Hide tiny far-away labels to reduce clutter.
    if (r >= 9) {
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

  private label(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    bold: boolean,
  ): void {
    const ctx = this.ctx;
    ctx.font = `${bold ? '700' : '500'} ${String(size)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}
