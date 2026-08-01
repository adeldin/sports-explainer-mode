// Switch the Play — scenario data + pure scene math (VERBATIM from coaches-corner-spikes/switch-the-play.html).
// FULL 11v11, and the scene OPENS ALIVE: the build-up FILM plays (ball CB → 6 → RB → winger) and their
// block slides IN RESPONSE to each pass (each defender pre → p over the intro, smoothstepped in its own
// window). When the winger receives, the tape stops — everyone freezes — and the decision is yours.
// You attack RIGHT; ball with YOUR right winger on the bottom touchline. Their handedness: they defend
// the right goal, so THEIR right back is at the top — the lone man guarding the weak side.
// All fan-facing strings are prose only. Zero RN imports (data + math only).

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type StpOption = 'line' | 'pivot' | 'switch';
export type GradeKind = 'good' | 'ok' | 'bad';

export interface UsPlayer { r: string; p: Pt }
export interface ThemPlayer { r: string; p: Pt; gk?: boolean; pre?: Pt; wnd?: [number, number] }
export interface Grade { k: GradeKind; t: string; b: string }

export interface StpScenario {
  tab: string;
  answer: StpOption;
  introSec: number;
  us: UsPlayer[];
  them: ThemPlayer[];
  channel?: { space: Pt; striker: Pt };   // the vacated channel (fullback-jumped scenario)
  grade: Record<StpOption, Grade>;
  ghost: { p: Pt; txt: string };
  why: Record<Depth, string>;
}

const P = (x: number, y: number): Pt => ({ x, y });

// Shared anchors from the prototype.
export const PIVOT = P(352, 236);
export const WEAK = P(476, 64);
export const WIDX = 10;   // your ball-side winger is always the last `us` entry

// The build-up film: ball keyframes over `us` indices (seconds), and where the tape stops.
export const BUILD = { seq: [{ t: 0, i: 3 }, { t: 1.0, i: 5 }, { t: 2.2, i: 4 }, { t: 3.4, i: 10 }], end: 3.75 };

const US_BASE: UsPlayer[] = [
  { r: 'GK', p: P(44, 210) }, { r: 'LB', p: P(180, 80) }, { r: 'CB', p: P(150, 160) }, { r: 'CB', p: P(150, 270) }, { r: 'RB', p: P(368, 388) },
  { r: '6', p: PIVOT }, { r: '8', p: P(290, 190) }, { r: '10', p: P(400, 140) },
  { r: 'W', p: WEAK }, { r: 'ST', p: P(520, 300) }, { r: 'W', p: P(470, 352) },
];

