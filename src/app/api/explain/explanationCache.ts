// Situation-keyed explanation cache. Imported by route.ts on two paths: live-explain (keyed by a
// soccer/MLB situation signature) and Q&A (keyed by a normalized question). Gated by the CACHE_ENABLED
// master kill-switch (default OFF → fully inert). Best-effort throughout: any cache failure, missing
// config, or the switch being off degrades to a normal cache MISS — the live read path is never blocked.
//
// Backing store: Upstash Redis via its REST API over `fetch` (NOT the @upstash/redis SDK — that
// package isn't in package.json and importing it would break `next build`; the REST API needs no
// dependency and has identical GET / SET-EX semantics). Lazily used from two env vars; absent → the
// module is in DISABLED mode (every op is a no-op / miss, logged once per cold start).
//
// Type-only import of the situation shapes (mirrors gumboEnricher.ts / highlightlyEnricher.ts) so
// there's no runtime coupling to dataProvider.
import type { NormalizedGameData, MatchEvent } from './dataProvider';

// Path-specific key namespaces. Bump a namespace whenever THAT path's cached prompt / key scheme
// changes — old keys are then abandoned (never read again) and TTL out, no manual migration.
//   ASK_NS     — bump when the Q&A ('ask') prompt changes.
//   EXPLAIN_NS — bump when the cached live-explain teaching prompt changes.
export const ASK_NS = 'v1';        // unchanged — preserves the proven v1:ask:* keys
export const EXPLAIN_NS = 'v2';    // bumped from v1 — abandons the team-named v1:explain:* entries

// --- Config (read once; the REST client is just these two strings + fetch) ---
const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const isEnabled = (): boolean => !!(REST_URL && REST_TOKEN);

// MASTER KILL-SWITCH (default OFF). One env var gates the ENTIRE cache system: reads, writes, AND —
// via cacheIsEnabled() at the call site — the generic-teaching prompt flag. Unset / not '1' → every
// cacheGet is a miss and every cacheSet a no-op BEFORE any Upstash call (zero reads/writes/latency/
// cost), and forCache stays false → every explanation is vivid + named + live (today's behavior).
// Set CACHE_ENABLED=1 in Vercel prod to activate caching + situation reuse + generic teaching together.
const CACHE_ENABLED = process.env.CACHE_ENABLED === '1';
export function cacheIsEnabled(): boolean { return CACHE_ENABLED; }

// Debug logging — silent unless CACHE_DEBUG=1. Replaces the temporary inline [cache] console.logs.
const CACHE_DEBUG = process.env.CACHE_DEBUG === '1';
export function cacheLog(...args: unknown[]): void { if (CACHE_DEBUG) console.log(...args); }

// In-memory hit/miss counters (per warm instance), for a future admin read — no endpoint yet.
let cacheHits = 0;
let cacheMisses = 0;
export function getCacheStats(): { hits: number; misses: number } { return { hits: cacheHits, misses: cacheMisses }; }

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
  if (!CACHE_ENABLED) return null;                         // master kill-switch: miss before any Upstash call
  if (!isEnabled()) { warnDisabledOnce(); return null; }   // 2nd safety net: env-absent disabled mode
  try {
    const r = await redisCmd(['GET', key]);
    if (r == null) { cacheMisses++; return null; }
    cacheHits++;
    return String(r);
  } catch (e) {
    warnFailureOnce(e);
    cacheMisses++;                                          // a failed lookup is a miss to the caller
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!CACHE_ENABLED) return;                              // master kill-switch: no-op before any Upstash call
  if (!isEnabled()) { warnDisabledOnce(); return; }        // 2nd safety net: env-absent disabled mode
  try {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    await redisCmd(['SET', key, value, 'EX', ttl]);
  } catch (e) {
    warnFailureOnce(e);
  }
}

// Best-effort DELETE — the seam the future feedback button uses to blacklist a bad cached entry.
// Unused today. Mirrors cacheSet: kill-switch + disabled-mode guards, swallows all errors.
export async function cacheDelete(key: string): Promise<void> {
  if (!CACHE_ENABLED) return;
  if (!isEnabled()) { warnDisabledOnce(); return; }
  try {
    await redisCmd(['DEL', key]);
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

// Live-explain cache key. `sig` comes from soccerSig (or the future MLB sig). EXPLAIN_NS-prefixed so a
// teaching-prompt / scheme change abandons old keys cleanly (v2 abandons the team-named v1 entries).
export function explainKey(p: { sport: string; level: string; lang: string; sig: string }): string {
  return `${EXPLAIN_NS}:explain:${p.sport}:${p.level}:${p.lang}:${p.sig}`;
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
  return `${ASK_NS}:ask:${p.sport}:${p.level}:${p.lang}:${p.normQuestion.replace(/ /g, '_')}`;
}
