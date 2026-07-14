import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { SignalKey } from './signalDecoder';

// ============================================================================
// Signal Decoder — ART MODULE. Every official-signal pictogram lives HERE and
// only here (build doc §0.4: art is a placeholder, swappable in ONE file). The
// game component renders <SignalArt signal={...} /> and knows nothing about
// pixels; designers can replace this whole file without touching data or game.
//
// Conventions (matching FieldEngine / readTheScoreArt):
// - One fixed viewBox for every pictogram: 400×440 (SIGNAL_RATIO sizes the <Svg>).
// - A referee looks the same in every app theme (like a field is green in every
//   theme), so the palette below is FIXED — chalk-white figure on brand navy,
//   amber for motion/objects — not theme tokens.
// - Simple geometric stick figures: torso/limbs as <Line>, head as <Circle>.
//   THE POSE IS THE INFORMATION — the distinguishing feature of a signal is arm
//   position, so every figure shares one body and only the limbs (plus hand
//   glyphs: fist / open palm / pointing finger / flat hand) and motion arcs vary.
// ============================================================================

export const SIGNAL_VB = { w: 400, h: 440 };
export const SIGNAL_RATIO = SIGNAL_VB.w / SIGNAL_VB.h;

// Fixed pictogram palette (referee-on-navy; brand family from lib/theme).
const SG = {
  bg: '#0a1733',
  panel: '#0f2044',
  line: '#2a3a5e',
  body: '#F4F4EE',    // chalk-white figure
  accent: '#F5A623',  // amber: motion arcs, held objects, emphasis
  cardY: '#FFD60A',
  cardR: '#FF3B30',
  muted: '#9ab4e0',
};

const LIMB_W = 11;   // arm/leg/torso stroke width
const S = { x: 200, y: 122 };   // shoulder joint
const HIP = { x: 200, y: 246 }; // hip joint

type Pt = { x: number; y: number };
type Grip =
  | 'none'    // clean limb end (round cap)
  | 'fist'    // filled knuckle circle
  | 'palm'    // open hand: 5 splayed finger rays
  | 'point'   // single extended index finger
  | 'flat'    // flat hand: bar perpendicular to the forearm
  | 'three'   // three raised fingers
  | 'two'     // two raised fingers
  | 'thumb'   // fist + thumb up
  | 'ball'    // holding a ball
  | 'cardY' | 'cardR'  // holding a card
  | 'flag';   // holding an assistant referee's flag

interface ArmPose { e: Pt; h: Pt; grip: Grip }
interface FigureSpec {
  l: ArmPose;               // viewer-left arm
  r: ArmPose;               // viewer-right arm
  legs?: { l: [Pt, Pt]; r: [Pt, Pt] };  // [knee, foot] per leg; default standing
  extras?: React.ReactNode; // motion arcs, arrows, props (net, spot, TV box…)
}

// ── geometry helpers ─────────────────────────────────────────────────────────
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

// ── reusable strokes ─────────────────────────────────────────────────────────
function L({ a, b, w = LIMB_W, color = SG.body }: { a: Pt; b: Pt; w?: number; color?: string }) {
  return <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={w} strokeLinecap="round" />;
}

// Dashed amber motion arc (waves, taps, circles, sweeps).
function Arc({ d }: { d: string }) {
  return <Path d={d} fill="none" stroke={SG.accent} strokeWidth={4.5} strokeDasharray="8 8" strokeLinecap="round" opacity={0.95} />;
}

