import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "../components/Icons";
import {
  trustSituations,
  type TrustActionIconId,
  type TrustSituationIllustrationId,
} from "../data/trustSituations";
import { assetUrl } from "../lib/assets";
import type { Animal } from "../types/app";

interface TrustCareGameProps {
  animal: Animal;
  onReadyChange: (ready: boolean) => void;
}

type TrustPhase = "approach" | "situation" | "final";
type TrustReaction = "correct" | "incorrect" | null;

const CORRECT_FEEDBACK_DURATION_MS = 1_900;
const INCORRECT_FEEDBACK_DURATION_MS = 2_200;
const closeness = [0.56, 0.68, 0.81, 0.94, 1.06] as const;

function TrustActionIcon({ icon }: { icon: TrustActionIconId }) {
  if (icon === "voice") {
    return <svg viewBox="0 0 24 24"><path d="M5 10v4M9 8v8M13 6v12M17 9v6M21 11v2" /></svg>;
  }
  if (icon === "reach") {
    return <svg viewBox="0 0 24 24"><path d="M4 15c3-1 4-5 7-5 2 0 2 2 4 2h5M8 15l-2 3M12 14l-1 5M16 14v5" /></svg>;
  }
  if (icon === "space") {
    return <svg viewBox="0 0 24 24"><path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" /></svg>;
  }
  if (icon === "follow") {
    return <svg viewBox="0 0 24 24"><path d="M5 17c2-5 4-7 8-7h6M16 7l3 3-3 3M5 7h.01M8 5h.01" /></svg>;
  }
  if (icon === "wait") {
    return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>;
  }
  return <svg viewBox="0 0 24 24"><path d="M9 7v10M15 7v10" /><circle cx="12" cy="12" r="9" /></svg>;
}

function SituationIllustration({ id }: { id: TrustSituationIllustrationId }) {
  return (
    <div className={`trust-situation__illustration trust-situation__illustration--${id}`} aria-hidden="true">
      <svg viewBox="0 0 280 116" role="presentation">
        <path className="trust-illustration__ground" d="M18 94c64-10 165-10 244 0" />
        {id === "sound" ? (
          <>
            <path d="M62 88V30h40v58M70 40h24v48" />
            <path className="trust-illustration__accent" d="M116 45l12-9M119 55h15M116 65l12 9" />
            <path d="M178 80c5-19 35-19 40 0v8h-40zM188 62l-7-12 15 7M208 62l8-12-16 7" />
          </>
        ) : null}
        {id === "visitor" ? (
          <>
            <circle cx="70" cy="39" r="14" /><path d="M49 89c2-28 8-38 21-38s20 10 22 38M91 61l37 14" />
            <path className="trust-illustration__accent" d="M127 75l18-4" />
            <path d="M178 80c5-19 35-19 40 0v8h-40zM188 62l-7-12 15 7M208 62l8-12-16 7" />
          </>
        ) : null}
        {id === "movement" ? (
          <>
            <circle cx="74" cy="33" r="13" /><path d="M68 47l-6 25-19 16M63 70l22 18M69 52l27 13" />
            <path className="trust-illustration__accent" d="M104 39l12-8M108 51h15" />
            <path d="M176 81c5-18 34-18 39 0v7h-39zM186 64l-7-11 15 6M205 64l8-11-15 6" />
          </>
        ) : null}
        {id === "last-step" ? (
          <>
            <path d="M55 89c5-22 37-22 42 0M65 67l-7-14 16 8M87 67l9-14-17 8" />
            <path className="trust-illustration__accent" d="M112 78c17-9 34-9 51 0M128 68l8 10-8 10" />
            <path d="M188 89V61M173 76h30M181 51c0-8 14-8 14 0 0 8-7 11-7 16 0-5-7-8-7-16z" />
          </>
        ) : null}
      </svg>
    </div>
  );
}

