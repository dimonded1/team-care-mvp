import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  CareIcon,
  CheckIcon,
  CloseIcon,
  FoodIcon,
  MovementIcon,
  PlayIcon,
  RestIcon,
  SleepIcon,
} from "../components/Icons";
import {
  dayScenes,
  type DayActivityId,
  type DaySceneDefinition,
} from "../data/dayScenes";
import type { Animal } from "../types/app";
import { assetUrl } from "../lib/assets";

interface DayBuilderGameProps {
  animal: Animal;
  onReadyChange: (ready: boolean) => void;
}

type DayGamePhase = "choosing" | "montage" | "complete";
type DaySelections = Partial<Record<DaySceneDefinition["id"], DayActivityId>>;
type DayReaction = {
  choiceId: DayActivityId;
  correct: boolean;
};

const CORRECT_FEEDBACK_DURATION_MS = 2_600;
const INCORRECT_FEEDBACK_LOCK_MS = 1_800;

const animalNameGenitiveById: Record<string, string> = {
  "pita-21": "Питы",
  "dzhek-2": "Джека",
  "lis-1": "Лиса",
  "makfluri-40": "Макфлури",
  "cunami-7": "Цунами",
  "paskal-56": "Паскаля",
};

const activityIcons = {
  meal: FoodIcon,
  movement: MovementIcon,
  play: PlayIcon,
  rest: RestIcon,
  care: CareIcon,
  sleep: SleepIcon,
} satisfies Record<DayActivityId, typeof FoodIcon>;

function SceneAtmosphere({ sceneId }: { sceneId: DaySceneDefinition["id"] }) {
  return (
    <div className={`day-scene__atmosphere day-scene__atmosphere--${sceneId}`} aria-hidden="true">
      <span className="day-scene__leaf day-scene__leaf--one" />
      <span className="day-scene__leaf day-scene__leaf--two" />
      {sceneId === "morning" || sceneId === "day" ? (
        <span className="day-scene__bird" />
      ) : null}
      {sceneId === "evening" ? <span className="day-scene__window-glow" /> : null}
      {sceneId === "night" ? (
        <>
        </>
      ) : null}
    </div>
  );
}

function DayCharacter({
  animal,
  reaction,
  sceneId,
}: {
  animal: Animal;
  reaction: DayReaction | null;
  sceneId: DaySceneDefinition["id"];
}) {
  const reduceMotion = useReducedMotion();
  const correctReaction = reaction?.correct === true;
  const incorrectReaction = reaction?.correct === false;

  return (
    <motion.div
      className={`day-character day-character--${animal.species} day-character--${sceneId}`}
      aria-label={`${animal.name} находится во дворе`}
      role="img"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 28, scale: reduceMotion ? 1 : 0.94 }}
      animate={correctReaction && !reduceMotion
        ? {
          opacity: 1,
          y: [0, -10, 0],
          x: [0, -5, 2, 0],
          scale: [1, 1.045, 1.015],
          rotate: [0, -1.2, 0.6, 0],
        }
        : incorrectReaction && !reduceMotion
          ? {
            opacity: 1,
            y: [0, 4, 1],
            x: [0, 7, 2],
            scale: [1, 0.975, 0.99],
            rotate: [0, 1.4, 0],
          }
        : {
          opacity: 1,
          y: reduceMotion ? 0 : [0, -4, 0],
          scale: reduceMotion ? 1 : [1, 1.012, 1],
        }}
      transition={reaction && !reduceMotion
        ? { duration: 0.62, ease: [0.23, 1, 0.32, 1] }
        : {
          opacity: { duration: 0.36 },
          y: { duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          scale: { duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        }}
    >
      <img
        src={assetUrl(`assets/day-game/${animal.species}-character.webp`)}
        alt=""
        draggable={false}
      />
      <motion.span
        className="day-character__shadow"
        aria-hidden="true"
        animate={reaction && !reduceMotion
          ? { scaleX: [1, 0.88, 1], opacity: [0.28, 0.18, 0.28] }
          : undefined}
        transition={{ duration: 0.62 }}
      />
    </motion.div>
  );
}

