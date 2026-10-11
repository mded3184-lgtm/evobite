import type { Messages } from './en';

export const uk: Messages = {
  'lobby.tagline': 'Їж. Рости. Кожні 30 секунд обирай, ким стати.',
  'lobby.nickname': 'нікнейм',
  'lobby.play': 'Грати',
  'lobby.skins': 'Скіни',
  'lobby.perks': 'Перки',
  'lobby.language': 'Мова',
  'lobby.hint': 'Рух: мишка або палець · Прискорення: пробіл · Пауза: Esc · Еволюція: 1 / 2',
  'stat.bestMass': 'рекорд маси',
  'stat.kills': 'вбивства',
  'stat.rounds': 'раунди',
  'stat.forms': 'форми',

  'shop.title': 'Скіни',
  'shop.hint': 'Монети даються за кожен раунд: за розмір, вбивства і помсту.',
  'shop.equip': 'Вдягти',
  'shop.equipped': 'Вдягнено',

  'perks.title': 'Перки',
  'perks.intro':
    'На кожному порозі маси гра стає на паузу, і ти обираєш один із двох перків. Чотири вибори дають одну з 16 форм.',
  'perks.tier': 'Еволюція {n}',
  'perks.atMass': 'при масі {mass}',
  'perks.or': 'або',
  'perks.rule.base':
    'Без перків, щоб з’їсти істоту, треба бути більшим за неї на {ratio}, і ти отримуєш {absorb} її маси.',
  'perks.rule.stack': 'Бонуси до швидкості, їжі та поглинання з різних перків додаються.',
  'perks.rule.best':
    'Для того, наскільки більшим треба бути, щоб їсти або щоб тебе з’їли, діє твій найкращий перк.',
  'perks.rule.decay':
    'Вище маси {mass} ти поступово втрачаєш масу, і що більший, то швидше. Прискорення теж коштує маси.',

  'hud.mass': 'маса',
  'hud.evolveAt': 'Еволюція при {mass}',
  'hud.fullyEvolved': 'Повна еволюція',
  'hud.rank': '#{rank} з {total}',
  'hud.boost': 'РИВОК',
  'toast.evolved': 'Еволюція: {name}',
  'toast.ate': 'З’їдено {name}',
  'toast.revenge': 'ПОМСТА гравцю {name}!',
  'arena.revenge': 'ПОМСТА',

  'picker.paused': 'Гру призупинено',
  'picker.title': 'Еволюція {n} / 4 — обери свій шлях',
  'picker.build': 'Твій білд',
  'chip.choosing': 'обираєш зараз',
  'chip.at': 'при {mass}',

  'death.eatenBy': 'Тебе з’їв {name}',
  'death.maxMass': 'макс. маса',
  'death.kills': 'вбивства',
  'death.survived': 'прожито',
  'death.coins': 'монети',
  'death.revenge': 'Помсту здійснено ×{n}',
  'death.respawn': 'Знову',
  'death.menu': 'Меню',
  'death.summary': '{coins} монет · рекорд {best}',
  'death.skinNudge': 'Тобі вистачає на новий скін! Меню → Скіни',

  'pause.title': 'Пауза',
  'pause.resume': 'Продовжити',
  'pause.soundOn': 'Звук: увімк.',
  'pause.soundOff': 'Звук: вимк.',
  'pause.quit': 'Вийти в меню',
  'pause.hint': 'Esc або P, щоб продовжити',

  'error.start': 'Не вдалося запустити гру. Онови сторінку.',

  'form.hatchling': 'Малюк',

  'branch.swift': 'Спритність',
  'branch.bulk': 'Маса',
  'branch.venom': 'Отрута',
  'branch.armor': 'Броня',
  'branch.hunter': 'Мисливець',
  'branch.grazer': 'Збирач',
  'branch.apex': 'Хижак',
  'branch.titan': 'Титан',

  'blurb.swift': 'Рухаєшся на {speed} швидше. Наздоганяй здобич, тікай від усіх.',
  'blurb.bulk': 'Орби дають на {food} більше маси, а з’їдені істоти на {absorb} більше.',
  'blurb.venom':
    'Хто тебе торкається, втрачає {rate} меншої з ваших мас щосекунди. Половина дістається тобі.',
  'blurb.armor':
    'Ворог має бути більшим на {ratio}, щоб тебе з’їсти. Отрута діє на тебе на {resist} слабше.',
  'blurb.hunter': 'Їж істот, менших за тебе лише на {ratio}, і поглинай на {absorb} більше.',
  'blurb.grazer': 'Притягуєш орби поблизу. Ростеш без зупину.',
  'blurb.apex': 'Їж усе, що менше за тебе на {ratio}. Поглинай на {absorb} більше.',
  'blurb.titan':
    'Втрачаєш масу на {decay} повільніше. Ворог має бути більшим на {ratio}, щоб тебе з’їсти.',

  'short.swift': '+{speed} швидкість',
  'short.bulk': '+{food} з орбів',
  'short.venom': 'отруює дотиком',
  'short.armor': 'важко з’їсти',
  'short.hunter': 'їсть при +{ratio}',
  'short.grazer': 'тягне орби',
  'short.apex': 'їсть при +{ratio}',
  'short.titan': 'повільна втрата',

  'tag.speed': '+швидкість',
  'tag.slower': '−швидкість',
  'tag.food': '+їжа',
  'tag.absorb': '+поглинання',
  'tag.drain': 'отрута дотиком',
  'tag.hardToEat': 'важко з’їсти',
  'tag.venomResist': 'стійкість до отрути',
  'tag.easierKills': 'легші вбивства',
  'tag.magnet': 'магніт орбів',
  'tag.slowDecay': 'повільна втрата',

  'skin.classic': 'М’ята',
  'skin.ocean': 'Океан',
  'skin.sunset': 'Захід',
  'skin.toxic': 'Токсин',
  'skin.candy': 'Цукерка',
  'skin.lava': 'Лава',
  'skin.shadow': 'Тінь',
  'skin.gold': 'Золото',
  'skin.galaxy': 'Галактика',
  'skin.rainbow': 'Веселка',
};
