import { describe, expect, it } from 'vitest';
import { SKINS } from '@/game/skins';
import { drawCreatureArt } from '@/render/creatureArt';

/**
 * Minimal canvas stub that enforces the one rule real browsers throw on:
 * gradient colour stops must be within [0, 1].
 */
function stubCtx(): CanvasRenderingContext2D {
  const gradient = {
    addColorStop(offset: number) {
      if (!(offset >= 0 && offset <= 1)) throw new RangeError(`stop ${String(offset)}`);
    },
  };
  const noop = (): void => undefined;
  return new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === 'createLinearGradient' || prop === 'createRadialGradient' ? () => gradient : noop,
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
}

describe('drawCreatureArt', () => {
  it('draws every skin at every moment of its animation without throwing', () => {
    const ctx = stubCtx();
    for (const skin of SKINS) {
      for (let time = 0; time < 12; time += 0.037) {
        drawCreatureArt(ctx, {
          x: 50,
          y: 50,
          r: 30,
          dir: { x: 1, y: 0 },
          hue: skin.hue,
          skin,
          path: ['swift', 'venom', 'hunter', 'apex'],
          time,
          boosting: true,
          magnetPx: 10,
        });
      }
    }
    expect(true).toBe(true);
  });
});
