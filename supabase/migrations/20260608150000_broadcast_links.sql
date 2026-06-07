-- Link broadcasts to notifications and #announcements messages for admin edit/delete.

ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS announcement_message_id uuid REFERENCES public.messages (id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.broadcasts (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_broadcast_id_idx ON public.notifications (broadcast_id);

-- Backfill notification links for existing broadcasts (same title/message within 60s).
UPDATE public.notifications n
SET broadcast_id = b.id
FROM public.broadcasts b
WHERE n.type = 'broadcast'
  AND n.broadcast_id IS NULL
  AND n.title = b.title
  AND n.message = b.message
  AND abs(extract(epoch FROM (n.created_at - b.created_at))) < 60;

-- Backfill announcement message links from #announcements channel content.
UPDATE public.broadcasts b
SET announcement_message_id = m.id
FROM public.messages m
JOIN public.chats c ON c.id = m.chat_id
WHERE b.announcement_message_id IS NULL
  AND c.channel_slug = 'announcements'
  AND m.content = ('📢 ' || b.title || E'\n\n' || b.message);
