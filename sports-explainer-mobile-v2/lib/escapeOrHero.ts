// Escape or Hero? — scenario data (VERBATIM from golfcorner/escape-or-hero.html). You're in the
// trees. The whole module is TWO BRACKETS drawn side by side — the GAP's width in yards against
// YOUR SHOT'S width in yards — and the 9-of-10 rule that falls out of comparing them. Verdicts,
// expected-stroke numbers, the per-scenario mantra (including the match-play flip, where the same
// 11-yard gap becomes the only ticket) and the 4-depth COACH'S READ are the owner-reviewed surface;
// copied exactly, never re-derived. GOLF HAS NO SHARED RENDERER, so coordinates live in this
// module's OWN 680×420 hole viewBox at 2.38 px per yard — every distance in the copy is
// round(px / 2.38) from these coordinates. Pure data — zero RN imports.

export type P = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';
export type EHOption = 'punch' | 'thread' | 'advance' | 'backward';

// The module's own viewBox + scale (this module paints its own hole).
export const VB = { w: 680, h: 420 };
export const PXY = 2.38;                                       // pixels per yard
export const yds = (a: P, b: P): number => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) / PXY);

export interface Bracket { x: number; y1: number; y2: number; lab: string }
export interface HudChip { cap: string; val: string; warn?: boolean }
export interface GhostRoute { to: P; lab: string }

export interface EHResult {
  type: 'run' | 'fly' | 'ric';    // run = low/flat, fly = full shot with height, ric = tree ricochet
  via?: P;                        // ric: the CONTACT POINT on a trunk · run: an intermediate bounce
  land: P;
  k: Grade;
  lab: string;                    // on-map result label
  labAt?: P;
  clackAt?: P;                    // where the CLACK caption sits on a ricochet
  clearCone?: boolean;            // the backward escape draws its payoff: an unobstructed lane
  ghost?: GhostRoute;             // the smarter route, revealed after the outcome
  t: string;                      // verdict title
  b: string;                      // verdict body
}

export interface EHScenario {
  tab: string;
  ball: P;
  green: { c: P; r: number };
  opp?: P;                        // match play: his ball, already on
  trees: [number, number, number][];
  gapB: Bracket;                  // the GAP's width
  sprB: Bracket;                  // YOUR SHOT'S width
  gate2?: Bracket;                // a second gate the long club must ALSO fit
  blockLab?: [number, number, string];
  hud: HudChip[];
  mantra?: string;                // the post-call line (the match-play tab flips it)
  prompt: string;
  opts: Record<EHOption, EHResult>;
  why: Record<Depth, string>;
}

export const gradeColor = (k: Grade): string => (k === 'good' ? '#14B8A6' : k === 'ok' ? '#F5A623' : '#e24b4a');
export const gradeTag = (k: Grade): string => (k === 'good' ? 'Right call' : k === 'ok' ? 'Defensible' : 'Wrong call');

// The four calls (button copy, verbatim).
export const OPTIONS: { key: EHOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'punch', title: 'PUNCH TO FAIRWAY', sub: 'sideways, low, done' },
  { key: 'thread', title: 'THREAD THE GAP', sub: 'long club — all the way to the green' },
  { key: 'advance', title: 'ADVANCE SAFE', sub: 'mid-iron through — stop before the next trouble' },
  { key: 'backward', title: 'PLAY BACKWARD', sub: 'give up yards on purpose', alt: true },
];

// In-flight narration per option (prompt swaps to this on choose).
export const NARRATION: Record<EHOption, string> = {
  punch: 'Wedge out sideways…',
  thread: 'The LONG club — same line, but it must fit every gate between here and the green…',
  advance: 'Mid-iron — same line, but it lands short of the next trouble <b>on purpose</b>…',
  backward: 'Turn around. Pay the yards, buy the exit…',
};

export const DEFAULT_MANTRA = 'Judge every shot by what it does <b>nine times out of ten</b> — not by the one perfect strike.';
export const HINT_IDLE = 'Gap width vs shot width — the two brackets are the whole decision.';
export const HINT_DONE = 'Reset, or find another jail.';
export const SUB = 'You’re in the trees. “I can make this gap if I hit it perfect” — but golf is what you do <b>9 times out of 10</b>. Compare the gap’s width to your shot’s width. They’re both drawn.';
export const FOOT = 'Coach’s Corner golf spike · expected strokes: hero-from-trees ≈4.2 vs punch-then-fairway ≈3.8 · 150 from fairway 2.98 vs 150 from rough 3.22 · the 9-of-10 rule: play the shot you pull off nine times out of ten.';

