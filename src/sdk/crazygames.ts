import { MockSdk } from './mock';
import type { PlatformSdk } from './types';

/**
 * Minimal typing for the parts of the CrazyGames SDK v3 we use.
 * Docs: https://docs.crazygames.com/sdk/html5/
 */
interface CrazyGamesSdk {
  init(): Promise<void>;
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    happytime(): void;
    inviteLink(params: Record<string, string>): string;
  };
  ad: {
    requestAd(
      type: 'midgame' | 'rewarded',
      callbacks: { adFinished: () => void; adError: () => void; adStarted?: () => void },
    ): void;
  };
  data: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  user: {
    showInviteButton?: (params: Record<string, string>) => void;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazyGamesSdk };
  }
}

export class CrazyGamesAdapter implements PlatformSdk {
  readonly name = 'crazygames';
  private readonly fallback = new MockSdk();
  private sdk: CrazyGamesSdk | null = null;

  async init(): Promise<void> {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    try {
      await sdk.init();
      this.sdk = sdk;
    } catch (err) {
      console.warn('CrazyGames SDK failed to init, running without it', err);
    }
  }

  gameplayStart(): void {
    this.sdk?.game.gameplayStart();
  }
  gameplayStop(): void {
    this.sdk?.game.gameplayStop();
  }
  happyTime(): void {
    this.sdk?.game.happytime();
  }
  showMidgameAd(): Promise<void> {
    const sdk = this.sdk;
    if (!sdk) return this.fallback.showMidgameAd();
    return new Promise((resolve) => {
      sdk.ad.requestAd('midgame', { adFinished: resolve, adError: resolve });
    });
  }
  getItem(key: string): string | null {
    try {
      return this.sdk?.data.getItem(key) ?? this.fallback.getItem(key);
    } catch {
      return this.fallback.getItem(key);
    }
  }
  setItem(key: string, value: string): void {
    this.fallback.setItem(key, value);
    try {
      this.sdk?.data.setItem(key, value);
    } catch {
      /* data module unavailable; local copy is enough */
    }
  }
  canShare(): boolean {
    return this.sdk !== null;
  }
  share(): void {
    const link = this.sdk?.game.inviteLink({});
    if (link && 'share' in navigator) {
      void navigator.share({ title: 'EvoBite', url: link }).catch(() => undefined);
    }
  }
}

/** Picks the real adapter when the SDK script is present, the mock otherwise. */
export function createPlatformSdk(): PlatformSdk {
  return typeof window !== 'undefined' && window.CrazyGames
    ? new CrazyGamesAdapter()
    : new MockSdk();
}
