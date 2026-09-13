export type GameStatus = "WAITING" | "RUNNING" | "FINISHED" | "CANCELLED";

export interface Player {
  id: string;
  displayName: string;
  boardId: number;
}

export interface GameState {
  id: string;
  stake: number;
  status: GameStatus;
  createdAt: string;
  startsAt?: string;
  endsAt?: string;
  calledNumbers: number[];
  nextCallAt?: string;
  players: Player[];
  pot: number;
  winnerId?: string;
  prize?: number;
  commission?: number;
}

export function generateBoard(boardId: number): number[] {
  if (boardId < 1 || boardId > 100) throw new Error("Board ID must be 1-100");

  // Seeded pseudo-random generator gives each board a stable card.
  let seed = boardId * 2654435761;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75]
  ] as const;

  const cols: number[][] = [];
  for (const [min, max] of ranges) {
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    cols.push(pool.slice(0, 5));
  }

  const board = Array.from({ length: 25 }, () => 0);
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 5; r++) board[r * 5 + c] = cols[c][r];
  }
  board[12] = 0; // FREE
  return board;
}

export function hasBingo(board: number[], called: Set<number>): boolean {
  const marked = board.map((n, i) => i === 12 || called.has(n));
  const lines = [
    [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14],
    [15,16,17,18,19], [20,21,22,23,24],
    [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22],
    [3,8,13,18,23], [4,9,14,19,24],
    [0,6,12,18,24], [4,8,12,16,20]
  ];
  return lines.some(line => line.every(i => marked[i]));
}

export const STAKES = [10, 15, 25, 50] as const;
export type Stake = typeof STAKES[number];
