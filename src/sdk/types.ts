/**
 * Platform adapter. The game talks to this interface only, so the same bundle runs on
 * CrazyGames (real SDK), GitHub Pages (mock) and in tests (mock) without branching.
 */
export interface PlatformSdk {
  readonly name: string;
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
  /** Invite link / share support, if the platform offers it. */
  canShare(): boolean;
  share(): void;
}
