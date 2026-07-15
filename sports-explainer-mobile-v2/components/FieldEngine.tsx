import { ReactNode, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Circle, Ellipse, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme, Theme } from '../lib/theme';
import type { Level } from '../lib/api';

// ============================================================================
// FieldEngine — the topic-AGNOSTIC football-field engine. First tenant: Box Count.
// It owns the field itself (paint, coordinate system, player dots), an overlay slot
// drawn UNDER the players, tap handling, and the shared scenario/verdict scaffolding
// (pills, difficulty tabs, verdict card, Next). It knows NOTHING about any specific
// module's concepts — no box, no run/pass, no counts. Modules layer that on top as
// data + config. If a module concept ever wants to live here, it belongs in the module.
//
// Coordinate system (shared with every field module — do NOT re-invent):
//   viewBox 680×380 · LOS at x=235 · offense LEFT (lower x) · defense RIGHT (higher x)
//   y is sideline-to-sideline, playable band 30–350.
// The FIELD (turf/lines/dots) uses the fixed spike palette — a football field is green
// in any app theme. The CHROME (pills/tabs/verdict/next) uses app theme tokens so it
// reads native to Coach's Corner.
// ============================================================================

export const FIELD = {
  vbW: 680, vbH: 380,
  los: 235,
  bandTop: 30, bandBot: 350, bandH: 320,
  stripeX0: 20, stripeW: 47, stripeCount: 14, ydStep: 47, ydMax: 660,
};

// The gridiron's own viewBox aspect ratio. Exported so a module (or LandscapeGameShell) sizes the
// field without recomputing 680/380 in two places — one source of truth, tied to FIELD.
export const FOOTBALL_FIELD_RATIO = FIELD.vbW / FIELD.vbH;

// Fixed FIELD palette — theme-independent, from the spike. FIELD-INTRINSIC colors only: turf, dots,
// lines, default dot-label colors, and the verdict-chip semantics (engine-owned scaffolding). Any
// STATE-highlight color (a reveal ring, a tap ring, a call-button hue) is a MODULE decision — it
// does NOT live here, because the engine must not know what a highlight MEANS.
export const FE = {
  navy: '#0d1b3e', orange: '#E87722', blue: '#378ADD',
  turfD: '#2F6B3D', turfL: '#357A46', chalk: '#F4F4EE', losLine: '#3B6FE0',
  losLabel: '#bcd3ff', offLabel: '#ffffff', defLabel: '#dbeaff', labelOutline: '#16331b',
  // Verdict chips — semantic self-contained (light chip + dark text, legible on any surface).
  good: '#0c7a5e', goodBg: '#e7f7f1', bad: '#b3261e', badBg: '#fdecec',
  // Neutral "mode" chip (the count readout) — a light chip like good/bad so it clears AA on the dark
  // card (the old themed grey-on-surfaceActive was doubly-dark and failed contrast).
  mode: '#4a5468', modeBg: '#e8ecf4',
};

const F_BOLD = 'SpaceGrotesk_700Bold'; // matches the app's other on-device SVG (FormationDiagram)

// A dot the engine can render. Fill is resolved from `team`; everything else (stroke ring,
// opacity, radius, tap handler) is module-driven state — that's how modules express interaction
// (tap ring, reveal ring, dim) without the engine knowing what any of it MEANS.
export interface FieldPlayer {
  id: string;
  x: number;
  y: number;
  team: 'offense' | 'defense';
  label?: string;
  labelColor?: string;
  r?: number;             // default 8
  primary?: boolean;      // offense primary (QB) → white stroke default
  stroke?: string;        // override (e.g. amber tap ring / green in-zone / navy)
  strokeWidth?: number;
  opacity?: number;       // reveal-dim
  onPress?: () => void;   // interactive dots (engine adds a larger transparent hit target)
}

// Precomputed field paint.
const STRIPES = Array.from({ length: FIELD.stripeCount }, (_, i) => ({
  x: FIELD.stripeX0 + i * FIELD.stripeW, fill: i % 2 ? FE.turfD : FE.turfL,
}));
const YDLINES: number[] = [];
for (let x = FIELD.stripeX0; x <= FIELD.ydMax; x += FIELD.ydStep) YDLINES.push(x);

// Label with a dark outline for legibility on turf. react-native-svg draws Text stroke OVER the
// fill (no CSS paint-order), so we render the outline pass first, then the fill pass on top.
function DotLabel({ x, y, text, color, opacity }: { x: number; y: number; text: string; color: string; opacity: number }) {
  const common = { x, y: y + 19, textAnchor: 'middle' as const, fontSize: 10.5, fontFamily: F_BOLD, opacity };
  return (
    <>
      <SvgText {...common} fill="none" stroke={FE.labelOutline} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={color}>{text}</SvgText>
    </>
  );
}

function Dot({ p }: { p: FieldPlayer }) {
  const fill = p.team === 'offense' ? FE.orange : FE.blue;
  const stroke = p.stroke ?? (p.primary ? '#ffffff' : FE.navy);
  const strokeWidth = p.strokeWidth ?? (p.primary ? 2 : 1.5);
  const r = p.r ?? 8;
  const opacity = p.opacity ?? 1;
  return (
    <>
      {/* Larger transparent hit target so small dots are tappable on a phone. */}
      {p.onPress && <Circle cx={p.x} cy={p.y} r={Math.max(r + 9, 17)} fill="transparent" onPress={p.onPress} />}
      <Circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} onPress={p.onPress} />
      {!!p.label && <DotLabel x={p.x} y={p.y} text={p.label} color={p.labelColor ?? (p.team === 'offense' ? FE.offLabel : FE.defLabel)} opacity={opacity} />}
    </>
  );
}

