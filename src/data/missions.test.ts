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

  it("keeps the trust introduction universal for every ward", () => {
    const trustPrompts = animals.map((animal) => getMissions(animal)[2].prompt);
    expect(new Set(trustPrompts).size).toBe(1);
    expect(trustPrompts[0]).not.toMatch(new RegExp(animals.map((animal) => animal.name).join("|"), "i"));
  });
});
