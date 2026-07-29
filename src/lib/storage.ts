import type { Mission, StoredSession } from "../types/app";

const STORAGE_KEY = "nika-team-care-mvp-v1";
const RECENT_MATCHES_KEY = "nika-team-care-recent-matches-v1";
const RECENT_MATCH_LIMIT = 12;
const missionIds: Mission["id"][] = ["food", "health", "trust", "home"];
const restorableStages: StoredSession["stage"][] = [
  "welcome",
  "quiz",
  "reveal",
  "passport",
  "journey",
  "guardianship",
  "final",
];

interface LegacyStoredSession {
  version: 1;
  stage: StoredSession["stage"] | "care-intro";
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

function normalizeMissionProgress(value: unknown): StoredSession["missionProgress"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([missionId]) => isMissionId(missionId)),
  ) as StoredSession["missionProgress"];
}

function isStoredStage(value: unknown): value is StoredSession["stage"] {
  return typeof value === "string" && restorableStages.includes(value as StoredSession["stage"]);
}

function normalizeCommon(value: Record<string, unknown>) {
  if (!Array.isArray(value.answers)) return null;
  const stage = value.stage === "care-intro"
    ? "passport"
    : isStoredStage(value.stage)
      ? value.stage
      : null;
  if (!stage) return null;
  const answers = value.answers.filter((answer): answer is boolean => typeof answer === "boolean");
  const animalId = typeof value.animalId === "string" ? value.animalId : null;
  const updatedAt = typeof value.updatedAt === "string"
    ? value.updatedAt
    : new Date().toISOString();
  return { stage, answers, animalId, updatedAt };
}

export function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeStoredSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function normalizeStoredSession(value: unknown): StoredSession | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const common = normalizeCommon(record);
    if (!common) return null;

    if (record.version === 3 || record.version === 2) {
      const completedMissionIds = normalizeMissionIds(record.completedMissionIds);
      const activeMissionId = isMissionId(record.activeMissionId) ? record.activeMissionId : null;
      const startedMissionIds = normalizeMissionIds([
        ...normalizeMissionIds(record.startedMissionIds),
        ...completedMissionIds,
        ...(activeMissionId ? [activeMissionId] : []),
      ]);
      return {
        version: 3,
        ...common,
        stage: common.stage === "journey" && !activeMissionId
          ? "passport"
          : record.version === 2 && common.stage === "final"
            ? "guardianship"
            : common.stage,
        activeMissionId,
        startedMissionIds,
        completedMissionIds,
        missionProgress: normalizeMissionProgress(record.missionProgress),
      };
    }

    if (record.version === 1 && typeof record.missionIndex === "number") {
      const legacy = record as unknown as LegacyStoredSession;
      const completedMissionIds = normalizeMissionIds(legacy.completedMissionIds);
      const activeMissionId = common.stage === "journey"
        ? missionIds[Math.max(0, Math.min(missionIds.length - 1, legacy.missionIndex))] ?? null
        : null;
      return {
        version: 3,
        ...common,
        activeMissionId,
        startedMissionIds: normalizeMissionIds([
          ...completedMissionIds,
          ...(activeMissionId ? [activeMissionId] : []),
        ]),
        completedMissionIds,
        missionProgress: {},
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeSessionForJourney(
  value: unknown,
  expectedAnswerCount: number,
): StoredSession | null {
  const session = normalizeStoredSession(value);
  if (!session) return null;
  const requiresCompleteMatch = session.stage !== "welcome" && session.stage !== "quiz";
  if (requiresCompleteMatch && session.answers.length !== expectedAnswerCount) {
    return {
      ...session,
      stage: "quiz",
      animalId: null,
      activeMissionId: null,
      startedMissionIds: [],
      completedMissionIds: [],
      missionProgress: {},
    };
  }
  if (session.stage === "final"
    && !missionIds.every((missionId) => session.completedMissionIds.includes(missionId))) {
    return {
      ...session,
      stage: "guardianship",
      activeMissionId: null,
    };
  }
  return session;
}

export function reconcileSessionWithAnimalCatalog(
  session: StoredSession,
  availableAnimalIds: Iterable<string>,
  rematchedAnimalId: string | null,
): StoredSession {
  const available = new Set(availableAnimalIds);
  if (!session.animalId || available.has(session.animalId)) return session;

  const stage = session.stage === "welcome" || session.stage === "quiz"
    ? session.stage
    : rematchedAnimalId
      ? "passport"
      : "quiz";

  return {
    ...session,
    stage,
    animalId: rematchedAnimalId,
    activeMissionId: null,
    startedMissionIds: [],
    completedMissionIds: [],
    missionProgress: {},
  };
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

export function loadRecentMatchedAnimalIds(
  availableAnimalIds: Iterable<string>,
): string[] {
  try {
    const available = new Set(availableAnimalIds);
    const stored = JSON.parse(window.localStorage.getItem(RECENT_MATCHES_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return [...new Set(stored)]
      .filter((animalId): animalId is string =>
        typeof animalId === "string" && available.has(animalId))
      .slice(0, RECENT_MATCH_LIMIT);
  } catch {
    return [];
  }
}

export function rememberMatchedAnimalId(
  animalId: string,
  availableAnimalIds: Iterable<string>,
): void {
  try {
    const available = new Set(availableAnimalIds);
    if (!available.has(animalId)) return;
    const limit = Math.min(RECENT_MATCH_LIMIT, Math.max(0, available.size - 1));
    if (limit === 0) {
      window.localStorage.removeItem(RECENT_MATCHES_KEY);
      return;
    }
    const recent = loadRecentMatchedAnimalIds(available);
    const next = [animalId, ...recent.filter((storedId) => storedId !== animalId)].slice(0, limit);
    window.localStorage.setItem(RECENT_MATCHES_KEY, JSON.stringify(next));
  } catch {
    // Matching remains score-based when storage is unavailable.
  }
}
