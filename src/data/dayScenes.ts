import { assetUrl } from "../lib/assets";

export type DaySceneId = "morning" | "day" | "evening" | "night";

export type DayActivityId =
  | "meal"
  | "movement"
  | "play"
  | "rest"
  | "care"
  | "sleep";

export interface DayActivityChoice {
  id: DayActivityId;
  label: string;
  description: string;
  correct: boolean;
  feedback: string;
}

export interface DaySceneDefinition {
  id: DaySceneId;
  label: string;
  time: string;
  title: string;
  prompt: string;
  image: string;
  irisOrigin: string;
  choices: DayActivityChoice[];
}

export const dayScenes: DaySceneDefinition[] = [
  {
    id: "morning",
    label: "Сборы",
    time: "Шаг 1",
    title: "За воротами ждёт маршрут",
    prompt: "Перед выходом питомец возбуждённо кружится у двери. С чего начать?",
    image: assetUrl("assets/day-game/courtyard-morning.webp"),
    irisOrigin: "82% 18%",
    choices: [
      {
        id: "care",
        label: "Спокойно проверить амуницию",
        description: "Убедиться, что всё закреплено, взять воду и выбрать знакомый маршрут",
        correct: true,
        feedback: "Верно. Спокойные сборы и проверенная амуниция делают начало прогулки предсказуемым.",
      },
      {
        id: "movement",
        label: "Быстро открыть дверь",
        description: "Не задерживать питомца ни секунды",
        correct: false,
        feedback: "На сильном возбуждении легко пропустить незакрытую застёжку. Сначала нужна короткая спокойная проверка.",
      },
      {
        id: "play",
        label: "Раззадорить игрушкой",
        description: "Добавить энергии перед самым выходом",
        correct: false,
        feedback: "Дополнительное возбуждение усложнит выход. Игру лучше оставить для подходящего момента на маршруте.",
      },
      {
        id: "meal",
        label: "Насыпать полную миску",
        description: "Плотно покормить прямо перед прогулкой",
        correct: false,
        feedback: "Прогулка не должна начинаться с большой порции. Режим питания согласуют с сотрудниками приюта.",
      },
    ],
  },
  {
    id: "day",
    label: "Старт",
    time: "Шаг 2",
    title: "У калитки стало шумно",
    prompt: "Рядом проходит группа людей, а питомец остановился и смотрит назад. Как продолжить?",
    image: assetUrl("assets/day-game/courtyard-day.webp"),
    irisOrigin: "64% 14%",
    choices: [
      {
        id: "rest",
        label: "Отойти в сторону и дать паузу",
        description: "Сохранить дистанцию и продолжить, когда питомец снова готов",
        correct: true,
        feedback: "Да. Пауза и возможность отойти помогают вернуть контроль без рывков и давления.",
      },
      {
        id: "movement",
        label: "Потянуть поводок вперёд",
        description: "Побыстрее пройти сложное место",
        correct: false,
        feedback: "Рывок не делает место безопаснее. Лучше увеличить дистанцию и дождаться более спокойного состояния.",
      },
      {
        id: "play",
        label: "Позвать всех познакомиться",
        description: "Пусть питомец быстрее привыкает к людям",
        correct: false,
        feedback: "Знакомство с толпой без выбора может усилить тревогу. Новые контакты добавляют постепенно.",
      },
      {
        id: "meal",
        label: "Подманивать без остановки",
        description: "Вести за лакомством через шум",
        correct: false,
        feedback: "Лакомство не должно заставлять проходить туда, где питомцу пока некомфортно.",
      },
    ],
  },
  {
    id: "evening",
    label: "Пауза",
    time: "Шаг 3",
    title: "Солнце стало жарче",
    prompt: "Питомец замедлился и чаще оглядывается на вас. Что сделать на маршруте?",
    image: assetUrl("assets/day-game/courtyard-evening.webp"),
    irisOrigin: "34% 22%",
    choices: [
      {
        id: "meal",
        label: "Перейти в тень и предложить воду",
        description: "Сделать короткую паузу и оценить, готов ли питомец идти дальше",
        correct: true,
        feedback: "Верно. Вода, тень и пауза важнее запланированной длины маршрута.",
      },
      {
        id: "movement",
        label: "Ускориться до финиша",
        description: "Быстрее закончить оставшийся круг",
        correct: false,
        feedback: "Если питомец замедлился, ускорение только увеличит нагрузку. Маршрут можно сократить.",
      },
      {
        id: "play",
        label: "Предложить активную погоню",
        description: "Вернуть бодрость игрой",
        correct: false,
        feedback: "Активная игра в жару добавит нагрузку. Сейчас полезнее прохлада и спокойная пауза.",
      },
      {
        id: "care",
        label: "Долго осматривать на солнце",
        description: "Проверить всё прямо посреди дороги",
        correct: false,
        feedback: "Сначала лучше уйти в тень. Наблюдение должно быть коротким, без сложных процедур на прогулке.",
      },
    ],
  },
  {
    id: "night",
    label: "Возвращение",
    time: "Шаг 4",
    title: "Знакомая калитка уже рядом",
    prompt: "Питомец спокойно возвращается в приют. Как завершить прогулку?",
    image: assetUrl("assets/day-game/courtyard-night.webp"),
    irisOrigin: "82% 10%",
    choices: [
      {
        id: "sleep",
        label: "Вернуться без спешки и передать наблюдение",
        description: "Дать воду, помочь устроиться и рассказать сотруднику, как прошёл маршрут",
        correct: true,
        feedback: "Именно так. Спокойное возвращение и короткое наблюдение связывают прогулку с общей заботой команды.",
      },
      {
        id: "play",
        label: "Продолжить активную игру",
        description: "Не заканчивать встречу на спокойной ноте",
        correct: false,
        feedback: "После маршрута лучше снижать темп. Дополнительная активность может помешать восстановиться.",
      },
      {
        id: "movement",
        label: "Сразу уйти после калитки",
        description: "Не задерживать ни себя, ни сотрудников",
        correct: false,
        feedback: "Коротко передать наблюдения полезно: команда узнает о темпе, реакциях и самочувствии питомца.",
      },
      {
        id: "care",
        label: "Устроить долгий осмотр",
        description: "Продолжать контакт, даже если питомец устал",
        correct: false,
        feedback: "После прогулки важнее вода и отдых. Всё необычное стоит спокойно сообщить сотруднику.",
      },
    ],
  },
];

export const dayActivityIds: DayActivityId[] = [
  "meal",
  "movement",
  "play",
  "rest",
  "care",
  "sleep",
];
