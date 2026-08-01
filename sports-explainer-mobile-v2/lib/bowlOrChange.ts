// Bowl or Change? — scenario data (VERBATIM from cricketcorner/bowl-or-change.html). You're the
// captain handing out the next over. Current figures are the PAST; matchup and GROUND GEOMETRY are
// the next over — so every scenario draws the ground's asymmetry (a pulled-in rope, calibrated
// distance arrows from the bat to each boundary) and the answer follows the meters, not the
// scorecard. Verdicts, the rope distances, matchup stats and the 4-depth COACH'S READ are the
// owner-reviewed surface; copied exactly, never re-derived.
//
// NAMING RULE (owner): bowlers are ROLES, never invented people. The two men who can be brought on
// are identified by what they bowl — 'quick' and 'leftarm' — and every on-field label is a fielding
// position and/or a bowling role ("fine leg · quick", "QUICK (on)"). The spike's placeholder ids
// have been replaced with these role ids; no other content changed.
//
// Coordinates share the cricket oval viewBox (680×460, OVAL in fields/CricketOval) — no board band,
// so the module renders the shared CricketOval at CRICKET_OVAL_RATIO. Pure data — zero RN imports.

export type P = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';
export type BOCOption = 'keep' | 'quick' | 'spin';
export type BOCOutcome = 'caught' | 'dot' | 'six' | 'four' | 'two';

// Oval geometry (shared with the renderer) + the bowler's mark at the top of his run.
export const CX = 340, CY = 232, RX = 322, RY = 216;
export const MARK: P = [346, 150];

// A point on (a fraction of) the boundary, by angle — how the pulled-in ropes are laid out.
export const ropePt = (scale: number, thDeg: number): P => {
  const th = (thDeg * Math.PI) / 180;
  return [CX + RX * scale * Math.cos(th), CY + RY * scale * Math.sin(th)];
};

// The two bowlers who can be brought on are ROLES, not names.
export type BowlerId = 'quick' | 'leftarm';
export const BOWLER_ON_LABEL: Record<BowlerId, string> = { quick: 'QUICK (on)', leftarm: 'LEFT-ARM SPIN (on)' };
export const BOWLER_TAKES_BALL: Record<BowlerId, string> = { quick: 'the QUICK', leftarm: 'the LEFT-ARMER' };

export interface HudChip { c: string; warn?: boolean }
export interface RopeArc { scale: number; th0: number; th1: number; m: string; lab: string }
export interface DistArrow { to: P; m: string; warn: boolean }
export interface Fielder { id: string; n: string; p: P; dy?: number }
export interface Morph { f: string; to: P; relab: string; dy?: number }
export type Reveal =
  | { type: 'ring'; p: P; lab: string }
  | { type: 'arc'; to: P; lab: string }
  | { type: 'wide'; lab: string }
  | { type: 'lbl'; p: P; lab: string };

export interface BOCResult {
  k: Grade;
  newBowler: BowlerId | null;      // null = keep the spinner on
  morphs: Morph[];                 // how the field rebuilds around whoever takes the ball
  shot: { to: P; air: boolean; peak?: number };
  outcome: BOCOutcome;
  catcher?: string;                // the fielder the ball ends in (documentation for the audit)
  nearOk?: string[];               // cordon members close enough that the catch reads fairly
  olab: string;
  olabAt?: P;
  reveal: Reveal[];                // the teaching layer, drawn after the outcome
  t: string;
  b: string;
}

export interface BOCScenario {
  tab: string;
  hud: HudChip[];
  moveDur: number;                 // how long a morphing fielder takes to walk to his new post
  ropes: RopeArc[];
  dists: DistArrow[];              // calibrated boundary arrows from the bat (55m / 82m …)
  batter: { n: string; p: P };
  bowlerN: string;
  wide?: { from: P; to: P; lab: string };   // the deliberate wide line (the trap)
  fielders: Fielder[];
  prompt: string;
  answer: BOCOption;
  opts: Record<BOCOption, BOCResult>;
  why: Record<Depth, string>;
}

export const gradeColor = (k: Grade): string => (k === 'good' ? '#14B8A6' : k === 'ok' ? '#F5A623' : '#e24b4a');
// NOTE the spike's wording: a right call here is the CAPTAIN'S call.
export const gradeTag = (k: Grade): string => (k === 'good' ? "Captain's call" : k === 'ok' ? 'Defensible' : 'Wrong call');