export const SCENARIOS: StpScenario[] = [
  {
    tab: 'They all slid over', answer: 'switch', introSec: 3,
    us: US_BASE,
    them: [
      { r: 'GK', p: P(640, 210), gk: true },
      { r: 'LB', p: P(504, 370), pre: P(560, 330), wnd: [0.45, 1] }, { r: 'W', p: P(506, 332), pre: P(470, 260), wnd: [0.2, 0.8] },
      { r: '6', p: P(492, 282), pre: P(470, 220), wnd: [0.3, 0.9] }, { r: 'CB', p: P(470, 246), pre: P(500, 200) },
      { r: 'ST', p: P(440, 300), pre: P(380, 240), wnd: [0.25, 0.85] }, { r: '8', p: P(418, 212), pre: P(380, 190) },
      { r: 'RB', p: P(560, 96) }, { r: 'CB', p: P(566, 244), pre: P(560, 210) },
      { r: '10', p: P(250, 230) }, { r: 'W', p: P(240, 300) },
    ],
    grade: {
      switch: {
        k: 'good', t: 'Switched — into the half they abandoned',
        b: "Five defenders collapsed around the ball, which means the far side is one man guarding forty yards. It goes back to the pivot and then the driven diagonal — not the lazy floated one their number eight was waiting to cut out. Your winger takes it one-v-one with room to run. Still a duel to win — but it's the duel you want.",
      },
      line: {
        k: 'bad', t: 'Into the double team',
        b: "Their fullback and winger closed the touchline together — two on one with the paint as a third defender. That's exactly the trap the shift is built to spring. The ball dies in the corner.",
      },
      pivot: {
        k: 'ok', t: 'Safe — but the picture is expiring',
        b: 'Nothing wrong with going backwards, but you went backwards and stayed there. Every second of recycling lets their block slide across and re-balance — the one-v-one on the far side has a shelf life, and you let it tick.',
      },
    },
    ghost: { p: WEAK, txt: 'the switch was on' },
    why: {
      rookie: 'When everyone crowds the ball, the other side of the field is empty. The best pass might be the long one all the way across.',
      beginner: "Count the far side: one defender against your winger with grass everywhere. The switch isn't showing off — it's moving the ball to where the defense isn't.",
      intermediate: 'Route matters as much as idea: the flat sixty-yard ball hangs in the air and their midfielder reads it. Back to the pivot first, then the driven diagonal — two passes that arrive before the block can slide.',
      expert: 'Top teams overload one side deliberately to bait the shift, with the far winger holding maximum width the whole time. The switch is the payoff of patience — you built this picture; cash it before it re-balances.',
    },
  },
  {
    tab: 'Fullback stepped up', answer: 'line', introSec: 2.6,
    us: US_BASE,
    them: [
      { r: 'GK', p: P(640, 210), gk: true },
      { r: 'LB', p: P(498, 318), pre: P(548, 368), wnd: [0.72, 1] },          // the jump — he charges ON the final pass
      { r: 'W', p: P(452, 300), pre: P(430, 250) }, { r: '6', p: P(430, 250), pre: P(420, 215) },
      { r: '8', p: P(418, 208), pre: P(400, 190) },
      { r: 'RB', p: P(556, 72) }, { r: 'CB', p: P(556, 180), pre: P(560, 200) }, { r: 'CB', p: P(548, 268), pre: P(560, 240) },
      { r: 'ST', p: P(250, 240) }, { r: '10', p: P(380, 160), pre: P(360, 180) }, { r: 'W', p: P(300, 300) },
    ],
    channel: { space: P(590, 378), striker: P(520, 300) },
    grade: {
      line: {
        k: 'good', t: 'In behind — the channel he vacated',
        b: "Their fullback jumped up flat onto your winger, and nobody covered the grass behind him. One touch past, or the clipped ball down the line for the striker's run into the channel — the run beats the scrambling centre-back to it. Aggressive defense pays for itself in the space it leaves.",
      },
      switch: {
        k: 'bad', t: 'The far side was never open',
        b: "Look at their far winger: he stayed home, touch-tight on your man the whole time. You'd be sending a fifty-yard pass to a marked player — the interception or the immediate duel-under-pressure is the likely ending. The switch attacks emptiness; there is none over there.",
      },
      pivot: {
        k: 'ok', t: 'Safe — and the moment gone',
        b: "Recycling is never a disaster, but the fullback's gamble was a one-second offer: by the time the ball comes back around he's recovered goal-side. You declined the channel he was giving away.",
      },
    },
    ghost: { p: P(590, 378), txt: 'the channel' },
    why: {
      rookie: 'Watch the defender marking your winger: if he charges up close, the space BEHIND him is open. Knock it past and run.',
      beginner: "A fullback who steps up flat is betting he wins the ball immediately. If he doesn't, he's the one defender who can't recover in time — the ball in behind punishes the bet.",
      intermediate: "The channel needs a runner, not just a pass: your striker peeling toward the touchline is what makes the ball in behind a chance instead of a footrace for the keeper. The pass and the run are one decision.",
      expert: "This is why coaches scream 'pin him': a winger holding width forces the fullback to choose between jumping (channel opens) and sitting (winger receives freely). Either answer is playable — the read is which one he gave you.",
    },
  },
  {
    tab: 'Block set — be patient', answer: 'pivot', introSec: 2,
    us: US_BASE,
    them: [
      { r: 'GK', p: P(640, 210), gk: true },
      { r: 'LB', p: P(500, 372), pre: P(512, 362) }, { r: 'W', p: P(498, 330), pre: P(506, 320) },
      { r: '6', p: P(470, 282), pre: P(478, 274) }, { r: '8', p: P(452, 240), pre: P(458, 232) },
      { r: '10', p: P(420, 206), pre: P(426, 200) }, { r: '8', p: P(398, 168), pre: P(404, 162) },
      { r: 'RB', p: P(556, 74) }, { r: 'CB', p: P(520, 120), pre: P(526, 128) },
      { r: 'CB', p: P(560, 250), pre: P(566, 242) }, { r: 'ST', p: P(300, 220) },
    ],
    grade: {
      pivot: {
        k: 'good', t: 'Backwards to go forwards',
        b: "Everything is covered: the line is doubled, the far winger is marked, the diagonal lane is patrolled. So the ball goes back and the whole block has to shift again — and it's the shifting that eventually opens a seam. Watch the gap flash in midfield as they slide. Patience isn't passive; it's how the switch gets earned.",
      },
      line: {
        k: 'bad', t: 'Into the same double team',
        b: "Two defenders and the touchline are still waiting down there. Forcing it into a set trap isn't bravery, it's a turnover with extra steps.",
      },
      switch: {
        k: 'bad', t: 'A long ball to a marked man',
        b: "Their weak-side pair never left: your winger has a shadow and their midfielder is camped in the diagonal lane. The switch works when the far side is empty — send it now and you're kicking possession fifty yards into a coin flip.",
      },
    },
    ghost: { p: PIVOT, txt: 'move them again' },
    why: {
      rookie: "Sometimes there's no good forward pass — and that's fine. Pass it backwards, keep the ball, and make them chase until a gap opens.",
      beginner: "A set defensive block has no free man anywhere. The answer isn't a braver pass — it's moving the ball side to side until one defender is a step slow to slide. That step is the opening.",
      intermediate: "Circulation is a probing tool: every switch of the ball forces their whole block to shift, and blocks lose their shape in transit, not at rest. You're not waiting for a gap — you're manufacturing one.",
      expert: "Elite possession sides think in sequences: this recycle is pass one of the move that scores four passes later. The scoreboard for a single pass isn't 'did it go forward' — it's 'did it disorganize them.' Going backward here wins that metric.",
    },
  },
];

