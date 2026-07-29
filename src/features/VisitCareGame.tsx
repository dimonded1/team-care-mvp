import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "../components/Icons";
import {
  visitSituations,
  type VisitActionIconId,
} from "../data/visitSituations";
import { assetUrl } from "../lib/assets";
import { createShuffleSeed, shuffleBySeed } from "../lib/shuffle";
import type { Animal } from "../types/app";

interface VisitCareGameProps {
  animal: Animal;
  onReadyChange: (ready: boolean) => void;
  progress?: VisitGameProgress;
  onProgressChange?: (progress: VisitGameProgress) => void;
}

const CORRECT_FEEDBACK_MS = 1_950;
const LEARNING_FEEDBACK_MS = 2_450;

export interface VisitGameProgress {
  version: 1;
  step: number;
  shuffleSeed: string;
}

export function createInitialVisitGameProgress(): VisitGameProgress {
  return {
    version: 1,
    step: 0,
    shuffleSeed: createShuffleSeed(),
  };
}

export function restoreVisitGameProgress(
  value: unknown,
  fallback = createInitialVisitGameProgress(),
): VisitGameProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = value as Partial<VisitGameProgress>;
  return {
    version: 1,
    step: typeof candidate.step === "number" && Number.isFinite(candidate.step)
      ? Math.max(0, Math.min(Math.floor(candidate.step), visitSituations.length))
      : 0,
    shuffleSeed: typeof candidate.shuffleSeed === "string" && candidate.shuffleSeed
      ? candidate.shuffleSeed
      : fallback.shuffleSeed,
  };
}

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
  if (id === "leash") {
    return <svg viewBox="0 0 24 24"><path d="M6 5a3 3 0 1 0 0 6c5 0 2 8 8 8h3" /><path d="M17 16v6M14 19h6" /></svg>;
  }
  if (id === "gate") {
    return <svg viewBox="0 0 24 24"><path d="M5 21V5h14v16M5 9h14M9 5v16M15 5v16" /></svg>;
  }
  if (id === "report") {
    return <svg viewBox="0 0 24 24"><path d="M7 3h10v18H7zM9 8h6M9 12h6M9 16h4" /></svg>;
  }
  return <svg viewBox="0 0 24 24"><path d="M7 8v8M12 6v12M17 8v8" /><path d="M4 20h16" /></svg>;
}

export function VisitCareGame({
  animal,
  onReadyChange,
  progress,
  onProgressChange,
}: VisitCareGameProps) {
  const reduceMotion = useReducedMotion();
  const [internalProgress, setInternalProgress] = useState(createInitialVisitGameProgress);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeProgress = progress ?? internalProgress;
  const step = Math.max(0, Math.min(activeProgress.step, visitSituations.length));
  const shuffleSeed = activeProgress.shuffleSeed || internalProgress.shuffleSeed;
  const situation = visitSituations[Math.min(step, visitSituations.length - 1)];
  const selected = situation.actions.find((action) => action.id === selectedId) ?? null;
  const displayedActions = useMemo(
    () => shuffleBySeed(situation.actions, `${shuffleSeed}:${situation.id}`),
    [shuffleSeed, situation.actions, situation.id],
  );
  const complete = step >= visitSituations.length;
  const petState = complete
    ? animal.species === "dog" ? "calm" : "relaxed"
    : selected && !selected.correct
      ? "startled"
      : situation.petState[animal.species];
  const petImage = assetUrl(`assets/game-characters/${animal.species}/${petState}.webp`);

  useEffect(() => {
    onReadyChange(complete);
  }, [complete, onReadyChange]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => phaseHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const commitProgress = (next: VisitGameProgress) => {
    if (!progress) setInternalProgress(next);
    onProgressChange?.(next);
  };

  const choose = (actionId: string) => {
    if (lockedRef.current || complete) return;
    const action = situation.actions.find((item) => item.id === actionId);
    if (!action) return;

    lockedRef.current = true;
    setSelectedId(actionId);
    setLocked(true);
    timerRef.current = window.setTimeout(() => {
      setSelectedId(null);
      setLocked(false);
      lockedRef.current = false;
      if (action.correct) {
        commitProgress({
          version: 1,
          step: Math.min(step + 1, visitSituations.length),
          shuffleSeed,
        });
      }
    }, action.correct ? CORRECT_FEEDBACK_MS : LEARNING_FEEDBACK_MS);
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
        <p>Пройдите визит от входа до возвращения. В приюте всегда следуйте подсказкам сотрудника.</p>
      </header>

      <div className="visit-game__scene">
        <img
          className="visit-game__background"
          src={assetUrl("assets/care-planets/visit-world.jpg")}
          alt=""
          aria-hidden="true"
        />
        <span className="visit-game__shade" aria-hidden="true" />

        <motion.div
          className="visit-game__character"
          data-pet-state={petState}
          role="img"
          aria-label={`${animal.name}: ${complete ? "спокойно отдыхает после встречи" : "находится рядом"}`}
          animate={selected && !reduceMotion
            ? selected.correct
              ? { scale: [1, 1.035, 1], rotate: [0, -0.8, 0] }
              : { x: [0, 8, 2], scale: [1, 0.96, 0.985], rotate: [0, 1.4, 0] }
            : { scale: 1, rotate: 0, x: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.58, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={petImage} alt="" draggable={false} />
          <span className="visit-game__character-shadow" aria-hidden="true" />
        </motion.div>

        <div className="visit-game__pet-marker" aria-label={`${animal.name} находится рядом`}>
          <div>
            <strong>{animal.name}</strong>
            <small>{complete ? "следующая встреча уже ближе" : selected && !selected.correct ? "нужна спокойная пауза" : "выбирает свой темп"}</small>
          </div>
        </div>

        <ol className="visit-game__progress" aria-label="Пять шагов визита">
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
              <h2 ref={phaseHeadingRef} tabIndex={-1}>Визит стал частью орбиты</h2>
              <p>Вы прошли путь от входа до возвращения, сохранили безопасную дистанцию и передали наблюдения команде.</p>
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
            <h2 ref={phaseHeadingRef} tabIndex={-1}>{situation.title}</h2>
            <span>{situation.prompt}</span>

            <div className="visit-actions" role="group" aria-label="Как поступить">
              {displayedActions.map((action) => {
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
