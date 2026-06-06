-- Track partial fund allocation per donation (enables bulk campaign allocation).

ALTER TABLE public.donation_tracking
  ADD COLUMN IF NOT EXISTS amount numeric;

ALTER TABLE public.donation_tracking
  DROP CONSTRAINT IF EXISTS donation_tracking_amount_positive;

ALTER TABLE public.donation_tracking
  ADD CONSTRAINT donation_tracking_amount_positive
  CHECK (amount IS NULL OR amount > 0);

-- Include amount in public tracking lookup.
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
        'amount', dt.amount,
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
