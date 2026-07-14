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
