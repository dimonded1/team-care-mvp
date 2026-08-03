import type { StoredSession } from "../types/app";

const HISTORY_KEY = "nikaTeamCareSession";

export interface SessionHistory {
  replace(session: StoredSession): void;
  push(session: StoredSession): void;
  back(): boolean;
  listen(onRestore: (session: StoredSession) => void): () => void;
}

interface SessionHistoryEntry {
  nikaTeamCareSession: {
    index: number;
    session: StoredSession;
  };
}

type HistoryWindow = Pick<Window, "addEventListener" | "removeEventListener" | "history">;

function getEntry(state: unknown): SessionHistoryEntry["nikaTeamCareSession"] | null {
  if (!state || typeof state !== "object" || !(HISTORY_KEY in state)) return null;
  const entry = (state as SessionHistoryEntry).nikaTeamCareSession;
  if (!entry || typeof entry !== "object" || typeof entry.index !== "number") return null;
  return entry;
}

function withEntry(state: unknown, session: StoredSession, index: number): SessionHistoryEntry {
  const base = state && typeof state === "object" ? state : {};
  return {
    ...base,
    [HISTORY_KEY]: { index, session },
  };
}

function mergeJourneyProgress(
  current: StoredSession | null,
  destination: StoredSession,
): StoredSession {
  if (!current
    || current.stage !== "journey"
    || destination.stage !== "passport"
    || current.animalId !== destination.animalId) return destination;
  return {
    ...destination,
    startedMissionIds: [...new Set([
      ...destination.startedMissionIds,
      ...current.startedMissionIds,
    ])],
    completedMissionIds: [...new Set([
      ...destination.completedMissionIds,
      ...current.completedMissionIds,
    ])],
    missionProgress: {
      ...destination.missionProgress,
      ...current.missionProgress,
    },
    updatedAt: current.updatedAt,
  };
}

export function createSessionHistory(host: HistoryWindow = window): SessionHistory {
  let latestSession = getEntry(host.history.state)?.session ?? null;
  const write = (method: "pushState" | "replaceState", session: StoredSession, index: number) => {
    host.history[method](withEntry(host.history.state, session, index), "");
    latestSession = session;
  };

  return {
    replace(session) {
      write("replaceState", session, getEntry(host.history.state)?.index ?? 0);
    },
    push(session) {
      write("pushState", session, (getEntry(host.history.state)?.index ?? 0) + 1);
    },
    back() {
      if ((getEntry(host.history.state)?.index ?? 0) < 1) return false;
      host.history.back();
      return true;
    },
    listen(onRestore) {
      const onPopState = (event: PopStateEvent) => {
        const entry = getEntry(event.state);
        if (!entry) return;
        const session = mergeJourneyProgress(latestSession, entry.session);
        if (session !== entry.session) {
          write("replaceState", session, entry.index);
        } else {
          latestSession = session;
        }
        onRestore(session);
      };
      host.addEventListener("popstate", onPopState);
      return () => host.removeEventListener("popstate", onPopState);
    },
  };
}
