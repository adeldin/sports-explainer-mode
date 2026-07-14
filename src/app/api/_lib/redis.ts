// One Upstash REST command helper, shared by the entitlement cache and the cap counters.
// Raw REST over fetch (NOT @upstash/redis — that package isn't in package.json and importing it
// would break `next build`); same contract the explanation cache already uses.
//
// THROWS on failure, deliberately. Callers on the hot path must decide what a Redis outage
// means for them — and for cap enforcement the answer is always FAIL OPEN (serve the request).
export async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REST_URL || !REST_TOKEN) throw new Error('upstash not configured');
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
