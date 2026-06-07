-- notifications: RLS was enabled with no policies, blocking all mobile reads.
-- Admin/service role inserts still work; authenticated users need SELECT/UPDATE on own rows.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role bypasses RLS for admin broadcast inserts (no INSERT policy needed for users).
