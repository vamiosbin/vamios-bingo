import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const dbFile = process.env.DATABASE_FILE || "./data/vamios.db";
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  balance INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  reference TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  stake INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  called_numbers TEXT NOT NULL DEFAULT '[]',
  next_call_at TEXT,
  winner_id TEXT,
  prize INTEGER,
  commission INTEGER
);

CREATE TABLE IF NOT EXISTS game_players (
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  board_id INTEGER NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (game_id, user_id),
  UNIQUE (game_id, board_id)
);
`);

export function id(): string {
  return crypto.randomUUID();
}
