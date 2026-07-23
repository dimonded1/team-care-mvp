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

export function findMatch(
  animals: Animal[],
  questions: Question[],
  answers: boolean[],
): MatchResult {
  if (animals.length === 0) {
    throw new Error("Список подопечных пуст");
  }

  const userProfile = buildUserProfile(questions, answers);
  const ranked = animals
    .map((animal) => ({ animal, score: scoreAnimal(userProfile, animal) }))
    .toSorted((a, b) => b.score - a.score || a.animal.id.localeCompare(b.animal.id));
  const winner = ranked[0];

  return createMatchResult(userProfile, winner.animal);
}
