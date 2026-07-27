import type { Animal, Mission } from "../types/app";

export type MissionStatus = "available" | "started" | "completed";

export function getMissionStatus(
  missionId: Mission["id"],
  startedMissionIds: Mission["id"][],
  completedMissionIds: Mission["id"][],
): MissionStatus {
  if (completedMissionIds.includes(missionId)) return "completed";
  if (startedMissionIds.includes(missionId)) return "started";
  return "available";
}

export function getRecommendedMissionId(
  missions: Mission[],
  completedMissionIds: Mission["id"][],
): Mission["id"] | null {
  return missions.find((mission) => !completedMissionIds.includes(mission.id))?.id ?? null;
}

export function getActionLabel(status: MissionStatus, duration: number) {
  if (status === "completed") return "Пройдено · повторить";
  if (status === "started") return "Продолжить";
  return `Начать · ${duration} мин`;
}

export function getOrbitStoryFragments(animal: Animal): string[] {
  const firstStorySentence = animal.story
    .split(/[.!?](?:\s|$)/)
    .map((part) => part.trim())
    .find(Boolean);

  return [
    animal.traits.slice(0, 2).join(" · "),
    firstStorySentence ?? animal.shortDescription,
    `Важно: ${animal.careTags.slice(0, 2).join(" · ")}`,
  ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);
}
