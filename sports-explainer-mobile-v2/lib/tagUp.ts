// Tag and Go — scenario data + flight math + resolve choreography (VERBATIM from the tag-up.html
// prototype). AUTHORING-CRITICAL: the timing windows are the teaching point — the runner may leave
// on the fielder's FIRST TOUCH (t = catchT); leaving early is a double-off on appeal, leaving inside
// the window wins the race home, leaving after it loses. Scenario 2 has NO window (window: null) —
// any tap loses; never tapping (the hold) is the correct read. Verdicts, the 4-depth reads, and all
// fan-facing strings are copied exactly (prototype HTML markup stripped).
//
// Diamond geometry: shares the BaseballDiamond viewBox (680×560) — base points imported from the
// shipped Where's the Play lib. The full-defense START alignment is this module's own (verbatim).
// Pure data + math — zero React Native imports.

import { HOME, THIRD, lerp, type Pt, type Fielder } from './wheresThePlay';

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type TagKind = 'early' | 'good' | 'late' | 'hold';

export interface TagVerdict { t: string; b: string; }
export interface TagScenario {
  tab: string;
  of: Fielder;                                  // the outfielder who makes the catch (LF/CF/RF)
  catch: Pt;                                    // where he first touches the ball
  catchT: number;                               // t-units (0..100) when the touch happens
  window: number | null;                        // t-units of green window after the touch; null = no window (hold!)
  arm: string;                                  // scouting note (informational)
  hud: string[];                                // situation chips (markup stripped, text verbatim)
  verd: Partial<Record<TagKind, TagVerdict>>;   // S1/S3: early/good/late · S2: early/late/hold
  why: Record<Depth, string>;
}

// ── full defense, correctly placed (prototype-verbatim; this module's own alignment) ──
export const START: Record<Fielder, Pt> = {
  P: [340, 362], C: [340, 524], '1B': [478, 300], '3B': [202, 300], '2B': [418, 235],
  SS: [262, 235], LF: [180, 150], CF: [340, 112], RF: [500, 150],
};

// End-of-play spots — deliberately SEPARATED so the tag picture always reads (nothing stacks).
export const TAG3: Pt = [198, 347];             // runner tagging — foot on the bag's home-side corner, bag still visible
export const R3_BACK_OUT: Pt = [208, 354];      // doubled off — back a step short of the bag
export const BAG3_COVER: Pt = [178, 332];       // 3B taking the appeal throw at the bag
export const BAG3_GLOVE: Pt = [186, 338];
export const PLATE_SAFE: Pt = [331, 481];       // safe: ON the 3B line, stopping as he just touches the plate
export const PLATE_OUT: Pt = [314, 464];        // cut down a step short
export const C_RECEIVE: Pt = [346, 500];        // catcher straddling the plate
export const C_GLOVE: Pt = [336, 484];          // the throw in his glove (out)
export const BALL_LATE: Pt = [374, 466];        // safe: the throw still up the line as he scores (clear of the SAFE label)

export const T_RATE = 26;                       // t-units per second — the live-flight clock
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Ball flight: quadratic arc HOME → catch spot over t = 0..catchT (verbatim), parked at the catch after.
export function ballAt(s: TagScenario, t: number): Pt {
  const f = Math.min(1, t / s.catchT);
  const from = HOME, to = s.catch;
  const mx = (from[0] + to[0]) / 2, my = Math.min(from[1], to[1]) - 150;
  const mt = 1 - f;
  return [mt * mt * from[0] + 2 * mt * f * mx + f * f * to[0], mt * mt * from[1] + 2 * mt * f * my + f * f * to[1]];
}

// Classify a GO tap at t (verbatim): before the touch = early; inside the window = good; else late.
export function classifyGo(s: TagScenario, goT: number): TagKind {
  if (goT < s.catchT) return 'early';
  if (s.window !== null && goT <= s.catchT + s.window) return 'good';
  return 'late';
}

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
export const TEAL = '#14B8A6', RED = '#e24b4a', CHALK = '#F4F4EE';
export const GOOD_LBL = '#bfe9da', BAD_LBL = '#ffb3ae';

