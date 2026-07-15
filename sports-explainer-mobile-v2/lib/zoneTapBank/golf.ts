// Zone Tap — Golf bank. Hole anatomy + course-management zones (rule-based, evergreen).
// Pure data, zero RN imports. Coordinates: GolfHole viewBox 680×340 — tee box rect
// (30,150,40,40) with markers at x=62; fairway lobes centered (180,170)/(330,165)/(470,168);
// water ellipse (450,245); bunkers (300,110)/(540,215)/(655,125); fringe (595,170) rx66;
// green (595,170) rx48 ry42; cup+pin (605,168); 150-marker (390,200); OB stakes along y=10.
import { ZoneScenario, circle, rectSpot, ball, flag, guide } from '../zoneTapRegions';

// Context marks (owner feedback pass): golf has no context players — the orienting
// layer is YOUR BALL (where the prompt says you're playing from), a pennant where a
// prompt describes a pin position (the component hides the painted pin when a flag
// mark exists, so the scene shows ONE pin, where the words say), and guide arrows for
// wind / a water-entry line. Pure-anatomy prompts (painted features) carry no marks.

const TEE_BOX = rectSpot('teebox', 30, 150, 40, 40);
const GREEN = circle('green', 595, 170, 38);
const PIN = circle('pin', 605, 160, 12);
const FAIRWAY = circle('fairway', 280, 165, 28);
const ROUGH = circle('rough', 250, 62, 22);
const WATER = circle('water', 450, 245, 24);
const BUNKER_GREEN = circle('gbunker', 540, 215, 12);
const BUNKER_FAIR = circle('fbunker', 300, 110, 13);
const FRINGE = circle('fringe', 595, 221, 9);
const OB_LINE = rectSpot('ob', 100, 2, 460, 16);
const MARKER150 = circle('marker150', 390, 200, 12);
const APRON = circle('apron', 534, 168, 13);

