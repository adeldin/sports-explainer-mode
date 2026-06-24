// Free-tier caps — PURE decision logic (no React / RevenueCat / AsyncStorage), so the
// counting + reset rules are unit-testable in isolation (mirrors lib/playKey, lib/watchNext).
// Two caps with DIFFERENT reset units:
//   • explanation cap — per LOCAL DAY, unit = a distinct (gameId, playKey) play actively
//     pulled up. Re-reading the same play, switching back to the same current play, and the
//     60s same-play auto-refresh all reuse an already-counted key → free. A genuinely new
//     play (advanced playKey) counts as new — intended.
//   • Q&A cap — per GAME (gameId), counts each new follow-up answer (chip OR typed).
// Pro/trial bypasses both (callers pass isPro: true). `now`/`today`/keys are injected for
// determinism — no Date.now() / UTC in here (the local-day string comes from the caller's
// tz-safe localDateStr, avoiding the prior UTC day-rollover bug).

export const DAILY_FREE = 5;          // free play explanations per local day
export const QA_FREE_PER_GAME = 3;    // free follow-up answers per game

export interface DailyCapState { date: string; count: number; keys: string[] }
export const EMPTY_DAILY: DailyCapState = { date: '', count: 0, keys: [] };

export interface GameCapState { gameId: string; count: number }
export const EMPTY_GAME: GameCapState = { gameId: '', count: 0 };

export interface CapDecision<S> {
  allowed: boolean;   // proceed (render the play / fetch the answer) vs. block → paywall
  nextState: S;       // the state to persist after this decision
  remaining: number;  // free uses left AFTER this decision (Infinity for Pro)
}

// The per-(gameId, playKey) key for the daily cap.
export const explanationKey = (gameId: string, playKey: string): string => `${gameId}|${playKey}`;

// Daily explanation cap. `isRefresh` = the 60s auto-refresh (never counts). A key already
// counted today is a free re-read. Rolls the day when `today` differs from the stored date.
export function evaluateDailyExplanation(
  state: DailyCapState,
  today: string,
  key: string,
  opts: { isPro: boolean; isRefresh: boolean; limit?: number },
): CapDecision<DailyCapState> {
  const limit = opts.limit ?? DAILY_FREE;
  const base: DailyCapState = state.date === today ? state : { date: today, count: 0, keys: [] };
  if (opts.isPro) return { allowed: true, nextState: base, remaining: Infinity };
  if (opts.isRefresh) return { allowed: true, nextState: base, remaining: Math.max(0, limit - base.count) };
  if (base.keys.includes(key)) {
    return { allowed: true, nextState: base, remaining: Math.max(0, limit - base.count) }; // free re-read
  }
  if (base.count >= limit) {
    return { allowed: false, nextState: base, remaining: 0 };                              // blocked → paywall
  }
  const nextState: DailyCapState = { date: today, count: base.count + 1, keys: [...base.keys, key] };
  return { allowed: true, nextState, remaining: Math.max(0, limit - nextState.count) };
}

// Per-game Q&A cap. Resets the count when the game changes (fresh allowance per game).
export function evaluateGameQA(
  state: GameCapState,
  gameId: string,
  opts: { isPro: boolean; limit?: number },
): CapDecision<GameCapState> {
  const limit = opts.limit ?? QA_FREE_PER_GAME;
  const base: GameCapState = state.gameId === gameId ? state : { gameId, count: 0 };
  if (opts.isPro) return { allowed: true, nextState: base, remaining: Infinity };
  if (base.count >= limit) return { allowed: false, nextState: base, remaining: 0 };       // blocked → paywall
  const nextState: GameCapState = { gameId, count: base.count + 1 };
  return { allowed: true, nextState, remaining: Math.max(0, limit - nextState.count) };
}

// Non-mutating "how many free uses left" reads, for the subtle indicators (Pro → Infinity).
export function dailyRemaining(state: DailyCapState, today: string, isPro: boolean, limit = DAILY_FREE): number {
  if (isPro) return Infinity;
  const count = state.date === today ? state.count : 0;
  return Math.max(0, limit - count);
}
export function gameQARemaining(state: GameCapState, gameId: string, isPro: boolean, limit = QA_FREE_PER_GAME): number {
  if (isPro) return Infinity;
  const count = state.gameId === gameId ? state.count : 0;
  return Math.max(0, limit - count);
}
