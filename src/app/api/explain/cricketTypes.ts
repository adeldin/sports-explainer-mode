// Canonical, SOURCE-AGNOSTIC cricket delivery model. Cricsheet normalizes into this now
// (cricsheetProvider.ts); Sportmonks normalizes into the SAME shape at a later gate — neither
// source's quirks leak upward. The reducer (cricketReducer.ts) consumes ONLY this model.
//
// Design principles (settled across Gates B / 0.5 / 1):
//  - NO running state on deliveries and NO aggregates on innings. Deliveries are the single
//    source of truth; totals/figures/required-rate are FOLDED at reduction time. The only
//    derived value stored is `powerplayOvers` — because that is the one field with a SOURCE
//    QUIRK to absorb (Cricsheet emits {from:0.1,to:5.7}); storing what has quirks normalized
//    away, deriving what is a clean fold.
//  - Player identity is per-source and NEVER joined across sources ("PD Salt" vs "Philip Salt",
//    ids don't match). `sourceId` is opaque and source-scoped.
//  - `label` (e.g. "0.3") is NOT unique — a re-bowled delivery repeats it. `key` is the unique id.

export type DismissalKind =
  | 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'other';

export interface Player {
  name: string;
  /** Opaque, source-scoped id (Cricsheet registry hex / Sportmonks int). Never cross-source. */
  sourceId?: string;
}

/** Extras by category, in runs. One shape both sources map into (Sportmonks' wides-via-name
 *  asymmetry is resolved in its normalizer, not here). Absent category = 0. */
export interface CricketExtras {
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
}

export interface CricketWicket {
  kind: DismissalKind;
  playerOut: Player;
  /** Catcher / stumper / run-out fielder, where the source provides one. */
  fielder?: Player;
}

export interface CricketDelivery {
  /** Unique, synthesized: `${inningsIndex}.${over}.${seqInOver}`. Stable across re-pulls. */
  key: string;
  /** 0-based over number. */
  over: number;
  /** DERIVED legal-ball index within the over (1..6). Extras do NOT advance it. */
  ballInOver: number;
  /** Display label, e.g. "0.3". NOT unique — re-bowls repeat it. */
  label: string;
  /** false for wides and no-balls (does not consume a legal ball). */
  isLegal: boolean;
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  /** Runs off the bat, credited to the striker. */
  runsOffBat: number;
  extras: CricketExtras;
  /** runsOffBat + all extras. Invariant-checked at normalize time. */
  runsTotal: number;
  /** Present only on a wicket delivery. */
  wicket?: CricketWicket;
  /** Live cursor (Sportmonks per-ball timestamp). Absent for post-match Cricsheet. */
  updatedAt?: string;
}

export interface CricketOver {
  over: number;
  /** May exceed 6 entries when the over contains extras. */
  deliveries: CricketDelivery[];
}

export interface CricketInnings {
  /** 1-based innings number. */
  index: number;
  battingTeam: string;
  overs: CricketOver[];
  /** NORMALIZED integer half-open range [startOver, endOverExclusive) of the mandatory
   *  powerplay. Absorbs Cricsheet's fractional {from,to} quirk. Optional: a source without
   *  powerplay data (likely Sportmonks) omits it and the reducer still derives death by convention. */
  powerplayOvers?: [number, number];
}

export interface CricketMatch {
  source: 'cricsheet' | 'sportmonks';
  /** Cricinfo match id (Cricsheet filename) / Sportmonks fixture id. */
  matchId: string;
  /** 'T20' | 'ODI' | 'Test'. */
  format: string;
  /** Legal overs per innings (20 for T20). Drives death-phase + required-rate math. */
  oversPerInnings: number;
  teams: [string, string];
  venue: string;
  /** ISO date, e.g. "2026-07-11". */
  date: string;
  toss?: { winner: string; decision: 'bat' | 'field' };
  outcome?: { winner: string; by: string };
  playerOfMatch?: string;
  innings: CricketInnings[];
}
