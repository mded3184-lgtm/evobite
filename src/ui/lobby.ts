import type { Progress } from '@/game/economy';
import { TIER_COUNT } from '@/game/evolution/tree';
import type { Skin } from '@/game/skins';
import { getSkin, SKINS } from '@/game/skins';
import { drawCreatureArt } from '@/render/creatureArt';
import { el, must } from './dom';

export interface LobbyHandlers {
  onPlay: (name: string) => void;
  /** Returns true if the purchase went through. */
  onBuy: (skinId: string) => boolean;
  onSelect: (skinId: string) => void;
  onClick: () => void;
}

const MAX_NAME = 14;
const FORMS_TOTAL = 1 << TIER_COUNT;

/**
 * Main lobby: animated preview of your creature in its current skin, nickname, a big Play
 * button, lifetime stats and the skin shop. Play stays one click away, as CrazyGames requires.
 */
export class Lobby {
  private readonly root: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly coins: HTMLElement;
  private readonly shopCoins: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly heroCanvas: HTMLCanvasElement;
  private readonly heroName: HTMLElement;
  private readonly shop: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly cardCanvases = new Map<string, HTMLCanvasElement>();
  private progress: Progress | null = null;
  private rafId = 0;
  private mouse = { x: 0, y: 0 };

