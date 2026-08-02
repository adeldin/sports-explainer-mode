// Pace the Chase — scenario data (VERBATIM from cricketcorner/pace-the-chase.html). Batting second,
// two resources on the LED board: BALLS LEFT and WICKETS LEFT. Every delivery you choose which one
// to spend, and the board re-does the arithmetic in front of you (a dot is never neutral: same runs,
// one fewer ball, required rate up). The tabs deliberately FLIP the answer — 6 wickets says swing,
// 3 wickets says rotate — and the last tab flips the FORMAT: on day five of a Test, runs are worth
// nothing and the only scoreboard is the SURVIVE counter. Verdicts, board arithmetic, stats and the
// 4-depth COACH'S READ are the owner-reviewed surface; copied exactly, never re-derived.
// Coordinates share the cricket oval viewBox (680×460, OVAL in fields/CricketOval); the module draws
// it under a 74px LED-board strip. Pure data — zero RN imports.

export type P = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';
export type PTCOption = 'attack' | 'single' | 'defend';
export type PTCOutcome = 'four' | 'six' | 'single' | 'dot' | 'caught' | 'out_edge' | 'single_meaning' | 'block_survive';

// The striker's crease — every shot leaves from here.
export const BAT: P = [350, 288];

export interface BoardCell { cap: string; val: string; warn: boolean }
export interface Fielder { id: string; n: string; p: P; dy?: number }
export interface Wedge { a: P; b: P; end: P; lab: string; kind: 'open' | 'single' }

export interface PTCResult {
  k: Grade;
  shot: { to: P; air: boolean; peak?: number };
  outcome: PTCOutcome;
  bmsg: string;                    // LED board flip headline
  bsub: string;                    // …and the re-done arithmetic under it
  olab: string;                    // on-field outcome label
  olabAt?: P;
  t: string;                       // verdict title
  b: string;                       // verdict body
}

export interface PTCScenario {
  tab: string;
  board: BoardCell[];
  fielders: Fielder[];
  wedge: Wedge;
  single: { end: P; lab: string };
  survive?: number;                // Test day five: balls that must be survived for the draw
  prompt: string;
  answer: PTCOption;
  opts: Record<PTCOption, PTCResult>;
  why: Record<Depth, string>;
}

export const gradeColor = (k: Grade): string => (k === 'good' ? '#14B8A6' : k === 'ok' ? '#F5A623' : '#e24b4a');
export const gradeTag = (k: Grade): string => (k === 'good' ? 'Right call' : k === 'ok' ? 'Defensible' : 'Wrong call');

// The three calls (button copy, verbatim).
export const OPTIONS: { key: PTCOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'attack', title: 'ATTACK THE BOUNDARY', sub: 'hunt 4 or 6 — accept the risk' },
  { key: 'single', title: 'TAKE THE SINGLE', sub: 'rotate strike, bank the ball' },
  { key: 'defend', title: 'DEFEND THIS BALL', sub: 'block it dead', alt: true },
];

// Narration by outcome (the prompt the board flip lands under) — verbatim.
export const OUTCOME_PROMPT: Partial<Record<PTCOutcome, string>> = {
  four: 'The rope does the rest — <b>watch the rate fall.</b>',
  six: 'The rope does the rest — <b>watch the rate fall.</b>',
  single: 'Rotated — <b>both gauges stay alive.</b>',
  dot: 'Nothing off it — <b>and the board quietly got worse.</b>',
  caught: 'Straight down the rider’s throat — <b>the collapse is live.</b>',
  out_edge: 'The bait worked. <b>Five days, lost in one swing.</b>',
};
export const PROMPT_RUNUP = 'The bowler runs in…';
export const HINT_IDLE = 'Balls and wickets — which one is scarce right now?';
export const HINT_DONE = 'Reset, or face another ball.';
export const SUB = 'You’re batting second, chasing a target. Two resources on the board: <b>balls left</b> and <b>wickets left</b>. Every delivery you choose which one to spend. Read the board, read the field, then play the ball.';
export const FOOT = 'Coach’s Corner cricket spike · required rate = runs still needed ÷ overs left (an over = 6 balls) · in T20/ODI the clock always runs out — in a Test, surviving the balls is a draw and runs can be worthless · boundary riders are the deep fielders on the rope.';
export const DRAW_LABEL = 'SURVIVED — IT’S A DRAW';
export const DRAW_PROMPT = 'Eleven dead bats. Five days, no winner — and your side <b>escapes with the draw.</b>';

