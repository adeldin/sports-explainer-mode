// Infield In or Back? — scenario data + depth alignments + play choreography (VERBATIM from the
// infield-in-or-back.html prototype). AUTHORING-CRITICAL: the depth bet is the teaching point —
// in buys a play at the plate and pays range for it, back trades the run for outs, halfway hedges.
// The per-depth grades, outcomes, 4-depth reads and all fan-facing strings are copied exactly
// (prototype HTML markup stripped).
//
// Diamond geometry: shares the BaseballDiamond viewBox (680×560) — base points imported from the
// shipped Where's the Play lib. The depth alignments are this module's own — verbatim, every man
// placed for real (1B holds with a runner on first; IN = corners up the lines, middle on the grass).
// Pure data + math — zero React Native imports.

import { HOME, FIRST, SECOND, MOUND, lerp, type Pt, type Fielder } from './wheresThePlay';

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type DepthChoice = 'in' | 'half' | 'back';
export type VerdictKind = 'good' | 'ok' | 'bad';
export type OutKind =
  | 'cutPlate' | 'bangBang' | 'runScores' | 'through' | 'tradeRun' | 'bangBangEarly'
  | 'doublePlay' | 'throughLoaded' | 'oneOut';

export interface InfieldGrade { k: VerdictKind; out: OutKind; t: string; b: string; }
export interface InfieldScenario {
  tab: string;
  hasR1: boolean;                              // runner on first too (1st & 3rd scenario)
  hud: string[];                               // situation chips (markup stripped, text verbatim)
  grade: Record<DepthChoice, InfieldGrade>;
  why: Record<Depth, string>;
}

// ── alignments (prototype-verbatim) ──
// BACK = standard depth (with R1 the middle infield cheats to DP depth, 1B holds the runner ON).
// IN   = corners charge up the lines, middle infielders on the grass edge: the throw-home alignment.
// HALF = split the difference (1B keeps holding if there's a runner).
// P/C/outfielders never change with infield depth.
export const STATICPOS: Partial<Record<Fielder, Pt>> = { P: [340, 362], C: [340, 524], LF: [180, 150], CF: [340, 112], RF: [500, 150] };
export const HOLD_1B: Pt = [496, 332];         // holding the runner on first
export type InfieldMover = '3B' | 'SS' | '2B' | '1B';
export function depthPositions(depth: DepthChoice, hasR1: boolean): Record<InfieldMover, Pt> {
  const BACK: Record<InfieldMover, Pt> = {
    '3B': [202, 300], SS: hasR1 ? [272, 242] : [262, 235], '2B': hasR1 ? [410, 242] : [418, 235], '1B': hasR1 ? HOLD_1B : [478, 300],
  };
  const IN: Record<InfieldMover, Pt> = { '3B': [242, 368], SS: [284, 322], '2B': [396, 322], '1B': [438, 368] };
  if (depth === 'back') return BACK;
  if (depth === 'in') return IN;
  const H = {} as Record<InfieldMover, Pt>;
  (Object.keys(BACK) as InfieldMover[]).forEach(k => { H[k] = lerp(BACK[k], IN[k], 0.5); });
  if (hasR1) H['1B'] = HOLD_1B;                // halfway or not, someone has to hold the runner
  return H;
}

