-- Allow any authenticated user to read messages in public channels (even before joining).
-- Admin broadcasts post to #announcements; citizens see them via Notifications, but
-- this also enables channel previews and future announcement UI.

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
USING (
  public.is_chat_member(chat_id)
  OR public.current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.type = 'channel'
  )
);
