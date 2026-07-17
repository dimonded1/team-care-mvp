import { legalDocuments, type LegalDocumentId } from "../data/legalDocuments";
import { Logo } from "./Logo";

const externalLinks = [
  { label: "Устав фонда", href: "https://fond-nika.ru/upload/iblock/39d/4n113n65xuyob2z0c6sd687r6xyvqkzt.pdf" },
  { label: "Отчёты", href: "https://fond-nika.ru/about/documents-and-reports/" },
] as const;

interface SiteFooterProps {
  onOpenLegal: (documentId: LegalDocumentId) => void;
}

function FooterOrbitIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <ellipse cx="16" cy="16" rx="12" ry="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-20 16 16)" />
      <circle cx="27" cy="12" r="2" fill="#F76D31" />
    </svg>
  );
}

export function SiteFooter({ onOpenLegal }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <a
          className="site-footer__logo"
          href="https://fond-nika.ru"
          target="_blank"
          rel="noreferrer"
          aria-label="Перейти на сайт фонда НИКА"
        >
          <Logo light />
        </a>
        <p>
          <span>Благотворительный фонд «Ника» · 2011—2026</span>
          <span>Пятнадцать лет делаем невидимых видимыми</span>
        </p>
        <nav className="site-footer__links" aria-label="Юридическая информация фонда">
          {legalDocuments.map((document) => (
            <button
              key={document.id}
              type="button"
              data-legal-id={document.id}
              aria-haspopup="dialog"
              onClick={() => onOpenLegal(document.id)}
            >
              <FooterOrbitIcon />
              <span>{document.shortTitle}</span>
            </button>
          ))}
          {externalLinks.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" data-external-legal>
              <FooterOrbitIcon />
              <span>{link.label}</span>
              <span className="site-footer__external-mark" aria-hidden="true">↗</span>
              <span className="visually-hidden">Откроется на сайте фонда</span>
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
