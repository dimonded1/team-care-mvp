import type { Mission } from "../types/app";

export interface EventStation {
  missionId: Mission["id"];
  number: 1 | 2 | 3 | 4;
  mode: "offline" | "online";
  title: string;
  shortTitle: string;
  description: string;
  task?: string;
  steps?: string[];
}

export const fourPawsStations: readonly EventStation[] = [
  {
    missionId: "trust",
    number: 1,
    mode: "offline",
    title: "Планета доверия",
    shortTitle: "Планета доверия",
    description: "Соедините четыре ситуации из жизни приюта с бережными действиями человека.",
    task: "Возьмите карточку-действие и прикрепите её напротив подходящей ситуации.",
    steps: [
      "Подойдите к магнитной доске или стенду с липучками.",
      "За 30 секунд сопоставьте четыре ситуации и четыре бережных шага.",
      "Покажите результат волонтёру и получите цифровую печать.",
    ],
  },
  {
    missionId: "home",
    number: 2,
    mode: "online",
    title: "Планета жизни",
    shortTitle: "Планета жизни",
    description: "Пройдите маршрут, соберите точки заботы и избегайте клеща.",
  },
  {
    missionId: "food",
    number: 3,
    mode: "offline",
    title: "Планета домой",
    shortTitle: "Планета домой",
    description: "Загрузите багажник ровно на заданный вес, не перегрузив машину.",
    task: "Выберите вещи на ПВХ-стеллаже и сложите их в багажник на нужное количество килограммов.",
    steps: [
      "Получите карточку с заданным весом.",
      "За 30 секунд соберите подходящий набор гуманитарной помощи.",
      "Сверьте вес с волонтёром и получите цифровую печать.",
    ],
  },
  {
    missionId: "health",
    number: 4,
    mode: "online",
    title: "Планета здоровья",
    shortTitle: "Планета здоровья",
    description: "Заметьте важные сигналы и выберите безопасный первый шаг.",
  },
] as const;

export function getEventStation(missionId: Mission["id"]): EventStation | null {
  return fourPawsStations.find((station) => station.missionId === missionId) ?? null;
}
