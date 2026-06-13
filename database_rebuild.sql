-- =========================================================================
-- COMPLETE DATABASE REBUILD (TEARDOWN AND SETUP)
-- Run this script in the Supabase SQL Editor
-- WARNING: This deletes ALL existing data and sets up a strict closed system.
-- =========================================================================

-- 1. TEARDOWN
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. CREATE STRICT USERS TABLE
CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INSERT PRE-LISTED USERS
-- Only these users will be able to log in. No open registration.
INSERT INTO public.users (username, password, avatar_url) VALUES 
('admin', 'admin123', 'https://api.dicebear.com/10.x/glyphs/svg?seed=admin'),
('alice', 'alice123', 'https://api.dicebear.com/10.x/glyphs/svg?seed=alice'),
('bob', 'bob123', 'https://api.dicebear.com/10.x/glyphs/svg?seed=bob');

-- 4. CREATE MESSAGES TABLE WITH MEDIA SUPPORT
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  message_type text DEFAULT 'text', -- 'text', 'image', 'video', 'voice'
  text_content text,
  media_url text,
  is_pending boolean DEFAULT false,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ROW LEVEL SECURITY (RLS) FOR TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read users (needed for chat to show names)
CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);
-- STRICT: NO INSERT policy for users. Only admins can add users via SQL.

-- Allow public read/insert on messages (auth handled by frontend validation)
CREATE POLICY "Allow public read on messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on messages" ON public.messages FOR UPDATE USING (true);


-- =========================================================================
-- STORAGE CONFIGURATION (FOR IMAGES, VIDEOS, VOICE)
-- =========================================================================

-- 1. Create the Storage Bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;

-- 4. Create Policies for the Bucket
-- Allow everyone to read media
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat_media');

-- Allow everyone to upload media
CREATE POLICY "Public Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat_media');
