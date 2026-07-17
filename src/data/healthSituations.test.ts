import { describe, expect, it } from "vitest";
import {
  buildHealthGameRound,
  healthSituationPool,
  healthZones,
} from "./healthSituations";

describe("health care situations", () => {
  it("keeps six zones with two alternatives for each species", () => {
    expect(healthZones).toHaveLength(6);
    expect(healthSituationPool).toHaveLength(18);

    (["dog", "cat"] as const).forEach((species) => {
      healthZones.forEach((zone) => {
        expect(
          healthSituationPool.filter(
            (situation) => situation.zoneId === zone.id
              && (situation.species === "all" || situation.species === species),
          ),
        ).toHaveLength(2);
      });
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
    const round = buildHealthGameRound("dog", () => values[cursor++ % values.length]);

    expect(round).toHaveLength(healthZones.length);
    expect(new Set(round.map((situation) => situation.zoneId)).size).toBe(healthZones.length);
    expect(round.filter((situation) => situation.species === "dog")).toHaveLength(4);
    expect(round.filter((situation) => situation.species === "all")).toHaveLength(2);
    expect(healthSituationPool.map((situation) => situation.options[0]?.id))
      .toEqual(originalFirstOptionIds);
  });

  it("routes higher-risk situations to veterinary care", () => {
    const higherRiskIds = [
      "paws-graze",
      "back-tick",
    ];

    higherRiskIds.forEach((situationId) => {
      const situation = healthSituationPool.find((item) => item.id === situationId);
      const correct = situation?.options.find((option) => option.correct);
      expect(correct?.label.toLocaleLowerCase("ru")).toContain("ветеринар");
    });
  });

  it("limits veterinary answers and keeps species rounds varied", () => {
    (["dog", "cat"] as const).forEach((species) => {
      const eligible = healthSituationPool.filter(
        (situation) => situation.species === "all" || situation.species === species,
      );
      const veterinaryAnswers = eligible.filter((situation) =>
        situation.options.some((option) => option.correct && option.icon === "vet"),
      );
      expect(veterinaryAnswers.length).toBeLessThanOrEqual(2);
      expect(new Set(eligible.map((situation) => situation.situation)).size).toBe(12);
    });
  });

  it("guarantees four species-specific stories in every playable round", () => {
    [0.05, 0.4, 0.8].forEach((seed) => {
      const dogRound = buildHealthGameRound("dog", () => seed);
      const catRound = buildHealthGameRound("cat", () => seed);

      expect(dogRound.filter((situation) => situation.species === "dog")).toHaveLength(4);
      expect(catRound.filter((situation) => situation.species === "cat")).toHaveLength(4);
      expect(
        catRound.filter((situation) =>
          situation.options.some((option) => option.correct && option.icon === "vet"),
        ).length,
      ).toBeLessThanOrEqual(2);
      expect(
        dogRound.filter((situation) => /гряз|пыл|сорин|репей/i.test(situation.situation)).length,
      ).toBeLessThanOrEqual(2);
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
