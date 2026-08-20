export type ContactCaptureMode = "enabled" | "preview" | "disabled" | "unavailable";

export type WorkSphere =
  | "publicService"
  | "budgetOrganization"
  | "media"
  | "research"
  | "socialEnterprise"
  | "selfEmployed"
  | "russianBusiness"
  | "internationalBusiness"
  | "socialNonprofit"
  | "other";

export type PreferredContact = "whatsapp" | "phone" | "email" | "telegram" | "max";

export interface ContactCapturePayload {
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  birthDate?: string;
  workSphere: WorkSphere;
  email: string;
  address?: string;
  telegram?: string;
  about?: string;
  hobbies?: string;
  pets?: string;
  preferredContact: PreferredContact;
  maxMessenger?: string;
  animalId: string;
  animalName: string;
  campaign?: string;
  consent: true;
}

export interface ContactCaptureRequiredFields {
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  email: string;
  workSphere: string;
  preferredContact: string;
}

/**
 * Keeps a submit attempt synchronous until the request settles. This prevents
 * two browser submit events from racing React's asynchronous state update.
 */
export function createContactCaptureSubmitGate() {
  let locked = false;

  return {
    tryStart() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
  };
}

export function normalizeCampaignTag(value: string) {
  const tag = value.trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/u.test(tag) ? tag : "";
}

export function readCampaignTag(
  search = typeof window === "undefined" ? "" : window.location.search,
) {
  const params = new URLSearchParams(search);
  return normalizeCampaignTag(params.get("e") ?? params.get("utm_campaign") ?? "");
}

export const workSphereOptions: ReadonlyArray<{ id: WorkSphere; label: string }> = [
  { id: "publicService", label: "Государственная служба" },
  { id: "budgetOrganization", label: "Бюджетная или казённая организация" },
  { id: "media", label: "СМИ или информационное агентство" },
  { id: "research", label: "Исследовательская организация или НИИ" },
  { id: "socialEnterprise", label: "Коммерческая организация — социальное предприятие" },
  { id: "selfEmployed", label: "Индивидуальный предприниматель или фриланс" },
  { id: "russianBusiness", label: "Российская коммерческая организация" },
  { id: "internationalBusiness", label: "Международная коммерческая организация" },
  { id: "socialNonprofit", label: "Социально ориентированная некоммерческая организация" },
  { id: "other", label: "Другое" },
];

export const preferredContactOptions: ReadonlyArray<{ id: PreferredContact; label: string }> = [
  { id: "phone", label: "Телефон" },
  { id: "email", label: "Email" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "max", label: "MAX" },
];

export function isValidContactEmail(value: string) {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email);
}

export function normalizeContactEmailInput(value: string) {
  return value.replace(/\s+/g, "").slice(0, 254);
}

export function isValidContactName(value: string) {
  const name = value.replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 80;
}

export function isValidContactPhone(value: string) {
  return /^\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}$/u.test(value);
}

export function isContactCaptureRequiredStepComplete(value: ContactCaptureRequiredFields) {
  return isValidContactName(value.firstName)
    && isValidContactName(value.lastName)
    && isValidContactName(value.middleName)
    && isValidContactPhone(value.phone)
    && isValidContactEmail(value.email)
    && Boolean(value.workSphere)
    && Boolean(value.preferredContact);
}

export function formatRussianContactPhone(value: string) {
  const rawDigits = value.replace(/\D/g, "");
  const normalizedDigits = rawDigits.startsWith("8") && rawDigits.length > 10
    ? `7${rawDigits.slice(1)}`
    : rawDigits;
  const subscriber = (normalizedDigits.startsWith("7")
    ? normalizedDigits.slice(1)
    : normalizedDigits).slice(0, 10);

  let formatted = "+7";
  if (subscriber.length === 0) return formatted;
  formatted += `(${subscriber.slice(0, 3)}`;
  if (subscriber.length < 3) return formatted;
  formatted += ")";
  if (subscriber.length === 3) return formatted;
  formatted += `-${subscriber.slice(3, 6)}`;
  if (subscriber.length <= 6) return formatted;
  formatted += `-${subscriber.slice(6, 8)}`;
  if (subscriber.length <= 8) return formatted;
  return `${formatted}-${subscriber.slice(8, 10)}`;
}

export function resolveContactCaptureMode(
  enabled: boolean,
  hostname = typeof window === "undefined" ? "" : window.location.hostname,
): ContactCaptureMode {
  if (enabled) return "enabled";
  return hostname.endsWith(".github.io") ? "preview" : "disabled";
}

export async function getContactCaptureMode(signal?: AbortSignal): Promise<ContactCaptureMode> {
  try {
    const response = await fetch("/api/public-config", {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
    });
    if (!response.ok) return "unavailable";
    const body = await response.json();
    return resolveContactCaptureMode(body?.contactCaptureEnabled === true);
  } catch {
    return "unavailable";
  }
}

function createContactCaptureRequestId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createContactCaptureRequestTracker(
  createId: () => string = createContactCaptureRequestId,
) {
  let requestId: string | null = null;
  return {
    current() {
      requestId ??= createId();
      return requestId;
    },
    reset() {
      requestId = null;
    },
  };
}

export async function submitContactCapture(
  payload: ContactCapturePayload,
  requestId: string = createContactCaptureRequestId(),
) {
  const response = await fetch("/api/contact-capture", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    throw new Error("Слишком много попыток. Попробуйте ещё раз немного позже.");
  }
  if (!response.ok) {
    throw new Error("Не получилось отправить контакты. Попробуйте ещё раз позже.");
  }
}
