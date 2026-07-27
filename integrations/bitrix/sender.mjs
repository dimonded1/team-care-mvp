import { isBitrixFeatureEnabled, validateBitrixConfig } from "./config.mjs";

function endpointFor(webhookUrl, method) {
  return `${webhookUrl.replace(/\/$/, '')}/${method}.json`
}

/**
 * Sends a prepared mapper result. Keep this module on the server only: it may
 * read a webhook secret and must never be included in a Vite client bundle.
 */
export async function sendToBitrix(request, config, { fetch: fetchImpl = globalThis.fetch } = {}) {
  if (!config.enabled) return { status: "disabled" };
  if (request.feature && !isBitrixFeatureEnabled(config, request.feature)) {
    return { status: "disabled" };
  }

  validateBitrixConfig(config, request.feature);
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");

  const response = await fetchImpl(endpointFor(config.webhookUrl, request.method), {
    method: 'POST',
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request.payload),
  })

  if (!response.ok) throw new Error(`Bitrix request failed with HTTP ${response.status}`);

  if (request.responseMode === "json") {
    const body = await response.json();
    if (body?.error) throw new Error("Bitrix returned an application error");
    return {
      status: "sent",
      httpStatus: response.status,
      data: body?.result ?? null,
      next: Number.isFinite(body?.next) ? body.next : null,
    };
  }

  return { status: "sent", httpStatus: response.status };
}
