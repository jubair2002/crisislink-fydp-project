-- Optional tables for CrisisLink home dashboards (campaigns, resource centers, updates).
-- Safe to apply after disasters/tasks exist; queries degrade gracefully if skipped.

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  location_label text,
  status text NOT NULL DEFAULT 'draft',
  target_amount numeric NOT NULL DEFAULT 0,
  collected_amount numeric NOT NULL DEFAULT 0,
  ends_at timestamptz
);

CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns (status);

CREATE TABLE IF NOT EXISTS public.resource_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  capacity_max integer,
  capacity_current integer
);

CREATE INDEX IF NOT EXISTS resource_centers_geo_idx ON public.resource_centers (latitude, longitude);

CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_updates_campaign_idx ON public.campaign_updates (campaign_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.resource_centers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_select_auth ON public.campaigns;

CREATE POLICY campaigns_select_auth ON public.campaigns FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS resource_centers_select_auth ON public.resource_centers;

CREATE POLICY resource_centers_select_auth ON public.resource_centers FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS campaign_updates_select_auth ON public.campaign_updates;

CREATE POLICY campaign_updates_select_auth ON public.campaign_updates FOR SELECT TO authenticated USING (TRUE);
