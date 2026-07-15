import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { SignalKey } from './signalDecoder';

// ============================================================================
// Signal Decoder — ART MODULE (v2: ANIMATED). Every official-signal pictogram
// lives HERE and only here (build doc §0.4: art is swappable in ONE file).
//
// v2 rework notes:
// - Signals are MOTIONS, not poses. Each signal is a short looping animation
//   described as KEYFRAMES of limb positions, interpolated per-frame. A signal
//   that is genuinely static (a held card, a pointing arm) is one keyframe.
// - The figure is a filled SILHOUETTE (solid head/torso, thick rounded limbs)
//   — filled shapes read far better at phone size than hairline stick figures.
// - HANDS (v2.1 owner-QA pass): the default hand is a clean solid BALL. Finger
//   glyphs appear ONLY where fingers ARE the meaning: an exact even count
//   (point/two/three), or open-vs-closed as the signal itself (palm = slab +
//   even 5-finger fan; flat = paddle). No decorative splays — they read mangled.
// - Overlap legibility: every limb is drawn twice — a wider background-colored
//   "outline" pass, then the fill pass — so arms crossing the head, torso, or
//   each other stay cleanly separated (this fixes v1's mangled-head bug).
//   Draw order: legs → torso → head → arms (arms LAST: the pose is the info).
// - The core below the QA-PURE markers is 100% pure TypeScript (no React), so
//   the render-QA pipeline can rasterize the exact same output outside RN.
// - Animation driver: raw requestAnimationFrame + setState — the house pattern
//   (WheresThePlayGame / FindTheOpenMan). No Lottie, no Reanimated for figures.
// ============================================================================

// ─── QA-PURE-START ──────────────────────────────────────────────────────────

export const SIGNAL_VB = { w: 400, h: 440 };
export const SIGNAL_RATIO = SIGNAL_VB.w / SIGNAL_VB.h;

// Fixed pictogram palette (a referee looks the same in every app theme).
const SG = {
  bg: '#0a1733',
  panel: '#0f2044',
  line: '#2a3a5e',
  body: '#F4F4EE',    // chalk-white silhouette
  accent: '#F5A623',  // amber: meaning-bearing props only
  cardY: '#FFD60A',
  cardR: '#FF3B30',
  muted: '#8fa9d6',
};

// ── primitive descriptors (what a frame renders down to) ────────────────────
export type Prim =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; c: string; dash?: string }
  | { k: 'circle'; cx: number; cy: number; r: number; f?: string; s?: string; sw?: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number; rx?: number; f?: string; s?: string; sw?: number; dash?: string }
  | { k: 'poly'; pts: string; f: string }
  | { k: 'path'; d: string; f?: string; s?: string; sw?: number; dash?: string };

// ── skeleton geometry ────────────────────────────────────────────────────────
type Pt = { x: number; y: number };
// HAND POLICY (owner QA pass): the default hand is a clean solid BALL. Fingers
// appear ONLY where they carry the meaning (a count, or open-vs-closed IS the
// signal). Every finger glyph is an even, unambiguous fan — no lopsided splays.
type Grip =
  | 'none'    // default hand: clean knuckle ball
  | 'fist'    // emphatic fist: slightly bigger ball
  | 'palm'    // OPEN hand (meaning-bearing): palm slab + even 5-finger fan
  | 'point'   // ball + ONE long index finger (obviously singular)
  | 'flat'    // flat blade/paddle hand along the forearm (sweeps, chops, taps)
  | 'two' | 'three'  // ball + exactly N clean evenly-spaced fingers (counts only)
  | 'thumb'   // ball + one short upward thumb stub (jump ball only)
  | 'cardY' | 'cardR' // holding a card
  | 'flag';   // holding an assistant referee's flag

interface Arm { e: Pt; h: Pt; grip: Grip }           // elbow, hand
interface Legs { l: [Pt, Pt]; r: [Pt, Pt] }          // [knee, foot] per leg
interface Frame { l: Arm; r: Arm; legs?: Legs }

interface SignalAnim {
  frames: Frame[];              // 1 frame = a genuinely static signal
  loopMs?: number;              // full loop duration (default 1500)
  mode?: 'pingpong' | 'cycle';  // pingpong: A→B→A sweep; cycle: wrap (rotations)
  ease?: 'sine' | 'linear';     // per-segment easing (default sine; linear for circles)
  holdT?: number;               // progress to freeze at once answered (default: peak)
  back?: Prim[];                // static props drawn BEHIND the figure (net, spot…)
  front?: Prim[];               // static props drawn IN FRONT (TV box, held ball…)
  linkHands?: boolean;          // draw an amber "stick shaft" between the two hands
}

const HEAD = { cx: 200, cy: 64, r: 30 };
const SHOULDER_L: Pt = { x: 166, y: 118 };
const SHOULDER_R: Pt = { x: 234, y: 118 };
const HIP_L: Pt = { x: 182, y: 248 };
const HIP_R: Pt = { x: 218, y: 248 };
const ARM_W = 15;
const LEG_W = 16;
const OUTLINE = 7; // extra width of the separation pass

const DEFAULT_LEGS: Legs = {
  l: [{ x: 174, y: 330 }, { x: 164, y: 406 }],
  r: [{ x: 226, y: 330 }, { x: 236, y: 406 }],
};

// ── math ─────────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const unit = (a: Pt, b: Pt): Pt => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m };
};
const rot = (v: Pt, deg: number): Pt => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};
const add = (p: Pt, v: Pt, k: number): Pt => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const easeSine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);

// ── limb rendering (outline pass + fill pass) ────────────────────────────────
const seg = (a: Pt, b: Pt, w: number, c: string): Prim =>
  ({ k: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, w, c });

