import { carePairCards, carePairDeckOrder, carePairs, type CarePairCard } from "../data/carePairs";

export type MatchingPairsFeedback =
  | { kind: "match"; pairId: string; explanation: string }
  | { kind: "continue"; explanation: string }
  | null;

export interface MatchingPairsState {
  deck: string[];
  openCardIds: string[];
  matchedPairIds: string[];
  phase: "idle" | "checking";
  feedback: MatchingPairsFeedback;
}

const cardById = new Map(carePairCards.map((card) => [card.id, card]));
const pairById = new Map(carePairs.map((pair) => [pair.id, pair]));

function validDeck(deck: unknown): deck is string[] {
  return Array.isArray(deck)
    && deck.length === carePairDeckOrder.length
    && new Set(deck).size === deck.length
    && deck.every((id) => typeof id === "string" && cardById.has(id));
}

function distinctKnownIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids)].filter((id): id is string =>
    typeof id === "string" && cardById.has(id));
}

export function createMatchingPairsState(deck: readonly string[] = carePairDeckOrder): MatchingPairsState {
  return {
    deck: validDeck(deck) ? [...deck] : [...carePairDeckOrder],
    openCardIds: [],
    matchedPairIds: [],
    phase: "idle",
    feedback: null,
  };
}

/** Restores serialised progress while keeping a valid saved card order. */
export function restoreMatchingPairsState(value: unknown): MatchingPairsState {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<MatchingPairsState>
    : {};
  const state = createMatchingPairsState(candidate.deck);
  const rawMatchedPairIds = Array.isArray(candidate.matchedPairIds)
    ? candidate.matchedPairIds
    : [];
  const matchedPairIds = rawMatchedPairIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => pairById.has(id) ? id : cardById.get(id)?.pairId)
    .filter((id): id is string => Boolean(id));
  state.matchedPairIds = [...new Set(matchedPairIds)].filter((id) => pairById.has(id));

  const openCardIds = distinctKnownIds(candidate.openCardIds)
    .filter((id) => !state.matchedPairIds.includes(cardById.get(id)!.pairId))
    .slice(0, 2);
  state.openCardIds = openCardIds;
  state.phase = candidate.phase === "checking" && openCardIds.length === 2
    ? "checking"
    : "idle";
  const feedback = candidate.feedback;
  state.feedback = feedback
    && typeof feedback === "object"
    && "kind" in feedback
    && (feedback.kind === "match" || feedback.kind === "continue")
    && "explanation" in feedback
    && typeof feedback.explanation === "string"
      ? feedback as MatchingPairsFeedback
      : null;
  return state;
}

export function getMatchingPairCard(cardId: string): CarePairCard | undefined {
  return cardById.get(cardId);
}

export function areMatchingPairCards(firstId: string, secondId: string): boolean {
  const first = cardById.get(firstId);
  const second = cardById.get(secondId);
  return Boolean(first && second && first.kind !== second.kind && first.pairId === second.pairId);
}

export function selectMatchingPairCard(state: MatchingPairsState, cardId: string): MatchingPairsState {
  const card = cardById.get(cardId);
  if (!card || state.phase === "checking" || state.matchedPairIds.includes(card.pairId) || state.openCardIds.includes(cardId)) {
    return state;
  }

  const openCardIds = [...state.openCardIds, cardId].slice(0, 2);
  return {
    ...state,
    openCardIds,
    phase: openCardIds.length === 2 ? "checking" : "idle",
    feedback: null,
  };
}

export function resolveMatchingPairTurn(state: MatchingPairsState): MatchingPairsState {
  if (state.phase !== "checking" || state.openCardIds.length !== 2) return state;

  const [firstId, secondId] = state.openCardIds;
  if (!areMatchingPairCards(firstId, secondId)) {
    return {
      ...state,
      openCardIds: [],
      phase: "idle",
      feedback: {
        kind: "continue",
        explanation: "Сверьте, какая забота подходит именно к этой ситуации. Можно попробовать ещё раз.",
      },
    };
  }

  const pair = pairById.get(cardById.get(firstId)!.pairId)!;
  return {
    ...state,
    openCardIds: [],
    matchedPairIds: state.matchedPairIds.includes(pair.id)
      ? state.matchedPairIds
      : [...state.matchedPairIds, pair.id],
    phase: "idle",
    feedback: { kind: "match", pairId: pair.id, explanation: pair.explanation },
  };
}

export function isMatchingPairsComplete(state: MatchingPairsState): boolean {
  return state.matchedPairIds.length === carePairs.length;
}
