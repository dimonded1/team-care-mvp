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
    situation: "Собака в приюте отворачивается, облизывает нос и прижимает уши.",
    action: "Остановиться боком, увеличить дистанцию и дать ей выбор.",
    explanation: "Отведённый взгляд, облизывание и прижатые уши могут говорить о тревоге. Дистанция снижает давление и оставляет собаке возможность самой решить, приближаться ли.",
    reviewStatus: "needs-foundation-review",
  },
  {
    id: "feeding-time",
    situation: "После шума в коридоре пёс в приюте застыл у двери перед прогулкой.",
    action: "Подождать тишины и продолжить, когда тело снова расслабится.",
    explanation: "Замирание — повод сделать паузу. Спокойное ожидание помогает не проталкивать животное через испуг и вернуть прогулке предсказуемый ритм.",
    reviewStatus: "needs-foundation-review",
  },
  {
    id: "cat-contact",
    situation: "Кошка в приюте спряталась на верхней полке и наблюдает оттуда.",
    action: "Сесть поодаль, говорить тихо и не вытаскивать её из укрытия.",
    explanation: "Укрытие помогает кошке справиться с напряжением. Тихое присутствие без прямого приближения даёт ей познакомиться с человеком в своём темпе.",
    reviewStatus: "needs-foundation-review",
  },
  {
    id: "walk-prep",
    situation: "Во время визита собака в приюте сама подошла и мягко коснулась ладони носом.",
    action: "Дать обнюхать руку и предложить короткий контакт, следя за её реакцией.",
    explanation: "Инициатива животного — хороший момент для короткого знакомства. Даже тогда важно наблюдать за позой и остановиться, если собака отстраняется.",
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
