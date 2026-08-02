import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Ellipse, Path, G, Text as SvgText } from 'react-native-svg';

// ============================================================================
// RugbyPitch — the rugby field renderer for the Coach's Corner rugby modules,
// ported VERBATIM from coaches-corner-spikes/rugbycorner (all five spikes share
// this exact paint). Coordinates:
//   viewBox 680×420 · boundary 6,6 → 668×408 · try lines x=70/610 (solid, .85)
//   22-metre lines x=189/491 (solid, .55) · halfway x=340 (solid, .6)
//   10-metre lines x=284/396 (dashed "6 7", .4) · attack LEFT→RIGHT.
//
// NOTE for reviewers: components/FieldEngine.tsx exports a DIFFERENT RugbyPitch
// (try lines 66/614, in-goal shading) used by Zone Tap + Jeopardy tiles. This
// file is the Coach's Corner module renderer from the rugbycorner spikes and,
// per the port brief, lives in its own file — FieldEngine is deliberately NOT
// edited. FieldEngine's FieldCanvas is not exported, so an identical-behavior
// local canvas (RugbyFieldCanvas) lives here; posts-corner-or-scrum reuses it
// for its taller 680×494 scene (stadium scoreboard band above the pitch).
// ============================================================================

export const RUGBY_PITCH = { vbW: 680, vbH: 420 };
export const RUGBY_PITCH_RATIO = RUGBY_PITCH.vbW / RUGBY_PITCH.vbH;

// Spike palette — field-intrinsic + the shared rugby actor colors. Turf matches
// the spikes' --pitch-d/--pitch-l (same values as the gridiron's FE.turfD/turfL).
export const RUGBY = {
  turfD: '#2F6B3D', turfL: '#357A46', chalk: '#F4F4EE', navy: '#0d1b3e',
  att: '#E87722', def: '#3B6FE0', fb: '#8e44ad',
  defLbl: '#bcd3ff', fbLbl: '#e6d8f2',
  amber: '#F5A623', teal: '#14B8A6', red: '#e24b4a',
  labelOutline: '#1b3a1b',
};

// Verdict-tag palette shared by the five rugby modules (spike-verbatim). The
// rugby verdicts are three-way (good / defensible-ok / bad) — the engine's
// two-way FE.good/bad chips can't express "ok", so the set carries its own.
export const RUGBY_TAG = {
  good: '#0c7a5e', goodBg: '#e7f7f1',
  ok: '#8a5a1c', okBg: '#fef3e2',
  bad: '#b3261e', badBg: '#fdecec',
};

const F_BOLD = 'SpaceGrotesk_700Bold'; // the app's on-device SVG font (FieldEngine convention)

