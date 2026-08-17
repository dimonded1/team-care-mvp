import { memo, useCallback, useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { getWalkMaze, type WalkDirection, type WalkMaze } from "../data/walkMazes";
import {
  WALK_FRIENDLY_TIME_MS,
  WALK_INPUT_LOCK_MS,
  WALK_SWIPE_MIN_DISTANCE_PX,
  completeWalkMazeForTime,
  createWalkMazeProgress,
  getWalkCompletionMessage,
  getWalkDirectionFromVector,
  getWalkElapsedMs,
  getWalkHazardCell,
  isWalkInputLocked,
  moveWalkMaze,
  type WalkMazeProgress,
} from "../lib/maze";

export interface WalkMazeGameProps {
  mazeId?: string;
  value: WalkMazeProgress;
  onChange: (value: WalkMazeProgress) => void;
  onReadyChange: (ready: boolean) => void;
  stationLabel?: string;
}

const keyDirections: Record<string, WalkDirection | undefined> = {
  ArrowUp: "north",
  ArrowRight: "east",
  ArrowDown: "south",
  ArrowLeft: "west",
};

const bonusMarks: Record<string, string> = {
  "миска": "●",
  "сердечко": "♥",
  "игрушка": "★",
  "тихая точка": "✦",
  "вода": "◆",
};

const MazeWalls = memo(function MazeWalls({ maze }: { maze: WalkMaze }) {
  const lines: ReactElement[] = [];
  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      const walls = maze.cells[y][x];
      if (walls.north) lines.push(<line key={`n-${x}-${y}`} x1={x} y1={y} x2={x + 1} y2={y} />);
      if (walls.west) lines.push(<line key={`w-${x}-${y}`} x1={x} y1={y} x2={x} y2={y + 1} />);
      if (y === maze.height - 1 && walls.south) lines.push(<line key={`s-${x}-${y}`} x1={x} y1={y + 1} x2={x + 1} y2={y + 1} />);
      if (x === maze.width - 1 && walls.east) lines.push(<line key={`e-${x}-${y}`} x1={x + 1} y1={y} x2={x + 1} y2={y + 1} />);
    }
  }
  return <g className="walk-maze__walls" fill="none">{lines}</g>;
});

const MazeFloor = memo(function MazeFloor({ maze }: { maze: WalkMaze }) {
  const cells: ReactElement[] = [];
  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      if (Object.values(maze.cells[y][x]).every(Boolean)) continue;
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x + 0.08}
          y={y + 0.08}
          width="0.84"
          height="0.84"
          rx="0.14"
        />,
      );
    }
  }
  return <g className="walk-maze__floor">{cells}</g>;
});

interface WalkMazeClockProps {
  progressRef: { current: WalkMazeProgress };
  running: boolean;
  runKey: string;
  onExpire: (now: number) => void;
}

const WalkMazeClock = memo(function WalkMazeClock({
  progressRef,
  running,
  runKey,
  onExpire,
}: WalkMazeClockProps) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!running) {
      setNow(Date.now());
      return;
    }
    let active = true;
    const checkClock = () => {
      if (!active) return;
      const current = Date.now();
      if (getWalkElapsedMs(progressRef.current, current) >= WALK_FRIENDLY_TIME_MS) {
        active = false;
        onExpire(current);
        return;
      }
      setNow(current);
    };
    const interval = window.setInterval(checkClock, 1_000);
    const remaining = Math.max(
      0,
      WALK_FRIENDLY_TIME_MS - getWalkElapsedMs(progressRef.current, Date.now()),
    );
    const expiration = window.setTimeout(checkClock, remaining + 25);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(expiration);
    };
  }, [onExpire, progressRef, runKey, running]);

  const elapsed = getWalkElapsedMs(progressRef.current, now);
  return (
    <span>
      Мягкий ориентир: {Math.max(0, Math.ceil((WALK_FRIENDLY_TIME_MS - elapsed) / 1000))} c
    </span>
  );
});

