// Higher or Lower — live-standings fetcher + round builder (Gate 5).
// PURE DATA LIB: zero react-native imports (house convention from readTheScore.ts /
// espnTeams.ts); AsyncStorage is used only as a last-good disk cache so the game
// degrades gracefully offline.
//
// DATA PROVENANCE (build doc §2.4): every number a round shows or compares is
// class (B) — live-fetched from ESPN's keyless /standings route at runtime:
//
//   https://site.api.espn.com/apis/v2/sports/{path}/standings
//   → children[].standings.entries[].{ team, stats[{name, displayValue, value}] }
//
// NOTHING here hardcodes a record, a stat, or a standing. The only authored
// content is class (A) — evergreen RULES of each sport (what a win column means,
// that soccer awards 3 points for a win, that goal difference is the first
// tiebreaker, that an NHL overtime loss still earns a point). That authored
// teaching is the whole reason this is a learning game and not a coin flip.
//
// LEAGUE SOURCES (all probed live with curl on 2026-07-14 — see the table by
// each entry). Rugby and cricket were the fragile ones and BOTH resolve:
//   rugby/164205 (Rugby World Cup)          → 4 pools × 5, full stats + logos ✅
//   rugby/242041 (Super Rugby Pacific)      → 11 teams, full stats + logos ✅
//   rugby/270557 (United Rugby Championship)→ 16 teams (zeroed preseason;
//                                             ?season=prev returns the full
//                                             2025-26 table — verified) ✅
//   rugby/267979 (Gallagher Premiership)    → 0 entries — NOT used ❌
//   cricket/19430 (World Test Championship) → 9 nations, matchPoints etc. ✅
//   cricket/8048 (Indian Premier League)    → 10 teams incl. net run rate ✅
//
// THE OFF-SEASON / EMPTY-TABLE STORY (verified live: soccer/eng.1 and esp.1
// currently return the 2026-27 table with every stat at 0 — an unanswerable
// game). A fetched table that can't tell any two teams apart is "unplayable";
// we then re-request the SAME source with ?season={year-1} (verified working)
// and serve last season's final table instead. If even that fails, the league
// is dropped; if every league drops, the component shows a friendly
// "season hasn't started" state — never a crash, never a blank.
//
// FAILURE STORY (mirrors espnTeams.ts):
//   network OK        → pool cached in-memory for the session + written to disk
//   network fails     → last-good disk pool (any age) is served silently
//   no disk pool      → getStandingsPool rejects → friendly offline/retry state
//   team missing logo → still playable (art shows a placeholder; names carry it)
//   stat missing      → that StatDef is skipped for that league (availability check)
//   two teams tied    → the pair is filtered out — a round is NEVER unanswerable

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Level, Sport } from './api';

// One pool per Academy CATEGORY with league tables. Tennis and golf are
// individual sports (no team standings) — deliberately absent (8, not 10).
export type StandingsSport =
  | 'mlb' | 'nfl' | 'nba' | 'wnba' | 'nhl' | 'soccer' | 'rugby' | 'cricket';

export interface StandingTeam {
  id: string;
  displayName: string;  // "Arizona Diamondbacks" / "New Zealand"
  shortName: string;    // "Diamondbacks" (shortDisplayName)
  abbr: string;         // "ARI"
  logo?: string;        // crest URL (ESPN CDN)
  league: string;       // human league label ("the Premier League")
  // Every numeric stat ESPN returned for this row, keyed by ESPN's stat name.
  // `display` is what the fan sees on a real table ("+44", ".596"); `value` is
  // the comparable number. Both come straight from the payload.
  stats: Record<string, { display: string; value: number }>;
}

export interface StandingsLeague {
  label: string;        // authored evergreen label ("the Premier League")
  season: string;       // from the payload ("2025-26" / "2026") — shown as context
  priorSeason: boolean; // true when the ?season=prev fallback served this table
  // True when this is a FINISHED regular season (a final table), false when it's
  // still in progress. Drives "So far in the … season" vs "In the … (final table)".
  // Clock-free: a season is complete when every team has played the SAME, non-trivial
  // number of games (mid-season the slate is staggered — game 94 vs 98; at the end
  // it's level — all 17 / all 82). Padded ESPN endDates can't tell us this; the games
  // column can. `priorSeason` (the zeroed-fallback table) is always complete.
  seasonComplete: boolean;
  teams: StandingTeam[];
}

// Games a team has played: ESPN's `gamesPlayed` when present, else W+L+T+OTL.
function gamesPlayedOf(t: StandingTeam): number {
  const gp = t.stats['gamesPlayed']?.value;
  if (typeof gp === 'number' && isFinite(gp)) return gp;
  const s = (k: string) => t.stats[k]?.value ?? 0;
  return s('wins') + s('losses') + s('ties') + s('otlosses');
}

// A regular season is complete when every team has played an identical, non-trivial
// slate. The floor (12) rejects the trivially-early all-equal windows (opening day,
// all teams at 0–1) — no major league finishes anywhere near that low, and NFL's
// full 17 clears it. Mid-season the counts differ, so this reads false until the end.
function seasonCompleteFrom(teams: StandingTeam[]): boolean {
  if (teams.length < 2) return false;
  const gps = teams.map(gamesPlayedOf);
  const max = Math.max(...gps);
  return max >= 12 && gps.every(g => g === max);
}

export interface StandingsPool {
  sport: StandingsSport;
  leagues: StandingsLeague[];
}

// ── League sources (paths verified live via curl on 2026-07-14) ─────────────
// Rounds only ever compare two teams FROM THE SAME TABLE — comparing EPL points
// to La Liga points would be nonsense, so multi-source sports keep each league
// separate and the round builder picks one league per round.
const LEAGUE_SOURCES: Record<StandingsSport, { path: string; label: string }[]> = {
  mlb: [{ path: 'baseball/mlb', label: 'MLB' }],
  nfl: [{ path: 'football/nfl', label: 'the NFL' }],
  nba: [{ path: 'basketball/nba', label: 'the NBA' }],
  wnba: [{ path: 'basketball/wnba', label: 'the WNBA' }],
  nhl: [{ path: 'hockey/nhl', label: 'the NHL' }],
  soccer: [
    { path: 'soccer/eng.1', label: 'the Premier League' },
    { path: 'soccer/esp.1', label: 'La Liga' },
  ],
  rugby: [
    { path: 'rugby/164205', label: 'the Rugby World Cup' },
    { path: 'rugby/242041', label: 'Super Rugby Pacific' },
    { path: 'rugby/270557', label: 'the United Rugby Championship' },
  ],
  cricket: [
    { path: 'cricket/19430', label: 'the World Test Championship' },
    { path: 'cricket/8048', label: 'the IPL' },
  ],
};

// League key → standings pool. Mirrors espnTeams' KEY_TO_CREST_SPORT: tennis
// and golf are absent, so their categories never surface this game.
const KEY_TO_STANDINGS_SPORT: Partial<Record<Sport, StandingsSport>> = {
  mlb: 'mlb', nfl: 'nfl', nba: 'nba', wnba: 'wnba', nhl: 'nhl',
  soccer: 'soccer', epl: 'soccer', laliga: 'soccer', worldcup: 'soccer',
  rugby: 'rugby', mlr: 'rugby', nationscup: 'rugby', sixnations: 'rugby', nationschamp: 'rugby',
  cricket: 'cricket',
};

