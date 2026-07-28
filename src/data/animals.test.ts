import { describe, expect, it } from "vitest";
import snapshots from "./bitrixAnimals.generated.json";
import { animals, formatAnimalAge } from "./animals";
import { matchAxes } from "../lib/matching";

describe("Bitrix animal catalog", () => {
  it("contains six real snapshots split evenly between the two requested funnels", () => {
    expect(animals).toHaveLength(6);
    expect(animals.filter((animal) => animal.source.categoryName === "Мокрый Нос")).toHaveLength(3);
    expect(animals.filter((animal) => animal.source.categoryName === "Малино")).toHaveLength(3);
    expect(new Set(animals.map((animal) => animal.species))).toEqual(new Set(["cat", "dog"]));
  });

  it("uses only stable Bitrix IDs and the generated photo namespace", () => {
    expect(animals.every((animal) => animal.id === `bitrix-${animal.source.id}`)).toBe(true);
    expect(animals.every((animal) => animal.photo.includes("/assets/animals/bitrix/"))).toBe(true);
  });

  it("keeps signed Bitrix URLs out of the browser catalog", () => {
    for (const snapshot of snapshots) {
      expect(snapshot.photoPath).toMatch(/^assets\/animals\/bitrix\/\d+\.(jpg|png|webp)$/);
      expect(JSON.stringify(snapshot)).not.toContain("urlMachine");
      expect(JSON.stringify(snapshot)).not.toContain("bitrix24.ru/rest/");
    }
  });

  it("provides complete reviewed profiles for matching", () => {
    for (const animal of animals) {
      expect(animal.nameGenitive).not.toBe("");
      expect(animal.story.length).toBeGreaterThan(60);
      expect(animal.traits.length).toBeGreaterThanOrEqual(3);
      expect(animal.careTags.length).toBeGreaterThanOrEqual(3);
      for (const axis of matchAxes) {
        expect(animal.matchProfile[axis]).toBeGreaterThanOrEqual(0);
        expect(animal.matchProfile[axis]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("formats age from the Bitrix birth date without storing a stale number", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    expect(formatAnimalAge("2025-04-01T03:00:00+03:00", now)).toBe("1 год");
    expect(formatAnimalAge("2026-02-01T03:00:00+03:00", now)).toBe("5 месяцев");
    expect(formatAnimalAge("2023-01-01T03:00:00+03:00", now)).toBe("3 года");
  });
});
