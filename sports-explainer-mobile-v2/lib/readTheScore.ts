// Read the Score — module types + registry (layered under components/academy/ReadTheScoreGame).
// PURE DATA LIB: zero react-native imports (the house convention from boxCount.ts). The
// scenario banks live in lib/readTheScoreBank/{sport}.ts (one file per Academy category,
// glossary-style) and are aggregated here; this file is the ONLY import surface the
// component and the art module use.
//
// CONTENT RULE (build doc §2.4): every scenario teaches a SCORING RULE — evergreen,
// verifiable "how the sport works" facts. Team/player names on the boards are fictional
// set dressing; NO real records, real results, or player trivia, ever.

import type { Level, Sport } from './api';

import { MLB_SCENARIOS } from './readTheScoreBank/mlb';
import { NFL_SCENARIOS } from './readTheScoreBank/nfl';
import { NBA_SCENARIOS } from './readTheScoreBank/nba';
import { WNBA_SCENARIOS } from './readTheScoreBank/wnba';
import { NHL_SCENARIOS } from './readTheScoreBank/nhl';
import { SOCCER_SCENARIOS } from './readTheScoreBank/soccer';
import { RUGBY_SCENARIOS } from './readTheScoreBank/rugby';
import { TENNIS_SCENARIOS } from './readTheScoreBank/tennis';
import { GOLF_SCENARIOS } from './readTheScoreBank/golf';
import { CRICKET_SCENARIOS } from './readTheScoreBank/cricket';

// One bank per Academy CATEGORY (not per league key) — soccer/epl/laliga/worldcup all
// read one soccer bank, rugby/mlr read one rugby bank. Mirrors lib/academyCategories.ts.
export type ScoreSport =
  | 'mlb' | 'nfl' | 'nba' | 'wnba' | 'nhl'
  | 'soccer' | 'rugby' | 'tennis' | 'golf' | 'cricket';

// ── The board model ─────────────────────────────────────────────────────────
// A scenario's scoreboard is STRUCTURED DATA, never JSX — the art module
// (lib/readTheScoreArt.tsx) owns 100% of how each `kind` is drawn. Swapping the
// art later is a one-file job because nothing here knows about pixels.

// A team line on a board. `score` is a string when the sport's notation demands it.
export interface BoardSide {
  name: string;
  abbr: string;
  score: number | string;
  possession?: boolean; // football: ball marker · baseball: unused (half-inning implies it)
}

export interface RugbyTally { t: number; c: number; p: number; d: number } // tries/cons/pens/drop goals

export interface TennisRow {
  name: string;
  sets: number[];   // games won per set, left→right (current set last)
  points: string;   // current-game points: '0' | '15' | '30' | '40' | 'Ad' | tiebreak digits | '—'
}

export interface GolfRow { pos: string; name: string; toPar: string; thru: string }

export type Board =
  | { kind: 'baseball'; away: BoardSide; home: BoardSide; inning: number; half: 'top' | 'bottom';
      balls: number; strikes: number; outs: number; bases: [boolean, boolean, boolean] } // [1st, 2nd, 3rd]
  | { kind: 'football'; away: BoardSide; home: BoardSide; quarter: string; clock: string;
      downDistance?: string; ballOn?: string; timeouts?: { away: number; home: number } }
  | { kind: 'basketball'; away: BoardSide; home: BoardSide; period: string; clock: string;
      shotClock?: number; fouls?: { away: number; home: number }; bonus?: 'away' | 'home' }
  | { kind: 'hockey'; away: BoardSide; home: BoardSide; period: string; clock: string;
      sog?: { away: number; home: number }; situation?: string }  // amber badge, e.g. 'PP FROST 1:23'
  | { kind: 'soccer'; home: BoardSide; away: BoardSide; minute: string; note?: string } // minute: "67'" | "90'+3" | "HT" | "ET 104'"
  | { kind: 'rugby'; home: BoardSide; away: BoardSide; clock: string;
      tally?: { home: RugbyTally; away: RugbyTally }; note?: string }
  | { kind: 'tennis'; p1: TennisRow; p2: TennisRow; server: 1 | 2; note?: string }
  | { kind: 'golf'; rows: GolfRow[]; note?: string }                                    // stroke-play leaderboard
  | { kind: 'golf-hole'; hole: number; par: number; player: string; strokes: number; note?: string }
  | { kind: 'golf-match'; p1: string; p2: string; status: string; thru: string; note?: string } // match play
  | { kind: 'cricket'; batting: { name: string; runs: number; wickets: number; overs: string };
      header?: string; target?: number; oversLimit?: number; note?: string };

// ── The scenario ────────────────────────────────────────────────────────────
export interface ScoreScenario {
  id: string;            // unique within the bank, e.g. 'mlb-kid-1'
  level: Level;          // the tier this scenario BELONGS to (content is tiered, not just points)
  board: Board;
  prompt: string;        // the question asked about the board
  options: string[];     // 2–4 tappable answers
  answer: number;        // index into options
  title: string;         // verdict headline shown after answering
  // The teaching beat — the same ruling re-explained at all four depths (the
  // exp: Record<Level, string> pattern from lib/boxCount.ts; VerdictCard's tabs
  // let the user re-read at any depth).
  exp: Record<Level, string>;
}

// ── Registry + accessors ────────────────────────────────────────────────────
export const READ_THE_SCORE: Record<ScoreSport, ScoreScenario[]> = {
  mlb: MLB_SCENARIOS,
  nfl: NFL_SCENARIOS,
  nba: NBA_SCENARIOS,
  wnba: WNBA_SCENARIOS,
  nhl: NHL_SCENARIOS,
  soccer: SOCCER_SCENARIOS,
  rugby: RUGBY_SCENARIOS,
  tennis: TENNIS_SCENARIOS,
  golf: GOLF_SCENARIOS,
  cricket: CRICKET_SCENARIOS,
};

// League key → content bank. Soccer's four keys and rugby's league keys collapse to
// one category bank each (same collapsing ACADEMY_CATEGORIES does). The extra rugby
// competition keys (nationscup/sixnations/nationschamp) map defensively even though
// no Academy category uses them today.
const KEY_TO_SCORE_SPORT: Partial<Record<Sport, ScoreSport>> = {
  mlb: 'mlb', nfl: 'nfl', nba: 'nba', wnba: 'wnba', nhl: 'nhl',
  soccer: 'soccer', epl: 'soccer', laliga: 'soccer', worldcup: 'soccer',
  rugby: 'rugby', mlr: 'rugby', nationscup: 'rugby', sixnations: 'rugby', nationschamp: 'rugby',
  tennis: 'tennis', golf: 'golf', cricket: 'cricket',
};

// Resolve an Academy category's pooled sportKeys to its scenario bank. Returns null
// only for a key set with no mapped sport (no Academy category hits this today).
export function scoreSportForKeys(sportKeys: Sport[]): ScoreSport | null {
  for (const k of sportKeys) {
    const s = KEY_TO_SCORE_SPORT[k];
    if (s) return s;
  }
  return null;
}

// The tier pool for a level, with the NEVER-BLANK fallback (build doc §1.9): if a
// level bucket were ever empty, serve the full bank rather than a blank game.
//
// ★ PRO SEAM (leave open, gate nothing now): tier gating later is one wrap at the
// CALLER — `poolForLevel(bank, isPro ? level : freeCap(level))`. This function
// stays untouched.
export function poolForLevel(bank: ScoreScenario[], level: Level): ScoreScenario[] {
  const byLevel = bank.filter(s => s.level === level);
  return byLevel.length ? byLevel : bank;
}