export const GOLF_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'glf-kid-1', level: 'kid',
    prompt: 'Every hole starts here. Tap the TEE BOX.',
    spots: [TEE_BOX, GREEN, WATER, FAIRWAY], answer: 'teebox',
    title: 'The tee box: where the hole begins',
    exp: {
      kid: 'You hit your very first shot of the hole from this flat little pad, with the ball perched up on a tee!',
      beginner: 'The teeing area is the only place you may put the ball on a tee peg. Play starts between the tee markers.',
      intermediate: 'Different marker colors = different tee lengths for different players — same hole, fairer distances.',
      expert: 'The tee shot is the only shot in golf you fully control the lie for — ball height, stance, angle, even which SIDE of the box to play from. Good players use that freedom tactically.',
    },
  },
  {
    id: 'glf-kid-2', level: 'kid',
    prompt: 'Tap the GREEN — the super-short grass where the hole lives.',
    spots: [GREEN, TEE_BOX, ROUGH, WATER], answer: 'green',
    title: 'The putting green',
    exp: {
      kid: 'The smooth carpet-like circle at the end of the hole — the cup is cut into it, and you roll putts across it.',
      beginner: 'On the green you putt (roll, never fly, the ball). You may mark and pick up your ball, and fix marks on the surface — special rules apply only here.',
      intermediate: '"Green in regulation" means reaching it in par-minus-2 strokes — the stat that best tracks good golf.',
      expert: 'Greens are the course’s difficulty dial: firmness, speed, and slope defend better than length. Reading a green is reading gravity — pros map every green’s drainage direction before the round.',
    },
  },
  {
    id: 'glf-kid-3', level: 'kid',
    prompt: 'Tap the FLAG (the pin).',
    spots: [PIN, TEE_BOX, BUNKER_GREEN, MARKER150], answer: 'pin',
    title: 'The flagstick marks the cup',
    exp: {
      kid: 'The flag on the tall stick shows where the hole is from far away — that little cup is the finish line!',
      beginner: 'The flagstick sits in the 4¼-inch cup. From the fairway you aim at it; on the green you may putt with it in or out — your choice.',
      intermediate: 'Pin POSITIONS move daily: front/middle/back, left/right. The same hole plays totally differently by where the pin is cut.',
      expert: 'Pros rarely aim at the flag: they aim where a miss is safe and the putt is uphill. "Pin-hunting" versus "center of green" is the core risk decision on every approach shot.',
    },
  },
  {
    id: 'glf-kid-4', level: 'kid',
    prompt: 'Tap a SAND BUNKER near the green.',
    spots: [BUNKER_GREEN, GREEN, WATER, FAIRWAY], answer: 'gbunker',
    title: 'Bunkers: the sand traps',
    exp: {
      kid: 'The sandy pits are traps! Getting out of soft sand is tricky — the ball loves to stay in there.',
      beginner: 'Bunker rule to know: you may not touch the sand with your club before your swing (no practice scrapes, no resting the club behind the ball).',
      intermediate: 'Greenside bunker technique is its own shot: open the clubface and splash the SAND out — the ball rides the sand cloud onto the green.',
      expert: 'Bunkers defend by geometry, not just difficulty: they guard the best angles and make you fly the ball (no run-ups). Architects place them to punish the greedy line, not the ordinary one.',
    },
  },
  {
    id: 'glf-kid-5', level: 'kid',
    prompt: 'Tap the WATER hazard.',
    spots: [WATER, GREEN, TEE_BOX, ROUGH], answer: 'water',
    title: 'Water: the one-stroke monster',
    exp: {
      kid: 'Splash! A ball in the pond is usually gone forever — and it costs you a penalty stroke too.',
      beginner: 'Water (a "penalty area", marked by red or yellow stakes) costs one stroke; then you drop a new ball near where yours crossed in.',
      intermediate: 'Red vs. yellow matters: red (lateral) allows a sideways drop near the crossing point; yellow forces you back on the line of entry.',
      expert: 'Water is psychological architecture: carries LOOK longer over water, and players subconsciously steer — the miss water causes is often the shot pulled AWAY from it into the bunker placed exactly there.',
    },
  },
  {
    id: 'glf-kid-6', level: 'kid',
    prompt: 'Tap the FAIRWAY — the mowed runway from tee to green.',
    spots: [FAIRWAY, ROUGH, GREEN, TEE_BOX], answer: 'fairway',
    title: 'The fairway: the short-grass highway',
    exp: {
      kid: 'The stripe of short grass leading to the green is the fairway — the best place for your ball to land!',
      beginner: 'From the fairway’s short grass you get clean contact — that’s why "fairways hit" is a stat. The long grass beside it (rough) grabs the club and kills control.',
      intermediate: 'Fairways aren’t uniform: landing zones narrow where drives land, and the width changes what club you hit off the tee.',
      expert: 'Fairway POSITION beats fairway distance: the correct half of the fairway opens the green’s angle past the guarding bunker. Pros pick a side; amateurs pick "the middle".',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'glf-beg-1', level: 'beginner',
    prompt: 'Tap the ROUGH.',
    spots: [ROUGH, FAIRWAY, GREEN, TEE_BOX], answer: 'rough',
    title: 'The rough: long grass, less control',
    exp: {
      kid: 'The shaggy grass beside the fairway grabs your club like fingers — shots from there fly shorter and wilder.',
      beginner: 'Rough reduces spin and control: grass gets between clubface and ball, producing "flyers" (long, spinless jumps) or dead chunks.',
      intermediate: 'From rough, the smart play is often a shorter club back to position — trying the hero shot from deep grass compounds one mistake into three.',
      expert: 'Rough interacts with skill asymmetrically: elite players lose more RELATIVE value from rough because their edge is precision spin control. That’s why major championships grow it — it flattens the field’s advantage.',
    },
  },
  {
    id: 'glf-beg-2', level: 'beginner',
    prompt: 'Driver in hand — tap where you WANT the tee shot to finish.',
    spots: [FAIRWAY, ROUGH, BUNKER_FAIR, WATER], answer: 'fairway',
    marks: [ball(50, 168)],
    title: 'Position first: find the short grass',
    exp: {
      kid: 'The perfect drive lands on the smooth short grass, far enough to see the flag — not in sand, water, or the shaggy stuff!',
      beginner: 'Golf is played backwards from the target: the tee shot’s job is to set up an easy NEXT shot — fairway lie, clear angle, comfortable distance.',
      intermediate: 'Distance helps only if playable: 20 extra yards in the rough is usually worse than 20 fewer on the fairway (strokes-gained data confirms it, with driver distance still mattering more than old wisdom said).',
      expert: 'The modern answer is nuanced: stats say hit driver MORE than instinct suggests — distance gains usually beat accuracy losses — EXCEPT where penalty hazards lurk. Here, water and OB flip the math toward placement.',
    },
  },
  {
    id: 'glf-beg-3', level: 'beginner',
    prompt: 'Tap the FRINGE — the collar around the green.',
    spots: [FRINGE, BUNKER_GREEN, APRON, WATER], answer: 'fringe',
    title: 'The fringe: between green and rough',
    exp: {
      kid: 'A ring of medium-short grass hugs the green like a collar — not as smooth as the green, way nicer than the rough.',
      beginner: 'From the fringe you can putt (the "Texas wedge") or chip — the grass is short enough for either. It doesn’t count as a green hit in the stats, though!',
      intermediate: 'The choice rule: putt whenever the fringe is smooth — the worst putt usually beats the worst chip. Chip only when grass or slope makes rolling unpredictable.',
      expert: 'Watch pros use the fringe as a landing rail: chips landed ON the fringe take one soft bounce and release — using the collar’s texture as a brake pad the green itself doesn’t offer.',
    },
  },
  {
    id: 'glf-beg-4', level: 'beginner',
    prompt: 'Two kinds of sand! Tap the FAIRWAY bunker (not the greenside one).',
    spots: [BUNKER_FAIR, BUNKER_GREEN, WATER, GREEN], answer: 'fbunker',
    title: 'Fairway bunkers catch DRIVES',
    exp: {
      kid: 'This sand pit sits way back along the fairway — it’s there to gobble up long tee shots, not short chips.',
      beginner: 'Fairway bunkers demand the opposite technique of greenside ones: pick the BALL clean (no sand first) because you still need distance.',
      intermediate: 'Club up and grip down, feet quiet: the fairway bunker shot is about clean contact, and the lip decides your club before distance does.',
      expert: 'Architecturally they’re placed at the driving zone’s edge to question the tee club: carry them, lay short, or flirt with the line. A well-placed fairway bunker plays in your head from 250 yards away.',
    },
  },
  {
    id: 'glf-beg-5', level: 'beginner',
    prompt: 'Tap OUT OF BOUNDS — the line of white stakes.',
    spots: [OB_LINE, ROUGH, WATER, FAIRWAY], answer: 'ob',
    title: 'OB: stroke AND distance',
    exp: {
      kid: 'Past the white stakes isn’t even the golf course anymore! A ball out there means you must go back and hit again — ouch.',
      beginner: 'Out of bounds is golf’s harshest penalty: one stroke PLUS replaying from the original spot ("stroke and distance"). A drive OB means your next swing from the tee is shot 3.',
      intermediate: 'Compare: water costs a stroke but you drop AHEAD near the hazard; OB costs the stroke AND all the distance. That difference should change your aim.',
      expert: 'Recreational golf has a local-rule alternative (drop at the fairway edge for two strokes) to keep pace of play — but in formal competition, stroke-and-distance rules. Knowing which rules you’re under changes tee strategy.',
    },
  },
  {
    id: 'glf-beg-6', level: 'beginner',
    prompt: 'Tap the 150-YARD marker.',
    spots: [MARKER150, PIN, TEE_BOX, FAIRWAY], answer: 'marker150',
    title: 'Yardage markers: the course tells you distances',
    exp: {
      kid: 'That little post tells golfers "you are 150 yards from the green!" — so they know how hard to swing.',
      beginner: 'Courses mark key distances (100/150/200, colored disks or posts) measured to the green’s center — the reference for club selection.',
      intermediate: 'Center-of-green yardage is the anchor: add or subtract for pin position (front pins play shorter, back pins longer) and conditions.',
      expert: 'Even in the rangefinder era the 150 marker matters: "150 number" is the standard planning unit — players lay up TO a favorite full-swing yardage relative to it rather than as close as possible.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'glf-int-1', level: 'intermediate',
    prompt: 'You can’t carry the water today. Tap the smart LAY-UP zone.',
    spots: [circle('layup', 378, 168, 18), GREEN, WATER, ROUGH], answer: 'layup',
    marks: [ball(150, 170)],
    title: 'Lay up SHORT of the trouble — on purpose',
    exp: {
      kid: 'Instead of trying a superhero shot over the pond, smart golfers hit a shorter shot that stops safely BEFORE it. Next shot: easy!',
      beginner: 'A lay-up is an on-purpose short shot: take the hazard out of play and leave a comfortable full swing to the green.',
      intermediate: 'Lay up to a NUMBER, not just "short": stopping at your favorite wedge distance beats crawling 20 yards closer into an awkward half-swing.',
      expert: 'Decision math: lay-up EV beats the carry when the carry’s failure rate times its penalty exceeds the stroke saved. Pros compute it as "what score does each miss make?" — the answer usually protects the card, not the ego.',
    },
  },
  {
    id: 'glf-int-2', level: 'intermediate',
    prompt: 'The pin is cut NEAR the bottom bunker. Tap the "SHORT SIDE" — the miss you must avoid.',
    spots: [circle('shortside', 552, 202, 12), circle('fatside', 648, 138, 13), circle('layzone', 380, 168, 15), PIN], answer: 'shortside',
    marks: [flag(578, 199), ball(300, 165)],
    title: 'Short-siding yourself: the worst miss in golf',
    exp: {
      kid: 'Missing on the SAME side as the flag leaves you almost no green to work with — your chip has nowhere to land and stop!',
      beginner: '"Short-sided" = missing where the pin is closest to the green’s edge. From there every chip is a hard, spinny gamble; from the other side you have the whole green to use.',
      intermediate: 'The pre-shot rule: identify the short side BEFORE swinging and aim so your normal miss falls on the fat side. Good misses are planned, not lucky.',
      expert: 'Strokes-gained around the green quantifies it: the same distance chip costs measurably more from the short side. Tour caddies talk in "where’s the fat side" more than "where’s the pin."',
    },
  },
  {
    id: 'glf-int-3', level: 'intermediate',
    prompt: 'Trouble everywhere near this pin. Tap the BAIL-OUT area — the safe miss.',
    spots: [APRON, WATER, BUNKER_GREEN, OB_LINE], answer: 'apron',
    marks: [ball(250, 168)],
    title: 'The bail-out: short and center, in front',
    exp: {
      kid: 'When sand and water surround the flag, the safest miss is the open grass just in FRONT of the green — no traps, easy chip.',
      beginner: 'Every well-designed green has a bail-out — usually the front apron. Landing there leaves a simple chip instead of a sandy or wet disaster.',
      intermediate: 'Use it when the shot is hard OR the moment is big: long club in hand, water long-right, bunkers pin-side — take the front, take your par chance, walk on.',
      expert: 'The bail-out is also the run-up lane: firm conditions let a lower ball land short and release on. Links golf makes the bail-out the MAIN route — target golf versus ground golf is really "which entrance does this green offer?"',
    },
  },
  {
    id: 'glf-int-4', level: 'intermediate',
    prompt: 'Your drive found the deep rough. Tap the smart PUNCH-OUT target.',
    spots: [circle('punchout', 292, 162, 17), GREEN, WATER, circle('deeper', 250, 62, 15)], answer: 'punchout',
    marks: [ball(255, 70)],
    title: 'Take your medicine: back to the fairway',
    exp: {
      kid: 'Stuck in the junk? Don’t be a hero — hit a small sideways shot back to the nice grass, THEN attack the flag.',
      beginner: 'The punch-out accepts losing half a shot to avoid losing two: back to the short grass, then a clean approach.',
      intermediate: 'From deep rough, advancing far requires luck; doubling the error (staying in trouble, finding the water ahead) is how big numbers happen. One bad shot should cost one shot.',
      expert: 'The pro framing: "what’s my highest-percentage path to green-in-one-more?" Sometimes that IS advancing 120 yards through a gap — but it’s chosen by percentages, not pride. Card-wreckers are almost always second mistakes, not first ones.',
    },
  },
  {
    id: 'glf-int-5', level: 'intermediate',
    prompt: 'Firm links-style day: tap where a RUN-UP shot should LAND to feed onto the green.',
    spots: [circle('runup', 528, 172, 12), PIN, WATER, BUNKER_GREEN], answer: 'runup',
    marks: [ball(330, 168)],
    title: 'Land it short, let it release',
    exp: {
      kid: 'On hard ground, the ball bounces and rolls a LOT — so you land it on the grass before the green and let it roll the rest of the way like a putt.',
      beginner: 'The run-up (bump-and-run) uses the ground: land short of the green with a lower flight, and the bounce does the final yards.',
      intermediate: 'It only works through an OPEN entrance — no bunker or water guarding the front. That open front door is exactly what this green offers on the left.',
      expert: 'Flight-versus-ground is a dispersion decision: on firm turf, a rolling ball’s error shrinks while a flown ball’s bounce is chaos. That inversion is why links golf rewards trajectory control over raw carry precision.',
    },
  },
  {
    id: 'glf-int-6', level: 'intermediate',
    prompt: 'Lay-up wisdom: tap the spot that leaves your FULL wedge — not an awkward half-swing.',
    spots: [circle('fullwedge', 352, 160, 16), circle('tooclose', 474, 190, 14), ROUGH, GREEN], answer: 'fullwedge',
    marks: [ball(140, 172)],
    title: 'Closer isn’t better — your NUMBER is better',
    exp: {
      kid: 'Weird but true: being a bit FARTHER away can be easier, if it lets you take your favorite full swing instead of a tricky little half-one!',
      beginner: 'Half-swings are hard to judge; full swings are grooved. Lay up to the distance you practice most — many players’ favorite full wedge — even if more yards remain.',
      intermediate: 'Know your gap: if your wedges fly 100/85/70, a 45-yard leave sits in no-man’s land between clubs. Plan lay-ups to land ON a stock number.',
      expert: 'Modern data softens the dogma — closer is usually still better for TOUR players, whose partial wedges are elite. For everyone else, dispersion at half-swing distances genuinely spikes: the "full number" rule survives because amateurs’ skill curve isn’t smooth.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'glf-exp-1', level: 'expert',
    prompt: 'Hard wind blowing DOWN from the top of the screen. Tap the tee-shot START line.',
    spots: [circle('windline', 300, 128, 15), circle('windwrong', 308, 206, 15), ROUGH, WATER], answer: 'windline',
    marks: [ball(50, 168), guide(150, 18, 150, 50, true), guide(210, 18, 210, 50, true), guide(450, 18, 450, 50, true)],
    title: 'Start it INTO the wind side, let it ride back',
    exp: {
      kid: 'When wind pushes the ball sideways, aim toward the windy side — the wind will carry it back to the middle like a paper airplane!',
      beginner: 'You either fight wind or use it: starting the ball up the wind side and letting it drift back to center keeps the fairway’s whole width as your landing zone.',
      intermediate: 'The alternative — aiming center and letting wind push you to the low side — uses only HALF the fairway. Start lines shift upwind; targets stay put.',
      expert: 'Elite wind play adds shot-shape choice: ride it (max distance, more drift) or hold it against the wind (flat flight, less roll, more control). The decision is made by which miss the hole punishes — here, the water low side says ride it high.',
    },
  },
  {
    id: 'glf-exp-2', level: 'expert',
    prompt: 'Your ball found the WATER, crossing in on the tee side. Tap a LEGAL drop area.',
    spots: [circle('legaldrop', 388, 230, 14), circle('illegaldrop', 512, 244, 11), GREEN, TEE_BOX], answer: 'legaldrop',
    marks: [ball(432, 238), guide(330, 180, 425, 232, true)],
    title: 'Drop on the entry side — never nearer the hole',
    exp: {
      kid: 'After a splash you drop a new ball near where it flew IN — on the side you came from. You can’t sneak it closer to the flag!',
      beginner: 'The universal drop law: relief is taken NO NEARER THE HOLE. For water, that means the side where the ball last crossed the hazard edge.',
      intermediate: 'Your options after water: replay the shot, drop on the line keeping the crossing point between you and the hole, or (red stakes) drop within two clubs of the crossing point — all one stroke, all no-nearer.',
      expert: 'The crossing POINT is the whole game: a ball that flew the pond and trickled back in crossed on the GREEN side — legal relief may be up there. Pros watch a water ball’s last crossing like hawks, because it can save 40 yards.',
    },
  },
  {
    id: 'glf-exp-3', level: 'expert',
    prompt: 'Course management: tap the WIDEST part of the fairway — the percentage target.',
    spots: [circle('widest', 330, 165, 17), circle('neck', 418, 167, 13), circle('teeSideShort', 150, 170, 14), ROUGH], answer: 'widest',
    marks: [ball(50, 168)],
    title: 'Aim where the fairway is fattest',
    exp: {
      kid: 'Some parts of the fairway are wide, some skinny. Aim for the widest part — more room means fewer mistakes!',
      beginner: 'Your shots scatter — everyone’s do. Aiming at the widest landing zone means more of your scatter pattern finds short grass.',
      intermediate: 'Think in dispersion ovals, not single shots: pick the club whose oval fits inside the zone. Sometimes that’s a 3-wood into the wide part, not a driver into the neck.',
      expert: 'Architects bait the neck: the narrow zone usually sits at driver distance offering a shorter approach. The expert question is whether the approach saved exceeds the rough/hazard risk — usually it doesn’t, which is the entire "play to the fat zones" school.',
    },
  },
  {
    id: 'glf-exp-4', level: 'expert',
    prompt: 'Pin tucked bottom-left behind the bunker. Tap PIN-HIGH on the FAT side.',
    spots: [circle('pinhighfat', 640, 134, 13), circle('shortsided', 552, 202, 12), FAIRWAY, WATER], answer: 'pinhighfat',
    marks: [flag(572, 198), ball(250, 168)],
    title: 'Pin-high, away from the trouble',
    exp: {
      kid: 'Aim beside the flag, on the open side! You end up the same distance from the hole — without ever flying over the sand.',
      beginner: '"Pin-high" means the correct DISTANCE, just offset sideways. A pin-high shot on the safe side leaves a flat, simple putt or chip.',
      intermediate: 'Distance error hurts more than direction error for most golfers — so solving distance (pin-high) while aiming at the fat side solves both risks at once.',
      expert: 'Tour approach data backs it: pros’ aim points on tucked pins average several yards toward the fat side, scaled by club in hand. The flag is a suggestion; the dispersion oval centered on the safe aim point is the real target.',
    },
  },
  {
    id: 'glf-exp-5', level: 'expert',
    prompt: 'OB stakes along the TOP, water low. Tap the tee-shot line that dodges the DOUBLE penalty.',
    spots: [circle('favorwater', 290, 192, 15), circle('favorob', 300, 126, 14), GREEN, ROUGH], answer: 'favorwater',
    marks: [ball(50, 168)],
    title: 'Favor the water side — OB is the costlier miss',
    exp: {
      kid: 'Both sides are scary, but the white stakes are SCARIER: that mistake makes you go all the way back and hit again!',
      beginner: 'Water: one stroke, drop ahead, keep moving. OB: one stroke AND lose all the distance — effectively two shots. Between two evils, lean away from OB.',
      intermediate: 'This is asymmetric-risk aiming: shift your start line so your dispersion oval overlaps the cheaper hazard more and the expensive one less. You’re choosing which mistake to buy insurance against.',
      expert: 'Formally: minimize expected strokes over your dispersion, weighting each region by its penalty (fairway 0, rough +0.25ish, water +1, OB +2). The aim point that solves it almost always hugs the water side — quantified course management in one tee shot.',
    },
  },
  {
    id: 'glf-exp-6', level: 'expert',
    prompt: 'Teeing-area rules: tap where you may LEGALLY tee your ball.',
    spots: [rectSpot('legaltee', 32, 152, 26, 36), circle('aheadmarkers', 82, 170, 10), FAIRWAY, GREEN], answer: 'legaltee',
    title: 'Between the markers, up to two club-lengths BACK',
    exp: {
      kid: 'You must tee up BEHIND the two marker blocks — never in front of them! Behind is allowed, even a couple of steps back.',
      beginner: 'The teeing area is a box: markers in front, two club-lengths deep behind them. Ball inside the box; your FEET may stand outside it.',
      intermediate: 'Teeing ahead of the markers costs: two-stroke penalty in stroke play (and replay); in match play the opponent may cancel your shot. Fractions of an inch count.',
      expert: 'Experts use the full box: teeing at the back adds room against a forced carry; the far side of the box opens angles (tee left to aim right). The box is 8+ yards of free strategy most players never touch.',
    },
  },
];
