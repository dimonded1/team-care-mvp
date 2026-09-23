import { afterEach, expect, it, vi } from "vitest";
import { CONTACT_SUBMIT_TIMEOUT_MS, submitContactCapture } from "./contactCapture";

const payload = {
  firstName: "Тест", lastName: "Проверка", middleName: "Локальная",
  phone: "+7(999)-123-45-67", email: "test@example.invalid",
  workSphere: "media", preferredContact: "email", animalId: "test", animalName: "Тест", consent: true,
} as const;
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("ends stalled contact submission at its deadline so the form gate can release", async () => {
  vi.useFakeTimers();
  let signal!: AbortSignal;
  vi.stubGlobal("fetch", vi.fn((_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
  }));
  const result = submitContactCapture(payload, "same-request");
  const rejected = expect(result).rejects.toThrow("Не удалось дождаться ответа");
  await vi.advanceTimersByTimeAsync(CONTACT_SUBMIT_TIMEOUT_MS);
  await rejected;
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("does not report pending duplicate as success and keeps retry's request ID", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 409 }).mockResolvedValueOnce({ ok: true, status: 201 });
  vi.stubGlobal("fetch", fetchMock);
  await expect(submitContactCapture(payload, "same-request")).rejects.toThrow("ещё обрабатывается");
  await expect(submitContactCapture(payload, "same-request")).resolves.toBeUndefined();
  expect(fetchMock.mock.calls.map(([, options]) => options.headers["x-request-id"])).toEqual(["same-request", "same-request"]);
  expect(vi.getTimerCount()).toBe(0);
});
