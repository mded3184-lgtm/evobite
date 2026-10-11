/**
 * Keyboard state for held actions (boost) plus one-shot handlers (pause).
 * Held state is polled every frame, so releasing a key during a pause or evolution
 * choice can never leave the creature stuck boosting.
 */
export class Keyboard {
  private readonly held = new Set<string>();
  private readonly pressHandlers = new Map<string, () => void>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.pressHandlers.get(e.code)?.();
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
    });
    // Losing focus (alt-tab) must release everything.
    window.addEventListener('blur', () => {
      this.held.clear();
    });
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  onPress(codes: readonly string[], handler: () => void): void {
    for (const code of codes) this.pressHandlers.set(code, handler);
  }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
