import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Resolve a session token → email via Upstash (same store the auth endpoints use).
async function sessionToEmail(session: string): Promise<string | null> {
  const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REST_URL || !REST_TOKEN) return null;
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', `auth:session:${session}`]),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: unknown };
  return typeof json?.result === 'string' ? json.result : null;
}

// Look up the 'pro' entitlement for an app_user_id (= email) in RevenueCat.
async function checkPro(email: string): Promise<{ isPro: boolean; isTrial: boolean }> {
  const SECRET = process.env.REVENUECAT_SECRET_KEY;
  if (!SECRET) throw new Error('REVENUECAT_SECRET_KEY missing');

  // app_user_id is the email; URL-encode it for the path.
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(email)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    },
  );

  // A subscriber with no purchases still returns 200 with empty entitlements.
  // A 404 means RevenueCat has never seen this app_user_id → treat as not-pro.
  if (res.status === 404) return { isPro: false, isTrial: false };
  if (!res.ok) throw new Error(`revenuecat ${res.status}`);

  const data = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date?: string | null; period_type?: string }> };
  };

  const pro = data?.subscriber?.entitlements?.pro;
  if (!pro) return { isPro: false, isTrial: false };

  // Active if no expiry (lifetime) or expiry is in the future.
  const now = Date.now();
  const expiresMs = pro.expires_date ? Date.parse(pro.expires_date) : null;
  const active = expiresMs === null || expiresMs > now;
  const isTrial = String(pro.period_type || '').toLowerCase() === 'trial';

  return { isPro: active, isTrial: active && isTrial };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = String((body as { session?: unknown }).session ?? '').trim();
    if (!session) {
      return NextResponse.json({ isPro: false, signedIn: false }, { headers: corsHeaders });
    }

    const email = await sessionToEmail(session);
    if (!email) {
      // Session invalid/expired → not signed in.
      return NextResponse.json({ isPro: false, signedIn: false }, { headers: corsHeaders });
    }

    const { isPro, isTrial } = await checkPro(email);
    return NextResponse.json(
      { isPro, isTrial, signedIn: true, email },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('entitlement error', err);
    // On error, fail closed (isPro:false) but report signedIn unknown so the client can retry.
    return NextResponse.json(
      { isPro: false, signedIn: true, error: 'check_failed' },
      { headers: corsHeaders },
    );
  }
}
