import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, HeartIcon } from "../../components/Icons";
import { assetUrl } from "../../lib/assets";
import type { Animal, Mission } from "../../types/app";
import {
  getActionLabel,
  getMissionStatus,
  getRecommendedMissionId,
} from "../passportModel";
import { hasOrbitBeenVisited, markOrbitVisited, useOrbitAnimation } from "./useOrbitAnimation";

interface OrbitExperienceProps {
  animal: Animal;
  missions: Mission[];
  startedMissionIds: Mission["id"][];
  completedMissionIds: Mission["id"][];
  onSelectMission: (missionId: Mission["id"]) => void;
  onOpenGuardianship: () => void;
  onCompleteOrbit: () => void;
}

type OrbitUiState =
  | "entering"
  | "orbiting"
  | "focusing"
  | "focused"
  | "openingGame"
  | "returning";

const presentation = {
  trust: {
    title: "Знакомство",
    description: "Первый спокойный контакт без давления",
    duration: 3,
    image: "assets/orbit-planets/trust.webp",
    driftPeriod: 31,
    phase: -2.78,
    radiusX: 30.5,
    radiusY: 30.5,
  },
  food: {
    title: "Визит",
    description: "Приехать в приют и быть рядом бережно",
    duration: 2,
    image: "assets/orbit-planets/visit.webp",
    driftPeriod: 37,
    phase: -0.925,
    radiusX: 33.5,
    radiusY: 33.5,
  },
  home: {
    title: "Прогулка",
    description: "Собрать спокойный и понятный маршрут",
    duration: 3,
    image: "assets/orbit-planets/walk.webp",
    driftPeriod: 27,
    phase: 0.584,
    radiusX: 36.5,
    radiusY: 36.5,
  },
  health: {
    title: "Здоровье",
    description: "Заметить важное и передать команде",
    duration: 2,
    image: "assets/orbit-planets/health.webp",
    driftPeriod: 34,
    phase: 1.945,
    radiusX: 39.5,
    radiusY: 39.5,
  },
} satisfies Record<
  Mission["id"],
  {
    title: string;
    description: string;
    duration: number;
    image: string;
    driftPeriod: number;
    phase: number;
    radiusX: number;
    radiusY: number;
  }
>;

const stateLabel = {
  available: "Не начато",
  started: "В процессе",
  completed: "Пройдено",
} as const;

