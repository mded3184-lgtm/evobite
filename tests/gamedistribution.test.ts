import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameDistributionAdapter } from '@/sdk/gamedistribution';

const g = globalThis as unknown as Record<string, unknown>;

interface Fake {
  showAd: ReturnType<typeof vi.fn>;
  emit: (name: string) => void;
}

/** Installs a fake gdsdk and returns a loader that "loads" it and reports SDK_READY. */
function fakeGd(showAd: (emit: (name: string) => void) => Promise<unknown> | undefined): {
  fake: Fake;
  load: () => Promise<void>;
} {
  const emit = (name: string): void => {
    (g.GD_OPTIONS as { onEvent: (e: { name: string }) => void }).onEvent({ name });
  };
  const fake: Fake = { showAd: vi.fn(() => showAd(emit)), emit };
  const load = (): Promise<void> => {
    g.gdsdk = { showAd: fake.showAd };
    emit('SDK_READY');
    return Promise.resolve();
  };
  return { fake, load };
}

describe('GameDistribution adapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    g.window = globalThis;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete g.gdsdk;
    delete g.GD_OPTIONS;
  });

  it('asks for a pre-roll on Play and lets the SDK pace mid-rolls', () => {
    const a = new GameDistributionAdapter('abc');
    expect(a.adPolicy.prerollOnPlay).toBe(true);
    expect(a.adPolicy.firstMidgameAfterSec).toBe(0);
  });

  it('boots without an id and never shows ads', async () => {
    const a = new GameDistributionAdapter('');
    await a.init();
    await expect(a.showMidgameAd()).resolves.toBeUndefined();
  });

  it('passes the game id and resolves init on SDK_READY', async () => {
    const { load } = fakeGd(() => Promise.resolve());
    const a = new GameDistributionAdapter('game-123', load);
    await a.init();
    expect((g.GD_OPTIONS as { gameId: string }).gameId).toBe('game-123');
  });

  it('does not hang the boot when the SDK never answers', async () => {
    const a = new GameDistributionAdapter('game-123', () => new Promise(() => undefined));
    let booted = false;
    void a.init().then(() => (booted = true));
    await vi.advanceTimersByTimeAsync(3100);
    expect(booted).toBe(true);
  });

  it('mutes when an ad pauses the game and resumes only on SDK_GAME_START', async () => {
    let finishAd: () => void = () => undefined;
    const { fake, load } = fakeGd((emit) => {
      emit('SDK_GAME_PAUSE');
      // GD settles the promise; the game must still wait for SDK_GAME_START.
      finishAd = () => {
        emit('SDK_GAME_START');
      };
      return Promise.resolve();
    });
    const a = new GameDistributionAdapter('id', load);
    await a.init();
    const onStart = vi.fn();
    let done = false;
    void a.showMidgameAd(onStart).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(20000);
    expect(fake.showAd).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
    expect(done).toBe(false); // the ad is still on screen
    finishAd();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });

  it('never mutes for an unfilled ad and resumes right away', async () => {
    const { load } = fakeGd(() => Promise.reject(new Error('no fill')));
    const a = new GameDistributionAdapter('id', load);
    await a.init();
    const onStart = vi.fn();
    let done = false;
    void a.showMidgameAd(onStart).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('resolves when showAd throws or the SDK is blocked', async () => {
    const { load } = fakeGd(() => {
      throw new Error('boom');
    });
    const a = new GameDistributionAdapter('id', load);
    await a.init();
    await expect(a.showMidgameAd()).resolves.toBeUndefined();
    delete g.gdsdk;
    await expect(a.showMidgameAd()).resolves.toBeUndefined();
  });

  it('gives up on an ad that never starts, and caps one that never ends', async () => {
    const { load } = fakeGd(() => new Promise(() => undefined));
    const a = new GameDistributionAdapter('id', load);
    await a.init();
    let done = false;
    void a.showMidgameAd().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(6100);
    expect(done).toBe(true);

    const stuck = fakeGd((emit) => {
      emit('SDK_GAME_PAUSE');
      return new Promise(() => undefined);
    });
    const b = new GameDistributionAdapter('id', stuck.load);
    await b.init();
    let capped = false;
    void b.showMidgameAd().then(() => (capped = true));
    await vi.advanceTimersByTimeAsync(59000);
    expect(capped).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(capped).toBe(true);
  });

  it('forwards pauses the SDK starts on its own to the game', async () => {
    const { fake, load } = fakeGd(() => Promise.resolve());
    const a = new GameDistributionAdapter('id', load);
    await a.init();
    const seen: boolean[] = [];
    a.onPauseRequest((paused) => seen.push(paused));
    fake.emit('SDK_GAME_PAUSE');
    fake.emit('SDK_GAME_START');
    expect(seen).toEqual([true, false]);
  });
});
