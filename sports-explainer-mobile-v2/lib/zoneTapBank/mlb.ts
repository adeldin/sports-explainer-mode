// Zone Tap — MLB bank. Positions/zones only (rule-based, evergreen). Pure data, zero RN
// imports. Coordinates: BaseballDiamond viewBox 680×560 — home (340,490), 1B (490,340),
// 2B (340,190), 3B (190,340), mound (340,355); same base geometry as lib/wheresThePlay.
import { ZoneScenario, circle, rectSpot } from '../zoneTapRegions';

// Canonical diamond spots (fielder positions match lib/wheresThePlay START).
const HOME = circle('home', 340, 490, 24);
const FIRST = circle('first', 490, 340, 22);
const SECOND = circle('second', 340, 190, 22);
const THIRD = circle('third', 190, 340, 22);
const MOUND = circle('mound', 340, 355, 22);
const CATCHER = circle('catcher', 340, 522, 18);
const SS = circle('ss', 262, 235, 20);
const SECOND_BASEMAN = circle('2b', 418, 235, 20);
// 1B fielder nudged off the wheresThePlay START (478,300) so his ring clears the
// first-base bag's ring — the near-but-off-the-bag contrast is the teaching point.
const FIRST_BASEMAN = circle('1b', 468, 290, 18);
const THIRD_BASEMAN = circle('3b', 202, 300, 20);
const LF = circle('lf', 180, 120, 22);
const CF = circle('cf', 340, 95, 22);
const RF = circle('rf', 500, 120, 22);
const OUTFIELD = rectSpot('outfield', 150, 45, 380, 110);
const FOUL_LEFT = circle('foul', 130, 440, 26);

