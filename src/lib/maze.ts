import { getWalkCell, getWalkMaze, getWalkNeighbour, isWalkCellInBounds, type WalkCell, type WalkDirection, type WalkMaze } from "../data/walkMazes";
import { createShuffleSeed } from "./shuffle";

export const WALK_INPUT_LOCK_MS = 170;
export const WALK_FRIENDLY_TIME_MS = 45_000;
export const WALK_SWIPE_MIN_DISTANCE_PX = 24;

export function isWalkInputLocked(lockUntil: number, now: number): boolean {
  return now < lockUntil;
}

export function getWalkDirectionFromVector(
  x: number,
  y: number,
  minimumDistance = 0,
): WalkDirection | null {
  if (Math.max(Math.abs(x), Math.abs(y)) < minimumDistance) return null;
  return Math.abs(x) > Math.abs(y)
    ? x > 0 ? "east" : "west"
    : y > 0 ? "south" : "north";
}

export interface WalkMazeProgress {
  mazeId: string;
  position: WalkCell;
  collectedBonusIds: string[];
  hazardPosition: WalkCell;
  hazardPreviousPosition: WalkCell | null;
  hazardStep: number;
  hazardSeed: string;
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

const walkDirections: readonly WalkDirection[] = ["north", "east", "south", "west"];

function sameCell(left: WalkCell, right: WalkCell) {
  return left.x === right.x && left.y === right.y;
}

function cellDistance(left: WalkCell, right: WalkCell) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function seededFraction(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += 0x6d2b79f5;
  let value = hash;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function openNeighbours(maze: WalkMaze, cell: WalkCell): WalkCell[] {
  const walls = getWalkCell(maze, cell);
  if (!walls) return [];
  return walkDirections
    .filter((direction) => !walls[direction])
    .map((direction) => getWalkNeighbour(cell, direction))
    .filter((neighbour) => isWalkCellInBounds(maze, neighbour) && Boolean(getWalkCell(maze, neighbour)));
}

function getInitialWalkHazardCell(maze: WalkMaze): WalkCell {
  const distanceByCell = new Map<string, number>();
  const queue: Array<{ cell: WalkCell; distance: number }> = [
    { cell: maze.start, distance: 0 },
  ];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.cell.x},${current.cell.y}`;
    if (distanceByCell.has(key)) continue;
    distanceByCell.set(key, current.distance);
    for (const neighbour of openNeighbours(maze, current.cell)) {
      queue.push({ cell: neighbour, distance: current.distance + 1 });
    }
  }
  return maze.hazardRoute.reduce((farthest, cell) => {
    const farthestDistance = distanceByCell.get(`${farthest.x},${farthest.y}`) ?? -1;
    const cellPathDistance = distanceByCell.get(`${cell.x},${cell.y}`) ?? -1;
    return cellPathDistance > farthestDistance ? cell : farthest;
  }, maze.finish);
}

export function getNextWalkHazardCell(
  maze: WalkMaze,
  progress: WalkMazeProgress,
  playerTarget: WalkCell,
): WalkCell {
  const neighbours = openNeighbours(maze, progress.hazardPosition);
  if (neighbours.length === 0) return progress.hazardPosition;
  const forward = progress.hazardPreviousPosition && neighbours.length > 1
    ? neighbours.filter((cell) => !sameCell(cell, progress.hazardPreviousPosition!))
    : neighbours;
  const candidates = forward.length > 0 ? forward : neighbours;
  const decision = seededFraction(`${progress.hazardSeed}:${progress.hazardStep}:mode`);
  const shouldApproach = cellDistance(progress.hazardPosition, playerTarget) <= 6 && decision < 0.44;
  const ordered = shouldApproach
    ? [...candidates].sort((left, right) => cellDistance(left, playerTarget) - cellDistance(right, playerTarget))
    : candidates;
  const bestDistance = shouldApproach ? cellDistance(ordered[0], playerTarget) : null;
  const pool = bestDistance === null
    ? ordered
    : ordered.filter((cell) => cellDistance(cell, playerTarget) === bestDistance);
  const choice = Math.floor(seededFraction(`${progress.hazardSeed}:${progress.hazardStep}:turn`) * pool.length);
  return pool[choice] ?? pool[0] ?? progress.hazardPosition;
}

export function createWalkMazeProgress(mazeId: string, hazardSeed = createShuffleSeed()): WalkMazeProgress {
  const maze = getWalkMaze(mazeId);
  return {
    mazeId: maze.id,
    position: { ...maze.start },
    collectedBonusIds: [],
    hazardPosition: { ...getInitialWalkHazardCell(maze) },
    hazardPreviousPosition: null,
    hazardStep: 0,
    hazardSeed,
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
  const legacyHazardIndex = typeof (candidate as { hazardIndex?: unknown }).hazardIndex === "number"
    && Number.isInteger((candidate as { hazardIndex: number }).hazardIndex)
      ? Math.max(0, Math.min((candidate as { hazardIndex: number }).hazardIndex, maze.hazardRoute.length - 1))
      : 0;
  const rawHazardPosition = candidate.hazardPosition;
  const restoredHazardPosition = rawHazardPosition
    && typeof rawHazardPosition.x === "number"
    && typeof rawHazardPosition.y === "number"
    && Number.isInteger(rawHazardPosition.x)
    && Number.isInteger(rawHazardPosition.y)
    && isWalkCellInBounds(maze, rawHazardPosition)
      ? { x: rawHazardPosition.x, y: rawHazardPosition.y }
      : legacyHazardIndex > 0
        ? { ...(maze.hazardRoute[legacyHazardIndex] ?? getInitialWalkHazardCell(maze)) }
        : { ...getInitialWalkHazardCell(maze) };
  const isPristineProgress = startedAt === null
    && completedAt === null
    && elapsedMs === 0
    && collectedBonusIds.length === 0;
  const hazardPosition = isPristineProgress
    ? { ...getInitialWalkHazardCell(maze) }
    : restoredHazardPosition;
  const rawPreviousPosition = candidate.hazardPreviousPosition;
  const hazardPreviousPosition = rawPreviousPosition
    && typeof rawPreviousPosition.x === "number"
    && typeof rawPreviousPosition.y === "number"
    && Number.isInteger(rawPreviousPosition.x)
    && Number.isInteger(rawPreviousPosition.y)
    && isWalkCellInBounds(maze, rawPreviousPosition)
      ? { x: rawPreviousPosition.x, y: rawPreviousPosition.y }
      : null;
  const hazardStep = typeof candidate.hazardStep === "number" && Number.isInteger(candidate.hazardStep)
    ? Math.max(0, candidate.hazardStep)
    : legacyHazardIndex;
  const hazardSeed = typeof candidate.hazardSeed === "string" && candidate.hazardSeed
    ? candidate.hazardSeed
    : `legacy:${maze.id}:${legacyHazardIndex}`;
  const hazardEncounters = typeof candidate.hazardEncounters === "number"
    && Number.isInteger(candidate.hazardEncounters)
    ? Math.max(0, candidate.hazardEncounters)
    : 0;
  return {
    mazeId: maze.id,
    position: { x: position.x, y: position.y },
    collectedBonusIds,
    hazardPosition,
    hazardPreviousPosition,
    hazardStep,
    hazardSeed,
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
  const currentHazard = progress.hazardPosition;
  const nextHazard = getNextWalkHazardCell(maze, progress, position);
  const hazardEncountered = Boolean(
    nextHazard
    && (
      sameCell(position, currentHazard)
      || sameCell(position, nextHazard)
    ),
  );
  if (hazardEncountered) {
    const hazardEncounters = progress.hazardEncounters + 1;
    const restarted = createWalkMazeProgress(
      maze.id,
      `${progress.hazardSeed}:bite:${hazardEncounters}`,
    );
    return {
      progress: { ...restarted, hazardEncounters },
      moved: true,
      blocked: null,
      collectedBonusId: null,
      hazardEncountered: true,
      reachedFinish: false,
      completed: false,
    };
  }
  const reachedFinish = position.x === maze.finish.x && position.y === maze.finish.y;
  const completed = reachedFinish && collectedBonusIds.length === maze.bonuses.length;
  const next: WalkMazeProgress = {
    ...progress,
    position,
    collectedBonusIds,
    hazardPosition: nextHazard,
    hazardPreviousPosition: currentHazard,
    hazardStep: progress.hazardStep + 1,
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
  return isWalkCellInBounds(maze, progress.hazardPosition)
    ? progress.hazardPosition
    : getInitialWalkHazardCell(maze);
}

export function getWalkCompletionMessage(progress: WalkMazeProgress): string {
  return progress.elapsedMs <= WALK_FRIENDLY_TIME_MS
    ? "Спокойная прогулка пройдена — вы нашли бережный темп."
    : "Маршрут пройден. Главное — идти в темпе, который подходит питомцу.";
}
