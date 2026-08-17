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
import { healthZones } from "../data/healthSituations";
import { visitSituations } from "../data/visitSituations";

describe("preserved mission progress", () => {
  it("restores a partial Visit mission from legacy progress", () => {
    const fallback = createInitialVisitGameProgress();
    expect(restoreVisitGameProgress({ step: 3 }, fallback)).toEqual({
      version: 2,
      step: 3,
      shuffleSeed: fallback.shuffleSeed,
      selectedActionId: null,
    });
  });

  it("restores Visit feedback so it stays readable after refresh", () => {
    const fallback = createInitialVisitGameProgress();
    const restored = restoreVisitGameProgress({
      version: 2,
      step: 0,
      shuffleSeed: "stable-order",
      selectedActionId: "check-in",
    }, fallback);

    expect(restored.selectedActionId).toBe("check-in");
    expect(restored.step).toBe(0);
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

  it("preserves completed Visit and Health progress after refresh", () => {
    const animal = animals[0];
    const visit = restoreVisitGameProgress({
      version: 2,
      step: visitSituations.length,
      shuffleSeed: "completed-visit",
      selectedActionId: null,
    });
    const healthFallback = createInitialHealthGameProgress(animal.species);
    const health = restoreHealthGameProgress({
      ...healthFallback,
      completedZoneIds: healthZones.map((zone) => zone.id),
    }, animal.species, healthFallback);

    expect(visit.step).toBe(visitSituations.length);
    expect(health.completedZoneIds).toEqual(healthZones.map((zone) => zone.id));
  });
});