export function standingsSportForKeys(sportKeys: Sport[]): StandingsSport | null {
  for (const k of sportKeys) {
    const s = KEY_TO_STANDINGS_SPORT[k];
    if (s) return s;
  }
  return null;
}

// ── The stat catalog (this is where the TIER LADDER is authored) ────────────
//
// A StatDef is one askable comparison. Its `tier` is the tier the stat BELONGS
// to as a concept: kid = the most obvious column on the table (wins), expert =
// the subtle column an analyst reads first (differential, net run rate). On
// top of the stat ladder, the PAIR GAP is banded by tier in buildRound — kid
// rounds pair teams miles apart on the table, expert rounds pair near-level
// teams — so the difficulty ladder is genuinely two-dimensional.
//
// `teach` composes the teaching beat from the LIVE numbers + evergreen rules —
// the exp: Record<Level, string> pattern from lib/boxCount.ts. Templates say
// "in this table", never "right now": a table may be last season's (priorSeason).

export interface TeachCtx {
  w: StandingTeam;   // the CORRECT answer (per the stat's pick direction)
  l: StandingTeam;   // the other team
  wd: string;        // winner's display value
  ld: string;        // loser's display value
  league: string;
}

export interface StatDef {
  key: string;                 // ESPN stat name in entries[].stats[]
  tier: Level;
  label: string;               // short chip label ("Wins", "Goal difference")
  prompt: string;              // the question ("Which team has more wins?")
  pick: 'higher' | 'lower';    // which value is the correct tap
  teach: (c: TeachCtx) => Record<Level, string>;
}

// Small helper: every teach() returns all four depths (VerdictCard re-explains
// the SAME comparison at any depth via its tabs).
const t4 = (kid: string, beginner: string, intermediate: string, expert: string): Record<Level, string> =>
  ({ kid, beginner, intermediate, expert });

