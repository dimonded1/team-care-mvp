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

  it("offers four varied tap choices in every scene", () => {
    dayScenes.forEach((scene) => {
      expect(scene.choices).toHaveLength(4);
      expect(new Set(scene.choices.map((choice) => choice.id)).size).toBe(4);
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

  it("uses clear bedtime language without the old team-plan phrasing", () => {
    const evening = dayScenes.find((scene) => scene.id === "evening");
    expect(evening?.choices.find((choice) => choice.correct)?.label).toBe("Пять минут тихого поиска");
    expect(JSON.stringify(evening)).not.toContain("по плану команды");
  });

  it("frames every step as a concrete everyday situation", () => {
    dayScenes.forEach((scene) => {
      expect(scene.prompt.length).toBeGreaterThan(35);
      expect(scene.title).not.toMatch(/^(Утро|День|Вечер|Ночь)$/);
    });
  });
});
