import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Circle, Ellipse, Line, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import { RugbyPitch, PitchLabel, RUGBY, RUGBY_TAG, RUGBY_PITCH_RATIO } from './fields/RugbyPitch';
import {
  SCENARIOS, R, GUESS_MIN, GUESS_MAX, GUESS_START, LINE_COL,
  judge, trueLineX, hindmostBoundDefender,
  type WTLScenario, type WTLVerdict, type WTLAction, type Depth,
} from '../../lib/wheresTheLine';

// Where's the Line? — the rugby offside-line module, and the only rugby piece whose answer is a
// POSITION rather than a choice. Every ruck builds an invisible fence across the pitch; you place it
// yourself and lock it in. The truth is COMPUTED, never declared: the hindmost DEFENDER bound in the
// ruck, back foot = his trailing edge (x + R) — which is why the "Messy ruck" answer sits behind the
// pile (one defender got driven deep) and why the "Caterpillar" line stays at the front of the snake
// while the ball rides at its tail. The trick scenario is the real teaching: nobody is bound on his
// feet, so there is no ruck — and no ruck means NO LINE, which is what the second button is for.
// All copy verbatim from the prototype (lib layer).
//
// Input: a NATIVE slider sitting directly under the pitch (the port standard's native-control rule)
// rather than a raw pan gesture on the SVG — it self-captures its drag, so there is no pan-vs-tap
// disambiguation to lose, and its travel maps 1:1 onto the pitch's x axis above it. No animation
// here, so the module owns no rAF at all.

const LS_SLIDER_RESERVE = 62;   // reserved height UNDER the pitch for the slider (stable pitch size)