export function WalkMazeGame({
  mazeId,
  value,
  onChange,
  onReadyChange,
  stationLabel,
}: WalkMazeGameProps) {
  const maze = getWalkMaze(mazeId ?? value.mazeId);
  const boardRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const pointerStart = useRef<{
    x: number;
    y: number;
    pointerId: number;
    pointerType: string;
  } | null>(null);
  const completionRef = useRef<HTMLParagraphElement>(null);
  const persistTimerRef = useRef<number | null>(null);
  const pendingProgressRef = useRef<WalkMazeProgress | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [biteNoticeKey, setBiteNoticeKey] = useState(0);
  const [lastDirection, setLastDirection] = useState<WalkDirection>("east");
  const [progress, setProgress] = useState<WalkMazeProgress>(() =>
    value.mazeId === maze.id ? value : createWalkMazeProgress(maze.id));
  const progressRef = useRef(progress);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const completed = progress.completedAt !== null;

  useEffect(() => {
    if (progressRef.current.mazeId === maze.id) return;
    const next = value.mazeId === maze.id ? value : createWalkMazeProgress(maze.id);
    progressRef.current = next;
    setProgress(next);
  }, [maze.id, value]);

  const flushPendingProgress = useCallback(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const pending = pendingProgressRef.current;
    if (!pending) return;
    pendingProgressRef.current = null;
    onChangeRef.current(pending);
  }, []);

  const publishProgress = useCallback((next: WalkMazeProgress, urgent = false) => {
    progressRef.current = next;
    setProgress(next);
    pendingProgressRef.current = next;
    if (urgent) {
      flushPendingProgress();
      return;
    }
    if (persistTimerRef.current === null) {
      persistTimerRef.current = window.setTimeout(flushPendingProgress, 420);
    }
  }, [flushPendingProgress]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushPendingProgress();
    };
    window.addEventListener("pagehide", flushPendingProgress);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushPendingProgress);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flushPendingProgress();
    };
  }, [flushPendingProgress]);

  useEffect(() => {
    onReadyChange(completed);
  }, [completed, onReadyChange]);

  useEffect(() => {
    if (!completed) return;
    const frame = window.requestAnimationFrame(() => completionRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [completed]);

  const handleTimeExpired = useCallback((now: number) => {
    const current = progressRef.current;
    const timedProgress = completeWalkMazeForTime(current, now);
    if (timedProgress === current) return;
    progressRef.current = timedProgress;
    setInputMessage("Время прогулки подошло к ориентиру. Маршрут можно спокойно завершить.");
    publishProgress(timedProgress, true);
  }, [publishProgress]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const preventBrowserGesture = (event: TouchEvent) => {
      if (event.touches.length === 1) event.preventDefault();
    };
    board.addEventListener("touchstart", preventBrowserGesture, { passive: false });
    board.addEventListener("touchmove", preventBrowserGesture, { passive: false });
    return () => {
      board.removeEventListener("touchstart", preventBrowserGesture);
      board.removeEventListener("touchmove", preventBrowserGesture);
    };
  }, []);

  const move = useCallback((direction: WalkDirection) => {
    const now = Date.now();
    if (isWalkInputLocked(lockUntil.current, now)) {
      setInputMessage("Один шаг уже выполняется.");
      return;
    }
    const result = moveWalkMaze(maze, progressRef.current, direction, now);
    if (!result.moved) {
      setInputMessage(result.blocked === "complete"
        ? "Маршрут уже завершён — сохраните круг заботы."
        : result.blocked === "bounds"
          ? "Дальше граница поля."
          : "Здесь стена — попробуйте другой поворот.");
      return;
    }
    lockUntil.current = now + WALK_INPUT_LOCK_MS;
    setLastDirection(direction);
    if (result.hazardEncountered) setBiteNoticeKey((current) => current + 1);
    setInputMessage(result.hazardEncountered
      ? "Клещ укусил — маршрут начинается заново. Соберите точки ещё раз."
      : result.collectedBonusId
        ? "Точка заботы собрана. Выберите следующий маршрут."
        : result.completed
        ? "Финиш достигнут."
          : result.reachedFinish
            ? "Станция рядом — сначала соберите оставшиеся точки заботы."
            : "Шаг выполнен.");
    publishProgress(
      result.progress,
      Boolean(result.collectedBonusId || result.hazardEncountered || result.completed),
    );
  }, [maze, publishProgress]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded iOS browsers may already own the pointer; tap handling remains safe.
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current?.pointerId === event.pointerId) event.preventDefault();
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current?.pointerId !== event.pointerId) return;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.pointerType === "mouse" || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const swipeDirection = getWalkDirectionFromVector(
      deltaX,
      deltaY,
      WALK_SWIPE_MIN_DISTANCE_PX,
    );
    if (!swipeDirection) {
      setInputMessage("Смахните по полю в сторону следующего шага.");
      return;
    }
    move(swipeDirection);
  };

  useEffect(() => {
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, a")) return;
      const direction = keyDirections[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [move]);

  const collected = new Set(progress.collectedBonusIds);
  const allCollected = collected.size === maze.bonuses.length;
  const hazard = getWalkHazardCell(maze, progress);
  const hazardDistance = Math.abs(hazard.x - progress.position.x) + Math.abs(hazard.y - progress.position.y);

  return (
    <section className={`walk-maze${completed ? " walk-maze--complete" : ""}`} data-testid="walk-maze" data-maze-id={maze.id} aria-labelledby="walk-maze-title">
      <header className="walk-maze__header">
        <p className="section-number">{stationLabel ?? "Направление заботы · прогулка"}</p>
        <h1 id="walk-maze-title">Соберите маршрут заботы</h1>
        <p>Исследуйте развилки, соберите все точки и возвращайтесь на станцию. На телефоне смахивайте по полю, на компьютере используйте стрелки.</p>
      </header>

      <div
        ref={boardRef}
        className="walk-maze__board"
        data-danger={hazardDistance <= 2 && !completed ? "near" : "calm"}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        aria-label="Игровой маршрут. На телефоне смахивайте по полю, на компьютере используйте стрелки"
      >
        <svg viewBox={`0 0 ${maze.width} ${maze.height}`} role="img" aria-label={`Маршрут ${maze.id}`} preserveAspectRatio="xMidYMid meet">
          <MazeFloor maze={maze} />
          <MazeWalls maze={maze} />
          <rect className={`walk-maze__finish${allCollected ? " is-ready" : ""}`} x={maze.finish.x + 0.22} y={maze.finish.y + 0.22} width="0.56" height="0.56" rx="0.12" />
          <text className="walk-maze__finish-mark" x={maze.finish.x + 0.5} y={maze.finish.y + 0.63} textAnchor="middle" aria-hidden="true">⌂</text>
          {maze.bonuses.map((bonus) => (
            <g key={bonus.id} className={`walk-maze__bonus${collected.has(bonus.id) ? " is-collected" : ""}`}>
              <circle cx={bonus.cell.x + 0.5} cy={bonus.cell.y + 0.5} r="0.16">
                <title>{bonus.label}</title>
              </circle>
              <text x={bonus.cell.x + 0.5} y={bonus.cell.y + 0.59} textAnchor="middle" aria-hidden="true">{bonusMarks[bonus.label] ?? "•"}</text>
            </g>
          ))}
          {!completed ? (
            <g className="walk-maze__hazard" data-testid="walk-maze-hazard">
              <circle cx={hazard.x + 0.5} cy={hazard.y + 0.5} r="0.2">
                <title>Клещ на маршруте</title>
              </circle>
              <text x={hazard.x + 0.5} y={hazard.y + 0.59} textAnchor="middle" aria-hidden="true">×</text>
            </g>
          ) : null}
          <circle
            className="walk-maze__player"
            data-direction={lastDirection}
            cx={progress.position.x + 0.5}
            cy={progress.position.y + 0.5}
            r="0.29"
          />
        </svg>
        {biteNoticeKey > 0 ? (
          <span key={biteNoticeKey} className="walk-maze__bite" aria-hidden="true">
            Клещ укусил! Начинаем заново
          </span>
        ) : null}
      </div>

      <div className="walk-maze__meta" aria-live="polite">
        <span>Точек заботы: {progress.collectedBonusIds.length} / {maze.bonuses.length}</span>
        <WalkMazeClock
          progressRef={progressRef}
          running={progress.startedAt !== null && progress.completedAt === null}
          runKey={`${progress.mazeId}:${progress.hazardEncounters}`}
          onExpire={handleTimeExpired}
        />
      </div>
      <p className="walk-maze__status" role="status" aria-live="polite">
        {inputMessage || "Смахните по полю в сторону следующего шага."}
      </p>

      {completed ? (
        <p
          className="walk-maze__completion"
          role="status"
          ref={completionRef}
          tabIndex={-1}
        >
          {getWalkCompletionMessage(progress)}
        </p>
      ) : null}
    </section>
  );
}
