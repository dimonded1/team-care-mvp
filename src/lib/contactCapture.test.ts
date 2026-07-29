import { describe, expect, it, vi } from "vitest";
import {
  createContactCaptureSubmitGate,
  createContactCaptureRequestTracker,
  getContactCaptureMode,
  isValidContactEmail,
  isValidContactName,
  isValidContactPhone,
  preferredContactOptions,
  resolveContactCaptureMode,
  submitContactCapture,
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

  it("returns an unavailable mode when public config cannot be loaded", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getContactCaptureMode()).resolves.toBe("unavailable");

    vi.unstubAllGlobals();
  });

  it("blocks a synchronous double submit until the active request settles", () => {
    const gate = createContactCaptureSubmitGate();

    expect(gate.tryStart()).toBe(true);
    expect(gate.tryStart()).toBe(false);
    gate.release();
    expect(gate.tryStart()).toBe(true);
  });

  it("reuses the same request ID for a retry until the form changes", () => {
    let sequence = 0;
    const tracker = createContactCaptureRequestTracker(() => `request-${++sequence}`);

    expect(tracker.current()).toBe("request-1");
    expect(tracker.current()).toBe("request-1");
    tracker.reset();
    expect(tracker.current()).toBe("request-2");
  });

  it("sends an opaque request ID with the contact request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);

    await submitContactCapture({
      firstName: "Анна",
      lastName: "Иванова",
      middleName: "Сергеевна",
      phone: "+7 999 123-45-67",
      email: "anna@example.org",
      workSphere: "media",
      preferredContact: "email",
      animalId: "mira",
      animalName: "Мира",
      consent: true,
    }, "request-123");

    expect(fetchMock).toHaveBeenCalledWith("/api/contact-capture", expect.objectContaining({
      headers: expect.objectContaining({ "x-request-id": "request-123" }),
    }));

    vi.unstubAllGlobals();
  });
});