function Rich({ text, style, boldStyle }: { text: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

export default function WheresTheLineGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState<Level>(appLevel);
  const [guessX, setGuessX] = useState(GUESS_START);
  const [verdict, setVerdict] = useState<WTLVerdict | null>(null);

  const s: WTLScenario = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const locked = verdict != null;
  const truth = trueLineX(s);
  const hind = hindmostBoundDefender(s);

  const resetTo = (i: number) => { setIdx(i); setGuessX(GUESS_START); setVerdict(null); };
  const call = (action: WTLAction) => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVerdict(judge(s, action, guessX));
  };

  // ── the pitch layer ──
  const els: React.ReactNode[] = [];
  // on the ground = out of the contest; they bind nothing, so they never set a line
  s.lying.forEach((p, i) => els.push(
    <Ellipse key={`ly${i}`} cx={p.x} cy={p.y} rx={16} ry={8} fill={p.t === 'a' ? RUGBY.att : RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} opacity={0.85} />
  ));
  // bound over the ball, ON THEIR FEET — these are the only bodies that build the fence.
  // On reveal the hindmost bound DEFENDER is ringed in the line colour: he IS the answer.
  s.bound.forEach((p, i) => {
    const isHind = locked && hind != null && p === hind;
    els.push(
      <Circle key={`bd${i}`} cx={p.x} cy={p.y} r={R}
        fill={p.t === 'a' ? RUGBY.att : RUGBY.def}
        stroke={isHind ? LINE_COL : RUGBY.navy} strokeWidth={isHind ? 3.5 : 2} />
    );
  });
  s.standD.forEach((p, i) => {
    els.push(<Circle key={`sd${i}`} cx={p.x} cy={p.y} r={R} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} />);
    if (p.lab) els.push(<PitchLabel key={`sdl${i}`} x={p.x} y={p.y - 17} text={p.lab} fill={RUGBY.defLbl} size={10.5} outline={3.5} />);
  });
  s.standA.forEach((p, i) => {
    els.push(<Circle key={`sa${i}`} cx={p.x} cy={p.y} r={R} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
    if (p.lab) els.push(<PitchLabel key={`sal${i}`} x={p.x} y={p.y - 17} text={p.lab} size={10.5} outline={3.5} />);
  });
  // the ball, where it actually is — forward of the back foot, or way back at the caterpillar's tail
  els.push(
    <Ellipse key="ball" cx={s.ball.x} cy={s.ball.y} rx={9} ry={5.5} fill="#f3ead8" stroke="#b39c6b" strokeWidth={1.2} />
  );
  // the reveal: the true line + the pocket annotation
  if (locked && truth != null) {
    els.push(<Line key="tl" x1={truth} y1={6} x2={truth} y2={414} stroke={LINE_COL} strokeWidth={3} opacity={0.95} />);
    els.push(<PitchLabel key="tll" x={truth} y={400} text="last defender's back foot" fill={LINE_COL} size={9.5} outline={3} />);
    if (s.cushion) {
      els.push(<Line key="cu1" x1={s.ball.x} y1={60} x2={truth} y2={60} stroke="#fff" strokeWidth={2} strokeDasharray="3 4" opacity={0.9} />);
      els.push(<Line key="cu2" x1={s.ball.x} y1={52} x2={s.ball.x} y2={68} stroke="#fff" strokeWidth={2} opacity={0.9} />);
      els.push(<Line key="cu3" x1={truth} y1={52} x2={truth} y2={68} stroke="#fff" strokeWidth={2} opacity={0.9} />);
      els.push(<PitchLabel key="cul" x={(s.ball.x + truth) / 2} y={46} text="the nine's protected pocket" fill="#fff" size={10} outline={3} />);
    }
  }
  // YOUR line — the draggable answer, drawn last so it always reads on top
  els.push(<Line key="gl" x1={guessX} y1={6} x2={guessX} y2={414} stroke={RUGBY.att} strokeWidth={2.5} strokeDasharray="6 5" opacity={0.95} />);
  els.push(<Circle key="gh" cx={guessX} cy={30} r={11} fill={RUGBY.att} stroke="#fff" strokeWidth={2.5} />);
  els.push(
    <SvgText key="ght" x={guessX} y={34} textAnchor="middle" fontSize={10} fontWeight="800" fill="#fff">↔</SvgText>
  );

  const pitch = <RugbyPitch fill="width">{els}</RugbyPitch>;

  // ── the drag control, directly under the pitch so its travel maps onto the pitch's x axis ──
  const dragger = (
    <View style={styles.dragRow}>
      <Slider
        style={styles.slider}
        minimumValue={GUESS_MIN} maximumValue={GUESS_MAX} step={1} value={guessX}
        disabled={locked} onValueChange={setGuessX}
        minimumTrackTintColor={RUGBY.att} maximumTrackTintColor={theme.border} thumbTintColor={RUGBY.att}
      />
      <Text style={styles.dragHint} numberOfLines={1}>
        {locked ? (truth == null ? 'No ruck — no line to draw' : 'Yellow = the real line') : '◀ slide your line ▶'}
      </Text>
    </View>
  );

  // ── chrome fragments ──
  // The prototype never rewrites the prompt on lock — the scenario question stays put and the
  // verdict card does the talking. Only the hint changes.
  const prompt = <View style={[styles.prompt, landscape && styles.promptLs]}><Rich text={s.prompt} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} /></View>;
  // Adapted for the ported control: the spike said "drag anywhere on the pitch"; here the drag lives
  // on the native slider directly under it (port standard's native-control rule).
  const hintText = locked ? 'Reset, or pick another ruck.' : 'Drag the slider under the pitch to move your line.';
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((x, i) => ({ key: String(i), name: x.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: RUGBY.att }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Attack (going right) — circles are on their feet</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: RUGBY.def }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Defense</Text></View>
      <View style={styles.legendItem}><View style={styles.legendBall} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Ball</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendPill, { backgroundColor: RUGBY.def }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>On the ground (out of the contest)</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: LINE_COL }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>True offside line</Text></View>
    </View>
  );
  // PRE-CALL actions only — both UNMOUNT on reveal so the verdict takes their space.
  const callButtons = (
    <View style={styles.callWrap}>
      <TouchableOpacity style={[styles.lockBtn, landscape && styles.lockBtnLs]} activeOpacity={0.85} onPress={() => call('lock')}>
        <Text style={[styles.lockTxt, landscape && styles.lockTxtLs]}>Lock it in</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.noLineBtn, landscape && styles.noLineBtnLs]} activeOpacity={0.85} onPress={() => call('no-line')}>
        <Text style={[styles.noLineTxt, landscape && styles.noLineTxtLs]}>There's no line yet</Text>
      </TouchableOpacity>
    </View>
  );
  const verdictCard = verdict ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, verdict.k === 'good' ? styles.vtagGood : styles.vtagBad]}>{verdict.tag}</Text>
      <Text style={styles.vtitle}>{verdict.title}</Text>
      <Text style={styles.vbody}>{verdict.body}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vread}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const hint = <Text style={[styles.hint, landscape && styles.hintLs]}>{hintText}</Text>;
  const resetBtn = (
    <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => resetTo(idx)}>
      <Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text>
    </TouchableOpacity>
  );
  const lsFooter = locked ? (
    <View style={styles.lsPostRow}>
      {resetBtn}
      <NextButton visible variant="filled" style={styles.lsNextFill} label="Next ruck →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />
    </View>
  ) : undefined;

  // ── LANDSCAPE: pitch left with the wide drag control in the reserved strip under it; call buttons
  // then verdict on the right; Reset + Next pinned in the footer once locked. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={RUGBY_PITCH_RATIO}
        belowFieldReserve={LS_SLIDER_RESERVE}
        pills={pills}
        field={pitch}
        belowField={dragger}
        controls={locked
          ? <>{verdictCard}{legend}</>
          : <>{prompt}{callButtons}{legend}{hint}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack (mirrors the prototype's column). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {pitch}
      {dragger}
      {legend}
      {prompt}
      {!locked && callButtons}
      {verdictCard}
      <View style={styles.controlsRow}>
        {resetBtn}
        {locked && <NextButton visible variant="filled" label="Next ruck →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />}
        {hint}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  dragRow: { marginTop: 4 },
  slider: { width: '100%', height: 34 },
  dragHint: { color: t.textSecondaryOnDark, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: t.accentText, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendPill: { width: 16, height: 8, borderRadius: 6 },
  legendBall: { width: 14, height: 9, borderRadius: 5, backgroundColor: '#f3ead8', borderWidth: 1, borderColor: '#b39c6b' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  callWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  lockBtn: { flexGrow: 1, flexBasis: '45%', minHeight: 48, backgroundColor: t.accent, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  lockBtnLs: { minHeight: 46, paddingVertical: 8 },
  lockTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  lockTxtLs: { fontSize: 13 },
  noLineBtn: { flexGrow: 1, flexBasis: '45%', minHeight: 48, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  noLineBtnLs: { minHeight: 46, paddingVertical: 8 },
  noLineTxt: { color: t.textPrimary, fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
  noLineTxtLs: { fontSize: 13 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: RUGBY_TAG.goodBg, color: RUGBY_TAG.good },
  vtagBad: { backgroundColor: RUGBY_TAG.badBg, color: RUGBY_TAG.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  readLbl: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 2 },
  vread: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  hint: { color: t.textSecondaryOnDark, fontSize: 12, marginTop: 4, flexShrink: 1 },
  hintLs: { fontSize: 10.5, marginTop: 2 },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
});