// Shared sizing wrapper for any field/pitch renderer. `fill='width'` (default) sizes by container
// WIDTH via aspectRatio — a wider column means bigger art. `fill='height'` (landscape) sizes by
// container HEIGHT, width derived. The aspect ratio is the renderer's OWN viewBox (viewW/viewH), NOT
// a hardcoded one — so a gridiron (680×380) and a soccer pitch (680×420) both size correctly.
function FieldCanvas({ viewW, viewH, fill = 'width', bg, children }: {
  viewW: number; viewH: number; fill?: 'width' | 'height'; bg: string; children: ReactNode;
}) {
  const ratio = viewW / viewH;
  const byHeight = fill === 'height';
  return (
    <View style={[fieldStyles.wrap, byHeight && { height: '100%' as const, aspectRatio: ratio }]}>
      <Svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        style={byHeight
          ? { width: '100%', height: '100%', backgroundColor: bg }
          : { width: '100%', aspectRatio: ratio, backgroundColor: bg }}>
        {children}
      </Svg>
    </View>
  );
}

// The line of scrimmage + its label, as ONE exported marker so every consumer stays aligned.
// The label is anchored `middle` AT the LOS x (owner feedback: the old start-anchored label read
// as floating off to the right of the line it names — it must sit ON the line). It renders in the
// strip above the playable band (y<bandTop) so it never collides with on-field art, with a short
// tick joining it to the line. Modules that draw the LOS inside their own overlay (the
// showLos={false} pattern) should render <LosMarker /> rather than re-drawing line+label by hand.
export function LosMarker() {
  return (
    <>
      <Line x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />
      <Line x1={FIELD.los} y1={24} x2={FIELD.los} y2={FIELD.bandTop} stroke={FE.losLine} strokeWidth={1.5} opacity={0.7} />
      <SvgText x={FIELD.los} y={20} textAnchor="middle" fill={FE.losLabel} fontSize={10.5} fontFamily={F_BOLD}>Line of scrimmage</SvgText>
    </>
  );
}

// The gridiron: turf → stripes → yard lines → [overlay slot, UNDER players] → LOS → players.
// `showLos` (default true) draws the engine's line-of-scrimmage on top of the overlay. A module that
// puts tappable art (dots) in the overlay can pass showLos={false} and draw the LOS as its FIRST overlay
// element instead, so the line sits UNDER its dots rather than slicing them. Default preserves the
// original behavior for existing consumers (Box Count passes nothing → LOS drawn as before).
export function FootballField({ players, overlay, fill = 'width', showLos = true }: {
  players: FieldPlayer[]; overlay?: ReactNode; fill?: 'width' | 'height'; showLos?: boolean;
}) {
  return (
    <FieldCanvas viewW={FIELD.vbW} viewH={FIELD.vbH} fill={fill} bg={FE.turfD}>
      <Rect x={0} y={0} width={FIELD.vbW} height={FIELD.vbH} fill={FE.turfD} />
      {STRIPES.map((s, i) => (
        <Rect key={`st${i}`} x={s.x} y={FIELD.bandTop} width={FIELD.stripeW} height={FIELD.bandH} fill={s.fill} />
      ))}
      {YDLINES.map((x, i) => (
        <Line key={`yd${i}`} x1={x} y1={FIELD.bandTop} x2={x} y2={FIELD.bandBot} stroke={FE.chalk} strokeWidth={1.2} opacity={0.8} />
      ))}
      {overlay}
      {showLos && <LosMarker />}
      {players.map(p => <Dot key={p.id} p={p} />)}
    </FieldCanvas>
  );
}

// ── Soccer pitch (attacking LEFT→RIGHT; defenders defend the RIGHT goal; NO line of scrimmage) ──
// viewBox 680×420. Paint only (boundary/halfway/center circle/right penalty+6-yd box/right goal);
// the module supplies the DYNAMIC layer (moving players, ball, offside lines) as `children` on top —
// the pitch is topic-agnostic, exactly like FootballField is to Box Count.
export const PITCH = { vbW: 680, vbH: 420, stripeW: 68, stripeCount: 10 };
// The pitch's own viewBox aspect ratio — the soccer counterpart to FOOTBALL_FIELD_RATIO.
export const SOCCER_PITCH_RATIO = PITCH.vbW / PITCH.vbH;
const SOCCER = { turfD: '#2f7a44', turfL: '#358a4c', chalk: '#F4F4EE' };
const PITCH_STRIPES = Array.from({ length: PITCH.stripeCount }, (_, i) => ({
  x: i * PITCH.stripeW, fill: i % 2 ? SOCCER.turfD : SOCCER.turfL,
}));

export function SoccerPitch({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={PITCH.vbW} viewH={PITCH.vbH} fill={fill} bg={SOCCER.turfD}>
      {PITCH_STRIPES.map((s, i) => (
        <Rect key={`ps${i}`} x={s.x} y={0} width={PITCH.stripeW} height={PITCH.vbH} fill={s.fill} />
      ))}
      {/* boundary */}
      <Rect x={6} y={6} width={668} height={408} fill="none" stroke={SOCCER.chalk} strokeWidth={2} opacity={0.7} />
      {/* halfway line + center circle */}
      <Line x1={340} y1={6} x2={340} y2={414} stroke={SOCCER.chalk} strokeWidth={2} opacity={0.55} />
      <Circle cx={340} cy={210} r={44} fill="none" stroke={SOCCER.chalk} strokeWidth={2} opacity={0.45} />
      {/* right penalty box + 6-yard box + goal (the attacking target) */}
      <Rect x={578} y={110} width={96} height={200} fill="none" stroke={SOCCER.chalk} strokeWidth={2} opacity={0.7} />
      <Rect x={634} y={160} width={40} height={100} fill="none" stroke={SOCCER.chalk} strokeWidth={2} opacity={0.7} />
      <Rect x={674} y={180} width={6} height={60} fill={SOCCER.chalk} opacity={0.85} />
      {children}
    </FieldCanvas>
  );
}

