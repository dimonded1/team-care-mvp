import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { CSSProperties, PointerEvent } from "react";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { FoundationMenu } from "../components/FoundationMenu";
import {
  CheckIcon,
  FoodIcon,
  HealthIcon,
  HeartIcon,
  HomeIcon,
  TrustIcon,
} from "../components/Icons";
import { OrbitField } from "../components/OrbitField";
import type { MatchResult, Mission } from "../types/app";

interface PassportScreenProps {
  result: MatchResult;
  missions: Mission[];
  startedMissionIds: Mission["id"][];
  completedMissionIds: Mission["id"][];
  onBack: () => void;
  onSelectMission: (missionId: Mission["id"]) => void;
  onContinue: () => void;
}

type MissionStatus = "available" | "started" | "completed";

const missionPresentation = {
  food: {
    title: "Повседневность",
    description: "Соберите спокойный день",
    duration: 3,
    Icon: FoodIcon,
  },
  health: {
    title: "Здоровье",
    description: "Что важно ему сейчас",
    duration: 2,
    Icon: HealthIcon,
  },
  trust: {
    title: "Доверие",
    description: "Как знакомиться бережно",
    duration: 3,
    Icon: TrustIcon,
  },
  home: {
    title: "Шанс на дом",
    description: "Проложите маршрут к семье",
    duration: 3,
    Icon: HomeIcon,
  },
} satisfies Record<
  Mission["id"],
  { title: string; description: string; duration: number; Icon: typeof FoodIcon }
>;

const statusLabels: Record<MissionStatus, string> = {
  available: "Не начато",
  started: "В процессе",
  completed: "Пройдено",
};

function getMissionStatus(
  missionId: Mission["id"],
  startedMissionIds: Mission["id"][],
  completedMissionIds: Mission["id"][],
): MissionStatus {
  if (completedMissionIds.includes(missionId)) return "completed";
  if (startedMissionIds.includes(missionId)) return "started";
  return "available";
}

function getRecommendedMission(animal: MatchResult["animal"]): Mission["id"] {
  const needs = animal.careTags.join(" ").toLocaleLowerCase("ru");
  if (needs.includes("довер") || needs.includes("социал") || needs.includes("простран")) {
    return "trust";
  }
  if (needs.includes("здоров")) return "health";
  if (needs.includes("движ") || needs.includes("режим") || needs.includes("игр")) {
    return "food";
  }
  return "home";
}

function getActionLabel(
  status: MissionStatus,
  duration: number,
  recommended: boolean,
) {
  if (status === "completed") return "Пройдено";
  if (status === "started") return "Продолжить";
  if (recommended) return "Рекомендуем начать";
  return `Начать · ${duration} мин`;
}

function MissionAtmosphere({ missionId }: { missionId: Mission["id"] }) {
  if (missionId === "food") {
    return (
      <span className="mission-atmosphere mission-atmosphere--food" aria-hidden="true">
        <i className="mission-steam mission-steam--one" />
        <i className="mission-steam mission-steam--two" />
        <i className="mission-steam mission-steam--three" />
        <i className="mission-warmth" />
      </span>
    );
  }

  if (missionId === "health") {
    return (
      <span className="mission-atmosphere mission-atmosphere--health" aria-hidden="true">
        <i className="mission-scan-line" />
        <svg viewBox="0 0 180 54" focusable="false">
          <path d="M0 30h39l9-17 15 31 15-24 12 10h90" />
        </svg>
      </span>
    );
  }

  if (missionId === "trust") {
    return (
      <span className="mission-atmosphere mission-atmosphere--trust" aria-hidden="true">
        <i className="mission-trust-wave mission-trust-wave--one" />
        <i className="mission-trust-wave mission-trust-wave--two" />
        <i className="mission-trust-dot mission-trust-dot--one" />
        <i className="mission-trust-dot mission-trust-dot--two" />
        <i className="mission-trust-dot mission-trust-dot--three" />
      </span>
    );
  }

  return (
    <span className="mission-atmosphere mission-atmosphere--home" aria-hidden="true">
      <i className="mission-home-route" />
      <i className="mission-home-dot mission-home-dot--one" />
      <i className="mission-home-dot mission-home-dot--two" />
      <i className="mission-home-dot mission-home-dot--three" />
      <span className="mission-home-glyph"><HomeIcon /></span>
    </span>
  );
}

