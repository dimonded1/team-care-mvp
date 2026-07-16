import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  getLegalDocument,
  legalDocuments,
  type LegalDocumentId,
} from "../data/legalDocuments";
import { Logo } from "./Logo";

interface LegalCenterProps {
  documentId: LegalDocumentId;
  onChangeDocument: (documentId: LegalDocumentId) => void;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LegalCenter({ documentId, onChangeDocument, onClose }: LegalCenterProps) {
  const activeDocument = getLegalDocument(documentId);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const paperRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const backgroundSurfaces = [
      document.querySelector<HTMLElement>(".screen-frame"),
      document.querySelector<HTMLElement>(".site-footer"),
    ].filter((element): element is HTMLElement => Boolean(element));
    const previousOverflow = document.body.style.overflow;

    backgroundSurfaces.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = closeButtonRef.current?.closest<HTMLElement>("[role='dialog']");
      const focusable = dialog
        ? [...dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
        )].filter((element) => !element.hidden)
        : [];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundSurfaces.forEach((element) => {
        element.inert = false;
      });
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    paperRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
  }, [documentId, reduceMotion]);

  return (
    <motion.div
      className="legal-center"
      data-testid="legal-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <span className="legal-center__orbit legal-center__orbit--one" aria-hidden="true" />
      <span className="legal-center__orbit legal-center__orbit--two" aria-hidden="true" />
      <span className="legal-center__planet legal-center__planet--one" aria-hidden="true" />
      <span className="legal-center__planet legal-center__planet--two" aria-hidden="true" />

      <motion.section
        className="legal-center__shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-center-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 34, scale: 0.965 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.975 }}
        transition={reduceMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 310, damping: 31, mass: 0.9 }}
      >
        <header className="legal-center__header">
          <a href="https://fond-nika.ru" target="_blank" rel="noreferrer" aria-label="Сайт фонда НИКА">
            <Logo light />
          </a>
          <button
            ref={closeButtonRef}
            className="legal-center__close"
            type="button"
            onClick={onClose}
          >
            <span>Закрыть</span>
            <CloseIcon />
          </button>
        </header>

        <div className="legal-center__layout">
          <nav className="legal-center__documents" aria-label="Документы фонда">
            <div className="legal-center__document-grid">
              {legalDocuments.map((document) => {
                const selected = document.id === documentId;
                return (
                  <button
                    key={document.id}
                    type="button"
                    className={selected ? "legal-document-tab legal-document-tab--active" : "legal-document-tab"}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => onChangeDocument(document.id)}
                  >
                    <span className="legal-document-tab__number">{document.number}</span>
                    <strong>{document.shortTitle}</strong>
                    <span className="legal-document-tab__planet" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </nav>

          <article ref={paperRef} className="legal-center__paper">
            <header className="legal-center__paper-header">
              <h1 id="legal-center-title">{activeDocument.title}</h1>
              <p>{activeDocument.description}</p>
            </header>
            <div
              className="legal-copy"
              dangerouslySetInnerHTML={{ __html: activeDocument.html }}
            />
          </article>
        </div>
      </motion.section>
    </motion.div>
  );
}
