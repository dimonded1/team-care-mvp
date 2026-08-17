import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon } from "../../components/Icons";
import { assetUrl } from "../../lib/assets";
import type { Animal, Mission } from "../../types/app";
import type { ExperienceMode } from "../../types/app";
import { getEventStation } from "../../data/eventStations";
import { isFourPawsEvent, isMissionUnlocked } from "../../lib/experience";
import {
  getMissionStatus,
  getRecommendedMissionId,
  isCareJourneyComplete,
} from "../passportModel";
import { hasOrbitBeenVisited, markOrbitVisited, useOrbitAnimation } from "./useOrbitAnimation";

interface OrbitExperienceProps {
  animal: Animal;
  missions: Mission[];
  startedMissionIds: Mission["id"][];
  completedMissionIds: Mission["id"][];
  onSelectMission: (missionId: Mission["id"]) => void;
  onCompleteOrbit: () => void;
  experienceMode: ExperienceMode;
}

type OrbitUiState =
  | "entering"
  | "orbiting"
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
  onCompleteOrbit,
  experienceMode,
}: OrbitExperienceProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const previouslyVisited = useRef(hasOrbitBeenVisited()).current;
  const [uiState, setUiState] = useState<OrbitUiState>(
    previouslyVisited ? "returning" : reduceMotion ? "orbiting" : "entering",
  );
  const [selectedPlanetId, setSelectedPlanetId] = useState<Mission["id"] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const completed = isCareJourneyComplete(missions, completedMissionIds);
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
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedPlanetId(missionId);
    setUiState("openingGame");
    window.setTimeout(() => onSelectMission(missionId), reduceMotion ? 80 : 360);
  };

  return (
    <section
      className={`care-orbit care-orbit--${uiState}${completed ? " care-orbit--complete" : ""}${isFourPawsEvent(experienceMode) ? " care-orbit--event" : ""}`}
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
        <p>{isFourPawsEvent(experienceMode) ? "Мероприятие «4 лапы»" : "Орбита подопечного"}</p>
        <h1 id="care-orbit-title">
          {isFourPawsEvent(experienceMode) ? "Маршрут из четырёх станций" : "Выберите планету заботы"}
        </h1>
        <span>
          {isFourPawsEvent(experienceMode)
            ? "Проходите станции по номерам — две онлайн и две у стенда"
            : "Коснитесь планеты, чтобы открыть мини-игру"}
        </span>
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
            const eventStation = isFourPawsEvent(experienceMode) ? getEventStation(mission.id) : null;
            const status = getMissionStatus(mission.id, startedMissionIds, completedMissionIds);
            const locked = !isMissionUnlocked(
              missions,
              completedMissionIds,
              mission.id,
              experienceMode,
            );
            const title = eventStation?.title ?? planet.title;
            const description = eventStation?.description ?? planet.description;
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
                  className={`care-planet care-planet--${mission.id} care-planet--${status}${recommended ? " care-planet--recommended" : ""}${locked ? " care-planet--locked" : ""}${eventStation ? ` care-planet--${eventStation.mode}` : ""}`}
                  data-testid={`mission-node-${mission.id}`}
                  data-orbit-planet={mission.id}
                  data-mission-id={mission.id}
                  data-mission-status={status}
                  aria-label={`${eventStation ? `Станция ${eventStation.number}. ` : ""}${title}. ${locked ? "Пока закрыто" : stateLabel[status]}. ${description}`}
                  aria-pressed={selected}
                  disabled={locked}
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
                    {eventStation ? <em>№{eventStation.number} · {eventStation.mode === "offline" ? "офлайн" : "онлайн"}</em> : null}
                    <strong>{eventStation?.shortTitle ?? planet.title}</strong>
                    <small>{locked ? "Сначала предыдущая" : stateLabel[status]}</small>
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>

      </div>

      <div className="care-orbit__footer">
        <div className="care-orbit__progress" aria-label={`Пройдено ${completedMissionIds.length} из ${missions.length}`}>
          <span>{completedMissionIds.length}/{missions.length}</span>
          <p>{completed
            ? isFourPawsEvent(experienceMode) ? "Все четыре станции пройдены" : "Круг заботы собран"
            : isFourPawsEvent(experienceMode) ? "Бумажные и цифровые печати собираются по порядку" : "Планеты светятся ярче после прохождения"}</p>
        </div>
        {completed ? (
          <button type="button" className="care-orbit__complete-action" onClick={onCompleteOrbit}>
            {isFourPawsEvent(experienceMode) ? "К финалу" : "Коротко об опеке"} <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