// A hand glyph as [outlinePrims, fillPrims] so the whole arm can be layered.
function handPrims(arm: Arm): { out: Prim[]; fill: Prim[] } {
  const { e, h, grip } = arm;
  const u = unit(e, h);
  const out: Prim[] = [];
  const fill: Prim[] = [];
  const dot = (c: Pt, r: number) => {
    out.push({ k: 'circle', cx: c.x, cy: c.y, r: r + OUTLINE / 2, f: SG.panel });
    fill.push({ k: 'circle', cx: c.x, cy: c.y, r, f: SG.body });
  };
  const ray = (a: Pt, b: Pt, w: number) => {
    out.push(seg(a, b, w + OUTLINE, SG.panel));
    fill.push(seg(a, b, w, SG.body));
  };
  switch (grip) {
    // Default + fist: a clean solid ball. No spokes, no nubs — at phone scale a
    // round knuckle ball is the only closed-hand shape that never reads mangled.
    case 'none': dot(h, 10); break;
    case 'fist': dot(h, 12); break;
    // Open hand: a solid palm slab with an EVEN fan of exactly 5 fingers. The
    // slab is drawn after the finger fills so the fingers emerge from a solid
    // palm instead of radiating from a bare point (v2's "broken star" bug).
    case 'palm': {
      [-36, -18, 0, 18, 36].forEach(a => ray(h, add(h, rot(u, a), 24), 5.5));
      ray(add(h, u, -8), add(h, u, 0), 16); // palm slab covers the finger bases
      break;
    }
    // One finger: knuckle ball + a single LONG index finger along the forearm
    // line — long enough that "exactly one finger" is unmistakable.
    case 'point': dot(h, 10); ray(h, add(h, u, 30), 7); break;
    // Flat hand: a clean paddle continuing the forearm, visibly WIDER than the
    // arm and ring-separated at the wrist (was a perpendicular bar, which read
    // as a mallet/claw at phone size).
    case 'flat': ray(add(h, u, -2), add(h, u, 14), 20); break;
    // Finger counts: knuckle ball + exactly N clean, evenly spaced fingers.
    case 'two': case 'three': {
      dot(h, 10);
      (grip === 'two' ? [-14, 14] : [-20, 0, 20]).forEach(a => ray(h, add(h, rot(u, a), 27), 6));
      break;
    }
    // Thumbs-up: ball + one SHORT screen-up stub (short + stubby so it can never
    // be misread as a 1-finger point, which is long and along the forearm).
    case 'thumb': dot(h, 11); ray(h, { x: h.x, y: h.y - 22 }, 10); break;
    case 'cardY': case 'cardR': {
      const c = add(h, u, 18);
      out.push({ k: 'rect', x: c.x - 16, y: c.y - 22, w: 32, h: 44, rx: 5, f: SG.panel });
      fill.push({ k: 'rect', x: c.x - 14, y: c.y - 20, w: 28, h: 40, rx: 4, f: grip === 'cardY' ? SG.cardY : SG.cardR });
      fill.push({ k: 'circle', cx: h.x, cy: h.y, r: 10, f: SG.body });
      break;
    }
    case 'flag': {
      const tip = add(h, u, 56);
      const mid = add(h, u, 30);
      const p = rot(u, 90);
      const f1 = add(mid, p.y < 0 ? p : rot(u, -90), 22);
      out.push(seg(h, tip, 5 + OUTLINE, SG.panel));
      fill.push(seg(h, tip, 5, SG.body));
      fill.push({ k: 'poly', pts: `${tip.x},${tip.y} ${mid.x},${mid.y} ${f1.x},${f1.y}`, f: SG.accent });
      fill.push({ k: 'circle', cx: h.x, cy: h.y, r: 10, f: SG.body });
      break;
    }
  }
  return { out, fill };
}

function armPrims(shoulder: Pt, arm: Arm): Prim[] {
  const hand = handPrims(arm);
  return [
    // outline pass (separates this arm from whatever is behind it)
    seg(shoulder, arm.e, ARM_W + OUTLINE, SG.panel),
    seg(arm.e, arm.h, ARM_W + OUTLINE, SG.panel),
    // fill pass
    seg(shoulder, arm.e, ARM_W, SG.body),
    seg(arm.e, arm.h, ARM_W, SG.body),
    // hand LAST, outline included — the hand's outline draws OVER the arm fill,
    // cutting a thin separation ring at the wrist so the ball/paddle/finger-fan
    // reads as a distinct HAND, not a bulge of the forearm (owner-QA fix: with
    // the old order the arm fill swallowed the glyph and hands vanished).
    ...hand.out,
    ...hand.fill,
  ];
}

function legPrims(hip: Pt, knee: Pt, foot: Pt): Prim[] {
  return [
    seg(hip, knee, LEG_W + OUTLINE, SG.panel),
    seg(knee, foot, LEG_W + OUTLINE, SG.panel),
    seg(hip, knee, LEG_W, SG.body),
    seg(knee, foot, LEG_W, SG.body),
  ];
}

function figurePrims(f: Frame): Prim[] {
  const legs = f.legs ?? DEFAULT_LEGS;
  return [
    // legs
    ...legPrims(HIP_L, legs.l[0], legs.l[1]),
    ...legPrims(HIP_R, legs.r[0], legs.r[1]),
    // torso: filled tapered slab, rounded by its own stroke
    {
      k: 'path',
      d: `M ${SHOULDER_L.x + 4} 112 L ${SHOULDER_R.x - 4} 112 L 222 250 L 178 250 Z`,
      f: SG.body, s: SG.body, sw: 18,
    },
    // head (before arms; its outline ring separates it from the torso)
    { k: 'circle', cx: HEAD.cx, cy: HEAD.cy, r: HEAD.r, f: SG.body, s: SG.panel, sw: 5 },
    // arms LAST — arm/hand position is the entire information channel
    ...armPrims(SHOULDER_L, f.l),
    ...armPrims(SHOULDER_R, f.r),
  ];
}

// ── shared poses ─────────────────────────────────────────────────────────────
const REST_L: Arm = { e: { x: 154, y: 180 }, h: { x: 160, y: 236 }, grip: 'none' };
const REST_R: Arm = { e: { x: 246, y: 180 }, h: { x: 240, y: 236 }, grip: 'none' };
// (hand y=20: even the default knuckle ball stays clear of the panel's top edge)
const UP_L = (grip: Grip = 'none'): Arm => ({ e: { x: 160, y: 66 }, h: { x: 156, y: 20 }, grip });
const UP_R = (grip: Grip = 'none'): Arm => ({ e: { x: 240, y: 66 }, h: { x: 244, y: 20 }, grip });
// "Up with a hand glyph": lower still so the finger/palm fan is never clipped by
// the panel's top edge (QA finding — the NBA fist/palm pair depends on it).
const UPG_L = (grip: Grip): Arm => ({ e: { x: 162, y: 80 }, h: { x: 157, y: 36 }, grip });
const UPG_R = (grip: Grip): Arm => ({ e: { x: 238, y: 80 }, h: { x: 243, y: 36 }, grip });
const OUT_L = (grip: Grip = 'none'): Arm => ({ e: { x: 120, y: 118 }, h: { x: 64, y: 118 }, grip });
const OUT_R = (grip: Grip = 'none'): Arm => ({ e: { x: 280, y: 118 }, h: { x: 336, y: 118 }, grip });
const HIPS_L: Arm = { e: { x: 138, y: 170 }, h: { x: 172, y: 216 }, grip: 'fist' };
const HIPS_R: Arm = { e: { x: 262, y: 170 }, h: { x: 228, y: 216 }, grip: 'fist' };

// Generated keyframes: two fists orbiting a common center (rolling / rotating fists).
function rollingFists(): Frame[] {
  const C = { x: 200, y: 184 }, R = 26, N = 8;
  return Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    const lh = { x: C.x + R * Math.cos(a + Math.PI), y: C.y + R * Math.sin(a + Math.PI) };
    const rh = { x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) };
    return {
      l: { e: { x: 148, y: 184 }, h: lh, grip: 'fist' as Grip },
      r: { e: { x: 252, y: 184 }, h: rh, grip: 'fist' as Grip },
    };
  });
}

// Generated keyframes: one hand tracing a circle overhead (home run / free hit).
// Circle sits low enough that the pointing finger (which extends ~33 beyond the
// wrist, roughly upward all the way around since the elbow stays below the
// circle) never clips the panel top, and right enough to clear the head.
function overheadCircle(grip: Grip): Frame[] {
  const C = { x: 262, y: 64 }, R = 20, N = 8;
  return Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return {
      l: REST_L,
      r: { e: { x: 258, y: 110 }, h: { x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) }, grip },
    };
  });
}

