import { CONFIG } from '@/config';
import type { World } from '../world';

/**
 * Boost costs mass: while boosting, a creature burns a share of its mass every second.
 * Half of what it burns is dropped behind it as small orbs, so a chase leaves a trail
 * that smaller creatures can feed on (and that shows where the chaser went).
 */
export function boostSystem(world: World, dt: number): void {
  const { drainRate, minDrainPerSec, minMass, dropFraction, dropOrbMass, dropOrbRadius } =
    CONFIG.boost;
  const orbCap = CONFIG.orbs.count * 1.5;

  for (const c of world.creatures.values()) {
    if (!c.alive || !world.isBoosting(c)) continue;
    const burn = Math.min(c.mass - minMass, Math.max(minDrainPerSec, c.mass * drainRate) * dt);
    if (burn <= 0) continue;
    c.mass -= burn;
    c.boostDropAcc += burn * dropFraction;

    while (c.boostDropAcc >= dropOrbMass) {
      c.boostDropAcc -= dropOrbMass;
      if (world.orbs.length >= orbCap) continue;
      const r = world.radiusFor(c.mass);
      const jitter = world.rng.range(-0.4, 0.4);
      world.spawnOrb(
        {
          x: c.pos.x - (c.dir.x + c.dir.y * jitter) * (r + 8),
          y: c.pos.y - (c.dir.y - c.dir.x * jitter) * (r + 8),
        },
        { mass: dropOrbMass, radius: dropOrbRadius, hue: c.hue },
      );
    }
  }
}
