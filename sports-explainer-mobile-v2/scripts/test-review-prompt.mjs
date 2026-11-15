// Unit cases for the PURE store-rating ask rule (lib/reviewDecision.ts). No React / storage.
//   npx tsx scripts/test-review-prompt.mjs
import { decideReviewAsk, loadReviewRecord, REVIEW_MIN_GAP_DAYS } from '../lib/reviewDecision.ts';

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else fail++; console.log(`  ${cond ? 'PASS' : 'FAIL'} - ${name}`); };
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 15, 12);
const base = {
  pending: true, isFirstSession: false, appVersion: '1.9.1',
  lastAskedAt: null, lastAskedVersion: null, blockedThisSession: false, now: NOW,
};
const run = (over) => decideReviewAsk({ ...base, ...over });

console.log('=== should we ask for a store rating? ===');
{
  const d = run({ isFirstSession: true });
  check('1. first session never asks', !d.ask && d.reason === 'first-session');
}
{
  const d = run({});
  check('2. second session with a pending win asks', d.ask && d.reason === 'ok');
}
{
  const d = run({ pending: false });
  check('3. no pending win never asks', !d.ask && d.reason === 'no-win');
}
{
  // A win marked then cleared by a wrong answer reaches the rule as pending: false.
  let pending = 'five-in-a-row'; pending = null;
  const d = run({ pending: pending !== null });
  check('4. a cleared win never asks', !d.ask && d.reason === 'no-win');
}
{
  const d = run({ lastAskedVersion: '1.9.1', lastAskedAt: NOW - 400 * DAY });
  check('5. same version already asked never asks', !d.ask && d.reason === 'already-asked-this-version');
}
{
  const d = run({ lastAskedVersion: '1.9.0', lastAskedAt: NOW - 30 * DAY });
  check('6. new version but only 30 days since last ask does not ask', !d.ask && d.reason === 'too-soon');
}
{
  const d = run({ lastAskedVersion: '1.9.0', lastAskedAt: NOW - 121 * DAY });
  check('7. new version and 121 days since last ask asks', d.ask);
}
{
  const d = run({ blockedThisSession: true });
  check('8. paywall opened this session does not ask', !d.ask && d.reason === 'paywall-this-session');
}
{
  const d = run({ lastAskedVersion: '1.9.0', lastAskedAt: NOW + 5 * DAY });
  check('9. date moved backwards does not ask', !d.ask && d.reason === 'clock-moved-back');
}
{
  const bad = ['{not json', 'null', '"x"', '{"firstSeenAt":"yesterday"}', '[]'];
  const ok = bad.every((raw) => {
    const r = loadReviewRecord(raw, NOW);
    return r.isFirstSession && r.record.firstSeenAt === NOW && r.record.lastAskedAt === null;
  });
  const d = run({ isFirstSession: loadReviewRecord('{not json', NOW).isFirstSession });
  check('10. damaged record is treated as first session (and never asks)', ok && !d.ask);
}

console.log('=== extra edges ===');
{
  const r = loadReviewRecord(null, NOW);
  check('missing record = first session with a fresh record', r.isFirstSession && r.record.firstSeenAt === NOW);
  const saved = JSON.stringify({ firstSeenAt: NOW - DAY, lastAskedAt: NOW - 200 * DAY, lastAskedVersion: '1.8.0' });
  const r2 = loadReviewRecord(saved, NOW);
  check('good record loads and is not first session', !r2.isFirstSession && r2.record.lastAskedVersion === '1.8.0');
  check('exactly 120 days later asks (gap is "at least 120")',
    run({ lastAskedVersion: '1.9.0', lastAskedAt: NOW - REVIEW_MIN_GAP_DAYS * DAY }).ask);
  check('unknown version still obeys the 120-day rule',
    !run({ appVersion: 'unknown', lastAskedVersion: '1.9.0', lastAskedAt: NOW - 10 * DAY }).ask);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
