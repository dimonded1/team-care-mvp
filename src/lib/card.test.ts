import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { getResultCardContent, getResultCardLayout } from "./card";

describe("result card geometry", () => {
  it("uses an exact 9:16 story canvas", () => {
    const { canvas } = getResultCardLayout();

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
    expect(canvas.width / canvas.height).toBe(9 / 16);
  });

  it.each(animals)("keeps exact content inside the story safe area for $name", () => {
    const layout = getResultCardLayout();
    const safeRight = layout.safeArea.left + layout.safeArea.width;
    const safeBottom = layout.safeArea.top + layout.safeArea.height;

    expect(layout.badge.left).toBeGreaterThanOrEqual(layout.safeArea.left);
    expect(layout.badge.left + layout.badge.width).toBeLessThanOrEqual(safeRight);
    expect(layout.photo.left + layout.photo.width).toBeLessThanOrEqual(layout.canvas.width);
    expect(layout.copy.left + layout.copy.width).toBeLessThanOrEqual(safeRight);
    expect(layout.name.left + layout.name.width).toBeLessThanOrEqual(safeRight);
    expect(layout.logo.top + layout.logo.height).toBeLessThanOrEqual(safeBottom);
    expect(layout.callout.top + layout.callout.height).toBeLessThanOrEqual(safeBottom);
  });

  it.each(animals)("builds reusable share-card data for $name", (animal) => {
    const content = getResultCardContent(animal);

    expect(content.name).toBe(animal.name);
    expect(content.photo).toBe(animal.photo);
    expect(content.accent).toBe("СЕГОДНЯ");
    expect(content.message).toBe("моя звезда —");
    expect(content.status).toBe("ИЩЕТ ДОМ");
    expect(content.url).toBe("fond-nika.ru/ourpets");
  });

  it("accepts template overrides without replacing the animal identity", () => {
    const animal = animals[0];
    const content = getResultCardContent(animal, {
      status: "УЖЕ ДОМА",
      message: "Сегодня случилась встреча.",
      url: "fond-nika.ru",
      photoFocus: { x: 0.4, y: 0.3 },
    });

    expect(content).toMatchObject({
      name: animal.name,
      photo: animal.photo,
      status: "УЖЕ ДОМА",
      message: "Сегодня случилась встреча.",
      url: "fond-nika.ru",
      photoFocus: { x: 0.4, y: 0.3 },
    });
  });
});
