// Strategy-tip content bank for Coach's Corner — the "Today's Strategy Tip" card. The voice is a
// transferable WAY OF WATCHING, not trivia or a rule: each tip should change what the reader's eyes
// do during the next broadcast. Originally soccer/NFL/MLB (curated from a 3-AI batch, de-duped);
// extended in v1.5 to the five sports Coach's Corner gained — NBA, rugby, tennis, golf, cricket —
// so no sport shows an empty card. (BUILD_COACHES_CORNER_GATE5.md Gate 5B.)

import type { Sport } from "./api";

export interface StrategyTip {
  id: string;          // stable, e.g. "soccer-001"
  sport: "soccer" | "mlb" | "nfl" | "nba" | "rugby" | "tennis" | "golf" | "cricket";
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

  // ---------- NBA ----------
  { id: "nba-001", sport: "nba", conceptTag: "shot-value",
    tip: "Not all two-pointers are equal. A shot at the rim and a shot from the elbow are worth the same on the scoreboard and wildly different in the math — which is why teams sprint past the midrange to get one and refuse the other." },

  { id: "nba-002", sport: "nba", conceptTag: "help-defense",
    tip: "When a drive gets into the paint, look away from the ball at the weak-side corner. The defender there is deciding whether to stop the layup or stay with his shooter — and whichever he picks, he's conceding the other." },

  { id: "nba-003", sport: "nba", conceptTag: "pick-and-roll-coverage",
    tip: "On every screen, watch the big man's feet. Dropping into the paint dares the guard to shoot; jumping out to the ball dares him to pass. That one choice decides what the whole possession becomes." },

  { id: "nba-004", sport: "nba", conceptTag: "spacing",
    tip: "A player standing in the corner doing absolutely nothing is often the reason the drive worked. His defender can't leave, so the lane stays open." },

  { id: "nba-005", sport: "nba", conceptTag: "two-for-one",
    tip: "In the last 40 seconds of a quarter, watch the clock, not the ball. A team shooting with 32 seconds left isn't rushing — it's buying itself a second possession the opponent won't get." },

  { id: "nba-006", sport: "nba", conceptTag: "transition-defense",
    tip: "The moment a shot goes up, some players crash the glass and one or two are already retreating. That split is a coaching decision, not effort — and it's why an offensive rebound sometimes costs more than it's worth." },

  { id: "nba-007", sport: "nba", conceptTag: "fouling-up-three",
    tip: "Leading by three in the final seconds, a deliberate foul looks like panic. It's arithmetic: two free throws can never tie the game, and the tying three never gets taken." },

  { id: "nba-008", sport: "nba", conceptTag: "matchup-hunting",
    tip: "Late in close games, offenses stop running plays and start hunting one defender. Watch who keeps getting screened — that's the man they've decided is the weak link." },

  // ---------- RUGBY ----------
  { id: "rugby-001", sport: "rugby", conceptTag: "counting-the-numbers",
    tip: "At every breakdown, stop watching the ball and count shirts on each side of it. More attackers than defenders on one side is the whole game plan for the next ten seconds." },

  { id: "rugby-002", sport: "rugby", conceptTag: "ruck-resourcing",
    tip: "Every player who dives into a ruck is a player missing from the next attack. The best sides commit the fewest bodies they can get away with — that's where overlaps come from." },

  { id: "rugby-003", sport: "rugby", conceptTag: "draw-and-pass",
    tip: "Two attackers against one defender isn't automatic. The carrier has to run AT the defender until he commits, then release. Pass too early and one man covers both." },

  { id: "rugby-004", sport: "rugby", conceptTag: "the-penalty-menu",
    tip: "A penalty isn't just three points on offer. The captain can kick at goal, kick to touch and keep the throw, take a scrum, or tap and run — and which he picks tells you the score he's chasing." },

