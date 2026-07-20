import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { CheckIcon, DownloadIcon, HeartIcon, ShareIcon } from "../components/Icons";
import { createResultCard } from "../lib/card";
import type { Animal } from "../types/app";

interface FinalScreenProps {
  animal: Animal;
  onBack: () => void;
  onRestart: () => void;
}

type CardState =
  | { status: "loading" }
  | { status: "ready"; blob: Blob; url: string }
  | { status: "error"; message: string };

type ActionFeedback = "idle" | "saved" | "shared";

export function FinalScreen({ animal, onBack, onRestart }: FinalScreenProps) {
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>("idle");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileName = useMemo(() => `nika-${animal.id}-care-story-9x16.png`, [animal.id]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    createResultCard(animal)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setCard({ status: "ready", blob, url: objectUrl });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCard({
          status: "error",
          message: error instanceof Error ? error.message : "Не удалось создать карточку",
        });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [animal]);

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
    <main className="screen final-screen">
      <AppHeader onBack={onBack} right="Карточка готова" light />
      <div className="final-layout">
        <section className="final-copy">
          <div className="final-check"><HeartIcon /></div>
          <span className="screen-eyebrow">Помощь продолжается</span>
          <h1>Расскажите друзьям про {animal.name}</h1>
          <p>Готовая сторис поможет большему числу людей узнать о подопечном фонда и его поиске дома.</p>
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
            <div className="card-error"><strong>Карточка пока не создалась</strong><p>{card.message}</p></div>
          ) : null}
        </section>
        <div className="final-actions">
          <a className="button button--orange button--full" href={animal.profileUrl} target="_blank" rel="noreferrer">
            Стать опекуном {animal.name}
          </a>
          <div className="final-action-row">
            <Button
              variant="ghost"
              className="final-utility-action"
              onClick={saveCard}
              disabled={card.status !== "ready"}
              data-complete={actionFeedback === "saved"}
            >
              {actionFeedback === "saved" ? <CheckIcon /> : <DownloadIcon />}
              <span>{actionFeedback === "saved" ? "Сохранено" : "Сохранить"}</span>
            </Button>
            <Button
              variant="ghost"
              className="final-utility-action"
              onClick={shareCard}
              disabled={card.status !== "ready"}
              data-complete={actionFeedback === "shared"}
            >
              {actionFeedback === "shared" ? <CheckIcon /> : <ShareIcon />}
              <span>{actionFeedback === "shared" ? "Отправлено" : "Поделиться"}</span>
            </Button>
          </div>
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
