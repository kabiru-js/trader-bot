-- ============================================================
-- Trader Bot v2 - Multi-User Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Users table (references Supabase Auth users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  wallet_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trades table
CREATE TABLE IF NOT EXISTS trades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 4. Global bot state table
CREATE TABLE IF NOT EXISTS global_bot_state (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  current_position TEXT NOT NULL DEFAULT 'CLOSED' CHECK (current_position IN ('OPEN', 'CLOSED')),
  entry_price NUMERIC(14, 2),
  position_size NUMERIC(18, 8),
  last_action_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_price_feed_symbol ON price_feed(symbol);

-- 6. Seed bot state
INSERT INTO global_bot_state (current_position) VALUES ('CLOSED');

-- 7. Realtime publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE trades, price_feed, users;
COMMIT;

-- ============================================================
-- Row Level Security
-- ============================================================

-- Users: can read/write their own record
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_select ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_update ON users FOR UPDATE USING (id = auth.uid());

-- Trades: can read own trades, insert only via service_role
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trades_select ON trades;
DROP POLICY IF EXISTS trades_insert ON trades;
CREATE POLICY trades_select ON trades FOR SELECT USING (user_id = auth.uid());
CREATE POLICY trades_insert ON trades FOR INSERT WITH CHECK (user_id = auth.uid());

-- Price feed: public read
ALTER TABLE price_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_feed_select ON price_feed;
CREATE POLICY price_feed_select ON price_feed FOR SELECT USING (true);

-- ============================================================
-- Function: auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, wallet_balance)
  VALUES (NEW.id, NEW.email, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created in auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
