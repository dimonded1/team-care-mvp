import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { getMissions } from "../data/missions";
import {
  getActionLabel,
  getMissionStatus,
  getOrbitStoryFragments,
  getRecommendedMissionId,
} from "./passportModel";

describe("passport orbit model", () => {
  const missions = getMissions(animals[0]);

  it("keeps every uncompleted planet directly available", () => {
    expect(getMissionStatus("health", [], [])).toBe("available");
    expect(getMissionStatus("health", ["health"], [])).toBe("started");
    expect(getMissionStatus("health", ["health"], ["health"])).toBe("completed");
  });

  it("recommends the first unfinished planet without locking the others", () => {
    expect(getRecommendedMissionId(missions, [])).toBe("trust");
    expect(getRecommendedMissionId(missions, ["trust", "food"])).toBe("home");
    expect(getRecommendedMissionId(missions, missions.map((mission) => mission.id))).toBeNull();
  });

  it("uses active labels without a locked state", () => {
    expect(getActionLabel("available", 3)).toBe("Начать · 3 мин");
    expect(getActionLabel("started", 3)).toBe("Продолжить");
    expect(getActionLabel("completed", 3)).toBe("Пройдено · повторить");
  });

  it("builds three short story fragments from the selected animal", () => {
    const fragments = getOrbitStoryFragments(animals[0]);

    expect(fragments).toHaveLength(3);
    expect(fragments[0]).toBe(animals[0].traits.slice(0, 2).join(" · "));
    expect(fragments[2]).toContain("Важно:");
  });
});
