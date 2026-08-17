const messagePools = {
  completion: {
    common: [
      'Вот так незаметно и портится репутация прокрастинатора.',
      'Кажется, система работает. Подозрительно.',
      'Сделано. Да, вот так просто.',
      'Сделано раньше, чем успело стать проблемой.',
      'Так. Кто сегодня подозрительно эффективен?',
      'Список дел понёс первые потери.',
      'Сегодня ты бомба замедленного действия. В хорошем смысле.',
      'Ещё одна галочка. Контроль над жизнью вырос примерно на 0,7%.',
      'Где-то в мире сейчас грустит одна прокрастинация.',
      'Мы это запишем. Вообще-то уже записали.',
      'Ну всё. Ещё немного — и придётся делать тебе фан-клуб.',
    ],
    male: [
      'Ничего драматичного. Просто ты взял и сделал.',
      'Ты сегодня хорош как незаконно вкусный круассан.',
    ],
    female: [
      'Ничего драматичного. Просто ты взяла и сделала.',
      'Ты сегодня хороша как незаконно вкусный круассан.',
    ],
  },
  stageChange: {
    common: [
      'Так. Это уже не случайность, это тенденция.',
      'Похоже, привычка решила остаться.',
      'Подозрительно стабильно. Продолжаем наблюдение.',
      'Ритм найден. Просьба не терять.',
      'Когда-то для этого требовалась сила воли. Забавные времена.',
      'Автопилот прогревается.',
      'Так-так. Это уже начинает походить на систему.',
    ],
    final: [
      'Всё. Привычка официально переехала к тебе жить.',
    ],
  },
  levelUp: {
    common: [
      'Новый уровень. Босса пока не завезли.',
      'LEVEL UP. Теперь ты официально немного опаснее.',
      'Можно добавить +1 к самодовольству.',
      'Уровень повышен. Скромность можно вернуть завтра.',
    ],
    male: [
      'Новый уровень. Власть развращает — будь осторожен.',
    ],
    female: [
      'Новый уровень. Власть развращает — будь осторожна.',
    ],
  },
  allDone: {
    common: [
      'Все галочки собраны. Абсолютно неприличный результат.',
      'Так выглядит человек, которому сегодня нечего предъявить.',
      'На сегодня основной сюжет закончен.',
      'Календарь капитулировал.',
      'Все галочки собраны. Теперь можно ничего не доказывать.',
    ],
    male: [
      'Ну всё. Ты официально красавчик дня.',
    ],
    female: [
      'Ну всё. Ты официально красотка дня.',
    ],
  },
  returnAfterBreak: {
    common: [
      'О, кого принесло. Сохранение всё ещё на месте.',
      'Мы сделали вид, что это был запланированный перерыв.',
      'О, продолжение сезона вышло.',
      'Никаких “начинаю сначала”. Просто продолжаем.',
      'Сохранение найдено. Продолжаем.',
    ],
  },
};

function pick(messages, random = Math.random) {
  if (!messages?.length) return null;
  return messages[Math.floor(random() * messages.length)];
}

function genderedOptions(pool, bodyType) {
  const gendered = bodyType === 'male' ? pool.male : pool.female;
  return [...(pool.common ?? []), ...(gendered ?? [])];
}

export function getOccasionalCompletionMessage({
  force = false,
  bodyType,
  random = Math.random,
} = {}) {
  return force || random() < 0.23
    ? pick(genderedOptions(messagePools.completion, bodyType), random)
    : null;
}

export function getStageTransitionMessage(_fromStage, toStage, _bodyType, random = Math.random) {
  const options = [
    ...messagePools.stageChange.common,
    ...(toStage === 'Часть жизни' ? messagePools.stageChange.final : []),
  ];
  return pick(options, random);
}

export function getLevelUpMessage(bodyType, random = Math.random) {
  return pick(genderedOptions(messagePools.levelUp, bodyType), random);
}

export function getAllDoneMessage(bodyType, random = Math.random) {
  return pick(genderedOptions(messagePools.allDone, bodyType), random);
}

export function getReturnAfterBreakMessage(random = Math.random) {
  return pick(messagePools.returnAfterBreak.common, random);
}
