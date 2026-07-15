// Zone Tap — NFL bank. Alignments/zones only (rule-based, evergreen). Pure data, zero RN
// imports. Coordinates: FootballField viewBox 680×380 — LOS x=235, OFFENSE LEFT (lower x),
// defense RIGHT, playable band y=30..350, midfield y=190 (same contract as lib/boxCount).
import { ZoneScenario, ZoneMark, circle, rectSpot, ball, att, def } from '../zoneTapRegions';

// Canonical field spots (offense left of the LOS at x=235).
const OFF_HALF = rectSpot('offhalf', 25, 32, 195, 316);
const DEF_HALF = rectSpot('defhalf', 250, 32, 400, 316);
const LOS_BAND = rectSpot('los', 215, 32, 40, 316);
const QB = circle('qb', 200, 190, 18);
const RB = circle('rb', 148, 190, 18);
const WR_TOP = circle('wr', 218, 50, 16);
const SLOT = circle('slot', 212, 120, 16);
// The TE attaches at the END of the line: same x as the OL, just beyond the top tackle
// (was (224,148), which sat ON the tackle once the context line was drawn).
const TE = circle('te', 231, 126, 15);
const MIKE = circle('mike', 300, 190, 18);
const CB = circle('cb', 285, 50, 16);
const FS_DEEP = circle('fs', 430, 190, 20);
const SAFETY_HALF_TOP = circle('halftop', 400, 110, 20);
const SAFETY_HALF_BOT = circle('halfbot', 400, 270, 20);
const EDGE = circle('edge', 250, 120, 16);
const A_GAP = circle('agap', 237, 170, 14);
const BOX = rectSpot('box', 240, 120, 90, 140);
const FLAT_TOP = rectSpot('flat', 248, 35, 88, 78);
const DEEP_MIDDLE = rectSpot('deepmid', 450, 120, 200, 140);

// ── Context formations (owner feedback: the surfaces were too bare to answer the
// spatial question). Textbook alignments, same coordinate space as lib/boxCount's
// OFFENSE/defense constants. Composed per scenario; the player the prompt asks the
// user to LOCATE is never drawn (see the authoring rules in lib/zoneTapRegions).
const OLINE: ZoneMark[] = [att(232, 145), att(232, 165), att(232, 185), att(232, 205), att(232, 225)];
const QB_DOT = att(205, 187, 'QB');
const RB_DOT = att(183, 210, 'RB');
const WR_DOTS: ZoneMark[] = [att(232, 52), att(232, 300), att(232, 338)];
const TE_DOT = att(232, 247, 'TE');
const SNAP_BALL = ball(226, 185); // the ball spotted at the LOS, in front of the center
const DLINE: ZoneMark[] = [def(262, 150), def(262, 180), def(262, 210), def(262, 240)];
const LB_ROW: ZoneMark[] = [def(308, 160), def(308, 190), def(308, 222)];
const CB_DOTS: ZoneMark[] = [def(270, 74), def(270, 306)];
const OFFENSE_11: ZoneMark[] = [...OLINE, QB_DOT, RB_DOT, TE_DOT, ...WR_DOTS];

