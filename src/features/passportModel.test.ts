import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { getMissions } from "../data/missions";
import { carePairs } from "../data/carePairs";
import { healthZones } from "../data/healthSituations";
import { visitSituations } from "../data/visitSituations";
import {
  getActionLabel,
  getMissionStatus,
  getReadyMissionIds,
  getOrbitStoryFragments,
  getRecommendedMissionId,
  isCareJourneyComplete,
} from "./passportModel";

describe("passport orbit model", () => {
  const missions = getMissions(animals[0]);

  it("keeps every uncompleted planet directly available", () => {
    expect(getMissionStatus("health", [], [])).toBe("available");
    expect(getMissionStatus("health", ["health"], [])).toBe("started");
    expect(getMissionStatus("health", ["health"], ["health"])).toBe("completed");
  });

  it("distinguishes restored terminal progress from an explicitly saved station", () => {
    expect(getReadyMissionIds({ home: { completedAt: 1234 } })).toEqual(["home"]);
    expect(getReadyMissionIds({ home: { completedAt: NaN }, trust: {} })).toEqual([]);
    expect(getReadyMissionIds({ home: { completedAt: -1 } })).toEqual([]);
    expect(getReadyMissionIds({ home: { completedAt: 0 } })).toEqual([]);
    expect(getMissionStatus("home", ["home"], [], ["home"])).toBe("ready");
    expect(getMissionStatus("home", ["home"], ["home"], ["home"])).toBe("completed");
    expect(getActionLabel("ready", 1)).toBe("Сохранить станцию");
  });

  it("recommends the first unfinished planet without locking the others", () => {
    expect(getRecommendedMissionId(missions, [])).toBe("trust");
    expect(getRecommendedMissionId(missions, ["trust", "food"])).toBe("home");
    expect(getRecommendedMissionId(missions, missions.map((mission) => mission.id))).toBeNull();
  });

  it("recognizes every terminal game without marking partial progress ready", () => {
    expect(getReadyMissionIds({
      trust: { matchedPairIds: carePairs.map((pair) => pair.id) },
      food: { step: visitSituations.length },
      health: { completedZoneIds: healthZones.map((zone) => zone.id) },
    })).toEqual(["trust", "food", "health"]);
    expect(getReadyMissionIds({
      trust: { matchedPairIds: carePairs.slice(1).map((pair) => pair.id) },
      food: { step: visitSituations.length - 1 },
      health: { completedZoneIds: healthZones.slice(1).map((zone) => zone.id) },
    })).toEqual([]);
  });

  it("uses active labels without a locked state", () => {
    expect(getActionLabel("available", 3)).toBe("Начать · 3 мин");
    expect(getActionLabel("started", 3)).toBe("Продолжить");
    expect(getActionLabel("completed", 3)).toBe("Посмотреть итог");
  });

  it("opens the guardianship explanation only after every real mission is complete", () => {
    expect(isCareJourneyComplete(missions, [])).toBe(false);
    expect(isCareJourneyComplete(missions, ["trust", "food", "home"])).toBe(false);
    expect(isCareJourneyComplete(missions, ["trust", "food", "home", "home"])).toBe(false);
    expect(isCareJourneyComplete(missions, missions.map((mission) => mission.id))).toBe(true);
  });

  it("builds three short story fragments from the selected animal", () => {
    const fragments = getOrbitStoryFragments(animals[0]);

    expect(fragments).toHaveLength(3);
    expect(fragments[0]).toBe(animals[0].traits.slice(0, 2).join(" · "));
    expect(fragments[2]).toContain("Важно:");
  });
});
