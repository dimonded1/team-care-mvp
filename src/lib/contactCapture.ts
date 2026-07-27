export type ContactInterest = "guardianship" | "visits" | "updates";
export type ContactCaptureMode = "enabled" | "preview" | "disabled";

export interface ContactCapturePayload {
  name: string;
  email: string;
  interest: ContactInterest;
  animalId: string;
  animalName: string;
  consent: true;
}

export const contactInterestOptions: ReadonlyArray<{
  id: ContactInterest;
  label: string;
  description: string;
}> = [
  {
    id: "guardianship",
    label: "Узнать об опеке",
    description: "Понять формат регулярной помощи и следующий шаг.",
  },
  {
    id: "visits",
    label: "Навещать и помогать",
    description: "Узнать о встречах, прогулках и помощи подопечному.",
  },
  {
    id: "updates",
    label: "Следить за историей",
    description: "Получать новости о подопечном и его поиске дома.",
  },
];

export function isValidContactEmail(value: string) {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email);
}

export function isValidContactName(value: string) {
  const name = value.replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 80;
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
