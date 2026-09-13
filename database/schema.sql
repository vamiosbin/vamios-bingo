-- Reference schema for PostgreSQL migration.
-- The development server currently creates the equivalent SQLite schema automatically.
CREATE TABLE users (
  id UUID PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  balance BIGINT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE games (
  id UUID PRIMARY KEY,
  stake BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  called_numbers JSONB NOT NULL DEFAULT '[]',
  next_call_at TIMESTAMPTZ,
  winner_id UUID REFERENCES users(id),
  prize BIGINT,
  commission BIGINT
);

CREATE TABLE game_players (
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES users(id),
  board_id INTEGER NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id),
  UNIQUE (game_id, board_id)
);
