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

export type MatchReasonGroup = "rhythm" | "contact" | "trust";

export const matchReasonGroups: Record<MatchReasonGroup, readonly MatchAxis[]> = {
  rhythm: ["energy", "routine"],
  contact: ["sociability", "initiative"],
  trust: ["patience", "spaceRespect", "challenge"],
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

function reasonAffinity(user: MatchProfile, animal: Animal, axis: MatchAxis): number {
  const closeness = 100 - Math.abs(user[axis] - animal.matchProfile[axis]);
  const animalSalience = Math.abs(animal.matchProfile[axis] - 50);

  // Closeness remains the main signal. Salience prevents a perfectly ordinary
  // axis from drowning out a trait that is genuinely important for this animal.
  return closeness * 0.78 + animalSalience * 0.17 + axisWeights[axis] * 100 * 0.05;
}

export function getMatchReasonAxes(
  user: MatchProfile,
  animal: Animal,
): MatchAxis[] {
  return (Object.entries(matchReasonGroups) as [MatchReasonGroup, readonly MatchAxis[]][])
    .map(([group, axes]) => {
      const axis = [...axes].toSorted((a, b) =>
        reasonAffinity(user, animal, b) - reasonAffinity(user, animal, a)
        || matchAxes.indexOf(a) - matchAxes.indexOf(b))[0];

      return { group, axis, affinity: reasonAffinity(user, animal, axis) };
    })
    .toSorted((a, b) => b.affinity - a.affinity
      || a.group.localeCompare(b.group))
    .slice(0, 2)
    .map(({ axis }) => axis);
}

function getReasonLevel(value: number): "low" | "balanced" | "high" {
  if (value <= 38) return "low";
  if (value >= 62) return "high";
  return "balanced";
}

function reasonForAxis(axis: MatchAxis, animal: Animal): string {
  const name = animal.name;
  const nameGenitive = animal.nameGenitive;
  const level = getReasonLevel(animal.matchProfile[axis]);

  switch (axis) {
    case "energy":
      if (level === "high") {
        return `${name} любит активный ритм, и по вашим ответам он вам тоже подходит.`;
      }
      if (level === "low") {
        return `${name} ближе спокойный темп, и вам тоже комфортнее без спешки.`;
      }
      return `${name} ценит баланс движения и отдыха — такой ритм близок и вам.`;
    case "routine":
      if (level === "high") {
        return `${name} спокойнее в понятном распорядке, а ваше постоянство может стать опорой.`;
      }
      if (level === "low") {
        return `${name} легко принимает смену ритма, и вам тоже близка гибкость.`;
      }
      return `${name} подходит устойчивый, но не жёсткий распорядок — как и вам.`;
    case "sociability":
      if (level === "high") {
        return `${name} тянется к общению, и вам обоим важен живой контакт.`;
      }
      if (level === "low") {
        return `${name} выбирает спокойное общение без напора, и вам близок такой формат.`;
      }
      return `${name} любит контакт, в котором есть место паузам, — ваши ответы про то же.`;
    case "initiative":
      if (level === "high") {
        return `${name} охотно отвечает на инициативу человека, а вы готовы мягко сделать первый шаг.`;
      }
      if (level === "low") {
        return `Для ${nameGenitive} важно самостоятельно выбрать момент для сближения, а вы готовы дать это пространство.`;
      }
      return `${name} легче знакомиться шаг за шагом, и вы готовы поддержать этот темп.`;
    case "patience":
      if (level === "high") {
        return `С ${nameGenitive} особенно важно не торопить доверие, и ваши ответы показывают запас терпения.`;
      }
      if (level === "low") {
        return `${name} легче вступает в понятный контакт, а вы цените взаимный отклик без долгого ожидания.`;
      }
      return `${name} нужен естественный темп сближения, и вы готовы замечать его сигналы.`;
    case "spaceRespect":
      if (level === "high") {
        return `Для ${nameGenitive} важно личное пространство, и вы умеете быть рядом без давления.`;
      }
      if (level === "low") {
        return `${name} комфортно чувствует себя рядом с человеком, а вам легко поддерживать близкий контакт.`;
      }
      return `${name} важно чередовать общение и паузы, и вы готовы уважать этот баланс.`;
    case "challenge":
      if (level === "high") {
        return `Отношения с ${nameGenitive} могут потребовать времени, и вас не пугает путь маленькими шагами.`;
      }
      if (level === "low") {
        return `${name} готов к достаточно прямому знакомству, и вам близок такой понятный старт.`;
      }
      return `${name} раскрывается постепенно, и вам подходит знакомство без гонки за быстрым результатом.`;
  }
}

function getReasons(user: MatchProfile, animal: Animal): string[] {
  return getMatchReasonAxes(user, animal).map((axis) => reasonForAxis(axis, animal));
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
