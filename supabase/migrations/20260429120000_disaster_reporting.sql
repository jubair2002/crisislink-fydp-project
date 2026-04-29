-- Disaster reporting schema for CrisisLink mobile + realtime map.
-- Prerequisites: public.profiles, public.volunteers, public.notifications must exist.
-- After applying: Dashboard → Database → Replication → enable `disasters` for Realtime.

-- ─── disasters (additive columns if table already exists) ───
CREATE TABLE IF NOT EXISTS public.disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disaster_type text,
  status text NOT NULL DEFAULT 'reported'
);

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS reporter_user_id uuid REFERENCES auth.users (id)
ON DELETE SET NULL;

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS location_label text;

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium';

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS description text DEFAULT '';

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES auth.users (id)
ON DELETE SET NULL;

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS verification_notes text;

ALTER TABLE public.disasters ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS disasters_created_at_idx ON public.disasters (created_at DESC);

CREATE INDEX IF NOT EXISTS disasters_status_idx ON public.disasters (status);

-- ─── Timeline ───
CREATE TABLE IF NOT EXISTS public.disaster_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  disaster_id uuid NOT NULL REFERENCES public.disasters (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disaster_updates_disaster_idx ON public.disaster_updates (disaster_id);

-- ─── Media metadata (files in Storage bucket disaster-media) ───
CREATE TABLE IF NOT EXISTS public.disaster_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  disaster_id uuid NOT NULL REFERENCES public.disasters (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  purpose text NOT NULL DEFAULT 'report' CHECK (purpose IN ('report', 'verification')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disaster_media_disaster_idx ON public.disaster_media (disaster_id);

-- ─── Notify volunteers near a new pin (approx ±1° box ~100km scale — tweak as needed) ───
CREATE OR REPLACE FUNCTION public.notify_volunteers_near_new_disaster ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;

BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;

  END IF;

  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;

  END IF;

  FOR v IN
  SELECT
    vo.user_id,
    vo.current_latitude,
    vo.current_longitude
  FROM
    public.volunteers vo
  WHERE
    vo.verification_status = 'approved'
    AND vo.current_latitude IS NOT NULL
    AND vo.current_longitude IS NOT NULL LOOP
      IF ABS(v.current_latitude - NEW.latitude) <= 1
      AND ABS(v.current_longitude - NEW.longitude) <= 1 THEN
        INSERT INTO public.notifications (user_id, type, title, message, is_read)
          VALUES (
            v.user_id,
            'disaster_nearby',
            'New disaster reported nearby',
            concat_ws(
              ' ',
              COALESCE(replace(NEW.disaster_type::text, '_', ' '), 'Disaster'),
              '— open CrisisLink to review.'
            ),
            FALSE);

      END IF;

    END LOOP;

  RETURN NEW;

END;

$$;

DROP TRIGGER IF EXISTS trg_notify_volunteers_on_disaster ON public.disasters;

CREATE TRIGGER trg_notify_volunteers_on_disaster
AFTER INSERT ON public.disasters FOR EACH ROW
EXECUTE PROCEDURE public.notify_volunteers_near_new_disaster ();

-- ─── Row Level Security ───
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.disaster_updates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.disaster_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS disasters_select_authenticated ON public.disasters;

CREATE POLICY disasters_select_authenticated ON public.disasters FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS disasters_insert_own ON public.disasters;

CREATE POLICY disasters_insert_own ON public.disasters FOR INSERT TO authenticated
WITH CHECK (reporter_user_id = auth.uid ());

DROP POLICY IF EXISTS disasters_update_volunteers ON public.disasters;

CREATE POLICY disasters_update_volunteers ON public.disasters FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.user_id = auth.uid ()
      AND p.role = 'volunteer'
  )
);

DROP POLICY IF EXISTS disaster_updates_select ON public.disaster_updates;

CREATE POLICY disaster_updates_select ON public.disaster_updates FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS disaster_updates_insert_own ON public.disaster_updates;

CREATE POLICY disaster_updates_insert_own ON public.disaster_updates FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid ());

DROP POLICY IF EXISTS disaster_media_select ON public.disaster_media;

CREATE POLICY disaster_media_select ON public.disaster_media FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS disaster_media_insert ON public.disaster_media;

CREATE POLICY disaster_media_insert ON public.disaster_media FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT
      1
    FROM
      public.disasters d
    WHERE
      d.id = disaster_id
      AND (
        d.reporter_user_id = auth.uid ()
        OR EXISTS (
          SELECT
            1
          FROM
            public.profiles p
          WHERE
            p.user_id = auth.uid ()
            AND p.role = 'volunteer'
        )
      )
  )
);

-- ─── Storage ───
INSERT INTO storage.buckets (id, name, public)
  VALUES ('disaster-media', 'disaster-media', TRUE)
ON CONFLICT (id)
  DO NOTHING;

DROP POLICY IF EXISTS disaster_media_public_read ON storage.objects;

CREATE POLICY disaster_media_public_read ON storage.objects FOR SELECT TO public USING (bucket_id = 'disaster-media');

DROP POLICY IF EXISTS disaster_media_authenticated_upload ON storage.objects;

CREATE POLICY disaster_media_authenticated_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'disaster-media');
