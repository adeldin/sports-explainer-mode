// chrome-extension/caps.js
// Ported VERBATIM from iOS sports-explainer-mobile-v2/lib/caps.ts so caps stay identical across
// surfaces. Changing a number here should be mirrored in the app (and vice versa).
//
// Two caps with DIFFERENT reset units:
//   • explanation cap — per LOCAL DAY, unit = a distinct (gameId, playKey) play actively pulled up.
//     Re-reading the same play, switching back to it, and the auto-refresh all reuse an
//     already-counted key → free. A genuinely new play counts as new — intended.
//   • Q&A cap — per GAME (gameId), counts each new follow-up answer (chip OR typed).
// Pro/trial bypasses both (callers pass isPro: true). The evaluators are PURE: `today` and the
// keys are injected by the caller, never read from the clock in here (same as the app).
(function() {

  const DAILY_FREE = 5;         // free play explanations per local day
  const QA_FREE_PER_GAME = 3;   // free follow-up answers per game

  // Seed states for first run (mirrors EMPTY_DAILY / EMPTY_GAME in caps.ts).
  const EMPTY_DAILY = { date: '', count: 0, keys: [] };
  const EMPTY_GAME = { gameId: '', count: 0 };

  // Caller helper (the app's lives in appState.tsx, NOT caps.ts — kept out of the evaluators so
  // they stay pure). Local-day string, tz-safe: never UTC, or the day rolls at the wrong hour.
  function localDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Play identity: re-reading the SAME play (or the auto-refresh) must NOT consume a credit.
  // The iOS unit is (gameId, playKey) via derivePlayKey(rawPlay, playType). The extension has NO
  // rawPlay in the response — only response.simple (the explanation text) and response.playType.
  // Derive the key from the CONTENT (response.simple), NOT playType alone: two different plays can
  // share a playType ("run"), which would wrongly free a genuinely new play. Hash simple; fall
  // back to playType if simple is empty.
  function playKeyFor(gameId, simple, playType) {
    const t = String(simple || playType || '').trim();
    let h = 0;
    for (let i = 0; i < t.length; i++) { h = ((h << 5) - h + t.charCodeAt(i)) | 0; }
    return `${gameId}|${h}`;
  }

  // Daily explanation evaluator — mirrors evaluateDailyExplanation.
  // state: { date, count, keys: [] }
  function evaluateDailyExplanation(state, today, key, opts) {
    const isPro = !!(opts && opts.isPro);
    const isRefresh = !!(opts && opts.isRefresh);
    // Nullish (not ||) so an explicit limit of 0 is honored rather than falling back to 5.
    const limit = (opts && opts.limit != null) ? opts.limit : DAILY_FREE;

    // Roll the day.
    const base = (state && state.date === today)
      ? { date: state.date, count: state.count || 0, keys: state.keys || [] }
      : { date: today, count: 0, keys: [] };

    if (isPro) return { allowed: true, nextState: base, remaining: Infinity };

    // Order matters: isRefresh means "don't CONSUME a count," NOT "skip the gate." So the
    // already-counted (free) and over-limit (block) checks come FIRST — otherwise an auto-refresh
    // would render an explanation the cap should block. A refresh only earns the free pass once
    // under the limit on a new play.
    if (base.keys.includes(key)) {
      return { allowed: true, nextState: base, remaining: Math.max(0, limit - base.count) }; // already counted → free (incl. refresh of an owned play)
    }
    if (base.count >= limit) {
      return { allowed: false, nextState: base, remaining: 0 };                              // capped + uncounted key → blocked (refresh too)
    }
    if (isRefresh) {
      return { allowed: true, nextState: base, remaining: Math.max(0, limit - base.count) }; // under limit + refresh + new play → render, don't consume
    }
    const nextState = { date: base.date, count: base.count + 1, keys: [...base.keys, key] };
    return { allowed: true, nextState, remaining: Math.max(0, limit - nextState.count) };
  }

  // Per-game Q&A evaluator — mirrors evaluateGameQA. Resets when the game changes.
  // state: { gameId, count }
  function evaluateGameQA(state, gameId, opts) {
    const isPro = !!(opts && opts.isPro);
    const limit = (opts && opts.limit != null) ? opts.limit : QA_FREE_PER_GAME;

    const base = (state && state.gameId === gameId)
      ? { gameId, count: state.count || 0 }
      : { gameId, count: 0 };

    if (isPro) return { allowed: true, nextState: base, remaining: Infinity };
    if (base.count >= limit) return { allowed: false, nextState: base, remaining: 0 };       // blocked → upsell
    const nextState = { gameId, count: base.count + 1 };
    return { allowed: true, nextState, remaining: Math.max(0, limit - nextState.count) };
  }

  // Non-mutating "how many free uses left" reads, for the subtle indicators (Pro → Infinity).
  function dailyRemaining(state, today, isPro, limit) {
    if (isPro) return Infinity;
    const lim = limit != null ? limit : DAILY_FREE;
    const count = (state && state.date === today) ? (state.count || 0) : 0;
    return Math.max(0, lim - count);
  }
  function gameQARemaining(state, gameId, isPro, limit) {
    if (isPro) return Infinity;
    const lim = limit != null ? limit : QA_FREE_PER_GAME;
    const count = (state && state.gameId === gameId) ? (state.count || 0) : 0;
    return Math.max(0, lim - count);
  }

  // Expose on the isolated-world window for content.js (same pattern as glossary.js).
  window.SE_CAPS = {
    DAILY_FREE, QA_FREE_PER_GAME, EMPTY_DAILY, EMPTY_GAME,
    localDateStr, playKeyFor,
    evaluateDailyExplanation, evaluateGameQA,
    dailyRemaining, gameQARemaining,
  };
})();
