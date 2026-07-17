export type HealthZoneId =
  | "ears"
  | "eyes"
  | "paws"
  | "belly"
  | "back"
  | "tail";

export type HealthSpecies = "cat" | "dog";

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
  species: HealthSpecies | "all";
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
    id: "dog-paws-hot-pavement",
    species: "dog",
    zoneId: "paws",
    situation: "В жаркий день собака останавливается перед нагретой дорожкой.",
    prompt: "Как продолжить прогулку бережно?",
    learningFact:
      "Горячее покрытие может обжечь подушечки лап: безопаснее перейти в тень или выбрать прохладный маршрут.",
    options: [
      {
        id: "choose-cool-route",
        label: "Перейти в тень",
        description: "Выбрать траву или прохладную дорожку",
        icon: "rest",
        correct: true,
        feedback: "Да. Прохладная поверхность и более короткий маршрут защитят лапы от перегрева.",
      },
      {
        id: "cross-quickly",
        label: "Быстро перебежать",
        description: "Горячий участок ведь короткий",
        icon: "play",
        correct: false,
        feedback: "Даже короткий контакт с горячим покрытием может быть неприятным. Лучше совсем его обойти.",
      },
      {
        id: "cool-with-ice",
        label: "Приложить лёд",
        description: "Сразу сильно охладить подушечки",
        icon: "care",
        correct: false,
        feedback: "Резкий холод не нужен. Сначала достаточно уйти с горячей поверхности в тень.",
      },
    ],
  },
  {
    id: "paws-graze",
    species: "all",
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
    species: "all",
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
    id: "dog-ears-after-rain",
    species: "dog",
    zoneId: "ears",
    situation: "После дождливой прогулки длинные уши собаки остались влажными.",
    prompt: "Что сделать дома?",
    learningFact:
      "После прогулки достаточно промокнуть внешнюю часть ушей мягким полотенцем, ничего не вводя внутрь.",
    options: [
      {
        id: "blot-earflaps",
        label: "Мягко промокнуть снаружи",
        description: "Сухим полотенцем без трения",
        icon: "wipe",
        correct: true,
        feedback: "Верно. Убрать влагу с ушной раковины — простая забота после дождя.",
      },
      {
        id: "dry-inside-ear",
        label: "Просушить глубоко ватой",
        description: "Ввести её внутрь слухового прохода",
        icon: "inspect",
        correct: false,
        feedback: "Внутрь уха ничего вводить не нужно. Достаточно промокнуть только видимую внешнюю часть.",
      },
      {
        id: "warm-hairdryer",
        label: "Посушить феном",
        description: "Направить тёплый воздух на уши",
        icon: "care",
        correct: false,
        feedback: "Шум и горячий воздух могут напугать или перегреть кожу. Полотенце действует мягче.",
      },
    ],
  },
  {
    id: "eyes-small-speck",
    species: "all",
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
    id: "dog-eyes-windy-walk",
    species: "dog",
    zoneId: "eyes",
    situation: "На ветреной прогулке песок попал в шерсть рядом с глазами, сами глаза выглядят спокойно.",
    prompt: "Как помочь после прогулки?",
    learningFact:
      "Песок вокруг глаз убирают только с шерсти и внешних уголков, не растирая поверхность глаза.",
    options: [
      {
        id: "wipe-fur-around-eyes",
        label: "Убрать песок с шерсти",
        description: "Мягким чистым влажным диском",
        icon: "wipe",
        correct: true,
        feedback: "Да. Одного аккуратного движения по шерсти снаружи будет достаточно.",
      },
      {
        id: "rub-eyelids",
        label: "Потереть веки",
        description: "Чтобы песок быстрее осыпался",
        icon: "inspect",
        correct: false,
        feedback: "Трение может занести песчинки ближе к глазу. Лучше убрать их только с окружающей шерсти.",
      },
      {
        id: "blow-sand-away",
        label: "Сдуть песок",
        description: "Подуть прямо в морду",
        icon: "care",
        correct: false,
        feedback: "Поток воздуха неприятен и может направить песок к глазу. Влажный диск безопаснее.",
      },
    ],
  },
  {
    id: "belly-hot-day",
    species: "all",
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
    id: "dog-belly-after-play",
    species: "dog",
    zoneId: "belly",
    situation: "После весёлой игры собака часто дышит и сама ложится отдохнуть.",
    prompt: "Как помочь спокойно восстановиться?",
    learningFact:
      "После активности питомцу полезны пауза, прохладное место и свободный доступ к воде.",
    options: [
      {
        id: "cool-rest-and-water",
        label: "Дать паузу и воду",
        description: "Перейти в прохладное тихое место",
        icon: "water",
        correct: true,
        feedback: "Верно. Спокойная пауза и вода помогают естественно восстановиться после игры.",
      },
      {
        id: "keep-playing",
        label: "Продолжить игру",
        description: "Пока интерес к игрушке не пропал",
        icon: "play",
        correct: false,
        feedback: "Частое дыхание — сигнал сделать паузу, а не добавлять нагрузку.",
      },
      {
        id: "offer-extra-food",
        label: "Сразу предложить еду",
        description: "Пусть подкрепится после нагрузки",
        icon: "food",
        correct: false,
        feedback: "Сначала лучше дать спокойно отдышаться и попить. Еда не заменяет восстановительную паузу.",
      },
    ],
  },
  {
    id: "dog-back-wet-harness",
    species: "dog",
    zoneId: "back",
    situation: "После дождя под шлейкой шерсть осталась влажной и примялась.",
    prompt: "Как вернуть собаке комфорт?",
    learningFact:
      "Влажную амуницию снимают, а шерсть под ней аккуратно промокают и дают коже высохнуть.",
    options: [
      {
        id: "remove-harness-and-dry",
        label: "Снять шлейку и промокнуть",
        description: "Дать шерсти полностью высохнуть",
        icon: "wipe",
        correct: true,
        feedback: "Да. Сухая шерсть и свободная кожа помогут избежать натирания.",
      },
      {
        id: "leave-harness-on",
        label: "Оставить шлейку до вечера",
        description: "Под ней шерсть высохнет сама",
        icon: "rest",
        correct: false,
        feedback: "Под влажной шлейкой кожа сохнет медленнее и может натираться. Её лучше снять.",
      },
      {
        id: "brush-wet-coat",
        label: "Сразу активно вычесать",
        description: "Распушить мокрую шерсть щёткой",
        icon: "brush",
        correct: false,
        feedback: "По влажной примятой шерсти щётка может тянуть кожу. Сначала участок лучше высушить.",
      },
    ],
  },
  {
    id: "back-tick",
    species: "all",
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
    species: "all",
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
    id: "dog-tail-under-blanket",
    species: "dog",
    zoneId: "tail",
    situation: "Собака устроилась на диване, а хвост оказался прижат тяжёлым пледом.",
    prompt: "Как освободить хвост?",
    learningFact:
      "Если хвост случайно прижат, сначала освобождают пространство вокруг него, не тянут и не выпрямляют сам хвост.",
    options: [
      {
        id: "lift-blanket",
        label: "Приподнять плед",
        description: "Дать собаке самой сменить положение",
        icon: "care",
        correct: true,
        feedback: "Да. Освободить плед безопаснее, чем тянуть собаку или её хвост.",
      },
      {
        id: "pull-tail-out",
        label: "Потянуть хвост наружу",
        description: "Освободить одним движением",
        icon: "inspect",
        correct: false,
        feedback: "Тянуть хвост нельзя. Лучше убрать давление пледа и позволить собаке подвигаться самой.",
      },
      {
        id: "call-off-sofa",
        label: "Резко позвать с дивана",
        description: "Пусть быстро выпрыгнет из-под пледа",
        icon: "play",
        correct: false,
        feedback: "Резкий прыжок может сильнее натянуть прижатый хвост. Сначала нужно поднять плед.",
      },
    ],
  },
  {
    id: "cat-paws-claw-in-blanket",
    species: "cat",
    zoneId: "paws",
    situation: "Коготок кошки зацепился за петлю на пледе, и она замерла.",
    prompt: "Как спокойно освободить лапу?",
    learningFact:
      "Если коготь зацепился за ткань, сначала ослабляют саму петлю и не тянут лапу на себя.",
    options: [
      {
        id: "loosen-fabric-loop",
        label: "Ослабить петлю ткани",
        description: "Поддержать лапу и не тянуть её",
        icon: "care",
        correct: true,
        feedback: "Верно. Когда натяжение ткани исчезнет, кошка сможет спокойно убрать лапу сама.",
      },
      {
        id: "pull-cat-paw",
        label: "Потянуть лапу на себя",
        description: "Освободить одним движением",
        icon: "inspect",
        correct: false,
        feedback: "Натянутая петля будет держать коготь ещё сильнее. Сначала нужно ослабить ткань.",
      },
      {
        id: "shake-blanket",
        label: "Встряхнуть плед",
        description: "Чтобы коготь выпал из петли",
        icon: "play",
        correct: false,
        feedback: "Резкое движение напугает кошку и может сильнее натянуть коготь. Лучше действовать руками и медленно.",
      },
    ],
  },
  {
    id: "cat-ears-new-scent",
    species: "cat",
    zoneId: "ears",
    situation: "После появления ароматического диффузора кошка прижимает уши и уходит из комнаты.",
    prompt: "Что будет самой простой первой заботой?",
    learningFact:
      "Новый резкий запах может быть неприятен питомцу: безопаснее убрать источник и проветрить комнату.",
    options: [
      {
        id: "remove-scent-and-air",
        label: "Убрать аромат и проветрить",
        description: "Оставить кошке тихую комнату без запаха",
        icon: "rest",
        correct: true,
        feedback: "Да. Убрать новый раздражитель — понятный и бережный первый шаг.",
      },
      {
        id: "bring-cat-to-scent",
        label: "Поднести кошку поближе",
        description: "Пусть быстрее привыкнет к запаху",
        icon: "inspect",
        correct: false,
        feedback: "Принуждение усилит дискомфорт. Лучше вернуть привычный воздух и дать кошке выбрать дистанцию.",
      },
      {
        id: "mask-with-another-scent",
        label: "Добавить другой аромат",
        description: "Перебить первый запах",
        icon: "care",
        correct: false,
        feedback: "Смешение запахов сделает воздух ещё насыщеннее. Источник лучше убрать совсем.",
      },
    ],
  },
  {
    id: "cat-eyes-sunbeam",
    species: "cat",
    zoneId: "eyes",
    situation: "Яркий луч солнца падает прямо на любимое место кошки, и она щурится.",
    prompt: "Как сохранить уютное место?",
    learningFact:
      "Если дискомфорт вызывает яркий свет, достаточно создать тень и позволить питомцу выбрать удобное положение.",
    options: [
      {
        id: "soften-sunlight",
        label: "Прикрыть штору",
        description: "Оставить мягкий рассеянный свет",
        icon: "rest",
        correct: true,
        feedback: "Верно. Мягкая тень вернёт комфорт без лишних прикосновений.",
      },
      {
        id: "move-cat-by-hand",
        label: "Переложить кошку руками",
        description: "Сразу перенести в другое место",
        icon: "care",
        correct: false,
        feedback: "Кошка может сама выбрать новое место. Сначала проще убрать яркий свет.",
      },
      {
        id: "offer-eye-drops-for-sun",
        label: "Закапать глаза",
        description: "Помочь им привыкнуть к свету",
        icon: "inspect",
        correct: false,
        feedback: "При обычном ярком свете средства не нужны. Достаточно создать тень.",
      },
    ],
  },
  {
    id: "cat-belly-after-chase",
    species: "cat",
    zoneId: "belly",
    situation: "После погони за игрушкой кошка легла на бок и решила отдохнуть.",
    prompt: "Как завершить игру бережно?",
    learningFact:
      "После активной игры полезно убрать стимулы, оставить свежую воду и дать кошке восстановиться в своём темпе.",
    options: [
      {
        id: "end-play-quietly",
        label: "Убрать игрушку и дать отдых",
        description: "Оставить рядом свежую воду",
        icon: "water",
        correct: true,
        feedback: "Да. Спокойное завершение помогает переключиться с охоты на отдых.",
      },
      {
        id: "restart-chase",
        label: "Снова пошевелить игрушкой",
        description: "Проверить, остались ли силы",
        icon: "play",
        correct: false,
        feedback: "Если кошка сама легла, лучше уважить паузу и не запускать новый раунд игры.",
      },
      {
        id: "offer-large-meal",
        label: "Сразу дать большую порцию",
        description: "Наградить за активность",
        icon: "food",
        correct: false,
        feedback: "Сначала кошке стоит спокойно восстановиться. Большая порция не заменяет паузу и воду.",
      },
    ],
  },
  {
    id: "cat-back-small-mat",
    species: "cat",
    zoneId: "back",
    situation: "После сна на спине кошки заметили небольшой мягкий колтун.",
    prompt: "Как распутать шерсть без рывка?",
    learningFact:
      "Небольшой колтун разбирают с кончиков, придерживая шерсть у кожи и делая короткие паузы.",
    options: [
      {
        id: "tease-mat-gently",
        label: "Разобрать с кончиков",
        description: "Придерживать шерсть у кожи",
        icon: "brush",
        correct: true,
        feedback: "Верно. Так натяжение почти не передаётся коже, а кошке проще оставаться спокойной.",
      },
      {
        id: "pull-mat-once",
        label: "Вытянуть колтун целиком",
        description: "Сделать один быстрый рывок",
        icon: "inspect",
        correct: false,
        feedback: "Рывок потянет кожу и причинит боль. Лучше разделить участок на маленькие пряди.",
      },
      {
        id: "soak-cat-mat",
        label: "Сильно намочить шерсть",
        description: "Пусть колтун размокнет",
        icon: "water",
        correct: false,
        feedback: "Вода может сделать спутанный участок плотнее. Сухое медленное распутывание безопаснее.",
      },
    ],
  },
  {
    id: "cat-tail-ribbon",
    species: "cat",
    zoneId: "tail",
    situation: "Во время игры лёгкая лента свободно обернулась вокруг хвоста кошки.",
    prompt: "Как убрать её без испуга?",
    learningFact:
      "Ленту с хвоста спокойно разматывают в обратную сторону и не тянут за свободный конец.",
    options: [
      {
        id: "unwind-ribbon",
        label: "Спокойно размотать ленту",
        description: "Остановить игру и освободить виток",
        icon: "care",
        correct: true,
        feedback: "Да. Без натяжения лента снимется легко, а хвост останется свободным.",
      },
      {
        id: "pull-ribbon-end",
        label: "Потянуть за конец",
        description: "Стянуть ленту одним движением",
        icon: "inspect",
        correct: false,
        feedback: "Так виток может затянуться. Ленту нужно разматывать, а не стягивать.",
      },
      {
        id: "continue-ribbon-play",
        label: "Продолжить игру",
        description: "Она сама соскользнёт с хвоста",
        icon: "play",
        correct: false,
        feedback: "При движении лента может затянуться сильнее. Игру лучше остановить и снять её сразу.",
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
  species: HealthSpecies,
  random: () => number = Math.random,
): HealthSituation[] {
  const universalOffset = Math.floor(random() * 3);

  return healthZones.map((zone, zoneIndex) => {
    const speciesPool = healthSituationPool.filter(
      (situation) => situation.zoneId === zone.id && situation.species === species,
    );
    const universalPool = healthSituationPool.filter(
      (situation) => situation.zoneId === zone.id && situation.species === "all",
    );
    const useUniversal = zoneIndex % 3 === universalOffset;
    const pool = useUniversal ? universalPool : speciesPool;
    const situation = pool[0];

    if (!situation) {
      throw new Error(`Для зоны ${zone.id} и вида ${species} не настроена ситуация`);
    }

    return {
      ...situation,
      options: shuffle(situation.options, random),
    };
  });
}