// The three calls (button copy, verbatim).
export const OPTIONS: { key: BOCOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'keep', title: 'KEEP THIS BOWLER', sub: 'Your spinner stays on his plan', alt: true },
  { key: 'quick', title: 'BRING THE STRIKE QUICK', sub: 'pace, slips, new-ball tricks' },
  { key: 'spin', title: 'BRING THE MATCHUP SPINNER', sub: 'left-arm — the scouting-report pick' },
];

export const PROMPT_KEEP = 'You nod. <b>Your spinner keeps the ball</b> — same plan, one more over of it…';
export const PROMPT_SET = 'Field set. In he comes…';
export const changePrompt = (b: BowlerId): string =>
  `Change bowler: <b>${BOWLER_TAKES_BALL[b]} takes the ball</b> — and watch the whole field rebuild around him…`;
export const OUTCOME_PROMPT: Record<BOCOutcome, string> = {
  caught: 'Swallowed. <b>The plan, paying out.</b>',
  dot: 'Nothing off it. <b>Exactly the ball the situation ordered.</b>',
  six: 'Away it goes. <b>The reveal shows what you gave up.</b>',
  four: 'Away it goes. <b>The reveal shows what you gave up.</b>',
  two: '',
};
export const HINT_IDLE = 'Figures describe the past. Geometry describes the next over.';
export const HINT_DONE = 'Reset, or hand out another over.';
export const SUB = 'Next over is yours to hand out. Current figures are the past; <b>matchup and ground geometry are the next over.</b> Preview a choice to see its field — the fielders rebuild around whoever takes the ball.';
export const FOOT = 'Coach’s Corner cricket spike · a bowler bowls one over (6 balls) then must rotate out for at least the next · T20 caps each bowler at 4 overs · the keeper stands UP to spin, BACK to pace — watch him move with every change.';

