import { useEffect, useMemo, useState } from "react";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { DownloadIcon, HeartIcon, ShareIcon } from "../components/Icons";
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

export function FinalScreen({ animal, onBack, onRestart }: FinalScreenProps) {
  const [card, setCard] = useState<CardState>({ status: "loading" });
  const fileName = useMemo(() => `nika-${animal.id}-care-day.png`, [animal.id]);

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

  const saveCard = () => {
    if (card.status !== "ready") return;
    const link = document.createElement("a");
    link.href = card.url;
    link.download = fileName;
    link.click();
  };

  const shareCard = async () => {
    if (card.status !== "ready") return;
    const file = new File([card.blob], fileName, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `Сегодня я был рядом с ${animal.name}`,
          text: `Познакомьтесь с ${animal.name} — подопечным фонда НИКА.`,
          files: [file],
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    saveCard();
  };

  return (
    <main className="screen final-screen">
      <AppHeader onBack={onBack} right="День заботы пройден" />
      <div className="final-layout">
        <section className="final-copy">
          <div className="final-check"><HeartIcon /></div>
          <span className="screen-eyebrow">Паспорт заполнен</span>
          <h1>Сегодня вы были рядом с {animal.name}.</h1>
          <p>Четыре ситуации пройдены, а паспорт заботы заполнен.</p>
          <div className="final-animal-mini">
            <AnimalPhoto src={animal.photo} name={animal.name} />
            <div><strong>{animal.name}</strong><span>{animal.shortDescription}</span></div>
          </div>
        </section>

        <section className="card-preview-section" aria-live="polite">
          {card.status === "loading" ? (
            <div className="card-skeleton" role="status">Создаём вашу карточку…</div>
          ) : null}
          {card.status === "ready" ? (
            <img className="result-card-preview" src={card.url} alt={`Карточка дня заботы с ${animal.name}`} />
          ) : null}
          {card.status === "error" ? (
            <div className="card-error"><strong>Карточка пока не создалась</strong><p>{card.message}</p></div>
          ) : null}
        </section>
      </div>

      <div className="final-actions">
        <a className="button button--primary button--full" href={animal.profileUrl} target="_blank" rel="noreferrer">
          Стать опекуном {animal.name}
        </a>
        <div className="final-action-row">
          <Button variant="ghost" className="final-utility-action" onClick={saveCard} disabled={card.status !== "ready"}>
            <DownloadIcon /> Сохранить
          </Button>
          <Button variant="ghost" className="final-utility-action" onClick={shareCard} disabled={card.status !== "ready"}>
            <ShareIcon /> Поделиться
          </Button>
        </div>
        <button className="text-button" type="button" onClick={onRestart}>Пройти ещё раз</button>
      </div>
    </main>
  );
}
