export type WalkDirection = "north" | "east" | "south" | "west";

export interface WalkCell {
  x: number;
  y: number;
}

export type WalkWalls = Record<WalkDirection, boolean>;

export interface WalkMazeBonus {
  id: string;
  cell: WalkCell;
  label: string;
}

export interface WalkMaze {
  id: string;
  width: number;
  height: number;
  start: WalkCell;
  finish: WalkCell;
  cells: readonly (readonly WalkWalls[])[];
  bonuses: readonly WalkMazeBonus[];
}

const directions: readonly WalkDirection[] = ["north", "east", "south", "west"];

const offsets: Record<WalkDirection, WalkCell> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

const opposite: Record<WalkDirection, WalkDirection> = {
  north: "south",
  east: "west",
  south: "north",
  west: "east",
};

function sameCell(left: WalkCell, right: WalkCell) {
  return left.x === right.x && left.y === right.y;
}

function isNeighbour(left: WalkCell, right: WalkCell) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y) === 1;
}

function directionBetween(from: WalkCell, to: WalkCell): WalkDirection {
  return directions.find((direction) => from.x + offsets[direction].x === to.x && from.y + offsets[direction].y === to.y)
    ?? (() => { throw new Error("A maze path can only join adjacent cells."); })();
}

function createPathMaze(
  id: string,
  width: number,
  height: number,
  path: readonly WalkCell[],
  bonusBranches: readonly [WalkCell, WalkCell, string][],
): WalkMaze {
  if (path.length < 2 || path.some((cell, index) => index > 0 && !isNeighbour(path[index - 1], cell))) {
    throw new Error(`Invalid static path for ${id}.`);
  }

  const cells = Array.from({ length: height }, () => Array.from({ length: width }, (): WalkWalls => ({
    north: true,
    east: true,
    south: true,
    west: true,
  })));

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const direction = directionBetween(from, to);
    cells[from.y][from.x][direction] = false;
    cells[to.y][to.x][opposite[direction]] = false;
  }

  for (const [from, to] of bonusBranches) {
    if (!isNeighbour(from, to)) {
      throw new Error(`Invalid bonus branch for ${id}.`);
    }
    const direction = directionBetween(from, to);
    cells[from.y][from.x][direction] = false;
    cells[to.y][to.x][opposite[direction]] = false;
  }

  return {
    id,
    width,
    height,
    start: path[0],
    finish: path[path.length - 1],
    cells,
    bonuses: bonusBranches.map(([, cell, label], index) => ({
      id: `${id}-bonus-${index + 1}`,
      cell,
      label,
    })),
  };
}

const row = (from: number, to: number, y: number): WalkCell[] => {
  const step = from <= to ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => ({ x: from + index * step, y }));
};

const column = (x: number, from: number, to: number): WalkCell[] => {
  const step = from <= to ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => ({ x, y: from + index * step }));
};

function joinPath(...parts: readonly WalkCell[][]): WalkCell[] {
  return parts.flatMap((part, index) => index === 0 ? part : part.slice(1));
}

export const walkMazes: readonly WalkMaze[] = [
  createPathMaze(
    "park-loop",
    8,
    8,
    joinPath(row(0, 5, 0), column(5, 0, 3), row(5, 2, 3), column(2, 3, 5), row(2, 6, 5)),
    [
      [{ x: 3, y: 0 }, { x: 3, y: 1 }, "лужайка"],
      [{ x: 4, y: 3 }, { x: 4, y: 2 }, "вода"],
      [{ x: 4, y: 5 }, { x: 4, y: 6 }, "игрушка"],
    ],
  ),
  createPathMaze(
    "quiet-lane",
    9,
    9,
    joinPath(column(0, 0, 5), row(0, 4, 5), column(4, 5, 2), row(4, 8, 2)),
    [
      [{ x: 0, y: 3 }, { x: 1, y: 3 }, "тихий поворот"],
      [{ x: 2, y: 5 }, { x: 2, y: 6 }, "скамейка"],
      [{ x: 6, y: 2 }, { x: 6, y: 1 }, "миска"],
    ],
  ),
  createPathMaze(
    "courtyard-turn",
    8,
    8,
    joinPath(row(0, 3, 7), column(3, 7, 3), row(3, 6, 3), column(6, 3, 6)),
    [
      [{ x: 2, y: 7 }, { x: 2, y: 6 }, "спокойный шаг"],
      [{ x: 3, y: 5 }, { x: 2, y: 5 }, "игрушка"],
      [{ x: 5, y: 3 }, { x: 5, y: 2 }, "сердечко"],
    ],
  ),
  createPathMaze(
    "garden-route",
    10,
    10,
    joinPath(row(0, 4, 0), column(4, 0, 4), row(4, 8, 4), column(8, 4, 1)),
    [
      [{ x: 2, y: 0 }, { x: 2, y: 1 }, "тень"],
      [{ x: 4, y: 3 }, { x: 3, y: 3 }, "лакомство"],
      [{ x: 6, y: 4 }, { x: 6, y: 5 }, "вода"],
    ],
  ),
];

