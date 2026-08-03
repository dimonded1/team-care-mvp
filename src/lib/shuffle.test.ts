import { describe, expect, it } from "vitest";
import { shuffleBySeed, shuffleQuizOptions } from "./shuffle";

describe("shuffleBySeed", () => {
  it("keeps a stable order for the same round seed", () => {
    const values = ["a", "b", "c", "d"];
    expect(shuffleBySeed(values, "session:morning")).toEqual(
      shuffleBySeed(values, "session:morning"),
    );
  });

  it("returns a permutation without mutating the source", () => {
    const values = ["a", "b", "c", "d"];
    const shuffled = shuffleBySeed(values, "another-round");
    expect(values).toEqual(["a", "b", "c", "d"]);
    expect([...shuffled].sort()).toEqual([...values].sort());
  });

  it("does not keep the correct answer in one fixed position", () => {
    const values = [
      { id: "correct", correct: true },
      { id: "one", correct: false },
      { id: "two", correct: false },
      { id: "three", correct: false },
    ];
    const positions = new Set(
      Array.from({ length: 12 }, (_, index) =>
        shuffleBySeed(values, `round-${index}`).findIndex((item) => item.correct),
      ),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it("rotates the correct position across consecutive quiz rounds", () => {
    const values = [
      { id: "correct", correct: true },
      { id: "one", correct: false },
      { id: "two", correct: false },
      { id: "three", correct: false },
    ];
    const positions = Array.from({ length: 5 }, (_, round) =>
      shuffleQuizOptions(values, "saved-session", round, (item) => item.correct)
        .findIndex((item) => item.correct));

    expect(new Set(positions).size).toBe(4);
    expect(positions.filter((position) => position === 0)).toHaveLength(1);
  });
});