export function OrbitExperience({
  animal,
  missions,
  startedMissionIds,
  completedMissionIds,
  onSelectMission,
  onOpenGuardianship,
  onCompleteOrbit,
}: OrbitExperienceProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const previouslyVisited = useRef(hasOrbitBeenVisited()).current;
  const [uiState, setUiState] = useState<OrbitUiState>(
    previouslyVisited ? "returning" : reduceMotion ? "orbiting" : "entering",
  );
  const [selectedPlanetId, setSelectedPlanetId] = useState<Mission["id"] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const completed = missions.length > 0 && completedMissionIds.length === missions.length;
  const recommendedId = getRecommendedMissionId(missions, completedMissionIds);

  const configs = useMemo(
    () =>
      missions.map((mission) => ({
        id: mission.id,
        driftPeriod: presentation[mission.id].driftPeriod,
        phase: presentation[mission.id].phase,
        radiusX: presentation[mission.id].radiusX,
        radiusY: presentation[mission.id].radiusY,
      })),
    [missions],
  );

  const orbitPaused = selectedPlanetId !== null || uiState === "openingGame";
  const { registerPlanet } = useOrbitAnimation({
    configs,
    paused: orbitPaused,
    reducedMotion: reduceMotion,
    entering: uiState === "entering",
  });

  useEffect(() => {
    if (uiState === "entering") {
      const timer = window.setTimeout(() => {
        markOrbitVisited();
        setUiState("orbiting");
      }, 2_450);
      return () => window.clearTimeout(timer);
    }
    if (uiState === "returning") {
      const timer = window.setTimeout(() => setUiState("orbiting"), reduceMotion ? 80 : 520);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [reduceMotion, uiState]);

  const selectPlanet = (missionId: Mission["id"]) => {
    if (isTransitioning || uiState === "entering") return;
    if (selectedPlanetId === missionId && uiState === "focused") {
      openPlanet(missionId);
      return;
    }
    setIsTransitioning(true);
    setSelectedPlanetId(missionId);
    setUiState(reduceMotion ? "focused" : "focusing");
    window.setTimeout(() => {
      setUiState("focused");
      setIsTransitioning(false);
      document.querySelector<HTMLButtonElement>(`[data-orbit-planet="${missionId}"]`)?.focus();
    }, reduceMotion ? 80 : 560);
  };

  const closeFocus = () => {
    if (isTransitioning || selectedPlanetId === null) return;
    setIsTransitioning(true);
    setUiState("returning");
    setSelectedPlanetId(null);
    window.setTimeout(() => {
      setUiState("orbiting");
      setIsTransitioning(false);
    }, reduceMotion ? 80 : 440);
  };

  const openPlanet = (missionId: Mission["id"]) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setUiState("openingGame");
    window.setTimeout(() => onSelectMission(missionId), reduceMotion ? 80 : 520);
  };

  const selectedMission = selectedPlanetId
    ? missions.find((mission) => mission.id === selectedPlanetId) ?? null
    : null;
  const selectedStatus = selectedMission
    ? getMissionStatus(selectedMission.id, startedMissionIds, completedMissionIds)
    : null;

  return (
    <section
      className={`care-orbit care-orbit--${uiState}${completed ? " care-orbit--complete" : ""}`}
      aria-labelledby="care-orbit-title"
      data-orbit-state={uiState}
    >
      <motion.div
        className="care-orbit__background"
        aria-hidden="true"
        initial={previouslyVisited || reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.12 : 0.65 }}
      />

      <header className="care-orbit__heading">
        <p>Орбита подопечного</p>
        <h1 id="care-orbit-title">Выберите планету заботы</h1>
        <span>Коснитесь планеты, чтобы узнать о ней больше</span>
      </header>

      <div className="care-orbit__scene">
        <svg
          className="care-orbit__paths"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {configs.map((config, index) => (
            <motion.ellipse
              key={config.id}
              cx="50"
              cy="50"
              rx={config.radiusX}
              ry={config.radiusY}
              initial={previouslyVisited || reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: selectedPlanetId ? 0.23 : 0.62,
              }}
              transition={{
                pathLength: { duration: reduceMotion ? 0.12 : 0.9, delay: 0.45 + index * 0.08 },
                opacity: { duration: 0.3 },
              }}
            />
          ))}
        </svg>

        <motion.div
          className="care-orbit__sun"
          initial={previouslyVisited || reduceMotion ? false : { opacity: 0, scale: 0.88 }}
          animate={{
            opacity: selectedPlanetId ? 0.78 : 1,
            scale: selectedPlanetId ? 0.84 : 1,
            y: selectedPlanetId ? -24 : 0,
          }}
          transition={{ type: "spring", stiffness: 165, damping: 24, delay: previouslyVisited ? 0 : 0.18 }}
        >
          <span className="care-orbit__sun-glow" aria-hidden="true" />
          <img src={animal.photo} alt={`Подопечный ${animal.name}`} draggable={false} />
          <strong>{animal.name}</strong>
          <small>{animal.shortDescription}</small>
        </motion.div>

        <div className="care-orbit__planets">
          {missions.map((mission, index) => {
            const planet = presentation[mission.id];
            const status = getMissionStatus(mission.id, startedMissionIds, completedMissionIds);
            const selected = mission.id === selectedPlanetId;
            const dimmed = selectedPlanetId !== null && !selected;
            const recommended = mission.id === recommendedId && status === "available";
            const entranceDelay = 0.76 + index * 0.16;
            const entryX = -Math.cos(planet.phase) * 118;
            const entryY = -Math.sin(planet.phase) * 82;

            return (
              <div
                key={mission.id}
                ref={registerPlanet(mission.id)}
                className={`care-planet-anchor${selected ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}`}
              >
                <motion.button
                  type="button"
                  className={`care-planet care-planet--${mission.id} care-planet--${status}${recommended ? " care-planet--recommended" : ""}`}
                  data-testid={`mission-node-${mission.id}`}
                  data-orbit-planet={mission.id}
                  data-mission-id={mission.id}
                  data-mission-status={status}
                  aria-label={`${planet.title}. ${stateLabel[status]}. ${planet.description}`}
                  aria-pressed={selected}
                  onClick={() => selectPlanet(mission.id)}
                  initial={
                    previouslyVisited || reduceMotion
                      ? false
                      : { opacity: 0, scale: 0.35, x: entryX, y: entryY, rotate: -390 }
                  }
                  animate={
                    selected
                      ? {
                          opacity: 1,
                          x: [0, -18, 0],
                          y: [0, -24, 2],
                          scale: uiState === "openingGame" ? 10 : 1.92,
                          rotate: 0,
                        }
                      : {
                          opacity: dimmed ? 0.24 : 1,
                          x: 0,
                          y: 0,
                          scale: dimmed ? 0.72 : 1,
                          rotate: 0,
                        }
                  }
                  transition={
                    selected
                      ? {
                          duration: reduceMotion ? 0.08 : uiState === "openingGame" ? 0.5 : 0.56,
                          times: [0, 0.48, 1],
                          ease: [0.22, 1, 0.36, 1],
                        }
                      : {
                          duration: reduceMotion ? 0.08 : 1.05,
                          delay: previouslyVisited || reduceMotion ? 0 : entranceDelay,
                          type: reduceMotion ? "tween" : "spring",
                          stiffness: 145,
                          damping: 20,
                        }
                  }
                  whileTap={reduceMotion || isTransitioning ? undefined : { scale: selected ? 1.82 : 0.92 }}
                >
                  <span className="care-planet__trail" aria-hidden="true" />
                  <span className="care-planet__body" aria-hidden="true">
                    <img src={assetUrl(planet.image)} alt="" draggable={false} />
                    {status === "completed" ? <i><CheckIcon /></i> : null}
                  </span>
                  <span className="care-planet__label">
                    <strong>{planet.title}</strong>
                    <small>{stateLabel[status]}</small>
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedMission && selectedStatus ? (
            <motion.aside
              className="care-orbit__focus-panel"
              role="dialog"
              aria-label={`Планета ${presentation[selectedMission.id].title}`}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24, scale: reduceMotion ? 1 : 0.96 }}
              animate={{ opacity: uiState === "focusing" ? 0 : 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            >
              <button type="button" className="care-orbit__focus-back" onClick={closeFocus}>
                <span aria-hidden="true">←</span> К орбите
              </button>
              <div className="care-orbit__focus-copy">
                <span>Этап {missions.findIndex((item) => item.id === selectedMission.id) + 1} из {missions.length}</span>
                <h2>{presentation[selectedMission.id].title}</h2>
                <p>{presentation[selectedMission.id].description}</p>
                <div>
                  <small>{presentation[selectedMission.id].duration} мин</small>
                  <small>{stateLabel[selectedStatus]}</small>
                </div>
              </div>
              <button
                type="button"
                className="care-orbit__open"
                onClick={() => openPlanet(selectedMission.id)}
                disabled={isTransitioning}
              >
                {selectedStatus === "started" ? "Продолжить" : selectedStatus === "completed" ? "Пройти ещё раз" : "Начать игру"}
                <span aria-hidden="true">→</span>
              </button>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="care-orbit__footer">
        <div className="care-orbit__progress" aria-label={`Пройдено ${completedMissionIds.length} из ${missions.length}`}>
          <span>{completedMissionIds.length}/{missions.length}</span>
          <p>{completed ? "Круг заботы собран" : "Планеты светятся ярче после прохождения"}</p>
        </div>
        <button type="button" className="care-orbit__guardianship" onClick={onOpenGuardianship}>
          <HeartIcon />
          <span><strong>Как устроена опека</strong><small>Коротко о визитах и команде</small></span>
          <i aria-hidden="true">→</i>
        </button>
        {completed ? (
          <button type="button" className="care-orbit__complete-action" onClick={onCompleteOrbit}>
            Завершить орбиту <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