// ── the block slides in response to the film: pre → p, per-player window, smoothstep. Verbatim. ──
export function themPosAt(s: StpScenario, i: number, sec: number): Pt {
  const p = s.them[i];
  const kProg = Math.max(0, Math.min(1, sec / BUILD.seq[BUILD.seq.length - 1].t));
  let px: number, py: number;
  if (p.pre) {
    const w = p.wnd || [0.15, 0.95];
    let k = (kProg - w[0]) / ((w[1] - w[0]) || 1);
    k = Math.max(0, Math.min(1, k));
    k = k * k * (3 - 2 * k);                                  // smoothstep — no robot glide
    px = p.pre.x + (p.p.x - p.pre.x) * k; py = p.pre.y + (p.p.y - p.pre.y) * k;
  } else { px = p.p.x; py = p.p.y; }
  px += 2.6 * Math.sin(sec * 1.3 + i * 1.9); py += 2.6 * Math.cos(sec * 1.1 + i * 2.3);
  return { x: px, y: py };
}

export function usPosAt(s: StpScenario, i: number, sec: number): Pt {
  const p = s.us[i];
  let px = p.p.x, py = p.p.y;
  if (i === 9) px += 5 * Math.sin(sec * 1.5);            // the striker's checking runs
  if (i !== WIDX) { px += 2.6 * Math.sin(sec * 1.2 + i * 2.1); py += 2.6 * Math.cos(sec * 1.0 + i * 1.7); }
  return { x: px, y: py };
}

// ── the film's ball: travels between CURRENT carrier positions, leg by leg. Verbatim ballLiveUs. ──
export function ballAt(s: StpScenario, sec: number): Pt {
  const q = BUILD.seq;
  for (let i = 0; i < q.length - 1; i++) {
    const a = q[i], b = q[i + 1];
    if (sec >= a.t && sec <= b.t) {
      const pa = usPosAt(s, a.i, sec), pb = usPosAt(s, b.i, sec);
      const f = (sec - a.t) / ((b.t - a.t) || 1);
      const tr = Math.max(0, (f - 0.35) / 0.65);
      return { x: pa.x + (pb.x - pa.x) * tr, y: pa.y + (pb.y - pa.y) * tr };
    }
  }
  return usPosAt(s, q[q.length - 1].i, sec);
}

// Breadcrumb schedule: each pass line appears as its leg begins (35% into the segment). Verbatim.
export function breadcrumbTimes(): { at: number; fromI: number; toI: number }[] {
  const q = BUILD.seq;
  const out: { at: number; fromI: number; toI: number }[] = [];
  for (let i = 0; i < q.length - 1; i++) {
    out.push({ at: q[i].t + (q[i + 1].t - q[i].t) * 0.35, fromI: q[i].i, toI: q[i + 1].i });
  }
  return out;
}
