import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadSession,
  normalizeSessionForJourney,
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
      version: 3,
      stage: "journey",
      activeMissionId: "trust",
      startedMissionIds: ["food", "health", "trust"],
      completedMissionIds: ["food", "health"],
    });
  });

  it("migrates and normalizes a v2 session into v3", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 2,
      stage: "passport",
      answers: [true],
      animalId: "bitrix-test-animal",
      activeMissionId: null,
      startedMissionIds: ["trust"],
      completedMissionIds: ["food"],
      missionProgress: { food: { step: 2 }, unknown: { ignored: true } },
      updatedAt: "2026-07-16T00:00:00.000Z",
    }));

    expect(loadSession()).toMatchObject({
      version: 3,
      startedMissionIds: ["trust", "food"],
      completedMissionIds: ["food"],
      missionProgress: { food: { step: 2 } },
    });
  });

  it("routes a legacy final session through the required guardianship explanation", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 2,
      stage: "final",
      answers: Array(11).fill(true),
      animalId: "bitrix-test-animal",
      activeMissionId: null,
      startedMissionIds: ["trust", "food", "home", "health"],
      completedMissionIds: ["trust", "food", "home", "health"],
      missionProgress: {},
      updatedAt: "2026-07-16T00:00:00.000Z",
    }));

    expect(loadSession()).toMatchObject({
      version: 3,
      stage: "guardianship",
    });
  });

  it("restores reveal and the saved partial active game together", () => {
    const missionProgress = {
      trust: {
        deck: ["saved-card-order"],
        openCardIds: ["saved-open-card"],
        matchedPairIds: ["saved-pair"],
        phase: "idle",
        feedback: null,
      },
    };
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 3,
      stage: "reveal",
      answers: Array(11).fill(false),
      animalId: "bitrix-test-animal",
      activeMissionId: null,
      startedMissionIds: ["trust"],
      completedMissionIds: [],
      missionProgress,
      updatedAt: "2026-07-29T00:00:00.000Z",
    }));

    expect(loadSession()).toMatchObject({
      stage: "reveal",
      animalId: "bitrix-test-animal",
      missionProgress,
    });
  });

  it("migrates the removed care intro into the interactive orbit", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 3,
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

  it("keeps the complete matching result during the reveal", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 3,
      stage: "reveal",
      answers: Array(11).fill(true),
      animalId: "bitrix-test-animal",
      activeMissionId: null,
      startedMissionIds: [],
      completedMissionIds: [],
      missionProgress: {},
      updatedAt: "2026-07-29T00:00:00.000Z",
    }));

    expect(loadSession()).toMatchObject({
      stage: "reveal",
      answers: Array(11).fill(true),
      animalId: "bitrix-test-animal",
    });
  });

  it("rejects a corrupted stored session", () => {
    values.set("nika-team-care-mvp-v1", JSON.stringify({
      version: 3,
      stage: "quiz",
      answers: "not-an-array",
    }));

    expect(loadSession()).toBeNull();
  });

  it("does not restore final before matching and all four missions are complete", () => {
    const incompleteMatch = normalizeSessionForJourney({
      version: 3,
      stage: "final",
      answers: [true],
      animalId: "bitrix-test-animal",
      activeMissionId: null,
      startedMissionIds: [],
      completedMissionIds: [],
      missionProgress: {},
      updatedAt: "2026-07-29T00:00:00.000Z",
    }, 11);
    const incompleteMissions = normalizeSessionForJourney({
      version: 3,
      stage: "final",
      answers: Array(11).fill(true),
      animalId: "bitrix-test-animal",
      activeMissionId: null,
      startedMissionIds: ["trust"],
      completedMissionIds: ["trust"],
      missionProgress: {},
      updatedAt: "2026-07-29T00:00:00.000Z",
    }, 11);

    expect(incompleteMatch).toMatchObject({
      stage: "quiz",
      animalId: null,
      completedMissionIds: [],
    });
    expect(incompleteMissions).toMatchObject({
      stage: "guardianship",
      completedMissionIds: ["trust"],
    });
  });

  it("resets mission progress instead of moving it to a replacement animal", () => {
    const reconciled = reconcileSessionWithAnimalCatalog({
      version: 3,
      stage: "final",
      answers: [true],
      animalId: "removed-animal",
      activeMissionId: null,
      startedMissionIds: ["food", "health"],
      completedMissionIds: ["food", "health"],
      missionProgress: {},
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
