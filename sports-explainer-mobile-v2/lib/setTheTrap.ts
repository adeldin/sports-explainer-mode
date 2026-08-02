// Set the Trap — field-setting scenario data (VERBATIM from the set-the-trap.html
// prototype). The evidence layer (his last two shot arcs, faded on the grass), the
// fielder moves that happen BEFORE the ball, the same-stroke-per-scenario counterfactual
// (the shot the user does NOT control plays out identically; only the fielding geometry
// differs), the cordon move, and the everyone-in run-out are all data below. All
// fan-facing strings are prose only; <b>…</b> markers render as bold spans.

export type P2 = [number, number];
export type GradeKey = 'good' | 'ok' | 'bad';
export type TrapCall = 'catcher' | 'single' | 'rope';
export type DepthKey = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type WhyDepths = Record<DepthKey, string>;

export interface HudChip { c: string; warn?: boolean; }
export interface Fielder { id: string; n: string; p: P2; dy?: number; }
export interface EvidenceShot { to: P2; air: boolean; lab: string; labAt?: P2; }
export interface FielderMove { f: string; to: P2; relab: string; dy?: number; }

export type TrapOutcome = 'caught' | 'dot' | 'four' | 'six' | 'single' | 'two' | 'single_loss' | 'runout_win';

export interface TrapOption {
  k: GradeKey;
  everyoneIn?: boolean;
  moves: FielderMove[];
  shot: { to: P2; air: boolean; peak?: number };
  outcome: TrapOutcome;
  olab: string;
  olabAt?: P2;
  ghost: P2 | null;          // where the answer stood (teal dashed ring on a wrong pick)
  ghostLab?: string;
  t: string;
  b: string;
}

export interface TrapScenario {
  tab: string;
  hud: HudChip[];
  moveDur: number;           // fielder-slide duration — the move happens BEFORE the ball
  deliveryAfter: number;     // the bowler waits for the field to set
  fielders: Fielder[];
  shots: EvidenceShot[];     // THE EVIDENCE: his last two shots, faint on the grass
  prompt: string;
  answer: TrapCall;
  opts: Record<TrapCall, TrapOption>;
  why: WhyDepths;
}

// Where he strikes from (striker's crease) + the non-striker's post.
export const TRAP_BAT: P2 = [350, 288];
export const TRAP_NONSTRIKER: P2 = [322, 168];

