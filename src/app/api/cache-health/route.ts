import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, cacheIsEnabled } from '../explain/explanationCache';

export const dynamic = 'force-dynamic';

// Cache health, and the heartbeat that keeps the database from being deleted.
//
// TWO JOBS, both learned the hard way.
//
// 1. KEEPALIVE. Upstash deletes free databases after 14 DAYS WITHOUT A SINGLE COMMAND, and that is
//    exactly what killed the last one: CACHE_ENABLED was never switched on, so the app never issued
//    a command, so the database went idle and was swept. Nobody noticed for weeks, because a missing
//    cache fails open and simply costs money and latency in silence. This app does ~5 commands a day
//    of real traffic (83 in the first 11 days, many of them test calls), which is not reliably enough
//    to stay warm through a quiet fortnight. A daily cron hit guarantees it.
//
// 2. HEALTH CHECK. Previously the only way to tell whether caching worked was to ask the live app the
//    same question twice and compare the answers — two model calls to learn one boolean. This reports
//    it directly: round-trips a value through Redis and says what actually happened.
//
// Safe to expose: it writes one key under its own name, returns no secrets, and reveals nothing about
// any user. `disabled` and `unreachable` are deliberately distinguished — they look identical from
// outside the app, and confusing them cost real time.
export async function GET() {
  const startedAt = Date.now();
  if (!cacheIsEnabled()) {
    return NextResponse.json(
      { ok: true, cache: 'disabled', detail: 'CACHE_ENABLED is not set to 1' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const key = 'health:heartbeat';
  const stamp = new Date().toISOString();
  await cacheSet(key, stamp, 172800);        // 48h TTL — always refreshed long before it expires
  const readBack = await cacheGet(key);
  const roundTripMs = Date.now() - startedAt;
  const healthy = readBack === stamp;
  return NextResponse.json(
    {
      ok: healthy,
      cache: healthy ? 'alive' : 'unreachable',
      roundTripMs,
      // Present only on success, so a failure cannot be mistaken for one.
      ...(healthy ? { wroteAndRead: stamp } : { detail: 'write succeeded but read-back did not match — Redis is unreachable or the credentials are wrong' }),
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
