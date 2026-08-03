import { describe, expect, it } from "vitest";
import { petNameGenitive } from "./russianPetName";

describe("petNameGenitive", () => {
  it.each([
    ["Фисташка", "female", "Фисташки"],
    ["Мальвина", "female", "Мальвины"],
    ["Мира", "female", "Миры"],
    ["Маркус", "male", "Маркуса"],
    ["Юнити", "female", "Юнити"],
  ] as const)("declines %s for a guardianship CTA", (name, sex, expected) => {
    expect(petNameGenitive(name, sex)).toBe(expected);
  });

  it("leaves complex CRM labels unchanged instead of guessing", () => {
    expect(petNameGenitive("Кошка из Бронниц", "female")).toBe("Кошка из Бронниц");
  });
});
