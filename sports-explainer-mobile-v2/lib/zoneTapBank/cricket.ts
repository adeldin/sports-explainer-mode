// Zone Tap — Cricket bank. Fielding positions + ground geography (rule-based, evergreen).
// Pure data, zero RN imports. Coordinates: CricketGround viewBox 680×460 — boundary
// ellipse (340,230) rx320 ry215; 30-yard ring rx190 ry130; pitch x=325..355, y=160..300;
// bowler's end TOP (stumps ~340,165), striker's end BOTTOM (stumps ~340,294).
//
// ORIENTATION (stated in prompts where it matters): the striker is RIGHT-HANDED, batting
// at the BOTTOM end, facing the bowler at the top. A right-hander's chest faces his
// OFF SIDE — here the RIGHT half of the screen (x>340); the LEG (on) side is the LEFT.
import { ZoneScenario, circle, rectSpot } from '../zoneTapRegions';

const PITCH = rectSpot('pitch', 325, 160, 30, 140);
const STUMPS_STRIKER = circle('stumpsS', 340, 292, 14);
const NON_STRIKER_END = circle('nonstriker', 340, 172, 18);
const KEEPER = circle('keeper', 340, 325, 14);
const SLIPS = circle('slips', 378, 318, 15);
const GULLY = circle('gully', 408, 305, 13);
const POINT = circle('point', 462, 278, 14);
const COVER = circle('cover', 450, 225, 14);
const MID_OFF = circle('midoff', 390, 135, 14);
const MID_ON = circle('midon', 290, 135, 14);
const MIDWICKET = circle('midwicket', 230, 225, 14);
const SQUARE_LEG = circle('squareleg', 225, 282, 14);
const FINE_LEG = circle('fineleg', 255, 375, 15);
const THIRD_MAN = circle('thirdman', 435, 378, 15);
const LONG_OFF = circle('longoff', 395, 75, 15);
const LONG_ON = circle('longon', 285, 75, 15);
const BOUNDARY_ROPE = circle('rope', 340, 432, 16);
const OFF_SIDE = rectSpot('offside', 360, 120, 240, 220);
const LEG_SIDE = rectSpot('legside', 80, 120, 240, 220);