export const SCENARIOS: BOCScenario[] = [
  {
    tab: 'The strangle',
    hud: [{ c: 'ODI · OVER 35' }, { c: 'SPINNER 7-0-31-1' }, { c: 'LEG-SIDE ROPE 78m' }, { c: 'OFF-SIDE ROPE 62m', warn: true }],
    moveDur: 850,
    ropes: [{ scale: 0.68, th0: 125, th1: 235, m: '62m', lab: 'rope in short — 62m' }],
    dists: [{ to: [640, 310], m: '78m — the LONG side', warn: false }, { to: [124, 206], m: '62m', warn: true }],
    batter: { n: 'batter (RH)', p: [350, 288] },
    bowlerN: 'SPINNER (on)',
    fielders: [
      { id: 'keeper', n: 'keeper (up)', p: [340, 318] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'longoff', n: 'long-off', p: [300, 42] },
      { id: 'leftarm', n: 'mid-on · left-arm spin', p: [408, 122] },
      { id: 'midwkt', n: 'midwicket', p: [452, 240] },
      { id: 'deepmid', n: 'deep midwicket', p: [618, 282] },
      { id: 'deepsq', n: 'deep square leg', p: [560, 352] },
      { id: 'quick', n: 'fine leg · quick', p: [436, 392] },
    ],
    prompt: 'Your spinner has bowled seven tidy overs, always angling into the <b>78-meter leg side</b> — the long half of this ground. The batter keeps swinging that way and keeps not clearing it. Change something?',
    answer: 'keep',
    opts: {
      keep: {
        k: 'good', newBowler: null, morphs: [],
        shot: { to: [618, 282], air: true, peak: 110 }, outcome: 'caught', catcher: 'deepmid',
        olab: 'CAUGHT — deep midwicket, 15m in', olabAt: [520, 250],
        reveal: [],
        t: 'The ground is his fielder',
        b: 'Same plan, eighth over: into the pads, inviting the slog toward the 78-meter rope. The batter finally goes through with it — and the mishit lands comfortably in deep midwicket’s hands, fifteen meters inside a boundary that eats that shot for breakfast. Your spinner isn’t lucky; he’s aiming at the biggest part of the ground.',
      },
      quick: {
        k: 'bad', newBowler: 'quick',
        morphs: [
          { f: 'keeper', to: [340, 338], relab: 'keeper (back)' },
          { f: 'deepmid', to: [452, 262], relab: 'midwicket sav. one' },
          { f: 'midwkt', to: [295, 328], relab: 'slip', dy: 24 },
        ],
        shot: { to: [30, 162], air: true, peak: 120 }, outcome: 'six',
        olab: 'SIX — pace flies off the bat',
        reveal: [{ type: 'ring', p: [618, 282], lab: 'the mishit was landing HERE all evening' }],
        t: 'You paid for the batter’s bat-speed',
        b: 'The quick’s extra pace does the batter’s work for him: the same swing that died at deep midwicket now rockets over the SHORT 62-meter off side — pace on the ball travels. You swapped a strangle that was one mishit from a wicket for a six into the second tier.',
      },
      spin: {
        k: 'ok', newBowler: 'leftarm',
        morphs: [],
        shot: { to: [560, 300], air: false }, outcome: 'two',
        olab: 'TWO — the strangle loosens', olabAt: [520, 314],
        reveal: [{ type: 'ring', p: [618, 282], lab: 'Your spinner kept hitting this length' }],
        t: 'Same species, less venom',
        b: 'The left-armer spins it the same way, so the geometry survives — but he hasn’t your spinner’s control of length, and the batter works twos into the gaps instead of swinging at air. Nothing terrible, but you traded a bowler mid-hypnosis for a colder one. Momentum is part of a spell.',
      },
    },
    why: {
      rookie: 'This ground isn’t a circle — one boundary is 78 meters away, the other only 62. Your spinner keeps making the batter hit toward the FAR one, where big hits get caught. Why change what’s working?',
      beginner: "'The ground is his fielder': a slog needs to carry 78 meters on your spinner's side, and mishits land in the deep fielder's hands. Figures of 7-0-31-1 aren't just tidy — they're the visible half of a trap that's one big swing from paying out.",
      intermediate: 'Spin concedes around 6.9–7.5 an over in this phase versus 8+ for pace — and the gap widens on big grounds, because spin forces the batter to generate ALL the power himself. Extra pace is a gift to a swinger: same bat speed, ten more meters of carry.',
      expert: "Keep-the-spell logic is measurable: ball-by-ball optimization work on IPL data finds the choice of bowling plan for a single over swings defend-probability by ~5 percentage points, and 'spinner into the long side vs an aerial hitter' is one of the strongest positive plans in the set. The captain's job here is to NOT interrupt a working geometry loop.",
    },
  },

  {
    tab: 'Best figures — FLIP',
    hud: [
      { c: 'T20 · OVER 17 NEXT' }, { c: 'SPINNER 2/22 — BEST FIGURES' }, { c: '3 OF HIS 4 OVERS USED' },
      { c: 'STRAIGHT ROPE 52m', warn: true }, { c: 'TWO LEFTIES IN', warn: true },
    ],
    moveDur: 850,
    ropes: [{ scale: 0.8, th0: 235, th1: 305, m: '52m', lab: '52m — SHORT straight' }],
    dists: [{ to: [344, 60], m: '52m straight', warn: true }, { to: [60, 230], m: '74m square', warn: false }],
    batter: { n: 'batter (LH)', p: [350, 288] },
    bowlerN: 'SPINNER (on)',
    fielders: [
      { id: 'keeper', n: 'keeper (up)', p: [340, 318] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'leftarm', n: 'extra cover · left-arm spin', p: [240, 180] },
      { id: 'longoff', n: 'long-off (rope)', p: [302, 68], dy: 24 },
      { id: 'longon', n: 'long-on (rope)', p: [386, 70], dy: 24 },
      { id: 'midwkt', n: 'midwicket', p: [452, 240] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'deepsq', n: 'deep square leg', p: [560, 352] },
      { id: 'quick', n: 'fine leg · quick', p: [436, 392] },
    ],
    prompt: 'Your spinner’s 2/22 is the best card in your hand — but look UP the ground: the straight rope is <b>52 meters</b>, your long-off and long-on are standing ON it, and two left-handers who slog straight are in. A lefty note: his off side flips to your right. Figures… or geometry?',
    answer: 'quick',
    opts: {
      quick: {
        k: 'good', newBowler: 'quick',
        morphs: [
          { f: 'keeper', to: [340, 338], relab: 'keeper (back)' },
          { f: 'leftarm', to: [272, 122], relab: 'mid-off · left-arm' },
        ],
        shot: { to: [346, 302], air: false }, outcome: 'dot',
        olab: 'jammed out — DOT. Yorkers don’t lift',
        reveal: [],
        t: 'You can’t slog what never bounces',
        b: 'The quick spears yorkers into the base of leg stump, and the slog-sweep that murders spin can’t get UNDER a ball at ankle height. Dug out to nothing. The 52-meter rope only matters if the ball can be lifted — pace at the boots takes the launch angle away entirely.',
      },
      keep: {
        k: 'bad', newBowler: null, morphs: [],
        shot: { to: [356, 8], air: true, peak: 130 }, outcome: 'six',
        olab: 'SIX — 52m is nothing downtown', olabAt: [490, 118],
        reveal: [{ type: 'ring', p: [344, 60], lab: 'your riders stood ON a 52m rope — no room' }],
        t: 'Figures describe the past',
        b: '2/22 was earned against right-handers on the long diagonals. The lefty gets a flighted ball in the slot and slog-sweeps it STRAIGHT — over a 52-meter rope your boundary riders were already standing on. There was never any room to defend back there. The scoreboard remembers figures; the rope only knows meters.',
      },
      spin: {
        k: 'ok', newBowler: 'leftarm',
        morphs: [],
        shot: { to: [344, 60], air: true, peak: 90 }, outcome: 'four',
        olab: 'FOUR — flat onto the short rope', olabAt: [490, 118],
        reveal: [{ type: 'ring', p: [344, 60], lab: 'anything lofted straight lands out here' }],
        t: 'Right matchup, wrong ground',
        b: 'On paper the left-armer turns it away from the lefties — the scouting-report pick. But he still bowls SPIN, still invites the lofted straight hit, and 52 meters forgives every mistimed one: a flat slog one-bounces the rope your riders can’t defend from on top of it. The matchup sheet never met this ground.',
      },
    },
    why: {
      rookie: 'The fence behind the bowler is only 52 meters here — a short hit clears it. The new batters love hitting exactly that way, and slow bowling is easy to hit far. Bring the fast bowler who keeps the ball low.',
      beginner: 'A bowler’s figures (2/22 = 2 wickets, 22 runs) tell you what already happened — against different batters. The next over belongs to two lefties and a 52-meter straight rope. Yorker-length pace can’t be lifted; flighted spin is a launch pad. Geometry outvotes the scorecard.',
      intermediate: 'Matchup data says off-spin holds lefties to ~6.6 an over versus ~7.3 for righties — that’s the temptation — but matchup tables assume a neutral ground. A 52m straight boundary repays every slightly-wrong flighted ball with six, and slog-sweeps against spin are precisely the lefty’s percentage shot. Pace at the stumps removes the shot class entirely.',
      expert: 'Death-overs specialists hold 7–9 an over at the death because they subtract launch angle, not because they win matchups: the yorker turns a 52m rope into scenery. Note the resource layer too — your spinner has one over left and over 18 or 19 on the long-rope end would suit him better; sequencing which END a bowler uses is the same geometry lesson one level up.',
    },
  },

  {
    tab: 'New ball, tailender',
    hud: [{ c: 'TEST · OVER 81' }, { c: '2ND NEW BALL AVAILABLE', warn: true }, { c: '#10 ON STRIKE' }, { c: 'SPINNER 31-8-77-2' }],
    moveDur: 850,
    ropes: [],
    dists: [],
    batter: { n: '#10 (tailender)', p: [350, 288] },
    bowlerN: 'SPINNER (on)',
    fielders: [
      { id: 'keeper', n: 'keeper (up)', p: [340, 318] },
      { id: 'slip1', n: '1st slip', p: [318, 334] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'leftarm', n: 'mid-on · left-arm spin', p: [408, 122] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'shortleg', n: 'short leg', p: [384, 300] },
      { id: 'quick', n: 'fine leg · quick', p: [436, 392] },
    ],
    prompt: 'Over 81 of a Test: the <b>second new ball</b> is available — after 80 overs you may swap the soft old ball for a hard shiny one that swings and bounces. The No. 10 is on strike, eyes like saucers. Who gets the cherry?',
    answer: 'quick',
    opts: {
      quick: {
        k: 'good', newBowler: 'quick',
        morphs: [
          { f: 'keeper', to: [340, 338], relab: 'keeper (back)', dy: 30 },
          { f: 'point', to: [295, 328], relab: '2nd slip', dy: 24 },
          { f: 'cover', to: [271, 320], relab: '3rd slip' },
          { f: 'shortleg', to: [248, 311], relab: 'gully', dy: 24 },
        ],
        shot: { to: [295, 328], air: true, peak: 24 }, outcome: 'caught', catcher: 'point', nearOk: ['slip1'],
        olab: 'EDGED — 2nd slip pouches it', olabAt: [200, 368],
        reveal: [],
        t: 'New ball + tail = slips, and slips eat',
        b: 'You take the new ball, the quick takes the ball, and the cordon reassembles around the bat — keeper back, three slips, gully, jogging in as the field rebuilds. Two balls later the No. 10 pushes at a full swinger and the edge goes exactly where the field now lives. Tails exist to be blown away by pace and a hard ball.',
      },
      keep: {
        k: 'bad', newBowler: null, morphs: [],
        shot: { to: [650, 252], air: true, peak: 80 }, outcome: 'four',
        olab: 'hoicked over the leg side — FOUR',
        reveal: [{ type: 'ring', p: [295, 328], lab: 'the cordon never formed — new ball unused' }],
        t: 'The wrong tool for a tail',
        b: 'Old soft ball, gentle spin — a tailender’s favorite diet. He plants a leg and hoicks your spinner over square leg for four, cackling. Meanwhile the hard new ball — the single best tail-remover in cricket — sat in the umpire’s pocket because you didn’t ask for it.',
      },
      spin: {
        k: 'ok', newBowler: 'leftarm',
        morphs: [],
        shot: { to: [346, 302], air: false }, outcome: 'dot',
        olab: 'blocked — chance postponed',
        reveal: [{ type: 'ring', p: [295, 328], lab: 'pace + slips was the finishing kit' }],
        t: 'A change that changes nothing',
        b: 'Fresh spinner, same soft ball, same polite examination the tailender can survive by lunging forward. He blocks it comfortably. Nothing lost except the thing that matters most at a tail: time. The new ball and the cordon were the express route, and you took the scenic one.',
      },
    },
    why: {
      rookie: 'After 80 overs the fielding team can ask for a brand-new ball — harder, shinier, much faster off the pitch. The No. 10 is the other team’s second-worst batter. New ball + fast bowler = the quickest way to end the innings.',
      beginner: 'Watch what the change brings WITH it: keeper walks back, slips multiply from one to three, gully arrives — the whole field morphs because a pace bowler’s edges carry. That cordon is why pace attacks tails: a nervous poke at swing becomes a chest-high catch.',
      intermediate: 'Tail management is a recognized skill with real variance between sides: the levers are pace (tailenders’ reflexes lag), the hard new ball (extra bounce finds the splice), and short-ball ribs mixed with full swingers. Spin lets a tailender play with soft hands and one bat-width of defense; pace asks questions his technique can’t file.',
      expert: 'The second new ball is a scheduled weapon — good captains PLAN overs 78–80 around who should hold it, often bowling spellbreakers early so the strike quick is fresh at 81. Leaving it unclaimed with a tail exposed wastes the fixture’s best expected-wickets window; the data on new-ball bursts (wickets cluster in the 5 overs after it’s taken) is as robust as anything in Test analytics.',
    },
  },

  {
    tab: 'Short-boundary trap',
    hud: [{ c: 'T20 · OVER 18' }, { c: 'LEFT ROPE 82m' }, { c: 'RIGHT ROPE 55m', warn: true }, { c: 'SPINNER BOWLING WIDE LINES' }],
    moveDur: 850,
    ropes: [{ scale: 0.78, th0: -55, th1: 55, m: '55m', lab: 'rope in — 55m' }],
    dists: [{ to: [30, 260], m: '82m — the LONG side', warn: false }, { to: [587, 261], m: '55m', warn: true }],
    batter: { n: 'batter (RH)', p: [350, 288] },
    bowlerN: 'SPINNER (on)',
    wide: { from: [346, 160], to: [324, 286], lab: 'his line — a foot OUTSIDE off, toward the long side' },
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 330] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'bkpoint', n: 'backward point', p: [250, 312] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'deepcov', n: 'deep cover', p: [62, 200] },
      { id: 'longoff', n: 'long-off', p: [300, 42] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
      { id: 'leftarm', n: 'mid-on · left-arm spin', p: [408, 122] },
      { id: 'midwkt', n: 'midwicket', p: [452, 240] },
      { id: 'quick', n: 'fine leg · quick', p: [430, 404] },
    ],
    prompt: 'Look at this ground: <b>82 meters to your left, 55 to your right</b> — the right-hand rope is pulled in absurdly short. Your spinner keeps bowling a foot OUTSIDE off stump, toward the long side — he’s missing the stumps <b>on purpose</b>. The dugout wants a change. Do you see what he’s doing?',
    answer: 'keep',
    opts: {
      keep: {
        k: 'good', newBowler: null, morphs: [],
        shot: { to: [62, 200], air: true, peak: 120 }, outcome: 'caught', catcher: 'deepcov',
        olab: 'CAUGHT — deep cover, 20m inside the 82m rope',
        reveal: [
          { type: 'arc', to: [600, 266], lab: 'the SAME swing at the 55m side = six' },
          { type: 'lbl', p: [150, 88], lab: 'he was bowling to his FIELD all along' },
        ],
        t: 'He’s missing the stumps on purpose',
        b: 'The wide line isn’t wayward — it’s a wall. By feeding everything toward the 82-meter side, your spinner makes the short rope unreachable: the batter can only drag across the line, and the mishit spirals to deep cover with twenty meters of the long boundary to spare. The reveal shows the same swing mirrored right: over 55 meters it’s six. Line choice IS boundary choice.',
      },
      quick: {
        k: 'bad', newBowler: 'quick',
        morphs: [
          { f: 'keeper', to: [340, 338], relab: 'keeper (back)' },
          { f: 'bkpoint', to: [295, 328], relab: 'slip', dy: 24 },
        ],
        shot: { to: [600, 266], air: true, peak: 100 }, outcome: 'six',
        olab: 'SIX — 55m is a chip shot', olabAt: [540, 308],
        reveal: [
          { type: 'wide', lab: 'the wide-line trap you dismantled' },
          { type: 'ring', p: [62, 200], lab: 'deep cover was WAITING out here' },
        ],
        t: 'You attacked the stumps and armed the batter',
        b: "The quick does the honest thing — hard length at the stumps — and honest is exactly wrong here: a straight ball can be swung freely into the 55-meter side, and it was, one bounce into the sponsors' signs and then over them next ball. Your spinner's 'bad' line was the only thing keeping the short rope out of the game.",
      },
      spin: {
        k: 'ok', newBowler: 'leftarm',
        morphs: [],
        shot: { to: [588, 262], air: true, peak: 60 }, outcome: 'four',
        olab: 'FOUR — drifted to the pads, flicked short-side', olabAt: [540, 308],
        reveal: [
          { type: 'wide', lab: 'Your spinner’s channel — the plan needed HIS accuracy' },
          { type: 'ring', p: [62, 200], lab: 'the trap’s catcher, unemployed' },
        ],
        t: 'Right plan, borrowed hands',
        b: 'The left-armer understands the assignment — wide of off, long side — but executing a deliberate miss takes rehearsed accuracy, and his second ball drifts onto the pads: the one line that opens the 55-meter rope for free. Flicked, one bounce, four. A trap this asymmetric belongs to the bowler who’s been drilling it all evening.',
      },
    },
    why: {
      rookie: 'One boundary is close (55m), one far (82m). Your bowler keeps aiming AWAY from the stumps, toward the far side — on purpose! If the batter wants to hit toward the short easy fence, he has to reach across and drag it, which usually goes wrong. Keep him on.',
      beginner: "'Bowling to your field' means line and field placement working as one machine: wide outside off + fielders deep on the long side = every shot the batter can safely play travels the 82 meters, not the 55. The reveal arrows show the same swing both ways — six one side, caught the other. That difference is the whole plan.",
      intermediate: 'Dragging a wide ball across your body to the short leg side is one of the highest-risk shots in cricket — head falls over, contact point is a stretch, mishits balloon. So the trap prices the short rope out: reach it only via a 12%-wicket-class shot, or score at the risk-free rope that needs 82m of carry. Either way the bowler wins the exchange.',
      expert: 'Asymmetric-ground strategy is a solved sub-problem in T20 analytics: plans that force play into the long half are worth on the order of ~5 percentage points of defend-probability per over (IPL ball-by-ball optimization), which is enormous for one decision. The subtlety is that the plan LOOKS like bad bowling — wides of off stump, no LBW threat — which is why dugouts panic and captains who understand line-as-geometry don’t.',
    },
  },
];