export const SCENARIOS: PTCScenario[] = [
  {
    tab: '48 off 30',
    board: [
      { cap: 'THE CHASE', val: 'NEED 48 OFF 30', warn: false },
      { cap: 'WICKETS', val: '6 IN HAND', warn: false },
      { cap: 'REQ. RATE', val: '9.6 / OVER', warn: false },
      { cap: 'BOWLING', val: 'SPINNER ON', warn: false },
    ],
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326] },
      { id: 'bowler', n: 'bowler (spin)', p: [346, 150] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'deepcov', n: 'deep cover', p: [90, 190] },
      { id: 'longoff', n: 'long-off', p: [300, 32] },
      { id: 'longon', n: 'long-on', p: [390, 34] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'sfine', n: 'short fine leg', p: [408, 348] },
    ],
    wedge: { a: [520, 330], b: [430, 404], end: [596, 352], lab: 'OPEN — nobody behind square', kind: 'open' },
    single: { end: [162, 250], lab: 'easy single' },
    prompt: 'Rate’s 9.6 and climbing, six wickets in hand — that’s a full tank. And look behind square on the leg side: <b>the spinner’s field has left the whole sector open.</b> He drops short… your ball. What is it?',
    answer: 'attack',
    opts: {
      attack: {
        k: 'good', shot: { to: [596, 352], air: false }, outcome: 'four',
        bmsg: 'FOUR!', bsub: 'NEED 44 OFF 29 · RATE 9.1',
        olab: 'FOUR — through the open sector',
        t: 'Six wickets is permission to swing',
        b: 'The sweep goes exactly where nobody stands and the rope does the rest. With six wickets in hand at under ten an over, boundary risk is what your wickets are FOR — and an open sector is the lowest-risk boundary cricket ever offers. The rate just dropped half a run.',
      },
      single: {
        k: 'ok', shot: { to: [162, 250], air: false }, outcome: 'single',
        bmsg: 'ONE RUN', bsub: 'NEED 47 OFF 29 · RATE 9.7',
        olab: 'single — rate creeps up',
        t: 'Safe — and slowly losing',
        b: 'Nothing bad happened, and that’s the trap: 47 off 29 is HARDER than 48 off 30. With a fat wicket buffer and a free sector on offer, a single spends your scarcest resource — balls — to protect your most plentiful one. Do this every ball and you’ll finish 20 short, unbeaten.',
      },
      defend: {
        k: 'bad', shot: { to: [348, 300], air: false }, outcome: 'dot',
        bmsg: 'DOT BALL', bsub: 'NEED 48 OFF 29 · RATE 9.9',
        olab: 'blocked — rate burns 9.6 → 9.9',
        t: 'A quiet ball is a loud loss',
        b: 'The block looks harmless, but the board disagrees: same 48, one fewer ball, rate up to 9.9. In a chase, a dot is not neutral — it transfers pressure directly onto the next ball. Six wickets in hand and a gift sector open is exactly when defending costs the most.',
      },
    },
    why: {
      rookie: 'They need 48 runs and only 30 balls remain — balls run out fast. With 6 wickets left they can afford risks, and there are NO fielders in the sector he just bowled toward. Swing.',
      beginner: 'Read both fuel gauges: 30 balls (scarce) and 6 wickets (plentiful). Spend the plentiful one. A boundary attempt carries maybe a 12% dismissal risk — but with 6 wickets, you can pay that price several times over. What you can’t buy back is balls.',
      intermediate: 'Field-reading turns risk into value: an attacking shot into an OPEN sector cuts the usual boundary risk sharply — the danger in a slog is the catcher, and there isn’t one there. Boundary attempts land about 37% of the time; into a vacant sector it’s better than that, for the same swing.',
      expert: 'Chase-pressure models (built from 3,000+ T20s) say wickets-in-hand is the strongest predictor of successful chases at this rate band — sides needing ~9.6 with 6+ wickets win far more often than the scoreboard panic suggests, PROVIDED they keep attacking. The classic failure mode isn’t the slog; it’s the polite singles graveyard between overs 14 and 18.',
    },
  },

  {
    tab: '96 off 60 — FLIP',
    board: [
      { cap: 'THE CHASE', val: 'NEED 96 OFF 60', warn: false },
      { cap: 'WICKETS', val: '8 IN HAND', warn: false },
      { cap: 'REQ. RATE', val: '9.6 / OVER', warn: false },
      { cap: 'FEELS', val: "FAR — ISN'T", warn: true },
    ],
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326] },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
      { id: 'midoff', n: 'mid-off (up)', p: [272, 122] },
      { id: 'midon', n: 'mid-on', p: [408, 122] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'midwkt', n: 'midwicket', p: [474, 222] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'deepsq', n: 'deep square leg', p: [560, 352] },
      { id: 'finelg', n: 'fine leg', p: [452, 398] },
    ],
    wedge: { a: [290, 90], b: [220, 140], end: [250, 18], lab: 'mid-off is UP — nothing behind him', kind: 'open' },
    single: { end: [160, 258], lab: 'easy single' },
    prompt: 'Ninety-six sounds a mountain — but you have <b>eight wickets</b> and the rate compounds every quiet over. Mid-off is up inside the ring, long-off doesn’t exist. The full ball is there… now or later?',
    answer: 'attack',
    opts: {
      attack: {
        k: 'good', shot: { to: [250, 18], air: true, peak: 110 }, outcome: 'six',
        bmsg: 'SIX!', bsub: 'NEED 90 OFF 59 — IT MOVES',
        olab: 'SIX — over the man who was up',
        t: 'Attack NOW, while it’s cheap',
        b: 'Mid-off up with no long-off is a printed invitation: the lofted drive clears him by thirty meters and lands beyond a rope nobody was guarding. 96 off 60 with 8 wickets isn’t a rescue mission — it’s a normal T20 rate with an abnormal safety net. Chases that wait die politely.',
      },
      single: {
        k: 'ok', shot: { to: [160, 258], air: false }, outcome: 'single',
        bmsg: 'ONE RUN', bsub: 'NEED 95 OFF 59 · RATE 9.7',
        olab: 'single — the mountain grows',
        t: 'You can’t single your way up this hill',
        b: 'A run a ball from here leaves you 36 short. Singles are the connective tissue of a chase, not its engine — with eight wickets spare and an open straight boundary, this ball was engine fuel. The longer the big shots wait, the fewer balls they have to work with.',
      },
      defend: {
        k: 'bad', shot: { to: [348, 300], air: false }, outcome: 'dot',
        bmsg: 'DOT BALL', bsub: 'NEED 96 OFF 59 · RATE 9.8',
        olab: 'blocked — why?',
        t: 'Another quiet over is how chases die',
        b: 'Blocking with eight wickets in hand answers a question nobody asked. Every dot raises the rate the NEXT batter must strike at, and the pressure you feel at 9.6 becomes panic at 11. The time to attack a big target is while it’s still merely big.',
      },
    },
    why: {
      rookie: '96 runs in 60 balls sounds huge, but they still have 8 of their 10 wickets — almost their whole team. Teams in that shape are allowed to swing hard NOW. Waiting only makes the mountain steeper.',
      beginner: 'The rate compounds: score 6 an over for two overs and 9.6 becomes 10.8. Eight wickets means you can absorb three or four failed swings and still be fine — the buffer exists precisely so you can attack early, before ‘needed’ becomes ‘impossible’.',
      intermediate: 'Sides needing 80–100 off the last 10 overs with 7+ wickets in hand win around 60% of the time — the position FEELS desperate and statistically isn’t. The losing pattern is inverted pacing: caution early, carnage late, when the same shots must beat set fields and better bowlers.',
      expert: 'Expected-run math: an attacking ball at ~1.6 runs/ball with 12% dismissal risk beats a rotating ball at ~0.9 with 3% risk whenever the wicket buffer covers the variance — and 8 wickets over 60 balls is enormous cover. Elite chasing sides front-load risk against the 4th/5th bowlers now rather than face the death specialists needing 12 an over.',
    },
  },

  {
    tab: '36 off 24, 3 left — FLIP',
    board: [
      { cap: 'THE CHASE', val: 'NEED 36 OFF 24', warn: false },
      { cap: 'WICKETS', val: 'ONLY 3 LEFT', warn: true },
      { cap: 'REQ. RATE', val: '9.0 / OVER', warn: false },
      { cap: 'RIDERS', val: '4 ON THE ROPE', warn: false },
    ],
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326] },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
      { id: 'point', n: 'point', p: [216, 282] },
      { id: 'cover', n: 'cover', p: [204, 222] },
      { id: 'midwkt', n: 'midwicket', p: [452, 240] },
      { id: 'sqleg', n: 'square leg', p: [464, 282] },
      { id: 'longoff', n: 'long-off', p: [300, 32] },
      { id: 'longon', n: 'long-on', p: [390, 34] },
      { id: 'deepcov', n: 'deep cover', p: [90, 190] },
      { id: 'deepmid', n: 'deep midwicket', p: [618, 282] },
    ],
    wedge: { a: [240, 250], b: [190, 290], end: [150, 254], lab: 'the gap they’re PAYING you to take', kind: 'single' },
    single: { end: [150, 254], lab: 'easy single' },
    prompt: 'Nine an over needed — but look at the other gauge: <b>three wickets left.</b> One mistake and the tail is exposed; two and it’s over. Deep midwicket waits on the rope for the slog. The green wedge is free. Which resource do you spend?',
    answer: 'single',
    opts: {
      single: {
        k: 'good', shot: { to: [150, 254], air: false }, outcome: 'single',
        bmsg: 'ONE — BANKED', bsub: 'NEED 35 OFF 23 · WICKETS SAFE',
        olab: 'single — wickets banked',
        t: 'Wickets are the scarce resource now',
        b: 'The push into the wedge is worth exactly one run and exactly zero risk. Nine an over sounds like slog territory, but singles plus the odd two keep you ON rate while keeping your last three wickets alive — and it’s wickets, not balls, that end this chase early. Survive, rotate, and make THEM crack first.',
      },
      attack: {
        k: 'bad', shot: { to: [618, 282], air: true, peak: 100 }, outcome: 'caught',
        bmsg: 'WICKET', bsub: '3 BECOMES 2 — COLLAPSE LIVE',
        olab: 'CAUGHT — the rider barely moved', olabAt: [540, 246],
        t: 'You fed the man they posted for you',
        b: 'Deep midwicket has stood on that rope all innings for exactly this swing. Three wickets means one mis-hit starts a collapse: now the number 10 faces nine an over instead of you. The boundary you chased was worth 4; the wicket you gave away was worth the match.',
      },
      defend: {
        k: 'ok', shot: { to: [348, 300], air: false }, outcome: 'dot',
        bmsg: 'DOT', bsub: 'NEED 36 OFF 23 · RATE 9.4',
        olab: 'blocked — can’t block 24 though',
        t: 'Safe for one ball, not for 24',
        b: 'Defending protects the wickets but spends a pure ball — and you don’t have 24 to spare at nine an over. The middle path is the answer: the single keeps both gauges alive. Block only the genuinely unplayable ones from here.',
      },
    },
    why: {
      rookie: 'They need 9 runs an over, which is a lot — but they only have 3 wickets left. Lose them and the game just ends. A safe single keeps the score moving WITHOUT risking a wicket. See the green wedge? That run is free.',
      beginner: 'Flip of the last tab: now wickets are the scarce fuel. 9 an over is very gettable — a single every ball is 6, plus one boundary an over is 10. The only thing that makes 36 off 24 hard is losing a wicket, so the plan is the one that can’t lose one.',
      intermediate: 'Risk pricing changed with the wicket count: the same 12% dismissal chance you’d happily pay with 6 wickets is ruinous with 3, because each wicket now exposes a far weaker batter to the SAME required rate. Rotation at ~3% risk keeps the win probability curve flat instead of cliff-shaped.',
      expert: 'Wickets-in-hand modeling values the 8th wicket at several times the 5th in T20 endgames — the marginal wicket is worth most exactly when few remain (ODI and T20 curves differ, but both spike at the tail). At 9.0 required, EV(rotate) ≈ EV(attack) on runs alone, so the wicket term dominates the equation entirely: take the single every time the wedge is open.',
    },
  },

  {
    tab: 'Test, day 5 — SURVIVE',
    board: [
      { cap: 'FORMAT', val: 'TEST · DAY 5', warn: false },
      { cap: 'WICKETS', val: '9 DOWN — LAST PAIR', warn: true },
      { cap: 'TO SAVE IT', val: 'SURVIVE 11 BALLS', warn: true },
      { cap: 'RUNS', val: 'IRRELEVANT', warn: false },
    ],
    fielders: [
      { id: 'keeper', n: 'keeper', p: [340, 326], dy: 24 },
      { id: 'bowler', n: 'bowler', p: [346, 150] },
      { id: 'slip1', n: '1st slip', p: [318, 334] },
      { id: 'slip2', n: '2nd slip', p: [299, 331], dy: 24 },
      { id: 'slip3', n: '3rd slip', p: [282, 322] },
      { id: 'gully', n: 'gully', p: [266, 316], dy: 24 },
      { id: 'sillyp', n: 'silly point', p: [306, 276] },
      { id: 'shortleg', n: 'short leg', p: [384, 300] },
      { id: 'legslip', n: 'leg slip', p: [372, 332] },
      { id: 'midoff', n: 'mid-off', p: [272, 122] },
    ],
    wedge: { a: [560, 320], b: [480, 400], end: [596, 352], lab: 'rope wide open — that’s the BAIT', kind: 'open' },
    single: { end: [222, 304], lab: 'a run… worth nothing' },
    survive: 11,
    prompt: '<b>Format flip.</b> This is a TEST: survive 11 more balls and the game is a DRAW — runs change nothing. You’re the last pair. Nine men crouch around your bat; the entire boundary is open, because <b>they don’t care about runs either.</b> The ball’s full…',
    answer: 'defend',
    opts: {
      defend: {
        k: 'good', shot: { to: [346, 300], air: false }, outcome: 'block_survive',
        bmsg: 'MATCH SAVED', bsub: 'DRAW — 11 BALLS SURVIVED',
        olab: 'dead bat — nothing off it', olabAt: [486, 338],
        t: 'Runs are worthless; balls are everything',
        b: 'Soft hands, dead bat, ball dropping at your feet while nine catchers groan. Then again. And again. The survival counter is the only scoreboard that matters now — eleven balls of nothing, and a five-day Test ends level. In this format, refusing to play a shot IS the winning shot.',
      },
      attack: {
        k: 'bad', shot: { to: [299, 331], air: true, peak: 26 }, outcome: 'out_edge',
        bmsg: 'OUT — TEST LOST', bsub: 'THE BAIT WORKED',
        olab: 'edged — 2nd slip. Gone.',
        t: 'The open rope was the trap',
        b: 'The boundary was open because boundaries can’t hurt them — only your edge can. The drive you chased turned a certain draw into a loss in one swing: nine catchers exist for exactly that ball. When runs are worth nothing, every attacking shot is pure risk with zero reward.',
      },
      single: {
        k: 'ok', shot: { to: [222, 304], air: false }, outcome: 'single_meaning',
        bmsg: 'ONE RUN — WHY?', bsub: 'STILL 10 BALLS TO SURVIVE',
        olab: 'survived the run — for nothing',
        t: 'Risk without reward',
        b: 'You scampered it safely — and gained nothing, because runs don’t count toward a draw. Worse, a run-out mid-pitch would have ended the match on the spot, and now your No. 11 might be the one facing. In survival cricket a single is all downside: it risks the game to move a number nobody is reading.',
      },
    },
    why: {
      rookie: 'Special cricket rule: a Test match can end in a DRAW. If the last two batters survive 11 more balls — score zero, doesn’t matter — nobody wins. So don’t try to score! Just block every ball.',
      beginner: 'That’s why the field looks insane: nine fielders inches from the bat, zero on the boundary. They’d happily give you four every ball — runs can’t change a draw. The only battle left is ball-vs-bat eleven times. Both sides know it; only the batter can lose it.',
      intermediate: 'Day-five survival is its own craft: dead hands so edges die before the close catchers, leaving everything outside off, pad as second line. The classic error is instinct — ‘a bad ball must be hit’ — but with the draw banked per ball survived, expected value says a half-volley blocked is worth MORE than a half-volley for four.',
      expert: 'This tab is the deepest format lesson in cricket: identical delivery, opposite correct answer, purely because the payoff matrix changed. T20 chases price balls; Test rescues price only wickets — the required ‘rate’ is literally zero. Great players are format-bilingual: the same cover drive is +EV on Saturday in a T20 and match-losing on Monday at the same ground.',
    },
  },
];
