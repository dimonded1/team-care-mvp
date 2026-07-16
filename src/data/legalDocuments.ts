import consentHtml from "../content/legal/consent.html?raw";
import offerHtml from "../content/legal/offer.html?raw";
import privacyHtml from "../content/legal/privacy.html?raw";
import requisitesHtml from "../content/legal/requisites.html?raw";

export type LegalDocumentId = "offer" | "privacy" | "consent" | "requisites";

export interface LegalDocument {
  id: LegalDocumentId;
  number: string;
  shortTitle: string;
  title: string;
  description: string;
  html: string;
}

export const legalDocuments: readonly LegalDocument[] = [
  {
    id: "offer",
    number: "01",
    shortTitle: "Публичная оферта",
    title: "Публичная оферта о заключении договора пожертвования",
    description: "Условия передачи и использования пожертвований в пользу фонда.",
    html: offerHtml,
  },
  {
    id: "privacy",
    number: "02",
    shortTitle: "Политика конфиденциальности",
    title: "Политика в отношении обработки персональных данных",
    description: "Как фонд получает, использует и защищает персональные данные.",
    html: privacyHtml,
  },
  {
    id: "consent",
    number: "03",
    shortTitle: "Согласие на обработку ПД",
    title: "Согласие на обработку персональных данных",
    description: "Перечень данных, действий с ними и порядок отзыва согласия.",
    html: consentHtml,
  },
  {
    id: "requisites",
    number: "04",
    shortTitle: "Реквизиты",
    title: "Реквизиты благотворительного фонда «НИКА»",
    description: "Официальные сведения и банковские реквизиты фонда.",
    html: requisitesHtml,
  },
] as const;

export function isLegalDocumentId(value: string): value is LegalDocumentId {
  return legalDocuments.some((document) => document.id === value);
}

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  return legalDocuments.find((document) => document.id === id) ?? legalDocuments[0];
}

export function getLegalDocumentIdFromHash(hash: string): LegalDocumentId | null {
  const match = hash.match(/^#legal\/([^/?#]+)/);
  return match && isLegalDocumentId(match[1]) ? match[1] : null;
}
