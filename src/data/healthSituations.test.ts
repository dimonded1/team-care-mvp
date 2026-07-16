import { describe, expect, it } from "vitest";
import {
  buildHealthGameRound,
  healthSituationPool,
  healthZones,
} from "./healthSituations";

describe("health care situations", () => {
  it("keeps six zones with two alternative situations for each zone", () => {
    expect(healthZones).toHaveLength(6);
    expect(healthSituationPool).toHaveLength(12);

    healthZones.forEach((zone) => {
      expect(
        healthSituationPool.filter((situation) => situation.zoneId === zone.id),
      ).toHaveLength(2);
    });
  });

  it("offers three icon actions and exactly one safe answer per situation", () => {
    healthSituationPool.forEach((situation) => {
      expect(situation.options).toHaveLength(3);
      expect(situation.options.filter((option) => option.correct)).toHaveLength(1);
      expect(situation.learningFact.trim()).not.toBe("");
      expect(new Set(situation.options.map((option) => option.id)).size).toBe(3);

      situation.options.forEach((option) => {
        expect(option.label.trim()).not.toBe("");
        expect(option.description.trim()).not.toBe("");
        expect(option.feedback.trim()).not.toBe("");
      });
    });
  });

  it("builds one randomized situation per zone without changing the content pool", () => {
    const originalFirstOptionIds = healthSituationPool.map(
      (situation) => situation.options[0]?.id,
    );
    const values = [0.99, 0.1, 0.7, 0.3, 0.8, 0.2, 0.9, 0.4, 0.6, 0.5];
    let cursor = 0;
    const round = buildHealthGameRound(() => values[cursor++ % values.length]);

    expect(round).toHaveLength(healthZones.length);
    expect(new Set(round.map((situation) => situation.zoneId)).size).toBe(healthZones.length);
    expect(healthSituationPool.map((situation) => situation.options[0]?.id))
      .toEqual(originalFirstOptionIds);
  });

  it("routes higher-risk situations to veterinary care", () => {
    const higherRiskIds = [
      "paws-graze",
      "ears-irritated",
      "eyes-red",
      "back-tick",
      "tail-sensitive",
    ];

    higherRiskIds.forEach((situationId) => {
      const situation = healthSituationPool.find((item) => item.id === situationId);
      const correct = situation?.options.find((option) => option.correct);
      expect(correct?.label.toLocaleLowerCase("ru")).toContain("ветеринар");
    });
  });

  it("does not include medicine names or dosage instructions", () => {
    const content = JSON.stringify(healthSituationPool).toLocaleLowerCase("ru");
    const forbidden = [
      "мг",
      "миллиграм",
      "дозиров",
      "антибиотик",
      "ибупрофен",
      "парацетамол",
      "аспирин",
    ];

    forbidden.forEach((term) => {
      expect(content).not.toContain(term);
    });
  });
});
