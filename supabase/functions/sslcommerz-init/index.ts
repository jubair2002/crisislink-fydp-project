import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleOptions, jsonResponse, sslBaseUrl } from '../_shared/sslcommerz.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const campaignId = String(body.campaign_id ?? '');
    const amount = Number(body.amount);
    const donorInfo = body.donor_info ?? {};

    if (!campaignId || !amount || amount < 10) {
      return jsonResponse({ error: 'Invalid campaign or amount' }, 400);
    }

    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, title, status')
      .eq('id', campaignId)
      .maybeSingle();

    if (campErr || !campaign || campaign.status !== 'active') {
      return jsonResponse({ error: 'Campaign not available for donations' }, 400);
    }

    const tranId = `CL${Date.now()}${crypto.randomUUID().slice(0, 8)}`;
    const donorName = String(donorInfo.name ?? 'Donor');
    const anonymous = Boolean(donorInfo.anonymous);
    const userId = donorInfo.user_id ? String(donorInfo.user_id) : null;

    const { data: donation, error: insErr } = await supabase
      .from('donations')
      .insert({
        campaign_id: campaignId,
        amount,
        donor_name: donorName,
        anonymous,
        user_id: userId,
        payment_method: 'sslcommerz',
        transaction_id: tranId,
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (insErr || !donation) {
      return jsonResponse({ error: insErr?.message ?? 'Could not create donation' }, 500);
    }

    const baseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const storeId = Deno.env.get('SSLCOMMERZ_STORE_ID') ?? '';
    const storePass = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') ?? '';

    if (!storeId || !storePass) {
      return jsonResponse({ error: 'SSLCommerz credentials not configured' }, 500);
    }

    const returnBase = `${baseUrl}/functions/v1/sslcommerz-return`;
    const form = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePass,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${returnBase}?status=success&donation_id=${donation.id}`,
      fail_url: `${returnBase}?status=fail&donation_id=${donation.id}`,
      cancel_url: `${returnBase}?status=cancel&donation_id=${donation.id}`,
      ipn_url: `${baseUrl}/functions/v1/sslcommerz-ipn`,
      cus_name: anonymous ? 'Anonymous' : donorName,
      cus_email: 'donor@crisislink.app',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: campaign.title ?? 'Campaign Donation',
      product_category: 'Donation',
      product_profile: 'general',
    });

    const sslRes = await fetch(`${sslBaseUrl()}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const sslData = await sslRes.json();

    if (sslData.status !== 'SUCCESS' || !sslData.GatewayPageURL) {
      await supabase.from('donations').update({ payment_status: 'failed' }).eq('id', donation.id);
      return jsonResponse(
        { error: sslData.failedreason ?? 'SSLCommerz session creation failed' },
        400,
      );
    }

    return jsonResponse({
      payment_url: sslData.GatewayPageURL,
      donation_id: donation.id,
      transaction_id: tranId,
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