// Build the on-field resolution for a GO tap (early / good / late). A timeout (never tapped) resolves
// directly with no choreography — the runner never went (verbatim behavior).
export function buildTagResolve(s: TagScenario, kind: Exclude<TagKind, 'hold'>, ballFrozen: Pt): Choreo {
  if (kind === 'early') {
    // He broke while the ball was still in the air: the catch completes (the frozen ball finishes to
    // the glove), the throw goes back to third, and the appeal erases him.
    const breakPt = lerp(THIRD, HOME, 0.3);
    return {
      tweens: [
        { id: 'runner', from: TAG3, to: breakPt, start: 0, dur: 420 },
        { id: 'ball', from: ballFrozen, to: s.catch, start: 420, dur: 0 },        // the catch is made
        { id: '3B', from: START['3B'], to: BAG3_COVER, start: 420, dur: 420 },    // 3B covers the bag for the appeal
        { id: 'ball', from: s.catch, to: BAG3_GLOVE, start: 420, dur: 520 },
        { id: 'runner', from: breakPt, to: R3_BACK_OUT, start: 940, dur: 300 },   // dives back, too late
      ],
      bursts: [
        { pos: s.catch, color: CHALK, start: 420 },
        { pos: THIRD, color: RED, start: 1240 },
      ],
      labels: [{ pos: [THIRD[0], THIRD[1] - 34], text: 'DOUBLED OFF — APPEAL', color: BAD_LBL, start: 1240 }],
      prompts: [{ at: 0, text: 'He broke early — the catch… the throw back…' }],
      revealAt: 1240, total: 1240 + BURST_MS,
    };
  }
  // good / late: the race — runner to the plate vs the throw; the catcher comes up to take it.
  const win = kind === 'good';
  const runDur = 1150;
  const throwDur = win ? 1350 : 850;
  const resolveAt = Math.max(runDur, throwDur) + 80;
  return {
    tweens: [
      { id: 'C', from: START.C, to: C_RECEIVE, start: 0, dur: 500 },
      { id: 'runner', from: TAG3, to: win ? PLATE_SAFE : PLATE_OUT, start: 0, dur: runDur },
      { id: 'ball', from: s.catch, to: win ? BALL_LATE : C_GLOVE, start: 0, dur: throwDur },
    ],
    bursts: [{ pos: HOME, color: win ? TEAL : RED, start: resolveAt }],
    labels: [{ pos: [HOME[0], HOME[1] - 38], text: win ? 'SAFE — RUN SCORES' : 'OUT AT THE PLATE', color: win ? GOOD_LBL : BAD_LBL, start: resolveAt }],
    prompts: [{ at: 0, text: 'He goes!' }],
    revealAt: resolveAt, total: resolveAt + BURST_MS,
  };
}

