import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "../components/Icons";
import { homeItemQueue, homeItems, safeHomeItems, type HomeItem, type HomeItemId } from "../data/homeItems";
import { assetUrl } from "../lib/assets";
import type { Animal } from "../types/app";

interface HomeBuilderGameProps {
  animal: Animal;
  onReadyChange: (ready: boolean) => void;
}

type HomeReaction = { item: HomeItem; kind: "placed" | "rejected" } | null;

const FEEDBACK_DURATION_MS = 1_450;

export function HomeBuilderGame({ animal, onReadyChange }: HomeBuilderGameProps) {
  const reduceMotion = useReducedMotion();
  const [placedIds, setPlacedIds] = useState<HomeItemId[]>([]);
  const [rejectedIds, setRejectedIds] = useState<HomeItemId[]>([]);
  const [reaction, setReaction] = useState<HomeReaction>(null);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<number | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const complete = placedIds.length === safeHomeItems.length;
  const petAsset = assetUrl(`assets/day-game/${animal.species}-character.webp`);
  const visibleItems = homeItemQueue
    .filter((id) => !placedIds.includes(id) && !rejectedIds.includes(id))
    .map((id) => homeItems.find((item) => item.id === id))
    .filter((item): item is HomeItem => Boolean(item))
    .slice(0, 4);

  useEffect(() => {
    onReadyChange(false);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [onReadyChange]);

  useEffect(() => {
    if (!complete || window.innerWidth > 1080) return;
    const scrollTimer = window.setTimeout(() => {
      sceneRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }, 140);
    return () => window.clearTimeout(scrollTimer);
  }, [complete, reduceMotion]);

  const chooseItem = (item: HomeItem) => {
    if (locked || placedIds.includes(item.id) || rejectedIds.includes(item.id)) return;

    setLocked(true);
    setReaction({ item, kind: item.safe ? "placed" : "rejected" });

    if (!item.safe) {
      timerRef.current = window.setTimeout(() => {
        setRejectedIds((current) => [...current, item.id]);
        setReaction(null);
        setLocked(false);
      }, FEEDBACK_DURATION_MS);
      return;
    }

    setPlacedIds((current) => [...current, item.id]);
    timerRef.current = window.setTimeout(() => {
      setReaction(null);
      setLocked(false);
      if (placedIds.length + 1 === safeHomeItems.length) onReadyChange(true);
    }, FEEDBACK_DURATION_MS);
  };

  return (
    <section
      className={`home-game${complete ? " home-game--complete" : ""}`}
      data-testid="home-game"
      data-home-phase={complete ? "final" : "building"}
      data-home-placed={placedIds.length}
      data-home-candidates={homeItems.length}
      aria-labelledby="home-game-title"
    >
      <header className="home-game__header">
        <p className="section-number">Направление заботы · 04</p>
        <h1 id="home-game-title">Подготовьте дом к встрече</h1>
        <p>Выберите вещи, с которыми новое пространство станет спокойным и безопасным.</p>
      </header>

      <div className="home-game__board">
        <div ref={sceneRef} className="home-scene" aria-label={`Комната, подготовленная для ${animal.name}`}>
          <img className="home-scene__room" src={assetUrl("assets/home-game/home-room.webp")} alt="" aria-hidden="true" />
          <span className="home-scene__shade" aria-hidden="true" />

          <div className="home-scene__progress" aria-label={`Размещено ${placedIds.length} из ${safeHomeItems.length}`}>
            <span>Дом становится своим</span>
            <strong>{placedIds.length} / {safeHomeItems.length}</strong>
          </div>

          {safeHomeItems.map((item) => {
            const placed = placedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`home-placement home-placement--${item.placement}${placed ? " is-filled" : ""}`}
                data-testid="home-placement"
                data-placement-id={item.placement}
                data-placement-filled={placed}
                aria-hidden={!placed}
              >
                <span className="home-placement__glow" />
                <AnimatePresence>
                  {placed ? (
                    <motion.img
                      src={assetUrl(item.asset)}
                      alt={item.label}
                      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.35, y: reduceMotion ? 0 : -24 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0.12 : 0.55, type: reduceMotion ? "tween" : "spring", stiffness: 260, damping: 20 }}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}

          <AnimatePresence>
            {complete ? (
              <motion.div
                className="home-final"
                data-testid="home-final"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.65 }}
              >
                <motion.img
                  className="home-final__pet"
                  src={petAsset}
                  alt={`${animal.name} в подготовленном доме`}
                  initial={{ opacity: 0, x: reduceMotion ? 0 : 45, y: reduceMotion ? 0 : 15, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  transition={{ delay: reduceMotion ? 0 : 0.15, duration: reduceMotion ? 0.12 : 0.8, type: reduceMotion ? "tween" : "spring" }}
                />
                <motion.div
                  className="home-final__card"
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.45, duration: 0.4 }}
                >
                  <span aria-hidden="true">⌂</span>
                  <div>
                    <p>Будущий дом готов</p>
                    <strong>Дом готов принять {animal.name}</strong>
                    <small>Есть тихое место, вода, безопасное окно и пространство для игры.</small>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {!complete ? (
          <div className="home-box">
            <div className="home-box__heading">
              <div>
                <span>Коробка переезда</span>
                <strong>Что забираем в новый дом?</strong>
              </div>
              <small>Тапните на предмет</small>
            </div>
            <motion.div layout className="home-items" role="list" aria-label="Предметы для будущего дома">
              <AnimatePresence mode="popLayout">
              {visibleItems.map((item) => {
                const placed = placedIds.includes(item.id);
                const active = reaction?.item.id === item.id;
                const rejected = rejectedIds.includes(item.id) || (active && reaction?.kind === "rejected");
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    role="listitem"
                    className={`home-item${placed ? " is-placed" : ""}${rejected ? " is-rejected" : ""}${active ? " is-active" : ""}`}
                    data-testid="home-item"
                    data-item-id={item.id}
                    data-item-safe={item.safe}
                    disabled={placed || rejected || (locked && !active)}
                    onClick={() => chooseItem(item)}
                    aria-label={`${item.label}. ${item.description}`}
                    layout
                    initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.88, y: reduceMotion ? 0 : 12 }}
                    exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.8, y: reduceMotion ? 0 : -12 }}
                    animate={active && !item.safe && !reduceMotion
                      ? { opacity: 1, scale: 1, y: 0, x: [0, -8, 7, -4, 0], rotate: [0, -2, 2, -1, 0] }
                      : { opacity: 1, scale: 1, y: 0 }}
                    whileHover={!locked && !reduceMotion ? { y: -5, scale: 1.02 } : undefined}
                    whileTap={!locked && !reduceMotion ? { scale: 0.96 } : undefined}
                  >
                    <span className="home-item__visual">
                      <img src={assetUrl(item.asset)} alt="" aria-hidden="true" />
                      {placed || rejected ? (
                        <span className={`home-item__mark${rejected ? " home-item__mark--rejected" : ""}`} aria-hidden="true">
                          {rejected ? <CloseIcon /> : <CheckIcon />}
                        </span>
                      ) : null}
                    </span>
                    <strong>{item.shortLabel}</strong>
                    <small>{placed ? "Уже в комнате" : rejected ? "Оставим вне дома" : item.description}</small>
                  </motion.button>
                );
              })}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {reaction ? (
            <motion.div
              key={`${reaction.item.id}-${reaction.kind}`}
              className={`home-feedback home-feedback--${reaction.kind}`}
              data-testid="home-feedback"
              role="status"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: reduceMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            >
              <span>{reaction.kind === "placed" ? <CheckIcon /> : <CloseIcon />}</span>
              <div>
                <strong>{reaction.kind === "placed" ? "Подходит дому" : "Этому здесь не место"}</strong>
                <p>{reaction.item.feedback}</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
