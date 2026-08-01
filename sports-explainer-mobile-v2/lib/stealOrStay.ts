// Steal or Stay? — scenario data + race choreography (VERBATIM from the steal-or-stay.html prototype).
// AUTHORING-CRITICAL: the race math is the teaching point — the runner wins iff runT < pitchT + popT,
// and the lefty scenario resolves as a pickoff instead of a race. Verdicts (go/stay), the 4-depth
// reads, and all fan-facing strings are copied exactly (prototype HTML markup stripped).
//
// Diamond geometry: shares the BaseballDiamond viewBox (680×560) — base points imported from the
// shipped Where's the Play lib (the locked prototype geometry, single source of truth). The steal
// alignment POS is this module's own (1B holds the runner on, middle infield at DP depth) — verbatim.
// Pure data + math — zero React Native imports.

import { HOME, FIRST, SECOND, MOUND, lerp, type Pt, type Fielder } from './wheresThePlay';

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type StealChoice = 'go' | 'stay';
export type VerdictKind = 'good' | 'ok' | 'bad';

export interface StealVerdict { k: VerdictKind; t: string; b: string; }
export interface StealScenario {
  tab: string;
  answer: StealChoice;
  hud: string[];                              // situation chips (markup stripped, text verbatim)
  runT: number;                               // runner's sprint lead → second (ms)
  pitchT: number;                             // pitcher's delivery to the glove (ms)
  popT: number;                               // catcher's glove → the bag at second (ms)
  pickoff: boolean;                           // lefty trap: GO resolves as a pickoff, not a race
  verd: Record<StealChoice, StealVerdict>;
  why: Record<Depth, string>;
}

// ── steal-of-second alignment (prototype-verbatim; a runner-on-first defense, placed correctly) ──
//   - 1B HOLDS the runner on the bag (not at fielding depth) — that's why he's on first.
//   - SS + 2B sit at double-play depth; on the throw the SS breaks to COVER second.
export const POS: Record<Fielder, Pt> = {
  P: [340, 362], C: [340, 520],
  '1B': [496, 332],            // holding the runner ON first base
  '3B': [206, 300],
  SS: [272, 242],              // DP depth — covers second on the steal throw
  '2B': [410, 242],            // DP depth — backs the bag up
  LF: [182, 150], CF: [340, 112], RF: [498, 150],
};
export const LEAD: Pt = [452, 308];           // runner's primary lead off first, edging toward second
// End-of-play choreography at second — deliberately SEPARATED so the final picture reads (nothing stacks).
export const COVER_SS: Pt = [324, 180];       // SS straddles the bag on the 3B side (where a covering SS sets up)
export const GLOVE_SS: Pt = [330, 186];       // the throw finishes in his glove, not on the bag point
export const SLIDE_SAFE: Pt = [352, 202];     // runner slides in from the 1B side, touching the bag — SAFE
export const SLIDE_OUT: Pt = [366, 214];      // runner a full step short when the tag beats him — OUT
export const GLOVE_HOME: Pt = [HOME[0], HOME[1] - 16];   // catcher's glove, in front of the plate
export const BALL_START: Pt = [MOUND[0], MOUND[1] - 13]; // ball in the pitcher's hand
export const DIVE_BACK: Pt = [FIRST[0] - 12, FIRST[1] + 2]; // picked off — diving back, too late

