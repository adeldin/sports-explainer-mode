// Draw and Pass — scenario data + motion math (VERBATIM from rugbycorner/draw-and-pass.html).
// The lesson is TIMING, not geometry: you've broken the line, it's two-on-one against the last man,
// and the ball must leave AFTER he's fixed but BEFORE contact. The user plays it live and taps PASS;
// the timing-window bands are only revealed on the timeline afterwards. Every verdict body and the
// 4-depth COACH'S READ copy is owner-reviewed and copied exactly. Coordinates share the rugby pitch
// viewBox (680×420), attack L→R. Pure data + math — zero RN imports.

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Outcome = 'early' | 'good' | 'late';
export type DefMode = 'hold' | 'drift' | 'rush';
export type XY = [number, number];

export interface DPVerdict { t: string; b: string }
export interface DPScenario {
  tab: string;
  earlyT: number;      // below this t the defender is NOT yet committed → the early pass feeds him
  lateT: number;       // at this t contact happens → carrier + ball are swallowed together
  c0: XY; cEnd: XY;    // carrier: start → contact point (reached at lateT)
  r0: XY; rEnd: XY;    // support runner
  d0: XY;              // the last man
  mode: DefMode;
  dEnd?: XY;           // drift/rush destination (hold has none — he holds his ground)
  dLab: string; dFill: string; dTxtFill: string;
  cover: { p0: XY; pEnd: XY } | null;  // scrambling cover behind (the rush scenario's second act)
  chase: XY[];         // the beaten defensive line, pursuing from behind — WHY it's two-on-one
  runPrompt: string;
  verd: Record<Outcome, DPVerdict>;
  why: Record<Depth, string>;
}

// ── Motion: every position is a pure function of the timeline scalar t (0..100) ──
const L = (a: XY, b: XY, f: number): XY => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
export const lerpXY = L;

export function defPos(s: DPScenario, t: number): XY {
  if (s.mode === 'hold') return [s.d0[0] + (t / 100) * 6, s.d0[1]];
  return L(s.d0, s.dEnd ?? s.d0, Math.min(1, t / s.lateT));   // drift OR rush
}
export const carrierPos = (s: DPScenario, t: number): XY => L(s.c0, s.cEnd, Math.min(1, t / s.lateT));
export const recPos = (s: DPScenario, t: number): XY => L(s.r0, s.rEnd, (t / 100) * 0.62);
export const coverPos = (s: DPScenario, t: number): XY =>
  s.cover ? L(s.cover.p0, s.cover.pEnd, t / 100) : [0, 0];
// The beaten line chases, losing ground the whole way.
export const chasePos = (s: DPScenario, i: number, t: number): XY => [s.chase[i][0] + t * 0.7, s.chase[i][1]];
// The ball rides in the carrier's hands until it's released.
export const carriedBall = (s: DPScenario, t: number): XY => {
  const cp = carrierPos(s, t);
  return [cp[0] + 11, cp[1] - 3];
};
// Where the pass is taken: a quarter of the way further along the support runner's line.
export const catchPoint = (s: DPScenario, t: number): XY => L(recPos(s, t), s.rEnd, 0.25);

// THE COMPUTED TRUTH. Never hand-declared: the release is graded purely against the window
// [earlyT, lateT] — before it the defender was never fixed; reaching lateT with the ball still in
// hand means no release at all. Truth table (t = the timeline value when PASS was tapped):
//   passT === null       → 'late'   (contact arrived first)
//   passT <  s.earlyT    → 'early'
//   earlyT <= passT      → 'good'   (the loop clamps at lateT, so passT can never exceed it)
export function outcomeFor(s: DPScenario, passT: number | null): Outcome {
  if (passT == null) return 'late';
  return passT < s.earlyT ? 'early' : 'good';
}

// Timeline bands, revealed only AFTER the attempt: amber (too early) · teal (the fix moment) · red.
export interface Band { left: number; width: number; color: string }
export const BAND_EARLY = '#F5A623', BAND_GOOD = '#14B8A6', BAND_LATE = '#e24b4a';
export function bandsFor(s: DPScenario): Band[] {
  return [
    { left: 0, width: s.earlyT, color: BAND_EARLY },
    { left: s.earlyT, width: s.lateT - s.earlyT, color: BAND_GOOD },
    { left: s.lateT, width: 100 - s.lateT, color: BAND_LATE },
  ];
}
export const STATE_LINE: Record<Outcome, string> = {
  good: 'Released inside the window',
  early: 'Released before the window',
  late: 'Never released',
};

export const T_RATE = 34;   // timeline units per second while it runs live (verbatim)
export const R_ACTOR = 12;  // player dot radius

const ATT = '#E87722', DEF = '#3B6FE0', FB = '#8e44ad', FB_LBL = '#e6d8f2', DEF_LBL = '#bcd3ff';
export const DP_COLORS = { att: ATT, def: DEF, fb: FB };