function ActivityChoice({
  choice,
  status,
  disabled,
  onSelect,
}: {
  choice: DaySceneDefinition["choices"][number];
  status: "correct" | "incorrect" | null;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = activityIcons[choice.id];
  const selected = status !== null;

  return (
    <motion.button
      type="button"
      className={`day-choice${status ? ` day-choice--${status}` : ""}`}
      data-testid="day-choice"
      data-day-choice-id={choice.id}
      data-choice-correct={choice.correct}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      animate={status === "incorrect"
        ? { x: [0, -5, 5, -3, 0] }
        : status === "correct"
          ? { y: -3, scale: 1.012 }
          : { x: 0, y: 0, scale: 1 }}
      whileHover={disabled ? undefined : { y: -3, scale: 1.012 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={status === "incorrect"
        ? { duration: 0.36, ease: "easeOut" }
        : { type: "spring", stiffness: 420, damping: 30 }}
    >
      <span className="day-choice__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="day-choice__copy">
        <strong>{choice.label}</strong>
        <span>{choice.description}</span>
      </span>
      <span className="day-choice__mark" aria-hidden="true">
        {status === "correct" ? <CheckIcon /> : status === "incorrect" ? <CloseIcon /> : "→"}
      </span>
    </motion.button>
  );
}

function DayMontage({
  animal,
  animalNameGenitive,
  selections,
  activeIndex,
  complete,
}: {
  animal: Animal;
  animalNameGenitive: string;
  selections: DaySelections;
  activeIndex: number;
  complete: boolean;
}) {
  return (
    <motion.section
      className="day-montage"
      data-testid="day-montage"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="day-montage__heading">
        <p className="section-number">Ваш маршрут заботы</p>
        <h2>{complete ? `День ${animalNameGenitive} собран` : "Смотрим день целиком"}</h2>
        <p>
          {complete
            ? "В нём есть движение, внимание и время для спокойствия."
            : "Утро, день, вечер и ночь складываются в один бережный ритм."}
        </p>
      </div>

      <div className="day-montage__grid">
        {dayScenes.map((scene, index) => {
          const selectedId = selections[scene.id];
          const selected = scene.choices.find((choice) => choice.id === selectedId);
          const Icon = selected ? activityIcons[selected.id] : RestIcon;
          return (
            <motion.article
              key={scene.id}
              className={`day-montage__scene${activeIndex === index ? " day-montage__scene--active" : ""}${complete ? " day-montage__scene--complete" : ""}`}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.07, duration: 0.32 }}
              style={{ backgroundImage: `url(${scene.image})` }}
            >
              <span className="day-montage__scrim" aria-hidden="true" />
              <span className="day-montage__time">{scene.label}</span>
              <span className="day-montage__choice">
                <Icon aria-hidden="true" />
                <strong>{selected?.label ?? "Тихое время"}</strong>
              </span>
            </motion.article>
          );
        })}
      </div>

      <motion.div
        className="day-montage__character"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: complete ? 0 : 0.36, duration: 0.42 }}
        aria-hidden="true"
      >
        <img src={assetUrl(`assets/day-game/${animal.species}-character.webp`)} alt="" />
      </motion.div>
    </motion.section>
  );
}

