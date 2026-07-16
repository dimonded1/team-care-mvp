import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { getResultCardLayout } from "./card";

describe("result card geometry", () => {
  it.each(animals)("keeps badge and name clear for $name", () => {
    const layout = getResultCardLayout();
    const photoBottom = layout.photo.top + layout.photo.height;
    const badgeBottom = layout.badge.top + layout.badge.height;

    expect(layout.badge.top).toBeGreaterThanOrEqual(photoBottom);
    expect(badgeBottom + 32).toBeLessThanOrEqual(layout.name.top);
    expect(layout.name.left + layout.name.width).toBeLessThanOrEqual(layout.canvas.width);
    expect(layout.content.top + layout.content.height).toBeLessThanOrEqual(layout.canvas.height);
  });
});
