import { NextRequest, NextResponse } from 'next/server';
import { redisCmd } from '../_lib/redis';
import { FEATURES, PLATFORMS } from './features';

// Anonymous feature-use counter. The apps send { f: <feature name>, p: <platform> } and nothing
// else; we add 1 to today's tally for that pair. No user id, device id, IP or header is read,
// stored or logged. Like /api/feedback this only needs the Upstash connection (it does NOT
// depend on the CACHE_ENABLED explanation-cache switch). Best-effort: a database failure
// returns 200 { ok: false } so the app never notices.
//
// Storage: one hash per UTC day, key use:v1:YYYY-MM-DD, field "<feature>|<platform>",
// kept 120 days. GET ?days=N (1..120, default 28) reads the tallies back; &format=text gives a
// plain table summed over the period.

// CORS: identical to /api/feedback so the mobile client reaches it the same way.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FEATURE_SET = new Set(FEATURES);
const PLATFORM_SET = new Set(PLATFORMS);
const KEY_PREFIX = 'use:v1:';
const TTL_SECONDS = 10368000; // 120 days
const DAY_MS = 86400000;

const dayKey = (d: Date) => `${KEY_PREFIX}${d.toISOString().slice(0, 10)}`;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  // Parse only f and p. Everything else in the body is ignored and never stored.
  let f: unknown;
  let p: unknown;
  try {
    const body = (await req.json()) as Record<string, unknown> | null;
    f = body?.f;
    p = body?.p;
  } catch {
    // Bad JSON: same quiet 200 { ok: false } as the feedback route.
    return NextResponse.json({ ok: false }, { headers: corsHeaders });
  }
  // Unknown feature or platform: refused, nothing written.
  if (typeof f !== 'string' || typeof p !== 'string' || !FEATURE_SET.has(f) || !PLATFORM_SET.has(p)) {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }

  try {
    const key = dayKey(new Date());
    const n = await redisCmd(['HINCRBY', key, `${f}|${p}`, 1]);
    // First count of this field today: (re)arm the 120-day expiry. Most counts cost 1 command.
    if (Number(n) === 1) await redisCmd(['EXPIRE', key, TTL_SECONDS]);
    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch {
    // Database keys missing or Upstash down: counting pauses, the app never notices.
    return NextResponse.json({ ok: false }, { headers: corsHeaders });
  }
}

type Row = { date: string; feature: string; platform: string; count: number };

// Upstash REST returns HGETALL as a flat [field, value, field, value, ...] array.
function parseHash(result: unknown): [string, number][] {
  if (Array.isArray(result)) {
    const out: [string, number][] = [];
    for (let i = 0; i + 1 < result.length; i += 2) out.push([String(result[i]), Number(result[i + 1])]);
    return out;
  }
  if (result && typeof result === 'object') {
    return Object.entries(result as Record<string, unknown>).map(([k, v]) => [k, Number(v)]);
  }
  return [];
}

function textTable(from: string, to: string, rows: Row[]): string {
  const totals = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const t = totals.get(r.feature) ?? Object.fromEntries(PLATFORMS.map(pl => [pl, 0]));
    t[r.platform] = (t[r.platform] ?? 0) + r.count;
    totals.set(r.feature, t);
  }
  const lines = [...totals.entries()]
    .map(([feature, t]) => ({ feature, t, total: PLATFORMS.reduce((s, pl) => s + (t[pl] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total || a.feature.localeCompare(b.feature));
  const w = Math.max(22, ...lines.map(l => l.feature.length)) + 2;
  const cols = [...PLATFORMS, 'total'];
  const head = 'feature'.padEnd(w) + cols.map(c => c.padStart(10)).join('');
  const body = lines.map(l =>
    l.feature.padEnd(w) + [...PLATFORMS.map(pl => l.t[pl] ?? 0), l.total].map(n => String(n).padStart(10)).join(''),
  );
  return [
    `SportsWise feature use, ${from} to ${to} (UTC days)`,
    head,
    ...(body.length ? body : ['(no counts in this period)']),
    '',
    'Counts are app sessions that opened a feature (once per session), not people and not taps.',
  ].join('\n') + '\n';
}

export async function GET(req: NextRequest) {
  const headers = { ...corsHeaders, 'Cache-Control': 'no-store' };
  const params = req.nextUrl.searchParams;
  const raw = parseInt(params.get('days') ?? '28', 10);
  const days = Math.min(120, Math.max(1, Number.isFinite(raw) ? raw : 28));
  const asText = params.get('format') === 'text';

  const now = Date.now();
  const dates = Array.from({ length: days }, (_, i) => new Date(now - (days - 1 - i) * DAY_MS));
  const from = dates[0].toISOString().slice(0, 10);
  const to = dates[dates.length - 1].toISOString().slice(0, 10);

  try {
    const results = await Promise.all(dates.map(d => redisCmd(['HGETALL', dayKey(d)])));
    const rows: Row[] = [];
    results.forEach((res, i) => {
      const date = dates[i].toISOString().slice(0, 10);
      for (const [field, count] of parseHash(res)) {
        const [feature, platform] = field.split('|');
        if (feature && platform && Number.isFinite(count)) rows.push({ date, feature, platform, count });
      }
    });
    if (asText) {
      return new NextResponse(textTable(from, to, rows), {
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return NextResponse.json({ from, to, rows }, { headers });
  } catch {
    if (asText) {
      return new NextResponse(`SportsWise feature use, ${from} to ${to} (UTC days)\n(counter unavailable)\n`, {
        status: 503,
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return NextResponse.json({ ok: false, from, to, rows: [] }, { status: 503, headers });
  }
}