// Solid amber arrow (directional motion: punch, pull, push, chop).
function Arrow({ a, b }: { a: Pt; b: Pt }) {
  const u = unit(a, b);
  const tip = b;
  const base = add(tip, u, -14);
  const p1 = add(base, rot(u, 90), 8);
  const p2 = add(base, rot(u, -90), 8);
  return (
    <>
      <Line x1={a.x} y1={a.y} x2={base.x} y2={base.y} stroke={SG.accent} strokeWidth={5} strokeLinecap="round" />
      <Polygon points={`${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={SG.accent} />
    </>
  );
}

// Dashed "TV screen" box (VAR / TMO / cricket TV referral).
function TvBox({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <Rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke={SG.accent} strokeWidth={4.5} strokeDasharray="10 8" />;
}

// ── hand glyphs (drawn at the hand point, oriented along the forearm) ────────
function Hand({ e, h, grip }: ArmPose) {
  const u = unit(e, h);
  switch (grip) {
    case 'none':
      return null;
    case 'fist':
      return <Circle cx={h.x} cy={h.y} r={11} fill={SG.body} />;
    case 'palm': {
      const rays = [-40, -20, 0, 20, 40];
      return (
        <>
          {rays.map(a => {
            const t = add(h, rot(u, a), 19);
            return <Line key={a} x1={h.x} y1={h.y} x2={t.x} y2={t.y} stroke={SG.body} strokeWidth={4.5} strokeLinecap="round" />;
          })}
        </>
      );
    }
    case 'three': case 'two': {
      const rays = grip === 'three' ? [-26, 0, 26] : [-15, 15];
      return (
        <>
          <Circle cx={h.x} cy={h.y} r={8} fill={SG.body} />
          {rays.map(a => {
            const t = add(h, rot(u, a), 21);
            return <Line key={a} x1={h.x} y1={h.y} x2={t.x} y2={t.y} stroke={SG.body} strokeWidth={5} strokeLinecap="round" />;
          })}
        </>
      );
    }
    case 'point': {
      const t = add(h, u, 23);
      return (
        <>
          <Circle cx={h.x} cy={h.y} r={8} fill={SG.body} />
          <Line x1={h.x} y1={h.y} x2={t.x} y2={t.y} stroke={SG.body} strokeWidth={5.5} strokeLinecap="round" />
        </>
      );
    }
    case 'flat': {
      const p = rot(u, 90);
      const a = add(h, p, 14), b = add(h, p, -14);
      return <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SG.body} strokeWidth={8} strokeLinecap="round" />;
    }
    case 'thumb': {
      const p = rot(u, u.x >= 0 ? -90 : 90); // thumb sticks up-ish
      const t = add(h, p.y > 0 ? rot(u, u.x >= 0 ? 90 : -90) : p, 18);
      return (
        <>
          <Circle cx={h.x} cy={h.y} r={10} fill={SG.body} />
          <Line x1={h.x} y1={h.y} x2={t.x} y2={t.y} stroke={SG.body} strokeWidth={6} strokeLinecap="round" />
        </>
      );
    }
    case 'ball': {
      const c = add(h, u, 16);
      return <Circle cx={c.x} cy={c.y} r={13} fill="none" stroke={SG.accent} strokeWidth={5} />;
    }
    case 'cardY': case 'cardR': {
      const c = add(h, u, 16);
      return <Rect x={c.x - 13} y={c.y - 19} width={26} height={38} rx={4} fill={grip === 'cardY' ? SG.cardY : SG.cardR} />;
    }
    case 'flag': {
      const tip = add(h, u, 54);
      const mid = add(h, u, 30);
      const p = rot(u, 90);
      const f = add(mid, p, 20);
      return (
        <>
          <Line x1={h.x} y1={h.y} x2={tip.x} y2={tip.y} stroke={SG.body} strokeWidth={5} strokeLinecap="round" />
          <Polygon points={`${tip.x},${tip.y} ${mid.x},${mid.y} ${f.x},${f.y}`} fill={SG.accent} />
        </>
      );
    }
  }
}

// ── the shared figure ────────────────────────────────────────────────────────
const REST_L: ArmPose = { e: { x: 172, y: 170 }, h: { x: 162, y: 220 }, grip: 'none' };
const REST_R: ArmPose = { e: { x: 228, y: 170 }, h: { x: 238, y: 220 }, grip: 'none' };
const DEFAULT_LEGS = {
  l: [{ x: 168, y: 324 }, { x: 158, y: 402 }] as [Pt, Pt],
  r: [{ x: 232, y: 324 }, { x: 242, y: 402 }] as [Pt, Pt],
};

function Figure({ spec }: { spec: FigureSpec }) {
  const legs = spec.legs ?? DEFAULT_LEGS;
  return (
    <>
      {/* legs first, then torso/arms so upper body reads on top */}
      <L a={HIP} b={legs.l[0]} /><L a={legs.l[0]} b={legs.l[1]} />
      <L a={HIP} b={legs.r[0]} /><L a={legs.r[0]} b={legs.r[1]} />
      <L a={{ x: 200, y: 104 }} b={HIP} />
      <Circle cx={200} cy={74} r={26} fill={SG.body} />
      <L a={S} b={spec.l.e} /><L a={spec.l.e} b={spec.l.h} />
      <L a={S} b={spec.r.e} /><L a={spec.r.e} b={spec.r.h} />
      <Hand {...spec.l} />
      <Hand {...spec.r} />
      {spec.extras}
    </>
  );
}

// ── shared arm positions ─────────────────────────────────────────────────────
const UP_L: ArmPose = { e: { x: 180, y: 68 }, h: { x: 176, y: 14 }, grip: 'palm' };
const UP_R: ArmPose = { e: { x: 220, y: 68 }, h: { x: 224, y: 14 }, grip: 'palm' };
const OUT_L: ArmPose = { e: { x: 142, y: 122 }, h: { x: 84, y: 122 }, grip: 'none' };
const OUT_R: ArmPose = { e: { x: 258, y: 122 }, h: { x: 316, y: 122 }, grip: 'none' };
const HIPS_L: ArmPose = { e: { x: 148, y: 168 }, h: { x: 184, y: 214 }, grip: 'fist' };
const HIPS_R: ArmPose = { e: { x: 252, y: 168 }, h: { x: 216, y: 214 }, grip: 'fist' };

// ============================================================================
// THE POSES — one entry per SignalKey (compiler-enforced exhaustive).
// Signals were verified against: the NFL signal chart, umpire mechanics manuals
// (UmpireBible / NFHS), NBA-FIBA-NFHS basketball mechanics, USA Hockey Appendix 3,
// IFAB Laws of the Game + assistant-referee guides, World Rugby match-official
// signals (passport.world.rugby), and MCC Laws of Cricket Law 2.13.
// ============================================================================
const POSES: Record<SignalKey, FigureSpec> = {

  // ── MLB (umpire) ───────────────────────────────────────────────────────────
  // Strike: emphatic point out to the side with the right hand.
  'mlb-strike': { l: REST_L, r: { e: { x: 258, y: 122 }, h: { x: 312, y: 122 }, grip: 'point' } },
  // Out: the "hammer" — bent arm, clenched fist punched up/forward.
  'mlb-out': {
    l: REST_L, r: { e: { x: 258, y: 122 }, h: { x: 262, y: 64 }, grip: 'fist' },
    extras: <Arc d="M 292 74 A 30 30 0 0 1 280 102" />,
  },
  // Safe: both arms extended out flat, palms down, swept apart.
  'mlb-safe': {
    l: { ...OUT_L, grip: 'flat' }, r: { ...OUT_R, grip: 'flat' },
    extras: (<>
      <Arc d="M 120 94 A 44 30 0 0 0 78 106" />
      <Arc d="M 280 94 A 44 30 0 0 1 322 106" />
    </>),
  },
  // Time / dead ball (same mechanic covers foul ball): both hands straight up.
  'mlb-time': { l: UP_L, r: UP_R },
  // Fair ball: point into fair territory (no verbal call).
  'mlb-fair': { l: REST_L, r: { e: { x: 250, y: 158 }, h: { x: 300, y: 192 }, grip: 'point' } },
  // Home run: arm up, index finger circling overhead.
  'mlb-homerun': {
    l: REST_L, r: { e: { x: 220, y: 70 }, h: { x: 232, y: 20 }, grip: 'point' },
    extras: <Arc d="M 148 36 A 62 34 0 1 1 252 34" />,
  },
  // Infield fly: right arm straight up, index finger pointing skyward.
  'mlb-infield-fly': { l: REST_L, r: { e: { x: 220, y: 68 }, h: { x: 224, y: 16 }, grip: 'point' } },
  // The count: balls on the left hand, strikes on the right (3–2 shown).
  'mlb-count': {
    l: { e: { x: 150, y: 150 }, h: { x: 146, y: 96 }, grip: 'three' },
    r: { e: { x: 250, y: 150 }, h: { x: 254, y: 96 }, grip: 'two' },
  },
  // Foul tip: one hand brushes over the other at shoulder height (then strike).
  'mlb-foul-tip': {
    l: { e: { x: 160, y: 170 }, h: { x: 192, y: 148 }, grip: 'flat' },
    r: { e: { x: 246, y: 150 }, h: { x: 208, y: 136 }, grip: 'palm' },
    extras: <Arc d="M 232 116 A 28 28 0 0 0 196 126" />,
  },
  // Delayed dead ball: LEFT arm extended horizontally, fist (e.g. catcher's interference).
  'mlb-delayed-dead': { l: { ...OUT_L, grip: 'fist' }, r: REST_R },

  // ── NFL (referee) ──────────────────────────────────────────────────────────
  // Touchdown (also field goal / extra point good): both arms straight up.
  'nfl-touchdown': { l: UP_L, r: UP_R },
  // Incomplete pass (also penalty declined / no score): arms crossed-and-swept at shoulder level.
  'nfl-incomplete': {
    l: { ...OUT_L, grip: 'flat' }, r: { ...OUT_R, grip: 'flat' },
    extras: (<>
      <Arc d="M 100 148 A 64 22 0 0 0 176 148" />
      <Arc d="M 224 148 A 64 22 0 0 0 300 148" />
    </>),
  },
  // First down: arm extended, pointing toward the defense's goal.
  'nfl-first-down': { l: REST_L, r: { e: { x: 258, y: 122 }, h: { x: 312, y: 122 }, grip: 'point' } },
  // Holding: one hand grasping the opposite wrist in front of the chest.
  'nfl-holding': {
    l: { e: { x: 166, y: 176 }, h: { x: 204, y: 196 }, grip: 'fist' },
    r: { e: { x: 252, y: 168 }, h: { x: 216, y: 190 }, grip: 'fist' },
    extras: <Circle cx={210} cy={193} r={20} fill="none" stroke={SG.accent} strokeWidth={4} strokeDasharray="7 7" />,
  },
  // False start: forearms rotating over each other at chest height.
  'nfl-false-start': {
    l: { e: { x: 152, y: 176 }, h: { x: 186, y: 156 }, grip: 'fist' },
    r: { e: { x: 248, y: 190 }, h: { x: 214, y: 180 }, grip: 'fist' },
    extras: <Circle cx={200} cy={168} r={32} fill="none" stroke={SG.accent} strokeWidth={4.5} strokeDasharray="8 8" />,
  },
  // Offside / encroachment / neutral-zone infraction: hands on hips.
  'nfl-offside': { l: HIPS_L, r: HIPS_R },
  // Pass interference: open hands pushed forward from the shoulders.
  'nfl-pass-interference': {
    l: { e: { x: 156, y: 166 }, h: { x: 118, y: 202 }, grip: 'palm' },
    r: { e: { x: 244, y: 166 }, h: { x: 282, y: 202 }, grip: 'palm' },
    extras: (<>
      <Arrow a={{ x: 118, y: 226 }} b={{ x: 94, y: 250 }} />
      <Arrow a={{ x: 282, y: 226 }} b={{ x: 306, y: 250 }} />
    </>),
  },
  // Personal foul: one wrist striking the other above the head.
  'nfl-personal-foul': {
    l: { e: { x: 160, y: 84 }, h: { x: 204, y: 46 }, grip: 'fist' },
    r: { e: { x: 232, y: 70 }, h: { x: 222, y: 22 }, grip: 'fist' },
    extras: <Arc d="M 162 28 A 32 32 0 0 1 192 38" />,
  },
  // Safety: palms pressed together above the head.
  'nfl-safety': {
    l: { e: { x: 176, y: 68 }, h: { x: 195, y: 18 }, grip: 'none' },
    r: { e: { x: 224, y: 68 }, h: { x: 205, y: 18 }, grip: 'none' },
    extras: <Line x1={200} y1={38} x2={200} y2={6} stroke={SG.body} strokeWidth={9} strokeLinecap="round" />,
  },
  // Delay of game: arms folded across the chest.
  'nfl-delay': {
    l: { e: { x: 158, y: 178 }, h: { x: 236, y: 188 }, grip: 'fist' },
    r: { e: { x: 242, y: 202 }, h: { x: 164, y: 210 }, grip: 'fist' },
  },
  // Timeout: arms crisscrossed above the head, waving.
  'nfl-timeout': {
    l: { e: { x: 172, y: 74 }, h: { x: 236, y: 26 }, grip: 'palm' },
    r: { e: { x: 228, y: 74 }, h: { x: 164, y: 26 }, grip: 'palm' },
    extras: <Arc d="M 148 60 A 70 26 0 0 1 252 60" />,
  },
  // Facemask: fist gripping in front of the face, pulling down.
  'nfl-facemask': {
    l: REST_L, r: { e: { x: 252, y: 122 }, h: { x: 218, y: 88 }, grip: 'fist' },
    extras: <Arrow a={{ x: 240, y: 96 }} b={{ x: 244, y: 132 }} />,
  },
  // Unsportsmanlike conduct: arms outstretched, flat palms down (static).
  'nfl-unsportsmanlike': { l: { ...OUT_L, grip: 'flat' }, r: { ...OUT_R, grip: 'flat' } },

  // ── NBA (referee) ──────────────────────────────────────────────────────────
  // Foul (stop clock for foul): one arm straight up, CLENCHED FIST.
  'nba-foul': { l: REST_L, r: { ...UP_R, grip: 'fist' } },
  // Violation (stop clock): one arm straight up, OPEN HAND.
  'nba-violation': { l: REST_L, r: UP_R },
  // Traveling: fists rolling around each other in front of the chest.
  'nba-travel': {
    l: { e: { x: 152, y: 176 }, h: { x: 186, y: 156 }, grip: 'fist' },
    r: { e: { x: 248, y: 190 }, h: { x: 214, y: 180 }, grip: 'fist' },
    extras: <Circle cx={200} cy={168} r={32} fill="none" stroke={SG.accent} strokeWidth={4.5} strokeDasharray="8 8" />,
  },
  // Technical foul: hands form a "T".
  'nba-technical': {
    l: { e: { x: 148, y: 158 }, h: { x: 176, y: 130 }, grip: 'none' },
    r: { e: { x: 252, y: 160 }, h: { x: 212, y: 146 }, grip: 'none' },
    extras: (<>
      <Line x1={206} y1={122} x2={206} y2={170} stroke={SG.body} strokeWidth={10} strokeLinecap="round" />
      <Line x1={172} y1={118} x2={240} y2={118} stroke={SG.body} strokeWidth={10} strokeLinecap="round" />
    </>),
  },
  // Jump ball / held ball: both thumbs up.
  'nba-jump-ball': {
    l: { e: { x: 158, y: 82 }, h: { x: 128, y: 40 }, grip: 'thumb' },
    r: { e: { x: 242, y: 82 }, h: { x: 272, y: 40 }, grip: 'thumb' },
  },
  // Blocking foul: both hands on hips.
  'nba-blocking': { l: HIPS_L, r: HIPS_R },
  // Charging (player control): fist punched into the open palm.
  'nba-charge': {
    l: { e: { x: 154, y: 168 }, h: { x: 180, y: 178 }, grip: 'flat' },
    r: { e: { x: 254, y: 178 }, h: { x: 208, y: 180 }, grip: 'fist' },
    extras: <Arrow a={{ x: 246, y: 154 }} b={{ x: 218, y: 168 }} />,
  },
  // Shot-clock violation: fingertips tap the top of the (same-side) shoulder.
  'nba-shot-clock': {
    l: REST_L, r: { e: { x: 258, y: 150 }, h: { x: 232, y: 112 }, grip: 'two' },
    extras: <Arc d="M 250 92 A 20 20 0 0 0 228 96" />,
  },
  // Three-point ATTEMPT: one arm up, three fingers.
  'nba-three-attempt': { l: REST_L, r: { ...UP_R, grip: 'three' } },
  // Three-point GOOD: both arms extended overhead.
  'nba-three-good': { l: { ...UP_L, grip: 'three' }, r: { ...UP_R, grip: 'three' } },
  // Count the basket ("and one"): arm punched down toward the floor.
  'nba-count-basket': {
    l: REST_L, r: { e: { x: 240, y: 172 }, h: { x: 266, y: 222 }, grip: 'fist' },
    extras: <Arrow a={{ x: 272, y: 238 }} b={{ x: 278, y: 272 }} />,
  },
  // Direction / possession: arm pointed along the sideline.
  'nba-direction': { l: REST_L, r: { e: { x: 258, y: 122 }, h: { x: 312, y: 122 }, grip: 'point' } },

  // ── NHL (referee / linesman) ───────────────────────────────────────────────
  // Goal: referee points into the net.
  'nhl-goal': {
    l: REST_L, r: { e: { x: 250, y: 158 }, h: { x: 296, y: 192 }, grip: 'point' },
    extras: (<>
      <Rect x={300} y={222} width={62} height={40} fill="none" stroke={SG.muted} strokeWidth={4} />
      <Line x1={321} y1={222} x2={321} y2={262} stroke={SG.muted} strokeWidth={2.5} />
      <Line x1={341} y1={222} x2={341} y2={262} stroke={SG.muted} strokeWidth={2.5} />
      <Line x1={300} y1={242} x2={362} y2={242} stroke={SG.muted} strokeWidth={2.5} />
    </>),
  },
  // Tripping: hand sweeps below the knee.
  'nhl-trip': {
    l: REST_L, r: { e: { x: 246, y: 198 }, h: { x: 240, y: 300 }, grip: 'flat' },
    extras: <Arc d="M 266 318 A 36 24 0 0 0 216 328" />,
  },
  // Hooking: tugging motion — both fists pulling back toward the body.
  'nhl-hook': {
    l: { e: { x: 160, y: 182 }, h: { x: 186, y: 210 }, grip: 'fist' },
    r: { e: { x: 248, y: 166 }, h: { x: 204, y: 182 }, grip: 'fist' },
    extras: <Arrow a={{ x: 254, y: 210 }} b={{ x: 226, y: 226 }} />,
  },
  // Holding: clasping the opposite wrist in front of the chest.
  'nhl-hold': {
    l: { e: { x: 166, y: 176 }, h: { x: 204, y: 196 }, grip: 'fist' },
    r: { e: { x: 252, y: 168 }, h: { x: 216, y: 190 }, grip: 'fist' },
    extras: <Circle cx={210} cy={193} r={20} fill="none" stroke={SG.accent} strokeWidth={4} strokeDasharray="7 7" />,
  },
  // Slashing: chopping the edge of one hand down onto the opposite forearm.
  'nhl-slash': {
    l: { e: { x: 150, y: 180 }, h: { x: 228, y: 186 }, grip: 'none' },
    r: { e: { x: 254, y: 132 }, h: { x: 206, y: 160 }, grip: 'flat' },
    extras: <Arrow a={{ x: 218, y: 128 }} b={{ x: 208, y: 168 }} />,
  },
  // High-sticking: two clenched fists stacked, held at forehead height.
  'nhl-highstick': {
    l: { e: { x: 172, y: 162 }, h: { x: 232, y: 128 }, grip: 'fist' },
    r: { e: { x: 254, y: 120 }, h: { x: 234, y: 94 }, grip: 'fist' },
  },
  // Interference: arms crossed in front of the chest, fists closed.
  'nhl-interference': {
    l: { e: { x: 162, y: 180 }, h: { x: 236, y: 188 }, grip: 'fist' },
    r: { e: { x: 238, y: 180 }, h: { x: 164, y: 188 }, grip: 'fist' },
  },
  // Boarding: fist pounded into the open palm.
  'nhl-board': {
    l: { e: { x: 154, y: 168 }, h: { x: 180, y: 178 }, grip: 'flat' },
    r: { e: { x: 254, y: 178 }, h: { x: 208, y: 180 }, grip: 'fist' },
    extras: <Arrow a={{ x: 246, y: 154 }} b={{ x: 218, y: 168 }} />,
  },
  // Charging: fists rotating around each other in front of the chest.
  'nhl-charge': {
    l: { e: { x: 152, y: 176 }, h: { x: 186, y: 156 }, grip: 'fist' },
    r: { e: { x: 248, y: 190 }, h: { x: 214, y: 180 }, grip: 'fist' },
    extras: <Circle cx={200} cy={168} r={32} fill="none" stroke={SG.accent} strokeWidth={4.5} strokeDasharray="8 8" />,
  },
  // Cross-checking: both fists thrust forward and back at chest height.
  'nhl-crosscheck': {
    l: { e: { x: 152, y: 178 }, h: { x: 114, y: 196 }, grip: 'fist' },
    r: { e: { x: 248, y: 178 }, h: { x: 286, y: 196 }, grip: 'fist' },
    extras: (<>
      <Arrow a={{ x: 106, y: 214 }} b={{ x: 82, y: 228 }} />
      <Arrow a={{ x: 294, y: 214 }} b={{ x: 318, y: 228 }} />
    </>),
  },
  // Delayed penalty: arm fully extended straight up (play continues until the whistle).
  'nhl-delayed-penalty': { l: REST_L, r: { ...UP_R, grip: 'none' } },
  // Washout: both arms swept out flat — no goal / icing waved off.
  'nhl-washout': {
    l: { ...OUT_L, grip: 'flat' }, r: { ...OUT_R, grip: 'flat' },
    extras: (<>
      <Arc d="M 120 94 A 44 30 0 0 0 78 106" />
      <Arc d="M 280 94 A 44 30 0 0 1 322 106" />
    </>),
  },
  // Misconduct: both hands on hips.
  'nhl-misconduct': { l: HIPS_L, r: HIPS_R },
  // Penalty shot: arms crossed above the head (static X).
  'nhl-penalty-shot': {
    l: { e: { x: 172, y: 74 }, h: { x: 236, y: 26 }, grip: 'fist' },
    r: { e: { x: 228, y: 74 }, h: { x: 164, y: 26 }, grip: 'fist' },
  },

  // ── Soccer (referee + assistant referee) ───────────────────────────────────
  // Yellow card: card raised high.
  'soc-yellow': { l: REST_L, r: { e: { x: 238, y: 76 }, h: { x: 262, y: 32 }, grip: 'cardY' } },
  // Red card: card raised high.
  'soc-red': { l: REST_L, r: { e: { x: 238, y: 76 }, h: { x: 262, y: 32 }, grip: 'cardR' } },
  // INDIRECT free kick: arm raised straight up and HELD there.
  'soc-indirect': { l: REST_L, r: UP_R },
  // DIRECT free kick: arm pointed toward the attacking direction (no raised arm).
  'soc-direct': { l: REST_L, r: { e: { x: 258, y: 122 }, h: { x: 312, y: 122 }, grip: 'point' } },
  // Advantage: arms extended forward, sweeping on — "play on".
  'soc-advantage': {
    l: { e: { x: 156, y: 180 }, h: { x: 118, y: 212 }, grip: 'palm' },
    r: { e: { x: 244, y: 180 }, h: { x: 282, y: 212 }, grip: 'palm' },
    extras: (<>
      <Arc d="M 96 232 A 40 26 0 0 1 140 244" />
      <Arc d="M 304 232 A 40 26 0 0 0 260 244" />
    </>),
  },
  // Penalty kick: referee points at the penalty spot.
  'soc-penalty': {
    l: REST_L, r: { e: { x: 250, y: 158 }, h: { x: 296, y: 194 }, grip: 'point' },
    extras: (<>
      <Line x1={292} y1={248} x2={352} y2={248} stroke={SG.muted} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={322} cy={234} r={8} fill={SG.accent} />
    </>),
  },
  // Corner kick: arm raised diagonally, pointing at the corner arc.
  'soc-corner': {
    l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 288, y: 44 }, grip: 'point' },
    extras: (<>
      <Line x1={330} y1={10} x2={330} y2={46} stroke={SG.muted} strokeWidth={4} strokeLinecap="round" />
      <Polygon points="330,10 330,28 352,19" fill={SG.accent} />
    </>),
  },
  // Offside (assistant): flag raised straight up.
  'soc-offside-flag': { l: REST_L, r: { e: { x: 222, y: 70 }, h: { x: 228, y: 20 }, grip: 'flag' } },
  // Throw-in (assistant): flag angled up in the throwing team's direction.
  'soc-throwin-flag': { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 286, y: 46 }, grip: 'flag' } },
  // Substitution (assistant): flag held horizontally overhead with both hands.
  'soc-sub-flag': {
    l: { e: { x: 172, y: 72 }, h: { x: 162, y: 26 }, grip: 'none' },
    r: { e: { x: 228, y: 72 }, h: { x: 238, y: 26 }, grip: 'none' },
    extras: (<>
      <Line x1={140} y1={18} x2={266} y2={18} stroke={SG.body} strokeWidth={5} strokeLinecap="round" />
      <Polygon points="266,18 240,18 258,36" fill={SG.accent} />
    </>),
  },
  // VAR review: the "TV screen" rectangle drawn in the air.
  'soc-var': {
    l: { e: { x: 150, y: 172 }, h: { x: 148, y: 150 }, grip: 'point' },
    r: { e: { x: 250, y: 172 }, h: { x: 252, y: 150 }, grip: 'point' },
    extras: <TvBox x={140} y={94} w={120} h={72} />,
  },

  // ── Rugby union (referee) ──────────────────────────────────────────────────
  // Try: arm raised straight up (back to the dead-ball line), whistle blown.
  'rug-try': { l: REST_L, r: { e: { x: 220, y: 68 }, h: { x: 224, y: 14 }, grip: 'none' } },
  // Penalty: arm angled UP (~45°) toward the non-offending team.
  'rug-penalty': { l: REST_L, r: { e: { x: 244, y: 84 }, h: { x: 292, y: 44 }, grip: 'none' } },
  // Free kick: arm bent square at the elbow (upper arm horizontal, forearm up).
  'rug-free-kick': { l: REST_L, r: { e: { x: 258, y: 122 }, h: { x: 258, y: 64 }, grip: 'none' } },
  // Scrum awarded: arm horizontal (shoulder height) toward the team throwing in.
  'rug-scrum': { l: REST_L, r: OUT_R },
  // Advantage: arm outstretched at WAIST height toward the non-offending team (~5s, no whistle).
  'rug-advantage': { l: REST_L, r: { e: { x: 252, y: 150 }, h: { x: 304, y: 182 }, grip: 'none' } },
  // Knock-on: arm raised, open hand waving back and forth above the head.
  'rug-knock-on': {
    l: REST_L, r: { e: { x: 234, y: 74 }, h: { x: 260, y: 28 }, grip: 'palm' },
    extras: <Arc d="M 222 16 A 46 22 0 0 1 300 24" />,
  },
  // Forward pass: hands mime a pass travelling forward.
  'rug-forward-pass': {
    l: { e: { x: 164, y: 190 }, h: { x: 158, y: 232 }, grip: 'palm' },
    r: { e: { x: 238, y: 196 }, h: { x: 178, y: 236 }, grip: 'palm' },
    extras: (<>
      <Arc d="M 176 254 A 100 60 0 0 0 296 216" />
      <Arrow a={{ x: 290, y: 220 }} b={{ x: 314, y: 206 }} />
    </>),
  },
  // High tackle: flat hand drawn across the throat/neck line.
  'rug-high-tackle': {
    l: REST_L, r: { e: { x: 254, y: 142 }, h: { x: 218, y: 106 }, grip: 'flat' },
    extras: <Arc d="M 238 100 A 40 14 0 0 0 166 104" />,
  },
  // Not releasing: both hands clutched to the chest as if refusing to let the ball go.
  'rug-not-release': {
    l: { e: { x: 158, y: 180 }, h: { x: 184, y: 184 }, grip: 'fist' },
    r: { e: { x: 242, y: 180 }, h: { x: 216, y: 184 }, grip: 'fist' },
    extras: (
      // a rugby ball (ellipse via two arcs) pinned at the chest
      <Path d="M 178 184 A 26 15 0 0 1 222 184 A 26 15 0 0 1 178 184"
        fill="none" stroke={SG.accent} strokeWidth={5} />
    ),
  },
  // TMO referral: the big "TV box" drawn in the air.
  'rug-tmo': {
    l: { e: { x: 150, y: 172 }, h: { x: 148, y: 150 }, grip: 'point' },
    r: { e: { x: 250, y: 172 }, h: { x: 252, y: 150 }, grip: 'point' },
    extras: <TvBox x={132} y={88} w={136} h={80} />,
  },
  // Obstruction: arms crossed in front of the chest, scissor motion.
  'rug-obstruction': {
    l: { e: { x: 162, y: 180 }, h: { x: 238, y: 186 }, grip: 'flat' },
    r: { e: { x: 238, y: 180 }, h: { x: 162, y: 186 }, grip: 'flat' },
    extras: (<>
      <Arc d="M 246 168 A 22 18 0 0 1 258 196" />
      <Arc d="M 154 168 A 22 18 0 0 0 142 196" />
    </>),
  },

  // ── Cricket (umpire — MCC Law 2.13) ────────────────────────────────────────
  // Out: index finger raised above head height.
  'crk-out': { l: REST_L, r: { e: { x: 230, y: 72 }, h: { x: 246, y: 22 }, grip: 'point' } },
  // Boundary four: arm waved side to side, finishing across the chest.
  'crk-four': {
    l: REST_L, r: { e: { x: 252, y: 162 }, h: { x: 172, y: 170 }, grip: 'flat' },
    extras: <Arc d="M 148 146 A 74 24 0 0 1 268 144" />,
  },
  // Boundary six: both arms raised above the head.
  'crk-six': { l: UP_L, r: UP_R },
  // Wide: BOTH arms extended horizontally.
  'crk-wide': { l: OUT_L, r: OUT_R },
  // No-ball: ONE arm extended horizontally.
  'crk-noball': { l: REST_L, r: OUT_R },
  // Bye: open hand raised above the head.
  'crk-bye': { l: REST_L, r: UP_R },
  // Leg bye: hand touching a raised knee.
  'crk-legbye': {
    l: REST_L, r: { e: { x: 248, y: 196 }, h: { x: 240, y: 250 }, grip: 'palm' },
    legs: { l: DEFAULT_LEGS.l, r: [{ x: 238, y: 262 }, { x: 222, y: 334 }] },
  },
  // Dead ball: wrists crossed and re-crossed below the waist.
  'crk-dead': {
    l: { e: { x: 168, y: 188 }, h: { x: 214, y: 258 }, grip: 'flat' },
    r: { e: { x: 232, y: 188 }, h: { x: 186, y: 258 }, grip: 'flat' },
    extras: <Arc d="M 158 278 A 54 18 0 0 0 242 278" />,
  },
  // Short run: bent arm, fingertips tapping the NEAR (same-side) shoulder.
  'crk-short-run': {
    l: REST_L, r: { e: { x: 258, y: 150 }, h: { x: 232, y: 112 }, grip: 'two' },
    extras: <Arc d="M 250 92 A 20 20 0 0 0 228 96" />,
  },
  // Free hit: arm circling above the head (follows a no-ball in white-ball cricket).
  'crk-free-hit': {
    l: REST_L, r: { e: { x: 220, y: 70 }, h: { x: 232, y: 20 }, grip: 'palm' },
    extras: <Arc d="M 148 36 A 62 34 0 1 1 252 34" />,
  },
  // New ball: ball held above the head.
  'crk-new-ball': { l: REST_L, r: { e: { x: 220, y: 70 }, h: { x: 226, y: 26 }, grip: 'ball' } },
  // 5 penalty runs to the BATTING side: repeatedly TAPPING the opposite shoulder.
  'crk-penalty-bat': {
    l: { e: { x: 156, y: 152 }, h: { x: 220, y: 116 }, grip: 'palm' },
    r: REST_R,
    extras: (<>
      <Arc d="M 240 94 A 18 18 0 0 0 222 100" />
      <Arc d="M 254 106 A 18 18 0 0 0 238 114" />
    </>),
  },
  // 5 penalty runs to the FIELDING side: hand PLACED on the opposite shoulder (static).
  'crk-penalty-field': {
    l: { e: { x: 156, y: 152 }, h: { x: 220, y: 116 }, grip: 'flat' },
    r: REST_R,
  },
  // Revoke last signal: touching both shoulders, each with the opposite hand.
  'crk-revoke': {
    l: { e: { x: 168, y: 164 }, h: { x: 226, y: 118 }, grip: 'palm' },
    r: { e: { x: 232, y: 164 }, h: { x: 174, y: 118 }, grip: 'palm' },
  },
  // TV referral: mimes a TV screen — decision sent upstairs.
  'crk-tv': {
    l: { e: { x: 150, y: 172 }, h: { x: 148, y: 150 }, grip: 'point' },
    r: { e: { x: 250, y: 172 }, h: { x: 252, y: 150 }, grip: 'point' },
    extras: <TvBox x={140} y={94} w={120} h={72} />,
  },
  // Last hour (Tests): pointing at a raised wrist — tapping the "watch".
  'crk-last-hour': {
    l: { e: { x: 152, y: 168 }, h: { x: 194, y: 138 }, grip: 'fist' },
    r: { e: { x: 252, y: 162 }, h: { x: 216, y: 146 }, grip: 'point' },
    extras: <Circle cx={196} cy={138} r={9} fill="none" stroke={SG.accent} strokeWidth={4} />,
  },
};

// ── the public renderer ──────────────────────────────────────────────────────
// Width-capped, centered SVG wrapper (portrait pictogram — a standing figure is
// taller than wide, so it doesn't take the full screen width like a scoreboard).
export function SignalArt({ signal }: { signal: SignalKey }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: '62%', maxWidth: 250, borderRadius: 16, overflow: 'hidden' }}>
        <Svg viewBox={`0 0 ${SIGNAL_VB.w} ${SIGNAL_VB.h}`}
          style={{ width: '100%', aspectRatio: SIGNAL_RATIO, backgroundColor: SG.bg }}>
          <Rect x={0} y={0} width={SIGNAL_VB.w} height={SIGNAL_VB.h} fill={SG.bg} />
          <Rect x={8} y={8} width={SIGNAL_VB.w - 16} height={SIGNAL_VB.h - 16} rx={14}
            fill={SG.panel} stroke={SG.line} strokeWidth={2} />
          {/* ground line the figure stands on */}
          <Line x1={60} y1={408} x2={340} y2={408} stroke={SG.line} strokeWidth={3} strokeLinecap="round" />
          <Figure spec={POSES[signal]} />
        </Svg>
      </View>
    </View>
  );
}
