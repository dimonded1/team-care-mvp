import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { CheckIcon, DownloadIcon, HeartIcon, ShareIcon } from "../components/Icons";
import { ContactCaptureForm } from "../components/ContactCaptureForm";
import type { Animal, ExperienceMode } from "../types/app";
import { getContactCampaignForExperience, isFourPawsEvent } from "../lib/experience";
import { recordJourneyDiagnostic } from "../lib/journeyDiagnostics";

interface FinalScreenProps {
  animal: Animal;
  onBack: () => void;
  onRestart: () => void;
  experienceMode: ExperienceMode;
}

type CardState =
  | { status: "loading" }
  | { status: "ready"; blob: Blob; url: string }
  | { status: "error"; message: string };

type ActionFeedback = "idle" | "saved" | "shared";

export function FinalScreen({ animal, experienceMode, onBack, onRestart }: FinalScreenProps) {
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const [generation, setGeneration] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>("idle");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileName = useMemo(() => `nika-${animal.id}-care-story-9x16.png`, [animal.id]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort(new Error("Загрузка заняла слишком много времени. Проверьте интернет и попробуйте ещё раз."));
    }, 20_000);
    setCard({ status: "loading" });
    // Also bound the dynamic import: it may itself stall on a mobile network.
    const failed = () => {
      if (!active) return;
      recordJourneyDiagnostic("card.generate-error");
      setCard({ status: "error", message: "Не удалось загрузить карточку. Проверьте интернет и попробуйте ещё раз — игровой прогресс сохранён." });
    };
    controller.signal.addEventListener("abort", failed, { once: true });
    import("../lib/card").then(({ createResultCard }) => createResultCard(animal, {}, controller.signal))
      .then((blob) => {
        window.clearTimeout(timeout);
        if (!active || controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setCard({ status: "ready", blob, url: objectUrl });
      })
      .catch(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) {
          failed();
          controller.signal.removeEventListener("abort", failed);
          controller.abort();
        }
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.signal.removeEventListener("abort", failed);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [animal, generation]);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const showActionFeedback = (next: Exclude<ActionFeedback, "idle">) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setActionFeedback(next);
    feedbackTimer.current = setTimeout(() => setActionFeedback("idle"), 1800);
  };

  const saveCard = () => {
    if (card.status !== "ready") return;
    const link = document.createElement("a");
    link.href = card.url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    showActionFeedback("saved");
  };

  const shareCard = async () => {
    if (card.status !== "ready") return;
    const file = new File([card.blob], fileName, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `Знакомьтесь: ${animal.name} | фонд НИКА`,
          text: `Сегодня я помогаю фонду НИКА рассказывать о подопечных. ${animal.name} ищет дом.`,
          files: [file],
        });
        showActionFeedback("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    saveCard();
  };

  return (
    <main className={`screen final-screen${isFourPawsEvent(experienceMode) ? " final-screen--event" : ""}`}>
      <AppHeader onBack={onBack} right={isFourPawsEvent(experienceMode) ? "4/4 станции" : card.status === "ready" ? "Карточка готова" : card.status === "loading" ? "Готовим карточку" : "Маршрут пройден"} light />
      <div className="final-layout">
        <section className="final-copy">
          <div className="final-check"><HeartIcon /></div>
          <span className="screen-eyebrow">{isFourPawsEvent(experienceMode) ? "Маршрут завершён" : "Помощь продолжается"}</span>
          <h1>{isFourPawsEvent(experienceMode) ? `Все четыре станции пройдены с ${animal.name}` : `Познакомьте друзей: ${animal.name}`}</h1>
          <p>{isFourPawsEvent(experienceMode)
            ? "Покажите этот экран волонтёру, оставьте контакты и сохраните карточку своего подопечного."
            : "Готовая сторис поможет большему числу людей узнать о подопечном фонда и его поиске дома."}</p>
        </section>

        <section className="card-preview-section" aria-live="polite">
          {card.status === "loading" ? (
            <div className="card-skeleton" role="status"><span>Собираем story-карточку</span></div>
          ) : null}
          {card.status === "ready" ? (
            <img
              className="result-card-preview"
              src={card.url}
              width="1080"
              height="1920"
              alt={`Карточка дня заботы с ${animal.name} в формате сторис`}
            />
          ) : null}
          {card.status === "error" ? (
            <div className="card-error" role="status"><strong>Карточка пока не создалась</strong><p>{card.message}</p><Button onClick={() => { setCard({ status: "loading" }); setGeneration((value) => value + 1); }}>Попробовать ещё раз</Button></div>
          ) : null}
          <div className="card-preview-actions" aria-label="Действия с карточкой">
            <Button
              variant="ghost"
              className="final-utility-action"
              onClick={saveCard}
              disabled={card.status !== "ready"}
              data-complete={actionFeedback === "saved"}
            >
              {actionFeedback === "saved" ? <CheckIcon /> : <DownloadIcon />}
              <span>{actionFeedback === "saved" ? "Карточка скачана" : "Скачать карточку"}</span>
            </Button>
            <Button
              variant="ghost"
              className="final-utility-action"
              onClick={shareCard}
              disabled={card.status !== "ready"}
              data-complete={actionFeedback === "shared"}
            >
              {actionFeedback === "shared" ? <CheckIcon /> : <ShareIcon />}
              <span>{actionFeedback === "shared" ? "Карточка отправлена" : "Поделиться"}</span>
            </Button>
          </div>
          <p className="card-preview-hint">Скачайте картинку или отправьте её в сообщения. На iPhone скачанный файл может оказаться в «Загрузках»: откройте его и выберите «Сохранить изображение», чтобы добавить в «Фото».</p>
        </section>
        <div className="final-actions">
          <a className="button button--orange button--full" href={isFourPawsEvent(experienceMode) ? "https://fond-nika.ru/programs/opeka/" : animal.profileUrl} target="_blank" rel="noreferrer">
            {isFourPawsEvent(experienceMode) ? "Подробнее об опеке" : `Стать опекуном ${animal.nameGenitive}`}
          </a>
          <ContactCaptureForm
            animal={animal}
            campaign={getContactCampaignForExperience(experienceMode)}
          />
          <span className="visually-hidden" aria-live="polite">
            {actionFeedback === "saved" ? "Карточка сохранена" : null}
            {actionFeedback === "shared" ? "Карточка отправлена" : null}
          </span>
          <button className="text-button" type="button" onClick={onRestart}>Пройти ещё раз</button>
        </div>
      </div>
    </main>
  );
}
