import { MockSdk } from './mock';
import type { PlatformSdk } from './types';

/**
 * Minimal typing for the parts of the CrazyGames SDK v3 we use.
 * Docs: https://docs.crazygames.com/sdk/html5/
 */
interface CrazyGamesSdk {
  init(): Promise<void>;
  /** 'crazygames' on the portal, 'local' on localhost, 'disabled' on any other host. */
  environment?: string;
  game: {
    loadingStart?(): void;
    loadingStop?(): void;
    gameplayStart(): void;
    gameplayStop(): void;
    happytime(): void;
    inviteLink(params: Record<string, string>): string;
    settings?: { muteAudio?: boolean };
    addSettingsChangeListener?(listener: (settings: { muteAudio?: boolean }) => void): void;
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

/** How long to wait for an ad to start before giving up and resuming the game. */
const AD_START_TIMEOUT_MS = 4000;
/** Hard cap for a running ad, in case its finish callback never arrives. */
const AD_MAX_MS = 45000;

export class CrazyGamesAdapter implements PlatformSdk {
  readonly name = 'crazygames';
  private readonly fallback = new MockSdk();
  private sdk: CrazyGamesSdk | null = null;

  async init(): Promise<void> {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    try {
      await sdk.init();
      // Outside CrazyGames (e.g. GitHub Pages) the SDK is 'disabled': its calls may throw or
      // never call back. Use it only where it actually works.
      if (sdk.environment === 'disabled') return;
      this.sdk = sdk;
    } catch (err) {
      console.warn('CrazyGames SDK failed to init, running without it', err);
    }
  }

  onAudioMuteChange(listener: (muted: boolean) => void): void {
    listener(this.sdk?.game.settings?.muteAudio === true);
    this.safe((sdk) => {
      sdk.game.addSettingsChangeListener?.((settings) => {
        listener(settings.muteAudio === true);
      });
    });
  }

  loadingStart(): void {
    this.safe((sdk) => {
      sdk.game.loadingStart?.();
    });
  }
  loadingStop(): void {
    this.safe((sdk) => {
      sdk.game.loadingStop?.();
    });
  }
  gameplayStart(): void {
    this.safe((sdk) => {
      sdk.game.gameplayStart();
    });
  }
  gameplayStop(): void {
    this.safe((sdk) => {
      sdk.game.gameplayStop();
    });
  }
  happyTime(): void {
    this.safe((sdk) => {
      sdk.game.happytime();
    });
  }

  /**
   * Always resolves: when the ad finishes or errors, when it fails to start within a few
   * seconds, or after a hard cap. A respawn can never get stuck behind an ad.
   */
  showMidgameAd(onStart?: () => void): Promise<void> {
    const sdk = this.sdk;
    if (!sdk) return this.fallback.showMidgameAd();
    return new Promise((resolve) => {
      let done = false;
      let startTimer = 0;
      let capTimer = 0;
      const finish = (): void => {
        if (done) return;
        done = true;
        window.clearTimeout(startTimer);
        window.clearTimeout(capTimer);
        resolve();
      };
      startTimer = window.setTimeout(finish, AD_START_TIMEOUT_MS);
      capTimer = window.setTimeout(finish, AD_MAX_MS);
      try {
        sdk.ad.requestAd('midgame', {
          adStarted: () => {
            window.clearTimeout(startTimer);
            // Mute only once an ad really plays; unfilled requests never reach this.
            onStart?.();
          },
          adFinished: finish,
          adError: finish,
        });
      } catch {
        finish();
      }
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
    this.safe((sdk) => {
      sdk.data.setItem(key, value);
    });
  }
  canShare(): boolean {
    return this.sdk !== null;
  }
  share(): void {
    this.safe((sdk) => {
      const link = sdk.game.inviteLink({});
      if ('share' in navigator) {
        void navigator.share({ title: 'EvoBite', url: link }).catch(() => undefined);
      }
    });
  }

  /** SDK calls must never break the game. */
  private safe(fn: (sdk: CrazyGamesSdk) => void): void {
    const sdk = this.sdk;
    if (!sdk) return;
    try {
      fn(sdk);
    } catch (err) {
      console.warn('CrazyGames SDK call failed', err);
    }
  }
}

/** Picks the real adapter when the SDK script is present, the mock otherwise. */
export function createPlatformSdk(): PlatformSdk {
  return typeof window !== 'undefined' && window.CrazyGames
    ? new CrazyGamesAdapter()
    : new MockSdk();
}