export function TrustCareGame({ animal, onReadyChange }: TrustCareGameProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<TrustPhase>("approach");
  const [progress, setProgress] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reaction, setReaction] = useState<TrustReaction>(null);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const situationRef = useRef<HTMLElement | null>(null);
  const situation = trustSituations[Math.min(progress, trustSituations.length - 1)];
  const selected = situation.actions.find((action) => action.id === selectedId) ?? null;
  const petLabel = animal.species === "cat" ? "кот" : "собака";
  const cautiousPet = assetUrl(`assets/trust/trust-${animal.species}-cautious.webp`);
  const reachingPet = assetUrl(`assets/trust/trust-${animal.species}-reaching.webp`);

  useEffect(() => {
    onReadyChange(false);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [onReadyChange]);

  useEffect(() => {
    if (window.innerWidth > 1020) return;
    if (phase === "approach" && progress === 0) return;
    const scrollTimer = window.setTimeout(() => {
      const target = phase === "situation" ? situationRef.current : stageRef.current;
      target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }, phase === "situation" ? 320 : 80);
    return () => window.clearTimeout(scrollTimer);
  }, [phase, progress, reduceMotion]);

  const handleChoice = (choiceId: string) => {
    if (locked) return;
    const choice = situation.actions.find((action) => action.id === choiceId);
    if (!choice) return;

    setSelectedId(choiceId);
    setReaction(choice.correct ? "correct" : "incorrect");
    setLocked(true);

    timerRef.current = window.setTimeout(() => {
      if (!choice.correct) {
        setSelectedId(null);
        setReaction(null);
        setLocked(false);
        return;
      }

      const nextProgress = progress + 1;
      setProgress(nextProgress);
      setSelectedId(null);
      setReaction(null);
      setLocked(false);
      if (nextProgress >= trustSituations.length) {
        setPhase("final");
        onReadyChange(true);
      } else {
        setPhase("approach");
      }
    }, choice.correct ? CORRECT_FEEDBACK_DURATION_MS : INCORRECT_FEEDBACK_DURATION_MS);
  };

  const petAnimation = reaction === "incorrect" && !reduceMotion
    ? { scale: [closeness[progress], closeness[progress] * 0.86, closeness[progress]], x: [0, 24, 0], y: [0, 12, 0] }
    : reaction === "correct" && !reduceMotion
      ? { scale: [closeness[progress], closeness[progress] * 1.08], x: [0, -4, 0], y: [0, -8, 0] }
      : { scale: closeness[progress], x: 0, y: 0 };

  return (
    <section
      className="trust-game"
      data-testid="trust-game"
      data-trust-phase={phase}
      data-trust-progress={progress}
      aria-labelledby="trust-game-title"
    >
      <header className="trust-game__header">
        <p className="section-number">Круг заботы · 01</p>
        <h1 id="trust-game-title">Начните знакомство без спешки</h1>
        <p>Не торопите питомца: каждый спокойный выбор помогает ему сделать шаг навстречу.</p>
      </header>

      <div className={`trust-game__board${phase === "situation" ? " trust-game__board--question" : ""}`}>
        <div ref={stageRef} className={`trust-stage trust-stage--${reaction ?? phase}`}>
          <img
            className="trust-stage__room"
            src={assetUrl("assets/trust/trust-living-room.webp")}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <div className="trust-stage__copy">
            <span>{phase === "final" ? "Доверие рядом" : `Шаг ${Math.min(progress + 1, 4)} из 4`}</span>
            <strong>
              {phase === "approach" && progress === 0 ? "Он пока держится в стороне" : null}
              {phase === "approach" && progress > 0 ? "Он стал немного смелее" : null}
              {phase === "situation" ? "Сохраните спокойный темп" : null}
              {phase === "final" ? "Он решился подойти" : null}
            </strong>
          </div>

          <motion.button
            type="button"
            className="trust-pet"
            data-testid="trust-pet"
            aria-label={phase === "approach" ? `Позвать питомца ближе: ${petLabel}` : `${petLabel} в сцене доверия`}
            disabled={phase !== "approach"}
            onClick={() => setPhase("situation")}
            animate={phase === "final" ? { scale: reduceMotion ? 1.04 : [0.92, 1.06, 1.03], y: 0 } : petAnimation}
            transition={reaction
              ? { duration: reduceMotion ? 0.12 : 0.72, ease: [0.23, 1, 0.32, 1] }
              : { duration: reduceMotion ? 0.12 : 0.7, type: "spring", stiffness: 160, damping: 20 }}
            whileHover={phase === "approach" && !reduceMotion ? { scale: closeness[progress] * 1.04 } : undefined}
            whileTap={phase === "approach" && !reduceMotion ? { scale: closeness[progress] * 0.97 } : undefined}
          >
            <span className="trust-pet__aura" aria-hidden="true" />
            <img
              src={phase === "final" ? reachingPet : cautiousPet}
              alt=""
              width="760"
              height="940"
              draggable={false}
            />
            <span className="trust-pet__shadow" aria-hidden="true" />
          </motion.button>

          {phase === "approach" ? (
            <motion.button
              type="button"
              className="trust-stage__tap"
              onClick={() => setPhase("situation")}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <span aria-hidden="true">✦</span>
              Тапните на питомца
            </motion.button>
          ) : null}

          <div className="trust-distance" aria-label={`Питомец сделал ${progress} из 4 шагов`}>
            {trustSituations.map((item, index) => (
              <span key={item.id} className={index < progress ? "is-complete" : index === progress && phase !== "final" ? "is-current" : ""}>
                {index < progress ? <CheckIcon /> : index + 1}
              </span>
            ))}
          </div>

          <AnimatePresence>
            {phase === "final" ? (
              <motion.div
                className="trust-final"
                data-testid="trust-final"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span aria-hidden="true">♡</span>
                <strong>Лапа — первый привет</strong>
                <p>Четыре спокойных выбора помогли питомцу самому сократить дистанцию.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {phase === "situation" ? (
            <motion.article
              ref={situationRef}
              key={situation.id}
              className="trust-situation"
              data-testid="trust-situation"
              data-situation-id={situation.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.28 }}
            >
              <SituationIllustration id={situation.illustration} />
              <div className="trust-situation__heading">
                <p>{situation.eyebrow}</p>
                <h2>{situation.title}</h2>
                <span>{situation.description}</span>
              </div>
              <div className="trust-actions" role="group" aria-label="Как поступить">
                {situation.actions.map((action) => {
                  const chosen = action.id === selectedId;
                  const state = chosen ? (action.correct ? "correct" : "incorrect") : "idle";
                  return (
                    <motion.button
                      key={action.id}
                      type="button"
                      className={`trust-action trust-action--${state}`}
                      data-testid="trust-option"
                      data-choice-correct={action.correct}
                      data-choice-id={action.id}
                      disabled={locked}
                      aria-pressed={chosen}
                      onClick={() => handleChoice(action.id)}
                      whileHover={locked || reduceMotion ? undefined : { y: -2 }}
                      whileTap={locked || reduceMotion ? undefined : { scale: 0.98 }}
                      animate={state === "incorrect" && !reduceMotion ? { x: [0, -4, 4, -2, 0] } : undefined}
                    >
                      <span className="trust-action__icon" aria-hidden="true"><TrustActionIcon icon={action.icon} /></span>
                      <strong>{action.label}</strong>
                      <span className="trust-action__state" aria-hidden="true">
                        {state === "correct" ? <CheckIcon /> : state === "incorrect" ? <CloseIcon /> : "→"}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence>
                {selected ? (
                  <motion.div
                    className={`trust-feedback trust-feedback--${selected.correct ? "correct" : "incorrect"}`}
                    data-testid="trust-feedback"
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 7 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <strong>{selected.correct ? "Так доверие становится ближе" : "Питомец отступил — попробуйте ещё раз"}</strong>
                    <p>{selected.correct ? situation.success : selected.feedback}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
