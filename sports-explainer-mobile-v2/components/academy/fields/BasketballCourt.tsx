import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';

// ============================================================================
// BasketballCourt — the Coach's Corner basketball HALF-COURT renderer (own file:
// FieldEngine.tsx is frozen; its full-court BasketballCourt is a different surface).
// Geometry is the basketball spikes' 680×460 half-court, verbatim: baseline at the
// BOTTOM, rim at (340,398). Paint only — the module supplies the DYNAMIC layer
// (actors, ball, zones, labels) as `children`, exactly like SoccerPitch/BaseballDiamond.
//
// The two LED-board modules (Two-for-One / Foul Up Three) draw their OWN scene on
// CourtCanvas with a taller viewBox (scoreboard band + possession strip above the
// court) and compose <HalfCourtPaint/> inside a translated <G> — so the half-court
// paint has ONE source of truth across all four modules.
// ============================================================================

export type CourtPt = [number, number];

export const HALF_COURT = { vbW: 680, vbH: 460 };
// The half-court's own viewBox aspect ratio (680/460 ≈ 1.478) — import, never recompute.
export const BASKETBALL_COURT_RATIO = HALF_COURT.vbW / HALF_COURT.vbH;
// The rim, in half-court coordinates — every module's choreography converges on it.
export const RIM: CourtPt = [340, 398];

// Fixed court/actor palette from the spikes — theme-independent (hardwood is hardwood
// in any app theme). STATE colors (bursts, ghost rings, zones) stay module decisions.
export const HOOPS = {
  woodD: '#b5651d', woodL: '#bd6f26', paint: '#a8641f', chalk: '#F4F4EE', rim: '#e8622a',
  navy: '#0d1b3e', orange: '#E87722', def: '#3B6FE0', you: '#8e44ad',
  amber: '#F5A623', teal: '#14B8A6', red: '#e24b4a',
  labelOutline: '#4a2c10',
};

const F_BOLD = 'SpaceGrotesk_700Bold'; // matches the app's other on-device SVG text

// Shared sizing wrapper (the FieldCanvas pattern — FieldEngine's is not exported and
// FieldEngine is frozen, so the basketball scenes carry their own copy). `fill='width'`
// (default) sizes by container WIDTH via aspectRatio; `fill='height'` sizes by HEIGHT.
export function CourtCanvas({ viewW, viewH, fill = 'width', bg = HOOPS.woodD, children }: {
  viewW: number; viewH: number; fill?: 'width' | 'height'; bg?: string; children: ReactNode;
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

// Alternating hardwood plank stripes for the 680×460 court area.
const WOOD_STRIPES = Array.from({ length: 10 }, (_, i) => ({ x: i * 68, fill: i % 2 ? HOOPS.woodD : HOOPS.woodL }));

// The half-court paint, spike-verbatim: wood → boundary → key + FT circle (solid top
// half, dashed bottom half) → 3-pt line (corners + arc) → restricted arc → backboard → rim.
export function HalfCourtPaint() {
  return (
    <G>
      {WOOD_STRIPES.map((s, i) => (
        <Rect key={`w${i}`} x={s.x} y={0} width={68} height={460} fill={s.fill} />
      ))}
      <Rect x={30} y={16} width={620} height={428} fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.75} />
      {/* the paint / key */}
      <Rect x={276} y={268} width={128} height={176} fill={HOOPS.paint} opacity={0.55} />
      <Rect x={276} y={268} width={128} height={176} fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.7} />
      <Path d="M294 268 A46 46 0 0 1 386 268" fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.7} />
      <Path d="M294 268 A46 46 0 0 0 386 268" fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.45} strokeDasharray="6 6" />
      {/* three-point line (corners + arc) */}
      <Path d="M96 444 L96 330 A260 260 0 0 1 584 330 L584 444" fill="none" stroke={HOOPS.chalk} strokeWidth={2} opacity={0.75} />
      {/* restricted circle, backboard, rim */}
      <Path d="M310 398 A30 30 0 0 1 370 398" fill="none" stroke={HOOPS.chalk} strokeWidth={1.6} opacity={0.6} />
      <Line x1={306} y1={414} x2={374} y2={414} stroke="#fff" strokeWidth={4} opacity={0.9} />
      <Circle cx={RIM[0]} cy={RIM[1]} r={9} fill="none" stroke={HOOPS.rim} strokeWidth={3} />
    </G>
  );
}

// The standard renderer: half-court canvas + paint + the module's dynamic layer.
export function BasketballCourt({ fill = 'width', children }: { fill?: 'width' | 'height'; children?: ReactNode }) {
  return (
    <CourtCanvas viewW={HALF_COURT.vbW} viewH={HALF_COURT.vbH} fill={fill}>
      <HalfCourtPaint />
      {children}
    </CourtCanvas>
  );
}

// ── shared basketball art the modules compose ──────────────────────────────

// The BASKETBALL: orange circle + two seam arcs + the cross seam (never a plain dot).
export function Basketball({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x}, ${y})`}>
      <Circle cx={0} cy={0} r={6.5} fill="#d9641a" stroke="#6b3410" strokeWidth={1.4} />
      <Path d="M-6.5 0 H6.5" stroke="#6b3410" strokeWidth={1.1} fill="none" />
      <Path d="M-4.2 -4.9 Q1.5 0 -4.2 4.9" stroke="#6b3410" strokeWidth={1.1} fill="none" />
      <Path d="M4.2 -4.9 Q-1.5 0 4.2 4.9" stroke="#6b3410" strokeWidth={1.1} fill="none" />
    </G>
  );
}

// Label with the spike's dark outline for legibility on hardwood. react-native-svg
// draws Text stroke OVER fill (no CSS paint-order), so: outline pass first, fill on top.
export function OutlinedLabel({ x, y, text, color = '#fff', size = 11, outline = 4 }: {
  x: number; y: number; text: string; color?: string; size?: number; outline?: number;
}) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={HOOPS.labelOutline} strokeWidth={outline} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={color}>{text}</SvgText>
    </>
  );
}

// ── tiny shared pure helper: split "<b>…</b>" prompt markup into styled segments ──
// The spikes' fan-facing prompts/chips carry <b> emphasis (amber in the navy prompt,
// orange in chips). The copy is owner-reviewed and stays VERBATIM in the data libs;
// this parses the markup at render time so no tags ever reach the screen.
export function boldSegments(s: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /<b>(.*?)<\/b>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) != null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out;
}

const canvasStyles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});
