// Zone Tap — Soccer bank (pooled category: soccer/epl/laliga/worldcup). Zones/positions
// only (rule-based, evergreen). Pure data, zero RN imports. Coordinates: SoccerPitch
// viewBox 680×420 — attack LEFT→RIGHT: right penalty box x=578..674 (y=110..310), right
// 6-yard box x=634..674 (y=160..260), goal at x=674 (y=180..240), center (340,210) r=44.
import { ZoneScenario, circle, rectSpot, ball, att, def } from '../zoneTapRegions';

// Context-mark shorthands (owner feedback pass): 'att' = your team (attacking L→R
// unless the prompt flips it), 'def' = opposition. The keeper is drawn wherever the
// scene needs a goal defended — truthfully inside a candidate region when that IS the
// scene (keeper on his line). The player the prompt asks the user to LOCATE is never drawn.

const GOAL_MOUTH = rectSpot('goal', 655, 172, 24, 76);
const CENTER_SPOT = circle('centerspot', 340, 210, 20);
const CENTER_CIRCLE = circle('centercircle', 340, 210, 44);
const PEN_SPOT = circle('penspot', 610, 210, 15);
const CORNER_TOP = circle('cornertop', 666, 16, 12);
const CORNER_BOT = circle('cornerbot', 666, 404, 12);
const SIX_YARD = rectSpot('sixyard', 634, 160, 40, 100);
const PEN_AREA = rectSpot('penarea', 578, 110, 96, 200);
const TOP_OF_BOX = circle('topofbox', 564, 210, 20);
const WING_TOP = rectSpot('wingtop', 380, 12, 240, 68);
const OWN_HALF = rectSpot('ownhalf', 10, 12, 322, 396);
const ATT_HALF = rectSpot('atthalf', 348, 12, 322, 396);
const HALFWAY = rectSpot('halfway', 330, 12, 20, 396);
const GK = circle('gk', 652, 210, 13);

