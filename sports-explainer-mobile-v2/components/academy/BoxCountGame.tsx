import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, ScenarioPills, VerdictCard, NextButton, LandscapeGameShell, FOOTBALL_FIELD_RATIO, FieldPlayer } from '../FieldEngine';
import { SCENARIOS, OFFENSE, BOX, BLOCKERS, inBox, type Call } from '../../lib/boxCount';

// Box Count's OWN state-highlight colors (the engine is agnostic about what these mean):
//   the amber tap-ring + box overlay, the green in-box reveal ring, the teal Run call button.
const TAP_RING = '#F5A623';   // amber — ungraded "you marked this" ring + the box-zone overlay fill
const IN_BOX_RING = '#16a37f'; // green — reveal ring on the COMPUTED in-box defenders
const RUN_TEAL = '#14B8A6';   // distinct call-button hue for Run (Pass uses the app accent)
const LS_HINT_RESERVE = 34;    // navy room reserved UNDER the field for the "👆 tap defenders" hint

// Box Count — pre-snap diagnose-and-call teaching module. First tenant of FieldEngine.
// Design invariants ported VERBATIM from the spike (do NOT redesign):
//   • Run/Pass are ALWAYS enabled during the read — the count NEVER gates the call.
//   • Tapping defenders is an UNGRADED aid (a running tally may show, never scored).
//   • Only the run/pass decision is graded ("Good read" / "Rethink it").
//   • NO count-grading in any state — the count appears on reveal as neutral info, never a report card.
//   • Reveal is COMPUTED from inBox() (green rings the truly-in-box defenders), never hand-declared.
// LAYOUT: portrait = vertical stack (field sizes by width → bigger dots in a wider column). Landscape
// = pills on top, then field-left / controls-right with the field HEIGHT-driven so the wide field
// fills the short viewport and everything is visible without page-scroll.
export default function BoxCountGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [current, setCurrent] = useState<string>(SCENARIOS[0].key);
  const [level, setLevel] = useState<Level>(appLevel);        // verdict-depth tabs (starts at the user's level)
  const [answered, setAnswered] = useState(false);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [lastCall, setLastCall] = useState<Call | null>(null);

  const scenario = SCENARIOS.find(s => s.key === current) ?? SCENARIOS[0];
  const trueBox = scenario.defense.filter(inBox).length;      // COMPUTED, never trusted from data
  const correct = lastCall === scenario.answer;

  const reset = () => { setAnswered(false); setTapped(new Set()); setLastCall(null); };
  const selectScenario = (key: string) => { setCurrent(key); setAnswered(false); setTapped(new Set()); setLastCall(null); };
  const nextScenario = () => {
    const i = SCENARIOS.findIndex(s => s.key === current);
    selectScenario(SCENARIOS[(i + 1) % SCENARIOS.length].key);
  };
  const toggleTap = (i: number) => {
    if (answered) return;                                     // aid only during the read
    Haptics.selectionAsync();
    setTapped(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  };
  const call = (which: Call) => {
    if (answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLastCall(which); setAnswered(true);
  };

  // ── Build the players the engine renders (offense fixed; defense carries interaction state) ──
  const players: FieldPlayer[] = [];
  OFFENSE.ol.forEach((p, i) => players.push({ id: `ol${i}`, x: p[0], y: p[1], team: 'offense', r: 8 }));
  players.push({ id: 'qb', x: OFFENSE.qb[0], y: OFFENSE.qb[1], team: 'offense', r: 9, primary: true, label: 'QB' });
  players.push({ id: 'rb', x: OFFENSE.rb[0], y: OFFENSE.rb[1], team: 'offense', r: 8, label: 'RB' });
  players.push({ id: 'te', x: OFFENSE.te[0], y: OFFENSE.te[1], team: 'offense', r: 8, label: 'TE' });
  OFFENSE.wr.forEach((p, i) => players.push({ id: `wr${i}`, x: p[0], y: p[1], team: 'offense', r: 9 }));
  scenario.defense.forEach((d, i) => {
    let stroke: string | undefined, strokeWidth: number | undefined, opacity: number | undefined, onPress: (() => void) | undefined;
    if (!answered) {
      onPress = () => toggleTap(i);                           // tappable aid
      if (tapped.has(i)) { stroke = TAP_RING; strokeWidth = 3.5; } // amber tap ring (ungraded)
    } else if (inBox(d)) {
      stroke = IN_BOX_RING; strokeWidth = 3.5;                // computed reveal: green rings in-box
    } else {
      opacity = 0.5;                                          // dim the out-of-box defenders
    }
    players.push({ id: `d${i}`, x: d.x, y: d.y, team: 'defense', r: 9, label: d.role, stroke, strokeWidth, opacity, onPress });
  });

  // Box overlay (amber rect) — revealed on the call, drawn UNDER the players via the engine's slot.
  const overlay = answered
    ? <Rect x={BOX.xMin} y={BOX.yTop} width={BOX.xMax - BOX.xMin} height={BOX.yBot - BOX.yTop} rx={8} fill={TAP_RING} opacity={0.16} />
    : undefined;

  // Count readout — neutral info, NEVER a grade. Aid tally during the read; true count on reveal.
  const countText = answered
    ? `In the box: ${trueBox} · blockers: ${BLOCKERS}`
    : tapped.size === 0
      ? '👇 Optional: tap defenders to help you see the box'
      : `You've marked ${tapped.size} · blockers: ${BLOCKERS}`;

  // Verdict title reflects the SCENARIO's answer (the lesson); the body reflects the user's CALL.
  const verdictTitle = scenario.answer === 'run' ? scenario.verdict.runTitle : scenario.verdict.passTitle;

  // ── Shared elements (arranged differently per orientation) ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map(s => ({ key: s.key, name: s.name }))} currentKey={current} onSelect={selectScenario} />;
  const field = <FootballField players={players} overlay={overlay} />;
  const countEl = <View style={styles.countPill}><Text style={styles.countPillText}>{countText}</Text></View>;
  const runBtn = (
    <TouchableOpacity style={[styles.callBtn, styles.callRun, landscape && styles.callBtnLs, answered && styles.callDisabled]} activeOpacity={0.85} disabled={answered} onPress={() => call('run')}>
      <Text style={styles.callText}>Call Run</Text>
    </TouchableOpacity>
  );
  const passBtn = (
    <TouchableOpacity style={[styles.callBtn, styles.callPass, landscape && styles.callBtnLs, answered && styles.callDisabled]} activeOpacity={0.85} disabled={answered} onPress={() => call('pass')}>
      <Text style={styles.callText}>Call Pass</Text>
    </TouchableOpacity>
  );
  const resetBtn = (
    <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={reset}>
      <Text style={styles.resetText}>↺ Reset</Text>
    </TouchableOpacity>
  );
  const nextBtn = <NextButton visible={answered} label="Next scenario →" onPress={nextScenario} />;
  const verdict = (
    <VerdictCard
      visible={answered}
      correct={correct}
      tagText={correct ? 'Good read' : 'Rethink it'}
      // Landscape drops the redundant "N in box · N blockers" chip — the count lives in the top pill
      // now, and the headline ("N in the box, N blockers → run it") already carries it. Portrait keeps it.
      modeText={landscape ? '' : `${trueBox} in box · ${BLOCKERS} blockers`}
      title={verdictTitle}
      level={level}
      onSelectLevel={setLevel}
      body={lastCall ? scenario.exp[level][lastCall] : ''}
      compact={landscape}
    />
  );

  // ── Landscape: the shared LandscapeGameShell. Top band = pills (left) + count READOUT (right, only
  // once tapped/revealed). Field-left with the pre-tap 👆 hint in the reserved strip under it. Controls-
  // right: PRE-CALL the two CALL buttons (+ Reset); POST-CALL they UNMOUNT and Reset + Next stay. No
  // pinned footer here — Box Count keeps Reset/Next in the scroll flow (the verdict card fits).
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={LS_HINT_RESERVE}
        pills={pills}
        topRight={(answered || tapped.size > 0)
          ? <View style={styles.lsCountPill}><Text style={styles.countPillText} numberOfLines={1}>{countText}</Text></View>
          : undefined}
        field={field}
        belowField={!answered && tapped.size === 0
          ? <Text style={styles.lsHintUnder}>👆 Optional: tap defenders to help you see the box</Text>
          : undefined}
        controls={
          <>
            {!answered && runBtn}
            {!answered && passBtn}
            {verdict}
            <View style={styles.lsResetRow}>{resetBtn}{nextBtn}</View>
          </>
        }
      />
    );
  }

  // ── Portrait: unchanged vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.prompt}>
        Read the defense and make the call. Tap defenders to help you see the box if you like — then decide run or pass.
      </Text>
      {pills}
      {countEl}
      {field}
      <View style={styles.controls}>{runBtn}{passBtn}{resetBtn}{nextBtn}</View>
      {verdict}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40 },
  prompt: { color: t.textSecondaryOnDark, fontSize: 13.5, lineHeight: 20, marginBottom: 12 },
  // Count readout — themed neutral pill (not a grade).
  countPill: { alignSelf: 'flex-start', backgroundColor: t.surfaceActive, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginVertical: 10 },
  countPillText: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 },
  // Call buttons — distinct semantic action colors (teal run / orange pass), from the spike. Always
  // enabled during the read; disabled only AFTER a call (making a call ends the read — not a count gate).
  callBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  callBtnLs: { alignSelf: 'stretch' },   // landscape right-column: full-width stacked buttons
  callRun: { backgroundColor: RUN_TEAL },
  callPass: { backgroundColor: t.accent },
  callDisabled: { opacity: 0.4 },
  callText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  resetBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  resetText: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  // Landscape module-specific bits (the layout scaffold itself is LandscapeGameShell). The count pill
  // rides the shell's top-right slot; the hint rides its belowField slot; Reset/Next ride the controls scroll.
  lsCountPill: { flexShrink: 0, backgroundColor: t.surfaceActive, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  lsHintUnder: { marginTop: 8, color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600' },
  lsResetRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
});