// ── Baseball diamond (home at BOTTOM, outfield at TOP; NO line of scrimmage) ──
// viewBox 680×560 — near-SQUARE (ratio ~1.21), unlike the wide pitches (this is the first field that
// goes HEIGHT-bound in landscape; the shell's controls-absorb-slack handles the leftover width). Paint
// only (grass stripes / dirt infield + mound + home circle / foul lines + dashed basepaths / four
// bases); the module supplies the DYNAMIC layer (fielders, runners, ball, tap-targets) as `children`.
// Geometry is the prototype's, verbatim; the module's data lib uses the SAME 680×560 base coordinates
// so its dynamic layer lands on these painted bases (the shared-viewBox contract, as with FIELD).
export const DIAMOND = { vbW: 680, vbH: 560 };
export const BASEBALL_DIAMOND_RATIO = DIAMOND.vbW / DIAMOND.vbH;
const BB = { grassD: '#2f7a44', grassL: '#358a4c', dirt: '#b06a3a', dirtD: '#9a5a2f', chalk: '#F4F4EE' };
const BB_STRIPES = Array.from({ length: 8 }, (_, i) => ({ x: i * 85, fill: i % 2 ? BB.grassD : BB.grassL }));
const BB_BASES: [number, number][] = [[490, 340], [340, 190], [190, 340], [340, 490]]; // first, second, third, home

export function BaseballDiamond({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={DIAMOND.vbW} viewH={DIAMOND.vbH} fill={fill} bg={BB.grassD}>
      {BB_STRIPES.map((s, i) => (
        <Rect key={`bg${i}`} x={s.x} y={0} width={85} height={DIAMOND.vbH} fill={s.fill} />
      ))}
      {/* dirt infield + pitching mound + home-plate circle */}
      <Polygon points="340,532 532,340 340,148 148,340" fill={BB.dirt} opacity={0.95} />
      <Circle cx={340} cy={355} r={26} fill={BB.dirtD} />
      <Circle cx={340} cy={490} r={30} fill={BB.dirtD} opacity={0.6} />
      {/* foul lines (extended past the field, clipped by the viewBox) + dashed basepath square */}
      <Line x1={340} y1={490} x2={865} y2={-35} stroke={BB.chalk} strokeWidth={2.5} opacity={0.85} />
      <Line x1={340} y1={490} x2={-185} y2={-35} stroke={BB.chalk} strokeWidth={2.5} opacity={0.85} />
      <Polygon points="340,490 490,340 340,190 190,340" fill="none" stroke={BB.chalk} strokeWidth={2} opacity={0.45} strokeDasharray="5 5" />
      {/* four bases — 13×13 squares rotated 45° about their centers */}
      {BB_BASES.map(([bx, by], i) => (
        <Rect key={`base${i}`} x={bx - 6.5} y={by - 6.5} width={13} height={13} fill="#fff" stroke={FE.navy} strokeWidth={1.5} rotation={45} originX={bx} originY={by} />
      ))}
      {children}
    </FieldCanvas>
  );
}

// ── Basketball court (FULL court, hoops LEFT and RIGHT; NBA + WNBA share it) ──
// viewBox 680×360. Paint only (wood, halfcourt, keys, FT circles, 3-pt lines, rims/backboards);
// the module supplies the DYNAMIC layer as `children` — same topic-agnostic contract as SoccerPitch.
// Geometry at ~7 px/ft: rims at x=47/633 · keys x=10..143 / 537..670, y=124..236 · FT circles r=42 ·
// 3-pt arc r=167 about the rim, corner lines at y=26/334 meeting the arc at x=110/570.
export const COURT = { vbW: 680, vbH: 360 };
export const BASKETBALL_COURT_RATIO = COURT.vbW / COURT.vbH;
const HOOPS = { wood: '#C98A4B', woodD: '#BD7E42', paint: '#A34A2A', rim: '#E0704A', chalk: '#F4F4EE' };

export function BasketballCourt({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={COURT.vbW} viewH={COURT.vbH} fill={fill} bg={HOOPS.woodD}>
      <Rect x={10} y={10} width={660} height={340} fill={HOOPS.wood} stroke={HOOPS.chalk} strokeWidth={2.5} />
      {/* halfcourt line + center circle */}
      <Line x1={340} y1={10} x2={340} y2={350} stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Circle cx={340} cy={180} r={42} fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      {/* keys (painted lanes) + free-throw circles */}
      <Rect x={10} y={124} width={133} height={112} fill={HOOPS.paint} stroke={HOOPS.chalk} strokeWidth={2} />
      <Rect x={537} y={124} width={133} height={112} fill={HOOPS.paint} stroke={HOOPS.chalk} strokeWidth={2} />
      <Circle cx={143} cy={180} r={42} fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Circle cx={537} cy={180} r={42} fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      {/* three-point lines: corner lines + arc about each rim */}
      <Line x1={10} y1={26} x2={110} y2={26} stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Line x1={10} y1={334} x2={110} y2={334} stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Path d="M110 26 A167 167 0 0 1 110 334" fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Line x1={570} y1={26} x2={670} y2={26} stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Line x1={570} y1={334} x2={670} y2={334} stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      <Path d="M570 26 A167 167 0 0 0 570 334" fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.85} />
      {/* backboards + rims */}
      <Line x1={38} y1={159} x2={38} y2={201} stroke={HOOPS.chalk} strokeWidth={3} />
      <Line x1={642} y1={159} x2={642} y2={201} stroke={HOOPS.chalk} strokeWidth={3} />
      <Circle cx={47} cy={180} r={6} fill="none" stroke={HOOPS.rim} strokeWidth={2.5} />
      <Circle cx={633} cy={180} r={6} fill="none" stroke={HOOPS.rim} strokeWidth={2.5} />
      {children}
    </FieldCanvas>
  );
}