// Dashed "TV screen" box (VAR / TMO / cricket referral).
const tvBox = (x: number, y: number, w: number, h: number): Prim =>
  ({ k: 'rect', x, y, w, h, rx: 8, f: undefined, s: SG.accent, sw: 5, dash: '11 9' });

// ============================================================================
// THE SIGNALS — one animation per SignalKey (compiler-enforced exhaustive).
// Verified against: the NFL signal chart, umpire mechanics manuals (UmpireBible
// / NFHS), NBA-FIBA-NFHS basketball mechanics, USA Hockey Appendix 3, IFAB Laws
// + assistant-referee guides, World Rugby match-official signals, and MCC Laws
// of Cricket Law 2.13.
// ============================================================================
export const SIGNAL_ANIMS: Record<SignalKey, SignalAnim> = {

  // ── MLB (umpire) ───────────────────────────────────────────────────────────
  // Strike: the arm fires out to the side — an emphatic point. (Balls get NO signal.)
  'mlb-strike': {
    frames: [
      { l: REST_L, r: { e: { x: 244, y: 156 }, h: { x: 206, y: 150 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
    ],
    loopMs: 1400,
  },
  // Out: the "hammer" — cocked fist punched forward.
  'mlb-out': {
    frames: [
      { l: REST_L, r: { e: { x: 248, y: 120 }, h: { x: 244, y: 62 }, grip: 'fist' } },
      { l: REST_L, r: { e: { x: 276, y: 132 }, h: { x: 322, y: 152 }, grip: 'fist' } },
      { l: REST_L, r: { e: { x: 276, y: 132 }, h: { x: 322, y: 152 }, grip: 'fist' } },
    ],
    loopMs: 1300,
  },
  // Safe: flat hands cross low, then SWEEP wide apart.
  'mlb-safe': {
    frames: [
      {
        l: { e: { x: 166, y: 190 }, h: { x: 212, y: 206 }, grip: 'flat' },
        r: { e: { x: 234, y: 190 }, h: { x: 188, y: 206 }, grip: 'flat' },
      },
      {
        l: { e: { x: 118, y: 142 }, h: { x: 62, y: 148 }, grip: 'flat' },
        r: { e: { x: 282, y: 142 }, h: { x: 338, y: 148 }, grip: 'flat' },
      },
      {
        l: { e: { x: 118, y: 142 }, h: { x: 62, y: 148 }, grip: 'flat' },
        r: { e: { x: 282, y: 142 }, h: { x: 338, y: 148 }, grip: 'flat' },
      },
    ],
    loopMs: 1700,
  },
  // Time / dead ball (same mechanic covers foul ball): both hands straight up, HELD.
  'mlb-time': { frames: [{ l: UPG_L('palm'), r: UPG_R('palm') }] },
  // Fair ball: silent point down into fair territory, held.
  'mlb-fair': { frames: [{ l: REST_L, r: { e: { x: 258, y: 162 }, h: { x: 310, y: 198 }, grip: 'point' } }] },
  // Home run: index finger circling overhead.
  'mlb-homerun': { frames: overheadCircle('point'), mode: 'cycle', ease: 'linear', loopMs: 1500 },
  // Infield fly: arm straight up, finger pointing skyward, held.
  'mlb-infield-fly': { frames: [{ l: REST_L, r: { e: { x: 238, y: 82 }, h: { x: 243, y: 44 }, grip: 'point' } }] },
  // The count: balls on the left hand, strikes on the right (3–2 shown), held.
  'mlb-count': {
    frames: [{
      l: { e: { x: 146, y: 160 }, h: { x: 140, y: 104 }, grip: 'three' },
      r: { e: { x: 254, y: 160 }, h: { x: 260, y: 104 }, grip: 'two' },
    }],
  },
  // Foul tip: one flat hand brushes up and off the back of the other (both flat
  // paddles — the brushing MOTION is the signal, fingers carry no meaning here).
  'mlb-foul-tip': {
    frames: [
      {
        l: { e: { x: 158, y: 182 }, h: { x: 196, y: 170 }, grip: 'flat' },
        r: { e: { x: 250, y: 152 }, h: { x: 212, y: 152 }, grip: 'flat' },
      },
      {
        l: { e: { x: 158, y: 182 }, h: { x: 196, y: 170 }, grip: 'flat' },
        r: { e: { x: 242, y: 120 }, h: { x: 272, y: 96 }, grip: 'flat' },
      },
    ],
    loopMs: 1100,
  },
  // Delayed dead ball: LEFT arm extended horizontally, fist, HELD while play runs.
  'mlb-delayed-dead': { frames: [{ l: OUT_L('fist'), r: REST_R }] },

  // ── NFL (referee) ──────────────────────────────────────────────────────────
  // Touchdown (also FG/XP good): both arms straight up, held still.
  'nfl-touchdown': { frames: [{ l: UP_L(), r: UP_R() }] },
  // Incomplete pass (also no good / declined): flat hands cross and SWEEP apart, repeating.
  'nfl-incomplete': {
    frames: [
      {
        l: { e: { x: 162, y: 172 }, h: { x: 240, y: 172 }, grip: 'flat' },
        r: { e: { x: 238, y: 172 }, h: { x: 160, y: 172 }, grip: 'flat' },
      },
      {
        l: { e: { x: 118, y: 140 }, h: { x: 62, y: 140 }, grip: 'flat' },
        r: { e: { x: 282, y: 140 }, h: { x: 338, y: 140 }, grip: 'flat' },
      },
    ],
    loopMs: 1250,
  },
  // First down: the arm swings up to point downfield and holds.
  'nfl-first-down': {
    frames: [
      { l: REST_L, r: { e: { x: 246, y: 152 }, h: { x: 212, y: 146 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
    ],
    loopMs: 1800,
  },
  // Holding: one hand GRASPS the opposite wrist (fists) and tugs DOWNWARD.
  'nfl-holding': {
    frames: [
      {
        l: { e: { x: 152, y: 178 }, h: { x: 216, y: 184 }, grip: 'fist' },
        r: { e: { x: 250, y: 178 }, h: { x: 202, y: 186 }, grip: 'fist' },
      },
      {
        l: { e: { x: 156, y: 192 }, h: { x: 218, y: 212 }, grip: 'fist' },
        r: { e: { x: 252, y: 192 }, h: { x: 204, y: 214 }, grip: 'fist' },
      },
    ],
    loopMs: 1200,
  },
  // Illegal use of hands: grasps the wrist, but the free hand is an OPEN PALM that
  // rises toward the face (vs holding: fist tugged DOWNWARD — the expert pair).
  'nfl-illegal-hands': {
    frames: [
      {
        l: { e: { x: 152, y: 178 }, h: { x: 212, y: 184 }, grip: 'fist' },
        r: { e: { x: 248, y: 168 }, h: { x: 202, y: 172 }, grip: 'palm' },
      },
      {
        l: { e: { x: 152, y: 164 }, h: { x: 208, y: 150 }, grip: 'fist' },
        r: { e: { x: 242, y: 146 }, h: { x: 200, y: 128 }, grip: 'palm' },
      },
    ],
    loopMs: 1200,
  },
  // False start: forearms ROLLING over each other (full rotation).
  'nfl-false-start': { frames: rollingFists(), mode: 'cycle', ease: 'linear', loopMs: 1100 },
  // Offside / encroachment: hands on hips, held.
  'nfl-offside': { frames: [{ l: HIPS_L, r: HIPS_R }] },
  // Pass interference: open hands PUSHED forward from the shoulders.
  'nfl-pass-interference': {
    frames: [
      {
        l: { e: { x: 152, y: 160 }, h: { x: 174, y: 178 }, grip: 'palm' },
        r: { e: { x: 248, y: 160 }, h: { x: 226, y: 178 }, grip: 'palm' },
      },
      {
        l: { e: { x: 140, y: 172 }, h: { x: 96, y: 208 }, grip: 'palm' },
        r: { e: { x: 260, y: 172 }, h: { x: 304, y: 208 }, grip: 'palm' },
      },
      {
        l: { e: { x: 140, y: 172 }, h: { x: 96, y: 208 }, grip: 'palm' },
        r: { e: { x: 260, y: 172 }, h: { x: 304, y: 208 }, grip: 'palm' },
      },
    ],
    loopMs: 1300,
  },
  // Personal foul: one wrist STRIKES down on the other, clear ABOVE the head
  // (QA fix: the whole action lives above the head so nothing crosses the face).
  'nfl-personal-foul': {
    frames: [
      {
        l: { e: { x: 146, y: 60 }, h: { x: 208, y: 26 }, grip: 'fist' },
        r: { e: { x: 256, y: 62 }, h: { x: 266, y: 26 }, grip: 'fist' },
      },
      {
        l: { e: { x: 146, y: 60 }, h: { x: 208, y: 24 }, grip: 'fist' },
        r: { e: { x: 252, y: 58 }, h: { x: 224, y: 28 }, grip: 'fist' },
      },
    ],
    loopMs: 1000,
  },
  // Safety: palms pressed together straight above the head, held (the two hand
  // balls overlap into one joined shape — that IS the read).
  'nfl-safety': {
    frames: [{
      l: { e: { x: 168, y: 66 }, h: { x: 196, y: 22 }, grip: 'none' },
      r: { e: { x: 232, y: 66 }, h: { x: 204, y: 22 }, grip: 'none' },
    }],
  },
  // Delay of game: arms folded across the chest, held.
  'nfl-delay': {
    frames: [{
      l: { e: { x: 154, y: 184 }, h: { x: 240, y: 192 }, grip: 'none' },
      r: { e: { x: 246, y: 200 }, h: { x: 160, y: 208 }, grip: 'none' },
    }],
  },
  // Timeout: arms crisscross and WAVE above the head.
  'nfl-timeout': {
    frames: [
      {
        l: { e: { x: 166, y: 70 }, h: { x: 238, y: 36 }, grip: 'palm' },
        r: { e: { x: 234, y: 70 }, h: { x: 162, y: 36 }, grip: 'palm' },
      },
      {
        l: { e: { x: 150, y: 74 }, h: { x: 118, y: 38 }, grip: 'palm' },
        r: { e: { x: 250, y: 74 }, h: { x: 282, y: 38 }, grip: 'palm' },
      },
    ],
    loopMs: 1000,
  },
  // Facemask: a fist grips just below the chin and YANKS down (QA fix: grip point
  // sits clear below the head so the fist never blobs into the face).
  'nfl-facemask': {
    frames: [
      { l: REST_L, r: { e: { x: 256, y: 138 }, h: { x: 218, y: 104 }, grip: 'fist' } },
      { l: REST_L, r: { e: { x: 252, y: 152 }, h: { x: 226, y: 160 }, grip: 'fist' } },
    ],
    loopMs: 1150,
  },
  // Unsportsmanlike conduct: arms outstretched, flat palms down — held STATIC
  // (its lookalike, incomplete, is the same span in MOTION).
  'nfl-unsportsmanlike': { frames: [{ l: OUT_L('flat'), r: OUT_R('flat') }] },

  // ── NBA (referee) ──────────────────────────────────────────────────────────
  // Foul: one arm straight up, CLENCHED FIST, held.
  'nba-foul': { frames: [{ l: REST_L, r: UPG_R('fist') }] },
  // Violation: one arm straight up, OPEN HAND, held.
  'nba-violation': { frames: [{ l: REST_L, r: UPG_R('palm') }] },
  // Traveling: fists ROLLING around each other.
  'nba-travel': { frames: rollingFists(), mode: 'cycle', ease: 'linear', loopMs: 1150 },
  // Technical foul: hands form a "T", held (drawn proud of the chest so it reads).
  'nba-technical': {
    frames: [{
      l: { e: { x: 150, y: 174 }, h: { x: 188, y: 170 }, grip: 'none' },
      r: { e: { x: 252, y: 172 }, h: { x: 224, y: 150 }, grip: 'none' },
    }],
    front: [
      { k: 'line', x1: 206, y1: 122, x2: 206, y2: 184, w: 11 + OUTLINE, c: SG.panel },
      { k: 'line', x1: 164, y1: 118, x2: 248, y2: 118, w: 11 + OUTLINE, c: SG.panel },
      { k: 'line', x1: 206, y1: 122, x2: 206, y2: 184, w: 11, c: SG.body },
      { k: 'line', x1: 164, y1: 118, x2: 248, y2: 118, w: 11, c: SG.body },
    ],
  },
  // Jump ball / held ball: both thumbs up, held.
  'nba-jump-ball': {
    frames: [{
      l: { e: { x: 150, y: 96 }, h: { x: 126, y: 48 }, grip: 'thumb' },
      r: { e: { x: 250, y: 96 }, h: { x: 274, y: 48 }, grip: 'thumb' },
    }],
  },
  // Blocking foul: both hands on hips, held STATIC (its confusable twin, the
  // charge, is a STRIKE in motion).
  'nba-blocking': { frames: [{ l: HIPS_L, r: HIPS_R }] },
  // Charging: a fist STRIKES down into the open opposite palm.
  'nba-charge': {
    frames: [
      {
        l: { e: { x: 152, y: 178 }, h: { x: 188, y: 188 }, grip: 'flat' },
        r: { e: { x: 262, y: 148 }, h: { x: 278, y: 108 }, grip: 'fist' },
      },
      {
        l: { e: { x: 152, y: 178 }, h: { x: 188, y: 188 }, grip: 'flat' },
        r: { e: { x: 250, y: 168 }, h: { x: 206, y: 180 }, grip: 'fist' },
      },
      {
        l: { e: { x: 152, y: 178 }, h: { x: 188, y: 188 }, grip: 'flat' },
        r: { e: { x: 250, y: 168 }, h: { x: 206, y: 180 }, grip: 'fist' },
      },
    ],
    loopMs: 1200,
  },
  // Shot-clock violation: the flat hand TAPS the top of the same-side shoulder
  // (flat paddle — the tap is the signal; a finger COUNT here would mislead).
  'nba-shot-clock': {
    frames: [
      { l: REST_L, r: { e: { x: 266, y: 148 }, h: { x: 246, y: 94 }, grip: 'flat' } },
      { l: REST_L, r: { e: { x: 264, y: 152 }, h: { x: 240, y: 110 }, grip: 'flat' } },
    ],
    loopMs: 800,
  },
  // Three-point ATTEMPT: one arm up, THREE fingers, held.
  'nba-three-attempt': { frames: [{ l: REST_L, r: UPG_R('three') }] },
  // Three-point GOOD: BOTH arms extended overhead, three fingers, held.
  'nba-three-good': { frames: [{ l: UPG_L('three'), r: UPG_R('three') }] },
  // Count the basket ("and one"): the fist cocks high beside the head, then
  // PUNCHES down and out toward the floor.
  'nba-count-basket': {
    frames: [
      { l: REST_L, r: { e: { x: 252, y: 146 }, h: { x: 264, y: 96 }, grip: 'fist' } },
      { l: REST_L, r: { e: { x: 252, y: 192 }, h: { x: 296, y: 236 }, grip: 'fist' } },
      { l: REST_L, r: { e: { x: 252, y: 192 }, h: { x: 296, y: 236 }, grip: 'fist' } },
    ],
    loopMs: 1150,
  },
  // Direction / possession: the arm snaps out to point along the sideline, held.
  'nba-direction': {
    frames: [
      { l: REST_L, r: { e: { x: 246, y: 152 }, h: { x: 212, y: 146 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 280, y: 118 }, h: { x: 338, y: 118 }, grip: 'point' } },
    ],
    loopMs: 1700,
  },

  // ── NHL (referee / linesman) ───────────────────────────────────────────────
  // Goal: an emphatic point into the net.
  'nhl-goal': {
    frames: [{ l: REST_L, r: { e: { x: 258, y: 162 }, h: { x: 308, y: 200 }, grip: 'point' } }],
    back: [
      { k: 'rect', x: 300, y: 334, w: 64, h: 44, f: undefined, s: SG.muted, sw: 4 },
      { k: 'line', x1: 321, y1: 334, x2: 321, y2: 378, w: 2.5, c: SG.muted },
      { k: 'line', x1: 342, y1: 334, x2: 342, y2: 378, w: 2.5, c: SG.muted },
      { k: 'line', x1: 300, y1: 356, x2: 364, y2: 356, w: 2.5, c: SG.muted },
    ],
  },
  // Tripping: the flat hand SWEEPS across in front of the raised shin, below the knee.
  'nhl-trip': {
    frames: [
      {
        l: REST_L,
        r: { e: { x: 254, y: 198 }, h: { x: 292, y: 258 }, grip: 'flat' },
        legs: { l: DEFAULT_LEGS.l, r: [{ x: 256, y: 288 }, { x: 276, y: 356 }] },
      },
      {
        l: REST_L,
        r: { e: { x: 244, y: 204 }, h: { x: 210, y: 272 }, grip: 'flat' },
        legs: { l: DEFAULT_LEGS.l, r: [{ x: 256, y: 288 }, { x: 276, y: 356 }] },
      },
    ],
    loopMs: 1100,
  },
  // Hooking: both fists grip an unseen stick out to the side and YANK it back in
  // toward the hip — a tugging motion (its twin, holding, is a static clasp).
  'nhl-hook': {
    frames: [
      {
        l: { e: { x: 196, y: 174 }, h: { x: 254, y: 192 }, grip: 'fist' },
        r: { e: { x: 260, y: 168 }, h: { x: 300, y: 210 }, grip: 'fist' },
      },
      {
        l: { e: { x: 158, y: 192 }, h: { x: 186, y: 222 }, grip: 'fist' },
        r: { e: { x: 244, y: 196 }, h: { x: 224, y: 240 }, grip: 'fist' },
      },
    ],
    loopMs: 1250,
    linkHands: true,
  },
  // Holding: one hand clasps the opposite wrist, held STATIC in front of the chest
  // (its confusable twin, hooking, is the same fists in a PULLING motion).
  'nhl-hold': {
    frames: [{
      l: { e: { x: 152, y: 178 }, h: { x: 216, y: 186 }, grip: 'fist' },
      r: { e: { x: 250, y: 178 }, h: { x: 202, y: 188 }, grip: 'fist' },
    }],
  },
  // Slashing: the edge of one hand CHOPS down onto the opposite forearm.
  'nhl-slash': {
    frames: [
      {
        l: { e: { x: 150, y: 180 }, h: { x: 226, y: 172 }, grip: 'none' },
        r: { e: { x: 256, y: 120 }, h: { x: 248, y: 74 }, grip: 'flat' },
      },
      {
        l: { e: { x: 150, y: 180 }, h: { x: 226, y: 172 }, grip: 'none' },
        r: { e: { x: 252, y: 140 }, h: { x: 200, y: 160 }, grip: 'flat' },
      },
      {
        l: { e: { x: 150, y: 180 }, h: { x: 226, y: 172 }, grip: 'none' },
        r: { e: { x: 252, y: 140 }, h: { x: 200, y: 160 }, grip: 'flat' },
      },
    ],
    loopMs: 1100,
  },
  // High-sticking: two fists stacked one above the other beside the head, held.
  'nhl-highstick': {
    frames: [{
      l: { e: { x: 168, y: 156 }, h: { x: 244, y: 124 }, grip: 'fist' },
      r: { e: { x: 258, y: 130 }, h: { x: 246, y: 92 }, grip: 'fist' },
    }],
  },
  // Interference: arms crossed static in front of the chest, fists closed.
  'nhl-interference': {
    frames: [{
      l: { e: { x: 158, y: 182 }, h: { x: 240, y: 192 }, grip: 'fist' },
      r: { e: { x: 242, y: 182 }, h: { x: 160, y: 192 }, grip: 'fist' },
    }],
  },
  // Boarding: a fist STRIKES the open palm in front of the chest.
  'nhl-board': {
    frames: [
      {
        l: { e: { x: 152, y: 178 }, h: { x: 188, y: 188 }, grip: 'flat' },
        r: { e: { x: 262, y: 148 }, h: { x: 278, y: 108 }, grip: 'fist' },
      },
      {
        l: { e: { x: 152, y: 178 }, h: { x: 188, y: 188 }, grip: 'flat' },
        r: { e: { x: 250, y: 168 }, h: { x: 206, y: 180 }, grip: 'fist' },
      },
      {
        l: { e: { x: 152, y: 178 }, h: { x: 188, y: 188 }, grip: 'flat' },
        r: { e: { x: 250, y: 168 }, h: { x: 206, y: 180 }, grip: 'fist' },
      },
    ],
    loopMs: 1200,
  },
  // Charging: fists ROTATING around each other (vs boarding's single strike).
  'nhl-charge': { frames: rollingFists(), mode: 'cycle', ease: 'linear', loopMs: 1150 },
  // Cross-checking: both fists grip a level stick shaft at the chest and THRUST
  // it forward/out together (vs hooking's one-sided yank inward).
  'nhl-crosscheck': {
    frames: [
      {
        l: { e: { x: 154, y: 178 }, h: { x: 158, y: 206 }, grip: 'fist' },
        r: { e: { x: 246, y: 178 }, h: { x: 242, y: 206 }, grip: 'fist' },
      },
      {
        l: { e: { x: 140, y: 192 }, h: { x: 122, y: 240 }, grip: 'fist' },
        r: { e: { x: 260, y: 192 }, h: { x: 278, y: 240 }, grip: 'fist' },
      },
    ],
    loopMs: 1050,
    linkHands: true,
  },
  // Delayed penalty: one arm fully extended straight up, HELD (play continues).
  'nhl-delayed-penalty': { frames: [{ l: REST_L, r: UP_R() }] },
  // Washout: flat arms SWEEP out level at the shoulders (no goal / wave-off).
  'nhl-washout': {
    frames: [
      {
        l: { e: { x: 162, y: 172 }, h: { x: 240, y: 172 }, grip: 'flat' },
        r: { e: { x: 238, y: 172 }, h: { x: 160, y: 172 }, grip: 'flat' },
      },
      { l: OUT_L('flat'), r: OUT_R('flat') },
    ],
    loopMs: 1250,
  },
  // Misconduct: both hands on hips, held.
  'nhl-misconduct': { frames: [{ l: HIPS_L, r: HIPS_R }] },
  // Penalty shot: arms crossed in a STATIC X above the head.
  'nhl-penalty-shot': {
    frames: [{
      l: { e: { x: 168, y: 72 }, h: { x: 244, y: 26 }, grip: 'fist' },
      r: { e: { x: 232, y: 72 }, h: { x: 156, y: 26 }, grip: 'fist' },
    }],
  },

  // ── Soccer (referee + assistant referee) ───────────────────────────────────
  // Yellow card: raised from the chest high into the air, held up.
  'soc-yellow': {
    frames: [
      { l: REST_L, r: { e: { x: 248, y: 158 }, h: { x: 222, y: 124 }, grip: 'cardY' } },
      { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 254, y: 50 }, grip: 'cardY' } },
      { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 254, y: 50 }, grip: 'cardY' } },
      { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 254, y: 50 }, grip: 'cardY' } },
    ],
    loopMs: 2200,
  },
  // Red card: same mechanic, red.
  'soc-red': {
    frames: [
      { l: REST_L, r: { e: { x: 248, y: 158 }, h: { x: 222, y: 124 }, grip: 'cardR' } },
      { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 254, y: 50 }, grip: 'cardR' } },
      { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 254, y: 50 }, grip: 'cardR' } },
      { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 254, y: 50 }, grip: 'cardR' } },
    ],
    loopMs: 2200,
  },
  // INDIRECT free kick: arm raised straight up and HELD there (static by law).
  'soc-indirect': { frames: [{ l: REST_L, r: UP_R() }] },
  // DIRECT free kick: the arm swings up to POINT the attacking direction, then drops
  // (shown as point-and-hold; contrast the indirect's vertical hold).
  'soc-direct': {
    frames: [
      { l: REST_L, r: { e: { x: 246, y: 152 }, h: { x: 214, y: 144 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 282, y: 128 }, h: { x: 338, y: 140 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 282, y: 128 }, h: { x: 338, y: 140 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 282, y: 128 }, h: { x: 338, y: 140 }, grip: 'point' } },
    ],
    loopMs: 1800,
  },
  // Advantage: both open hands SWEEP from the sides toward the attacking
  // direction — "play on!"
  'soc-advantage': {
    frames: [
      {
        l: { e: { x: 148, y: 194 }, h: { x: 144, y: 232 }, grip: 'palm' },
        r: { e: { x: 252, y: 194 }, h: { x: 256, y: 232 }, grip: 'palm' },
      },
      {
        l: { e: { x: 178, y: 194 }, h: { x: 244, y: 210 }, grip: 'palm' },
        r: { e: { x: 260, y: 174 }, h: { x: 322, y: 188 }, grip: 'palm' },
      },
    ],
    loopMs: 1300,
  },
  // Penalty kick: emphatic point DOWN at the spot, held (spot drawn on the ground).
  'soc-penalty': {
    frames: [{ l: REST_L, r: { e: { x: 256, y: 166 }, h: { x: 304, y: 214 }, grip: 'point' } }],
    back: [
      { k: 'line', x1: 292, y1: 252, x2: 352, y2: 252, w: 4, c: SG.muted },
      { k: 'circle', cx: 322, cy: 238, r: 8, f: SG.accent },
    ],
  },
  // Corner kick: point up at the corner flag, held.
  'soc-corner': {
    frames: [{ l: REST_L, r: { e: { x: 248, y: 86 }, h: { x: 294, y: 44 }, grip: 'point' } }],
    back: [
      { k: 'line', x1: 344, y1: 14, x2: 344, y2: 72, w: 4, c: SG.muted },
      { k: 'poly', pts: '344,14 344,34 370,24', f: SG.accent },
    ],
  },
  // Offside (assistant): flag raised STRAIGHT UP, held (hand kept low enough that
  // the pennant at the pole tip stays on-panel — QA fix).
  'soc-offside-flag': { frames: [{ l: REST_L, r: { e: { x: 242, y: 108 }, h: { x: 246, y: 74 }, grip: 'flag' } }] },
  // Throw-in (assistant): flag ANGLED at 45°, held.
  'soc-throwin-flag': { frames: [{ l: REST_L, r: { e: { x: 248, y: 94 }, h: { x: 288, y: 56 }, grip: 'flag' } }] },
  // Substitution (assistant): the flag held HORIZONTALLY overhead with both hands.
  'soc-sub-flag': {
    frames: [{
      l: { e: { x: 162, y: 70 }, h: { x: 150, y: 24 }, grip: 'none' },
      r: { e: { x: 238, y: 70 }, h: { x: 250, y: 24 }, grip: 'none' },
    }],
    front: [
      { k: 'line', x1: 128, y1: 16, x2: 268, y2: 16, w: 6 + OUTLINE, c: SG.panel },
      { k: 'line', x1: 128, y1: 16, x2: 268, y2: 16, w: 6, c: SG.body },
      { k: 'poly', pts: '268,16 240,16 262,36', f: SG.accent },
    ],
  },
  // VAR review: the "TV screen" rectangle drawn in the air.
  'soc-var': {
    frames: [{
      l: { e: { x: 150, y: 172 }, h: { x: 146, y: 146 }, grip: 'point' },
      r: { e: { x: 250, y: 172 }, h: { x: 254, y: 146 }, grip: 'point' },
    }],
    front: [tvBox(142, 96, 116, 68)],
  },

  // ── Rugby union (referee) — the one-arm "angle ladder" ────────────────────
  // Try: arm raised dead VERTICAL, held still.
  'rug-try': { frames: [{ l: REST_L, r: UP_R() }] },
  // Penalty: arm angled UP at ~45°, held.
  'rug-penalty': { frames: [{ l: REST_L, r: { e: { x: 254, y: 86 }, h: { x: 296, y: 44 }, grip: 'none' } }] },
  // Free kick: arm BENT square at the elbow (upper arm level, forearm up), held.
  'rug-free-kick': { frames: [{ l: REST_L, r: { e: { x: 282, y: 118 }, h: { x: 284, y: 60 }, grip: 'none' } }] },
  // Scrum: arm dead HORIZONTAL at the shoulder, held.
  'rug-scrum': { frames: [{ l: REST_L, r: OUT_R() }] },
  // Advantage: arm outstretched LOW at waist height, held while play continues.
  'rug-advantage': { frames: [{ l: REST_L, r: { e: { x: 268, y: 152 }, h: { x: 318, y: 182 }, grip: 'none' } }] },
  // Knock-on: open hand WAVING back and forth above the head.
  'rug-knock-on': {
    frames: [
      { l: REST_L, r: { e: { x: 240, y: 70 }, h: { x: 204, y: 34 }, grip: 'palm' } },
      { l: REST_L, r: { e: { x: 248, y: 72 }, h: { x: 282, y: 38 }, grip: 'palm' } },
    ],
    loopMs: 950,
  },
  // Forward pass: both hands MIME a pass travelling across/ahead of the body.
  'rug-forward-pass': {
    frames: [
      {
        l: { e: { x: 152, y: 196 }, h: { x: 148, y: 244 }, grip: 'palm' },
        r: { e: { x: 244, y: 206 }, h: { x: 180, y: 250 }, grip: 'palm' },
      },
      {
        l: { e: { x: 180, y: 182 }, h: { x: 252, y: 196 }, grip: 'palm' },
        r: { e: { x: 258, y: 168 }, h: { x: 314, y: 184 }, grip: 'palm' },
      },
      {
        l: { e: { x: 180, y: 182 }, h: { x: 252, y: 196 }, grip: 'palm' },
        r: { e: { x: 258, y: 168 }, h: { x: 314, y: 184 }, grip: 'palm' },
      },
    ],
    loopMs: 1400,
  },
  // High tackle: a flat hand SWEEPS across the neck line.
  'rug-high-tackle': {
    frames: [
      { l: REST_L, r: { e: { x: 258, y: 142 }, h: { x: 240, y: 102 }, grip: 'flat' } },
      { l: REST_L, r: { e: { x: 246, y: 148 }, h: { x: 172, y: 102 }, grip: 'flat' } },
    ],
    loopMs: 1150,
  },
  // Not releasing: both hands clutch a ball tight to the chest, held.
  'rug-not-release': {
    frames: [{
      l: { e: { x: 154, y: 180 }, h: { x: 184, y: 198 }, grip: 'none' },
      r: { e: { x: 246, y: 180 }, h: { x: 216, y: 198 }, grip: 'none' },
    }],
    front: [
      { k: 'path', d: 'M 176 198 A 28 16 0 0 1 224 198 A 28 16 0 0 1 176 198', f: undefined, s: SG.accent, sw: 6 },
    ],
  },
  // TMO referral: the big "TV box" drawn in the air.
  'rug-tmo': {
    frames: [{
      l: { e: { x: 150, y: 172 }, h: { x: 146, y: 146 }, grip: 'point' },
      r: { e: { x: 250, y: 172 }, h: { x: 254, y: 146 }, grip: 'point' },
    }],
    front: [tvBox(134, 90, 132, 76)],
  },
  // Obstruction: crossed arms SCISSOR open and shut in front of the chest.
  'rug-obstruction': {
    frames: [
      {
        l: { e: { x: 158, y: 180 }, h: { x: 244, y: 190 }, grip: 'flat' },
        r: { e: { x: 242, y: 180 }, h: { x: 156, y: 190 }, grip: 'flat' },
      },
      {
        l: { e: { x: 148, y: 182 }, h: { x: 174, y: 190 }, grip: 'flat' },
        r: { e: { x: 252, y: 182 }, h: { x: 226, y: 190 }, grip: 'flat' },
      },
    ],
    loopMs: 950,
  },

  // ── Cricket (umpire — MCC Law 2.13) ────────────────────────────────────────
  // Out: the index finger raised, slow and solemn, then held high.
  'crk-out': {
    frames: [
      { l: REST_L, r: { e: { x: 246, y: 152 }, h: { x: 244, y: 112 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 238, y: 78 }, h: { x: 252, y: 44 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 238, y: 78 }, h: { x: 252, y: 44 }, grip: 'point' } },
      { l: REST_L, r: { e: { x: 238, y: 78 }, h: { x: 252, y: 44 }, grip: 'point' } },
    ],
    loopMs: 2200,
  },
  // Boundary four: the arm WAVES across the chest and back.
  'crk-four': {
    frames: [
      { l: REST_L, r: { e: { x: 276, y: 140 }, h: { x: 328, y: 156 }, grip: 'flat' } },
      { l: REST_L, r: { e: { x: 240, y: 178 }, h: { x: 164, y: 182 }, grip: 'flat' } },
    ],
    loopMs: 1250,
  },
  // Boundary six: both arms raised above the head, held.
  'crk-six': { frames: [{ l: UP_L(), r: UP_R() }] },
  // Wide: BOTH arms extended dead horizontal, held.
  'crk-wide': { frames: [{ l: OUT_L(), r: OUT_R() }] },
  // No-ball: ONE arm extended horizontal, held.
  'crk-noball': { frames: [{ l: REST_L, r: OUT_R() }] },
  // Bye: an OPEN HAND raised above the head, held (vs out's single finger).
  'crk-bye': { frames: [{ l: REST_L, r: UPG_R('palm') }] },
  // Leg bye: the flat hand TAPS the raised knee (paddle — the tap, not fingers,
  // is the signal).
  'crk-legbye': {
    frames: [
      {
        l: REST_L,
        r: { e: { x: 258, y: 172 }, h: { x: 268, y: 208 }, grip: 'flat' },
        legs: { l: DEFAULT_LEGS.l, r: [{ x: 264, y: 240 }, { x: 258, y: 330 }] },
      },
      {
        l: REST_L,
        r: { e: { x: 260, y: 178 }, h: { x: 266, y: 228 }, grip: 'flat' },
        legs: { l: DEFAULT_LEGS.l, r: [{ x: 264, y: 240 }, { x: 258, y: 330 }] },
      },
    ],
    loopMs: 850,
  },
  // Dead ball: wrists CROSS and re-cross below the waist.
  'crk-dead': {
    frames: [
      {
        l: { e: { x: 160, y: 208 }, h: { x: 230, y: 258 }, grip: 'flat' },
        r: { e: { x: 240, y: 208 }, h: { x: 170, y: 258 }, grip: 'flat' },
      },
      {
        l: { e: { x: 152, y: 212 }, h: { x: 142, y: 264 }, grip: 'flat' },
        r: { e: { x: 248, y: 212 }, h: { x: 258, y: 264 }, grip: 'flat' },
      },
    ],
    loopMs: 1150,
  },
  // Short run: the flat hand TAPS the NEAR (same-side) shoulder — the arm does
  // NOT cross (paddle: the tap is the signal, a finger count would mislead).
  'crk-short-run': {
    frames: [
      { l: REST_L, r: { e: { x: 268, y: 148 }, h: { x: 248, y: 94 }, grip: 'flat' } },
      { l: REST_L, r: { e: { x: 266, y: 152 }, h: { x: 242, y: 110 }, grip: 'flat' } },
    ],
    loopMs: 800,
  },
  // Free hit: the arm circling overhead (follows a no-ball in white-ball cricket).
  'crk-free-hit': { frames: overheadCircle('point'), mode: 'cycle', ease: 'linear', loopMs: 1500 },
  // 5 penalty runs to the BATTING side: repeatedly TAPPING the OPPOSITE shoulder
  // (the arm crosses the chest — and it MOVES). Flat paddle, same hand as its
  // static twin below; the tap-vs-placed MOTION carries the distinction.
  'crk-penalty-bat': {
    frames: [
      { l: REST_L, r: { e: { x: 232, y: 162 }, h: { x: 184, y: 96 }, grip: 'flat' } },
      { l: REST_L, r: { e: { x: 230, y: 166 }, h: { x: 176, y: 112 }, grip: 'flat' } },
    ],
    loopMs: 750,
  },
  // 5 penalty runs to the FIELDING side: the hand PLACED still on the opposite shoulder.
  'crk-penalty-field': {
    frames: [{ l: REST_L, r: { e: { x: 230, y: 166 }, h: { x: 174, y: 110 }, grip: 'flat' } }],
  },
  // Revoke last signal: BOTH hands crossed to touch the opposite shoulders, held
  // (flat paddles — a double finger-fan at the neck read as a mangled tangle).
  'crk-revoke': {
    frames: [{
      l: { e: { x: 176, y: 170 }, h: { x: 228, y: 110 }, grip: 'flat' },
      r: { e: { x: 224, y: 170 }, h: { x: 172, y: 110 }, grip: 'flat' },
    }],
  },
  // TV referral: mimes a TV screen — the decision goes upstairs.
  'crk-tv': {
    frames: [{
      l: { e: { x: 150, y: 172 }, h: { x: 146, y: 146 }, grip: 'point' },
      r: { e: { x: 250, y: 172 }, h: { x: 254, y: 146 }, grip: 'point' },
    }],
    front: [tvBox(142, 96, 116, 68)],
  },
};

