import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

// ============================================================================
// CricketOval — the cricket Coach's Corner ground renderer, ported from the four
// cricketcorner spikes (all four paint the SAME oval). Own file on purpose:
// FieldEngine is frozen for this port, and its private FieldCanvas isn't
// exported, so the sizing wrapper is replicated here with the identical
// contract (fill='width' default sizes by container width via aspectRatio;
// fill='height' sizes by container height — LandscapeGameShell drives sizing
// by column width, so modules never need fill='height' when using the shell).
//
// viewBox 680×460 · boundary ellipse (340,232) rx=322 ry=216 with mown rings ·
// dashed 30-yard circle rx=168 ry=126 · pitch strip x=327..353, y=148..302 with
// creases + stumps at BOTH ends · OFF SIDE / LEG SIDE labels (right-hand batter:
// off side LEFT, leg side RIGHT). Fielding positions are MODULE data (children)
// — the ground stays position-agnostic, exactly like SoccerPitch is to Onside.
//
// Modules with an LED board band (Review or Save?, Pace the Chase) draw their
// OWN scene (board + <G y={74}><CricketOvalScene/>…</G> on a 680×534 canvas)
// and define their own ratio const — CricketOvalScene is exported for exactly
// that composition.
// ============================================================================

export const OVAL = { vbW: 680, vbH: 460, cx: 340, cy: 232, rx: 322, ry: 216 };
// The oval's own viewBox aspect ratio — the cricket counterpart to SOCCER_PITCH_RATIO.
export const CRICKET_OVAL_RATIO = OVAL.vbW / OVAL.vbH;

// Fixed field palette (spike-verbatim, theme-independent — grass is grass in any app theme).
export const CK = {
  navy: '#0d1b3e', orange: '#E87722', amber: '#F5A623', teal: '#14B8A6',
  def: '#3B6FE0', keeper: '#8e44ad', chalk: '#F4F4EE', pitchD: '#2F6B3D',
  ballRed: '#c0392b', ballEdge: '#7d1f14', seam: '#f3d9d2',
  good: '#16a37f', goodSpark: '#2fd39a', bad: '#e24b4a', labelOutline: '#1b3a1b',
};

const F_BOLD = 'SpaceGrotesk_700Bold'; // matches the app's other on-field SVG text

// Shared sizing wrapper — replica of FieldEngine's private FieldCanvas (same contract).
export function CricketCanvas({ viewW, viewH, fill = 'width', bg, children }: {
  viewW: number; viewH: number; fill?: 'width' | 'height'; bg: string; children: ReactNode;
}) {
  const ratio = viewW / viewH;
  const byHeight = fill === 'height';
  return (
    <View style={[canvasStyles.wrap, byHeight && { height: '100%' as const, aspectRatio: ratio }]}>
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

// A label with a dark outline for legibility on grass. react-native-svg draws Text
// stroke OVER the fill (no CSS paint-order), so: outline pass first, fill pass on top.
export function OutlinedLabel({ x, y, text, fill = '#fff', size = 11, opacity = 1, letterSpacing }: {
  x: number; y: number; text: string; fill?: string; size?: number; opacity?: number; letterSpacing?: number;
}) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD, opacity, letterSpacing };
  return (
    <>
      <SvgText {...common} fill="none" stroke={CK.labelOutline} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </>
  );
}

// The spikes clamp free-floating labels so long strings never run off the oval edge.
export function clampLabelX(x: number, text: string, k = 3): number {
  return Math.max(30 + text.length * k, Math.min(650 - text.length * k, x));
}

// An actor: dot + position label that TRAVEL TOGETHER (dy staggers labels above/below
// the dot so neighbouring names in a packed cordon don't overprint — spike-verbatim).
export function ActorDot({ x, y, fill, label, labelFill = '#fff', r = 9, dy = -13 }: {
  x: number; y: number; fill: string; label?: string; labelFill?: string; r?: number; dy?: number;
}) {
  return (
    <>
      <Circle cx={x} cy={y} r={r} fill={fill} stroke={CK.navy} strokeWidth={2} />
      {!!label && <OutlinedLabel x={x} y={y + dy} text={label} fill={labelFill} size={9} />}
    </>
  );
}