// ── SCENARIOS (VERBATIM) ──
export const SCEN: TagScenario[] = [
  {
    tab: 'Deep fly, left field', of: 'LF', catch: [142, 94], catchT: 58, window: 14, arm: 'average',
    hud: ['Fly ball: deep left', 'LF arm: average', '1 out, tie game'],
    verd: {
      early: { t: 'Doubled off — you left before the touch',
        b: 'You broke while the ball was still in the air. The catch is made, the throw goes back to third, and the appeal erases the run AND the runner. Deep or not, the touch is the starting gun — there is no head start on a tag-up.' },
      good: { t: 'Tagged, gone, safe — textbook',
        b: 'You left on the first touch, and a deep ball plus an average arm meant the throw home never had a chance. This is the sacrifice fly doing exactly what it\'s designed to do: an out traded for a run, on your terms.' },
      late: { t: 'The run died at third',
        b: 'The ball was deep, the arm was ordinary, and the door was wide open — but you watched the catch instead of leaving on it. By the time you broke, the throw was already winning. Free runs expire fast.' },
    },
    why: {
      rookie: "On a caught fly ball, the runner must touch his base AFTER the catch before running. Deep fly ball: touch, then GO — you'll beat the throw.",
      beginner: "The rule is 'first touch': you can leave the instant the fielder's glove meets the ball, not when he squeezes it. On a deep fly, that instant is your green light — the throw is too long to beat you.",
      intermediate: "Third-base coaches pre-read this before the pitch: depth of the outfielder, arm strength, number of outs. The runner isn't deciding at the catch — he's executing a decision made ten seconds earlier.",
      expert: "Depth beats arm: an extra thirty feet of throw costs more time than any arm saves. That's why outfielders play shallow with a runner on third and fewer than two outs — conceding the double over their head to buy a play at the plate.",
    },
  },
  {
    tab: 'Shallow fly, center', of: 'CF', catch: [339, 158], catchT: 52, window: null, arm: 'strong, charging',
    hud: ['Fly ball: shallow center', 'CF arm: strong, charging in', '1 out, tie game'],
    verd: {
      early: { t: 'Doubled off — the worst version',
        b: "You left early on a ball you shouldn't have run on at all. Catch, throw behind you, inning over. Two mistakes in one break." },
      late: { t: 'Out at the plate by fifteen feet',
        b: 'He caught it moving forward, sixty feet closer than a real sac fly, with a plus arm. The throw beat you home so badly the catcher was waiting. Some fly balls are outs, not opportunities — this was one.' },
      hold: { t: 'Smart hold — that ball was a trap',
        b: 'Shallow, strong arm, momentum coming toward the plate: every clue said the race home was already lost. So you tagged, held, and kept the runner — and the threat — alive at third. Not running was the winning play.' },
    },
    why: {
      rookie: "Not every catch is a green light. If the ball is short and the fielder is close, running home just makes an easy out. Staying put is allowed — and sometimes it's the smart play.",
      beginner: 'Three clues vote before you run: how deep the catch is, how strong the arm is, and whether he\'s moving toward home. Shallow + strong + charging is three votes for stay.',
      intermediate: "The out math makes it worse: getting thrown out at the plate with one out kills the inning's best run AND its second-best out. The downside of going dwarfs the upside when the race is this lopsided.",
      expert: "Fielders charging shallow flies are throwing downhill with momentum — the throws arrive a full grade above their arm rating. Third-base coaches bake that in: the same arm that's 'average' flat-footed is 'plus' on the charge.",
    },
  },
  {
    tab: 'Medium fly, right field', of: 'RF', catch: [534, 118], catchT: 56, window: 7, arm: 'strong',
    hud: ['Fly ball: medium-deep right', 'RF arm: strong — longest throw, best arms', '1 out, down a run'],
    verd: {
      early: { t: 'Doubled off — a razor-thin play thrown away',
        b: 'This one was going to be close ANYWAY — and you handed it away before it started. Leave a blink before the touch and the appeal at third ends the argument. Tight windows punish sloppy feet the hardest.' },
      good: { t: 'Safe — because you left ON the touch',
        b: 'Right field is the longest throw home, but right fielders carry the best arms for exactly that reason — this was a genuine race. You won it by leaving at the first touch, not the secure catch. That half-second IS the margin.' },
      late: { t: 'Out — you gave the arm its head start back',
        b: 'Against a strong arm on a medium ball, the window is one beat wide: the touch. You left on the squeeze instead, and the throw arrived with the tag waiting. The race was winnable — at full price only.' },
    },
    why: {
      rookie: 'Right fielders usually have the strongest arms because their throw home is the longest. On a medium fly to right, you can score — but only if you leave the INSTANT he touches it.',
      beginner: "'First touch, not full catch' matters most when the play is close: the ball can bobble in the glove for half a second, and that half-second belongs to you. Feet on the bag, eyes on the glove, go on contact.",
      intermediate: 'This is a true 50/50 the runner tilts with technique: left foot on the bag, body already leaning home, watching the ball into the glove himself rather than waiting for the coach\'s shout. The launch is rehearsed like a sprint start.',
      expert: 'Down a run late changes the risk math — the tying run\'s value justifies sending a coin-flip that a tie game wouldn\'t. Aggression on the bases should track the scoreboard: the same throw, same arm, same window can be a green light in one score state and red in another.',
    },
  },
];
