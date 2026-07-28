import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadSession,
  reconcileSessionWithAnimalCatalog,
  saveSession,
} from "./storage";

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
      animalId: "legacy-animal",
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
      animalId: "bitrix-test-animal",
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

  it("migrates the removed care intro into the interactive orbit", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 2,
      stage: "care-intro",
      answers: [true],
      animalId: "legacy-animal",
      activeMissionId: null,
      startedMissionIds: [],
      completedMissionIds: [],
      updatedAt: "2026-07-16T00:00:00.000Z",
    }));

    expect(loadSession()).toMatchObject({
      stage: "passport",
      animalId: "legacy-animal",
    });
  });

  it("resets mission progress instead of moving it to a replacement animal", () => {
    const reconciled = reconcileSessionWithAnimalCatalog({
      version: 2,
      stage: "final",
      answers: [true],
      animalId: "removed-animal",
      activeMissionId: null,
      startedMissionIds: ["food", "health"],
      completedMissionIds: ["food", "health"],
      updatedAt: "2026-07-28T00:00:00.000Z",
    }, ["bitrix-360911"], "bitrix-360911");

    expect(reconciled).toMatchObject({
      stage: "passport",
      animalId: "bitrix-360911",
      activeMissionId: null,
      startedMissionIds: [],
      completedMissionIds: [],
    });
  });
});