export const SCENARIOS: EHScenario[] = [
  {
    tab: 'The 11-yard gap',
    ball: [200, 232], green: { c: [600, 210], r: 26 },
    trees: [[300, 194, 24], [300, 270, 26], [150, 180, 18], [130, 260, 16], [172, 300, 20], [252, 180, 22]],
    gapB: { x: 316, y1: 218, y2: 244, lab: 'the gap: 11 yds' },
    sprB: { x: 284, y1: 205, y2: 257, lab: 'your spread: 22 yds' },
    hud: [
      { cap: 'YOUR 2ND SHOT', val: 'PAR 4' },
      { cap: 'TO THE GREEN', val: '168' },
      { cap: 'THE GAP', val: '11 YDS WIDE', warn: true },
      { cap: "YOUR SHOT'S SPREAD", val: '22 YDS', warn: true },
    ],
    prompt: '168 to the green through an 11-yard gap — and your ball flies inside a 22-yard-wide pattern. <b>Read the two brackets.</b>',
    opts: {
      punch: {
        type: 'run', land: [268, 340], k: 'good', lab: 'out — 150 in, from the FAIRWAY',
        t: 'The 9-out-of-10 shot',
        b: "Sideways to short grass: boring, repeatable, done. You're 150 out from the fairway — expected strokes about 2.98 from there, roughly 3.8 for the hole. The hero line averages about 4.2 because most of its outcomes are still in the trees. The punch isn't giving up; it's taking the better number.",
      },
      thread: {
        type: 'ric', via: [288, 247], land: [162, 238], k: 'bad', lab: 'off the trunk — 184 out, still jailed',
        ghost: { to: [268, 340], lab: 'the punch — 150 out, zero trees involved' },
        t: 'An 11-yard door for a 22-yard shot',
        b: 'The gap is 11 yards; your pattern is 22. That’s not a gap, it’s a lottery ticket — and this ticket hit the trunk and kicked you DEEPER: 184 out now, still behind trees, hitting four. The tree doesn’t care how pure the strike was.',
      },
      advance: {
        type: 'run', land: [330, 240], k: 'ok', lab: 'squirted through — 114 in, rough',
        t: "You won the coin flip — don't bank the method",
        b: 'The shorter club fits the gap a little better, and today the low one slipped through: 114 in from thin rough. But you still bet a 16-yard pattern on an 11-yard hole. Getting away with it and being right are different things — grade the decision, not the outcome.',
      },
      backward: {
        type: 'run', land: [116, 310], k: 'ok', lab: 'back in play — 208 out',
        t: 'Real medicine — a bigger dose than needed',
        b: 'Backward always works, and 208 from the fairway is a genuine hole again. But the sideways punch was open and leaves 150 — you paid about 58 extra yards for safety the punch already guaranteed. Save the full retreat for when sideways is shut.',
      },
    },
    why: {
      rookie: 'Look at the two brackets: the hole in the trees is 11 yards wide, but your shots spread across 22 yards. The ball won’t fit where you’re aiming most of the time — so chip out sideways to the fairway instead.',
      beginner: 'The 9-of-10 rule: only play a shot you’d pull off nine times in ten. A 22-yard pattern through an 11-yard window works maybe 3 or 4 times in ten — the other 6 hit wood and often end up worse, like this one, kicked from 168 out to 184 out. The punch works ten times in ten.',
      intermediate: 'Count strokes, not glory: punch = 1 + play from 150 fairway (2.98) ≈ 3.98 ≈ the ~3.8 hero-vs-punch table figure. Thread = 1 + [~30% from the green area, ~70% still trees or worse] ≈ 4.2+. The quarter-stroke gap UNDERSTATES it, because tree ricochets have a fat tail — doubles and triples live there.',
      expert: 'The pros’ actual heuristic: measure the gap in yards, compare to your known dispersion at that distance, and require the gap to be roughly double your spread before taking it — 11 vs 22 is the exact inverse of that. Note also the asymmetric loss function: a made thread saves ~1 stroke; a ricochet costs 1–2 and re-runs the same decision from worse. When the downside repeats the gamble, variance itself is a cost.',
    },
  },

  {
    tab: 'A real door (34 yds)',
    ball: [160, 248], green: { c: [652, 200], r: 24 },
    trees: [[300, 168, 24], [300, 299, 26], [470, 160, 22], [470, 262, 24], [150, 172, 18], [118, 258, 16]],
    gapB: { x: 316, y1: 192, y2: 273, lab: 'the gap: 34 yds' },
    sprB: { x: 284, y1: 206, y2: 258, lab: 'your spread: 22 yds' },
    gate2: { x: 470, y1: 182, y2: 238, lab: 'second gate: 24 yds' },
    hud: [
      { cap: 'YOUR 2ND SHOT', val: 'PAR 5' },
      { cap: 'TO THE GREEN', val: '208' },
      { cap: 'THE GAP', val: '34 YDS — WIDER THAN YOUR SPREAD' },
      { cap: 'BEYOND IT', val: 'OPEN FAIRWAY' },
    ],
    prompt: '208 left, but THIS gap is 34 yards wide — wider than your 22-yard spread — with fairway beyond. <b>Sideways isn’t the only medicine.</b>',
    opts: {
      punch: {
        type: 'run', land: [240, 350], k: 'ok', lab: 'out — but 184 left',
        ghost: { to: [430, 225], lab: 'the mid-iron through the door — 94 out' },
        t: 'Automatic sideways — you didn’t read the door',
        b: "The punch is never terrible. But punching on autopilot ignored a 34-yard corridor that your 22-yard pattern fits through with room to spare — the safe advance leaves 94; your sideways leaves 184. 'Trees equals chip out' is a rule of thumb; the brackets are the rule.",
      },
      thread: {
        type: 'ric', via: [447.1, 255.2], land: [428, 289], k: 'bad', lab: 'the SECOND gate — 101 out, stymied',
        ghost: { to: [430, 225], lab: 'the mid-iron — through gate one, short of gate two' },
        t: 'Right idea, one gate too greedy',
        b: 'The first gap is wide — but the hero club at the GREEN has to survive the second copse too, where the corridor narrows to 24 yards for a long club spreading 28. You cleared door one and clipped door two. The mid-iron stops between the gates on purpose; the hybrid has to thread both.',
      },
      advance: {
        type: 'run', land: [430, 225], k: 'good', lab: 'through the door — 94 in, safe grass',
        t: 'Advance safe — the door was real',
        b: 'Gap 34, spread 22: the corridor passes the bracket test with margin on both sides, and the mid-iron’s landing zone stops SHORT of the second gate on purpose. From 94 on open grass you’re wedging on with a look at four. Escape shots aren’t always sideways — they’re whatever the widths allow.',
      },
      backward: {
        type: 'run', land: [100, 320], k: 'bad', lab: '237 out — retreat from an open door',
        ghost: { to: [430, 225], lab: 'the door your spread fits through' },
        t: 'Medicine nobody prescribed',
        b: 'Backward is for when everything forward is shut. Here a corridor half again wider than your pattern was standing open, and you walked away from it into a 237-yard slog. Over-caution has a price tag too — about a full stroke of position, paid for zero risk reduction.',
      },
    },
    why: {
      rookie: 'Not every gap is a trap! This opening is 34 yards wide and your shots only spread 22 — the ball fits with room to spare. Take the shorter club and advance through it to the open grass beyond.',
      beginner: 'Run the same bracket test that said NO last time: gap 34 vs spread 22 — yes. But aim the advance at the fairway between the tree groups, not the green: the long club you’d need for the green spreads wider (28) and must also fit the 24-yard second gate. Pass one test at a time.',
      intermediate: 'The corridor is a sequence of gates, and each club choice picks which gates it must pass: mid-iron = gate one only (34 vs 22, comfortable); hybrid-at-green = gate one AND gate two (24 vs 28, fails). Stopping between gates is the trick amateurs never consider — advancement and safety aren’t opposites, they’re a landing-zone choice.',
      expert: 'Value the three sane routes: advance-between-gates ≈ 1 + wedge from 94 (~2.85) ≈ 3.85. Punch-sideways ≈ 1 + 184 approach (~3.2) ≈ 4.2. Hero-at-green ≈ 1 + [P(two gates) ~35% × greenside ~2.5, else trees/stymied ~3.6] ≈ 4.2. The safe ADVANCE beats both by a third of a stroke — recovery equity is mostly about how many yards you reclaim per unit of risk, and gate-counting is how you price the risk.',
    },
  },

  {
    tab: 'Blocked sideways',
    ball: [200, 232], green: { c: [600, 210], r: 26 },
    trees: [[300, 194, 24], [300, 270, 26], [150, 180, 18], [130, 260, 16], [172, 300, 20], [252, 180, 22], [252, 310, 20]],
    gapB: { x: 316, y1: 218, y2: 244, lab: 'the gap: 11 yds' },
    sprB: { x: 284, y1: 205, y2: 257, lab: 'your spread: 22 yds' },
    blockLab: [252, 350, 'the NEXT tree — sideways is shut'],
    hud: [
      { cap: 'YOUR 2ND SHOT', val: 'PAR 4' },
      { cap: 'TO THE GREEN', val: '168' },
      { cap: 'THE GAP', val: '11 YDS', warn: true },
      { cap: 'SIDEWAYS EXIT', val: 'BLOCKED BY THE NEXT TREE', warn: true },
    ],
    prompt: 'Same jail — but now the sideways punch line runs into the <b>next tree</b>. When the easy exit is shut, what’s the honest one?',
    opts: {
      punch: {
        type: 'ric', via: [239.4, 294.5], land: [196, 296], k: 'bad', lab: 'clipped it — 174 out, STILL in the trees',
        labAt: [170, 268], clackAt: [272, 306],
        ghost: { to: [140, 302], lab: 'backward — out in ONE, 197 from the fairway' },
        t: 'Recovering twice',
        b: 'The punch line was blocked before you swung — the next trunk was standing on it. Now you’ve spent a stroke to stay in jail: 174 out, still behind trees, recovering AGAIN. One glance along the exit line would have priced this: blocked sideways means the cheap escape wasn’t cheap anymore.',
      },
      thread: {
        type: 'ric', via: [288, 247], land: [162, 238], k: 'bad', lab: 'off the trunk — 184 out',
        ghost: { to: [140, 302], lab: 'backward — the only clean exit' },
        t: 'Two shut doors, and you picked the shuttest',
        b: "Sideways blocked doesn't make the 11-yard gap any wider — your 22-yard spread still doesn't fit. Desperation logic ('the good exit is gone, so gamble') is how one bad lie becomes a triple. The gap was door number two of two shut doors.",
      },
      advance: {
        type: 'run', land: [330, 240], k: 'ok', lab: 'threaded low — 114 in, rough',
        t: 'Second-best, and it knows it',
        b: 'The low squirt through the gap’s shins came off — 114 in. But it rode the same 11-yard window as the hero shot, just along the ground, and a bouncing ball takes tree roots and kicks personally. Backward was the only route with a guaranteed exit; this was the lucky one.',
      },
      backward: {
        type: 'run', land: [155, 358], via: [210, 330], clearCone: true, k: 'good', lab: 'out in ONE — 197, fairway, clean swing',
        t: 'Lose 29 yards once — not a stroke twice',
        b: 'Backward to open fairway: you surrender about 29 yards (168 out becomes 197) and in exchange you are OUT, guaranteed, with a full swing from short grass. The punch that stays in the trees costs a full stroke and re-runs the nightmare. Yards are cheap; strokes are not.',
      },
    },
    why: {
      rookie: 'Check the sideways escape BEFORE you hit it — here another tree is standing right on that line. When sideways is blocked too, play backward. Losing a few yards once is much better than staying stuck in the trees.',
      beginner: 'Price the options in strokes: backward = definitely out, hitting from fairway, about 29 yards further away. Blocked punch = a stroke spent and STILL in the trees (174 out, jailed) — you’ll pay the escape toll twice. A yard costs about 1/100th of a stroke; a failed recovery costs a whole one.',
      intermediate: 'The discipline is walking the exit line: trace every candidate route to its landing spot and ask what stands on it. Amateurs check the first five yards; the next tree lives at yard fifteen. Backward-as-good-call feels wrong because progress is the instinct — but 197 from fairway (about 3.3 to finish) beats 174-still-in-trees (1 spent + ~3.4 more) by more than a stroke.',
      expert: "Formal framing: recovery is a graph search where nodes are lies and edges cost strokes — the punch edge here doesn't reach the 'fairway' node at all, it loops back into 'trees' with cost 1. The backward edge costs 1 and buys fairway + full distance control ≈ 3.3 remaining. Tour players take the backward drop without ceremony precisely because they price loops; the card doesn't have a column for 'advanced bravely.'",
    },
  },

  {
    tab: 'Match play: must win',
    ball: [200, 232], green: { c: [600, 210], r: 26 }, opp: [592, 200],
    trees: [[300, 194, 24], [300, 270, 26], [150, 180, 18], [130, 260, 16], [172, 300, 20], [252, 180, 22]],
    gapB: { x: 316, y1: 218, y2: 244, lab: 'the gap: 11 yds' },
    sprB: { x: 284, y1: 205, y2: 257, lab: 'your spread: 22 yds' },
    mantra: 'Down one, two to play: the nine-of-ten rule <b>bends</b> — the safe play would guarantee the loss it was avoiding.',
    hud: [
      { cap: 'YOUR 2ND SHOT', val: 'PAR 4' },
      { cap: 'MATCH', val: '1 DOWN · HOLE 17', warn: true },
      { cap: 'OPPONENT', val: 'SAFELY ON — 2 PUTTS FOR PAR', warn: true },
      { cap: 'THE GAP', val: 'STILL 11 YDS' },
    ],
    prompt: 'Same 11-yard gap — but it’s the 17th, you’re 1 down, and he’s already on the green in two. <b>The punch-out makes bogey… and bogey loses.</b>',
    opts: {
      punch: {
        type: 'run', land: [268, 340], k: 'bad', lab: 'safe — and the hole is gone',
        ghost: { to: [588, 218], lab: 'the gap — the only line that halves or wins' },
        t: 'The safe play that loses the match',
        b: "Punch, wedge on, one putt at best: bogey five against his stress-free par. The punch-out GUARANTEES the loss it was trying to avoid — you'll shake hands on 18 two down. Stroke play's right answer is match play's resignation letter.",
      },
      thread: {
        type: 'fly', land: [588, 218], k: 'good', lab: 'THROUGH — on the green, match alive', labAt: [478, 206],
        t: 'The 1-in-10 you have to buy',
        b: 'Still an 11-yard door for a 22-yard shot — the odds didn’t improve, the ALTERNATIVES died. Punch = lose. Backward = lose slower. Only the thread keeps a road to winning the hole, so its 3-in-10 is worth more than the punch’s 10-in-10. Today it came through; even when it doesn’t, it was right.',
      },
      advance: {
        type: 'run', land: [330, 240], k: 'ok', lab: 'through — but 114 left, and HE putts for par',
        t: 'Half a hero — a maybe-halve when you need a win',
        b: 'The low squirt keeps faint hope: stiff the 114-yard wedge and maybe he three-putts. But you took gap risk anyway and bought a WORSE prize than the full thread — needing two miracles instead of one. If you’re going to gamble on the same window, buy the outcome that actually wins the hole.',
      },
      backward: {
        type: 'run', land: [116, 310], k: 'bad', lab: '208 out — polite surrender',
        ghost: { to: [588, 218], lab: 'the gap — the only winning line' },
        t: 'Losing with extra steps',
        b: "Backward is the honest shot in a vacuum, and this isn't a vacuum: it's 1 down, hole 17, opponent putting for par. From 208 you're playing for a double at worst and a handshake either way. When every safe branch ends in 'lose the match,' safety is an illusion with good manners.",
      },
    },
    why: {
      rookie: 'Normally the smart play is chipping out sideways. But you’re losing with two holes left and he’s already safe — if you play it safe, you make bogey and lose the hole anyway. This is the rare time to try the gap: it’s the only shot that can save the match.',
      beginner: 'Compare the endings, not the shots. Punch: bogey vs his par — lose, guaranteed. Backward: worse. Thread: succeeds maybe 3 times in 10, and those 3 halve or win the hole. A 30% chance of staying alive beats a 100% chance of losing politely — the gamble is ‘free’ because everything you’d protect is already forfeit.',
      intermediate: 'The same geometry has flipped verdicts twice now — that’s the module’s point. The bracket test (11 vs 22) prices the SHOT; the match state prices the OUTCOMES. In stroke play a ricochet costs you real strokes forever. Here its cost is ‘lose the match,’ which is EXACTLY the cost of the punch. Equal downsides, unequal upsides: take the upside.',
      expert: 'Decision-theoretically: maximize P(win match), not E(strokes). P(win | punch) ≈ 0 once he two-putts; P(win | thread) ≈ P(gap) × P(convert the hole) × P(win 18) — small, but strictly positive, and it dominates. This is the general late-match theorem: when trailing, variance is an asset; when leading, it’s a liability. The identical 11-yard gap is a lottery ticket in scenario one and the only ticket in scenario four — payoff structure, not geometry, made the call.',
    },
  },
];
