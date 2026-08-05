import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { questions } from "../data/questions";
import {
  buildUserProfile,
  CLOSE_MATCH_SCORE_DELTA,
  createMatchResult,
  findMatch,
  getMatchReasonAxes,
  matchAxes,
  matchReasonGroups,
  rankMatches,
  scoreAnimal,
} from "./matching";

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

  it("deduplicates the candidate pool by stable animal ID", () => {
    const answers = questions.map((_, index) => index % 2 === 0);
    const ranked = rankMatches(
      [animals[0], animals[0], animals[1], animals[1]],
      questions,
      answers,
    );

    expect(ranked.map(({ animal }) => animal.id)).toEqual([
      ...new Set(ranked.map(({ animal }) => animal.id)),
    ]);
    expect(ranked).toHaveLength(2);
  });

  it("produces different best matches for meaningfully different answers", () => {
    const quietResult = findMatch(animals, questions, questions.map(() => false));
    const activeResult = findMatch(animals, questions, questions.map(() => true));

    expect(quietResult.animal.id).not.toBe(activeResult.animal.id);
  });

  it("avoids a recent result only when a close alternative exists", () => {
    const answers = questions.map(() => true);
    const best = findMatch(animals, questions, answers);
    const next = findMatch(animals, questions, answers, {
      recentAnimalIds: [best.animal.id],
    });
    const ranked = rankMatches(animals, questions, answers);
    const nextScore = ranked.find(({ animal }) => animal.id === next.animal.id)?.score;

    expect(next.animal.id).not.toBe(best.animal.id);
    expect(nextScore).toBeDefined();
    expect(ranked[0].score - nextScore!).toBeLessThanOrEqual(CLOSE_MATCH_SCORE_DELTA);
  });

  it("rotates to the least recent close match after every close option was shown", () => {
    const answers = questions.map(() => true);
    const closeAnimals = rankMatches(animals, questions, answers)
      .slice(0, 3)
      .map(({ animal }) => animal);
    const first = findMatch(closeAnimals, questions, answers);
    const second = findMatch(closeAnimals, questions, answers, {
      recentAnimalIds: [first.animal.id],
    });
    const third = findMatch(closeAnimals, questions, answers, {
      recentAnimalIds: [second.animal.id, first.animal.id],
    });
    const fourth = findMatch(closeAnimals, questions, answers, {
      recentAnimalIds: [third.animal.id, second.animal.id, first.animal.id],
    });

    expect(new Set([first.animal.id, second.animal.id, third.animal.id])).toHaveLength(3);
    expect(fourth.animal.id).toBe(first.animal.id);
    expect(fourth.animal.id).not.toBe(third.animal.id);
  });

  it("keeps the best recent result when no close alternative is suitable", () => {
    const exact = animals[0];
    const distant = {
      ...animals[1],
      id: "distant-animal",
      matchProfile: Object.fromEntries(
        matchAxes.map((axis) => [axis, exact.matchProfile[axis] === 0 ? 100 : 0]),
      ) as typeof animals[number]["matchProfile"],
    };
    const syntheticQuestions = matchAxes.map((axis, index) => ({
      id: `axis-${index}`,
      text: axis,
      yes: { [axis]: exact.matchProfile[axis] - 50 },
      no: {},
    }));
    const result = findMatch(
      [exact, distant],
      syntheticQuestions,
      syntheticQuestions.map(() => true),
      { recentAnimalIds: [exact.id] },
    );

    expect(result.animal.id).toBe(exact.id);
  });

  it("gives an exact profile the maximum score", () => {
    expect(scoreAnimal(animals[0].matchProfile, animals[0])).toBe(100);
  });

  it("returns two explainable reasons", () => {
    const result = findMatch(animals, questions, questions.map(() => false));
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons.every((reason) => reason.endsWith("."))).toBe(true);
    expect(result.reasons.every((reason) =>
      reason.includes(result.animal.name)
      || reason.includes(result.animal.nameGenitive))).toBe(true);
  });

  it("explains a match through two different semantic groups", () => {
    const userProfile = buildUserProfile(questions, questions.map((_, index) => index % 2 === 0));
    const axes = getMatchReasonAxes(userProfile, animals[0]);
    const groups = axes.map((axis) => Object.entries(matchReasonGroups)
      .find(([, groupAxes]) => groupAxes.includes(axis))?.[0]);

    expect(axes).toHaveLength(2);
    expect(new Set(groups)).toHaveLength(2);
  });

  it("uses the animal profile and identity instead of repeating generic copy", () => {
    const userProfile = buildUserProfile(questions, questions.map(() => true));
    const activeAnimal = animals.find(({ matchProfile }) => matchProfile.energy >= 70)!;
    const cautiousAnimal = animals.find(({ matchProfile }) =>
      matchProfile.spaceRespect >= 75 && matchProfile.challenge >= 65)!;
    const activeResult = createMatchResult(userProfile, activeAnimal);
    const cautiousResult = createMatchResult(userProfile, cautiousAnimal);

    expect(activeResult.reasons).not.toEqual(cautiousResult.reasons);
    expect([...activeResult.reasons, ...cautiousResult.reasons]).not.toContain(
      "У вас похожий темп и отношение к движению.",
    );
    expect([...activeResult.reasons, ...cautiousResult.reasons]).not.toContain(
      "Вы не ждёте мгновенного доверия.",
    );
  });

  it("changes the explanation when the same animal meets a different user profile", () => {
    const quietProfile = buildUserProfile(questions, questions.map(() => false));
    const activeProfile = buildUserProfile(questions, questions.map(() => true));
    const animal = animals.find((candidate) =>
      getMatchReasonAxes(quietProfile, candidate).join(",")
      !== getMatchReasonAxes(activeProfile, candidate).join(","));

    expect(animal).toBeDefined();
    expect(getMatchReasonAxes(quietProfile, animal!)).not.toEqual(
      getMatchReasonAxes(activeProfile, animal!),
    );
  });

  it("recomputes the score and reasons when restoring a saved animal", () => {
    const userProfile = buildUserProfile(questions, questions.map(() => true));
    const restored = createMatchResult(userProfile, animals[1]);

    expect(restored.animal.id).toBe(animals[1].id);
    expect(restored.score).toBe(scoreAnimal(userProfile, animals[1]));
    expect(restored.reasons).toHaveLength(2);
  });
});