export const TRAP_SCENARIOS: TrapScenario[] = [
  {
    tab: 'Test — new batter',
    hud: [{ c: 'TEST · OVER 18' }, { c: 'NEW BATTER IN' }, { c: 'BALL SWINGING' }, { c: '2 SLIPS POSTED' }],
    moveDur: 800, deliveryAfter: 1100,
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326], dy: 26 },
      { id: 'slip1', n: '1st slip', p: [318, 334], dy: 24 },
      { id: 'slip2', n: '2nd slip', p: [294, 329] },
      { id: 'gully', n: 'gully', p: [258, 310] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'midon', n: 'mid-on', p: [408, 122] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'finelg', n: 'fine leg', p: [436, 392] },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
    ],
    shots: [
      { to: [127, 387], air: false, lab: 'edge — through the gap, FOUR' },
      { to: [319, 314], air: false, lab: 'edge — one bounce, just short', labAt: [455, 332] },
    ],
    prompt: "He's new at the crease, the ball is hooping, and he's edged <b>twice</b> — both through or short of the same hole between 2nd slip and gully. Where does your next man go?",
    answer: 'catcher',
    opts: {
      catcher: {
        k: 'good',
        moves: [{ f: 'midwkt', to: [272, 322], relab: '3rd slip', dy: 24 }, { f: 'gully', to: [238, 299], relab: 'gully' }],
        shot: { to: [278, 320], air: true, peak: 26 }, outcome: 'caught',
        olab: 'CAUGHT — 3rd slip!', ghost: null,
        t: 'The hole is now a hand',
        b: 'Midwicket jogs across, becomes 3rd slip, and the very next edge — the same edge he\'s offered twice — goes straight into him at chest height. With a new batter and a swinging ball, a catcher in the edge lane is worth more than every run he might save elsewhere.',
      },
      single: {
        k: 'ok',
        moves: [{ f: 'midwkt', to: [430, 250], relab: 'ring midwicket' }],
        shot: { to: [127, 387], air: true, peak: 26 }, outcome: 'four',
        olab: 'FOUR — through the gap you left', ghost: [278, 320], ghostLab: '3rd slip catches this',
        t: "You strangled runs he wasn't scoring",
        b: "Tightening the leg-side ring is a real tool — in the middle overs. But this batter isn't milking singles, he's nicking. The next edge flew through the vacant 3rd-slip hole to the rope, and the wicket a catcher takes was never on the table.",
      },
      rope: {
        k: 'bad',
        moves: [{ f: 'gully', to: [98, 300], relab: 'deep point' }],
        shot: { to: [127, 387], air: true, peak: 26 }, outcome: 'four',
        olab: 'FOUR — the cordon you thinned', ghost: [278, 320], ghostLab: '3rd slip catches this',
        t: 'You pulled a catcher OUT to save runs',
        b: "Sending gully to the fence didn't just fail to add a catcher — it removed one. The edge came again, fizzed through the now-wider hole, and your deep man watched it race past him to the rope. Defensive fields feel safe; against a nicking batter they're the most expensive choice on the card.",
      },
    },
    why: {
      rookie: "That row of fielders standing right behind the bat are 'slips' — they're there to catch the edges. He's edged twice into the same gap. Put a catcher in the gap.",
      beginner: "In a Test there's no rush of runs — the currency is wickets. A new batter nicking a swinging ball is the highest-percentage wicket you'll be offered all day. You field where the ball is GOING, and the faded arcs show you exactly where that is.",
      intermediate: 'Early wickets beat saved singles because they compound: a new batter is at his most vulnerable for his first 20 balls, and each wicket exposes the next new batter. The slip cordon is bought with runs elsewhere — that\'s the trade a captain is paid to make when the ball swings.',
      expert: 'Think in expected dismissals: an edge lane that\'s produced two chances in two overs is live at maybe 1-in-6 per over, while ring fielders save perhaps a run an over against a batter on nought. Attacking captains crowd the cordon precisely when the evidence is this loud — the arcs on the grass ARE the model.',
    },
  },
  {
    tab: 'T20 powerplay — FLIP',
    hud: [{ c: 'T20 · OVER 4' }, { c: 'POWERPLAY', warn: true }, { c: 'MAX 2 FIELDERS OUTSIDE CIRCLE', warn: true }, { c: 'HE KEEPS EDGING' }],
    moveDur: 800, deliveryAfter: 1100,
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326], dy: 26 },
      { id: 'slip1', n: '1st slip', p: [318, 334], dy: 24 },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'deeppt', n: 'deep point', p: [98, 300] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'midon', n: 'mid-on', p: [408, 122] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'finelg', n: 'fine leg', p: [452, 398] },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
    ],
    shots: [
      { to: [307, 313], air: false, lab: 'edge — died short of slip', labAt: [206, 306] },
      { to: [192, 420], air: false, lab: 'edge — squirted away, FOUR' },
    ],
    prompt: "Powerplay: for the first six overs <b>only two fielders may stand outside the circle</b> — the rope can't be packed even if you wanted to. He's edging, and the edges keep landing where a second catcher would stand. Instinct says protect. What does the phase say?",
    answer: 'catcher',
    opts: {
      catcher: {
        k: 'good',
        moves: [{ f: 'midwkt', to: [306, 314], relab: '2nd slip (close)', dy: -26 }],
        shot: { to: [306, 314], air: true, peak: 26 }, outcome: 'caught',
        olab: 'SNAFFLED — the closer catcher', ghost: null,
        t: 'Attack WHILE the field is restricted',
        b: 'The edges were dying short — so the extra catcher stands CLOSER, and the next one carries straight to him. The powerplay caps your boundary protection at two men anyway; the phase is begging you to hunt. Early wickets are how powerplays are won.',
      },
      single: {
        k: 'ok',
        moves: [{ f: 'cover', to: [248, 250], relab: 'short cover' }],
        shot: { to: [150, 405], air: true, peak: 26 }, outcome: 'four',
        olab: 'FOUR — past the cordon again', ghost: [306, 314], ghostLab: 'the extra catcher takes this',
        t: 'Wrong mistake hunted',
        b: "Short cover saves the push into the covers — but he isn't pushing, he's edging. The next nick squirted past your lone slip and beat the sweeper to the rope. You defended a shot he isn't playing and left open the one he can't stop playing.",
      },
      rope: {
        k: 'bad',
        moves: [{ f: 'deeppt', to: [90, 190], relab: 'deep cover' }, { f: 'finelg', to: [500, 380], relab: 'deep bkwd square' }],
        shot: { to: [150, 405], air: true, peak: 26 }, outcome: 'four',
        olab: "FOUR — you can't guard this rope", ghost: [306, 314], ghostLab: 'the extra catcher takes this',
        t: 'The law already vetoed this plan',
        b: "Only two men may patrol the boundary in the powerplay — all you did was shuffle which two. The edge still had the whole third-man rope to itself. When the rules cap your defense, the only lever left is attack: that's WHY powerplay wickets are so valuable.",
      },
    },
    why: {
      rookie: 'Early in a T20 there\'s a rule called the powerplay: for six overs almost everyone must stay close. You can\'t guard the boundary properly — so use the crowd of close fielders to catch him out instead.',
      beginner: 'Overs 1–6: max two fielders outside the 30-yard circle. Batters attack because the rope is open — but that same aggression, plus a nicking habit, is your chance. A second catcher, standing closer because his edges are dying short, turns his powerplay into yours.',
      intermediate: "The instinct 'he's scoring, spread out' is exactly backwards here — spreading is illegal, and edges don't care about sweepers. Sides that take three powerplay wickets win about two-thirds of T20s: the restriction phase is where cheap wickets convert into match wins.",
      expert: 'Phase economics: powerplay run rates sit around 7.5–9 because the field is capped, so runs conceded in overs 1–6 are partly structural — you can\'t save them all. Wickets, though, reprice the whole innings: each one drags the middle-overs rate down and forces the anchor role onto a hitter. Attack is the only lever the law leaves you, so pull it hard.',
    },
  },
  {
    tab: 'ODI — singles leaking',
    hud: [{ c: 'ODI · OVER 28' }, { c: 'SPINNER ON · KEEPER UP' }, { c: 'MAX 4 OUT (MIDDLE OVERS)' }, { c: '5 SINGLES THIS OVER + LAST' }],
    moveDur: 800, deliveryAfter: 1100,
    fielders: [
      { id: 'keeper', n: 'keeper (up)', p: [340, 318], dy: 26 },
      { id: 'slip1', n: 'slip', p: [320, 332], dy: 24 },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [196, 218] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'longoff', n: 'long-off', p: [300, 32] },
      { id: 'longon', n: 'long-on', p: [390, 34] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'finelg', n: 'fine leg', p: [436, 392] },
      { id: 'bowler', n: 'bowler (spin)', p: [346, 150] },
    ],
    shots: [
      { to: [150, 254], air: false, lab: 'pushed wide of cover — single', labAt: [118, 306] },
      { to: [158, 270], air: false, lab: 'again — single, strike rotated', labAt: [252, 306] },
    ],
    prompt: "Middle overs, your spinner is on, and they're <b>milking him</b> — soft pushes through the cover-point lane, single after single, strike rotating every ball. No risk, free runs. Which mistake do you hunt now?",
    answer: 'single',
    opts: {
      single: {
        k: 'good',
        moves: [{ f: 'midwkt', to: [192, 260], relab: 'extra cover, in the lane' }],
        shot: { to: [192, 260], air: false }, olabAt: [248, 236], outcome: 'dot',
        olab: 'CUT OFF — dot ball. Pressure.', ghost: null,
        t: 'The tap is dry',
        b: 'Midwicket jogs all the way across into the cover-point lane — right on the line the arcs are drawn. The same push dies in his hands: dot ball. Kill the singles and a batter in rotation-mode has two choices left: block, or invent a risk. Both are wins for the spinner.',
      },
      catcher: {
        k: 'ok',
        moves: [{ f: 'midwkt', to: [271, 323], relab: '2nd slip' }],
        shot: { to: [150, 254], air: false }, olabAt: [148, 192], outcome: 'single',
        olab: 'single — the drip continues', ghost: [192, 260], ghostLab: 'a ring man lives HERE',
        t: 'Attacking the wrong error',
        b: 'A second catcher hunts an edge he isn\'t offering — these are soft-handed pushes, not nicks. The lane stayed open, the single came again, and the strike rotated again. Attack is a virtue, but only aimed at the mistake actually on offer.',
      },
      rope: {
        k: 'bad',
        moves: [{ f: 'cover', to: [90, 190], relab: 'deep cover' }],
        shot: { to: [110, 240], air: false }, olabAt: [100, 206], outcome: 'two',
        olab: 'TWO — the whole lane, gifted', ghost: [192, 260], ghostLab: 'a ring man lives HERE',
        t: 'You widened the leak',
        b: 'Dropping cover to the fence turned a one into a two — the push now rolls through an empty ring while your deep man walks it in. Boundary riders stop fours; they manufacture singles. Against a milking batter that\'s paying him to keep going.',
      },
    },
    why: {
      rookie: 'Not every run matters equally, but easy runs every single ball add up fast. See the two faded arcs through the same gap? Put a fielder exactly there and the free runs stop.',
      beginner: "'Milking' means scoring safe singles with no risk, and it quietly ruins an innings from the field's side: 36 balls of milk is 36 runs for nothing. A ring fielder in the leak lane forces dots — and dots force the batter to try something the spinner wants him to try.",
      intermediate: "Ring fielders in one-day cricket save about 1.2 runs a ball in tight finishes, but their real product is pressure: three dots in a row and the batter's risk appetite jumps. Boundary attempts carry a ~12% dismissal chance versus ~3% for rotation — plugging the single is how you push him from 3% cricket into 12% cricket.",
      expert: "This is the spinner's squeeze: keeper up (so he can't leave his crease), lane plugged (so rotation dies), spin turning away. The forced error arrives within an over or two — a chip over the ring or a cut too close to point. Field-setting doesn't just react to shots; it herds the batter toward the dismissal your bowler is built to take.",
    },
  },
  {
    tab: 'T20 death — defend it',
    hud: [{ c: 'T20 · OVER 20' }, { c: 'DEFENDING 9 OFF 4 BALLS' }, { c: 'MAX 5 OUT AT THE DEATH' }, { c: 'HE SLOGS MIDWICKET' }],
    moveDur: 800, deliveryAfter: 1100,
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326], dy: 26 },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'longoff', n: 'long-off', p: [300, 32] },
      { id: 'longon', n: 'long-on', p: [390, 34] },
      { id: 'deepcov', n: 'deep cover', p: [90, 190] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'deepsq', n: 'deep square leg', p: [560, 352] },
      { id: 'finelg', n: 'fine leg', p: [452, 398] },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
    ],
    shots: [
      { to: [660, 264], air: true, lab: 'slogged — SIX over midwicket' },
      { to: [622, 318], air: false, lab: 'flat slog — one bounce, FOUR' },
    ],
    prompt: "Four balls left, nine to defend, and he's hit the <b>same slog</b> twice — both into the unguarded deep-midwicket sector. At the death you're allowed five men on the rope… but none of them is standing where he's actually hitting it. Fix what?",
    answer: 'rope',
    opts: {
      rope: {
        k: 'good',
        moves: [{ f: 'deepcov', to: [618, 282], relab: 'deep midwicket' }],
        shot: { to: [618, 282], air: true }, outcome: 'caught',
        olab: 'CAUGHT — deep midwicket, at the rope', ghost: null,
        t: 'You moved the fence to the shot',
        b: 'Deep cover sprints the long way around the rope and becomes deep midwicket — parked exactly where both arcs point. Same slog, same flight… straight down his throat. At the death, boundaries lose games and catchers on the rope win them: a rider in the slog sector is both at once.',
      },
      catcher: {
        k: 'bad',
        moves: [{ f: 'deepcov', to: [296, 324], relab: 'slip' }],
        shot: { to: [666, 281], air: true }, outcome: 'six',
        olab: 'SIX — over everything you own', ghost: [618, 282], ghostLab: 'deep midwicket swallows this',
        t: 'A slip for a slogger',
        b: 'Edges are not the mistake on offer — full-blooded slogs are. The next one sailed forty meters over your new slip and one row into the crowd. At the death the mis-hit you\'re hunting comes down on the ROPE, not behind the bat.',
      },
      single: {
        k: 'bad',
        moves: [{ f: 'midwkt', to: [430, 250], relab: 'tight midwicket' }],
        shot: { to: [666, 281], air: true }, outcome: 'six',
        olab: 'SIX — clean over the ring', ghost: [618, 282], ghostLab: 'deep midwicket swallows this',
        t: "Singles don't hurt you — sixes do",
        b: 'Nine off four: a single per ball and YOU win. The only shot that beats you is the boundary, and you tightened the ring against the one run that was actually fine to give. The slog cleared your tucked-in midwicket by thirty meters, and the equation collapsed to 3 off 3.',
      },
    },
    why: {
      rookie: 'They need 9 runs from 4 balls. Singles are fine for you — 4 singles is only 4 runs. What kills you is the ball reaching the rope. Guard the exact spot he keeps hitting.',
      beginner: "'Death overs' = the last few, when batters swing at everything. The fielding rules allow five men on the boundary now, and the skill is putting them where THIS batter hits, not where a textbook says. Two arcs into deep midwicket is not a coincidence — it's a map.",
      intermediate: 'Do the arithmetic the batter is doing: 9 off 4 means he needs at least one boundary. Concede singles happily — 4 dots-and-ones and you win — and spend your five boundary riders on his proven sectors. A rider in the slog lane converts his best-case swing into your best-case wicket.',
      expert: "Boundary attempts at the death produce a dismissal on roughly 12% of balls (vs ~3% for rotation), and the mis-hit distribution clusters in the batter's power sector — which is why analysts chart slog arcs ball by ball. A sweeper moved sector-to-sector on the evidence is the cheapest win-probability swing a captain can buy in over 20.",
    },
  },
  {
    tab: '1 to win, 1 ball — ALL IN',
    hud: [{ c: 'T20 · LAST BALL', warn: true }, { c: 'THEY NEED 1 TO WIN', warn: true }, { c: 'ANY SINGLE LOSES IT' }, { c: 'TIE = SUPER OVER' }],
    moveDur: 900, deliveryAfter: 1250,
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326], dy: 26 },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'longoff', n: 'long-off', p: [300, 32] },
      { id: 'longon', n: 'long-on', p: [390, 34] },
      { id: 'deepcov', n: 'deep cover', p: [90, 190] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'deepsq', n: 'deep square leg', p: [560, 352] },
      { id: 'finelg', n: 'fine leg', p: [452, 398] },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
    ],
    shots: [
      { to: [430, 320], air: false, lab: 'nudged square — scampered single', labAt: [520, 318] },
      { to: [250, 300], air: false, lab: 'dabbed to point — another single', labAt: [175, 332] },
    ],
    prompt: "Last ball. They need <b>one run</b>. The rope is now irrelevant — a boundary and a single lose you the game identically. Only a dot or a wicket saves it. Where does EVERY man go?",
    answer: 'single',
    opts: {
      single: {
        k: 'good', everyoneIn: true,
        moves: [
          { f: 'longoff', to: [292, 164], relab: 'ring — saving one' },
          { f: 'longon', to: [390, 166], relab: 'ring — saving one' },
          { f: 'deepcov', to: [190, 244], relab: 'ring cover' },
          { f: 'deepsq', to: [452, 296], relab: 'ring square leg' },
          { f: 'finelg', to: [400, 340], relab: 'short fine leg' },
        ],
        shot: { to: [250, 278], air: false }, outcome: 'runout_win',
        olab: 'RUN OUT — short by metres. YOU WIN', ghost: null,
        t: 'Everyone in — and the ring strikes',
        b: 'All nine crowd inside the circle, because the only run that exists is the quick single. He taps to point and runs on hope — point swoops in two steps and the throw beats him to the bowler\'s end by metres. This is why, on a one-to-win last ball, the whole team stands close enough to shake hands.',
      },
      rope: {
        k: 'bad',
        moves: [{ f: 'midwkt', to: [618, 282], relab: 'deep midwicket' }],
        shot: { to: [440, 300], air: false }, olabAt: [288, 252], outcome: 'single_loss',
        olab: 'tip-and-run — single. THEY WIN', ghost: [452, 296], ghostLab: 'a ring man makes this a run-out',
        t: "You guarded a rope that couldn't hurt you",
        b: 'Six men on the fence, saving the four they didn\'t need. The tap dropped into the empty square-leg ring and the batters strolled the single. On this ball the boundary and the single are the same result — so every meter of rope you protected was protection for nothing.',
      },
      catcher: {
        k: 'bad',
        moves: [{ f: 'deepcov', to: [296, 324], relab: 'slip' }],
        shot: { to: [440, 300], air: false }, olabAt: [288, 252], outcome: 'single_loss',
        olab: 'easy single — THEY WIN', ghost: [452, 296], ghostLab: 'a ring man makes this a run-out',
        t: "A catcher can't catch a tap",
        b: 'The slip stands ready for an edge that never needs to come — the batter only wants bat on ball and one safe run. He steered it gently into the vacant ring and jogged through. The wicket you needed was a RUN-OUT, and run-outs are made by ring fielders, not cordons.',
      },
    },
    why: {
      rookie: "They need just 1 run off the very last ball. If the ball reaches the boundary they win — but they win with a tiny single too. So the boundary doesn't matter anymore! Bring every fielder close to stop the single.",
      beginner: "This is the famous 'everyone in' field, and it looks bizarre until you do the logic: four and one are the same losing result, so defending the rope defends nothing. Nine men in the ring means every tap is a dot or a run-out — the only two outcomes that save you.",
      intermediate: "Ring fielders save about 1.2 runs a ball in one-to-win endings — effectively the whole game on this ball. The bowler aims a yorker or wide-ish line the batter can only dig out; every ring man is already moving as the bat comes down. You're not preventing runs, you're manufacturing a run-out.",
      expert: "Decision theory in one ball: outcomes are {dot, wicket} = win/tie vs {any run, any boundary} = loss. Fielders on the rope only convert boundaries into runs — which are the SAME loss — so their marginal value is zero and you liquidate all of it into single-prevention. It's the purest example in cricket of fielding to the scoreboard, not to the shot.",
    },
  },
];

// Inline law teaching that ships with the module (verbatim footer).
export const TRAP_FOOT = 'a fielding side is 11: bowler + keeper + 9 you can put anywhere · the dashed ellipse is the 30-yard circle — format rules limit how many may stand beyond it · slip, gully, point, cover… every position name is on the dot.';

export const TRAP_SUB = "You captain the fielding side: nine movable fielders, and every placement is a bet on which mistake you're hunting — the edge, the single, or the boundary. His last two shots are still drawn on the grass. Read them, then move a man.";
