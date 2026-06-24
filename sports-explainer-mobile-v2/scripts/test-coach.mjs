// Unit cases for the PURE Coach's Corner logic (lib/coach.ts). No network / React.
//   npx tsx scripts/test-coach.mjs
import { hasSufficientState, deriveSituationTag, normalizeCoachFull, hasCoachContent } from '../lib/coach.ts';

let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${name}`); };

const base = { homeTeam: 'H', awayTeam: 'A', homeScore: '3', awayScore: '5', statusDetail: '' };

console.log('=== data-sufficiency gate (NOT a hardcoded allowlist — judged on the fields) ===');
{
  check('NFL with down → sufficient', hasSufficientState('nfl', { ...base, sport: 'nfl', down: 3, distance: 2 }));
  check('NFL without down → coming-soon', !hasSufficientState('nfl', { ...base, sport: 'nfl' }));
  check('MLB with count+outs → sufficient', hasSufficientState('mlb', { ...base, sport: 'mlb', balls: 3, strikes: 2, outs: 2 }));
  check('MLB without count → coming-soon', !hasSufficientState('mlb', { ...base, sport: 'mlb', outs: 1 }));
  check('NBA with period+clock → sufficient', hasSufficientState('nba', { ...base, sport: 'nba', period: 4, clock: '2:10' }));
  check('thin sport (soccer) → coming-soon even with a situation object', !hasSufficientState('soccer', { ...base, sport: 'soccer' }));
  check('null situation → coming-soon', !hasSufficientState('nfl', null));
}

console.log('=== situation tag (factual, language-neutral, never invented) ===');
{
  check('NFL uses downDistanceText + possession + red zone',
    deriveSituationTag('nfl', { ...base, sport: 'nfl', downDistanceText: '3rd & 2', possession: 'KC', isRedZone: true }) === '3rd & 2 · KC ball · red zone');
  check('NFL falls back to down+distance when no text',
    deriveSituationTag('nfl', { ...base, sport: 'nfl', down: 4, distance: 1 }) === '4th & 1');
  check('MLB full count special-cased',
    deriveSituationTag('mlb', { ...base, sport: 'mlb', balls: 3, strikes: 2, outs: 2, onBase: '2nd' }) === 'Full count · 2 outs · runners on 2nd');
  check('MLB ordinary count + single out',
    deriveSituationTag('mlb', { ...base, sport: 'mlb', balls: 1, strikes: 0, outs: 1 }) === '1-0 · 1 out');
  check('NBA period + clock; OT labeled',
    deriveSituationTag('nba', { ...base, sport: 'nba', period: 5, clock: '0:45' }) === 'OT1 · 0:45');
}

console.log('=== response normalization + content guard ===');
{
  const n = normalizeCoachFull({ strategicRead: '  why  ', whatItSetsUp: 42 });
  check('strategicRead trimmed; non-string → ""', n.strategicRead === 'why' && n.whatItSetsUp === '');
  check('hasCoachContent: any field → true', hasCoachContent({ strategicRead: 'x', whatItSetsUp: '' }) === true);
  check('hasCoachContent: both empty → false', hasCoachContent({ strategicRead: '', whatItSetsUp: '' }) === false);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
