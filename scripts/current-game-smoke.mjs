import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// This smoke follows the current *standard* four-online-game journey.  The old
// cdp-smoke.mjs remains separate because it asserts the retired
// pre-maze route. Maze completion runs through the real friendly timer; no
// completed state is injected. Post-completion scrolling and Back use touch.
const chromePath = process.env.CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = process.env.SMOKE_URL ?? "http://127.0.0.1:5173/";
const artifactsDir = process.env.SMOKE_ARTIFACTS_DIR ?? "/tmp/team-care-current-review";
// `timer` verifies the friendly time finish. `collect` follows the live board
// with real arrow-key input until every point and the finish are reached.
const mazeCompletionMode = process.env.SMOKE_MAZE_COMPLETION ?? "timer";
const reducedMotion = process.env.SMOKE_REDUCED_MOTION !== "0";
const smokeFocus = process.env.SMOKE_FOCUS ?? "journey";
if (!new Set(["journey", "quiz-reveal"]).has(smokeFocus)) {
  throw new Error("SMOKE_FOCUS must be journey or quiz-reveal");
}
// This is Chrome's native OS text-scale emulation, rather than page zoom.
// Run a focused accessibility pass with SMOKE_TEXT_SCALE=2.
const textScale = Number(process.env.SMOKE_TEXT_SCALE ?? "1");
if (!Number.isFinite(textScale) || textScale < 1 || textScale > 2) {
  throw new Error("SMOKE_TEXT_SCALE must be a number from 1 to 2");
}
// `setEmulatedOSTextScale` is intentionally tried first. Some Chrome builds
// render it without changing CSS pixels, however, so it cannot by itself
// prove that the question layout survives a 200% font size. In `auto` mode we
// fall back to a narrowly-scoped, explicitly reported computed-style scale.
const textScaleMode = process.env.SMOKE_TEXT_SCALE_MODE ?? "auto";
if (!new Set(["auto", "native", "synthetic"]).has(textScaleMode)) {
  throw new Error("SMOKE_TEXT_SCALE_MODE must be auto, native, or synthetic");
}
// Delays one real reveal-photo request only when explicitly enabled. It is a
// focused UI-resilience check, not an application or production change.
const slowRevealPhotoDelayMs = Number(process.env.SMOKE_REVEAL_PHOTO_DELAY_MS ?? "0");
if (!Number.isFinite(slowRevealPhotoDelayMs) || slowRevealPhotoDelayMs < 0 || slowRevealPhotoDelayMs > 15_000) {
  throw new Error("SMOKE_REVEAL_PHOTO_DELAY_MS must be a number from 0 to 15000");
}
// Optional, deliberately slow final-card resource load. The application watchdog
// should surface a retry after 20 seconds; the retry receives the resource
// normally. Kept off for the ordinary journey because it adds that full wait.
const finalCardLogoDelayMs = Number(process.env.SMOKE_FINAL_CARD_LOGO_DELAY_MS ?? "0");
if (!Number.isFinite(finalCardLogoDelayMs) || finalCardLogoDelayMs < 0 || (finalCardLogoDelayMs > 0 && finalCardLogoDelayMs < 20_000) || finalCardLogoDelayMs > 25_000) {
  throw new Error("SMOKE_FINAL_CARD_LOGO_DELAY_MS must be 0 or a number from 20000 to 25000");
}
const port = 9700 + (process.pid % 200);
const userDataDir = join(tmpdir(), `team-care-current-smoke-${process.pid}`);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pollJson(url, timeoutMs = 12_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    const timeout = setTimeout(() => {
      pending.delete(callId);
      reject(new Error(`Browser command timed out: ${method}`));
    }, 30_000);
    pending.set(callId, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]);
  return { call, on, close: () => socket.close() };
}

