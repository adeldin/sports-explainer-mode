// Review or Save? — DRS review-decision data + math (VERBATIM from the
// review-or-save.html prototype). The verdict is COMPUTED from the lane geometry
// (drsVerdict), never hand-declared: pitching → impact → wickets run IN ORDER,
// with the umpire's-call band, exactly as the prototype. All fan-facing strings
// are prose only — no coordinates, variable names, or internal tokens. Strings
// may carry <b>…</b> emphasis markers, rendered as bold spans by the component.
//
// TRUTH TABLE (drsVerdict vs the authored `expect` block — proved by hand):
//  1 Plumb in front  : pitch 132 IN LINE · impact 133 IN LINE · proj 133.8, d 0.2 ≤ 12 → HITTING → OUT ✓
//  2 Loudest appeal  : pitch 155 > 148 → OUTSIDE LEG → NOT OUT (checks 2–3 never run) ✓
//  3 You're given out: pitch 114 OUTSIDE OFF · impact 115 OUTSIDE OFF + shot → NOT OUT ✓
//  4 Clipping leg    : pitch 138 IN LINE · impact 144 IN LINE · proj 148.6, d 14.6 ∈ (12,18.5] → UMPIRE'S CALL ✓
//  5 Feather behind  : gap 2.5 ≤ ball radius 4.5 → contact → OUT ✓

export type P2 = [number, number];
export type ReviewCall = 'review' | 'save';
export type GradeKey = 'good' | 'ok' | 'bad';
export type DepthKey = 'rookie' | 'beginner' | 'intermediate' | 'expert';

export interface GradeSide { k: GradeKey; bmsg: string; t: string; b: string; }
export interface RSBoard { appeal: string; umpire: 'OUT' | 'NOT OUT'; reviews: number; situ: string; }
export type WhyDepths = Record<DepthKey, string>;

export interface LbwLane { release: P2; pitch: P2; impact: P2; }
export interface EdgeLane { release: P2; pass: P2; gap: number; batEdge: number; }

export interface RSScenario {
  tab: string;
  you: 'bowling' | 'batting';
  type: 'lbw' | 'edge';
  shotOffered?: boolean;
  board: RSBoard;
  lane: LbwLane | EdgeLane;
  answer: ReviewCall;
  freeze: string;                                   // the decision prompt (may carry <b> markers)
  grade: Record<ReviewCall, GradeSide>;
  why: WhyDepths;                                   // COACH'S READ, four depths
}

// ── DRS lane geometry (tracking-panel coords) — the COMPUTED TRUTH.
//    Off side is the LEFT of the lane for this right-hander. Verbatim.
export const LANE = { C: 134, OFF: 120, LEG: 148, STUMP_Y: 330, HALF: 12, UC: 18.5, BALL_R: 4.5 };

export type Pitching = 'IN LINE' | 'OUTSIDE OFF' | 'OUTSIDE LEG';
export type Wickets = 'HITTING' | "UMPIRE'S CALL" | 'MISSING';
export type Final = 'OUT' | 'NOT OUT' | "UMPIRE'S CALL";

export interface DrsVerdict {
  pitching?: Pitching | null;
  impact?: Pitching | null;
  wickets?: Wickets | null;
  proj?: number | null;     // projected x at the stumps (panel coords — never surfaced to the fan)
  contact?: boolean;        // edge scenarios: UltraEdge spike or flat line
  final: Final;
}

