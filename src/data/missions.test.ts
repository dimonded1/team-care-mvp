import { describe, expect, it } from "vitest";
import { animals } from "./animals";
import { getMissions } from "./missions";

describe("care missions", () => {
  it("always returns four missions in the intended order", () => {
    const missions = getMissions(animals[0]);
    expect(missions.map((mission) => mission.id)).toEqual(["food", "health", "trust", "home"]);
  });

  it("has exactly one correct option in every mission", () => {
    animals.forEach((animal) => {
      getMissions(animal).forEach((mission) => {
        expect(mission.options.filter((option) => option.correct)).toHaveLength(1);
      });
    });
  });

  it("adapts the trust situation for cautious animals", () => {
    const cautious = animals.find((animal) => animal.id === "cunami-7");
    const social = animals.find((animal) => animal.id === "pita-21");
    expect(cautious).toBeDefined();
    expect(social).toBeDefined();
    expect(getMissions(cautious!)[2].options[0].id).toBe("give-space");
    expect(getMissions(social!)[2].options[0].id).toBe("shared-activity");
  });
});
