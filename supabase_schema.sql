-- Tekst Supabase Complete Schema
-- Copy and run this in your Supabase SQL Editor

-- 1. Create the Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure avatar_url exists if table was already created before
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create the Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  text_content text,
  image_url text,
  audio_url text,
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  burn_after boolean DEFAULT false,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  reactions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all new columns exist if table was already created before
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS burn_after boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;


-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allowing anonymous access for this Jugadu app)
-- Note: For a production app, you'd use Supabase Auth and restrict these.
DROP POLICY IF EXISTS "Allow public read access on users" ON public.users;
CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on users" ON public.users;
CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read access on messages" ON public.messages;
CREATE POLICY "Allow public read access on messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on messages" ON public.messages;
CREATE POLICY "Allow public insert on messages" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on messages" ON public.messages;
CREATE POLICY "Allow public update on messages" ON public.messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on messages" ON public.messages;
CREATE POLICY "Allow public delete on messages" ON public.messages FOR DELETE USING (true);

-- 5. Enable Realtime on the messages table
-- This allows optimistic UI to be backed up by real-time database subscriptions
begin;
  -- remove the supabase_realtime publication if it exists
  drop publication if exists supabase_realtime;
  -- create the publication and add the messages table
  create publication supabase_realtime for table messages;
commit;
