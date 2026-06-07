-- Extend settings tables for full mobile settings system.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS volunteer_request_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS donation_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS anonymous_donations boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS map_default_view text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS auto_detect_location boolean NOT NULL DEFAULT true;

ALTER TABLE public.volunteers
  ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- RLS (idempotent)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
CREATE POLICY user_settings_insert_own ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_settings_update_own ON public.user_settings;
CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS volunteer_settings_select_own ON public.volunteer_settings;
CREATE POLICY volunteer_settings_select_own ON public.volunteer_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS volunteer_settings_insert_own ON public.volunteer_settings;
CREATE POLICY volunteer_settings_insert_own ON public.volunteer_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS volunteer_settings_update_own ON public.volunteer_settings;
CREATE POLICY volunteer_settings_update_own ON public.volunteer_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
