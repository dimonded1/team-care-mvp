import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, useEffect, useId, useState } from "react";
import { CheckIcon } from "./Icons";
import {
  contactInterestOptions,
  getContactCaptureMode,
  isValidContactEmail,
  isValidContactName,
  submitContactCapture,
  type ContactCaptureMode,
  type ContactInterest,
} from "../lib/contactCapture";
import type { Animal } from "../types/app";

interface ContactCaptureFormProps {
  animal: Animal;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactCaptureForm({ animal }: ContactCaptureFormProps) {
  const reduceMotion = useReducedMotion();
  const nameId = useId();
  const emailId = useId();
  const consentId = useId();
  const [mode, setMode] = useState<ContactCaptureMode>("disabled");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<ContactInterest>("guardianship");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getContactCaptureMode(controller.signal).then((nextMode) => {
      if (active) setMode(nextMode);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (mode === "disabled") return null;

  const canSubmit = isValidContactName(name)
    && isValidContactEmail(email)
    && consent
    && mode === "enabled"
    && state !== "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setError("");
    try {
      await submitContactCapture({
        name: name.replace(/\s+/g, " ").trim(),
        email: email.trim().toLowerCase(),
        interest,
        animalId: animal.id,
        animalName: animal.name,
        consent: true,
      });
      setState("success");
    } catch (submitError) {
      setState("error");
      setError(submitError instanceof Error ? submitError.message : "Не получилось отправить контакты.");
    }
  };

  return (
    <motion.section
      className="contact-capture"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="contact-capture-title"
    >
      <div className="contact-capture__heading">
        <span>{mode === "preview" ? "Предпросмотр формы" : "Можно начать легче"}</span>
        <h2 id="contact-capture-title">Оставьте контакт — мы расскажем о вариантах помощи</h2>
        <p>
          Это не оформление опеки и не пожертвование. Координатор фонда сможет
          связаться с вами и ответить на вопросы о {animal.name}.
        </p>
        {mode === "preview" ? (
          <small className="contact-capture__preview-note">
            На демо-странице отправка отключена. Она заработает после публикации на сервере фонда.
          </small>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {state === "success" ? (
          <motion.div
            key="success"
            className="contact-capture__success"
            role="status"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span aria-hidden="true"><CheckIcon /></span>
            <div>
              <strong>Контакт передан фонду</strong>
              <p>Спасибо. Это только заявка на связь — никаких обязательств она не создаёт.</p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="contact-capture__form"
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="contact-capture__fields">
              <label htmlFor={nameId}>
                <span>Имя</span>
                <input
                  id={nameId}
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Как к вам обращаться"
                />
              </label>
              <label htmlFor={emailId}>
                <span>Email</span>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.ru"
                />
              </label>
            </div>

            <fieldset className="contact-capture__interests">
              <legend>Что вам сейчас ближе</legend>
              {contactInterestOptions.map((option) => (
                <label key={option.id} className={interest === option.id ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name="interest"
                    value={option.id}
                    checked={interest === option.id}
                    onChange={() => setInterest(option.id)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <i aria-hidden="true">{interest === option.id ? <CheckIcon /> : ""}</i>
                </label>
              ))}
            </fieldset>

            <label className="contact-capture__consent" htmlFor={consentId}>
              <input
                id={consentId}
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>
                Я соглашаюсь на обработку персональных данных и ознакомился(-ась) с{" "}
                <a href="#legal/privacy">политикой конфиденциальности</a>.
              </span>
            </label>

            {state === "error" ? <p className="contact-capture__error" role="alert">{error}</p> : null}

            <button
              className="button button--secondary button--full contact-capture__submit"
              type="submit"
              disabled={!canSubmit}
            >
              {mode === "preview"
                ? "Отправка доступна на сервере"
                : state === "submitting"
                  ? "Отправляем…"
                  : "Оставить контакт"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
