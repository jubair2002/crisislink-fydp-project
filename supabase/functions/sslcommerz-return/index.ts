import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleOptions } from '../_shared/sslcommerz.ts';

function htmlPage(title: string, message: string, donationId: string, status: string) {
  const deepLink = `crisislink://campaigns/payment-success?donationId=${encodeURIComponent(donationId)}&pending=${status === 'success' ? '0' : '1'}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#F8FAFC; color:#0F172A; }
    .card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:32px; max-width:420px; text-align:center; box-shadow:0 10px 30px rgba(15,23,42,.08); }
    h1 { font-size:22px; margin:0 0 8px; }
    p { color:#475569; line-height:1.5; }
    a { display:inline-block; margin-top:20px; background:#2563EB; color:#fff; text-decoration:none; padding:12px 20px; border-radius:12px; font-weight:600; }
  </style>
  <meta http-equiv="refresh" content="2;url=${deepLink}" />
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${deepLink}">Return to CrisisLink</a>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'unknown';
  const donationId = url.searchParams.get('donation_id') ?? '';

  const titles: Record<string, string> = {
    success: 'Payment successful',
    fail: 'Payment failed',
    cancel: 'Payment cancelled',
  };
  const messages: Record<string, string> = {
    success: 'Thank you for your donation. Redirecting you back to the app…',
    fail: 'Your payment could not be completed. Redirecting you back to the app…',
    cancel: 'You cancelled the payment. Redirecting you back to the app…',
  };

  const title = titles[status] ?? 'Payment status';
  const message = messages[status] ?? 'Redirecting you back to the app…';

  return new Response(htmlPage(title, message, donationId, status), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