// ── Hockey rink (nets LEFT and RIGHT; center ice at 340,150) ──
// viewBox 680×300, ~3.3 px/ft. Rounded ice sheet on a navy surround; goal lines x=46/634, blue lines
// x=258/422, red line x=340, end-zone faceoff circles r=50, creases bulge INTO the play (in FRONT of
// each net), trapezoids behind the goal lines. Module supplies the dynamic layer as `children`.
export const RINK = { vbW: 680, vbH: 300 };
export const HOCKEY_RINK_RATIO = RINK.vbW / RINK.vbH;
const ICE = { sheet: '#E9F2F7', board: '#9FB6C9', red: '#D64545', blue: '#2E6FBF', creaseFill: '#9CC9EA' };

export function HockeyRink({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={RINK.vbW} viewH={RINK.vbH} fill={fill} bg={FE.navy}>
      <Rect x={10} y={10} width={660} height={280} rx={70} fill={ICE.sheet} stroke={ICE.board} strokeWidth={3} />
      {/* goal lines (red) + trapezoids behind them */}
      <Line x1={46} y1={20} x2={46} y2={280} stroke={ICE.red} strokeWidth={2} />
      <Line x1={634} y1={20} x2={634} y2={280} stroke={ICE.red} strokeWidth={2} />
      <Line x1={46} y1={114} x2={14} y2={102} stroke={ICE.red} strokeWidth={1.5} opacity={0.8} />
      <Line x1={46} y1={186} x2={14} y2={198} stroke={ICE.red} strokeWidth={1.5} opacity={0.8} />
      <Line x1={634} y1={114} x2={666} y2={102} stroke={ICE.red} strokeWidth={1.5} opacity={0.8} />
      <Line x1={634} y1={186} x2={666} y2={198} stroke={ICE.red} strokeWidth={1.5} opacity={0.8} />
      {/* blue lines + center red line + center circle */}
      <Line x1={258} y1={11} x2={258} y2={289} stroke={ICE.blue} strokeWidth={5} opacity={0.9} />
      <Line x1={422} y1={11} x2={422} y2={289} stroke={ICE.blue} strokeWidth={5} opacity={0.9} />
      <Line x1={340} y1={11} x2={340} y2={289} stroke={ICE.red} strokeWidth={4} opacity={0.9} />
      <Circle cx={340} cy={150} r={50} fill="none" stroke={ICE.blue} strokeWidth={2} />
      <Circle cx={340} cy={150} r={4} fill={ICE.blue} />
      {/* end-zone faceoff circles + dots */}
      {([[112, 78], [112, 222], [568, 78], [568, 222]] as [number, number][]).map(([x, y], i) => (
        <Circle key={`fo${i}`} cx={x} cy={y} r={50} fill="none" stroke={ICE.red} strokeWidth={2} opacity={0.9} />
      ))}
      {([[112, 78], [112, 222], [568, 78], [568, 222]] as [number, number][]).map(([x, y], i) => (
        <Circle key={`fd${i}`} cx={x} cy={y} r={4} fill={ICE.red} />
      ))}
      {/* creases (blue paint bulging away from each net, toward center ice) + nets */}
      <Path d="M46 128 A22 22 0 0 1 46 172 Z" fill={ICE.creaseFill} opacity={0.85} stroke={ICE.blue} strokeWidth={1.5} />
      <Path d="M634 128 A22 22 0 0 0 634 172 Z" fill={ICE.creaseFill} opacity={0.85} stroke={ICE.blue} strokeWidth={1.5} />
      <Rect x={34} y={136} width={12} height={28} fill="none" stroke={ICE.red} strokeWidth={2} />
      <Rect x={634} y={136} width={12} height={28} fill="none" stroke={ICE.red} strokeWidth={2} />
      {children}
    </FieldCanvas>
  );
}

// ── Tennis court (net VERTICAL at x=340; baselines LEFT and RIGHT) ──
// viewBox 680×340. Hard court on a green surround. Court x=67..613, y=44..296; singles sidelines
// y=76/264; service lines x=193/487; center service line y=170; center marks on both baselines.
// Module supplies the dynamic layer as `children`.
export const TENNIS_C = { vbW: 680, vbH: 340 };
export const TENNIS_COURT_RATIO = TENNIS_C.vbW / TENNIS_C.vbH;
const TEN = { surround: '#2E5D4E', court: '#3170B7', chalk: '#F4F4EE', net: '#E5ECF2', post: '#26323B' };