// ── choreography timeline (per-module harness — evaluated by the component's single rAF loop) ──
// A tween on an absolute ms timeline. Tweens for one actor are listed chronologically; a later tween
// takes over from its own `from` once its start passes (that's how the prototype's interrupts port).
export interface Tween { id: string; from: Pt; to: Pt; start: number; dur: number; }
export interface BurstFx { pos: Pt; color: string; start: number; }
export interface LabelFx { pos: Pt; text: string; color: string; start: number; }
export interface PromptCue { at: number; text: string; }
export interface Choreo {
  tweens: Tween[]; bursts: BurstFx[]; labels: LabelFx[]; prompts: PromptCue[];
  revealAt: number;                            // verdict shows here (matches the prototype's showV timing)
  total: number;                               // loop runs to here (tail motion + burst fade)
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
export const GOOD_LBL = '#bfe9da', BAD_LBL = '#ffb3ae';

// Build the on-field resolution for a call (prototype-verbatim timings and end spots).
export function buildStealPlay(s: StealScenario, choice: StealChoice): Choreo {
  if (choice === 'stay') {
    // He holds; the pitch just comes in.
    return {
      tweens: [{ id: 'ball', from: BALL_START, to: GLOVE_HOME, start: 0, dur: 480 }],
      bursts: [{ pos: GLOVE_HOME, color: AMBER, start: 480 }],
      labels: [],
      prompts: [{ at: 0, text: 'He holds… pitch comes in…' }],
      revealAt: 480, total: 480 + BURST_MS,
    };
  }
  if (s.pickoff) {
    // GO against the lefty — the "delivery" was a move to first the whole time. The runner breaks
    // (420ms toward a point 28% of the way to second); the throw beats him to first at 320ms and he
    // dives back from wherever it caught him (the prototype reads the live position at that moment).
    const breakPt = lerp(LEAD, SECOND, 0.28);
    const caughtAt = lerp(LEAD, breakPt, 320 / 420);
    return {
      tweens: [
        { id: 'runner', from: LEAD, to: breakPt, start: 0, dur: 420 },
        { id: 'ball', from: BALL_START, to: FIRST, start: 0, dur: 320 },
        { id: 'runner', from: caughtAt, to: DIVE_BACK, start: 320, dur: 340 },
      ],
      bursts: [{ pos: FIRST, color: RED, start: 660 }],
      labels: [{ pos: [FIRST[0], FIRST[1] - 30], text: 'PICKED OFF', color: BAD_LBL, start: 660 }],
      prompts: [{ at: 0, text: 'He breaks — wait, the lefty spins…' }],
      revealAt: 660, total: 660 + BURST_MS,
    };
  }
  // GO — the race: runner LEAD→SECOND vs pitch + throw. The SS reads the steal and breaks for the
  // bag WITH the pitch (not after the catch) — real coverage timing, visibly at the bag for the tag.
  const safe = s.runT < s.pitchT + s.popT;
  const throwArrive = s.pitchT + s.popT;
  return {
    tweens: [
      { id: 'runner', from: LEAD, to: safe ? SLIDE_SAFE : SLIDE_OUT, start: 0, dur: s.runT },
      { id: 'SS', from: POS.SS, to: COVER_SS, start: 0, dur: throwArrive * 0.8 },
      { id: 'ball', from: BALL_START, to: GLOVE_HOME, start: 0, dur: s.pitchT },
      { id: 'ball', from: GLOVE_HOME, to: GLOVE_SS, start: s.pitchT, dur: s.popT },
    ],
    bursts: [{ pos: SECOND, color: safe ? TEAL : RED, start: throwArrive }],
    labels: [{ pos: [SECOND[0], SECOND[1] - 32], text: safe ? 'SAFE!' : 'OUT — tag beats him', color: safe ? GOOD_LBL : BAD_LBL, start: throwArrive }],
    prompts: [{ at: 0, text: "He's going!" }],
    revealAt: throwArrive, total: Math.max(throwArrive + BURST_MS, s.runT),
  };
}

// ── SCENARIOS (VERBATIM) ──
export const SCEN: StealScenario[] = [
  {
    tab: 'Slow leg kick', answer: 'go',
    hud: ['Pitcher: righty, slow high leg kick', 'Catcher: average arm', 'Count 1–1, 1 out'],
    runT: 1450, pitchT: 520, popT: 1120, pickoff: false,
    verd: {
      go: { k: 'good', t: 'Safe — the race was over at the leg kick',
        b: "That slow, high delivery gave your runner a running start the catcher can't buy back. He's into second under the tag with room to spare. You didn't steal off the catcher — you stole off the pitcher, which is how most bags are actually taken." },
      stay: { k: 'ok', t: 'Held — and left ninety free feet on the table',
        b: "Nothing bad happened, but the clues were screaming green: a slow delivery and an ordinary arm add up to a base your runner takes four times out of five. Bases like that don't come every inning." },
    },
    why: {
      rookie: 'Watch the pitcher\'s leg: a big slow kick means the ball takes forever to reach the catcher. That head start is what lets the runner steal.',
      beginner: "The steal is a math race: pitcher's delivery time plus catcher's throw versus the runner's sprint. A slow leg kick blows up the pitcher's half of that equation — the catcher never had a chance.",
      intermediate: 'Base stealers time deliveries from the dugout with a stopwatch: slow to the plate is a green light almost regardless of the catcher, because the throw can only make up so much. Steals are scouted, not improvised.',
      expert: 'Teams grade the battery as one unit — delivery time plus pop time against the runner\'s speed — and pre-set green lights before the series. When you see a steal on the first pitch of an at-bat, that homework is what you\'re watching.',
    },
  },
  {
    tab: 'Slide step + cannon', answer: 'stay',
    hud: ['Pitcher: quick slide step', 'Catcher: elite arm, best in the league', 'Count 0–1, 1 out'],
    runT: 1500, pitchT: 400, popT: 920, pickoff: false,
    verd: {
      stay: { k: 'good', t: 'Held — the math said out by a step',
        b: "A slide step erases the runner's head start and that catcher's throw arrives on a rope. Send him into that combination and it's an out dressed up as aggression. Holding isn't timid — it's arithmetic." },
      go: { k: 'bad', t: 'Out — the slide step stole your jump',
        b: 'Watch the race: the pitch is home before your runner is halfway, and the throw beats him by a full step. This battery is built specifically to kill the run game — you ran into the one matchup where the numbers were never close.' },
    },
    why: {
      rookie: "When the pitcher barely lifts his leg — a quick 'slide step' — the ball gets to the catcher fast. Against that plus a great throwing catcher, don't run.",
      beginner: "Both halves of the defense's clock got faster: quick delivery AND an elite arm. When their combined time beats your runner's best sprint, the steal is decided before the first step.",
      intermediate: "Aggression isn't a virtue by itself — outs on the bases are among the most expensive outs in baseball, because they erase a runner AND add an out. A sub-par success rate makes stealing a losing bet.",
      expert: 'This is the cat-and-mouse: pitchers slide-step when they smell a steal, but the slide step costs them velocity and command — so some teams WANT to threaten the run just to degrade the pitch quality. The runner is leverage even standing still.',
    },
  },
  {
    tab: 'The lefty is staring at you', answer: 'stay',
    hud: ['Pitcher: lefty, great pickoff move', "He's looking RIGHT at the runner", 'Catcher: average arm'],
    runT: 1500, pitchT: 520, popT: 1120, pickoff: true,
    verd: {
      stay: { k: 'good', t: 'Held — never race a man who\'s watching you',
        b: "A left-hander faces first base as he sets: he sees the lead, he sees the first step, and his best weapon is a move to first that looks exactly like a pitch. Against that, the steal usually dies before the pitch is even thrown. Shorten the lead, live for a better pitcher." },
      go: { k: 'bad', t: 'Picked off — he never threw home',
        b: "The runner broke, but the 'delivery' was a move to first the whole time. That's the lefty's trap: everything looks identical until the ball goes the wrong way. You didn't lose the race to second — you never got to run it." },
    },
    why: {
      rookie: 'A left-handed pitcher faces the runner at first base. He can watch you the whole time — and his throw to first looks just like a pitch. Be careful.',
      beginner: "Against a lefty the danger isn't the catcher, it's the pickoff: he sees your jump as it happens. Runners wait to read the pitcher's front foot — toward home means pitch, toward first means dive back.",
      intermediate: 'Good base stealers steal off lefties on FIRST MOVEMENT — a calculated gamble that the move is a pitch — but only against lefties whose moves they\'ve studied. Against a great move, the percentage play is patience or a delayed steal.',
      expert: "The lefty's edge is ambiguity within the rules: hang the leg, read the runner, choose late. Balk rules police the deception's limits, and the best moves live exactly at that line — which is why scouting reports grade lefty moves like weapons.",
    },
  },
];
