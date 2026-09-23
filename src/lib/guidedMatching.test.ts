import { describe, expect, it } from "vitest";
import { carePairCards } from "../data/carePairs";
import { chooseMatchingAction, createMatchingPairsState, resolveMatchingPairTurn, restoreMatchingPairsState } from "./matchingPairs";

describe("guided matching", () => {
  const situation = carePairCards.find((card) => card.kind === "situation")!;
  const action = carePairCards.find((card) => card.kind === "action" && card.pairId === situation.pairId)!;
  const other = carePairCards.find((card) => card.kind === "action" && card.pairId !== situation.pairId)!;
  it("chooses exactly one situation and one action atomically; blocks rapid third tap", () => {
    const checking = chooseMatchingAction(createMatchingPairsState(), situation.id, action.id);
    expect(checking.openCardIds).toEqual([situation.id, action.id]);
    expect(checking.phase).toBe("checking");
    expect(chooseMatchingAction(checking, situation.id, other.id)).toBe(checking);
  });
  it("restores legacy action-only selection and replaces it with the new choice", () => {
    const state = restoreMatchingPairsState({ ...createMatchingPairsState(), openCardIds: [other.id] });
    const next = chooseMatchingAction(state, situation.id, action.id);
    expect(next.openCardIds).toEqual([situation.id, action.id]);
    expect(next.deck).toEqual(state.deck);
  });
  it("keeps successful explanation and progress after refresh until explicit continue", () => {
    const resolved = resolveMatchingPairTurn(chooseMatchingAction(createMatchingPairsState(), situation.id, action.id));
    const restored = restoreMatchingPairsState(JSON.parse(JSON.stringify(resolved)));
    expect(restored).toEqual(resolved);
    expect(chooseMatchingAction(restored, situation.id, other.id)).toBe(restored);
  });
  it("allows neutral retry after a mismatch", () => {
    const mismatch = resolveMatchingPairTurn(chooseMatchingAction(createMatchingPairsState(), situation.id, other.id));
    expect(mismatch.feedback?.kind).toBe("continue");
    expect(chooseMatchingAction(mismatch, situation.id, action.id).phase).toBe("checking");
  });
});
