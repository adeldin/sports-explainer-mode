// Soccer strategy tips for Coach's Corner — "Today's Strategy Tip" card.
// Curated from a 3-AI batch (ChatGPT/Gemini/Perplexity), de-duped, best phrasing of each
// distinct lens kept. The voice: a transferable WAY OF WATCHING, not trivia or a rule.
// Shape mirrors the other content banks (keyed by logical sport, a tag for future bridging).

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
];
