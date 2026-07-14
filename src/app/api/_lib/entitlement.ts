// Shared entitlement primitives: session token → email → RevenueCat 'pro' lookup.
//
// Lifted VERBATIM from /api/entitlement/route.ts (no behavior change) so a second caller —
// /api/explain, for server-side cap enforcement — can ask "is this caller Pro?" without
// duplicating the logic or re-implementing the RevenueCat contract.
//
// This lives in `_lib` because the App Router treats a leading-underscore folder as PRIVATE:
// it is excluded from routing, so nothing here is ever reachable as an HTTP endpoint.
//
// The security property both callers depend on: the email is DERIVED from a validated session,
// never taken from the client. A caller can only ever resolve their own entitlement.

export interface Entitlement {
  isPro: boolean;
  isTrial: boolean;
}

// Resolve a session token → email via Upstash (same store the auth endpoints use).
export async function sessionToEmail(session: string): Promise<string | null> {
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
export async function checkPro(email: string): Promise<Entitlement> {
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
