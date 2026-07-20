import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { getResultCardLayout } from "./card";

describe("result card geometry", () => {
  it("uses an exact 9:16 story canvas", () => {
    const { canvas } = getResultCardLayout();

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
    expect(canvas.width / canvas.height).toBe(9 / 16);
  });

  it.each(animals)("keeps the photo and exact content inside the story safe area for $name", () => {
    const layout = getResultCardLayout();
    const badgeBottom = layout.badge.top + layout.badge.height;
    const safeRight = layout.safeArea.left + layout.safeArea.width;
    const safeBottom = layout.safeArea.top + layout.safeArea.height;

    expect(layout.badge.left).toBeGreaterThanOrEqual(layout.safeArea.left);
    expect(layout.badge.left + layout.badge.width).toBeLessThanOrEqual(safeRight);
    expect(badgeBottom).toBeLessThan(layout.photo.top);
    expect(layout.photo.left + layout.photo.width).toBeLessThanOrEqual(layout.canvas.width);
    expect(layout.copy.left + layout.copy.width).toBeLessThanOrEqual(safeRight);
    expect(layout.logo.top + layout.logo.height).toBeLessThanOrEqual(safeBottom);
    expect(layout.callout.top + layout.callout.height).toBeLessThanOrEqual(safeBottom);
  });
});
