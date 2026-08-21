import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { FoundationMenu } from "../components/FoundationMenu";
import { CheckIcon } from "../components/Icons";
import { JourneyPetScene } from "../components/JourneyPetScene";
import { Progress } from "../components/Progress";
import type { Animal, ExperienceMode, Mission } from "../types/app";
import { createShuffleSeed, shuffleBySeed } from "../lib/shuffle";
import type { StoredSession } from "../types/app";
import { carePairDeckOrder } from "../data/carePairs";
import { walkMazes } from "../data/walkMazes";
import { getEventStation } from "../data/eventStations";
import { isFourPawsEvent } from "../lib/experience";
import {
  createOfflineStationProgress,
  restoreOfflineStationProgress,
} from "../lib/offlineStation";
import {
  createMatchingPairsState,
  restoreMatchingPairsState,
} from "../lib/matchingPairs";
import {
  createWalkMazeProgress,
  restoreWalkMazeProgress,
} from "../lib/maze";
import {
  HealthCareGame,
  createInitialHealthGameProgress,
  restoreHealthGameProgress,
} from "./HealthCareGame";
import { MatchingCareGame } from "./MatchingCareGame";
import {
  VisitCareGame,
  createInitialVisitGameProgress,
  restoreVisitGameProgress,
} from "./VisitCareGame";
import { WalkMazeGame } from "./WalkMazeGame";
import { OfflineEventStation } from "./OfflineEventStation";

interface JourneyScreenProps {
  animal: Animal;
  missions: Mission[];
  missionIndex: number;
  completedMissionIds: Mission["id"][];
  missionProgress: StoredSession["missionProgress"];
  experienceMode: ExperienceMode;
  onBack: () => void;
  onCompleteMission: (mission: Mission) => void;
  onMissionProgressChange: (missionId: Mission["id"], progress: unknown) => void;
  onRestart: () => void;
}

