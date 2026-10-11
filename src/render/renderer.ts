import { CONFIG } from '@/config';
import type { Vec2 } from '@/core/vec';
import type { Game } from '@/game/game';
import type { Creature } from '@/game/types';
import { canEat } from '@/game/systems/eating';
import { getSkin } from '@/game/skins';
import { t } from '@/i18n';
import { Camera } from './camera';
import { drawCreatureArt } from './creatureArt';
import { Particles } from './particles';

const BG = '#0b1020';
/** Background camera in the lobby zooms as if following a creature of at most this mass. */
const MENU_ZOOM_MASS = 150;
/** Orb hues are quantized to this many buckets so orbs can be drawn in a few batched fills. */
export const ORB_HUE_BUCKETS = 12;
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
    const p = world.player;
    if (p?.alive) {
      this.camera.follow(p.pos, p.mass, dt);
    } else if (p) {
      // Kill cam: watch the killer, but keep the zoom you died with. Following a giant's zoom
      // would pull the camera out over the whole arena and redraw every orb each frame.
      const killer = p.lastKillerId === null ? undefined : world.creatures.get(p.lastKillerId);
      this.camera.follow(killer?.alive ? killer.pos : p.pos, p.mass, dt);
    } else {
      const leader = world.leaderboard(1)[0];
      if (leader) this.camera.follow(leader.pos, Math.min(leader.mass, MENU_ZOOM_MASS), dt);
    }
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
    // One path per colour bucket: ~12 fill calls per frame instead of one per orb.
    const paths: Path2D[] = [];
    for (const orb of this.game.world.orbs) {
      if (!orb.alive) continue;
      if (Math.abs(orb.pos.x - cam.pos.x) > half.x || Math.abs(orb.pos.y - cam.pos.y) > half.y) {
        continue;
      }
      const bucket = Math.floor(((orb.hue % 360) / 360) * ORB_HUE_BUCKETS);
      const path = (paths[bucket] ??= new Path2D());
      const p = cam.worldToScreen(orb.pos);
      const r = Math.max(1.5, orb.radius * s);
      path.moveTo(p.x + r, p.y);
      path.arc(p.x, p.y, r, 0, Math.PI * 2);
    }
    paths.forEach((path, bucket) => {
      ctx.fillStyle = `hsl(${String((bucket * 360) / ORB_HUE_BUCKETS)} 85% 62%)`;
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
    // Spawn protection shimmer.
    const invuln = c.invulnUntil > world.time;

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
    });

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
      this.label(p.x, p.y - r - 26, t('arena.revenge'), '#ff4d6d', 13, true);
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
