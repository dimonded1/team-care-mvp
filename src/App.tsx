import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { FoundationMenu } from "./components/FoundationMenu";
import { LegalCenter } from "./components/LegalCenter";
import { OrbitField } from "./components/OrbitField";
import { Progress } from "./components/Progress";
import { SiteFooter } from "./components/SiteFooter";
import { SwipeQuestion } from "./components/SwipeQuestion";
import { animals } from "./data/animals";
import { getMissions } from "./data/missions";
import { questions } from "./data/questions";
import {
  getLegalDocumentIdFromHash,
  type LegalDocumentId,
} from "./data/legalDocuments";
import { BootScreen } from "./features/BootScreen";
import { FinalScreen } from "./features/FinalScreen";
import { GuardianshipScreen } from "./features/GuardianshipScreen";
import { JourneyScreen } from "./features/JourneyScreen";
import { PassportScreen } from "./features/PassportScreen";
import { RevealScreen } from "./features/RevealScreen";
import { WelcomeScreen } from "./features/WelcomeScreen";
import { clearSession, loadSession, saveSession } from "./lib/storage";
import { findMatch } from "./lib/matching";
import { assetUrl } from "./lib/assets";
import type { Mission, Stage, StoredSession } from "./types/app";

function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

const restorableStages = new Set<StoredSession["stage"]>([
  "welcome",
  "quiz",
  "passport",
  "journey",
  "guardianship",
  "final",
]);