export function getWalkMaze(mazeId: string): WalkMaze {
  return walkMazes.find((maze) => maze.id === mazeId) ?? walkMazes[0];
}

export function isWalkCellInBounds(maze: WalkMaze, cell: WalkCell) {
  return cell.x >= 0 && cell.x < maze.width && cell.y >= 0 && cell.y < maze.height;
}

export function getWalkCell(maze: WalkMaze, cell: WalkCell): WalkWalls | null {
  return isWalkCellInBounds(maze, cell) ? maze.cells[cell.y]?.[cell.x] ?? null : null;
}

export function getWalkNeighbour(cell: WalkCell, direction: WalkDirection): WalkCell {
  return { x: cell.x + offsets[direction].x, y: cell.y + offsets[direction].y };
}

export function validateWalkMaze(maze: WalkMaze): string[] {
  const errors: string[] = [];
  if (!isWalkCellInBounds(maze, maze.start)) errors.push("Start is outside the maze.");
  if (!isWalkCellInBounds(maze, maze.finish)) errors.push("Finish is outside the maze.");

  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      const cell = { x, y };
      const walls = getWalkCell(maze, cell);
      if (!walls) {
        errors.push(`Missing cell ${x},${y}.`);
        continue;
      }
      for (const direction of directions) {
        const neighbour = getWalkNeighbour(cell, direction);
        if (!isWalkCellInBounds(maze, neighbour)) {
          if (!walls[direction]) errors.push(`Open boundary at ${x},${y} (${direction}).`);
          continue;
        }
        const neighbourWalls = getWalkCell(maze, neighbour);
        if (!neighbourWalls || walls[direction] !== neighbourWalls[opposite[direction]]) {
          errors.push(`Asymmetric wall at ${x},${y} (${direction}).`);
        }
      }
    }
  }

  const reachable = new Set<string>();
  const queue = [maze.start];
  while (queue.length) {
    const cell = queue.shift()!;
    const key = `${cell.x},${cell.y}`;
    if (reachable.has(key)) continue;
    reachable.add(key);
    const walls = getWalkCell(maze, cell);
    if (!walls) continue;
    for (const direction of directions) {
      if (!walls[direction]) queue.push(getWalkNeighbour(cell, direction));
    }
  }
  if (!reachable.has(`${maze.finish.x},${maze.finish.y}`)) errors.push("Finish is unreachable.");
  for (const bonus of maze.bonuses) {
    if (!isWalkCellInBounds(maze, bonus.cell)) errors.push(`Bonus ${bonus.id} is outside the maze.`);
    else if (!reachable.has(`${bonus.cell.x},${bonus.cell.y}`)) errors.push(`Bonus ${bonus.id} is unreachable.`);
  }
  return errors;
}

export function getWalkShortestPathLength(maze: WalkMaze): number | null {
  const queue: Array<{ cell: WalkCell; distance: number }> = [{ cell: maze.start, distance: 0 }];
  const visited = new Set<string>();
  while (queue.length) {
    const { cell, distance } = queue.shift()!;
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key)) continue;
    if (sameCell(cell, maze.finish)) return distance;
    visited.add(key);
    const walls = getWalkCell(maze, cell);
    if (!walls) continue;
    for (const direction of directions) if (!walls[direction]) queue.push({ cell: getWalkNeighbour(cell, direction), distance: distance + 1 });
  }
  return null;
}