// The three checks, run IN ORDER — fail one and the appeal is dead. Verbatim port.
export function drsVerdict(s: RSScenario): DrsVerdict {
  if (s.type === 'edge') {
    const lane = s.lane as EdgeLane;
    const contact = lane.gap <= LANE.BALL_R;
    return { contact, final: contact ? 'OUT' : 'NOT OUT' };
  }
  const lane = s.lane as LbwLane;
  const p = lane.pitch, i = lane.impact;
  const pitching: Pitching = p[0] > LANE.LEG ? 'OUTSIDE LEG' : (p[0] < LANE.OFF ? 'OUTSIDE OFF' : 'IN LINE');
  if (pitching === 'OUTSIDE LEG') return { pitching, impact: null, wickets: null, proj: null, final: 'NOT OUT' };
  const impact: Pitching = (i[0] >= LANE.OFF && i[0] <= LANE.LEG) ? 'IN LINE' : (i[0] < LANE.OFF ? 'OUTSIDE OFF' : 'OUTSIDE LEG');
  if (impact !== 'IN LINE' && s.shotOffered) return { pitching, impact, wickets: null, proj: null, final: 'NOT OUT' };
  const slope = (i[0] - p[0]) / (i[1] - p[1]);
  const proj = i[0] + slope * (LANE.STUMP_Y - i[1]);
  const d = Math.abs(proj - LANE.C);
  const wickets: Wickets = d <= LANE.HALF ? 'HITTING' : (d <= LANE.UC ? "UMPIRE'S CALL" : 'MISSING');
  const final: Final = wickets === 'HITTING' ? 'OUT' : (wickets === "UMPIRE'S CALL" ? "UMPIRE'S CALL" : 'NOT OUT');
  return { pitching, impact, wickets, proj, final };
}

// Lane→field mapping for the delivery on the main oval (verbatim fx/fy).
export const laneToFieldX = (laneX: number): number => 340 + (laneX - LANE.C) * 0.5;
export const laneToFieldY = (laneY: number): number => 162 + (laneY - 116) * (138 / 214);

// One replayable slice of the delivery — the scrubber walks these (the prototype's _segs).
export interface DeliverySeg { from: P2; to: P2; dur: number; beat: string; }

// The delivery, release → (pitch → pad) or (past the bat → keeper), in FIELD coords.
export function deliverySegs(s: RSScenario): DeliverySeg[] {
  const rel: P2 = [laneToFieldX(s.lane.release[0]), 162];
  if (s.type === 'edge') {
    const lane = s.lane as EdgeLane;
    const pass: P2 = [laneToFieldX(lane.pass[0]), laneToFieldY(lane.pass[1])];
    const pre: P2 = [pass[0] - 2, laneToFieldY(258)];
    return [
      { from: rel, to: pre, dur: 420, beat: 'in flight' },
      { from: pre, to: pass, dur: 240, beat: 'past the bat — listen' },
      { from: pass, to: [338, 324], dur: 300, beat: 'taken by the keeper' },
    ];
  }
  const lane = s.lane as LbwLane;
  const bounce: P2 = [laneToFieldX(lane.pitch[0]), laneToFieldY(lane.pitch[1])];
  const pad: P2 = [laneToFieldX(lane.impact[0]), laneToFieldY(lane.impact[1])];
  return [
    { from: rel, to: bounce, dur: 520, beat: 'in flight' },
    { from: bounce, to: pad, dur: 320, beat: 'PITCHED here — then into the pad' },
  ];
}

// Ball position + beat name at scrub position t (0..100 across the segs' total duration).
export function ballAtScrub(segs: DeliverySeg[], t: number): { p: P2; beat: string } {
  const total = segs.reduce((a, x) => a + x.dur, 0);
  let e = (Math.max(0, Math.min(100, t)) / 100) * total;
  let beat = segs[0].beat;
  for (const seg of segs) {
    if (e <= seg.dur) {
      const k = seg.dur ? e / seg.dur : 1;
      return { p: [seg.from[0] + (seg.to[0] - seg.from[0]) * k, seg.from[1] + (seg.to[1] - seg.from[1]) * k], beat: seg.beat };
    }
    e -= seg.dur; beat = seg.beat;
  }
  const last = segs[segs.length - 1];
  return { p: last.to, beat };
}

// LED-board sub-line after the tracking lands — the token economics, verbatim.
export function tokenSub(s: RSScenario, opt: ReviewCall, v: DrsVerdict): string {
  const r = s.board.reviews;
  if (opt === 'save') return `REVIEWS LEFT: ${r} — TOKEN BANKED`;
  if (v.final === "UMPIRE'S CALL") return `UMPIRE'S CALL — REVIEW RETAINED: ${r} LEFT`;
  const overturn = (v.final === 'OUT' && s.board.umpire === 'NOT OUT') || (v.final === 'NOT OUT' && s.board.umpire === 'OUT');
  return overturn ? `OVERTURNED — REVIEW RETAINED: ${r} LEFT` : `REVIEW LOST — ${r - 1} LEFT`;
}