  constructor(
    container: HTMLElement,
    private readonly handlers: LobbyHandlers,
    initialName: string,
  ) {
    this.root = el('div', 'screen lobby-screen');
    this.root.innerHTML = `
      <div class="lobby">
        <header class="lobby-top">
          <h1 class="logo">Evo<span>Bite</span></h1>
          <div class="coin-pill" title="Coins"><span class="coin-icon"></span><b class="lobby-coins">0</b></div>
        </header>
        <div class="lobby-body">
          <section class="lobby-hero">
            <canvas class="hero-canvas"></canvas>
            <div class="hero-skin">Mint</div>
            <button class="btn btn-ghost btn-skins" type="button">🎨 Skins</button>
          </section>
          <section class="lobby-side">
            <p class="tagline">Eat. Grow. Every 30 seconds, choose what you become.</p>
            <input class="name-input" maxlength="${String(MAX_NAME)}" placeholder="nickname" autocomplete="off" spellcheck="false" />
            <button class="btn btn-play btn-big" type="button">Play</button>
            <div class="lobby-stats"></div>
          </section>
        </div>
        <p class="hint">Move: mouse or drag · Boost: hold Space · Pause: Esc · Evolve: 1 / 2</p>
      </div>
      <div class="shop hidden">
        <div class="panel shop-panel">
          <header class="shop-top">
            <h2>Skins</h2>
            <div class="coin-pill"><span class="coin-icon"></span><b class="shop-coins">0</b></div>
            <button class="shop-close" type="button" aria-label="Close">✕</button>
          </header>
          <p class="shop-hint">Earn coins every round: size, kills and revenge all pay.</p>
          <div class="shop-grid"></div>
        </div>
      </div>
    `;
    container.appendChild(this.root);

    this.nameInput = must<HTMLInputElement>('.name-input', this.root);
    this.nameInput.value = initialName;
    this.coins = must('.lobby-coins', this.root);
    this.shopCoins = must('.shop-coins', this.root);
    this.stats = must('.lobby-stats', this.root);
    this.heroCanvas = must<HTMLCanvasElement>('.hero-canvas', this.root);
    this.heroName = must('.hero-skin', this.root);
    this.shop = must('.shop', this.root);
    this.grid = must('.shop-grid', this.root);

    const play = (): void => {
      handlers.onPlay(this.nameInput.value.trim().slice(0, MAX_NAME) || 'you');
    };
    must<HTMLButtonElement>('.btn-play', this.root).addEventListener('click', play);
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') play();
    });
    must<HTMLButtonElement>('.btn-skins', this.root).addEventListener('click', () => {
      handlers.onClick();
      this.openShop();
    });
    this.heroCanvas.addEventListener('click', () => {
      handlers.onClick();
      this.openShop();
    });
    must<HTMLButtonElement>('.shop-close', this.root).addEventListener('click', () => {
      handlers.onClick();
      this.closeShop();
    });
    this.shop.addEventListener('click', (e) => {
      if (e.target === this.shop) this.closeShop();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.shop.classList.contains('hidden')) this.closeShop();
    });
    this.root.addEventListener('pointermove', (e) => {
      this.mouse = { x: e.clientX, y: e.clientY };
    });

    this.buildGrid();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(progress: Progress): void {
    this.root.classList.remove('hidden');
    this.render(progress);
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.animate);
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.closeShop();
    cancelAnimationFrame(this.rafId);
  }

  /** Re-render coins, stats and shop state after progress changes. */
  render(progress: Progress): void {
    this.progress = progress;
    this.coins.textContent = String(progress.coins);
    this.shopCoins.textContent = String(progress.coins);
    const skin = getSkin(progress.selectedSkin);
    this.heroName.textContent = skin?.name ?? '';
    this.stats.innerHTML = [
      stat(String(Math.floor(progress.bestMass)), 'best mass'),
      stat(String(progress.totalKills), 'kills'),
      stat(String(progress.rounds), 'rounds'),
      stat(`${String(progress.formsUnlocked.length)}/${String(FORMS_TOTAL)}`, 'forms'),
    ].join('');
    this.updateCards(progress);
  }

  openShop(): void {
    this.shop.classList.remove('hidden');
  }

  closeShop(): void {
    this.shop.classList.add('hidden');
  }

  private buildGrid(): void {
    for (const skin of SKINS) {
      const card = el('div', 'skin-card');
      card.dataset.skin = skin.id;
      const canvas = el('canvas', 'skin-canvas');
      this.cardCanvases.set(skin.id, canvas);
      const name = el('div', 'skin-name', skin.name);
      const btn = el('button', 'btn skin-btn');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.onCardAction(skin, card);
      });
      card.append(canvas, name, btn);
      this.grid.appendChild(card);
    }
  }

  private onCardAction(skin: Skin, card: HTMLElement): void {
    const progress = this.progress;
    if (!progress) return;
    if (progress.ownedSkins.includes(skin.id)) {
      this.handlers.onSelect(skin.id);
      return;
    }
    flash(card, this.handlers.onBuy(skin.id) ? 'bought' : 'denied');
  }

  private updateCards(progress: Progress): void {
    for (const card of this.grid.querySelectorAll<HTMLElement>('.skin-card')) {
      const skin = getSkin(card.dataset.skin);
      const btn = card.querySelector<HTMLButtonElement>('.skin-btn');
      if (!skin || !btn) continue;
      const owned = progress.ownedSkins.includes(skin.id);
      const equipped = progress.selectedSkin === skin.id;
      const affordable = progress.coins >= skin.price;
      card.classList.toggle('equipped', equipped);
      card.classList.toggle('locked', !owned && !affordable);
      btn.disabled = equipped;
      btn.className = `btn skin-btn ${equipped ? 'btn-ghost' : owned ? 'btn-ghost' : affordable ? 'btn-buy' : 'btn-ghost'}`;
      btn.innerHTML = equipped
        ? 'Equipped'
        : owned
          ? 'Equip'
          : `<span class="coin-icon"></span>${String(skin.price)}`;
    }
  }

  private readonly animate = (now: number): void => {
    const t = now / 1000;
    const progress = this.progress;
    if (progress) {
      // Hero: bobbing creature whose eyes follow the pointer.
      const heroSkin = getSkin(progress.selectedSkin);
      const rect = this.heroCanvas.getBoundingClientRect();
      const dx = this.mouse.x - (rect.left + rect.width / 2);
      const dy = this.mouse.y - (rect.top + rect.height / 2);
      const d = Math.hypot(dx, dy);
      const dir = d > 1 ? { x: dx / d, y: dy / d } : { x: Math.cos(t), y: Math.sin(t) * 0.4 };
      paint(this.heroCanvas, heroSkin, dir, t, 0.36, Math.sin(t * 2) * 0.03);

      // Shop cards only animate while the shop is visible.
      if (!this.shop.classList.contains('hidden')) {
        for (const [id, canvas] of this.cardCanvases) {
          const a = t * 0.8 + id.length;
          paint(canvas, getSkin(id), { x: Math.cos(a), y: Math.sin(a) * 0.5 }, t, 0.34, 0);
        }
      }
    }
    this.rafId = requestAnimationFrame(this.animate);
  };
}

/** Replays a one-shot CSS animation class on an element. */
function flash(node: HTMLElement, cls: string): void {
  node.classList.remove(cls);
  requestAnimationFrame(() => {
    node.classList.add(cls);
  });
  node.addEventListener(
    'animationend',
    () => {
      node.classList.remove(cls);
    },
    { once: true },
  );
}

function stat(value: string, label: string): string {
  return `<div><b>${value}</b><span>${label}</span></div>`;
}

/** Draws one creature centered in a canvas, sizing the backing store for the device pixel ratio. */
function paint(
  canvas: HTMLCanvasElement,
  skin: Skin | null,
  dir: { x: number; y: number },
  time: number,
  radiusFrac: number,
  bob: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const r = Math.min(w, h) * radiusFrac;
  drawCreatureArt(ctx, {
    x: w / 2,
    y: h / 2 + bob * h,
    r,
    dir,
    hue: skin?.hue ?? 165,
    skin,
    path: [],
    time,
  });
}
