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
  hazardRoute: readonly WalkCell[];
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

function createRouteMaze(
  id: string,
  width: number,
  height: number,
  routes: readonly (readonly WalkCell[])[],
  bonuses: readonly (readonly [WalkCell, string])[],
  hazardRoute: readonly WalkCell[],
): WalkMaze {
  const primaryRoute = routes[0];
  if (!primaryRoute || primaryRoute.length < 2) {
    throw new Error(`Missing primary route for ${id}.`);
  }

  const cells = Array.from({ length: height }, () => Array.from({ length: width }, (): WalkWalls => ({
    north: true,
    east: true,
    south: true,
    west: true,
  })));

  for (const route of routes) {
    if (route.length < 2 || route.some((cell, index) =>
      cell.x < 0 || cell.x >= width || cell.y < 0 || cell.y >= height
      || (index > 0 && !isNeighbour(route[index - 1], cell)))) {
      throw new Error(`Invalid static route for ${id}.`);
    }
    for (let index = 1; index < route.length; index += 1) {
      const from = route[index - 1];
      const to = route[index];
      const direction = directionBetween(from, to);
      cells[from.y][from.x][direction] = false;
      cells[to.y][to.x][opposite[direction]] = false;
    }
  }

  return {
    id,
    width,
    height,
    start: primaryRoute[0],
    finish: primaryRoute[primaryRoute.length - 1],
    cells,
    bonuses: bonuses.map(([cell, label], index) => ({
      id: `${id}-bonus-${index + 1}`,
      cell,
      label,
    })),
    hazardRoute,
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
  createRouteMaze(
    "park-loop",
    8,
    8,
    [
      joinPath(row(0, 7, 0), column(7, 0, 7)),
      joinPath(column(0, 0, 7), row(0, 7, 7)),
      joinPath(column(2, 0, 5), row(2, 6, 5), column(6, 5, 7)),
      joinPath(row(0, 5, 2), column(5, 2, 7)),
      joinPath(row(0, 4, 4), column(4, 4, 0)),
      joinPath(row(4, 6, 3), column(6, 3, 1)),
      column(5, 0, 2),
    ],
    [
      [{ x: 3, y: 7 }, "миска"],
      [{ x: 2, y: 4 }, "сердечко"],
      [{ x: 5, y: 3 }, "игрушка"],
      [{ x: 6, y: 1 }, "тихая точка"],
      [{ x: 7, y: 5 }, "вода"],
    ],
    joinPath(row(2, 5, 0), column(5, 0, 5), row(5, 2, 5), column(2, 5, 0)).slice(0, -1),
  ),
  createRouteMaze(
    "quiet-lane",
    9,
    9,
    [
      joinPath(column(0, 4, 0), row(0, 8, 0), column(8, 0, 4)),
      joinPath(column(0, 4, 8), row(0, 8, 8), column(8, 8, 4)),
      joinPath(row(0, 2, 4), column(2, 4, 2), row(2, 6, 2), column(6, 2, 4), row(6, 8, 4)),
      joinPath(row(0, 2, 4), column(2, 4, 6), row(2, 6, 6), column(6, 6, 4), row(6, 8, 4)),
      column(4, 1, 7),
    ],
    [
      [{ x: 4, y: 2 }, "сердечко"],
      [{ x: 4, y: 6 }, "игрушка"],
      [{ x: 8, y: 1 }, "вода"],
      [{ x: 1, y: 8 }, "миска"],
      [{ x: 4, y: 4 }, "тихая точка"],
    ],
    joinPath(row(2, 6, 2), column(6, 2, 6), row(6, 2, 6), column(2, 6, 2)).slice(0, -1),
  ),
  createRouteMaze(
    "courtyard-turn",
    8,
    8,
    [
      joinPath(row(0, 7, 7), column(7, 7, 0)),
      joinPath(column(0, 7, 0), row(0, 7, 0)),
      joinPath(row(0, 2, 7), column(2, 7, 2), row(2, 5, 2), column(5, 2, 0), row(5, 7, 0)),
      joinPath(column(0, 7, 5), row(0, 4, 5), column(4, 5, 3), row(4, 7, 3), column(7, 3, 0)),
      joinPath(row(0, 4, 7), column(4, 7, 3), row(4, 0, 3)),
      row(5, 6, 2),
    ],
    [
      [{ x: 2, y: 5 }, "миска"],
      [{ x: 4, y: 4 }, "сердечко"],
      [{ x: 6, y: 2 }, "игрушка"],
      [{ x: 7, y: 5 }, "вода"],
      [{ x: 3, y: 0 }, "тихая точка"],
    ],
    joinPath(row(0, 4, 7), column(4, 7, 3), row(4, 0, 3), column(0, 3, 7)).slice(0, -1),
  ),
  createRouteMaze(
    "garden-route",
    10,
    10,
    [
      joinPath(row(0, 9, 0), column(9, 0, 9)),
      joinPath(column(0, 0, 9), row(0, 9, 9)),
      joinPath(row(0, 3, 0), column(3, 0, 6), row(3, 8, 6), column(8, 6, 9), row(8, 9, 9)),
      joinPath(column(0, 0, 4), row(0, 6, 4), column(6, 4, 8), row(6, 9, 8), column(9, 8, 9)),
      joinPath(row(3, 6, 2), column(6, 2, 4)),
      row(3, 6, 4),
      row(3, 2, 5),
    ],
    [
      [{ x: 3, y: 2 }, "сердечко"],
      [{ x: 6, y: 4 }, "миска"],
      [{ x: 8, y: 6 }, "игрушка"],
      [{ x: 5, y: 9 }, "вода"],
      [{ x: 0, y: 6 }, "тихая точка"],
    ],
    joinPath(row(3, 6, 2), column(6, 2, 4), row(6, 3, 4), column(3, 4, 2)).slice(0, -1),
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
  if (maze.hazardRoute.length < 4) {
    errors.push("Hazard route is too short.");
  } else {
    maze.hazardRoute.forEach((cell, index) => {
      const next = maze.hazardRoute[(index + 1) % maze.hazardRoute.length];
      if (!isWalkCellInBounds(maze, cell) || !reachable.has(`${cell.x},${cell.y}`)) {
        errors.push(`Hazard route cell ${index} is unreachable.`);
      } else if (!isNeighbour(cell, next)) {
        errors.push(`Hazard route step ${index} is not adjacent.`);
      } else {
        const direction = directionBetween(cell, next);
        if (getWalkCell(maze, cell)?.[direction]) {
          errors.push(`Hazard route step ${index} crosses a wall.`);
        }
      }
    });
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
