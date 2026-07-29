const axes = [
  "energy",
  "sociability",
  "initiative",
  "patience",
  "routine",
  "spaceRespect",
  "challenge",
];

const keywordRules = [
  {
    pattern: /актив|энергич|подвиж|непосед|игрив|играть|прогул/iu,
    delta: { energy: 18, initiative: 6 },
  },
  {
    pattern: /спокой|тих|уравновеш|ненавяз|размерен/iu,
    delta: { energy: -14, patience: 10, routine: 7 },
  },
  {
    pattern: /ласков|общитель|контакт|дружелюб|любит людей|любит человек|ручк/iu,
    delta: { sociability: 18, initiative: 10, challenge: -6 },
  },
  {
    pattern: /осторож|боязл|пуглив|робк|недовер|диковат|держит дистанц/iu,
    delta: {
      sociability: -18,
      initiative: -16,
      patience: 16,
      spaceRespect: 18,
      challenge: 18,
    },
  },
  {
    pattern: /социализац|адаптац|нужно время|требуется время|терпени|особый подход/iu,
    delta: { patience: 14, spaceRespect: 10, challenge: 18 },
  },
  {
    pattern: /режим|распоряд|привыч|стабиль|постоян/iu,
    delta: { routine: 14, patience: 6 },
  },
  {
    pattern: /самостоятель|личное пространство|не навязыв|бережн|аккуратн/iu,
    delta: { spaceRespect: 14, initiative: -5 },
  },
  {
    pattern: /смел|уверен|любознател|открыт/iu,
    delta: { initiative: 12, sociability: 8, challenge: -5 },
  },
];

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

function cleanText(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function firstSentence(value, maxLength = 170) {
  const text = cleanText(value);
  if (!text) return "";
  const sentence = text.match(/^.*?[.!?](?:\s|$)/u)?.[0]?.trim() ?? text;
  if (sentence.length <= maxLength) return sentence;
  const clipped = sentence.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, boundary > maxLength * 0.65 ? boundary : maxLength).trim()}…`;
}

function ageYears(birthDate, now) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.valueOf()) || birth > now) return null;
  return Math.max(0, (now.getUTCFullYear() - birth.getUTCFullYear())
    - (now.getUTCMonth() < birth.getUTCMonth()
      || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
      ? 1
      : 0));
}

function baseProfile(species) {
  return species === "dog"
    ? {
        energy: 58,
        sociability: 58,
        initiative: 54,
        patience: 56,
        routine: 55,
        spaceRespect: 50,
        challenge: 50,
      }
    : {
        energy: 46,
        sociability: 52,
        initiative: 46,
        patience: 58,
        routine: 60,
        spaceRespect: 62,
        challenge: 52,
      };
}

function applyDelta(profile, delta) {
  for (const [axis, value] of Object.entries(delta)) {
    profile[axis] += value;
  }
}

function deriveTraits(profile, species) {
  const traits = [];
  if (profile.energy >= 65) traits.push("активный");
  if (profile.energy <= 42) traits.push("спокойный");
  if (profile.sociability >= 65) traits.push("контактный");
  if (profile.spaceRespect >= 68) traits.push("деликатный");
  if (profile.patience >= 68) traits.push("неторопливый");
  if (profile.initiative >= 65) traits.push("открытый");
  if (profile.challenge >= 68) traits.push("учится доверять");
  if (traits.length < 3) traits.push(species === "dog" ? "внимательный" : "наблюдательный");
  if (traits.length < 3) traits.push("чуткий");
  if (traits.length < 3) traits.push("особенный");
  return [...new Set(traits)].slice(0, 4);
}

function deriveCareTags(profile) {
  const tags = [];
  if (profile.energy >= 60) tags.push("прогулки и движение");
  if (profile.sociability >= 60) tags.push("общение");
  if (profile.spaceRespect >= 65) tags.push("личное пространство");
  if (profile.patience >= 65 || profile.challenge >= 65) tags.push("терпение");
  if (profile.routine >= 60) tags.push("понятный режим");
  if (tags.length < 3) tags.push("постоянство");
  if (tags.length < 3) tags.push("внимание");
  if (tags.length < 3) tags.push("забота команды");
  return [...new Set(tags)].slice(0, 4);
}

export function deriveAnimalMatchingContent(animal, reviewedProfile = null, options = {}) {
  if (reviewedProfile) {
    return {
      profileSource: "reviewed",
      ...reviewedProfile,
    };
  }

  const profile = baseProfile(animal.species);
  const text = cleanText([
    animal.story,
    animal.shortDescription,
    animal.character,
    animal.behavior,
  ].join(" ")).toLowerCase();

  for (const rule of keywordRules) {
    if (rule.pattern.test(text)) applyDelta(profile, rule.delta);
  }

  const years = ageYears(animal.birthDate, options.now ?? new Date());
  if (years !== null && years < 3) applyDelta(profile, { energy: 8, initiative: 4 });
  if (years !== null && years >= 9) applyDelta(profile, { energy: -10, patience: 6, routine: 8 });

  const matchProfile = Object.fromEntries(
    axes.map((axis) => [axis, clamp(profile[axis])]),
  );
  const shortDescription = firstSentence(
    animal.character || animal.behavior || animal.shortDescription || animal.story,
  ) || `${animal.species === "dog" ? "Собака" : "Кошка"} из приюта фонда НИКА`;

  return {
    profileSource: "derived-v1",
    nameGenitive: animal.name,
    shortDescription,
    traits: deriveTraits(matchProfile, animal.species),
    careTags: deriveCareTags(matchProfile),
    matchProfile,
  };
}
