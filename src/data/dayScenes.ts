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
    label: "Утро",
    time: "07:30",
    title: "На крыльце шумит дождь",
    prompt: "Питомец проснулся, но не спешит вставать. Как начать день без лишней суеты?",
    image: assetUrl("assets/day-game/courtyard-morning.webp"),
    irisOrigin: "82% 18%",
    choices: [
      {
        id: "meal",
        label: "Спокойный старт без спешки",
        description: "Свежая вода, привычный завтрак и время осмотреться",
        correct: true,
        feedback: "Верно. Предсказуемое начало дня помогает проснуться спокойно и сохраняет привычный ритм.",
      },
      {
        id: "play",
        label: "Включить заводную игрушку",
        description: "Разбудить дом ярким звуком",
        correct: false,
        feedback: "Резкий звук добавит возбуждения. Игру лучше предложить, когда питомец проснулся и поел.",
      },
      {
        id: "movement",
        label: "Сразу пойти новым маршрутом",
        description: "Побольше впечатлений с первой минуты",
        correct: false,
        feedback: "Новизна требует сил. Утром лучше начать с знакомой последовательности и дать время включиться.",
      },
      {
        id: "care",
        label: "Устроить длинный осмотр",
        description: "Сразу проверить лапы, уши и шерсть",
        correct: false,
        feedback: "Даже полезный уход не стоит превращать в обязательную утреннюю процедуру, если питомец ещё сонный.",
      },
    ],
  },
  {
    id: "day",
    label: "День",
    time: "13:10",
    title: "За воротами новый маршрут",
    prompt: "Впереди шумная площадка и тихая тропинка. Питомец остановился — куда идти дальше?",
    image: assetUrl("assets/day-game/courtyard-day.webp"),
    irisOrigin: "64% 14%",
    choices: [
      {
        id: "movement",
        label: "Выбрать тихую тропинку",
        description: "Исследовать новое без толпы и спешки",
        correct: true,
        feedback: "Да. Новый маршрут остаётся интересным, а спокойная обстановка позволяет изучать его в своём темпе.",
      },
      {
        id: "play",
        label: "Позвать к шумной компании",
        description: "Пусть быстрее привыкает к людям",
        correct: false,
        feedback: "Знакомство через давление редко помогает. Дистанцию до людей лучше сокращать постепенно.",
      },
      {
        id: "meal",
        label: "Заманивать вперёд угощением",
        description: "Не оставлять возможности остановиться",
        correct: false,
        feedback: "Лакомство не должно заставлять идти туда, где некомфортно. Сначала важнее чувство выбора.",
      },
      {
        id: "rest",
        label: "Долго ждать посреди дороги",
        description: "Стоять на месте, пока решится сам",
        correct: false,
        feedback: "На проходе трудно расслабиться. Лучше мягко предложить более тихое направление.",
      },
    ],
  },
  {
    id: "evening",
    label: "Вечер",
    time: "19:20",
    title: "Дом наполняется вечерними звуками",
    prompt: "После прогулки питомец всё ещё возбуждён и носит игрушку. Как помочь переключиться на отдых?",
    image: assetUrl("assets/day-game/courtyard-evening.webp"),
    irisOrigin: "34% 22%",
    choices: [
      {
        id: "care",
        label: "Долго вычёсывать перед сном",
        description: "Продолжать уход, даже если хочется уйти",
        correct: false,
        feedback: "Уход должен оставаться добровольным и коротким. Если питомец устал, щётку лучше отложить.",
      },
      {
        id: "play",
        label: "Пять минут тихого поиска",
        description: "Найти часть привычного корма, затем вода и лежанка",
        correct: true,
        feedback: "Верно. Короткая поисковая задача занимает нос и голову, а затем помогает мягко перейти к тишине.",
      },
      {
        id: "movement",
        label: "Повторить активную прогулку",
        description: "Утомить ещё сильнее перед сном",
        correct: false,
        feedback: "Новая порция активности снова разгонит возбуждение. Вечером полезнее постепенно снижать темп.",
      },
      {
        id: "meal",
        label: "Насыпать двойную порцию",
        description: "Заменить спокойный ритуал едой",
        correct: false,
        feedback: "Лишняя порция не делает сон спокойнее. Для игры-поиска используют часть обычного рациона, а не добавку.",
      },
    ],
  },
  {
    id: "night",
    label: "Ночь",
    time: "22:40",
    title: "За дверью хлопнул лифт",
    prompt: "Питомец проснулся от незнакомого звука и прислушивается. Как вернуть ощущение безопасности?",
    image: assetUrl("assets/day-game/courtyard-night.webp"),
    irisOrigin: "82% 10%",
    choices: [
      {
        id: "sleep",
        label: "Оставить путь к тихому месту",
        description: "Приглушить свет и не вытаскивать из лежанки",
        correct: true,
        feedback: "Именно так. Возможность спрятаться и самому решить, когда выйти, помогает снова расслабиться.",
      },
      {
        id: "play",
        label: "Отвлечь громкой игрушкой",
        description: "Перекрыть один звук другим",
        correct: false,
        feedback: "Ещё один резкий звук усилит настороженность. Ночью лучше уменьшить количество стимулов.",
      },
      {
        id: "movement",
        label: "Позвать проверить коридор",
        description: "Подвести ближе к источнику шума",
        correct: false,
        feedback: "Проверять источник необязательно. Безопасная дистанция помогает быстрее успокоиться.",
      },
      {
        id: "care",
        label: "Переложить ближе к себе",
        description: "Взять на руки или сдвинуть лежанку",
        correct: false,
        feedback: "Даже заботливое перемещение лишает контроля. Лучше быть рядом, не меняя выбранное питомцем место.",
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