// ── the five appeals (copy verbatim from the prototype) ──
export const RS_SCENARIOS: RSScenario[] = [
  {
    tab: 'Plumb in front', you: 'bowling', type: 'lbw', shotOffered: true,
    board: { appeal: 'LBW — HUGE', umpire: 'NOT OUT', reviews: 1, situ: 'TEST · OV 63' },
    lane: { release: [128, 116], pitch: [132, 252], impact: [133, 296] },
    answer: 'review',
    freeze: "Struck on the pad, dead in front — and the umpire <b>shakes his head</b>. You're the bowling captain with one review in the bank. <b>DRS lets you challenge him</b> — but a failed review is gone for the innings.",
    grade: {
      review: {
        k: 'good', bmsg: 'OUT — OVERTURNED',
        t: 'Three reds — the finger goes up after all',
        b: 'Tracking agrees with your eyes: pitched in line, struck in line, crashing into middle stump. All three checks come back red and the not-out is overturned. When a ball looks THIS plumb, the geometry usually backs you.',
      },
      save: {
        k: 'bad', bmsg: 'WICKET MISSED',
        t: 'You sat on a wicket',
        b: 'The ghost tracking shows what you left upstairs: three reds — pitched in line, struck in line, hitting middle. Saving reviews is a virtue, but a review is only worth something if you spend it on balls exactly like this one.',
      },
    },
    why: {
      rookie: 'LBW means the pad blocked a ball that was going to hit the stumps. The umpire said no — but DRS lets you ask the cameras. When it looks this obviously out, ask.',
      beginner: 'Tracking answers three questions in order: did it pitch in line (or outside off)? Did it strike the pad in line? Was it hitting the stumps? Three reds = out. A ball struck in front of middle stump on a straight line ticks all three.',
      intermediate: 'Only about 26% of player reviews get overturned — most challenges fail — so the skill is picking the cast-iron ones. Dead-in-front, low bounce, no inside edge is as cast-iron as LBW gets. Spend the token here, not on hopeful shouts.',
      expert: 'From a 2,100-review sample: bowling-side reviews succeed only ~20–25%, and LBW makes up ~74% of all referrals while succeeding just ~22% — because captains review noise, not geometry. The discipline that wins DRS is binary: plumb gets the token instantly, everything marginal gets saved. This is the plumb one.',
    },
  },
  {
    tab: 'The loudest appeal', you: 'bowling', type: 'lbw', shotOffered: true,
    board: { appeal: 'LBW — ALL 11 UP', umpire: 'NOT OUT', reviews: 1, situ: 'T20 · OV 15' },
    lane: { release: [140, 116], pitch: [155, 262], impact: [149, 298] },
    answer: 'save',
    freeze: "The whole team is up — loudest appeal of the day, and it LOOKED stone dead. But watch the replay in your head: <b>where did it bounce?</b> If the ball pitches outside the leg-stump line, LBW is impossible — no matter what happens after.",
    grade: {
      review: {
        k: 'bad', bmsg: 'REVIEW LOST',
        t: 'Dead at the first check',
        b: 'Tracking never even projects the path: PITCHING — OUTSIDE LEG, and the appeal is over. The law kills any LBW that pitches outside the line of leg stump, however plumb the rest looked. You reviewed the noise, and the noise cost you your last token.',
      },
      save: {
        k: 'good', bmsg: 'GOOD SAVE',
        t: 'Drama is not geometry',
        b: "The ghost tracking confirms it: pitched outside leg — first check blue, appeal dead. Eleven players screaming doesn't move the bounce point an inch. You kept your review for a ball where the geometry, not the adrenaline, says out.",
      },
    },
    why: {
      rookie: "There's a rule that surprises everyone: if the ball BOUNCES on the leg side of the stumps, the batter can't be out LBW — ever. This one bounced there. Loud doesn't mean out.",
      beginner: "The three DRS checks run in order, and the first one is where the ball pitched. Outside the leg-stump line = automatic not out; the cameras never even bother projecting the rest. That's why calm captains ask 'where did it bounce?' before anything else.",
      intermediate: 'Appeal volume is the worst review signal in cricket — the fielders behind the ball have the worst angle on the bounce point. Roughly three of four reviews fail, and pitched-outside-leg is the most common instant kill. One calm look at the crease beats eleven convinced teammates.',
      expert: 'The outside-leg law exists to stop negative leg-line bowling, and it makes one class of appeal unreviewable by definition. Elite sides assign the review call to the keeper and bowler ONLY — they have the line — and the data backs it: emotional team reviews are a large share of the ~75% that die. Process beats passion; save it.',
    },
  },
  {
    tab: "You're given out", you: 'batting', type: 'lbw', shotOffered: true,
    board: { appeal: 'GIVEN OUT — LBW', umpire: 'OUT', reviews: 1, situ: 'ODI · OV 41' },
    lane: { release: [118, 116], pitch: [114, 255], impact: [115, 297] },
    answer: 'review',
    freeze: "This time <b>you're the batter</b> — finger's up, you're given out LBW. But you were pushing forward at it, and it struck you OUTSIDE the off-stump line. <b>Struck outside off while playing a shot can't be LBW.</b> Trust your legs?",
    grade: {
      review: {
        k: 'good', bmsg: 'NOT OUT — SAVED',
        t: 'The shot saved you — and you knew it',
        b: 'Second check: IMPACT — OUTSIDE OFF, shot offered. Not out, overturned, batter reprieved. You were struck beyond the off-stump line while genuinely playing at the ball, and that protection is absolute. Walking on that decision would have been giving your wicket away.',
      },
      save: {
        k: 'bad', bmsg: 'OUT STANDS — GONE',
        t: 'You walked on a bad decision',
        b: 'The ghost tracking shows the truth you left in your pocket: impact outside off with a shot offered — not out every time. Batters know where they were struck better than anyone on the field. You had the evidence on your pads and didn\'t use it.',
      },
    },
    why: {
      rookie: "You can only be LBW if the ball hits you in front of the stumps — roughly between the two sets. Hit OUTSIDE the off-stump line while you're swinging the bat? Not out. This one hit you outside the line.",
      beginner: "The impact check has a twist: struck outside the off-stump line is not out — but ONLY if you offered a shot. Shoulder arms and leave it, and that protection disappears; then only 'hitting the stumps' matters. He was playing at it, so the law is on his side.",
      intermediate: 'Batting reviews succeed about 34% of the time versus ~20–25% for bowling reviews — the batter is the one person who KNOWS where it struck and whether he hit it. When your own legs tell you the impact was outside off mid-shot, that\'s a high-information review, not a hopeful one.',
      expert: 'The no-shot nuance is the expert trap: padding up outside off surrenders the impact protection, which is why bowlers attack batters who leave on length. Here the shot was offered, so the review is near-certain — and the asymmetry (34% batting vs ~22% LBW-overall success) is exactly why teams let the striker, not the dressing room, own this call.',
    },
  },
  {
    tab: 'Clipping leg stump', you: 'bowling', type: 'lbw', shotOffered: true,
    board: { appeal: 'LBW — CLOSE', umpire: 'NOT OUT', reviews: 1, situ: 'TEST · OV 71' },
    lane: { release: [130, 116], pitch: [138, 256], impact: [144, 298] },
    answer: 'save',
    freeze: "Pad first, but he was a long way forward — your gut says it's <b>shaving leg stump</b>, no more. Here's the law: when tracking is that marginal, <b>umpire's call</b> keeps his decision. He said not out. What does a review actually buy you?",
    grade: {
      review: {
        k: 'ok', bmsg: "UMPIRE'S CALL",
        t: 'Retained — but you gained nothing',
        b: "Projection: clipping the outside of leg — less than half the ball hitting. That's UMPIRE'S CALL: his not-out stands, and because the tech didn't clearly contradict him you keep your review. No harm done, but no reward either — ninety seconds of theatre for a guaranteed nothing.",
      },
      save: {
        k: 'good', bmsg: 'GOOD SAVE',
        t: 'You read the margin correctly',
        b: "The ghost projection shows amber: clipping leg — umpire's call, not-out stands either way. A review can only win when the tech would OVERTURN, and a ball shaving the stump never overturns a not-out. You banked the token and lost nothing at all.",
      },
    },
    why: {
      rookie: "When the cameras say the ball would only just clip the stumps, the tech isn't sure enough to overrule a human — so the umpire's original answer stands. He said not out, so this review can't win.",
      beginner: "'Umpire's call' = less than half the ball projected to hit. The on-field decision stays, and your review is handed back. Sounds harmless — but it means marginal balls can NEVER be overturned. Only review when you think it's clearly hitting, not clipping.",
      intermediate: "Around 30% of all ball-tracking reviews end umpire's call — nearly a third of challenges are structurally incapable of changing the decision. The question before reviewing is never 'might it be hitting?' It's 'would tracking show MORE than half the ball hitting?' Shaving leg fails that test by definition.",
      expert: "Post-2023 playing conditions sweetened umpire's call — the review is retained, so the expected cost is ~zero — which is why modern captains fire more marginal reviews late in innings when tokens would otherwise expire unused. But mid-innings the calculus holds: an umpire's-call review converts 0% of the time and burns your bowler's reset window. Save it and plan the next over instead.",
    },
  },
  {
    tab: 'Feather behind', you: 'bowling', type: 'edge',
    board: { appeal: 'CAUGHT BEHIND?', umpire: 'NOT OUT', reviews: 1, situ: 'T20 · OV 9' },
    lane: { release: [136, 116], pass: [150, 300], gap: 2.5, batEdge: 146 },
    answer: 'review',
    freeze: "A tiny noise as it passed the bat — your keeper is <b>certain</b>, the umpire isn't. This is a keeper-catch review: UltraEdge listens to a stump microphone for a spike as ball passes bat. Best overturn odds in the whole system. Go up?",
    grade: {
      review: {
        k: 'good', bmsg: 'EDGE — OUT',
        t: "The spike doesn't lie",
        b: 'UltraEdge shows a clean spike exactly as ball passes bat: feather, caught, overturned. Keeper-catch reviews overturn about 40% of the time — the best odds in the system — because the two people closest to the noise (keeper and bowler) are the ones asking for it.',
      },
      save: {
        k: 'bad', bmsg: 'EDGE MISSED',
        t: 'The best odds in the book, declined',
        b: "The ghost UltraEdge shows the spike you didn't ask for: a clear feather through to the gloves. Your keeper hears edges for a living — when he's certain and the price is one token at 40% odds, that's the bet the whole review system was built for.",
      },
    },
    why: {
      rookie: 'Sometimes the ball just kisses the edge of the bat on its way to the keeper — too faint for the umpire to hear over the crowd. A microphone in the stumps catches it. Your keeper heard it; ask the mic.',
      beginner: "This review isn't ball-tracking — it's sound. UltraEdge lines up the stump-mic waveform with the video frame where ball passes bat: a spike at that exact frame = contact = out. Flat line = not out. One frame, one answer.",
      intermediate: 'Keeper-catch reviews overturn at ~40% — nearly double the ~26% overall rate — because the evidence is physical and the witnesses are the closest humans to it. A certain keeper plus a certain bowler is the strongest review signal cricket has. Weigh WHO is asking, not how loud.',
      expert: "The review market has one clear inefficiency: sides burn tokens on 22%-success LBW shouts and under-use 40%-success edge appeals. The reason is theatre — LBWs look out, feathers are invisible. Building a hierarchy (keeper's ears > bowler's eyes > slip's guess > everyone else's enthusiasm) and betting the token accordingly is worth real wickets over a season.",
    },
  },
];

// The footer law line — inline teaching that ships with the module (verbatim).
export const RS_FOOT = "LBW = leg-before-wicket: pad blocks a ball that was hitting the stumps · tracking checks three things IN ORDER — where it pitched, where it struck, where it was going · umpire's call keeps your review · HOWZAT = the appeal, literally “how is that, umpire?”";

// The module intro line (the prototype's subtitle — sets up what DRS is).
export const RS_SUB = 'The umpire has answered — now the DRS question: challenge his call with ball-tracking, or bank your review for later? Each side only holds a couple, and a failed one is gone.';
