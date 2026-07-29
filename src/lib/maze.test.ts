import { describe, expect, it } from "vitest";
import { getWalkMaze } from "../data/walkMazes";
import { WALK_FRIENDLY_TIME_MS, WALK_INPUT_LOCK_MS, completeWalkMazeForTime, createWalkMazeProgress, getWalkCompletionMessage, isWalkInputLocked, moveWalkMaze, restoreWalkMazeProgress } from "./maze";

describe("walk maze state", () => {
  it("exports a 170ms single-input lock contract", () => {
    expect(WALK_INPUT_LOCK_MS).toBeGreaterThanOrEqual(160);
    expect(WALK_INPUT_LOCK_MS).toBeLessThanOrEqual(180);
    expect(isWalkInputLocked(1_170, 1_169)).toBe(true);
    expect(isWalkInputLocked(1_170, 1_170)).toBe(false);
  });

  it("blocks walls without starting the timer", () => {
    const maze = getWalkMaze("park-loop");
    const start = createWalkMazeProgress(maze.id);
    expect(moveWalkMaze(maze, start, "north", 100)).toMatchObject({ moved: false, blocked: "wall", progress: start });
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
    const directions = ["east", "east", "east", "south", "north", "east", "east"] as const;
    directions.forEach((direction, step) => {
      progress = moveWalkMaze(maze, progress, direction, 100 + step * 170).progress;
    });
    expect(progress.startedAt).toBe(1_120);
    expect(progress.collectedBonusIds).toEqual(["park-loop-bonus-1"]);
    expect(JSON.parse(JSON.stringify(progress))).toEqual(progress);
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

  it("marks the route complete with a friendly 45-second message", () => {
    const maze = getWalkMaze("courtyard-turn");
    let progress = createWalkMazeProgress(maze.id);
    const directions = ["east", "east", "east", "north", "north", "north", "north", "east", "east", "east", "south", "south", "south"] as const;
    directions.forEach((direction, index) => { progress = moveWalkMaze(maze, progress, direction, index * 100).progress; });
    expect(progress.completedAt).toBe(1200);
    expect(progress.elapsedMs).toBe(1200);
    expect(getWalkCompletionMessage(progress)).toContain("пройдена");
    expect(WALK_FRIENDLY_TIME_MS).toBe(45_000);
  });
});