const STAT_DEFS: Record<StandingsSport, StatDef[]> = {
  // ── MLB ── stats verified in payload: wins, losses, winPercent,
  // avgPointsFor/Against (runs per game), pointDifferential (run diff).
  mlb: [
    {
      key: 'wins', tier: 'kid', label: 'Wins', prompt: 'Which team has more wins?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have ${c.wd} wins and the ${c.l.shortName} have ${c.ld}. More wins puts you higher up the standings!`,
        `In this ${c.league} table the ${c.w.shortName} show ${c.wd} in the W column vs ${c.ld} for the ${c.l.shortName}. Baseball plays a huge 162-game season, so win totals climb high — and the W column is the first thing to read on any standings page.`,
        `Wins are the standings' backbone, but in baseball you'll usually hear records as pairs — wins AND losses — because teams can have played different numbers of games. That's also why "games behind" (GB) exists: it converts two records into one distance from first place.`,
        `Raw wins can mislead across divisions: schedules differ in strength, and a 162-game season leaves room for hot streaks to inflate a total. Analysts cross-check the W column against run differential — teams that out-win their differential tend to fall back toward it.`,
      ),
    },
    {
      key: 'losses', tier: 'beginner', label: 'Losses', prompt: 'Which team has LOST fewer games?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} have lost only ${c.wd} games — the ${c.l.shortName} have lost ${c.ld}. Fewer losses is better!`,
        `On a standings page the L column matters as much as the W column. The ${c.w.shortName} (${c.wd} losses) are ahead of the ${c.l.shortName} (${c.ld}) on this measure — in a 162-game season, avoiding losses is exactly as valuable as collecting wins.`,
        `Reading W and L together tells you how much of the schedule each team has played. Two teams with the same wins but different losses are NOT level — the one with fewer losses holds a real edge, which is why standings sort by winning percentage, not raw wins.`,
        `Losses drive the "magic number" math down the stretch: any combination of leader wins and chaser losses that sums past the games remaining clinches the race. That's why a contender's scoreboard-watching cares as much about the rival's L column as its own W.`,
      ),
    },
    {
      key: 'winPercent', tier: 'beginner', label: 'Win %', prompt: 'Which team has the better winning percentage?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} win more often! Their number (${c.wd}) is bigger than the ${c.l.shortName}'s (${c.ld}).`,
        `Winning percentage = wins ÷ games played. ${c.wd} beats ${c.ld} here. A .500 team wins exactly half its games — baseball fans use ".500" as the line between a winning and losing season.`,
        `Percentage beats raw wins for comparing teams that haven't played the same number of games — which in baseball is almost always. It's the column MLB actually sorts standings by, written without the leading zero (.596, not 0.596).`,
        `Elite MLB seasons live around .600 — roughly 97 wins over 162. Because the season is so long, percentages are more stable in baseball than in any other US sport; a .550 team in June is usually genuinely good, not just hot.`,
      ),
    },
    {
      key: 'avgPointsFor', tier: 'intermediate', label: 'Runs per game', prompt: 'Which team scores more runs per game?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} score ${c.wd} runs each game on average — more than the ${c.l.shortName}'s ${c.ld}!`,
        `Runs per game measures a lineup's firepower. The ${c.w.shortName} average ${c.wd} to the ${c.l.shortName}'s ${c.ld} in this table. Around 4.5 runs a game is roughly league-average offense in most seasons.`,
        `Per-game averages let you compare offenses fairly even when games-played differ. But scoring is only half the story — a bad pitching staff can burn any lineup, which is why analysts pair this with runs ALLOWED per game.`,
        `Runs scored and allowed feed the Pythagorean expectation — the classic formula that projects a record from run totals alone. A team scoring plenty but sitting low in the table is usually losing close games, and that tends to correct over a long season.`,
      ),
    },
    {
      key: 'avgPointsAgainst', tier: 'expert', label: 'Runs allowed/game', prompt: 'Which team ALLOWS fewer runs per game?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} let in only ${c.wd} runs a game — the ${c.l.shortName} give up ${c.ld}. Letting in fewer is better!`,
        `Runs allowed per game measures pitching and defense together. The ${c.w.shortName} (${c.wd}) protect their lead better than the ${c.l.shortName} (${c.ld}) — you win by scoring more AND allowing less.`,
        `This column is the quickest health-check on a pitching staff you can do from a standings page — no ERA tables needed. Compare it with the league's typical ~4.5 and you instantly know if a staff is a strength or a liability.`,
        `Run prevention is often more stable year-to-year than run scoring, so sharp readers weight this column when judging whether a surprise team is real. Pair it with runs scored and you've rebuilt run differential — the single best predictor on the page.`,
      ),
    },
    {
      key: 'pointDifferential', tier: 'expert', label: 'Run differential', prompt: 'Which team has the better run differential?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have scored ${c.wd} more runs than they've allowed. That beats the ${c.l.shortName}'s ${c.ld}!`,
        `Run differential = runs scored minus runs allowed, shown with a + or −. ${c.wd} beats ${c.ld}. A positive number means a team usually outscores its opponents even when the win-loss record hasn't caught up yet.`,
        `Differential filters out luck in close games: one-run wins and blowout losses distort a record, but the runs themselves don't lie. When a team's record looks better than its differential, expect a slide; worse, expect a climb.`,
        `This is the analyst's first column: run differential predicts FUTURE record better than the current record does. It's the input to the Pythagorean win expectation, and front offices treat a big gap between actual and expected wins as noise waiting to correct.`,
      ),
    },
  ],

  // ── NFL ── verified: wins, losses, winPercent, pointsFor/Against, pointDifferential.
  nfl: [
    {
      key: 'wins', tier: 'kid', label: 'Wins', prompt: 'Which team has more wins?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have won ${c.wd} games — more than the ${c.l.shortName}'s ${c.ld}. More wins = higher in the standings!`,
        `In this ${c.league} table the ${c.w.shortName} show ${c.wd} wins to the ${c.l.shortName}'s ${c.ld}. An NFL regular season is only 17 games, so every single win moves a team a big step up the table.`,
        `Because the season is so short, NFL standings turn on tiny margins — one or two wins often separate a playoff seed from an early vacation. That's why records are quoted everywhere as W-L (like 14-3) rather than percentages.`,
        `Seventeen games is a small sample: a 10-win team may have feasted on a soft schedule. Sharp readers check strength of schedule and point differential before trusting a win total — and tiebreakers (head-to-head, division record) decide the rest.`,
      ),
    },
    {
      key: 'losses', tier: 'beginner', label: 'Losses', prompt: 'Which team has LOST fewer games?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} have only ${c.wd} losses — the ${c.l.shortName} have ${c.ld}. Fewer losses is better!`,
        `The L column: ${c.w.shortName} ${c.wd}, ${c.l.shortName} ${c.ld}. With just 17 games, each loss stings — three or four losses can still mean a great season, but every extra one squeezes the playoff math.`,
        `In the NFL a loss is doubly costly: you miss the win AND a rival usually banks one. That's why late-season "win and in" scenarios appear so fast — the loss column sets the ceiling on where a team can finish.`,
        `Playoff seeding often comes down to conference-record tiebreakers, so WHERE the losses came matters: two identical 12-5 teams can be seeded apart purely on which five they lost. Analysts read the loss column with the schedule next to it.`,
      ),
    },
    {
      key: 'winPercent', tier: 'beginner', label: 'Win %', prompt: 'Which team has the better winning percentage?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName}'s winning number (${c.wd}) is bigger than the ${c.l.shortName}'s (${c.ld}) — they win more often!`,
        `Winning percentage = wins ÷ games played: ${c.wd} vs ${c.ld}. In the NFL ties are rare but possible, and they count as half a win in this math — the one league where that rule regularly matters.`,
        `Percentage is the official sort order of the standings, which matters mid-season when teams have played different numbers of games (bye weeks). .500 is the break-even line; roughly .600+ is playoff territory most years.`,
        `Over just 17 games, one result swings a percentage by ~.059 — enormous compared with baseball's .006. That volatility is why NFL analysts lean on point differential and schedule strength instead of trusting a percentage in October.`,
      ),
    },
    {
      key: 'pointsFor', tier: 'intermediate', label: 'Points scored', prompt: 'Which team has scored more points?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have scored ${c.wd} points in this table — more than the ${c.l.shortName}'s ${c.ld}!`,
        `PF (points for) totals every point a team has scored. ${c.w.shortName} ${c.wd}, ${c.l.shortName} ${c.ld}. Around 23 points a game is a typical NFL offense; 28+ is elite.`,
        `PF is a season total, so early in a season compare it per game in your head. It's also a live tiebreaker deep in the NFL's playoff-seeding rules — points actually scored can decide a seed.`,
        `Scoring totals need context: garbage-time points and defensive/return touchdowns inflate PF without proving the offense. Analysts prefer per-drive scoring — but on a raw standings page, PF next to PA is your fastest read on team identity.`,
      ),
    },
    {
      key: 'pointsAgainst', tier: 'expert', label: 'Points allowed', prompt: 'Which team has ALLOWED fewer points?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} let in only ${c.wd} points — the ${c.l.shortName} gave up ${c.ld}. Letting in fewer is better!`,
        `PA (points against) totals what a defense has conceded: ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld}. The old saying "defense wins championships" starts from this column.`,
        `PA is the one-glance defense check — but it also charges the defense for short fields after turnovers and for garbage time. Under ~20 a game is a strong unit in the modern NFL.`,
        `Analysts split PA into its drivers (yards per play, takeaways, field position) because raw PA blames defenses for their offense's mistakes. Still, PF minus PA — differential — remains the strongest single predictor of future NFL results.`,
      ),
    },
    {
      key: 'pointDifferential', tier: 'expert', label: 'Point differential', prompt: 'Which team has the better point differential?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have scored ${c.wd} more points than they've allowed — better than the ${c.l.shortName}'s ${c.ld}!`,
        `Point differential = points scored minus points allowed: ${c.wd} vs ${c.ld}. A big plus number means a team doesn't just win — it wins comfortably.`,
        `Differential exposes records built on close calls. An 8-3 team at −20 has been winning coin flips; a 5-6 team at +40 has been losing them. Over time, both tend to drift toward what the differential says.`,
        `In a 17-game season, differential predicts future performance better than the record itself — one famous rule of thumb converts roughly every 37 points of differential into a win. It's the first column analysts check before buying a hot start.`,
      ),
    },
  ],

  // ── NBA ── verified: wins, losses, winPercent, avgPointsFor/Against,
  // differential (per-game, "+8.2"), pointDifferential (season total).
  nba: [
    {
      key: 'wins', tier: 'kid', label: 'Wins', prompt: 'Which team has more wins?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have won ${c.wd} games and the ${c.l.shortName} have won ${c.ld}. More wins = higher in the standings!`,
        `This ${c.league} table shows ${c.w.shortName} at ${c.wd} wins vs ${c.ld} for the ${c.l.shortName}. An NBA regular season is 82 games, and the win column is the first thing everyone reads.`,
        `Fifty wins is the classic "very good team" line in an 82-game season; sixty is contender territory. Standings split East and West, and playoff seeds come from win-loss inside each conference.`,
        `Win totals hide schedule context — rest days, travel, and conference strength all skew them. Analysts sanity-check the W column against net rating (point differential per 100 possessions), the league's preferred quality measure.`,
      ),
    },
    {
      key: 'losses', tier: 'beginner', label: 'Losses', prompt: 'Which team has LOST fewer games?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} have lost only ${c.wd} games — fewer than the ${c.l.shortName}'s ${c.ld}. Fewer losses is better!`,
        `The L column reads ${c.wd} for the ${c.w.shortName} and ${c.ld} for the ${c.l.shortName}. Wins and losses together show how far through the 82-game season each team is.`,
        `Two teams can share a win total and still not be level — the one with fewer losses leads, because standings actually sort on winning percentage. "Games behind" turns that gap into a single number.`,
        `Late in a season the loss column is the scoreboard-watcher's column: a chasing team can't control the leader's wins, but every leader loss cuts the magic number just like a win of their own.`,
      ),
    },
    {
      key: 'winPercent', tier: 'beginner', label: 'Win %', prompt: 'Which team has the better winning percentage?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName}'s winning number (${c.wd}) beats the ${c.l.shortName}'s (${c.ld}) — they win more often!`,
        `Winning percentage = wins ÷ games played: ${c.wd} vs ${c.ld}. It's written like .732 — a team above .500 wins more than it loses.`,
        `Percentage is fairer than raw wins whenever games-played differ, which is most of the season. The NBA sorts standings by it and breaks ties with head-to-head and division records.`,
        `A .700+ percentage sustained over 82 games is historically elite — roughly 57 wins. Because basketball's best teams win at higher rates than in most sports, percentage gaps in the NBA table read wider than in, say, MLB's.`,
      ),
    },
    {
      key: 'avgPointsFor', tier: 'intermediate', label: 'Points per game', prompt: 'Which team scores more points per game?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} score ${c.wd} points a game — more than the ${c.l.shortName}'s ${c.ld}!`,
        `PPG averages a team's scoring across its games: ${c.wd} vs ${c.ld} here. Modern NBA teams mostly live between 105 and 120 points a game.`,
        `Per-game numbers compare fairly across different games-played, but raw PPG rewards fast-paced teams. Watch a slow, efficient team sit "low" in PPG while winning — that's pace hiding quality.`,
        `That pace problem is why analysts moved to offensive rating: points per 100 POSSESSIONS. A standings page won't show it, but knowing PPG blends pace with efficiency is what separates reading the table from understanding it.`,
      ),
    },
    {
      key: 'avgPointsAgainst', tier: 'intermediate', label: 'Points allowed/game', prompt: 'Which team ALLOWS fewer points per game?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} let in only ${c.wd} points a game — the ${c.l.shortName} give up ${c.ld}. Fewer is better!`,
        `Points allowed per game is the standings-page view of defense: ${c.wd} vs ${c.ld}. Champions almost always defend near the top of this list.`,
        `Like PPG, this blends pace with quality — a slow team "allows" fewer points just by playing fewer possessions. Compare it against the same team's scoring to see its real identity.`,
        `Defensive rating (points allowed per 100 possessions) is the pace-corrected version analysts use. A team allowing few points AND scoring plenty per possession posts an elite net rating — the stat that best predicts playoff success.`,
      ),
    },
    {
      key: 'differential', tier: 'expert', label: 'Point differential/game', prompt: 'Which team has the better per-game point differential?', pick: 'higher',
      teach: c => t4(
        `On average the ${c.w.shortName} outscore teams by ${c.wd} a game — better than the ${c.l.shortName}'s ${c.ld}!`,
        `Per-game differential = average points scored minus average allowed: ${c.wd} vs ${c.ld}. Positive means a team usually finishes games ahead — even a small plus number is meaningful over a season.`,
        `Differential ignores close-game luck: records swing on clutch bounces, but margins accumulate honestly. A +5 team with a modest record is usually better than its record; a barely-positive team with a gaudy record is living dangerously.`,
        `Point differential predicts future wins better than current record — the basis of "Pythagorean" projections. Every historically great NBA season posts roughly +8 or better per game; below +3, deep playoff runs get rare fast.`,
      ),
    },
  ],

  // ── WNBA ── identical stat names to NBA (verified); wording tuned for a 44-game season.
  wnba: [
    {
      key: 'wins', tier: 'kid', label: 'Wins', prompt: 'Which team has more wins?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have won ${c.wd} games and the ${c.l.shortName} have won ${c.ld}. More wins = higher in the standings!`,
        `This ${c.league} table shows ${c.w.shortName} with ${c.wd} wins vs ${c.ld} for the ${c.l.shortName}. A WNBA regular season is short — around 44 games — so each win moves the table more than in the NBA's 82.`,
        `With a short season, streaks decide seasons: a five-game run can carry a team several places. Playoff seeding runs off the overall league table, so every win counts against the whole field.`,
        `Short seasons mean small samples — win totals wobble more than in longer leagues, and one injury absence swings a race. Cross-check wins with per-game point differential before calling a team the real deal.`,
      ),
    },
    {
      key: 'losses', tier: 'beginner', label: 'Losses', prompt: 'Which team has LOST fewer games?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} have lost only ${c.wd} games — fewer than the ${c.l.shortName}'s ${c.ld}. Fewer losses is better!`,
        `The L column: ${c.w.shortName} ${c.wd}, ${c.l.shortName} ${c.ld}. In a ~44-game season a single loss costs about twice what it would across an NBA year.`,
        `Reading W and L together shows schedule progress — mid-season, teams can differ by several games played, which is exactly why standings sort by percentage, not raw wins.`,
        `Because samples are small, the loss column carries real tiebreak weight late in the year, and head-to-head results loom large — two rivals' season series often effectively decides a seed.`,
      ),
    },
    {
      key: 'winPercent', tier: 'beginner', label: 'Win %', prompt: 'Which team has the better winning percentage?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName}'s winning number (${c.wd}) beats the ${c.l.shortName}'s (${c.ld}) — they win more often!`,
        `Winning percentage = wins ÷ games played: ${c.wd} vs ${c.ld}. Above .500 means winning more than losing — the universal break-even line.`,
        `Percentage is the fair comparison when games-played differ, and it's what the league sorts by. In a short season percentages move fast — one weekend can reshuffle the top four.`,
        `A .700 season over 44 games (~31 wins) is championship-caliber. Because every game is a bigger slice of the season, WNBA percentages converge on "true" team strength later than in longer leagues — early tables deceive.`,
      ),
    },
    {
      key: 'avgPointsFor', tier: 'intermediate', label: 'Points per game', prompt: 'Which team scores more points per game?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} score ${c.wd} points a game — more than the ${c.l.shortName}'s ${c.ld}!`,
        `PPG averages team scoring per game: ${c.wd} vs ${c.ld}. Modern WNBA offenses mostly live in the 78–90 range.`,
        `Per-game framing keeps comparisons fair across games-played, but pace matters: a fast team piles up points without necessarily being efficient. Scoring vs conceding together tells the identity story.`,
        `Analysts pace-correct with offensive rating (points per 100 possessions). On a raw table, read PPG alongside points allowed — the gap between them, per game, is the number that actually forecasts wins.`,
      ),
    },
    {
      key: 'differential', tier: 'expert', label: 'Point differential/game', prompt: 'Which team has the better per-game point differential?', pick: 'higher',
      teach: c => t4(
        `On average the ${c.w.shortName} outscore teams by ${c.wd} a game — better than the ${c.l.shortName}'s ${c.ld}!`,
        `Per-game differential = average scored minus average allowed: ${c.wd} vs ${c.ld}. A plus number means winning by more than you lose by.`,
        `Differential strips out close-game luck from a short season's record — that makes it MORE valuable in the WNBA than in long leagues, where records have time to self-correct.`,
        `In a 44-game league, differential is the sharpest single quality signal on the page: +6 or better per game is title-contender territory, and a mediocre record with a strong plus margin is the classic "buy low" read.`,
      ),
    },
  ],

  // ── NHL ── verified: wins, points (standings pts), pointsFor/Against,
  // pointDifferential, gamesPlayed. No winPercent — the NHL genuinely doesn't
  // table one, which is itself the teaching point of the points column.
  nhl: [
    {
      key: 'wins', tier: 'kid', label: 'Wins', prompt: 'Which team has more wins?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have won ${c.wd} games and the ${c.l.shortName} have won ${c.ld}. More wins = higher up the table!`,
        `This ${c.league} table shows ${c.w.shortName} with ${c.wd} wins vs ${c.ld} for the ${c.l.shortName} across an 82-game season. But hockey has a twist: the standings don't actually sort by wins…`,
        `…they sort by POINTS. A win is worth 2 points, and losing in overtime or a shootout still earns 1. So a team can trail in wins yet sit higher on points — always check both columns.`,
        `Since regulation wins broke into their own tiebreaker column (RW), analysts treat the raw W total with care: overtime and shootout wins count the same 2 points but signal less about strength. Wins tell you a lot; points tell you the seed.`,
      ),
    },
    {
      key: 'points', tier: 'beginner', label: 'Points', prompt: 'Which team has more standings points?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have ${c.wd} points and the ${c.l.shortName} have ${c.ld}. In hockey, points decide who's on top!`,
        `NHL points: 2 for any win, 1 for losing in overtime or a shootout, 0 for a regulation loss. ${c.w.shortName} ${c.wd}, ${c.l.shortName} ${c.ld} — the PTS column IS the standings.`,
        `That single "loser point" reshapes the league: teams drag close games to overtime to bank the guaranteed point, and playoff races are quoted in points, not wins ("three points back with two in hand").`,
        `About 96 points is the classic playoff bar in an 82-game season. The loser point also compresses the table — bad teams look closer to good ones than they are — which is why analysts check regulation wins and goal differential behind the PTS column.`,
      ),
    },
    {
      key: 'pointsFor', tier: 'intermediate', label: 'Goals scored', prompt: 'Which team has scored more goals?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have scored ${c.wd} goals — more than the ${c.l.shortName}'s ${c.ld}!`,
        `GF (goals for) totals a team's scoring: ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld}. Hockey is low-scoring — roughly 3 goals a game per team — so these totals build slowly.`,
        `GF is your quickest read on offensive style: a high-GF team plays fast and trades chances; a low-GF team likely grinds games tight. Neither is "better" — check GA to see if the style works.`,
        `Because goals are scarce, small GF edges matter more than they look, and special teams drive a surprising share — elite power plays add 15+ goals a season. GF minus GA is also the NHL's last standard tiebreaker, so this column can literally decide a playoff spot.`,
      ),
    },
    {
      key: 'pointsAgainst', tier: 'intermediate', label: 'Goals allowed', prompt: 'Which team has ALLOWED fewer goals?', pick: 'lower',
      teach: c => t4(
        `The ${c.w.shortName} have let in only ${c.wd} goals — the ${c.l.shortName} let in ${c.ld}. Fewer is better!`,
        `GA (goals against) is the defense-and-goaltending column: ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld}. In a sport this low-scoring, keeping the puck out wins championships.`,
        `A great goalie can single-handedly bend this column — hockey is the rare sport where one player touches every defensive possession. Low GA with mediocre GF is the profile of a "goalie-carried" team.`,
        `Analysts split GA into shot volume allowed vs save percentage to see whether the skaters or the goalie deserve the credit. Sustained low GA with average goaltending numbers is the sign of a structurally elite defensive team.`,
      ),
    },
    {
      key: 'pointDifferential', tier: 'expert', label: 'Goal differential', prompt: 'Which team has the better goal differential?', pick: 'higher',
      teach: c => t4(
        `The ${c.w.shortName} have scored ${c.wd} more goals than they've let in — better than the ${c.l.shortName}'s ${c.ld}!`,
        `Goal differential = goals for minus goals against: ${c.wd} vs ${c.ld}. A plus number means outscoring the league across the season, even if a few bounces went the wrong way.`,
        `The loser point makes NHL RECORDS lie more than most — differential doesn't collect charity points, so it often flags overrated and underrated teams the PTS column hides.`,
        `Goal differential is the NHL's final standard tiebreaker AND its best regression signal: teams way out-performing their differential (winning the close ones) tend to cool off. A deep playoff team almost always sits comfortably in the plus.`,
      ),
    },
  ],

  // ── Soccer (EPL + La Liga, always compared within ONE league) ── verified:
  // wins, points, pointsFor, pointDifferential (= goal difference), gamesPlayed.
  soccer: [
    {
      key: 'wins', tier: 'kid', label: 'Wins', prompt: 'Which team has more wins?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have won ${c.wd} games and ${c.l.shortName} have won ${c.ld}. More wins means more points and a higher spot in the table!`,
        `In ${c.league}, the table's W column shows ${c.w.shortName} at ${c.wd} vs ${c.ld} for ${c.l.shortName}. A league season is 38 games (each team plays everyone home and away), and wins drive everything.`,
        `Soccer is the sport where wins DON'T directly sort the table — points do, and draws muddy the picture. Two teams can share a win total while sitting apart because one keeps drawing and the other keeps losing.`,
        `Since 3-points-for-a-win was adopted worldwide in the 1990s, wins have been deliberately worth more than draws (a win + loss beats two draws, 3–2). Reading W-D-L together — not just W — is how you spot a team's true pattern.`,
      ),
    },
    {
      key: 'points', tier: 'beginner', label: 'Points', prompt: 'Which team has more points?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have ${c.wd} points and ${c.l.shortName} have ${c.ld}. Points decide the table: win a game, get 3. Draw, get 1!`,
        `Soccer points: 3 for a win, 1 for a draw, 0 for a loss. ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld} in ${c.league}. The Pts column is the table — everything else is a tiebreaker.`,
        `Points per game is the mid-season trick: teams often have games in hand, and 2.0+ points a game is title form. The table's zones matter too — top spots mean Champions League, the bottom three go down.`,
        `Roughly 90+ points wins a modern Premier League title; 40 was the old survival myth (the real bar is usually lower). Because draws only pay 1, "draw specialists" sink over a season — the 3-point rule was designed to punish exactly that.`,
      ),
    },
    {
      key: 'pointsFor', tier: 'intermediate', label: 'Goals scored', prompt: 'Which team has scored more goals?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have scored ${c.wd} goals — more than ${c.l.shortName}'s ${c.ld}!`,
        `GF (goals for): ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld} in ${c.league}. Soccer is the lowest-scoring major sport — around 1.5 goals per team per game — so every goal in this column was hard-won.`,
        `GF reveals style: heavy scorers attack in numbers and accept risk; low scorers sit deep and protect draws. Title sides usually pair a top-3 GF with a top-3 defense — one alone rarely wins a league.`,
        `Analysts compare GF with expected goals (xG) to separate finishing luck from chance creation — a team scoring far above its xG usually regresses. On the raw table, GF is also half of goal difference, the tiebreaker that decides titles.`,
      ),
    },
    {
      key: 'pointDifferential', tier: 'expert', label: 'Goal difference', prompt: 'Which team has the better goal difference?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have scored ${c.wd} more goals than they've let in — better than ${c.l.shortName}'s ${c.ld}!`,
        `Goal difference (GD) = goals scored minus goals conceded, shown as +/− on the table: ${c.wd} vs ${c.ld}. When two teams finish level on points, the better GD finishes higher.`,
        `GD is the FIRST tiebreaker in the Premier League and most leagues (La Liga is a famous exception — it uses head-to-head between the tied teams first). Late in a title race, teams chase goals precisely to pad GD.`,
        `Titles and relegations have literally turned on GD — Manchester City's 2011-12 title was won on it. Analysts also read GD as a quality signal mid-season: a team ahead of its GD on points is over-performing and likely to drift back.`,
      ),
    },
  ],

  // ── Rugby (RWC / Super Rugby / URC, compared within one competition) ──
  // verified: gamesWon, points (league pts), pointsFor, pointsDifference,
  // triesFor, bonusPoints.
  rugby: [
    {
      key: 'gamesWon', tier: 'kid', label: 'Wins', prompt: 'Which team has won more games?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have won ${c.wd} games and ${c.l.shortName} have won ${c.ld}. More wins pushes you up the table!`,
        `In ${c.league}, ${c.w.shortName} show ${c.wd} wins vs ${c.ld} for ${c.l.shortName}. Wins are the engine of a rugby table — but rugby's points system means they're not the whole story…`,
        `…because rugby tables sort by competition POINTS: 4 for a win, 2 for a draw, plus bonus points. A team can win fewer games yet sit higher by banking bonuses — always read W next to Pts.`,
        `In World Cup pools, one win often separates advancing from flying home, so upsets echo loudly. Across a league season, the win column sets the base and the bonus-point columns decide the tight races.`,
      ),
    },
    {
      key: 'points', tier: 'beginner', label: 'Table points', prompt: 'Which team has more competition points?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have ${c.wd} points and ${c.l.shortName} have ${c.ld}. In rugby you get 4 points for winning a game!`,
        `Rugby table points: 4 for a win, 2 for a draw, 0 for a loss — plus BONUS points. ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld} in ${c.league}.`,
        `The bonuses: score 4+ tries in a match (1 point, win or lose) or lose by 7 or fewer (1 point). It's why a team can lose a match and still gain on the table — rugby pays you for attacking and for staying close.`,
        `Bonus points shape tactics: a side leading late may chase a fourth try instead of kicking safe points, and a trailing side defends furiously to stay within 7. Reading a rugby table means reading intent — the losing-bonus column tells you who fights to the whistle.`,
      ),
    },
    {
      key: 'pointsFor', tier: 'intermediate', label: 'Points scored', prompt: 'Which team has scored more points on the pitch?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have scored ${c.wd} points in their games — more than ${c.l.shortName}'s ${c.ld}!`,
        `PF totals every on-pitch point: tries (5), conversions (2), penalties (3), drop goals (3). ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld} in ${c.league}.`,
        `Don't confuse the two "points" on a rugby table: PF is points scored IN matches; Pts is competition points FOR results. PF shows attacking firepower; Pts shows where you stand.`,
        `HOW the points come matters: try-heavy totals signal a running game that also harvests try bonuses; penalty-heavy totals signal a kicking game that wins tight and travels well. The PF column plus the tries column tells you which team you're looking at.`,
      ),
    },
    {
      key: 'triesFor', tier: 'intermediate', label: 'Tries scored', prompt: 'Which team has scored more tries?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have scored ${c.wd} tries — more than ${c.l.shortName}'s ${c.ld}. A try is rugby's touchdown, worth 5 points!`,
        `Tries (grounding the ball over the line, 5 points + a shot at 2 more): ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld}. The tries column measures pure attacking rugby.`,
        `Tries earn more than points — 4 tries in a match banks a bonus point regardless of the result. That's why the tries column moves tables directly, not just through the scoreboard.`,
        `Analysts read tries-per-game against penalties kicked to classify a side: high-try teams stress defenses wide and thrive in fast games; low-try, high-penalty teams squeeze wins through territory and discipline. Both profiles win — differently.`,
      ),
    },
    {
      key: 'pointsDifference', tier: 'expert', label: 'Points difference', prompt: 'Which team has the better points difference?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have scored ${c.wd} more points than they've let in — better than ${c.l.shortName}'s ${c.ld}!`,
        `Points difference (PD) = points scored minus points conceded, shown +/−: ${c.wd} vs ${c.ld}. When teams finish level on table points, better PD usually decides who finishes higher.`,
        `PD is rugby's classic tiebreaker (competitions vary — some check head-to-head or tries first), so blowout wins carry hidden value: running up a score in October can seed a semifinal in May.`,
        `PD also outs the table's liars: a side winning tight on penalties can sit high with a thin PD, while a four-try machine lurks below on points. Sharp readers treat a big PD gap at equal points as the truer ranking.`,
      ),
    },
    {
      key: 'bonusPoints', tier: 'expert', label: 'Bonus points', prompt: 'Which team has banked more bonus points?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have ${c.wd} bonus points and ${c.l.shortName} have ${c.ld}. Bonus points are extra rewards for exciting rugby!`,
        `Rugby awards bonus table points beyond the result: 1 for scoring 4+ tries in a match, 1 for losing by 7 or fewer. ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld}.`,
        `Bonus points exist to reward attacking play and punish shutting up shop. Over a season they decide tight races — two otherwise-equal teams can be split purely by who chased tries.`,
        `A high try-bonus count marks a team that keeps attacking after the game is safe; a high losing-bonus count marks a stubborn side that loses narrow. In World Cup pools this column has eliminated teams — bonus-point management is real coaching strategy.`,
      ),
    },
  ],

  // ── Cricket (WTC + IPL, compared within one competition) ── verified:
  // matchesWon, matchesLost, matchesPlayed, matchPoints, rank; netrr (IPL only —
  // availability-filtered, so WTC rounds simply never ask it).
  cricket: [
    {
      key: 'matchesWon', tier: 'kid', label: 'Wins', prompt: 'Which team has won more matches?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have won ${c.wd} matches and ${c.l.shortName} have won ${c.ld}. More wins takes you up the table!`,
        `In ${c.league}, ${c.w.shortName} show ${c.wd} wins vs ${c.ld} for ${c.l.shortName}. Cricket tables start from the wins column, just like every league table.`,
        `Cricket's twist: matches can DRAW (Test cricket, after five days!) or finish with no result (rain), and those outcomes earn partial points — so the wins column alone doesn't settle the table.`,
        `Teams often haven't played the same number of matches — Test series lengths differ wildly — which is why the World Test Championship ranks by PERCENTAGE of available points won, not raw wins. Always check the matches column beside the wins.`,
      ),
    },
    {
      key: 'matchPoints', tier: 'beginner', label: 'Points', prompt: 'Which team has more points?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName} have ${c.wd} points and ${c.l.shortName} have ${c.ld}. Winning matches earns points, and points decide the table!`,
        `Match points reward results: ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld} in ${c.league}. In T20 leagues like the IPL a win pays 2 points; in the World Test Championship a win pays 12, a draw 4.`,
        `Points systems are why cricket tables can surprise you — a team with fewer wins can lead through draws (Tests) or washouts (1 point each in T20). The points column is the table's spine; wins are its story.`,
        `In the WTC, slow over rates get PENALIZED in match points — teams have missed the final because of docked points. Reading a cricket table properly means knowing points won, points available, and points lost to sanctions.`,
      ),
    },
    {
      key: 'matchesLost', tier: 'intermediate', label: 'Losses', prompt: 'Which team has LOST fewer matches?', pick: 'lower',
      teach: c => t4(
        `${c.w.shortName} have lost only ${c.wd} matches — ${c.l.shortName} have lost ${c.ld}. Losing less is better!`,
        `The losses column: ${c.w.shortName} ${c.wd} vs ${c.l.shortName} ${c.ld} in ${c.league}. With wins, draws, and no-results all possible, losses are cricket's cleanest "what went wrong" count.`,
        `Compare losses against matches PLAYED — a team with 4 losses from 12 is doing far better than 4 from 6. Cricket's uneven schedules make that mental division essential table-reading.`,
        `In knockout-qualifying leagues, avoiding losses can beat chasing wins: a rained-off point or a hard-fought draw keeps a campaign alive where a defeat ends it. Championship sides manage risk match by match — the losses column shows who managed it best.`,
      ),
    },
    {
      key: 'netrr', tier: 'expert', label: 'Net run rate', prompt: 'Which team has the better net run rate?', pick: 'higher',
      teach: c => t4(
        `${c.w.shortName}'s net run rate (${c.wd}) is better than ${c.l.shortName}'s (${c.ld}). It means they score faster than they let others score!`,
        `Net run rate (NRR) = runs scored per over, minus runs conceded per over, across the whole season: ${c.wd} vs ${c.ld}. Positive means generally on top; negative means generally chasing games.`,
        `NRR is the tiebreaker when teams finish level on points — the cricket equivalent of goal difference. Margins count: winning BIG raises it, losing big sinks it, so no lead is ever "safe enough" for the table.`,
        `NRR strategy gets wild at the end of a group stage: teams calculate the exact margin needed and chase targets absurdly fast — or bat on for extra runs — purely to move the decimal. Entire playoff berths have turned on a few balls of NRR math.`,
      ),
    },
  ],
};

