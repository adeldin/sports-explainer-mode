import { useMemo, useState } from 'react';
import { Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Circle, G, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { ScenarioPills, VerdictCard, NextButton, LandscapeGameShell } from '../FieldEngine';
import { RugbyPitch, RugbyBall, PitchLabel, RUGBY, RUGBY_PITCH_RATIO } from './fields/RugbyPitch';

// ─────────────────────────────────────────────────────────────────────────────
// RugbyReadEngine — the shared scaffold for the 2026-09 rugby read modules
// (Jam or Drift?, Commit or Fan?, Exit Strategy, One More Phase?, Hold the
// Short Side?). One canonical component (per the uniformity rule): frozen
// scene on the RugbyPitch → option buttons → graded verdict + declared reveal
// lines. Each game is DATA (lib/<game>.ts) + a two-line wrapper.
// Punishers are data, never ad-hoc: every reveal stroke/label ships from the
// lib file, which is what the authoring standard's text-gate approves.
// ─────────────────────────────────────────────────────────────────────────────

export interface XY { x: number; y: number }
export interface ReadActor extends XY { label: string; kind: 'att' | 'def' | 'you' | 'cover'; ball?: boolean }
export interface ReadReveal { from: XY; to: XY; color: string; label: string; at: XY }
export interface ReadOption { key: string; title: string; sub: string; color: string }
export interface ReadScenario {
  key: string;
  name: string;
  answer: string;
  situation: string;
  actors: ReadActor[];
  intentArrow?: { from: XY; to: XY; label: string };   // pre-answer dashed cue (cover run, kick threat…)
  reveal: Record<string, ReadReveal[]>;
  verdictTitle: Record<string, string>;
  exp: Record<Level, Record<string, string>>;
}
export interface RugbyReadConfig {
  options: ReadOption[];
  scenarios: ReadScenario[];
  hintEmoji: string;                                   // leads the situation line under the field
}

const LS_HINT_RESERVE = 34;

const actorFill = (k: ReadActor['kind']) =>
  k === 'att' ? RUGBY.att : k === 'cover' ? RUGBY.fb : RUGBY.def;

export function makeRugbyReadGame(config: RugbyReadConfig) {
  return function RugbyReadGame(_props: AcademyGameProps) {
    const { level: appLevel } = useAppState();
    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);
    const { width, height } = useWindowDimensions();
    const landscape = width > height;

    const [current, setCurrent] = useState<string>(config.scenarios[0].key);
    const [level, setLevel] = useState<Level>(appLevel);
    const [answered, setAnswered] = useState(false);
    const [lastCall, setLastCall] = useState<string | null>(null);

    const scenario = config.scenarios.find(s => s.key === current) ?? config.scenarios[0];
    const correct = lastCall === scenario.answer;

    const reset = () => { setAnswered(false); setLastCall(null); };
    const selectScenario = (key: string) => { setCurrent(key); setAnswered(false); setLastCall(null); };
    const nextScenario = () => {
      const i = config.scenarios.findIndex(s => s.key === current);
      selectScenario(config.scenarios[(i + 1) % config.scenarios.length].key);
    };
    const call = (which: string) => {
      if (answered) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLastCall(which); setAnswered(true);
    };

    const field = (
      <RugbyPitch fill="width">
        {!answered && scenario.intentArrow && (
          <G>
            <Line
              x1={scenario.intentArrow.from.x} y1={scenario.intentArrow.from.y}
              x2={scenario.intentArrow.to.x} y2={scenario.intentArrow.to.y}
              stroke={RUGBY.fbLbl} strokeWidth={2.5} strokeDasharray="7 6" opacity={0.85}
            />
            <PitchLabel x={(scenario.intentArrow.from.x + scenario.intentArrow.to.x) / 2}
              y={scenario.intentArrow.from.y + 26} text={scenario.intentArrow.label} fill={RUGBY.fbLbl} size={10} />
          </G>
        )}
        {answered && lastCall && (scenario.reveal[lastCall] ?? []).map((r, i) => (
          <G key={`rv${i}`}>
            <Line x1={r.from.x} y1={r.from.y} x2={r.to.x} y2={r.to.y}
              stroke={r.color} strokeWidth={3} strokeDasharray="8 6" opacity={0.9} />
            <Circle cx={r.to.x} cy={r.to.y} r={5} fill={r.color} opacity={0.9} />
            <PitchLabel x={r.at.x} y={r.at.y} text={r.label} fill="#fff" size={11} />
          </G>
        ))}
        {scenario.actors.map(a => (
          <G key={a.label + a.kind + a.x}>
            <Circle cx={a.x} cy={a.y} r={a.kind === 'you' ? 12 : 10}
              fill={actorFill(a.kind)} stroke="#fff" strokeWidth={a.kind === 'you' ? 3 : 1.5} />
            <PitchLabel x={a.x} y={a.y - 16} text={a.label}
              fill={a.kind === 'cover' ? RUGBY.fbLbl : '#fff'} size={a.kind === 'you' ? 12 : 11} />
            {a.ball && <RugbyBall x={a.x + 13} y={a.y + 6} />}
          </G>
        ))}
      </RugbyPitch>
    );

    const pills = (
      <ScenarioPills
        wrap={landscape}
        items={config.scenarios.map(s => ({ key: s.key, name: s.name }))}
        currentKey={current}
        onSelect={selectScenario}
      />
    );

    const optionButtons = config.options.map(o => (
      <TouchableOpacity
        key={o.key}
        style={[styles.callBtn, { backgroundColor: o.color }, landscape && styles.callBtnLs, answered && styles.callDisabled]}
        activeOpacity={0.85} disabled={answered} onPress={() => call(o.key)}>
        <Text style={styles.callText}>{o.title}</Text>
        <Text style={styles.callSub}>{o.sub}</Text>
      </TouchableOpacity>
    ));

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
        modeText=""
        title={lastCall ? scenario.verdictTitle[lastCall] : ''}
        level={level}
        onSelectLevel={setLevel}
        body={lastCall ? scenario.exp[level][lastCall] : ''}
        compact={landscape}
      />
    );

    if (landscape) {
      return (
        <LandscapeGameShell
          aspectRatio={RUGBY_PITCH_RATIO}
          belowFieldReserve={LS_HINT_RESERVE}
          pills={pills}
          field={field}
          belowField={!answered
            ? <Text style={styles.lsHintUnder}>{config.hintEmoji} {scenario.situation}</Text>
            : undefined}
          controls={
            <>
              {!answered && optionButtons}
              {verdict}
              <View style={styles.lsResetRow}>{resetBtn}{nextBtn}</View>
            </>
          }
        />
      );
    }

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.prompt}>{scenario.situation}</Text>
        {pills}
        {field}
        <View style={styles.controls}>{optionButtons}{resetBtn}{nextBtn}</View>
        {verdict}
      </ScrollView>
    );
  };
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40 },
  prompt: { color: t.textSecondaryOnDark, fontSize: 13.5, lineHeight: 20, marginBottom: 12 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 },
  callBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  callBtnLs: { alignSelf: 'stretch', minHeight: 48, justifyContent: 'center' },
  callDisabled: { opacity: 0.4 },
  callText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  callSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 1 },
  resetBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  resetText: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsHintUnder: { marginTop: 8, color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600' },
  lsResetRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
});
