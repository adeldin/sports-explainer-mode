// Throwaway Gate-A harness for lib/soccerPulse.ts — hand-built scenarios (no live game available).
// Run: npx tsx scripts/test-soccerPulse.ts
import { computeSoccerPulse, detectTrigger } from '../lib/soccerPulse';
import { MatchEvent } from '../lib/matchTimeline';

const HOME = 'Spain';
const AWAY = 'France';
const g = (minute: number, type: string, team: string, detail = ''): MatchEvent => ({ minute, type, team, detail });

interface Scenario { name: string; events: MatchEvent[]; score: { home: number; away: number }; minute: number; expect: string }

const scenarios: Scenario[] = [
  {
    name: '1) 0-0 at 62, both subbing',
    events: [g(60, 'Substitution', HOME), g(61, 'Substitution', AWAY), g(62, 'Substitution', HOME)],
    score: { home: 0, away: 0 }, minute: 62,
    expect: 'tactical chess, level, HIGH leverage (late level game), low confidence (rests on subs), sub-trigger',
  },
  {
    name: '2) Home 1-0, away RED at 58',
    events: [g(30, 'Goal', HOME), g(58, 'Red Card', AWAY)],
    score: { home: 1, away: 0 }, minute: 58,
    expect: 'man advantage + protecting the lead, high confidence, high leverage, red-card trigger',
  },
  {
    name: '3) Home 1-0 at 84, away made 2 subs',
    events: [g(30, 'Goal', HOME), g(78, 'Substitution', AWAY), g(82, 'Substitution', AWAY)],
    score: { home: 1, away: 0 }, minute: 84,
    expect: 'late one-goal + desperation chase + game management, France chasing, extreme leverage',
  },
  {
    name: '4) 1-1 at 88, yellow to home',
    events: [g(20, 'Goal', HOME), g(40, 'Goal', AWAY), g(87, 'Yellow Card', HOME)],
    score: { home: 1, away: 1 }, minute: 88,
    expect: 'tied late + endgame approaching, medium confidence, booking-trigger',
  },
  {
    name: '5) Away misses penalty at 70, down 0-1',
    events: [g(25, 'Goal', HOME), g(70, 'Missed Penalty', AWAY)],
    score: { home: 1, away: 0 }, minute: 70,
    expect: 'missed-penalty swing, one-goal game (France chasing), missed-pen trigger',
  },
  {
    name: '6) Home 3-0 at 75',
    events: [g(20, 'Goal', HOME), g(40, 'Goal', HOME), g(60, 'Goal', HOME)],
    score: { home: 3, away: 0 }, minute: 75,
    expect: 'two-goal-plus cushion, LOW leverage despite late, milestone-trigger',
  },
  {
    name: '7) Early goal at 8 (home 1-0), now 10',
    events: [g(8, 'Goal', HOME)],
    score: { home: 1, away: 0 }, minute: 10,
    expect: 'opening exchanges + early goal, low leverage, goal-trigger',
  },
  {
    name: '8) Home 1-0, HOME red at 70 (leading but a man down), now 75',
    events: [g(30, 'Goal', HOME), g(70, 'Red Card', HOME)],
    score: { home: 1, away: 0 }, minute: 75,
    expect: 'protecting with 10 (leading short-handed), man advantage to away, high confidence',
  },
];

for (const s of scenarios) {
  const p = computeSoccerPulse(s.events, s.score, s.minute, HOME, AWAY);
  const trig = detectTrigger(s.events, s.minute, p);
  console.log('\n' + '─'.repeat(92));
  console.log(s.name + `   [${HOME} ${s.score.home}-${s.score.away} ${AWAY}, ${s.minute}']`);
  console.log('  expect      :', s.expect);
  console.log('  phase       :', p.gamePhase, '| scoreState:', p.scoreState, '| leverage:', p.leverage, '| confidence:', p.confidence);
  console.log('  manpower    :', `home ${p.manpower.home} / away ${p.manpower.away} (${p.manpower.state})`, p.manpower.redCardMinute != null ? `redMin ${p.manpower.redCardMinute}` : '');
  console.log('  discipline  :', `Y home ${p.discipline.homeYellows} / away ${p.discipline.awayYellows}`, '| reds:', JSON.stringify(p.discipline.reds));
  console.log('  subPosture  :', p.substitutionPosture ?? '(none)');
  console.log('  derivedTags :', p.derivedTags.length ? p.derivedTags.join(', ') : '(none)');
  console.log('  recentEvents:', p.recentEvents.map(e => `${e.minute}'${e.type}(${e.team})`).join('  '));
  console.log('  TRIGGER     :', trig.triggered ? `YES → ${trig.reason}` : 'no');
}
console.log('\n' + '─'.repeat(92));
console.log('knownLimitations (constant):', computeSoccerPulse([], { home: 0, away: 0 }, 1, HOME, AWAY).knownLimitations.join(' · '));
