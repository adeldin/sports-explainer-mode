// Zone Tap — module types + registry (layered under components/academy/ZoneTapGame).
// PURE DATA LIB: zero react-native imports (house convention, same as lib/readTheScore.ts).
// The scenario banks live in lib/zoneTapBank/{sport}.ts (one file per Academy category)
// and are aggregated here; this file is the ONLY import surface the component uses.
//
// CONTENT RULE (build doc §2.4): every scenario teaches WHERE something happens on the
// playing surface — positions, zones, lines, and set-piece geography. All of it is
// rule-based and evergreen; NO player/record trivia, ever.
//
// THE COORDINATE CONTRACT: every target region is authored in the VIEWBOX PIXELS of its
// sport's FieldEngine surface (the shared-viewBox contract, exactly like lib/wheresThePlay
// shares the BaseballDiamond's 680×560). The surface each sport uses:
//   football   → FootballField    680×380  (LOS x=235, offense LEFT)
//   soccer     → SoccerPitch      680×420  (attack L→R, right goal x=674, box x=578..674)
//   baseball   → BaseballDiamond  680×560  (home 340,490 · 1B 490,340 · 2B 340,190 · 3B 190,340)
//   basketball → BasketballCourt  680×360  (rims x=47/633 · keys y=124..236 · 3pt arc r=167)
//   hockey     → HockeyRink       680×300  (goal lines x=46/634 · blue x=258/422 · red x=340)
//   tennis     → TennisCourt      680×340  (court 67..613 × 44..296 · net x=340 · svc x=193/487)
//   cricket    → CricketGround    680×460  (oval 340,230 rx320 ry215 · pitch x=325..355 y=160..300)
//   golf       → GolfHole         680×340  (tee left · green ellipse 595,170 · water 450,245)
//   rugby      → RugbyPitch       680×420  (try lines x=66/614 · 22s x=187/493 · halfway x=340)

import type { Level, Sport } from './api';

import { MLB_ZONE_SCENARIOS } from './zoneTapBank/mlb';
import { NFL_ZONE_SCENARIOS } from './zoneTapBank/nfl';
import { NBA_ZONE_SCENARIOS } from './zoneTapBank/nba';
import { WNBA_ZONE_SCENARIOS } from './zoneTapBank/wnba';
import { NHL_ZONE_SCENARIOS } from './zoneTapBank/nhl';
import { SOCCER_ZONE_SCENARIOS } from './zoneTapBank/soccer';
import { RUGBY_ZONE_SCENARIOS } from './zoneTapBank/rugby';
import { TENNIS_ZONE_SCENARIOS } from './zoneTapBank/tennis';
import { GOLF_ZONE_SCENARIOS } from './zoneTapBank/golf';
import { CRICKET_ZONE_SCENARIOS } from './zoneTapBank/cricket';

// One bank per Academy CATEGORY (not per league key) — mirrors lib/readTheScore.ts.
export type ZoneSport =
  | 'mlb' | 'nfl' | 'nba' | 'wnba' | 'nhl'
  | 'soccer' | 'rugby' | 'tennis' | 'golf' | 'cricket';

// Which FieldEngine surface a sport's scenarios are authored against. nba + wnba share
// the basketball court (same painted geometry; the banks stay league-neutral in copy).
export type ZoneSurface =
  | 'football' | 'soccer' | 'baseball' | 'basketball' | 'hockey'
  | 'tennis' | 'cricket' | 'golf' | 'rugby';

export const SURFACE_FOR_SPORT: Record<ZoneSport, ZoneSurface> = {
  mlb: 'baseball', nfl: 'football', nba: 'basketball', wnba: 'basketball', nhl: 'hockey',
  soccer: 'soccer', rugby: 'rugby', tennis: 'tennis', golf: 'golf', cricket: 'cricket',
};

// ── The answer model: TAPPED REGIONS, not multiple choice ──────────────────
// The region model + authoring helpers live in lib/zoneTapRegions.ts (the banks import
// them from there — NOT from this file — to avoid a load-order cycle, since this file
// imports the banks above). Re-exported here so the component has one import surface.
export type { ZoneRegion, ZoneSpot, ZoneScenario, ZoneMark } from './zoneTapRegions';
export { circle, rectSpot, regionCenter, ball, att, def, flag, guide } from './zoneTapRegions';
import type { ZoneScenario } from './zoneTapRegions';

// ── Registry + accessors ────────────────────────────────────────────────────
export const ZONE_TAP: Record<ZoneSport, ZoneScenario[]> = {
  mlb: MLB_ZONE_SCENARIOS,
  nfl: NFL_ZONE_SCENARIOS,
  nba: NBA_ZONE_SCENARIOS,
  wnba: WNBA_ZONE_SCENARIOS,
  nhl: NHL_ZONE_SCENARIOS,
  soccer: SOCCER_ZONE_SCENARIOS,
  rugby: RUGBY_ZONE_SCENARIOS,
  tennis: TENNIS_ZONE_SCENARIOS,
  golf: GOLF_ZONE_SCENARIOS,
  cricket: CRICKET_ZONE_SCENARIOS,
};

// League key → content bank. Soccer's four keys and rugby's league keys collapse to one
// category bank each (same collapsing lib/readTheScore.ts does).
const KEY_TO_ZONE_SPORT: Partial<Record<Sport, ZoneSport>> = {
  mlb: 'mlb', nfl: 'nfl', nba: 'nba', wnba: 'wnba', nhl: 'nhl',
  soccer: 'soccer', epl: 'soccer', laliga: 'soccer', worldcup: 'soccer',
  rugby: 'rugby', mlr: 'rugby', nationscup: 'rugby', sixnations: 'rugby', nationschamp: 'rugby',
  tennis: 'tennis', golf: 'golf', cricket: 'cricket',
};

// Resolve an Academy category's pooled sportKeys to its scenario bank. Returns null only
// for a key set with no mapped sport (no Academy category hits this today).
export function zoneSportForKeys(sportKeys: Sport[]): ZoneSport | null {
  for (const k of sportKeys) {
    const s = KEY_TO_ZONE_SPORT[k];
    if (s) return s;
  }
  return null;
}

// The tier pool for a level, with the NEVER-BLANK fallback (build doc §1.9): if a level
// bucket were ever empty, serve the full bank rather than a blank game.
//
// ★ PRO SEAM (leave open, gate nothing now): tier gating later is one wrap at the
// CALLER — `poolForLevel(bank, isPro ? level : freeCap(level))`. This function stays
// untouched.
export function poolForLevel(bank: ZoneScenario[], level: Level): ZoneScenario[] {
  const byLevel = bank.filter(s => s.level === level);
  return byLevel.length ? byLevel : bank;
}
