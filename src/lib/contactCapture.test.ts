import { describe, expect, it } from "vitest";
import {
  contactInterestOptions,
  isValidContactEmail,
  isValidContactName,
  resolveContactCaptureMode,
} from "./contactCapture";

describe("contact capture validation", () => {
  it("accepts normal names and emails", () => {
    expect(isValidContactName(" Анна Иванова ")).toBe(true);
    expect(isValidContactEmail("anna@example.org")).toBe(true);
  });

  it("rejects invalid or oversized values", () => {
    expect(isValidContactName("A")).toBe(false);
    expect(isValidContactName("x".repeat(81))).toBe(false);
    expect(isValidContactEmail("not-an-email")).toBe(false);
  });

  it("uses a fixed interest allowlist", () => {
    expect(contactInterestOptions.map((option) => option.id)).toEqual([
      "guardianship",
      "visits",
      "updates",
    ]);
  });

  it("shows a safe preview on GitHub Pages without enabling submission", () => {
    expect(resolveContactCaptureMode(false, "dimonded1.github.io")).toBe("preview");
    expect(resolveContactCaptureMode(false, "fond-nika.ru")).toBe("disabled");
    expect(resolveContactCaptureMode(true, "fond-nika.ru")).toBe("enabled");
  });
});
