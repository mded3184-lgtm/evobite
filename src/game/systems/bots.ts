import { CONFIG } from '@/config';
import { distSq, normalize, sub } from '@/core/vec';
import type { Creature, Orb } from '../types';
import type { World } from '../world';
import { canEat } from './eating';

interface Perception {
  threat: Creature | null;
  threatDistSq: number;
  prey: Creature | null;
  preyDistSq: number;
  orb: Orb | null;
}

function perceive(world: World, me: Creature, creatures: readonly Creature[]): Perception {
  const vision = CONFIG.bots.visionBase * (1 + Math.sqrt(me.mass) * 0.05) * me.stats.senseMult;
  const visionSq = vision * vision;
  const p: Perception = {
    threat: null,
    threatDistSq: Infinity,
    prey: null,
    preyDistSq: Infinity,
    orb: null,
  };

  for (const other of creatures) {
    if (other.id === me.id || !other.alive) continue;
    const d2 = distSq(me.pos, other.pos);
    if (d2 > visionSq) continue;
    if (canEat(other, me) && d2 < p.threatDistSq) {
      p.threat = other;
      p.threatDistSq = d2;
    } else if (canEat(me, other) && d2 < p.preyDistSq && other.invulnUntil <= world.time) {
      p.prey = other;
      p.preyDistSq = d2;
    }
  }

  // Nearest orb inside a shorter radius; sampling every 3rd orb keeps this cheap.
  let best = Infinity;
  const orbVisionSq = vision * 0.6 * (vision * 0.6);
  for (let i = 0; i < world.orbs.length; i += 3) {
    const orb = world.orbs[i];
    if (!orb?.alive) continue;
    const d2 = distSq(me.pos, orb.pos);
    if (d2 < best && d2 < orbVisionSq) {
      best = d2;
      p.orb = orb;
    }
  }
  return p;
}

function steerToward(me: Creature, target: { x: number; y: number }): void {
  const dir = normalize(sub(target, me.pos));
  if (dir.x !== 0 || dir.y !== 0) {
    me.heading.x = dir.x;
    me.heading.y = dir.y;
  }
}

function steerAway(me: Creature, from: { x: number; y: number }): void {
  const dir = normalize(sub(me.pos, from));
  // Flee tangentially a bit so bots don't run straight into the wall.
  const tangent = { x: -dir.y, y: dir.x };
  const bias = Math.sign(me.pos.x * dir.y - me.pos.y * dir.x) || 1;
  me.heading.x = dir.x * 0.85 + tangent.x * 0.35 * bias;
  me.heading.y = dir.y * 0.85 + tangent.y * 0.35 * bias;
  const n = normalize(me.heading);
  me.heading.x = n.x;
  me.heading.y = n.y;
}

/**
 * Keeps bots off the arena wall. Near the edge the outward part of the heading is removed and
 * replaced by a slide along the wall plus a gentle push inward, choosing the side away from a
 * pursuer. Without this, a bot fleeing toward the edge pinned itself against the wall for
 * seconds. Runs every tick (not only when the bot "thinks"), so it reacts in time.
 */
export function avoidWalls(world: World, me: Creature, threat: Creature | null): void {
  const d = Math.hypot(me.pos.x, me.pos.y);
  if (d === 0) return;
  const r = world.radiusFor(me.mass);
  const gap = CONFIG.arena.radius - d - r * 0.5;
  const margin = r * 1.5 + CONFIG.bots.wallMargin;
  if (gap >= margin) return;

  const n = { x: me.pos.x / d, y: me.pos.y / d }; // outward normal
  const urgency = Math.min(1, Math.max(0, 1 - gap / margin));
  const outward = me.heading.x * n.x + me.heading.y * n.y;
  if (outward < -0.25) return; // already heading back in

  const t = { x: -n.y, y: n.x }; // tangent
  let side = Math.sign(me.heading.x * t.x + me.heading.y * t.y);
  if (threat) {
    // Slide along the wall away from whoever is chasing us.
    const toThreat = (threat.pos.x - me.pos.x) * t.x + (threat.pos.y - me.pos.y) * t.y;
    if (Math.abs(toThreat) > 1) side = -Math.sign(toThreat);
  }
  if (side === 0) side = me.id % 2 === 0 ? 1 : -1;

  const inward = 0.25 + urgency * 0.9;
  const hx = t.x * side * (1 - urgency * 0.4) - n.x * inward;
  const hy = t.y * side * (1 - urgency * 0.4) - n.y * inward;
  const len = Math.hypot(hx, hy) || 1;
  me.heading.x = hx / len;
  me.heading.y = hy / len;
}