export const SOCCER_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'soc-kid-1', level: 'kid',
    prompt: 'You attack left → right. Tap the GOAL you score in.',
    spots: [GOAL_MOUTH, CENTER_CIRCLE, CORNER_BOT], answer: 'goal',
    marks: [att(270, 200), ball(283, 205), def(500, 210), def(560, 160), def(662, 210, 'GK')],
    title: 'The goal: the whole point',
    exp: {
      kid: 'Get the ball into the net at the end you’re attacking — that’s a goal, worth exactly one, and it’s the only way to score!',
      beginner: 'The WHOLE ball must cross the goal line between the posts and under the bar. Teams swap ends at halftime.',
      intermediate: 'Goal-line technology exists because "wholly over the line" is millimeters — a ball 99% over is NOT a goal.',
      expert: 'Everything in soccer tactics is a fight over this 8-yard mouth: blocks, low blocks, near-post runs, far-post crosses — every named concept is geometry relative to these posts.',
    },
  },
  {
    id: 'soc-kid-2', level: 'kid',
    prompt: 'Tap the CENTER SPOT — where kickoff happens.',
    spots: [CENTER_SPOT, GOAL_MOUTH, CORNER_TOP, SIX_YARD], answer: 'centerspot',
    marks: [att(300, 140), att(295, 210), att(300, 280), def(385, 140), def(380, 210), def(385, 280)],
    title: 'Kickoff from the middle',
    exp: {
      kid: 'Every game (and every restart after a goal) begins with the ball sitting on the little dot in the exact middle.',
      beginner: 'Kickoff rules: ball on the spot, opponents outside the center circle, and the ball may go in any direction — even straight backward.',
      intermediate: 'After a goal, the team that CONCEDED kicks off. Halftime flips both ends and first kick.',
      expert: 'Kickoff plays are choreographed now — immediate long balls to a target wing or rehearsed give-and-gos. Some teams treat the first 8 seconds after kickoff as a set piece.',
    },
  },
  {
    id: 'soc-kid-3', level: 'kid',
    prompt: 'Tap the PENALTY SPOT.',
    spots: [PEN_SPOT, CENTER_SPOT, CORNER_TOP, GOAL_MOUTH], answer: 'penspot',
    marks: [att(585, 222), att(560, 150), att(558, 272), def(666, 210, 'GK')],
    title: 'The penalty spot: 12 yards from goal',
    exp: {
      kid: 'When a team breaks the rules inside the big box, the other team gets a free shot from this dot — just the shooter versus the goalie!',
      beginner: 'A penalty kick: ball on the spot, 12 yards out, keeper on his line, everyone else outside the box until the kick.',
      intermediate: 'Only fouls BY the defending team INSIDE their own box become penalties — the same foul a yard outside is just a free kick.',
      expert: 'Penalty conversion runs around 75–80%, which is why box defending is a discipline of its own: defenders learn to tackle without contact, and VAR reviews live on this spot.',
    },
  },
  {
    id: 'soc-kid-4', level: 'kid',
    prompt: 'Tap a CORNER arc — where corner kicks are taken.',
    spots: [CORNER_BOT, CENTER_SPOT, PEN_SPOT, GOAL_MOUTH], answer: 'cornerbot',
    marks: [def(660, 210, 'GK'), def(640, 190), def(636, 232), att(596, 196), att(605, 242)],
    title: 'The corner arc',
    exp: {
      kid: 'If the defending team knocks the ball over their own goal line, the attackers get to kick it from the little corner curve!',
      beginner: 'Corner kick: ball inside the arc, defenders at least 10 yards away, and the kicker can’t touch it twice in a row.',
      intermediate: 'Corners are set pieces — rehearsed deliveries to the near post, far post, or penalty spot, against man or zonal marking.',
      expert: 'Corner detail worth knowing: a goal scored DIRECTLY from a corner is legal (the "olimpico"). Short corners exist to change the crossing angle and pull a defender out of the box.',
    },
  },
  {
    id: 'soc-kid-5', level: 'kid',
    prompt: 'Tap the BIG BOX — the only place the goalkeeper may use hands.',
    spots: [PEN_AREA, CENTER_CIRCLE, WING_TOP], answer: 'penarea',
    marks: [def(650, 212, 'GK'), ball(641, 204)],
    title: 'The penalty area: the keeper’s hand zone',
    exp: {
      kid: 'The goalie may grab the ball with hands ONLY inside this big box. Outside it, even the goalie must use feet like everyone else!',
      beginner: 'The 18-yard box: keeper handling is legal inside, fouls by defenders inside become penalties. It’s the most important rectangle in sports.',
      intermediate: 'Keepers sweeping OUTSIDE the box play as a fielder — legal, common, and risky. Handling even a fingertip outside is a free kick and often a card.',
      expert: 'One famous exception inside the box: the keeper may NOT handle a deliberate back-pass played by a teammate’s foot — that’s an indirect free kick, even in the six-yard box.',
    },
  },
  {
    id: 'soc-kid-6', level: 'kid',
    prompt: 'Tap where the GOALKEEPER stands.',
    spots: [GK, CENTER_SPOT, CORNER_TOP, WING_TOP], answer: 'gk',
    marks: [att(560, 208), ball(573, 212), def(600, 165), def(598, 258)],
    title: 'Keeper on the goal line',
    exp: {
      kid: 'The goalkeeper guards the goal mouth — the last line of defense, and the only player who can use hands (inside the box).',
      beginner: 'Keepers position between the ball and the goal, adjusting angle constantly — not glued to the line.',
      intermediate: 'On penalties, the keeper must have at least one foot on/above the line until the kick; on open play his positioning is all angle-cutting trigonometry.',
      expert: 'Modern keepers are also the +1 in build-up: starting positions 20+ yards off the line, sweeping behind high defensive lines. The position’s geometry doubled in size in one tactical generation.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'soc-beg-1', level: 'beginner',
    prompt: 'Tap the SIX-YARD box.',
    spots: [SIX_YARD, PEN_SPOT, CENTER_CIRCLE, CORNER_TOP], answer: 'sixyard',
    marks: [def(654, 196, 'GK')],
    title: 'The goal area: goal kicks start here',
    exp: {
      kid: 'The small box inside the big box is the six-yard box — goal kicks get placed anywhere inside it.',
      beginner: 'Two jobs: goal kicks are taken from anywhere in it, and it roughly marks the keeper’s must-command zone on crosses.',
      intermediate: 'Attacking free kicks awarded INSIDE it get moved out to the six-yard line — you’ll see the referee pace that out.',
      expert: 'Since 2019, teammates may receive goal kicks INSIDE the penalty area — that one law change created modern short-goal-kick build-up and the pressing schemes that hunt it.',
    },
  },
  {
    id: 'soc-beg-2', level: 'beginner',
    prompt: 'OFFSIDE can only happen in part of the pitch. You attack right — tap that part.',
    spots: [ATT_HALF, OWN_HALF], answer: 'atthalf',
    marks: [att(300, 206), ball(313, 210), def(430, 120), def(430, 210), def(430, 300)],
    title: 'No offside in your own half',
    exp: {
      kid: 'The offside trap only works in the half you’re ATTACKING. In your own half you can stand anywhere you like!',
      beginner: 'Offside needs three things: attacking half, ahead of the ball, and ahead of the second-last defender when the pass is played.',
      intermediate: 'The halfway line is a hard boundary: a striker standing in his own half can NEVER be offside — even if he’s behind every defender.',
      expert: 'Teams weaponize this: strikers hug the halfway line against high defensive lines, timing runs from onside "safe ground." The halfway line is effectively part of the offside line.',
    },
  },
  {
    id: 'soc-beg-3', level: 'beginner',
    prompt: 'Tap the WING — where wide players hug the touchline.',
    spots: [WING_TOP, CENTER_CIRCLE, PEN_SPOT, SIX_YARD], answer: 'wingtop',
    marks: [att(390, 175), ball(402, 180), att(400, 250), def(440, 180)],
    title: 'The flanks: width stretches defenses',
    exp: {
      kid: 'Wingers stay way out by the sideline — stretching the defense wide so gaps open in the middle.',
      beginner: 'If wide players stand narrow, defenders squeeze together and there’s no room. Hugging the touchline forces the defense to cover the whole width.',
      intermediate: 'Width is a team resource: either the winger provides it or an overlapping fullback does — someone must, or the pitch shrinks for everyone.',
      expert: 'Inverted wingers flip the logic: wide-left right-footers cut INSIDE to shoot, and the fullback underlaps or overlaps to restore width. Who holds width defines most modern systems.',
    },
  },
  {
    id: 'soc-beg-4', level: 'beginner',
    prompt: 'Your team defends the LEFT goal. Tap where your CENTER-BACKS set up.',
    spots: [circle('cbs', 120, 210, 26), circle('striker9', 560, 210, 20), WING_TOP, CENTER_CIRCLE], answer: 'cbs',
    marks: [att(16, 210, 'GK'), def(250, 204), ball(238, 208)],
    title: 'Center-backs: central, in front of their own goal',
    exp: {
      kid: 'The two big defenders stand in the middle, right in front of THEIR OWN goal — the last wall before the goalkeeper.',
      beginner: 'Center-backs protect the central lane, where goals come from. Wide areas hurt less, so fullbacks handle those.',
      intermediate: 'The pair works as a unit: one steps to press, one covers behind — never both, or the middle opens. Their line height sets the whole team’s shape.',
      expert: 'Ball-playing center-backs redefined the role: in build-up they split wide of the six-yard box to receive from the keeper — so the position now demands press-resistant passing, not just defending.',
    },
  },
  {
    id: 'soc-beg-5', level: 'beginner',
    prompt: 'Tap where a NUMBER 9 (striker) hunts for goals.',
    spots: [circle('nine', 560, 210, 20), WING_TOP, OWN_HALF, CENTER_CIRCLE], answer: 'nine',
    marks: [def(588, 140), def(588, 210), def(588, 280), def(662, 210, 'GK'), att(318, 192), ball(330, 196)],
    title: 'The striker: central, on the last defender’s shoulder',
    exp: {
      kid: 'The striker stays up front in the middle, as close to the other team’s goal as the rules allow, ready to pounce.',
      beginner: 'A classic 9 plays on the "shoulder" of the last defender — the highest legal position, one run from goal.',
      intermediate: 'His starting spot is an offside negotiation: high enough to threaten the space behind, onside enough that the through-ball counts.',
      expert: '"False 9" flips it: the striker drops INTO midfield, dragging a center-back into no-man’s land or creating a free man between the lines. The position’s power is that defenders must answer wherever it goes.',
    },
  },
  {
    id: 'soc-beg-6', level: 'beginner',
    prompt: 'Tap the HALFWAY line.',
    spots: [HALFWAY, PEN_AREA, CORNER_BOT, GOAL_MOUTH], answer: 'halfway',
    title: 'The halfway line',
    exp: {
      kid: 'The big line across the middle splits the pitch into your half and theirs.',
      beginner: 'It anchors kickoffs, defines the offside-free zone (your own half), and marks where substitutes enter.',
      intermediate: 'Defensive "lines of engagement" are described off it: a mid-block starts pressing around halfway; a high press starts well beyond it.',
      expert: 'Rest-defense conversations happen at this line: how many players stay ON it during your own corner decides whether a counter-attack becomes a footrace or a foul.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'soc-int-1', level: 'intermediate',
    prompt: 'Tap the "TOP OF THE BOX" — where cutback passes aim.',
    spots: [TOP_OF_BOX, SIX_YARD, CORNER_TOP, PEN_SPOT], answer: 'topofbox',
    marks: [att(648, 140), ball(656, 148), def(628, 188), def(618, 230), def(666, 206, 'GK'), att(520, 204)],
    title: 'The edge of the area: the cutback zone',
    exp: {
      kid: 'Just outside the big box, in the middle — a favorite spot for a pass pulled BACK from the goal line for a big shot.',
      beginner: 'When a winger reaches the byline, defenders collapse toward goal — the pull-back to the top of the box finds the runner they forgot.',
      intermediate: 'The "D" (penalty arc) exists here for one rule: keeping everyone 10 yards from the penalty spot during a kick. In open play it’s prime second-ball and cutback territory.',
      expert: 'Analytics love the cutback: the receiving shot comes with the keeper displaced and defenders facing their own goal. Elite attacks (and their rest-defense counters) are built around this zone.',
    },
  },
  {
    id: 'soc-int-2', level: 'intermediate',
    prompt: 'Corner from the TOP corner. Tap the NEAR post.',
    spots: [circle('nearpost', 666, 184, 13), circle('farpost', 666, 236, 13), PEN_SPOT], answer: 'nearpost',
    marks: [ball(669, 11), def(656, 212, 'GK'), def(640, 196), def(638, 234), att(596, 188), att(594, 240)],
    title: 'Near post = the post closest to the kicker',
    exp: {
      kid: 'The goal has two posts — the one NEARER the corner kicker is the "near post." The other one is the "far post."',
      beginner: 'Near-post runs attack the ball earliest — a flick-on there redirects the cross before the keeper or defenders can react.',
      intermediate: 'Deliveries are called by post: inswingers attack the near post and six-yard box; outswingers pull to the far post and penalty spot.',
      expert: 'Zonal setups station their best header exactly at the near post because a flick there beats EVERY subsequent zone. Watching who wins the near-post duel tells you who’s winning the set-piece game.',
    },
  },
  {
    id: 'soc-int-3', level: 'intermediate',
    prompt: 'Your team attacks RIGHT. Tap the zone your DEFENSIVE midfielder (the "6") screens.',
    spots: [circle('six', 140, 210, 26), CENTER_CIRCLE, TOP_OF_BOX, WING_TOP], answer: 'six',
    marks: [att(16, 210, 'GK'), att(85, 168), att(85, 252), def(255, 206), ball(242, 210)],
    title: 'The 6: in front of his OWN box',
    exp: {
      kid: 'One midfielder stays back near his own defenders, guarding the space in front of them like a bodyguard.',
      beginner: 'The defensive midfielder screens the zone in front of the back line — cutting passes to the opponent’s striker and mopping up counters.',
      intermediate: 'That zone (called "Zone 14" when it’s the opponent’s) is where killer passes come from — the 6’s whole job is to make it uninhabitable.',
      expert: 'In possession the 6 is the pivot: he drops between/beside the center-backs to build. The best ones defend space with positioning alone — interceptions, not tackles, are their stat.',
    },
  },
  {
    id: 'soc-int-4', level: 'intermediate',
    prompt: 'Tap the "CORRIDOR OF UNCERTAINTY" — where a driven cross causes chaos.',
    spots: [rectSpot('corridor', 616, 165, 18, 90), TOP_OF_BOX, WING_TOP, CENTER_CIRCLE], answer: 'corridor',
    marks: [att(656, 78), ball(662, 88), def(667, 208, 'GK'), def(600, 182), def(602, 240), att(545, 192), att(548, 246)],
    title: 'Between the six-yard box and the penalty spot',
    exp: {
      kid: 'A hard, low cross into the skinny strip in front of the goalie is scary for defenders — do they touch it or leave it?',
      beginner: 'Too far out for the keeper to claim, too close in for defenders to clear safely facing their own goal — every touch risks an own goal, every non-touch risks a tap-in.',
      intermediate: 'The delivery matters: driven and low across this corridor, behind the defensive line, in front of the keeper — attackers arrive facing the goal; defenders retreat facing their own net.',
      expert: 'Defensive coaching answer: drop the line EARLY so the corridor doesn’t exist, or concede the corner deliberately. The phrase itself is old English-football commentary that survived because the geometry is real.',
    },
  },
  {
    id: 'soc-int-5', level: 'intermediate',
    prompt: 'Tap where an OVERLAPPING fullback ends his run.',
    spots: [circle('overlap', 630, 55, 22), circle('wingmid', 470, 45, 18), CENTER_CIRCLE, PEN_SPOT], answer: 'overlap',
    marks: [att(468, 48), ball(480, 54), def(520, 68)],
    title: 'The overlap: outside and BEYOND the winger',
    exp: {
      kid: 'The defender from the back sprints all the way up the sideline, PAST his own winger, into the deep corner!',
      beginner: 'An overlap runs outside the winger toward the byline — the winger can pass to him or use him as a decoy to cut inside.',
      intermediate: 'Overlaps punish defenses that send only one defender wide: someone must follow the runner, and whoever does leaves space behind.',
      expert: 'Underlap vs. overlap is the modern choice: inverted wingers open the INSIDE lane for underlapping runs into the half-space. Which run the fullback makes is a fingerprint of the team’s whole model.',
    },
  },
  {
    id: 'soc-int-6', level: 'intermediate',
    prompt: 'Tap "ZONE 14" — the pocket in front of the penalty area.',
    spots: [rectSpot('zone14', 520, 160, 55, 100), WING_TOP, CENTER_CIRCLE, SIX_YARD], answer: 'zone14',
    marks: [def(596, 150), def(596, 196), def(596, 242), def(660, 210, 'GK'), att(500, 206), ball(512, 210)],
    title: 'Zone 14: the playmaker’s pocket',
    exp: {
      kid: 'The space just outside the big box, in the middle, is where the most dangerous passes in soccer are born.',
      beginner: 'Analysts grid the pitch into 18 zones; the central one outside the box is number 14. Through-balls and killer passes come from here more than anywhere.',
      intermediate: 'It’s dangerous because everything is live: a shot, a slide pass behind the line, a switch, or a dribble into the box. Defenders can’t commit to any single threat.',
      expert: 'Classic 10s lived here; modern systems fill it by rotation instead (interior midfielders, false 9s, inverted wingers) precisely because man-marking one resident is easy but marking a REVOLVING one is not.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'soc-exp-1', level: 'expert',
    prompt: 'Shot coming from a TIGHT ANGLE up top. Tap the post the keeper must seal.',
    spots: [circle('sealnear', 664, 188, 12), circle('sealfar', 664, 232, 12), PEN_SPOT], answer: 'sealnear',
    marks: [att(626, 102), ball(634, 112), def(612, 152), def(658, 206, 'GK')],
    title: 'Never beaten at the near post',
    exp: {
      kid: 'From a tight angle, the goalie hugs the closest post — getting beaten on that side is the one unforgivable goal!',
      beginner: 'Sealing the near post forces the shooter to aim across goal — a longer, harder shot the keeper has time to react to.',
      intermediate: 'The geometry: near post is the SHORT route; the keeper’s body removes it entirely, betting everything on the far side where the ball takes longer to travel.',
      expert: 'Modern nuance: keepers "post-integrate" (lean on the post) at extreme angles, and the real vulnerability becomes the cutback — which is why the near-post seal must not over-commit early.',
    },
  },
  {
    id: 'soc-exp-2', level: 'expert',
    prompt: 'The team defending the RIGHT goal drops into a LOW BLOCK. Tap where their defensive line sets up.',
    spots: [rectSpot('lowblock', 592, 135, 26, 150), HALFWAY, CENTER_CIRCLE, rectSpot('highline', 355, 135, 26, 150)], answer: 'lowblock',
    marks: [att(540, 206), ball(552, 210), att(480, 150), att(482, 266), def(664, 210, 'GK')],
    title: 'A low block defends the edge of its own box',
    exp: {
      kid: 'Sometimes a team pulls EVERYONE back near their own goal and forms a wall. That wall stands just outside their own box.',
      beginner: 'A "low block" concedes the pitch but protects the goal: the back line holds at the edge of the area so there’s no space BEHIND to run into.',
      intermediate: 'The trade: opponents get the ball and territory, but face 10 players in 30 yards. Counters launch from the block into all the space the opponent left.',
      expert: 'Beating a low block is the modern tactical problem: cutbacks, half-space entries, and shots from Zone 14 — because through-balls die when there’s no depth behind the line to attack.',
    },
  },
  {
    id: 'soc-exp-3', level: 'expert',
    prompt: 'PRESSING TRIGGER: a slow back-pass rolls toward the keeper. Tap the zone your striker sprints to.',
    spots: [circle('presszone', 640, 210, 22), CENTER_CIRCLE, OWN_HALF, WING_TOP], answer: 'presszone',
    marks: [def(668, 210, 'GK'), ball(600, 206), def(556, 240), att(536, 178)],
    title: 'Press the keeper on the trigger',
    exp: {
      kid: 'A slow pass back to the goalie is the signal — CHARGE! The goalie has to kick it away in a panic.',
      beginner: 'Pressing triggers are cues to attack: bad touches, back-passes, sideways passes to a weak foot. The back-pass is the classic one — the keeper can’t use hands.',
      intermediate: 'The striker curves his run to block one side while sprinting, steering the keeper’s clearance toward the touchline where teammates wait — a press is a funnel, not a chase.',
      expert: 'Since keepers became build-up players, this trigger is a chess opening: teams bait the press with a slow back-pass to open the field behind it. Pressing structure vs. bait is elite soccer’s core duel.',
    },
  },
  {
    id: 'soc-exp-4', level: 'expert',
    prompt: 'Tap a HALF-SPACE — the channel between the center and the wing.',
    spots: [rectSpot('halfspace', 420, 88, 180, 62), rectSpot('centrallane', 420, 180, 180, 60), rectSpot('flanklane', 420, 12, 180, 58)], answer: 'halfspace',
    marks: [def(520, 44), def(520, 118), def(520, 208), att(390, 120), ball(402, 124)],
    title: 'The half-space: the in-between lane',
    exp: {
      kid: 'Slice the pitch into five long lanes. The two lanes BETWEEN the middle and the sidelines are secret passageways coaches love.',
      beginner: 'From a half-space you can pass or shoot in every direction (the wing has a touchline blocking half your options) while defenders are unsure who should press you.',
      intermediate: 'Half-space receivers stand between defensive units: the fullback thinks "not mine, too central," the center-back thinks "not mine, too wide." That hesitation is the whole value.',
      expert: 'Positional-play systems assign the half-spaces explicitly (interior 8s, inverted wingers/fullbacks) and forbid two players sharing a lane. The concept — "Halbraum" — is the grammar of modern build-up.',
    },
  },
  {
    id: 'soc-exp-5', level: 'expert',
    prompt: 'You win the ball at YOUR box (left). Counter-attack: tap the FIRST outlet zone.',
    spots: [rectSpot('outlet', 150, 12, 170, 70), rectSpot('centerown', 130, 170, 150, 80), CORNER_TOP, CENTER_CIRCLE], answer: 'outlet',
    marks: [ball(85, 222), att(74, 228), def(108, 206), def(122, 248), def(96, 186), att(235, 44)],
    title: 'Play away from the pressure — to the flank outlet',
    exp: {
      kid: 'Right after you steal the ball, everyone’s crowded around you — so the first pass goes to a friend waiting out wide, away from the crowd.',
      beginner: 'Turnovers happen in crowds. The outlet pass to the touchline escapes the counter-press before it can trap you.',
      intermediate: 'Counters have a sequence: secure (first pass away from traffic), then vertical (run at the retreating defense). The wide outlet is "secure" — the touchline protects one side of the receiver.',
      expert: 'Opponents "rest-defend" against exactly this: their counter-press hunts the first pass for 5 seconds before retreating. Breaking that press with one wall-pass through the outlet is what makes elite counter teams elite.',
    },
  },
  {
    id: 'soc-exp-6', level: 'expert',
    prompt: 'Tap where the CUTBACK is played FROM.',
    spots: [circle('byline', 656, 138, 16), TOP_OF_BOX, PEN_SPOT, circle('wingdeep', 480, 45, 18)], answer: 'byline',
    marks: [att(560, 214), att(586, 240), def(640, 180), def(630, 232), def(664, 206, 'GK')],
    title: 'The byline, inside the box',
    exp: {
      kid: 'The passer dribbles all the way to the goal line first — THEN rolls the ball backward to a friend running in. Backwards pass, easy goal!',
      beginner: 'Reaching the byline forces every defender to turn and retreat toward their own goal — the pull-back finds attackers arriving FACING it.',
      intermediate: 'The deeper the delivery point, the more the defense collapses: byline touches drag the entire line under the ball, opening the penalty-spot and top-of-box layers behind them.',
      expert: 'This is why modern fullback/winger coaching says "win the byline, not the first cross": a blocked early cross is a transition risk; a byline cutback is statistically among the best chance types in the sport.',
    },
  },
];