// The CRICKET BALL: red, with a seam line — never a plain white dot (spike rule).
export function CricketBall({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x},${y})`}>
      <Circle cx={0} cy={0} r={4.5} fill={CK.ballRed} stroke={CK.ballEdge} strokeWidth={1} />
      <Path d="M-3 -1.6 Q0 0 -3 1.6" fill="none" stroke={CK.seam} strokeWidth={0.9} />
    </G>
  );
}

// Expanding burst ring (the spikes' SMIL animate ported to a prog-driven element —
// the module's single rAF loop supplies prog 0..1).
export function BurstRing({ x, y, prog, color }: { x: number; y: number; prog: number; color: string }) {
  if (prog >= 1) return null;
  return <Circle cx={x} cy={y} r={8 + 18 * prog} fill="none" stroke={color} strokeWidth={3} opacity={0.9 * (1 - prog)} />;
}

// Celebration: expanding teal ring + 8 radiating sparks (celebrateGood, prog-driven).
export function GoodBurst({ x, y, prog }: { x: number; y: number; prog: number }) {
  if (prog >= 1) return null;
  const sparks: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = 12 + 20 * prog;
    sparks.push(<Circle key={`sp${i}`} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} r={3} fill={CK.goodSpark} opacity={Math.max(0, 1 - prog * 1.15)} />);
  }
  return (
    <>
      <Circle cx={x} cy={y} r={14 + 22 * prog} fill="none" stroke={CK.good} strokeWidth={4} opacity={0.95 * (1 - prog)} />
      {sparks}
    </>
  );
}

// ── the oval paint itself (usable inside ANY Svg — the board modules translate it) ──
const RINGS: [number, number, string][] = [
  [322, 216, '#2c6339'], [268, 180, '#357A46'], [214, 144, '#2F6B3D'], [160, 108, '#357A46'], [106, 72, '#2F6B3D'],
];
const CREASES = [150, 162, 288, 300];
const STUMP_DX = [-4, 0, 4];

export function CricketOvalScene({ footnote }: { footnote?: string }) {
  return (
    <>
      {RINGS.map(([rx, ry, fill], i) => <Ellipse key={`rg${i}`} cx={OVAL.cx} cy={OVAL.cy} rx={rx} ry={ry} fill={fill} />)}
      <Ellipse cx={OVAL.cx} cy={OVAL.cy} rx={OVAL.rx} ry={OVAL.ry} fill="none" stroke={CK.chalk} strokeWidth={2.5} opacity={0.85} />
      {/* 30-yard fielding circle (the powerplay ring) */}
      <Ellipse cx={OVAL.cx} cy={OVAL.cy} rx={168} ry={126} fill="none" stroke={CK.chalk} strokeWidth={1.5} strokeDasharray="6 7" opacity={0.55} />
      {/* the pitch: bowler's end TOP, striker's end BOTTOM — creases + stumps both ends */}
      <Rect x={327} y={148} width={26} height={154} rx={2} fill="#d8c48a" opacity={0.95} />
      {CREASES.map(y => <Path key={`cr${y}`} d={`M327 ${y} L353 ${y}`} stroke="#fff" strokeWidth={1.4} opacity={0.8} />)}
      {STUMP_DX.map(dx => <Rect key={`stB${dx}`} x={339 + dx} y={297} width={2} height={6} fill="#fff" />)}
      {STUMP_DX.map(dx => <Rect key={`stT${dx}`} x={339 + dx} y={147} width={2} height={6} fill="#fff" />)}
      <SvgText x={150} y={52} textAnchor="middle" fontSize={11} fontFamily={F_BOLD} fill={CK.chalk} opacity={0.4} letterSpacing={2}>OFF SIDE</SvgText>
      <SvgText x={530} y={52} textAnchor="middle" fontSize={11} fontFamily={F_BOLD} fill={CK.chalk} opacity={0.4} letterSpacing={2}>LEG SIDE</SvgText>
      {!!footnote && <SvgText x={340} y={445} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill={CK.chalk} opacity={0.4}>{footnote}</SvgText>}
    </>
  );
}

// The standalone oval renderer (Set the Trap / Bowl or Change — no board band).
export function CricketOval({ fill = 'width', footnote, children }: {
  fill?: 'width' | 'height'; footnote?: string; children?: ReactNode;
}) {
  return (
    <CricketCanvas viewW={OVAL.vbW} viewH={OVAL.vbH} fill={fill} bg={CK.pitchD}>
      <CricketOvalScene footnote={footnote} />
      {children}
    </CricketCanvas>
  );
}

const canvasStyles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});