export function TennisCourt({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={TENNIS_C.vbW} viewH={TENNIS_C.vbH} fill={fill} bg={TEN.surround}>
      <Rect x={67} y={44} width={546} height={252} fill={TEN.court} stroke={TEN.chalk} strokeWidth={2.5} />
      {/* singles sidelines (doubles alleys outside them) */}
      <Line x1={67} y1={76} x2={613} y2={76} stroke={TEN.chalk} strokeWidth={2} opacity={0.9} />
      <Line x1={67} y1={264} x2={613} y2={264} stroke={TEN.chalk} strokeWidth={2} opacity={0.9} />
      {/* service lines + center service line */}
      <Line x1={193} y1={76} x2={193} y2={264} stroke={TEN.chalk} strokeWidth={2} opacity={0.9} />
      <Line x1={487} y1={76} x2={487} y2={264} stroke={TEN.chalk} strokeWidth={2} opacity={0.9} />
      <Line x1={193} y1={170} x2={487} y2={170} stroke={TEN.chalk} strokeWidth={2} opacity={0.9} />
      {/* center marks on the baselines */}
      <Line x1={67} y1={170} x2={76} y2={170} stroke={TEN.chalk} strokeWidth={2.5} />
      <Line x1={604} y1={170} x2={613} y2={170} stroke={TEN.chalk} strokeWidth={2.5} />
      {/* the net (posts outside the doubles lines) */}
      <Line x1={340} y1={30} x2={340} y2={310} stroke={TEN.net} strokeWidth={4} />
      <Circle cx={340} cy={30} r={4} fill={TEN.post} />
      <Circle cx={340} cy={310} r={4} fill={TEN.post} />
      {children}
    </FieldCanvas>
  );
}

// ── Cricket ground (OVAL; pitch VERTICAL in the middle — bowler's end TOP, striker BOTTOM) ──
// viewBox 680×460. Boundary ellipse (340,230) rx=320 ry=215 with the rope just inside; dashed
// 30-yard fielding circle rx=190 ry=130; pitch rect x=325..355, y=160..300 with creases + stumps
// at each end. Fielding positions are MODULE data (children) — the ground stays position-agnostic.
export const GROUND = { vbW: 680, vbH: 460 };
export const CRICKET_GROUND_RATIO = GROUND.vbW / GROUND.vbH;
const CRK = { out: '#1C3B27', turfD: '#2f7a44', turfL: '#3A8A50', chalk: '#F4F4EE', pitch: '#C9A66B', stump: '#3A2C18' };

export function CricketGround({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={GROUND.vbW} viewH={GROUND.vbH} fill={fill} bg={CRK.out}>
      <Ellipse cx={340} cy={230} rx={320} ry={215} fill={CRK.turfD} />
      <Ellipse cx={340} cy={230} rx={316} ry={211} fill="none" stroke={CRK.chalk} strokeWidth={3} opacity={0.85} />
      {/* 30-yard fielding circle (powerplay ring) */}
      <Ellipse cx={340} cy={230} rx={190} ry={130} fill={CRK.turfL} opacity={0.45} />
      <Ellipse cx={340} cy={230} rx={190} ry={130} fill="none" stroke={CRK.chalk} strokeWidth={2} strokeDasharray="6 6" opacity={0.7} />
      {/* the pitch: bowler's end TOP (y=160), striker's end BOTTOM (y=300) */}
      <Rect x={325} y={160} width={30} height={140} rx={3} fill={CRK.pitch} />
      <Line x1={327} y1={176} x2={353} y2={176} stroke={CRK.chalk} strokeWidth={1.5} />
      <Line x1={327} y1={284} x2={353} y2={284} stroke={CRK.chalk} strokeWidth={1.5} />
      <Rect x={335} y={163} width={10} height={5} rx={1} fill={CRK.stump} />
      <Rect x={335} y={292} width={10} height={5} rx={1} fill={CRK.stump} />
      {children}
    </FieldCanvas>
  );
}

// ── Golf hole (tee LEFT → green RIGHT; hole anatomy: tee/fairway/rough/bunkers/water/green/pin) ──
// viewBox 680×340. Deep rough base; fairway = overlapping light ellipses (organic shape, cheap);
// OB stakes along the TOP edge; 150-yard marker mid-fairway; greenside + fairway bunkers; water
// guarding the front-right of the green. Module supplies the dynamic layer as `children`.
export const HOLE = { vbW: 680, vbH: 340 };
export const GOLF_HOLE_RATIO = HOLE.vbW / HOLE.vbH;
const GLF = {
  rough: '#255C33', roughL: '#2C6A3C', fairway: '#4B9A56', fringe: '#57B267', green: '#6FCF7F',
  sand: '#E7D7A3', water: '#3A7FC1', waterEdge: '#A8D0EE', stake: '#F4F4EE', flag: '#D64545', stick: '#E8E8E8', cup: '#1E2A24',
};