// Read-only view for anyone who wants the catalog (e.g. a future Jeopardy column).
export function statDefsFor(sport: StandingsSport): StatDef[] {
  return STAT_DEFS[sport];
}

// ── Fetch + cache (the espnTeams.ts pattern, verbatim in structure) ─────────

const memCache = new Map<StandingsSport, StandingsPool>();
const inflight = new Map<StandingsSport, Promise<StandingsPool>>();
const DISK_KEY = (s: StandingsSport) => `standings:v1:${s}`;
const FETCH_TIMEOUT_MS = 8000;

interface RawSeason { year?: number; displayName?: string }

// Time out WITHOUT an AbortController — see the matching note in lib/espnTeams.ts.
// Passing `signal` to fetch on RN's New Architecture fails the FIRST request of a
// session while identical retries succeed, which shipped as "every live game opens
// on its error card until you tap Try again." Race a timer, and retry once.
function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms),
  );
}

async function getStandings(url: string): Promise<any> {
  const res = await Promise.race([fetch(url), timeoutAfter(FETCH_TIMEOUT_MS)]);
  if (!res.ok) throw new Error(`standings ${res.status}`);
  return res.json();
}

async function fetchStandingsJson(path: string, season?: number): Promise<any> {
  const url =
    `https://site.api.espn.com/apis/v2/sports/${path}/standings` +
    (season ? `?season=${season}` : '');
  try {
    return await getStandings(url);
  } catch {
    await new Promise(r => setTimeout(r, 400));
    return getStandings(url); // one retry — a cold first call must not cost the game
  }
}

