import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement, type TouchEvent } from "react";
import { getWalkMaze, type WalkDirection, type WalkMaze } from "../data/walkMazes";
import {
  WALK_FRIENDLY_TIME_MS,
  WALK_INPUT_LOCK_MS,
  completeWalkMazeForTime,
  createWalkMazeProgress,
  getWalkCompletionMessage,
  getWalkElapsedMs,
  isWalkInputLocked,
  moveWalkMaze,
  type WalkMazeProgress,
} from "../lib/maze";

export interface WalkMazeGameProps {
  mazeId?: string;
  value: WalkMazeProgress;
  onChange: (value: WalkMazeProgress) => void;
  onReadyChange: (ready: boolean) => void;
}

const directionLabels: Record<WalkDirection, string> = {
  north: "Вверх",
  east: "Вправо",
  south: "Вниз",
  west: "Влево",
};

const keyDirections: Record<string, WalkDirection | undefined> = {
  ArrowUp: "north",
  ArrowRight: "east",
  ArrowDown: "south",
  ArrowLeft: "west",
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

export function WalkMazeGame({ mazeId, value, onChange, onReadyChange }: WalkMazeGameProps) {
  const maze = getWalkMaze(mazeId ?? value.mazeId);
  const lockUntil = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const completionRef = useRef<HTMLParagraphElement>(null);
  const [clockNow, setClockNow] = useState(Date.now);
  const [inputMessage, setInputMessage] = useState("");
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
    setInputMessage(result.collectedBonusId
      ? "Найдена спокойная точка на маршруте."
      : result.completed
        ? "Финиш достигнут."
        : "Шаг выполнен.");
    onChange(result.progress);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const direction = keyDirections[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    const end = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !end) return;
    const x = end.clientX - start.x;
    const y = end.clientY - start.y;
    if (Math.max(Math.abs(x), Math.abs(y)) < 24) return;
    move(Math.abs(x) > Math.abs(y) ? x > 0 ? "east" : "west" : y > 0 ? "south" : "north");
  };

  const collected = new Set(progress.collectedBonusIds);
  const elapsed = getWalkElapsedMs(progress, clockNow);

  return (
    <section className={`walk-maze${completed ? " walk-maze--complete" : ""}`} data-testid="walk-maze" data-maze-id={maze.id} aria-labelledby="walk-maze-title">
      <header className="walk-maze__header">
        <p className="section-number">Направление заботы · прогулка</p>
        <h1 id="walk-maze-title">Пройдите маршрут в темпе питомца</h1>
        <p>Стрелки, клавиши или свайп — один шаг за раз. Найдите спокойные точки на пути.</p>
      </header>

      <div className="walk-maze__board" tabIndex={0} onKeyDown={onKeyDown} onTouchStart={(event) => { const touch = event.touches[0]; if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={onTouchEnd} aria-label="Лабиринт прогулки. Управляйте стрелками">
        <svg viewBox={`0 0 ${maze.width} ${maze.height}`} role="img" aria-label={`Маршрут ${maze.id}`} preserveAspectRatio="xMidYMid meet">
          <MazeWalls maze={maze} />
          <rect className="walk-maze__finish" x={maze.finish.x + 0.22} y={maze.finish.y + 0.22} width="0.56" height="0.56" rx="0.12" />
          <text className="walk-maze__finish-mark" x={maze.finish.x + 0.5} y={maze.finish.y + 0.63} textAnchor="middle" aria-hidden="true">⌂</text>
          {maze.bonuses.map((bonus) => (
            <g key={bonus.id} className={`walk-maze__bonus${collected.has(bonus.id) ? " is-collected" : ""}`}>
              <circle cx={bonus.cell.x + 0.5} cy={bonus.cell.y + 0.5} r="0.16">
                <title>{bonus.label}</title>
              </circle>
              <text x={bonus.cell.x + 0.5} y={bonus.cell.y + 0.59} textAnchor="middle" aria-hidden="true">♥</text>
            </g>
          ))}
          <circle className="walk-maze__player" cx={progress.position.x + 0.5} cy={progress.position.y + 0.5} r="0.23" />
        </svg>
      </div>

      <div className="walk-maze__meta" aria-live="polite">
        <span>Спокойных точек: {progress.collectedBonusIds.length} / {maze.bonuses.length}</span>
        <span>Мягкий ориентир: {Math.max(0, Math.ceil((WALK_FRIENDLY_TIME_MS - elapsed) / 1000))} c</span>
      </div>
      <p className="walk-maze__status" role="status" aria-live="polite">
        {inputMessage || "Выберите направление для первого шага."}
      </p>

      <div className="walk-maze__controls" role="group" aria-label="Управление лабиринтом">
        {(["north", "west", "south", "east"] as const).map((direction) => <button key={direction} type="button" className={`walk-maze__control walk-maze__control--${direction}`} onClick={() => move(direction)} disabled={completed} aria-label={directionLabels[direction]}>{direction === "north" ? "↑" : direction === "south" ? "↓" : direction === "west" ? "←" : "→"}</button>)}
      </div>

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
