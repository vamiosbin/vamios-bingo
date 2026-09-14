export const STAKES = [10, 15, 25, 50] as const;

export function generateBoard(boardId: number): number[] {
  if (boardId < 1 || boardId > 100) throw new Error("Board ID must be 1-100");
  let seed = boardId * 2654435761;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]] as const;
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
  for (let c = 0; c < 5; c++) for (let r = 0; r < 5; r++) board[r * 5 + c] = cols[c][r];
  board[12] = 0;
  return board;
}
