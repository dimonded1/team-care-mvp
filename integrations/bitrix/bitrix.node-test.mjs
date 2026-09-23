import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeIntegrationRequest,
  buildAnimalListRequest,
  createBitrixConfig,
  deriveAnimalMatchingContent,
  loadAllAnimalsFromBitrix,
  loadAnimalsFromBitrix,
  mapBitrixAnimal,
  mapCareEvent,
  mapContactCapture,
  mapGuardianshipLead,
  sendToBitrix,
} from "./index.mjs";

const configuredEnv = {
  BITRIX_ENABLED: "true",
  BITRIX_ANIMAL_SYNC_ENABLED: "true",
  BITRIX_GUARDIANSHIP_LEADS_ENABLED: "true",
  BITRIX_CARE_EVENTS_ENABLED: "true",
  BITRIX_CONTACTS_ENABLED: "true",
  BITRIX_WEBHOOK_URL: "https://example.bitrix24.ru/rest/1/token",
  BITRIX_WEBHOOK_SECRET: "never-expose-this",
  BITRIX_ANIMAL_CATEGORY_ID: "17",
  BITRIX_ANIMAL_CATEGORY_IDS: "17,13",
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
  BITRIX_CONTACT_SOURCE_ID: "WEB",
  BITRIX_CONTACT_FIELD_TELEGRAM: "UF_CRM_TELEGRAM",
  BITRIX_CONTACT_FIELD_ABOUT: "UF_CRM_ABOUT",
  BITRIX_CONTACT_FIELD_WORK_SPHERE: "UF_CRM_WORK",
  BITRIX_CONTACT_FIELD_HOBBIES: "UF_CRM_HOBBIES",
  BITRIX_CONTACT_FIELD_PETS: "UF_CRM_PETS",
  BITRIX_CONTACT_FIELD_PREFERRED_CONTACT: "UF_CRM_PREFERRED",
  BITRIX_CONTACT_FIELD_MAX: "UF_CRM_MAX",
  BITRIX_CONTACT_FIELD_INTEREST: "UF_CRM_1773242372621",
  BITRIX_CONTACT_FIELD_CONSENT: "UF_CRM_1771837766068",
  BITRIX_CONTACT_FIELD_CONSENT_AT: "UF_CRM_1771837777534",
  BITRIX_CONTACT_FIELD_SUBMITTED_AT: "UF_CRM_1773673401962",
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

test("all angle-bracket env placeholders are normalized and never sent to Bitrix", () => {
  const config = createBitrixConfig({
    ...configuredEnv,
    BITRIX_CONTACT_SOURCE_ID: "<SET_PRODUCTION_SOURCE>",
  });
  const request = mapContactCapture(
    {
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
    },
    config,
  );

  assert.equal(Object.hasOwn(request.payload.fields, "SOURCE_ID"), false);
  assert.deepEqual(request.payload.fields.UF_CRM_1773242372621, ["501"]);
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

test("contact mapper creates a consented Bitrix contact with allowlisted profile fields", () => {
  const config = createBitrixConfig(configuredEnv);
  const request = mapContactCapture(
    {
      firstName: "  Анна  ",
      lastName: "Иванова",
      middleName: "Сергеевна",
      phone: "+7 900 000-00-00",
      email: "ANNA@example.org",
      birthDate: "1990-05-10",
      workSphere: "media",
      preferredContact: "telegram",
      telegram: "@anna_nika",
      about: "Люблю животных",
      hobbies: "Фотография",
      pets: "Кот",
      maxMessenger: "anna-max",
      animalId: "mira-42",
      animalName: "Мира",
      consent: true,
    },
    config,
    { now: new Date("2026-07-27T10:30:00.000Z") },
  );

  assert.equal(request.method, "crm.contact.add");
  assert.equal(request.payload.fields.NAME, "Анна");
  assert.equal(request.payload.fields.LAST_NAME, "Иванова");
  assert.equal(request.payload.fields.SECOND_NAME, "Сергеевна");
  assert.deepEqual(request.payload.fields.PHONE, [
    { VALUE: "+7 900 000-00-00", VALUE_TYPE: "MOBILE" },
  ]);
  assert.deepEqual(request.payload.fields.EMAIL, [
    { VALUE: "anna@example.org", VALUE_TYPE: "WORK" },
  ]);
  assert.deepEqual(request.payload.fields.UF_CRM_1773242372621, ["501"]);
  assert.deepEqual(request.payload.fields.UF_CRM_WORK, ["603"]);
  assert.deepEqual(request.payload.fields.UF_CRM_PREFERRED, ["704"]);
  assert.equal(request.payload.fields.UF_CRM_TELEGRAM, "https://t.me/anna_nika");
  assert.equal(request.payload.fields.BIRTHDATE, "1990-05-10");
  assert.equal(request.payload.fields.UF_CRM_1771837766068, true);
  assert.equal(request.payload.fields.UF_CRM_1771837777534, "2026-07-27");
  assert.equal(request.payload.fields.UF_CRM_1773673401962, "2026-07-27");
  assert.match(request.payload.fields.COMMENTS, /Мира \(mira-42\)/);
});

test("event campaign adds the second interest and is recorded in the source description", () => {
  const config = createBitrixConfig({
    ...configuredEnv,
    BITRIX_CONTACT_SOURCE_DESCRIPTION: "Стенд «Команда заботы»",
    BITRIX_CONTACT_INTEREST_EVENT_ENUM_ID: "502",
    BITRIX_CONTACT_EVENT_CAMPAIGNS: "run,zabeg",
  });
  const base = {
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

  const fromEvent = mapContactCapture({ ...base, campaign: "RUN" }, config).payload.fields;
  assert.deepEqual(fromEvent.UF_CRM_1773242372621, ["501", "502"]);
  assert.equal(fromEvent.SOURCE_DESCRIPTION, "Стенд «Команда заботы» · метка: run");

  const withoutCampaign = mapContactCapture(base, config).payload.fields;
  assert.deepEqual(withoutCampaign.UF_CRM_1773242372621, ["501"]);
  assert.equal(withoutCampaign.SOURCE_DESCRIPTION, "Стенд «Команда заботы»");

  const unknownCampaign = mapContactCapture({ ...base, campaign: "newsletter" }, config).payload.fields;
  assert.deepEqual(unknownCampaign.UF_CRM_1773242372621, ["501"]);
  assert.equal(unknownCampaign.SOURCE_DESCRIPTION, "Стенд «Команда заботы» · метка: newsletter");
});

test("four-paws event is written to the contact comment with the matched animal", () => {
  const config = createBitrixConfig(configuredEnv);
  const request = mapContactCapture({
    firstName: "Анна",
    lastName: "Иванова",
    middleName: "Сергеевна",
    phone: "+7 900 000-00-00",
    email: "anna@example.org",
    workSphere: "media",
    preferredContact: "telegram",
    animalId: "bitrix-435307",
    animalName: "Фисташка",
    campaign: "4-lapy",
    consent: true,
  }, config);

  assert.equal(
    request.payload.fields.COMMENTS,
    "Интерес к программе опеки. Мероприятие: 4 лапы. Подопечный: Фисташка (bitrix-435307).",
  );
});

test("a broken campaign mark is dropped instead of costing the visitor a submission", () => {
  const config = createBitrixConfig({
    ...configuredEnv,
    BITRIX_CONTACT_INTEREST_EVENT_ENUM_ID: "502",
    BITRIX_CONTACT_EVENT_CAMPAIGNS: "run",
  });
  const base = {
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

  for (const campaign of ["<script>", "run run", "тег", "a".repeat(41), null, undefined, ""]) {
    const fields = mapContactCapture({ ...base, campaign }, config).payload.fields;
    assert.deepEqual(fields.UF_CRM_1773242372621, ["501"]);
    assert.equal(Object.hasOwn(fields, "SOURCE_DESCRIPTION"), false);
  }
});

test("the event interest stays off when no campaign enum is configured", () => {
  const config = createBitrixConfig({ ...configuredEnv, BITRIX_CONTACT_EVENT_CAMPAIGNS: "run" });
  const fields = mapContactCapture(
    {
      firstName: "Анна",
      lastName: "Иванова",
      middleName: "Сергеевна",
      phone: "+7 900 000-00-00",
      email: "anna@example.org",
      workSphere: "media",
      preferredContact: "telegram",
      animalId: "mira",
      animalName: "Мира",
      campaign: "run",
      consent: true,
    },
    config,
  ).payload.fields;

  assert.deepEqual(fields.UF_CRM_1773242372621, ["501"]);
});

test("contact mapper rejects missing consent and invalid allowlisted data", () => {
  const config = createBitrixConfig(configuredEnv);
  const base = {
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

  assert.throws(() => mapContactCapture({ ...base, consent: false }, config), /consent/i);
  assert.throws(() => mapContactCapture({ ...base, email: "not-an-email" }, config), /valid address/i);
  assert.throws(() => mapContactCapture({ ...base, workSphere: "anything" }, config), /not allowed/i);
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
  assert.deepEqual(config.animal.categoryIds, ["17", "13"]);
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

test("derived matching profiles are deterministic and respond to public animal traits", () => {
  const common = {
    name: "Тест",
    species: "dog",
    birthDate: "2024-01-01",
    shortDescription: "",
  };
  const active = deriveAnimalMatchingContent({
    ...common,
    story: "Активный, общительный и дружелюбный пёс любит прогулки и людей.",
    character: "Смелый и открытый.",
    behavior: "",
  }, null, { now: new Date("2026-07-29T00:00:00.000Z") });
  const cautious = deriveAnimalMatchingContent({
    ...common,
    story: "Осторожному и пугливому псу нужно время и особый подход.",
    character: "Спокойный, держит дистанцию.",
    behavior: "",
  }, null, { now: new Date("2026-07-29T00:00:00.000Z") });
  const repeated = deriveAnimalMatchingContent({
    ...common,
    story: "Активный, общительный и дружелюбный пёс любит прогулки и людей.",
    character: "Смелый и открытый.",
    behavior: "",
  }, null, { now: new Date("2026-07-29T00:00:00.000Z") });

  assert.deepEqual(active, repeated);
  assert.equal(active.profileSource, "derived-v1");
  assert.ok(active.matchProfile.energy > cautious.matchProfile.energy);
  assert.ok(active.matchProfile.sociability > cautious.matchProfile.sociability);
  assert.ok(cautious.matchProfile.spaceRespect > active.matchProfile.spaceRespect);
  assert.ok(cautious.matchProfile.challenge > active.matchProfile.challenge);
  assert.ok(active.traits.length >= 3);
  assert.ok(cautious.careTags.length >= 3);
});

test("reviewed matching profiles remain exact overrides", () => {
  const reviewed = {
    nameGenitive: "Миры",
    shortDescription: "Проверенное описание",
    traits: ["ласковая", "спокойная", "чуткая"],
    careTags: ["общение", "режим", "внимание"],
    matchProfile: {
      energy: 10,
      sociability: 20,
      initiative: 30,
      patience: 40,
      routine: 50,
      spaceRespect: 60,
      challenge: 70,
    },
  };

  assert.deepEqual(
    deriveAnimalMatchingContent({ name: "Мира", species: "cat" }, reviewed),
    { profileSource: "reviewed", ...reviewed },
  );
});

test("full animal loader paginates every configured category and deduplicates IDs", async () => {
  const config = createBitrixConfig(configuredEnv);
  const base = {
    UF_SPECIES: 51,
    UF_SEX: 45,
    UF_PUBLISHED: 1,
    UF_BLOCKED: 0,
    UF_NOT_FOR_GUARDIANSHIP: 0,
  };
  const calls = [];
  const response = await loadAllAnimalsFromBitrix(config, {
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      const categoryId = Number(body.filter.CATEGORY_ID);
      const start = Number(body.start);
      calls.push({ categoryId, start });
      const result = categoryId === 17 && start === 0
        ? [{ ...base, ID: 1, TITLE: "Мира" }, { ...base, ID: 2, TITLE: "Тень" }]
        : categoryId === 17
          ? [{ ...base, ID: 3, TITLE: "Луч" }]
          : [{ ...base, ID: 2, TITLE: "Тень" }, { ...base, ID: 4, TITLE: "Домино" }];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result,
          next: categoryId === 17 && start === 0 ? 50 : undefined,
        }),
      };
    },
  });

  assert.deepEqual(calls, [
    { categoryId: 17, start: 0 },
    { categoryId: 17, start: 50 },
    { categoryId: 13, start: 0 },
  ]);
  assert.deepEqual(response.animals.map((animal) => animal.sourceId), ["2", "4", "1", "3"]);
  assert.equal(response.animals.find((animal) => animal.sourceId === "2").categoryId, 13);
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
