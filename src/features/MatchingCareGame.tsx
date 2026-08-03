import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { carePairs, type CarePairCardKind } from "../data/carePairs";
import { CheckIcon } from "../components/Icons";
import {
  getMatchingPairCard,
  isMatchingPairsComplete,
  resolveMatchingPairTurn,
  selectMatchingPairCard,
  type MatchingPairsState,
} from "../lib/matchingPairs";

const PAIR_CHECK_DELAY_MS = 220;

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
    }, PAIR_CHECK_DELAY_MS);
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

  const cardsByKind = (kind: CarePairCardKind) => value.deck
    .map(getMatchingPairCard)
    .filter((card) => card?.kind === kind);

  const renderColumn = (
    kind: CarePairCardKind,
    title: string,
    hint: string,
  ) => (
    <section className={`matching-care-game__column matching-care-game__column--${kind}`}>
      <header>
        <span aria-hidden="true">{kind === "situation" ? "?" : "→"}</span>
        <div>
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>
      </header>
      <div className="matching-care-game__cards">
        {cardsByKind(kind).map((card, index) => {
          if (!card) return null;
          const matched = value.matchedPairIds.includes(card.pairId);
          const selected = value.openCardIds.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={`matching-care-card matching-care-card--${card.kind}${selected ? " is-selected" : ""}${matched ? " is-matched" : ""}`}
              data-testid="matching-care-card"
              data-card-id={card.id}
              data-card-kind={card.kind}
              data-selected={selected}
              data-matched={matched}
              disabled={matched || value.phase === "checking"}
              aria-pressed={selected}
              onClick={() => selectCard(card.id)}
            >
              <span className="matching-care-card__eyebrow" aria-hidden="true">
                <i />
                {kind === "situation"
                  ? `Сигнал ${String(index + 1).padStart(2, "0")}`
                  : `Шаг ${String.fromCharCode(1040 + index)}`}
              </span>
              <span className="matching-care-card__copy">{card.label}</span>
              <span className="matching-care-card__state" aria-hidden="true">
                {matched ? <CheckIcon /> : selected ? "Выбрано" : kind === "situation" ? "Выбрать" : "Связать"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

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
        <p>Прочитайте сигнал животного, выберите его карточку, а затем найдите бережный ответ справа.</p>
      </header>

      <p className="matching-care-game__progress" aria-live="polite">
        Пар найдено: {value.matchedPairIds.length} из {carePairs.length}
      </p>

      <div
        className="matching-care-game__board"
        aria-label="Сопоставление ситуаций и бережных шагов"
        data-checking={value.phase === "checking"}
      >
        {renderColumn("situation", "Ситуация", "Что происходит")}
        <div className="matching-care-game__link" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>
        {renderColumn("action", "Бережный шаг", "Что поможет")}
      </div>

      {value.feedback ? (
        <div
          className={`matching-care-game__feedback matching-care-game__feedback--${value.feedback.kind}`}
          role="status"
          aria-live="polite"
          ref={feedbackRef}
          tabIndex={-1}
        >
          <strong>{value.feedback.kind === "match" ? "Связь найдена" : "Попробуйте другую связь"}</strong>
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
