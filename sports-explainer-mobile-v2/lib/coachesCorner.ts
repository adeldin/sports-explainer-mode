// Coach's Corner content-signal helper — computes the tab's data-driven sport list and each sport's
// available pieces. Make the Call has sportsWithContent(level); formations + read-the-play are
// soccer-only by construction. A sport appears in the tab iff it has ≥1 piece, so the list grows
// itself as content is authored. (BUILD_COACHES_CORNER_TAB.md Gate 4.1.)

import type { Sport, Level } from "./api";
import { sportsWithContent, resolveBank } from "./makeTheCall";

// The pieces a sport can offer in Coach's Corner.
export type CCPieceId =
  | "make-the-call" | "formations" | "read-the-play" | "box-count" | "onside-or-off"
  | "wheres-the-play" | "find-the-open-man"
  | "coach-speak"                                        // NFL terminology explorer (no scoring)
  // — v1.5 field modules, ported from the Coach's Corner spikes —
  | "fourth-down-call"                                   // NFL
  | "count-leverage" | "steal-or-stay"                   // MLB
  | "press-trigger" | "counter-or-keep"                  // soccer
  | "posts-corner-or-scrum"                              // rugby
  | "help-or-stay"                                       // NBA
  | "approach-or-stay"                                   // tennis
  | "go-or-lay" | "sucker-pin"                           // golf
  | "review-or-save"                                     // cricket
  // — v1.5 wave 2 —
  | "rpo-give-or-pull" | "motion-man-or-zone" | "read-the-coverage"   // NFL
  | "infield-in-or-back" | "tag-up"                                   // MLB
  | "switch-the-play"                                                 // soccer
  | "serve-target"                                                    // tennis
  | "the-pinch"                                                       // golf
  | "set-the-trap"                                                    // cricket
  | "numbers-out-wide" | "draw-and-pass" | "how-many-in" | "wheres-the-line"   // rugby
  | "pick-your-poison" | "two-for-one" | "foul-up-three"                       // NBA
  | "serve-plus-one" | "pass-or-lob"                                           // tennis
  | "escape-or-hero"                                                           // golf
  | "pace-the-chase" | "bowl-or-change";                                       // cricket

// Formations + read-the-play are soccer-only by construction.
const SOCCER_KEYS: Sport[] = ["soccer", "epl", "laliga", "worldcup"];
function isSoccer(sport: Sport): boolean { return SOCCER_KEYS.includes(sport); }

// Rugby ships under several competition keys; all of them get the rugby pieces.
const RUGBY_KEYS: Sport[] = ["rugby", "mlr", "nationscup", "sixnations", "nationschamp"];
function isRugby(sport: Sport): boolean { return RUGBY_KEYS.includes(sport); }

// Which pieces does this sport have, at this level?
// (level matters for Make the Call — a sport with no scenarios at this level shouldn't list it.
// Formations + read-the-play exist at every level, since FORMATION_EXPLANATIONS covers all 4 levels.)
export function piecesForSport(sport: Sport, level: Level): CCPieceId[] {
  const pieces: CCPieceId[] = [];
  const bank = resolveBank(sport);
  if (bank && sportsWithContent(level).includes(bank)) pieces.push("make-the-call");
  if (isSoccer(sport)) { pieces.push("formations", "read-the-play", "onside-or-off"); }
  // NFL field modules — content at every level (all four depths authored), so both appear at every tier.
  if (sport === "nfl") pieces.push("box-count", "find-the-open-man");
  // Where's the Play? — MLB field module, tier-independent (situation tabs, no difficulty tiers). Pushed
  // at every level, so MLB now has content at Rookie too and no longer greys out there — intended.
  if (sport === "mlb") pieces.push("wheres-the-play");

  // v1.5 field modules. Like Where's the Play, these are scenario-tabbed and tier-independent
  // (all four COACH'S READ depths are authored inside each module), so they're pushed at every level.
  if (sport === "nfl") pieces.push("fourth-down-call");
  // Coach Speak — a glossary, not a scenario. Tier-independent like the other explorers.
  if (sport === "nfl") pieces.push("coach-speak");
  if (sport === "mlb") pieces.push("count-leverage", "steal-or-stay");
  if (isSoccer(sport)) pieces.push("press-trigger", "counter-or-keep");
  if (isRugby(sport)) pieces.push("posts-corner-or-scrum");
  if (sport === "nba") pieces.push("help-or-stay");
  if (sport === "tennis") pieces.push("approach-or-stay");
  if (sport === "golf") pieces.push("go-or-lay", "sucker-pin");
  if (sport === "cricket") pieces.push("review-or-save");

  // wave 2 — same tier-independent rule
  if (sport === "nfl") pieces.push("rpo-give-or-pull", "motion-man-or-zone", "read-the-coverage");
  if (sport === "mlb") pieces.push("infield-in-or-back", "tag-up");
  if (isSoccer(sport)) pieces.push("switch-the-play");
  if (sport === "tennis") pieces.push("serve-target");
  if (sport === "golf") pieces.push("the-pinch");
  if (sport === "cricket") pieces.push("set-the-trap");
  if (isRugby(sport)) pieces.push("numbers-out-wide", "draw-and-pass", "how-many-in", "wheres-the-line");
  if (sport === "nba") pieces.push("pick-your-poison", "two-for-one", "foul-up-three");
  if (sport === "tennis") pieces.push("serve-plus-one", "pass-or-lob");
  if (sport === "golf") pieces.push("escape-or-hero");
  if (sport === "cricket") pieces.push("pace-the-chase", "bowl-or-change");
  return pieces;
}

// A stable display list for the Coach's Corner sport strip: the sports that have ANY piece.
// Each entry carries a representative Sport key + emoji + label for the strip.
export interface CCSport { key: Sport; emoji: string; label: string; }

// The candidate sports CC can show (one representative key per logical sport).
// Soccer is represented by 'soccer'. Extend this as content for new sports lands (e.g. add 'nba'
// here once Make the Call has NBA scenarios — it then appears automatically).
const CC_CANDIDATES: CCSport[] = [
  { key: "soccer", emoji: "⚽", label: "Soccer" },
  { key: "mlb", emoji: "⚾", label: "MLB" },
  { key: "nfl", emoji: "🏈", label: "NFL" },
  { key: "nba", emoji: "🏀", label: "NBA" },
  { key: "rugby", emoji: "🏉", label: "Rugby" },
  { key: "tennis", emoji: "🎾", label: "Tennis" },
  { key: "golf", emoji: "⛳", label: "Golf" },
  { key: "cricket", emoji: "🏏", label: "Cricket" },
];

// A candidate + whether it has any piece at this level. We now return ALL candidates (not just the
// ones with content) so MLB/NFL render DIMMED + untappable at levels with no scenarios, instead of
// disappearing. Soccer is always enabled (level-independent formations/read-the-play).
export type CCSportEntry = CCSport & { enabled: boolean };
export function coachesCornerSports(level: Level): CCSportEntry[] {
  return CC_CANDIDATES.map(c => ({ ...c, enabled: piecesForSport(c.key, level).length > 0 }));
}
