import {
  createBitrixConfig,
  isBitrixFeatureEnabled,
  mapContactCapture,
  sendToBitrix,
  validateBitrixConfig,
} from "../integrations/bitrix/index.mjs";

export const CONTACT_BODY_LIMIT_BYTES = 16 * 1024;

export function createSlidingWindowRateLimiter({
  limit = 60,
  windowMs = 10 * 60 * 1000,
  now = () => Date.now(),
} = {}) {
  const buckets = new Map();

  return {
    consume(key) {
      const timestamp = now();
      const previous = buckets.get(key) ?? [];
      const active = previous.filter((value) => timestamp - value < windowMs);
      if (active.length >= limit) {
        buckets.set(key, active);
        return false;
      }
      active.push(timestamp);
      buckets.set(key, active);
      if (buckets.size > 1_000) {
        for (const [bucketKey, values] of buckets) {
          if (values.every((value) => timestamp - value >= windowMs)) buckets.delete(bucketKey);
        }
      }
      return true;
    },
    refund(key) {
      const values = buckets.get(key);
      if (!values?.length) return;
      values.pop();
      if (values.length === 0) buckets.delete(key);
    },
  };
}

/** Stores only opaque request IDs, never contact fields, to suppress retries. */
export function createRequestIdDeduplicator({
  ttlMs = 10 * 60 * 1000,
  maxEntries = 1_000,
  now = () => Date.now(),
} = {}) {
  const requests = new Map();

  function prune(timestamp) {
    for (const [requestId, request] of requests) {
      if (timestamp - request.claimedAt >= ttlMs) requests.delete(requestId);
    }
    while (requests.size > maxEntries) requests.delete(requests.keys().next().value);
  }

  return {
    claim(requestId) {
      if (!requestId || requestId.length > 128) return true;
      const timestamp = now();
      prune(timestamp);
      if (requests.has(requestId)) return false;
      requests.set(requestId, { claimedAt: timestamp, state: "pending" });
      prune(timestamp);
      return true;
    },
    complete(requestId) {
      if (!requestId || requestId.length > 128) return;
      const request = requests.get(requestId);
      if (request) request.state = "completed";
    },
    getState(requestId) {
      if (!requestId || requestId.length > 128) return null;
      prune(now());
      return requests.get(requestId)?.state ?? null;
    },
    release(requestId) {
      if (requestId) requests.delete(requestId);
    },
  };
}

export function parseAllowedOrigins(value = "") {
  return new Set(
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        try {
          return new URL(item).origin;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
}

export function isAllowedOrigin(origin, requestOrigin, configuredOrigins) {
  if (!origin) return true;
  try {
    const normalized = new URL(origin).origin;
    return configuredOrigins.size > 0
      ? configuredOrigins.has(normalized)
      : normalized === requestOrigin;
  } catch {
    return false;
  }
}

export function createContactCaptureService({
  env = process.env,
  fetch = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  const config = createBitrixConfig(env);
  const featureEnabled = isBitrixFeatureEnabled(config, "contacts");
  let configurationReady = false;
  if (featureEnabled) {
    try {
      validateBitrixConfig(config, "contacts");
      configurationReady = true;
    } catch {
      configurationReady = false;
    }
  }

  return {
    getStatus() {
      if (!featureEnabled) return "disabled";
      return configurationReady ? "enabled" : "unavailable";
    },
    isEnabled() {
      return configurationReady;
    },
    async submit(payload) {
      let request;
      try {
        request = mapContactCapture(payload, config, { now: now() });
      } catch (error) {
        error.status = 400;
        throw error;
      }

      let result;
      try {
        result = await sendToBitrix(request, config, { fetch });
      } catch (error) {
        error.status = 502;
        throw error;
      }
      if (result.status !== "sent") {
        const error = new Error("Contact capture is disabled");
        error.status = 503;
        error.code = "CONTACT_CAPTURE_DISABLED";
        throw error;
      }
      return { contactId: result.data ?? null };
    },
  };
}
