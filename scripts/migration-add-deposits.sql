-- ============================================================
-- Migration: add total_deposits + initial_balance to users
-- Run in Supabase SQL Editor
-- ============================================================

-- Add columns if they don't exist
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_deposits NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- Backfill: treat current wallet_balance as total deposits for existing users
-- (assumes existing balances came from funding, not trading profit)
UPDATE public.users
SET total_deposits = wallet_balance,
    initial_balance = CASE WHEN wallet_balance > 0 THEN wallet_balance ELSE 0 END
WHERE total_deposits = 0 AND wallet_balance > 0;
