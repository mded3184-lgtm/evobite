import { CONFIG } from '@/config';

/** Where a platform wants ads. */
export interface AdPolicy {
  /** Show an ad when the player first presses Play (GameDistribution requires one). */
  readonly prerollOnPlay: boolean;
  /** No mid-roll before this many seconds of play in a session. */
  readonly firstMidgameAfterSec: number;
}

/** For platforms that don't pace ads themselves: none in the first minutes, no pre-roll. */
export const DEFAULT_AD_POLICY: AdPolicy = {
  prerollOnPlay: false,
  firstMidgameAfterSec: CONFIG.ads.firstAdAfterSec,
};

/**
 * Platform adapter. The game talks to this interface only; the build picks the adapter
 * (CrazyGames, GameDistribution, or the mock for itch.io / GitHub Pages / tests).
 */
export interface PlatformSdk {
  readonly name: string;
  readonly adPolicy: AdPolicy;
  init(): Promise<void>;
  /** Loading began / finished (CrazyGames uses these to measure load time). */
  loadingStart(): void;
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  /** Signal a satisfying moment (kill, evolution). CrazyGames uses it for rating prompts. */
  happyTime(): void;
  /** Show a midgame ad between rounds. Resolves when gameplay can resume. */
  showMidgameAd(onStart?: () => void): Promise<void>;
  /** Persisted key/value storage; cloud-backed on CrazyGames when the player is logged in. */
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /**
   * Platform-level audio mute (CrazyGames lets players mute games from the site).
   * Calls back once with the current state, then on every change.
   */
  onAudioMuteChange(listener: (muted: boolean) => void): void;
  /**
   * The platform asks the game to pause (true) or allows it to resume (false) on its own,
   * e.g. for an ad it started itself. Resuming is up to the player via the pause menu.
   */
  onPauseRequest(listener: (paused: boolean) => void): void;
  /** Invite link / share support, if the platform offers it. */
  canShare(): boolean;
  share(): void;
}
