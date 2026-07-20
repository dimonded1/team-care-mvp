import { describe, expect, it } from "vitest";
import { homeItemQueue, homeItems, safeHomeItems, unsafeHomeItems } from "./homeItems";

describe("homeItems", () => {
  it("contains a short balanced set for the safe-home game", () => {
    expect(homeItems).toHaveLength(8);
    expect(safeHomeItems).toHaveLength(5);
    expect(unsafeHomeItems).toHaveLength(3);
  });

  it("gives every safe item a unique visual destination", () => {
    const placements = safeHomeItems.map((item) => item.placement);
    expect(placements.every(Boolean)).toBe(true);
    expect(new Set(placements).size).toBe(safeHomeItems.length);
  });

  it("keeps all explanations and artwork in editable content", () => {
    for (const item of homeItems) {
      expect(item.feedback.length).toBeGreaterThan(25);
      expect(item.asset).toMatch(/^assets\/home-game\/.+\.webp$/);
    }
  });

  it("mixes safe and unsafe candidates in the first moving box", () => {
    const firstBox = homeItemQueue.slice(0, 4).map((id) => homeItems.find((item) => item.id === id));
    expect(firstBox.filter((item) => item?.safe)).toHaveLength(2);
    expect(firstBox.filter((item) => item && !item.safe)).toHaveLength(2);
    expect(new Set(homeItemQueue).size).toBe(homeItems.length);
  });
});
