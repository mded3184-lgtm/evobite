import { TIER_COUNT, TIERS } from '@/game/evolution/tree';
import { CONFIG } from '@/config';
import type { Progress } from '@/game/economy';
import type { Skin } from '@/game/skins';
import { getSkin, SKINS } from '@/game/skins';
import { getLanguage, LANGUAGES, t } from '@/i18n';
import { baseRules, branchBlurb, branchName, branchTags, skinName } from '@/i18n/gameText';
import { drawCreatureArt } from '@/render/creatureArt';
import { el, must } from './dom';
import { ICONS } from './icons';

export interface LobbyHandlers {
  onPlay: (name: string) => void;
  /** Returns true if the purchase went through. */
  onBuy: (skinId: string) => boolean;
  onSelect: (skinId: string) => void;
  onClick: () => void;
  onLanguage: (code: string) => void;
  onToggleSound: () => void;
}

const MAX_NAME = 14;
const FORMS_TOTAL = 1 << TIER_COUNT;

/**
 * Main lobby: your creature on a stage in its equipped skin (arrows cycle owned skins), the
 * nickname, a big Play button, lifetime stats, and the skin shop and perk guide as modals.
 * Play stays one click away, as CrazyGames requires.
 */
export class Lobby {
  private readonly root: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly coins: HTMLElement;
  private readonly shopCoins: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly heroCanvas: HTMLCanvasElement;
  private readonly heroName: HTMLElement;
  private readonly skinsBtn: HTMLButtonElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly shop: HTMLElement;
  private readonly perks: HTMLElement;
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
    const rules = baseRules();
    this.root = el('div', 'screen lobby-screen');
    this.root.innerHTML = `
      <div class="lobby-vignette" aria-hidden="true"></div>
      <div class="lobby">
        <header class="lobby-top">
          <div class="top-left">
            <label class="chip-btn lang-picker" title="${t('lobby.language')}">
              ${ICONS.globe}
              <select class="lang-select" aria-label="${t('lobby.language')}">${LANGUAGES.map(
                (l) =>
                  `<option value="${l.code}"${l.code === getLanguage() ? ' selected' : ''}>${l.name}</option>`,
              ).join('')}</select>
            </label>
            <button class="chip-btn icon-only lobby-sound" type="button" aria-label="Sound"></button>
          </div>
          <div class="coin-counter" title="Coins">
            <span class="coin-icon big"></span><b class="lobby-coins">0</b>
          </div>
        </header>

        <div class="lobby-body">
          <section class="lobby-hero">
            <div class="stage">
              <div class="stage-rays" aria-hidden="true"></div>
              <div class="stage-floor" aria-hidden="true"></div>
              <canvas class="hero-canvas"></canvas>
            </div>
            <div class="skin-switch">
              <button class="round-btn skin-prev" type="button" aria-label="Previous skin">${ICONS.left}</button>
              <div class="hero-skin"></div>
              <button class="round-btn skin-next" type="button" aria-label="Next skin">${ICONS.right}</button>
            </div>
          </section>

          <section class="lobby-side">
            <h1 class="logo3d" aria-label="EvoBite"><span class="l1">EVO</span><span class="l2">BITE</span></h1>
            <p class="tagline">${t('lobby.tagline')}</p>
            <label class="name-field">
              ${ICONS.pencil}
              <input class="name-input" maxlength="${String(MAX_NAME)}" placeholder="${t('lobby.nickname')}" autocomplete="off" spellcheck="false" />
            </label>
            <button class="btn btn-play btn-big" type="button">
              <span class="btn-shine" aria-hidden="true"></span>
              ${ICONS.play}<span>${t('lobby.play')}</span>
            </button>
            <div class="tile-row">
              <button class="tile btn-skins" type="button">
                <span class="tile-icon pink">${ICONS.palette}</span><span>${t('lobby.skins')}</span>
                <span class="badge-dot" aria-hidden="true"></span>
              </button>
              <button class="tile btn-perks" type="button">
                <span class="tile-icon sky">${ICONS.book}</span><span>${t('lobby.perks')}</span>
              </button>
            </div>
            <div class="lobby-stats"></div>
          </section>
        </div>

        <p class="hint">${t('lobby.hint')}</p>
      </div>

      <div class="shop perks hidden">
        <div class="panel shop-panel">
          <header class="shop-top">
            <span class="shop-title-icon sky">${ICONS.book}</span>
            <h2>${t('perks.title')}</h2>
            <button class="shop-close perks-close" type="button" aria-label="Close">${ICONS.close}</button>
          </header>
          <p class="shop-hint">${t('perks.intro')}</p>
          <div class="perks-list"></div>
          <ul class="perks-rules">
            <li>${t('perks.rule.base', { ratio: `<b>${rules.ratio}</b>`, absorb: `<b>${rules.absorb}</b>` })}</li>
            <li>${t('perks.rule.stack')}</li>
            <li>${t('perks.rule.best')}</li>
            <li>${t('perks.rule.decay', { mass: `<b>${String(rules.decayMass)}</b>` })}</li>
          </ul>
        </div>
      </div>

      <div class="shop shop-skins hidden">
        <div class="panel shop-panel">
          <header class="shop-top">
            <span class="shop-title-icon pink">${ICONS.palette}</span>
            <h2>${t('shop.title')}</h2>
            <div class="coin-counter small"><span class="coin-icon"></span><b class="shop-coins">0</b></div>
            <button class="shop-close skins-close" type="button" aria-label="Close">${ICONS.close}</button>
          </header>
          <p class="shop-hint">${t('shop.hint')}</p>
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
    this.skinsBtn = must<HTMLButtonElement>('.btn-skins', this.root);
    this.soundBtn = must<HTMLButtonElement>('.lobby-sound', this.root);
    this.shop = must('.shop-skins', this.root);
    this.perks = must('.perks', this.root);
    this.grid = must('.shop-grid', this.root);
    must('.perks-list', this.root).innerHTML = perksHtml();

    const play = (): void => {
      handlers.onPlay(this.nameInput.value.trim().slice(0, MAX_NAME) || 'you');
    };
    must<HTMLButtonElement>('.btn-play', this.root).addEventListener('click', play);
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') play();
    });

    const openModal = (modal: HTMLElement): void => {
      handlers.onClick();
      modal.classList.remove('hidden');
    };
    const closeModal = (modal: HTMLElement): void => {
      modal.classList.add('hidden');
    };
    this.skinsBtn.addEventListener('click', () => {
      openModal(this.shop);
    });
    this.heroCanvas.addEventListener('click', () => {
      openModal(this.shop);
    });
    must<HTMLButtonElement>('.btn-perks', this.root).addEventListener('click', () => {
      openModal(this.perks);
    });
    for (const modal of [this.shop, this.perks]) {
      must<HTMLButtonElement>('.shop-close', modal).addEventListener('click', () => {
        handlers.onClick();
        closeModal(modal);
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    }

    must<HTMLButtonElement>('.skin-prev', this.root).addEventListener('click', () => {
      this.cycleSkin(-1);
    });
    must<HTMLButtonElement>('.skin-next', this.root).addEventListener('click', () => {
      this.cycleSkin(1);
    });
    this.soundBtn.addEventListener('click', handlers.onToggleSound);
    must<HTMLSelectElement>('.lang-select', this.root).addEventListener('change', (e) => {
      handlers.onLanguage((e.target as HTMLSelectElement).value);
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
    this.perks.classList.add('hidden');
    cancelAnimationFrame(this.rafId);
  }

  setSound(muted: boolean): void {
    this.soundBtn.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
    this.soundBtn.classList.toggle('muted', muted);
  }

  /** Re-render coins, stats and shop state after progress changes. */
  render(progress: Progress): void {
    this.progress = progress;
    this.coins.textContent = String(progress.coins);
    this.shopCoins.textContent = String(progress.coins);
    const skin = getSkin(progress.selectedSkin);
    this.heroName.textContent = skin ? skinName(skin.id) : '';
    this.root.classList.toggle('single-skin', progress.ownedSkins.length < 2);
    const affordable = SKINS.some(
      (s) => !progress.ownedSkins.includes(s.id) && progress.coins >= s.price,
    );
    this.skinsBtn.classList.toggle('has-new', affordable);
    this.stats.innerHTML = [
      stat(ICONS.trophy, 'gold', String(Math.floor(progress.bestMass)), t('stat.bestMass')),
      stat(ICONS.target, 'pink', String(progress.totalKills), t('stat.kills')),
      stat(ICONS.flag, 'sky', String(progress.rounds), t('stat.rounds')),
      stat(
        ICONS.dna,
        'mint',
        `${String(progress.formsUnlocked.length)}<small>/${String(FORMS_TOTAL)}</small>`,
        t('stat.forms'),
      ),
    ].join('');
    this.updateCards(progress);
  }

  openShop(): void {
    this.shop.classList.remove('hidden');
  }

  closeShop(): void {
    this.shop.classList.add('hidden');
  }

  /** Arrows next to the skin name step through skins you already own. */
  private cycleSkin(step: number): void {
    const progress = this.progress;
    if (!progress) return;
    const owned = SKINS.filter((s) => progress.ownedSkins.includes(s.id));
    if (owned.length < 2) {
      this.handlers.onClick();
      this.openShop();
      return;
    }
    const i = owned.findIndex((s) => s.id === progress.selectedSkin);
    const next = owned[(i + step + owned.length) % owned.length];
    if (next) this.handlers.onSelect(next.id);
  }

  private buildGrid(): void {
    for (const skin of SKINS) {
      const card = el('div', 'skin-card');
      card.dataset.skin = skin.id;
      const stage = el('div', 'skin-stage');
      const canvas = el('canvas', 'skin-canvas');
      stage.appendChild(canvas);
      this.cardCanvases.set(skin.id, canvas);
      const name = el('div', 'skin-name', skinName(skin.id));
      const btn = el('button', 'btn skin-btn');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.onCardAction(skin, card);
      });
      card.append(stage, name, btn);
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
      card.classList.toggle('owned', owned);
      card.classList.toggle('locked', !owned && !affordable);
      btn.disabled = equipped;
      btn.className = `btn skin-btn ${owned ? 'btn-ghost' : affordable ? 'btn-buy' : 'btn-ghost btn-locked'}`;
      btn.innerHTML = equipped
        ? `${ICONS.check}<span>${t('shop.equipped')}</span>`
        : owned
          ? `<span>${t('shop.equip')}</span>`
          : `${affordable ? '<span class="coin-icon"></span>' : ICONS.lock}<span>${String(skin.price)}</span>`;
    }
  }

  private readonly animate = (now: number): void => {
    const time = now / 1000;
    const progress = this.progress;
    if (progress) {
      // Hero: bobbing creature whose eyes follow the pointer.
      const heroSkin = getSkin(progress.selectedSkin);
      const rect = this.heroCanvas.getBoundingClientRect();
      const dx = this.mouse.x - (rect.left + rect.width / 2);
      const dy = this.mouse.y - (rect.top + rect.height / 2);
      const d = Math.hypot(dx, dy);
      const dir = d > 1 ? { x: dx / d, y: dy / d } : { x: Math.cos(time), y: Math.sin(time) * 0.4 };
      paint(this.heroCanvas, heroSkin, dir, time, 0.3, Math.sin(time * 2.2) * 0.03 - 0.03);

      // Shop cards only animate while the shop is open.
      if (!this.shop.classList.contains('hidden')) {
        for (const [id, canvas] of this.cardCanvases) {
          const a = time * 0.8 + id.length;
          paint(canvas, getSkin(id), { x: Math.cos(a), y: Math.sin(a) * 0.5 }, time, 0.36, 0);
        }
      }
    }
    this.rafId = requestAnimationFrame(this.animate);
  };
}

/** Perk summary built from the live game data, so it never drifts from the real numbers. */
function perksHtml(): string {
  return TIERS.map((pair, tier) => {
    const at = CONFIG.evolution.thresholds[tier] ?? 0;
    const cards = pair
      .map((id, side) => {
        return `<div class="perk perk-${side === 0 ? 'a' : 'b'}">
          <div class="perk-name">${branchName(id)}</div>
          <div class="perk-blurb">${branchBlurb(id)}</div>
          <div class="card-tags">${branchTags(id)
            .map((tag) => `<span>${tag}</span>`)
            .join('')}</div>
        </div>`;
      })
      .join(`<div class="perk-or">${t('perks.or')}</div>`);
    return `<section class="perk-tier">
      <div class="perk-tier-head"><span class="tier-num">${String(tier + 1)}</span><b>${t('perks.tier', { n: tier + 1 })}</b><span>${t('perks.atMass', { mass: at })}</span></div>
      <div class="perk-row">${cards}</div>
    </section>`;
  }).join('');
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

function stat(icon: string, tone: string, value: string, label: string): string {
  return `<div class="stat"><span class="stat-icon ${tone}">${icon}</span><div><b>${value}</b><span>${label}</span></div></div>`;
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
  if (w === 0 || h === 0) return;
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
