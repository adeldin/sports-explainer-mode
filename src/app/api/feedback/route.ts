import { NextRequest, NextResponse } from 'next/server';

// Feedback endpoint — a one-tap "I learned something" signal from the explanation cards. DELIBERATELY
// INDEPENDENT of the situation cache: feedback must be written even when the cache is OFF
// (CACHE_ENABLED unset). So this route does NOT import cacheSet/redisCmd from explanationCache (those
// are kill-switch-gated / module-private) — it talks to the SAME Upstash DB via its OWN raw REST fetch,
// reading the Upstash env vars directly. Best-effort: a failed write never breaks the client (always 200).

// CORS — identical to /api/explain and /api/leaderboard so the mobile client reaches it the same way.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Light sanitizer for key segments (keep keys browsable + colon-delimited, non-colliding).
const slug = (s: string): string => s.replace(/[:\s]+/g, '-').slice(0, 60);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    // Read Upstash env DIRECTLY — NOT through the cache module (which would no-op when CACHE_ENABLED
    // is off). Missing env → degrade to a no-op 200 (never throw, never break the client).
    const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!REST_URL || !REST_TOKEN) {
      return NextResponse.json({ ok: false }, { headers: corsHeaders });
    }

    const sport = String((body as any).sport ?? 'unknown');
    const playKey = String((body as any).playKey ?? 'none');
    // v1 is a one-tap POSITIVE signal: default true; accept an explicit false for a future thumbs-down.
    const helpful = (body as any).helpful === false ? false : true;

    const date = new Date().toISOString().slice(0, 10);              // YYYY-MM-DD (UTC)
    const rand = Math.random().toString(36).slice(2, 8);            // 6 chars — collision avoidance only
    const key = `fb:${date}:${slug(sport)}:${slug(playKey)}:${rand}`;
    const value = JSON.stringify({
      sport,
      level: (body as any).level ?? null,
      language: (body as any).language ?? null,
      gameId: (body as any).gameId ?? null,
      playKey,
      playType: (body as any).playType ?? null,
      gameContext: (body as any).gameContext ?? null,
      helpful,
      ts: Date.now(),
    });

    // Raw Upstash REST command (POST a JSON command array with a Bearer token) — UNGATED.
    const cmd = (c: (string | number)[]) =>
      fetch(REST_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
        cache: 'no-store',
      });

    // Durable record (30-day TTL so feedback persists long enough to read but doesn't accumulate forever).
    const setRes = await cmd(['SET', key, value, 'EX', 2592000]);
    if (!setRes.ok) throw new Error(`upstash ${setRes.status}`);

    // Glanceable daily tap counter — best-effort; a counter miss must not flip the record's success.
    try { await cmd(['INCR', `fb:count:${date}`]); } catch { /* record already stored */ }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch {
    // Best-effort: ANY failure (bad JSON, network, non-2xx Upstash) still returns 200 — never break the client.
    return NextResponse.json({ ok: false }, { headers: corsHeaders });
  }
}