// ── runner marks (leads, not on the bags) + separated end-of-play spots (nothing ever stacks) ──
export const LEAD3: Pt = [208, 356];           // R3's lead down the line toward home
export const LEAD1: Pt = [452, 308];           // R1's lead off first
export const BATTER: Pt = [316, 482];          // batter beside the plate
export const PLATE_OUT: Pt = [318, 466];       // runner cut down a step short of the plate
export const PLATE_SAFE: Pt = [331, 481];      // scoring: ON the 3B line, stopping as he just touches the plate
export const C_RECEIVE: Pt = [346, 502];       // catcher straddling the plate for the tag
export const C_GLOVE: Pt = [336, 484];         // the throw finishes in his glove
export const BAG1_COVER: Pt = [498, 330];      // the man taking the throw at first
export const BAG1_GLOVE: Pt = [490, 344];
export const BATTER_OUT: Pt = [458, 372];      // batter out, a step short of first
export const BATTER_SAFE: Pt = [484, 346];     // batter safe at the bag
export const BAG2_COVER: Pt = [352, 196];      // 2B taking the flip at second
export const BAG2_GLOVE: Pt = [346, 200];
export const R1_OUT: Pt = [368, 214];          // R1 forced out, short of second
export const R1_ON2: Pt = [334, 202];          // R1 safe into second
export const BALL_START: Pt = [MOUND[0], MOUND[1] - 13];

// ── choreography timeline (per-module harness — evaluated by the component's single rAF loop) ──
export interface Tween { id: string; from: Pt; to: Pt; start: number; dur: number; }
export interface BurstFx { pos: Pt; color: string; start: number; }
export interface LabelFx { pos: Pt; text: string; color: string; start: number; }
export interface PromptCue { at: number; text: string; }
export interface Choreo {
  tweens: Tween[]; bursts: BurstFx[]; labels: LabelFx[]; prompts: PromptCue[];
  revealAt: number; total: number;
}
export function tweenPos(tweens: Tween[], id: string, base: Pt, e: number): Pt {
  let pos = base;
  for (const tw of tweens) {
    if (tw.id !== id || e < tw.start) continue;
    const f = tw.dur <= 0 ? 1 : Math.min(1, (e - tw.start) / tw.dur);
    pos = lerp(tw.from, tw.to, f);
  }
  return pos;
}

export const BURST_MS = 600;
export const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
export const GOOD_LBL = '#bfe9da', BAD_LBL = '#ffb3ae', OK_LBL = '#ffe1b3';

const promptForChoice = (opt: DepthChoice) =>
  opt === 'in' ? 'Infield creeps in…' : opt === 'half' ? 'Halfway — read mode…' : 'Normal depth — DP depth…';

