import { ReactNode, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
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

// The field: turf → stripes → yard lines → [overlay slot, UNDER players] → LOS → players.
// `fill`: 'width' (default, portrait) sizes by container WIDTH via aspectRatio — a wider column just
// means bigger dots. 'height' (landscape) sizes by container HEIGHT (width derived from the ratio), so
// the wide field fills a short viewport without overflowing. Aspect ratio (680/380) is kept either way.
export function FootballField({ players, overlay, fill = 'width' }: {
  players: FieldPlayer[]; overlay?: ReactNode; fill?: 'width' | 'height';
}) {
  const byHeight = fill === 'height';
  return (
    <View style={[fieldStyles.wrap, byHeight && fieldStyles.wrapH]}>
      <Svg viewBox={`0 0 ${FIELD.vbW} ${FIELD.vbH}`} style={byHeight ? fieldStyles.svgH : fieldStyles.svg}>
        <Rect x={0} y={0} width={FIELD.vbW} height={FIELD.vbH} fill={FE.turfD} />
        {STRIPES.map((s, i) => (
          <Rect key={`st${i}`} x={s.x} y={FIELD.bandTop} width={FIELD.stripeW} height={FIELD.bandH} fill={s.fill} />
        ))}
        {YDLINES.map((x, i) => (
          <Line key={`yd${i}`} x1={x} y1={FIELD.bandTop} x2={x} y2={FIELD.bandBot} stroke={FE.chalk} strokeWidth={1.2} opacity={0.8} />
        ))}
        {overlay}
        <Line x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />
        <SvgText x={FIELD.los + 5} y={22} fill={FE.losLabel} fontSize={10.5} fontFamily={F_BOLD}>Line of scrimmage</SvgText>
        {players.map(p => <Dot key={p.id} p={p} />)}
      </Svg>
    </View>
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

// Advance-to-next control (shown after a call). Generic label + press.
export function NextButton({ visible, label, onPress }: { visible: boolean; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const s = useMemo(() => chromeStyles(theme), [theme]);
  if (!visible) return null;
  return (
    <TouchableOpacity style={s.nextBtn} activeOpacity={0.8} onPress={onPress}>
      <Text style={s.nextBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// Field paint styles — FIXED (the turf is green in any theme).
const fieldStyles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
  svg: { width: '100%', aspectRatio: FIELD.vbW / FIELD.vbH, backgroundColor: FE.turfD },
  // Height-driven (landscape): the wrapper takes the row's full height, width derives from the ratio.
  wrapH: { height: '100%', aspectRatio: FIELD.vbW / FIELD.vbH },
  svgH: { width: '100%', height: '100%', backgroundColor: FE.turfD },
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
});
