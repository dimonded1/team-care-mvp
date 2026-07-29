import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import {
  createInitialHealthGameProgress,
  restoreHealthGameProgress,
} from "./HealthCareGame";
import {
  createInitialVisitGameProgress,
  restoreVisitGameProgress,
} from "./VisitCareGame";

describe("preserved mission progress", () => {
  it("restores a partial Visit mission from legacy progress", () => {
    const fallback = createInitialVisitGameProgress();
    expect(restoreVisitGameProgress({ step: 3 }, fallback)).toEqual({
      version: 1,
      step: 3,
      shuffleSeed: fallback.shuffleSeed,
    });
  });

  it("restores a partial Health mission and rejects an unknown choice", () => {
    const animal = animals[0];
    const fallback = createInitialHealthGameProgress(animal.species);
    const activeZoneId = "ears";
    const restored = restoreHealthGameProgress({
      ...fallback,
      activeZoneId,
      selectedChoiceId: "unknown-choice",
      completedZoneIds: ["eyes"],
    }, animal.species, fallback);

    expect(restored.roundIds).toEqual(fallback.roundIds);
    expect(restored.activeZoneId).toBe(activeZoneId);
    expect(restored.selectedChoiceId).toBeNull();
    expect(restored.completedZoneIds).toEqual(["eyes"]);
  });
});
