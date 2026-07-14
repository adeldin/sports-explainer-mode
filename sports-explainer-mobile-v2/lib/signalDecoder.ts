// Signal Decoder — module types + registry (layered under components/academy/SignalDecoderGame).
// PURE DATA LIB: zero react-native imports (the house convention from boxCount.ts /
// readTheScore.ts). The scenario banks live in lib/signalDecoderBank/{sport}.ts (one file
// per Academy category) and are aggregated here; this file is the ONLY import surface the
// component and the art module use.
//
// CONTENT RULE (build doc §2.4): every scenario teaches an OFFICIAL'S SIGNAL — pure
// rule-based, evergreen vocabulary verified against the sports' officiating references
// (NFL signal chart, MCC Laws of Cricket 2.13, World Rugby match-official signals,
// IFAB Laws of the Game, USA Hockey Appendix 3, NFHS/FIBA basketball mechanics,
// umpire mechanics manuals). NO player/record trivia, ever — signals never go stale.

import type { Level, Sport } from './api';

import { MLB_SIGNAL_SCENARIOS } from './signalDecoderBank/mlb';
import { NFL_SIGNAL_SCENARIOS } from './signalDecoderBank/nfl';
import { NBA_SIGNAL_SCENARIOS } from './signalDecoderBank/nba';
import { NHL_SIGNAL_SCENARIOS } from './signalDecoderBank/nhl';
import { SOCCER_SIGNAL_SCENARIOS } from './signalDecoderBank/soccer';
import { RUGBY_SIGNAL_SCENARIOS } from './signalDecoderBank/rugby';
import { CRICKET_SIGNAL_SCENARIOS } from './signalDecoderBank/cricket';

// One bank per Academy CATEGORY. Tennis and golf are deliberately absent — neither has a
// comparable codified signal vocabulary (chair umpires and rules officials speak, they
// don't gesture a shared sign language), so the game is scoped to these 7 via
// supportedSports in the registry.
export type SignalSport = 'mlb' | 'nfl' | 'nba' | 'nhl' | 'soccer' | 'rugby' | 'cricket';

// ── The signal vocabulary ───────────────────────────────────────────────────
// Every id names ONE official's signal. The art module (lib/signalArt.tsx) owns 100%
// of how each id is drawn — a Record<SignalKey, …> there is exhaustiveness-checked by
// the compiler, so adding a key here without art is a type error, and swapping the art
// later is a one-file job because nothing here knows about pixels.

export type SignalKey =
  // MLB — plate/base umpire mechanics
  | 'mlb-strike' | 'mlb-out' | 'mlb-safe' | 'mlb-time' | 'mlb-fair'
  | 'mlb-homerun' | 'mlb-infield-fly' | 'mlb-count' | 'mlb-foul-tip' | 'mlb-delayed-dead'
  // NFL — referee signals (NFL signal chart)
  | 'nfl-touchdown' | 'nfl-incomplete' | 'nfl-first-down' | 'nfl-holding' | 'nfl-false-start'
  | 'nfl-offside' | 'nfl-pass-interference' | 'nfl-personal-foul' | 'nfl-safety'
  | 'nfl-delay' | 'nfl-timeout' | 'nfl-facemask' | 'nfl-unsportsmanlike'
  // NBA — referee mechanics (NBA/FIBA/NFHS shared grammar)
  | 'nba-foul' | 'nba-violation' | 'nba-travel' | 'nba-technical' | 'nba-jump-ball'
  | 'nba-blocking' | 'nba-charge' | 'nba-shot-clock' | 'nba-three-attempt'
  | 'nba-three-good' | 'nba-count-basket' | 'nba-direction'
  // NHL — referee/linesman signals (USA Hockey Appendix 3 / NHL rulebook)
  | 'nhl-goal' | 'nhl-trip' | 'nhl-hook' | 'nhl-hold' | 'nhl-slash' | 'nhl-highstick'
  | 'nhl-interference' | 'nhl-board' | 'nhl-charge' | 'nhl-crosscheck'
  | 'nhl-delayed-penalty' | 'nhl-washout' | 'nhl-misconduct' | 'nhl-penalty-shot'
  // Soccer — referee + assistant referee (IFAB Laws 5/6, VAR protocol)
  | 'soc-yellow' | 'soc-red' | 'soc-indirect' | 'soc-direct' | 'soc-advantage'
  | 'soc-penalty' | 'soc-corner' | 'soc-offside-flag' | 'soc-throwin-flag'
  | 'soc-sub-flag' | 'soc-var'
  // Rugby union — World Rugby primary + secondary referee signals
  | 'rug-try' | 'rug-penalty' | 'rug-free-kick' | 'rug-scrum' | 'rug-advantage'
  | 'rug-knock-on' | 'rug-forward-pass' | 'rug-high-tackle' | 'rug-not-release'
  | 'rug-tmo' | 'rug-obstruction'
  // Cricket — umpire signals (MCC Law 2.13)
  | 'crk-out' | 'crk-four' | 'crk-six' | 'crk-wide' | 'crk-noball' | 'crk-bye'
  | 'crk-legbye' | 'crk-dead' | 'crk-short-run' | 'crk-free-hit' | 'crk-new-ball'
  | 'crk-penalty-bat' | 'crk-penalty-field' | 'crk-revoke' | 'crk-tv' | 'crk-last-hour';