export default function App() {
  const [stage, setStage] = useState<Stage>("boot");
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<Mission["id"] | null>(null);
  const [startedMissionIds, setStartedMissionIds] = useState<Mission["id"][]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Mission["id"][]>([]);
  const [legalDocumentId, setLegalDocumentId] = useState<LegalDocumentId | null>(() =>
    getLegalDocumentIdFromHash(window.location.hash));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage, answers.length]);

  useEffect(() => {
    const syncLegalHash = () => {
      const nextDocumentId = getLegalDocumentIdFromHash(window.location.hash);
      if (!nextDocumentId && window.location.hash.startsWith("#legal/")) {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      setLegalDocumentId(nextDocumentId);
    };
    syncLegalHash();
    window.addEventListener("popstate", syncLegalHash);
    window.addEventListener("hashchange", syncLegalHash);
    return () => {
      window.removeEventListener("popstate", syncLegalHash);
      window.removeEventListener("hashchange", syncLegalHash);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const saved = loadSession();
    const minimumBoot = new Promise((resolve) => window.setTimeout(resolve, 650));
    const assets = Promise.race([
      Promise.allSettled([
        preload(assetUrl("assets/brand/logo-nika-green.jpg")),
        preload(animals[0]?.photo ?? ""),
        preload(animals[1]?.photo ?? ""),
      ]),
      new Promise((resolve) => window.setTimeout(resolve, 2_500)),
    ]);

    Promise.all([minimumBoot, assets]).then(() => {
      if (!active) return;
      if (saved && restorableStages.has(saved.stage)) {
        setAnswers(saved.answers.slice(0, questions.length));
        setAnimalId(saved.animalId);
        setActiveMissionId(saved.activeMissionId);
        setStartedMissionIds(saved.startedMissionIds);
        setCompletedMissionIds(saved.completedMissionIds);
        setStage(saved.stage);
      } else {
        setStage("welcome");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const matchResult = useMemo(() => {
    if (answers.length < questions.length) return null;
    const result = findMatch(animals, questions, answers);
    if (!animalId || result.animal.id === animalId) return result;
    const storedAnimal = animals.find((animal) => animal.id === animalId);
    return storedAnimal ? { ...result, animal: storedAnimal } : result;
  }, [answers, animalId]);

  const selectedAnimal = matchResult?.animal ?? animals.find((animal) => animal.id === animalId) ?? null;
  const missions = useMemo(
    () => (selectedAnimal ? getMissions(selectedAnimal) : []),
    [selectedAnimal],
  );
  const activeMissionIndex = activeMissionId
    ? missions.findIndex((mission) => mission.id === activeMissionId)
    : -1;

  useEffect(() => {
    if (stage === "boot" || stage === "reveal") return;
    saveSession({
      version: 2,
      stage,
      answers,
      animalId,
      activeMissionId,
      startedMissionIds,
      completedMissionIds,
      updatedAt: new Date().toISOString(),
    });
  }, [
    stage,
    answers,
    animalId,
    activeMissionId,
    startedMissionIds,
    completedMissionIds,
  ]);

  useEffect(() => {
    if (stage === "journey" && activeMissionIndex < 0) {
      setStage("passport");
    }
  }, [stage, activeMissionIndex]);

  const startQuiz = () => {
    setAnswers([]);
    setAnimalId(null);
    setActiveMissionId(null);
    setStartedMissionIds([]);
    setCompletedMissionIds([]);
    setStage("quiz");
  };

  const answerQuestion = (answer: boolean) => {
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    if (nextAnswers.length === questions.length) {
      const result = findMatch(animals, questions, nextAnswers);
      setAnimalId(result.animal.id);
      setStage("reveal");
    }
  };

  const goBackInQuiz = () => {
    if (answers.length === 0) {
      setStage("welcome");
      return;
    }
    setAnswers((current) => current.slice(0, -1));
  };

  const completeMission = (mission: Mission) => {
    setStartedMissionIds((current) =>
      current.includes(mission.id) ? current : [...current, mission.id],
    );
    setCompletedMissionIds((current) =>
      current.includes(mission.id) ? current : [...current, mission.id],
    );
    setActiveMissionId(null);
    setStage("passport");
  };

  const openMission = (missionId: Mission["id"]) => {
    if (!missions.some((mission) => mission.id === missionId)) return;
    setActiveMissionId(missionId);
    setStartedMissionIds((current) =>
      current.includes(missionId) ? current : [...current, missionId],
    );
    setStage("journey");
  };

  const restart = () => {
    clearSession();
    setAnswers([]);
    setAnimalId(null);
    setActiveMissionId(null);
    setStartedMissionIds([]);
    setCompletedMissionIds([]);
    setStage("welcome");
  };

  const openLegalDocument = useCallback((documentId: LegalDocumentId) => {
    const state = window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
    const nextHash = `#legal/${documentId}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState({ ...state, nikaLegal: true }, "", nextHash);
    }
    setLegalDocumentId(documentId);
  }, []);

  const changeLegalDocument = useCallback((documentId: LegalDocumentId) => {
    const state = window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
    window.history.replaceState({ ...state, nikaLegal: true }, "", `#legal/${documentId}`);
    setLegalDocumentId(documentId);
  }, []);

  const closeLegalCenter = useCallback(() => {
    if (getLegalDocumentIdFromHash(window.location.hash)) {
      if (window.history.state?.nikaLegal) {
        window.history.back();
        return;
      }
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setLegalDocumentId(null);
  }, []);

  const transition = reduceMotion
    ? { duration: 0.1 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  const screen = (() => {
    if (animals.length < 5 || questions.length < 10) {
      return (
        <main className="fatal-screen">
          <h1>Не удалось загрузить данные</h1>
          <p>Проверьте локальную базу подопечных и вопросов.</p>
        </main>
      );
    }
    if (stage === "boot") return <BootScreen />;
    if (stage === "welcome") return <WelcomeScreen onStart={startQuiz} />;
    if (stage === "quiz") {
      const question = questions[answers.length];
      if (!question) return <BootScreen />;
      return (
        <main className="screen quiz-screen">
          <OrbitField variant="matching" showConstellation />
          <AppHeader
            onBack={goBackInQuiz}
            right={<FoundationMenu />}
            light
          />
          <Progress
            value={answers.length + 1}
            total={questions.length}
            label="Тест-мэтчинг"
            copyMode="counter"
            copyPlacement="after"
          />
          <div className="quiz-copy">
            <h1>Это про вас?</h1>
          </div>
          <SwipeQuestion
            key={question.id}
            question={question}
            upcomingQuestions={questions.slice(answers.length + 1, answers.length + 3)}
            questionNumber={answers.length + 1}
            onAnswer={answerQuestion}
          />
        </main>
      );
    }
    if (stage === "reveal" && matchResult) {
      return <RevealScreen result={matchResult} onContinue={() => setStage("passport")} />;
    }
    if (stage === "passport" && matchResult) {
      return (
        <PassportScreen
          result={matchResult}
          missions={missions}
          startedMissionIds={startedMissionIds}
          completedMissionIds={completedMissionIds}
          onBack={() => setStage("reveal")}
          onSelectMission={openMission}
          onContinue={() => setStage("guardianship")}
        />
      );
    }
    if (stage === "journey" && selectedAnimal && activeMissionIndex >= 0) {
      return (
        <JourneyScreen
          animal={selectedAnimal}
          missions={missions}
          missionIndex={activeMissionIndex}
          completedMissionIds={completedMissionIds}
          onBack={() => {
            setActiveMissionId(null);
            setStage("passport");
          }}
          onCompleteMission={completeMission}
        />
      );
    }
    if (stage === "guardianship" && selectedAnimal) {
      return (
        <GuardianshipScreen
          animal={selectedAnimal}
          onBack={() => {
            setStage("passport");
          }}
          onContinue={() => setStage("final")}
        />
      );
    }
    if (stage === "final" && selectedAnimal) {
      return (
        <FinalScreen
          animal={selectedAnimal}
          onBack={() => setStage("guardianship")}
          onRestart={restart}
        />
      );
    }
    return <WelcomeScreen onStart={startQuiz} />;
  })();

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          className="screen-frame"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          transition={transition}
        >
          {screen}
        </motion.div>
      </AnimatePresence>
      <SiteFooter onOpenLegal={openLegalDocument} />
      <AnimatePresence>
        {legalDocumentId && (
          <LegalCenter
            documentId={legalDocumentId}
            onChangeDocument={changeLegalDocument}
            onClose={closeLegalCenter}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
