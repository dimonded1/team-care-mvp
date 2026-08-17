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

const allowedWorkSpheres = new Set([
  "publicService",
  "budgetOrganization",
  "media",
  "research",
  "socialEnterprise",
  "selfEmployed",
  "russianBusiness",
  "internationalBusiness",
  "socialNonprofit",
  "other",
]);

const allowedPreferredContacts = new Set(["whatsapp", "phone", "email", "telegram", "max"]);

/**
 * Campaign marks travel through printed QR codes and shared links, so an unreadable
 * one is dropped instead of throwing: a visitor must never lose a submission over it.
 */
function normalizeCampaignTag(value) {
  const tag = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/u.test(tag) ? tag : "";
}

function optionalSingleLine(value, name, maxLength) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return cleanSingleLine(value, name, maxLength);
}

function optionalText(value, name, maxLength) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const normalized = stripMarkup(value);
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${name} must contain 1-${maxLength} characters`);
  }
  return normalized;
}

function normalizePhone(value) {
  const phone = String(requireValue(value, "phone")).trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15 || /[\r\n]/u.test(phone)) {
    throw new TypeError("phone must contain 10-15 digits");
  }
  return phone;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new TypeError("birthDate must use YYYY-MM-DD");
  }
  if (date > new Date().toISOString().slice(0, 10)) {
    throw new TypeError("birthDate cannot be in the future");
  }
  return date;
}

function normalizeTelegram(value) {
  const input = optionalSingleLine(value, "telegram", 120);
  if (!input) return null;
  if (/^https:\/\/t\.me\/[a-zA-Z0-9_]{5,32}$/u.test(input)) return input;
  const username = input.replace(/^@/u, "");
  if (!/^[a-zA-Z0-9_]{5,32}$/u.test(username)) {
    throw new TypeError("telegram must be a username or t.me link");
  }
  return `https://t.me/${username}`;
}

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
 * Maps an explicitly consented follow-up request to crm.contact.add.
 * All enumeration values are resolved through an allowlisted server-side map.
 */
export function mapContactCapture(input, config, { now = new Date() } = {}) {
  if (input.consent !== true) {
    throw new TypeError("Explicit personal-data consent is required");
  }

  const firstName = cleanSingleLine(input.firstName, "firstName", 80);
  const lastName = cleanSingleLine(input.lastName, "lastName", 80);
  const middleName = cleanSingleLine(input.middleName, "middleName", 80);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const birthDate = normalizeDate(input.birthDate);
  const address = optionalSingleLine(input.address, "address", 300);
  const telegram = normalizeTelegram(input.telegram);
  const about = optionalText(input.about, "about", 1500);
  const hobbies = optionalText(input.hobbies, "hobbies", 500);
  const pets = optionalText(input.pets, "pets", 500);
  const maxMessenger = optionalSingleLine(input.maxMessenger, "maxMessenger", 120);
  const animalId = cleanSingleLine(input.animalId, "animalId", 80);
  const animalName = cleanSingleLine(input.animalName, "animalName", 80);
  const workSphere = String(requireValue(input.workSphere, "workSphere"));
  const preferredContact = String(requireValue(input.preferredContact, "preferredContact"));
  if (!allowedWorkSpheres.has(workSphere)) throw new TypeError("workSphere is not allowed");
  if (!allowedPreferredContacts.has(preferredContact)) throw new TypeError("preferredContact is not allowed");

  const campaign = normalizeCampaignTag(input.campaign);
  const eventComment = campaign === "4-lapy" ? "Мероприятие: 4 лапы. " : "";

  const fields = config.contacts.fields;
  const workSphereEnumId = config.contacts.workSphereEnums[workSphere];
  const preferredContactEnumId = config.contacts.preferredContactEnums[preferredContact];
  // The interest field is multiple: an event visitor keeps the programme interest
  // and gains the event one, so both reports stay correct.
  const interestEnumIds = [config.contacts.interestEnums.guardianship];
  if (
    campaign
    && config.contacts.eventInterestEnumId
    && config.contacts.eventCampaigns.includes(campaign)
  ) {
    interestEnumIds.push(config.contacts.eventInterestEnumId);
  }
  const date = now instanceof Date && !Number.isNaN(now.valueOf())
    ? now.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const contactFields = {
    NAME: firstName,
    LAST_NAME: lastName,
    SECOND_NAME: middleName,
    PHONE: [{ VALUE: phone, VALUE_TYPE: "MOBILE" }],
    EMAIL: [{ VALUE: email, VALUE_TYPE: "WORK" }],
    COMMENTS: `Интерес к программе опеки. ${eventComment}Подопечный: ${animalName} (${animalId}).`,
    [fields.workSphere]: workSphereEnumId,
    [fields.preferredContact]: preferredContactEnumId,
    [fields.interest]: interestEnumIds,
    [fields.consent]: true,
    [fields.consentAt]: date,
    [fields.submittedAt]: date,
  };

  if (config.contacts.sourceId && config.contacts.sourceId !== "<SET_IN_SERVER_ENV>") {
    contactFields.SOURCE_ID = config.contacts.sourceId;
  }
  const sourceDescription = [
    config.contacts.sourceDescription,
    campaign ? `метка: ${campaign}` : "",
  ].filter(Boolean).join(" · ");
  if (sourceDescription) contactFields.SOURCE_DESCRIPTION = sourceDescription;
  if (birthDate) contactFields.BIRTHDATE = birthDate;
  if (address) contactFields.ADDRESS = address;
  if (telegram) contactFields[fields.telegram] = telegram;
  if (about) contactFields[fields.about] = about;
  if (hobbies) contactFields[fields.hobbies] = hobbies;
  if (pets) contactFields[fields.pets] = pets;
  if (maxMessenger) contactFields[fields.maxMessenger] = maxMessenger;

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
