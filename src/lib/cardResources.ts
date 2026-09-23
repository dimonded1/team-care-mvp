/** Cancel only this card generation; never keep a final screen waiting forever. */
export function waitForCardResource<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason ?? new Error("Создание карточки отменено"));
    if (signal.aborted) aborted();
    else signal.addEventListener("abort", aborted, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
  });
}

export function loadCardImage(src: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", aborted);
    };
    const aborted = () => {
      cleanup();
      image.src = "";
      reject(signal?.reason ?? new Error("Создание карточки отменено"));
    };
    if (signal?.aborted) { aborted(); return; }
    signal?.addEventListener("abort", aborted, { once: true });
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error("Не удалось загрузить изображение для карточки")); };
    image.src = src;
  });
}
