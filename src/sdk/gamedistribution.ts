import { MockSdk } from './mock';
import type { AdPolicy, PlatformSdk } from './types';

/**
 * GameDistribution HTML5 SDK adapter.
 * Docs: https://github.com/GameDistribution/GD-HTML5/wiki/SDK-Implementation
 *
 * GD's rules, which this adapter and the game follow:
 * - Load the SDK while the game loads, never on a button press, and only once.
 * - A pre-roll on the Play button and mid-rolls between rounds, always behind a click/tap.
 * - On SDK_GAME_PAUSE the game pauses and mutes; on SDK_GAME_START it may resume.
 * - The SDK paces ads itself, so the game may ask as often as it likes.
 */
const SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';
const SCRIPT_ID = 'gamedistribution-jssdk';
/** Boot never waits longer than this for SDK_READY. */
const INIT_TIMEOUT_MS = 3000;
/** An ad that hasn't paused the game by now is treated as "no ad" (unfilled, blocked). */
const AD_START_TIMEOUT_MS = 6000;
/** Hard cap for a running ad, in case SDK_GAME_START never arrives. */
const AD_MAX_MS = 60000;

interface GdEvent {
  name: string;
}

interface GdSdk {
  showAd(type?: string): Promise<unknown> | undefined;
}

export interface GdOptions {
  gameId: string;
  onEvent: (event: GdEvent) => void;
}

declare global {
  interface Window {
    gdsdk?: GdSdk;
    GD_OPTIONS?: GdOptions;
  }
}

/** Adds the SDK script tag once; GD's own snippet does the same. */
export function injectGdScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(SCRIPT_ID)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SDK_URL;
    script.async = true;
    // Ad blockers and outages land here; the game simply runs without ads.
    script.onerror = () => {
      resolve();
    };
    script.onload = () => {
      resolve();
    };
    document.head.appendChild(script);
  });
}

interface AdInFlight {
  started: () => void;
  finish: () => void;
  hasStarted: boolean;
}

export class GameDistributionAdapter implements PlatformSdk {
  readonly name = 'gamedistribution';
  /** GD wants a pre-roll on Play, and paces mid-rolls itself. */
  readonly adPolicy: AdPolicy = { prerollOnPlay: true, firstMidgameAfterSec: 0 };
  private readonly fallback = new MockSdk();
  private ad: AdInFlight | null = null;
  private readonly pauseListeners: ((paused: boolean) => void)[] = [];

  constructor(
    private readonly gameId: string,
    private readonly loadScript: () => Promise<void> = injectGdScript,
  ) {}

  init(): Promise<void> {
    if (!this.gameId) {
      console.warn('GameDistribution game id missing (set GD_GAME_ID at build time); no ads');
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const ready = (): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      };
      const timer = window.setTimeout(ready, INIT_TIMEOUT_MS);
      window.GD_OPTIONS = {
        gameId: this.gameId,
        onEvent: (event) => {
          this.onEvent(event, ready);
        },
      };
      this.loadScript().catch(() => undefined);
    });
  }

  private onEvent(event: GdEvent, ready: () => void): void {
    switch (event.name) {
      case 'SDK_READY':
      case 'SDK_ERROR':
        ready();
        break;
      case 'SDK_GAME_PAUSE':
        if (this.ad) this.ad.started();
        else this.emitPause(true);
        break;
      case 'SDK_GAME_START':
        if (this.ad) this.ad.finish();
        else this.emitPause(false);
        break;
      default:
        break;
    }
  }

  private emitPause(paused: boolean): void {
    for (const listener of this.pauseListeners) {
      try {
        listener(paused);
      } catch (err) {
        console.warn('Pause listener failed', err);
      }
    }
  }

  onPauseRequest(listener: (paused: boolean) => void): void {
    this.pauseListeners.push(listener);
  }

  /**
   * Always resolves: once the ad is over (SDK_GAME_START), when no ad starts within a few
   * seconds, when the SDK is missing or throws, or after a hard cap.
   */
  showMidgameAd(onStart?: () => void): Promise<void> {
    const sdk = window.gdsdk;
    if (!sdk || typeof sdk.showAd !== 'function' || this.ad) return Promise.resolve();
    return new Promise((resolve) => {
      let startTimer = 0;
      let capTimer = 0;
      const ad: AdInFlight = {
        hasStarted: false,
        started: () => {
          if (ad.hasStarted) return;
          ad.hasStarted = true;
          window.clearTimeout(startTimer);
          // Mute only once an ad really plays; unfilled requests never reach this.
          onStart?.();
        },
        finish: () => {
          if (this.ad !== ad) return;
          this.ad = null;
          window.clearTimeout(startTimer);
          window.clearTimeout(capTimer);
          resolve();
        },
      };
      this.ad = ad;
      startTimer = window.setTimeout(ad.finish, AD_START_TIMEOUT_MS);
      capTimer = window.setTimeout(ad.finish, AD_MAX_MS);
      try {
        const result = sdk.showAd();
        // The promise settles when GD is done with the request. If an ad actually paused the
        // game, wait for SDK_GAME_START instead, so the game never resumes under an ad.
        result?.then(
          () => {
            if (!ad.hasStarted) ad.finish();
          },
          () => {
            if (!ad.hasStarted) ad.finish();
          },
        );
      } catch {
        ad.finish();
      }
    });
  }

  loadingStart(): void {
    /* GD has no loading events */
  }
  loadingStop(): void {
    /* GD has no loading events */
  }
  gameplayStart(): void {
    /* GD has no gameplay events */
  }
  gameplayStop(): void {
    /* GD has no gameplay events */
  }
  happyTime(): void {
    /* GD has no happy-time event */
  }
  onAudioMuteChange(listener: (muted: boolean) => void): void {
    listener(false);
  }
  getItem(key: string): string | null {
    return this.fallback.getItem(key);
  }
  setItem(key: string, value: string): void {
    this.fallback.setItem(key, value);
  }
  canShare(): boolean {
    return false;
  }
  share(): void {
    /* GD forbids outbound links */
  }
}
