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
  { key: 'soccer', emoji: '⚽', label: 'MLS' },
  { key: 'worldcup', emoji: '🌍', label: 'World Cup' },
  { key: 'epl', emoji: '⚽', label: 'EPL' },
  { key: 'laliga', emoji: '⚽', label: 'La Liga' },
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
  tennis: 'spTennis', golf: 'spGolf', cricket: 'spCricket', nationscup: 'spNationsCup',
  sixnations: 'spSixNations', nationschamp: 'spNationsChamp',
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

// IN-season month windows (1-12). Drives both off-season detection and the
// displayed "season runs X to Y" copy. World Cup has no annual window — handled
// specially (every 4 years).
export const SEASON_WINDOWS: Record<string, { start: number; end: number }> = {
  mlb: { start: 3, end: 10 },    // March–October
  nfl: { start: 9, end: 2 },     // September–February
  nba: { start: 10, end: 6 },    // October–June
  nhl: { start: 10, end: 6 },    // October–June
  wnba: { start: 5, end: 10 },   // May–October
  soccer: { start: 3, end: 10 }, // March–October (MLS)
  epl: { start: 8, end: 5 },     // August–May
  laliga: { start: 8, end: 5 },  // August–May
  rugby: { start: 9, end: 6 },   // September–June (URC)
  mlr: { start: 2, end: 7 },     // February–July
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
