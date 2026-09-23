import type { ExperienceMode, Mission, StoredSession } from "../types/app";
import { readCampaignTag } from "./contactCapture";

export const FOUR_PAWS_CAMPAIGN = "4-lapy";

export function resolveExperienceMode(
  _search = typeof window === "undefined" ? "" : window.location.search,
): ExperienceMode {
  // Campaign links still identify where a visitor came from, but no longer change the game.
  return "standard";
}

export function isFourPawsEvent(mode: ExperienceMode): boolean {
  return mode === "four-paws-event";
}

export function getContactCampaignForExperience(
  mode: ExperienceMode,
  search = typeof window === "undefined" ? "" : window.location.search,
): string | undefined {
  if (isFourPawsEvent(mode)) return FOUR_PAWS_CAMPAIGN;
  return readCampaignTag(search) || undefined;
}

const eventMissionOrder: Mission["id"][] = ["trust", "home", "food", "health"];

export function getMissionsForExperience(
  missions: Mission[],
  mode: ExperienceMode,
): Mission[] {
  if (!isFourPawsEvent(mode)) return missions;
  const byId = new Map(missions.map((mission) => [mission.id, mission]));
  return eventMissionOrder
    .map((missionId) => byId.get(missionId))
    .filter((mission): mission is Mission => Boolean(mission));
}

export function isMissionUnlocked(
  missions: Mission[],
  completedMissionIds: Mission["id"][],
  missionId: Mission["id"],
  mode: ExperienceMode,
): boolean {
  if (!isFourPawsEvent(mode)) return true;
  const missionIndex = missions.findIndex((mission) => mission.id === missionId);
  if (missionIndex < 0) return false;
  if (completedMissionIds.includes(missionId)) return true;
  return missions
    .slice(0, missionIndex)
    .every((mission) => completedMissionIds.includes(mission.id));
}

export function reconcileRestoredMissionAccess(
  session: StoredSession,
  missions: Mission[],
  mode: ExperienceMode,
): StoredSession {
  if (session.stage !== "journey") return session;
  const activeMissionId = session.activeMissionId;
  if (
    activeMissionId
    && isMissionUnlocked(missions, session.completedMissionIds, activeMissionId, mode)
  ) {
    return session;
  }
  return {
    ...session,
    stage: "passport",
    activeMissionId: null,
  };
}

export function reconcileSessionExperience(
  session: StoredSession,
  mode: ExperienceMode,
  expectedAnswerCount: number,
): StoredSession {
  const storedMode = session.experienceMode ?? "standard";
  if (storedMode === mode) return { ...session, experienceMode: mode };

  const hasCompleteMatch = session.answers.length === expectedAnswerCount && Boolean(session.animalId);
  const stage = session.stage === "welcome" || session.stage === "quiz"
    ? session.stage
    : hasCompleteMatch
      ? "passport"
      : "quiz";

  return {
    ...session,
    experienceMode: mode,
    stage,
    activeMissionId: null,
    startedMissionIds: [],
    completedMissionIds: [],
    missionProgress: {},
  };
}