async function main() {
  await mkdir(artifactsDir, { recursive: true });
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--window-size=390,844",
    "about:blank",
  ], { stdio: "ignore" });
  let cdp;
  const consoleErrors = [];
  const browserMessages = [];
  const results = {
    responsive: {},
    mazeCompletionMode,
    smokeFocus,
    reducedMotion,
    textScale: { requested: textScale, requestedMode: textScaleMode, emulated: false, effectiveMode: "none", nativeProbe: null, questions: [] },
    slowRevealPhoto: { delayMs: slowRevealPhotoDelayMs, delayedRequests: 0, ctaUsableWhileLoading: false },
    finalCardLogo: { delayMs: finalCardLogoDelayMs, delayedRequests: 0, watchdogError: false, retryReady: false },
    reveal: {},
    contactForm: { requests: 0, requestIds: [], expectedFirstFailure: false },
    expectedConsoleErrors: [],
  };
  let armSlowRevealPhoto = false;
  let delayedRevealPhotoOnce = false;
  let armSlowFinalCardLogo = false;
  let delayedFinalCardLogoOnce = false;

  try {
    await pollJson(`http://127.0.0.1:${port}/json/version`);
    const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(appUrl)}`, { method: "PUT" });
    if (!response.ok) throw new Error(`Could not open Chrome page: ${response.status}`);
    const target = await response.json();
    cdp = await connectCdp(target.webSocketDebuggerUrl);
    cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      const message = exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? "Runtime exception";
      consoleErrors.push(message);
      browserMessages.push(`exception: ${message}`);
    });
    cdp.on("Log.entryAdded", ({ entry }) => {
      const message = [entry?.level, entry?.text, entry?.url].filter(Boolean).join(" — ");
      if (message) browserMessages.push(message);
      const isExpectedMockedContact503 = entry?.level === "error"
        && results.contactForm.expectedFirstFailure
        && results.expectedConsoleErrors.length === 0
        && String(entry?.url ?? "").includes("/api/contact-capture")
        && /\b503\b/.test(String(entry?.text ?? ""));
      if (isExpectedMockedContact503) {
        results.expectedConsoleErrors.push(message);
      } else if (entry?.level === "error") {
        consoleErrors.push([entry.text, entry.url].filter(Boolean).join(" — "));
      }
    });
    cdp.on("Runtime.consoleAPICalled", ({ type, args }) => {
      const message = args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
      if (message) browserMessages.push(`${type}: ${message}`);
      if (type === "error") consoleErrors.push(message || "console.error");
    });
    // The journey runs against Vite locally, where no contact API exists. Mock
    // only those two endpoints at the browser boundary: this exercises the
    // real client form without writing a contact or touching Bitrix.
    cdp.on("Fetch.requestPaused", ({ requestId, request, resourceType }) => {
      const fulfill = (status, payload) => cdp.call("Fetch.fulfillRequest", {
        requestId,
        responseCode: status,
        responseHeaders: [{ name: "content-type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      }).catch(() => undefined);
      if (request.url.includes("/api/public-config")) {
        void fulfill(200, { contactCaptureEnabled: true });
        return;
      }
      if (request.url.includes("/api/contact-capture")) {
        const requestIdHeader = Object.entries(request.headers ?? {}).find(([name]) => name.toLowerCase() === "x-request-id")?.[1] ?? "";
        results.contactForm.requests += 1;
        results.contactForm.requestIds.push(requestIdHeader);
        // A failed first attempt proves that retry keeps the same request id;
        // a double click on the retry must still make one POST only.
        const isFirstMockedAttempt = results.contactForm.requests === 1;
        if (isFirstMockedAttempt) results.contactForm.expectedFirstFailure = true;
        void fulfill(isFirstMockedAttempt ? 503 : 200, { ok: !isFirstMockedAttempt });
        return;
      }
      // Fetch only pauses image requests in the focused reveal check below.
      // Continue every other request immediately so a lazy chunk cannot be
      // misreported as an app regression.
      const isAnimalImage = resourceType === "Image"
        && /\/assets\/animals\//.test(request.url);
      if (armSlowRevealPhoto && !delayedRevealPhotoOnce && isAnimalImage) {
        delayedRevealPhotoOnce = true;
        results.slowRevealPhoto.delayedRequests += 1;
        setTimeout(() => {
          void cdp.call("Fetch.continueRequest", { requestId }).catch(() => undefined);
        }, slowRevealPhotoDelayMs);
        return;
      }
      // Delay the lazy generator first: the logo can already be in the
      // renderer's image cache and therefore never reach Fetch interception.
      const isFinalCardLogo = (resourceType === "Image"
        && /\/assets\/brand\/logo-nika-white-2026\.png/.test(request.url))
        || (resourceType === "Script"
          && /\/(?:src\/lib\/card\.ts|assets\/card-[^/]+\.js)(?:\?|$)/.test(request.url));
      if (armSlowFinalCardLogo && !delayedFinalCardLogoOnce && isFinalCardLogo) {
        delayedFinalCardLogoOnce = true;
        results.finalCardLogo.delayedRequests += 1;
        setTimeout(() => {
          void cdp.call("Fetch.continueRequest", { requestId }).catch(() => undefined);
        }, finalCardLogoDelayMs);
        return;
      }
      void cdp.call("Fetch.continueRequest", { requestId }).catch(() => undefined);
    });
    await Promise.all([
      cdp.call("Page.enable"),
      cdp.call("Runtime.enable"),
      cdp.call("Log.enable"),
      cdp.call("Fetch.enable", { patterns: [
        { urlPattern: "*/api/public-config*", requestStage: "Request" },
        { urlPattern: "*/api/contact-capture*", requestStage: "Request" },
      ] }),
      cdp.call("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 1, mobile: true }),
      cdp.call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 }),
      cdp.call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }] }),
    ]);
    if (textScale !== 1) {
      await cdp.call("Emulation.setEmulatedOSTextScale", { scale: textScale });
      results.textScale.emulated = true;
    }

    const evaluate = async (expression) => {
      const result = await cdp.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const longTaskObserverSource = `(() => {
      globalThis.__teamCareLongTasks = [];
      if (!('PerformanceObserver' in globalThis)) return 'unsupported';
      try {
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) globalThis.__teamCareLongTasks.push(Math.round(entry.duration));
        }).observe({ type: 'longtask', buffered: true });
        return 'observing';
      } catch { return 'unsupported'; }
    })()`;
    // This must be registered before navigation so it survives the refresh
    // checks in the journey. The reported list is for the current document,
    // not a claim about all previous pages.
    await cdp.call("Page.addScriptToEvaluateOnNewDocument", { source: longTaskObserverSource });
    await evaluate(longTaskObserverSource);
    const bodyText = () => evaluate("document.body.innerText");
    const waitFor = async (predicate, description, timeoutMs = 8_000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (await evaluate(predicate)) return;
        await sleep(80);
      }
      throw new Error(`Timed out: ${description}\n${(await bodyText()).slice(0, 1800)}\nBrowser messages:\n${browserMessages.slice(-20).join("\n")}`);
    };
    const waitText = (text, timeoutMs) => waitFor(
      `document.body.innerText.toLocaleLowerCase('ru').includes(${JSON.stringify(text.toLocaleLowerCase("ru"))})`,
      `text ${text}`,
      timeoutMs,
    );
    const waitSelector = (selector, timeoutMs) => waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, selector, timeoutMs);
    const click = async (selector) => {
      await waitFor(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); return node && !node.disabled; })()`, `enabled ${selector}`);
      const clicked = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node || node.disabled) return false; node.click(); return true; })()`);
      if (!clicked) throw new Error(`Could not click ${selector}`);
    };
    const key = async (value) => {
      await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key: value, code: value, windowsVirtualKeyCode: value === "ArrowUp" ? 38 : value === "ArrowRight" ? 39 : value === "ArrowDown" ? 40 : 37 });
      await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key: value, code: value });
    };
    const reload = async () => {
      await cdp.call("Page.reload", { ignoreCache: true });
      await sleep(1_050);
    };
    const capture = async (name) => {
      if (/^\d/.test(name)) name = name.replace("390x844", "360x800");
      await evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const { data } = await cdp.call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      await writeFile(join(artifactsDir, name), Buffer.from(data, "base64"));
      const overflow = await evaluate("document.documentElement.scrollWidth - innerWidth");
      if (overflow > 1) throw new Error(`Horizontal overflow at ${name}: ${overflow}px`);
      if (/^\d/.test(name)) {
        for (const [width, height] of [[320, 568], [430, 932], [1440, 980]]) {
          await cdp.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
          await sleep(100);
          const excess = await evaluate('document.documentElement.scrollWidth - innerWidth');
          if (excess > 1) throw new Error(`Horizontal overflow at ${name}, width ${width}: ${excess}px`);
        }
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
      }
    };
    const setViewport = async (width, height, mobile = true) => {
      await cdp.call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
      await sleep(160);
    };
    const configureTextScale = async () => {
      if (textScale === 1) return;
      const readQuestionFontSize = () => evaluate(`(() => {
        const question = document.querySelector('.swipe-question');
        return question ? Number.parseFloat(getComputedStyle(question).fontSize) : null;
      })()`);
      // Probe the actual CSS size at 100% and 200%. This avoids treating the
      // CDP call succeeding as evidence that CSS text grew.
      await cdp.call("Emulation.setEmulatedOSTextScale", { scale: 1 });
      await sleep(80);
      const atOne = await readQuestionFontSize();
      await cdp.call("Emulation.setEmulatedOSTextScale", { scale: textScale });
      await sleep(80);
      const atRequested = await readQuestionFontSize();
      const ratio = atOne && atRequested ? atRequested / atOne : null;
      const nativeEffective = ratio !== null && Math.abs(ratio - textScale) < 0.05;
      results.textScale.nativeProbe = { atOne, atRequested, ratio, nativeEffective };
      const useSynthetic = textScaleMode === "synthetic" || (textScaleMode === "auto" && !nativeEffective);
      if (textScaleMode === "native" && !nativeEffective) {
        throw new Error(`Chrome OS text scale did not change computed .swipe-question font size: ${JSON.stringify(results.textScale.nativeProbe)}`);
      }
      results.textScale.effectiveMode = useSynthetic ? "synthetic-computed-font-size" : "native-os-text-scale";
    };
    const assertQuizAccessibility = async (questionIndex) => {
      await evaluate('document.querySelector("[data-testid=swipe-card]")?.scrollIntoView({ block: "start" })');
      await sleep(80);
      const effectiveBaselineFontSize = results.textScale.effectiveMode === "native-os-text-scale"
        ? results.textScale.nativeProbe?.atOne ?? null
        : null;
      const status = await evaluate(`(() => {
        const card = document.querySelector('[data-testid="swipe-card"]');
        const question = card?.querySelector('.swipe-question');
        const storedBaseline = question ? Number.parseFloat(question.dataset.teamCareSmokeBaselineFontSize ?? '') : Number.NaN;
        const baselineFontSize = question ? (Number.isFinite(storedBaseline) ? storedBaseline : Number.parseFloat(getComputedStyle(question).fontSize)) : null;
        if (question && ${JSON.stringify(textScale)} !== 1 && ${JSON.stringify(results.textScale.effectiveMode)} === 'synthetic-computed-font-size') {
          question.dataset.teamCareSmokeBaselineFontSize = String(baselineFontSize);
          question.style.setProperty('font-size', String(baselineFontSize * ${JSON.stringify(textScale)}) + 'px', 'important');
        }
        const controls = [...document.querySelectorAll('button[aria-label^="Ответить"]')];
        const details = controls.map((button) => {
          button.focus();
          const rect = button.getBoundingClientRect();
          return {
            label: button.getAttribute('aria-label'),
            focused: document.activeElement === button,
            disabled: button.disabled,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            inViewport: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.bottom > 0 && rect.top < innerHeight,
          };
        });
        const cardRect = card?.getBoundingClientRect();
        const questionRect = question?.getBoundingClientRect();
        const questionStyle = question ? getComputedStyle(question) : null;
        const cardStyle = card ? getComputedStyle(card) : null;
        const clippedQuestion = Boolean(cardRect && questionRect && cardStyle?.overflow !== 'visible'
          && (questionRect.left < cardRect.left || questionRect.right > cardRect.right || questionRect.bottom > cardRect.bottom));
        return {
          cardPresent: Boolean(card),
          cardWithinWidth: !cardRect || (cardRect.left >= -1 && cardRect.right <= innerWidth + 1),
          questionVisible: Boolean(questionRect && questionRect.width > 0 && questionRect.height > 0) && !clippedQuestion,
          questionFontSize: questionStyle?.fontSize ?? null,
          baselineFontSize,
          fontSizeRatio: (${JSON.stringify(effectiveBaselineFontSize)} ?? baselineFontSize) && questionStyle ? Number.parseFloat(questionStyle.fontSize) / (${JSON.stringify(effectiveBaselineFontSize)} ?? baselineFontSize) : null,
          questionBounds: questionRect ? { top: Math.round(questionRect.top), bottom: Math.round(questionRect.bottom), width: Math.round(questionRect.width) } : null,
          cardBounds: cardRect ? { top: Math.round(cardRect.top), bottom: Math.round(cardRect.bottom), width: Math.round(cardRect.width), scrollHeight: card.scrollHeight, clientHeight: card.clientHeight } : null,
          controls: details,
        };
      })()`);
      results.textScale.questions.push({ question: questionIndex + 1, ...status });
      if (textScale !== 1 && (status.fontSizeRatio === null || Math.abs(status.fontSizeRatio - textScale) > 0.05)) {
        throw new Error(`Question ${questionIndex + 1} font size did not reach ${textScale}x: ${JSON.stringify(status)}`);
      }
      const usable = status.cardPresent && status.cardWithinWidth && status.questionVisible
        && status.controls.length === 2
        && status.controls.every((control) => control.focused && !control.disabled && control.width >= 44 && control.height >= 44 && control.inViewport);
      if (!usable) throw new Error(`Question ${questionIndex + 1} is not usable at text scale ${textScale}: ${JSON.stringify(status)}`);
    };

    await cdp.call("Page.navigate", { url: appUrl });
    await sleep(1_100);
    await waitSelector('[data-testid="primary-cta"]');
    await capture("01-welcome-390x844.png");
    await click('[data-testid="primary-cta"]');
    await waitSelector('[data-testid="swipe-card"]');
    await configureTextScale();
    // Capture after the effective scale is applied. The focus checks below
    // intentionally end on a control; restore the question to the top so the
    // screenshot is visual evidence of the enlarged text rather than its CTA.
    if (textScale !== 1) {
      if (results.textScale.effectiveMode === "synthetic-computed-font-size") {
        await evaluate(`(() => {
          const question = document.querySelector('.swipe-question');
          if (!question) return false;
          const stored = Number.parseFloat(question.dataset.teamCareSmokeBaselineFontSize ?? '');
          const baseline = Number.isFinite(stored) ? stored : Number.parseFloat(getComputedStyle(question).fontSize);
          question.dataset.teamCareSmokeBaselineFontSize = String(baseline);
          question.style.setProperty('font-size', String(baseline * ${JSON.stringify(textScale)}) + 'px', 'important');
          return true;
        })()`);
      }
      await evaluate('document.querySelector("[data-testid=swipe-card]")?.scrollIntoView({ block: "start" })');
      await sleep(80);
    }
    await capture(textScale === 1 ? "02-quiz-390x844.png" : `02-quiz-text-scale-${textScale}.png`);

    // Leaving while a swipe animates must not submit its late answer.
    await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await sleep(120);
    await click('button[aria-label="Ответить да"]');
    await evaluate('history.back()');
    await sleep(900);
    await waitSelector('[data-testid="primary-cta"]');
    await evaluate('history.forward()');
    await waitSelector('[data-testid="swipe-card"]');
    await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });
    await sleep(120);

    // The questions are deliberately completed through their visible controls,
    // rather than by writing application state.
    for (let index = 0; index < 11; index += 1) {
      await waitFor(`document.querySelectorAll('button[aria-label^="Ответить"]:not(:disabled)').length === 2`, `enabled matching controls for question ${index + 1}`);
      await assertQuizAccessibility(index);
      // Arm only immediately before reveal. This isolates a photo stall from
      // matching controls and leaves all application assets untouched.
      if (index === 10 && slowRevealPhotoDelayMs > 0) {
        armSlowRevealPhoto = true;
        await cdp.call("Fetch.enable", { patterns: [
          { urlPattern: "*/api/public-config*", requestStage: "Request" },
          { urlPattern: "*/api/contact-capture*", requestStage: "Request" },
          { urlPattern: "*", requestStage: "Request" },
        ] });
      }
      await click('button[aria-label="Ответить да"]');
      await sleep(330);
    }
    await waitText("Кажется, вам стоит познакомиться");
    await waitSelector('.reveal-screen .button--orange');
    if (slowRevealPhotoDelayMs > 0) {
      const started = Date.now();
      while (results.slowRevealPhoto.delayedRequests === 0 && Date.now() - started < 3_000) await sleep(50);
      if (results.slowRevealPhoto.delayedRequests !== 1) throw new Error("Reveal photo was not delayed by the focused slow-photo check");
      await waitFor('Boolean(document.querySelector(".reveal-photo img")) && !document.querySelector(".reveal-photo img").complete', 'delayed reveal image remains loading');
      const enabled = await evaluate('!document.querySelector(".reveal-screen .button--orange")?.disabled');
      if (!enabled) throw new Error("Reveal CTA is disabled while its photo is loading");
      results.slowRevealPhoto.ctaUsableWhileLoading = true;
    }
    results.reveal = await evaluate(`(() => {
      const name = document.querySelector('.reveal-copy .reveal-name');
      if (!name) return { namePresent: false };
      const actualName = name.textContent ?? '';
      const originalClass = name.className;
      name.textContent = 'Антонина Викторовна';
      name.classList.add('reveal-name--very-long');
      const rect = name.getBoundingClientRect();
      const result = {
        namePresent: true,
        actualName,
        actualNameLength: Array.from(actualName).length,
        longNameWithinWidth: rect.left >= -1 && rect.right <= innerWidth + 1 && name.scrollWidth <= name.clientWidth + 1,
        longNameLines: Math.max(1, Math.round(rect.height / Number.parseFloat(getComputedStyle(name).lineHeight) || rect.height)),
      };
      name.textContent = actualName;
      name.className = originalClass;
      return result;
    })()`);
    if (!results.reveal.longNameWithinWidth) throw new Error(`Long reveal name clips horizontally: ${JSON.stringify(results.reveal)}`);
    await capture(textScale === 1 ? "03-reveal-390x844.png" : `03-reveal-text-scale-${textScale}.png`);
    if (smokeFocus === "quiz-reveal") {
      // The CTA is intentionally clicked while the image is still paused.
      // This proves the loading photo cannot hold the visitor on reveal.
      await click('.reveal-screen .button--orange');
      await waitText("Выберите планету заботы", 10_000);
      await writeFile(join(artifactsDir, "result.json"), JSON.stringify(results, null, 2));
      console.log(`Focused quiz/reveal smoke passed. Screenshots: ${artifactsDir}`);
      return;
    }
    await reload();
    await waitText("Кажется, вам стоит познакомиться");

    // Reveal state must survive browser Back/Forward.
    await evaluate("history.back()");
    await waitSelector('[data-testid="swipe-card"]');
    await evaluate("history.forward()");
    await waitText("Кажется, вам стоит познакомиться");

    await click('.reveal-screen .button--orange');
    await waitText("Выберите планету заботы", 10_000);
    await capture("04-orbit-390x844.png");

    const openMission = async (missionId, testId) => {
      await click(`[data-testid="mission-node-${missionId}"]`);
      await waitSelector(`[data-testid="${testId}"]`, 8_000);
    };
    const returnToOrbit = async () => {
      await click('.journey-screen .button--orange');
      await waitText("Выберите планету заботы", 8_000);
    };

    await openMission("trust", "matching-care-game");
    await capture("05-matching-390x844.png");
    // The current game presents one visible situation and several possible
    // actions. While a choice is checked, every remaining action is locked.
    const initialActionId = await evaluate(`document.querySelector('[data-testid="matching-care-card"][data-card-kind="action"]')?.dataset.cardId ?? null`);
    if (!initialActionId) throw new Error("Matching board has no action choices");
    await click(`[data-testid="matching-care-card"][data-card-id="${initialActionId}"]`);
    await waitFor('document.querySelector("[data-testid=matching-care-game]")?.dataset.matchingPhase === "checking"', "matching check begins");
    const actionLockCount = await evaluate(`document.querySelectorAll('[data-testid="matching-care-card"][data-card-kind="action"]:not([data-matched="true"]):disabled').length`);
    if (actionLockCount < 3) throw new Error("Matching actions remained interactive during checking");
    await waitFor('document.querySelector("[data-testid=matching-care-game]")?.dataset.matchingPhase === "idle"', "matching feedback", 2_500);
    // The first visible action can itself be the correct one. A match is held
    // on screen until the player explicitly proceeds; clear that state before
    // trying the next visible situation.
    const initialMatched = await evaluate('document.querySelectorAll("[data-testid=matching-care-card][data-matched=true]").length');
    if (initialMatched > 0 && initialMatched < 4) {
      await waitSelector('.matching-care-game__continue');
      await click('.matching-care-game__continue');
    }
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const matched = await evaluate('document.querySelectorAll("[data-testid=matching-care-card][data-matched=true]").length');
      if (matched === 4) break;
      const actionIds = await evaluate(`Array.from(document.querySelectorAll('[data-testid=matching-care-card][data-card-kind=action]:not([data-matched=true])'), (node) => node.dataset.cardId)`);
      let advanced = false;
      for (const actionId of actionIds) {
        await click(`[data-testid="matching-care-card"][data-card-id="${actionId}"]`);
        await waitFor('document.querySelector("[data-testid=matching-care-game]")?.dataset.matchingPhase === "checking"', "matching answer checking");
        await waitFor('document.querySelector("[data-testid=matching-care-game]")?.dataset.matchingPhase === "idle"', "matching feedback", 2_500);
        const after = await evaluate('document.querySelectorAll("[data-testid=matching-care-card][data-matched=true]").length');
        if (after > matched) {
          if (after < 4) {
            await waitSelector('.matching-care-game__continue');
            await click('.matching-care-game__continue');
          }
          advanced = true;
          break;
        }
      }
      if (!advanced) throw new Error("Could not find a matching action through the visible matching board");
    }
    await waitFor('document.querySelectorAll("[data-testid=matching-care-card][data-matched=true]").length === 4', "all matching pairs completed");
    // A completed pair must remain after a real browser refresh.
    await reload();
    await waitFor('document.querySelectorAll("[data-testid=matching-care-card][data-matched=true]").length === 4', "matching progress restored");
    await returnToOrbit();

    await openMission("food", "visit-game");
    await capture("06-visit-390x844.png");
    for (let step = 0; step < 5; step += 1) {
      await waitSelector('[data-testid="visit-option"][data-choice-correct="true"]');
      await click('[data-testid="visit-option"][data-choice-correct="true"]');
      await waitSelector('.visit-feedback__continue');
      await click('.visit-feedback__continue');
    }
    await waitSelector('[data-testid="visit-complete"]');
    await returnToOrbit();

    await openMission("health", "health-game");
    await capture("07-health-390x844.png");
    for (let zone = 0; zone < 6; zone += 1) {
      await click('[data-testid="health-zone"]:not(:disabled)');
      await waitSelector('[data-testid="health-action"][data-choice-correct="true"]');
      await click('[data-testid="health-action"][data-choice-correct="true"]');
      await waitSelector('[data-testid="health-continue"]');
      await click('[data-testid="health-continue"]');
    }
    await waitSelector('[data-testid="health-summary"]');
    await returnToOrbit();

    await openMission("home", "walk-maze");
    await capture("07-maze-390x844.png");
    const mazeState = () => evaluate(`(() => {
      const player = document.querySelector('.walk-maze__player');
      const board = document.querySelector('.walk-maze__board');
      const svg = board?.querySelector('svg');
      if (!player || !board || !svg) return null;
      const x = Math.floor(Number(player.getAttribute('cx')));
      const y = Math.floor(Number(player.getAttribute('cy')));
      const lines = [...svg.querySelectorAll('.walk-maze__walls line')].map((line) => ({
        x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')),
        x2: Number(line.getAttribute('x2')), y2: Number(line.getAttribute('y2')),
      }));
      const wall = (x1, y1, x2, y2) => lines.some((line) => line.x1 === x1 && line.y1 === y1 && line.x2 === x2 && line.y2 === y2);
      const choices = [];
      if (!wall(x, y, x + 1, y)) choices.push({ direction: 'ArrowUp', dx: 0, dy: -1 });
      if (!wall(x + 1, y, x + 1, y + 1)) choices.push({ direction: 'ArrowRight', dx: 1, dy: 0 });
      if (!wall(x, y + 1, x + 1, y + 1)) choices.push({ direction: 'ArrowDown', dx: 0, dy: 1 });
      if (!wall(x, y, x, y + 1)) choices.push({ direction: 'ArrowLeft', dx: -1, dy: 0 });
      return { x, y, choices, board: { left: board.getBoundingClientRect().left, top: board.getBoundingClientRect().top, width: board.getBoundingClientRect().width, height: board.getBoundingClientRect().height } };
    })()`);
    const beforeKeyboard = await mazeState();
    if (!beforeKeyboard?.choices?.length) throw new Error("Maze UI exposes no open move from the current cell");
    await click('.walk-maze__board');
    await key(beforeKeyboard.choices[0].direction);
    await sleep(230);
    const afterKeyboard = await mazeState();
    if (afterKeyboard.x === beforeKeyboard.x && afterKeyboard.y === beforeKeyboard.y) throw new Error("Maze arrow-key movement did not update the player");
    const beforeSwipe = afterKeyboard;
    const swipeChoice = beforeSwipe.choices.find((choice) => !(choice.dx === -beforeKeyboard.choices[0].dx && choice.dy === -beforeKeyboard.choices[0].dy)) ?? beforeSwipe.choices[0];
    const startX = beforeSwipe.board.left + beforeSwipe.board.width / 2;
    const startY = beforeSwipe.board.top + beforeSwipe.board.height / 2;
    await cdp.call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y: startY, radiusX: 3, radiusY: 3, force: 1, id: 1 }] });
    await cdp.call("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: startX + swipeChoice.dx * 70, y: startY + swipeChoice.dy * 70, radiusX: 3, radiusY: 3, force: 1, id: 1 }] });
    await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(260);
    const afterSwipe = await mazeState();
    if (afterSwipe.x === beforeSwipe.x && afterSwipe.y === beforeSwipe.y && !/укусил/i.test(await bodyText())) throw new Error("Maze touch swipe did not update the player");
    await sleep(480);
    const persistedPosition = { x: afterSwipe.x, y: afterSwipe.y };
    await reload();
    await waitSelector('[data-testid="walk-maze"]');
    const restoredMazePosition = await mazeState();
    if (restoredMazePosition.x !== persistedPosition.x || restoredMazePosition.y !== persistedPosition.y) throw new Error("Maze position was not restored after refresh");
    await evaluate('history.back()');
    await waitText('Выберите планету заботы');
    await evaluate('history.forward()');
    await waitSelector('[data-testid="walk-maze"]');
    const forwardMazePosition = await mazeState();
    if (forwardMazePosition.x !== persistedPosition.x || forwardMazePosition.y !== persistedPosition.y) throw new Error('Maze position lost after Back/Forward');

    const readMazeBoard = () => evaluate(`(() => {
      const board = document.querySelector('.walk-maze__board');
      const svg = board?.querySelector('svg');
      const player = svg?.querySelector('.walk-maze__player');
      const hazard = svg?.querySelector('.walk-maze__hazard circle');
      const finish = svg?.querySelector('.walk-maze__finish');
      if (!board || !svg || !player || !finish) return null;
      const [, , width, height] = (svg.getAttribute('viewBox') ?? '').split(/\\s+/).map(Number);
      const cell = (node) => ({ x: Math.floor(Number(node.getAttribute('cx') ?? node.getAttribute('x'))), y: Math.floor(Number(node.getAttribute('cy') ?? node.getAttribute('y'))) });
      return {
        width, height, complete: document.querySelector('.walk-maze--complete') !== null,
        player: cell(player), hazard: hazard ? cell(hazard) : null,
        finish: cell(finish),
        bonuses: [...svg.querySelectorAll('.walk-maze__bonus')].map((bonus) => ({ ...cell(bonus.querySelector('circle')), collected: bonus.classList.contains('is-collected') })),
        walls: [...svg.querySelectorAll('.walk-maze__walls line')].map((line) => [Number(line.getAttribute('x1')), Number(line.getAttribute('y1')), Number(line.getAttribute('x2')), Number(line.getAttribute('y2'))]),
      };
    })()`);
    const readStoredMazeProgress = () => evaluate(`(() => {
      const raw = localStorage.getItem('nika-team-care-mvp-v1');
      if (!raw) return null;
      try { return JSON.parse(raw)?.missionProgress?.home ?? null; } catch { return null; }
    })()`);
    const sameCell = (left, right) => left && right && left.x === right.x && left.y === right.y;
    const directions = [
      { name: 'north', key: 'ArrowUp', dx: 0, dy: -1 },
      { name: 'east', key: 'ArrowRight', dx: 1, dy: 0 },
      { name: 'south', key: 'ArrowDown', dx: 0, dy: 1 },
      { name: 'west', key: 'ArrowLeft', dx: -1, dy: 0 },
    ];
    const cellKey = (cell) => `${cell.x},${cell.y}`;
    const wallOnEdge = (board, x1, y1, x2, y2) => board.walls.some((wall) => wall[0] === x1 && wall[1] === y1 && wall[2] === x2 && wall[3] === y2);
    const blocked = (board, cell, direction) => {
      const next = { x: cell.x + direction.dx, y: cell.y + direction.dy };
      if (next.x < 0 || next.y < 0 || next.x >= board.width || next.y >= board.height) return true;
      return direction.name === 'north' ? wallOnEdge(board, cell.x, cell.y, cell.x + 1, cell.y)
        : direction.name === 'east' ? wallOnEdge(board, cell.x + 1, cell.y, cell.x + 1, cell.y + 1)
          : direction.name === 'south' ? wallOnEdge(board, cell.x, cell.y + 1, cell.x + 1, cell.y + 1)
            : wallOnEdge(board, cell.x, cell.y, cell.x, cell.y + 1);
    };
    const openNeighbours = (board, cell) => directions
      .filter((direction) => !blocked(board, cell, direction))
      .map((direction) => ({ direction, cell: { x: cell.x + direction.dx, y: cell.y + direction.dy } }));
    const pathTo = (board, from, target, forbidden = new Set()) => {
      const queue = [{ cell: from, path: [] }];
      const seen = new Set([cellKey(from)]);
      while (queue.length) {
        const current = queue.shift();
        if (sameCell(current.cell, target)) return current.path;
        for (const neighbour of openNeighbours(board, current.cell)) {
          const key = cellKey(neighbour.cell);
          if (seen.has(key) || (forbidden.has(key) && !sameCell(neighbour.cell, target))) continue;
          seen.add(key);
          queue.push({ cell: neighbour.cell, path: [...current.path, neighbour.direction] });
        }
      }
      return null;
    };
    const distance = (left, right) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
    const seededFraction = (seed) => {
      let hash = 2166136261;
      for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      hash += 0x6d2b79f5;
      let value = hash;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const nextHazard = (board, model, playerTarget) => {
      const neighbours = openNeighbours(board, model.hazardPosition).map(({ cell }) => cell);
      const forward = model.hazardPreviousPosition && neighbours.length > 1
        ? neighbours.filter((cell) => !sameCell(cell, model.hazardPreviousPosition))
        : neighbours;
      const candidates = forward.length ? forward : neighbours;
      const approach = distance(model.hazardPosition, playerTarget) <= 6
        && seededFraction(`${model.hazardSeed}:${model.hazardStep}:mode`) < 0.44;
      const ordered = approach ? [...candidates].sort((left, right) => distance(left, playerTarget) - distance(right, playerTarget)) : candidates;
      const bestDistance = approach ? distance(ordered[0], playerTarget) : null;
      const pool = bestDistance === null ? ordered : ordered.filter((cell) => distance(cell, playerTarget) === bestDistance);
      return pool[Math.floor(seededFraction(`${model.hazardSeed}:${model.hazardStep}:turn`) * pool.length)] ?? pool[0];
    };
    const collectEveryMazePoint = async () => {
      await sleep(520);
      let model = await readStoredMazeProgress();
      if (!model?.hazardSeed || !model?.hazardPosition) throw new Error('Maze progress was not persisted before collection playthrough');
      let bites = 0;
      for (let turn = 0; turn < 190; turn += 1) {
        const board = await readMazeBoard();
        if (!board) throw new Error('Maze board disappeared during collection playthrough');
        if (board.complete) {
          if (!board.bonuses.every((bonus) => bonus.collected)) throw new Error('Maze completed before every point was collected');
          results.mazeAllPoints = true;
          results.mazeBitesDuringCollection = bites;
          return;
        }
        if (!sameCell(board.player, model.position) || !sameCell(board.hazard, model.hazardPosition)) {
          await sleep(480);
          model = await readStoredMazeProgress();
          if (!model?.hazardSeed) throw new Error('Maze progress could not be resynchronized');
          continue;
        }
        const targets = board.bonuses.filter((bonus) => !bonus.collected).map(({ x, y }) => ({ x, y }));
        if (!targets.length) targets.push(board.finish);
        let moveChoice = null;
        for (const target of targets) {
          const path = pathTo(board, board.player, target, new Set(board.hazard ? [cellKey(board.hazard)] : []))
            ?? pathTo(board, board.player, target);
          if (!path?.length) continue;
          const direction = path[0];
          const playerTarget = { x: board.player.x + direction.dx, y: board.player.y + direction.dy };
          const futureHazard = nextHazard(board, model, playerTarget);
          if (!sameCell(playerTarget, model.hazardPosition) && !sameCell(playerTarget, futureHazard)) {
            moveChoice = { direction, playerTarget, futureHazard, target, pathLength: path.length };
            break;
          }
        }
        if (!moveChoice) {
          const safe = openNeighbours(board, board.player).map(({ direction, cell }) => ({ direction, playerTarget: cell, futureHazard: nextHazard(board, model, cell) }))
            .find((choice) => !sameCell(choice.playerTarget, model.hazardPosition) && !sameCell(choice.playerTarget, choice.futureHazard));
          if (!safe) throw new Error('No safe live maze move is available');
          moveChoice = safe;
        }
        await key(moveChoice.direction.key);
        await sleep(195);
        const after = await readMazeBoard();
        if (!after) throw new Error('Maze board disappeared after a keyboard move');
        if (sameCell(after.player, board.player)) throw new Error('Live maze move did not change player position');
        if (sameCell(after.player, moveChoice.playerTarget) && sameCell(after.hazard, moveChoice.futureHazard)) {
          model = {
            ...model,
            position: moveChoice.playerTarget,
            hazardPreviousPosition: model.hazardPosition,
            hazardPosition: moveChoice.futureHazard,
            hazardStep: model.hazardStep + 1,
          };
          continue;
        }
        // A bite resets the actual board and its deterministic hazard seed.
        bites += 1;
        await sleep(520);
        model = await readStoredMazeProgress();
        if (!model?.hazardSeed) throw new Error('Maze bite did not persist restarted progress');
      }
      throw new Error('Could not collect every point and return to the finish within 190 live moves');
    };

    // Exercise a LIVE completion transition, never a restored terminal state.
    if (mazeCompletionMode === 'collect') {
      await collectEveryMazePoint();
    } else if (mazeCompletionMode === 'timer') {
      await waitSelector('.walk-maze--complete', 55_000);
      results.mazeFriendlyTimerCompletion = true;
    } else {
      throw new Error(`Unknown SMOKE_MAZE_COMPLETION mode: ${mazeCompletionMode}`);
    }
    await capture('maze-live-completion-360x800.png');
    console.log('Live maze finished; checking touch scrolling');
    // Physical touch, not DOM .click(): a completed board must release scrolling.
    await evaluate('window.scrollTo(0, 0)');
    await sleep(250);
    const boardBox = await evaluate(`(() => { const r = document.querySelector('.walk-maze__board').getBoundingClientRect(); return { x: r.x + r.width / 2, y: Math.min(innerHeight - 80, r.y + r.height / 2) }; })()`);
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: boardBox.x, y: boardBox.y }] });
    for (let step = 1; step <= 6; step += 1) {
      await cdp.call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: boardBox.x, y: boardBox.y - step * 30 }] });
      await sleep(30);
    }
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(300);
    if (await evaluate('scrollY') < 20) throw new Error('Completed maze still prevents touch scrolling');
    const scrollAfterUpwardSwipe = await evaluate('scrollY');
    console.log('Upward swipe passed; checking reverse swipe');
    // Reverse direction using a real finger-down swipe. This confirms the
    // completed maze released bidirectional page scrolling, not merely one
    // downward gesture.
    const { x: reverseX, y: reverseY } = await evaluate('({ x: innerWidth / 2, y: innerHeight / 2 })');
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: reverseX, y: reverseY }] });
    for (let step = 1; step <= 6; step += 1) {
      await cdp.call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: reverseX, y: reverseY + step * 30 }] });
      await sleep(30);
    }
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(300);
    if (await evaluate('scrollY') >= scrollAfterUpwardSwipe - 1) throw new Error('Completed maze prevents reverse touch scrolling');
    // A genuine reload must preserve the terminal state and its only onward
    // CTA before any scripted scroll or Back navigation changes the screen.
    console.log('Reverse swipe passed; reloading completed maze');
    await reload();
    await waitSelector('.walk-maze--complete');
    await waitFor('(() => { const node = document.querySelector(".journey-screen .button--orange"); return node && !node.disabled; })()', 'completed maze onward CTA after reload');
    await evaluate('window.scrollTo(0, 0)');
    await sleep(250);
    const backBox = await evaluate(`(() => { const r = document.querySelector('.app-header button[aria-label="Назад"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [backBox] });
    await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await waitText('Выберите планету заботы');
    console.log('Completed maze Back passed; reopening and saving station');
    await openMission('home', 'walk-maze');
    await waitSelector('.walk-maze--complete');
    await click('.journey-screen .button--orange');
    await waitText("Коротко об опеке");
    await click('.passport-goal__action');
    await waitText("Быть рядом, пока не найдётся дом");
    await click('.guardianship-screen .foundation-menu-trigger');
    await waitSelector('[role="dialog"]');
    await key('Escape');
    await capture("08-guardianship-390x844.png");
    if (finalCardLogoDelayMs > 0) {
      armSlowFinalCardLogo = true;
      await cdp.call("Fetch.enable", { patterns: [
        { urlPattern: "*/api/public-config*", requestStage: "Request" },
        { urlPattern: "*/api/contact-capture*", requestStage: "Request" },
        { urlPattern: "*", requestStage: "Request" },
      ] });
    }
    await click('.guardianship-screen .button--orange');
    await waitText("Познакомьте друзей");
    if (finalCardLogoDelayMs > 0) {
      await waitFor('Boolean(document.querySelector(".card-error"))', 'final-card watchdog error', finalCardLogoDelayMs + 6_000);
      if (results.finalCardLogo.delayedRequests !== 1) throw new Error("Final-card logo was not delayed by the watchdog check");
      results.finalCardLogo.watchdogError = true;
      await click('.card-error .button');
      await waitFor('Boolean(document.querySelector(".result-card-preview"))', 'final-card retry result', 15_000);
      results.finalCardLogo.retryReady = true;
    } else {
      await waitFor('Boolean(document.querySelector(".result-card-preview, .card-error"))', 'story card generated', 20_000);
    }
    await capture("09-final-390x844.png");

    // The mock above makes the normal two-step form available without using
    // the local server or any external service. Use input/change events so the
    // test goes through React's real validation and submit gate.
    await waitSelector('.contact-capture__form');
    const setControlValue = async (selector, value) => {
      const changed = await evaluate(`(() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return false;
        const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, ${JSON.stringify(value)});
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (!changed) throw new Error(`Could not fill ${selector}`);
    };
    await setControlValue('input[name="lastName"]', 'Иванова');
    await setControlValue('input[name="firstName"]', 'Анна');
    await setControlValue('input[name="middleName"]', 'Сергеевна');
    await setControlValue('input[name="phone"]', '+7(999)-777-77-77');
    await setControlValue('input[name="email"]', 'anna@example.ru');
    await setControlValue('select[name="preferredContact"]', 'phone');
    await setControlValue('select[name="workSphere"]', 'other');
    await click('.contact-capture__next');
    await waitSelector('.contact-capture__consent input[type="checkbox"]');
    await click('.contact-capture__consent input[type="checkbox"]');
    await waitFor('!document.querySelector(".contact-capture__submit")?.disabled', 'enabled contact form submit');
    // First response is deliberately transient failure. The error must leave
    // the form ready for a retry rather than losing its entered values.
    await click('.contact-capture__submit');
    await waitText('Не получилось отправить контакты');
    await waitFor('!document.querySelector(".contact-capture__submit")?.disabled', 'contact retry enabled');
    // Two synchronous browser clicks represent a double tap. The ref gate
    // allows only one POST while React is still processing the first event.
    await evaluate(`(() => { const button = document.querySelector('.contact-capture__submit'); button.click(); button.click(); })()`);
    await waitText('Контакт передан фонду');
    if (results.contactForm.requests !== 2) throw new Error(`Expected one failed submit and one gated retry, received ${results.contactForm.requests} requests`);
    if (!results.contactForm.requestIds[0] || results.contactForm.requestIds[0] !== results.contactForm.requestIds[1]) {
      throw new Error('Contact retry did not retain its idempotency request id');
    }

    for (const [name, width, height, mobile] of [
      ["320x568", 320, 568, true],
      ["360x800", 360, 800, true],
      ["390x844", 390, 844, true],
      ["430x932", 430, 932, true],
      ["desktop", 1440, 980, false],
    ]) {
      await setViewport(width, height, mobile);
      const metrics = await evaluate(`(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth, tooSmallButtons: [...document.querySelectorAll('button,a.button')].filter((node) => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44); }).length }))()`);
      results.responsive[name] = metrics;
      if (metrics.overflow > 1) throw new Error(`Horizontal overflow at ${name}: ${metrics.overflow}px`);
      await capture(`final-${name}.png`);
    }
    if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join("\n")}`);
    results.currentDocumentLongTasksMs = await evaluate('globalThis.__teamCareLongTasks ?? []');
    await writeFile(join(artifactsDir, "result.json"), JSON.stringify(results, null, 2));
    console.log(`Current standard journey smoke passed. Screenshots: ${artifactsDir}`);
    console.log(JSON.stringify(results, null, 2));
  } finally {
    cdp?.close();
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => chrome.once("exit", resolve)),
      sleep(2_000),
    ]);
    // Chrome can keep an extension storage handle momentarily after SIGTERM;
    // cleanup must never mask the actual smoke outcome.
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
