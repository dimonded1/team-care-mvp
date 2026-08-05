import { describe, expect, it } from "vitest";
import {
  getWalkCell,
  getWalkMaze,
  getWalkNeighbour,
  type WalkCell,
  type WalkDirection,
  type WalkMaze,
} from "../data/walkMazes";
import { WALK_FRIENDLY_TIME_MS, WALK_INPUT_LOCK_MS, completeWalkMazeForTime, createWalkMazeProgress, getNextWalkHazardCell, getWalkCompletionMessage, getWalkDirectionFromVector, getWalkHazardCell, isWalkInputLocked, isWalkTapGesture, moveWalkMaze, restoreWalkMazeProgress } from "./maze";

const directions = ["north", "east", "south", "west"] as const;

function sameCell(left: WalkCell, right: WalkCell) {
  return left.x === right.x && left.y === right.y;
}

function cellDistanceForTest(left: WalkCell, right: WalkCell) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function directionBetween(from: WalkCell, to: WalkCell): WalkDirection {
  return directions.find((direction) => sameCell(getWalkNeighbour(from, direction), to))!;
}

function findDirections(maze: WalkMaze, from: WalkCell, target: WalkCell): WalkDirection[] {
  const queue: Array<{ cell: WalkCell; path: WalkDirection[] }> = [{ cell: from, path: [] }];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.cell.x},${current.cell.y}`;
    if (visited.has(key)) continue;
    if (sameCell(current.cell, target)) return current.path;
    visited.add(key);
    const walls = getWalkCell(maze, current.cell);
    if (!walls) continue;
    for (const direction of directions) {
      if (!walls[direction]) {
        queue.push({
          cell: getWalkNeighbour(current.cell, direction),
          path: [...current.path, direction],
        });
      }
    }
  }
  throw new Error("Target is unreachable in test map.");
}

describe("walk maze state", () => {
  it("exports a 170ms single-input lock contract", () => {
    expect(WALK_INPUT_LOCK_MS).toBeGreaterThanOrEqual(160);
    expect(WALK_INPUT_LOCK_MS).toBeLessThanOrEqual(180);
    expect(isWalkInputLocked(1_170, 1_169)).toBe(true);
    expect(isWalkInputLocked(1_170, 1_170)).toBe(false);
  });

  it("maps a chosen point to one grid direction", () => {
    expect(getWalkDirectionFromVector(38, 6, 24)).toBe("east");
    expect(getWalkDirectionFromVector(-40, 3, 24)).toBe("west");
    expect(getWalkDirectionFromVector(4, -31, 24)).toBe("north");
    expect(getWalkDirectionFromVector(2, 42, 24)).toBe("south");
    expect(getWalkDirectionFromVector(10, 8, 24)).toBeNull();
  });

  it("accepts a short touch but rejects a swipe or diagonal drag", () => {
    expect(isWalkTapGesture(0, 0)).toBe(true);
    expect(isWalkTapGesture(8, 8)).toBe(true);
    expect(isWalkTapGesture(13, 0)).toBe(false);
    expect(isWalkTapGesture(10, 10)).toBe(false);
    expect(isWalkTapGesture(3, 48)).toBe(false);
  });

  it("blocks walls without starting the timer", () => {
    const maze = getWalkMaze("park-loop");
    const start = createWalkMazeProgress(maze.id);
    const blockedDirection = directions.find((direction) =>
      getWalkCell(maze, maze.start)?.[direction])!;
    expect(moveWalkMaze(maze, start, blockedDirection, 100)).toMatchObject({ moved: false, blocked: "wall", progress: start });
  });

  it("rejects an open boundary defensively", () => {
    const maze = getWalkMaze("park-loop");
    const cells = maze.cells.map((row, y) => row.map((walls, x) => x === maze.start.x && y === maze.start.y ? { ...walls, north: false } : { ...walls }));
    const malformedMaze = { ...maze, cells };
    expect(moveWalkMaze(malformedMaze, createWalkMazeProgress(maze.id), "north", 100)).toMatchObject({ moved: false, blocked: "bounds" });
  });

  it("starts after a successful move, collects bonuses and serializes cleanly", () => {
    const maze = getWalkMaze("park-loop");
    let progress = createWalkMazeProgress(maze.id);
    const route = findDirections(maze, maze.start, maze.bonuses[0].cell);
    route.forEach((direction, step) => {
      progress = moveWalkMaze(maze, progress, direction, 100 + step * 170).progress;
    });
    expect(progress.startedAt).not.toBeNull();
    expect(progress.collectedBonusIds).toContain("park-loop-bonus-1");
    expect(JSON.parse(JSON.stringify(progress))).toEqual(progress);
  });

  it("restores legacy progress with a safe deterministic hazard state", () => {
    const maze = getWalkMaze("quiet-lane");
    const restored = restoreWalkMazeProgress({
      mazeId: maze.id,
      position: maze.start,
      collectedBonusIds: [],
      elapsedMs: 0,
      startedAt: null,
      completedAt: null,
    }, maze.id);
    expect(restored.hazardStep).toBe(0);
    expect(restored.hazardSeed).toContain("legacy:");
    expect(restored.hazardEncounters).toBe(0);
    expect(getWalkHazardCell(maze, restored)).toEqual(maze.hazardRoute[0]);
  });

  it("keeps collected points after a soft hazard encounter", () => {
    const maze = getWalkMaze("park-loop");
    const start = createWalkMazeProgress(maze.id, "encounter-seed");
    const direction = directions.find((item) => !getWalkCell(maze, start.position)?.[item])!;
    const destination = getWalkNeighbour(start.position, direction);
    const progress = {
      ...start,
      hazardPosition: destination,
      collectedBonusIds: [maze.bonuses[0].id],
    };
    const result = moveWalkMaze(maze, progress, direction, 1_000);
    expect(result.hazardEncountered).toBe(true);
    expect(result.progress.hazardEncounters).toBe(1);
    expect(result.progress.collectedBonusIds).toEqual([maze.bonuses[0].id]);
  });

  it("moves the hazard only through open passages and varies choices by saved seed", () => {
    const maze = getWalkMaze("quiet-lane");
    const junction = maze.hazardRoute.find((cell) =>
      directions.filter((direction) => !getWalkCell(maze, cell)?.[direction]).length >= 3)!;
    const outcomes = new Set(
      Array.from({ length: 12 }, (_, index) => {
        const progress = {
          ...createWalkMazeProgress(maze.id, `hazard-${index}`),
          hazardPosition: junction,
          hazardPreviousPosition: null,
        };
        const next = getNextWalkHazardCell(maze, progress, maze.finish);
        expect(cellDistanceForTest(junction, next)).toBe(1);
        expect(getWalkCell(maze, junction)?.[directionBetween(junction, next)]).toBe(false);
        return `${next.x},${next.y}`;
      }),
    );
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it("restores safe progress and completes kindly after the time limit", () => {
    const maze = getWalkMaze("park-loop");
    const started = moveWalkMaze(maze, createWalkMazeProgress(maze.id), "east", 1_000).progress;
    const restored = restoreWalkMazeProgress(JSON.parse(JSON.stringify(started)), maze.id);
    const completed = completeWalkMazeForTime(restored, 46_001);

    expect(completed.completedAt).toBe(46_001);
    expect(completed.startedAt).toBeNull();
    expect(getWalkCompletionMessage(completed)).toContain("Маршрут пройден");
  });

  it("completes only after collecting every point and reaching the station", () => {
    const maze = getWalkMaze("courtyard-turn");
    let progress = createWalkMazeProgress(maze.id);
    let now = 0;
    for (const target of [...maze.bonuses.map((bonus) => bonus.cell), maze.finish]) {
      for (const direction of findDirections(maze, progress.position, target)) {
        progress = moveWalkMaze(maze, progress, direction, now).progress;
        now += 100;
      }
    }
    expect(progress.collectedBonusIds).toHaveLength(maze.bonuses.length);
    expect(progress.completedAt).not.toBeNull();
    expect(getWalkCompletionMessage(progress)).toContain("пройдена");
    expect(WALK_FRIENDLY_TIME_MS).toBe(45_000);
  });
});
