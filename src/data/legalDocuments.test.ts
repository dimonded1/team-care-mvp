import { describe, expect, it } from "vitest";
import { getLegalDocumentIdFromHash, legalDocuments } from "./legalDocuments";

describe("local legal documents", () => {
  it("bundles all four internal documents", () => {
    expect(legalDocuments.map((document) => document.id)).toEqual([
      "offer",
      "privacy",
      "consent",
      "requisites",
    ]);
    expect(legalDocuments.every((document) => document.html.length > 400)).toBe(true);
  });

  it("contains only sanitized legal markup", () => {
    for (const document of legalDocuments) {
      expect(document.html).not.toMatch(/<script|<style|on\w+=/i);
      expect(document.html).toMatch(/<(p|table|ul|h2)/i);
    }
  });

  it("supports deep-link hashes and rejects unknown documents", () => {
    expect(getLegalDocumentIdFromHash("#legal/privacy")).toBe("privacy");
    expect(getLegalDocumentIdFromHash("#legal/unknown")).toBeNull();
    expect(getLegalDocumentIdFromHash("#welcome")).toBeNull();
  });
});
