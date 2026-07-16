import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BandageIcon,
  BrushIcon,
  CareIcon,
  CheckIcon,
  EyeIcon,
  FoodIcon,
  PlayIcon,
  RestIcon,
  VetIcon,
  WaterIcon,
  WipeIcon,
} from "../components/Icons";
import {
  buildHealthGameRound,
  healthZones,
  type HealthActionIconId,
  type HealthSituation,
  type HealthZoneId,
} from "../data/healthSituations";
import type { Animal } from "../types/app";

interface HealthCareGameProps {
  animal: Animal;
  onReadyChange: (ready: boolean) => void;
}

const actionIcons = {
  bandage: BandageIcon,
  brush: BrushIcon,
  care: CareIcon,
  food: FoodIcon,
  inspect: EyeIcon,
  play: PlayIcon,
  rest: RestIcon,
  vet: VetIcon,
  water: WaterIcon,
  wipe: WipeIcon,
} satisfies Record<HealthActionIconId, typeof CareIcon>;

function HealthPetSilhouette({
  species,
  activeZoneId,
  completedZoneIds,
  answerState,
  onSelectZone,
}: {
  species: Animal["species"];
  activeZoneId: HealthZoneId | null;
  completedZoneIds: HealthZoneId[];
  answerState: "correct" | "learning" | null;
  onSelectZone: (zoneId: HealthZoneId) => void;
}) {
  const reduceMotion = useReducedMotion();
  const petImage = species === "cat"
    ? "/assets/health/health-cat.webp"
    : "/assets/health/health-dog.webp";
  const petLabel = species === "cat" ? "кот" : "собака";

  return (
    <div
      className={`health-silhouette health-silhouette--${species}`}
      role="group"
      aria-label={`Карта зон заботы: ${petLabel}`}
    >
      <span className="health-silhouette__stars" aria-hidden="true" />

      <motion.div
        className="health-silhouette__pet-stage"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion
          ? { duration: 0.1 }
          : { duration: 0.42, type: "spring", stiffness: 180, damping: 22 }}
      >
        <div className="health-silhouette__aura" aria-hidden="true" />
        <img
          className="health-silhouette__pet"
          src={petImage}
          width="1024"
          height="1536"
          alt={`Универсальная иллюстрация питомца: ${petLabel}`}
        />

        {healthZones.map((zone, index) => {
          const complete = completedZoneIds.includes(zone.id);
          const active = activeZoneId === zone.id;
          const state = complete
            ? "complete"
            : active && answerState
              ? answerState
              : active
                ? "active"
                : "available";

          return (
            <motion.button
              key={zone.id}
              type="button"
              className={`health-zone health-zone--${zone.id}`}
              data-testid="health-zone"
              data-zone-id={zone.id}
              data-zone-state={state}
              data-zone-complete={complete}
              aria-label={`${zone.label}. ${complete ? "Ситуация пройдена" : "Открыть ситуацию"}`}
              aria-pressed={active}
              disabled={complete}
              onClick={() => onSelectZone(zone.id)}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion
                ? { duration: 0.1 }
                : {
                    delay: 0.12 + index * 0.045,
                    duration: 0.24,
                    type: "spring",
                    stiffness: 420,
                    damping: 26,
                  }}
              whileHover={complete || reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={complete || reduceMotion ? undefined : { scale: 0.93 }}
            >
              <span className="health-zone__pulse" aria-hidden="true" />
              <span className="health-zone__marker" aria-hidden="true">
                {complete || (active && answerState === "correct")
                  ? <CheckIcon />
                  : "!"}
              </span>
              <span className="health-zone__label">{zone.shortLabel}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

function SituationPanel({
  situation,
  selectedChoiceId,
  onSelectChoice,
  onContinue,
}: {
  situation: HealthSituation;
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
  onContinue: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const selectedChoice = situation.options.find((option) => option.id === selectedChoiceId) ?? null;
  const correctChoice = situation.options.find((option) => option.correct);

  return (
    <motion.section
      key={situation.id}
      className="health-situation"
      data-testid="health-situation"
      data-zone-id={situation.zoneId}
      aria-labelledby="health-situation-title"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.24 }}
    >
      <div className="health-situation__heading">
        <p>Бытовая ситуация</p>
        <h2 id="health-situation-title">{situation.situation}</h2>
        <span>{situation.prompt}</span>
      </div>

      <div className="health-actions" role="group" aria-label="Варианты первой заботы">
        {situation.options.map((option) => {
          const Icon = actionIcons[option.icon];
          const chosen = selectedChoiceId === option.id;
          const revealCorrect = Boolean(selectedChoiceId) && option.correct;
          const status = revealCorrect
            ? "correct"
            : chosen && !option.correct
              ? "learning"
              : "idle";

          return (
            <motion.button
              key={option.id}
              type="button"
              className={`health-action health-action--${status}`}
              data-testid="health-action"
              data-choice-correct={option.correct}
              aria-pressed={chosen}
              disabled={Boolean(selectedChoiceId)}
              onClick={() => onSelectChoice(option.id)}
              whileHover={selectedChoiceId || reduceMotion ? undefined : { y: -2 }}
              whileTap={selectedChoiceId || reduceMotion ? undefined : { scale: 0.98 }}
            >
              <span className="health-action__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="health-action__copy">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </span>
              <span className="health-action__state" aria-hidden="true">
                {revealCorrect ? <CheckIcon /> : chosen ? "i" : "→"}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedChoice ? (
          <motion.div
            className={`health-feedback${selectedChoice.correct ? " health-feedback--correct" : " health-feedback--learning"}`}
            data-testid="health-feedback"
            role="status"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
          >
            <div className="health-feedback__title">
              <span aria-hidden="true">{selectedChoice.correct ? <CheckIcon /> : "i"}</span>
              <strong>{selectedChoice.correct ? "Хорошая первая реакция" : "Тут лучше иначе"}</strong>
            </div>
            <p>{selectedChoice.feedback}</p>
            {!selectedChoice.correct && correctChoice ? (
              <p className="health-feedback__correct">
                Лучше: <strong>{correctChoice.label}</strong>
              </p>
            ) : null}
            <p className="health-feedback__fact">{situation.learningFact}</p>
            <button
              type="button"
              className="health-feedback__continue"
              data-testid="health-continue"
              onClick={onContinue}
            >
              Запомнить и продолжить <span aria-hidden="true">→</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function HealthSummary({ round }: { round: HealthSituation[] }) {
  return (
    <motion.section
      className="health-summary"
      data-testid="health-summary"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28 }}
    >
      <p className="section-number">Шесть наблюдений</p>
      <h2>Первая забота начинается с внимания</h2>
      <p>
        Вы прошли бытовые ситуации без диагностики и лечения: где-то достаточно
        простого ухода, а где-то безопаснее сразу обратиться к ветеринару.
      </p>
      <ul>
        {round.map((situation) => {
          const zone = healthZones.find((item) => item.id === situation.zoneId);
          const correct = situation.options.find((option) => option.correct);
          return (
            <li key={situation.id}>
              <span aria-hidden="true"><CheckIcon /></span>
              <div>
                <small>{zone?.label}</small>
                <strong>{correct?.label}</strong>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="health-summary__note">
        <VetIcon aria-hidden="true" />
        <p>
          Если питомцу больно, состояние меняется или ситуация вызывает сомнение,
          правильная первая реакция — связаться с ветеринаром.
        </p>
      </div>
    </motion.section>
  );
}

export function HealthCareGame({ animal, onReadyChange }: HealthCareGameProps) {
  const reduceMotion = useReducedMotion();
  const [round] = useState(() => buildHealthGameRound());
  const [activeZoneId, setActiveZoneId] = useState<HealthZoneId | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [completedZoneIds, setCompletedZoneIds] = useState<HealthZoneId[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeSituation = useMemo(
    () => round.find((situation) => situation.zoneId === activeZoneId) ?? null,
    [activeZoneId, round],
  );
  const selectedChoice = activeSituation?.options.find(
    (option) => option.id === selectedChoiceId,
  ) ?? null;
  const complete = completedZoneIds.length === healthZones.length;
  const answerState = selectedChoice
    ? selectedChoice.correct ? "correct" : "learning"
    : null;

  useEffect(() => {
    onReadyChange(complete);
  }, [complete, onReadyChange]);

  useEffect(() => {
    if ((!activeSituation && !complete) || !window.matchMedia("(max-width: 759px)").matches) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSituation, complete, reduceMotion]);

  const selectZone = (zoneId: HealthZoneId) => {
    if (completedZoneIds.includes(zoneId)) return;
    setActiveZoneId(zoneId);
    setSelectedChoiceId(null);
  };

  const continueJourney = () => {
    if (!activeZoneId || !selectedChoiceId) return;
    const completingLastZone = completedZoneIds.length === healthZones.length - 1;
    setCompletedZoneIds((current) =>
      current.includes(activeZoneId) ? current : [...current, activeZoneId],
    );
    setActiveZoneId(null);
    setSelectedChoiceId(null);
    if (!completingLastZone && window.matchMedia("(max-width: 759px)").matches) {
      window.requestAnimationFrame(() => {
        mapRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  };

  const announcement = complete
    ? "Все шесть ситуаций пройдены."
    : activeSituation
      ? selectedChoice
        ? `${selectedChoice.correct ? "Верно." : "Лучше выбрать другое действие."} ${activeSituation.learningFact}`
        : `${activeSituation.situation} ${activeSituation.prompt}`
      : `Пройдено зон: ${completedZoneIds.length} из ${healthZones.length}. Выберите следующую зону.`;

  return (
    <div
      className="health-game"
      data-testid="health-game"
      data-health-phase={complete ? "complete" : activeSituation ? "situation" : "map"}
      data-active-zone={activeZoneId ?? undefined}
    >
      <header className="health-game__header">
        <div>
          <p className="section-number">Бытовая внимательность</p>
          <h1>Окажи подопечному первую помощь</h1>
        </div>
      </header>

      <div className="health-game__board">
        <div className="health-game__map" ref={mapRef}>
          <HealthPetSilhouette
            species={animal.species}
            activeZoneId={activeZoneId}
            completedZoneIds={completedZoneIds}
            answerState={answerState}
            onSelectZone={selectZone}
          />
        </div>

        {complete || activeSituation ? (
          <div className="health-game__panel" ref={panelRef}>
            <AnimatePresence mode="wait">
              {complete ? (
                <HealthSummary key="summary" round={round} />
              ) : activeSituation ? (
                <SituationPanel
                  key={activeSituation.id}
                  situation={activeSituation}
                  selectedChoiceId={selectedChoiceId}
                  onSelectChoice={setSelectedChoiceId}
                  onContinue={continueJourney}
                />
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
