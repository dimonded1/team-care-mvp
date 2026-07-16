import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = process.env.SMOKE_URL ?? "http://127.0.0.1:8080/";
const port = 9300 + (process.pid % 500);
const userDataDir = join(tmpdir(), `nika-team-care-smoke-${process.pid}`);
const artifactsDir = join(process.cwd(), "artifacts");
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
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });

  const once = (method, timeoutMs = 10_000) => new Promise((resolve, reject) => {
    const handler = (params) => {
      clearTimeout(timeout);
      listeners.set(method, (listeners.get(method) ?? []).filter((item) => item !== handler));
      resolve(params);
    };
    listeners.set(method, [...(listeners.get(method) ?? []), handler]);
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
  });

  const on = (method, listener) => {
    listeners.set(method, [...(listeners.get(method) ?? []), listener]);
  };

  return { call, once, on, close: () => socket.close() };
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
  try {
    await pollJson(`http://127.0.0.1:${port}/json/version`);
    const targetResponse = await fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(appUrl)}`,
      { method: "PUT" },
    );
    if (!targetResponse.ok) throw new Error(`Could not create Chrome target: ${targetResponse.status}`);
    const target = await targetResponse.json();
    cdp = await connectCdp(target.webSocketDebuggerUrl);

    const consoleErrors = [];
    cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      consoleErrors.push(exceptionDetails?.text ?? "Uncaught runtime exception");
    });
    cdp.on("Log.entryAdded", ({ entry }) => {
      if (entry?.level === "error") {
        consoleErrors.push([entry.text, entry.url].filter(Boolean).join(" — "));
      }
    });

    await Promise.all([
      cdp.call("Page.enable"),
      cdp.call("Runtime.enable"),
      cdp.call("Log.enable"),
      cdp.call("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      }),
      cdp.call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 }),
    ]);

    const loaded = cdp.once("Page.loadEventFired");
    await cdp.call("Page.navigate", { url: appUrl });
    await loaded;
    await sleep(1_200);

    const evaluate = async (expression) => {
      const result = await cdp.call("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };

    const bodyText = () => evaluate("document.body.innerText");
    const waitForText = async (needle, timeoutMs = 6_000) => {
      const startedAt = Date.now();
      const normalizedNeedle = needle.toLocaleLowerCase("ru");
      while (Date.now() - startedAt < timeoutMs) {
        if ((await bodyText()).toLocaleLowerCase("ru").includes(normalizedNeedle)) return;
        await sleep(80);
      }
      throw new Error(`Expected visible text: ${needle}\nCurrent body: ${(await bodyText()).slice(0, 1200)}`);
    };

    const waitForSelector = async (selector, present = true, timeoutMs = 6_000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const exists = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
        if (exists === present) return;
        await sleep(80);
      }
      throw new Error(`Expected selector ${selector} present=${present}`);
    };

    const clickButton = async (label) => {
      const clicked = await evaluate(`(() => {
        const label = ${JSON.stringify(label)};
        const button = [...document.querySelectorAll('button')]
          .find((item) => item.innerText.trim() === label || item.innerText.includes(label));
        if (!button || button.disabled) return false;
        button.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`Enabled button not found: ${label}`);
    };

    const clickDialogButton = async (label) => {
      const clicked = await evaluate(`(() => {
        const label = ${JSON.stringify(label)};
        const dialog = document.querySelector('[role="dialog"]');
        const button = dialog && [...dialog.querySelectorAll('button')]
          .find((item) => item.innerText.trim() === label || item.innerText.includes(label));
        if (!button || button.disabled) return false;
        button.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`Enabled dialog button not found: ${label}`);
    };

    const capture = async (fileName) => {
      await cdp.call("Page.bringToFront");
      await evaluate(
        "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
      );
      await sleep(80);
      const { data } = await cdp.call("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      await writeFile(join(artifactsDir, fileName), Buffer.from(data, "base64"));
    };

    const getSwipeCardCenter = () => evaluate(`(() => {
      const card = document.querySelector('[data-testid="swipe-card"]');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);

    const touchPoint = (x, y) => ({ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 });
    const dragCard = async (distance, stepDelay = 70, release = true) => {
      const center = await getSwipeCardCenter();
      if (!center) throw new Error("Swipe card was not rendered");
      await cdp.call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [touchPoint(center.x, center.y)],
      });
      for (const fraction of [0.33, 0.66, 1]) {
        await cdp.call("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [touchPoint(center.x + distance * fraction, center.y)],
        });
        await sleep(stepDelay);
      }
      if (release) {
        await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
    };

    const dragCardWithMouse = async (distance, release = true) => {
      const center = await getSwipeCardCenter();
      if (!center) throw new Error("Swipe card was not rendered for mouse drag");
      await cdp.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: center.x,
        y: center.y,
      });
      await cdp.call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: center.x,
        y: center.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      for (const fraction of [0.33, 0.66, 1]) {
        await cdp.call("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: center.x + distance * fraction,
          y: center.y,
          button: "left",
          buttons: 1,
        });
        await sleep(80);
      }
      if (release) {
        await cdp.call("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: center.x + distance,
          y: center.y,
          button: "left",
          buttons: 0,
          clickCount: 1,
        });
      }
    };

    const pressArrow = async (right) => {
      await sleep(90);
      const key = right ? "ArrowRight" : "ArrowLeft";
      const code = right ? "ArrowRight" : "ArrowLeft";
      await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key, code });
      await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key, code });
    };

    const openMissionNode = async (missionId) => {
      const opened = await evaluate(`(() => {
        const node = document.querySelector('[data-mission-id="${missionId}"]');
        if (!node) return false;
        node.click();
        return true;
      })()`);
      if (!opened) throw new Error(`Mission node not found: ${missionId}`);
      await waitForSelector(".journey-screen");
    };

    const tapSelector = async (selector) => {
      const center = await evaluate(`(() => {
        const target = document.querySelector(${JSON.stringify(selector)});
        const rect = target?.getBoundingClientRect();
        return rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : null;
      })()`);
      if (!center) throw new Error(`Tap target not found: ${selector}`);
      await cdp.call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [touchPoint(center.x, center.y)],
      });
      await cdp.call("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };

    const solveVisibleMission = async () => {
      const isDayGame = await evaluate("Boolean(document.querySelector('[data-testid=\"day-game\"]'))");
      if (isDayGame) {
        const scenes = ["morning", "day", "evening", "night"];
        for (let index = 0; index < scenes.length; index += 1) {
          const sceneId = scenes[index];
          await waitForSelector(`[data-testid="day-scene"][data-day-scene="${sceneId}"]`);
          if (index > 0) await sleep(820);
          const sceneMetrics = await evaluate(`(() => {
            const root = document.querySelector('[data-testid="day-game"]');
            const scene = document.querySelector('[data-testid="day-scene"][data-day-scene="${sceneId}"]');
            const choices = [...(scene?.querySelectorAll('[data-testid="day-choice"]') ?? [])];
            const rects = choices.map((choice) => choice.getBoundingClientRect());
            return {
              activeScene: root?.dataset.activeScene ?? null,
              activeSceneCount: document.querySelectorAll('[data-testid="day-scene"]').length,
              choices: choices.length,
              correctChoices: choices.filter((choice) => choice.dataset.choiceCorrect === "true").length,
              minHeight: rects.length ? Math.min(...rects.map((rect) => rect.height)) : 0,
              legacyDragNodes: document.querySelectorAll('.day-activity, [data-day-slot]').length,
            };
          })()`);
          if (
            sceneMetrics.activeScene !== sceneId
            || sceneMetrics.activeSceneCount !== 1
            || sceneMetrics.choices !== 3
            || sceneMetrics.correctChoices !== 1
            || sceneMetrics.minHeight < 44
            || sceneMetrics.legacyDragNodes !== 0
          ) {
            throw new Error(`Day scene regression: ${sceneId} -> ${JSON.stringify(sceneMetrics)}`);
          }
          if (index === 0) {
            await evaluate(
              `document.querySelector('[data-testid="day-scene"][data-day-scene="${sceneId}"] [data-testid="day-choice"][data-choice-correct="false"]')?.click()`,
            );
            await sleep(300);
            const retryState = await evaluate(`(() => ({
              activeScene: document.querySelector('[data-testid="day-game"]')?.dataset.activeScene ?? null,
              feedback: document.querySelector('.day-scene__feedback--incorrect')?.textContent?.trim() ?? "",
              incorrectChoices: document.querySelectorAll('.day-choice--incorrect').length,
            }))()`);
            if (
              retryState.activeScene !== sceneId
              || !retryState.feedback
              || retryState.incorrectChoices !== 1
            ) {
              throw new Error(`Incorrect day choice did not keep the scene open: ${JSON.stringify(retryState)}`);
            }
          }
          await evaluate(
            `document.querySelector('[data-testid="day-scene"][data-day-scene="${sceneId}"] [data-testid="day-choice"][data-choice-correct="true"]')?.click()`,
          );
        }
        await waitForSelector('[data-testid="day-game"][data-day-phase="complete"]', true, 8_000);
        await waitForSelector('[data-testid="day-montage"]');
        return;
      }

      const isHealthGame = await evaluate("Boolean(document.querySelector('[data-testid=\"health-game\"]'))");
      if (isHealthGame) {
        const zones = ["ears", "eyes", "paws", "belly", "back", "tail"];
        for (let index = 0; index < zones.length; index += 1) {
          const zoneId = zones[index];
          await waitForSelector(`[data-testid="health-zone"][data-zone-id="${zoneId}"][data-zone-complete="false"]`);
          await evaluate(
            `document.querySelector('[data-testid="health-zone"][data-zone-id="${zoneId}"]')?.click()`,
          );
          await waitForSelector(`[data-testid="health-situation"][data-zone-id="${zoneId}"]`);

          const metrics = await evaluate(`(() => {
            const situation = document.querySelector(
              '[data-testid="health-situation"][data-zone-id="${zoneId}"]'
            );
            const actions = [...(situation?.querySelectorAll('[data-testid="health-action"]') ?? [])];
            return {
              actions: actions.length,
              correct: actions.filter((action) => action.dataset.choiceCorrect === "true").length,
              minHeight: actions.length
                ? Math.min(...actions.map((action) => action.getBoundingClientRect().height))
                : 0,
            };
          })()`);
          if (metrics.actions !== 3 || metrics.correct !== 1 || metrics.minHeight < 44) {
            throw new Error(`Health situation regression: ${zoneId} -> ${JSON.stringify(metrics)}`);
          }

          if (index === 0) {
            await evaluate(
              `document.querySelector('[data-testid="health-situation"][data-zone-id="${zoneId}"] [data-testid="health-action"][data-choice-correct="false"]')?.click()`,
            );
            await waitForSelector('.health-feedback--learning');
            const learning = await evaluate(`(() => ({
              feedback: document.querySelector('[data-testid="health-feedback"]')?.textContent?.trim() ?? "",
              shownCorrect: document.querySelectorAll('.health-action--correct').length,
              shownLearning: document.querySelectorAll('.health-action--learning').length,
            }))()`);
            if (!learning.feedback || learning.shownCorrect !== 1 || learning.shownLearning !== 1) {
              throw new Error(`Health learning feedback regression: ${JSON.stringify(learning)}`);
            }
            await sleep(420);
            await capture("smoke-health-feedback-mobile.png");
          } else {
            await evaluate(
              `document.querySelector('[data-testid="health-situation"][data-zone-id="${zoneId}"] [data-testid="health-action"][data-choice-correct="true"]')?.click()`,
            );
            await waitForSelector('.health-feedback--correct');
          }

          await evaluate("document.querySelector('[data-testid=\"health-continue\"]')?.click()");
          await waitForSelector(
            `[data-testid="health-zone"][data-zone-id="${zoneId}"][data-zone-complete="true"]`,
          );
        }
        await waitForSelector('[data-testid="health-game"][data-health-phase="complete"]');
        await waitForSelector('[data-testid="health-summary"]');
        await sleep(420);
        await capture("smoke-health-summary-mobile.png");
        return;
      }

      const optionCount = await evaluate("document.querySelectorAll('.mission-option').length");
      let solved = false;
      for (let option = 0; option < optionCount; option += 1) {
        await evaluate(`document.querySelectorAll('.mission-option')[${option}].click()`);
        await sleep(80);
        const feedback = await evaluate("document.querySelector('.feedback strong')?.innerText ?? ''");
        if (feedback === "Точно") {
          solved = true;
          break;
        }
      }
      if (!solved) throw new Error("No correct choice found in the current mission");
    };

    const reloadAt = async (width, height, reducedMotion = false) => {
      await evaluate("localStorage.clear()");
      await cdp.call("Emulation.setEmulatedMedia", {
        features: [{
          name: "prefers-reduced-motion",
          value: reducedMotion ? "reduce" : "no-preference",
        }],
      });
      await cdp.call("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 1024,
      });
      const reloaded = cdp.once("Page.loadEventFired");
      await cdp.call("Page.reload", { ignoreCache: true });
      await reloaded;
      await sleep(1_200);
      await waitForText("Начать знакомство");
    };

    const assertPrimaryCtaInViewport = async (label) => {
      const metrics = await evaluate(`(() => {
        const button = document.querySelector('[data-testid="primary-cta"]');
        const welcome = document.querySelector('.welcome-screen');
        const rect = button?.getBoundingClientRect();
        const welcomeRect = welcome?.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          buttonTop: rect?.top ?? null,
          buttonBottom: rect?.bottom ?? null,
          buttonHeight: rect?.height ?? null,
          welcomeLeft: welcomeRect?.left ?? null,
          welcomeRight: welcomeRect?.right ?? null,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      })()`);
      if (
        metrics.buttonTop === null
        || metrics.buttonTop < 0
        || metrics.buttonBottom > metrics.viewportHeight
        || metrics.buttonHeight < 44
        || metrics.welcomeLeft === null
        || Math.abs(metrics.welcomeLeft) > 1
        || metrics.welcomeRight === null
        || Math.abs(metrics.welcomeRight - metrics.viewportWidth) > 1
        || metrics.overflow > 1
      ) {
        throw new Error(`${label} landing regression: ${JSON.stringify(metrics)}`);
      }
      return metrics;
    };

    await waitForText("Начать знакомство");
    const legalFooter = await evaluate(`(() => ({
      internal: [...document.querySelectorAll('.site-footer__links button[data-legal-id]')]
        .map((item) => ({ label: item.textContent.trim(), id: item.dataset.legalId })),
      external: [...document.querySelectorAll('.site-footer__links a[data-external-legal]')]
        .map((item) => ({ label: item.textContent.trim(), href: item.href })),
      homeLinks: [...document.querySelectorAll('.site-footer__links a')]
        .filter((item) => item.href.startsWith('https://home.fond-nika.ru/')).length,
    }))()`);
    const expectedExternalLegalLinks = [
      "https://fond-nika.ru/upload/iblock/39d/4n113n65xuyob2z0c6sd687r6xyvqkzt.pdf",
      "https://fond-nika.ru/about/documents-and-reports/",
    ];
    if (
      legalFooter.internal.length !== 4
      || legalFooter.external.length !== 2
      || legalFooter.homeLinks !== 0
      || expectedExternalLegalLinks.some((href) => !legalFooter.external.some((link) => link.href === href))
    ) {
      throw new Error(`Footer legal actions regression: ${JSON.stringify(legalFooter)}`);
    }
    const welcomeMetrics = await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')]
        .find((item) => item.innerText.includes('Начать знакомство'));
      const photo = document.querySelector('.welcome-photo');
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        buttonBottom: button?.getBoundingClientRect().bottom ?? null,
        photoHeight: photo?.getBoundingClientRect().height ?? null,
      };
    })()`);
    if (welcomeMetrics.buttonBottom === null || welcomeMetrics.buttonBottom > welcomeMetrics.viewportHeight) {
      throw new Error(`Primary CTA is below the first viewport: ${JSON.stringify(welcomeMetrics)}`);
    }
    await capture("smoke-welcome-mobile.png");
    await clickButton("Начать знакомство");
    await waitForText("1 из 11");

    const choiceSources = await evaluate(`(() => ({
      gestureSources: document.querySelectorAll('[data-choice-source="swipe"]').length,
      legacyActionBlocks: document.querySelectorAll('.swipe-actions').length,
    }))()`);
    if (choiceSources.gestureSources !== 1 || choiceSources.legacyActionBlocks !== 0) {
      throw new Error(`Swipe choice source is duplicated: ${JSON.stringify(choiceSources)}`);
    }

    const matchingLayout = await evaluate(`(() => {
      const card = document.querySelector('[data-testid="swipe-card"]');
      const controls = document.querySelector('.swipe-controls');
      const back = document.querySelector('.quiz-screen .icon-button');
      const menu = document.querySelector('.quiz-screen .foundation-menu-trigger');
      const progress = document.querySelector('.quiz-screen .progress-track');
      const counter = document.querySelector('.quiz-screen .progress-copy--counter');
      const cardRect = card?.getBoundingClientRect();
      const controlsRect = controls?.getBoundingClientRect();
      const progressRect = progress?.getBoundingClientRect();
      const counterRect = counter?.getBoundingClientRect();
      const backStyle = back ? getComputedStyle(back) : null;
      return {
        controlsGap: cardRect && controlsRect ? controlsRect.top - cardRect.bottom : null,
        controlsBottom: controlsRect?.bottom ?? null,
        viewportHeight: window.innerHeight,
        backBackground: backStyle?.backgroundColor ?? null,
        backColor: backStyle?.color ?? null,
        mascotCount: document.querySelectorAll('.quiz-screen__mascot').length,
        constellationNodes: document.querySelectorAll('.orbit-field__constellation-nodes circle').length,
        shootingStars: document.querySelectorAll('.quiz-shooting-star').length,
        menuHeight: menu?.getBoundingClientRect().height ?? null,
        legacyHeaderStatus: document.querySelectorAll('.quiz-screen .header-status').length,
        counterBelowProgress: progressRect && counterRect ? counterRect.top >= progressRect.bottom : null,
      };
    })()`);
    if (
      matchingLayout.controlsGap === null
      || matchingLayout.controlsGap < 28
      || matchingLayout.controlsBottom > matchingLayout.viewportHeight - 8
      || matchingLayout.backBackground !== "rgb(247, 109, 49)"
      || matchingLayout.backColor !== "rgb(255, 255, 255)"
      || matchingLayout.mascotCount !== 0
      || matchingLayout.constellationNodes < 20
      || matchingLayout.shootingStars !== 0
      || matchingLayout.menuHeight === null
      || matchingLayout.menuHeight < 44
      || matchingLayout.legacyHeaderStatus !== 0
      || matchingLayout.counterBelowProgress !== true
    ) {
      throw new Error(`Matching layout regression: ${JSON.stringify(matchingLayout)}`);
    }

    await capture("smoke-quiz-rest-mobile.png");
    await clickButton("Меню");
    await waitForText("Все подопечные");
    await clickButton("Закрыть");
    await dragCard(64, 100, false);
    const draggedState = await evaluate(`(() => {
      const card = document.querySelector('[data-testid="swipe-card"]');
      const yes = document.querySelector('[data-testid="swipe-label-yes"]');
      if (!card || !yes) return null;
      const matrix = new DOMMatrix(getComputedStyle(card).transform);
      return {
        x: matrix.m41,
        angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
        yesOpacity: Number.parseFloat(getComputedStyle(yes).opacity),
      };
    })()`);
    if (!draggedState || draggedState.x < 40 || draggedState.angle < 1 || draggedState.yesOpacity < 0.2) {
      throw new Error(`Swipe does not follow the finger: ${JSON.stringify(draggedState)}`);
    }
    await capture("smoke-quiz-drag-mobile.png");
    await cdp.call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(600);
    await waitForText("1 из 11");
    const returnedState = await evaluate(`(() => {
      const card = document.querySelector('[data-testid="swipe-card"]');
      if (!card) return null;
      const matrix = new DOMMatrix(getComputedStyle(card).transform);
      return { x: matrix.m41, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI };
    })()`);
    if (!returnedState || Math.abs(returnedState.x) > 2 || Math.abs(returnedState.angle) > 0.2) {
      throw new Error(`Swipe card did not spring back: ${JSON.stringify(returnedState)}`);
    }

    await dragCard(150, 32);
    await waitForText("2 из 11");
    const postTutorialControls = await evaluate(
      "document.querySelectorAll('.swipe-controls').length",
    );
    if (postTutorialControls !== 0) {
      throw new Error(`Swipe tutorial remains after the first answer: ${postTutorialControls}`);
    }
    await capture("smoke-quiz-clean-mobile.png");

    for (let question = 2; question <= 11; question += 1) {
      await pressArrow(question % 2 !== 0);
      if (question < 11) await waitForText(`${question + 1} из 11`);
    }

    await waitForText("Кажется, вам стоит познакомиться");
    await sleep(320);
    const revealSequence = await evaluate(`(() => {
      const topline = document.querySelector('.reveal-topline');
      const visual = document.querySelector('.reveal-visual');
      const action = document.querySelector('.reveal-screen .screen-actions');
      return {
        toplineOpacity: topline ? Number.parseFloat(getComputedStyle(topline).opacity) : null,
        visualOpacity: visual ? Number.parseFloat(getComputedStyle(visual).opacity) : null,
        actionOpacity: action ? Number.parseFloat(getComputedStyle(action).opacity) : null,
      };
    })()`);
    if (
      revealSequence.toplineOpacity === null
      || revealSequence.toplineOpacity < 0.04
      || revealSequence.visualOpacity === null
      || revealSequence.visualOpacity > 0.08
      || revealSequence.actionOpacity === null
      || revealSequence.actionOpacity > 0.04
    ) {
      throw new Error(`Match reveal is no longer staged: ${JSON.stringify(revealSequence)}`);
    }
    await sleep(2_800);
    const celebration = await evaluate(`(() => ({
      particles: document.querySelectorAll('.reveal-particle').length,
      orbitFields: document.querySelectorAll('.orbit-field--reveal').length,
      pulseRings: document.querySelectorAll('.reveal-photo-pulse').length,
      photoOpacity: Number.parseFloat(getComputedStyle(document.querySelector('.reveal-photo')).opacity),
    }))()`);
    if (
      celebration.particles !== 0
      || celebration.orbitFields !== 1
      || celebration.pulseRings !== 1
      || celebration.photoOpacity < 0.98
    ) {
      throw new Error(`Unexpected match reveal: ${JSON.stringify(celebration)}`);
    }
    await capture("smoke-match-mobile.png");
    await clickButton("Познакомиться");
    await waitForText("Выберите направление знакомства");
    await sleep(950);
    const initialHub = await evaluate(`(() => {
      const ring = document.querySelector('.passport-portrait__progress--segments')?.getBoundingClientRect();
      const photo = document.querySelector('.passport-portrait__photo')?.getBoundingClientRect();
      return ({
      nodes: document.querySelectorAll('[data-mission-id]').length,
      available: document.querySelectorAll('[data-mission-status="available"]').length,
      atmospheres: document.querySelectorAll('.mission-atmosphere').length,
      progressDots: document.querySelectorAll('.passport-orbit-progress__dot').length,
      ringThickness: ring && photo ? (ring.width - photo.width) / 2 : null,
      goalSections: document.querySelectorAll('.passport-goal').length,
      legacyTeamPanels: document.querySelectorAll('.passport-panel--team').length,
      headerStatuses: document.querySelectorAll('.passport-hub-screen .header-status').length,
      menuButtons: document.querySelectorAll('.passport-hub-screen .foundation-menu-trigger').length,
      screenLeft: document.querySelector('.passport-hub-screen')?.getBoundingClientRect().left ?? null,
      screenRight: document.querySelector('.passport-hub-screen')?.getBoundingClientRect().right ?? null,
      viewportWidth: window.innerWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      });
    })()`);
    if (
      initialHub.nodes !== 4
      || initialHub.available !== 4
      || initialHub.atmospheres !== 4
      || initialHub.progressDots !== 4
      || initialHub.ringThickness === null
      || initialHub.ringThickness < 6
      || initialHub.ringThickness > 12
      || initialHub.goalSections !== 1
      || initialHub.legacyTeamPanels !== 0
      || initialHub.headerStatuses !== 0
      || initialHub.menuButtons !== 1
      || initialHub.screenLeft === null
      || Math.abs(initialHub.screenLeft) > 1
      || initialHub.screenRight === null
      || Math.abs(initialHub.screenRight - initialHub.viewportWidth) > 1
      || initialHub.overflow > 1
    ) {
      throw new Error(`Initial passport hub regression: ${JSON.stringify(initialHub)}`);
    }
    await capture("smoke-passport-mobile.png");
    await openMissionNode("trust");
    await evaluate("document.querySelector('.journey-screen .icon-button')?.click()");
    await waitForText("Выберите направление знакомства");
    const startedStatus = await evaluate(
      "document.querySelector('[data-mission-id=\"trust\"]')?.dataset.missionStatus ?? null",
    );
    if (startedStatus !== "started") {
      throw new Error(`Started mission status was not preserved: ${startedStatus}`);
    }

    await openMissionNode("food");
    await waitForText("Соберите день");
    const dayGameMetrics = await evaluate(`(() => {
      const game = document.querySelector('[data-testid="day-game"]');
      const scene = document.querySelector('[data-testid="day-scene"]');
      const choices = [...document.querySelectorAll('[data-testid="day-choice"]')]
        .map((choice) => {
          const rect = choice.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            touchAction: getComputedStyle(choice).touchAction,
          };
        });
      return {
        activeScene: game?.dataset.activeScene ?? null,
        progressItems: document.querySelectorAll('[data-day-progress]').length,
        choices,
        sceneWidth: scene?.getBoundingClientRect().width ?? null,
        viewportWidth: innerWidth,
        realAnimalPhotos: document.querySelectorAll('.journey-screen img[src*="/assets/animals/"]').length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        legacyDragNodes: document.querySelectorAll('.day-activity, [data-day-slot]').length,
        correctChoices: document.querySelectorAll('[data-testid="day-choice"][data-choice-correct="true"]').length,
        headerStatuses: document.querySelectorAll('.journey-screen--day-game .header-status').length,
        menuButtons: [...document.querySelectorAll('.journey-screen--day-game button')]
          .filter((button) => button.textContent?.trim() === "Меню").length,
        numericProgressCopies: document.querySelectorAll('.day-game__progress-copy').length,
      };
    })()`);
    if (
      dayGameMetrics.activeScene !== "morning"
      || dayGameMetrics.progressItems !== 4
      || dayGameMetrics.choices.length !== 3
      || dayGameMetrics.choices.some((choice) => choice.width < 44 || choice.height < 44 || choice.touchAction === "none")
      || dayGameMetrics.sceneWidth === null
      || dayGameMetrics.sceneWidth > dayGameMetrics.viewportWidth
      || dayGameMetrics.realAnimalPhotos !== 0
      || dayGameMetrics.overflow > 1
      || dayGameMetrics.legacyDragNodes !== 0
      || dayGameMetrics.correctChoices !== 1
      || dayGameMetrics.headerStatuses !== 0
      || dayGameMetrics.menuButtons !== 1
      || dayGameMetrics.numericProgressCopies !== 0
    ) {
      throw new Error(`Day game mobile regression: ${JSON.stringify(dayGameMetrics)}`);
    }
    await capture("smoke-day-game-morning-mobile.png");
    await tapSelector('[data-testid="day-scene"][data-day-scene="morning"] [data-testid="day-choice"][data-choice-correct="false"]');
    await waitForSelector('.day-scene__feedback--incorrect');
    await sleep(320);
    await capture("smoke-day-game-wrong-mobile.png");
    const morningRetry = await evaluate(`(() => ({
      scene: document.querySelector('[data-testid="day-game"]')?.dataset.activeScene ?? null,
      message: document.querySelector('.day-scene__feedback--incorrect')?.textContent?.trim() ?? "",
    }))()`);
    if (morningRetry.scene !== "morning" || !morningRetry.message) {
      throw new Error(`Mobile incorrect choice regression: ${JSON.stringify(morningRetry)}`);
    }
    await tapSelector('[data-testid="day-scene"][data-day-scene="morning"] [data-testid="day-choice"][data-choice-correct="true"]');
    await waitForSelector('[data-testid="day-scene"][data-day-scene="day"]', true, 3_000);
    await capture("smoke-day-game-day-mobile.png");
    await evaluate("document.querySelector('.day-scene__back')?.click()");
    await waitForSelector('[data-testid="day-scene"][data-day-scene="morning"]', true, 3_000);
    await evaluate("document.querySelector('.journey-screen .icon-button')?.click()");
    await waitForText("Выберите направление знакомства");

    const missionOrder = ["trust", "food", "home", "health"];
    for (let mission = 0; mission < missionOrder.length; mission += 1) {
      await openMissionNode(missionOrder[mission]);
      const disabledCta = await evaluate(`(() => {
        const button = document.querySelector('.sticky-actions .button');
        if (!button) return null;
        const style = getComputedStyle(button);
        return {
          disabled: button.disabled,
          cursor: style.cursor,
          background: style.backgroundColor,
          text: button.textContent?.trim() ?? "",
        };
      })()`);
      const isDayMission = missionOrder[mission] === "food";
      const isHealthMission = missionOrder[mission] === "health";
      if (
        !disabledCta
        || (
          isDayMission
            ? disabledCta.disabled || disabledCta.text !== "Вернуться"
            : !disabledCta.disabled || disabledCta.cursor !== "not-allowed"
        )
      ) {
        throw new Error(`Mission CTA is not clearly disabled: ${JSON.stringify(disabledCta)}`);
      }
      if (isHealthMission) {
        await waitForSelector(".health-silhouette__pet");
        await sleep(300);
        const healthMap = await evaluate(`(() => {
          const zones = [...document.querySelectorAll('[data-testid="health-zone"]')];
          const rects = zones.map((zone) => zone.getBoundingClientRect());
          const pet = document.querySelector('.health-silhouette__pet');
          const silhouette = document.querySelector('.health-silhouette');
          return {
            zones: zones.length,
            available: zones.filter((zone) => zone.dataset.zoneComplete === "false").length,
            petLoaded: pet instanceof HTMLImageElement && pet.complete && pet.naturalWidth > 0,
            petSource: pet instanceof HTMLImageElement ? pet.currentSrc : "",
            clinicBackground: silhouette ? getComputedStyle(silhouette).backgroundImage : "",
            markers: zones.map((zone) => zone.querySelector('.health-zone__marker')?.textContent?.trim() ?? ""),
            hasZoneProgress: Boolean(document.querySelector('.health-game__progress')),
            minWidth: rects.length ? Math.min(...rects.map((rect) => rect.width)) : 0,
            minHeight: rects.length ? Math.min(...rects.map((rect) => rect.height)) : 0,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        })()`);
        if (
          healthMap.zones !== 6
          || healthMap.available !== 6
          || !healthMap.petLoaded
          || !healthMap.petSource.endsWith(".webp")
          || !healthMap.clinicBackground.includes("health-clinic.webp")
          || healthMap.markers.some((marker) => marker !== "!")
          || healthMap.hasZoneProgress
          || healthMap.minWidth < 44
          || healthMap.minHeight < 44
          || healthMap.overflow > 1
        ) {
          throw new Error(`Health map regression: ${JSON.stringify(healthMap)}`);
        }
        await capture("smoke-health-map-mobile.png");
      }
      await solveVisibleMission();
      await sleep(240);
      const activeCta = await evaluate(`(() => {
        const button = document.querySelector('.sticky-actions .button');
        if (!button) return null;
        const style = getComputedStyle(button);
        return {
          disabled: button.disabled,
          cursor: style.cursor,
          background: style.backgroundColor,
          backgroundImage: style.backgroundImage,
        };
      })()`);
      if (
        !activeCta
        || activeCta.disabled
        || activeCta.cursor !== "pointer"
        || (
          activeCta.background !== "rgb(35, 71, 33)"
          && activeCta.background !== "rgb(247, 109, 49)"
          && activeCta.backgroundImage === "none"
        )
      ) {
        throw new Error(`Mission CTA is not clearly active: ${JSON.stringify(activeCta)}`);
      }
      if (missionOrder[mission] === "food") await capture("smoke-day-game-complete-mobile.png");
      if (mission === 0) await capture("smoke-journey-mobile.png");
      await clickButton(isDayMission ? "Вернуться" : "Сохранить и вернуться");
      await waitForText("Выберите направление знакомства");
      const completedStatus = await evaluate(
        `document.querySelector('[data-mission-id="${missionOrder[mission]}"]')?.dataset.missionStatus ?? null`,
      );
      if (completedStatus !== "completed") {
        throw new Error(`Mission did not become completed: ${missionOrder[mission]} -> ${completedStatus}`);
      }
    }

    await waitForText("Стать частью команды");
    await sleep(1_100);
    await capture("smoke-passport-complete-mobile.png");
    await clickButton("Стать опекуном");
    await waitForText("Одному человеку не нужно делать всё");
    await capture("smoke-team-mobile.png");
    await clickButton("Завершить паспорт");
    await waitForText("Сегодня вы были рядом");

    const cardStartedAt = Date.now();
    while (Date.now() - cardStartedAt < 8_000) {
      if (await evaluate("Boolean(document.querySelector('.result-card-preview'))")) break;
      await sleep(100);
    }
    const cardReady = await evaluate("Boolean(document.querySelector('.result-card-preview'))");
    if (!cardReady) throw new Error("Result card was not generated");

    await capture("smoke-final-mobile.png");
    await evaluate("window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");
    await sleep(120);
    await capture("smoke-final-actions-mobile.png");
    const finalHeading = await evaluate("document.querySelector('.final-copy h1')?.innerText ?? ''");

    await evaluate("localStorage.clear()");
    await cdp.call("Emulation.setDeviceMetricsOverride", {
      width: 768,
      height: 1024,
      deviceScaleFactor: 1,
      mobile: true,
    });
    const tabletLoaded = cdp.once("Page.loadEventFired");
    await cdp.call("Page.reload", { ignoreCache: true });
    await tabletLoaded;
    await sleep(1_200);
    await waitForText("Начать знакомство");
    const tabletMetrics = await evaluate(`(() => {
      const button = document.querySelector('[data-testid="primary-cta"]');
      const rect = button?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        buttonTop: rect?.top ?? null,
        buttonBottom: rect?.bottom ?? null,
        buttonHeight: rect?.height ?? null,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    })()`);
    if (
      tabletMetrics.buttonTop === null
      || tabletMetrics.buttonTop < 0
      || tabletMetrics.buttonBottom > tabletMetrics.viewportHeight
      || tabletMetrics.buttonHeight < 44
      || tabletMetrics.overflow > 1
    ) {
      throw new Error(`Tablet landing regression: ${JSON.stringify(tabletMetrics)}`);
    }
    await capture("smoke-welcome-tablet.png");

    await clickButton("Начать знакомство");
    await waitForText("1 из 11");
    await capture("smoke-quiz-tablet.png");
    for (let question = 1; question <= 11; question += 1) {
      await pressArrow(question % 2 !== 0);
      if (question < 11) await waitForText(`${question + 1} из 11`);
    }
    await waitForText("Кажется, вам стоит познакомиться");
    await sleep(2_900);
    await clickButton("Познакомиться");
    await waitForText("Выберите направление знакомства");
    await sleep(900);
    const tabletHubMetrics = await evaluate(`(() => {
      const nodes = [...document.querySelectorAll('[data-mission-id]')]
        .map((node) => node.getBoundingClientRect());
      return {
        nodeCount: nodes.length,
        minNodeHeight: Math.min(...nodes.map((rect) => rect.height)),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    })()`);
    if (
      tabletHubMetrics.nodeCount !== 4
      || tabletHubMetrics.minNodeHeight < 44
      || tabletHubMetrics.overflow > 1
    ) {
      throw new Error(`Tablet passport hub regression: ${JSON.stringify(tabletHubMetrics)}`);
    }
    await capture("smoke-passport-tablet.png");
    await openMissionNode("home");
    const tabletJourneyMetrics = await evaluate(`(() => {
      const layout = document.querySelector('.journey-layout');
      const animal = document.querySelector('.journey-animal');
      const content = document.querySelector('.journey-content');
      const cta = document.querySelector('.sticky-actions .button');
      const layoutRect = layout?.getBoundingClientRect();
      const animalRect = animal?.getBoundingClientRect();
      const contentRect = content?.getBoundingClientRect();
      const ctaRect = cta?.getBoundingClientRect();
      return {
        layoutWidth: layoutRect?.width ?? null,
        heightDelta: animalRect && contentRect ? Math.abs(animalRect.height - contentRect.height) : null,
        ctaBottom: ctaRect?.bottom ?? null,
        viewportHeight: window.innerHeight,
      };
    })()`);
    if (
      tabletJourneyMetrics.layoutWidth === null
      || tabletJourneyMetrics.heightDelta === null
      || tabletJourneyMetrics.heightDelta > 4
      || tabletJourneyMetrics.ctaBottom > tabletJourneyMetrics.viewportHeight
    ) {
      throw new Error(`Tablet journey grid regression: ${JSON.stringify(tabletJourneyMetrics)}`);
    }
    await capture("smoke-journey-tablet.png");

    await reloadAt(375, 812, true);
    await assertPrimaryCtaInViewport("375px reduced-motion");
    await capture("smoke-welcome-375.png");
    await clickButton("Меню");
    await waitForText("Все подопечные");
    await sleep(450);
    await capture("smoke-welcome-menu-375.png");
    await clickButton("Закрыть");
    await evaluate("document.querySelector('.site-footer')?.scrollIntoView({ block: 'start' })");
    await sleep(300);
    const footerGridContent = await evaluate(
      "getComputedStyle(document.querySelector('.site-footer'), '::before').content",
    );
    if (footerGridContent !== "none" && footerGridContent !== "normal") {
      throw new Error(`Footer grid pseudo-element is still active: ${footerGridContent}`);
    }
    await capture("smoke-footer-375.png");
    await clickButton("Публичная оферта");
    await waitForSelector('[data-testid="legal-center"]');
    await waitForText("Публичная оферта о заключении договора пожертвования");
    await sleep(450);
    const legalOfferMetrics = await evaluate(`(() => ({
      hash: location.hash,
      activeText: document.activeElement?.textContent?.trim() ?? null,
      bodyLocked: getComputedStyle(document.body).overflow,
      copyLength: document.querySelector('.legal-copy')?.textContent?.trim().length ?? 0,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }))()`);
    if (
      legalOfferMetrics.hash !== "#legal/offer"
      || !legalOfferMetrics.activeText?.includes("Закрыть")
      || legalOfferMetrics.bodyLocked !== "hidden"
      || legalOfferMetrics.copyLength < 1_000
      || legalOfferMetrics.overflow > 1
    ) {
      throw new Error(`Local legal center regression: ${JSON.stringify(legalOfferMetrics)}`);
    }
    await capture("smoke-legal-offer-375.png");
    const officialDocumentLabelCount = await evaluate(
      "document.querySelectorAll('.legal-center__paper-header > span').length",
    );
    if (officialDocumentLabelCount !== 0) {
      throw new Error(`Legal service label is still visible: ${officialDocumentLabelCount}`);
    }
    await clickDialogButton("Политика конфиденциальности");
    await waitForText("Политика в отношении обработки персональных данных");
    const privacyHash = await evaluate("location.hash");
    if (privacyHash !== "#legal/privacy") throw new Error(`Legal document hash regression: ${privacyHash}`);
    await cdp.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await cdp.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await waitForSelector('[data-testid="legal-center"]', false);
    await evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
    await clickButton("Начать знакомство");
    await waitForText("1 из 11");
    for (let question = 1; question <= 11; question += 1) {
      await pressArrow(question % 2 !== 0);
      if (question < 11) await waitForText(`${question + 1} из 11`);
    }
    await waitForText("Кажется, вам стоит познакомиться");
    await sleep(160);
    const reducedReveal = await evaluate(`(() => {
      const visual = document.querySelector('.reveal-visual');
      const style = visual ? getComputedStyle(visual) : null;
      return {
        particles: document.querySelectorAll('.reveal-particle').length,
        orbitFields: document.querySelectorAll('.orbit-field--reveal').length,
        pulseRings: document.querySelectorAll('.reveal-photo-pulse').length,
        opacity: style ? Number.parseFloat(style.opacity) : null,
        transform: style?.transform ?? null,
      };
    })()`);
    if (
      reducedReveal.particles !== 0
      || reducedReveal.orbitFields !== 1
      || reducedReveal.pulseRings !== 0
      || reducedReveal.opacity === null
      || reducedReveal.opacity < 0.99
      || (reducedReveal.transform !== "none" && reducedReveal.transform !== "matrix(1, 0, 0, 1, 0, 0)")
    ) {
      throw new Error(`Reduced-motion reveal regression: ${JSON.stringify(reducedReveal)}`);
    }
    await capture("smoke-match-reduced-motion.png");

    await reloadAt(1024, 768, false);
    await assertPrimaryCtaInViewport("1024px");
    await capture("smoke-welcome-1024.png");

    await reloadAt(1920, 1080, false);
    await assertPrimaryCtaInViewport("1920px");
    await capture("smoke-welcome-1920.png");
    await clickButton("Начать знакомство");
    await waitForText("1 из 11");
    await dragCardWithMouse(84, false);
    const mouseDraggedState = await evaluate(`(() => {
      const card = document.querySelector('[data-testid="swipe-card"]');
      if (!card) return null;
      const matrix = new DOMMatrix(getComputedStyle(card).transform);
      return {
        x: matrix.m41,
        angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
      };
    })()`);
    if (!mouseDraggedState || mouseDraggedState.x < 68 || mouseDraggedState.angle < 2) {
      throw new Error(`Mouse drag does not follow the cursor: ${JSON.stringify(mouseDraggedState)}`);
    }
    await capture("smoke-quiz-drag-1440.png");
    const mouseCenter = await getSwipeCardCenter();
    await cdp.call("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: mouseCenter?.x ?? 0,
      y: mouseCenter?.y ?? 0,
      button: "left",
      buttons: 0,
      clickCount: 1,
    });
    await sleep(600);
    await capture("smoke-quiz-1440.png");
    for (let question = 1; question <= 11; question += 1) {
      await pressArrow(question % 2 !== 0);
      if (question < 11) await waitForText(`${question + 1} из 11`);
    }
    await waitForText("Кажется, вам стоит познакомиться");
    await sleep(3_150);
    const desktopReveal = await evaluate(`(() => {
      const screen = document.querySelector('.reveal-screen')?.getBoundingClientRect();
      const layout = document.querySelector('.reveal-layout')?.getBoundingClientRect();
      const visual = document.querySelector('.reveal-visual')?.getBoundingClientRect();
      const copy = document.querySelector('.reveal-copy')?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        screenLeft: screen?.left ?? null,
        screenRight: screen?.right ?? null,
        layoutWidth: layout?.width ?? null,
        visualRight: visual?.right ?? null,
        copyLeft: copy?.left ?? null,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    })()`);
    if (
      desktopReveal.layoutWidth === null
      || desktopReveal.layoutWidth < 900
      || desktopReveal.screenLeft === null
      || Math.abs(desktopReveal.screenLeft) > 1
      || desktopReveal.screenRight === null
      || Math.abs(desktopReveal.screenRight - desktopReveal.viewportWidth) > 1
      || desktopReveal.visualRight === null
      || desktopReveal.copyLeft === null
      || desktopReveal.visualRight >= desktopReveal.copyLeft
      || desktopReveal.overflow > 1
    ) {
      throw new Error(`Desktop match reveal regression: ${JSON.stringify(desktopReveal)}`);
    }
    await capture("smoke-match-1920.png");
    await clickButton("Познакомиться");
    await waitForText("Выберите направление знакомства");
    await sleep(800);
    const desktopHub = await evaluate(`(() => {
      const screen = document.querySelector('.passport-hub-screen')?.getBoundingClientRect();
      const hub = document.querySelector('.passport-hub')?.getBoundingClientRect();
      const portrait = document.querySelector('.passport-portrait')?.getBoundingClientRect();
      const nodes = [...document.querySelectorAll('[data-mission-id]')]
        .map((node) => node.getBoundingClientRect());
      return {
        viewportWidth: innerWidth,
        screenLeft: screen?.left ?? null,
        screenRight: screen?.right ?? null,
        hubWidth: hub?.width ?? null,
        portraitWidth: portrait?.width ?? null,
        nodeCount: nodes.length,
        distinctNodePositions: new Set(nodes.map((rect) => Math.round(rect.x) + ':' + Math.round(rect.y))).size,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    })()`);
    if (
      desktopHub.screenLeft === null
      || Math.abs(desktopHub.screenLeft) > 1
      || desktopHub.screenRight === null
      || Math.abs(desktopHub.screenRight - desktopHub.viewportWidth) > 1
      || desktopHub.hubWidth === null
      || desktopHub.hubWidth < 1100
      || desktopHub.portraitWidth === null
      || desktopHub.portraitWidth < 270
      || desktopHub.nodeCount !== 4
      || desktopHub.distinctNodePositions !== 4
      || desktopHub.overflow > 1
    ) {
      throw new Error(`Desktop passport hub regression: ${JSON.stringify(desktopHub)}`);
    }
    await capture("smoke-passport-1920.png");
    await openMissionNode("food");
    await waitForSelector('[data-testid="day-scene"][data-day-scene="morning"]');
    await sleep(1_000);
    const desktopDayGame = await evaluate(`(() => {
      const screen = document.querySelector('.journey-screen--day-game')?.getBoundingClientRect();
      const scene = document.querySelector('[data-testid="day-scene"]')?.getBoundingClientRect();
      const choices = [...document.querySelectorAll('[data-testid="day-choice"]')]
        .map((choice) => choice.getBoundingClientRect());
      const art = document.querySelector('.day-scene__background');
      const character = document.querySelector('.day-character img');
      return {
        viewportWidth: innerWidth,
        screenLeft: screen?.left ?? null,
        screenRight: screen?.right ?? null,
        sceneWidth: scene?.width ?? null,
        choices: choices.length,
        correctChoices: document.querySelectorAll('[data-testid="day-choice"][data-choice-correct="true"]').length,
        minChoiceHeight: choices.length ? Math.min(...choices.map((rect) => rect.height)) : 0,
        artLoaded: art instanceof HTMLImageElement && art.complete && art.naturalWidth > 0,
        characterLoaded: character instanceof HTMLImageElement && character.complete && character.naturalWidth > 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    })()`);
    if (
      desktopDayGame.screenLeft === null
      || Math.abs(desktopDayGame.screenLeft) > 1
      || desktopDayGame.screenRight === null
      || Math.abs(desktopDayGame.screenRight - desktopDayGame.viewportWidth) > 1
      || desktopDayGame.sceneWidth === null
      || desktopDayGame.sceneWidth < 1100
      || desktopDayGame.choices !== 3
      || desktopDayGame.correctChoices !== 1
      || desktopDayGame.minChoiceHeight < 44
      || !desktopDayGame.artLoaded
      || !desktopDayGame.characterLoaded
      || desktopDayGame.overflow > 1
    ) {
      throw new Error(`Desktop day game regression: ${JSON.stringify(desktopDayGame)}`);
    }
    await capture("smoke-day-game-1920.png");
    await evaluate("document.querySelector('.journey-screen .icon-button')?.click()");
    await waitForText("Выберите направление знакомства");
    await openMissionNode("health");
    await waitForSelector('[data-testid="health-game"][data-health-phase="map"]');
    await sleep(500);
    const desktopHealthGame = await evaluate(`(() => {
      const screen = document.querySelector('.journey-screen--health-game .journey-layout')?.getBoundingClientRect();
      const pet = document.querySelector('.health-silhouette__pet');
      const silhouetteElement = document.querySelector('.health-silhouette');
      const silhouette = silhouetteElement?.getBoundingClientRect();
      const panel = document.querySelector('.health-game__panel')?.getBoundingClientRect();
      const zoneElements = [...document.querySelectorAll('[data-testid="health-zone"]')];
      const zones = zoneElements.map((zone) => zone.getBoundingClientRect());
      const labels = [...document.querySelectorAll('.health-zone__label')]
        .map((label) => getComputedStyle(label));
      return {
        viewportWidth: innerWidth,
        screenLeft: screen?.left ?? null,
        screenRight: screen?.right ?? null,
        petLoaded: pet instanceof HTMLImageElement && pet.complete && pet.naturalWidth > 0,
        petSource: pet instanceof HTMLImageElement ? pet.currentSrc : "",
        silhouetteWidth: silhouette?.width ?? null,
        clinicBackground: silhouetteElement ? getComputedStyle(silhouetteElement).backgroundImage : "",
        panelWidth: panel?.width ?? null,
        zones: zones.length,
        markers: zoneElements.map((zone) => zone.querySelector('.health-zone__marker')?.textContent?.trim() ?? ""),
        hasZoneProgress: Boolean(document.querySelector('.health-game__progress')),
        visibleLabels: labels.filter((style) => Number(style.opacity) > 0.1 && style.visibility === "visible").length,
        minZoneWidth: zones.length ? Math.min(...zones.map((rect) => rect.width)) : 0,
        minZoneHeight: zones.length ? Math.min(...zones.map((rect) => rect.height)) : 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    })()`);
    if (
      desktopHealthGame.screenLeft === null
      || desktopHealthGame.screenLeft < 250
      || desktopHealthGame.screenRight === null
      || desktopHealthGame.screenRight > desktopHealthGame.viewportWidth
      || !desktopHealthGame.petLoaded
      || !desktopHealthGame.petSource.endsWith(".webp")
      || desktopHealthGame.silhouetteWidth === null
      || desktopHealthGame.silhouetteWidth < 900
      || !desktopHealthGame.clinicBackground.includes("health-clinic.webp")
      || desktopHealthGame.panelWidth !== null
      || desktopHealthGame.zones !== 6
      || desktopHealthGame.markers.some((marker) => marker !== "!")
      || desktopHealthGame.hasZoneProgress
      || desktopHealthGame.visibleLabels !== 0
      || desktopHealthGame.minZoneWidth < 44
      || desktopHealthGame.minZoneHeight < 44
      || desktopHealthGame.overflow > 1
    ) {
      throw new Error(`Desktop health game regression: ${JSON.stringify(desktopHealthGame)}`);
    }
    await capture("smoke-health-map-1920.png");
    const earsZoneCenter = await evaluate(`(() => {
      const rect = document
        .querySelector('[data-testid="health-zone"][data-zone-id="ears"]')
        ?.getBoundingClientRect();
      return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
    })()`);
    if (!earsZoneCenter) throw new Error("Health ears zone was not rendered for hover check");
    await cdp.call("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: earsZoneCenter.x,
      y: earsZoneCenter.y,
    });
    await sleep(420);
    const hoverLabel = await evaluate(`(() => {
      const label = document
        .querySelector('[data-testid="health-zone"][data-zone-id="ears"] .health-zone__label');
      if (!label) return null;
      const style = getComputedStyle(label);
      return { text: label.textContent?.trim() ?? "", opacity: Number(style.opacity), visibility: style.visibility };
    })()`);
    if (
      !hoverLabel
      || hoverLabel.text !== "Уши"
      || hoverLabel.opacity < 0.9
      || hoverLabel.visibility !== "visible"
    ) {
      throw new Error(`Health hover label regression: ${JSON.stringify(hoverLabel)}`);
    }
    await capture("smoke-health-map-hover-1920.png");
    await evaluate(
      "document.querySelector('[data-testid=\"health-zone\"][data-zone-id=\"ears\"]')?.click()",
    );
    await waitForSelector('[data-testid="health-situation"][data-zone-id="ears"]');
    await evaluate(
      "document.querySelector('[data-testid=\"health-situation\"][data-zone-id=\"ears\"] [data-testid=\"health-action\"][data-choice-correct=\"false\"]')?.click()",
    );
    await waitForSelector('.health-feedback--learning');
    await sleep(520);
    await capture("smoke-health-feedback-1920.png");
    await evaluate(`localStorage.setItem("nika-team-care-mvp-v1", JSON.stringify({
      version: 2,
      stage: "journey",
      answers: [],
      animalId: "pita-21",
      activeMissionId: "health",
      startedMissionIds: ["health"],
      completedMissionIds: [],
      updatedAt: new Date().toISOString(),
    }))`);
    const dogHealthReloaded = cdp.once("Page.loadEventFired");
    await cdp.call("Page.reload", { ignoreCache: true });
    await dogHealthReloaded;
    await waitForSelector('[data-testid="health-game"][data-health-phase="map"]');
    await sleep(1_400);
    const dogHealthMap = await evaluate(`(() => {
      const pet = document.querySelector('.health-silhouette__pet');
      const zones = [...document.querySelectorAll('[data-testid="health-zone"]')];
      return {
        petLoaded: pet instanceof HTMLImageElement && pet.complete && pet.naturalWidth > 0,
        petSource: pet instanceof HTMLImageElement ? pet.currentSrc : "",
        speciesClass: document.querySelector('.health-silhouette')?.className ?? "",
        zones: zones.length,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    })()`);
    if (
      !dogHealthMap.petLoaded
      || !dogHealthMap.petSource.endsWith("/assets/health/health-dog.webp")
      || !dogHealthMap.speciesClass.includes("health-silhouette--dog")
      || dogHealthMap.zones !== 6
      || dogHealthMap.overflow > 1
    ) {
      throw new Error(`Desktop dog health map regression: ${JSON.stringify(dogHealthMap)}`);
    }
    await reloadAt(1920, 1080, false);
    await evaluate("document.querySelector('.site-footer')?.scrollIntoView({ block: 'end' })");
    await sleep(300);
    await capture("smoke-footer-1440.png");
    await clickButton("Реквизиты");
    await waitForSelector('[data-testid="legal-center"]');
    await waitForText("Реквизиты благотворительного фонда");
    await sleep(450);
    await capture("smoke-legal-requisites-1440.png");
    await clickDialogButton("Закрыть");
    await waitForSelector('[data-testid="legal-center"]', false);

    await reloadAt(844, 390, false);
    await assertPrimaryCtaInViewport("landscape");
    await capture("smoke-welcome-landscape.png");

    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors:\n${consoleErrors.join("\n")}`);
    }

    console.log(`Smoke path passed: swipe + 11 questions + 4 missions + final card (${finalHeading})`);
    console.log(`Screenshots saved in ${artifactsDir}`);
  } finally {
    cdp?.close();
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGTERM");
      await Promise.race([exited, sleep(2_000)]);
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await rm(userDataDir, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await sleep(300);
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
