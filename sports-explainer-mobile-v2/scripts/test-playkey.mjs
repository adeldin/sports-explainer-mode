// Unit cases for derivePlayKey (Step D Phase 2 — new-play detection). No network.
//   npx tsx scripts/test-playkey.mjs
import { derivePlayKey } from '../lib/playKey.ts';

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = got === want; (ok ? pass++ : fail++);
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

console.log('=== identity prefers the ESPN play text ===');
eq('rawPlay present → rawPlay (trimmed)',
  derivePlayKey('  Kyle Tucker strikes out swinging.  ', 'Strikeout'),
  'Kyle Tucker strikes out swinging.');
eq('rawPlay absent → playType',
  derivePlayKey(undefined, 'Strikeout'), 'Strikeout');
eq('empty / whitespace rawPlay → falls back to playType',
  derivePlayKey('   ', 'Home Run'), 'Home Run');
eq('neither usable → empty string',
  derivePlayKey(undefined, undefined), '');
eq('playType trimmed too',
  derivePlayKey('', '  Goal  '), 'Goal');

console.log('=== same play vs. new play (the clear/persist decision) ===');
{
  // Same play, two refreshes → identical keys → answers PERSIST.
  const k1 = derivePlayKey('Mahomes pass deep to Kelce for 22 yards.', 'Pass');
  const k2 = derivePlayKey('Mahomes pass deep to Kelce for 22 yards.', 'Pass');
  eq('same play text → equal key (persist through 60s refresh)', k1 === k2, true);
  // Genuinely new play → different key → answers CLEAR.
  const k3 = derivePlayKey('Mahomes kneels to run out the clock.', 'Rush');
  eq('different play text → different key (fresh play, fresh card)', k1 !== k3, true);
  // rugby/MLR limitation: no rawPlay + constant playType → constant key (answers persist).
  const r1 = derivePlayKey(undefined, 'Live game in progress');
  const r2 = derivePlayKey(undefined, 'Live game in progress');
  eq('constant playType, no rawPlay → constant key (accepted rugby/MLR limitation)', r1 === r2, true);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