// ── frame resolution (interpolation) ─────────────────────────────────────────
function blendArm(a: Arm, b: Arm, u: number): Arm {
  return { e: lerpPt(a.e, b.e, u), h: lerpPt(a.h, b.h, u), grip: u < 0.5 ? a.grip : b.grip };
}
function blendLegs(a?: Legs, b?: Legs, u = 0): Legs | undefined {
  if (!a && !b) return undefined;
  const A = a ?? DEFAULT_LEGS, B = b ?? DEFAULT_LEGS;
  return {
    l: [lerpPt(A.l[0], B.l[0], u), lerpPt(A.l[1], B.l[1], u)],
    r: [lerpPt(A.r[0], B.r[0], u), lerpPt(A.r[1], B.r[1], u)],
  };
}

// Resolve the pose at loop progress t ∈ [0,1).
function poseAt(anim: SignalAnim, t: number): Frame {
  const n = anim.frames.length;
  if (n === 1) return anim.frames[0];
  const mode = anim.mode ?? 'pingpong';
  let i: number, j: number, u: number;
  if (mode === 'cycle') {
    const f = (t % 1) * n;
    i = Math.floor(f) % n;
    j = (i + 1) % n;
    u = f - Math.floor(f);
  } else {
    const p = 1 - Math.abs(1 - 2 * (t % 1)); // triangle wave 0→1→0
    const f = p * (n - 1);
    i = Math.min(Math.floor(f), n - 2);
    j = i + 1;
    u = f - i;
  }
  if ((anim.ease ?? 'sine') === 'sine') u = easeSine(u);
  const A = anim.frames[i], B = anim.frames[j];
  return { l: blendArm(A.l, B.l, u), r: blendArm(A.r, B.r, u), legs: blendLegs(A.legs, B.legs, u) };
}

