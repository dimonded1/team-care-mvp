function requireValue(value, name) {
  if (value === undefined || value === null || value === "") {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

function stripMarkup(value) {
  return String(value ?? "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function booleanField(value) {
  return value === true || value === 1 || value === "1" || value === "Y";
}

function fileIds(value) {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  return values
    .map((item) => typeof item === "object" && item ? item.id ?? item.ID : item)
    .filter((item) => typeof item === "string" || typeof item === "number")
    .map(String);
}

function safeHttpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function enumValue(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function cleanSingleLine(value, name, maxLength) {
  const normalized = stripMarkup(requireValue(value, name));
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${name} must contain 1-${maxLength} characters`);
  }
  return normalized;
}

function normalizeEmail(value) {
  const email = String(requireValue(value, "email")).trim().toLowerCase();
  if (
    email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)
    || /[\r\n]/u.test(email)
  ) {
    throw new TypeError("email must be a valid address");
  }
  return email;
}

export const contactInterestLabels = Object.freeze({
  guardianship: "Хочу узнать об опеке",
  visits: "Хочу узнать о визитах и помощи",
  updates: "Хочу получать новости о подопечном",
});

/** Creates the read request for published animal deals. */
export function buildAnimalListRequest(config, { start = 0, categoryId = config.animal.categoryId } = {}) {
  const fields = config.animal.fields;
  return {
    feature: "animalSync",
    method: "crm.deal.list",
    responseMode: "json",
    payload: {
      order: { ID: "ASC" },
      filter: {
        CATEGORY_ID: Number(categoryId),
        [fields.published]: 1,
      },
      select: [...new Set(Object.values(fields))],
      start,
    },
  };
}

/**
 * Normalizes a Bitrix deal without inventing matching scores. Free-text health
 * information is deliberately excluded from the public game model.
 */
export function mapBitrixAnimal(record, config) {
  const fields = config.animal.fields;
  const enums = config.animal.enums;
  const speciesValue = String(enumValue(record[fields.species]) ?? "");
  const sexValue = String(enumValue(record[fields.sex]) ?? "");
  const mainPhotos = fileIds(record[fields.mainPhoto]);
  const extraPhotos = fileIds(record[fields.extraPhotos]);

  const species = speciesValue === String(enums.speciesCat)
    ? "cat"
    : speciesValue === String(enums.speciesDog)
      ? "dog"
      : "unknown";
  const sex = sexValue === String(enums.sexFemale)
    ? "female"
    : sexValue === String(enums.sexMale)
      ? "male"
      : "unknown";

  return {
    sourceId: String(requireValue(record[fields.id], "animal source id")),
    siteId: record[fields.siteId] ? String(record[fields.siteId]) : null,
    name: stripMarkup(requireValue(record[fields.name], "animal name")),
    species,
    sex,
    birthDate: record[fields.birthDate] || null,
    story: stripMarkup(record[fields.story] || record[fields.description]),
    shortDescription: stripMarkup(record[fields.description]),
    character: stripMarkup(record[fields.character]),
    behavior: stripMarkup(record[fields.behavior]),
    photoFileIds: [...new Set([...mainPhotos, ...extraPhotos])],
    profileUrl: safeHttpsUrl(record[fields.profileUrl]),
    published: booleanField(record[fields.published]),
    blockedFromSite: booleanField(record[fields.blockFromSite]),
    notForGuardianship: booleanField(record[fields.notForGuardianship]),
    needsEditorialMatchProfile: true,
  };
}

/** Maps a consented guardianship request to Bitrix CRM lead fields. */
export function mapGuardianshipLead(input, config) {
  if (input.consent !== true) {
    throw new TypeError("Explicit guardianship consent is required");
  }

  const fields = config.guardianship.fields;
  return {
    feature: "guardianshipLeads",
    method: "crm.lead.add",
    payload: {
      fields: {
        TITLE: `Опека: ${requireValue(input.animalName, "animalName")}`,
        [fields.guardianName]: requireValue(input.guardianName, "guardianName"),
        [fields.guardianEmail]: input.email || "",
        [fields.guardianPhone]: input.phone || "",
        [fields.animalId]: requireValue(input.animalId, "animalId"),
        [fields.animalName]: input.animalName,
        [fields.consent]: true,
      },
      params: { REGISTER_SONET_EVENT: "N" },
    },
  };
}

/**
 * Maps a lightweight, explicitly consented follow-up request to crm.contact.add.
 * The human-readable interest is always kept in COMMENTS; a configured Bitrix
 * enumeration value is added only when its ID has been confirmed by an admin.
 */
export function mapContactCapture(input, config, { now = new Date() } = {}) {
  if (input.consent !== true) {
    throw new TypeError("Explicit personal-data consent is required");
  }

  const name = cleanSingleLine(input.name, "name", 80);
  const email = normalizeEmail(input.email);
  const animalId = cleanSingleLine(input.animalId, "animalId", 80);
  const animalName = cleanSingleLine(input.animalName, "animalName", 80);
  const interest = String(requireValue(input.interest, "interest"));
  const interestLabel = contactInterestLabels[interest];
  if (!interestLabel) throw new TypeError("interest is not allowed");

  const fields = config.contacts.fields;
  const enumId = config.contacts.interestEnums[interest];
  const date = now instanceof Date && !Number.isNaN(now.valueOf())
    ? now.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const contactFields = {
    NAME: name,
    EMAIL: [{ VALUE: email, VALUE_TYPE: "WORK" }],
    COMMENTS: `${interestLabel}. Подопечный: ${animalName} (${animalId}).`,
    [fields.consent]: true,
    [fields.consentAt]: date,
    [fields.submittedAt]: date,
  };

  if (config.contacts.sourceId && config.contacts.sourceId !== "<SET_IN_SERVER_ENV>") {
    contactFields.SOURCE_ID = config.contacts.sourceId;
  }
  if (enumId && enumId !== "<SET_IN_SERVER_ENV>") {
    contactFields[fields.interest] = enumId;
  }

  return {
    feature: "contacts",
    method: "crm.contact.add",
    responseMode: "json",
    payload: {
      fields: contactFields,
      params: { REGISTER_SONET_EVENT: "N" },
    },
  };
}

/** Maps an in-app care action to a configured Bitrix smart-process item. */
export function mapCareEvent(input, config) {
  const fields = config.care.fields;
  return {
    feature: "careEvents",
    method: "crm.item.add",
    payload: {
      entityTypeId: Number(config.care.entityTypeId),
      fields: {
        [fields.animalId]: requireValue(input.animalId, "animalId"),
        [fields.careType]: requireValue(input.careType, "careType"),
        [fields.occurredAt]: input.occurredAt || new Date().toISOString(),
      },
    },
  };
}
