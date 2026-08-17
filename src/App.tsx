import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  clearSession,
  loadRecentMatchedAnimalIds,
  loadSession,
  normalizeSessionForJourney,
  reconcileSessionWithAnimalCatalog,
  rememberMatchedAnimalId,
  saveSession,
} from "./lib/storage";
import { createSessionHistory, type SessionHistory } from "./lib/history";
import { createMatchResult, findMatch } from "./lib/matching";
import { assetUrl } from "./lib/assets";
import type { ExperienceMode, Mission, Stage, StoredSession } from "./types/app";
import { isCareJourneyComplete } from "./features/passportModel";
import {
  getMissionsForExperience,
  isFourPawsEvent,
  isMissionUnlocked,
  reconcileRestoredMissionAccess,
  reconcileSessionExperience,
  resolveExperienceMode,
} from "./lib/experience";

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
  "reveal",
  "passport",
  "journey",
  "guardianship",
  "final",
]);
const availableAnimalIds = animals.map((animal) => animal.id);

function reconcileRestoredAppSession(
  session: StoredSession,
  experienceMode: ExperienceMode,
): StoredSession {
  const selectedAnimal = animals.find((animal) => animal.id === session.animalId);
  const missions = selectedAnimal
    ? getMissionsForExperience(getMissions(selectedAnimal), experienceMode)
    : [];
  return reconcileRestoredMissionAccess(session, missions, experienceMode);
}