/**
 * Simple but convincing bot AI: flee the nearest predator, hunt the nearest prey, otherwise
 * drift toward orbs with a wandering heading. Each bot re-thinks a few times per second so
 * 30 bots cost almost nothing and don't react with inhuman precision.
 */
export function botSystem(world: World, dt: number): void {
  const creatures: Creature[] = [];
  for (const c of world.creatures.values()) if (c.alive) creatures.push(c);

  for (const me of creatures) {
    const brain = me.bot;
    if (!brain) continue;
    brain.thinkTimer -= dt;
    if (brain.thinkTimer > 0) {
      const threat =
        brain.state === 'flee' && brain.targetId !== null
          ? (world.creatures.get(brain.targetId) ?? null)
          : null;
      avoidWalls(world, me, threat);
      continue;
    }
    brain.thinkTimer = CONFIG.bots.thinkInterval * world.rng.range(0.7, 1.3);

    const p = perceive(world, me, creatures);
    const myR = world.radiusFor(me.mass);

    // Danger is weighted by caution: cautious bots flee from further away.
    const fleeRange = (myR * 6 + 160) * (0.6 + brain.caution * 0.9);
    if (p.threat && p.threatDistSq < fleeRange * fleeRange) {
      brain.state = 'flee';
      brain.targetId = p.threat.id;
      steerAway(me, p.threat.pos);
      avoidWalls(world, me, p.threat);
      // Panic boost when the predator is really close.
      const panic = myR * 3 + world.radiusFor(p.threat.mass) * 1.5;
      // Only cautious bots panic-boost, so prey is catchable more often than not.
      me.boosting =
        me.mass > CONFIG.boost.botMinMass && brain.caution > 0.7 && p.threatDistSq < panic * panic;
      continue;
    }

    const huntRange = (myR * 8 + 240) * (0.5 + brain.aggression);
    if (p.prey && p.preyDistSq < huntRange * huntRange) {
      brain.state = 'hunt';
      brain.targetId = p.prey.id;
      // Lead the target a little using its current direction.
      const lead = Math.sqrt(p.preyDistSq) * 0.25;
      // Aggressive bots burst at prey that is almost in reach.
      const lunge = myR * 2.5 + 60;
      me.boosting =
        me.mass > CONFIG.boost.botMinMass && brain.aggression > 0.7 && p.preyDistSq < lunge * lunge;
      steerToward(me, {
        x: p.prey.pos.x + p.prey.dir.x * lead,
        y: p.prey.pos.y + p.prey.dir.y * lead,
      });
      continue;
    }

    me.boosting = false;
    if (p.orb) {
      brain.state = 'graze';
      brain.targetId = null;
      steerToward(me, p.orb.pos);
      continue;
    }

    brain.state = 'wander';
    brain.targetId = null;
    brain.wanderAngle += world.rng.range(-0.9, 0.9);
    // Pull wanderers back toward the centre so they don't hug the wall.
    const centreBias = Math.min(1, Math.sqrt(distSq(me.pos, { x: 0, y: 0 })) / CONFIG.arena.radius);
    const toCentre = normalize({ x: -me.pos.x, y: -me.pos.y });
    me.heading.x = Math.cos(brain.wanderAngle) * (1 - centreBias) + toCentre.x * centreBias;
    me.heading.y = Math.sin(brain.wanderAngle) * (1 - centreBias) + toCentre.y * centreBias;
    const n = normalize(me.heading);
    me.heading.x = n.x;
    me.heading.y = n.y;
  }
}
