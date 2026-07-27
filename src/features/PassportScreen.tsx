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
  HealthIcon,
  HeartIcon,
  MovementIcon,
  TrustIcon,
} from "../components/Icons";
import { OrbitField } from "../components/OrbitField";
import type { MatchResult, Mission } from "../types/app";
import {
  getActionLabel,
  getMissionStatus,
  getOrbitStoryFragments,
  getRecommendedMissionId,
} from "./passportModel";

interface PassportScreenProps {
  result: MatchResult;
  missions: Mission[];
  startedMissionIds: Mission["id"][];
  completedMissionIds: Mission["id"][];
  onBack: () => void;
  onSelectMission: (missionId: Mission["id"]) => void;
  onOpenGuardianship: () => void;
  onContinue: () => void;
}

const missionPresentation = {
  food: {
    title: "Визит",
    description: "Как договориться о встрече и быть рядом без давления",
    duration: 2,
    Icon: HeartIcon,
  },
  health: {
    title: "Здоровье",
    description: "Как заметить важное и подготовить визит к ветеринару",
    duration: 2,
    Icon: HealthIcon,
  },
  trust: {
    title: "Знакомство",
    description: "Четыре ситуации о бережном первом контакте",
    duration: 3,
    Icon: TrustIcon,
  },
  home: {
    title: "Прогулка",
    description: "Четыре решения для спокойного маршрута",
    duration: 3,
    Icon: MovementIcon,
  },
} satisfies Record<
  Mission["id"],
  { title: string; description: string; duration: number; Icon: typeof HeartIcon }
>;

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
      <span className="mission-home-glyph"><MovementIcon /></span>
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
  onOpenGuardianship,
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
  const roundedScore = Math.round(score);
  const recommendedMissionId = getRecommendedMissionId(missions, completedMissionIds);
  const missionStatuses = missions.map((mission) => ({
    id: mission.id,
    status: getMissionStatus(mission.id, startedMissionIds, completedMissionIds),
  }));
  const hasStartedMission = missionStatuses.some(({ status }) => status === "started");
  const storyFragments = getOrbitStoryFragments(animal);
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

          <div className="passport-story-fragments" aria-hidden="true">
            {storyFragments.map((fragment, index) => {
              const starts = [
                { x: -84, y: -18 },
                { x: 82, y: 4 },
                { x: -28, y: 78 },
              ];
              const start = starts[index] ?? starts[0];
              return (
                <motion.span
                  key={fragment}
                  className={`passport-story-fragment passport-story-fragment--${index + 1}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, ...start }}
                  animate={reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: [0, 1, 1, 0],
                        x: [start.x, 0, 0, 0],
                        y: [start.y, 0, 0, 0],
                      }}
                  transition={{
                    duration: reduceMotion ? 0.01 : 1.25,
                    delay: reduceMotion ? 0 : 0.3 + index * 0.12,
                    times: [0, 0.35, 0.76, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {fragment}
                </motion.span>
              );
            })}
          </div>

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

          <motion.p
            className="passport-story-caption"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.42, delay: reduceMotion ? 0 : 1.2 }}
          >
            {animal.shortDescription}
          </motion.p>

          <motion.div
            className="passport-identity"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.52, delay: reduceMotion ? 0 : 1.05 }}
          >
            <h1>{animal.name}</h1>
            <p>Кажется, вы подходите друг другу</p>
            <div className="passport-match-brief">
              <strong>Вы совпали на {roundedScore}%</strong>
              <span>{reasons.join(" ")}</span>
            </div>
          </motion.div>

          <div className="passport-routes-heading">
            <p className="passport-routes-title">Выберите планету заботы</p>
            <span>Каждая планета открывает отдельную мини-игру.</span>
          </div>

          <div className="passport-mission-nodes passport-mission-nodes--v2">
            {missions.map((mission, index) => {
              const presentation = missionPresentation[mission.id];
              const status = getMissionStatus(
                mission.id,
                startedMissionIds,
                completedMissionIds,
              );
              const recommended = mission.id === recommendedMissionId && status === "available";
              const actionLabel = getActionLabel(status, presentation.duration);
              const Icon = presentation.Icon;
              const orbitStyle = {
                "--node-progress": status === "completed"
                  ? "1turn"
                  : status === "started"
                    ? "0.72turn"
                    : "0.22turn",
              } as CSSProperties;
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
                  style={orbitStyle}
                  initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92, y: reduceMotion ? 0 : 14 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: reduceMotion ? 0 : [0, index % 2 === 0 ? -3 : 3, 0],
                    y: reduceMotion ? 0 : [0, -4 - index, 1, 0],
                  }}
                  transition={{
                    opacity: {
                      duration: reduceMotion ? 0.12 : 0.46,
                      delay: reduceMotion ? 0 : 1.38 + index * 0.1,
                    },
                    scale: {
                      duration: reduceMotion ? 0.12 : 0.46,
                      delay: reduceMotion ? 0 : 1.38 + index * 0.1,
                    },
                    x: reduceMotion ? { duration: 0.12 } : {
                      duration: 5.4 + index * 0.55,
                      delay: 1.5 + index * 0.18,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    y: reduceMotion ? { duration: 0.12 } : {
                      duration: 5.8 + index * 0.63,
                      delay: 1.44 + index * 0.16,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                  whileHover={reduceMotion ? undefined : { scale: 1.025, y: -4 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.975 }}
                >
                  <MissionAtmosphere missionId={mission.id} />
                  <span className="passport-mission-node__planet" aria-hidden="true">
                    <Icon />
                    <small>{index + 1}</small>
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

          <motion.button
            type="button"
            className="passport-guardianship-node"
            onClick={onOpenGuardianship}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.42, delay: reduceMotion ? 0 : 1.78 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            <span aria-hidden="true"><HeartIcon /></span>
            <span>
              <strong>Как устроена опека</strong>
              <small>Стоимость, визиты и команда до 5 человек</small>
            </span>
          </motion.button>

          {complete ? (
            <button
              type="button"
              className="passport-scroll-cue passport-scroll-cue--goal"
              onClick={onContinue}
            >
              Завершить орбиту <span aria-hidden="true">→</span>
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
                <p>Это четыре повторяющихся действия опекуна: знакомиться бережно, приезжать, гулять и замечать изменения в самочувствии.</p>
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
            <p>Круг опеки</p>
            <h2 id="passport-goal-title">Быть рядом с {animal.name} регулярно</h2>
            <span>
              {complete
                ? "Все четыре направления пройдены. Можно завершить путь или открыть справку об опеке."
                : `Пройдите ещё ${missions.length - completedMissionIds.length} из ${missions.length} кругов в любом удобном порядке.`}
            </span>
          </div>
          {complete ? (
            <Button className="button--orange passport-goal__action" onClick={onContinue}>
              Завершить орбиту
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
