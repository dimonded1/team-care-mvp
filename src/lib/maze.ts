import { getWalkCell, getWalkMaze, getWalkNeighbour, isWalkCellInBounds, type WalkCell, type WalkDirection, type WalkMaze } from "../data/walkMazes";

export const WALK_INPUT_LOCK_MS = 170;
export const WALK_FRIENDLY_TIME_MS = 45_000;

export function isWalkInputLocked(lockUntil: number, now: number): boolean {
  return now < lockUntil;
}

export interface WalkMazeProgress {
  mazeId: string;
  position: WalkCell;
  collectedBonusIds: string[];
  hazardIndex: number;
  hazardEncounters: number;
  elapsedMs: number;
  startedAt: number | null;
  completedAt: number | null;
}

export type WalkMoveResult = {
  progress: WalkMazeProgress;
  moved: boolean;
  blocked: "wall" | "bounds" | "complete" | null;
  collectedBonusId: string | null;
  hazardEncountered: boolean;
  reachedFinish: boolean;
  completed: boolean;
};

export function createWalkMazeProgress(mazeId: string): WalkMazeProgress {
  const maze = getWalkMaze(mazeId);
  return {
    mazeId: maze.id,
    position: { ...maze.start },
    collectedBonusIds: [],
    hazardIndex: 0,
    hazardEncounters: 0,
    elapsedMs: 0,
    startedAt: null,
    completedAt: null,
  };
}

export function restoreWalkMazeProgress(value: unknown, mazeId: string): WalkMazeProgress {
  const fallback = createWalkMazeProgress(mazeId);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = value as Partial<WalkMazeProgress>;
  const maze = getWalkMaze(candidate.mazeId === mazeId ? candidate.mazeId : mazeId);
  const position = candidate.position;
  if (!position || typeof position.x !== "number" || typeof position.y !== "number"
    || !Number.isInteger(position.x) || !Number.isInteger(position.y)
    || !isWalkCellInBounds(maze, position)) return fallback;
  const validBonusIds = new Set(maze.bonuses.map((bonus) => bonus.id));
  const collectedBonusIds = Array.isArray(candidate.collectedBonusIds)
    ? [...new Set(candidate.collectedBonusIds.filter((id): id is string =>
      typeof id === "string" && validBonusIds.has(id)))]
    : [];
  const elapsedMs = typeof candidate.elapsedMs === "number" && Number.isFinite(candidate.elapsedMs)
    ? Math.max(0, candidate.elapsedMs)
    : 0;
  const startedAt = typeof candidate.startedAt === "number" && Number.isFinite(candidate.startedAt)
    ? candidate.startedAt
    : null;
  const completedAt = typeof candidate.completedAt === "number" && Number.isFinite(candidate.completedAt)
    ? candidate.completedAt
    : null;
  const hazardIndex = typeof candidate.hazardIndex === "number" && Number.isInteger(candidate.hazardIndex)
    ? Math.max(0, Math.min(candidate.hazardIndex, maze.hazardRoute.length - 1))
    : 0;
  const hazardEncounters = typeof candidate.hazardEncounters === "number"
    && Number.isInteger(candidate.hazardEncounters)
    ? Math.max(0, candidate.hazardEncounters)
    : 0;
  return {
    mazeId: maze.id,
    position: { x: position.x, y: position.y },
    collectedBonusIds,
    hazardIndex,
    hazardEncounters,
    elapsedMs,
    startedAt: completedAt === null ? startedAt : null,
    completedAt,
  };
}

export function getWalkElapsedMs(progress: WalkMazeProgress, now: number): number {
  return progress.startedAt === null || progress.completedAt !== null ? progress.elapsedMs : progress.elapsedMs + Math.max(0, now - progress.startedAt);
}

export function completeWalkMazeForTime(
  progress: WalkMazeProgress,
  now: number,
): WalkMazeProgress {
  const elapsedMs = getWalkElapsedMs(progress, now);
  if (progress.completedAt !== null || progress.startedAt === null || elapsedMs < WALK_FRIENDLY_TIME_MS) {
    return progress;
  }
  return {
    ...progress,
    elapsedMs,
    startedAt: null,
    completedAt: now,
  };
}

export function moveWalkMaze(maze: WalkMaze, progress: WalkMazeProgress, direction: WalkDirection, now: number): WalkMoveResult {
  if (progress.completedAt !== null) {
    return {
      progress,
      moved: false,
      blocked: "complete",
      collectedBonusId: null,
      hazardEncountered: false,
      reachedFinish: false,
      completed: true,
    };
  }
  const walls = getWalkCell(maze, progress.position);
  if (!walls || walls[direction]) {
    return {
      progress,
      moved: false,
      blocked: "wall",
      collectedBonusId: null,
      hazardEncountered: false,
      reachedFinish: false,
      completed: false,
    };
  }
  const position = getWalkNeighbour(progress.position, direction);
  if (!getWalkCell(maze, position)) {
    return {
      progress,
      moved: false,
      blocked: "bounds",
      collectedBonusId: null,
      hazardEncountered: false,
      reachedFinish: false,
      completed: false,
    };
  }

  const startedAt = progress.startedAt ?? now;
  const elapsedMs = progress.elapsedMs + (progress.startedAt === null ? 0 : Math.max(0, now - progress.startedAt));
  const bonus = maze.bonuses.find((item) => item.cell.x === position.x && item.cell.y === position.y && !progress.collectedBonusIds.includes(item.id));
  const collectedBonusIds = bonus
    ? [...progress.collectedBonusIds, bonus.id]
    : progress.collectedBonusIds;
  const nextHazardIndex = (progress.hazardIndex + 1) % maze.hazardRoute.length;
  const currentHazard = maze.hazardRoute[progress.hazardIndex];
  const nextHazard = maze.hazardRoute[nextHazardIndex];
  const hazardEncountered = Boolean(
    nextHazard
    && (
      (position.x === nextHazard.x && position.y === nextHazard.y)
      || (
        currentHazard
        && position.x === currentHazard.x
        && position.y === currentHazard.y
        && progress.position.x === nextHazard.x
        && progress.position.y === nextHazard.y
      )
    ),
  );
  const safeHazardIndex = hazardEncountered
    ? Math.max(0, maze.hazardRoute.findIndex((cell) =>
      cell.x !== position.x || cell.y !== position.y))
    : nextHazardIndex;
  const reachedFinish = position.x === maze.finish.x && position.y === maze.finish.y;
  const completed = reachedFinish && collectedBonusIds.length === maze.bonuses.length;
  const next: WalkMazeProgress = {
    ...progress,
    position,
    collectedBonusIds,
    hazardIndex: safeHazardIndex,
    hazardEncounters: progress.hazardEncounters + (hazardEncountered ? 1 : 0),
    elapsedMs,
    startedAt: completed ? null : now,
    completedAt: completed ? now : null,
  };
  return {
    progress: next,
    moved: true,
    blocked: null,
    collectedBonusId: bonus?.id ?? null,
    hazardEncountered,
    reachedFinish,
    completed,
  };
}

export function getWalkHazardCell(maze: WalkMaze, progress: WalkMazeProgress): WalkCell {
  return maze.hazardRoute[progress.hazardIndex] ?? maze.hazardRoute[0] ?? maze.start;
}

export function getWalkCompletionMessage(progress: WalkMazeProgress): string {
  return progress.elapsedMs <= WALK_FRIENDLY_TIME_MS
    ? "Спокойная прогулка пройдена — вы нашли бережный темп."
    : "Маршрут пройден. Главное — идти в темпе, который подходит питомцу.";
}