export const MLB_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'mlb-kid-1', level: 'kid',
    prompt: 'Tap home plate — where the batter stands to hit.',
    spots: [HOME, SECOND, MOUND, FIRST], answer: 'home',
    title: 'Home plate is where it all starts (and ends)',
    exp: {
      kid: 'The batter stands at home plate — the bottom corner of the diamond. Score by running ALL the way around and back to it!',
      beginner: 'Home plate anchors the field: batting, pitching, and scoring all point at it. A run only counts when a runner touches home.',
      intermediate: 'Everything is measured from home: the 90-foot basepaths, the mound distance, even fair/foul — the foul lines start at the plate.',
      expert: 'Home is also the catcher’s office: framing, blocking, and plays at the plate happen in a few square feet. The plate’s 17-inch width literally defines the strike zone’s edges.',
    },
  },
  {
    id: 'mlb-kid-2', level: 'kid',
    prompt: 'Tap the pitcher’s mound.',
    spots: [MOUND, HOME, FIRST, OUTFIELD], answer: 'mound',
    title: 'The mound: the little hill in the middle',
    exp: {
      kid: 'The pitcher throws from the small dirt hill in the middle of the infield, aiming at home plate.',
      beginner: 'The mound sits 60 feet 6 inches from home plate, raised about 10 inches — every pitch in the game starts there.',
      intermediate: 'The height matters: throwing downhill adds deception and plane. That’s why the rulebook fixes the mound’s height and slope exactly.',
      expert: 'The pitcher must be touching the rubber on the mound when delivering — step off and the same throw becomes a pickoff attempt, with totally different rules.',
    },
  },
  {
    id: 'mlb-kid-3', level: 'kid',
    prompt: 'The batter just hit the ball. Tap the FIRST base they run to.',
    spots: [FIRST, THIRD, SECOND, HOME], answer: 'first',
    title: 'Always run to first — up the right-side line',
    exp: {
      kid: 'After hitting, the batter always runs to the base up the RIGHT side line first. Bases go in a circle: 1st, 2nd, 3rd, then home!',
      beginner: 'Base running is one-way and counterclockwise: first (right corner), second (top), third (left corner), home. You can’t skip any.',
      intermediate: 'That direction is why "the force at first" always exists: the batter MUST go there, so a fielder only needs to beat him to the bag.',
      expert: 'The one-way rule drives all force-play logic: a runner is forced only when every base behind him is occupied — the geometry of the diamond IS the rulebook.',
    },
  },
  {
    id: 'mlb-kid-4', level: 'kid',
    prompt: 'Tap the outfield — the big grass where the far catches happen.',
    spots: [OUTFIELD, MOUND, HOME, THIRD], answer: 'outfield',
    title: 'The outfield: the deep grass',
    exp: {
      kid: 'The outfield is the huge grassy part far from the batter. Three players wait out there to chase long hits.',
      beginner: 'Left, center, and right fielders patrol the outfield. Balls hit over their heads are usually doubles, triples, or home runs.',
      intermediate: 'Outfield depth is a constant trade-off: play deep to stop extra-base hits, or shallow to catch bloopers and throw runners out.',
      expert: 'Outfield positioning shifts by hitter, count, and pitch call — a fastball count pulls the outfield around toward the batter’s pull side before the pitch is even thrown.',
    },
  },
  {
    id: 'mlb-kid-5', level: 'kid',
    prompt: 'Tap second base — the base at the TOP of the diamond.',
    spots: [SECOND, FIRST, THIRD, HOME], answer: 'second',
    title: 'Second base: the halfway point',
    exp: {
      kid: 'Second base is at the very top of the diamond — exactly halfway around your trip back to home plate.',
      beginner: 'A runner on second is in "scoring position": from there, most ordinary singles will score him.',
      intermediate: 'Second is the farthest base from home — which is why it’s the most-stolen base: the catcher’s throw is the longest.',
      expert: 'Two fielders share second (the shortstop and second baseman), trading coverage by batter and pitch — that shared custody is what makes double plays and steal defenses work.',
    },
  },
  {
    id: 'mlb-kid-6', level: 'kid',
    prompt: 'Tap where the catcher crouches.',
    spots: [CATCHER, MOUND, FIRST, OUTFIELD], answer: 'catcher',
    title: 'The catcher: right behind home plate',
    exp: {
      kid: 'The catcher squats right behind home plate and catches every pitch the batter doesn’t hit.',
      beginner: 'The catcher is the only fielder in foul territory. He catches pitches, blocks wild ones, and guards home plate.',
      intermediate: 'Catchers also run the defense: calling pitches, setting targets, and throwing out base stealers from their knees.',
      expert: 'The catcher’s glove placement — "framing" — can turn borderline balls into strikes. It’s one of the most valuable hidden skills in the sport.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'mlb-beg-1', level: 'beginner',
    prompt: 'Tap where the SHORTSTOP stands.',
    spots: [SS, SECOND_BASEMAN, FIRST_BASEMAN, THIRD_BASEMAN], answer: 'ss',
    title: 'Shortstop: between second and third',
    exp: {
      kid: 'The shortstop stands in the gap between second base and third base — lots of ground balls go right there!',
      beginner: 'Shortstop covers the left-side infield gap. It’s usually the best athlete on the field: most range, longest throws.',
      intermediate: 'The SS anchors the infield: covers second on steals, turns two, cuts off throws from left field. Note he stands OFF the bag, not on it.',
      expert: 'Positioning shifts every pitch: shading the pull side, "double-play depth" (closer, for the pivot), or in at the corners late — the spot you tapped is only his neutral start.',
    },
  },
  {
    id: 'mlb-beg-2', level: 'beginner',
    prompt: 'Tap where the SECOND BASEMAN plays. (Hint: it’s not on the bag!)',
    spots: [SECOND_BASEMAN, SS, SECOND, FIRST_BASEMAN], answer: '2b',
    title: 'The second baseman plays BESIDE the bag',
    exp: {
      kid: 'Tricky! The second baseman doesn’t stand on second base — he stands in the gap between FIRST and second.',
      beginner: 'Infielders guard gaps, not bags: 2B covers the right-side hole, and runs to the bag only when a play needs him there.',
      intermediate: 'That gap (the "4 hole") is where lots of ground balls from right-handed pull hitters and lefty slaps go — standing on the bag would leave it wide open.',
      expert: 'Who covers the bag on a steal is a pre-pitch call between 2B and SS (open/closed mouth signs, classically) based on hitter tendencies — the bag is shared real estate.',
    },
  },
  {
    id: 'mlb-beg-3', level: 'beginner',
    prompt: 'Tap the CENTER fielder.',
    spots: [CF, LF, RF, SS], answer: 'cf',
    title: 'Center field: straightaway, deepest of all',
    exp: {
      kid: 'The center fielder plays in the middle of the outfield, straight out past second base — usually the fastest player.',
      beginner: 'Center covers the most grass, so it goes to the best runner. He’s also the boss out there: on balls between fielders, CF’s call wins.',
      intermediate: 'CF captains the outfield — the corner fielders align off him. If CF shades one gap, both neighbors slide with him.',
      expert: 'Center’s priority rule (CF calls off everyone) exists because he sees the whole field moving toward the ball — collisions happen when that hierarchy breaks.',
    },
  },
  {
    id: 'mlb-beg-4', level: 'beginner',
    prompt: 'A runner is sprinting from second. Tap the NEXT base he must touch.',
    spots: [THIRD, HOME, FIRST, SECOND], answer: 'third',
    title: 'From second, the next stop is third',
    exp: {
      kid: 'Bases always go in order: after second comes third — the corner on the LEFT side.',
      beginner: 'Runners must touch every base in order, even on a home run. Miss one and the defense can appeal for an out.',
      intermediate: 'Third is "90 feet from home": from there a runner scores on sac flies, wild pitches, even groundouts — that’s why coaches guard the send to third so carefully.',
      expert: '"Never make the first or third out at third base" — the classic rule: the upgrade from second to third matters least with zero or two outs, so the risk is only worth it in between.',
    },
  },
  {
    id: 'mlb-beg-5', level: 'beginner',
    prompt: 'Tap FOUL territory.',
    spots: [FOUL_LEFT, MOUND, OUTFIELD, SECOND], answer: 'foul',
    title: 'Outside the lines = foul ground',
    exp: {
      kid: 'The two white lines from home plate make a giant V. Outside the V is foul ground — hits there don’t count as fair balls.',
      beginner: 'A ball settling outside the foul lines before passing a base is foul: a strike (unless you already have two). Fielders can still CATCH foul pops for outs.',
      intermediate: 'The lines themselves are FAIR — a ball landing on the chalk is a fair ball. That’s why they’re painted so carefully.',
      expert: 'Fair/foul is judged where the ball is when it passes the base (or where it settles before it), not where it lands afterward — a ball can land fair and spin foul before first and be foul.',
    },
  },
  {
    id: 'mlb-beg-6', level: 'beginner',
    prompt: 'Tap where the FIRST BASEMAN plays (before the pitch).',
    spots: [FIRST_BASEMAN, FIRST, SECOND_BASEMAN, THIRD_BASEMAN], answer: '1b',
    title: 'Near the bag — but off it',
    exp: {
      kid: 'The first baseman stands NEAR first base but a few steps off it, so he can catch ground balls too.',
      beginner: 'He plays off the bag to cover ground, then races back to the base to take throws from the other infielders.',
      intermediate: 'With a runner on first, everything changes: he "holds" the runner right on the bag, opening the right-side hole — a real cost the defense accepts.',
      expert: 'Watch the dance: holding until the pitch, then bouncing off into fielding position. Against non-stealing threats, good teams skip the hold and keep the hole closed.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'mlb-int-1', level: 'intermediate',
    prompt: 'Double play, runner on first: the second baseman flips the ball. Tap where the shortstop takes the feed.',
    spots: [SECOND, SS, FIRST, MOUND], answer: 'second',
    title: 'The pivot happens AT the bag',
    exp: {
      kid: 'For a double play, the shortstop runs TO second base, catches the flip there for one out, then throws to first for two!',
      beginner: 'The force out must happen at the base — so the fielder taking the feed leaves his position and meets the ball at the bag.',
      intermediate: 'This is the 4-6-3: second baseman fields, shortstop pivots at the bag, first baseman stretches. The mirror image is the classic 6-4-3.',
      expert: 'The pivot is the hard part: catch, touch, and re-throw while a runner slides at you. The "neighborhood play" era ended with replay — now the foot must truly be on the bag at the catch.',
    },
  },
  {
    id: 'mlb-int-2', level: 'intermediate',
    prompt: 'Tap "the 5.5 hole" — the gap a ground ball sneaks through between third and short.',
    spots: [circle('hole56', 230, 272, 13), SS, THIRD_BASEMAN, SECOND_BASEMAN], answer: 'hole56',
    title: 'The hole between 3B (5) and SS (6)',
    exp: {
      kid: 'There’s a gap between the third baseman and the shortstop — ground balls that find it usually roll into left field for hits.',
      beginner: 'Fielders have numbers: 3B is 5, SS is 6 — so the gap between them is "the 5.5 hole." It’s a favorite target for right-side inside-out swings.',
      intermediate: 'The hole grows and shrinks: SS shading up the middle opens it; guarding the line closes it but opens the middle. Defense is a blanket that’s always too small.',
      expert: 'Hitters who "shoot the 5.5" (classically slap-hitting lefties) beat positioning rather than power — the counter is pitching them away so they can’t pull the angle, then shifting the SS in.',
    },
  },
  {
    id: 'mlb-int-3', level: 'intermediate',
    prompt: 'Tap "up the middle" — the ground-ball lane behind the mound.',
    spots: [circle('middle', 340, 245, 20), FOUL_LEFT, FIRST_BASEMAN, LF], answer: 'middle',
    title: 'Up the middle: behind the mound, in front of second',
    exp: {
      kid: 'A ball hit "up the middle" goes straight past the pitcher, over second base, and into center field.',
      beginner: 'It’s the lane between the shortstop and second baseman. Pitchers can’t field most of it — the middle infielders have to close it from both sides.',
      intermediate: 'Middle coverage is the whole point of double-play depth: both middle infielders cheat toward the bag, shrinking this lane at the cost of the two holes.',
      expert: 'The eternal trade: pinch the middle and the 3.5/5.5 holes open; guard the holes and the middle opens. Batted-ball data decides which lane to concede to each hitter.',
    },
  },
  {
    id: 'mlb-int-4', level: 'intermediate',
    prompt: 'Late innings, protecting a lead: tap where the third baseman "guards the line."',
    spots: [circle('line3b', 168, 330, 18), circle('normal3b', 225, 285, 18), SS, FIRST_BASEMAN], answer: 'line3b',
    title: 'Guarding the line: pinch toward the foul line',
    exp: {
      kid: 'To stop a big hit down the line, the third baseman slides over and stands almost ON the foul line.',
      beginner: 'Balls down the line roll into the corner for doubles. Late in close games, corners guard the lines to take the double away — singles hurt less.',
      intermediate: 'It’s an insurance trade: the 5.5 hole opens up (more singles) to prevent the two-base hit that puts the tying run in scoring position.',
      expert: 'Analytics push back on auto-guarding: for many hitters the hole single costs more in expected runs than the rare liner down the line. Modern teams guard by spray chart, not by inning.',
    },
  },
  {
    id: 'mlb-int-5', level: 'intermediate',
    prompt: 'Runner on third, infield IN: tap where the first baseman moves to.',
    spots: [circle('in1b', 420, 375, 18), FIRST_BASEMAN, FIRST, SECOND_BASEMAN], answer: 'in1b',
    title: 'Infield in: corners charge toward the plate',
    exp: {
      kid: 'With a runner on third, the infielders sneak in close to home so they can grab a grounder and throw it home FAST.',
      beginner: 'Normal depth can’t stop the run — the throw home is too slow. Playing "in" makes the home throw possible but gives ground balls bigger gaps to shoot through.',
      intermediate: 'The math: infield-in turns some outs into hits (less range) to trade for cutting the run at the plate. Teams pay that price mostly in late, close games.',
      expert: 'Variants exist per out/count: full in, corners in with the middle at DP depth ("halfway"), or in on the grass only with the winning run — each concedes a different lane.',
    },
  },
  {
    id: 'mlb-int-6', level: 'intermediate',
    prompt: 'No-doubles defense: tap where the LEFT fielder repositions.',
    spots: [circle('lfdeep', 150, 70, 20), LF, SS, circle('lfshallow', 215, 185, 18)], answer: 'lfdeep',
    title: 'No-doubles: outfielders back up and pinch the lines',
    exp: {
      kid: 'To stop long hits, the outfielders take big steps BACK toward the wall so nothing flies over their heads.',
      beginner: '"No-doubles" defense: outfield deep and near the lines. Singles in front of you are fine — extra-base hits behind you are not.',
      intermediate: 'It’s a late-inning posture protecting a lead: concede shallow bloop singles, deny the gap or corner ball that puts the tying run on second.',
      expert: 'Same expected-value logic as guarding the lines, and the same critique: for weak contact hitters the bloops you concede outnumber the gappers you prevent. Deploy by hitter profile.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'mlb-exp-1', level: 'expert',
    prompt: 'Single to RIGHT with a runner trying to score. Tap where the CUTOFF man sets up.',
    spots: [circle('cut1b', 400, 415, 20), MOUND, SS, SECOND], answer: 'cut1b',
    title: 'The first baseman is the cutoff on throws home from right',
    exp: {
      kid: 'One infielder runs to a spot between right field and home plate, ready to catch the long throw if it needs help.',
      beginner: 'Long throws get a relay man. On throws home from right field, the FIRST baseman lines up between the fielder and the plate to "cut" the throw.',
      intermediate: 'The catcher aims the line ("cut two!" / "let it go!"). Cutting keeps a weak throw useful — redirect to second and freeze the trail runner instead.',
      expert: 'Assignments are positional: 1B cuts throws home from RF/CF, 3B from LF, and the mid infielders relay true outfield-wall doubles. Miss the alignment and trail runners take free bases all night.',
    },
  },
  {
    id: 'mlb-exp-2', level: 'expert',
    prompt: 'Single to LEFT, play at the plate. Tap the cutoff man’s spot this time.',
    spots: [circle('cut3b', 285, 425, 20), FIRST_BASEMAN, SECOND_BASEMAN, MOUND], answer: 'cut3b',
    title: 'From left field, the THIRD baseman cuts',
    exp: {
      kid: 'When the throw home comes from the LEFT side, it’s the third baseman who runs to the helper spot in the middle.',
      beginner: 'The cutoff man always comes from the throw’s side of the infield: left field throws → third baseman; right field throws → first baseman.',
      intermediate: 'Why not the shortstop? He has other jobs — trailing the runner, covering a bag. The corner infielder is the free man on that side.',
      expert: 'Watch elite defenses fake the cut: gloving motion without catching lets an on-line throw through while freezing the trail runner mid-step. The bluff only works if the alignment was perfect.',
    },
  },
  {
    id: 'mlb-exp-3', level: 'expert',
    prompt: 'Bunt with runners on first and second — the "wheel play" spins. Tap the base the SHORTSTOP sprints to cover.',
    spots: [THIRD, SECOND, FIRST, HOME], answer: 'third',
    title: 'Wheel play: SS covers third while 3B charges',
    exp: {
      kid: 'The third baseman runs IN to grab the bunt — so the shortstop races over to stand on third base for him.',
      beginner: 'A bunt pulls the 3B off his bag. The wheel play rotates everyone: 3B charges, SS wheels to third, 2B covers first behind the charging 1B.',
      intermediate: 'The goal is the LEAD force at third — killing the runner who matters. If the bunt beats the charge, the rotation still guarantees the sure out at first.',
      expert: 'The counter is the fake bunt or slash: if the batter pulls back and pokes at the vacated SS hole, the wheel is torched — so teams wheel only on sure-bunt counts and tells.',
    },
  },
  {
    id: 'mlb-exp-4', level: 'expert',
    prompt: 'Runners on first and third, steal attempt coming. Tap where the middle infielder "cheats" before the pitch.',
    spots: [circle('cheat', 372, 206, 16), SECOND_BASEMAN, SS, FIRST_BASEMAN], answer: 'cheat',
    title: 'Cheating toward the bag before the steal',
    exp: {
      kid: 'When a runner might steal, the fielder tiptoes a little closer to second base before the pitch, ready to race there for the throw.',
      beginner: 'Covering a steal means beating the runner to the bag. Starting a few steps closer buys the time — that pre-pitch lean is "cheating" toward the bag.',
      intermediate: 'First-and-third is a defense chess match: catcher may throw through, fake, or cut it — the middle infielder’s cheat has to serve whichever call was signaled.',
      expert: 'The cost is the hole he vacated — precisely why offenses run first-and-third plays: force the cheat, then slash the ball where he used to stand. Every step of the cheat is a bet.',
    },
  },
  {
    id: 'mlb-exp-5', level: 'expert',
    prompt: 'Sacrifice bunt, first baseman charging hard. Tap the base the SECOND baseman must run to cover.',
    spots: [FIRST, SECOND, THIRD, HOME], answer: 'first',
    title: 'When 1B charges, 2B owns first base',
    exp: {
      kid: 'The first baseman ran in to grab the bunt — so his friend the second baseman runs over to stand on first base for the throw.',
      beginner: 'Every base needs an owner. Bunt coverage rotates: 1B charges, 2B rotates behind him to take first, and the out still gets recorded there.',
      intermediate: 'This is why bunts against aggressive corners still fail: the rotation is drilled. The offense’s counter is bunting AT the charging fielder’s vacated bag-side.',
      expert: 'On pushed bunts toward first, watch the 3-6-1 wrinkle too — pitcher covering first, SS to second. Coverage is a full-team choreography, re-signaled for every bunt situation.',
    },
  },
  {
    id: 'mlb-exp-6', level: 'expert',
    prompt: 'No-doubles, late and close: tap where the RIGHT fielder stands to take away the gap AND the line.',
    spots: [circle('rfdeep', 540, 65, 20), RF, CF, SECOND_BASEMAN], answer: 'rfdeep',
    title: 'Deep and toward the line',
    exp: {
      kid: 'The right fielder backs way up near the wall and slides toward the white line, so no ball can bounce past him.',
      beginner: 'Doubles live in two places: over the fielder’s head and down the line into the corner. Deep-and-toward-the-line guards both at once.',
      intermediate: 'The concession is the bloop and the gap single in front — acceptable when only an extra-base hit beats you (tying run on first, two outs).',
      expert: 'Corner depth also changes the throw: playing deep means the RF fields moving away from third, so trail runners take the extra base — the defense has already decided that’s the cheaper poison.',
    },
  },
];
