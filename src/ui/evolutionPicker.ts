import type { BranchId } from '@/game/evolution/tree';
import { BRANCHES, optionsForTier } from '@/game/evolution/tree';
import { el } from './dom';

/**
 * Two-card choice shown when the player hits a threshold. The world pauses the player
 * while this is open, so the whole decision has to be readable in about two seconds:
 * big name, one-line blurb, tags, and a keyboard shortcut (1 / 2) for desktop players.
 */
export class EvolutionPicker {
  private readonly root: HTMLElement;
  private onPick: ((id: BranchId) => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = el('div', 'picker hidden');
    container.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (this.root.classList.contains('hidden') || !this.onPick) return;
      const options = this.root.querySelectorAll<HTMLButtonElement>('.card');
      if (e.key === '1') options[0]?.click();
      if (e.key === '2') options[1]?.click();
    });
  }

  open(tier: number, onPick: (id: BranchId) => void): void {
    this.onPick = onPick;
    const [a, b] = optionsForTier(tier);
    this.root.innerHTML = '';
    const title = el('div', 'picker-title', `Evolution ${String(tier + 1)} / 4 — choose your path`);
    const row = el('div', 'picker-row');
    row.appendChild(this.card(a, '1'));
    row.appendChild(this.card(b, '2'));
    this.root.append(title, row);
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
    this.onPick = null;
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  private card(id: BranchId, key: string): HTMLButtonElement {
    const b = BRANCHES[id];
    const btn = el('button', `card card-${id}`);
    btn.type = 'button';
    btn.innerHTML = `
      <div class="card-key">${key}</div>
      <div class="card-name">${b.name}</div>
      <div class="card-blurb">${b.blurb}</div>
      <div class="card-tags">${b.tags.map((t) => `<span>${t}</span>`).join('')}</div>
    `;
    btn.addEventListener('click', () => {
      const cb = this.onPick;
      this.close();
      cb?.(id);
    });
    return btn;
  }
}
