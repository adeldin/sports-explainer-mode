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
  { key: 'soccer', emoji: '⚽', label: 'Soccer' },
  { key: 'worldcup', emoji: '🌍', label: 'World Cup' },
  { key: 'epl', emoji: '⚽', label: 'Premier League' },
  { key: 'laliga', emoji: '⚽', label: 'La Liga' },
  { key: 'rugby', emoji: '🏉', label: 'Rugby' },
  { key: 'mlr', emoji: '🏉', label: 'MLR' },
];

// Descriptive localized name per sport (the full-name sub-label, e.g. "Baseball"
// under "MLB"). Maps each sport to its UIStrings key.
export const SPORT_FULL_NAME: Record<Sport, keyof UIStrings> = {
  mlb: 'spBaseball', nfl: 'spFootball', nba: 'spBasketball', nhl: 'spHockey',
  soccer: 'spSoccer', worldcup: 'spWorldCup', rugby: 'spRugby',
  wnba: 'spWnba', epl: 'spPremierLeague', laliga: 'spLaLiga', mlr: 'spMlr',
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
