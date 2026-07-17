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
    title: "Двор просыпается",
    prompt: "С чего начать утро?",
    image: assetUrl("assets/day-game/courtyard-morning.webp"),
    irisOrigin: "82% 18%",
    choices: [
      {
        id: "meal",
        label: "Свежая вода и завтрак",
        description: "Начать день с базовой заботы",
        correct: true,
        feedback: "Верно. Свежая вода и привычный рацион помогают спокойно войти в новый день.",
      },
      {
        id: "play",
        label: "Сразу начать шумную игру",
        description: "Быстро взбодриться и побегать",
        correct: false,
        feedback: "Сначала лучше дать проснуться, попить и поесть. Активная игра подождёт немного.",
      },
      {
        id: "care",
        label: "Дать лекарство на всякий случай",
        description: "Не дожидаться назначения команды",
        correct: false,
        feedback: "Лекарства дают только по назначению ветеринарной команды и в установленное время.",
      },
    ],
  },
  {
    id: "day",
    label: "День",
    time: "13:10",
    title: "Во дворе много жизни",
    prompt: "Что будет бережным выбором?",
    image: assetUrl("assets/day-game/courtyard-day.webp"),
    irisOrigin: "64% 14%",
    choices: [
      {
        id: "rest",
        label: "Оставить одного во дворе",
        description: "Пусть сам найдёт себе занятие",
        correct: false,
        feedback: "Во дворе животному нужны безопасные условия и внимание команды, а не одиночество без присмотра.",
      },
      {
        id: "movement",
        label: "Прогулка в его темпе",
        description: "Дать исследовать мир без спешки",
        correct: true,
        feedback: "Да. Движение полезно, когда темп и нагрузка подходят конкретному животному.",
      },
      {
        id: "meal",
        label: "Угостить едой со стола",
        description: "Порадовать чем-нибудь вкусным",
        correct: false,
        feedback: "Человеческая еда может навредить. Рацион и лакомства всегда согласуются с командой.",
      },
    ],
  },
  {
    id: "evening",
    label: "Вечер",
    time: "19:20",
    title: "В окнах зажигается свет",
    prompt: "Как мягко завершить активную часть дня?",
    image: assetUrl("assets/day-game/courtyard-evening.webp"),
    irisOrigin: "34% 22%",
    choices: [
      {
        id: "care",
        label: "Долгое вычёсывание",
        description: "Продолжать, даже если питомец хочет уйти",
        correct: false,
        feedback: "Уход должен оставаться добровольным и коротким. Если питомец устал, щётку лучше отложить.",
      },
      {
        id: "rest",
        label: "Тихий ритуал перед сном",
        description: "Свежая вода, приглушённый свет и лежанка",
        correct: true,
        feedback: "Верно. Понятный тихий ритуал помогает переключиться с активности на отдых.",
      },
      {
        id: "meal",
        label: "Большой поздний ужин",
        description: "Добавить вторую порцию перед самым сном",
        correct: false,
        feedback: "Лишняя порция не делает сон спокойнее. Вечером важнее вода, тишина и привычное место.",
      },
    ],
  },
  {
    id: "night",
    label: "Ночь",
    time: "22:40",
    title: "Двор становится тихим",
    prompt: "Что поможет почувствовать себя в безопасности?",
    image: assetUrl("assets/day-game/courtyard-night.webp"),
    irisOrigin: "82% 10%",
    choices: [
      {
        id: "movement",
        label: "Разбудить для ещё одной прогулки",
        description: "Добавить активности перед сном",
        correct: false,
        feedback: "Ночью организму важнее восстановление. Дополнительную активность лучше перенести на день.",
      },
      {
        id: "sleep",
        label: "Тишина и тёплое место",
        description: "Дать спокойно восстановиться",
        correct: true,
        feedback: "Именно так. Тишина, тепло и своё безопасное место завершают день.",
      },
      {
        id: "play",
        label: "Оставить яркий свет и игрушки",
        description: "Чтобы ночью не было скучно",
        correct: false,
        feedback: "Яркий свет и постоянные стимулы мешают отдыху. Ночью пространство лучше сделать спокойным.",
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
import { assetUrl } from "../lib/assets";
