-- Supabase Database Modifications for 50 Chat Features

-- 1. Add Self-Destruct Burn Timer (in seconds)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS burn_after INT DEFAULT NULL;

-- 2. Add Reply-To Relation Threading
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL DEFAULT NULL;

-- 3. Add Emoji Reactions JSONB Field
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- 4. Add Edited Message Status Column
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
