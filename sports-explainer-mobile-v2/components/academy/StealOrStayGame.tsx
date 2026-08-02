import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { BaseballDiamond, LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, BASEBALL_DIAMOND_RATIO, FE } from '../FieldEngine';
import { type Fielder, type Pt } from '../../lib/wheresThePlay';
import {
  SCEN, POS, LEAD, BALL_START, BURST_MS, buildStealPlay, tweenPos,
  type StealChoice, type Depth, type Choreo,
} from '../../lib/stealOrStay';

// Steal or Stay? — baseball stolen-base race module. The runner has his lead off first; read the
// battery clues (delivery, arm, lefty pickoff threat) and SEND HIM or HOLD HIM. The race resolves
// on-field: runner vs. pitch + throw to the covering SS at second — or the lefty's pickoff trap.
// Race math (runT vs pitchT+popT) and all copy are the data lib's, VERBATIM from the prototype.
// Field = reused BaseballDiamond; choreography runs on ONE rAF loop off an elapsed-ms state.
const F_BOLD = 'SpaceGrotesk_700Bold';
const PROMPT_IDLE = "Runner's got his lead. Your call from the dugout: is this a race you win?";
const PROMPT_DONE = 'Steals are won in the scouting report, not the sprint.';
const HINT_IDLE = 'The race is runner vs. delivery + throw.';
const HINT_DONE = 'Reset, or read another battery.';
const LBL_OUTLINE = '#1b3a1b';

type Phase = 'idle' | 'run' | 'done';

export default function StealOrStayGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<StealChoice | null>(null);
  const [e, setE] = useState(0);                                     // choreography elapsed (ms)
  const rafRef = useRef<number | null>(null);
  const choreoRef = useRef<Choreo | null>(null);

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';
  const verdict = chosen ? s.verd[chosen] : null;

  // ── one rAF owner — stopLoop cancels it (on choose, on reset, on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); choreoRef.current = null; setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── make the call → run the built choreography on the single rAF loop ──
  const choose = (opt: StealChoice) => {
    if (phase !== 'idle') return;
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ch = buildStealPlay(s, opt);
    choreoRef.current = ch;
    setChosen(opt); setPhase('run');
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = now - t0;
      setE(el);
      if (!revealed && el >= ch.revealAt) { revealed = true; setPhase('done'); }
      if (el < ch.total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the dynamic SVG layer (children of BaseballDiamond), derived from the choreography at `e` ──
  const ch = choreoRef.current;
  const tweens = ch?.tweens ?? [];
  const dyn: ReactNode[] = [];
  (Object.keys(POS) as Fielder[]).forEach(name => {
    const [x, y] = ch ? tweenPos(tweens, name, POS[name], e) : POS[name];
    dyn.push(<Circle key={`f${name}`} cx={x} cy={y} r={12} fill={FE.blue} stroke={FE.navy} strokeWidth={2} />);
    dyn.push(<SvgText key={`fl${name}`} x={x} y={y + 4} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill="#fff">{name}</SvgText>);
  });
  const runner: Pt = ch ? tweenPos(tweens, 'runner', LEAD, e) : LEAD;
  dyn.push(<Circle key="r" cx={runner[0]} cy={runner[1]} r={11} fill={FE.orange} stroke={FE.navy} strokeWidth={2} />);
  dyn.push(<SvgText key="rl" x={runner[0]} y={runner[1] + 4} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#fff">R</SvgText>);
  const ball: Pt = ch ? tweenPos(tweens, 'ball', BALL_START, e) : BALL_START;
  dyn.push(<Circle key="ball" cx={ball[0]} cy={ball[1]} r={6} fill="#fff" stroke={FE.navy} strokeWidth={1.5} />);
  ch?.bursts.forEach((b, i) => {
    const bp = (e - b.start) / BURST_MS;
    if (bp >= 0 && bp < 1) dyn.push(<Circle key={`bu${i}`} cx={b.pos[0]} cy={b.pos[1]} r={8 + 20 * bp} fill="none" stroke={b.color} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
  });
  ch?.labels.forEach((l, i) => {
    if (e < l.start) return;
    const common = { x: l.pos[0], y: l.pos[1], textAnchor: 'middle' as const, fontSize: 14, fontFamily: F_BOLD };
    dyn.push(<SvgText key={`lo${i}`} {...common} fill="none" stroke={LBL_OUTLINE} strokeWidth={4} strokeLinejoin="round">{l.text}</SvgText>);
    dyn.push(<SvgText key={`lf${i}`} {...common} fill={l.color}>{l.text}</SvgText>);
  });
  const diamond = <BaseballDiamond fill="width">{dyn}</BaseballDiamond>;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = <View style={styles.hud}>{s.hud.map(h => <Text key={h} style={styles.chip}>{h}</Text>)}</View>;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Defense', FE.blue], ['Runner', FE.orange], ['Ball', '#fff']] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c, borderWidth: c === '#fff' ? 1 : 0, borderColor: '#999' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  const livePrompt = ch && phase === 'run'
    ? [...ch.prompts].reverse().find(p => e >= p.at)?.text ?? PROMPT_IDLE
    : answered ? PROMPT_DONE : PROMPT_IDLE;
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <Text style={[styles.promptTxt, landscape && styles.promptTxtLs]}>{livePrompt}</Text>
      {phase !== 'run' && <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{answered ? HINT_DONE : HINT_IDLE}</Text>}
    </View>
  );
  // the two call buttons — UNMOUNT on reveal (the verdict takes their space); disabled mid-play
  const judge = !answered ? (
    <View style={styles.judgeRow}>
      <TouchableOpacity style={[styles.goBtn, phase !== 'idle' && styles.btnDisabled, landscape && styles.goBtnLs]} activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose('go')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>SEND HIM</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.stayBtn, phase !== 'idle' && styles.btnDisabled, landscape && styles.stayBtnLs]} activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose('stay')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>HOLD HIM</Text>
      </TouchableOpacity>
    </View>
  ) : null;
  const verdictCard = answered && verdict ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, verdict.k === 'good' ? styles.vtagGood : verdict.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {verdict.k === 'good' ? 'Right call' : verdict.k === 'ok' ? 'Defensible' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{verdict.t}</Text>
      <Text style={styles.vbody}>{verdict.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vread}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: diamond field-left, HUD + prompt + call buttons (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={BASEBALL_DIAMOND_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={diamond}
        controls={answered ? <>{hudChips}{verdictCard}{legend}</> : <>{hudChips}{promptBlock}{judge}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack (prototype order: pills · HUD · diamond · legend · prompt · judge · verdict). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {diamond}
      {legend}
      {promptBlock}
      {judge}
      {verdictCard}
      <View style={styles.controls}>
        {answered && <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>}
        {answered && <NextButton visible variant="filled" label="Next battery →" onPress={nextScenario} />}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: '700', color: t.textPrimary, overflow: 'hidden' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeRow: { flexDirection: 'row', gap: 10 },
  goBtn: { flex: 1, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  goBtnLs: { minHeight: 44, paddingVertical: 9 },
  stayBtn: { flex: 1, backgroundColor: FE.navy, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  stayBtnLs: { minHeight: 44, paddingVertical: 9 },
  btnDisabled: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  judgeTxtLs: { fontSize: 14 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  vread: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
