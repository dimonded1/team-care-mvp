import { describe, expect, it } from "vitest";
import { trustSituations } from "./trustSituations";

describe("trust mini-game content", () => {
  it("contains four short retryable situations", () => {
    expect(trustSituations).toHaveLength(4);
    expect(new Set(trustSituations.map((situation) => situation.id)).size).toBe(4);
  });

  it("offers three actions with exactly one correct choice in every situation", () => {
    trustSituations.forEach((situation) => {
      expect(situation.actions).toHaveLength(3);
      expect(situation.actions.filter((action) => action.correct)).toHaveLength(1);
      expect(new Set(situation.actions.map((action) => action.id)).size).toBe(3);
      situation.actions.forEach((action) => expect(action.feedback.trim().length).toBeGreaterThan(20));
    });
  });

  it("stays within neutral trust-building scenarios", () => {
    const content = JSON.stringify(trustSituations).toLowerCase();
    expect(content).not.toMatch(/лекар|дозиров|лечение|диагноз|укол|таблет/);
    expect(content).toMatch(/подождать|пауза|медленнее/);
  });
});
