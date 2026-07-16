export type HealthZoneId =
  | "ears"
  | "eyes"
  | "paws"
  | "belly"
  | "back"
  | "tail";

export type HealthActionIconId =
  | "bandage"
  | "brush"
  | "care"
  | "food"
  | "inspect"
  | "play"
  | "rest"
  | "vet"
  | "water"
  | "wipe";

export interface HealthZoneDefinition {
  id: HealthZoneId;
  label: string;
  shortLabel: string;
}

export interface HealthActionChoice {
  id: string;
  label: string;
  description: string;
  icon: HealthActionIconId;
  correct: boolean;
  feedback: string;
}

export interface HealthSituation {
  id: string;
  zoneId: HealthZoneId;
  situation: string;
  prompt: string;
  learningFact: string;
  options: HealthActionChoice[];
}

export const healthZones: HealthZoneDefinition[] = [
  { id: "ears", label: "Уши", shortLabel: "Уши" },
  { id: "eyes", label: "Глаза", shortLabel: "Глаза" },
  { id: "paws", label: "Лапы", shortLabel: "Лапы" },
  { id: "belly", label: "Живот", shortLabel: "Живот" },
  { id: "back", label: "Спина и шерсть", shortLabel: "Спина" },
  { id: "tail", label: "Хвост", shortLabel: "Хвост" },
];

