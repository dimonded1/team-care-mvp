import assert from "node:assert/strict";
import test from "node:test";

import {
  createContactCaptureService,
  createRequestIdDeduplicator,
} from "./contact-capture.mjs";

// This test intentionally injects an in-process Bitrix transport. It exercises
// the same contact mapper/service and opaque request-ID deduplicator used by
// the HTTP handler, but never opens a connection or creates a production CRM
// record.
const env = {
  BITRIX_ENABLED: "true",
  BITRIX_CONTACTS_ENABLED: "true",
  BITRIX_WEBHOOK_URL: "https://bitrix.test/rest/1/test-token",
  BITRIX_WEBHOOK_SECRET: "test-only-secret",
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

const payload = {
  firstName: "Тест",
  lastName: "Контур",
  middleName: "Проверочный",
  phone: "+7 900 000-00-00",
  email: "test@example.invalid",
  workSphere: "media",
  preferredContact: "telegram",
  animalId: "test-animal",
  animalName: "Тестовый подопечный",
  consent: true,
};

/** Mirrors the request-ID boundary in server/index.mjs without binding a port. */
async function submitContact({ requestId, service, deduplicator }) {
  let claimed = false;
  try {
    if (!deduplicator.claim(requestId)) {
      return deduplicator.getState(requestId) === "completed"
        ? { status: 201, body: { status: "accepted" } }
        : { status: 409, body: { error: "contact_capture_pending" } };
    }
    claimed = Boolean(requestId);
    await service.submit(payload);
    if (claimed) deduplicator.complete(requestId);
    return { status: 201, body: { status: "accepted" } };
  } catch (error) {
    if (claimed) deduplicator.release(requestId);
    return { status: Number(error?.status) || 502, body: { error: "contact_capture_failed" } };
  }
}

test("timeout releases the opaque request ID: retry sends one contact and later duplicate sends none", async () => {
  const calls = [];
  let attempt = 0;
  const service = createContactCaptureService({
    env,
    fetch: async (url, options) => {
      calls.push({ url, options });
      attempt += 1;
      if (attempt === 1) throw new DOMException("Timed out", "AbortError");
      return { ok: true, status: 200, json: async () => ({ result: 90210 }) };
    },
  });
  const deduplicator = createRequestIdDeduplicator();

  const first = await submitContact({ requestId: "contact-timeout-retry", service, deduplicator });
  const retry = await submitContact({ requestId: "contact-timeout-retry", service, deduplicator });
  const duplicate = await submitContact({ requestId: "contact-timeout-retry", service, deduplicator });

  assert.equal(first.status, 502);
  assert.equal(retry.status, 201);
  assert.equal(duplicate.status, 201);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /^https:\/\/bitrix\.test\//);
  assert.match(calls[0].url, /crm\.contact\.add\.json$/);
  assert.doesNotMatch(calls[0].url, /crm\.deal\.add/);
  assert.equal(JSON.parse(calls[1].options.body).fields.NAME, "Тест");
});

test("a concurrent request remains pending until one successful contact send is confirmed", async () => {
  let contactAdds = 0;
  let markTransportStarted;
  const transportStarted = new Promise((resolve) => {
    markTransportStarted = resolve;
  });
  let releaseTransport;
  const transportRelease = new Promise((resolve) => {
    releaseTransport = resolve;
  });
  const service = createContactCaptureService({
    env,
    fetch: async (url) => {
      contactAdds += 1;
      assert.match(url, /crm\.contact\.add\.json$/);
      markTransportStarted();
      return transportRelease.then(() => ({
        ok: true,
        status: 200,
        json: async () => ({ result: 7 }),
      }));
    },
  });
  const deduplicator = createRequestIdDeduplicator();

  const first = submitContact({ requestId: "contact-double-submit", service, deduplicator });
  await transportStarted;
  const second = submitContact({ requestId: "contact-double-submit", service, deduplicator });
  releaseTransport();
  const [firstResponse, secondResponse] = await Promise.all([first, second]);

  assert.equal(firstResponse.status, 201);
  assert.deepEqual(secondResponse, { status: 409, body: { error: "contact_capture_pending" } });
  assert.equal(contactAdds, 1);
});

test("a pending request that fails is not falsely accepted and can be retried", async () => {
  let attempt = 0;
  let releaseFailure;
  const failureRelease = new Promise((resolve) => {
    releaseFailure = resolve;
  });
  let startedFailure;
  const failureStarted = new Promise((resolve) => {
    startedFailure = resolve;
  });
  const service = createContactCaptureService({
    env,
    fetch: async () => {
      attempt += 1;
      if (attempt === 1) {
        startedFailure();
        await failureRelease;
        throw new TypeError("local test timeout");
      }
      return { ok: true, status: 200, json: async () => ({ result: 8 }) };
    },
  });
  const deduplicator = createRequestIdDeduplicator();

  const first = submitContact({ requestId: "contact-pending-failure", service, deduplicator });
  await failureStarted;
  const whilePending = await submitContact({ requestId: "contact-pending-failure", service, deduplicator });
  releaseFailure();
  const failed = await first;
  const retry = await submitContact({ requestId: "contact-pending-failure", service, deduplicator });

  assert.deepEqual(whilePending, { status: 409, body: { error: "contact_capture_pending" } });
  assert.equal(failed.status, 502);
  assert.equal(retry.status, 201);
  assert.equal(attempt, 2);
});