export function DayBuilderGame({ animal, onReadyChange }: DayBuilderGameProps) {
  const reduceMotion = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [selections, setSelections] = useState<DaySelections>({});
  const [phase, setPhase] = useState<DayGamePhase>("choosing");
  const [reaction, setReaction] = useState<DayReaction | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [montageIndex, setMontageIndex] = useState(-1);
  const advanceTimer = useRef<number | null>(null);
  const currentScene = dayScenes[sceneIndex];
  const currentSelection = selections[currentScene.id] ?? null;
  const reactionChoice = reaction
    ? currentScene.choices.find((choice) => choice.id === reaction.choiceId) ?? null
    : null;
  const animalNameGenitive = animalNameGenitiveById[animal.id] ?? animal.name;

  const sceneAnnouncement = useMemo(() => {
    if (phase === "complete") return `День ${animalNameGenitive} собран.`;
    if (phase === "montage") return "Показываем собранный день.";
    if (reactionChoice) {
      return `${reactionChoice.correct ? "Верно." : "Попробуйте ещё."} ${reactionChoice.feedback}`;
    }
    return `${currentScene.label}. Выберите одно занятие.`;
  }, [animalNameGenitive, currentScene.label, phase, reactionChoice]);

  useEffect(() => {
    dayScenes.forEach((scene) => {
      const image = new Image();
      image.src = scene.image;
    });
    [
      assetUrl("assets/day-game/dog-character.webp"),
      assetUrl("assets/day-game/cat-character.webp"),
    ]
      .forEach((src) => {
        const image = new Image();
        image.src = src;
      });
  }, []);

  useEffect(() => () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
    }
  }, []);

  useEffect(() => {
    onReadyChange(phase === "complete");
  }, [onReadyChange, phase]);

  useEffect(() => {
    if (phase !== "montage") return;

    if (reduceMotion) {
      setMontageIndex(dayScenes.length - 1);
      setPhase("complete");
      return;
    }

    const timers = dayScenes.map((_, index) => window.setTimeout(
      () => setMontageIndex(index),
      220 + index * 440,
    ));
    const completeTimer = window.setTimeout(() => {
      setMontageIndex(dayScenes.length - 1);
      setPhase("complete");
    }, 2_250);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(completeTimer);
    };
  }, [phase, reduceMotion]);

  const selectActivity = (activityId: DayActivityId) => {
    if (transitioning || phase !== "choosing") return;
    const choice = currentScene.choices.find((item) => item.id === activityId);
    if (!choice) return;

    setReaction({
      choiceId: activityId,
      correct: choice.correct,
    });

    if (!choice.correct) {
      setTransitioning(true);
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        setTransitioning(false);
      }, INCORRECT_FEEDBACK_LOCK_MS);
      return;
    }

    setSelections((current) => ({
      ...current,
      [currentScene.id]: activityId,
    }));
    setTransitioning(true);

    const advance = () => {
      advanceTimer.current = null;
      setReaction(null);
      setTransitioning(false);
      if (sceneIndex === dayScenes.length - 1) {
        setMontageIndex(-1);
        setPhase("montage");
        return;
      }
      setSceneIndex((current) => current + 1);
    };

    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
    }
    advanceTimer.current = window.setTimeout(advance, CORRECT_FEEDBACK_DURATION_MS);
  };

  const goBack = () => {
    if (transitioning || sceneIndex === 0 || phase !== "choosing") return;
    setSceneIndex((current) => current - 1);
    setReaction(null);
  };

  return (
    <div
      className="day-game"
      data-testid="day-game"
      data-day-phase={phase}
      data-active-scene={phase === "choosing" ? currentScene.id : undefined}
    >
      <header className="day-game__header">
        <div>
          <p className="section-number">Качество повседневной жизни</p>
          <h1>Соберите день {animalNameGenitive}</h1>
        </div>
      </header>

      <ol className="day-game__progress" data-testid="day-scene-progress" aria-label="Четыре части дня">
        {dayScenes.map((scene, index) => {
          const complete = Boolean(selections[scene.id]);
          const active = phase === "choosing" && scene.id === currentScene.id;
          return (
            <li
              key={scene.id}
              data-day-progress={scene.id}
              data-state={active ? "active" : complete ? "complete" : "pending"}
              aria-current={active ? "step" : undefined}
            >
              <span>{complete ? <CheckIcon /> : index + 1}</span>
              <strong>{scene.label}</strong>
            </li>
          );
        })}
      </ol>

      <div className="day-game__viewport">
        <AnimatePresence mode="sync" initial={false}>
          {phase === "choosing" ? (
            <motion.section
              key={currentScene.id}
              className={`day-scene day-scene--${currentScene.id}`}
              data-testid="day-scene"
              data-day-scene={currentScene.id}
              initial={reduceMotion
                ? { opacity: 0 }
                : {
                  opacity: 1,
                  clipPath: `circle(0% at ${currentScene.irisOrigin})`,
                }}
              animate={reduceMotion
                ? { opacity: 1 }
                : {
                  opacity: 1,
                  clipPath: `circle(155% at ${currentScene.irisOrigin})`,
                }}
              exit={reduceMotion
                ? { opacity: 0 }
                : { opacity: 0.35, scale: 1.012 }}
              transition={reduceMotion
                ? { duration: 0.12 }
                : {
                  clipPath: { duration: 0.72, ease: [0.65, 0, 0.35, 1] },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.5 },
                }}
            >
              <motion.img
                className="day-scene__background"
                src={currentScene.image}
                alt=""
                draggable={false}
                initial={{ scale: reduceMotion ? 1 : 1.045 }}
                animate={reduceMotion
                  ? { scale: 1 }
                  : {
                    scale: [1.025, 1.04, 1.025],
                    x: [0, -6, 0],
                  }}
                transition={reduceMotion
                  ? { duration: 0 }
                  : {
                    duration: 15,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
              />
              <span className="day-scene__grade" aria-hidden="true" />
              <SceneAtmosphere sceneId={currentScene.id} />
              <DayCharacter
                animal={animal}
                reaction={reaction}
                sceneId={currentScene.id}
              />

              <AnimatePresence mode="wait">
                {reactionChoice ? (
                  <motion.div
                    key={`${currentScene.id}-${reactionChoice.id}`}
                    className={`day-scene__feedback${reactionChoice.correct ? " day-scene__feedback--correct" : " day-scene__feedback--incorrect"}`}
                    role="status"
                    initial={{ opacity: 0, x: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 4 }}
                    transition={{ duration: reduceMotion ? 0.1 : 0.28 }}
                  >
                    <strong>
                      {animal.name}: {reactionChoice.correct ? "«Мне подходит»" : "«Лучше иначе»"}
                    </strong>
                    <span>{reactionChoice.feedback}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="day-scene__topline">
                {sceneIndex > 0 ? (
                  <motion.button
                    type="button"
                    className="day-scene__back"
                    onClick={goBack}
                    disabled={transitioning}
                    whileTap={{ scale: 0.96 }}
                  >
                    <ArrowLeftIcon />
                    <span>Назад</span>
                  </motion.button>
                ) : <span />}
                <span className="day-scene__time">
                  {currentScene.label} · {currentScene.time}
                </span>
              </div>

              <div className="day-scene__copy">
                <h2>{currentScene.title}</h2>
                <p>{currentScene.prompt}</p>
              </div>

              <div className="day-scene__choices" aria-label={`Занятия на ${currentScene.label.toLowerCase()}`}>
                {currentScene.choices.map((choice) => (
                  <ActivityChoice
                    key={choice.id}
                    choice={choice}
                    status={
                      currentSelection === choice.id
                        ? "correct"
                        : reaction?.choiceId === choice.id
                          ? reaction.correct ? "correct" : "incorrect"
                          : null
                    }
                    disabled={transitioning}
                    onSelect={() => selectActivity(choice.id)}
                  />
                ))}
              </div>
            </motion.section>
          ) : (
            <DayMontage
              key="montage"
              animal={animal}
              animalNameGenitive={animalNameGenitive}
              selections={selections}
              activeIndex={montageIndex}
              complete={phase === "complete"}
            />
          )}
        </AnimatePresence>
      </div>

      <span className="visually-hidden" aria-live="polite">
        {sceneAnnouncement}
      </span>
    </div>
  );
}
