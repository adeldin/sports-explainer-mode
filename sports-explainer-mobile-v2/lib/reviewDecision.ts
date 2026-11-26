// Store rating ask: PURE decision logic (no React / AsyncStorage / StoreReview), so the
// "should we ask now?" rule is unit-testable in isolation (same pattern as lib/caps.ts).
// The runtime side (memory flags, storage, the system sheet) lives in lib/reviewPrompt.ts.
// Tested by scripts/test-review-prompt.mjs.

export const REVIEW_MIN_GAP_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

// What we keep on the phone under the AsyncStorage key 'review_prompt'.
export interface ReviewRecord {
  firstSeenAt: number;              // ms epoch of the first launch we saw
  lastAskedAt: number | null;       // ms epoch of our last ask (null = never)
  lastAskedVersion: string | null;  // app version of our last ask
}

export interface ReviewAskInput {
  pending: boolean;             // a win was marked and not cleared since
  isFirstSession: boolean;      // this cold start created (or repaired) the record
  appVersion: string;           // e.g. '1.9.1' ('unknown' if missing)
  lastAskedAt: number | null;
  lastAskedVersion: string | null;
  blockedThisSession: boolean;  // the paywall opened this session
  now: number;                  // ms epoch, injected for determinism
}

export type ReviewAskReason =
  | 'ok'
  | 'no-win'
  | 'first-session'
  | 'paywall-this-session'
  | 'already-asked-this-version'
  | 'too-soon'
  | 'clock-moved-back';

export interface ReviewAskDecision { ask: boolean; reason: ReviewAskReason }

export function decideReviewAsk(i: ReviewAskInput): ReviewAskDecision {
  if (!i.pending) return { ask: false, reason: 'no-win' };
  if (i.isFirstSession) return { ask: false, reason: 'first-session' };
  if (i.blockedThisSession) return { ask: false, reason: 'paywall-this-session' };
  if (i.lastAskedVersion !== null && i.lastAskedVersion === i.appVersion) {
    return { ask: false, reason: 'already-asked-this-version' };
  }
  if (i.lastAskedAt !== null) {
    if (i.now < i.lastAskedAt) return { ask: false, reason: 'clock-moved-back' };
    if (i.now - i.lastAskedAt < REVIEW_MIN_GAP_DAYS * DAY_MS) return { ask: false, reason: 'too-soon' };
  }
  return { ask: true, reason: 'ok' };
}

// Read the saved record at startup. Missing OR damaged → first session, with a fresh record
// to write back (so the user becomes eligible from the next cold start).
export function loadReviewRecord(raw: string | null, now: number): { record: ReviewRecord; isFirstSession: boolean } {
  const fresh = { record: { firstSeenAt: now, lastAskedAt: null, lastAskedVersion: null }, isFirstSession: true };
  if (raw == null) return fresh;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || typeof p.firstSeenAt !== 'number' || !Number.isFinite(p.firstSeenAt)) return fresh;
    const lastAskedAt = typeof p.lastAskedAt === 'number' && Number.isFinite(p.lastAskedAt) ? p.lastAskedAt : null;
    const lastAskedVersion = typeof p.lastAskedVersion === 'string' ? p.lastAskedVersion : null;
    return { record: { firstSeenAt: p.firstSeenAt, lastAskedAt, lastAskedVersion }, isFirstSession: false };
  } catch {
    return fresh;
  }
}
