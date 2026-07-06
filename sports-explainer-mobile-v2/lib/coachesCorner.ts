// Coach's Corner content-signal helper — computes the tab's data-driven sport list and each sport's
// available pieces. Make the Call has sportsWithContent(level); formations + read-the-play are
// soccer-only by construction. A sport appears in the tab iff it has ≥1 piece, so the list grows
// itself as content is authored. (BUILD_COACHES_CORNER_TAB.md Gate 4.1.)

import type { Sport, Level } from "./api";
import { sportsWithContent, resolveBank } from "./makeTheCall";

// The pieces a sport can offer in Coach's Corner.
export type CCPieceId = "make-the-call" | "formations" | "read-the-play" | "box-count" | "onside-or-off" | "wheres-the-play";

// Formations + read-the-play are soccer-only by construction.
const SOCCER_KEYS: Sport[] = ["soccer", "epl", "laliga", "worldcup"];
function isSoccer(sport: Sport): boolean { return SOCCER_KEYS.includes(sport); }

// Which pieces does this sport have, at this level?
// (level matters for Make the Call — a sport with no scenarios at this level shouldn't list it.
// Formations + read-the-play exist at every level, since FORMATION_EXPLANATIONS covers all 4 levels.)
export function piecesForSport(sport: Sport, level: Level): CCPieceId[] {
  const pieces: CCPieceId[] = [];
  const bank = resolveBank(sport);
  if (bank && sportsWithContent(level).includes(bank)) pieces.push("make-the-call");
  if (isSoccer(sport)) { pieces.push("formations", "read-the-play", "onside-or-off"); }
  // Box Count — NFL field module, content at every level (all four difficulties authored).
  if (sport === "nfl") pieces.push("box-count");
  // Where's the Play? — MLB field module, tier-independent (situation tabs, no difficulty tiers). Pushed
  // at every level, so MLB now has content at Rookie too and no longer greys out there — intended.
  if (sport === "mlb") pieces.push("wheres-the-play");
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
];

// A candidate + whether it has any piece at this level. We now return ALL candidates (not just the
// ones with content) so MLB/NFL render DIMMED + untappable at levels with no scenarios, instead of
// disappearing. Soccer is always enabled (level-independent formations/read-the-play).
export type CCSportEntry = CCSport & { enabled: boolean };
export function coachesCornerSports(level: Level): CCSportEntry[] {
  return CC_CANDIDATES.map(c => ({ ...c, enabled: piecesForSport(c.key, level).length > 0 }));
}