// Flatten children[] (conferences / pools / the single wrapper child) into one
// team list — comparisons like "who has more wins" are standard across
// conferences of the SAME league, and every entry shares the same season.
function parseTeams(data: any): StandingTeam[] {
  const out: StandingTeam[] = [];
  const children: any[] = Array.isArray(data?.children) ? data.children : [];
  for (const child of children) {
    const entries: any[] = child?.standings?.entries || [];
    for (const e of entries) {
      const tm = e?.team;
      if (!tm?.displayName) continue;
      const stats: StandingTeam['stats'] = {};
      for (const s of e?.stats || []) {
        if (!s?.name) continue;
        const value =
          typeof s.value === 'number' && isFinite(s.value)
            ? s.value
            : parseFloat(String(s.displayValue ?? '').replace(/[+,]/g, ''));
        if (!isFinite(value)) continue; // never trust the payload's shape
        stats[String(s.name)] = {
          display: String(s.displayValue ?? value),
          value,
        };
      }
      out.push({
        id: String(tm.id ?? tm.displayName),
        displayName: String(tm.displayName),
        shortName: String(tm.shortDisplayName || tm.name || tm.displayName),
        abbr: String(tm.abbreviation || '').toUpperCase(),
        logo: tm.logos?.[0]?.href ? String(tm.logos[0].href) : undefined,
        league: '', // filled by the caller with the authored label
        stats,
      });
    }
  }
  return out;
}

