import { describe, expect, it } from "vitest";
import { carePairDeckOrder } from "../data/carePairs";
import {
  areMatchingPairCards,
  createMatchingPairsState,
  isMatchingPairsComplete,
  resolveMatchingPairTurn,
  restoreMatchingPairsState,
  selectMatchingPairCard,
} from "./matchingPairs";

describe("matching pairs state", () => {
  it("uses a deterministic eight-card deck and restores its order", () => {
    const deck = [...carePairDeckOrder].reverse();
    expect(createMatchingPairsState().deck).toEqual(carePairDeckOrder);
    expect(restoreMatchingPairsState({ deck, matchedPairIds: ["new-arrival-situation"] }).deck).toEqual(deck);
  });

  it("opens at most two cards and synchronously locks checking", () => {
    const first = selectMatchingPairCard(createMatchingPairsState(), "new-arrival-situation");
    const checking = selectMatchingPairCard(first, "feeding-time-action");
    expect(checking.openCardIds).toEqual(["new-arrival-situation", "feeding-time-action"]);
    expect(checking.phase).toBe("checking");
    expect(selectMatchingPairCard(checking, "cat-contact-situation")).toBe(checking);
  });

  it("matches only opposite card kinds belonging to the same pair", () => {
    expect(areMatchingPairCards("new-arrival-situation", "new-arrival-action")).toBe(true);
    expect(areMatchingPairCards("new-arrival-situation", "feeding-time-action")).toBe(false);
    expect(areMatchingPairCards("new-arrival-situation", "new-arrival-situation")).toBe(false);
  });

  it("keeps a successful pair revealed with its explanation", () => {
    const checking = selectMatchingPairCard(
      selectMatchingPairCard(createMatchingPairsState(), "new-arrival-situation"),
      "new-arrival-action",
    );
    const resolved = resolveMatchingPairTurn(checking);
    expect(resolved.matchedPairIds).toEqual(["new-arrival"]);
    expect(resolved.openCardIds).toEqual([]);
    expect(resolved.feedback?.kind).toBe("match");
    expect(resolved.feedback?.explanation).toContain("Тишина");
  });

  it("closes a non-pair after resolution without losing existing progress", () => {
    const state = restoreMatchingPairsState({
      deck: carePairDeckOrder,
      matchedPairIds: ["new-arrival-situation"],
      openCardIds: ["feeding-time-situation", "cat-contact-action"],
      phase: "checking",
    });
    const resolved = resolveMatchingPairTurn(state);
    expect(resolved.matchedPairIds).toEqual(["new-arrival"]);
    expect(resolved.openCardIds).toEqual([]);
    expect(resolved.feedback?.kind).toBe("continue");
    expect(isMatchingPairsComplete(resolved)).toBe(false);
  });

  it("falls back safely when stored pair progress is corrupted", () => {
    expect(restoreMatchingPairsState({
      deck: { invalid: true },
      matchedPairIds: "not-an-array",
      openCardIds: ["unknown-card"],
      phase: "checking",
      feedback: { kind: "match", explanation: { invalid: true } },
    })).toEqual(createMatchingPairsState());
  });
});