// ── the public pure API ──────────────────────────────────────────────────────
export function isSignalAnimated(signal: SignalKey): boolean {
  return SIGNAL_ANIMS[signal].frames.length > 1;
}
export function signalLoopMs(signal: SignalKey): number {
  return SIGNAL_ANIMS[signal].loopMs ?? 1500;
}
// Where to freeze once the player has answered (the signal's "peak" pose).
export function signalFreezeT(signal: SignalKey): number {
  const anim = SIGNAL_ANIMS[signal];
  return anim.holdT ?? (anim.frames.length > 1 ? 0.5 : 0);
}

// The COMPLETE primitive list for one rendered frame (backdrop included), so the
// RN renderer and the QA rasterizer draw pixel-identical scenes.
export function signalFrame(signal: SignalKey, t: number): Prim[] {
  const anim = SIGNAL_ANIMS[signal];
  const pose = poseAt(anim, t);
  // Optional "stick shaft" between the two hands (hooking / cross-checking):
  // extended beyond each fist so it reads as a gripped stick, and it moves with
  // the interpolated hands every frame.
  const link: Prim[] = [];
  if (anim.linkHands) {
    const u = unit(pose.l.h, pose.r.h);
    const a = add(pose.l.h, u, -24), b = add(pose.r.h, u, 24);
    link.push({ k: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, w: 8, c: SG.accent });
  }
  return [
    { k: 'rect', x: 0, y: 0, w: SIGNAL_VB.w, h: SIGNAL_VB.h, f: SG.bg },
    { k: 'rect', x: 8, y: 8, w: SIGNAL_VB.w - 16, h: SIGNAL_VB.h - 16, rx: 14, f: SG.panel, s: SG.line, sw: 2 },
    { k: 'line', x1: 60, y1: 412, x2: 340, y2: 412, w: 3, c: SG.line },
    ...(anim.back ?? []),
    ...figurePrims(pose),
    ...link,
    ...(anim.front ?? []),
  ];
}