// ESPN is inconsistent about displayName: the NBA gives a clean "2026-27", MLB gives
// "2027", but the soccer feeds give "2026-27 English Premier League". Take the LEADING
// SEASON TOKEN in every case. (The old length<=8 guard dropped the soccer name wholesale
// and fell back to `year`, which reads as "the 2025 Premier League season" — wrong, since
// a soccer year spans two: it's the 2025-26 season.) Also note `year` disagrees with the
// token for split seasons, so never reconstruct the label from `year` when we have one.
function seasonLabel(season: RawSeason | undefined): string {
  const m = season?.displayName?.trim().match(/^\d{4}(?:[-–]\d{2,4})?/);
  if (m) return m[0];
  if (season?.year) return String(season.year);
  return '';
}

// A table is PLAYABLE when at least two teams can be told apart on at least one
// of the sport's askable stats. A zeroed preseason table (verified live for
// soccer + URC today) fails this and triggers the prior-season fallback.
function leaguePlayable(teams: StandingTeam[], sport: StandingsSport): boolean {
  if (teams.length < 4) return false;
  for (const def of STAT_DEFS[sport]) {
    const vals = teams.map(t => t.stats[def.key]?.value).filter((v): v is number => v !== undefined);
    if (vals.length >= 2 && Math.max(...vals) > Math.min(...vals)) return true;
  }
  return false;
}

