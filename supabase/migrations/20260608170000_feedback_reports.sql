-- Feedback & issue reporting — upgrades existing reports tables to full schema

-- ─── Upgrade reports (pre-existing partial table) ───────────────────────────

ALTER TABLE public.reports RENAME COLUMN type TO report_type;

ALTER TABLE public.reports RENAME COLUMN location TO location_label;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS resolution_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_type_check;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check
    CHECK (report_type IN ('campaign', 'platform', 'feedback'));

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
    CHECK (status IN ('submitted', 'in_review', 'resolved', 'rejected'));

CREATE INDEX IF NOT EXISTS reports_user_id_idx ON public.reports (user_id);
CREATE INDEX IF NOT EXISTS reports_campaign_id_idx ON public.reports (campaign_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);
CREATE INDEX IF NOT EXISTS reports_type_idx ON public.reports (report_type);

-- ─── Upgrade report_responses (pre-existing partial table) ──────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'report_responses' AND column_name = 'responder_id'
  ) THEN
    ALTER TABLE public.report_responses RENAME COLUMN responder_id TO responder_user_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS report_responses_report_id_idx ON public.report_responses (report_id);

-- ─── Status timeline ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports (id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_status_events_report_id_idx ON public.report_status_events (report_id);

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_campaign_volunteer(p_campaign_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_volunteers cv
    WHERE cv.campaign_id = p_campaign_id
      AND cv.volunteer_user_id = p_user_id
      AND cv.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin', 'authority');
$$;

-- ─── Routing notifications on new report ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.route_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  INSERT INTO public.report_status_events (report_id, status, note, created_by)
  VALUES (NEW.id, 'submitted', 'Report submitted', NEW.user_id);

  IF NEW.report_type = 'campaign' AND NEW.campaign_id IS NOT NULL THEN
    FOR v IN
      SELECT cv.volunteer_user_id
      FROM public.campaign_volunteers cv
      WHERE cv.campaign_id = NEW.campaign_id
        AND cv.status = 'active'
        AND cv.volunteer_user_id <> NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, is_read)
      VALUES (
        v.volunteer_user_id,
        'campaign_report',
        'New campaign issue reported',
        'A user reported an issue related to your campaign. Open Tasks → Campaign Issues to review.',
        FALSE
      );
    END LOOP;
  ELSIF NEW.report_type = 'platform' THEN
    FOR v IN
      SELECT p.user_id
      FROM public.profiles p
      WHERE p.role IN ('admin', 'authority')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, is_read)
      VALUES (
        v.user_id,
        'platform_report',
        'New platform issue reported',
        'A user reported a platform issue. Review in the admin dashboard.',
        FALSE
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_new_report ON public.reports;
CREATE TRIGGER trg_route_new_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE PROCEDURE public.route_new_report();

-- ─── Notify reporter on response ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_report_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT r.user_id INTO v_user_id
  FROM public.reports r
  WHERE r.id = NEW.report_id;

  IF v_user_id IS NOT NULL AND v_user_id <> NEW.responder_user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, is_read)
    VALUES (
      v_user_id,
      'report_updated',
      'Your report has been updated',
      'Someone responded to your report. Tap to view details.',
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_response ON public.report_responses;
CREATE TRIGGER trg_notify_report_response
AFTER INSERT ON public.report_responses
FOR EACH ROW
EXECUTE PROCEDURE public.notify_report_response();

-- ─── Status change timeline + reporter notification ──────────────────────────

CREATE OR REPLACE FUNCTION public.handle_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.report_status_events (report_id, status, note, created_by)
    VALUES (
      NEW.id,
      NEW.status,
      COALESCE(NEW.resolution_message, 'Status updated'),
      auth.uid()
    );

    INSERT INTO public.notifications (user_id, type, title, message, is_read)
    VALUES (
      NEW.user_id,
      'report_updated',
      'Your report has been updated',
      CASE NEW.status
        WHEN 'resolved' THEN COALESCE(NEW.resolution_message, 'Your report has been resolved.')
        WHEN 'rejected' THEN COALESCE(NEW.resolution_message, 'Your report was reviewed and closed.')
        WHEN 'in_review' THEN 'Your report is now being reviewed.'
        ELSE 'Your report status has changed.'
      END,
      FALSE
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_report_status_change ON public.reports;
CREATE TRIGGER trg_handle_report_status_change
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE PROCEDURE public.handle_report_status_change();

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_staff()
    OR (
      report_type = 'campaign'
      AND campaign_id IS NOT NULL
      AND public.is_campaign_volunteer(campaign_id)
    )
  );

DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS reports_update_handlers ON public.reports;
CREATE POLICY reports_update_handlers ON public.reports
  FOR UPDATE TO authenticated
  USING (
    public.is_staff()
    OR (
      report_type = 'campaign'
      AND campaign_id IS NOT NULL
      AND public.is_campaign_volunteer(campaign_id)
    )
  )
  WITH CHECK (
    public.is_staff()
    OR (
      report_type = 'campaign'
      AND campaign_id IS NOT NULL
      AND public.is_campaign_volunteer(campaign_id)
    )
  );

DROP POLICY IF EXISTS report_responses_select ON public.report_responses;
CREATE POLICY report_responses_select ON public.report_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND (
          r.user_id = auth.uid()
          OR public.is_staff()
          OR (
            r.report_type = 'campaign'
            AND r.campaign_id IS NOT NULL
            AND public.is_campaign_volunteer(r.campaign_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS report_responses_insert ON public.report_responses;
CREATE POLICY report_responses_insert ON public.report_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    responder_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND (
          public.is_staff()
          OR (
            r.report_type = 'campaign'
            AND r.campaign_id IS NOT NULL
            AND public.is_campaign_volunteer(r.campaign_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS report_status_events_select ON public.report_status_events;
CREATE POLICY report_status_events_select ON public.report_status_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND (
          r.user_id = auth.uid()
          OR public.is_staff()
          OR (
            r.report_type = 'campaign'
            AND r.campaign_id IS NOT NULL
            AND public.is_campaign_volunteer(r.campaign_id)
          )
        )
    )
  );

-- ─── Realtime ────────────────────────────────────────────────────────────────

ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.report_responses REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_responses;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Storage for report photos ───────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-media', 'report-media', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS report_media_insert_own ON storage.objects;
CREATE POLICY report_media_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS report_media_select_public ON storage.objects;
CREATE POLICY report_media_select_public ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-media');
