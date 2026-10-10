import { CONFIG } from '@/config';
import type { World } from '../world';

/**
 * Passive mass loss for big creatures. Keeps the arena dynamic: a giant that stops
 * hunting slowly shrinks back into the pack, and Titan's "no decay" perk means something.
 */
export function decaySystem(world: World, dt: number): void {
  const { decayRate, decayStartMass } = CONFIG.creature;
  for (const c of world.creatures.values()) {
    if (!c.alive || c.mass <= decayStartMass) continue;
    if (world.paused && c.kind === 'player') continue;
    const excess = c.mass - decayStartMass;
    c.mass -= excess * decayRate * c.stats.decayMult * dt;
  }
}
