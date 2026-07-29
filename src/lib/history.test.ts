import { describe, expect, it, vi } from "vitest";
import { createSessionHistory } from "./history";
import type { StoredSession } from "../types/app";

const session = (stage: StoredSession["stage"], answers: boolean[] = []): StoredSession => ({
  version: 3,
  stage,
  answers,
  animalId: answers.length === 11 ? "animal-1" : null,
  activeMissionId: stage === "journey" ? "food" : null,
  startedMissionIds: stage === "journey" ? ["food"] : [],
  completedMissionIds: [],
  missionProgress: stage === "journey" ? { food: { step: 2 } } : {},
  updatedAt: "2026-07-29T00:00:00.000Z",
});

function createHistoryHost() {
  const entries: unknown[] = [];
  const listeners = new Set<(event: PopStateEvent) => void>();
  let index = -1;
  const history = {
    get state() {
      return entries[index] ?? null;
    },
    replaceState(next: unknown) {
      if (index < 0) index = 0;
      entries[index] = next;
    },
    pushState(next: unknown) {
      entries.splice(index + 1);
      entries.push(next);
      index += 1;
    },
    back: vi.fn(() => {
      if (index < 1) return;
      index -= 1;
      for (const listener of listeners) listener({ state: entries[index] } as PopStateEvent);
    }),
    forward: vi.fn(() => {
      if (index >= entries.length - 1) return;
      index += 1;
      for (const listener of listeners) listener({ state: entries[index] } as PopStateEvent);
    }),
  };
  return {
    host: {
      history,
      addEventListener: (_type: "popstate", listener: (event: PopStateEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: "popstate", listener: (event: PopStateEvent) => void) => listeners.delete(listener),
    } as unknown as Window,
    history,
  };
}

describe("session history", () => {
  it("restores each quiz answer on Back", () => {
    const { host, history: browserHistory } = createHistoryHost();
    const history = createSessionHistory(host);
    const restored: StoredSession[] = [];
    history.listen((next) => restored.push(next));
    history.replace(session("welcome"));
    history.push(session("quiz"));
    history.push(session("quiz", [true]));

    expect(history.back()).toBe(true);
    expect(restored.at(-1)).toMatchObject({ stage: "quiz", answers: [] });
    browserHistory.forward();
    expect(restored.at(-1)).toMatchObject({ stage: "quiz", answers: [true] });
  });

  it("returns to the passport from a mission with its saved progress", () => {
    const { host } = createHistoryHost();
    const history = createSessionHistory(host);
    const restored: StoredSession[] = [];
    history.listen((next) => restored.push(next));
    history.replace(session("passport", Array(11).fill(true)));
    history.push(session("journey", Array(11).fill(true)));

    expect(history.back()).toBe(true);
    expect(restored.at(-1)).toMatchObject({ stage: "passport", animalId: "animal-1" });
  });

  it("does not navigate away when the session has no local Back entry", () => {
    const { host, history: browserHistory } = createHistoryHost();
    const history = createSessionHistory(host);
    history.replace(session("reveal", Array(11).fill(true)));

    expect(history.back()).toBe(false);
    expect(browserHistory.back).not.toHaveBeenCalled();
  });
});