// `showPin` (default true) draws the painted cup+flagstick. A module whose scenario
// supplies its OWN pin position (e.g. a Zone Tap flag mark for "pin tucked behind the
// bunker") passes showPin={false} so the scene shows exactly one pin — where the words say.
export function GolfHole({ fill = 'width', showPin = true, children }: { fill?: 'width' | 'height'; showPin?: boolean; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={HOLE.vbW} viewH={HOLE.vbH} fill={fill} bg={GLF.rough}>
      <Ellipse cx={340} cy={175} rx={310} ry={135} fill={GLF.roughL} opacity={0.55} />
      {/* fairway (three overlapping lobes, tee side → green side) */}
      <Ellipse cx={180} cy={170} rx={100} ry={42} fill={GLF.fairway} />
      <Ellipse cx={330} cy={165} rx={120} ry={48} fill={GLF.fairway} />
      <Ellipse cx={470} cy={168} rx={90} ry={40} fill={GLF.fairway} />
      {/* tee box + tee markers */}
      <Rect x={30} y={150} width={40} height={40} rx={6} fill={GLF.fairway} stroke={GLF.stake} strokeWidth={1.5} />
      <Circle cx={62} cy={157} r={3} fill={GLF.stake} />
      <Circle cx={62} cy={183} r={3} fill={GLF.stake} />
      {/* hazards: water + fairway bunker + two greenside bunkers */}
      <Ellipse cx={450} cy={245} rx={55} ry={26} fill={GLF.water} stroke={GLF.waterEdge} strokeWidth={1.5} />
      <Ellipse cx={300} cy={110} rx={24} ry={13} fill={GLF.sand} />
      <Ellipse cx={540} cy={215} rx={20} ry={12} fill={GLF.sand} />
      <Ellipse cx={655} cy={125} rx={16} ry={10} fill={GLF.sand} />
      {/* fringe + green + cup + pin (pin optional — see showPin) */}
      <Ellipse cx={595} cy={170} rx={66} ry={58} fill={GLF.fringe} />
      <Ellipse cx={595} cy={170} rx={48} ry={42} fill={GLF.green} />
      {showPin && (
        <>
          <Circle cx={605} cy={168} r={3} fill={GLF.cup} />
          <Line x1={605} y1={168} x2={605} y2={128} stroke={GLF.stick} strokeWidth={2} />
          <Polygon points="605,128 605,141 626,134.5" fill={GLF.flag} />
        </>
      )}
      {/* 150-yard marker + out-of-bounds stakes along the top */}
      <Circle cx={390} cy={200} r={4} fill={GLF.stake} stroke="#888" strokeWidth={1} />
      {[90, 190, 290, 390, 490, 590].map(x => <Circle key={`ob${x}`} cx={x} cy={10} r={3} fill={GLF.stake} />)}
      {children}
    </FieldCanvas>
  );
}

// ── Rugby pitch (attack LEFT→RIGHT; in-goal areas at BOTH ends; halfway/22s/10m/5m lines) ──
// viewBox 680×420 (same footprint as the soccer PITCH). Try lines x=66/614 (in-goals shaded
// beyond), 22-metre lines x=187/493, dashed 10-metre lines x=285/395, dashed 5-metre-from-try
// lines x=93/587, halfway x=340 with the kickoff center spot, posts ON each try line.
export const RUGBY_P = { vbW: 680, vbH: 420 };
export const RUGBY_PITCH_RATIO = RUGBY_P.vbW / RUGBY_P.vbH;
const RUG = { turfD: '#2f7a44', turfL: '#358a4c', chalk: '#F4F4EE', shade: 'rgba(13,27,62,0.18)' };
const RUG_STRIPES = Array.from({ length: 10 }, (_, i) => ({ x: i * 68, fill: i % 2 ? RUG.turfD : RUG.turfL }));

export function RugbyPitch({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <FieldCanvas viewW={RUGBY_P.vbW} viewH={RUGBY_P.vbH} fill={fill} bg={RUG.turfD}>
      {RUG_STRIPES.map((s, i) => (
        <Rect key={`rs${i}`} x={s.x} y={0} width={68} height={RUGBY_P.vbH} fill={s.fill} />
      ))}
      {/* in-goal areas (shaded) + boundary */}
      <Rect x={6} y={6} width={60} height={408} fill={RUG.shade} />
      <Rect x={614} y={6} width={60} height={408} fill={RUG.shade} />
      <Rect x={6} y={6} width={668} height={408} fill="none" stroke={RUG.chalk} strokeWidth={2} opacity={0.7} />
      {/* try lines + posts on them */}
      <Line x1={66} y1={6} x2={66} y2={414} stroke={RUG.chalk} strokeWidth={3} opacity={0.9} />
      <Line x1={614} y1={6} x2={614} y2={414} stroke={RUG.chalk} strokeWidth={3} opacity={0.9} />
      <Line x1={66} y1={196} x2={66} y2={224} stroke={RUG.chalk} strokeWidth={5} />
      <Line x1={614} y1={196} x2={614} y2={224} stroke={RUG.chalk} strokeWidth={5} />
      {/* 5m-from-try (dashed) · 22m · 10m (dashed) · halfway + center spot */}
      <Line x1={93} y1={6} x2={93} y2={414} stroke={RUG.chalk} strokeWidth={1.5} strokeDasharray="6 8" opacity={0.5} />
      <Line x1={587} y1={6} x2={587} y2={414} stroke={RUG.chalk} strokeWidth={1.5} strokeDasharray="6 8" opacity={0.5} />
      <Line x1={187} y1={6} x2={187} y2={414} stroke={RUG.chalk} strokeWidth={2} opacity={0.7} />
      <Line x1={493} y1={6} x2={493} y2={414} stroke={RUG.chalk} strokeWidth={2} opacity={0.7} />
      <Line x1={285} y1={6} x2={285} y2={414} stroke={RUG.chalk} strokeWidth={2} strokeDasharray="8 7" opacity={0.6} />
      <Line x1={395} y1={6} x2={395} y2={414} stroke={RUG.chalk} strokeWidth={2} strokeDasharray="8 7" opacity={0.6} />
      <Line x1={340} y1={6} x2={340} y2={414} stroke={RUG.chalk} strokeWidth={2.5} opacity={0.8} />
      <Circle cx={340} cy={210} r={3.5} fill={RUG.chalk} opacity={0.9} />
      {children}
    </FieldCanvas>
  );
}

