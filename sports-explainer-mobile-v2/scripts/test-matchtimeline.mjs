// Unit cases for the PURE Match Timeline shaping (lib/matchTimeline.ts). No network / React.
//   npx tsx scripts/test-matchtimeline.mjs
import { sortEvents, eventIcon, isGoal, hasEvents } from '../lib/matchTimeline.ts';

let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${name}`); };

console.log('=== sortEvents: chronological by minute, no-minute events last ===');
{
  const raw = [
    { minute: 51, type: 'Yellow Card', player: 'C' },
    { minute: 12, type: 'Goal', player: 'A' },
    { type: 'Substitution', player: 'N' },       // no minute → last
    { minute: 34, type: 'Goal', player: 'B' },
  ];
  const s = sortEvents(raw);
  check('order is 12, 34, 51, then the no-minute event', s.map(e => e.player).join(',') === 'A,B,C,N');
  check('does not mutate the input', raw[0].minute === 51);
  check('empty input → empty', sortEvents([]).length === 0);
}

console.log('=== eventIcon: type → icon (case-insensitive; unknown → neutral dot) ===');
{
  check('Goal → ⚽', eventIcon('Goal') === '⚽');
  check('yellow card (lowercase) → 🟨', eventIcon('yellow card') === '🟨');
  check('Red Card → 🟥', eventIcon('Red Card') === '🟥');
  check('Substitution → 🔁', eventIcon('Substitution') === '🔁');
  check('Missed Penalty → ❌', eventIcon('Missed Penalty') === '❌');
  check('unknown type → •', eventIcon('VAR Review') === '•');
  check('undefined type → •', eventIcon(undefined) === '•');
}

console.log('=== isGoal + hasEvents ===');
{
  check('isGoal true for Goal (any case)', isGoal('goal') === true && isGoal('Goal') === true);
  check('isGoal false for cards', isGoal('Yellow Card') === false);
  check('hasEvents: non-empty → true', hasEvents([{ type: 'Goal' }]) === true);
  check('hasEvents: empty/undefined → false', hasEvents([]) === false && hasEvents(undefined) === false);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
