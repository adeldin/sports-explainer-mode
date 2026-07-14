// SERVER-SIDE free-tier caps. The authoritative counters — unlike the client-side ones in
// chrome-extension/caps.js (and the iOS lib/caps.ts), which are cosmetic and trivially bypassed
// by editing local storage. Same NUMBERS, so the experience is identical; the difference is that
// these live in Upstash, keyed by an email derived from a validated session, and cannot be forged.
//
// Keep these limits in sync with chrome-extension/caps.js and sports-explainer-mobile-v2/lib/caps.ts.
import { redisCmd } from './redis';

export const DAILY_FREE = 5;          // free play explanations per local day  (NOT enforced yet)
export const QA_FREE_PER_GAME = 3;    // free follow-up answers per game       (enforced)

// Per-game Q&A counter. Expires after 24h — a game is over long before that, and it keeps the
// keyspace from growing without bound.
const QA_TTL_SECONDS = 86400;
const qaKey = (email: string, gameId: string) => `cap:qa:${email}:${gameId}`;

export interface CapDecision {
  allowed: boolean;
  used: number;
  remaining: number;
}

// Consume one Q&A credit for (email, gameId). Returns allowed:false once the allowance is spent.
//
// INCR is used rather than GET-then-SET because it is ATOMIC: two questions fired concurrently
// can't both read "2 used" and both be let through. The counter keeps climbing on blocked
// attempts, which is harmless (already blocked) and avoids a non-atomic read-modify-write.
//
// THROWS if Redis is unreachable — the caller must catch and fail open.
export async function consumeGameQA(
  email: string,
  gameId: string,
  limit: number = QA_FREE_PER_GAME,
): Promise<CapDecision> {
  const key = qaKey(email, gameId);
  const n = Number(await redisCmd(['INCR', key]));
  // Set the TTL only on first use, so the window doesn't slide forward with every question.
  if (n === 1) await redisCmd(['EXPIRE', key, QA_TTL_SECONDS]);

  if (n > limit) return { allowed: false, used: n, remaining: 0 };
  return { allowed: true, used: n, remaining: Math.max(0, limit - n) };
}

// Non-mutating read — how many Q&A credits are left for this game. Best-effort: on any failure
// it reports a full allowance rather than a spent one (fail open).
export async function gameQARemaining(
  email: string,
  gameId: string,
  limit: number = QA_FREE_PER_GAME,
): Promise<number> {
  try {
    const raw = await redisCmd(['GET', qaKey(email, gameId)]);
    const used = raw == null ? 0 : Number(raw);
    if (!Number.isFinite(used)) return limit;
    return Math.max(0, limit - used);
  } catch {
    return limit;
  }
}

// ── DAILY EXPLANATION CAP ────────────────────────────────────────────────────────────────────
// Unit = a distinct (gameId, playKey) play pulled up today. Re-reading a play you already paid
// for is FREE; a genuinely new play costs a credit.
//
// TIMEZONE: the server has no idea what timezone the user is in, so the day boundary is UTC.
// This differs from the client (chrome-extension/caps.js uses a tz-aware localDateStr), which
// means the client's counter and the server's can disagree about WHEN the day rolls — e.g. a
// user in UTC-8 rolls over at 16:00 local by the server's clock. Consequences, accepted:
//   • The server is authoritative, so a user can never get MORE than 5/day from the server.
//   • The client may show "N left" that disagrees near the boundary. Cosmetic.
// A predictable, consistent server-side boundary beats a forgeable client-supplied timezone.
const DAILY_TTL_SECONDS = 172800;   // 48h — covers the UTC day plus timezone slack on both sides
const dailyKey = (email: string, date: string) => `cap:daily:${email}:${date}`;
const dailyMarkerKey = (email: string, date: string, playKey: string) =>
  `cap:daily:key:${email}:${date}:${playKey}`;

// UTC day. Documented above; deliberately not the caller's local day (unknowable + forgeable).
export function serverDateStr(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);   // YYYY-MM-DD
}

// Play identity, computed by the SERVER from the play text IT resolved from ESPN — never from a
// client-supplied key, and `isRefresh` is ignored entirely (both are trivially forgeable; a
// client claiming "this is only a refresh" could otherwise read unlimited plays for free).
// Same hash as chrome-extension/caps.js playKeyFor, so the two agree on what "the same play" is.
export function playKeyFor(gameId: string, play: string): string {
  const t = String(play || '').trim();
  let h = 0;
  for (let i = 0; i < t.length; i++) { h = ((h << 5) - h + t.charCodeAt(i)) | 0; }
  return `${gameId}|${h}`;
}

export type DailyOutcome = 'charged' | 'reread' | 'blocked';
export interface DailyDecision extends CapDecision {
  outcome: DailyOutcome;
}

// Charge one daily explanation credit for (email, date, playKey).
//
// ORDER IS LOAD-BEARING — it mirrors evaluateDailyExplanation in caps.ts/caps.js:
//   1. marker exists  → already charged today → serve FREE (a re-read never consumes)
//   2. at the limit   → BLOCK, and do NOT set the marker (an uncharged play stays uncharged,
//                       so it can be charged tomorrow rather than being silently "owned")
//   3. otherwise      → INCR the counter, SET the marker, serve
//
// THROWS if Redis is unreachable — the caller must catch and fail open.
export async function consumeDailyExplanation(
  email: string,
  date: string,
  playKey: string,
  limit: number = DAILY_FREE,
): Promise<DailyDecision> {
  const cKey = dailyKey(email, date);
  const mKey = dailyMarkerKey(email, date, playKey);

  // 1. Already charged today → free re-read. Never touches the counter.
  const seen = await redisCmd(['EXISTS', mKey]);
  if (Number(seen) === 1) {
    const usedRaw = await redisCmd(['GET', cKey]);
    const used = usedRaw == null ? 0 : Number(usedRaw);
    return { allowed: true, used, remaining: Math.max(0, limit - used), outcome: 'reread' };
  }

  // 2/3. Atomic charge. INCR (not GET-then-SET) so two concurrent new plays can't both read
  // "4 used" and both slip through.
  const n = Number(await redisCmd(['INCR', cKey]));
  if (n === 1) await redisCmd(['EXPIRE', cKey, DAILY_TTL_SECONDS]);

  if (n > limit) {
    // Over the limit. Two things happen here:
    //   • The marker is deliberately NOT set — this play was never paid for, so it stays
    //     chargeable tomorrow rather than being silently "owned".
    //   • The INCR is rolled back with a DECR, so the counter settles at exactly `limit` instead
    //     of climbing with every blocked retry. Without this, `used`/`remaining` would drift and
    //     any "N left today" indicator built on the counter would be wrong.
    // The DECR is race-safe: below the limit nothing blocks, and at the limit nothing charges,
    // so a rollback can never cancel a legitimate concurrent charge.
    await redisCmd(['DECR', cKey]);
    return { allowed: false, used: limit, remaining: 0, outcome: 'blocked' };
  }

  await redisCmd(['SET', mKey, '1', 'EX', DAILY_TTL_SECONDS]);
  return { allowed: true, used: n, remaining: Math.max(0, limit - n), outcome: 'charged' };
}

// Non-mutating read — explanations left today. Fail open (reports a full allowance on error).
export async function dailyRemaining(
  email: string,
  date: string,
  limit: number = DAILY_FREE,
): Promise<number> {
  try {
    const raw = await redisCmd(['GET', dailyKey(email, date)]);
    const used = raw == null ? 0 : Number(raw);
    if (!Number.isFinite(used)) return limit;
    return Math.max(0, limit - used);
  } catch {
    return limit;
  }
}
