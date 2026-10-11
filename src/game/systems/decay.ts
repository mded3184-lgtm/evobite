import { CONFIG } from '@/config';
import type { World } from '../world';

/**
 * Passive mass loss for big creatures. Keeps the arena dynamic: a giant that stops
 * hunting slowly shrinks back into the pack, and Titan's "no decay" perk means something.
 */
export function decaySystem(world: World, dt: number): void {
  const { decayRate, decayStartMass, decaySoftCap } = CONFIG.creature;
  for (const c of world.creatures.values()) {
    if (!c.alive || c.mass <= decayStartMass) continue;
    if (world.paused && c.kind === 'player') continue;
    const excess = c.mass - decayStartMass;
    // Soft cap: giants bleed faster, so nobody can grow to fill the arena.
    const sizeFactor = 1 + c.mass / decaySoftCap;
    c.mass -= excess * decayRate * sizeFactor * c.stats.decayMult * dt;
  }
}