// Local copy of FieldEngine's (unexported) FieldCanvas — same sizing contract:
// fill='width' sizes by container width via aspectRatio; fill='height' sizes by
// container height with width derived. Keep behavior identical to FieldEngine.
export function RugbyFieldCanvas({ viewW, viewH, fill = 'width', bg, children }: {
  viewW: number; viewH: number; fill?: 'width' | 'height'; bg: string; children: ReactNode;
}) {
  const ratio = viewW / viewH;
  const byHeight = fill === 'height';
  return (
    <View style={[styles.wrap, byHeight && { height: '100%' as const, aspectRatio: ratio }]}>
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

const RUG_STRIPES = Array.from({ length: 10 }, (_, i) => ({ x: i * 68, fill: i % 2 ? RUGBY.turfD : RUGBY.turfL }));
// [x, dash?, opacity] — spike-verbatim marks: try lines, 22s, halfway, 10m dashed.
const RUG_LINES: [number, string | undefined, number][] = [
  [70, undefined, 0.85], [610, undefined, 0.85],
  [189, undefined, 0.55], [491, undefined, 0.55],
  [340, undefined, 0.6],
  [284, '6 7', 0.4], [396, '6 7', 0.4],
];

// The pitch paint as a bare fragment (stripes + boundary + lines, all in the
// 680×420 coordinate space) so posts-corner-or-scrum can translate it under its
// scoreboard band inside a taller canvas.
export function RugbyPitchMarks() {
  return (
    <>
      {RUG_STRIPES.map((s, i) => (
        <Rect key={`rs${i}`} x={s.x} y={0} width={68} height={RUGBY_PITCH.vbH} fill={s.fill} />
      ))}
      <Rect x={6} y={6} width={668} height={408} fill="none" stroke={RUGBY.chalk} strokeWidth={2} opacity={0.7} />
      {RUG_LINES.map(([x, dash, op], i) => (
        <Line key={`rl${i}`} x1={x} y1={6} x2={x} y2={414} stroke={RUGBY.chalk} strokeWidth={2} opacity={op} strokeDasharray={dash} />
      ))}
    </>
  );
}

// Goal posts on the attacking-right try line, seen top-down (uprights + dots) —
// from the posts-corner-or-scrum spike. Optional: the other four spikes don't
// draw posts, so RugbyPitch defaults them OFF for spike fidelity.
export function RugbyPosts() {
  return (
    <>
      <Line x1={610} y1={186} x2={610} y2={234} stroke="#fff" strokeWidth={4} opacity={0.95} />
      <Circle cx={610} cy={186} r={4} fill="#fff" />
      <Circle cx={610} cy={234} r={4} fill="#fff" />
    </>
  );
}

// The standalone pitch (680×420). Module supplies the dynamic layer as children.
export function RugbyPitch({ fill = 'width', showPosts = false, children }: {
  fill?: 'width' | 'height'; showPosts?: boolean; children?: ReactNode;
}) {
  return (
    <RugbyFieldCanvas viewW={RUGBY_PITCH.vbW} viewH={RUGBY_PITCH.vbH} fill={fill} bg={RUGBY.turfD}>
      <RugbyPitchMarks />
      {showPosts && <RugbyPosts />}
      {children}
    </RugbyFieldCanvas>
  );
}

// ── The RUGBY BALL: an oval with seams (never a circle) — spike-verbatim art.
// `ang` rotates it: 0 = carried flat; tumbling kicks pass k*900; spin passes
// pass the flight angle so the nose tracks the travel.
export function RugbyBall({ x, y, ang = 0 }: { x: number; y: number; ang?: number }) {
  return (
    <G transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
      <Ellipse cx={0} cy={0} rx={9} ry={5.5} fill="#f3ead8" stroke="#b39c6b" strokeWidth={1.2} />
      <Path d="M-7 0 Q0 -3.4 7 0" fill="none" stroke="#c9b98f" strokeWidth={1} />
      <Path d="M-7 0 Q0 3.4 7 0" fill="none" stroke="#c9b98f" strokeWidth={1} />
    </G>
  );
}

// Outlined pitch label — the spikes' paint-order:stroke text. react-native-svg
// has no paint-order, so render the outline pass first, then the fill on top
// (same technique as FieldEngine's DotLabel).
export function PitchLabel({ x, y, text, fill = '#fff', size = 11, outline = 4 }: {
  x: number; y: number; text: string; fill?: string; size?: number; outline?: number;
}) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={RUGBY.labelOutline} strokeWidth={outline} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </>
  );
}

// Expanding result ring, time-driven (prog 0..1) — the SMIL <animate> burst from
// the spikes doesn't port to react-native-svg, so the module's single t-loop
// drives `prog`. Renders nothing outside (0,1).
export function BurstRing({ x, y, prog, color, maxR = 26 }: {
  x: number; y: number; prog: number; color: string; maxR?: number;
}) {
  if (prog <= 0 || prog >= 1) return null;
  return <Circle cx={x} cy={y} r={8 + (maxR - 8) * prog} fill="none" stroke={color} strokeWidth={3} opacity={0.9 * (1 - prog)} />;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});