export function PassportScreen({
  result,
  missions,
  startedMissionIds,
  completedMissionIds,
  onBack,
  onSelectMission,
  onContinue,
}: PassportScreenProps) {
  const { animal, reasons, score } = result;
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 70, damping: 24, mass: 0.7 });
  const smoothY = useSpring(pointerY, { stiffness: 70, damping: 24, mass: 0.7 });
  const portraitX = useTransform(smoothX, [-1, 1], [-8, 8]);
  const portraitY = useTransform(smoothY, [-1, 1], [-6, 6]);
  const portraitRotateX = useTransform(smoothY, [-1, 1], [1.4, -1.4]);
  const portraitRotateY = useTransform(smoothX, [-1, 1], [-1.8, 1.8]);
  const nodesX = useTransform(smoothX, [-1, 1], [4, -4]);
  const nodesY = useTransform(smoothY, [-1, 1], [3, -3]);
  const complete = completedMissionIds.length === missions.length && missions.length > 0;
  const recommendedMissionId = getRecommendedMission(animal);
  const roundedScore = Math.round(score);
  const missionStatuses = missions.map((mission) => ({
    id: mission.id,
    status: getMissionStatus(mission.id, startedMissionIds, completedMissionIds),
  }));
  const hasStartedMission = missionStatuses.some(({ status }) => status === "started");
  const segmentStyles = Object.fromEntries(
    missionStatuses.map(({ id, status }) => [
      `--segment-${id}`,
      status === "completed"
        ? "var(--success)"
        : status === "started"
          ? "var(--pink)"
          : "rgba(255, 255, 255, 0.18)",
    ]),
  ) as CSSProperties;

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const scrollToMissions = () => {
    document.getElementById("care-mini-games")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <main className="screen passport-screen passport-hub-screen">
      <OrbitField variant="passport" showPlanets />
      <AppHeader onBack={onBack} right={<FoundationMenu />} light />

      <div
        className="passport-hub passport-hub--v2"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
      >
        <section
          id="care-mini-games"
          className="passport-orbit-stage passport-orbit-stage--v2"
          aria-label={`Маршруты заботы для ${animal.name}`}
        >
          <motion.div
            className="passport-orbit-stage__rings"
            aria-hidden="true"
            style={reduceMotion ? undefined : { x: nodesX, y: nodesY }}
          >
            <span className="passport-orbit-ring passport-orbit-ring--outer" />
            <span className="passport-orbit-ring passport-orbit-ring--inner" />
          </motion.div>

          <motion.div
            className={`passport-portrait passport-portrait--v2${hasStartedMission ? " passport-portrait--has-started" : ""}`}
            style={reduceMotion ? segmentStyles : {
              ...segmentStyles,
              x: portraitX,
              y: portraitY,
              rotateX: portraitRotateX,
              rotateY: portraitRotateY,
            }}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion
              ? { duration: 0.12 }
              : { type: "spring", stiffness: 170, damping: 24, mass: 0.9, delay: 0.18 }}
          >
            <div className="passport-portrait__progress passport-portrait__progress--segments" aria-hidden="true" />
            <div className="passport-portrait__photo">
              <AnimalPhoto src={animal.photo} name={animal.name} />
            </div>
            <div className="passport-orbit-progress" aria-label={`Ваша орбита: ${completedMissionIds.length} из ${missions.length}`}>
              <strong>Ваша орбита · {completedMissionIds.length}/{missions.length}</strong>
              <span className="passport-orbit-progress__dots" aria-hidden="true">
                {missionStatuses.map(({ id, status }) => (
                  <i key={id} className={`passport-orbit-progress__dot passport-orbit-progress__dot--${status}`} />
                ))}
              </span>
            </div>
          </motion.div>

          <motion.div
            className="passport-identity"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.52, delay: reduceMotion ? 0 : 0.32 }}
          >
            <h1>{animal.name}</h1>
            <p>Кажется, вы подходите друг другу</p>
            <div className="passport-match-brief">
              <strong>Вы совпали на {roundedScore}%</strong>
              <span>{reasons.join(" ")}</span>
            </div>
          </motion.div>

          <p className="passport-routes-title">Выберите мини-игру</p>

          <div className="passport-mission-nodes passport-mission-nodes--v2">
            {missions.map((mission, index) => {
              const presentation = missionPresentation[mission.id];
              const status = getMissionStatus(
                mission.id,
                startedMissionIds,
                completedMissionIds,
              );
              const recommended = mission.id === recommendedMissionId && status === "available";
              const actionLabel = getActionLabel(status, presentation.duration, recommended);
              const Icon = presentation.Icon;
              return (
                <motion.button
                  key={mission.id}
                  type="button"
                  className={`passport-mission-node passport-mission-node--v2 passport-mission-node--${mission.id} passport-mission-node--${status}${recommended ? " passport-mission-node--recommended" : ""}`}
                  data-testid={`mission-node-${mission.id}`}
                  data-mission-id={mission.id}
                  data-mission-status={status}
                  aria-label={`${presentation.title}. ${presentation.description}. ${actionLabel}`}
                  onClick={() => onSelectMission(mission.id)}
                  initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92, y: reduceMotion ? 0 : 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: reduceMotion ? 0.12 : 0.46,
                    delay: reduceMotion ? 0 : 0.44 + index * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={reduceMotion ? undefined : { scale: 1.025, y: -4 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.975 }}
                >
                  <MissionAtmosphere missionId={mission.id} />
                  <span className="passport-mission-node__planet" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="passport-mission-node__copy">
                    <strong>{presentation.title}</strong>
                    <span>{presentation.description}</span>
                  </span>
                  <span className="passport-mission-node__status">
                    {status === "completed" ? <CheckIcon /> : null}
                    <span>{actionLabel}</span>
                    {status !== "completed" ? <span aria-hidden="true">→</span> : null}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {complete ? (
            <button
              type="button"
              className="passport-scroll-cue passport-scroll-cue--goal"
              onClick={onContinue}
            >
              Стать опекуном <span aria-hidden="true">→</span>
            </button>
          ) : (
            <a className="passport-scroll-cue" href="#animal-passport">
              Орбита и история <span aria-hidden="true">↓</span>
            </a>
          )}
        </section>

        <section id="animal-passport" className="passport-panels" aria-labelledby="animal-passport-title">
          <header className="passport-panels__heading">
            <div>
              <p>Орбита подопечного</p>
              <h2 id="animal-passport-title">{animal.name}</h2>
            </div>
            <span>{animal.species === "dog" ? "Собака" : "Кошка"} · {animal.sex} · {animal.age}</span>
          </header>

          <div className="passport-panels__grid">
            <details className="passport-panel">
              <summary>
                <span>Почему вы совпали</span>
                <span aria-hidden="true">+</span>
              </summary>
              <div>
                <strong>{roundedScore}% совпадения</strong>
                <p>{reasons.join(" ")}</p>
              </div>
            </details>

            <details className="passport-panel">
              <summary>
                <span>История подопечного</span>
                <span aria-hidden="true">+</span>
              </summary>
              <div>
                <div className="passport-hub__tags" aria-label="Характер">
                  {animal.traits.slice(0, 4).map((trait) => <span key={trait}>{trait}</span>)}
                </div>
                <p>{animal.story}</p>
              </div>
            </details>

            <details className="passport-panel">
              <summary>
                <span>Что важно сейчас</span>
                <span aria-hidden="true">+</span>
              </summary>
              <div>
                <div className="passport-hub__care-tags">
                  {animal.careTags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <p>Это четыре стороны повседневной заботы. Откройте каждую мини-игру, чтобы увидеть, как опекун помогает подопечному.</p>
              </div>
            </details>

          </div>
        </section>

        <section
          className={`passport-goal${complete ? " passport-goal--complete" : ""}`}
          aria-labelledby="passport-goal-title"
        >
          <div className="passport-goal__orbit" aria-hidden="true">
            {missionStatuses.map(({ id, status }) => (
              <i key={id} className={`passport-goal__point passport-goal__point--${status}`} />
            ))}
            <HeartIcon />
          </div>
          <div className="passport-goal__copy">
            <p>Цель маршрута</p>
            <h2 id="passport-goal-title">Стать частью команды {animal.name}</h2>
            <span>
              {complete
                ? "Вы познакомились со всеми направлениями заботы. Теперь можно узнать, как присоединиться к команде опекунов."
                : `Пройдите ещё ${missions.length - completedMissionIds.length} из ${missions.length} направлений — и откроется следующий шаг.`}
            </span>
          </div>
          {complete ? (
            <Button className="button--orange passport-goal__action" onClick={onContinue}>
              Стать опекуном
            </Button>
          ) : (
            <button
              type="button"
              className="passport-goal__count passport-goal__jump"
              onClick={scrollToMissions}
              aria-label={`Вернуться к мини-играм. Пройдено ${completedMissionIds.length} из ${missions.length}`}
            >
              <strong>{completedMissionIds.length}/{missions.length}</strong>
              <span>К мини-играм <span aria-hidden="true">↑</span></span>
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
