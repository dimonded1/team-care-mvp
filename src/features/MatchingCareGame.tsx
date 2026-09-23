import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { carePairs, type CarePairCardKind } from "../data/carePairs";
import { CheckIcon } from "../components/Icons";
import "./MatchingCareGame.css";
import {
  areMatchingPairCards,
  chooseMatchingAction,
  getMatchingPairCard,
  isMatchingPairsComplete,
  resolveMatchingPairTurn,
  type MatchingPairsState,
} from "../lib/matchingPairs";

const MATCH_CHECK_DELAY_MS = 220;
const MISMATCH_CHECK_DELAY_MS = 700;

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
  const scenarioRef = useRef<HTMLElement>(null);
  currentValueRef.current = value;

  useEffect(() => {
    onReadyChange(complete);
  }, [complete, onReadyChange]);

  useEffect(() => {
    if (value.phase !== "checking") return;
    const [firstCardId, secondCardId] = value.openCardIds;
    const delay = firstCardId && secondCardId && areMatchingPairCards(firstCardId, secondCardId)
      ? MATCH_CHECK_DELAY_MS
      : MISMATCH_CHECK_DELAY_MS;
    const timer = window.setTimeout(() => {
      const next = resolveMatchingPairTurn(currentValueRef.current);
      currentValueRef.current = next;
      onChange(next);
    }, delay);
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

  const cardsByKind = (kind: CarePairCardKind) => value.deck
    .map(getMatchingPairCard)
    .filter((card) => card?.kind === kind);

  const situationCards = cardsByKind("situation");
  const actionCards = cardsByKind("action");
  const openSituationId = value.openCardIds.find((id) => getMatchingPairCard(id)?.kind === "situation");
  const explainedPairId = value.feedback?.kind === "match" ? value.feedback.pairId : null;
  const explainedSituationId = explainedPairId
    ? situationCards.find((card) => card?.pairId === explainedPairId)?.id
    : undefined;
  const activeSituation = situationCards.find((card) => card?.id === openSituationId)
    ?? situationCards.find((card) => card?.id === explainedSituationId)
    ?? situationCards.find((card) => card && !value.matchedPairIds.includes(card.pairId));
  const waitingForContinue = value.feedback?.kind === "match" && !complete;
  const actionChoicesLocked = value.phase === "checking" || waitingForContinue || complete;

  const chooseAction = (actionId: string) => {
    if (!activeSituation || actionChoicesLocked) return;
    const next = chooseMatchingAction(currentValueRef.current, activeSituation.id, actionId);
    if (next === currentValueRef.current) return;
    currentValueRef.current = next;
    onChange(next);
  };

  const continueAfterMatch = () => {
    if (value.feedback?.kind !== "match") return;
    const next = { ...currentValueRef.current, feedback: null };
    currentValueRef.current = next;
    onChange(next);
    window.requestAnimationFrame(() => scenarioRef.current?.focus());
  };

  return (
    <section
      className={`matching-care-game matching-care-game--guided${reduceMotion ? " matching-care-game--reduced-motion" : ""}${complete ? " matching-care-game--complete" : ""}`}
      data-testid="matching-care-game"
      data-matching-phase={value.phase}
      aria-labelledby="matching-care-game-title"
    >
      <header className="matching-care-game__header">
        <p className="section-number">Круг заботы · пары</p>
        <h2 id="matching-care-game-title">Подберите бережный шаг</h2>
        <p>Прочитайте ситуацию и выберите действие, которое поможет животному почувствовать себя спокойнее.</p>
      </header>

      <p className="matching-care-game__progress" aria-live="polite">
        Пар найдено: {value.matchedPairIds.length} из {carePairs.length}
      </p>

      <div className="matching-care-game__guided-board" data-checking={value.phase === "checking"}>
        <section className="matching-care-game__scenario" aria-label="Текущая ситуация">
          <div className="matching-care-game__scenario-label">
            <span aria-hidden="true">?</span>
            <p>{complete ? "Все ситуации пройдены" : `Ситуация ${value.matchedPairIds.length + (waitingForContinue ? 0 : 1)} из ${carePairs.length}`}</p>
          </div>
          {activeSituation ? (
            <article
              ref={scenarioRef}
              tabIndex={-1}
              className={`matching-care-card matching-care-card--situation matching-care-card--scenario${value.phase === "checking" ? " is-selected" : ""}${value.feedback?.kind === "match" ? " is-matched" : ""}`}
              data-testid="matching-care-situation"
              data-card-id={activeSituation.id}
              data-card-kind="situation"
            >
              <span className="matching-care-card__eyebrow" aria-hidden="true"><i />Сигнал животного</span>
              <span className="matching-care-card__copy">{activeSituation.label}</span>
              <span className="matching-care-card__state" aria-hidden="true">
                {value.feedback?.kind === "match" ? <><CheckIcon /> Связь найдена</> : "Выберите бережный шаг ниже"}
              </span>
            </article>
          ) : (
            <p className="matching-care-game__all-done">Все ситуации уже получили бережный ответ.</p>
          )}
        </section>

        <section className="matching-care-game__actions" aria-label="Варианты бережного шага">
          <header>
            <span aria-hidden="true">→</span>
            <div>
              <h3>Как лучше поступить?</h3>
              <p>Выберите один вариант</p>
            </div>
          </header>
          <div className="matching-care-game__action-list">
            {actionCards.map((card, index) => {
              if (!card) return null;
              const matched = value.matchedPairIds.includes(card.pairId);
              const selected = value.openCardIds.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`matching-care-card matching-care-card--action${selected ? " is-selected" : ""}${matched ? " is-matched" : ""}`}
                  data-testid="matching-care-card"
                  data-card-id={card.id}
                  data-card-kind="action"
                  data-selected={selected}
                  data-matched={matched}
                  disabled={matched || actionChoicesLocked}
                  aria-pressed={selected}
                  onClick={() => chooseAction(card.id)}
                >
                  <span className="matching-care-card__eyebrow" aria-hidden="true"><i />Шаг {String.fromCharCode(1040 + index)}</span>
                  <span className="matching-care-card__copy">{card.label}</span>
                  <span className="matching-care-card__state" aria-hidden="true">
                    {matched ? <><CheckIcon /> Найдено</> : selected ? "Проверяем…" : "Выбрать"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {value.feedback ? (
        <div
          className={`matching-care-game__feedback matching-care-game__feedback--${value.feedback.kind}`}
          role="status"
          aria-live="polite"
          ref={feedbackRef}
          tabIndex={-1}
        >
          <strong>{value.feedback.kind === "match" ? "Связь найдена" : "Можно попробовать ещё раз"}</strong>
          <p>{value.feedback.explanation}</p>
          {waitingForContinue ? (
            <button
              className="matching-care-game__continue"
              type="button"
              onClick={continueAfterMatch}
            >
              К следующей ситуации
            </button>
          ) : null}
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