export const SCENARIOS: DPScenario[] = [
  {
    tab: 'Flat defender', earlyT: 48, lateT: 76,
    c0: [170, 250], cEnd: [398, 236],
    r0: [210, 318], rEnd: [560, 300],
    d0: [420, 232], mode: 'hold', dLab: 'FB', dFill: FB, dTxtFill: FB_LBL,
    cover: null,
    chase: [[92, 258], [118, 326]],
    runPrompt: 'The fullback is holding his ground… <b>PASS when he commits to you.</b>',
    verd: {
      early: {
        t: 'Too early — he never had to choose',
        b: 'You shipped it before the fullback was under any pressure, so he simply slid off you and lined up your support runner instead. A two-on-one only works if the one is forced to pick somebody.',
      },
      good: {
        t: 'Drawn and beaten',
        b: "You ran until the fullback had to plant and take you — then the ball left just before contact. He's committed, your 11 is through the gap, and nobody is left in front of him.",
      },
      late: {
        t: 'Too late — wrapped up ball-in-hand',
        b: 'You held past the tackle point. The fullback got both of you at once: the carrier and the ball. The window was there — it closed while you were still carrying.',
      },
    },
    why: {
      rookie: 'Run AT the defender. When he has to tackle you, pass. If he never has to choose, he can cover both of you.',
      beginner: "The pass beats the man only after the man is 'fixed' — planted, committed to the carrier. Early pass: he drifts onto your mate. Late pass: he gets you and the ball together. The release point is a stride before contact.",
      intermediate: "Watch his hips. Square to the carrier means he's bitten — release now. Still open and shuffling means he's keeping both options alive; keep running and make the question harder.",
      expert: "The carrier straightens to pin the defender's inside shoulder so he can't drift, and the ball arrives just before contact — the receiver takes it flat and at pace. Timing beats distance every time: a two-on-one finished properly is the highest-percentage attacking picture in rugby.",
    },
  },
  {
    tab: 'Drifting defender', earlyT: 60, lateT: 82,
    c0: [170, 240], cEnd: [404, 232],
    r0: [210, 316], rEnd: [560, 306],
    d0: [416, 236], mode: 'drift', dEnd: [470, 292], dLab: 'FB', dFill: FB, dTxtFill: FB_LBL,
    cover: null,
    chase: [[96, 250], [122, 318]],
    runPrompt: "He's drifting onto your support man… <b>hold it — drag him back to you first.</b>",
    verd: {
      early: {
        t: 'He was drifting — and you fed him',
        b: 'This defender was never coming for you; he was sliding onto your support man the whole way. The early pass arrived exactly where he was heading. Against a drifter you must hold longer and force him back to you.',
      },
      good: {
        t: 'You dragged him back — then released',
        b: "By holding the ball and straightening, you made the drifter abandon the slide and come tackle you. The moment he turned in, the pass went, and the space he'd been guarding opened behind him.",
      },
      late: {
        t: 'Dragged him in, then paid for it',
        b: 'You won the hard part — he stopped drifting and came for you — but you kept carrying into the hit. He swallowed carrier and ball together right at the tackle point.',
      },
    },
    why: {
      rookie: "Some defenders don't come to tackle you — they slide sideways toward your teammate. Against those, hold the ball longer.",
      beginner: "A drift defender is betting you'll pass early. The counter is patience: keep running straight at him until he has to abandon the drift and tackle you — then pass into the space he left.",
      intermediate: "The tell is his shoulders: angled toward your support man means drift. Straightening your run threatens the inside gap and forces him to respect you — that's what turns him.",
      expert: 'Drift defense trades the carrier for the touchline: slide, slide, and let the sideline make the tackle. Beating it is a game of chicken — the carrier who blinks and releases early hands the defense exactly the picture it wanted.',
    },
  },
  {
    tab: 'Rushing defender', earlyT: 28, lateT: 52,
    c0: [170, 244], cEnd: [330, 238],
    r0: [206, 320], rEnd: [560, 304],
    d0: [440, 232], mode: 'rush', dEnd: [336, 238], dLab: '7', dFill: DEF, dTxtFill: DEF_LBL,
    cover: { p0: [600, 330], pEnd: [520, 300] },
    chase: [[90, 254], [116, 322]],
    runPrompt: "He's flying up — everything happens sooner. <b>Quick hands the instant he commits.</b>",
    verd: {
      early: {
        t: 'Too early — even against the rush',
        b: "He was flying up, but he hadn't committed to you yet — so he redirected mid-stride and hammered your receiver with the ball in the air. Line speed shrinks the window; it doesn't remove the rule.",
      },
      good: {
        t: 'Beat the rush at its own game',
        b: "He sold out on the sprint to you, the ball went the instant he committed, and his speed carried him straight past you and out of the play. Your 11 is away — now it's a footrace with the scrambling fullback, and he has the head start.",
      },
      late: {
        t: 'The rush ate you alive',
        b: 'Against line speed the tackle point arrives in half the time. You held a beat too long and he smashed carrier and ball backwards behind the gainline. Fast defense punishes slow hands.',
      },
    },
    why: {
      rookie: 'When the defender sprints up fast, everything happens sooner — you still draw him, you just have far less time to do it.',
      beginner: 'A rushing defender closes the space himself, which does half your job: he commits early. But the contact comes early too, so the pass has to be ready in your hands before he arrives.',
      intermediate: "Rush defense gambles that pressure beats skill: hurried carriers pass early into the drift or hold late into the hit. Calm hands in a shrinking window is exactly the skill it's testing.",
      expert: "Beating one rusher isn't the end — at test level line breaks turn into tries only about a third of the time, and the scrambling cover, not the first man, is usually the reason. The pass must put the receiver into the seam before the cover folds: speed of ball beats speed of line.",
    },
  },
];
