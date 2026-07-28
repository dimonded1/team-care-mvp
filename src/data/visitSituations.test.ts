import { describe, expect, it } from "vitest";
import { visitSituations } from "./visitSituations";

describe("visit situations", () => {
  it("contains a short five-step shelter visit", () => {
    expect(visitSituations).toHaveLength(5);
    expect(visitSituations.map((item) => item.id)).toEqual([
      "arrival",
      "greeting",
      "prepare",
      "escape",
      "return",
    ]);
  });

  it("keeps one correct action and useful feedback in every step", () => {
    visitSituations.forEach((situation) => {
      expect(situation.actions).toHaveLength(4);
      expect(situation.actions.filter((action) => action.correct)).toHaveLength(1);
      situation.actions.forEach((action) => expect(action.feedback.length).toBeGreaterThan(30));
    });
  });
});