// ─── QA-PURE-END ────────────────────────────────────────────────────────────

// ── the RN renderer ──────────────────────────────────────────────────────────
// One rAF owner, house cleanup idiom (WheresThePlayGame / FindTheOpenMan):
// the loop runs only while `playing` and the signal is actually animated; it is
// cancelled on answer (playing=false), on signal change, and on unmount.
function PrimEl({ p }: { p: Prim }) {
  switch (p.k) {
    case 'line':
      return <Line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.c} strokeWidth={p.w}
        strokeLinecap="round" strokeDasharray={p.dash} />;
    case 'circle':
      return <Circle cx={p.cx} cy={p.cy} r={p.r} fill={p.f ?? 'none'} stroke={p.s} strokeWidth={p.sw} />;
    case 'rect':
      return <Rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={p.f ?? 'none'}
        stroke={p.s} strokeWidth={p.sw} strokeDasharray={p.dash} />;
    case 'poly':
      return <Polygon points={p.pts} fill={p.f} />;
    case 'path':
      return <Path d={p.d} fill={p.f ?? 'none'} stroke={p.s} strokeWidth={p.sw}
        strokeDasharray={p.dash} strokeLinecap="round" strokeLinejoin="round" />;
  }
}

export function SignalArt({ signal, playing = true }: { signal: SignalKey; playing?: boolean }) {
  const animated = isSignalAnimated(signal);
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setT(0);
    if (!playing || !animated) return;
    let start: number | null = null;
    const ms = signalLoopMs(signal);
    const tick = (now: number) => {
      if (start == null) start = now;
      setT(((now - start) % ms) / ms);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [signal, playing, animated]);

  // While deciding: the live loop. Once answered: freeze at the signal's peak pose.
  const shownT = playing ? t : signalFreezeT(signal);
  const prims = signalFrame(signal, shownT);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: '84%', maxWidth: 330, borderRadius: 16, overflow: 'hidden' }}>
        <Svg viewBox={`0 0 ${SIGNAL_VB.w} ${SIGNAL_VB.h}`}
          style={{ width: '100%', aspectRatio: SIGNAL_RATIO, backgroundColor: SG.bg }}>
          {prims.map((p, i) => <PrimEl key={i} p={p} />)}
        </Svg>
      </View>
    </View>
  );
}
