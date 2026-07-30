-- ============================================================
-- Trader Bot - Supabase Schema Setup
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 10000.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trades table
CREATE TABLE IF NOT EXISTS trades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  symbol TEXT NOT NULL DEFAULT 'BTCUSDT',
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  entry_price NUMERIC(14, 2) NOT NULL,
  exit_price NUMERIC(14, 2),
  position_size NUMERIC(18, 8) NOT NULL,
  pnl NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 3. Price feed table
CREATE TABLE IF NOT EXISTS price_feed (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC(14, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_price_feed_symbol ON price_feed(symbol);

-- ============================================================
-- Realtime: Enable for trades and price_feed
-- ============================================================
-- In Supabase Dashboard, go to:
--   Database > Replication > Publications
-- Ensure the `supabase_realtime` publication includes:
--   - trades
--   - price_feed
--   - users
--
-- Or run the following (if using Supabase with realtime enabled):
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE trades, price_feed, users;
COMMIT;

-- ============================================================
-- Seed data: Demo user
-- ============================================================
INSERT INTO users (balance) VALUES (10000.00);

-- ============================================================
-- Row Level Security (disable for demo)
-- ============================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_feed DISABLE ROW LEVEL SECURITY;
