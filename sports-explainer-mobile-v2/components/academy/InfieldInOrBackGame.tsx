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
  SCEN, STATICPOS, depthPositions, buildInfieldPlay, tweenPos, BURST_MS,
  BALL_START, LEAD3, LEAD1, BATTER,
  type DepthChoice, type Depth, type Choreo, type InfieldMover,
} from '../../lib/infieldInOrBack';

// Infield In or Back? — baseball depth-bet module. Runner on third, ground ball coming: bring the
// infield IN to cut the run at the plate, play BACK for the outs (and the double play), or hedge
// HALFWAY. The call re-aligns the infield on-field, then the play runs — the branch each depth
// actually produces (out at the plate / through the vacated hole / 6-4-3 / trade the run) is the
// teaching beat. Alignments, choreography and every fan-facing string are the data lib's, VERBATIM
// from the prototype. Field = reused BaseballDiamond; the whole play runs on ONE rAF loop.
const F_BOLD = 'SpaceGrotesk_700Bold';
const LBL_OUTLINE = '#1b3a1b';
const PROMPT_IDLE = "Ground ball's coming — you can feel it. **Set your depth.**";
const PROMPT_DONE = 'Depth is a bet: **the run, or the outs.** The scoreboard tells you which to buy.';
const HINT_IDLE = 'One question decides it: can you afford this run?';
const HINT_DONE = 'Reset, or set a different depth.';

type Phase = 'idle' | 'run' | 'done';

// Prompt text with **bold** segments in the prototype's amber.
function Prompt({ text, hint, styles, compact }: { text: string; hint?: string; styles: ReturnType<typeof makeStyles>; compact?: boolean }) {
  const parts = text.split('**');
  return (
    <View style={[styles.prompt, compact && styles.promptLs]}>
      <Text style={[styles.promptTxt, compact && styles.promptTxtLs]}>
        {parts.map((p, i) => (i % 2 ? <Text key={i} style={styles.promptB}>{p}</Text> : p))}
      </Text>
      {!!hint && <Text style={[styles.hintTxt, compact && styles.hintTxtLs]}>{hint}</Text>}
    </View>
  );
}

