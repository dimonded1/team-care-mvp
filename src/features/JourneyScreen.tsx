import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { FoundationMenu } from "../components/FoundationMenu";
import { CheckIcon } from "../components/Icons";
import { JourneyPetScene } from "../components/JourneyPetScene";
import { Progress } from "../components/Progress";
import type { Animal, Mission } from "../types/app";
import { DayBuilderGame } from "./DayBuilderGame";
import { HealthCareGame } from "./HealthCareGame";
import { TrustCareGame } from "./TrustCareGame";
import { VisitCareGame } from "./VisitCareGame";

interface JourneyScreenProps {
  animal: Animal;
  missions: Mission[];
  missionIndex: number;
  completedMissionIds: Mission["id"][];
  onBack: () => void;
  onCompleteMission: (mission: Mission) => void;
}

export function JourneyScreen({
  animal,
  missions,
  missionIndex,
  completedMissionIds,
  onBack,
  onCompleteMission,
}: JourneyScreenProps) {
  const mission = missions[missionIndex];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visitReady, setVisitReady] = useState(false);
  const [walkReady, setWalkReady] = useState(false);
  const [healthReady, setHealthReady] = useState(false);
  const [trustReady, setTrustReady] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setSelectedId(null);
    setVisitReady(false);
    setWalkReady(false);
    setHealthReady(false);
    setTrustReady(false);
  }, [mission.id]);

  const selected = mission.options.find((option) => option.id === selectedId) ?? null;
  const isVisitGame = mission.id === "food";
  const isHealthGame = mission.id === "health";
  const isTrustGame = mission.id === "trust";
  const isWalkGame = mission.id === "home";
  const missionAlreadyCompleted = completedMissionIds.includes(mission.id);
  const missionReady = isVisitGame
    ? visitReady
    : isHealthGame
      ? healthReady
      : isTrustGame
        ? trustReady
        : isWalkGame
          ? walkReady
        : Boolean(selected?.correct);
  const visibleCompletedCount = missionAlreadyCompleted
    ? completedMissionIds.length
    : completedMissionIds.length + (missionReady ? 1 : 0);

  return (
    <main className={`screen journey-screen${isVisitGame ? " journey-screen--visit-game" : ""}${isWalkGame ? " journey-screen--day-game journey-screen--walk-game" : ""}${isHealthGame ? " journey-screen--health-game" : ""}${isTrustGame ? " journey-screen--trust-game" : ""}`}>
      <AppHeader
        onBack={onBack}
        right={isVisitGame || isWalkGame || isHealthGame || isTrustGame ? <FoundationMenu /> : `Орбита: ${animal.name}`}
        light={isVisitGame || isWalkGame || isHealthGame || isTrustGame}
      />
      <div className="journey-layout">
        {!isVisitGame && !isWalkGame && !isHealthGame && !isTrustGame ? (
          <aside className="journey-animal">
            <JourneyPetScene animal={animal} mission={mission} />
          </aside>
        ) : null}

        <section className="journey-content">
          <Progress value={visibleCompletedCount} total={missions.length} label="Исследовано" />
          {isVisitGame ? (
            <VisitCareGame animal={animal} onReadyChange={setVisitReady} />
          ) : isWalkGame ? (
            <DayBuilderGame animal={animal} onReadyChange={setWalkReady} />
          ) : isHealthGame ? (
            <HealthCareGame animal={animal} onReadyChange={setHealthReady} />
          ) : isTrustGame ? (
            <TrustCareGame animal={animal} onReadyChange={setTrustReady} />
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
                {mission.options.map((option) => {
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
                  <small>{item.impactLabel}</small>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="screen-actions sticky-actions">
        <Button
          className="button--orange"
          fullWidth
          disabled={!missionReady && !missionAlreadyCompleted}
          onClick={() => {
            onCompleteMission(mission);
          }}
        >
          {missionAlreadyCompleted ? "Вернуться к орбите" : "Сохранить круг заботы"}
        </Button>
      </div>
    </main>
  );
}
