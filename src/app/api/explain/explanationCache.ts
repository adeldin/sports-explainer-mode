// Situation-keyed explanation cache (Gate 1 — module only, NOTHING imports this yet → zero behavior
// change, safe first deploy). Two paths will use it later: live-explain (keyed by a soccer/MLB
// situation signature) and Q&A (keyed by a normalized question). Best-effort throughout: any cache
// failure or missing config degrades to a normal cache MISS — the live read path is never blocked.
//
// Backing store: Upstash Redis via its REST API over `fetch` (NOT the @upstash/redis SDK — that
// package isn't in package.json and importing it would break `next build`; the REST API needs no
// dependency and has identical GET / SET-EX semantics). Lazily used from two env vars; absent → the
// module is in DISABLED mode (every op is a no-op / miss, logged once per cold start).
//
// Type-only import of the situation shapes (mirrors gumboEnricher.ts / highlightlyEnricher.ts) so
// there's no runtime coupling to dataProvider.
import type { NormalizedGameData, MatchEvent } from './dataProvider';

// Bump this when a key format / bucketing scheme changes — old keys are abandoned, not migrated.
export const CACHE_NS = 'v1';

// --- Config (read once; the REST client is just these two strings + fetch) ---
const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const isEnabled = (): boolean => !!(REST_URL && REST_TOKEN);

// Log each class of problem at most once per cold start (module-level flags).
let warnedDisabled = false;
let warnedFailure = false;
function warnDisabledOnce(): void {
  if (warnedDisabled) return;
  warnedDisabled = true;
  console.warn('[explanationCache] DISABLED — UPSTASH_REDIS_REST_URL/TOKEN not set; all ops are misses/no-ops.');
}
function warnFailureOnce(e: unknown): void {
  if (warnedFailure) return;
  warnedFailure = true;
  console.error('[explanationCache] cache op failed (further failures suppressed this instance):', e);
}

// One Upstash REST command (e.g. ['GET', key] or ['SET', key, val, 'EX', 60]) → its `result`.
// POST a JSON command array to the base URL with a Bearer token (Upstash REST contract).
async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(REST_URL as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json?.result ?? null;
}

// --- I/O ops: best-effort, never throw (get → null on any failure; set → no-op on any failure) ---
export async function cacheGet(key: string): Promise<string | null> {
  if (!isEnabled()) { warnDisabledOnce(); return null; }
  try {
    const r = await redisCmd(['GET', key]);
    return r == null ? null : String(r);
  } catch (e) {
    warnFailureOnce(e);
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!isEnabled()) { warnDisabledOnce(); return; }
  try {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    await redisCmd(['SET', key, value, 'EX', ttl]);
  } catch (e) {
    warnFailureOnce(e);
  }
}

// --- Pure key-builders (no I/O) ------------------------------------------------------------------

// §2b helper — PHASE BUCKET (soccer match minute → phase). Exact thresholds per §2b. A null/<=0
// minute (unknown or start-of-match) folds into 'early' — no separate 'pre' label.
function phaseBucket(minute: number | null): string {
  if (minute == null || minute <= 15) return 'early';
  if (minute <= 45) return 'first';
  if (minute <= 70) return 'second';
  if (minute <= 85) return 'late';
  return 'closing';
}

// §2b helper — SCORE STATE, from the EVENT TEAM's perspective (match-agnostic → reusable across
// games): lead2plus | lead1 | level | trail1 | trail2plus. FALLBACK (unknown perspective OR
// unparseable score) collapses to the neutral 'level' bucket — no separate label vocabulary.
function scoreState(home: string, away: string, eventIsHome: boolean | null): string {
  const h = parseInt(home, 10);
  const a = parseInt(away, 10);
  if (!Number.isFinite(h) || !Number.isFinite(a) || eventIsHome == null) return 'level';
  const diff = eventIsHome ? h - a : a - h; // from the event team's perspective
  if (diff === 0) return 'level';
  if (diff >= 2) return 'lead2plus';
  if (diff === 1) return 'lead1';
  if (diff === -1) return 'trail1';
  return 'trail2plus';
}

// Build a soccer situation signature for the cache key. Returns null when there is NO usable last
// event — that signals "don't cache this read" (no stable situation to key on).
export function soccerSig(enriched: NormalizedGameData): string | null {
  const events: MatchEvent[] = enriched.events ?? [];
  const last = events.length ? events[events.length - 1] : null;
  if (!last || !last.type) return null; // no usable last event → don't cache

  const minute = typeof last.minute === 'number'
    ? last.minute
    : events.reduce((m, e) => Math.max(m, e.minute ?? 0), 0);

  const eventIsHome: boolean | null = last.team
    ? (last.team === enriched.homeTeam ? true : (last.team === enriched.awayTeam ? false : null))
    : null;
  // Explicit FOURTH component (§2b): which side the event concerns — kept SEPARATE from the
  // relative score so "your team's red card" vs "their team's red card" don't collapse to one key.
  const side: string = last.team
    ? (last.team === enriched.homeTeam ? 'home' : last.team === enriched.awayTeam ? 'away' : 'none')
    : 'none';

  const phase = phaseBucket(minute);
  const score = scoreState(enriched.homeScore, enriched.awayScore, eventIsHome);
  const type = String(last.type).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${score}|${phase}|${type}|${side}`;
}

// Live-explain cache key. `sig` comes from soccerSig (or the future MLB sig). CACHE_NS-prefixed so a
// scheme change abandons old keys cleanly.
export function explainKey(p: { sport: string; level: string; lang: string; sig: string }): string {
  return `${CACHE_NS}:explain:${p.sport}:${p.level}:${p.lang}:${p.sig}`;
}

// Normalize a user-typed Q&A question so trivially-different phrasings collide: lowercase, strip
// accents, drop punctuation, collapse whitespace, trim. (The raw question is NOT cleaned anywhere in
// the request path today — this is where it gets normalized for keying.)
export function normalizeQuestion(q: string): string {
  return (q ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Q&A cache key from the normalized question.
export function askKey(p: { sport: string; level: string; lang: string; normQuestion: string }): string {
  return `${CACHE_NS}:ask:${p.sport}:${p.level}:${p.lang}:${p.normQuestion.replace(/ /g, '_')}`;
}