// Numberless scenario pills. Active = accent; the module owns the item list + selection.
// `wrap`: default false → a horizontal ScrollView (portrait). true → a compact flex-WRAP row that
// takes only its natural height (for a landscape header, where a horizontal ScrollView placed in a
// flex column grows to fill the vertical space and balloons the pills — the prototype uses flex-wrap).
export function ScenarioPills<T extends string>({ items, currentKey, onSelect, wrap = false }: {
  items: { key: T; name: string }[]; currentKey: T; onSelect: (key: T) => void; wrap?: boolean;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => chromeStyles(theme), [theme]);
  const pills = items.map(it => {
    const on = it.key === currentKey;
    return (
      <TouchableOpacity key={it.key} style={[s.pill, on && s.pillOn]} activeOpacity={0.8} onPress={() => onSelect(it.key)}>
        <Text style={[s.pillText, on && s.pillTextOn]}>{it.name}</Text>
      </TouchableOpacity>
    );
  });
  if (wrap) return <View style={s.pillWrap}>{pills}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
      {pills}
    </ScrollView>
  );
}

// Difficulty tabs — the app contract: internal keys kid/beginner/intermediate/expert, 'kid' shows
// as "Rookie" (display-only rename, used everywhere). Shared by every field module's verdict.
const LEVELS: { key: Level; label: string }[] = [
  { key: 'kid', label: 'Rookie' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'expert', label: 'Expert' },
];

