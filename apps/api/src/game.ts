import { db, id } from "./db";
import { generateBoard, hasBingo, type GameState } from "@vamios/shared";

const CALL_INTERVAL_MS = 5000;
const WAIT_MS = 60000;

type GameRow = {
  id: string; stake: number; status: string; created_at: string;
  starts_at: string | null; ends_at: string | null; called_numbers: string;
  next_call_at: string | null; winner_id: string | null; prize: number | null; commission: number | null;
};

function getGameRow(gameId: string): GameRow | undefined {
  return db.prepare("SELECT * FROM games WHERE id=?").get(gameId) as GameRow | undefined;
}

export function gameState(gameId: string): GameState | null {
  const row = getGameRow(gameId);
  if (!row) return null;
  const players = db.prepare(`
    SELECT gp.user_id as id,
           COALESCE(u.first_name || ' ' || u.last_name, u.username, u.telegram_id) as displayName,
           gp.board_id as boardId
    FROM game_players gp JOIN users u ON u.id=gp.user_id
    WHERE gp.game_id=?
    ORDER BY gp.joined_at
  `).all(gameId) as any[];

  return {
    id: row.id,
    stake: row.stake,
    status: row.status as any,
    createdAt: row.created_at,
    startsAt: row.starts_at || undefined,
    endsAt: row.ends_at || undefined,
    calledNumbers: JSON.parse(row.called_numbers),
    nextCallAt: row.next_call_at || undefined,
    players: players.map(p => ({ id: p.id, displayName: String(p.displayName).trim(), boardId: p.boardId })),
    pot: players.length * row.stake,
    winnerId: row.winner_id || undefined,
    prize: row.prize || undefined,
    commission: row.commission || undefined
  };
}

function pickNextNumber(called: number[]): number | null {
  const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !called.includes(n));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function createOrJoinGame(userId: string, stake: number, boardId: number): GameState {
  if (![10,15,25,50].includes(stake)) throw new Error("Invalid stake");
  if (boardId < 1 || boardId > 100) throw new Error("Invalid board");

  const existing = db.prepare(`
    SELECT g.id FROM games g
    WHERE g.stake=? AND g.status='WAITING'
    ORDER BY g.created_at ASC LIMIT 1
  `).get(stake) as { id: string } | undefined;

  const gameId = existing?.id || id();
  const now = new Date();
  const trx = db.transaction(() => {
    if (!existing) {
      db.prepare(`INSERT INTO games (id,stake,status,created_at,called_numbers)
                  VALUES (?,?,?,?,?)`)
        .run(gameId, stake, "WAITING", now.toISOString(), "[]");
    }
    const already = db.prepare("SELECT 1 FROM game_players WHERE game_id=? AND user_id=?").get(gameId, userId);
    if (already) throw new Error("Already joined");

    const boardUsed = db.prepare("SELECT 1 FROM game_players WHERE game_id=? AND board_id=?").get(gameId, boardId);
    if (boardUsed) throw new Error("Board already taken");

    const user = db.prepare("SELECT balance FROM users WHERE id=?").get(userId) as { balance: number } | undefined;
    if (!user || user.balance < stake) throw new Error("Insufficient balance");

    db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(stake, userId);
    db.prepare(`INSERT INTO wallet_transactions (id,user_id,type,amount,status,reference,created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(id(), userId, "GAME_STAKE", -stake, "COMPLETED", gameId, now.toISOString());
    db.prepare(`INSERT INTO game_players (game_id,user_id,board_id,joined_at) VALUES (?,?,?,?)`)
      .run(gameId, userId, boardId, now.toISOString());

    const count = (db.prepare("SELECT COUNT(*) as c FROM game_players WHERE game_id=?").get(gameId) as {c:number}).c;
    if (count >= 1) {
      const starts = new Date(Date.now() + WAIT_MS);
      db.prepare("UPDATE games SET status='RUNNING', starts_at=?, ends_at=?, next_call_at=? WHERE id=?")
        .run(starts.toISOString(), new Date(starts.getTime() + 15 * 60_000).toISOString(),
             new Date(starts.getTime() + CALL_INTERVAL_MS).toISOString(), gameId);
    }
  });
  trx();
  return gameState(gameId)!;
}

export function markNumber(userId: string, gameId: string, number: number) {
  const game = getGameRow(gameId);
  if (!game || game.status !== "RUNNING") throw new Error("Game is not running");
  if (!Number.isInteger(number) || number < 1 || number > 75) throw new Error("Invalid number");
  const player = db.prepare("SELECT board_id FROM game_players WHERE game_id=? AND user_id=?")
    .get(gameId, userId) as {board_id:number} | undefined;
  if (!player) throw new Error("Not a player");
  const board = generateBoard(player.board_id);
  if (!board.includes(number)) throw new Error("Number is not on your board");
  const called = JSON.parse(game.called_numbers) as number[];
  if (!called.includes(number)) throw new Error("Number has not been called");
  return { ok: true };
}

export function claimBingo(userId: string, gameId: string) {
  const game = getGameRow(gameId);
  if (!game || game.status !== "RUNNING") throw new Error("Game is not running");
  const player = db.prepare("SELECT board_id FROM game_players WHERE game_id=? AND user_id=?")
    .get(gameId, userId) as {board_id:number} | undefined;
  if (!player) throw new Error("Not a player");

  const called = new Set<number>(JSON.parse(game.called_numbers));
  const board = generateBoard(player.board_id);
  if (!hasBingo(board, called)) throw new Error("BINGO is not valid yet");

  const prize = Math.floor((game.stake * (db.prepare("SELECT COUNT(*) as c FROM game_players WHERE game_id=?").get(gameId) as {c:number}).c) * 0.8);
  const commission = (game.stake * (db.prepare("SELECT COUNT(*) as c FROM game_players WHERE game_id=?").get(gameId) as {c:number}).c) - prize;

  const trx = db.transaction(() => {
    db.prepare("UPDATE games SET status='FINISHED',winner_id=?,prize=?,commission=? WHERE id=?")
      .run(userId, prize, commission, gameId);
    db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(prize, userId);
    db.prepare(`INSERT INTO wallet_transactions (id,user_id,type,amount,status,reference,created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(id(), userId, "WIN", prize, "COMPLETED", gameId, new Date().toISOString());
  });
  trx();
  return gameState(gameId)!;
}

export function tickGames(broadcast: (gameId: string) => void) {
  const running = db.prepare("SELECT * FROM games WHERE status='RUNNING'").all() as GameRow[];
  const now = Date.now();

  for (const game of running) {
    const starts = game.starts_at ? new Date(game.starts_at).getTime() : 0;
    const ends = game.ends_at ? new Date(game.ends_at).getTime() : Infinity;
    const next = game.next_call_at ? new Date(game.next_call_at).getTime() : Infinity;

    if (now >= ends) {
      db.prepare("UPDATE games SET status='FINISHED' WHERE id=? AND status='RUNNING'").run(game.id);
      broadcast(game.id);
      continue;
    }
    if (now >= next && now >= starts) {
      const called = JSON.parse(game.called_numbers) as number[];
      const n = pickNextNumber(called);
      if (n) {
        called.push(n);
        db.prepare("UPDATE games SET called_numbers=?,next_call_at=? WHERE id=?")
          .run(JSON.stringify(called), new Date(now + CALL_INTERVAL_MS).toISOString(), game.id);
        broadcast(game.id);
      }
    }
  }
}
