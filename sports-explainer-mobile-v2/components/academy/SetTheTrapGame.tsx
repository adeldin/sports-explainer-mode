import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { CricketOval, CRICKET_OVAL_RATIO, ActorDot, CricketBall, BurstRing, GoodBurst, OutlinedLabel, clampLabelX, CK } from './fields/CricketOval';
import {
  TRAP_SCENARIOS, TRAP_BAT, TRAP_NONSTRIKER, TRAP_FOOT, TRAP_SUB,
  type P2, type TrapCall, type TrapScenario, type TrapOption, type TrapOutcome, type DepthKey, type GradeKey,
} from '../../lib/setTheTrap';

// Set the Trap — you captain the fielding side. The EVIDENCE is his last two shots, still drawn on
// the grass as faded arcs; they stay there the whole time, because they are the read. Pick a plan and
// the chosen fielder MOVES FIRST — the bowler waits for the field to set, exactly as he does in a
// real over — and only then is the ball delivered. Within a scenario the batter plays the same
// stroke into the same lane whichever plan you pick: the only thing that changes is whether a hand
// is standing there. Wrong picks reveal the teal ghost ring where the answer stood.
// Cricket already has a ground renderer (CricketOval, 680×460) and this module has no board band, so
// it renders the oval directly and the positions land on the shared viewBox. Copy is lib data.
const F_BOLD_NOTE = 'right-hand batter: off side left, leg side right';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const EVIDENCE = '#f3e3bc';
const BOWLER_END: P2 = [340, 152];              // the stumps the run-out throw goes to

// Which mistake each button hunts (chrome — every judgement string comes from the lib).
const OPTION_UI: { key: TrapCall; title: string; sub: string; alt?: boolean }[] = [
  { key: 'catcher', title: 'ADD A CATCHER', sub: 'hunt the edge — a hand in the cordon' },
  { key: 'single', title: 'PLUG THE SINGLE', sub: 'a ring man in the lane he keeps using' },
  { key: 'rope', title: 'GUARD THE ROPE', sub: 'a rider in his boundary sector', alt: true },
];
const HINT_IDLE = 'Two faded arcs on the grass. Move a man onto the evidence.';
const HINT_RUN = 'Field set — the bowler runs in…';
const HINT_DONE = 'Reset, or set another field.';

const GOOD_OUT: TrapOutcome[] = ['caught', 'dot', 'runout_win'];
const OK_OUT: TrapOutcome[] = ['single'];
const outcomeColor = (o: TrapOutcome) => (GOOD_OUT.includes(o) ? CK.good : OK_OUT.includes(o) ? AMBER : RED);
const outcomeLabelFill = (o: TrapOutcome) => (GOOD_OUT.includes(o) ? '#bfe9da' : OK_OUT.includes(o) ? '#ffe1b3' : '#ffb3ae');

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp2 = (a: P2, b: P2, k: number): P2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
// Quadratic bowed perpendicular to travel — a stroke that leaves the bat on a curve, not a ruler line.
const qCtrl = (from: P2, to: P2, bow: number): P2 => {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
  return [mx - (dy / len) * bow, my + (dx / len) * bow];
};
const qPathD = (from: P2, to: P2, bow: number): string => {
  const c = qCtrl(from, to, bow);
  return `M${from[0].toFixed(1)} ${from[1].toFixed(1)} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${to[0].toFixed(1)} ${to[1].toFixed(1)}`;
};
const bezAt = (from: P2, to: P2, bow: number, k: number): P2 => {
  const c = qCtrl(from, to, bow), mk = 1 - k;
  return [mk * mk * from[0] + 2 * mk * k * c[0] + k * k * to[0], mk * mk * from[1] + 2 * mk * k * c[1] + k * k * to[1]];
};