export default function App() {
  const [experienceMode] = useState(resolveExperienceMode);
  const [stage, setStage] = useState<Stage>("boot");
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<Mission["id"] | null>(null);
  const [startedMissionIds, setStartedMissionIds] = useState<Mission["id"][]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Mission["id"][]>([]);
  const [missionProgress, setMissionProgress] = useState<StoredSession["missionProgress"]>({});
  const [sessionReady, setSessionReady] = useState(false);
  const sessionHistoryRef = useRef<SessionHistory | null>(null);
  const historyWriteRef = useRef<"replace" | "push" | "none">("replace");
  const lastHistoryKeyRef = useRef("");
  if (!sessionHistoryRef.current) sessionHistoryRef.current = createSessionHistory();
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
    const loadedSession = normalizeSessionForJourney(loadSession(), questions.length);
    const saved = loadedSession
      ? reconcileSessionExperience(loadedSession, experienceMode, questions.length)
      : null;
    const minimumBoot = new Promise((resolve) => window.setTimeout(resolve, 650));
    const logo = Promise.race([
      preload(assetUrl("assets/brand/logo-nika-green.jpg")),
      new Promise((resolve) => window.setTimeout(resolve, 1_200)),
    ]);
    void preload(animals[0]?.photo ?? "");
    void preload(animals[1]?.photo ?? "");

    Promise.all([minimumBoot, logo]).then(() => {
      if (!active) return;
      if (saved && restorableStages.has(saved.stage)) {
        const restoredAnswers = saved.answers.slice(0, questions.length);
        const rematchedAnimalId = restoredAnswers.length === questions.length
          ? findMatch(animals, questions, restoredAnswers).animal.id
          : null;
        const catalogSession = reconcileSessionWithAnimalCatalog(
          { ...saved, answers: restoredAnswers },
          availableAnimalIds,
          rematchedAnimalId,
        );
        const restored = reconcileRestoredAppSession(catalogSession, experienceMode);
        setAnswers(restored.answers);
        setAnimalId(restored.animalId);
        setActiveMissionId(restored.activeMissionId);
        setStartedMissionIds(restored.startedMissionIds);
        setCompletedMissionIds(restored.completedMissionIds);
        setMissionProgress(restored.missionProgress);
        setStage(restored.stage);
      } else {
        setStage("welcome");
      }
      historyWriteRef.current = "replace";
      setSessionReady(true);
    });

    return () => {
      active = false;
    };
  }, [experienceMode]);

  useEffect(() => sessionHistoryRef.current?.listen((session) => {
    const normalized = normalizeSessionForJourney(session, questions.length);
    if (!normalized) return;
    const reconciled = reconcileSessionExperience(normalized, experienceMode, questions.length);
    const restored = reconcileRestoredAppSession(reconciled, experienceMode);
    historyWriteRef.current = "none";
    setAnswers(restored.answers);
    setAnimalId(restored.animalId);
    setActiveMissionId(restored.activeMissionId);
    setStartedMissionIds(restored.startedMissionIds);
    setCompletedMissionIds(restored.completedMissionIds);
    setMissionProgress(restored.missionProgress);
    setStage(restored.stage);
  }), [experienceMode]);

  const matchResult = useMemo(() => {
    if (answers.length < questions.length) return null;
    const result = findMatch(animals, questions, answers);
    if (!animalId || result.animal.id === animalId) return result;
    const storedAnimal = animals.find((animal) => animal.id === animalId);
    return storedAnimal ? createMatchResult(result.userProfile, storedAnimal) : result;
  }, [answers, animalId]);

  const selectedAnimal = matchResult?.animal ?? animals.find((animal) => animal.id === animalId) ?? null;
  const missions = useMemo(
    () => (selectedAnimal
      ? getMissionsForExperience(getMissions(selectedAnimal), experienceMode)
      : []),
    [experienceMode, selectedAnimal],
  );
  const activeMissionIndex = activeMissionId
    ? missions.findIndex((mission) => mission.id === activeMissionId)
    : -1;
  const journeyComplete = isCareJourneyComplete(missions, completedMissionIds);

  useEffect(() => {
    if (stage === "boot" || !sessionReady) return;
    const session: StoredSession = {
      version: 3,
      experienceMode,
      stage,
      answers,
      animalId,
      activeMissionId,
      startedMissionIds,
      completedMissionIds,
      missionProgress,
      updatedAt: new Date().toISOString(),
    };
    saveSession(session);
    const historyKey = `${stage}:${answers.length}:${activeMissionId ?? ""}`;
    if (historyWriteRef.current === "none") {
      lastHistoryKeyRef.current = historyKey;
      historyWriteRef.current = "push";
      return;
    }
    if (historyWriteRef.current === "replace" || historyKey === lastHistoryKeyRef.current) {
      sessionHistoryRef.current?.replace(session);
    } else {
      sessionHistoryRef.current?.push(session);
    }
    lastHistoryKeyRef.current = historyKey;
    historyWriteRef.current = "push";
  }, [
    stage,
    answers,
    animalId,
    activeMissionId,
    startedMissionIds,
    completedMissionIds,
    missionProgress,
    sessionReady,
    experienceMode,
  ]);

  useEffect(() => {
    if (stage === "journey" && activeMissionIndex < 0) {
      setStage("passport");
    }
  }, [stage, activeMissionIndex]);

  useEffect(() => {
    if ((stage === "guardianship" || stage === "final") && selectedAnimal && !journeyComplete) {
      historyWriteRef.current = "replace";
      setStage("passport");
    }
  }, [journeyComplete, selectedAnimal, stage]);

  const startQuiz = () => {
    setAnswers([]);
    setAnimalId(null);
    setActiveMissionId(null);
    setStartedMissionIds([]);
    setCompletedMissionIds([]);
    setMissionProgress({});
    setStage("quiz");
  };

  const answerQuestion = (answer: boolean) => {
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    if (nextAnswers.length === questions.length) {
      const result = findMatch(animals, questions, nextAnswers, {
        recentAnimalIds: loadRecentMatchedAnimalIds(availableAnimalIds),
      });
      rememberMatchedAnimalId(result.animal.id, availableAnimalIds);
      setAnimalId(result.animal.id);
      setStage("reveal");
    }
  };

  const goBackInQuiz = () => {
    if (sessionHistoryRef.current?.back()) return;
    if (answers.length === 0) {
      setStage("welcome");
      return;
    }
    setAnswers((current) => current.slice(0, -1));
  };

  const completeMission = (mission: Mission) => {
    const nextCompletedMissionIds = completedMissionIds.includes(mission.id)
      ? completedMissionIds
      : [...completedMissionIds, mission.id];
    setStartedMissionIds((current) =>
      current.includes(mission.id) ? current : [...current, mission.id],
    );
    setCompletedMissionIds(nextCompletedMissionIds);
    setActiveMissionId(null);
    setStage(
      isFourPawsEvent(experienceMode)
      && isCareJourneyComplete(missions, nextCompletedMissionIds)
        ? "final"
        : "passport",
    );
  };

  const openMission = (missionId: Mission["id"]) => {
    const missionIndex = missions.findIndex((mission) => mission.id === missionId);
    if (missionIndex < 0 || !isMissionUnlocked(
      missions,
      completedMissionIds,
      missionId,
      experienceMode,
    )) return;
    setActiveMissionId(missionId);
    setStartedMissionIds((current) =>
      current.includes(missionId) ? current : [...current, missionId],
    );
    setStage("journey");
  };

  const updateMissionProgress = useCallback((
    missionId: Mission["id"],
    progress: unknown,
  ) => {
    setMissionProgress((current) => ({
      ...current,
      [missionId]: progress,
    }));
  }, []);

  const restart = () => {
    clearSession();
    setAnswers([]);
    setAnimalId(null);
    setActiveMissionId(null);
    setStartedMissionIds([]);
    setCompletedMissionIds([]);
    setMissionProgress({});
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
            right={<FoundationMenu onRestart={restart} />}
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
          onContinue={() => setStage(isFourPawsEvent(experienceMode) ? "final" : "guardianship")}
          onRestart={restart}
          experienceMode={experienceMode}
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
          missionProgress={missionProgress}
          experienceMode={experienceMode}
          onBack={() => {
            if (sessionHistoryRef.current?.back()) return;
            setActiveMissionId(null);
            setStage("passport");
          }}
          onCompleteMission={completeMission}
          onMissionProgressChange={updateMissionProgress}
          onRestart={restart}
        />
      );
    }
    if (stage === "guardianship" && selectedAnimal && journeyComplete && !isFourPawsEvent(experienceMode)) {
      return (
        <GuardianshipScreen
          animal={selectedAnimal}
          complete
          onBack={() => {
            setStage("passport");
          }}
          onContinue={() => {
            setStage("final");
          }}
        />
      );
    }
    if (stage === "final" && selectedAnimal && journeyComplete) {
      return (
        <FinalScreen
          animal={selectedAnimal}
          experienceMode={experienceMode}
          onBack={() => setStage(isFourPawsEvent(experienceMode) ? "passport" : "guardianship")}
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
