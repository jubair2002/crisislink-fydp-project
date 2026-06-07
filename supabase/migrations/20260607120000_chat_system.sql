-- CrisisLink chat & communication system
-- Prerequisites: public.profiles, public.tasks, public.campaigns, public.notifications

-- Replace legacy chat schema (empty tables with incompatible columns)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_members CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.broadcasts CASCADE;
DROP TABLE IF EXISTS public.device_tokens CASCADE;

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_type') THEN
    CREATE TYPE public.chat_type AS ENUM ('campaign', 'task', 'channel', 'direct', 'broadcast');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE public.message_type AS ENUM ('text', 'image', 'location', 'system');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
    CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'seen');
  END IF;
END $$;

-- ─── Chats ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.chat_type NOT NULL,
  name text NOT NULL,
  description text,
  task_id uuid,
  campaign_id uuid,
  channel_slug text,
  created_by uuid,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS task_id uuid;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS campaign_id uuid;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS channel_slug text;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message_preview text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chats_task_id_fkey' AND table_name = 'chats'
  ) THEN
    ALTER TABLE public.chats
      ADD CONSTRAINT chats_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chats_campaign_id_fkey' AND table_name = 'chats'
  ) THEN
    ALTER TABLE public.chats
      ADD CONSTRAINT chats_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns (id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS chats_task_id_unique ON public.chats (task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chats_campaign_id_unique ON public.chats (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chats_channel_slug_unique ON public.chats (channel_slug) WHERE channel_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS chats_type_idx ON public.chats (type);
CREATE INDEX IF NOT EXISTS chats_last_message_at_idx ON public.chats (last_message_at DESC NULLS LAST);

-- ─── Chat members ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  UNIQUE (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_members_user_idx ON public.chat_members (user_id);
CREATE INDEX IF NOT EXISTS chat_members_chat_idx ON public.chat_members (chat_id);

-- ─── Messages ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  type public.message_type NOT NULL DEFAULT 'text',
  image_url text,
  latitude double precision,
  longitude double precision,
  status public.message_status NOT NULL DEFAULT 'sent',
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_chat_created_idx ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages (sender_id);
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_dedup_idx ON public.messages (chat_id, client_id) WHERE client_id IS NOT NULL;

-- ─── Broadcasts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('all', 'volunteers', 'campaign')),
  target_campaign_id uuid REFERENCES public.campaigns (id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broadcasts_created_idx ON public.broadcasts (created_at DESC);

-- ─── Device tokens (push) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens (user_id);

-- ─── Storage bucket for chat images ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed global channels ───────────────────────────────────────────────────

INSERT INTO public.chats (type, name, description, channel_slug)
SELECT v.type::public.chat_type, v.name, v.description, v.slug
FROM (
  VALUES
    ('channel', '#general', 'Community discussion and coordination.', 'general'),
    ('channel', '#help', 'Ask questions and get support from the community.', 'help'),
    ('channel', '#announcements', 'Official updates from CrisisLink administrators.', 'announcements'),
    ('channel', '#emergency', 'Urgent alerts and emergency coordination.', 'emergency')
) AS v(type, name, description, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.chats c WHERE c.channel_slug = v.slug
);

-- ─── Helper: current user role ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    'citizen'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = p_chat_id AND user_id = p_user_id
  );
$$;

-- ─── Trigger: bump chat preview on new message ───────────────────────────────

CREATE OR REPLACE FUNCTION public.on_message_insert_update_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preview text;
BEGIN
  preview := CASE NEW.type
    WHEN 'image' THEN '📷 Photo'
    WHEN 'location' THEN '📍 Location'
    ELSE LEFT(COALESCE(NEW.content, ''), 120)
  END;

  UPDATE public.chats
  SET
    last_message_at = NEW.created_at,
    last_message_preview = preview,
    updated_at = now()
  WHERE id = NEW.chat_id;

  UPDATE public.chat_members
  SET unread_count = unread_count + 1
  WHERE chat_id = NEW.chat_id AND user_id <> NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_insert_update_chat ON public.messages;
CREATE TRIGGER trg_message_insert_update_chat
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.on_message_insert_update_chat();

-- ─── Realtime ────────────────────────────────────────────────────────────────

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_members REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Chats: members see their chats; channels visible to all authenticated
DROP POLICY IF EXISTS chats_select ON public.chats;
CREATE POLICY chats_select ON public.chats FOR SELECT TO authenticated
USING (
  type = 'channel'
  OR public.is_chat_member(id)
  OR public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS chats_insert ON public.chats;
CREATE POLICY chats_insert ON public.chats FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() IN ('admin', 'volunteer', 'authority')
  OR type = 'channel'
);

DROP POLICY IF EXISTS chats_update ON public.chats;
CREATE POLICY chats_update ON public.chats FOR UPDATE TO authenticated
USING (public.is_chat_member(id) OR public.current_user_role() = 'admin');

-- Chat members
DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
CREATE POLICY chat_members_select ON public.chat_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_chat_member(chat_id) OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
CREATE POLICY chat_members_insert ON public.chat_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.current_user_role() = 'admin'
  OR EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.type = 'channel')
);

DROP POLICY IF EXISTS chat_members_update ON public.chat_members;
CREATE POLICY chat_members_update ON public.chat_members FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

-- Messages
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
USING (
  public.is_chat_member(chat_id)
  OR public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_chat_member(chat_id)
);

DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages FOR UPDATE TO authenticated
USING (
  public.is_chat_member(chat_id)
  OR public.current_user_role() = 'admin'
);

-- Broadcasts
DROP POLICY IF EXISTS broadcasts_select ON public.broadcasts;
CREATE POLICY broadcasts_select ON public.broadcasts FOR SELECT TO authenticated
USING (public.current_user_role() = 'admin' OR TRUE);

DROP POLICY IF EXISTS broadcasts_insert ON public.broadcasts;
CREATE POLICY broadcasts_insert ON public.broadcasts FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'admin' AND admin_id = auth.uid());

-- Device tokens
DROP POLICY IF EXISTS device_tokens_all ON public.device_tokens;
CREATE POLICY device_tokens_all ON public.device_tokens FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Storage policies for chat-media
DROP POLICY IF EXISTS chat_media_select ON storage.objects;
CREATE POLICY chat_media_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS chat_media_insert ON storage.objects;
CREATE POLICY chat_media_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