// Fetch one league; if the CURRENT table is unplayable (season not started),
// retry once with ?season={year-1} — verified working for soccer/eng.1 and
// rugby/270557. Returns null when neither request yields a playable table
// (that league is simply dropped from the pool).
async function fetchLeague(
  source: { path: string; label: string },
  sport: StandingsSport,
): Promise<StandingsLeague | null> {
  const data = await fetchStandingsJson(source.path);
  let teams = parseTeams(data).map(t => ({ ...t, league: source.label }));
  if (leaguePlayable(teams, sport)) {
    return {
      label: source.label,
      season: seasonLabel(data?.season),
      priorSeason: false,
      seasonComplete: seasonCompleteFrom(teams),
      teams,
    };
  }
  const year: number | undefined = data?.season?.year;
  if (!year) return null;
  const prev = await fetchStandingsJson(source.path, year - 1);
  teams = parseTeams(prev).map(t => ({ ...t, league: source.label }));
  if (leaguePlayable(teams, sport)) {
    return {
      label: source.label,
      season: seasonLabel(prev?.season),
      priorSeason: true,
      seasonComplete: true, // a prior-season fallback table is by definition final
      teams,
    };
  }
  return null;
}

// The one fetch the game uses. Network-first (all of the sport's sources in
// parallel; a failed/unplayable league is dropped, not fatal); falls back to
// the last-good disk pool on total failure; rejects only when there has never
// been a good pool (the component then shows its friendly retry state).
export async function getStandingsPool(sport: StandingsSport): Promise<StandingsPool> {
  const cached = memCache.get(sport);
  if (cached) return cached;
  const pending = inflight.get(sport);
  if (pending) return pending;

  const job = (async () => {
    try {
      const settled = await Promise.allSettled(
        LEAGUE_SOURCES[sport].map(src => fetchLeague(src, sport)),
      );
      const leagues: StandingsLeague[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) leagues.push(r.value);
      }
      if (!leagues.length) throw new Error('no playable league tables');
      const pool: StandingsPool = { sport, leagues };
      memCache.set(sport, pool);
      AsyncStorage.setItem(DISK_KEY(sport), JSON.stringify({ v: 1, at: Date.now(), pool }))
        .catch(() => {});
      return pool;
    } catch (err) {
      // Offline / ESPN down / all tables unplayable → last-good disk pool, any age.
      const raw = await AsyncStorage.getItem(DISK_KEY(sport)).catch(() => null);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const pool: StandingsPool | undefined = parsed?.pool;
          if (pool && Array.isArray(pool.leagues) && pool.leagues.length) {
            memCache.set(sport, pool);
            return pool;
          }
        } catch { /* fall through to reject */ }
      }
      throw err;
    } finally {
      inflight.delete(sport);
    }
  })();
  inflight.set(sport, job);
  return job;
}

