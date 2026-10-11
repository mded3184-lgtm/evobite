import { describe, expect, it } from 'vitest';
import { buySkin, mergeProgress, selectSkin } from '@/game/economy';
import { Game } from '@/game/game';
import { DEFAULT_SKIN_ID, getSkin, SKINS } from '@/game/skins';

describe('skin catalogue', () => {
  it('has unique ids, a free default and strictly rising prices', () => {
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(SKINS[0]?.id).toBe(DEFAULT_SKIN_ID);
    expect(SKINS[0]?.price).toBe(0);
    for (let i = 1; i < SKINS.length; i++) {
      expect(SKINS[i]?.price).toBeGreaterThan(SKINS[i - 1]?.price ?? 0);
    }
  });

  it('looks skins up by id and rejects unknown ids', () => {
    expect(getSkin('gold')?.name).toBe('Gold');
    expect(getSkin('nope')).toBeNull();
    expect(getSkin(null)).toBeNull();
  });
});

describe('buying and equipping', () => {
  const rich = { ...mergeProgress(null), coins: 1000 };

  it('buys, spends coins and equips', () => {
    const r = buySkin(rich, 'ocean');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.coins).toBe(1000 - 120);
    expect(r.progress.ownedSkins).toContain('ocean');
    expect(r.progress.selectedSkin).toBe('ocean');
    expect(rich.ownedSkins).not.toContain('ocean'); // input untouched
  });

  it('refuses when broke, already owned or unknown', () => {
    expect(buySkin({ ...rich, coins: 50 }, 'ocean')).toEqual({ ok: false, reason: 'coins' });
    expect(buySkin(rich, 'classic')).toEqual({ ok: false, reason: 'owned' });
    expect(buySkin(rich, 'nope')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('only equips owned skins', () => {
    expect(selectSkin(rich, 'gold').selectedSkin).toBe('classic');
    const bought = buySkin(rich, 'toxic');
    if (!bought.ok) throw new Error('expected purchase');
    const back = selectSkin(bought.progress, 'classic');
    expect(back.selectedSkin).toBe('classic');
    expect(selectSkin(back, 'toxic').selectedSkin).toBe('toxic');
  });

  it('save data cannot equip a skin it does not own or that does not exist', () => {
    expect(mergeProgress({ selectedSkin: 'rainbow' }).selectedSkin).toBe('classic');
    const p = mergeProgress({ ownedSkins: ['rainbow', 'fake'], selectedSkin: 'rainbow' });
    expect(p.ownedSkins).toEqual(['classic', 'rainbow']);
    expect(p.selectedSkin).toBe('rainbow');
  });
});

describe('skins in the arena', () => {
  it('the player spawns wearing the equipped skin', () => {
    const game = new Game(1);
    game.playerSkin = 'lava';
    const p = game.startRound();
    expect(p.skin).toBe('lava');
    expect(p.hue).toBe(getSkin('lava')?.hue);
  });

  it('falls back to the default for an unknown skin id', () => {
    const game = new Game(2);
    game.playerSkin = 'missing';
    expect(game.startRound().skin).toBe(DEFAULT_SKIN_ID);
  });

  it('some bots wear paid skins', () => {
    const game = new Game(3);
    const skinned = [...game.world.creatures.values()].filter((c) => c.skin !== null);
    expect(skinned.length).toBeGreaterThan(0);
    for (const c of skinned) expect(getSkin(c.skin)?.price).toBeGreaterThan(0);
  });
});
