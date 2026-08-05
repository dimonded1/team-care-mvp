import { useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { getWalkMaze, type WalkDirection, type WalkMaze } from "../data/walkMazes";
import {
  WALK_FRIENDLY_TIME_MS,
  WALK_INPUT_LOCK_MS,
  completeWalkMazeForTime,
  createWalkMazeProgress,
  getWalkCompletionMessage,
  getWalkDirectionFromVector,
  getWalkElapsedMs,
  getWalkHazardCell,
  isWalkInputLocked,
  isWalkTapGesture,
  moveWalkMaze,
  type WalkMazeProgress,
} from "../lib/maze";

export interface WalkMazeGameProps {
  mazeId?: string;
  value: WalkMazeProgress;
  onChange: (value: WalkMazeProgress) => void;
  onReadyChange: (ready: boolean) => void;
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

function MazeWalls({ maze }: { maze: WalkMaze }) {
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
}

function MazeFloor({ maze }: { maze: WalkMaze }) {
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
}

export function WalkMazeGame({ mazeId, value, onChange, onReadyChange }: WalkMazeGameProps) {
  const maze = getWalkMaze(mazeId ?? value.mazeId);
  const lockUntil = useRef(0);
  const pointerStart = useRef<{
    x: number;
    y: number;
    pointerId: number;
    pointerType: string;
  } | null>(null);
  const completionRef = useRef<HTMLParagraphElement>(null);
  const [clockNow, setClockNow] = useState(Date.now);
  const [inputMessage, setInputMessage] = useState("");
  const [lastDirection, setLastDirection] = useState<WalkDirection>("east");
  const progress = value.mazeId === maze.id ? value : createWalkMazeProgress(maze.id);
  const completed = progress.completedAt !== null;

  useEffect(() => {
    onReadyChange(completed);
  }, [completed, onReadyChange]);

  useEffect(() => {
    if (!completed) return;
    const frame = window.requestAnimationFrame(() => completionRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [completed]);

  useEffect(() => {
    if (progress.startedAt === null || completed) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      const timedProgress = completeWalkMazeForTime(progress, now);
      if (timedProgress !== progress) {
        setInputMessage("Время прогулки подошло к ориентиру. Маршрут можно спокойно завершить.");
        onChange(timedProgress);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [completed, onChange, progress]);

  const move = (direction: WalkDirection) => {
    const now = Date.now();
    if (isWalkInputLocked(lockUntil.current, now)) {
      setInputMessage("Один шаг уже выполняется.");
      return;
    }
    const result = moveWalkMaze(maze, progress, direction, now);
    if (!result.moved) {
      setInputMessage(result.blocked === "bounds"
        ? "Дальше граница поля."
        : "Здесь стена — попробуйте другой поворот.");
      return;
    }
    lockUntil.current = now + WALK_INPUT_LOCK_MS;
    setLastDirection(direction);
    setInputMessage(result.hazardEncountered
      ? "Клещ замечен вовремя и ушёл с маршрута. Все находки сохранены."
      : result.collectedBonusId
        ? "Точка заботы собрана. Выберите следующий маршрут."
        : result.completed
        ? "Финиш достигнут."
          : result.reachedFinish
            ? "Станция рядом — сначала соберите оставшиеся точки заботы."
            : "Шаг выполнен.");
    onChange(result.progress);
  };

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
    if (!isWalkTapGesture(deltaX, deltaY)) {
      setInputMessage("Не смахивайте: просто коснитесь пути сверху, снизу, слева или справа от героя.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const targetX = ((event.clientX - rect.left) / rect.width) * maze.width;
    const targetY = ((event.clientY - rect.top) / rect.height) * maze.height;
    const x = targetX - (progress.position.x + 0.5);
    const y = targetY - (progress.position.y + 0.5);
    const tapDirection = getWalkDirectionFromVector(x, y, 0.35);
    if (!tapDirection) {
      setInputMessage("Коснитесь пути сверху, снизу, слева или справа от героя.");
      return;
    }
    move(tapDirection);
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
  });

  const collected = new Set(progress.collectedBonusIds);
  const allCollected = collected.size === maze.bonuses.length;
  const hazard = getWalkHazardCell(maze, progress);
  const hazardDistance = Math.abs(hazard.x - progress.position.x) + Math.abs(hazard.y - progress.position.y);
  const elapsed = getWalkElapsedMs(progress, clockNow);

  return (
    <section className={`walk-maze${completed ? " walk-maze--complete" : ""}`} data-testid="walk-maze" data-maze-id={maze.id} aria-labelledby="walk-maze-title">
      <header className="walk-maze__header">
        <p className="section-number">Направление заботы · прогулка</p>
        <h1 id="walk-maze-title">Соберите маршрут заботы</h1>
        <p>Исследуйте развилки, соберите все точки и возвращайтесь на станцию. На телефоне касайтесь пути вокруг героя, на компьютере используйте стрелки.</p>
      </header>

      <div
        className="walk-maze__board"
        data-danger={hazardDistance <= 2 && !completed ? "near" : "calm"}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        aria-label="Игровой маршрут. На телефоне касайтесь пути вокруг героя, на компьютере используйте стрелки"
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
      </div>

      <div className="walk-maze__meta" aria-live="polite">
        <span>Точек заботы: {progress.collectedBonusIds.length} / {maze.bonuses.length}</span>
        <span>Мягкий ориентир: {Math.max(0, Math.ceil((WALK_FRIENDLY_TIME_MS - elapsed) / 1000))} c</span>
      </div>
      <p className="walk-maze__status" role="status" aria-live="polite">
        {inputMessage || "Коснитесь пути сверху, снизу, слева или справа от героя."}
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
