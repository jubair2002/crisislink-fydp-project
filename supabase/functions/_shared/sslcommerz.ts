const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function sslBaseUrl() {
  return Deno.env.get('SSLCOMMERZ_BASE_URL') ?? 'https://sandbox.sslcommerz.com';
}

export async function validateSslCommerzPayment(valId: string) {
  const storeId = Deno.env.get('SSLCOMMERZ_STORE_ID') ?? '';
  const storePass = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') ?? '';
  const url =
    `${sslBaseUrl()}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePass)}&v=1&format=json`;

  const res = await fetch(url);
  return res.json();
}