const DELIVERY_MS = 420, SHOT_MS = 640, THROW_LAG = 200, THROW_MS = 520, GHOST_LAG = 380;
function times(s: TrapScenario, o: TrapOption) {
  const strike = s.deliveryAfter + DELIVERY_MS;
  const land = strike + SHOT_MS;
  const runout = o.outcome === 'runout_win';
  const throwStart = land + THROW_LAG;
  const outcome = runout ? throwStart + THROW_MS : land;
  const ghost = outcome + GHOST_LAG;
  return { move: s.moveDur, deliver: s.deliveryAfter, strike, land, runout, throwStart, outcome, ghost, total: ghost + 720 };
}

type Phase = 'idle' | 'run' | 'done';

export default function SetTheTrapGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<TrapCall | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);
  const rafRef = useRef<number | null>(null);

  const s = TRAP_SCENARIOS[idx];
  const depth: DepthKey = level === 'kid' ? 'rookie' : level;
  const o = chosen ? s.opts[chosen] : null;
  const T = o ? times(s, o) : null;
  const answered = phase === 'done';

  // ── one rAF owner — cancelled on reset, on scenario change, on unmount ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetField = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % TRAP_SCENARIOS.length);

  const choose = (call: TrapCall) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(call); setPhase('run'); setE(0);
    const tt = times(s, s.opts[call]);
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = Math.min(now - t0, tt.total);
      setE(el);
      if (!revealed && el >= tt.ghost) { revealed = true; setPhase('done'); }
      if (el < tt.total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the ground layer: pure function of (scenario, chosen, e) ──
  const nodes: ReactNode[] = [];
  const moveK = T ? clamp01(e / T.move) : 0;

  // THE EVIDENCE — his last two shots, faint on the grass, and they never leave.
  s.shots.forEach((sh, i) => {
    nodes.push(<Path key={`ev${i}`} d={qPathD(TRAP_BAT, sh.to, sh.air ? 26 : 8)} fill="none" stroke={EVIDENCE}
      strokeWidth={2.4} strokeDasharray="6 6" opacity={0.42} />);
    nodes.push(<Circle key={`evd${i}`} cx={sh.to[0]} cy={sh.to[1]} r={4} fill={EVIDENCE} opacity={0.4} />);
    const at: P2 = sh.labAt ?? [sh.to[0], sh.to[1] + 18];
    nodes.push(<G key={`evl${i}`} opacity={0.72}><OutlinedLabel x={clampLabelX(at[0], sh.lab)} y={at[1]} text={sh.lab} fill="#efe3c2" size={9} /></G>);
  });

  // everyone-in fields say so with the ring they all crowd inside
  if (o?.everyoneIn && moveK >= 1) {
    nodes.push(<Ellipse key="ring" cx={340} cy={232} rx={168} ry={126} fill="none" stroke={AMBER} strokeWidth={2} strokeDasharray="6 7" opacity={0.9} />);
    nodes.push(<G key="ringL"><OutlinedLabel x={340} y={98} text="everyone in" fill="#ffe1b3" size={10.5} /></G>);
  }

  // the batters
  nodes.push(<G key="bat"><ActorDot x={TRAP_BAT[0]} y={TRAP_BAT[1]} fill={CK.def} label="batter (RH)" labelFill="#bcd3ff" /></G>);
  nodes.push(<G key="nonstr"><ActorDot x={TRAP_NONSTRIKER[0]} y={TRAP_NONSTRIKER[1]} fill={CK.def} label="non-striker" labelFill="#bcd3ff" dy={24} /></G>);

  // the fielding side — the chosen man (or men) slide BEFORE the ball, relabelled on arrival
  let bowlerP: P2 = [346, 150];
  s.fielders.forEach(f => {
    const mv = o?.moves.find(m => m.f === f.id) ?? null;
    const p: P2 = mv ? lerp2(f.p, mv.to, moveK) : f.p;
    const lab = mv && moveK >= 1 ? mv.relab : f.n;
    const dy = mv && moveK >= 1 ? (mv.dy ?? f.dy) : f.dy;
    if (f.id === 'bowler') bowlerP = p;
    const keeper = f.id === 'keeper';
    nodes.push(
      <G key={`f-${f.id}`}>
        {!!mv && moveK > 0 && moveK < 1 && <Path d={`M${f.p[0]} ${f.p[1]} L${p[0].toFixed(1)} ${p[1].toFixed(1)}`} stroke={AMBER} strokeWidth={1.6} strokeDasharray="4 4" opacity={0.75} />}
        <ActorDot x={p[0]} y={p[1]} fill={keeper ? CK.keeper : CK.orange} label={lab} labelFill={keeper ? '#e6d8f2' : '#fff'} dy={dy ?? -13} />
      </G>,
    );
  });

  // the delivery, the stroke (same stroke every option — only the fielding changed), the outcome
  let ballP: P2 | null = null, loft = 0;
  if (T && o) {
    if (e < T.deliver) {
      ballP = [bowlerP[0] + 7, bowlerP[1] + 5];
    } else if (e < T.strike) {
      ballP = lerp2([bowlerP[0] + 7, bowlerP[1] + 5], [TRAP_BAT[0] - 6, TRAP_BAT[1] - 8], clamp01((e - T.deliver) / DELIVERY_MS));
    } else if (e < T.land) {
      const k = clamp01((e - T.strike) / SHOT_MS);
      const bow = o.shot.air ? (o.shot.peak ?? 26) : 8;
      ballP = bezAt(TRAP_BAT, o.shot.to, bow, k);
      loft = o.shot.air ? Math.sin(Math.PI * k) : 0;
      nodes.push(<Path key="stroke" d={qPathD(TRAP_BAT, o.shot.to, bow)} fill="none" stroke="#fff5d8" strokeWidth={2.6} strokeDasharray="6 6" opacity={0.8} />);
    } else {
      const bow = o.shot.air ? (o.shot.peak ?? 26) : 8;
      nodes.push(<Path key="stroke" d={qPathD(TRAP_BAT, o.shot.to, bow)} fill="none" stroke="#fff5d8" strokeWidth={2.6} strokeDasharray="6 6" opacity={0.8} />);
      if (T.runout && e >= T.throwStart) {
        const k = clamp01((e - T.throwStart) / THROW_MS);
        ballP = lerp2(o.shot.to, BOWLER_END, k);
        nodes.push(<Path key="throw" d={`M${o.shot.to[0]} ${o.shot.to[1]} L${BOWLER_END[0]} ${BOWLER_END[1]}`} stroke="#ffd23f" strokeWidth={2} strokeDasharray="5 4" opacity={0.85} />);
      } else {
        ballP = o.shot.to;
      }
    }
    // the outcome fires where it happened — the run-out at the stumps, everything else at the ball
    if (e >= T.outcome) {
      const at: P2 = T.runout ? BOWLER_END : o.shot.to;
      const prog = clamp01((e - T.outcome) / 620);
      const col = outcomeColor(o.outcome);
      if (GOOD_OUT.includes(o.outcome)) nodes.push(<G key="fx"><GoodBurst x={at[0]} y={at[1]} prog={prog} /></G>);
      else nodes.push(<G key="fx"><BurstRing x={at[0]} y={at[1]} prog={prog} color={col} /></G>);
      const labAt: P2 = o.olabAt ?? [at[0], at[1] - 24];
      nodes.push(<G key="olab"><OutlinedLabel x={clampLabelX(labAt[0], o.olab)} y={labAt[1]} text={o.olab} fill={outcomeLabelFill(o.outcome)} size={11.5} /></G>);
    }
    // the answer's post, revealed on a wrong pick
    if (e >= T.ghost && o.ghost) {
      nodes.push(<Circle key="ghost" cx={o.ghost[0]} cy={o.ghost[1]} r={17} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />);
      if (o.ghostLab) nodes.push(<G key="ghostL"><OutlinedLabel x={clampLabelX(o.ghost[0], o.ghostLab)} y={o.ghost[1] + 32} text={o.ghostLab} fill="#7be0bf" size={10} /></G>);
    }
  } else {
    ballP = [bowlerP[0] + 7, bowlerP[1] + 5];
  }
  if (ballP) {
    if (loft > 0) nodes.push(<Circle key="loft" cx={ballP[0]} cy={ballP[1]} r={4.5 + 4 * loft} fill="#fff" opacity={0.22} />);
    nodes.push(<G key="ball"><CricketBall x={ballP[0]} y={ballP[1]} /></G>);
  }

  const field = <CricketOval footnote={F_BOLD_NOTE}>{nodes}</CricketOval>;

  // ── chrome ──
  const pills = <ScenarioPills wrap={landscape} items={TRAP_SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.hud.map((c, i) => (
        <View key={i} style={[styles.chip, c.warn && styles.chipWarn]}>
          <Text style={[styles.chipTxt, c.warn && styles.chipTxtWarn]}>{c.c}</Text>
        </View>
      ))}
    </View>
  );
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <Rich s={s.prompt} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{answered ? HINT_DONE : phase === 'run' ? HINT_RUN : HINT_IDLE}</Text>
    </View>
  );
  const judgeBtns = (
    <View style={styles.judgeCol}>
      {OPTION_UI.map(ob => (
        <TouchableOpacity key={ob.key} style={[styles.judgeBtn, ob.alt && styles.judgeBtnAlt, phase === 'run' && styles.judgeBtnDim, landscape && styles.judgeBtnLs]}
          activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(ob.key)}>
          <Text style={[styles.judgeTitle, landscape && styles.judgeTitleLs]}>{ob.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{ob.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Fielding side (you)', CK.orange], ['Wicket-keeper', CK.keeper], ['Batters', CK.def]] as [string, string][]).map(([l, c]) => (
        <View key={l} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{l}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: EVIDENCE }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Faded arcs = his last two shots (the evidence)</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: TEAL }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Teal ring = where the answer stood</Text></View>
      <Text style={styles.legendMuted}>your man moves BEFORE the delivery — the bowler waits for the field</Text>
    </View>
  );
  const g: GradeKey | null = o ? o.k : null;
  const verdictCard = answered && o && g ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, g === 'good' ? styles.vtagGood : g === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {g === 'good' ? 'Right call' : g === 'ok' ? 'Defensible' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{o.t}</Text>
      <Text style={styles.vbody}>{o.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const subLine = !answered ? <Text style={styles.foot}>{TRAP_SUB}</Text> : null;
  const footLine = <Text style={styles.foot}>{TRAP_FOOT}</Text>;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetField}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next field →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: the oval left via the shell; chips + prompt + plans (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={CRICKET_OVAL_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{promptBlock}{verdictCard}{legend}{footLine}</> : <>{hudChips}{promptBlock}{judgeBtns}{legend}{subLine}{footLine}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {field}
      {legend}
      {promptBlock}
      {answered ? verdictCard : judgeBtns}
      {answered && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetField}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
          <NextButton visible variant="filled" label="Next field →" onPress={nextScenario} />
        </View>
      )}
      {subLine}
      {footLine}
    </ScrollView>
  );
}

// Prompt copy keeps the lib's <b>…</b> markers; render them as bold accent spans.
function Rich({ s, style, boldStyle }: { s: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = s.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipWarn: { borderColor: RED },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipTxtWarn: { color: RED },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: t.accentText, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeCol: { gap: 8 },
  judgeBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', minHeight: 48 },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  judgeBtnAlt: { backgroundColor: '#28407a' },
  judgeBtnDim: { opacity: 0.4 },
  judgeTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTitleLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendDashed: { borderWidth: 2, backgroundColor: 'transparent' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  legendMuted: { color: t.textSecondaryOnDark, fontSize: 11, opacity: 0.7 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 17, opacity: 0.8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