export function JourneyScreen({
  animal,
  missions,
  missionIndex,
  completedMissionIds,
  missionProgress,
  experienceMode,
  onBack,
  onCompleteMission,
  onMissionProgressChange,
  onRestart,
}: JourneyScreenProps) {
  const mission = missions[missionIndex];
  const eventStation = isFourPawsEvent(experienceMode) ? getEventStation(mission.id) : null;
  const isOfflineStation = eventStation?.mode === "offline";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readyMissionId, setReadyMissionId] = useState<Mission["id"] | null>(null);
  const reduceMotion = useReducedMotion();
  const [shuffleSeed] = useState(createShuffleSeed);
  const [initialVisitProgress] = useState(createInitialVisitGameProgress);
  const [initialHealthProgress] = useState(() =>
    createInitialHealthGameProgress(animal.species));
  const [initialMatchingProgress] = useState(() =>
    createMatchingPairsState(shuffleBySeed(carePairDeckOrder, createShuffleSeed())));
  const [initialMazeProgress] = useState(() => {
    const animalSeed = [...animal.id].reduce((total, character) =>
      total + character.charCodeAt(0), 0);
    return createWalkMazeProgress(walkMazes[animalSeed % walkMazes.length].id);
  });
  const visitProgress = restoreVisitGameProgress(
    missionProgress.food,
    initialVisitProgress,
  );
  const healthProgress = restoreHealthGameProgress(
    missionProgress.health,
    animal.species,
    initialHealthProgress,
  );
  const matchingProgress = missionProgress.trust
    ? restoreMatchingPairsState(missionProgress.trust)
    : initialMatchingProgress;
  const mazeProgress = useMemo(
    () => restoreWalkMazeProgress(
      missionProgress.home,
      initialMazeProgress.mazeId,
    ),
    [initialMazeProgress.mazeId, missionProgress.home],
  );
  const offlineProgress = restoreOfflineStationProgress(missionProgress[mission.id]);
  const displayedOptions = useMemo(
    () => shuffleBySeed(mission.options, `${shuffleSeed}:${mission.id}`),
    [mission.id, mission.options, shuffleSeed],
  );
  const handleMazeProgressChange = useCallback(
    (next: ReturnType<typeof createWalkMazeProgress>) =>
      onMissionProgressChange("home", next),
    [onMissionProgressChange],
  );

  useEffect(() => {
    setSelectedId(null);
  }, [mission.id]);

  const handleReadyChange = useCallback((ready: boolean) => {
    setReadyMissionId((current) => ready
      ? mission.id
      : current === mission.id
        ? null
        : current);
  }, [mission.id]);

  useEffect(() => {
    if (missionProgress[mission.id]) return;
    const initialProgress = isOfflineStation
      ? createOfflineStationProgress()
      : mission.id === "food"
      ? visitProgress
      : mission.id === "health"
        ? healthProgress
        : mission.id === "trust"
          ? matchingProgress
          : mazeProgress;
    onMissionProgressChange(mission.id, initialProgress);
  }, [
    healthProgress,
    isOfflineStation,
    matchingProgress,
    mazeProgress,
    mission.id,
    missionProgress,
    onMissionProgressChange,
    visitProgress,
  ]);

  const selected = mission.options.find((option) => option.id === selectedId) ?? null;
  const isVisitGame = !isOfflineStation && mission.id === "food";
  const isHealthGame = mission.id === "health";
  const isTrustGame = !isOfflineStation && mission.id === "trust";
  const isWalkGame = mission.id === "home";
  const missionAlreadyCompleted = completedMissionIds.includes(mission.id);
  const isInteractiveGame = isOfflineStation
    || isVisitGame
    || isHealthGame
    || isTrustGame
    || isWalkGame;
  const missionReady = isInteractiveGame
    ? readyMissionId === mission.id
    : Boolean(selected?.correct);
  const visibleCompletedCount = missionAlreadyCompleted
    ? completedMissionIds.length
    : completedMissionIds.length + (missionReady ? 1 : 0);

  return (
    <main className={`screen journey-screen${isOfflineStation ? ` journey-screen--offline-station journey-screen--offline-station-${eventStation?.number}` : ""}${isVisitGame ? " journey-screen--visit-game" : ""}${isWalkGame ? " journey-screen--day-game journey-screen--walk-game" : ""}${isHealthGame ? " journey-screen--health-game" : ""}${isTrustGame ? " journey-screen--trust-game" : ""}`}>
      <AppHeader
        onBack={onBack}
        right={isOfflineStation || isVisitGame || isWalkGame || isHealthGame || isTrustGame ? <FoundationMenu onRestart={onRestart} /> : `Орбита: ${animal.name}`}
        light={isOfflineStation || isVisitGame || isWalkGame || isHealthGame || isTrustGame}
      />
      <div className="journey-layout">
        {!isOfflineStation && !isVisitGame && !isWalkGame && !isHealthGame && !isTrustGame ? (
          <aside className="journey-animal">
            <JourneyPetScene animal={animal} mission={mission} />
          </aside>
        ) : null}

        <section className="journey-content">
          <Progress value={visibleCompletedCount} total={missions.length} label="Исследовано" />
          {isOfflineStation && eventStation ? (
            <OfflineEventStation
              station={eventStation}
              value={offlineProgress}
              onChange={(next) => onMissionProgressChange(mission.id, next)}
              onReadyChange={handleReadyChange}
            />
          ) : isVisitGame ? (
            <VisitCareGame
              animal={animal}
              progress={visitProgress}
              onProgressChange={(next) => onMissionProgressChange("food", next)}
              onReadyChange={handleReadyChange}
            />
          ) : isWalkGame ? (
            <WalkMazeGame
              value={mazeProgress}
              onChange={handleMazeProgressChange}
              onReadyChange={handleReadyChange}
              stationLabel={eventStation
                ? `Станция ${String(eventStation.number).padStart(2, "0")} · ${eventStation.title}`
                : undefined}
            />
          ) : isHealthGame ? (
            <HealthCareGame
              animal={animal}
              progress={healthProgress}
              onProgressChange={(next) => onMissionProgressChange("health", next)}
              onReadyChange={handleReadyChange}
              stationLabel={eventStation
                ? `Станция ${String(eventStation.number).padStart(2, "0")} · ${eventStation.title}`
                : undefined}
            />
          ) : isTrustGame ? (
            <MatchingCareGame
              value={matchingProgress}
              onChange={(next) => onMissionProgressChange("trust", next)}
              onReadyChange={handleReadyChange}
            />
          ) : (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.3 }}
            >
              <p className="section-number">Направление заботы</p>
              <h1>{mission.title}</h1>
              <p className="mission-prompt">{mission.prompt}</p>

              <div className="mission-options">
                {displayedOptions.map((option) => {
                  const isSelected = selectedId === option.id;
                  const isCorrectSelection = isSelected && option.correct;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`mission-option${isSelected ? " mission-option--selected" : ""}${isCorrectSelection ? " mission-option--correct" : ""}`}
                      onClick={() => setSelectedId(option.id)}
                    >
                      <span>{option.text}</span>
                      {isCorrectSelection ? <CheckIcon /> : null}
                    </button>
                  );
                })}
              </div>

              {selected ? (
                <motion.div
                  className={`feedback${selected.correct ? " feedback--success" : ""}`}
                  role="status"
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <strong>{selected.correct ? "Точно" : "Попробуйте ещё"}</strong>
                  <p>{selected.feedback}</p>
                </motion.div>
              ) : null}
            </motion.div>
          )}

          <div className="impact-row" aria-label="Прогресс заботы">
            {missions.map((item, index) => {
              const active = item.id === mission.id;
              const complete = completedMissionIds.includes(item.id) || (active && missionReady);
              const newlyCompleted = active && missionReady && !completedMissionIds.includes(item.id);
              const impactLabel = isFourPawsEvent(experienceMode)
                ? getEventStation(item.id)?.shortTitle ?? item.impactLabel
                : item.impactLabel;
              return (
                <div
                  key={item.id}
                  className={`impact${complete ? " impact--complete" : ""}${active ? " impact--active" : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <motion.span
                    key={complete ? `${item.id}-complete` : `${item.id}-pending`}
                    initial={newlyCompleted ? { opacity: 0, scale: reduceMotion ? 1 : 0.94 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: reduceMotion ? 0.12 : 0.24,
                      delay: newlyCompleted && !reduceMotion ? index * 0.08 : 0,
                      type: reduceMotion ? "tween" : "spring",
                      stiffness: 420,
                      damping: 30,
                    }}
                  >
                    {complete ? <CheckIcon /> : ""}
                  </motion.span>
                  <small>{impactLabel}</small>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="screen-actions sticky-actions">
        <Button
          className={isOfflineStation ? "offline-station__continue" : "button--orange"}
          fullWidth
          disabled={!missionReady && !missionAlreadyCompleted}
          onClick={() => {
            onCompleteMission(mission);
          }}
        >
          {missionAlreadyCompleted
            ? "Вернуться к маршруту"
            : isOfflineStation
              ? missionReady
                ? "Завершить станцию"
                : "Сначала выполните задание"
              : "Завершить станцию"}
        </Button>
      </div>
    </main>
  );
}
