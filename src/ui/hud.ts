import { CONFIG } from '@/config';
import type { Game } from '@/game/game';
import { formName } from '@/game/evolution/tree';
import { nextThreshold } from '@/game/systems/evolution';
import { buildChipsHtml } from './build';
import { el, must } from './dom';

export interface HudHandlers {
  onPause: () => void;
  onToggleSound: () => void;
}

/**
 * In-game overlay: mass, form, progress to next evolution, rank and the top-5 leaderboard.
 * Updated at ~10 Hz; DOM writes are cheap but not free, and nothing here needs 60 Hz.
 */
export class Hud {
  private readonly root: HTMLElement;
  private readonly mass: HTMLElement;
  private readonly form: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly barLabel: HTMLElement;
  private readonly rank: HTMLElement;
  private readonly board: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly build: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly boostBtn: HTMLButtonElement;
  private accumulator = 0;
  private toastTimer = 0;
  private boostTouch = false;

  constructor(
    container: HTMLElement,
    private readonly game: Game,
    handlers: HudHandlers,
  ) {
    this.root = el('div', 'hud hidden');
    this.root.innerHTML = `
      <div class="hud-left">
        <div class="hud-mass"><span class="hud-mass-value">0</span><span class="hud-mass-unit">mass</span></div>
        <div class="hud-form">Hatchling</div>
        <div class="hud-bar"><div class="hud-bar-fill"></div><div class="hud-bar-label"></div></div>
      </div>
      <div class="hud-right">
        <div class="hud-rank">#–</div>
        <ol class="hud-board"></ol>
      </div>
      <div class="hud-toast"></div>
      <div class="hud-build"></div>
      <div class="hud-controls">
        <button class="hud-btn hud-pause" type="button" aria-label="Pause">❚❚</button>
        <button class="hud-btn hud-sound" type="button" aria-label="Toggle sound">🔊</button>
      </div>
      <button class="hud-boost" type="button" aria-label="Boost">BOOST</button>
    `;
    container.appendChild(this.root);
    this.mass = must('.hud-mass-value', this.root);
    this.form = must('.hud-form', this.root);
    this.bar = must('.hud-bar-fill', this.root);
    this.barLabel = must('.hud-bar-label', this.root);
    this.rank = must('.hud-rank', this.root);
    this.board = must('.hud-board', this.root);
    this.build = must('.hud-build', this.root);
    this.toast = must('.hud-toast', this.root);
    this.soundBtn = must<HTMLButtonElement>('.hud-sound', this.root);
    this.boostBtn = must<HTMLButtonElement>('.hud-boost', this.root);
    must<HTMLButtonElement>('.hud-pause', this.root).addEventListener('click', handlers.onPause);
    this.soundBtn.addEventListener('click', handlers.onToggleSound);

    // Hold-to-boost button for touch screens; a second finger keeps steering on the canvas.
    const press = (e: PointerEvent): void => {
      e.preventDefault();
      this.boostTouch = true;
      this.boostBtn.setPointerCapture(e.pointerId);
    };
    const release = (): void => {
      this.boostTouch = false;
    };
    this.boostBtn.addEventListener('pointerdown', press);
    this.boostBtn.addEventListener('pointerup', release);
    this.boostBtn.addEventListener('pointercancel', release);
    this.boostBtn.addEventListener('lostpointercapture', release);
  }

  /** True while the on-screen boost button is held. */
  get boostHeld(): boolean {
    return this.boostTouch;
  }

  setSoundIcon(muted: boolean): void {
    this.soundBtn.textContent = muted ? '🔇' : '🔊';
  }

  /** Visual state for the boost button (pressed, or unavailable because mass is too low). */
  setBoostState(active: boolean, available: boolean): void {
    this.boostBtn.classList.toggle('active', active);
    this.boostBtn.classList.toggle('disabled', !available);
  }

  show(): void {
    this.root.classList.remove('hidden');
    this.refresh();
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.boostTouch = false;
  }

  announce(text: string, kind: 'good' | 'bad' | 'info' = 'info'): void {
    this.toast.textContent = text;
    this.toast.className = `hud-toast show ${kind}`;
    this.toastTimer = 2.2;
  }

  update(dt: number): void {
    this.accumulator += dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.remove('show');
    }
    if (this.accumulator < 0.1) return;
    this.accumulator = 0;
    this.refresh();
  }

  private refresh(): void {
    const world = this.game.world;
    const p = world.player;
    if (!p) return;
    this.mass.textContent = String(Math.floor(p.mass));
    this.form.textContent = formName(p.path);
    const buildHtml = buildChipsHtml(p.path);
    if (this.build.innerHTML !== buildHtml) this.build.innerHTML = buildHtml;

    const threshold = nextThreshold(p);
    if (threshold === null) {
      this.bar.style.width = '100%';
      this.barLabel.textContent = 'Fully evolved';
    } else {
      const prev = CONFIG.evolution.thresholds[p.path.length - 1] ?? 0;
      const t = Math.max(0, Math.min(1, (p.mass - prev) / (threshold - prev)));
      this.bar.style.width = `${String(Math.round(t * 100))}%`;
      this.barLabel.textContent = `Evolve at ${String(threshold)}`;
    }

    this.rank.textContent = `#${String(world.rankOf(p.id))} of ${String(world.creatures.size)}`;

    const top = world.leaderboard(5);
    const html = top
      .map((c, i) => {
        const cls = c.id === p.id ? 'me' : '';
        return `<li class="${cls}"><span class="n">${String(i + 1)}.</span><span class="name">${escapeHtml(c.name)}</span><span class="m">${String(Math.floor(c.mass))}</span></li>`;
      })
      .join('');
    if (this.board.innerHTML !== html) this.board.innerHTML = html;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