export const NFL_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'nfl-kid-1', level: 'kid',
    prompt: 'The team with the ball moves left → right. Tap the side where the OFFENSE lines up.',
    spots: [OFF_HALF, DEF_HALF], answer: 'offhalf',
    marks: [...OFFENSE_11, ...DLINE, ...LB_ROW, ...CB_DOTS, def(430, 150), def(430, 230), SNAP_BALL],
    title: 'Offense on the left, attacking right',
    exp: {
      kid: 'The team WITH the ball is the offense. Here they start on the left and try to push the ball to the right.',
      beginner: 'Offense and defense face each other across the ball. The offense’s job: move the ball forward; the defense’s: stop them.',
      intermediate: 'Eleven players a side, and the offense must have at least seven ON the line at the snap — the formations you’ll learn all start from this face-off.',
      expert: 'Field direction flips each quarter, but "offense attacks one way" is the reading habit: every diagram, every broadcast angle, and every play call assumes you know which side has the ball.',
    },
  },
  {
    id: 'nfl-kid-2', level: 'kid',
    prompt: 'Tap the LINE OF SCRIMMAGE — the invisible wall where each play starts.',
    spots: [LOS_BAND, OFF_HALF, DEF_HALF], answer: 'los',
    marks: [...OFFENSE_11, ...DLINE, ...LB_ROW, ball(235, 185)],
    title: 'The line of scrimmage',
    exp: {
      kid: 'The ball sits on this line before every play. Nobody may cross it until the ball is snapped!',
      beginner: 'The line of scrimmage runs through the ball’s spot, sideline to sideline. Offense on one side, defense on the other, one neutral gap between.',
      intermediate: 'It moves with every play — gain 7 yards, and the next play’s line is 7 yards further. Downs and distance are all measured from it.',
      expert: 'Almost every penalty at the snap is about this line: offside, encroachment, false start, illegal formation, ineligible man downfield — the LOS is the rulebook’s x-axis.',
    },
  },
  {
    id: 'nfl-kid-3', level: 'kid',
    prompt: 'Tap where the QUARTERBACK stands.',
    spots: [QB, FS_DEEP, WR_TOP, MIKE], answer: 'qb',
    marks: [...OLINE, TE_DOT, ...WR_DOTS, SNAP_BALL],
    title: 'The QB: right behind the line, middle of the field',
    exp: {
      kid: 'The quarterback stands in the middle, just behind his linemen. He gets the ball first on every play!',
      beginner: 'The QB takes the snap either right under the center or a few steps back ("shotgun"), then hands off or throws.',
      intermediate: 'Depth is a choice: under center hides handoffs and helps play-action; shotgun buys time to read the defense before the rush arrives.',
      expert: 'Pre-snap, the QB reads the defense FROM this spot — safety depth, box count, leverage — and can change the play. The position is as much geometry-reading as throwing.',
    },
  },
  {
    id: 'nfl-kid-4', level: 'kid',
    prompt: 'Tap where a WIDE receiver lines up.',
    spots: [WR_TOP, QB, MIKE, FS_DEEP], answer: 'wr',
    marks: [...OLINE, RB_DOT, TE_DOT, SNAP_BALL],
    title: 'Wide receivers live near the sideline',
    exp: {
      kid: '"Wide" is the clue — receivers start way out near the sideline, far from everyone else.',
      beginner: 'Splitting out wide stretches the defense sideways: someone has to follow him out there, which thins out the middle.',
      intermediate: 'Width creates one-on-ones: the widest receiver usually draws a cornerback with no help nearby — that isolated matchup is the point.',
      expert: 'Exact splits are coaching detail: tight splits create space to break OUT, wide splits space to break IN, and reduced splits near the goal line beat press. Alignment is the route’s first move.',
    },
  },
  {
    id: 'nfl-kid-5', level: 'kid',
    prompt: 'Tap where the RUNNING back starts.',
    spots: [RB, WR_TOP, EDGE, FS_DEEP], answer: 'rb',
    marks: [...OLINE, QB_DOT, TE_DOT, SNAP_BALL],
    title: 'The running back: deepest man in the backfield',
    exp: {
      kid: 'The running back stands behind the quarterback, ready to take a handoff and run with the ball.',
      beginner: 'Starting deep gives him a running start toward the line — by the time he gets the handoff he’s already moving fast.',
      intermediate: 'His depth sets the play’s timing: deeper alignment means later, wider runs; closer means quick inside hits.',
      expert: 'The RB’s alignment is also a defensive tell: offset to one side hints at run direction and pass protection, which is why offenses vary it deliberately to lie.',
    },
  },
  {
    id: 'nfl-kid-6', level: 'kid',
    prompt: 'Tap the LINEBACKER — the defender standing in the middle, behind his linemen.',
    spots: [MIKE, QB, CB, WR_TOP], answer: 'mike',
    marks: [...OLINE, ...DLINE, SNAP_BALL],
    title: 'Linebackers: the second wall',
    exp: {
      kid: 'Linebackers stand a few steps behind the defensive linemen — close enough to stop runs, back enough to chase passes.',
      beginner: 'They’re the defense’s middle layer: linemen up front, linebackers behind them, defensive backs deepest.',
      intermediate: 'That two-way job defines the position: fill a gap against the run, or drop into a pass zone — decided in a split second after the snap.',
      expert: 'The middle linebacker often wears the defense’s radio dot: he relays the call, aligns the front, and identifies the "Mike point" that sets everyone’s blocking and blitz math.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'nfl-beg-1', level: 'beginner',
    prompt: 'Tap "the BOX" — where the defense masses to stop the run.',
    spots: [BOX, DEEP_MIDDLE, FLAT_TOP], answer: 'box',
    marks: [...OFFENSE_11, ...DLINE, ...LB_ROW, ...CB_DOTS, def(420, 120, 'S'), def(420, 260, 'S'), SNAP_BALL],
    title: 'The box: linemen + linebackers, tackle to tackle',
    exp: {
      kid: 'The "box" is the crowd of defenders packed in the middle, right across from the offensive line.',
      beginner: 'It’s the area from tackle to tackle, about five yards deep — defensive linemen and linebackers live there to stop runs.',
      intermediate: 'Counting the box is football 101: 7+ defenders in it means "run into a wall" — audible to a pass. Light box (6 or fewer) invites the run.',
      expert: 'Box count vs. blockers is the pre-snap equation both sides solve: offenses check by the count, defenses disguise it by walking a safety down late. That cat-and-mouse IS modern football.',
    },
  },
  {
    id: 'nfl-beg-2', level: 'beginner',
    prompt: 'Tap where the SLOT receiver lines up.',
    spots: [SLOT, WR_TOP, RB, CB], answer: 'slot',
    marks: [...OLINE, QB_DOT, att(232, 52, 'WR'), SNAP_BALL],
    title: 'The slot: between the widest receiver and the line',
    exp: {
      kid: 'The slot receiver stands in the alley between the wide receiver and the big linemen.',
      beginner: 'Slot = inside receiver. He gets a two-way go (break in OR out) and usually a shorter path to the middle of the field.',
      intermediate: 'Slots face nickel corners or safeties, not the star boundary corner — offenses hunt those matchups deliberately.',
      expert: 'Alignment rules matter here: the slot is usually OFF the line (a back), keeping the widest man on the line — flip that and the formation is illegal or the wide man becomes covered/ineligible.',
    },
  },
  {
    id: 'nfl-beg-3', level: 'beginner',
    prompt: 'Tap the CORNERBACK covering the top receiver.',
    spots: [CB, MIKE, FS_DEEP, SLOT], answer: 'cb',
    marks: [...OLINE, QB_DOT, att(232, 52, 'WR'), SNAP_BALL],
    title: 'Corners line up across from the wideouts',
    exp: {
      kid: 'The cornerback is the defender who stands right across from the wide receiver, ready to chase him everywhere.',
      beginner: 'Corners play on the edges of the defense, matched to receivers — press up close, or "off" with a cushion, like here.',
      intermediate: 'Depth signals coverage: pressed at the line hints man; 7 yards off looking at the QB hints zone. Receivers read that leverage before the snap.',
      expert: 'Inside vs. outside shade is the real tell: outside leverage funnels routes to safety help inside; inside leverage protects the middle and gives up the sideline fade. Leverage IS the coverage.',
    },
  },
  {
    id: 'nfl-beg-4', level: 'beginner',
    prompt: 'Tap where a FREE SAFETY plays — the deepest defender.',
    spots: [FS_DEEP, MIKE, CB, EDGE], answer: 'fs',
    marks: [...OLINE, QB_DOT, ...WR_DOTS, ...DLINE, def(308, 165), def(308, 215), SNAP_BALL],
    title: 'The free safety: the last line of defense',
    exp: {
      kid: 'The free safety stands way back, all alone — if anyone gets past everyone else, he’s the last one to stop a touchdown.',
      beginner: 'His job is the deep middle: keep everything in front of him and never let a receiver get behind him.',
      intermediate: 'One deep safety in the middle = "single high" (Cover 1 or 3). His alignment before the snap is the first clue to the coverage.',
      expert: 'QBs read safeties first: one high or two? Disguise is the counter — safeties rotate late, showing two-high then spinning to single-high at the snap to bait the throw.',
    },
  },
  {
    id: 'nfl-beg-5', level: 'beginner',
    prompt: 'Tap the EDGE — where the rushers who chase the QB around the corner line up.',
    spots: [EDGE, A_GAP, FS_DEEP, RB], answer: 'edge',
    marks: [...OLINE, QB_DOT, TE_DOT, def(262, 180), def(262, 210), SNAP_BALL],
    title: 'The edge: outside the last blocker',
    exp: {
      kid: 'Edge rushers stand at the END of the line — they run around the outside corner to chase the quarterback.',
      beginner: 'The "edge" is outside the offensive tackle. Winning there means a straight arc to the QB with no one left to block you.',
      intermediate: 'Edge players have a second job: set the edge against runs — force everything back inside to the pursuit. Lose contain and the sideline becomes a highway.',
      expert: 'Wide-9, 7-tech, 6-tech — edge alignment is a named science: wider splits sharpen the pass-rush arc but soften the run edge. The alignment tells you which the defense fears.',
    },
  },
  {
    id: 'nfl-beg-6', level: 'beginner',
    prompt: 'Tap where the TIGHT END lines up.',
    spots: [TE, WR_TOP, RB, CB], answer: 'te',
    marks: [...OLINE, QB_DOT, att(232, 52, 'WR'), att(232, 338, 'WR'), SNAP_BALL],
    title: 'The tight end: attached to the line, next to the tackle',
    exp: {
      kid: '"Tight" is the clue — the tight end starts tight against the big blockers, at the end of the line.',
      beginner: 'He’s half blocker, half receiver: close enough to block like a lineman, still allowed to run out for passes.',
      intermediate: 'Where the TE attaches sets the "strong side" — defenses declare their strength (and the Mike point) off his alignment.',
      expert: 'Modern TEs are moved on purpose — attached, slot, or wide — because their alignment forces a defensive answer: a linebacker out in space, or a defensive back in the run fit. Either answer loses something.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'nfl-int-1', level: 'intermediate',
    prompt: 'Cover 2: two safeties split the deep field. Tap where the TOP-side safety aligns.',
    spots: [SAFETY_HALF_TOP, FS_DEEP, BOX, CB], answer: 'halftop',
    marks: [...OLINE, QB_DOT, SNAP_BALL, ...DLINE, ...LB_ROW, ...CB_DOTS, def(400, 270, 'S')],
    title: 'Two-high: each safety owns a deep half',
    exp: {
      kid: 'In this defense, TWO players stand deep — one guards the top half of the field, one guards the bottom half.',
      beginner: 'Cover 2 = two deep safeties, each responsible for half the deep field, with five defenders in zones underneath.',
      intermediate: 'The weak spots are structural: the deep middle seam between the safeties, and the sideline "hole" behind the corner but in front of the safety.',
      expert: 'The pre-snap read: two-high shells take away deep shots but lighten the box by one — why two-high eras invite the run, and why offenses probe the seams with posts and benders.',
    },
  },
  {
    id: 'nfl-int-2', level: 'intermediate',
    prompt: 'Tap the A-GAP — the run lane between the center and the guard.',
    spots: [A_GAP, EDGE, FLAT_TOP, DEEP_MIDDLE], answer: 'agap',
    marks: [att(232, 145), att(232, 165, 'G'), att(232, 185, 'C'), att(232, 205, 'G'), att(232, 225), ball(216, 199)],
    title: 'Gaps have letters: A is tightest to the center',
    exp: {
      kid: 'The spaces between blockers are named with letters. The A-gap is the very middle one, right next to the ball.',
      beginner: 'From the center outward: A-gap (center–guard), B-gap (guard–tackle), C-gap (outside the tackle). Runs and blitzes are called by these letters.',
      intermediate: 'Every defender in the front owns a gap — that’s "gap integrity." A run "hits the A" precisely when its owner got moved or fooled.',
      expert: 'Double-A-gap blitz looks put two linebackers in both A-gaps to overload the center’s protection math — even when they bail, the threat forces hot throws and slide changes. The gap alphabet is the blitz language.',
    },
  },
  {
    id: 'nfl-int-3', level: 'intermediate',
    prompt: 'Tap the FLAT — the short outside zone a defender sinks into.',
    spots: [FLAT_TOP, DEEP_MIDDLE, BOX, A_GAP], answer: 'flat',
    marks: [...OLINE, QB_DOT, att(232, 52, 'WR'), SNAP_BALL, ...DLINE, ...LB_ROW, def(440, 190, 'FS')],
    title: 'The flat: short and wide',
    exp: {
      kid: 'The "flat" is the short grass near the sideline, just past the line — where quick little passes go.',
      beginner: 'Zone defenses assign someone to this area — usually a corner or linebacker — to rally on swing passes and quick outs.',
      intermediate: 'Flat-defender behavior reveals coverage: a corner squatting in the flat = Cover 2; a corner bailing deep leaves the flat to a linebacker = Cover 3.',
      expert: 'Offenses stress one defender with two routes — the "smash" concept (hitch in front, corner route behind) makes the flat player wrong either way. Zone beaters are all built on these binds.',
    },
  },
  {
    id: 'nfl-int-4', level: 'intermediate',
    prompt: 'The defense brings a NICKEL blitz. Tap where the nickel corner aligns first — over the slot.',
    spots: [circle('nickel', 262, 120, 16), CB, FS_DEEP, MIKE], answer: 'nickel',
    marks: [...OLINE, QB_DOT, att(232, 52, 'WR'), att(212, 120, 'slot'), ...DLINE, SNAP_BALL],
    title: 'The nickel: fifth DB, aligned over the slot',
    exp: {
      kid: 'When the offense adds a receiver inside, the defense adds a quick defender across from him. That’s the "nickel."',
      beginner: 'Nickel = five defensive backs. The fifth one covers the slot receiver — and from there he’s also a sneaky short-distance blitzer.',
      intermediate: 'The nickel replaced a linebacker league-wide because slots beat linebackers. It’s effectively a starting position now.',
      expert: 'Slot alignment makes the nickel the best blitzer on the field: shortest path off the edge of the protection’s count, often unaccounted for by the back. "Cat" and "zero" pressures live off this spot.',
    },
  },
  {
    id: 'nfl-int-5', level: 'intermediate',
    prompt: 'Cover 3: tap the DEEP MIDDLE third.',
    spots: [DEEP_MIDDLE, FLAT_TOP, BOX], answer: 'deepmid',
    marks: [...OLINE, QB_DOT, SNAP_BALL, ...DLINE, ...LB_ROW, def(545, 60, 'CB'), def(545, 320, 'CB')],
    title: 'Three deep: outside thirds + this middle third',
    exp: {
      kid: 'In this defense the deep field is cut into three big slices — tap the middle slice.',
      beginner: 'Cover 3: both corners take the outside deep thirds, the free safety takes this middle third, four defenders play short zones.',
      intermediate: 'Cover 3 keeps eight men near the box (strong vs. run) but has famous soft spots: the seams between the thirds and quick outs in front of the bailing corners.',
      expert: 'Pattern-match Cover 3 blurs into man once routes declare — the answer to "four verticals," which floods three deep zones with four vertical routes. Zone vs. match is the modern coverage arms race.',
    },
  },
  {
    id: 'nfl-int-6', level: 'intermediate',
    prompt: 'Play-action! The fake handoff makes the linebacker bite. Tap where his false steps take him.',
    spots: [circle('bite', 268, 190, 16), FS_DEEP, FLAT_TOP, CB], answer: 'bite',
    marks: [...OLINE, QB_DOT, RB_DOT, ball(213, 192), def(310, 190, 'LB'), ...DLINE],
    title: 'Downhill — toward the line, away from his zone',
    exp: {
      kid: 'The fake handoff tricks the linebacker into running FORWARD to stop a run that isn’t happening.',
      beginner: 'His run rules say "attack downhill" when the line blocks run and the back takes a handoff — play-action forges both signals.',
      intermediate: 'Those two false steps are the whole point: the space BEHIND him (where crossers and posts arrive) is open for exactly that long.',
      expert: 'The deeper the fake conflicts a defender’s run fit with his coverage drop, the better the design — "conflict player" is the term: every great play-action pass is aimed at one man’s job description.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'nfl-exp-1', level: 'expert',
    prompt: 'Cover 2 shell: tap where the free safety aligns — his deep HALF on the bottom of the field.',
    spots: [SAFETY_HALF_BOT, FS_DEEP, BOX, SLOT], answer: 'halfbot',
    marks: [...OLINE, QB_DOT, SNAP_BALL, ...DLINE, ...LB_ROW, ...CB_DOTS, def(400, 110, 'S')],
    title: 'In two-high, the FS owns a half — not the middle',
    exp: {
      kid: 'With two deep helpers, this one guards the BOTTOM half of the field instead of standing in the very middle.',
      beginner: 'Cover 2 splits the deep field between both safeties — so the free safety slides from the middle out over the numbers.',
      intermediate: 'Half-field depth and width are exact: deep enough to never be beaten over the top, wide enough to overlap the corner’s sideline hole.',
      expert: 'Split-safety alignments (2, quarters, 2-man) all start from this landmark; the disguise game is aligning here and rotating late — or aligning in the post and bailing out. Watch the far hash safety, not the ball.',
    },
  },
  {
    id: 'nfl-exp-2', level: 'expert',
    prompt: 'Two-minute drill, no timeouts. Tap the zone the QB targets to STOP THE CLOCK.',
    spots: [rectSpot('sideline', 260, 32, 110, 55), DEEP_MIDDLE, BOX, rectSpot('midfield', 300, 150, 110, 80)], answer: 'sideline',
    marks: [...OLINE, QB_DOT, ...WR_DOTS, SNAP_BALL, ...DLINE, def(308, 165), def(308, 215)],
    title: 'Throw at the sideline — out of bounds kills the clock',
    exp: {
      kid: 'Catching the ball near the sideline lets the runner step OUT of bounds — and that stops the game clock!',
      beginner: 'Out of bounds stops the clock; tackled in the middle keeps it running. With no timeouts, sideline throws are worth extra.',
      intermediate: 'Two-minute route trees are built on it: outs, comebacks, and benders that finish toward the boundary. Middle throws are saved for chunk plays with clock to spare.',
      expert: 'Defenses invert the logic: late-game zones funnel everything INSIDE (keep the clock rolling) and rally-tackle in bounds. The sideline becomes the contested resource, not the end zone.',
    },
  },
  {
    id: 'nfl-exp-3', level: 'expert',
    prompt: 'Tampa 2: tap where the MIKE linebacker sprints at the snap.',
    spots: [circle('tampahole', 385, 190, 18), BOX, FLAT_TOP, CB], answer: 'tampahole',
    marks: [...OLINE, QB_DOT, SNAP_BALL, ...DLINE, def(308, 190, 'MIKE'), def(400, 110, 'S'), def(400, 270, 'S'), ...CB_DOTS],
    title: 'The Mike carries the deep middle hole',
    exp: {
      kid: 'In this special defense, the middle linebacker turns and RUNS deep down the middle, like a third deep guard.',
      beginner: 'Classic Cover 2 has a soft deep middle between the safeties. "Tampa 2" fixes it by sending the middle linebacker sprinting into that hole.',
      intermediate: 'It turns 2-deep into effectively 3-deep on pass plays while keeping 2’s underneath structure — at the cost of the LB’s shallow middle, vacated behind him.',
      expert: 'The counter is hitting what he leaves: shallow crossers and RB angles into the vacated hook zone, or forcing him to carry a fast slot vertically then checking down. Tampa 2 demands a rare LB who can run — that scarcity is why the scheme cycles in and out of the league.',
    },
  },
  {
    id: 'nfl-exp-4', level: 'expert',
    prompt: 'Cover 1 ("single high"). Tap the free safety’s landmark.',
    spots: [FS_DEEP, SAFETY_HALF_TOP, BOX, EDGE], answer: 'fs',
    marks: [...OLINE, QB_DOT, ...WR_DOTS, SNAP_BALL, ...DLINE, def(308, 170), def(308, 210), def(268, 62, 'CB'), def(268, 320, 'CB')],
    title: 'Middle of the field, closed',
    exp: {
      kid: 'One deep helper stands in the exact middle of the field, watching everything.',
      beginner: '"Single high" = one deep safety centered in the middle. Everyone else plays man-to-man underneath him (Cover 1).',
      intermediate: 'MOFC vs. MOFO — middle of field closed or open — is the first read QBs make. Closed (one high) protects posts and seams; open (two high) invites them.',
      expert: 'Cover 1’s extra man (no second deep safety) becomes a blitzer, a rat in the hole, or a double on the star receiver — identifying WHERE that free hat went is the QB’s real post-snap problem.',
    },
  },
  {
    id: 'nfl-exp-5', level: 'expert',
    prompt: 'The defense shows a DOUBLE A-GAP blitz. Tap where the hot throw goes when they really bring it.',
    spots: [circle('hot', 275, 190, 16), DEEP_MIDDLE, FLAT_TOP, SAFETY_HALF_TOP], answer: 'hot',
    marks: [...OLINE, QB_DOT, SNAP_BALL, def(262, 150), def(262, 240), def(252, 168, 'LB'), def(252, 202, 'LB')],
    title: 'Throw into the space the blitzers vacated',
    exp: {
      kid: 'If two defenders charge in from the middle, the middle behind them is suddenly EMPTY — throw the quick pass right there.',
      beginner: '"Hot" throws beat blitzes: the ball comes out before the rushers arrive, into the area the blitzers just left.',
      intermediate: 'Double-A pressure removes the middle-hook defenders — slants and shallow inbreakers replace them. The QB’s answer is pre-arranged with the receivers ("hot rules").',
      expert: 'Modern protections often make the back scan the A-gaps, freeing the QB to hold the deep shot — so defenses mug the A-gaps then drop OUT into those very throw lanes ("creeper" pressure). The chess never stops at the same square.',
    },
  },
  {
    id: 'nfl-exp-6', level: 'expert',
    prompt: 'Run heading around the TOP edge. Tap where the FORCE defender must be to turn it back inside.',
    spots: [circle('force', 258, 78, 16), A_GAP, DEEP_MIDDLE, MIKE], answer: 'force',
    marks: [...OLINE, TE_DOT, QB_DOT, att(190, 152, 'RB'), ball(198, 146), ...DLINE, def(308, 190, 'LB')],
    title: 'Set the edge: outside shoulder, turn everything in',
    exp: {
      kid: 'One defender’s whole job is to stand OUTSIDE the runner’s path so he has to turn back toward all the other tacklers.',
      beginner: 'That’s "contain" or "force": never let the run get around the corner. Inside runs have help everywhere; outside runs have only the sideline.',
      intermediate: 'The force player squeezes with outside leverage while pursuit flows inside-out. If he gets hooked or cut, the edge is lost and it’s a foot race.',
      expert: 'WHO forces changes by coverage: a rolled-up corner in Cover 2, the strong safety in Cover 3, the nickel in quarters. Offenses count force players like box defenders — crack blocks against the force man are the sweep’s whole design.',
    },
  },
];
