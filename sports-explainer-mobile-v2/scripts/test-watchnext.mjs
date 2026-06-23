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

console.log('=== 7. excludeCurrentSport (Trigger B "Live Now" — cross-sport discovery) ===');
{
  // World Cup current with nothing live in-sport: a World Cup (same parent) candidate must
  // NOT be recommended back — the confirmed bug. excludeCurrentSport drops the whole soccer
  // parent (worldcup/soccer/epl/laliga), leaving cross-sport discovery.
  const fixed = selectWatchNext(
    [c('worldcup', 'live', { id: 'wc' }), c('nba', 'live', { id: 'nba' })],
    'worldcup', '', NOW, true);
  check('B: World Cup current → does NOT recommend World Cup (bug fix)', fixed?.gameId === 'nba');
  // Whole soccer parent excluded — epl/laliga dropped alongside worldcup.
  const allSoccerGone = selectWatchNext(
    [c('epl', 'live', { id: 'epl' }), c('laliga', 'live', { id: 'laliga' }), c('mlb', 'live', { id: 'mlb' })],
    'worldcup', '', NOW, true);
  check('B: entire soccer parent excluded (epl/laliga too) → picks MLB', allSoccerGone?.gameId === 'mlb');
  // Only same-parent candidates left + excludeCurrentSport → null (no card).
  const noneLeft = selectWatchNext([c('laliga', 'live', { id: 'laliga' })], 'epl', '', NOW, true);
  check('B: only same-parent candidates + exclude → null (no card)', noneLeft === null);
  // Contrast — Trigger A (excludeCurrentSport=false, the default) keeps same-sport.
  const sameKept = selectWatchNext(
    [c('laliga', 'live', { id: 'laliga' }), c('nba', 'live', { id: 'nba' })], 'epl', 'f', NOW, false);
  check('A: same-parent NOT excluded (default) → La Liga still wins', sameKept?.gameId === 'laliga');
}

console.log('=== 8. Q1 split — scheduled game, sport with vs. without a live game ===');
{
  // B1: pre-game in a sport that HAS a live game → excludeCurrentSport=false, exclude only
  // the scheduled game by id → the same-sport live game is the pick (most useful).
  const withLive = selectWatchNext(
    [c('mlb', 'live', { id: 'mlbLive' }), c('mlb', 'upcoming', { id: 'sched', startMin: 90 })],
    'mlb', 'sched', NOW, false);
  check('B1: pre-game + same-sport live → points at the live MLB game', withLive?.gameId === 'mlbLive');
  // B2: pre-game in a sport with NO live game → excludeCurrentSport=true → cross-sport.
  const noLive = selectWatchNext(
    [c('mlb', 'upcoming', { id: 'sched', startMin: 90 }), c('nba', 'live', { id: 'nba' })],
    'mlb', '', NOW, true);
  check('B2: pre-game + no same-sport live → cross-sport (NBA)', noLive?.gameId === 'nba');
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
