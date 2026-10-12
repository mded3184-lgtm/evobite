import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from '@/core/loop';
import { CrazyGamesAdapter } from '@/sdk/crazygames';

interface Cb {
  adStarted?: () => void;
  adFinished: () => void;
  adError: () => void;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- test fixture shape is inferred
function fakeSdk(opts: { environment?: string; requestAd: (cb: Cb) => void }) {
  return {
    environment: opts.environment ?? 'crazygames',
    init: () => Promise.resolve(),
    game: {
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      happytime: vi.fn(),
      inviteLink: () => '',
    },
    ad: {
      requestAd: (_type: string, cb: Cb) => {
        opts.requestAd(cb);
      },
    },
    data: { getItem: () => null, setItem: vi.fn() },
    user: {},
  };
}

const g = globalThis as unknown as Record<string, unknown>;

describe('CrazyGames adapter never blocks the game', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    g.window = globalThis;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete g.CrazyGames;
  });

  async function adapterWith(sdk: ReturnType<typeof fakeSdk>): Promise<CrazyGamesAdapter> {
    g.CrazyGames = { SDK: sdk };
    const a = new CrazyGamesAdapter();
    await a.init();
    return a;
  }

  it('resolves when an ad never starts (no callbacks at all)', async () => {
    const a = await adapterWith(fakeSdk({ requestAd: () => undefined }));
    let done = false;
    void a.showMidgameAd().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(3000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(done).toBe(true);
  });

  it('waits for a started ad, but not forever', async () => {
    let cbs: Cb | null = null;
    const a = await adapterWith(
      fakeSdk({
        requestAd: (cb) => {
          cbs = cb;
          cb.adStarted?.();
        },
      }),
    );
    let done = false;
    void a.showMidgameAd().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(20000);
    expect(done).toBe(false); // a real ad is playing
    expect(cbs).not.toBeNull();
    await vi.advanceTimersByTimeAsync(30000);
    expect(done).toBe(true); // hard cap
  });

  it('calls onStart (mute) only when an ad really starts, never for an unfilled request', async () => {
    let started = 0;
    const filled = await adapterWith(
      fakeSdk({
        requestAd: (cb) => {
          cb.adStarted?.();
          cb.adFinished();
        },
      }),
    );
    await filled.showMidgameAd(() => started++);
    expect(started).toBe(1);
    const unfilled = await adapterWith(
      fakeSdk({
        requestAd: (cb) => {
          cb.adError();
        },
      }),
    );
    await unfilled.showMidgameAd(() => started++);
    expect(started).toBe(1);
  });

  it('forwards loading events to the SDK', async () => {
    const sdk = fakeSdk({ requestAd: () => undefined });
    const game = sdk.game as Record<string, unknown>;
    game.loadingStart = vi.fn();
    game.loadingStop = vi.fn();
    const a = await adapterWith(sdk);
    a.loadingStart();
    a.loadingStop();
    expect(game.loadingStart).toHaveBeenCalledOnce();
    expect(game.loadingStop).toHaveBeenCalledOnce();
  });

  it('resolves immediately when requestAd throws', async () => {
    const a = await adapterWith(
      fakeSdk({
        requestAd: () => {
          throw new Error('boom');
        },
      }),
    );
    await expect(a.showMidgameAd()).resolves.toBeUndefined();
  });

  it('ignores a disabled SDK (non-CrazyGames hosts)', async () => {
    const sdk = fakeSdk({
      environment: 'disabled',
      requestAd: () => {
        throw new Error('should not be called');
      },
    });
    const a = await adapterWith(sdk);
    a.gameplayStart();
    expect(sdk.game.gameplayStart).not.toHaveBeenCalled();
    await expect(a.showMidgameAd()).resolves.toBeUndefined();
  });

  it('swallows errors from fire-and-forget calls', async () => {
    const sdk = fakeSdk({ requestAd: () => undefined });
    sdk.game.gameplayStop = vi.fn(() => {
      throw new Error('nope');
    });
    const a = await adapterWith(sdk);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => {
      a.gameplayStop();
    }).not.toThrow();
  });
});

describe('GameLoop', () => {
  it('advance() runs fixed steps for the given time and renders once', () => {
    let updates = 0;
    let renders = 0;
    const loop = new GameLoop({
      update: () => updates++,
      render: () => renders++,
    });
    for (let i = 0; i < 30; i++) loop.advance(1 / 30);
    expect(updates).toBe(60);
    expect(renders).toBe(30);
  });

  it('keeps running after a frame throws', () => {
    const queue: ((t: number) => void)[] = [];
    g.requestAnimationFrame = (cb: (t: number) => void) => queue.push(cb);
    g.cancelAnimationFrame = () => undefined;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let renders = 0;
    let shouldThrow = true;
    const loop = new GameLoop({
      update: () => undefined,
      render: () => {
        renders++;
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error('bad frame');
        }
      },
    });
    loop.start();
    for (let i = 1; i <= 3; i++) queue.shift()?.(performance.now() + i * 16);
    expect(renders).toBe(3);
    expect(queue.length).toBe(1); // next frame still scheduled
    loop.stop();
  });
});
