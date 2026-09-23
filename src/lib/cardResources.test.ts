import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCardImage, waitForCardResource } from "./cardResources";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("card resource cancellation", () => {
  it("resolves a loaded image and removes its event handlers", async () => {
    let instance!: { src: string; onload: (() => void) | null; onerror: (() => void) | null };
    vi.stubGlobal("Image", class {
      src = ""; onload = null; onerror = null;
      constructor() { instance = this; }
    });
    const result = loadCardImage("/photo.webp", new AbortController().signal);
    instance.onload?.();
    await expect(result).resolves.toBe(instance);
    expect(instance).toMatchObject({ onload: null, onerror: null });
  });

  it("reports an image failure without displaying its internal URL", async () => {
    let fail!: () => void;
    vi.stubGlobal("Image", class {
      src = ""; onload = null;
      set onerror(callback: (() => void) | null) { if (callback) fail = callback; }
    });
    const result = loadCardImage("/internal-photo.webp");
    const rejected = expect(result).rejects.toThrow("Не удалось загрузить изображение для карточки");
    fail();
    await rejected;
  });

  it("rejects a stalled font/PNG operation when its deadline aborts", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const result = waitForCardResource(new Promise(() => {}), controller.signal);
    const rejected = expect(result).rejects.toThrow("deadline");
    setTimeout(() => controller.abort(new Error("deadline")), 20_000);
    await vi.advanceTimersByTimeAsync(20_000);
    await rejected;
  });

  it("does not let a late old generation overwrite the outcome; retry can succeed", async () => {
    const controller = new AbortController();
    let finish!: (value: string) => void;
    const result = waitForCardResource(new Promise<string>((resolve) => { finish = resolve; }), controller.signal);
    const rejected = expect(result).rejects.toThrow("cancelled");
    controller.abort(new Error("cancelled"));
    finish("late");
    await rejected;
    await expect(waitForCardResource(Promise.resolve("retry"), new AbortController().signal)).resolves.toBe("retry");
  });

  it("stops the pending image request and removes handlers on leaving the screen", async () => {
    let instance!: { src: string; onload: unknown; onerror: unknown };
    vi.stubGlobal("Image", class {
      src = ""; onload = null; onerror = null;
      constructor() { instance = this; }
    });
    const controller = new AbortController();
    const request = loadCardImage("/slow-photo.webp", controller.signal);
    const rejected = expect(request).rejects.toThrow();
    expect(instance.src).toBe("/slow-photo.webp");
    controller.abort();
    await rejected;
    expect(instance).toMatchObject({ src: "", onload: null, onerror: null });
  });

  it("does not start an image request for an already cancelled screen", async () => {
    let urls: string[] = [];
    vi.stubGlobal("Image", class {
      onload = null; onerror = null;
      set src(value: string) { urls.push(value); }
    });
    const controller = new AbortController();
    controller.abort();
    await expect(loadCardImage("/photo.webp", controller.signal)).rejects.toThrow();
    expect(urls).not.toContain("/photo.webp");
  });
});
