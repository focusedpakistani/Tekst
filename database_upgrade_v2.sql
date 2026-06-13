-- Run this snippet in your Supabase SQL Editor to safely upgrade your existing database.
-- It adds the new columns needed for read receipts, reactions, and pinned messages.
-- No data will be deleted!

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seen_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
