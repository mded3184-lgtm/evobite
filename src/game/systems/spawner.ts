import { CONFIG } from '@/config';
import { randomName } from '../names';
import type { World } from '../world';

/**
 * Keeps the arena populated: compacts dead orbs and respawns them, and replaces eaten bots
 * after a short delay so the population stays at the configured count.
 */
export function spawnerSystem(world: World): void {
  // Orbs: swap-remove dead ones, then top up.
  const orbs = world.orbs;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    if (orb && !orb.alive) {
      const last = orbs[orbs.length - 1];
      if (last) orbs[i] = last;
      orbs.pop();
    }
  }
  while (orbs.length < CONFIG.orbs.count) world.spawnOrb();

  // Bots: remove dead ones and respawn to keep the count.
  let botCount = 0;
  for (const c of world.creatures.values()) {
    if (c.kind !== 'bot') continue;
    if (!c.alive) {
      world.removeCreature(c.id);
      continue;
    }
    botCount++;
  }
  while (botCount < CONFIG.bots.count) {
    spawnBot(world);
    botCount++;
  }
}

export function spawnBot(world: World): void {
  const { bots } = CONFIG;
  const elite = world.rng.chance(bots.eliteChance);
  const mass = elite
    ? world.rng.range(bots.eliteMassMin, bots.eliteMassMax)
    : world.rng.range(bots.spawnMassMin, bots.spawnMassMax);
  const bot = world.spawnCreature('bot', randomName(world.rng), mass);
  // Elites arrive already evolved so the player meets real builds, not blank giants.
  if (elite) {
    bot.invulnUntil = world.time; // no spawn protection for giants
  }
}
