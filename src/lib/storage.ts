import type { Mission, StoredSession } from "../types/app";

const STORAGE_KEY = "nika-team-care-mvp-v1";
const missionIds: Mission["id"][] = ["food", "health", "trust", "home"];
const restorableStages: StoredSession["stage"][] = [
  "welcome",
  "quiz",
  "passport",
  "journey",
  "guardianship",
  "final",
];

interface LegacyStoredSession {
  version: 1;
  stage: StoredSession["stage"];
  answers: boolean[];
  animalId: string | null;
  missionIndex: number;
  completedMissionIds: Mission["id"][];
  updatedAt: string;
}

function isMissionId(value: unknown): value is Mission["id"] {
  return typeof value === "string" && missionIds.includes(value as Mission["id"]);
}

function normalizeMissionIds(value: unknown): Mission["id"][] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isMissionId))];
}

function isStoredStage(value: unknown): value is StoredSession["stage"] {
  return typeof value === "string" && restorableStages.includes(value as StoredSession["stage"]);
}

function normalizeCommon(value: Record<string, unknown>) {
  if (!isStoredStage(value.stage) || !Array.isArray(value.answers)) return null;
  const answers = value.answers.filter((answer): answer is boolean => typeof answer === "boolean");
  const animalId = typeof value.animalId === "string" ? value.animalId : null;
  const updatedAt = typeof value.updatedAt === "string"
    ? value.updatedAt
    : new Date().toISOString();
  return { stage: value.stage, answers, animalId, updatedAt };
}

export function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const common = normalizeCommon(value);
    if (!common) return null;

    if (value.version === 2) {
      const completedMissionIds = normalizeMissionIds(value.completedMissionIds);
      const activeMissionId = isMissionId(value.activeMissionId) ? value.activeMissionId : null;
      const startedMissionIds = normalizeMissionIds([
        ...normalizeMissionIds(value.startedMissionIds),
        ...completedMissionIds,
        ...(activeMissionId ? [activeMissionId] : []),
      ]);
      return {
        version: 2,
        ...common,
        stage: common.stage === "journey" && !activeMissionId ? "passport" : common.stage,
        activeMissionId,
        startedMissionIds,
        completedMissionIds,
      };
    }

    if (value.version === 1 && typeof value.missionIndex === "number") {
      const legacy = value as unknown as LegacyStoredSession;
      const completedMissionIds = normalizeMissionIds(legacy.completedMissionIds);
      const activeMissionId = common.stage === "journey"
        ? missionIds[Math.max(0, Math.min(missionIds.length - 1, legacy.missionIndex))] ?? null
        : null;
      return {
        version: 2,
        ...common,
        activeMissionId,
        startedMissionIds: normalizeMissionIds([
          ...completedMissionIds,
          ...(activeMissionId ? [activeMissionId] : []),
        ]),
        completedMissionIds,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The app remains usable when storage is unavailable.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}