// ── The scenario ────────────────────────────────────────────────────────────
export interface SignalScenario {
  id: string;            // unique within the bank, e.g. 'nfl-sig-kid-1'
  level: Level;          // the tier this scenario BELONGS to (content is tiered, not just points)
  signal: SignalKey;     // which pictogram the art module renders
  prompt: string;        // the question asked about the pictogram
  options: string[];     // 2–4 tappable answers
  answer: number;        // index into options
  title: string;         // verdict headline shown after answering
  // The teaching beat — the same signal re-explained at all four depths (the
  // exp: Record<Level, string> pattern from lib/boxCount.ts; VerdictCard's tabs let
  // the user re-read at any depth). Explains what the signal means AND what just
  // happened in the game to cause it.
  exp: Record<Level, string>;
}

// ── Registry + accessors ────────────────────────────────────────────────────
export const SIGNAL_DECODER: Record<SignalSport, SignalScenario[]> = {
  mlb: MLB_SIGNAL_SCENARIOS,
  nfl: NFL_SIGNAL_SCENARIOS,
  nba: NBA_SIGNAL_SCENARIOS,
  nhl: NHL_SIGNAL_SCENARIOS,
  soccer: SOCCER_SIGNAL_SCENARIOS,
  rugby: RUGBY_SIGNAL_SCENARIOS,
  cricket: CRICKET_SIGNAL_SCENARIOS,
};

// League key → content bank (mirrors lib/readTheScore's KEY_TO_SCORE_SPORT collapsing).
// wnba maps to the nba bank defensively — basketball officiating signals are identical —
// even though the registry descriptor doesn't list wnba today; surfacing the game there
// later is a one-line registry change, not a content job. tennis/golf intentionally absent.
const KEY_TO_SIGNAL_SPORT: Partial<Record<Sport, SignalSport>> = {
  mlb: 'mlb', nfl: 'nfl', nba: 'nba', wnba: 'nba', nhl: 'nhl',
  soccer: 'soccer', epl: 'soccer', laliga: 'soccer', worldcup: 'soccer',
  rugby: 'rugby', mlr: 'rugby', nationscup: 'rugby', sixnations: 'rugby', nationschamp: 'rugby',
  cricket: 'cricket',
};

// Resolve an Academy category's pooled sportKeys to its scenario bank. Returns null for
// key sets with no signal vocabulary (tennis/golf) — supportedSports keeps those
// categories from ever mounting the game, but the component guards anyway.
export function signalSportForKeys(sportKeys: Sport[]): SignalSport | null {
  for (const k of sportKeys) {
    const s = KEY_TO_SIGNAL_SPORT[k];
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
export function poolForLevel(bank: SignalScenario[], level: Level): SignalScenario[] {
  const byLevel = bank.filter(s => s.level === level);
  return byLevel.length ? byLevel : bank;
}
