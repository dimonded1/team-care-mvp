import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { CheckIcon } from "./Icons";
import {
  getContactCaptureMode,
  isValidContactEmail,
  isValidContactName,
  isValidContactPhone,
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
}

type SubmitState = "idle" | "submitting" | "success" | "error";

const initialForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  phone: "",
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

export function ContactCaptureForm({ animal }: ContactCaptureFormProps) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<ContactCaptureMode>("disabled");
  const [form, setForm] = useState(initialForm);
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

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const canSubmit = isValidContactName(form.firstName)
    && isValidContactName(form.lastName)
    && isValidContactName(form.middleName)
    && isValidContactPhone(form.phone)
    && isValidContactEmail(form.email)
    && Boolean(form.workSphere)
    && Boolean(form.preferredContact)
    && consent
    && mode === "enabled"
    && state !== "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !form.workSphere || !form.preferredContact) return;

    setState("submitting");
    setError("");
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
        <h2 id="contact-capture-title">Оставьте контакты — фонд расскажет о вариантах помощи</h2>
        <p>
          Это не оформление опеки и не пожертвование. Данные попадут в контакт
          Битрикс24, чтобы координатор мог связаться с вами по поводу {animal.name}.
        </p>
        {mode === "preview" ? (
          <small className="contact-capture__preview-note">
            На демо-странице отправка отключена. На сервере фонда форма будет передавать данные защищённому API.
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
            <fieldset className="contact-capture__group">
              <legend>Как к вам обращаться</legend>
              <div className="contact-capture__fields contact-capture__fields--identity">
                <label>
                  <span>Фамилия *</span>
                  <input name="lastName" autoComplete="family-name" maxLength={80} required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
                </label>
                <label>
                  <span>Имя *</span>
                  <input name="firstName" autoComplete="given-name" maxLength={80} required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
                </label>
                <label>
                  <span>Отчество *</span>
                  <input name="middleName" autoComplete="additional-name" maxLength={80} required value={form.middleName} onChange={(event) => update("middleName", event.target.value)} />
                </label>
              </div>
            </fieldset>

            <fieldset className="contact-capture__group">
              <legend>Как с вами связаться</legend>
              <div className="contact-capture__fields">
                <label>
                  <span>Телефон *</span>
                  <input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} required value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+7 900 000-00-00" />
                </label>
                <label>
                  <span>Email *</span>
                  <input name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="name@example.ru" />
                </label>
                <label>
                  <span>Предпочитаемый способ связи *</span>
                  <select name="preferredContact" required value={form.preferredContact} onChange={(event) => update("preferredContact", event.target.value)}>
                    <option value="">Выберите способ</option>
                    {preferredContactOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Telegram</span>
                  <input name="telegram" maxLength={120} value={form.telegram} onChange={(event) => update("telegram", event.target.value)} placeholder="@username" />
                </label>
                <label>
                  <span>MAX</span>
                  <input name="maxMessenger" maxLength={120} value={form.maxMessenger} onChange={(event) => update("maxMessenger", event.target.value)} placeholder="Ник или ссылка, если есть" />
                </label>
              </div>
            </fieldset>

            <fieldset className="contact-capture__group">
              <legend>Немного о вас</legend>
              <div className="contact-capture__fields">
                <label>
                  <span>Дата рождения</span>
                  <input name="birthDate" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} />
                </label>
                <label>
                  <span>Сфера работы *</span>
                  <select name="workSphere" required value={form.workSphere} onChange={(event) => update("workSphere", event.target.value)}>
                    <option value="">Выберите сферу</option>
                    {workSphereOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <label className="contact-capture__wide">
                  <span>Адрес</span>
                  <input name="address" autoComplete="street-address" maxLength={300} value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Город и адрес, если хотите указать" />
                </label>
                <label className="contact-capture__wide">
                  <span>О себе</span>
                  <textarea name="about" rows={3} maxLength={1500} value={form.about} onChange={(event) => update("about", event.target.value)} placeholder="Расскажите коротко о себе" />
                </label>
                <label>
                  <span>Хобби</span>
                  <textarea name="hobbies" rows={2} maxLength={500} value={form.hobbies} onChange={(event) => update("hobbies", event.target.value)} />
                </label>
                <label>
                  <span>Питомцы</span>
                  <textarea name="pets" rows={2} maxLength={500} value={form.pets} onChange={(event) => update("pets", event.target.value)} placeholder="Есть ли питомцы сейчас" />
                </label>
              </div>
            </fieldset>

            <label className="contact-capture__consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
              <span>
                Я соглашаюсь на обработку персональных данных и ознакомился(-ась) с{" "}
                <a href="#legal/privacy">политикой конфиденциальности</a>.
              </span>
            </label>

            {state === "error" ? <p className="contact-capture__error" role="alert">{error}</p> : null}

            <button className="button button--secondary button--full contact-capture__submit" type="submit" disabled={!canSubmit}>
              {mode === "preview" ? "Отправка доступна на сервере" : state === "submitting" ? "Отправляем…" : "Оставить контакты"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