  { id: "rugby-005", sport: "rugby", conceptTag: "offside-line",
    tip: "Every ruck builds an invisible fence across the pitch at the last player's back foot. Defenders creep right up to it and launch the instant the ball leaves — that's why quick ball is worth so much." },

  { id: "rugby-006", sport: "rugby", conceptTag: "kicking-as-strategy",
    tip: "Kicking possession away looks like surrender and usually isn't. From a penalty the kicking side keeps the throw-in, so a long kick to touch buys forty metres and the ball." },

  { id: "rugby-007", sport: "rugby", conceptTag: "the-jackal",
    tip: "The player bent over the ball the instant a tackle is made is trying to steal it — and he's only legal while he stays on his feet. That one-second window decides a shocking number of matches." },

  { id: "rugby-008", sport: "rugby", conceptTag: "territory",
    tip: "Watch where a leading side plays the game. Pinning the opponent inside their own twenty-two isn't caution — it's turning their every mistake into your points." },

  // ---------- TENNIS ----------
  { id: "tennis-001", sport: "tennis", conceptTag: "serve-placement",
    tip: "Before the serve, look at the returner's feet, not the server's toss. Where he's standing is what the server is trying to punish." },

  { id: "tennis-002", sport: "tennis", conceptTag: "serve-plus-one",
    tip: "The serve is half a weapon; the ball after it is the other half. Great servers aren't aiming for aces — they're aiming to make the next shot easy." },

  { id: "tennis-003", sport: "tennis", conceptTag: "recovery-position",
    tip: "After every shot, watch where the player runs to. Not the middle of the court — the spot that splits the opponent's two best angles." },

  { id: "tennis-004", sport: "tennis", conceptTag: "the-short-ball",
    tip: "A short ball is an invitation only if it's high enough to hit down on. Below the net cord it's a trap, and the smart move is to reset and wait for a better one." },

  { id: "tennis-005", sport: "tennis", conceptTag: "angle-opens-angle",
    tip: "Every wide shot you hit opens the court for your opponent too. That's why the safest place to hurt someone is often deep down the middle." },

  { id: "tennis-006", sport: "tennis", conceptTag: "passing-vs-lobbing",
    tip: "Against a player at the net, his distance from it picks your shot. Crowding the net means lob him; hanging back near the service line means he's inviting the lob — so pass." },

  { id: "tennis-007", sport: "tennis", conceptTag: "second-serve-pressure",
    tip: "The second serve is the most honest number in tennis. Players win around 70% behind a first serve and closer to half behind a second — which is why returners step in the moment they see a fault." },

  { id: "tennis-008", sport: "tennis", conceptTag: "margin-under-pressure",
    tip: "Watch a player's net clearance when the score gets tight. Aiming a foot higher over the net is what nerve actually looks like from the stands." },

  // ---------- GOLF ----------
  { id: "golf-001", sport: "golf", conceptTag: "dispersion",
    tip: "Nobody aims a golf shot — they aim a pattern. Every swing lands somewhere inside an oval, and good strategy is picking targets where every somewhere is still fine." },

  { id: "golf-002", sport: "golf", conceptTag: "sucker-pins",
    tip: "The flag is often bait. When it's tucked a few paces from a bunker, the middle of the green is the shot that pros actually play — and the one that scores better." },

  { id: "golf-003", sport: "golf", conceptTag: "short-siding",
    tip: "Missing on the same side as the flag is the expensive miss. From the fat side of the green you get up and down about half the time; short-sided, closer to a quarter." },

  { id: "golf-004", sport: "golf", conceptTag: "lay-up-distance",
    tip: "Laying up to a 'comfortable full wedge' costs strokes. The numbers are blunt: closer is better, even from worse grass — advance as far as the trouble safely allows." },

  { id: "golf-005", sport: "golf", conceptTag: "hazard-geometry",
    tip: "Driver isn't the risky club — the wrong yardage is. Trouble pinches the hole at a specific distance, and the smart club is whichever one's landing pattern misses it." },

