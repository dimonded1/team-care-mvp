import type {
  Animal,
  MatchAxis,
  MatchProfile,
  MatchResult,
  Question,
} from "../types/app";

export const matchAxes: MatchAxis[] = [
  "energy",
  "sociability",
  "initiative",
  "patience",
  "routine",
  "spaceRespect",
  "challenge",
];

export const axisWeights: Record<MatchAxis, number> = {
  energy: 0.2,
  sociability: 0.12,
  initiative: 0.12,
  patience: 0.18,
  routine: 0.12,
  spaceRespect: 0.14,
  challenge: 0.12,
};

// A six-point band on the 0..100 score keeps answer fit primary while treating
// genuinely close profiles as interchangeable for recent-result avoidance.
export const CLOSE_MATCH_SCORE_DELTA = 6;

export interface MatchSelectionOptions {
  recentAnimalIds?: Iterable<string>;
}

export interface RankedMatch {
  animal: Animal;
  score: number;
}

const reasonLabels: Record<MatchAxis, string> = {
  energy: "У вас похожий темп и отношение к движению.",
  sociability: "Вам обоим важен живой, понятный контакт.",
  initiative: "Вы умеете мягко делать первый шаг.",
  patience: "Вы не ждёте мгновенного доверия.",
  routine: "Ваше постоянство создаёт чувство безопасности.",
  spaceRespect: "Вы умеете быть рядом и не торопить.",
  challenge: "Вас не пугают отношения, которым нужно время.",
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function uniqueAnimalsById(availableAnimals: Animal[]): Animal[] {
  return [...new Map(availableAnimals.map((animal) => [animal.id, animal])).values()];
}

export function buildUserProfile(
  questions: Question[],
  answers: boolean[],
): MatchProfile {
  const profile = Object.fromEntries(matchAxes.map((axis) => [axis, 50])) as MatchProfile;

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (!question) return;
    const delta = answer ? question.yes : question.no;
    matchAxes.forEach((axis) => {
      profile[axis] = clamp(profile[axis] + (delta[axis] ?? 0));
    });
  });

  return profile;
}

export function scoreAnimal(user: MatchProfile, animal: Animal): number {
  const distance = matchAxes.reduce(
    (total, axis) =>
      total + Math.abs(user[axis] - animal.matchProfile[axis]) * axisWeights[axis],
    0,
  );

  return Number((100 - distance).toFixed(2));
}

function getReasons(user: MatchProfile, animal: Animal): string[] {
  return matchAxes
    .map((axis) => ({
      axis,
      affinity: (100 - Math.abs(user[axis] - animal.matchProfile[axis])) * axisWeights[axis],
    }))
    .toSorted((a, b) => b.affinity - a.affinity)
    .slice(0, 2)
    .map(({ axis }) => reasonLabels[axis]);
}

export function createMatchResult(
  userProfile: MatchProfile,
  animal: Animal,
): MatchResult {
  return {
    animal,
    score: scoreAnimal(userProfile, animal),
    userProfile,
    reasons: getReasons(userProfile, animal),
  };
}

export function rankMatches(
  availableAnimals: Animal[],
  questions: Question[],
  answers: boolean[],
): RankedMatch[] {
  const userProfile = buildUserProfile(questions, answers);
  const answerSignature = answers.map((answer) => (answer ? "1" : "0")).join("");

  return uniqueAnimalsById(availableAnimals)
    .map((animal) => ({
      animal,
      score: scoreAnimal(userProfile, animal),
      tieOrder: stableHash(`${answerSignature}:${animal.id}`),
    }))
    .toSorted((a, b) =>
      b.score - a.score
      || a.tieOrder - b.tieOrder
      || a.animal.id.localeCompare(b.animal.id))
    .map(({ animal, score }) => ({ animal, score }));
}

export function findMatch(
  availableAnimals: Animal[],
  questions: Question[],
  answers: boolean[],
  options: MatchSelectionOptions = {},
): MatchResult {
  const ranked = rankMatches(availableAnimals, questions, answers);
  if (ranked.length === 0) {
    throw new Error("Список подопечных пуст");
  }

  const userProfile = buildUserProfile(questions, answers);
  const bestScore = ranked[0].score;
  const answerSignature = answers.map((answer) => (answer ? "1" : "0")).join("");
  const closeMatches = ranked
    .filter(({ score }) => bestScore - score <= CLOSE_MATCH_SCORE_DELTA)
    .toSorted((a, b) =>
      stableHash(`${answerSignature}:selection:${a.animal.id}`)
      - stableHash(`${answerSignature}:selection:${b.animal.id}`));
  const recentAnimalIds = [...(options.recentAnimalIds ?? [])];
  const recentOrder = new Map(recentAnimalIds.map((animalId, index) => [animalId, index]));
  const freshCloseMatches = closeMatches.filter(({ animal }) => !recentOrder.has(animal.id));
  const winner = freshCloseMatches[0] ?? closeMatches
    .toSorted((a, b) =>
      (recentOrder.get(b.animal.id) ?? -1) - (recentOrder.get(a.animal.id) ?? -1))[0];

  return createMatchResult(userProfile, winner.animal);
}