export const CRICKET_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'crk-kid-1', level: 'kid',
    prompt: 'Tap the PITCH — the strip where all the bowling and batting happens.',
    spots: [PITCH, COVER, BOUNDARY_ROPE, LONG_OFF], answer: 'pitch',
    title: 'The pitch: cricket’s 22-yard heart',
    exp: {
      kid: 'The light-colored strip in the middle is the pitch. The bowler runs in and bowls down it, and the batter defends at the other end!',
      beginner: 'The pitch is 22 yards long with a set of stumps at each end. Everything else is "the outfield" — but the contest lives on this strip.',
      intermediate: 'The pitch’s surface is a character in every match: cracks, grass, and wear change how the ball bounces and turns as days pass.',
      expert: 'Reading the pitch drives selection and tactics: green seamers favor pace, dry dust-bowls favor spin, and captains plan the toss (bat or bowl first) around how the strip will age.',
    },
  },
  {
    id: 'crk-kid-2', level: 'kid',
    prompt: 'Tap the STUMPS the batter is guarding (bottom end).',
    spots: [STUMPS_STRIKER, NON_STRIKER_END, COVER, BOUNDARY_ROPE], answer: 'stumpsS',
    title: 'The striker’s stumps',
    exp: {
      kid: 'Three wooden sticks stand behind the batter — if the ball knocks them over, the batter is OUT, bowled!',
      beginner: 'Each end has three stumps topped by two bails. The striker defends the set at his end; "bowled" means the ball broke them.',
      intermediate: 'The stumps define more than bowled: LBW (pad blocking a ball that would hit them), stumped, run out, hit wicket — most dismissals are about these three sticks.',
      expert: 'Bowlers talk of "attacking the stumps" — fuller lengths, straighter lines — versus building pressure outside off. The stump line is the axis every plan rotates around.',
    },
  },
  {
    id: 'crk-kid-3', level: 'kid',
    prompt: 'Tap the WICKETKEEPER — the catcher crouched behind the stumps.',
    spots: [KEEPER, NON_STRIKER_END, COVER, BOUNDARY_ROPE], answer: 'keeper',
    title: 'The keeper: gloves behind the stumps',
    exp: {
      kid: 'The wicketkeeper squats behind the batter’s stumps wearing big gloves, catching everything the batter misses.',
      beginner: 'The only fielder allowed gloves. He catches edges, whips off bails for stumpings, and stands up or back depending on the bowler’s speed.',
      intermediate: '"Standing back" (fast bowling) or "standing up" (spin) — the keeper’s depth tells you the bowler type without watching a ball.',
      expert: 'Keepers run the fielding side’s brain: they see swing, spin, and bounce first, feed the captain intel, and their standing-up pressure stops batters leaving the crease. Elite keeping is worth invisible wickets.',
    },
  },
  {
    id: 'crk-kid-4', level: 'kid',
    prompt: 'Tap the BOUNDARY — hit the ball past this rope for 4 or 6!',
    spots: [BOUNDARY_ROPE, PITCH, COVER, KEEPER], answer: 'rope',
    title: 'The rope: 4 along the ground, 6 in the air',
    exp: {
      kid: 'The rope around the edge is the boundary. Roll the ball past it: 4 runs! Fly it over without bouncing: 6 runs!',
      beginner: 'Boundaries score without running: 4 if the ball touched the ground on the way, 6 if it cleared the rope on the full.',
      intermediate: 'Fielders can save boundaries acrobatically — but touching the rope (or the ground beyond) while touching the ball concedes it. Hence the juggling relay catches at the rope.',
      expert: 'Boundary law nuance: it’s the fielder’s CONTACT that matters — airborne beyond the rope is fine if the last ground touched was inside. That single clause created the modern boundary-rider relay catch.',
    },
  },
  {
    id: 'crk-kid-5', level: 'kid',
    prompt: 'TWO batters bat at once! Tap the NON-STRIKER’s end (top of the pitch).',
    spots: [NON_STRIKER_END, KEEPER, POINT, BOUNDARY_ROPE], answer: 'nonstriker',
    title: 'The non-striker waits at the bowler’s end',
    exp: {
      kid: 'Cricket always has two batters — one faces the bowling, and his partner waits at the far end, ready to run!',
      beginner: 'Runs are scored by the pair swapping ends. The non-striker backs up a step as the ball is bowled, like a base runner’s lead.',
      intermediate: 'Odd runs (1, 3) swap who faces the next ball — so batting is a partnership of strike management, protecting a weaker batter or feeding the in-form one.',
      expert: 'End-of-over strike math is real tactics: a single off the last ball KEEPS the striker on strike for the next over. Watching who wants (or refuses) that single tells you the partnership’s plan.',
    },
  },
  {
    id: 'crk-kid-6', level: 'kid',
    prompt: 'Tap a fielder waiting DEEP, near the boundary (top of the ground).',
    spots: [LONG_OFF, SLIPS, POINT, MIDWICKET], answer: 'longoff',
    title: 'Deep fielders guard the boundary',
    exp: {
      kid: 'Some fielders stand way out near the rope to catch big hits or stop the ball rolling for four!',
      beginner: 'Fielding has two depths: close catchers (for edges and mistakes) and boundary riders (for big shots). This one, straight down the ground, is "long-off."',
      intermediate: '"Long" positions (long-off, long-on) are the straight boundary riders — out there mostly when the batter is hitting hard down the ground.',
      expert: 'Deep fielders are a pressure dial: pushing long-off back concedes the easy single but catches the lofted drive. Captains buy and sell singles-versus-catches with every fielder they move to the rope.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'crk-beg-1', level: 'beginner',
    prompt: 'The batter is RIGHT-HANDED (facing the bowler at the top). Tap the OFF SIDE.',
    spots: [OFF_SIDE, LEG_SIDE], answer: 'offside',
    title: 'Off side: the side the batter faces',
    exp: {
      kid: 'The field splits into two halves. The side the batter’s chest points at is the OFF side — for this right-hander, the right half!',
      beginner: 'Off side = in front of a right-hander’s body; leg (on) side = behind his legs. Every fielding position name starts with knowing this split.',
      intermediate: 'A LEFT-hander flips the halves — which is why left-right batting pairs annoy captains: the whole field must swap every over.',
      expert: 'The split has laws attached: no more than TWO fielders behind square on the leg side — a rule written to outlaw Bodyline. The off/leg distinction isn’t just vocabulary; it’s legislation.',
    },
  },
  {
    id: 'crk-beg-2', level: 'beginner',
    prompt: 'Tap the SLIPS — the catchers waiting beside the keeper for an edge.',
    spots: [SLIPS, MIDWICKET, LONG_OFF, COVER], answer: 'slips',
    title: 'The slip cordon: edge hunters',
    exp: {
      kid: 'A row of fielders stands right next to the keeper — when the ball nicks the edge of the bat, it flies straight to them!',
      beginner: 'Slips line up beside the keeper on the off side, staggered progressively wider: first slip, second slip, third… They exist purely for edged catches.',
      intermediate: 'Slip count = aggression meter: three slips means the captain is hunting wickets; no slips means containment. New ball and green pitches fill the cordon.',
      expert: 'The cordon’s geometry is precise: each slip covers an edge angle band, spaced so no catch splits two men. First slip stands deeper (keeper’s arc), widening and creeping up along the cordon — inches matter at 90mph.',
    },
  },
  {
    id: 'crk-beg-3', level: 'beginner',
    prompt: 'Tap COVER — the classic off-side fielder who stops the cover drive.',
    spots: [COVER, MIDWICKET, MID_OFF, SLIPS], answer: 'cover',
    title: 'Cover: square-ish on the off side, saving one',
    exp: {
      kid: 'The prettiest shot in cricket — the cover drive — flies through this exact area. So a fielder stands right there to spoil it!',
      beginner: 'Cover patrols the off side between point and mid-off, usually on the inner ring "saving the single."',
      intermediate: 'A brilliant cover fielder changes the game without catches: cutting off drives and threatening run-outs makes batters decline singles they’d normally take.',
      expert: 'Bowling plans pair with cover: a packed off-side ring plus a 4th/5th-stump line invites the drive INTO the trap. The fielder isn’t reacting to the shot; the plan manufactured the shot.',
    },
  },
  {
    id: 'crk-beg-4', level: 'beginner',
    prompt: 'Tap MID-ON — the straight fielder on the LEG side.',
    spots: [MID_ON, MID_OFF, SQUARE_LEG, GULLY], answer: 'midon',
    title: 'Mid-on: straight, near the bowler, leg side',
    exp: {
      kid: 'Up near the bowler, on the batter’s legs side, stands mid-on — catching straight hits that go slightly to that side.',
      beginner: 'Mid-on and mid-off are the two straight ring fielders flanking the bowler. Mid-on is the LEG-side one (left half here for a right-hander).',
      intermediate: 'Mid-on is the classic "drop back" candidate: when a batter starts lofting straight, mid-on retreats to long-on — the same lane, boundary depth.',
      expert: 'Mid-on also hosts the bowler’s tactical chat between balls — and pushing mid-on back is the universal tell that the bowler will bowl fuller, baiting the big straight hit he’s now insured against.',
    },
  },
  {
    id: 'crk-beg-5', level: 'beginner',
    prompt: 'Tap FINE LEG — behind square on the LEG side, down toward the boundary.',
    spots: [FINE_LEG, THIRD_MAN, SQUARE_LEG, LONG_ON], answer: 'fineleg',
    title: 'Fine leg: behind the batter, leg side',
    exp: {
      kid: 'Way behind the batter on the legs side — this fielder chases the balls that glance off the bat or pads and sneak away backwards.',
      beginner: '"Fine" means close to the line of the stumps behind the batter; "behind square" means behind his crease line. Fine leg catches glances, flicks, and hooks.',
      intermediate: 'Fine leg is often the fast bowler’s resting pasture between overs — but versus the short-ball plan he becomes a catcher for the top-edged hook.',
      expert: 'His depth is a negotiation with the bouncer plan: on the rope for the hook trap, up in the ring to save the tickled single when the plan is full and straight. Where fine leg stands announces the next ball’s length.',
    },
  },
  {
    id: 'crk-beg-6', level: 'beginner',
    prompt: 'Tap SQUARE LEG — level with the batter on the LEG side.',
    spots: [SQUARE_LEG, POINT, FINE_LEG, COVER], answer: 'squareleg',
    title: 'Square leg: square of the wicket, leg side',
    exp: {
      kid: '"Square" means exactly level with the batter, out to the side. Square leg stands level with him on the legs side.',
      beginner: 'The square positions (square leg on the leg side, point on the off) field the cross-batted shots: pulls, sweeps, cuts.',
      intermediate: 'One of the two umpires stands at square leg — that’s why you see an official out in the field: judging stumpings and run-outs side-on.',
      expert: '"Backward" and "forward" refine every position from here: backward square leg (behind square) versus forward square leg — the leg-side-behind-square fielder LIMIT (two) makes these micro-placements legally significant.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'crk-int-1', level: 'intermediate',
    prompt: 'Tap THIRD MAN — the runs-saver behind square on the OFF side.',
    spots: [THIRD_MAN, FINE_LEG, COVER, LONG_ON], answer: 'thirdman',
    title: 'Third man: behind the slips, toward the rope',
    exp: {
      kid: 'When the ball zips off the edge of the bat PAST the catchers, it runs away behind — third man waits back there to stop it.',
      beginner: 'Third man fields deep behind square on the off side, mopping up edges that beat the slips and deliberate late cuts and ramps.',
      intermediate: 'Leaving third man empty is a calculated risk: it frees a fielder for attack, but every thick edge costs four. T20 made the deliberate ramp TO third man a stroke, forcing the position back.',
      expert: 'The name is genuinely positional history: slip and gully were the first two "men" behind square off; the third man came next as batting evolved. Modern shorthand: "fine third" vs "square third" — the position now slides along the arc ball-by-ball.',
    },
  },
  {
    id: 'crk-int-2', level: 'intermediate',
    prompt: 'Tap GULLY — the cordon’s wide extension, between the slips and point.',
    spots: [GULLY, COVER, MIDWICKET, THIRD_MAN], answer: 'gully',
    title: 'Gully: the wide slip',
    exp: {
      kid: 'One more catcher stands a little wider than the slips row — in the "gully," snapping up hard slashes and thick edges.',
      beginner: 'The gully fills the angle between the slips and point — catches there come from wide edges and airborne cut shots.',
      intermediate: 'Gully is a bounce-and-pitch call: staple on quick, bouncy tracks where hard-handed edges fly wide; often sacrificed on slow decks where edges die early.',
      expert: 'Fine detail: gully stands slightly deeper or finer by the batter’s hand-hardness — "flying gully" setups against compulsive slashers put him deeper for the airborne screamer. The position is a bet on one specific false shot.',
    },
  },
  {
    id: 'crk-int-3', level: 'intermediate',
    prompt: 'POWERPLAY: only TWO fielders may be outside the inner ring. Tap the 30-yard circle.',
    spots: [circle('ring', 152, 230, 16), PITCH, circle('ropefar', 30, 230, 13), COVER], answer: 'ring',
    title: 'The fielding ring: the powerplay’s fence',
    exp: {
      kid: 'See the dashed oval? During the powerplay overs, almost every fielder must stay INSIDE it — so big hits over their heads are extra rewarding!',
      beginner: 'Limited-overs cricket restricts deep fielders early: in the first powerplay only two may be outside this ring — attack time for batters.',
      intermediate: 'The restrictions relax in phases (more boundary riders allowed later) — that structure creates cricket’s innings arcs: sprint, consolidate, slog.',
      expert: 'The ring also polices non-powerplay play (max 4/5 out depending on format and phase) and inner-ring catchers requirements in some formats. Field-restriction law is why T20 batting orders are built around phase specialists.',
    },
  },
  {
    id: 'crk-int-4', level: 'intermediate',
    prompt: 'The batter keeps lofting straight drives. Tap LONG-OFF — the deep version of mid-off.',
    spots: [LONG_OFF, MID_OFF, COVER, BOUNDARY_ROPE], answer: 'longoff',
    title: 'Same lane, boundary depth',
    exp: {
      kid: 'When the batter starts hitting long and straight, the close straight fielder walks aaaall the way back to the rope — now he’s called long-off!',
      beginner: 'Ring positions have deep twins: mid-off ↔ long-off, mid-on ↔ long-on, cover ↔ deep cover. Same angle from the bat, different depth.',
      intermediate: 'Dropping back trades runs for wickets differently: it concedes the easy pushed single but sits under the mishit loft. Against set batters, captains take the catch option.',
      expert: 'Bowler-batter-field triangles: spinner tossing it up + long-off back = invitation to clear the shorter straight boundary… which is the trap. Reading WHY a fielder moved deep tells you the next ball before it’s bowled.',
    },
  },
  {
    id: 'crk-int-5', level: 'intermediate',
    prompt: 'Tap COW CORNER — where slog sweeps land.',
    spots: [circle('cowcorner', 175, 120, 18), LONG_ON, FINE_LEG, THIRD_MAN], answer: 'cowcorner',
    title: 'Cow corner: between deep midwicket and long-on',
    exp: {
      kid: 'The funny-named corner of the field where big wild leg-side swings fly — "cow corner," where supposedly only cows used to graze!',
      beginner: 'It’s the arc between deep midwicket and long-on — the landing zone of the slog sweep and the drag across the line.',
      intermediate: 'The name is affectionate mockery (agricultural shots!), but T20 made the region deadly serious: the slog sweep to cow corner is now a coached, percentage stroke.',
      expert: 'Defending it is a two-fielder problem: deep midwicket and long-on can’t both cover the gap BETWEEN them, so bowlers must hit lengths that make the swing risky (wide yorkers, into-the-pitch slower balls). The corner is really a length argument.',
    },
  },
  {
    id: 'crk-int-6', level: 'intermediate',
    prompt: 'Short ball incoming — the batter will HOOK. Tap where the top edge or hook shot travels.',
    spots: [circle('hookzone', 165, 350, 17), circle('coverdeep', 520, 300, 15), LONG_OFF, THIRD_MAN], answer: 'hookzone',
    title: 'Hooks go BEHIND square on the leg side',
    exp: {
      kid: 'A ball at the chest gets swatted around the corner behind the batter’s legs — deep back there is where it flies!',
      beginner: 'The hook and pull work across the line: pulls go squarer, hooks (off higher balls) go finer and behind square leg — often in the air.',
      intermediate: 'That’s why the bouncer plan stations deep backward square leg and fine leg on the rope: the trap IS the top edge or mistimed hook.',
      expert: 'The full trap: two men back on the leg-side rope, a bouncer barrage, and a leg gully for the gloved fend. The two-behind-square leg-side LIMIT is what caps this plan — one law, drawn straight from Bodyline, shapes the whole short-ball game.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'crk-exp-1', level: 'expert',
    prompt: 'The bowler glances balls off the pads too well. Tap LEG SLIP — the trap behind square, leg side, CLOSE.',
    spots: [circle('legslip', 303, 318, 13), SLIPS, SQUARE_LEG, FINE_LEG], answer: 'legslip',
    title: 'Leg slip: the mirror-image edge catcher',
    exp: {
      kid: 'A sneaky catcher stands just behind the batter on the LEGS side — waiting for a flick off the pads to pop straight to him!',
      beginner: 'Leg slip mirrors first slip on the leg side: it catches fine glances and gloved deflections that the keeper can’t reach.',
      intermediate: 'It appears for specific plans: leg-stump lines, in-swing, or spinners drifting into the pads — turning the batter’s bread-and-butter glance into a dismissal.',
      expert: 'Leg slip spends fielding-resource lavishly (a whole man for one shot), so its presence signals total commitment to the leg-side plan — and remember it counts against the two-behind-square leg-side limit.',
    },
  },
  {
    id: 'crk-exp-2', level: 'expert',
    prompt: 'Tap the SWEEPER — deep cover, patrolling the off-side rope.',
    spots: [circle('sweeper', 518, 298, 16), COVER, THIRD_MAN, LONG_OFF], answer: 'sweeper',
    title: 'The sweeper: deep cover point, saving four',
    exp: {
      kid: 'One fielder cruises along the far-off-side rope, sweeping up every big off-side hit before it can reach the boundary.',
      beginner: '"Sweeper" = a deep off-side boundary rider (deep cover/deep point). He concedes the single to deny the four.',
      intermediate: 'Sweepers appear when containment beats attack — middle overs of one-dayers, spinners operating to set fields. His presence usually means the ring inside is one man short.',
      expert: 'The sweeper defines the bowling width contract: with deep cover back, the bowler may bowl wider, inviting the drive at a protected boundary. Batters counter by hitting the GAP the sweeper’s ring absence created — the endless middle-overs argument of ODI cricket.',
    },
  },
  {
    id: 'crk-exp-3', level: 'expert',
    prompt: 'Tap SILLY MID-OFF — the helmet-wearing catcher crouched almost on the pitch.',
    spots: [circle('sillymidoff', 375, 255, 12), MID_OFF, COVER, SLIPS], answer: 'sillymidoff',
    title: '"Silly" = dangerously close',
    exp: {
      kid: 'Some brave fielders stand SO close to the batter they wear helmets! "Silly" is cricket’s real word for "very, very close."',
      beginner: 'Silly mid-off, silly point, short leg: close catchers a few yards from the bat, waiting for the ball to pop up off bat-and-pad.',
      intermediate: 'They appear with spin on turning pitches: the ball grips, kisses the inside or outside edge onto the pad, and lobs up for these vultures.',
      expert: 'Law protects the geometry: close fielders may not stand ON the pitch, nor move or distract as the ball is played, and the batter’s safety drove helmet/shin rules. "Silly" positions are pressure weapons — their mere presence changes a batter’s defensive technique.',
    },
  },
  {
    id: 'crk-exp-4', level: 'expert',
    prompt: 'T20 death overs: the batter RAMPS the yorker. Tap where the ramp/scoop is aimed.',
    spots: [circle('rampzone', 368, 420, 17), COVER, LONG_ON, POINT], answer: 'rampzone',
    title: 'Over the keeper — into the space behind',
    exp: {
      kid: 'The cheekiest shot in cricket: the batter scoops the ball right over the catcher’s head, backwards! Nobody fields back there!',
      beginner: 'The ramp/scoop redirects the bowler’s own pace over the keeper toward the fine boundary — targeting the one region fields rarely protect.',
      intermediate: 'It exists BECAUSE of field law and death bowling: yorkers demand fielders elsewhere, and the fine area behind the keeper is structurally empty. High risk, but aimed at guaranteed space.',
      expert: 'The counter-cycle is modern cricket in miniature: bowlers answer with wide yorkers (unrampable) or bouncers (ramp becomes a glove), captains post fine third/fine leg back, and batters respond with the reverse ramp. Every innovation here is a field-placement argument.',
    },
  },
  {
    id: 'crk-exp-5', level: 'expert',
    prompt: 'Off-spinner turning the ball INTO the right-hander. Tap SHORT LEG — the bat-pad trap.',
    spots: [circle('shortleg', 300, 268, 12), SLIPS, POINT, MIDWICKET], answer: 'shortleg',
    title: 'Short leg: the bat-pad catcher',
    exp: {
      kid: 'When the spinning ball jumps off the bat’s edge onto the pad, it pops up — and a helmeted fielder crouched by the batter’s legs grabs it!',
      beginner: 'Short leg crouches a couple of yards from the batter on the leg side. Off-spin turning IN creates inside edges onto the pad — his whole reason to exist.',
      intermediate: 'The plan is a chain: flight and dip force the forward defensive, turn finds the inside edge, pad pops it to short leg. Remove any link (sweep, use of feet) and the trap dies.',
      expert: 'Short leg is where teams put their bravest young fielder (tradition and reflexes both). Note the law interplay: he’s behind square-ish on the leg side, so he consumes one of the two legal behind-square leg-side slots when he creeps back.',
    },
  },
  {
    id: 'crk-exp-6', level: 'expert',
    prompt: 'Death-overs plan: wide yorkers outside off. Tap DEEP POINT — the boundary rider that plan needs.',
    spots: [circle('deeppoint', 528, 258, 15), POINT, THIRD_MAN, COVER], answer: 'deeppoint',
    title: 'Deep point: square off-side boundary cover',
    exp: {
      kid: 'If the bowler keeps aiming wide of the bat, the batter will slash it square — so a fielder waits deep out there on the rope.',
      beginner: 'Wide bowling drags hits square on the off side: cuts and carves fly toward point’s region, so its deep twin patrols the rope behind it.',
      intermediate: 'Ball and field must agree: a wide-yorker plan with NO deep point is a four-machine. Captains set the field first, then demand the bowler hit the matching line.',
      expert: 'Death-over fields are paired blueprints: wide-yorker field (deep point, deep cover, third man) versus straight-yorker field (long-on, long-off, fine leg). Watch the field flip between deliveries and you can call the bowler’s next line better than the batter can.',
    },
  },
];
