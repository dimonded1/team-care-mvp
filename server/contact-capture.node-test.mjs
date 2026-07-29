import assert from "node:assert/strict";
import test from "node:test";

import {
  createContactCaptureService,
  createRequestIdDeduplicator,
  createSlidingWindowRateLimiter,
  isAllowedOrigin,
  parseAllowedOrigins,
} from "./contact-capture.mjs";

const env = {
  BITRIX_ENABLED: "true",
  BITRIX_CONTACTS_ENABLED: "true",
  BITRIX_WEBHOOK_URL: "https://example.bitrix24.ru/rest/1/token",
  BITRIX_WEBHOOK_SECRET: "server-only-secret",
  BITRIX_CONTACT_SOURCE_ID: "WEB",
  BITRIX_CONTACT_FIELD_TELEGRAM: "UF_CRM_TELEGRAM",
  BITRIX_CONTACT_FIELD_ABOUT: "UF_CRM_ABOUT",
  BITRIX_CONTACT_FIELD_WORK_SPHERE: "UF_CRM_WORK",
  BITRIX_CONTACT_FIELD_HOBBIES: "UF_CRM_HOBBIES",
  BITRIX_CONTACT_FIELD_PETS: "UF_CRM_PETS",
  BITRIX_CONTACT_FIELD_PREFERRED_CONTACT: "UF_CRM_PREFERRED",
  BITRIX_CONTACT_FIELD_MAX: "UF_CRM_MAX",
  BITRIX_CONTACT_FIELD_INTEREST: "UF_CRM_INTEREST",
  BITRIX_CONTACT_FIELD_CONSENT: "UF_CRM_CONSENT",
  BITRIX_CONTACT_FIELD_CONSENT_AT: "UF_CRM_CONSENT_AT",
  BITRIX_CONTACT_FIELD_SUBMITTED_AT: "UF_CRM_SUBMITTED_AT",
  BITRIX_CONTACT_INTEREST_GUARDIANSHIP_ENUM_ID: "501",
  BITRIX_CONTACT_WORK_PUBLIC_SERVICE_ENUM_ID: "601",
  BITRIX_CONTACT_WORK_BUDGET_ORGANIZATION_ENUM_ID: "602",
  BITRIX_CONTACT_WORK_MEDIA_ENUM_ID: "603",
  BITRIX_CONTACT_WORK_RESEARCH_ENUM_ID: "604",
  BITRIX_CONTACT_WORK_SOCIAL_ENTERPRISE_ENUM_ID: "605",
  BITRIX_CONTACT_WORK_SELF_EMPLOYED_ENUM_ID: "606",
  BITRIX_CONTACT_WORK_RUSSIAN_BUSINESS_ENUM_ID: "607",
  BITRIX_CONTACT_WORK_INTERNATIONAL_BUSINESS_ENUM_ID: "608",
  BITRIX_CONTACT_WORK_SOCIAL_NONPROFIT_ENUM_ID: "609",
  BITRIX_CONTACT_WORK_OTHER_ENUM_ID: "610",
  BITRIX_CONTACT_PREFERRED_WHATSAPP_ENUM_ID: "701",
  BITRIX_CONTACT_PREFERRED_PHONE_ENUM_ID: "702",
  BITRIX_CONTACT_PREFERRED_EMAIL_ENUM_ID: "703",
  BITRIX_CONTACT_PREFERRED_TELEGRAM_ENUM_ID: "704",
  BITRIX_CONTACT_PREFERRED_MAX_ENUM_ID: "705",
};

const validPayload = {
  firstName: "Анна",
  lastName: "Иванова",
  middleName: "Сергеевна",
  phone: "+7 900 000-00-00",
  email: "anna@example.org",
  workSphere: "media",
  preferredContact: "telegram",
  animalId: "mira",
  animalName: "Мира",
  consent: true,
};

test("contact service sends only a validated mapped request", async () => {
  let call;
  const service = createContactCaptureService({
    env,
    now: () => new Date("2026-07-27T12:00:00.000Z"),
    fetch: async (url, options) => {
      call = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: 123 }),
      };
    },
  });

  const result = await service.submit(validPayload);
  assert.equal(service.isEnabled(), true);
  assert.deepEqual(result, { contactId: 123 });
  assert.match(call.url, /crm\.contact\.add\.json$/);
  assert.equal(JSON.stringify(call).includes("server-only-secret"), false);
  assert.equal(JSON.parse(call.options.body).fields.NAME, "Анна");
  assert.equal(JSON.parse(call.options.body).fields.UF_CRM_WORK, "603");
});

test("disabled contact service never calls Bitrix", async () => {
  const service = createContactCaptureService({
    env: { ...env, BITRIX_CONTACTS_ENABLED: "false" },
    fetch: () => assert.fail("fetch must not be called"),
  });

  assert.equal(service.isEnabled(), false);
  await assert.rejects(service.submit(validPayload), /disabled/i);
});

test("rate limiter uses a bounded sliding window", () => {
  let timestamp = 1_000;
  const limiter = createSlidingWindowRateLimiter({
    limit: 2,
    windowMs: 1_000,
    now: () => timestamp,
  });

  assert.equal(limiter.consume("ip"), true);
  assert.equal(limiter.consume("ip"), true);
  assert.equal(limiter.consume("ip"), false);
  timestamp += 1_001;
  assert.equal(limiter.consume("ip"), true);
});

test("request ID deduplicator suppresses retries without retaining contact data", () => {
  let timestamp = 1_000;
  const deduplicator = createRequestIdDeduplicator({
    ttlMs: 1_000,
    maxEntries: 2,
    now: () => timestamp,
  });

  assert.equal(deduplicator.claim("request-1"), true);
  assert.equal(deduplicator.claim("request-1"), false);
  assert.equal(deduplicator.claim("request-2"), true);
  deduplicator.release("request-2");
  assert.equal(deduplicator.claim("request-2"), true);
  assert.equal(deduplicator.claim("request-3"), true);
  assert.equal(deduplicator.claim("request-1"), true);
  timestamp += 1_001;
  assert.equal(deduplicator.claim("request-3"), true);
});

test("origin validation allows same-origin and configured production origin", () => {
  const allowed = parseAllowedOrigins("https://care.fond-nika.ru, invalid");

  assert.equal(isAllowedOrigin("https://care.fond-nika.ru", "http://localhost:8080", allowed), true);
  assert.equal(isAllowedOrigin("http://localhost:8080", "http://localhost:8080", allowed), false);
  assert.equal(isAllowedOrigin("https://attacker.example", "http://localhost:8080", allowed), false);
  assert.equal(isAllowedOrigin("http://localhost:8080", "http://localhost:8080", new Set()), true);
});

test("contact service distinguishes invalid input from an upstream failure", async () => {
  const invalidService = createContactCaptureService({ env, fetch: () => assert.fail("not called") });
  await assert.rejects(
    invalidService.submit({ ...validPayload, consent: false }),
    (error) => error.status === 400,
  );

  const failedService = createContactCaptureService({
    env,
    fetch: async () => {
      throw new TypeError("network unavailable");
    },
  });
  await assert.rejects(
    failedService.submit(validPayload),
    (error) => error.status === 502,
  );
});
