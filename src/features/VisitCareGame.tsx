import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { CheckIcon, CloseIcon } from "../components/Icons";
import {
  visitSituations,
  type VisitActionIconId,
} from "../data/visitSituations";
import { assetUrl } from "../lib/assets";
import type { Animal } from "../types/app";

interface VisitCareGameProps {
  animal: Animal;
  onReadyChange: (ready: boolean) => void;
}

const FEEDBACK_MS = 1_850;

function VisitActionIcon({ id }: { id: VisitActionIconId }) {
  if (id === "calendar") {
    return <svg viewBox="0 0 24 24"><path d="M5 6h14v14H5zM8 3v6M16 3v6M5 10h14" /></svg>;
  }
  if (id === "observe") {
    return <svg viewBox="0 0 24 24"><path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.4" /></svg>;
  }
  if (id === "rush") {
    return <svg viewBox="0 0 24 24"><path d="M4 12h13M13 7l5 5-5 5M4 7h4M4 17h4" /></svg>;
  }
  return <svg viewBox="0 0 24 24"><path d="M7 8v8M12 6v12M17 8v8" /><path d="M4 20h16" /></svg>;
}

export function VisitCareGame({ animal, onReadyChange }: VisitCareGameProps) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<number | null>(null);
  const situation = visitSituations[Math.min(step, visitSituations.length - 1)];
  const selected = situation.actions.find((action) => action.id === selectedId) ?? null;
  const complete = step >= visitSituations.length;

  useEffect(() => {
    onReadyChange(complete);
  }, [complete, onReadyChange]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const choose = (actionId: string) => {
    if (locked || complete) return;
    const action = situation.actions.find((item) => item.id === actionId);
    if (!action) return;

    setSelectedId(actionId);
    setLocked(true);
    timerRef.current = window.setTimeout(() => {
      setSelectedId(null);
      setLocked(false);
      if (action.correct) setStep((current) => current + 1);
    }, FEEDBACK_MS);
  };

  return (
    <section
      className={`visit-game${complete ? " visit-game--complete" : ""}`}
      data-testid="visit-game"
      data-visit-step={Math.min(step + 1, visitSituations.length)}
      aria-labelledby="visit-game-title"
    >
      <header className="visit-game__header">
        <p className="section-number">Круг заботы · 02</p>
        <h1 id="visit-game-title">Навестите {animal.name}</h1>
        <p>Спокойное присутствие — уже забота. Пройдите встречу от договорённости до следующего визита.</p>
      </header>

      <div className="visit-game__scene">
        <img
          className="visit-game__background"
          src={assetUrl("assets/visit-game/shelter-visit.webp")}
          alt=""
          aria-hidden="true"
        />
        <span className="visit-game__shade" aria-hidden="true" />

        <div className="visit-game__pet">
          <span className="visit-game__pet-orbit" aria-hidden="true" />
          <AnimalPhoto src={animal.photo} name={animal.name} />
          <strong>{animal.name}</strong>
          <small>{complete ? "следующая встреча уже ближе" : "выбирает свой темп"}</small>
        </div>

        <ol className="visit-game__progress" aria-label="Три шага визита">
          {visitSituations.map((item, index) => (
            <li
              key={item.id}
              className={index < step ? "is-complete" : index === step && !complete ? "is-current" : ""}
            >
              <span>{index < step || complete ? <CheckIcon /> : index + 1}</span>
              <strong>{item.stepLabel}</strong>
            </li>
          ))}
        </ol>
      </div>

      <AnimatePresence mode="wait">
        {complete ? (
          <motion.div
            key="complete"
            className="visit-game__complete"
            data-testid="visit-complete"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span aria-hidden="true"><CheckIcon /></span>
            <div>
              <h2>Визит стал частью орбиты</h2>
              <p>Вы договорились о встрече, сохранили спокойную дистанцию и передали наблюдение команде.</p>
            </div>
          </motion.div>
        ) : (
          <motion.article
            key={situation.id}
            className="visit-situation"
            data-testid="visit-situation"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          >
            <p>{situation.stepLabel}</p>
            <h2>{situation.title}</h2>
            <span>{situation.prompt}</span>

            <div className="visit-actions" role="group" aria-label="Как поступить">
              {situation.actions.map((action) => {
                const chosen = action.id === selectedId;
                return (
                  <motion.button
                    key={action.id}
                    type="button"
                    className={`visit-action${chosen ? action.correct ? " is-correct" : " is-incorrect" : ""}`}
                    data-testid="visit-option"
                    data-choice-correct={action.correct}
                    disabled={locked}
                    onClick={() => choose(action.id)}
                    whileTap={locked || reduceMotion ? undefined : { scale: 0.98 }}
                  >
                    <span className="visit-action__icon" aria-hidden="true"><VisitActionIcon id={action.icon} /></span>
                    <span>
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </span>
                    <i aria-hidden="true">{chosen ? action.correct ? <CheckIcon /> : <CloseIcon /> : "→"}</i>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {selected ? (
                <motion.div
                  className={`visit-feedback${selected.correct ? " is-correct" : " is-incorrect"}`}
                  role="status"
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <strong>{selected.correct ? "Встреча становится спокойнее" : "Тут лучше чуть бережнее"}</strong>
                  <span>{selected.correct ? situation.success : selected.feedback}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.article>
        )}
      </AnimatePresence>
    </section>
  );
}
