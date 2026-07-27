import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeIntegrationRequest,
  buildAnimalListRequest,
  createBitrixConfig,
  loadAnimalsFromBitrix,
  mapBitrixAnimal,
  mapCareEvent,
  mapGuardianshipLead,
  sendToBitrix,
} from "./index.mjs";

const configuredEnv = {
  BITRIX_ENABLED: "true",
  BITRIX_ANIMAL_SYNC_ENABLED: "true",
  BITRIX_GUARDIANSHIP_LEADS_ENABLED: "true",
  BITRIX_CARE_EVENTS_ENABLED: "true",
  BITRIX_WEBHOOK_URL: "https://example.bitrix24.ru/rest/1/token",
  BITRIX_WEBHOOK_SECRET: "never-expose-this",
  BITRIX_ANIMAL_CATEGORY_ID: "17",
  BITRIX_ANIMAL_FIELD_ID: "ID",
  BITRIX_ANIMAL_FIELD_NAME: "TITLE",
  BITRIX_ANIMAL_FIELD_SPECIES: "UF_SPECIES",
  BITRIX_ANIMAL_FIELD_SEX: "UF_SEX",
  BITRIX_ANIMAL_FIELD_BIRTH_DATE: "UF_BIRTH",
  BITRIX_ANIMAL_FIELD_MAIN_PHOTO: "UF_MAIN_PHOTO",
  BITRIX_ANIMAL_FIELD_EXTRA_PHOTOS: "UF_EXTRA_PHOTOS",
  BITRIX_ANIMAL_FIELD_STORY: "UF_STORY",
  BITRIX_ANIMAL_FIELD_DESCRIPTION: "COMMENTS",
  BITRIX_ANIMAL_FIELD_CHARACTER: "UF_CHARACTER",
  BITRIX_ANIMAL_FIELD_BEHAVIOR: "UF_BEHAVIOR",
  BITRIX_ANIMAL_FIELD_PROFILE_URL: "UF_PROFILE_URL",
  BITRIX_ANIMAL_FIELD_PUBLISHED: "UF_PUBLISHED",
  BITRIX_ANIMAL_FIELD_BLOCK_FROM_SITE: "UF_BLOCKED",
  BITRIX_ANIMAL_FIELD_NOT_FOR_GUARDIANSHIP: "UF_NOT_FOR_GUARDIANSHIP",
  BITRIX_ANIMAL_FIELD_SITE_ID: "UF_SITE_ID",
  BITRIX_ANIMAL_ENUM_SPECIES_CAT: "51",
  BITRIX_ANIMAL_ENUM_SPECIES_DOG: "52",
  BITRIX_ANIMAL_ENUM_SEX_FEMALE: "45",
  BITRIX_ANIMAL_ENUM_SEX_MALE: "46",
  BITRIX_CARE_EVENT_ENTITY_TYPE_ID: "145",
  BITRIX_GUARDIANSHIP_FORM_ID: "8",
  BITRIX_FIELD_GUARDIAN_NAME: "UF_CRM_NAME",
  BITRIX_FIELD_GUARDIAN_EMAIL: "UF_CRM_EMAIL",
  BITRIX_FIELD_GUARDIAN_PHONE: "UF_CRM_PHONE",
  BITRIX_FIELD_ANIMAL_ID: "UF_CRM_ANIMAL_ID",
  BITRIX_FIELD_ANIMAL_NAME: "UF_CRM_ANIMAL_NAME",
  BITRIX_FIELD_CONSENT: "UF_CRM_CONSENT",
  BITRIX_FIELD_CARE_TYPE: "UF_CRM_CARE_TYPE",
  BITRIX_FIELD_OCCURRED_AT: "UF_CRM_OCCURRED_AT",
};

test("disabled adapter makes no network request and exposes no secret", async () => {
  const config = createBitrixConfig({ BITRIX_WEBHOOK_SECRET: "secret" });
  const result = await sendToBitrix(
    { feature: "guardianshipLeads", method: "crm.lead.add", payload: {} },
    config,
    { fetch: () => assert.fail("fetch must not be called") },
  );

  assert.deepEqual(result, { status: "disabled" });
  assert.equal(Object.hasOwn(config, "secret"), false);
  assert.equal(JSON.stringify(config).includes("secret"), false);
});

test("feature flags disable one contour without disabling the others", async () => {
  const config = createBitrixConfig({
    ...configuredEnv,
    BITRIX_GUARDIANSHIP_LEADS_ENABLED: "false",
  });
  const result = await sendToBitrix(
    { feature: "guardianshipLeads", method: "crm.lead.add", payload: {} },
    config,
    { fetch: () => assert.fail("fetch must not be called") },
  );

  assert.deepEqual(result, { status: "disabled" });
});

