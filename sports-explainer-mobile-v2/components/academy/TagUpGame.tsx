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
import { lerp, type Fielder, type Pt } from '../../lib/wheresThePlay';
import {
  SCEN, START, TAG3, T_RATE, clamp01, ballAt, classifyGo, buildTagResolve, tweenPos,
  BURST_MS, CHALK, TEAL, RED,
  type TagKind, type Depth, type Choreo,
} from '../../lib/tagUp';

// Tag and Go — baseball tag-up timing module. Runner on third, fly ball up: he may leave on the
// fielder's FIRST TOUCH, not the secure catch. GO is live the whole flight — tap early and the appeal
// at third erases him, tap inside the window and he beats the throw, tap late and the catcher is
// waiting. The shallow-center scenario has NO window: never tapping (the hold) is the right read.
// Window math, resolve choreography and every fan-facing string are the data lib's, VERBATIM from the
// prototype. Field = reused BaseballDiamond; flight AND resolve share ONE rAF loop.
const F_BOLD = 'SpaceGrotesk_700Bold';
const LBL_OUTLINE = '#1b3a1b';
const AMBER = '#F5A623';
const LS_BAR_RESERVE = 46;                       // timeline bar + state line under the diamond
const BURST_T = (BURST_MS / 1000) * T_RATE;      // the catch flash, measured in t-units (live clock)
const PROMPT_IDLE = 'Tap **Play** to put the ball in the air. GO is live the whole flight — and after the catch.';
const PROMPT_RUN = "Ball's in the air… **feet on the bag, eyes on the glove.**";
const PROMPT_DONE = 'The touch is the **starting gun** — and some races you decline to run.';

type Phase = 'idle' | 'running' | 'resolving' | 'done';

// Prompt text with **bold** segments in the prototype's amber.
function Prompt({ text, styles, compact }: { text: string; styles: ReturnType<typeof makeStyles>; compact?: boolean }) {
  const parts = text.split('**');
  return (
    <View style={[styles.prompt, compact && styles.promptLs]}>
      <Text style={[styles.promptTxt, compact && styles.promptTxtLs]}>
        {parts.map((p, i) => (i % 2 ? <Text key={i} style={styles.promptB}>{p}</Text> : p))}
      </Text>
    </View>
  );
}