export function DifficultyTabs({ level, onSelect, compact = false }: { level: Level; onSelect: (l: Level) => void; compact?: boolean }) {
  const { theme } = useTheme();
  const s = useMemo(() => chromeStyles(theme), [theme]);
  return (
    <View style={[s.depth, compact && s.depthCompact]}>
      {LEVELS.map(l => {
        const on = l.key === level;
        return (
          <TouchableOpacity key={l.key} style={[s.depthTab, compact && s.depthTabCompact, on && s.depthTabOn]} activeOpacity={0.8} onPress={() => onSelect(l.key)}>
            <Text style={[s.depthText, compact && s.depthTextCompact, on && s.depthTextOn]}>{l.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Verdict card: correct/incorrect tag + a neutral "mode" tag (module supplies its text, e.g. the
// count readout) + title + live difficulty tabs + per-level body. Purely presentational.
export function VerdictCard({ visible, correct, tagText, modeText, title, level, onSelectLevel, body, compact = false }: {
  visible: boolean; correct: boolean; tagText: string; modeText: string; title: string;
  level: Level; onSelectLevel: (l: Level) => void; body: string; compact?: boolean;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => chromeStyles(theme), [theme]);
  if (!visible) return null;
  return (
    <View style={[s.verdict, compact && s.verdictCompact]}>
      <View style={[s.tagRow, compact && s.tagRowCompact]}>
        <Text style={[s.tag, correct ? s.tagGood : s.tagBad]}>{tagText}</Text>
        {!!modeText && <Text style={[s.tag, s.tagMode]}>{modeText}</Text>}
      </View>
      {/* compact (landscape): force the count-carrying headline onto ONE line, shrinking to fit. */}
      <Text style={[s.verdictTitle, compact && s.verdictTitleCompact]} numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact} minimumFontScale={compact ? 0.7 : undefined}>{title}</Text>
      <DifficultyTabs level={level} onSelect={onSelectLevel} compact={compact} />
      <Text style={[s.verdictBody, compact && s.verdictBodyCompact]}>{body}</Text>
    </View>
  );
}

// Advance-to-next control (shown after a call). `variant`: 'outline' (default, the standalone look) or
// 'filled' (accent fill — a primary/emphasized action, e.g. the pinned Next in a footer row). `style`
// lets a caller compose it into a row (e.g. flex:1) — the base bakes alignSelf:'flex-start' for the
// standalone case, so a row-composed caller overrides alignSelf via `style`.
export function NextButton({ visible, label, onPress, variant = 'outline', style }: {
  visible: boolean; label: string; onPress: () => void; variant?: 'outline' | 'filled'; style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => chromeStyles(theme), [theme]);
  if (!visible) return null;
  const filled = variant === 'filled';
  return (
    <TouchableOpacity style={[s.nextBtn, filled && s.nextBtnFilled, style]} activeOpacity={0.8} onPress={onPress}>
      <Text style={[s.nextBtnText, filled && s.nextBtnTextFilled]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── LandscapeGameShell ─────────────────────────────────────────────────────
// The shared landscape scaffold, extracted from Box Count + Onside/Off (proven against both). It is
// LAYOUT-ONLY: it measures the body, computes the field/controls split, and renders slots. It knows
// NOTHING about verdicts, scrubbers, judged-state, or any module concept — the module fills the slots
// and owns all of that. A module wanting a different landscape layout simply does NOT use this and
// renders its own tree (it's an ordinary component, not a mandate).
//
// Layout: pills (+ optional topRight accessory) across the top; below, a row of
//   [ field column: {field} + optional {belowField} ]  ‖cushion‖  [ controls column ].
// The field column is width-sized so the art (fill='width') fits BOTH the leftover width and the body
// height minus belowFieldReserve. The controls column has a reserved width that GROWS to absorb any
// horizontal slack a near-square field leaves (so the field stays hard-left and the controls meet the
// right edge); {controls} scroll internally, and an optional {controlsFooter} pins to the bottom.
const SHELL_CUSHION = 24;      // transparent navy gap between the field and the controls (a real margin, not space-between)
const SHELL_CONTROL_MAX = 480; // controls may grow to here to absorb slack from a near-square field (wide fields never reach it)
export function LandscapeGameShell({
  aspectRatio, belowFieldReserve = 0, pills, topRight, field, belowField, controls, controlsFooter,
}: {
  aspectRatio: number;          // the field renderer's OWN viewBox ratio (FOOTBALL_FIELD_RATIO / SOCCER_PITCH_RATIO)
  belowFieldReserve?: number;   // height reserved under the field for {belowField} (keeps the art size stable)
  pills: ReactNode;
  topRight?: ReactNode;         // optional top-bar accessory (e.g. a count pill)
  field: ReactNode;             // the field/pitch element (rendered with its default fill='width')
  belowField?: ReactNode;       // optional content in the reserved strip under the field (hint / scrubber)
  controls: ReactNode;          // right-column content — scrolls internally
  controlsFooter?: ReactNode;   // optional pinned footer under the scroll (e.g. Reset · Replay · Next)
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => shellStyles(theme), [theme]);
  const [ls, setLs] = useState({ w: 0, h: 0 });
  // Reserve a controls column wide enough for its content (tiers/verdict on one line), then size the
  // field to fill the rest — bounded by BOTH the leftover width (availW) and the body height (heightFillW).
  const controlWBase = ls.w ? Math.round(Math.max(300, Math.min(380, ls.w * 0.42))) : 0;
  const availW = ls.w - controlWBase - SHELL_CUSHION;            // width left for the field after the reserve
  const heightFillW = (ls.h - belowFieldReserve) * aspectRatio;  // width at which the art fills the body height
  const fieldW = ls.w ? Math.round(Math.min(heightFillW, availW)) : 0;
  // A near-square field (heightFillW < availW) fills the height and leaves horizontal slack. Give that
  // slack to the controls column (grow past its reserve, capped at SHELL_CONTROL_MAX) so the field stays
  // hard-left and the controls meet the right edge. Wide fields are width-bound → slack ≤ 0 → NO-OP:
  // controlW == controlWBase and fieldW == round(availW), identical to before this tweak.
  const slack = ls.w ? Math.max(0, Math.round(availW - heightFillW)) : 0;
  const controlW = ls.w ? Math.min(SHELL_CONTROL_MAX, controlWBase + slack) : 0;
  return (
    <View style={[s.root, { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
      <View style={s.topBar}>
        <View style={s.pills}>{pills}</View>
        {topRight}
      </View>
      <View style={s.body} onLayout={e => setLs({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {fieldW > 0 && (
          <View style={[s.fieldCol, { width: fieldW }]}>
            {field}
            {belowField}
          </View>
        )}
        {controlW > 0 && (
          <View style={[s.controlsCol, { width: controlW }]}>
            <ScrollView style={s.controlsScroll} contentContainerStyle={s.controlsScrollContent} showsVerticalScrollIndicator={false}>
              {controls}
            </ScrollView>
            {controlsFooter}
          </View>
        )}
      </View>
    </View>
  );
}

// Field wrapper style — FIXED. The per-viewBox sizing (width/height + aspectRatio) lives inline in
// FieldCanvas so each renderer sizes to its OWN viewBox (gridiron 680×380 / soccer pitch 680×420).
const fieldStyles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});

// Chrome styles — THEMED (native to Coach's Corner).
const chromeStyles = (t: Theme) => StyleSheet.create({
  pillRow: { gap: 6, paddingVertical: 2 },
  // Compact flex-wrap row for the landscape header — natural height, never grows.
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  pillOn: { backgroundColor: t.accent, borderColor: t.accent },
  pillText: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600' },
  pillTextOn: { color: '#ffffff' },
  depth: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: t.background, borderRadius: 9, padding: 3, borderWidth: 1, borderColor: t.border, alignSelf: 'flex-start', marginVertical: 8 },
  depthCompact: { gap: 3, padding: 2, marginVertical: 6 },
  depthTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  depthTabCompact: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  depthTabOn: { backgroundColor: t.surface },
  depthText: { fontSize: 11.5, fontWeight: '600', color: t.textSecondaryOnDark },
  depthTextCompact: { fontSize: 10 },
  depthTextOn: { color: t.accentText },
  verdict: { marginTop: 14, backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border },
  verdictCompact: { marginTop: 0, padding: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 },
  tagRowCompact: { marginBottom: 6 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagGood: { backgroundColor: FE.goodBg, color: FE.good },
  tagBad: { backgroundColor: FE.badBg, color: FE.bad },
  tagMode: { backgroundColor: FE.modeBg, color: FE.mode },
  verdictTitle: { fontSize: 15, fontWeight: '800', color: t.textPrimary, marginBottom: 2 },
  verdictTitleCompact: { fontSize: 14, marginBottom: 0 },
  verdictBody: { fontSize: 13.5, color: t.textSecondaryOnDark, lineHeight: 21 },
  verdictBodyCompact: { fontSize: 12.5, lineHeight: 18 },
  nextBtn: { borderWidth: 1, borderColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start' },
  nextBtnText: { color: t.accentText, fontSize: 13, fontWeight: '600' },
  nextBtnFilled: { backgroundColor: t.accent, borderColor: t.accent },
  nextBtnTextFilled: { color: '#ffffff', fontWeight: '800' },
});

// Shell styles — THEMED chrome (the field/turf is fixed and lives in the renderers, not here).
const shellStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background, paddingVertical: 10 },
  // Top band: pills (left, wrap) + optional accessory (right), fixed natural height — never grows
  // (a horizontal scroll here would balloon and starve the field: the trap both modules hit).
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, flexGrow: 0 },
  pills: { flex: 1 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  fieldCol: { marginRight: SHELL_CUSHION },
  // Controls column fills the body height (stretch) so the inner ScrollView (flex:1) is bounded and a
  // controlsFooter, if present, pins to the bottom instead of being pushed off by tall content.
  controlsCol: { flexShrink: 0, alignSelf: 'stretch', flexDirection: 'column' },
  controlsScroll: { flex: 1 },
  controlsScrollContent: { gap: 10, paddingBottom: 12 },
});
