import type { Progress } from '@/game/economy';
import { SKINS } from '@/game/skins';
import { t } from '@/i18n';
import { localFormName } from '@/i18n/gameText';
import { coinsForRound } from '@/game/economy';
import type { RoundStats } from '@/game/types';
import { el, formatTime, must } from './dom';

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
        <h2 class="death-title">${t('death.eatenBy', { name: `<span class="killer">${escape(killerName)}</span>` })}</h2>
        <div class="death-form">${escape(localFormName(stats.path))}</div>
        <div class="death-grid">
          <div><b>${String(Math.floor(stats.maxMass))}</b><span>${t('death.maxMass')}</span></div>
          <div><b>${String(stats.kills)}</b><span>${t('death.kills')}</span></div>
          <div><b>${formatTime(stats.survivedSec)}</b><span>${t('death.survived')}</span></div>
          <div><b>+${String(coins)}</b><span>${t('death.coins')}</span></div>
        </div>
        ${stats.revengeKills > 0 ? `<div class="death-revenge">${t('death.revenge', { n: stats.revengeKills })}</div>` : ''}
        <div class="menu-row">
          <button class="btn btn-respawn" type="button">${t('death.respawn')}</button>
          <button class="btn btn-ghost btn-menu" type="button">${t('death.menu')}</button>
        </div>
        <div class="menu-stats">${t('death.summary', { coins: progress.coins, best: Math.floor(progress.bestMass) })}</div>
        ${
          SKINS.some((k) => !progress.ownedSkins.includes(k.id) && progress.coins >= k.price)
            ? `<div class="death-skin">🎨 ${t('death.skinNudge')}</div>`
            : ''
        }
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
        <h2 class="pause-title">${t('pause.title')}</h2>
        <div class="pause-buttons">
          <button class="btn btn-resume" type="button">${t('pause.resume')}</button>
          <button class="btn btn-ghost btn-sound" type="button">${t('pause.soundOn')}</button>
          <button class="btn btn-ghost btn-quit" type="button">${t('pause.quit')}</button>
        </div>
        <p class="hint">${t('pause.hint')}</p>
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
    this.soundBtn.textContent = t(muted ? 'pause.soundOff' : 'pause.soundOn');
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
