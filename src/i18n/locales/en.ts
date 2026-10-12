/**
 * Source strings. Every other locale must provide exactly these keys (enforced by the type).
 * Placeholders like {name} are filled at runtime; keep them identical in translations.
 */
export const en = {
  'lobby.tagline': 'Eat. Grow. Every 30 seconds, choose what you become.',
  'lobby.nickname': 'nickname',
  'lobby.play': 'Play',
  'lobby.skins': 'Skins',
  'lobby.perks': 'Perks',
  'lobby.language': 'Language',
  'lobby.hint': 'Move: mouse or drag · Boost: hold Space · Pause: P · Evolve: 1 / 2',
  'stat.bestMass': 'best mass',
  'stat.kills': 'kills',
  'stat.rounds': 'rounds',
  'stat.forms': 'forms',

  'shop.title': 'Skins',
  'shop.hint': 'Earn coins every round: size, kills and revenge all pay.',
  'shop.equip': 'Equip',
  'shop.equipped': 'Equipped',

  'perks.title': 'Perks',
  'perks.intro':
    'At each mass threshold the game pauses and you pick one of two perks. Four picks make one of 16 forms.',
  'perks.tier': 'Evolution {n}',
  'perks.atMass': 'at mass {mass}',
  'perks.or': 'or',
  'perks.rule.base':
    'Without perks you must be {ratio} bigger than a creature to eat it, and you gain {absorb} of its mass.',
  'perks.rule.stack': 'Speed, food and absorb bonuses add up across perks.',
  'perks.rule.best':
    'For how much bigger you must be to eat or to be eaten, your best perk counts.',
  'perks.rule.decay':
    'Above mass {mass} you slowly lose mass, faster the bigger you are. Boosting also costs mass.',

  'hud.mass': 'mass',
  'hud.evolveAt': 'Evolve at {mass}',
  'hud.fullyEvolved': 'Fully evolved',
  'hud.rank': '#{rank} of {total}',
  'hud.boost': 'BOOST',
  'toast.evolved': 'Evolved: {name}',
  'toast.ate': 'Ate {name}',
  'toast.revenge': 'REVENGE on {name}!',
  'arena.revenge': 'REVENGE',

  'picker.paused': 'Game paused',
  'picker.title': 'Evolution {n} / 4 — choose your path',
  'picker.build': 'Your build',
  'chip.choosing': 'choosing now',
  'chip.at': 'at {mass}',

  'death.eatenBy': 'Eaten by {name}',
  'death.maxMass': 'max mass',
  'death.kills': 'kills',
  'death.survived': 'survived',
  'death.coins': 'coins',
  'death.revenge': 'Revenge served ×{n}',
  'death.respawn': 'Respawn',
  'death.menu': 'Menu',
  'death.summary': '{coins} coins · best {best}',
  'death.skinNudge': 'You can afford a new skin! Open Menu → Skins',

  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.soundOn': 'Sound: on',
  'pause.soundOff': 'Sound: off',
  'pause.quit': 'Quit to menu',
  'pause.hint': 'P to resume',

  'error.start': 'Failed to start. Please reload.',

  'form.hatchling': 'Hatchling',

  'branch.swift': 'Swift',
  'branch.bulk': 'Bulk',
  'branch.venom': 'Venom',
  'branch.armor': 'Armor',
  'branch.hunter': 'Hunter',
  'branch.grazer': 'Grazer',
  'branch.apex': 'Apex',
  'branch.titan': 'Titan',

  'blurb.swift': 'Move {speed} faster. Catch prey, escape anything.',
  'blurb.bulk': 'Orbs give {food} more mass and eaten creatures {absorb} more.',
  'blurb.venom':
    'Creatures touching you lose {rate} of the smaller mass per second. You gain half.',
  'blurb.armor': 'Enemies must be {ratio} bigger to eat you. Venom hits you {resist} weaker.',
  'blurb.hunter': 'Eat creatures only {ratio} smaller than you and absorb {absorb} more.',
  'blurb.grazer': 'Pull nearby orbs toward you. Never stop growing.',
  'blurb.apex': 'Eat anything {ratio} smaller than you. Absorb {absorb} more of it.',
  'blurb.titan': 'Lose mass {decay} slower. Enemies must be {ratio} bigger to eat you.',

  'short.swift': '+{speed} speed',
  'short.bulk': '+{food} from orbs',
  'short.venom': 'drains on touch',
  'short.armor': 'hard to eat',
  'short.hunter': 'eat at +{ratio}',
  'short.grazer': 'pulls orbs',
  'short.apex': 'eat at +{ratio}',
  'short.titan': 'slow decay',

  'tag.speed': '+speed',
  'tag.slower': '−speed',
  'tag.food': '+food',
  'tag.absorb': '+absorb',
  'tag.drain': 'drain on touch',
  'tag.hardToEat': 'hard to eat',
  'tag.venomResist': 'venom resist',
  'tag.easierKills': 'easier kills',
  'tag.magnet': 'orb magnet',
  'tag.slowDecay': 'slow decay',

  'skin.classic': 'Mint',
  'skin.ocean': 'Ocean',
  'skin.sunset': 'Sunset',
  'skin.toxic': 'Toxic',
  'skin.candy': 'Candy',
  'skin.lava': 'Lava',
  'skin.shadow': 'Shadow',
  'skin.gold': 'Gold',
  'skin.galaxy': 'Galaxy',
  'skin.rainbow': 'Rainbow',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
