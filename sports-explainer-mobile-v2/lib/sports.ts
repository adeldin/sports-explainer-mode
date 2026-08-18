import { Sport } from './api';
import { UIStrings } from './strings';

export type SportTab = { key: Sport; emoji: string; label: string };

// Single source of truth for the sport list — used by BOTH the main sport tabs
// (App.tsx) and the onboarding picker (Onboarding.tsx), so adding a sport here
// makes it appear in both places automatically (no more drift).
export const SPORTS: SportTab[] = [
  { key: 'mlb', emoji: '⚾', label: 'MLB' },
  { key: 'nhl', emoji: '🏒', label: 'NHL' },
  { key: 'nba', emoji: '🏀', label: 'NBA' },
  { key: 'wnba', emoji: '🏀', label: 'WNBA' },
  { key: 'nfl', emoji: '🏈', label: 'NFL' },
  // College. Placed next to the pro league of the same sport rather than at the end of the grid —
  // someone who taps NFL is the most likely person to want NCAAF, and vice versa.
  { key: 'cfb', emoji: '🏈', label: 'NCAAF' },
  { key: 'cbb', emoji: '🏀', label: 'NCAAB' },
  // One combined Soccer tile (key 'soccer') folds MLS + Premier League + La Liga + Serie A +
  // Bundesliga + World Cup via fetchSoccerBoard and the league filter — the same shape as the
  // Rugby tile below. Those league keys stay valid Sport KEYS (SOCCER_LEAGUES + game.sport route
  // explain / recap / coach per league) but have NO standalone tile. Note 'soccer' doubles as the
  // umbrella AND the MLS league key, exactly as 'nationscup' does for rugby.
  //
  // The label here is only a FALLBACK: LiveScreen prefers the localized SPORT_NAME_KEY string, so
  // renaming this tile also required renaming spSoccer (which literally read "MLS").
  { key: 'soccer', emoji: '⚽', label: 'Soccer' },
  // One combined Rugby tile (key 'nationscup') folds ALL rugby leagues via fetchRugbyBoard + the league
  // filter. 'rugby' (URC) and 'mlr' stay valid Sport KEYS (RUGBY_LEAGUES + game.sport) but have NO
  // standalone tile — omitted from SPORTS so the grid shows a single 🏉 Rugby tile.
  { key: 'nationscup', emoji: '🏉', label: 'Rugby' },
  { key: 'tennis', emoji: '🎾', label: 'Tennis' },
  { key: 'golf', emoji: '⛳', label: 'Golf' },
  { key: 'cricket', emoji: '🏏', label: 'Cricket' },
];

// Descriptive localized name per sport (the full-name sub-label, e.g. "Baseball"
// under "MLB"). Maps each sport to its UIStrings key.
export const SPORT_FULL_NAME: Record<Sport, keyof UIStrings> = {
  mlb: 'spBaseball', nfl: 'spFootball', nba: 'spBasketball', nhl: 'spHockey',
  soccer: 'spSoccer', worldcup: 'spWorldCup', rugby: 'spRugby',
  wnba: 'spWnba', epl: 'spPremierLeague', laliga: 'spLaLiga', mlr: 'spMlr',
  tennis: 'spTennis', golf: 'spGolf', cricket: 'spCricket', nationscup: 'spRugbySport',
  sixnations: 'spSixNations', nationschamp: 'spNationsChamp',
  seriea: 'spSerieA', bundesliga: 'spBundesliga', superrugby: 'spSuperRugby',
  championscup: 'spChampionsCup', challengecup: 'spChallengeCup',
  cfb: 'spCollegeFootball', cbb: 'spCollegeBasketball',
};

// Reorder SPORTS by a user's saved key order (from AsyncStorage). Keeps saved
// keys that still exist (in saved order), then APPENDS any sports missing from
// the saved order (e.g. a newly added sport) and DROPS unknown/removed keys.
// Falls back to the canonical SPORTS order when nothing valid is saved.
export function orderSports(savedKeys: unknown): SportTab[] {
  if (!Array.isArray(savedKeys) || savedKeys.length === 0) return SPORTS;
  const byKey = new Map(SPORTS.map((s) => [s.key, s] as const));
  const seen = new Set<string>();
  const ordered: SportTab[] = [];
  for (const k of savedKeys) {
    if (typeof k !== 'string') continue;
    const s = byKey.get(k as Sport);
    if (s && !seen.has(k)) { ordered.push(s); seen.add(k); }
  }
  for (const s of SPORTS) if (!seen.has(s.key)) ordered.push(s); // append new sports
  return ordered;
}

// ── Season awareness ────────────────────────────────────────────────────────
// Shared by EmptyState (off-season messaging) and App (skip stale ESPN fetches).
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// IN-season month windows (1-12), used for COPY ONLY — the "season runs X to Y" line in
// EmptyState. This table does NOT decide whether to fetch or whether games exist; the live
// feed decides that (see the note in lib/scoreboard.ts). It used to gate fetching, which let
// a stale month boundary hide games ESPN was actively serving.
//
// Boundaries below were probed against ESPN's own scoreboard rather than recalled, because
// four of the ten were wrong in exactly the direction that hides a postseason or a preseason:
//   nfl  — games on 2025-07-31 (Hall of Fame game) and 2025-08-07; was Sep, hid all preseason
//   mlb  — World Series game on 2025-11-01, none by 11-05; was Oct, hid the World Series
//   soccer — MLS Cup on 2025-12-06, playoffs through Nov; was Oct, hid the entire postseason
//   nhl  — preseason on 2025-09-25; was Oct
// A window that is too WIDE is harmless now (it only changes wording on a day with no games);
// one that is too NARROW used to be invisible and load-bearing. Prefer generous edges.
export const SEASON_WINDOWS: Record<string, { start: number; end: number }> = {
  mlb: { start: 3, end: 11 },    // March–November (World Series runs into early Nov)
  nfl: { start: 7, end: 2 },     // late July–February (HOF game, then preseason through August)
  nba: { start: 10, end: 6 },    // October–June (preseason early Oct, Finals mid-June)
  nhl: { start: 9, end: 6 },     // late September–June (preseason late Sep, Cup mid-June)
  wnba: { start: 5, end: 10 },   // May–October
  soccer: { start: 2, end: 12 }, // February–December (MLS: Feb start, MLS Cup in December)
  epl: { start: 8, end: 5 },     // August–May
  laliga: { start: 8, end: 5 },  // August–May
  rugby: { start: 9, end: 6 },   // September–June (URC)
  mlr: { start: 2, end: 8 },     // February–August (MLR final falls in early August)
};

export function isOffSeason(sport: string): boolean {
  // World Cup is data-driven (see fetchGames + EmptyState): live games show when
  // ESPN has them; the "every 4 years" note shows only when there are none.
  const w = SEASON_WINDOWS[sport];
  if (!w) return false;
  const month = new Date().getMonth() + 1; // 1-12
  const inSeason = w.start <= w.end
    ? (month >= w.start && month <= w.end)
    : (month >= w.start || month <= w.end); // wraps the year (NFL/NBA/NHL/EPL/La Liga/rugby)
  return !inSeason;
}
