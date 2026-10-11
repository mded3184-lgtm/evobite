import type { Messages } from './en';

export const fr: Messages = {
  'lobby.tagline': 'Mange. Grandis. Toutes les 30 secondes, choisis ce que tu deviens.',
  'lobby.nickname': 'pseudo',
  'lobby.play': 'Jouer',
  'lobby.skins': 'Skins',
  'lobby.perks': 'Atouts',
  'lobby.language': 'Langue',
  'lobby.hint': 'Bouger : souris ou glisser · Boost : Espace · Pause : Échap · Évoluer : 1 / 2',
  'stat.bestMass': 'masse record',
  'stat.kills': 'victimes',
  'stat.rounds': 'parties',
  'stat.forms': 'formes',

  'shop.title': 'Skins',
  'shop.hint': 'Gagne des pièces à chaque partie : taille, victimes et vengeance rapportent.',
  'shop.equip': 'Équiper',
  'shop.equipped': 'Équipé',

  'perks.title': 'Atouts',
  'perks.intro':
    'À chaque palier de masse, le jeu se met en pause et tu choisis un atout parmi deux. Quatre choix donnent une des 16 formes.',
  'perks.tier': 'Évolution {n}',
  'perks.atMass': 'à masse {mass}',
  'perks.or': 'ou',
  'perks.rule.base':
    'Sans atout, tu dois être {ratio} plus gros qu’une créature pour la manger, et tu gagnes {absorb} de sa masse.',
  'perks.rule.stack': 'Les bonus de vitesse, de nourriture et d’absorption s’additionnent.',
  'perks.rule.best':
    'Pour l’écart de taille nécessaire pour manger ou être mangé, ton meilleur atout compte.',
  'perks.rule.decay':
    'Au-dessus de la masse {mass}, tu perds lentement de la masse, plus vite si tu es gros. Le boost coûte aussi de la masse.',

  'hud.mass': 'masse',
  'hud.evolveAt': 'Évolue à {mass}',
  'hud.fullyEvolved': 'Évolution complète',
  'hud.rank': '#{rank} sur {total}',
  'hud.boost': 'BOOST',
  'toast.evolved': 'Évolution : {name}',
  'toast.ate': 'Tu as mangé {name}',
  'toast.revenge': 'VENGEANCE sur {name} !',
  'arena.revenge': 'VENGEANCE',

  'picker.paused': 'Jeu en pause',
  'picker.title': 'Évolution {n} / 4 — choisis ta voie',
  'picker.build': 'Ton build',
  'chip.choosing': 'en cours',
  'chip.at': 'à {mass}',

  'death.eatenBy': 'Mangé par {name}',
  'death.maxMass': 'masse max',
  'death.kills': 'victimes',
  'death.survived': 'survie',
  'death.coins': 'pièces',
  'death.revenge': 'Vengeance accomplie ×{n}',
  'death.respawn': 'Rejouer',
  'death.menu': 'Menu',
  'death.summary': '{coins} pièces · record {best}',
  'death.skinNudge': 'Tu peux acheter un nouveau skin ! Menu → Skins',

  'pause.title': 'Pause',
  'pause.resume': 'Reprendre',
  'pause.soundOn': 'Son : activé',
  'pause.soundOff': 'Son : coupé',
  'pause.quit': 'Retour au menu',
  'pause.hint': 'Échap ou P pour reprendre',

  'error.start': 'Échec du lancement. Recharge la page.',

  'form.hatchling': 'Larve',

  'branch.swift': 'Vif',
  'branch.bulk': 'Costaud',
  'branch.venom': 'Venin',
  'branch.armor': 'Armure',
  'branch.hunter': 'Chasseur',
  'branch.grazer': 'Glaneur',
  'branch.apex': 'Prédateur',
  'branch.titan': 'Titan',

  'blurb.swift': 'Déplace-toi {speed} plus vite. Attrape tes proies, échappe à tout.',
  'blurb.bulk':
    'Les orbes donnent {food} de masse en plus, les créatures mangées {absorb} en plus.',
  'blurb.venom':
    'Qui te touche perd {rate} de la plus petite masse par seconde. Tu en gagnes la moitié.',
  'blurb.armor':
    'Les ennemis doivent être {ratio} plus gros pour te manger. Le venin te touche {resist} moins.',
  'blurb.hunter': 'Mange des créatures seulement {ratio} plus petites et absorbe {absorb} de plus.',
  'blurb.grazer': 'Attire les orbes proches. Ne t’arrête jamais de grandir.',
  'blurb.apex': 'Mange tout ce qui est {ratio} plus petit que toi. Absorbe {absorb} de plus.',
  'blurb.titan':
    'Perds ta masse {decay} plus lentement. Les ennemis doivent être {ratio} plus gros pour te manger.',

  'short.swift': '+{speed} vitesse',
  'short.bulk': '+{food} des orbes',
  'short.venom': 'draine au contact',
  'short.armor': 'dur à manger',
  'short.hunter': 'mange à +{ratio}',
  'short.grazer': 'attire les orbes',
  'short.apex': 'mange à +{ratio}',
  'short.titan': 'perte réduite',

  'tag.speed': '+vitesse',
  'tag.slower': '−vitesse',
  'tag.food': '+nourriture',
  'tag.absorb': '+absorption',
  'tag.drain': 'venin au contact',
  'tag.hardToEat': 'dur à manger',
  'tag.venomResist': 'résiste au venin',
  'tag.easierKills': 'victimes faciles',
  'tag.magnet': 'aimant à orbes',
  'tag.slowDecay': 'perte réduite',

  'skin.classic': 'Menthe',
  'skin.ocean': 'Océan',
  'skin.sunset': 'Couchant',
  'skin.toxic': 'Toxique',
  'skin.candy': 'Bonbon',
  'skin.lava': 'Lave',
  'skin.shadow': 'Ombre',
  'skin.gold': 'Or',
  'skin.galaxy': 'Galaxie',
  'skin.rainbow': 'Arc-en-ciel',
};
