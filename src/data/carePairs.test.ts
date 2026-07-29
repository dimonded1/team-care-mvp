import { describe, expect, it } from "vitest";
import { carePairCards, carePairDeckOrder, carePairs } from "./carePairs";

describe("care pairs", () => {
  it("contains four review-ready shelter-animal pairs", () => {
    expect(carePairs).toHaveLength(4);
    expect(carePairCards).toHaveLength(8);
    expect(carePairs.every((pair) => pair.reviewStatus === "needs-foundation-review")).toBe(true);
    expect(carePairs.every((pair) => pair.situation.toLocaleLowerCase("ru").includes("приют"))).toBe(true);
  });

  it("gives each pair one situation and one action with the same id", () => {
    carePairs.forEach((pair) => {
      const cards = carePairCards.filter((card) => card.pairId === pair.id);
      expect(cards.map((card) => card.kind).sort()).toEqual(["action", "situation"]);
      expect(cards.every((card) => card.reviewStatus === "needs-foundation-review")).toBe(true);
    });
  });

  it("exports one stable deck order", () => {
    expect(carePairDeckOrder).toEqual(carePairCards.map((card) => card.id));
  });
});
