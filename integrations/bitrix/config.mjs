import { bitrixSecrets } from "./private.mjs";

const PLACEHOLDER = "<SET_IN_SERVER_ENV>";

function asBoolean(value) {
  return String(value).toLowerCase() === "true";
}

function isPlaceholder(value) {
  const normalized = String(value ?? "").trim();
  return !normalized || /^<[^>]+>$/u.test(normalized);
}

function valueOrPlaceholder(value) {
  return isPlaceholder(value) ? PLACEHOLDER : String(value).trim();
}

function numericList(value, fallback) {
  const source = isPlaceholder(value) ? fallback : value;
  return String(source ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectMissing(entries) {
  return Object.entries(entries)
    .filter(([, value]) => isPlaceholder(value))
    .map(([name]) => name);
}

function requireNumeric(errors, label, value) {
  if (!/^\d+$/.test(String(value))) errors.push(`${label} must be a numeric ID`);
}

/**
 * Reads server-only environment values. The actual integration secret is kept
 * in a WeakMap and cannot be serialized with this public config object.
 */
export function createBitrixConfig(env = process.env) {
  const config = Object.freeze({
    enabled: asBoolean(env.BITRIX_ENABLED),
    webhookUrl: valueOrPlaceholder(env.BITRIX_WEBHOOK_URL),
    hasSecret: Boolean(env.BITRIX_WEBHOOK_SECRET),
    features: Object.freeze({
      animalSync: asBoolean(env.BITRIX_ANIMAL_SYNC_ENABLED),
      guardianshipLeads: asBoolean(env.BITRIX_GUARDIANSHIP_LEADS_ENABLED),
      careEvents: asBoolean(env.BITRIX_CARE_EVENTS_ENABLED),
      contacts: asBoolean(env.BITRIX_CONTACTS_ENABLED),
    }),
    animal: Object.freeze({
      categoryId: valueOrPlaceholder(env.BITRIX_ANIMAL_CATEGORY_ID),
      categoryIds: Object.freeze(
        numericList(env.BITRIX_ANIMAL_CATEGORY_IDS, env.BITRIX_ANIMAL_CATEGORY_ID),
      ),
      fields: Object.freeze({
        id: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_ID),
        name: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_NAME),
        species: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_SPECIES),
        sex: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_SEX),
        birthDate: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_BIRTH_DATE),
        mainPhoto: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_MAIN_PHOTO),
        extraPhotos: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_EXTRA_PHOTOS),
        story: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_STORY),
        description: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_DESCRIPTION),
        character: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_CHARACTER),
        behavior: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_BEHAVIOR),
        profileUrl: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_PROFILE_URL),
        published: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_PUBLISHED),
        blockFromSite: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_BLOCK_FROM_SITE),
        notForGuardianship: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_NOT_FOR_GUARDIANSHIP),
        siteId: valueOrPlaceholder(env.BITRIX_ANIMAL_FIELD_SITE_ID),
      }),
      enums: Object.freeze({
        speciesCat: valueOrPlaceholder(env.BITRIX_ANIMAL_ENUM_SPECIES_CAT),
        speciesDog: valueOrPlaceholder(env.BITRIX_ANIMAL_ENUM_SPECIES_DOG),
        sexFemale: valueOrPlaceholder(env.BITRIX_ANIMAL_ENUM_SEX_FEMALE),
        sexMale: valueOrPlaceholder(env.BITRIX_ANIMAL_ENUM_SEX_MALE),
      }),
    }),
    guardianship: Object.freeze({
      formId: valueOrPlaceholder(env.BITRIX_GUARDIANSHIP_FORM_ID),
      fields: Object.freeze({
        guardianName: valueOrPlaceholder(env.BITRIX_FIELD_GUARDIAN_NAME),
        guardianEmail: valueOrPlaceholder(env.BITRIX_FIELD_GUARDIAN_EMAIL),
        guardianPhone: valueOrPlaceholder(env.BITRIX_FIELD_GUARDIAN_PHONE),
        animalId: valueOrPlaceholder(env.BITRIX_FIELD_ANIMAL_ID),
        animalName: valueOrPlaceholder(env.BITRIX_FIELD_ANIMAL_NAME),
        consent: valueOrPlaceholder(env.BITRIX_FIELD_CONSENT),
      }),
    }),
    contacts: Object.freeze({
      sourceId: valueOrPlaceholder(env.BITRIX_CONTACT_SOURCE_ID),
      fields: Object.freeze({
        interest: valueOrPlaceholder(env.BITRIX_CONTACT_FIELD_INTEREST),
        consent: valueOrPlaceholder(env.BITRIX_CONTACT_FIELD_CONSENT),
        consentAt: valueOrPlaceholder(env.BITRIX_CONTACT_FIELD_CONSENT_AT),
        submittedAt: valueOrPlaceholder(env.BITRIX_CONTACT_FIELD_SUBMITTED_AT),
      }),
      interestEnums: Object.freeze({
        guardianship: valueOrPlaceholder(env.BITRIX_CONTACT_INTEREST_GUARDIANSHIP_ENUM_ID),
        visits: valueOrPlaceholder(env.BITRIX_CONTACT_INTEREST_VISITS_ENUM_ID),
        updates: valueOrPlaceholder(env.BITRIX_CONTACT_INTEREST_UPDATES_ENUM_ID),
      }),
    }),
    care: Object.freeze({
      entityTypeId: valueOrPlaceholder(env.BITRIX_CARE_EVENT_ENTITY_TYPE_ID),
      fields: Object.freeze({
        animalId: valueOrPlaceholder(env.BITRIX_FIELD_ANIMAL_ID),
        careType: valueOrPlaceholder(env.BITRIX_FIELD_CARE_TYPE),
        occurredAt: valueOrPlaceholder(env.BITRIX_FIELD_OCCURRED_AT),
      }),
    }),
  });

  bitrixSecrets.set(config, env.BITRIX_WEBHOOK_SECRET || "");
  return config;
}