export default function TagUpGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);                                     // live flight clock (0..100 t-units)
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [kind, setKind] = useState<TagKind | null>(null);
  const [goT, setGoT] = useState<number | null>(null);               // where the GO landed (null = never went)
  const [e, setE] = useState(0);                                     // resolve choreography elapsed (ms)
  const rafRef = useRef<number | null>(null);
  const choreoRef = useRef<Choreo | null>(null);
  const frozenRef = useRef<{ ball: Pt; of: Pt; ofRemainMs: number } | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';
  const verdict = kind ? s.verd[kind] : undefined;
  const correct = kind === 'good' || kind === 'hold';

  // ── one rAF owner — flight AND resolve run on it; stopLoop cancels (on GO, reset, unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => {
    stopLoop(); choreoRef.current = null; frozenRef.current = null;
    setIdx(i); setT(0); setPhase('idle'); setKind(null); setGoT(null); setE(0);
  };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── the flight: t advances at T_RATE t-units/sec; running out the clock = he never went ──
  const play = () => {
    if (phase !== 'idle') return;
    setPhase('running'); phaseRef.current = 'running';
    let localT = 0, last: number | null = null;
    const loop = (now: number) => {
      if (phaseRef.current !== 'running') return;
      if (last == null) last = now;
      localT += ((now - last) / 1000) * T_RATE; last = now;
      if (localT >= 100) {
        setT(100); rafRef.current = null;
        // never tapped: no choreography — the runner simply stayed (hold), or the door shut (late)
        setKind(s.window === null ? 'hold' : 'late'); setGoT(null); setPhase('done');
        return;
      }
      setT(localT);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── GO! — classify against the window, freeze the flight, run the resolve on the SAME loop ──
  const go = () => {
    if (phase !== 'running') return;
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tp = t;
    const k = classifyGo(s, tp) as Exclude<TagKind, 'hold'>;
    const ballFrozen = ballAt(s, tp);
    const flightProg = clamp01(tp / s.catchT);
    frozenRef.current = {
      ball: ballFrozen,
      of: lerp(START[s.of], s.catch, flightProg),
      // he keeps running the ball down under the resolve — threaded onto THIS loop, not a second one
      ofRemainMs: Math.max(0, ((s.catchT - tp) / T_RATE) * 1000),
    };
    const ch = buildTagResolve(s, k, ballFrozen);
    choreoRef.current = ch;
    setGoT(tp); setKind(k); setPhase('resolving'); setE(0);
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

  // ── the dynamic SVG layer (children of BaseballDiamond) ──
  const ch = choreoRef.current;
  const tweens = ch?.tweens ?? [];
  const fz = frozenRef.current;
  // the catching outfielder: live he tracks the ball; resolving he finishes the run he was on
  const ofPos: Pt = fz
    ? (fz.ofRemainMs > 0 ? lerp(fz.of, s.catch, clamp01(e / fz.ofRemainMs)) : s.catch)
    : lerp(START[s.of], s.catch, clamp01(t / s.catchT));
  const dyn: ReactNode[] = [];
  (Object.keys(START) as Fielder[]).forEach(name => {
    const base = name === s.of ? ofPos : START[name];
    const [x, y] = ch ? tweenPos(tweens, name, base, e) : base;
    dyn.push(<Circle key={`f${name}`} cx={x} cy={y} r={12} fill={FE.blue} stroke={FE.navy} strokeWidth={2} />);
    dyn.push(<SvgText key={`fl${name}`} x={x} y={y + 4} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill="#fff">{name}</SvgText>);
  });
  const runner: Pt = ch ? tweenPos(tweens, 'runner', TAG3, e) : TAG3;
  dyn.push(<Circle key="r" cx={runner[0]} cy={runner[1]} r={11} fill={FE.orange} stroke={FE.navy} strokeWidth={2} />);
  dyn.push(<SvgText key="rl" x={runner[0]} y={runner[1] + 4} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#fff">R</SvgText>);
  const ball: Pt = ch && fz ? tweenPos(tweens, 'ball', fz.ball, e) : ballAt(s, t);
  dyn.push(<Circle key="ball" cx={ball[0]} cy={ball[1]} r={6} fill="#fff" stroke={FE.navy} strokeWidth={1.5} />);
  // The first-touch flash — the module's starting gun. Derived from the LIVE clock (a thin state, so
  // it's computed, never toggled), and CONTINUED on the resolve clock when the tap landed after the
  // touch, so a GO inside the window doesn't chop the flash off mid-expand. An EARLY tap gets its
  // catch flash from the choreography instead (there, the catch happens after the break).
  {
    const flashT = ch ? (goT != null && goT >= s.catchT ? goT + (e / 1000) * T_RATE : -1) : t;
    const cp = (flashT - s.catchT) / BURST_T;
    if (cp >= 0 && cp < 1) dyn.push(<Circle key="catchfx" cx={s.catch[0]} cy={s.catch[1]} r={8 + 20 * cp} fill="none" stroke={CHALK} strokeWidth={3} opacity={0.9 * (1 - cp)} />);
  }
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

  // ── timeline: the flight bar (bands revealed on resolve) + the touch tick + the live marker ──
  const bands = answered
    ? (s.window !== null
      ? [{ left: 0, width: s.catchT, color: AMBER }, { left: s.catchT, width: s.window, color: TEAL }, { left: s.catchT + s.window, width: 100 - (s.catchT + s.window), color: RED }]
      : [{ left: 0, width: s.catchT, color: AMBER }, { left: s.catchT, width: 100 - s.catchT, color: RED }])
    : [];
  const markAt = answered ? (goT === null ? 100 : goT) : Math.min(100, t);
  const tstate = phase === 'idle' ? 'Press play, then time your break'
    : phase === 'running' || phase === 'resolving' ? 'Live — time your break'
      : kind === 'good' ? 'Left on the touch — perfect'
        : kind === 'hold' ? 'Held — correct'
          : kind === 'early' ? 'Left before the touch' : 'Left too late';
  const timeline = (
    <View style={styles.tline}>
      <View style={styles.bar}>
        {bands.map((b, i) => <View key={i} style={[styles.band, { left: `${b.left}%`, width: `${b.width}%`, backgroundColor: b.color }]} />)}
        {answered && <View style={[styles.catchMk, { left: `${s.catchT}%` }]} />}
        <View style={[styles.mk, { left: `${markAt}%` }]} />
      </View>
      <View style={styles.tinfoRow}>
        <Text style={styles.tinfo} numberOfLines={1}>{tstate}</Text>
        {answered && <Text style={styles.winInfo} numberOfLines={1}>{s.window !== null ? 'green = your window' : 'no window — hold was right'}</Text>}
      </View>
    </View>
  );

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
  const promptText = phase === 'idle' ? PROMPT_IDLE
    : phase === 'running' ? PROMPT_RUN
      : phase === 'resolving' ? (ch?.prompts[0]?.text ?? PROMPT_RUN)
        : PROMPT_DONE;
  const promptBlock = <Prompt text={promptText} styles={styles} compact={landscape} />;
  // Play / GO! — both UNMOUNT on reveal (the verdict takes their space); Reset + Next live in the footer.
  const actionRow = !answered ? (
    <View style={styles.controls}>
      {/* Colour follows the LIVE action, not the loudest word: Play is primary until it is pressed,
          then GO! takes the accent and Play drops back to muted. Enablement is untouched. */}
      <TouchableOpacity style={[styles.ghostBtn, phase === 'idle' && styles.playHot]} activeOpacity={0.8} disabled={phase !== 'idle'} onPress={play}>
        <Text style={[styles.ghostTxt, phase === 'idle' && styles.playHotTxt, phase !== 'idle' && styles.disabledTxt]}>▶ Play</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.goBtn, phase !== 'running' && styles.goBtnOff, landscape && styles.goBtnLs]} activeOpacity={0.85} disabled={phase !== 'running'} onPress={go}>
        <Text style={[styles.goTxt, phase !== 'running' && styles.goTxtOff, landscape && styles.goTxtLs]}>GO!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}>
        <Text style={styles.ghostTxt}>↺ Reset</Text>
      </TouchableOpacity>
    </View>
  ) : null;
  const verdictCard = answered && verdict ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, correct ? styles.vtagGood : styles.vtagBad]}>{correct ? 'Right read' : 'Not this time'}</Text>
      <Text style={styles.vtitle}>{verdict.t}</Text>
      <Text style={styles.vbody}>{verdict.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const postRow = (
    <View style={landscape ? styles.lsPostRow : styles.postRow}>
      <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>
      <NextButton visible variant="filled" style={landscape ? styles.lsNextFill : undefined} label={landscape ? 'Next →' : 'Next fly ball →'} onPress={nextScenario} />
    </View>
  );

  // ── LANDSCAPE: diamond field-left, timeline under it, HUD + prompt + actions / verdict right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={BASEBALL_DIAMOND_RATIO}
        belowFieldReserve={LS_BAR_RESERVE}
        pills={pills}
        field={diamond}
        belowField={timeline}
        controls={answered ? <>{hudChips}{verdictCard}{legend}</> : <>{hudChips}{promptBlock}{actionRow}{legend}</>}
        controlsFooter={answered ? postRow : undefined}
      />
    );
  }

  // ── PORTRAIT: vertical stack (prototype order: pills · HUD · diamond · legend · timeline · prompt · controls · verdict). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {diamond}
      {legend}
      {timeline}
      {promptBlock}
      {actionRow}
      {verdictCard}
      {answered && postRow}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: '700', color: t.textPrimary, overflow: 'hidden' },
  // Timeline.
  tline: { marginTop: 6 },
  bar: { height: 12, borderRadius: 6, backgroundColor: t.border, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0 },
  catchMk: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: '#F4F4EE' },
  mk: { position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -1.5, backgroundColor: t.textPrimary, borderRadius: 2 },
  tinfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 5 },
  tinfo: { flex: 1, color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '600' },
  winInfo: { color: AMBER, fontSize: 10.5, fontWeight: '700' },
  // Prompt.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptB: { color: AMBER, fontWeight: '800' },
  // Actions.
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  goBtn: { flex: 1, minWidth: 110, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  goBtnLs: { minHeight: 44, paddingVertical: 9 },
  // Not-yet-live GO!: muted blue (the module's own surface), NOT a dimmed accent — the accent
  // belongs to whichever button is actually pressable right now.
  goBtnOff: { backgroundColor: t.surface },
  goTxtOff: { color: t.textSecondaryOnDark },
  // Play carries the accent until it is pressed.
  playHot: { backgroundColor: t.accent, borderColor: t.accent },
  playHotTxt: { color: '#fff', fontWeight: '800' },
  goTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  goTxtLs: { fontSize: 14 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  disabledTxt: { opacity: 0.4 },
  // Verdict.
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
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
  // Post-call rows.
  legendTxtLs: { fontSize: 10 },
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
