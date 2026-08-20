import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckIcon, ShareIcon } from "./Icons";
import {
  getContactCaptureMode,
  createContactCaptureRequestTracker,
  createContactCaptureSubmitGate,
  formatRussianContactPhone,
  isContactCaptureRequiredStepComplete,
  isValidContactEmail,
  isValidContactName,
  isValidContactPhone,
  normalizeContactEmailInput,
  preferredContactOptions,
  submitContactCapture,
  workSphereOptions,
  type ContactCaptureMode,
  type PreferredContact,
  type WorkSphere,
} from "../lib/contactCapture";
import type { Animal } from "../types/app";

interface ContactCaptureFormProps {
  animal: Animal;
  campaign?: string;
}

type SubmitState = "idle" | "submitting" | "success" | "error";
type ContactFormStep = "required" | "optional";

const initialForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  phone: "+7",
  birthDate: "",
  workSphere: "" as WorkSphere | "",
  email: "",
  address: "",
  telegram: "",
  about: "",
  hobbies: "",
  pets: "",
  preferredContact: "" as PreferredContact | "",
  maxMessenger: "",
};

export function ContactCaptureForm({ animal, campaign }: ContactCaptureFormProps) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<ContactCaptureMode>("disabled");
  const [form, setForm] = useState(initialForm);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [formStep, setFormStep] = useState<ContactFormStep>("required");
  const [requiredAttempted, setRequiredAttempted] = useState(false);
  const [stepError, setStepError] = useState("");
  const [touchedContact, setTouchedContact] = useState({ phone: false, email: false });
  const submitGate = useRef(createContactCaptureSubmitGate());
  const requestTracker = useRef(createContactCaptureRequestTracker());
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

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

  const update = (field: keyof typeof initialForm, value: string) => {
    requestTracker.current.reset();
    setForm((current) => ({ ...current, [field]: value }));
  };

  const requiredStepComplete = isContactCaptureRequiredStepComplete(form);
  const canSubmit = requiredStepComplete
    && consent
    && mode === "enabled"
    && state !== "submitting";
  const phoneError = touchedContact.phone && !isValidContactPhone(form.phone);
  const emailError = touchedContact.email && !isValidContactEmail(form.email);

  const moveToStep = (nextStep: ContactFormStep) => {
    setFormStep(nextStep);
    setStepError("");
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  };

  const advanceToOptional = () => {
    setRequiredAttempted(true);
    setTouchedContact({ phone: true, email: true });
    if (!requiredStepComplete) {
      setStepError("Заполните обязательные поля — мы сохраним введённое на этом экране.");
      window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
      return;
    }
    moveToStep("optional");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !form.workSphere || !form.preferredContact) return;
    if (!submitGate.current.tryStart()) return;

    setState("submitting");
    setError("");
    const requestId = requestTracker.current.current();
    try {
      await submitContactCapture({
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName,
        phone: form.phone,
        birthDate: form.birthDate || undefined,
        workSphere: form.workSphere,
        email: form.email,
        address: form.address || undefined,
        telegram: form.telegram || undefined,
        about: form.about || undefined,
        hobbies: form.hobbies || undefined,
        pets: form.pets || undefined,
        preferredContact: form.preferredContact,
        maxMessenger: form.maxMessenger || undefined,
        animalId: animal.id,
        animalName: animal.name,
        campaign,
        consent: true,
      }, requestId);
      requestTracker.current.reset();
      setState("success");
    } catch (submitError) {
      setState("error");
      setError(submitError instanceof Error ? submitError.message : "Не получилось отправить контакты.");
    } finally {
      submitGate.current.release();
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
        <h2 id="contact-capture-title">Оставьте контакты — фонд расскажет о вариантах помощи</h2>
        <p>
          Это не оформление опеки и не пожертвование. Можно спокойно рассказать
          о себе и выбрать удобный способ продолжить знакомство с {animal.name}.
        </p>
        {mode === "preview" ? (
          <small className="contact-capture__preview-note">
            На демо-странице отправка отключена. На сервере фонда форма будет передавать данные защищённому API.
          </small>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {mode === "unavailable" ? (
          <motion.div
            key="unavailable"
            className="contact-capture__success"
            role="status"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div>
              <strong>Форма временно недоступна</strong>
              <p>Пожалуйста, напишите фонду напрямую — персональные данные на этой странице не сохраняются.</p>
              <a className="button button--secondary" href="mailto:info@fond-nika.ru">Написать фонду</a>
            </div>
          </motion.div>
        ) : state === "success" ? (
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
              <p>Спасибо. Заявка на связь не создаёт финансовых обязательств.</p>
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
            <div className="contact-capture__stepper" aria-label="Шаги анкеты">
              <span className="is-active" aria-current={formStep === "required" ? "step" : undefined}>
                <b>1</b> Главное
              </span>
              <i aria-hidden="true" />
              <span className={formStep === "optional" ? "is-active" : ""} aria-current={formStep === "optional" ? "step" : undefined}>
                <b>2</b> Дополнительно
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {formStep === "required" ? (
                <motion.div
                  key="required"
                  className="contact-capture__step"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
                >
                  <div className="contact-capture__step-heading">
                    <span>Шаг 1 из 2 · только необходимое</span>
                    <h3 ref={formStep === "required" ? stepHeadingRef : undefined} tabIndex={-1}>Как с вами связаться</h3>
                    <p>Сначала — контакты и удобный способ ответа. Остальное можно добавить на следующем шаге.</p>
                  </div>

                  <fieldset className="contact-capture__group">
                    <legend>Как к вам обращаться</legend>
                    <div className="contact-capture__fields contact-capture__fields--identity">
                      <label>
                        <span>Фамилия *</span>
                        <input name="lastName" autoComplete="family-name" maxLength={80} required value={form.lastName} aria-invalid={requiredAttempted && !isValidContactName(form.lastName)} onChange={(event) => update("lastName", event.target.value)} />
                      </label>
                      <label>
                        <span>Имя *</span>
                        <input name="firstName" autoComplete="given-name" maxLength={80} required value={form.firstName} aria-invalid={requiredAttempted && !isValidContactName(form.firstName)} onChange={(event) => update("firstName", event.target.value)} />
                      </label>
                      <label>
                        <span>Отчество *</span>
                        <input name="middleName" autoComplete="additional-name" maxLength={80} required value={form.middleName} aria-invalid={requiredAttempted && !isValidContactName(form.middleName)} onChange={(event) => update("middleName", event.target.value)} />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="contact-capture__group">
                    <legend>Контакты</legend>
                    <div className="contact-capture__fields">
                      <label>
                        <span>Телефон *</span>
                        <input
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          maxLength={17}
                          required
                          value={form.phone}
                          onChange={(event) => update("phone", formatRussianContactPhone(event.target.value))}
                          onBlur={() => setTouchedContact((current) => ({ ...current, phone: true }))}
                          placeholder="+7(999)-777-77-77"
                          aria-invalid={phoneError}
                          aria-describedby={phoneError ? "contact-phone-error" : undefined}
                        />
                        {phoneError ? <small id="contact-phone-error" className="contact-capture__field-error" role="alert">Введите 10 цифр после +7: +7(999)-777-77-77</small> : null}
                      </label>
                      <label>
                        <span>Email *</span>
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          maxLength={254}
                          required
                          value={form.email}
                          onChange={(event) => update("email", normalizeContactEmailInput(event.target.value))}
                          onBlur={() => setTouchedContact((current) => ({ ...current, email: true }))}
                          placeholder="name@example.ru"
                          pattern="[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}"
                          aria-invalid={emailError}
                          aria-describedby={emailError ? "contact-email-error" : undefined}
                        />
                        {emailError ? <small id="contact-email-error" className="contact-capture__field-error" role="alert">{form.email.includes("@") ? "Проверьте адрес после @, например name@example.ru" : "Добавьте знак @, например name@example.ru"}</small> : null}
                      </label>
                      <label>
                        <span>Как удобнее ответить *</span>
                        <select name="preferredContact" required value={form.preferredContact} aria-invalid={requiredAttempted && !form.preferredContact} onChange={(event) => update("preferredContact", event.target.value)}>
                          <option value="">Выберите способ</option>
                          {preferredContactOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Сфера работы *</span>
                        <select name="workSphere" required value={form.workSphere} aria-invalid={requiredAttempted && !form.workSphere} onChange={(event) => update("workSphere", event.target.value)}>
                          <option value="">Выберите сферу</option>
                          {workSphereOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                  </fieldset>

                  {stepError ? <p className="contact-capture__step-error" role="alert">{stepError}</p> : null}
                  <button className="button button--secondary button--full contact-capture__next" type="button" onClick={advanceToOptional}>
                    Продолжить <span aria-hidden="true">→</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="optional"
                  className="contact-capture__step"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : 8 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
                >
                  <div className="contact-capture__step-heading">
                    <span>Шаг 2 из 2 · по желанию</span>
                    <h3 ref={formStep === "optional" ? stepHeadingRef : undefined} tabIndex={-1}>Расскажите немного о себе</h3>
                    <p>Дополнительные ответы помогут фонду предложить удобный формат участия. Их можно пропустить.</p>
                  </div>

                  <fieldset className="contact-capture__group">
                    <legend>Другие способы связи</legend>
                    <div className="contact-capture__fields">
                      <label><span>Telegram</span><input name="telegram" maxLength={120} value={form.telegram} onChange={(event) => update("telegram", event.target.value)} placeholder="@username" /></label>
                      <label><span>MAX</span><input name="maxMessenger" maxLength={120} value={form.maxMessenger} onChange={(event) => update("maxMessenger", event.target.value)} placeholder="Ник или ссылка, если есть" /></label>
                    </div>
                  </fieldset>

                  <fieldset className="contact-capture__group">
                    <legend>Немного о вас</legend>
                    <div className="contact-capture__fields">
                      <label><span>Дата рождения</span><input name="birthDate" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} /></label>
                      <label className="contact-capture__wide"><span>Адрес</span><input name="address" autoComplete="street-address" maxLength={300} value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Город и адрес, если хотите указать" /></label>
                      <label className="contact-capture__wide"><span>О себе</span><textarea name="about" rows={3} maxLength={1500} value={form.about} onChange={(event) => update("about", event.target.value)} placeholder="Расскажите коротко о себе" /></label>
                      <label><span>Хобби</span><textarea name="hobbies" rows={2} maxLength={500} value={form.hobbies} onChange={(event) => update("hobbies", event.target.value)} /></label>
                      <label><span>Питомцы</span><textarea name="pets" rows={2} maxLength={500} value={form.pets} onChange={(event) => update("pets", event.target.value)} placeholder="Есть ли питомцы сейчас" /></label>
                    </div>
                  </fieldset>

                  <label className="contact-capture__consent">
                    <input type="checkbox" checked={consent} onChange={(event) => { requestTracker.current.reset(); setConsent(event.target.checked); }} required />
                    <span>Я соглашаюсь на обработку персональных данных и ознакомился(-ась) с <a href="#legal/privacy">политикой конфиденциальности</a>.</span>
                  </label>

                  {state === "error" ? <p className="contact-capture__error" role="alert">{error}</p> : null}

                  <div className="contact-capture__actions">
                    <button className="text-button contact-capture__back" type="button" onClick={() => moveToStep("required")}>← Назад к контактам</button>
                    <button className="button button--secondary button--full contact-capture__submit" type="submit" disabled={!canSubmit}>
                      {mode === "enabled" && state !== "submitting" ? <ShareIcon /> : null}
                      {mode === "preview" ? "Отправка доступна на сервере" : state === "submitting" ? "Отправляем…" : "Поделиться контактами"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
