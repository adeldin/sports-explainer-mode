// Unit cases for the PURE selectWatchNext (Step C, Logic gate). No network.
//   npx tsx scripts/test-watchnext.mjs
import { selectWatchNext, UPCOMING_SOON_WINDOW, parentSport } from '../lib/watchNext.ts';

const NOW = 1_700_000_000_000; // fixed injected "now"
const MIN = 60_000;
let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${name}`); };

// candidate factory
let n = 0;
const c = (sport, status, opts = {}) => ({
  sport, status,
  gameId: opts.id ?? `g${++n}`,
  homeTeam: opts.home ?? 'H', awayTeam: opts.away ?? 'A',
  startTime: NOW + (opts.startMin ?? (status === 'live' ? -30 : 60)) * MIN,
  statusLabel: status === 'live' ? 'LIVE' : 'Scheduled',
});

console.log('=== 1. same-sport LIVE beats different-sport LIVE ===');
{
  const pick = selectWatchNext(
    [c('nba', 'live', { id: 'nba1' }), c('mlb', 'live', { id: 'mlb1' })],
    'mlb', 'finished', NOW);
  check('finished MLB → picks the MLB live game, not the NBA one', pick?.gameId === 'mlb1');
}

console.log('=== 2. UPCOMING respects the window ===');
{
  const outside = selectWatchNext([c('mlb', 'upcoming', { startMin: 200 })], 'mlb', 'f', NOW); // >180m
  check('upcoming beyond the 3h window, nothing live → null', outside === null);
  const inside = selectWatchNext([c('mlb', 'upcoming', { id: 'soon', startMin: 60 })], 'mlb', 'f', NOW);
  check('upcoming within the window → picked', inside?.gameId === 'soon');
  check('window constant is 3h', UPCOMING_SOON_WINDOW === 3 * 60 * MIN);
}

console.log('=== 3. exclusions (finished game) + dedup note ===');
{
  const pick = selectWatchNext(
    [c('mlb', 'live', { id: 'F1' }), c('mlb', 'live', { id: 'G2' })], 'mlb', 'F1', NOW);
  check('the just-finished game is excluded from its own pool', pick?.gameId === 'G2');
  console.log('  NOTE — phantom-duplicate dedup is upstream in fetchScoreboard (order-independent');
  console.log('         team-pair grouping, already device-verified); WatchCandidate[] arrives deduped.');
}

console.log('=== 4. empty pool → null (no card) ===');
{
  check('no candidates → null', selectWatchNext([], 'mlb', 'f', NOW) === null);
  check('only out-of-window upcoming, nothing live → null',
    selectWatchNext([c('nba', 'upcoming', { startMin: 500 })], 'mlb', 'f', NOW) === null);
}

console.log('=== 5. deterministic tiebreak (live first, soonest start, stable SPORT_ORDER) ===');
{
  // two same-sport live games, different start times → soonest start wins; stable across runs
  const pool = [
    c('mlb', 'live', { id: 'late', startMin: -10 }),
    c('mlb', 'live', { id: 'early', startMin: -90 }),
  ];
  const a = selectWatchNext(pool, 'mlb', 'f', NOW);
  const b = selectWatchNext([...pool].reverse(), 'mlb', 'f', NOW);
  check('soonest startTime wins within tier', a?.gameId === 'early');
  check('order-independent / deterministic (same pick regardless of input order)', a?.gameId === b?.gameId);
  // same tier + same startTime, different sport → SPORT_ORDER decides (mlb before nhl)
  const t = NOW - 20 * MIN;
  const byOrder = selectWatchNext(
    [{ ...c('nhl', 'live', { id: 'nhl' }), startTime: t }, { ...c('mlb', 'live', { id: 'mlb' }), startTime: t }],
    'nfl', 'f', NOW); // finished NFL so neither is same-sport → both tier 2, tie on time
  check('stable SPORT_ORDER tiebreak (mlb ranks before nhl)', byOrder?.gameId === 'mlb');
}

console.log('=== 6. parent-sport grouping — same parent across league keys = same-sport ===');
{
  // EPL just finished; La Liga live should beat a true different-sport (NBA) live.
  const soccer = selectWatchNext(
    [c('nba', 'live', { id: 'nba' }), c('laliga', 'live', { id: 'laliga' })], 'epl', 'f', NOW);
  check('EPL→La Liga ranks as SAME sport (soccer), beats NBA discovery', soccer?.gameId === 'laliga');
  // NBA just finished; WNBA live = same parent (basketball), beats MLB.
  const hoops = selectWatchNext(
    [c('mlb', 'live', { id: 'mlb' }), c('wnba', 'live', { id: 'wnba' })], 'nba', 'f', NOW);
  check('NBA→WNBA ranks as SAME sport (basketball), beats MLB discovery', hoops?.gameId === 'wnba');
  // URC just finished; MLR live = same parent (rugby), beats NFL.
  const rug = selectWatchNext(
    [c('nfl', 'live', { id: 'nfl' }), c('mlr', 'live', { id: 'mlr' })], 'rugby', 'f', NOW);
  check('URC→MLR ranks as SAME sport (rugby), beats NFL discovery', rug?.gameId === 'mlr');
  check('parentSport sanity: epl/laliga/soccer/worldcup → soccer',
    ['epl', 'laliga', 'soccer', 'worldcup'].every(s => parentSport(s) === 'soccer'));
  check('parentSport sanity: rugby/mlr → rugby, nba/wnba → basketball, mlb → mlb',
    parentSport('rugby') === 'rugby' && parentSport('mlr') === 'rugby' &&
    parentSport('nba') === 'basketball' && parentSport('wnba') === 'basketball' &&
    parentSport('mlb') === 'mlb');
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
