import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSession, saveSession } from "./storage";

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
});

describe("session storage", () => {
  it("migrates a linear v1 journey into the nonlinear mission hub", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 1,
      stage: "journey",
      answers: [true, false],
      animalId: "lis-1",
      missionIndex: 2,
      completedMissionIds: ["food", "health"],
      updatedAt: "2026-07-16T00:00:00.000Z",
    }));

    expect(loadSession()).toMatchObject({
      version: 2,
      stage: "journey",
      activeMissionId: "trust",
      startedMissionIds: ["food", "health", "trust"],
      completedMissionIds: ["food", "health"],
    });
  });

  it("normalizes progress before restoring a v2 session", () => {
    saveSession({
      version: 2,
      stage: "passport",
      answers: [true],
      animalId: "lis-1",
      activeMissionId: null,
      startedMissionIds: ["trust"],
      completedMissionIds: ["food"],
      updatedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(loadSession()).toMatchObject({
      startedMissionIds: ["trust", "food"],
      completedMissionIds: ["food"],
    });
  });
});