export default function InfieldInOrBackGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<DepthChoice | null>(null);
  const [e, setE] = useState(0);                                     // choreography elapsed (ms)
  const rafRef = useRef<number | null>(null);
  const choreoRef = useRef<Choreo | null>(null);

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';
  const verdict = chosen ? s.grade[chosen] : null;

  // ── one rAF owner — stopLoop cancels it (on choose, on reset, on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); choreoRef.current = null; setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── set the depth → run the built choreography (shift → pitch → contact → the branch) ──
  const choose = (opt: DepthChoice) => {
    if (phase !== 'idle') return;
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ch = buildInfieldPlay(s, opt);
    choreoRef.current = ch;
    setChosen(opt); setPhase('run'); setE(0);
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
  // Pre-call the infield stands at STANDARD depth (with a runner on first: DP-cheat + 1B holding);
  // every depth tween starts there, so the shift itself reads as the answer to your call.
  const BACK = depthPositions('back', s.hasR1);
  const dyn: ReactNode[] = [];
  const drawFielder = (name: string, base: Pt) => {
    const [x, y] = ch ? tweenPos(tweens, name, base, e) : base;
    dyn.push(<Circle key={`f${name}`} cx={x} cy={y} r={12} fill={FE.blue} stroke={FE.navy} strokeWidth={2} />);
    dyn.push(<SvgText key={`fl${name}`} x={x} y={y + 4} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill="#fff">{name}</SvgText>);
  };
  (Object.keys(BACK) as InfieldMover[]).forEach(n => drawFielder(n, BACK[n]));
  (Object.keys(STATICPOS) as Fielder[]).forEach(n => drawFielder(n, STATICPOS[n]!));
  const drawRunner = (key: string, base: Pt, lbl: string) => {
    const [x, y] = ch ? tweenPos(tweens, key, base, e) : base;
    dyn.push(<Circle key={`r${key}`} cx={x} cy={y} r={11} fill={FE.orange} stroke={FE.navy} strokeWidth={2} />);
    dyn.push(<SvgText key={`rl${key}`} x={x} y={y + 4} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#fff">{lbl}</SvgText>);
  };
  drawRunner('r3', LEAD3, 'R');
  if (s.hasR1) drawRunner('r1', LEAD1, 'R');
  drawRunner('bat', BATTER, 'B');
  const ball: Pt = ch ? tweenPos(tweens, 'ball', BALL_START, e) : BALL_START;
  dyn.push(<Circle key="ball" cx={ball[0]} cy={ball[1]} r={6} fill="#fff" stroke={FE.navy} strokeWidth={1.5} />);
  ch?.bursts.forEach((b, i) => {
    const bp = (e - b.start) / BURST_MS;
    if (bp >= 0 && bp < 1) dyn.push(<Circle key={`bu${i}`} cx={b.pos[0]} cy={b.pos[1]} r={8 + 20 * bp} fill="none" stroke={b.color} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
  });
  ch?.labels.forEach((l, i) => {
    if (e < l.start) return;
    const common = { x: l.pos[0], y: l.pos[1], textAnchor: 'middle' as const, fontSize: 13, fontFamily: F_BOLD };
    dyn.push(<SvgText key={`lo${i}`} {...common} fill="none" stroke={LBL_OUTLINE} strokeWidth={4} strokeLinejoin="round">{l.text}</SvgText>);
    dyn.push(<SvgText key={`lf${i}`} {...common} fill={l.color}>{l.text}</SvgText>);
  });
  const diamond = <BaseballDiamond fill="width">{dyn}</BaseballDiamond>;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = <View style={styles.hud}>{s.hud.map(h => <Text key={h} style={styles.chip}>{h}</Text>)}</View>;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Your defense', FE.blue], ['Their runners', FE.orange], ['Ball', '#fff']] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c, borderWidth: c === '#fff' ? 1 : 0, borderColor: '#999' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  const livePrompt = ch && phase === 'run'
    ? [...ch.prompts].reverse().find(p => e >= p.at)?.text ?? PROMPT_IDLE
    : answered ? PROMPT_DONE : PROMPT_IDLE;
  const promptBlock = <Prompt text={livePrompt} hint={phase === 'run' ? undefined : answered ? HINT_DONE : HINT_IDLE} styles={styles} compact={landscape} />;
  // the three depth buttons — UNMOUNT on reveal (the verdict takes their space); disabled mid-play
  const judgeBtn = (o: DepthChoice, main: string, sub: string, alt: boolean) => (
    <TouchableOpacity key={o} style={[styles.judgeBtn, phase !== 'idle' && styles.judgeOff, landscape && styles.judgeBtnLs]} activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(o)}>
      <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{main}</Text>
      <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{sub}</Text>
    </TouchableOpacity>
  );
  const judge = !answered ? (
    <View style={landscape ? styles.judgeCol : styles.judgeRow}>
      {judgeBtn('in', 'Infield IN', 'cut the run at the plate', false)}
      {judgeBtn('half', 'Halfway', 'read the ball, then choose', true)}
      {judgeBtn('back', 'Back — DP depth', 'trade the run for outs', true)}
    </View>
  ) : null;
  const verdictCard = answered && verdict ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, verdict.k === 'good' ? styles.vtagGood : verdict.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {verdict.k === 'good' ? 'Right depth' : verdict.k === 'ok' ? 'Defensible' : 'Wrong depth'}
      </Text>
      <Text style={styles.vtitle}>{verdict.t}</Text>
      <Text style={styles.vbody}>{verdict.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: diamond field-left, HUD + prompt + depth buttons (pre) / verdict (post) right. ──
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
        {answered && <NextButton visible variant="filled" label="Next scenario →" onPress={nextScenario} />}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: '700', color: t.textPrimary, overflow: 'hidden' },
  // Prompt.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptB: { color: '#F5A623', fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  // Depth buttons.
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  judgeCol: { gap: 8, marginTop: 4, flexWrap: 'nowrap' },
  judgeBtn: { flex: 1, minWidth: 150, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  // Verdict.
  judgeSubLs: { fontSize: 10 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Buttons / footers.
  legendTxtLs: { fontSize: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
