// Zone Tap — Basketball bank (shared by NBA and WNBA: same painted court; copy is
// league-neutral or names both). Court spots/zones only — rule-based, evergreen. Pure
// data, zero RN imports. Coordinates: BasketballCourt viewBox 680×360 — rims (47,180)
// and (633,180), keys x=10..143 / 537..670 (y=124..236), FT circles r=42, 3-pt arc
// r=167 about each rim with corner lines at y=26/334. "Your team attacks the RIGHT."
import { ZoneScenario, circle, rectSpot, ball, att, def } from '../zoneTapRegions';

// Context marks (owner feedback pass): 'att' = your team (attacking the RIGHT basket
// unless the prompt flips it), 'def' = opposition. The player/spot the prompt asks the
// user to LOCATE is never drawn; a dot inside a DECOY ring is allowed only when it is
// truthfully that player's real spot (e.g. jump-ball centers inside the circle).

const RIM_R = circle('rimR', 633, 180, 18);
const RIM_L = circle('rimL', 47, 180, 18);
const CENTER = circle('center', 340, 180, 40);
const PAINT_R = rectSpot('paintR', 537, 124, 133, 112);
const FT_R = circle('ftR', 537, 180, 16);
const ELBOW_R = circle('elbowR', 537, 120, 13);
const BLOCK_R = circle('blockR', 621, 244, 13);
const TOP_KEY_R = circle('topkeyR', 478, 180, 16);
const CORNER3_TOP = circle('corner3t', 620, 20, 14);
const CORNER3_BOT = circle('corner3b', 620, 340, 14);
const WING3_R = circle('wing3R', 509, 56, 16);
const HALF_LINE = rectSpot('halfline', 328, 12, 24, 336);
const BACKCOURT = rectSpot('backcourt', 14, 14, 310, 332);
const FRONTCOURT = rectSpot('frontcourt', 356, 14, 310, 332);
const LONG_TWO = circle('longtwo', 500, 120, 18);
const DUNKER = circle('dunker', 655, 255, 13);
const SLOT_R = circle('slotR', 480, 88, 16);

