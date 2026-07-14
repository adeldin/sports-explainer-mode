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

// Who is making this request? The ONE shape the enforcement decision consumes.
//   hasSession false → an ANONYMOUS caller (the iOS app sends no session). Never enforced;
//                      behaves exactly as it does today. This is the presence-based exemption.
//   hasSession true, signedIn false → a session was sent but is invalid/expired.
//   hasSession true, signedIn true  → a real user; isPro decides whether caps apply.
export interface Caller {
  hasSession: boolean;
  signedIn: boolean;
  email: string | null;
  isPro: boolean;
  isTrial: boolean;
  /** true when the lookup itself failed (network/RevenueCat down) — callers should FAIL OPEN. */
  degraded: boolean;
}

export const ANONYMOUS: Caller = {
  hasSession: false, signedIn: false, email: null, isPro: false, isTrial: false, degraded: false,
};

// --- Session→entitlement cache -------------------------------------------------------------
// /api/explain is a HOT path (the extension polls it every 30s per viewer). Resolving a caller
// costs an Upstash GET + a RevenueCat GET; doing that on every poll would add latency to every
// explanation AND hammer RevenueCat's rate limits. So the resolved entitlement is cached in
// Upstash under its own namespace, keyed by the session token.
//
// TTL is deliberately SHORT (5 min): it bounds how long a just-purchased user could still be
// seen as Free by the server. The client already force-refreshes its own entitlement on return
// from checkout, so the visible UI flips instantly; this only bounds the SERVER's view.
const ENT_CACHE_TTL = 300; // seconds
const entKey = (session: string) => `ent:session:${session}`;

async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REST_URL || !REST_TOKEN) return null;
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json?.result ?? null;
}

// Resolve the caller behind a request. NEVER throws — on any failure it returns a `degraded`
// caller so the hot path can fail OPEN (serve the request) rather than blocking a paying user
// because RevenueCat had a bad minute.
export async function resolveCaller(session: string | undefined | null): Promise<Caller> {
  const tok = typeof session === 'string' ? session.trim() : '';
  if (!tok) return ANONYMOUS;                       // ← the iOS app + web: untouched, always.

  try {
    // Cache hit → skip both network hops.
    const cached = await redisCmd(['GET', entKey(tok)]);
    if (typeof cached === 'string') {
      try {
        const c = JSON.parse(cached) as Partial<Caller>;
        return {
          hasSession: true,
          signedIn: !!c.signedIn,
          email: typeof c.email === 'string' ? c.email : null,
          isPro: !!c.isPro,
          isTrial: !!c.isTrial,
          degraded: false,
        };
      } catch {
        // corrupt cache value → fall through to a live lookup
      }
    }

    const email = await sessionToEmail(tok);
    if (!email) {
      // Session invalid/expired. Cached too — an expired token would otherwise re-hit Upstash
      // on every single poll.
      const miss: Caller = {
        hasSession: true, signedIn: false, email: null, isPro: false, isTrial: false, degraded: false,
      };
      await redisCmd(['SET', entKey(tok), JSON.stringify(miss), 'EX', ENT_CACHE_TTL]).catch(() => {});
      return miss;
    }

    const { isPro, isTrial } = await checkPro(email);
    const caller: Caller = { hasSession: true, signedIn: true, email, isPro, isTrial, degraded: false };
    await redisCmd(['SET', entKey(tok), JSON.stringify(caller), 'EX', ENT_CACHE_TTL]).catch(() => {});
    return caller;
  } catch (e) {
    // Upstash or RevenueCat failed. FAIL OPEN: report degraded and let the caller serve the
    // request. Under-enforcing for a few minutes beats blocking a Pro user during an outage.
    console.error('[entitlement] resolveCaller failed (failing open):', e);
    return { hasSession: true, signedIn: false, email: null, isPro: false, isTrial: false, degraded: true };
  }
}

// Invalidate a session's cached entitlement (e.g. right after a purchase). Best-effort.
export async function invalidateCallerCache(session: string): Promise<void> {
  try { await redisCmd(['DEL', entKey(session)]); } catch { /* best-effort */ }
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