export function validateBitrixConfig(config, feature = null) {
  const errors = [];
  let parsedUrl;

  try {
    parsedUrl = new URL(config.webhookUrl);
  } catch {
    errors.push("BITRIX_WEBHOOK_URL must be a valid HTTPS URL");
  }
  if (parsedUrl && parsedUrl.protocol !== "https:") {
    errors.push("BITRIX_WEBHOOK_URL must use HTTPS");
  }
  if (!bitrixSecrets.get(config)) errors.push("BITRIX_WEBHOOK_SECRET is required");

  if (feature === "animalSync") {
    requireNumeric(errors, "BITRIX_ANIMAL_CATEGORY_ID", config.animal.categoryId);
    config.animal.categoryIds.forEach((categoryId) => {
      requireNumeric(errors, "BITRIX_ANIMAL_CATEGORY_IDS", categoryId);
    });
    if (config.animal.categoryIds.length === 0) {
      errors.push("BITRIX_ANIMAL_CATEGORY_IDS must contain at least one numeric ID");
    }
    const missing = [
      ...collectMissing(config.animal.fields),
      ...collectMissing(config.animal.enums),
    ];
    if (missing.length) errors.push(`Animal field map is incomplete: ${missing.join(", ")}`);
  }

  if (feature === "guardianshipLeads") {
    requireNumeric(errors, "BITRIX_GUARDIANSHIP_FORM_ID", config.guardianship.formId);
    const missing = collectMissing(config.guardianship.fields);
    if (missing.length) errors.push(`Guardianship field map is incomplete: ${missing.join(", ")}`);
  }

  if (feature === "careEvents") {
    requireNumeric(errors, "BITRIX_CARE_EVENT_ENTITY_TYPE_ID", config.care.entityTypeId);
    const missing = collectMissing(config.care.fields);
    if (missing.length) errors.push(`Care-event field map is incomplete: ${missing.join(", ")}`);
  }

  if (feature === "contacts") {
    const missing = collectMissing(config.contacts.fields);
    if (missing.length) errors.push(`Contact field map is incomplete: ${missing.join(", ")}`);
  }

  if (errors.length) throw new Error(`Invalid Bitrix configuration: ${errors.join("; ")}`);
}

export function isBitrixFeatureEnabled(config, feature) {
  return config.enabled && config.features[feature] === true;
}
