import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, G, Text as SvgText } from 'react-native-svg';

// ============================================================================
// TennisCourt — the tennis-court renderer for Coach's Corner field modules.
// Lives in its OWN file (FieldEngine.tsx is untouched — its horizontal
// `TennisCourt` sketch remains for any legacy consumer; the four tennis
// modules import THIS one). Geometry is the tenniscorner spikes', verbatim:
//   viewBox 680×420 · your baseline x=66 · NET x=326 · their baseline x=586
//   court rect 66,90 → 520×240 · singles sidelines y=120/300
//   service lines x=186/466 · center service line y=210 · center marks.
// The court is TOP-DOWN (net drawn as a vertical mid-line band). Every tennis
// module's data lib shares these base coordinates (the shared-viewBox contract,
// exactly as FIELD does for football).
//
// Modules WITHOUT an LED board render <TennisCourt> directly (680×420).
// Modules WITH an LED board (Approach or Stay, Serve Target) draw their own
// scene on <TennisCanvas> (680×494: board strip on top, the court group
// translated down 74) and embed <TennisCourtPaint> — and export their own
// per-module ratio next to the module, per the landscape port standard.
// ============================================================================

export const TENNIS = {
  vbW: 680, vbH: 420,
  baseL: 66, baseR: 586, net: 326,
  courtY: 90, courtH: 240,
  singlesT: 120, singlesB: 300,
  svcL: 186, svcR: 466, svcMid: 210,
};

// The court's own viewBox aspect ratio — import, never recompute.
export const TENNIS_COURT_RATIO = TENNIS.vbW / TENNIS.vbH;

// Fixed surface palettes (from the spikes): a hard court is blue-on-green and a
// clay court is terracotta in ANY app theme. Surface is per-scenario data
// (Approach or Stay repaints for its clay scenarios).
export type TennisSurface = 'hard' | 'clay';
const SURFACE = {
  hard: { surround: '#3E7A4C', court: '#2E63A4' },
  clay: { surround: '#9C5C33', court: '#C1773E' },
};
const CHALK = '#F4F4EE';
const NET_BAND = '#12213d';
const NET_LIGHT = '#dfe5f0';
const F_BOLD = 'SpaceGrotesk_700Bold';

// Shared sizing wrapper for any tennis scene (the FieldCanvas contract, local to
// the tennis renderer since FieldEngine does not export its canvas). fill='width'
// (default, and what LandscapeGameShell expects) sizes by container width via
// aspectRatio; fill='height' sizes by container height, width derived.
export function TennisCanvas({ viewW, viewH, fill = 'width', bg, children }: {
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

// The court PAINT as a pure SVG fragment: surround → court → lines → net.
// Embeddable inside any Svg (a board module wraps it in <G y={74}>). Verbatim
// spike geometry; paint only — every dynamic element is the module's.
export function TennisCourtPaint({ surface = 'hard' }: { surface?: TennisSurface }) {
  const c = SURFACE[surface];
  return (
    <G>
      <Rect x={0} y={0} width={680} height={420} fill={c.surround} />
      <Rect x={66} y={90} width={520} height={240} fill={c.court} />
      <Rect x={66} y={90} width={520} height={240} fill="none" stroke={CHALK} strokeWidth={2.5} opacity={0.95} />
      {/* singles sidelines */}
      <Line x1={66} y1={120} x2={586} y2={120} stroke={CHALK} strokeWidth={2} opacity={0.9} />
      <Line x1={66} y1={300} x2={586} y2={300} stroke={CHALK} strokeWidth={2} opacity={0.9} />
      {/* service lines + center service line (the service boxes) */}
      <Line x1={186} y1={120} x2={186} y2={300} stroke={CHALK} strokeWidth={2} opacity={0.9} />
      <Line x1={466} y1={120} x2={466} y2={300} stroke={CHALK} strokeWidth={2} opacity={0.9} />
      <Line x1={186} y1={210} x2={466} y2={210} stroke={CHALK} strokeWidth={2} opacity={0.9} />
      {/* center marks on both baselines */}
      <Line x1={66} y1={210} x2={76} y2={210} stroke={CHALK} strokeWidth={2.5} opacity={0.9} />
      <Line x1={576} y1={210} x2={586} y2={210} stroke={CHALK} strokeWidth={2.5} opacity={0.9} />
      {/* the net, seen top-down: dark band + light dashed overlay + posts + caption */}
      <Line x1={326} y1={84} x2={326} y2={336} stroke={NET_BAND} strokeWidth={5} opacity={0.9} />
      <Line x1={326} y1={84} x2={326} y2={336} stroke={NET_LIGHT} strokeWidth={5} opacity={0.5} strokeDasharray="2 5" />
      <Circle cx={326} cy={84} r={3.5} fill={CHALK} />
      <Circle cx={326} cy={336} r={3.5} fill={CHALK} />
      <SvgText x={326} y={76} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill={CHALK} opacity={0.85}>NET</SvgText>
    </G>
  );
}

// The full-court renderer for board-less modules: canvas + paint + the module's
// dynamic layer as children (same topic-agnostic contract as SoccerPitch).
export function TennisCourt({ fill = 'width', surface = 'hard', children }: {
  fill?: 'width' | 'height'; surface?: TennisSurface; children?: ReactNode;
}) {
  return (
    <TennisCanvas viewW={TENNIS.vbW} viewH={TENNIS.vbH} fill={fill} bg={SURFACE[surface].surround}>
      <TennisCourtPaint surface={surface} />
      {children}
    </TennisCanvas>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});