// Build the full play: fielders shift to the chosen depth → the pitch → contact → the branch the
// grade's `out` dictates (prototype-verbatim timings, end spots, bursts and shout labels).
export function buildInfieldPlay(s: InfieldScenario, choice: DepthChoice): Choreo {
  const g = s.grade[choice];
  const POS = depthPositions(choice, s.hasR1);
  const BACK = depthPositions('back', s.hasR1);
  const tweens: Tween[] = (Object.keys(POS) as InfieldMover[]).map(n => ({ id: n, from: BACK[n], to: POS[n], start: 0, dur: 520 }));
  const bursts: BurstFx[] = [];
  const labels: LabelFx[] = [];
  const prompts: PromptCue[] = [{ at: 0, text: promptForChoice(choice) }];
  // the pitch comes in — then contact: the grounder leaves the BAT, not the mound
  const tPitch = 520;
  tweens.push({ id: 'ball', from: BALL_START, to: [HOME[0], HOME[1] - 10], start: tPitch, dur: 420 });
  const tContact = tPitch + 420;
  prompts.push({ at: tContact, text: 'Contact — ground ball, left side!' });
  const ssP = POS.SS;
  let revealAt: number;

  if (g.out === 'through' || g.out === 'throughLoaded') {
    // through the hole the drawn-in SS can no longer reach, into left field
    const hole: Pt = [ssP[0] - 52, ssP[1] - 46];
    tweens.push({ id: 'ball', from: [HOME[0], HOME[1] - 10], to: hole, start: tContact, dur: 420 });
    const tHole = tContact + 420;
    tweens.push({ id: 'ball', from: hole, to: [176, 168], start: tHole, dur: 480 });
    tweens.push({ id: 'LF', from: STATICPOS.LF!, to: [172, 176], start: tHole, dur: 520 });   // LF runs it down
    tweens.push({ id: 'r3', from: LEAD3, to: PLATE_SAFE, start: tHole, dur: 620 });
    const tScore = tHole + 620;
    bursts.push({ pos: HOME, color: RED, start: tScore });
    labels.push({ pos: [HOME[0], HOME[1] - 40], text: 'RUN SCORES — INNING ALIVE', color: BAD_LBL, start: tScore });
    tweens.push({ id: 'bat', from: BATTER, to: BATTER_SAFE, start: tScore, dur: 520 });
    if (g.out === 'throughLoaded' && s.hasR1) {
      tweens.push({ id: 'r1', from: LEAD1, to: R1_ON2, start: tScore + 520, dur: 420 });
      revealAt = tScore + 520 + 420;
    } else {
      revealAt = tScore + 520;
    }
    return { tweens, bursts, labels, prompts, revealAt, total: revealAt + BURST_MS };
  }

  // ball to the shortstop at his chosen depth
  tweens.push({ id: 'ball', from: [HOME[0], HOME[1] - 10], to: ssP, start: tContact, dur: 430 });
  const tSS = tContact + 430;

  if (g.out === 'cutPlate' || g.out === 'bangBang') {
    // throw home: the catcher comes up to straddle the plate and take it. The batter reaches first
    // for free — with the play at the plate, nobody is playing on him (and he never stacks on the out runner).
    const cut = g.out === 'cutPlate';
    tweens.push({ id: 'C', from: STATICPOS.C!, to: C_RECEIVE, start: tSS, dur: 380 });
    tweens.push({ id: 'bat', from: BATTER, to: BATTER_SAFE, start: tSS, dur: 700 });
    tweens.push({ id: 'r3', from: LEAD3, to: cut ? PLATE_OUT : [PLATE_OUT[0] + 6, PLATE_OUT[1] + 10], start: tSS, dur: 560 });
    const throwDur = cut ? 400 : 520;
    tweens.push({ id: 'ball', from: ssP, to: C_GLOVE, start: tSS, dur: throwDur });
    const tPlate = tSS + throwDur;
    bursts.push({ pos: HOME, color: cut ? TEAL : AMBER, start: tPlate });
    labels.push({ pos: [HOME[0], HOME[1] - 40], text: cut ? 'OUT AT THE PLATE' : 'BANG-BANG — could go either way', color: cut ? GOOD_LBL : OK_LBL, start: tPlate });
    revealAt = tPlate;
    return { tweens, bursts, labels, prompts, revealAt, total: Math.max(revealAt + BURST_MS, tSS + 700) };
  }

  if (g.out === 'doublePlay') {
    // 6-4-3: flip to the 2B covering second, relay to the 1B back at the bag
    tweens.push({ id: '2B', from: POS['2B'], to: BAG2_COVER, start: tSS, dur: 280 });
    if (s.hasR1) tweens.push({ id: 'r1', from: LEAD1, to: R1_OUT, start: tSS, dur: 300 });
    tweens.push({ id: 'ball', from: ssP, to: BAG2_GLOVE, start: tSS, dur: 300 });
    const tSecond = tSS + 300;
    bursts.push({ pos: SECOND, color: TEAL, start: tSecond });
    tweens.push({ id: '1B', from: POS['1B'], to: BAG1_COVER, start: tSecond, dur: 300 });
    tweens.push({ id: 'bat', from: BATTER, to: BATTER_OUT, start: tSecond, dur: 700 });
    tweens.push({ id: 'ball', from: BAG2_GLOVE, to: BAG1_GLOVE, start: tSecond, dur: 340 });
    const tFirst = tSecond + 340;
    bursts.push({ pos: FIRST, color: TEAL, start: tFirst });
    labels.push({ pos: [MOUND[0], MOUND[1] - 70], text: '6–4–3 — INNING OVER', color: GOOD_LBL, start: tFirst });
    tweens.push({ id: 'r3', from: LEAD3, to: PLATE_SAFE, start: tFirst, dur: 500 });
    revealAt = tFirst + 500;
    return { tweens, bursts, labels, prompts, revealAt, total: Math.max(revealAt + BURST_MS, tSecond + 700) };
  }

  // tradeRun / runScores / bangBangEarly / oneOut: out at first, run scores
  tweens.push({ id: '1B', from: POS['1B'], to: BAG1_COVER, start: tSS, dur: 300 });
  tweens.push({ id: 'bat', from: BATTER, to: BATTER_OUT, start: tSS, dur: 640 });
  tweens.push({ id: 'ball', from: ssP, to: BAG1_GLOVE, start: tSS, dur: 420 });
  const tFirst = tSS + 420;
  bursts.push({ pos: FIRST, color: TEAL, start: tFirst });
  if (g.out === 'oneOut' && s.hasR1) tweens.push({ id: 'r1', from: LEAD1, to: R1_ON2, start: tFirst, dur: 420 });  // R1 takes second on the play
  tweens.push({ id: 'r3', from: LEAD3, to: PLATE_SAFE, start: tFirst, dur: 560 });
  const tScore = tFirst + 560;
  const bad = g.out === 'runScores';
  bursts.push({ pos: HOME, color: bad ? RED : AMBER, start: tScore });
  labels.push({ pos: [HOME[0], HOME[1] - 40], text: bad ? 'WINNING RUN SCORES — GAME OVER' : 'out at 1st — run scores', color: bad ? BAD_LBL : OK_LBL, start: tScore });
  revealAt = tScore;
  return { tweens, bursts, labels, prompts, revealAt, total: revealAt + BURST_MS };
}

