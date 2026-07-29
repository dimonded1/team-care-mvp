import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { carePairs } from "../data/carePairs";
import {
  getMatchingPairCard,
  isMatchingPairsComplete,
  resolveMatchingPairTurn,
  selectMatchingPairCard,
  type MatchingPairsState,
} from "../lib/matchingPairs";

const MISMATCH_CLOSE_DELAY_MS = 700;

export interface MatchingCareGameProps {
  value: MatchingPairsState;
  onChange: (nextValue: MatchingPairsState) => void;
  onReadyChange: (ready: boolean) => void;
}

export function MatchingCareGame({ value, onChange, onReadyChange }: MatchingCareGameProps) {
  const reduceMotion = useReducedMotion();
  const complete = isMatchingPairsComplete(value);
  const currentValueRef = useRef(value);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef<HTMLParagraphElement>(null);
  currentValueRef.current = value;

  useEffect(() => {
    onReadyChange(complete);
  }, [complete, onReadyChange]);

  useEffect(() => {
    if (value.phase !== "checking") return;
    const timer = window.setTimeout(() => {
      const next = resolveMatchingPairTurn(currentValueRef.current);
      currentValueRef.current = next;
      onChange(next);
    }, MISMATCH_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [onChange, value]);

  useEffect(() => {
    if (!value.feedback) return;
    const frame = window.requestAnimationFrame(() => feedbackRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [value.feedback]);

  useEffect(() => {
    if (!complete) return;
    const frame = window.requestAnimationFrame(() => completeRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [complete]);

  const selectCard = (cardId: string) => {
    const next = selectMatchingPairCard(currentValueRef.current, cardId);
    if (next === currentValueRef.current) return;
    currentValueRef.current = next;
    onChange(next);
  };

  return (
    <section
      className={`matching-care-game${reduceMotion ? " matching-care-game--reduced-motion" : ""}${complete ? " matching-care-game--complete" : ""}`}
      data-testid="matching-care-game"
      data-matching-phase={value.phase}
      aria-labelledby="matching-care-game-title"
    >
      <header className="matching-care-game__header">
        <p className="section-number">Круг заботы · пары</p>
        <h2 id="matching-care-game-title">Соедините ситуацию и бережный шаг</h2>
        <p>Все истории — о животных в приюте. Откройте две карточки, чтобы найти подходящую пару.</p>
      </header>

      <p className="matching-care-game__progress" aria-live="polite">
        Пар найдено: {value.matchedPairIds.length} из {carePairs.length}
      </p>

      <div className="matching-care-game__grid" aria-label="Карточки ситуаций и действий">
        {value.deck.map((cardId) => {
          const card = getMatchingPairCard(cardId);
          if (!card) return null;
          const matched = value.matchedPairIds.includes(card.pairId);
          const open = matched || value.openCardIds.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`matching-care-card matching-care-card--${card.kind}${open ? " is-flipped" : ""}${matched ? " is-matched" : ""}${value.phase === "checking" && open && !matched ? " is-checking" : ""}`}
              data-testid="matching-care-card"
              data-card-id={card.id}
              data-card-kind={card.kind}
              data-flipped={open}
              data-matched={matched}
              disabled={matched || value.phase === "checking" || value.openCardIds.length >= 2}
              aria-pressed={open}
              aria-label={open ? card.label : card.kind === "situation" ? "Открыть ситуацию" : "Открыть бережный шаг"}
              onClick={() => selectCard(card.id)}
            >
              <span className="matching-care-card__inner">
                <span className="matching-care-card__front" aria-hidden={open}>
                  {card.kind === "situation" ? "Ситуация" : "Бережный шаг"}
                </span>
                <span className="matching-care-card__back" aria-hidden={!open}>
                  <strong>{card.kind === "situation" ? "Ситуация" : "Бережный шаг"}</strong>
                  <span>{card.label}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {value.feedback ? (
        <div
          className={`matching-care-game__feedback matching-care-game__feedback--${value.feedback.kind}`}
          role="status"
          aria-live="polite"
          ref={feedbackRef}
          tabIndex={-1}
        >
          <strong>{value.feedback.kind === "match" ? "Пара нашлась" : "Можно спокойно свериться ещё раз"}</strong>
          <p>{value.feedback.explanation}</p>
        </div>
      ) : null}

      {complete ? (
        <p
          className="matching-care-game__complete"
          role="status"
          ref={completeRef}
          tabIndex={-1}
        >
          Все пары собраны. Внимательное наблюдение и спокойный темп помогают животным в приюте.
        </p>
      ) : null}
    </section>
  );
}
