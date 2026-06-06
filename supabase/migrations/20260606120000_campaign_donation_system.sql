-- Campaign & donation system: schema alignment, RLS, helpers, volunteer linkage.

-- Link tasks to campaigns (volunteer work on campaign operations).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_campaign_id_idx ON public.tasks (campaign_id);

-- Volunteers assigned / opted-in to campaigns.
CREATE TABLE IF NOT EXISTS public.campaign_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  volunteer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, volunteer_user_id)
);

CREATE INDEX IF NOT EXISTS campaign_volunteers_campaign_idx ON public.campaigns (id);
CREATE INDEX IF NOT EXISTS campaign_volunteers_user_idx ON public.campaign_volunteers (volunteer_user_id);

ALTER TABLE public.campaign_volunteers ENABLE ROW LEVEL SECURITY;

-- ── Public read policies (guests + authenticated) ──────────────────────────

DROP POLICY IF EXISTS campaigns_select_public ON public.campaigns;
CREATE POLICY campaigns_select_public ON public.campaigns
  FOR SELECT TO anon, authenticated
  USING (status = 'active' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS campaign_updates_select_public ON public.campaign_updates;
CREATE POLICY campaign_updates_select_public ON public.campaign_updates
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS campaign_resources_select_public ON public.campaign_resources;
CREATE POLICY campaign_resources_select_public ON public.campaign_resources
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS campaign_volunteers_select_public ON public.campaign_volunteers;
CREATE POLICY campaign_volunteers_select_public ON public.campaign_volunteers
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS campaign_volunteers_insert_own ON public.campaign_volunteers;
CREATE POLICY campaign_volunteers_insert_own ON public.campaign_volunteers
  FOR INSERT TO authenticated
  WITH CHECK (volunteer_user_id = auth.uid());

-- Donors can read their own donations.
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS donations_select_own ON public.donations;
CREATE POLICY donations_select_own ON public.donations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.donation_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS donation_tracking_select_auth ON public.donation_tracking;
CREATE POLICY donation_tracking_select_auth ON public.donation_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = donation_tracking.donation_id
        AND d.user_id = auth.uid()
    )
  );

-- ── Sync collected_amount when a donation is paid ──────────────────────────

CREATE OR REPLACE FUNCTION public.sync_campaign_collected_amount(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns c
  SET collected_amount = COALESCE((
    SELECT SUM(d.amount)
    FROM public.donations d
    WHERE d.campaign_id = p_campaign_id
      AND d.payment_status = 'paid'
  ), 0)
  WHERE c.id = p_campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_donations_sync_collected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND NEW.campaign_id IS NOT NULL THEN
    PERFORM public.sync_campaign_collected_amount(NEW.campaign_id);
  END IF;
  IF TG_OP = 'UPDATE'
    AND OLD.campaign_id IS DISTINCT FROM NEW.campaign_id
    AND OLD.payment_status = 'paid'
    AND OLD.campaign_id IS NOT NULL THEN
    PERFORM public.sync_campaign_collected_amount(OLD.campaign_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donations_sync_collected ON public.donations;
CREATE TRIGGER donations_sync_collected
  AFTER INSERT OR UPDATE OF payment_status, amount, campaign_id ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_donations_sync_collected();

-- ── Generate donation tracking code ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_donation_code(p_donation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq int;
  yr text;
BEGIN
  SELECT COUNT(*)::int + 1 INTO seq
  FROM public.donations
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());

  yr := to_char(now(), 'YYYY');
  RETURN 'DON-' || yr || '-' || lpad(seq::text, 6, '0');
END;
$$;

-- ── Public donation tracking lookup by code (no auth required) ───────────

CREATE OR REPLACE FUNCTION public.get_donation_tracking_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'donation', jsonb_build_object(
      'id', d.id,
      'donation_code', d.donation_code,
      'amount', d.amount,
      'donor_name', CASE WHEN d.anonymous THEN 'Anonymous Donor' ELSE d.donor_name END,
      'payment_status', d.payment_status,
      'created_at', d.created_at,
      'campaign_id', d.campaign_id
    ),
    'campaign', jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'location', c.location
    ),
    'tracking', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dt.id,
        'status', dt.status,
        'description', dt.description,
        'proof_url', dt.proof_url,
        'updated_at', dt.updated_at
      ) ORDER BY dt.updated_at ASC)
      FROM public.donation_tracking dt
      WHERE dt.donation_id = d.id
    ), '[]'::jsonb),
    'resources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'resource_type', cr.resource_type,
        'quantity_purchased', cr.quantity_purchased,
        'quantity_distributed', cr.quantity_distributed,
        'purchase_amount', cr.purchase_amount
      ))
      FROM public.campaign_resources cr
      WHERE cr.campaign_id = d.campaign_id
    ), '[]'::jsonb)
  ) INTO result
  FROM public.donations d
  LEFT JOIN public.campaigns c ON c.id = d.campaign_id
  WHERE d.donation_code = p_code
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_donation_tracking_by_code(text) TO anon, authenticated;
