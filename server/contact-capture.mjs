import {
  createBitrixConfig,
  isBitrixFeatureEnabled,
  mapContactCapture,
  sendToBitrix,
} from "../integrations/bitrix/index.mjs";

export const CONTACT_BODY_LIMIT_BYTES = 16 * 1024;

export function createSlidingWindowRateLimiter({
  limit = 5,
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

  return {
    isEnabled() {
      return isBitrixFeatureEnabled(config, "contacts");
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
