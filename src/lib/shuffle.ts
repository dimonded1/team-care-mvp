function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number) {
  let state = seed || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleBySeed<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const random = randomFromSeed(hashSeed(seed));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/** Keeps answer order deterministic after refresh while rotating the correct
 * position between rounds, so a lucky seed cannot put every answer first. */
export function shuffleQuizOptions<T>(
  items: readonly T[],
  seed: string,
  roundIndex: number,
  isCorrect: (item: T) => boolean,
): T[] {
  const correctItems = items.filter(isCorrect);
  if (correctItems.length !== 1 || items.length < 2) return shuffleBySeed(items, `${seed}:${roundIndex}`);

  const others = shuffleBySeed(items.filter((item) => !isCorrect(item)), `${seed}:others:${roundIndex}`);
  const startPosition = hashSeed(`${seed}:correct-position`) % items.length;
  const correctPosition = (startPosition + Math.max(0, roundIndex)) % items.length;
  others.splice(correctPosition, 0, correctItems[0]);
  return others;
}

export function createShuffleSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const value = new Uint32Array(2);
    crypto.getRandomValues(value);
    return `${value[0]}-${value[1]}`;
  }
  return `${Date.now()}-${Math.random()}`;
}
