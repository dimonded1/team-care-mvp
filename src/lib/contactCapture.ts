export type ContactCaptureMode = "enabled" | "preview" | "disabled";

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

const CAMPAIGN_STORAGE_KEY = "nika-team-care-campaign";

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

/**
 * The mark arrives once, in the URL behind the QR code, and the visitor then plays
 * through several stages before the form appears — so it is kept for the session.
 */
export function getCampaignTag() {
  if (typeof window === "undefined") return "";
  const fromUrl = readCampaignTag();
  try {
    if (fromUrl) {
      window.sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return normalizeCampaignTag(window.sessionStorage.getItem(CAMPAIGN_STORAGE_KEY) ?? "");
  } catch {
    return fromUrl;
  }
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

export function isValidContactName(value: string) {
  const name = value.replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 80;
}

export function isValidContactPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
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
    if (!response.ok) return resolveContactCaptureMode(false);
    const body = await response.json();
    return resolveContactCaptureMode(body?.contactCaptureEnabled === true);
  } catch {
    return resolveContactCaptureMode(false);
  }
}

export async function submitContactCapture(payload: ContactCapturePayload) {
  const response = await fetch("/api/contact-capture", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
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