export const NBA_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'nba-kid-1', level: 'kid',
    prompt: 'Your team attacks the RIGHT. Tap the hoop you score in.',
    spots: [RIM_R, RIM_L, CENTER], answer: 'rimR',
    marks: [att(450, 204), ball(462, 200), att(520, 120), att(520, 244), def(560, 180), def(590, 140)],
    title: 'You score in ONE basket — the one you attack',
    exp: {
      kid: 'Each team scores in one basket and defends the other. Your basket this half is on the right!',
      beginner: 'Teams switch baskets at halftime — that’s why the scoreboard sides seem to flip mid-game.',
      intermediate: 'Attack direction organizes everything you watch: transition, "backcourt," and over-and-back all depend on which basket is yours right now.',
      expert: 'Even end-of-quarter tactics hang on direction: advancing the ball with a timeout moves it into YOUR frontcourt — a rule that only makes sense once attack direction is second nature.',
    },
  },
  {
    id: 'nba-kid-2', level: 'kid',
    prompt: 'Tap the circle where the game STARTS with a jump ball.',
    spots: [CENTER, RIM_R, CORNER3_BOT, FT_R], answer: 'center',
    marks: [att(324, 180), def(356, 180), att(300, 120), def(380, 240)],
    title: 'Tip-off at the center circle',
    exp: {
      kid: 'The referee tosses the ball up in the middle circle, and one tall player from each team jumps to tap it to a teammate.',
      beginner: 'The opening tip is the only jump ball that starts play at center; after that, possession mostly alternates or restarts with throw-ins.',
      intermediate: 'In the NBA and WNBA, held balls also get a live jump — at the nearest circle. Most other levels use the possession arrow instead.',
      expert: 'Winning the tip has a real, small edge: first shot of the game plus the possession pattern for every quarter start. Teams script their opening play around it.',
    },
  },
  {
    id: 'nba-kid-3', level: 'kid',
    prompt: 'Tap the FREE-THROW line — where you shoot after being fouled.',
    spots: [FT_R, RIM_R, CORNER3_TOP, CENTER], answer: 'ftR',
    marks: [def(600, 132), att(618, 132), def(600, 228), att(618, 228)],
    title: 'The free-throw line',
    exp: {
      kid: 'When you get fouled while shooting, you stand at this line all alone and shoot free shots worth 1 point each.',
      beginner: 'It’s 15 feet from the backboard, and nobody may cross into the lane until the ball leaves the shooter’s hands.',
      intermediate: 'Free throws are the game’s only undefended points — which is why drawing fouls is a skill and "hack" strategies target bad shooters.',
      expert: 'The line also defines geometry elsewhere: the FT-line circle hosts jump balls, and "FT-line extended" is the universal landmark coaches use to describe wing spots.',
    },
  },
  {
    id: 'nba-kid-4', level: 'kid',
    prompt: 'Tap "the PAINT" — the colored box under the basket.',
    spots: [PAINT_R, CENTER, CORNER3_BOT, TOP_KEY_R], answer: 'paintR',
    marks: [att(592, 200), def(606, 186), att(455, 150), ball(466, 146)],
    title: 'The paint (the lane, the key)',
    exp: {
      kid: 'The painted box under the hoop is where the tall players battle — most close shots and rebounds happen right here.',
      beginner: 'Also called "the lane" or "the key." Offensive players can’t camp in it — three seconds inside without the ball is a violation.',
      intermediate: 'Both teams fight for paint touches: shots there are the highest-percentage in the game, and paint catches collapse defenses to create open threes.',
      expert: 'The NBA/WNBA also have DEFENSIVE three seconds — a defender can’t lurk in the paint without guarding someone. That rule (no true zone camping) shapes the entire pro spacing era.',
    },
  },
  {
    id: 'nba-kid-5', level: 'kid',
    prompt: 'Tap a spot BEHIND the three-point line, in the corner.',
    spots: [CORNER3_TOP, RIM_R, FT_R, PAINT_R], answer: 'corner3t',
    marks: [att(500, 180), ball(512, 176), def(520, 208)],
    title: 'Beyond the arc = 3 points',
    exp: {
      kid: 'Shots made from behind the big curved line count 3 points instead of 2. The corners are part of that line too!',
      beginner: 'Your feet must be completely behind the line when you shoot — touch the line and it’s only a 2.',
      intermediate: 'The corner is the closest three-point shot on the floor, because the line flattens near the sideline instead of staying a full arc.',
      expert: 'That short corner is why "spacing" means corner shooters: the shortest 3 plus the longest defensive rotation makes the corner the most efficient jump-shot zone in basketball.',
    },
  },
  {
    id: 'nba-kid-6', level: 'kid',
    prompt: 'Tap the HALF-COURT line.',
    spots: [HALF_LINE, PAINT_R, RIM_L, CORNER3_TOP], answer: 'halfline',
    title: 'The midline splits the court',
    exp: {
      kid: 'This line cuts the court in half — your team’s scoring side and your defending side.',
      beginner: 'After you cross it with the ball, you can’t dribble or pass back across — that’s a backcourt violation.',
      intermediate: 'You also have 8 seconds (NBA/WNBA) to get the ball across it, or you turn it over — full-court pressure defenses attack exactly that clock.',
      expert: 'The midline is a defensive weapon: trapping a dribbler just after he crosses uses the line as an extra defender, since retreating over it is illegal. Corners + midline = the classic trap spots.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'nba-beg-1', level: 'beginner',
    prompt: 'Tap where the POINT GUARD usually starts the offense.',
    spots: [TOP_KEY_R, CORNER3_BOT, BLOCK_R, RIM_R], answer: 'topkeyR',
    marks: [att(620, 32), att(560, 320), def(600, 200)],
    title: 'Top of the key: the offense’s steering wheel',
    exp: {
      kid: 'The point guard dribbles to the top, behind the arc, where he can see the whole team and start the play.',
      beginner: 'From the top of the key every option is available: pass left or right, drive middle, or call a screen. It’s the natural control spot.',
      intermediate: 'Most halfcourt sets initiate here because the floor is balanced — two wings, two corners, and the paint all reachable in one pass.',
      expert: 'Modern offenses often move initiation to the wing or "slot" to pre-shift the defense, but late-clock and ATO sets still return to the top — maximum optionality when the play must not die.',
    },
  },
  {
    id: 'nba-beg-2', level: 'beginner',
    prompt: 'Tap the LOW BLOCK — where post players battle for position.',
    spots: [BLOCK_R, TOP_KEY_R, CORNER3_TOP, CENTER], answer: 'blockR',
    marks: [att(509, 60), ball(520, 66), def(575, 210)],
    title: 'The block: low on the lane, next to the basket',
    exp: {
      kid: 'The little marks beside the paint near the hoop are "the blocks" — big players wrestle for that spot because it’s so close to the basket.',
      beginner: 'Posting up = catching the ball on the block with your back to the basket, then using strength and footwork to score.',
      intermediate: 'The block is prime real estate: deep enough for hooks and drop steps, and a double-team there leaves a shooter open — post play creates threes.',
      expert: 'The painted block marks also govern FT rebounding slots and charge/block geometry. "Duck-ins" from the dunker spot to the block are how modern bigs post WITHOUT slow back-downs.',
    },
  },
  {
    id: 'nba-beg-3', level: 'beginner',
    prompt: 'Tap the ELBOW.',
    spots: [ELBOW_R, BLOCK_R, CENTER, CORNER3_BOT], answer: 'elbowR',
    marks: [att(470, 140), ball(482, 136), def(505, 160)],
    title: 'The elbow: corner of the free-throw line',
    exp: {
      kid: 'Where the free-throw line meets the side of the paint makes a corner shaped like an elbow — that’s its real name!',
      beginner: 'The elbows are favorite mid-range spots: catch there and you can shoot, drive baseline, or feed the post.',
      intermediate: 'Classic sets live here — "elbow series," horns, pinch-post. From the elbow a skilled big becomes a passing hub the defense can’t ignore.',
      expert: 'Elbow touches bend defenses vertically: the defender must honor the jumper, opening backdoor cuts along the baseline — the triangle offense and modern delay sets both weaponize exactly this.',
    },
  },
  {
    id: 'nba-beg-4', level: 'beginner',
    prompt: 'Tap the RESTRICTED area — right at the rim, where layups live.',
    spots: [RIM_R, FT_R, CORNER3_TOP, TOP_KEY_R], answer: 'rimR',
    marks: [att(566, 148), ball(578, 156), def(600, 196)],
    title: 'At the rim: the best shot in basketball',
    exp: {
      kid: 'Layups and dunks happen right at the hoop — the closer you get, the easier the shot.',
      beginner: 'The small arc under the rim is the "restricted area": a defender standing inside it can’t draw a charge on a driver.',
      intermediate: 'Shots at the rim convert around twice as often as long twos — which is why offenses are engineered to create rim attacks and defenses to wall them off.',
      expert: 'The restricted arc exists to stop late-sliding charge hunters under the basket; secondary defenders must be OUTSIDE it with position established. Verticality at the rim is the legal counter.',
    },
  },
  {
    id: 'nba-beg-5', level: 'beginner',
    prompt: 'You attack the RIGHT basket. Tap the BACKCOURT — where you can’t dribble back to.',
    spots: [BACKCOURT, FRONTCOURT], answer: 'backcourt',
    marks: [att(372, 180), ball(360, 176), def(396, 168)],
    title: 'Backcourt: behind the midline once you’ve crossed',
    exp: {
      kid: 'Once your team brings the ball past halfcourt, you’re not allowed to take it back — that half is off-limits!',
      beginner: 'Ball + both feet past the line = frontcourt established. Going back over (dribble or pass) is an over-and-back turnover.',
      intermediate: 'Defenses exploit it by pressuring right at the line — the ball handler has nowhere to retreat. That’s why guards cross with speed or pass ahead.',
      expert: 'Fine print wins games: on inbounds in the backcourt everyone may catch anywhere, and deflections by the DEFENSE reset the count. Late-game press offense is drilled entirely around these exceptions.',
    },
  },
  {
    id: 'nba-beg-6', level: 'beginner',
    prompt: 'Tap the SHORTEST three-point shot on the floor.',
    spots: [CORNER3_BOT, WING3_R, TOP_KEY_R], answer: 'corner3b',
    marks: [att(560, 200), ball(572, 206), def(590, 220)],
    title: 'The corner three',
    exp: {
      kid: 'The 3-point line isn’t the same distance everywhere — in the corners it comes closer to the hoop, so corner threes are the shortest!',
      beginner: 'The arc would run out of court near the sidelines, so the line flattens into the corners — closer than the shot from the top.',
      intermediate: 'Same 3 points, shorter shot: corner threes convert at the highest rate of any three, so offenses park shooters there deliberately.',
      expert: 'In the NBA the gap is nearly two feet (22 ft corners vs 23′9″ arc); the WNBA/FIBA line flattens too, just less dramatically. Either way, "shift, then kick to the corner" is the endgame of most modern possessions.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'nba-int-1', level: 'intermediate',
    prompt: 'Pick-and-roll: after setting the screen, the big ROLLS. Tap where he’s heading.',
    spots: [circle('roll', 606, 180, 18), CORNER3_TOP, TOP_KEY_R, ELBOW_R], answer: 'roll',
    marks: [att(490, 140), ball(500, 146), att(520, 160), def(505, 124), def(560, 170)],
    title: 'The roll: downhill to the rim',
    exp: {
      kid: 'After blocking the defender with his body, the big player turns and runs straight at the basket for a pass and an easy shot.',
      beginner: 'That’s the "roll" in pick-and-roll: screen high, then dive to the rim while the defense is busy with the ball handler.',
      intermediate: 'The roll forces the defense’s worst choice: stop the ball and the roller is open behind them; take the roller and the ball handler walks in.',
      expert: 'The roller’s path also drags the weak-side "low man" into the paint — that rotation is what springs the corner shooter. PnR isn’t a two-man game; it’s a five-man geometry problem.',
    },
  },
  {
    id: 'nba-int-2', level: 'intermediate',
    prompt: 'Tap the DUNKER SPOT.',
    spots: [DUNKER, ELBOW_R, TOP_KEY_R, CORNER3_TOP], answer: 'dunker',
    marks: [att(500, 225), ball(512, 230), def(530, 245), def(610, 215)],
    title: 'Along the baseline, just outside the paint',
    exp: {
      kid: 'A player hides low along the end line beside the paint — when a teammate drives, he’s right there for a quick dunk pass!',
      beginner: 'The "dunker spot" keeps a finisher near the rim WITHOUT standing in the lane (that would be 3 seconds). He slides in only when the ball comes.',
      intermediate: 'It’s the non-shooter’s home in modern spacing: out of the driving lane, out of the 3-second count, one bounce from a lob or drop-off.',
      expert: 'The dunker occupies the low helper: if that defender helps on the drive, the drop-off is a dunk; if he stays, the lane is clear. It converts a non-shooter into gravity anyway.',
    },
  },
  {
    id: 'nba-int-3', level: 'intermediate',
    prompt: 'Tap "no-man’s land" — the LEAST efficient shot zone in basketball.',
    spots: [LONG_TWO, CORNER3_BOT, RIM_R, FT_R], answer: 'longtwo',
    marks: [att(440, 170), ball(452, 166), def(470, 150)],
    title: 'The long two: worst points-per-shot on the floor',
    exp: {
      kid: 'A shot from just INSIDE the big line is almost as hard as a 3-pointer — but it only counts 2. Tough deal!',
      beginner: 'Long twos are nearly the same distance as threes but worth one point less — analytics call that zone the worst trade in basketball.',
      intermediate: 'Efficient offenses shrink their shot chart to rim + free throws + threes ("Moreyball"); defenses now happily FUNNEL you into long twos.',
      expert: 'Nuance: late-clock and elite mid-range shot-makers keep the zone alive — an open pull-up two from your best player beats a contested three. Shot value is conditional, not gospel.',
    },
  },
  {
    id: 'nba-int-4', level: 'intermediate',
    prompt: 'Ball in the BOTTOM corner. Tap where the weak-side HELP defender sinks to.',
    spots: [circle('help', 555, 135, 16), CORNER3_BOT, TOP_KEY_R, RIM_R], answer: 'help',
    marks: [att(617, 332), ball(628, 336), def(600, 318), att(620, 26)],
    title: 'Help side: sink toward the paint, off your man',
    exp: {
      kid: 'When the ball is on one side, the defenders on the OTHER side sneak toward the middle to help stop drives.',
      beginner: 'That’s "help side": one pass away you stay close; two passes away you sag into the lane, ready to meet a driver.',
      intermediate: 'The classic teaching line is the lane line: weak-side defenders straddle it, seeing man AND ball. Skip passes are the offense’s tax on that help.',
      expert: 'In the pros, defensive 3 seconds forbids camping in the paint — so helpers "2.9" it: hover at the edge, touch out, return. The shell drill geometry is the same; the clock makes it an art.',
    },
  },
  {
    id: 'nba-int-5', level: 'intermediate',
    prompt: 'Fast break! Tap the lane the WINGS should sprint in.',
    spots: [rectSpot('widelane', 360, 14, 240, 50), rectSpot('midlane', 360, 155, 240, 50), BACKCOURT], answer: 'widelane',
    marks: [att(420, 180), ball(432, 176), def(560, 180), def(590, 120), att(300, 240)],
    title: 'Run WIDE in transition',
    exp: {
      kid: 'On a fast break, the players without the ball run near the sidelines — spreading out makes the defense impossible to be everywhere.',
      beginner: 'Wide lanes stretch retreating defenders across the whole court; running down the middle lets one defender guard two players.',
      intermediate: 'Wide runners earn layups OR corner threes: sprint to the rim, and if stopped, drift to the corner — the break flows straight into spacing.',
      expert: 'Transition math: the first three sprint wide-rim-wide, the trailer arrives at the arc as a live shooter, and the ball advances by pass ahead of the defense’s matchup scramble. Early offense IS offense now.',
    },
  },
  {
    id: 'nba-int-6', level: 'intermediate',
    prompt: 'Tap "the NAIL" — the help spot defenses guard with their life.',
    spots: [FT_R, RIM_R, CORNER3_TOP, WING3_R], answer: 'ftR',
    marks: [att(470, 180), ball(482, 176), att(622, 28)],
    title: 'The nail: middle of the free-throw line',
    exp: {
      kid: 'The exact middle of the free-throw line has a nickname — "the nail." A defender stands there to block the road to the middle.',
      beginner: 'Guarding the nail means no easy drives or passes through the heart of the defense — everything gets pushed to the sides.',
      intermediate: '"No middle" schemes station a helper at the nail: drives go baseline into the big’s help, and the defense’s rotations stay short.',
      expert: 'The nail defender is usually the weak-side guard "stunting" — faking at middle drives without leaving his man. Beating the nail with "Iverson" cuts and slot drives is a whole offensive genre.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'nba-exp-1', level: 'expert',
    prompt: 'Attacking a 2-3 ZONE: tap its classic soft spot.',
    spots: [circle('highpost', 548, 180, 16), CORNER3_BOT, RIM_R, TOP_KEY_R], answer: 'highpost',
    marks: [def(500, 150), def(500, 210), def(600, 120), def(612, 182), def(600, 240), att(450, 180), ball(462, 176)],
    title: 'Flash to the high post — the middle of the zone',
    exp: {
      kid: 'A zone defense guards AREAS, not people — and the middle, by the free-throw line, is the gap nobody quite owns.',
      beginner: 'In a 2-3 zone, two defenders are up top and three across the back — the free-throw-line area sits between the layers.',
      intermediate: 'Catching at the high post makes all five defenders wrong: shoot the open 15-footer, hit either corner, or drop to the dunker as the back line pinches.',
      expert: 'Zone offense principles in one spot: get it to the middle, make the zone collapse, then play out of the short roll. Overloads and corner skips work BECAUSE the middle catch bends the zone first.',
    },
  },
  {
    id: 'nba-exp-2', level: 'expert',
    prompt: 'Screener’s defender plays DROP coverage. Tap where he sits.',
    spots: [circle('drop', 595, 180, 16), TOP_KEY_R, CORNER3_BOT, ELBOW_R], answer: 'drop',
    marks: [att(490, 150), ball(500, 156), att(515, 162), def(498, 130)],
    title: 'Drop: between the screen and the rim',
    exp: {
      kid: 'Instead of chasing out to the screen, the big defender backs up toward his basket and guards the space in front of it.',
      beginner: '"Drop" coverage: the screener’s defender retreats below the FT line, containing the drive while the guard fights over the top.',
      intermediate: 'Drop concedes the pull-up two (the shot analytics likes least) to take away the rim and the roll — coverage choice IS shot-selection engineering.',
      expert: 'The counters define careers: elite pull-up threes break drop, floaters attack its gap, and "snake" dribbles put the big in jail. That’s why coverages morph to hedge/switch against certain guards.',
    },
  },
  {
    id: 'nba-exp-3', level: 'expert',
    prompt: 'The low helper left the BOTTOM corner shooter to stop the drive. Tap where the kick-out pass goes.',
    spots: [CORNER3_BOT, TOP_KEY_R, RIM_R, ELBOW_R], answer: 'corner3b',
    marks: [att(560, 225), ball(570, 232), def(598, 266), att(614, 334)],
    title: 'Drive, collapse, kick to the vacated corner',
    exp: {
      kid: 'The defender guarding the corner ran to stop the drive — so his player is standing all alone. Pass it there!',
      beginner: 'Drives suck defenders inward; the pass goes back out to whoever’s man helped. The corner is usually that man.',
      intermediate: '"Drive and kick" is the engine of modern offense: rim pressure → rotation → open three → or another drive against the scrambling closeout.',
      expert: 'Defenses pre-plan WHO helps ("low man" from the weak corner) and how to recover ("X-out" rotations). Offenses counter with lift/drift rules so the kick-out target is already moving into the vacated angle.',
    },
  },
  {
    id: 'nba-exp-4', level: 'expert',
    prompt: 'Tap the SLOT — the lane-line-extended spot beyond the arc.',
    spots: [SLOT_R, CORNER3_TOP, TOP_KEY_R, ELBOW_R], answer: 'slotR',
    marks: [att(478, 180), ball(466, 174), att(622, 24), att(620, 336), att(480, 272)],
    title: 'The slot: between the top and the wing',
    exp: {
      kid: 'Coaches have names for every spot behind the arc — the "slot" is the one between the very top and the wing.',
      beginner: 'Five-out spacing marks five perimeter homes: two corners, two slots/wings, one top. The slot lines up with the edge of the paint, extended.',
      intermediate: 'Slot drives are prized: the angle attacks the nail defender and both help positions at once, and the drift/lift rules behind it are automatic.',
      expert: '"Slot" is also modern initiation real estate — 5-out and delay sets start there because the defensive nail can’t cheat without opening the slot-to-corner kick. Terminology maps to leverage.',
    },
  },
  {
    id: 'nba-exp-5', level: 'expert',
    prompt: 'Tap the MID-POST — the in-between spot where fadeaway artists operate.',
    spots: [circle('midpost', 580, 244, 14), ELBOW_R, CORNER3_TOP, RIM_R], answer: 'midpost',
    marks: [def(560, 222), att(470, 150), ball(482, 146)],
    title: 'Mid-post: halfway between block and elbow',
    exp: {
      kid: 'Halfway between the low block and the elbow is the "mid-post" — a favorite spot for tricky turnaround shots.',
      beginner: 'From the mid-post a scorer faces up with room to drive either way or rise for a jumper — too far out to double easily, too close to ignore.',
      intermediate: 'Mid-post isolation is the counter to switching defenses: hunt the smaller defender on the switch, catch where the double is longest to arrive.',
      expert: 'The zone survived analytics for exactly this case: late-clock, playoff defenses, mismatch hunting. Its value is conditional efficiency — the release valve when the rim and arc are schemed away.',
    },
  },
  {
    id: 'nba-exp-6', level: 'expert',
    prompt: 'Live-ball turnover while you attacked the RIGHT basket! Tap the FIRST spot your transition defense must protect.',
    spots: [RIM_L, RIM_R, HALF_LINE, circle('corner3lb', 60, 340, 14)], answer: 'rimL',
    marks: [def(300, 180), ball(288, 184), att(560, 120), att(590, 240)],
    title: 'Protect YOUR rim first',
    exp: {
      kid: 'Uh oh — the other team has the ball and is racing the other way! Someone must sprint back to guard YOUR basket before anything else.',
      beginner: 'Transition defense priorities: 1) protect the rim, 2) stop the ball, 3) find shooters. The layup is the worst outcome, so the rim comes first.',
      intermediate: 'That’s why coaches designate a permanent "safety" on offense — usually the point guard lurking above the arc as the shot goes up.',
      expert: 'Modern crashing math complicates it: send extra bodies to the offensive glass or send them back? Teams now decide per-lineup — but the first-man-back-to-the-rim rule survives every analytics cycle.',
    },
  },
];
