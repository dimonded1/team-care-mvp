import { describe, expect, it } from "vitest";
import { getWalkShortestPathLength, validateWalkMaze, walkMazes } from "./walkMazes";

describe("walk mazes", () => {
  it("ships four deterministic, valid, short routes", () => {
    expect(walkMazes).toHaveLength(4);
    expect(walkMazes.map((maze) => maze.id)).toEqual(["park-loop", "quiet-lane", "courtyard-turn", "garden-route"]);
    for (const maze of walkMazes) {
      expect(validateWalkMaze(maze)).toEqual([]);
      expect(getWalkShortestPathLength(maze)).toBeGreaterThanOrEqual(12);
      expect(getWalkShortestPathLength(maze)).toBeLessThanOrEqual(18);
      expect(maze.bonuses.length).toBeGreaterThanOrEqual(3);
      expect(maze.bonuses.length).toBeLessThanOrEqual(5);
      for (const bonus of maze.bonuses) {
        const walls = maze.cells[bonus.cell.y][bonus.cell.x];
        expect(Object.values(walls).filter((wall) => !wall)).toHaveLength(1);
      }
    }
  });
});
