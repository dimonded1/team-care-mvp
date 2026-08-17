import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { FoundationMenu } from "../components/FoundationMenu";
import { HeartIcon } from "../components/Icons";
import type { ExperienceMode, MatchResult, Mission } from "../types/app";
import { getMissionStatus, isCareJourneyComplete } from "./passportModel";
import { OrbitExperience } from "./orbit/OrbitExperience";
import { isFourPawsEvent } from "../lib/experience";

interface PassportScreenProps {
  result: MatchResult;
  missions: Mission[];
  startedMissionIds: Mission["id"][];
  completedMissionIds: Mission["id"][];
  onBack: () => void;
  onSelectMission: (missionId: Mission["id"]) => void;
  onContinue: () => void;
  onRestart: () => void;
  experienceMode: ExperienceMode;
}

export function PassportScreen({
  result,
  missions,
  startedMissionIds,
  completedMissionIds,
  onBack,
  onSelectMission,
  onContinue,
  onRestart,
  experienceMode,
}: PassportScreenProps) {
  const { animal, reasons, score } = result;
  const complete = isCareJourneyComplete(missions, completedMissionIds);
  const roundedScore = Math.round(score);
  const missionStatuses = missions.map((mission) => ({
    id: mission.id,
    status: getMissionStatus(mission.id, startedMissionIds, completedMissionIds),
  }));

  const scrollToMissions = () => {
    document.querySelector(".care-orbit")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="screen passport-screen passport-hub-screen">
      <AppHeader onBack={onBack} right={<FoundationMenu onRestart={onRestart} />} light />

      <div className="passport-hub passport-hub--solar">
        <OrbitExperience
          animal={animal}
          missions={missions}
          startedMissionIds={startedMissionIds}
          completedMissionIds={completedMissionIds}
          onSelectMission={onSelectMission}
          onCompleteOrbit={onContinue}
          experienceMode={experienceMode}
        />

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
                <ul className="passport-match-reasons">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </details>

            <details className="passport-panel passport-panel--story" open>
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
            <p>{isFourPawsEvent(experienceMode) ? "Маршрут мероприятия" : "Круг опеки"}</p>
            <h2 id="passport-goal-title">
              {isFourPawsEvent(experienceMode)
                ? `Пройти четыре станции вместе с ${animal.name}`
                : `Быть рядом с ${animal.name} регулярно`}
            </h2>
            <span>
              {complete
                ? isFourPawsEvent(experienceMode)
                  ? "Все четыре станции пройдены. Карточка участника и финальные действия уже доступны."
                  : "Все четыре направления пройдены. Осталось коротко узнать, как устроена опека."
                : isFourPawsEvent(experienceMode)
                  ? `Следуйте по номерам: осталось ${missions.length - completedMissionIds.length} из ${missions.length} станций.`
                  : `Пройдите ещё ${missions.length - completedMissionIds.length} из ${missions.length} кругов в любом удобном порядке.`}
            </span>
          </div>
          {complete ? (
            <Button className="button--orange passport-goal__action" onClick={onContinue}>
              {isFourPawsEvent(experienceMode) ? "К финалу маршрута" : "Коротко об опеке"}
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
