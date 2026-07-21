import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "../types/app";
import { CheckIcon, CloseIcon } from "./Icons";

interface SwipeQuestionProps {
  question: Question;
  upcomingQuestions: Question[];
  questionNumber: number;
  onAnswer: (answer: boolean) => void;
}

type Direction = "yes" | "no" | null;
type TouchAxis = "horizontal" | "vertical" | null;

export function SwipeQuestion({
  question,
  upcomingQuestions,
  questionNumber,
  onAnswer,
}: SwipeQuestionProps) {
  const [direction, setDirection] = useState<Direction>(null);
  const reduceMotion = useReducedMotion();
  const lockedRef = useRef(false);
  const reducedMotionTimerRef = useRef<number | null>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const touchGestureRef = useRef<{
    startX: number;
    startY: number;
    axis: TouchAxis;
  } | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], reduceMotion ? [0, 0, 0] : [-8, 0, 8]);
  const scale = useTransform(x, [-180, 0, 180], reduceMotion ? [1, 1, 1] : [0.985, 1, 0.985]);
  const noOpacity = useTransform(x, [-96, -24], [1, 0]);
  const yesOpacity = useTransform(x, [24, 96], [0, 1]);
  const noTintOpacity = useTransform(x, [-150, -24], [0.28, 0]);
  const yesTintOpacity = useTransform(x, [24, 150], [0, 0.22]);
  const nearCardX = useTransform(x, [-180, 0, 180], [10, -10, -24]);
  const nearCardRotate = useTransform(x, [-180, 0, 180], [0.8, -2.8, -6]);
  const farCardX = useTransform(x, [-180, 0, 180], [22, 12, 2]);
  const farCardRotate = useTransform(x, [-180, 0, 180], [7, 4, 1]);

  const answer = useCallback((value: boolean, velocity = 0) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setDirection(value ? "yes" : "no");
    x.stop();

    if (reduceMotion) {
      reducedMotionTimerRef.current = window.setTimeout(() => onAnswer(value), 90);
      return;
    }

    const destination = (value ? 1 : -1) * (window.innerWidth + 280);
    void animate(x, destination, {
      type: "spring",
      stiffness: 360,
      damping: 30,
      velocity,
    }).then(() => onAnswer(value));
  }, [onAnswer, reduceMotion, x]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") answer(true);
      if (event.key === "ArrowLeft") answer(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer]);

  useEffect(() => () => {
    if (reducedMotionTimerRef.current !== null) {
      window.clearTimeout(reducedMotionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const surface = swipeAreaRef.current;
    if (!surface) return;

    const resetTouchGesture = () => {
      touchGestureRef.current = null;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        resetTouchGesture();
        return;
      }

      const touch = event.touches[0];
      touchGestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        axis: null,
      };

      const edgeGuard = 40;
      const startsAtBrowserEdge = touch.clientX <= edgeGuard
        || touch.clientX >= window.innerWidth - edgeGuard;
      if (startsAtBrowserEdge && event.cancelable) event.preventDefault();
    };

    const onTouchMove = (event: TouchEvent) => {
      const gesture = touchGestureRef.current;
      if (!gesture || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (gesture.axis === null && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 7) {
        gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.1
          ? "horizontal"
          : "vertical";
      }

      if (gesture.axis === "horizontal" && event.cancelable) event.preventDefault();
    };

    surface.addEventListener("touchstart", onTouchStart, { passive: false });
    surface.addEventListener("touchmove", onTouchMove, { passive: false });
    surface.addEventListener("touchend", resetTouchGesture);
    surface.addEventListener("touchcancel", resetTouchGesture);

    return () => {
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("touchmove", onTouchMove);
      surface.removeEventListener("touchend", resetTouchGesture);
      surface.removeEventListener("touchcancel", resetTouchGesture);
    };
  }, []);

  const showGestureGuide = questionNumber === 1;

  return (
    <div
      ref={swipeAreaRef}
      className={`swipe-area ${showGestureGuide ? "swipe-area--guided" : "swipe-area--clean"}`}
    >
      <div className="swipe-stack" aria-live="polite">
        <motion.article
          className="swipe-card swipe-card--back swipe-card--back-far"
          style={reduceMotion ? undefined : { x: farCardX, rotate: farCardRotate, scale: 0.92 }}
          aria-hidden="true"
        >
          <span>{String(questionNumber + 2).padStart(2, "0")}</span>
          <p>{upcomingQuestions[1]?.text ?? "Ещё один вопрос о вашем ритме"}</p>
        </motion.article>
        <motion.article
          className="swipe-card swipe-card--back swipe-card--back-near"
          style={reduceMotion ? undefined : { x: nearCardX, rotate: nearCardRotate, scale: 0.965 }}
          aria-hidden="true"
        >
          <span>{String(questionNumber + 1).padStart(2, "0")}</span>
          <p>{upcomingQuestions[0]?.text ?? "Совсем скоро покажем ваш мэтч"}</p>
        </motion.article>
        <motion.article
          className="swipe-card"
          data-testid="swipe-card"
          data-choice-source="swipe"
          drag={direction ? false : "x"}
          dragElastic={0}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 520, bounceDamping: 32 }}
          onDragStart={() => x.stop()}
          onDragEnd={(_, info) => {
            const confidentSwipe = Math.abs(info.offset.x) > 96 || Math.abs(info.velocity.x) > 650;
            if (!confidentSwipe) {
              void animate(x, 0, {
                type: "spring",
                stiffness: 420,
                damping: 34,
                mass: 0.7,
              });
              return;
            }

            const intent = Math.abs(info.offset.x) > 24 ? info.offset.x : info.velocity.x;
            answer(intent > 0, info.velocity.x);
          }}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          whileDrag={reduceMotion ? undefined : { scale: 1.012 }}
          transition={{ duration: reduceMotion ? 0.09 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ x, rotate, scale, touchAction: "pan-y" }}
          aria-label={`Вопрос ${questionNumber}: ${question.text}`}
        >
          <motion.div className="swipe-card__answer-tint swipe-card__answer-tint--no" style={{ opacity: noTintOpacity }} aria-hidden="true" />
          <motion.div className="swipe-card__answer-tint swipe-card__answer-tint--yes" style={{ opacity: yesTintOpacity }} aria-hidden="true" />
          <div className="swipe-card__number" aria-hidden="true">
            <span>{String(questionNumber).padStart(2, "0")}</span>
            <i />
          </div>
          <motion.span className="swipe-label swipe-label--no" data-testid="swipe-label-no" style={{ opacity: noOpacity }} aria-hidden="true">
            <CloseIcon /> Нет
          </motion.span>
          <motion.span className="swipe-label swipe-label--yes" data-testid="swipe-label-yes" style={{ opacity: yesOpacity }} aria-hidden="true">
            Да <CheckIcon />
          </motion.span>
          <p className="swipe-question">{question.text}</p>
        </motion.article>
      </div>

      <div className="swipe-controls" role="group" aria-label="Ответ на вопрос">
        <button
          className="swipe-control swipe-control--no"
          type="button"
          onClick={() => answer(false)}
          disabled={Boolean(direction)}
          aria-label="Ответить нет"
        >
          <CloseIcon />
          <span>Нет</span>
        </button>
        <p>{showGestureGuide ? "Потяните карточку" : "Или выберите ответ"}</p>
        <button
          className="swipe-control swipe-control--yes"
          type="button"
          onClick={() => answer(true)}
          disabled={Boolean(direction)}
          aria-label="Ответить да"
        >
          <span>Да</span>
          <CheckIcon />
        </button>
      </div>
    </div>
  );
}
