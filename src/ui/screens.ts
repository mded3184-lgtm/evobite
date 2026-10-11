import type { Progress } from '@/game/economy';
import { coinsForRound } from '@/game/economy';
import { formName } from '@/game/evolution/tree';
import type { RoundStats } from '@/game/types';
import { el, formatTime, must } from './dom';

export interface MenuHandlers {
  onPlay: (name: string) => void;
}

const MAX_NAME = 14;

/** Start menu. One click to play, as the CrazyGames gameplay requirements ask. */
export class MenuScreen {
  private readonly root: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly coins: HTMLElement;
  private readonly best: HTMLElement;

  constructor(container: HTMLElement, handlers: MenuHandlers, initialName: string) {
    this.root = el('div', 'screen menu');
    this.root.innerHTML = `
      <div class="panel">
        <h1 class="logo">Evo<span>Bite</span></h1>
        <p class="tagline">Eat. Grow. Every 30 seconds, choose what you become.</p>
        <div class="menu-row">
          <input class="name-input" maxlength="${String(MAX_NAME)}" placeholder="nickname" autocomplete="off" spellcheck="false" />
          <button class="btn btn-play" type="button">Play</button>
        </div>
        <div class="menu-stats"><span class="coins">0</span> coins · best <span class="best">0</span></div>
        <p class="hint">Move: mouse or drag · Boost: hold Space (costs mass) · Pause: Esc · Evolve: 1 / 2</p>
      </div>
    `;
    container.appendChild(this.root);
    this.nameInput = must<HTMLInputElement>('.name-input', this.root);
    this.nameInput.value = initialName;
    this.coins = must('.coins', this.root);
    this.best = must('.best', this.root);
    const play = (): void => {
      const name = this.nameInput.value.trim().slice(0, MAX_NAME) || 'you';
      handlers.onPlay(name);
    };
    must<HTMLButtonElement>('.btn-play', this.root).addEventListener('click', play);
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') play();
    });
  }

  show(progress: Progress): void {
    this.coins.textContent = String(progress.coins);
    this.best.textContent = String(Math.floor(progress.bestMass));
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}

export interface DeathHandlers {
  onRespawn: () => void;
  onMenu: () => void;
}

/** Post-round summary. Respawn is the primary action; one click, no friction. */
export class DeathScreen {
  private readonly root: HTMLElement;

  constructor(
    container: HTMLElement,
    private readonly handlers: DeathHandlers,
  ) {
    this.root = el('div', 'screen death hidden');
    container.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (!this.root.classList.contains('hidden') && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        this.handlers.onRespawn();
      }
    });
  }

  show(stats: RoundStats, killerName: string, progress: Progress): void {
    const coins = coinsForRound(stats);
    this.root.innerHTML = `
      <div class="panel">
        <h2 class="death-title">Eaten by <span class="killer">${escape(killerName)}</span></h2>
        <div class="death-form">${escape(formName(stats.path))}</div>
        <div class="death-grid">
          <div><b>${String(Math.floor(stats.maxMass))}</b><span>max mass</span></div>
          <div><b>${String(stats.kills)}</b><span>kills</span></div>
          <div><b>${formatTime(stats.survivedSec)}</b><span>survived</span></div>
          <div><b>+${String(coins)}</b><span>coins</span></div>
        </div>
        ${stats.revengeKills > 0 ? `<div class="death-revenge">Revenge served ×${String(stats.revengeKills)}</div>` : ''}
        <div class="menu-row">
          <button class="btn btn-respawn" type="button">Respawn</button>
          <button class="btn btn-ghost btn-menu" type="button">Menu</button>
        </div>
        <div class="menu-stats">${String(progress.coins)} coins · best ${String(Math.floor(progress.bestMass))}</div>
      </div>
    `;
    must<HTMLButtonElement>('.btn-respawn', this.root).addEventListener(
      'click',
      this.handlers.onRespawn,
    );
    must<HTMLButtonElement>('.btn-menu', this.root).addEventListener('click', this.handlers.onMenu);
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}

function escape(s: string): string {
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

export interface PauseHandlers {
  onResume: () => void;
  onToggleSound: () => void;
  onQuit: () => void;
}

/** Single-player pause menu. The world is fully frozen while it is open. */
export class PauseScreen {
  private readonly root: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;

  constructor(container: HTMLElement, handlers: PauseHandlers) {
    this.root = el('div', 'screen pause hidden');
    this.root.innerHTML = `
      <div class="panel">
        <h2 class="pause-title">Paused</h2>
        <div class="pause-buttons">
          <button class="btn btn-resume" type="button">Resume</button>
          <button class="btn btn-ghost btn-sound" type="button">Sound: on</button>
          <button class="btn btn-ghost btn-quit" type="button">Quit to menu</button>
        </div>
        <p class="hint">Esc or P to resume</p>
      </div>
    `;
    container.appendChild(this.root);
    this.soundBtn = must<HTMLButtonElement>('.btn-sound', this.root);
    must<HTMLButtonElement>('.btn-resume', this.root).addEventListener('click', handlers.onResume);
    this.soundBtn.addEventListener('click', handlers.onToggleSound);
    must<HTMLButtonElement>('.btn-quit', this.root).addEventListener('click', handlers.onQuit);
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  setSound(muted: boolean): void {
    this.soundBtn.textContent = `Sound: ${muted ? 'off' : 'on'}`;
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
