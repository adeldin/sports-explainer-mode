// Unit cases for the PURE free-tier caps (lib/caps.ts). No network / React / storage.
//   npx tsx scripts/test-caps.mjs
import {
  DAILY_FREE, QA_FREE_PER_GAME, EMPTY_DAILY, EMPTY_GAME, explanationKey,
  evaluateDailyExplanation, evaluateGameQA, dailyRemaining, gameQARemaining,
} from '../lib/caps.ts';

let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${name}`); };
const TODAY = '2026-06-23', YDAY = '2026-06-22';
const free = { isPro: false, isRefresh: false };

// Helper: run a sequence of (key, opts) through the daily cap, threading nextState.
const runDaily = (steps, start = EMPTY_DAILY, today = TODAY) => {
  let s = start; const out = [];
  for (const [key, opts] of steps) {
    const d = evaluateDailyExplanation(s, today, key, { ...free, ...opts });
    out.push(d); s = d.nextState;
  }
  return { out, state: s };
};

console.log('=== 1. daily: a new (gameId,playKey) counts; re-read is free ===');
{
  const k = explanationKey('g1', 'pA');
  const { out, state } = runDaily([[k, {}], [k, {}], [k, {}]]);
  check('first view of a play → allowed + counted', out[0].allowed && out[0].remaining === DAILY_FREE - 1);
  check('re-reading the SAME (gameId,playKey) → allowed, no extra count', out[1].allowed && out[2].allowed);
  check('count stayed at 1 across re-reads', state.count === 1 && state.keys.length === 1);
}

console.log('=== 2. daily: 60s same-play refresh never counts ===');
{
  const k = explanationKey('g1', 'pA');
  const { out, state } = runDaily([[k, { isRefresh: true }], [k, { isRefresh: true }]]);
  check('refresh allowed but does NOT count', out[0].allowed && out[1].allowed && state.count === 0);
}

console.log('=== 3. daily: an advanced play (new playKey, same game) counts as new ===');
{
  const { state } = runDaily([
    [explanationKey('g1', 'pA'), {}],
    [explanationKey('g1', 'pB'), {}], // play advanced → new key → new count (intended)
  ]);
  check('two distinct plays in one game → count 2', state.count === 2 && state.keys.length === 2);
}

console.log('=== 4. daily: blocks at the 6th distinct play, re-reads still free past the wall ===');
{
  const steps = [];
  for (let i = 0; i < DAILY_FREE; i++) steps.push([explanationKey('g', `p${i}`), {}]); // 5 distinct → all allowed
  const sixthNew = explanationKey('g', 'p9');
  const reread = explanationKey('g', 'p0'); // already counted
  let { out, state } = runDaily(steps);
  check('first 5 distinct plays all allowed', out.every(d => d.allowed) && state.count === DAILY_FREE);
  const blocked = evaluateDailyExplanation(state, TODAY, sixthNew, free);
  check('6th NEW play blocked → paywall, count unchanged', !blocked.allowed && blocked.remaining === 0 && blocked.nextState.count === DAILY_FREE);
  const free6 = evaluateDailyExplanation(state, TODAY, reread, free);
  check('re-reading an already-counted play is free even past the wall', free6.allowed);
}

console.log('=== 5. daily: resets on local-date rollover ===');
{
  const start = { date: YDAY, count: DAILY_FREE, keys: ['x', 'y', 'z', 'a', 'b'] };
  const d = evaluateDailyExplanation(start, TODAY, explanationKey('g', 'pNew'), free);
  check('yesterday at the cap → today allowed + count resets to 1', d.allowed && d.nextState.date === TODAY && d.nextState.count === 1);
}

console.log('=== 6. daily: Pro is unlimited and untracked ===');
{
  const d = evaluateDailyExplanation({ date: TODAY, count: DAILY_FREE, keys: [] }, TODAY, explanationKey('g', 'p'), { isPro: true, isRefresh: false });
  check('Pro at/over the limit → allowed, Infinity remaining', d.allowed && d.remaining === Infinity);
}

console.log('=== 7. Q&A: counts chip+typed up to the per-game limit, then blocks ===');
{
  let s = EMPTY_GAME; const results = [];
  for (let i = 0; i < QA_FREE_PER_GAME + 1; i++) {
    const d = evaluateGameQA(s, 'game1', { isPro: false }); results.push(d); s = d.nextState;
  }
  check('first 3 answers allowed', results.slice(0, 3).every(d => d.allowed));
  check('4th answer blocked → paywall', !results[3].allowed && results[3].remaining === 0);
  check('count capped at the limit', s.count === QA_FREE_PER_GAME);
}

console.log('=== 8. Q&A: resets when the game changes ===');
{
  const atCap = { gameId: 'gameA', count: QA_FREE_PER_GAME };
  const d = evaluateGameQA(atCap, 'gameB', { isPro: false });
  check('new gameId → fresh allowance (allowed, count 1)', d.allowed && d.nextState.gameId === 'gameB' && d.nextState.count === 1);
}

console.log('=== 9. Q&A: Pro unlimited ===');
{
  const d = evaluateGameQA({ gameId: 'g', count: QA_FREE_PER_GAME }, 'g', { isPro: true });
  check('Pro past the per-game limit → allowed, Infinity', d.allowed && d.remaining === Infinity);
}

console.log('=== 10. non-mutating remaining reads (for the indicators) ===');
{
  check('dailyRemaining: fresh day → full', dailyRemaining(EMPTY_DAILY, TODAY, false) === DAILY_FREE);
  check('dailyRemaining: stale date → treated as full (resets)', dailyRemaining({ date: YDAY, count: 5, keys: [] }, TODAY, false) === DAILY_FREE);
  check('dailyRemaining: Pro → Infinity', dailyRemaining({ date: TODAY, count: 3, keys: [] }, TODAY, true) === Infinity);
  check('gameQARemaining: same game → limit - count', gameQARemaining({ gameId: 'g', count: 1 }, 'g', false) === QA_FREE_PER_GAME - 1);
  check('gameQARemaining: different game → full', gameQARemaining({ gameId: 'g', count: 3 }, 'h', false) === QA_FREE_PER_GAME);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
