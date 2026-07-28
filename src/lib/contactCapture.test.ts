import { describe, expect, it } from "vitest";
import {
  isValidContactEmail,
  isValidContactName,
  isValidContactPhone,
  preferredContactOptions,
  readCampaignTag,
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

  it("reads the campaign mark from the QR link and ignores a broken one", () => {
    expect(readCampaignTag("?e=run")).toBe("run");
    expect(readCampaignTag("?utm_campaign=Zabeg")).toBe("zabeg");
    expect(readCampaignTag("?e=run&utm_campaign=other")).toBe("run");
    expect(readCampaignTag("")).toBe("");
    expect(readCampaignTag("?e=<script>alert(1)</script>")).toBe("");
    expect(readCampaignTag(`?e=${"a".repeat(41)}`)).toBe("");
  });

  it("shows a safe preview on GitHub Pages without enabling submission", () => {
    expect(resolveContactCaptureMode(false, "dimonded1.github.io")).toBe("preview");
    expect(resolveContactCaptureMode(false, "fond-nika.ru")).toBe("disabled");
    expect(resolveContactCaptureMode(true, "fond-nika.ru")).toBe("enabled");
  });
});
