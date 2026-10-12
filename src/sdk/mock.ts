import type { PlatformSdk } from './types';

function safeStorage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem('__evobite_probe', '1');
    s.removeItem('__evobite_probe');
    return s;
  } catch {
    return null;
  }
}

/** Used on GitHub Pages, local dev and in tests. Ads are a short no-op. */
export class MockSdk implements PlatformSdk {
  readonly name = 'mock';
  private readonly memory = new Map<string, string>();
  private readonly storage = safeStorage();

  async init(): Promise<void> {
    /* nothing to do */
  }
  loadingStart(): void {
    /* noop */
  }
  loadingStop(): void {
    /* noop */
  }
  gameplayStart(): void {
    /* noop */
  }
  gameplayStop(): void {
    /* noop */
  }
  happyTime(): void {
    /* noop */
  }
  async showMidgameAd(): Promise<void> {
    /* no ads outside the platform */
  }
  getItem(key: string): string | null {
    return this.storage?.getItem(key) ?? this.memory.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.memory.set(key, value);
    this.storage?.setItem(key, value);
  }
  canShare(): boolean {
    return false;
  }
  share(): void {
    /* noop */
  }
}
