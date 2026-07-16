import { describe, expect, it } from "vitest";
import { dayActivityIds, dayScenes } from "./dayScenes";

describe("day scenes", () => {
  it("keeps the four-part day in chronological order", () => {
    expect(dayScenes.map((scene) => scene.id)).toEqual([
      "morning",
      "day",
      "evening",
      "night",
    ]);
  });

  it("offers three unique tap choices in every scene", () => {
    dayScenes.forEach((scene) => {
      expect(scene.choices).toHaveLength(3);
      expect(new Set(scene.choices.map((choice) => choice.id)).size).toBe(3);
      expect(scene.choices.filter((choice) => choice.correct)).toHaveLength(1);
      scene.choices.forEach((choice) => {
        expect(choice.label.trim()).not.toBe("");
        expect(choice.description.trim()).not.toBe("");
        expect(choice.feedback.trim()).not.toBe("");
      });
    });
  });

  it("uses every activity from the shared pool", () => {
    const usedActivities = new Set(
      dayScenes.flatMap((scene) => scene.choices.map((choice) => choice.id)),
    );

    expect([...usedActivities].sort()).toEqual([...dayActivityIds].sort());
  });
});
