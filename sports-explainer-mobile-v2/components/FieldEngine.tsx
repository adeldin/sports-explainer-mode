import { ReactNode, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// The gridiron: turf → stripes → yard lines → [overlay slot, UNDER players] → LOS → players.
export function FootballField({ players, overlay, fill = 'width' }: {
  players: FieldPlayer[]; overlay?: ReactNode; fill?: 'width' | 'height';
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
      <Line x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />
      <SvgText x={FIELD.los + 5} y={22} fill={FE.losLabel} fontSize={10.5} fontFamily={F_BOLD}>Line of scrimmage</SvgText>
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
// height minus belowFieldReserve. The controls column is a fixed reserved width; {controls} scroll
// internally, and an optional {controlsFooter} pins to the bottom (always reachable, never clipped).
const SHELL_CUSHION = 24; // transparent navy gap between the field and the controls (a real margin, not space-between)
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
  // field to fill the rest — bounded by BOTH the leftover width and the body height (minus the reserve).
  const controlW = ls.w ? Math.round(Math.max(300, Math.min(380, ls.w * 0.42))) : 0;
  const fieldW = ls.w ? Math.round(Math.min((ls.h - belowFieldReserve) * aspectRatio, ls.w - controlW - SHELL_CUSHION)) : 0;
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
