### SQL QUERIES ###

```
-- 1. Create Users Table (Pre-created credentials bypasses built-in Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL, -- Managed directly inside the public schema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Messages Table (Handles Text, Images, and Audio Voice Notes)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    text_content TEXT DEFAULT NULL,   -- NULL if it's a media-only transmission
    image_url TEXT DEFAULT NULL,      -- URL path pointing to your storage bucket
    audio_url TEXT DEFAULT NULL,      -- Added for the voice messaging update
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Realtime Engine for Live Streaming
-- Allows instant messaging, message updates, and indicators without page refreshes
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```