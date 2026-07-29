import { describe, expect, it } from "vitest";
import { getWalkShortestPathLength, validateWalkMaze, walkMazes } from "./walkMazes";

describe("walk mazes", () => {
  it("ships four deterministic, valid maps with branches, loops and patrols", () => {
    expect(walkMazes).toHaveLength(4);
    expect(walkMazes.map((maze) => maze.id)).toEqual(["park-loop", "quiet-lane", "courtyard-turn", "garden-route"]);
    for (const maze of walkMazes) {
      expect(validateWalkMaze(maze)).toEqual([]);
      expect(getWalkShortestPathLength(maze)).toBeGreaterThanOrEqual(12);
      expect(getWalkShortestPathLength(maze)).toBeLessThanOrEqual(18);
      expect(maze.bonuses.length).toBeGreaterThanOrEqual(4);
      expect(maze.bonuses.length).toBeLessThanOrEqual(5);
      const openDegrees = maze.cells.flatMap((row) =>
        row.map((walls) => Object.values(walls).filter((wall) => !wall).length));
      expect(openDegrees.filter((degree) => degree >= 3).length).toBeGreaterThanOrEqual(3);
      expect(openDegrees.filter((degree) => degree === 1).length).toBeGreaterThanOrEqual(1);
      expect(maze.bonuses.filter((bonus) =>
        Object.values(maze.cells[bonus.cell.y][bonus.cell.x])
          .filter((wall) => !wall).length >= 2).length).toBeGreaterThanOrEqual(2);
      expect(maze.hazardRoute.length).toBeGreaterThanOrEqual(8);
    }
  });
});
