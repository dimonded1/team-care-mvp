import { describe, expect, it } from "vitest";
import { getLegalDocumentIdFromHash, legalDocuments } from "./legalDocuments";

describe("local legal documents", () => {
  it("uses the foundation name supplied for September 16, 2026", () => {
    for (const document of legalDocuments) {
      expect(document.html).not.toMatch(/помощи бездомным животным|фонда ПБЖ|фонду ПБЖ/i);
      expect(document.html).toContain("помощи животным «НИКА»");
    }
    const requisites = legalDocuments.find((document) => document.id === "requisites")!.html;
    expect(requisites).toContain("БФ «НИКА»");
    expect(requisites).toContain("64.99");
    expect(requisites).toContain("7735129412");
    expect(requisites).toContain("1117799013353");
  });

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
      for (const match of document.html.matchAll(/href="([^"]+)"/g)) {
        expect(match[1]).toMatch(/^(https:\/\/|mailto:)/);
      }
    }
  });

  it("uses the supplied 2026 legal revisions", () => {
    const offer = legalDocuments.find((document) => document.id === "offer")?.html ?? "";
    const privacy = legalDocuments.find((document) => document.id === "privacy")?.html ?? "";
    const consent = legalDocuments.find((document) => document.id === "consent")?.html ?? "";

    expect(offer).toContain("по программе «Опека»");
    expect(offer).toContain("https://home.fond-nika.ru/");
    expect(privacy).toContain("18&quot; июня 2026 г.");
    expect(privacy).toContain("ЮKassa, CloudPayments, Mixplate");
    expect(privacy).toContain("Создания учетной записи для регистрации личного кабинета");
    expect(consent).toContain('href="https://fond-nika.ru"');
    expect(consent).not.toContain("home.fond-nika.ru");
  });

  it("supports deep-link hashes and rejects unknown documents", () => {
    expect(getLegalDocumentIdFromHash("#legal/privacy")).toBe("privacy");
    expect(getLegalDocumentIdFromHash("#legal/unknown")).toBeNull();
    expect(getLegalDocumentIdFromHash("#welcome")).toBeNull();
  });
});