  { id: "golf-006", sport: "golf", conceptTag: "recovery-decisions",
    tip: "In the trees, compare the gap's width to your shot's spread. If the pattern is wider than the opening, the hero shot is a lottery ticket and the punch-out is the score." },

  { id: "golf-007", sport: "golf", conceptTag: "match-vs-stroke-play",
    tip: "The same shot can be right and wrong on the same hole. In stroke play you protect a number; in match play, one down with two to play, the safe shot guarantees the loss it's avoiding." },

  { id: "golf-008", sport: "golf", conceptTag: "wind-and-carry",
    tip: "Watch the carry number, not the total. Wind and slope change how far the ball flies before it lands — and it's the flight, not the roll, that clears the water." },

  // ---------- CRICKET ----------
  { id: "cricket-001", sport: "cricket", conceptTag: "field-setting",
    tip: "Before each ball, look at the empty spaces, not the fielders. The captain is deliberately conceding something — and what he concedes tells you the mistake he's hunting." },

  { id: "cricket-002", sport: "cricket", conceptTag: "the-two-resources",
    tip: "A chase has two resources: balls left and wickets left. A side needing ten an over with eight wickets in hand is in better shape than one needing six with two — the run rate alone lies." },

  { id: "cricket-003", sport: "cricket", conceptTag: "drs",
    tip: "A review isn't for every close call. Ball-tracking checks three things in order — where it pitched, where it struck, and whether it was hitting — and failing any one of them ends the appeal." },

  { id: "cricket-004", sport: "cricket", conceptTag: "umpires-call",
    tip: "'Umpire's call' isn't a cop-out. When the ball only clips the stumps, the technology defers to the human — so a marginal review keeps the original decision, whichever way it went." },

  { id: "cricket-005", sport: "cricket", conceptTag: "boundary-geometry",
    tip: "Grounds aren't circles. When one boundary is twenty metres shorter than the other, a bowler aiming wide of off stump isn't being wayward — he's making the batter hit to the long side." },

  { id: "cricket-006", sport: "cricket", conceptTag: "the-jackal-of-cricket",
    tip: "A fielder crouched close behind the bat isn't decoration. He's there for the one ball in ten that grazes the edge — and when a new batter arrives, watch how many of them appear." },

  { id: "cricket-007", sport: "cricket", conceptTag: "bowling-changes",
    tip: "The bowler with the best figures isn't automatically the right bowler for the next over. Figures describe the past; the matchup and the short boundary describe what's about to happen." },

  { id: "cricket-008", sport: "cricket", conceptTag: "format-changes-everything",
    tip: "The same situation demands opposite cricket in different formats. Blocking out the last over is a heroic draw in a Test and an inexcusable loss in a T20." },
];

// Tips for a logical sport. Soccer's four Sport keys all map to the "soccer" bank.
export function tipsForSport(sport: Sport): StrategyTip[] {
  if (sport === "mlb") return STRATEGY_TIPS.filter(t => t.sport === "mlb");
  if (sport === "nfl") return STRATEGY_TIPS.filter(t => t.sport === "nfl");
  if (sport === "soccer" || sport === "worldcup" || sport === "epl" || sport === "laliga")
    return STRATEGY_TIPS.filter(t => t.sport === "soccer");
  // v1.5 sports. Rugby ships under several competition keys; they all share the rugby bank.
  if (sport === "nba" || sport === "wnba") return STRATEGY_TIPS.filter(t => t.sport === "nba");
  if (sport === "rugby" || sport === "mlr" || sport === "nationscup" || sport === "sixnations" || sport === "nationschamp")
    return STRATEGY_TIPS.filter(t => t.sport === "rugby");
  if (sport === "tennis") return STRATEGY_TIPS.filter(t => t.sport === "tennis");
  if (sport === "golf") return STRATEGY_TIPS.filter(t => t.sport === "golf");
  if (sport === "cricket") return STRATEGY_TIPS.filter(t => t.sport === "cricket");
  return [];
}
