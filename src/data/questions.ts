import type { Question } from "../types/app";

export const questions: Question[] = [
  {
    id: "first-step",
    text: "В незнакомой компании я обычно делаю первый шаг.",
    yes: { initiative: 18, sociability: 10 },
    no: { initiative: -12, spaceRespect: 8 },
  },
  {
    id: "active-weekend",
    text: "Идеальный выходной для меня — провести большую часть дня в движении.",
    yes: { energy: 22 },
    no: { energy: -18, routine: 6 },
  },
  {
    id: "find-connection",
    text: "Мне легко найти общий язык с тем, кому нужно время, чтобы раскрыться.",
    yes: { patience: 14, initiative: 8, challenge: 8 },
    no: { sociability: 8, challenge: -8 },
  },
  {
    id: "clear-rhythm",
    text: "Мне спокойнее, когда у дня есть понятный ритм.",
    yes: { routine: 20, patience: 4 },
    no: { routine: -18, energy: 5 },
  },
  {
    id: "melt-or-wait",
    text: "Если мне не доверяют, я скорее попробую растопить лёд, чем буду просто ждать.",
    yes: { initiative: 16, challenge: 10 },
    no: { spaceRespect: 18, patience: 8 },
  },
  {
    id: "care-by-actions",
    text: "Заботу я чаще показываю делами, чем словами.",
    yes: { routine: 10, patience: 6 },
    no: { sociability: 10, initiative: 4 },
  },
  {
    id: "long-walk",
    text: "Я выберу долгую прогулку, даже если можно остаться дома.",
    yes: { energy: 20 },
    no: { energy: -16, routine: 6 },
  },
  {
    id: "slow-result",
    text: "Я готов выстраивать отношения, даже если быстрого результата не будет.",
    yes: { patience: 18, challenge: 14 },
    no: { challenge: -12, sociability: 6 },
  },
  {
    id: "company-role",
    text: "В компании я чаще задаю настроение, чем спокойно наблюдаю.",
    yes: { sociability: 18, initiative: 10, energy: 6 },
    no: { sociability: -10, spaceRespect: 10 },
  },
  {
    id: "needs-time",
    text: "Мне особенно хочется поддержать того, кому нужно время, чтобы открыться.",
    yes: { challenge: 22, patience: 10, spaceRespect: 8 },
    no: { sociability: 12, challenge: -10 },
  },
  {
    id: "spontaneity",
    text: "Небольшая спонтанность почти всегда делает день лучше.",
    yes: { routine: -18, energy: 10, initiative: 6 },
    no: { routine: 18 },
  },
];
