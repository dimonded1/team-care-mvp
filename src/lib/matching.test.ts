import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { questions } from "../data/questions";
import { buildUserProfile, findMatch, matchAxes, scoreAnimal } from "./matching";

describe("matching", () => {
  it("keeps every profile axis inside 0..100", () => {
    const profile = buildUserProfile(questions, questions.map(() => true));
    matchAxes.forEach((axis) => {
      expect(profile[axis]).toBeGreaterThanOrEqual(0);
      expect(profile[axis]).toBeLessThanOrEqual(100);
    });
  });

  it("is deterministic for the same answers", () => {
    const answers = questions.map((_, index) => index % 2 === 0);
    const first = findMatch(animals, questions, answers);
    const second = findMatch(animals, questions, answers);
    expect(first.animal.id).toBe(second.animal.id);
    expect(first.score).toBe(second.score);
    expect(first.reasons).toEqual(second.reasons);
  });

  it("gives an exact profile the maximum score", () => {
    expect(scoreAnimal(animals[0].matchProfile, animals[0])).toBe(100);
  });

  it("returns two explainable reasons", () => {
    const result = findMatch(animals, questions, questions.map(() => false));
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons.every((reason) => reason.endsWith("."))).toBe(true);
  });
});
