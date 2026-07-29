export type CarePairCardKind = "situation" | "action";

export interface CarePair {
  id: string;
  situation: string;
  action: string;
  explanation: string;
  reviewStatus: "needs-foundation-review";
}

export interface CarePairCard {
  id: string;
  pairId: CarePair["id"];
  kind: CarePairCardKind;
  label: string;
  reviewStatus: CarePair["reviewStatus"];
}

export const carePairs: readonly CarePair[] = [
  {
    id: "new-arrival",
    situation: "Новичок в приюте прячется в дальнем углу вольера.",
    action: "Оставить тихое пространство и дать освоиться в своём темпе.",
    explanation: "Тишина и выбор дистанции помогают животному почувствовать себя в безопасности.",
    reviewStatus: "needs-foundation-review",
  },
  {
    id: "feeding-time",
    situation: "Собака в приюте отвлеклась во время кормления и настороженно смотрит по сторонам.",
    action: "Спокойно отойти на шаг и дать ей закончить без спешки.",
    explanation: "Во время еды спокойная обстановка помогает сохранить привычный и понятный ритм.",
    reviewStatus: "needs-foundation-review",
  },
  {
    id: "cat-contact",
    situation: "Кошка в приюте подошла ближе, но остановилась перед протянутой рукой.",
    action: "Остаться рядом без резких движений и позволить ей самой выбрать контакт.",
    explanation: "Когда контакт остаётся выбором животного, доверие растёт бережно.",
    reviewStatus: "needs-foundation-review",
  },
  {
    id: "walk-prep",
    situation: "Перед прогулкой пёс в приюте волнуется у двери и тянется вперёд.",
    action: "Сделать короткую спокойную паузу и продолжить, когда темп станет ровнее.",
    explanation: "Небольшая пауза помогает вернуть предсказуемость перед выходом.",
    reviewStatus: "needs-foundation-review",
  },
] as const;

export const carePairCards: readonly CarePairCard[] = carePairs.flatMap((pair) => [
  {
    id: `${pair.id}-situation`,
    pairId: pair.id,
    kind: "situation",
    label: pair.situation,
    reviewStatus: pair.reviewStatus,
  },
  {
    id: `${pair.id}-action`,
    pairId: pair.id,
    kind: "action",
    label: pair.action,
    reviewStatus: pair.reviewStatus,
  },
]);

export const carePairDeckOrder = carePairCards.map((card) => card.id);

