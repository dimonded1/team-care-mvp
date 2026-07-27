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

/** Creates the read request for published animal deals. */
export function buildAnimalListRequest(config, { start = 0 } = {}) {
  const fields = config.animal.fields;
  return {
    feature: "animalSync",
    method: "crm.deal.list",
    responseMode: "json",
    payload: {
      order: { ID: "ASC" },
      filter: {
        CATEGORY_ID: Number(config.animal.categoryId),
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