// ── Round building (this is where the difficulty tiers are DERIVED) ─────────
//
// Two dials, both tier-driven, both computed from the LIVE table:
//   1. WHICH stat — each tier owns a band of the stat catalog above
//      (kid = wins … expert = differential / net run rate), with the
//      never-blank fallback to the full catalog if a tier's stats are
//      unavailable in the fetched table (§1.9).
//   2. HOW FAR APART the two teams are — all valid (non-tied!) pairs are
//      ranked by gap on the chosen stat, then banded: kid draws from the
//      widest gaps (teams miles apart), beginner above-median, intermediate
//      below-median, expert the razor-thin gaps. Same stat, wildly different
//      question difficulty.

export interface HLRound {
  level: Level;          // tier this round was built for (drives scoring)
  league: string;        // human label — both teams ALWAYS share one table
  season: string;        // payload season label for the context chip
  priorSeason: boolean;  // true → the chip should say "last season"
  statKey: string;
  statLabel: string;
  prompt: string;
  pick: 'higher' | 'lower';
  a: StandingTeam;
  b: StandingTeam;
  answer: 0 | 1;         // which of a/b is the correct tap
  aDisplay: string;      // live display values, revealed after answering
  bDisplay: string;
  title: string;         // verdict headline ("Wins: Yankees 54 · Rays 56")
  exp: Record<Level, string>; // the teaching beat at all four depths
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface Pair { i: number; j: number; gap: number }

// All valid pairs for a stat: both teams carry the stat, values differ AND the
// on-screen display strings differ — a "56 vs 56" or ".596 vs .596" round would
// read as unanswerable even if the underlying floats differ, so ties (either
// kind) are filtered out here. This is the never-unanswerable guarantee.
function validPairs(teams: StandingTeam[], key: string): Pair[] {
  const idx: number[] = [];
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].stats[key]) idx.push(i);
  }
  const pairs: Pair[] = [];
  for (let x = 0; x < idx.length; x++) {
    for (let y = x + 1; y < idx.length; y++) {
      const a = teams[idx[x]].stats[key];
      const b = teams[idx[y]].stats[key];
      if (a.value === b.value) continue;
      if (a.display.trim() === b.display.trim()) continue;
      pairs.push({ i: idx[x], j: idx[y], gap: Math.abs(a.value - b.value) });
    }
  }
  return pairs;
}

// Gap band per tier (indices into the ascending-by-gap pair list). Bands
// overlap-proof by construction; an empty band falls back to the full list.
function bandFor(level: Level, n: number): [number, number] {
  switch (level) {
    case 'expert': return [0, Math.max(1, Math.floor(n * 0.25))];
    case 'intermediate': return [Math.floor(n * 0.25), Math.max(Math.floor(n * 0.25) + 1, Math.floor(n * 0.5))];
    case 'beginner': return [Math.floor(n * 0.5), Math.max(Math.floor(n * 0.5) + 1, Math.floor(n * 0.75))];
    case 'kid': return [Math.min(n - 1, Math.floor(n * 0.75)), n];
  }
}

// Every question must name its OWN season. A bare "Which team has scored more
// points?" reads as all-time — but these numbers are one season's standings table,
// and (thanks to the prior-season fallback) sometimes LAST season's. A context chip
// under the question wasn't enough: you read the question first and answer it before
// your eye ever reaches the chip. So the season goes INSIDE the sentence.
//   in-progress → "So far in the 2025-26 NBA season, which team has more wins?"
//   completed   → "In the 2025-26 NBA season (final table), which team had more wins?"
// StatDef.prompt stays a bare "Which team …?" clause; this is the only place it's
// dressed for display.
function qualifyPrompt(prompt: string, league: StandingsLeague): string {
  const name = league.label.replace(/^the\s+/i, '');           // "the NBA" → "NBA"
  const clause = prompt.charAt(0).toLowerCase() + prompt.slice(1); // "Which…" → "which…"
  const season = league.season ? `${league.season} ${name}` : name;
  // "So far" only when the season is genuinely in progress. A finished regular season
  // (all games played — an NFL offseason table, last year's fallback) reads "final",
  // never "so far in the … season" for a season that's already over.
  const done = league.priorSeason || league.seasonComplete;
  return done
    ? `In the ${season} season (final table), ${clause}`
    : `So far in the ${season} season, ${clause}`;
}

function buildFromStat(
  league: StandingsLeague,
  def: StatDef,
  level: Level,
  avoid: Set<string> | undefined,
): HLRound | null {
  const pairs = validPairs(league.teams, def.key);
  if (!pairs.length) return null;
  pairs.sort((p, q) => p.gap - q.gap);
  const [lo, hi] = bandFor(level, pairs.length);
  let band = pairs.slice(lo, hi);
  if (!band.length) band = pairs;
  // Prefer a pair the player hasn't just seen; if the whole band is recent,
  // play on anyway (never blank beats never repeating).
  // (see qualifyPrompt below — every question names its own season)
  const fresh = avoid
    ? band.filter(p => !avoid.has(pairKey(league.teams[p.i], league.teams[p.j], def.key)))
    : band;
  const pick = (fresh.length ? fresh : band)[Math.floor(Math.random() * (fresh.length ? fresh.length : band.length))];

  const t1 = league.teams[pick.i];
  const t2 = league.teams[pick.j];
  const [a, b] = Math.random() < 0.5 ? [t1, t2] : [t2, t1];
  const av = a.stats[def.key];
  const bv = b.stats[def.key];
  const aBetter = def.pick === 'higher' ? av.value > bv.value : av.value < bv.value;
  const answer: 0 | 1 = aBetter ? 0 : 1;
  const w = aBetter ? a : b;
  const l = aBetter ? b : a;
  const wd = (aBetter ? av : bv).display;
  const ld = (aBetter ? bv : av).display;

  return {
    level,
    league: league.label,
    season: league.season,
    priorSeason: league.priorSeason,
    statKey: def.key,
    statLabel: def.label,
    prompt: qualifyPrompt(def.prompt, league),
    pick: def.pick,
    a, b, answer,
    aDisplay: av.display,
    bDisplay: bv.display,
    title: `${def.label}: ${w.shortName} ${wd} · ${l.shortName} ${ld}`,
    exp: def.teach({ w, l, wd, ld, league: league.label }),
  };
}

export function pairKey(a: StandingTeam, b: StandingTeam, statKey: string): string {
  return [a.id, b.id].sort().join('~') + '~' + statKey;
}

// Build one round at the given tier. The never-blank ladder (§1.9):
//   1. a random league from the pool, the TIER's stats first (shuffled);
//   2. the sport's FULL stat catalog (a tier is never empty just because the
//      fetched table lacks its favorite column — e.g. WTC has no net run rate);
//   3. every other league in the pool;
//   4. null only if NO stat separates ANY two teams in ANY league — the
//      component renders its friendly "season hasn't started" state (the
//      fetch-level playability check makes this effectively unreachable).
export function buildStandingsRound(
  pool: StandingsPool,
  level: Level,
  avoid?: Set<string>,
): HLRound | null {
  const defs = STAT_DEFS[pool.sport];
  const leagues = shuffleInPlace([...pool.leagues]);
  for (const league of leagues) {
    const tierDefs = shuffleInPlace(defs.filter(d => d.tier === level));
    const restDefs = shuffleInPlace(defs.filter(d => d.tier !== level));
    for (const def of [...tierDefs, ...restDefs]) {
      const round = buildFromStat(league, def, level, avoid);
      if (round) return round;
    }
  }
  return null;
}