test("mappers build guardianship lead and care-event payloads", () => {
  const config = createBitrixConfig(configuredEnv);
  const lead = mapGuardianshipLead(
    { guardianName: "Анна", animalId: "mira", animalName: "Мира", consent: true },
    config,
  );
  const event = mapCareEvent(
    { animalId: "mira", careType: "feeding", occurredAt: "2026-07-23T10:00:00.000Z" },
    config,
  );

  assert.equal(lead.method, "crm.lead.add");
  assert.equal(lead.payload.fields.UF_CRM_NAME, "Анна");
  assert.equal(event.payload.entityTypeId, 145);
  assert.equal(event.payload.fields.UF_CRM_CARE_TYPE, "feeding");
});

test("guardianship lead requires explicit consent", () => {
  const config = createBitrixConfig(configuredEnv);

  assert.throws(
    () =>
      mapGuardianshipLead(
        {
          guardianName: "Анна",
          animalId: "mira",
          animalName: "Мира",
          consent: false,
        },
        config,
      ),
    /Explicit guardianship consent is required/,
  );
});

test("animal request selects only configured fields and mapper excludes medical free text", () => {
  const config = createBitrixConfig(configuredEnv);
  const request = buildAnimalListRequest(config);
  const record = {
    ID: 42,
    TITLE: "Мира",
    UF_SPECIES: 51,
    UF_SEX: 45,
    UF_BIRTH: "2024-05-01",
    UF_MAIN_PHOTO: { id: 100 },
    UF_EXTRA_PHOTOS: [101, { ID: 102 }],
    UF_STORY: "[p]Спокойно знакомится с людьми.[/p]",
    COMMENTS: "<b>Нужен понятный ритм.</b>",
    UF_CHARACTER: "ласковая, спокойная",
    UF_BEHAVIOR: "бережёт дистанцию",
    UF_PROFILE_URL: "https://fond-nika.ru/ourpets/mira/",
    UF_PUBLISHED: 1,
    UF_BLOCKED: 0,
    UF_NOT_FOR_GUARDIANSHIP: 0,
    UF_SITE_ID: 77,
    UF_MEDICAL_NOT_SELECTED: "private medical text",
  };
  const animal = mapBitrixAnimal(record, config);

  assert.equal(request.method, "crm.deal.list");
  assert.equal(request.payload.filter.CATEGORY_ID, 17);
  assert.equal(request.payload.select.includes("UF_MEDICAL_NOT_SELECTED"), false);
  assert.equal(animal.species, "cat");
  assert.equal(animal.sex, "female");
  assert.deepEqual(animal.photoFileIds, ["100", "101", "102"]);
  assert.equal(animal.story, "Спокойно знакомится с людьми.");
  assert.equal(JSON.stringify(animal).includes("private medical text"), false);
  assert.equal(animal.needsEditorialMatchProfile, true);
});

test("animal loader filters records blocked from the site or guardianship", async () => {
  const config = createBitrixConfig(configuredEnv);
  const base = {
    UF_SPECIES: 51,
    UF_SEX: 45,
    UF_PUBLISHED: 1,
    UF_BLOCKED: 0,
    UF_NOT_FOR_GUARDIANSHIP: 0,
  };
  const response = await loadAnimalsFromBitrix(config, {
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        result: [
          { ...base, ID: 1, TITLE: "Мира" },
          { ...base, ID: 2, TITLE: "Тень", UF_BLOCKED: 1 },
        ],
      }),
    }),
  });

  assert.equal(response.status, "sent");
  assert.deepEqual(response.animals.map((animal) => animal.name), ["Мира"]);
});

test("enabled adapter validates HTTPS and sends without exposing secret", async () => {
  const config = createBitrixConfig(configuredEnv);
  let call;
  const result = await sendToBitrix(
    mapGuardianshipLead(
      { guardianName: "Анна", animalId: "mira", animalName: "Мира", consent: true },
      config,
    ),
    config,
    {
      fetch: async (url, options) => {
        call = { url, options };
        return { ok: true, status: 200 };
      },
    },
  );

  assert.deepEqual(result, { status: "sent", httpStatus: 200 });
  assert.equal(call.url, "https://example.bitrix24.ru/rest/1/token/crm.lead.add.json");
  assert.equal(Object.values(call.options.headers).includes("never-expose-this"), false);
  assert.equal(JSON.stringify(result).includes("never-expose-this"), false);
  assert.equal(authorizeIntegrationRequest(config, "never-expose-this"), true);
  assert.equal(authorizeIntegrationRequest(config, "wrong-secret"), false);

  const insecure = createBitrixConfig({
    ...configuredEnv,
    BITRIX_WEBHOOK_URL: "http://example.test/webhook",
  });
  await assert.rejects(
    sendToBitrix(
      mapGuardianshipLead(
        { guardianName: "Анна", animalId: "mira", animalName: "Мира", consent: true },
        insecure,
      ),
      insecure,
      { fetch: async () => ({ ok: true, status: 200 }) },
    ),
    /must use HTTPS/,
  );
});
