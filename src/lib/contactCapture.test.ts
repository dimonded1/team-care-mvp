import { describe, expect, it } from "vitest";
import {
  isValidContactEmail,
  isValidContactName,
  isValidContactPhone,
  preferredContactOptions,
  resolveContactCaptureMode,
  workSphereOptions,
} from "./contactCapture";

describe("contact capture validation", () => {
  it("accepts normal names and emails", () => {
    expect(isValidContactName(" Анна Иванова ")).toBe(true);
    expect(isValidContactEmail("anna@example.org")).toBe(true);
    expect(isValidContactPhone("+7 999 123-45-67")).toBe(true);
  });

  it("rejects invalid or oversized values", () => {
    expect(isValidContactName("A")).toBe(false);
    expect(isValidContactName("x".repeat(81))).toBe(false);
    expect(isValidContactEmail("not-an-email")).toBe(false);
    expect(isValidContactPhone("123")).toBe(false);
  });

  it("uses fixed Bitrix-compatible enum allowlists", () => {
    expect(workSphereOptions).toHaveLength(10);
    expect(preferredContactOptions.map((option) => option.id)).toEqual([
      "phone",
      "email",
      "telegram",
      "whatsapp",
      "max",
    ]);
  });

  it("shows a safe preview on GitHub Pages without enabling submission", () => {
    expect(resolveContactCaptureMode(false, "dimonded1.github.io")).toBe("preview");
    expect(resolveContactCaptureMode(false, "fond-nika.ru")).toBe("disabled");
    expect(resolveContactCaptureMode(true, "fond-nika.ru")).toBe("enabled");
  });
});