// ── SCENARIOS (VERBATIM — verdict/read text unchanged, tactically approved) ──
export const SCEN: InfieldScenario[] = [
  {
    tab: '9th, tie, winning run on 3rd', hasR1: false,
    hud: ['Bottom 9th, tie game', 'Winning run on 3rd, 1 out', 'Contact hitter up'],
    grade: {
      in: { k: 'good', out: 'cutPlate', t: 'In — and the run dies at the plate',
        b: "The grounder goes to your drawn-in shortstop and the throw home cuts the winning run down. It's still a bang-bang play — the throw has to be true and the catcher has to hold the tag — but 'in' is the only depth that even makes the play possible. Back, and the game simply ends on a routine ground ball." },
      back: { k: 'bad', out: 'runScores', t: 'An easy out — and the game is over',
        b: "Your shortstop fields it clean at normal depth and takes the sure out at first... while the winning run trots home behind the play. In the ninth of a tie game, that run IS the game — an out that doesn't stop it is worthless. This is the one situation where the run always outranks the out." },
      half: { k: 'ok', out: 'bangBang', t: 'Halfway — a hedge in a spot that punishes hedging',
        b: "Halfway lets your fielders read the ball: hard at them, go home; slow, take the out. But on the medium grounder — the most common one — you're a step too deep to cut the run and a step too shallow to turn anything. When the run ends the game, most managers stop hedging and commit." },
    },
    why: {
      rookie: 'If that runner scores, the game is over. Bring everyone close so a ground ball becomes a throw HOME instead of an out at first that doesn\'t matter.',
      beginner: 'Infield in changes what a grounder means: instead of the routine out at first, the play is at the plate. The cost is real — more balls sneak through a drawn-in infield — but here an out that lets the run score loses anyway.',
      intermediate: "Depth is priced by the run's value: this run is literally the game, so its value is infinite and the batting-average tax on 'in' is irrelevant. The same math reverses completely when the run is affordable.",
      expert: 'Watch the contact play stacked on top: with the infield in, the runner is often sent on ANY contact, betting the throw or catch fails once. Depth, the runner\'s read, and the catcher\'s setup are one linked system in these endgames.',
    },
  },
  {
    tab: '2nd inning, down one', hasR1: false,
    hud: ['Top 2nd, you trail 1–0', 'Runner on 3rd, 1 out', 'Middle of their order up'],
    grade: {
      back: { k: 'good', out: 'tradeRun', t: 'Back — sell them one run, buy two outs',
        b: "Normal depth, routine grounder, easy out at first; the run scores and you shrug. It's the second inning — there are twenty-plus outs of baseball left to get that run back, and what actually loses early games is the BIG inning. Keeping your defense whole prevents exactly that." },
      in: { k: 'bad', out: 'through', t: 'Through the hole your shortstop left',
        b: 'The same routine grounder scoots past the spot your drawn-in shortstop vacated: the run scores anyway, the hitter stands on first, and the inning is still alive with their big bats coming. You paid the infield-in tax to save a run you could afford — and got the run AND a rally for your money.' },
      half: { k: 'ok', out: 'bangBangEarly', t: "Halfway — protection you didn't need to buy",
        b: 'Not a disaster, but ask what you\'re protecting: a second-inning run in a one-run game is survivable by design. Even half-committed depth surrenders some range, and surrendered range early in games is how crooked numbers start.' },
    },
    why: {
      rookie: "It's early. One run won't decide the game, but a big inning might. Play normal depth, take the easy outs, let that one run score.",
      beginner: 'The infield-in tax: drawn-in fielders have less range, so more ground balls become hits. Early in a game, that tax buys you almost nothing — the run it might save just isn\'t worth much yet.',
      intermediate: 'Managers think in run-expectancy, not pride: conceding one run to escape with two outs beats gambling on a play at the plate that leaves the inning alive. Early innings are for out-collecting, not run-hoarding.',
      expert: "The inning-state math is stark: a hit through a drawn-in infield doesn't just score the run — it re-loads the inning. The expected runs given up by 'in' backfiring early typically exceed the single run 'back' concedes, which is why you almost never see the infield in before the late innings.",
    },
  },
  {
    tab: '8th, up 3, first and third', hasR1: true,
    hud: ['Top 8th, you lead by 3', 'Runners 1st & 3rd, 1 out', 'Ground-ball pitcher on the mound'],
    grade: {
      back: { k: 'good', out: 'doublePlay', t: 'DP depth — two outs end the whole problem',
        b: 'Grounder to short, flip, turn: six-four-three, inning over. Yes, the run on third scores as the double play turns — and up three, you happily sell that run for the two outs that empty the bases and kill the rally. The double play is the exit door; depth is what keeps it open.' },
      in: { k: 'bad', out: 'throughLoaded', t: 'You gave up the exit door',
        b: "Drawn in, your middle infielders can't turn two — and when the grounder sneaks through the shortened range, the run scores anyway, the bases stay crowded, and the tying run steps into the box. You protected a run you could afford by risking the three-run lead itself." },
      half: { k: 'ok', out: 'oneOut', t: 'Halfway — one out where two were on sale',
        b: 'Your fielders read it and take the safe out somewhere, but halfway depth rarely turns the clean double play — the pivot comes a beat late. You escape the batter, not the inning. Second-best, and second-best with a lead is how leads shrink.' },
    },
    why: {
      rookie: "You're up by three — one run scoring is fine. Two outs on one ground ball ends the inning. Stand where double plays happen.",
      beginner: 'With runners on first and third, DP depth turns one grounder into a finished inning. The run from third scores while you turn it — that\'s the agreed price, and up three it\'s a bargain.',
      intermediate: "Leads change what you're defending: up three, the enemy isn't one run, it's the inning continuing until the tying run bats. Every choice that maximizes outs — even at the cost of a run — is defending the actual threat.",
      expert: 'Ground-ball pitcher plus DP depth is a designed escape: pitch down, let the sinker find the infield, turn two. Bringing the infield in against that pitcher fights your own game plan — alignment and pitching strategy are supposed to be the same decision.',
    },
  },
];