export const healthSituationPool: HealthSituation[] = [
  {
    id: "paws-mud",
    zoneId: "paws",
    situation: "После прогулки лапы испачкались в уличной грязи.",
    prompt: "Какая первая забота подойдёт лучше всего?",
    learningFact:
      "Лапы после улицы полезно очистить и высушить, чтобы питомец не слизывал грязь и реагенты.",
    options: [
      {
        id: "wipe-and-dry",
        label: "Протереть и высушить",
        description: "Чистой влажной салфеткой или водой",
        icon: "wipe",
        correct: true,
        feedback: "Да. Мягко очистить лапу и убрать лишнюю влагу — простая и безопасная первая забота.",
      },
      {
        id: "brush-paw",
        label: "Пройтись щёткой",
        description: "Как по обычной шерсти",
        icon: "brush",
        correct: false,
        feedback: "Щётка не уберёт грязь между подушечками. Сначала лапу лучше мягко очистить и высушить.",
      },
      {
        id: "let-rest",
        label: "Просто дать отдохнуть",
        description: "Грязь высохнет сама",
        icon: "rest",
        correct: false,
        feedback: "Отдых полезен, но грязь останется на лапе. Тут важнее сначала аккуратно её убрать.",
      },
    ],
  },
  {
    id: "paws-graze",
    zoneId: "paws",
    situation: "На лапе заметили небольшую свежую ссадину.",
    prompt: "Что сделать до осмотра специалистом?",
    learningFact:
      "Чистое нетугое покрытие защищает повреждённое место по дороге, но не заменяет ветеринарный осмотр.",
    options: [
      {
        id: "cover-and-vet",
        label: "Прикрыть и показать ветеринару",
        description: "Чистой салфеткой или нетугой повязкой",
        icon: "bandage",
        correct: true,
        feedback: "Верно. Место можно аккуратно защитить от грязи и затем показать ветеринару.",
      },
      {
        id: "continue-walk",
        label: "Продолжить прогулку",
        description: "Если питомец ещё идёт",
        icon: "play",
        correct: false,
        feedback: "Нагрузка может усилить раздражение. Лучше остановиться, защитить место и обратиться к ветеринару.",
      },
      {
        id: "use-random-cream",
        label: "Намазать первым средством",
        description: "Взять что-нибудь из домашней аптечки",
        icon: "care",
        correct: false,
        feedback: "Случайное средство может раздражать кожу или быть опасным при слизывании. Лучше обойтись без него.",
      },
    ],
  },
  {
    id: "ears-dust",
    zoneId: "ears",
    situation: "На внешней стороне ушной раковины видна обычная пыль.",
    prompt: "Как аккуратно помочь?",
    learningFact:
      "Без рекомендации ветеринара очищают только видимую внешнюю часть уха и ничего не вводят глубоко в слуховой проход.",
    options: [
      {
        id: "wipe-earflap",
        label: "Протереть только снаружи",
        description: "Мягким слегка влажным ватным диском",
        icon: "wipe",
        correct: true,
        feedback: "Да. Достаточно бережно протереть видимую внешнюю часть уха.",
      },
      {
        id: "cotton-swab",
        label: "Почистить глубже палочкой",
        description: "Добраться до всей видимой грязи",
        icon: "inspect",
        correct: false,
        feedback: "Так легко протолкнуть загрязнение глубже или травмировать ухо. Внутрь ничего вводить не нужно.",
      },
      {
        id: "pour-water",
        label: "Промыть ухо водой",
        description: "Налить немного внутрь",
        icon: "water",
        correct: false,
        feedback: "Вода внутри уха может вызвать раздражение. Для бытового ухода достаточно протереть только ушную раковину.",
      },
    ],
  },
  {
    id: "ears-irritated",
    zoneId: "ears",
    situation: "Питомец часто трясёт головой, а ухо выглядит красным.",
    prompt: "Какая реакция будет безопасной?",
    learningFact:
      "Покраснение, болезненность, запах или частое трясение головой требуют ветеринарной оценки, а не глубокой домашней чистки.",
    options: [
      {
        id: "vet-ear-check",
        label: "Показать ветеринару",
        description: "Не пытаться чистить глубоко самостоятельно",
        icon: "vet",
        correct: true,
        feedback: "Верно. Это уже не обычная пыль, поэтому причину должен оценить ветеринар.",
      },
      {
        id: "clean-deeper",
        label: "Почистить глубже",
        description: "Попробовать убрать причину самостоятельно",
        icon: "wipe",
        correct: false,
        feedback: "При покраснении глубокая чистка может причинить боль. Безопаснее остановиться и обратиться к ветеринару.",
      },
      {
        id: "wait-ear",
        label: "Подождать несколько дней",
        description: "Возможно, пройдёт само",
        icon: "rest",
        correct: false,
        feedback: "Повторяющийся дискомфорт лучше не откладывать. Ветеринар поможет понять причину раньше.",
      },
    ],
  },
  {
    id: "eyes-small-speck",
    zoneId: "eyes",
    situation: "В уголке глаза осталась маленькая засохшая соринка, сам глаз выглядит спокойно.",
    prompt: "Как поступить бережно?",
    learningFact:
      "Небольшое загрязнение убирают только снаружи чистым мягким диском, не растирая поверхность глаза.",
    options: [
      {
        id: "wipe-eye-corner",
        label: "Убрать снаружи мягким диском",
        description: "Слегка смочить чистой водой",
        icon: "wipe",
        correct: true,
        feedback: "Да. Достаточно мягко убрать загрязнение из внешнего уголка, не касаясь самого глаза.",
      },
      {
        id: "rub-eye",
        label: "Потереть глаз",
        description: "Чтобы соринка быстрее отошла",
        icon: "inspect",
        correct: false,
        feedback: "Трение может усилить раздражение. Лучше сделать одно аккуратное движение только снаружи.",
      },
      {
        id: "random-eye-drops",
        label: "Использовать любые капли",
        description: "Взять те, что есть дома",
        icon: "care",
        correct: false,
        feedback: "Средства для глаз выбирают только по совету ветеринара. Для обычной соринки достаточно бережного ухода снаружи.",
      },
    ],
  },
  {
    id: "eyes-red",
    zoneId: "eyes",
    situation: "Глаз покраснел, питомец щурится или избегает света.",
    prompt: "Что будет правильной первой реакцией?",
    learningFact:
      "Покраснение, прищуривание, боль или заметные выделения из глаза — повод быстро связаться с ветеринаром.",
    options: [
      {
        id: "vet-eye-check",
        label: "Показать ветеринару",
        description: "Не использовать случайные средства",
        icon: "vet",
        correct: true,
        feedback: "Верно. Глаз чувствителен, поэтому причину и безопасную помощь должен определить ветеринар.",
      },
      {
        id: "wipe-repeatedly",
        label: "Протирать снова и снова",
        description: "Пока краснота не уменьшится",
        icon: "wipe",
        correct: false,
        feedback: "Частое трение не устраняет причину и может раздражать глаз сильнее. Тут нужен ветеринар.",
      },
      {
        id: "distract-with-play",
        label: "Отвлечь активной игрой",
        description: "Чтобы питомец перестал щуриться",
        icon: "play",
        correct: false,
        feedback: "Игра не решает дискомфорт и может утомить питомца. Лучше обеспечить покой и показать глаз ветеринару.",
      },
    ],
  },
  {
    id: "belly-hot-day",
    zoneId: "belly",
    situation: "Жаркий день, питомец ищет прохладное место и хочет пить.",
    prompt: "Что сделать в первую очередь?",
    learningFact:
      "В жару животным нужен постоянный доступ к свежей воде, тени и спокойному прохладному месту.",
    options: [
      {
        id: "water-and-shade",
        label: "Дать воду и тень",
        description: "Снизить активность и дать отдохнуть",
        icon: "water",
        correct: true,
        feedback: "Да. Свежая вода, тень и спокойствие — правильная бытовая забота в жаркий день.",
      },
      {
        id: "active-game",
        label: "Предложить активную игру",
        description: "Размяться, чтобы взбодриться",
        icon: "play",
        correct: false,
        feedback: "В жару активность увеличивает нагрузку. Лучше дать воду, тень и возможность спокойно остыть.",
      },
      {
        id: "extra-food",
        label: "Предложить побольше еды",
        description: "Вместо дополнительной воды",
        icon: "food",
        correct: false,
        feedback: "Еда не заменяет питьё. В этой ситуации главное — свежая вода и прохладное место.",
      },
    ],
  },
  {
    id: "belly-dirty",
    zoneId: "belly",
    situation: "После прогулки на шерсти живота остались грязь и мелкий песок.",
    prompt: "Какая первая реакция подойдёт?",
    learningFact:
      "Загрязнённую шерсть можно мягко протереть чистой водой и затем высушить, не растирая кожу.",
    options: [
      {
        id: "wipe-belly",
        label: "Протереть и высушить",
        description: "Убрать грязь мягкой влажной тканью",
        icon: "wipe",
        correct: true,
        feedback: "Верно. Мягкое очищение и сухая шерсть помогут избежать раздражения и слизывания грязи.",
      },
      {
        id: "leave-wet",
        label: "Оставить как есть",
        description: "Питомец сам приведёт шерсть в порядок",
        icon: "rest",
        correct: false,
        feedback: "Так питомец может слизать уличную грязь. Лучше аккуратно очистить шерсть и высушить её.",
      },
      {
        id: "brush-sand",
        label: "Сразу сильно вычесать",
        description: "Убрать песок сухой щёткой",
        icon: "brush",
        correct: false,
        feedback: "Сильное вычёсывание по грязной коже может раздражать её. Сначала загрязнение лучше мягко смыть.",
      },
    ],
  },
  {
    id: "back-burr",
    zoneId: "back",
    situation: "После прогулки в шерсти зацепился репей или сухая колючка.",
    prompt: "Как убрать находку бережно?",
    learningFact:
      "Репьи и небольшие колтуны разбирают постепенно щёткой или пальцами, не дёргая шерсть у самой кожи.",
    options: [
      {
        id: "brush-burr",
        label: "Аккуратно вычесать",
        description: "Придерживать шерсть у кожи и не тянуть",
        icon: "brush",
        correct: true,
        feedback: "Да. Медленное вычёсывание без рывков помогает убрать репей и не причинить боль.",
      },
      {
        id: "pull-burr",
        label: "Резко вытянуть",
        description: "Снять одним быстрым движением",
        icon: "inspect",
        correct: false,
        feedback: "Рывок тянет шерсть и кожу. Тут лучше действовать медленно, придерживая шерсть у основания.",
      },
      {
        id: "wet-whole-coat",
        label: "Намочить всю шерсть",
        description: "Надеяться, что репей отстанет",
        icon: "water",
        correct: false,
        feedback: "Вода может только сильнее спутать шерсть вокруг репья. Безопаснее аккуратно вычесать его.",
      },
    ],
  },
  {
    id: "back-tick",
    zoneId: "back",
    situation: "На коже под шерстью заметили присосавшегося клеща.",
    prompt: "Какой выбор здесь самый безопасный?",
    learningFact:
      "Клеща нельзя сжимать, жечь или тянуть пальцами: нужен специальный инструмент и уверенная техника, поэтому безопаснее обратиться к ветеринару.",
    options: [
      {
        id: "vet-tick",
        label: "Не трогать руками, показать ветеринару",
        description: "Не сжимать и не обрабатывать самостоятельно",
        icon: "vet",
        correct: true,
        feedback: "Верно. Ветеринар или обученный специалист удалит клеща специальным инструментом и осмотрит место укуса.",
      },
      {
        id: "pull-tick",
        label: "Потянуть пальцами",
        description: "Постараться снять сразу",
        icon: "inspect",
        correct: false,
        feedback: "Так можно сжать клеща или оставить его часть в коже. Без специального инструмента лучше не пытаться.",
      },
      {
        id: "cover-tick",
        label: "Закрыть плотной повязкой",
        description: "Оставить клеща под ней",
        icon: "bandage",
        correct: false,
        feedback: "Повязка не удалит клеща и скроет место укуса. Нужен осмотр и безопасное удаление специалистом.",
      },
    ],
  },
  {
    id: "tail-burr",
    zoneId: "tail",
    situation: "У основания хвоста спуталась шерсть и застряла сухая травинка.",
    prompt: "Что сделать без спешки?",
    learningFact:
      "Спутанную шерсть разбирают небольшими участками, придерживая её у кожи и не используя резкие движения.",
    options: [
      {
        id: "brush-tail",
        label: "Медленно вычесать",
        description: "Придерживать шерсть ближе к коже",
        icon: "brush",
        correct: true,
        feedback: "Да. Так натяжение меньше передаётся коже, а травинку можно убрать без рывка.",
      },
      {
        id: "pull-tail-burr",
        label: "Потянуть за травинку",
        description: "Убрать её одним движением",
        icon: "inspect",
        correct: false,
        feedback: "Травинка может быть впутана в шерсть. Рывок потянет кожу, поэтому лучше сначала разобрать участок щёткой.",
      },
      {
        id: "ignore-tail-burr",
        label: "Оставить до следующего дня",
        description: "Шерсть распутается сама",
        icon: "rest",
        correct: false,
        feedback: "Спутанный участок может стать плотнее. Небольшую находку лучше спокойно убрать сразу.",
      },
    ],
  },
  {
    id: "tail-sensitive",
    zoneId: "tail",
    situation: "Питомец необычно держит хвост и не даёт к нему прикасаться.",
    prompt: "Какая реакция будет бережной?",
    learningFact:
      "Если питомец избегает прикосновения или изменил обычное положение хвоста, не нужно разминать или выпрямлять его самостоятельно.",
    options: [
      {
        id: "vet-tail-check",
        label: "Не трогать и показать ветеринару",
        description: "Обеспечить покой до осмотра",
        icon: "vet",
        correct: true,
        feedback: "Верно. Изменение поведения может говорить о боли, поэтому хвост лучше не трогать до осмотра.",
      },
      {
        id: "straighten-tail",
        label: "Осторожно выпрямить хвост",
        description: "Проверить, свободно ли он двигается",
        icon: "care",
        correct: false,
        feedback: "Самостоятельная проверка движением может усилить боль. Безопаснее обеспечить покой и обратиться к ветеринару.",
      },
      {
        id: "play-with-tail",
        label: "Отвлечь игрой",
        description: "Посмотреть, забудет ли питомец о хвосте",
        icon: "play",
        correct: false,
        feedback: "Активность не исключает травму и может добавить нагрузку. Лучше не проверять хвост игрой.",
      },
    ],
  },
];

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function buildHealthGameRound(
  random: () => number = Math.random,
): HealthSituation[] {
  return healthZones.map((zone) => {
    const pool = healthSituationPool.filter((situation) => situation.zoneId === zone.id);
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    const situation = pool[index];

    if (!situation) {
      throw new Error(`Для зоны ${zone.id} не настроены ситуации`);
    }

    return {
      ...situation,
      options: shuffle(situation.options, random),
    };
  });
}
