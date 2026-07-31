-- ============================================================
-- Migration: add AI signal fields to trades table
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS strategy TEXT,
  ADD COLUMN IF NOT EXISTS entry_reason TEXT,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5, 2);
