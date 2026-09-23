import type { Animal, Mission, StoredSession } from "../types/app";
import { carePairs } from "../data/carePairs";
import { visitSituations } from "../data/visitSituations";
import { healthZones } from "../data/healthSituations";

export type MissionStatus = "available" | "started" | "ready" | "completed";

/** Read-only presentation of terminal progress; confirmation still commits the station. */
export function getReadyMissionIds(progress: StoredSession["missionProgress"] = {}): Mission["id"][] {
  return (Object.entries(progress) as [Mission["id"], unknown][]).filter(([id, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const state = raw as Record<string, unknown>;
    if (id === "home") return typeof state.completedAt === "number" && Number.isFinite(state.completedAt) && state.completedAt > 0;
    if (id === "food") return state.step === visitSituations.length;
    if (id === "trust") return carePairs.every((pair) => Array.isArray(state.matchedPairIds) && state.matchedPairIds.includes(pair.id));
    if (id === "health") return healthZones.every((zone) => Array.isArray(state.completedZoneIds) && state.completedZoneIds.includes(zone.id));
    return false;
  }).map(([id]) => id);
}

export function getMissionStatus(
  missionId: Mission["id"],
  startedMissionIds: Mission["id"][],
  completedMissionIds: Mission["id"][],
  readyMissionIds: Mission["id"][] = [],
): MissionStatus {
  if (completedMissionIds.includes(missionId)) return "completed";
  if (readyMissionIds.includes(missionId)) return "ready";
  if (startedMissionIds.includes(missionId)) return "started";
  return "available";
}

export function getRecommendedMissionId(
  missions: Mission[],
  completedMissionIds: Mission["id"][],
): Mission["id"] | null {
  return missions.find((mission) => !completedMissionIds.includes(mission.id))?.id ?? null;
}

export function isCareJourneyComplete(
  missions: Mission[],
  completedMissionIds: Mission["id"][],
) {
  return missions.length > 0
    && missions.every((mission) => completedMissionIds.includes(mission.id));
}

export function getActionLabel(status: MissionStatus, duration: number) {
  if (status === "ready") return "Сохранить станцию";
  if (status === "completed") return "Посмотреть итог";
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
