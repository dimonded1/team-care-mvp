export type HomeItemId =
  | "bed"
  | "water"
  | "rug"
  | "mesh"
  | "toy"
  | "plant"
  | "cable"
  | "candle";

export type HomePlacementId = "quiet-corner" | "water-place" | "safe-floor" | "window" | "play-place";

export interface HomeItem {
  id: HomeItemId;
  label: string;
  shortLabel: string;
  description: string;
  safe: boolean;
  feedback: string;
  asset: string;
  placement?: HomePlacementId;
}

export const homeItems: HomeItem[] = [
  {
    id: "bed",
    label: "Лежанка в тихом месте",
    shortLabel: "Тихая лежанка",
    description: "Своё место вдали от прохода",
    safe: true,
    feedback: "Тихий угол помогает питомцу отдыхать и осваиваться в своём темпе.",
    asset: "assets/home-game/bed.webp",
    placement: "quiet-corner",
  },
  {
    id: "water",
    label: "Миска со свежей водой",
    shortLabel: "Свежая вода",
    description: "Вода всегда в доступе",
    safe: true,
    feedback: "Отлично: чистая вода должна быть доступна питомцу в спокойном месте.",
    asset: "assets/home-game/water.webp",
    placement: "water-place",
  },
  {
    id: "rug",
    label: "Нескользкий коврик",
    shortLabel: "Коврик",
    description: "Уверенные шаги по гладкому полу",
    safe: true,
    feedback: "Коврик делает гладкий пол устойчивее и помогает двигаться увереннее.",
    asset: "assets/home-game/rug.webp",
    placement: "safe-floor",
  },
  {
    id: "mesh",
    label: "Защитная сетка на окно",
    shortLabel: "Сетка на окно",
    description: "Окно можно проветривать безопаснее",
    safe: true,
    feedback: "Верно: прочная защитная сетка снижает риск падения из открытого окна.",
    asset: "assets/home-game/mesh.webp",
    placement: "window",
  },
  {
    id: "toy",
    label: "Безопасная мягкая игрушка",
    shortLabel: "Мягкая игрушка",
    description: "Знакомство с домом через игру",
    safe: true,
    feedback: "Подходящая по размеру игрушка помогает спокойно исследовать новое место.",
    asset: "assets/home-game/toy.webp",
    placement: "play-place",
  },
  {
    id: "plant",
    label: "Незнакомое растение",
    shortLabel: "Растение",
    description: "Красивый горшок без проверки безопасности",
    safe: false,
    feedback: "Это пока не берём: некоторые растения опасны для животных, сначала нужно проверить вид.",
    asset: "assets/home-game/plant.webp",
  },
  {
    id: "cable",
    label: "Свободный провод",
    shortLabel: "Провод",
    description: "Лежит прямо на пути",
    safe: false,
    feedback: "Провод лучше закрепить или спрятать, чтобы его нельзя было погрызть или зацепить.",
    asset: "assets/home-game/cable.webp",
  },
  {
    id: "candle",
    label: "Зажжённая свеча",
    shortLabel: "Свеча",
    description: "Открытый огонь на доступной высоте",
    safe: false,
    feedback: "Открытый огонь оставим за пределами комнаты: любопытный питомец может задеть свечу.",
    asset: "assets/home-game/candle.webp",
  },
];

export const safeHomeItems = homeItems.filter((item) => item.safe);
export const unsafeHomeItems = homeItems.filter((item) => !item.safe);

export const homeItemQueue: HomeItemId[] = [
  "bed",
  "plant",
  "water",
  "cable",
  "rug",
  "candle",
  "mesh",
  "toy",
];
