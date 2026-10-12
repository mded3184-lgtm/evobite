import type { Messages } from './en';

export const ru: Messages = {
  'lobby.tagline': 'Ешь. Расти. Каждые 30 секунд выбирай, кем стать.',
  'lobby.nickname': 'никнейм',
  'lobby.play': 'Играть',
  'lobby.skins': 'Скины',
  'lobby.perks': 'Перки',
  'lobby.language': 'Язык',
  'lobby.hint': 'Движение: мышь или палец · Рывок: пробел · Пауза: P · Эволюция: 1 / 2',
  'stat.bestMass': 'рекорд массы',
  'stat.kills': 'убийства',
  'stat.rounds': 'раунды',
  'stat.forms': 'формы',

  'shop.title': 'Скины',
  'shop.hint': 'Монеты даются за каждый раунд: за размер, убийства и месть.',
  'shop.equip': 'Надеть',
  'shop.equipped': 'Надето',

  'perks.title': 'Перки',
  'perks.intro':
    'На каждом пороге массы игра ставится на паузу, и ты выбираешь один из двух перков. Четыре выбора дают одну из 16 форм.',
  'perks.tier': 'Эволюция {n}',
  'perks.atMass': 'при массе {mass}',
  'perks.or': 'или',
  'perks.rule.base':
    'Без перков, чтобы съесть существо, нужно быть больше него на {ratio}, и ты получаешь {absorb} его массы.',
  'perks.rule.stack': 'Бонусы к скорости, еде и поглощению от разных перков складываются.',
  'perks.rule.best':
    'Для того, насколько больше нужно быть, чтобы есть или быть съеденным, действует твой лучший перк.',
  'perks.rule.decay':
    'Выше массы {mass} ты постепенно теряешь массу, и чем больше, тем быстрее. Рывок тоже стоит массы.',

  'hud.mass': 'масса',
  'hud.evolveAt': 'Эволюция при {mass}',
  'hud.fullyEvolved': 'Полная эволюция',
  'hud.rank': '#{rank} из {total}',
  'hud.boost': 'РЫВОК',
  'toast.evolved': 'Эволюция: {name}',
  'toast.ate': 'Съеден {name}',
  'toast.revenge': 'МЕСТЬ игроку {name}!',
  'arena.revenge': 'МЕСТЬ',

  'picker.paused': 'Игра на паузе',
  'picker.title': 'Эволюция {n} / 4 — выбери свой путь',
  'picker.build': 'Твой билд',
  'chip.choosing': 'выбираешь',
  'chip.at': 'при {mass}',

  'death.eatenBy': 'Тебя съел {name}',
  'death.maxMass': 'макс. масса',
  'death.kills': 'убийства',
  'death.survived': 'прожито',
  'death.coins': 'монеты',
  'death.revenge': 'Месть свершилась ×{n}',
  'death.respawn': 'Снова',
  'death.menu': 'Меню',
  'death.summary': '{coins} монет · рекорд {best}',
  'death.skinNudge': 'Тебе хватает на новый скин! Меню → Скины',

  'pause.title': 'Пауза',
  'pause.resume': 'Продолжить',
  'pause.soundOn': 'Звук: вкл.',
  'pause.soundOff': 'Звук: выкл.',
  'pause.quit': 'Выйти в меню',
  'pause.hint': 'P, чтобы продолжить',

  'error.start': 'Не удалось запустить игру. Обнови страницу.',

  'form.hatchling': 'Малыш',

  'branch.swift': 'Ловкость',
  'branch.bulk': 'Масса',
  'branch.venom': 'Яд',
  'branch.armor': 'Броня',
  'branch.hunter': 'Охотник',
  'branch.grazer': 'Собиратель',
  'branch.apex': 'Хищник',
  'branch.titan': 'Титан',

  'blurb.swift': 'Двигаешься на {speed} быстрее. Догоняй добычу, убегай от всех.',
  'blurb.bulk': 'Шары дают на {food} больше массы, а съеденные существа на {absorb} больше.',
  'blurb.venom':
    'Кто тебя касается, теряет {rate} меньшей из ваших масс в секунду. Половина достаётся тебе.',
  'blurb.armor':
    'Врагу нужно быть больше на {ratio}, чтобы тебя съесть. Яд действует на тебя на {resist} слабее.',
  'blurb.hunter': 'Ешь существ, меньших тебя всего на {ratio}, и поглощай на {absorb} больше.',
  'blurb.grazer': 'Притягиваешь шары поблизости. Растёшь без остановки.',
  'blurb.apex': 'Ешь всё, что меньше тебя на {ratio}. Поглощай на {absorb} больше.',
  'blurb.titan':
    'Теряешь массу на {decay} медленнее. Врагу нужно быть больше на {ratio}, чтобы тебя съесть.',

  'short.swift': '+{speed} скорость',
  'short.bulk': '+{food} с шаров',
  'short.venom': 'яд при касании',
  'short.armor': 'трудно съесть',
  'short.hunter': 'ест при +{ratio}',
  'short.grazer': 'тянет шары',
  'short.apex': 'ест при +{ratio}',
  'short.titan': 'медленная потеря',

  'tag.speed': '+скорость',
  'tag.slower': '−скорость',
  'tag.food': '+еда',
  'tag.absorb': '+поглощение',
  'tag.drain': 'яд при касании',
  'tag.hardToEat': 'трудно съесть',
  'tag.venomResist': 'устойчивость к яду',
  'tag.easierKills': 'лёгкие убийства',
  'tag.magnet': 'магнит шаров',
  'tag.slowDecay': 'медленная потеря',

  'skin.classic': 'Мята',
  'skin.ocean': 'Океан',
  'skin.sunset': 'Закат',
  'skin.toxic': 'Токсин',
  'skin.candy': 'Конфета',
  'skin.lava': 'Лава',
  'skin.shadow': 'Тень',
  'skin.gold': 'Золото',
  'skin.galaxy': 'Галактика',
  'skin.rainbow': 'Радуга',
};
