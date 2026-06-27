// Strategy-tip content bank for Coach's Corner — the "Today's Strategy Tip" card. Curated from a 3-AI
// batch (ChatGPT/Gemini/Perplexity), de-duped. 42 tips: soccer 14, nfl 14, mlb 14. The voice is a
// transferable WAY OF WATCHING, not trivia or a rule. (BUILD_COACHES_CORNER_GATE5.md Gate 5B.)

import type { Sport } from "./api";

export interface StrategyTip {
  id: string;          // stable, e.g. "soccer-001"
  sport: "soccer" | "mlb" | "nfl";  // grows as content lands
  tip: string;         // 1-2 sentences, the insight
  conceptTag: string;  // kebab-case principle (bridge hook, unused in v1)
}

export const STRATEGY_TIPS: StrategyTip[] = [
  // ---------- SOCCER ----------
  { id: "soccer-001", sport: "soccer", conceptTag: "off-ball-movement",
    tip: "Most fans watch the player with the ball; coaches watch the players running away from it to open passing lanes." },

  { id: "soccer-002", sport: "soccer", conceptTag: "decoy-runs",
    tip: "A striker's most important runs often never receive the ball — they sprint to drag a defender away and open space for a teammate." },

  { id: "soccer-003", sport: "soccer", conceptTag: "drawing-the-defense",
    tip: "Passing backward isn't stalling. It's bait — pulling the defense out of its tight shape until a gap finally opens." },

  { id: "soccer-004", sport: "soccer", conceptTag: "transition-defense",
    tip: "When a team loses the ball, count the first five seconds: are they swarming to win it back, or dropping into a wall? That's their whole defensive philosophy." },

  { id: "soccer-005", sport: "soccer", conceptTag: "compactness",
    tip: "Watch the gap between a team's defenders and midfielders. If that space grows too big, the opponent will pour through it." },

  { id: "soccer-006", sport: "soccer", conceptTag: "space",
    tip: "Watch the spaces between defenders, not the defenders themselves. Soccer attacks the gaps, not the bodies." },

  { id: "soccer-007", sport: "soccer", conceptTag: "pressing-triggers",
    tip: "Sometimes a team lets the opponent have the ball in their own half on purpose — waiting to trap them the moment they cross midfield." },

  { id: "soccer-008", sport: "soccer", conceptTag: "set-piece-design",
    tip: "On a corner, fans see a chaotic scramble; coaches see a rehearsed routine designed to block the keeper's line of sight." },

  { id: "soccer-009", sport: "soccer", conceptTag: "showing-outside",
    tip: "Watch which foot a defender forces the attacker onto. Good defenders constantly steer players to their weaker side to limit options." },

  { id: "soccer-010", sport: "soccer", conceptTag: "attacking-width",
    tip: "The modern fullback isn't just a defender. They often provide the width that lets the forwards move closer to goal." },

  { id: "soccer-011", sport: "soccer", conceptTag: "scanning",
    tip: "Watch the player who checks their shoulder before the ball arrives. That tiny look decides whether their next touch is safe, sharp, or rushed." },

  { id: "soccer-012", sport: "soccer", conceptTag: "covering-for-teammates",
    tip: "When a defender looks out of position, check if they're covering a teammate's space. Good defense looks wrong in slow motion but right in real time." },

  { id: "soccer-013", sport: "soccer", conceptTag: "gravity",
    tip: "The striker's hidden job is often to occupy defenders, not score. If two center backs worry about one forward, space opens everywhere else." },

  { id: "soccer-014", sport: "soccer", conceptTag: "territory",
    tip: "Fans see possession; coaches see where it happens. Keeping the ball near your own goal is very different from keeping it in dangerous areas." },

  // ---------- NFL ----------
  { id: "nfl-001", sport: "nfl", conceptTag: "defensive-shell",
    tip: "Most fans watch the quarterback; coaches watch the safeties before the snap. Their depth often reveals whether the defense fears a deep shot or is crowding the run." },

  { id: "nfl-002", sport: "nfl", conceptTag: "run-pass-tells",
    tip: "Watch the offensive linemen right after the snap. If they fire forward, it's a run; if they step back, it's a pass." },

  { id: "nfl-003", sport: "nfl", conceptTag: "blocking",
    tip: "Fans see a running back hit a hole; coaches see who created the crease. The run is often won before the back even gets the ball." },

  { id: "nfl-004", sport: "nfl", conceptTag: "route-combinations",
    tip: "Watch the receiver who doesn't get the ball. His route may be clearing space for someone else to break open underneath." },

  { id: "nfl-005", sport: "nfl", conceptTag: "field-position",
    tip: "A punt can feel like giving up, but field position is strategy. Sometimes the smartest play is making the other team drive the long way." },

  { id: "nfl-006", sport: "nfl", conceptTag: "leverage",
    tip: "Fans notice speed; coaches notice leverage. A defender can win with the right angle even without being faster." },

  { id: "nfl-007", sport: "nfl", conceptTag: "down-and-distance",
    tip: "Watch third down like a mini-game. The distance needed changes everything — routes, pressure, coverage, and how much risk each team can take." },

  { id: "nfl-008", sport: "nfl", conceptTag: "motion-reveals-coverage",
    tip: "Before the snap, watch if one offensive player runs across the formation. The defense's reaction reveals man-to-man versus zone." },

  { id: "nfl-009", sport: "nfl", conceptTag: "discipline-vs-bite",
    tip: "On play-action, fans stare at the fake handoff; coaches watch the linebackers to see who bites and who holds their ground." },

  { id: "nfl-010", sport: "nfl", conceptTag: "pass-protection",
    tip: "The running back's most crucial play might be staying in to block a blitzing linebacker so the quarterback has time to throw." },

  { id: "nfl-011", sport: "nfl", conceptTag: "risk-management",
    tip: "A quarterback throwing the ball away out of bounds looks like a failure, but coaches praise it — it saves the team from a disastrous sack." },

  { id: "nfl-012", sport: "nfl", conceptTag: "bend-dont-break",
    tip: "Sometimes a defense lets a receiver catch a short pass on purpose, preferring the easy tackle over the risk of a deep touchdown." },

  { id: "nfl-013", sport: "nfl", conceptTag: "pre-snap-communication",
    tip: "The center's biggest job happens before the snap. Watch him point at defenders, telling the line who to block." },

  { id: "nfl-014", sport: "nfl", conceptTag: "box-count",
    tip: "A deep safety rarely makes the tackle on a run, but his alignment dictates whether the offense even tries to run at all." },

  // ---------- MLB ----------
  { id: "mlb-001", sport: "mlb", conceptTag: "count-leverage",
    tip: "Most fans watch the pitch; coaches watch the count. The same fastball can be safe, risky, or obvious depending on who's ahead." },

  { id: "mlb-002", sport: "mlb", conceptTag: "pitch-plan",
    tip: "Watch where the catcher sets his glove before the pitch. That target tells you the plan before the ball even leaves the pitcher's hand." },

  { id: "mlb-003", sport: "mlb", conceptTag: "plate-discipline",
    tip: "Fans see a batter take a strike down the middle and think he's passive; coaches see discipline — not every hittable pitch is the one he came to attack." },

  { id: "mlb-004", sport: "mlb", conceptTag: "defensive-positioning",
    tip: "Watch the infielders before the pitch. Where they stand — in, back, or shifted — quietly tells you what the defense is most afraid of." },

  { id: "mlb-005", sport: "mlb", conceptTag: "reading-the-pitcher",
    tip: "A stolen base isn't really about the runner's speed. It's about timing the pitcher's delivery to home — the jump matters more than the legs." },

  { id: "mlb-006", sport: "mlb", conceptTag: "situational-hitting",
    tip: "A slow grounder to the right side can be a successful at-bat if it moves a runner from second to third. Baseball rewards small pressure, not just big swings." },

  { id: "mlb-007", sport: "mlb", conceptTag: "chase-pitches",
    tip: "A pitch thrown in the dirt on purpose is a trap — designed to make an overeager batter chase something unhittable." },

  { id: "mlb-008", sport: "mlb", conceptTag: "pitch-framing",
    tip: "A catcher subtly pulling a borderline pitch into the zone can steal extra strikes and quietly flip the momentum of an inning." },

  { id: "mlb-009", sport: "mlb", conceptTag: "disrupting-timing",
    tip: "Fans marvel at a 100-mph fastball, but it only works because a slower curveball makes the batter's brain hesitate first." },

  { id: "mlb-010", sport: "mlb", conceptTag: "field-general",
    tip: "Most fans see the catcher as just catching; coaches see a traffic director — constantly adjusting pitchers, fielders, and pitch choices." },

  { id: "mlb-011", sport: "mlb", conceptTag: "matchup-management",
    tip: "Fans see a pitching change as a simple substitution; coaches see matchup math. One batter can change the whole risk of an inning." },

  { id: "mlb-012", sport: "mlb", conceptTag: "hitter-adjustment",
    tip: "A foul ball is a clue, not just a miss. It shows whether the hitter is early, late, or starting to time the pitcher up." },

  { id: "mlb-013", sport: "mlb", conceptTag: "run-exchange",
    tip: "Watch the runner on third with less than two outs. The offense may trade an out for a run — and that can be winning baseball." },

  { id: "mlb-014", sport: "mlb", conceptTag: "backing-up-plays",
    tip: "When a ball is hit to the outfield, watch the pitcher sprint to back up a base in case of a bad throw. The work doesn't stop at the mound." },
];

// Tips for a logical sport. Soccer's four Sport keys all map to the "soccer" bank.
export function tipsForSport(sport: Sport): StrategyTip[] {
  if (sport === "mlb") return STRATEGY_TIPS.filter(t => t.sport === "mlb");
  if (sport === "nfl") return STRATEGY_TIPS.filter(t => t.sport === "nfl");
  if (sport === "soccer" || sport === "worldcup" || sport === "epl" || sport === "laliga")
    return STRATEGY_TIPS.filter(t => t.sport === "soccer");
  return [];
}
