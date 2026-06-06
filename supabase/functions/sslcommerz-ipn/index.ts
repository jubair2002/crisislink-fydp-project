import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleOptions, jsonResponse, validateSslCommerzPayment } from '../_shared/sslcommerz.ts';

async function finalizeDonation(
  supabase: ReturnType<typeof createClient>,
  tranId: string,
  valId: string,
  validation: Record<string, unknown>,
) {
  const status = String(validation.status ?? '');
  const isValid = status === 'VALID' || status === 'VALIDATED';

  const { data: donation } = await supabase
    .from('donations')
    .select('id, payment_status, campaign_id, donation_code')
    .eq('transaction_id', tranId)
    .maybeSingle();

  if (!donation) return { ok: false, reason: 'Donation not found' };

  if (donation.payment_status === 'paid') {
    return { ok: true, duplicate: true, donation_id: donation.id };
  }

  if (!isValid) {
    await supabase
      .from('donations')
      .update({ payment_status: 'failed', validation_id: valId })
      .eq('id', donation.id);
    return { ok: false, reason: 'Validation failed' };
  }

  const { data: codeData } = await supabase.rpc('generate_donation_code', {
    p_donation_id: donation.id,
  });
  const donationCode = String(codeData ?? '');

  await supabase
    .from('donations')
    .update({
      payment_status: 'paid',
      validation_id: valId,
      donation_code: donationCode,
    })
    .eq('id', donation.id);

  const { count } = await supabase
    .from('donation_tracking')
    .select('id', { count: 'exact', head: true })
    .eq('donation_id', donation.id);

  if (!count) {
    await supabase.from('donation_tracking').insert({
      donation_id: donation.id,
      status: 'Received',
      description: 'Donation received and confirmed via SSLCommerz.',
      updated_at: new Date().toISOString(),
    });
  }

  return { ok: true, donation_id: donation.id, donation_code: donationCode };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const contentType = req.headers.get('content-type') ?? '';
    let payload: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((v, k) => {
        payload[k] = v;
      });
    } else if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((v, k) => {
        payload[k] = v;
      });
    }

    const tranId = String(payload.tran_id ?? '');
    const valId = String(payload.val_id ?? '');

    if (!tranId || !valId) {
      return jsonResponse({ error: 'Missing tran_id or val_id' }, 400);
    }

    const validation = (await validateSslCommerzPayment(valId)) as Record<string, unknown>;

    if (String(validation.tran_id ?? '') !== tranId) {
      return jsonResponse({ error: 'Transaction mismatch' }, 400);
    }

    const result = await finalizeDonation(supabase, tranId, valId, validation);
    return jsonResponse(result);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
