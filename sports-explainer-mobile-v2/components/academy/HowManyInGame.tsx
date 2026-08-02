import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Circle, Ellipse } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import { RugbyPitch, RugbyBall, PitchLabel, BurstRing, RUGBY, RUGBY_TAG, RUGBY_PITCH_RATIO } from './fields/RugbyPitch';
import {
  SCENARIOS, SEND_OPTIONS, POOL_LABELS, R_ACTOR, VERDICT_TAG,
  poolPos, cleanTargets, ninePos, ballPos, carrierDown, tacklerDown, wideCount, thiefIndex,
  type HMIScenario, type SendN, type Depth, type XY,
} from '../../lib/howManyIn';

// How Many In? — the rugby ruck-resourcing module. THE RUCK IS A MARKET (the owner's frame): every
// body sent to secure the ball is a body deleted from the wide attack. Both pictures are on the
// pitch BEFORE the choice — the jackal(s) with hands on the ball (amber ring, on their feet) and
// the wide count with their line already set — so the spend is visible on both sides of the ledger
// at the moment of decision. Underpay and the turnover happens physically: the thief takes the ball
// and walks off with it. Overpay and the leftovers who would have been wide are simply not there.
// All copy verbatim from the prototype (lib layer).
//
// Animation: the prototype's timer chains flatten into ONE prebuilt keyframe script; the scene is a
// pure function of a single elapsed-ms clock on one rafRef, with a generation guard.

// No under-field content in this module (the wide-count readout is drawn ON the pitch).
// The explanation key rides UNDER the field (two compact rows at the field width): this pitch
// is WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved
// ALWAYS so the art size never jumps, and it hands that height back to the controls column.
const LS_BELOW_RESERVE = 42;

interface Leg { t0: number; t1: number; from: XY; to: XY }
interface LabelEv { at: number; x: number; y: number; text: string; fill: string; size: number }
interface BurstEv { at: number; x: number; y: number; color: string }
interface PromptEv { at: number; text: string }
interface Script {
  total: number; verdictAt: number;
  ruckFormedAt: number;            // when "tackle — ball on the ground" becomes "ruck — the fence goes up"
  poolLegs: Leg[][]; jackLegs: Leg[][]; hovLegs: Leg[][];
  ball: Leg[];
  labels: LabelEv[]; bursts: BurstEv[]; prompts: PromptEv[];
}

const posOnLegs = (base: XY, legs: Leg[], e: number): XY => {
  let p = base;
  for (const l of legs) {
    if (e <= l.t0) return p;
    const k = Math.min(1, (e - l.t0) / (l.t1 - l.t0));
    p = [l.from[0] + (l.to[0] - l.from[0]) * k, l.from[1] + (l.to[1] - l.from[1]) * k];
    if (e < l.t1) return p;
  }
  return p;
};

function buildScript(s: HMIScenario, n: SendN): Script {
  const g = s.grade[n];
  const kept = g.k === 'good' || g.k === 'ok';
  const pool = poolPos(s), targets = cleanTargets(s);
  const sc: Script = {
    total: 0, verdictAt: 0, ruckFormedAt: Number.POSITIVE_INFINITY,
    poolLegs: pool.map(() => []), jackLegs: s.jackals.map(() => []), hovLegs: s.hover.map(() => []),
    ball: [], labels: [], bursts: [], prompts: [],
  };
  sc.prompts.push({ at: 0, text: n === 0 ? 'Nobody goes in — trusting the placement…' : `Sending ${n}…` });

  let outcomeAt: number;
  if (n === 0) {
    outcomeAt = 450;
  } else {
    for (let i = 0; i < n; i++) sc.poolLegs[i].push({ t0: 0, t1: 420 + i * 140, from: pool[i], to: targets[i] });
    sc.ruckFormedAt = 420;                     // the FIRST arrival is what turns a tackle into a ruck
    outcomeAt = 420 + (n - 1) * 140;
  }
  sc.bursts.push({
    at: outcomeAt, x: s.ruck[0], y: s.ruck[1] - 2,
    color: g.k === 'good' ? RUGBY.teal : g.k === 'ok' ? RUGBY.amber : RUGBY.red,
  });

  if (!kept) {
    // A turnover the eye can verify: the thief takes the ball and steps away WITH it.
    const th = thiefIndex(s, n);
    const tp: XY = th.from === 'jackal' ? s.jackals[th.i].p : s.hover[th.i].p;
    const t0 = outcomeAt + 250;
    const away: XY = [tp[0] + 32, tp[1] - 10];
    sc.ball.push({ t0, t1: t0 + 280, from: ballPos(s), to: [tp[0], tp[1] + 4] });
    (th.from === 'jackal' ? sc.jackLegs[th.i] : sc.hovLegs[th.i]).push({ t0: t0 + 280, t1: t0 + 730, from: tp, to: away });
    sc.ball.push({ t0: t0 + 280, t1: t0 + 730, from: [tp[0], tp[1] + 4], to: [away[0], away[1] + 4] });
    sc.labels.push({ at: t0 + 730, x: away[0], y: away[1] - 28, text: 'stolen — their ball', fill: '#ffb3ae', size: 11 });
    sc.verdictAt = t0 + 730;
  } else {
    // The words say "blasted off the ball" — so the jackals are visibly driven back off it.
    if (s.jackals.length && n >= 2) {
      s.jackals.forEach((j, i) => sc.jackLegs[i].push({
        t0: outcomeAt, t1: outcomeAt + 420, from: j.p, to: [s.ruck[0] + 30 + i * 8, s.ruck[1] - 8 + i * 26],
      }));
    }
    sc.labels.push({
      at: outcomeAt, x: s.ruck[0], y: s.ruck[1] - 34,
      text: g.k === 'good' ? 'QUICK BALL' : 'SLOW BALL',
      fill: g.k === 'good' ? '#bfe9da' : '#ffe1b3', size: 12,
    });
    // Beat 2 — the ledger: whoever you did NOT spend jogs out and joins the wide line.
    const nextAt = outcomeAt + 600;
    sc.prompts.push({ at: nextAt, text: 'Ball secured — now <b>look wide</b>…' });
    const slots = s.wideSlots.slice(s.preWideN, s.preWideN + (POOL_LABELS.length - n));
    for (let i = n; i < POOL_LABELS.length; i++) {
      const slot = slots[i - n];
      if (slot) sc.poolLegs[i].push({ t0: nextAt, t1: nextAt + 700, from: pool[i], to: slot });
    }
    const wc = wideCount(s, n);
    sc.labels.push({
      at: nextAt + 780, x: 500, y: 40,
      text: `next phase: ${wc.att} wide v ${wc.def} — ${wc.tag}`, fill: wc.color, size: 13,
    });
    sc.verdictAt = nextAt + 780;
  }

  let end = sc.verdictAt;
  [...sc.ball, ...sc.poolLegs.flat(), ...sc.jackLegs.flat(), ...sc.hovLegs.flat()].forEach(l => { if (l.t1 > end) end = l.t1; });
  sc.bursts.forEach(b => { if (b.at + 600 > end) end = b.at + 600; });
  sc.total = end + 300;
  return sc;
}

function Rich({ text, style, boldStyle }: { text: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

export default function HowManyInGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState<Level>(appLevel);
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [chosen, setChosen] = useState<SendN | null>(null);
  const [e, setE] = useState(0);
  const scriptRef = useRef<Script | null>(null);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const sc = scriptRef.current;
  const grade = chosen != null ? s.grade[chosen] : null;
  const showVerdict = phase !== 'idle' && sc != null && e >= sc.verdictAt;

  // ── single rAF owner + generation guard ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);
  const resetTo = (i: number) => {
    genRef.current++; stopLoop();
    setIdx(i); setPhase('idle'); setChosen(null); setE(0); scriptRef.current = null;
  };
  const choose = (n: SendN) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const script = buildScript(s, n);
    scriptRef.current = script; setChosen(n); setPhase('run'); setE(0);
    const gen = ++genRef.current;
    let begin: number | null = null;
    const loop = (now: number) => {
      if (genRef.current !== gen) return;
      if (begin == null) begin = now;
      const el = now - begin;
      if (el >= script.total) { setE(script.total); setPhase('done'); rafRef.current = null; return; }
      setE(el);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the pitch layer at time e (order: defense · attack · ball · fx · labels) ──
  const els: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  // on the ground, out of the contest — a TACKLE until somebody binds over it
  {
    const td = tacklerDown(s);
    els.push(<Ellipse key="tk" cx={td[0]} cy={td[1]} rx={16} ry={8} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} opacity={0.8} />);
  }
  // their threat over the ball: jackals (amber ring = hands on) + hovering defenders
  s.jackals.forEach((j, i) => {
    const p = sc ? posOnLegs(j.p, sc.jackLegs[i], e) : j.p;
    els.push(<Circle key={`jk${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.def} stroke={RUGBY.amber} strokeWidth={3.5} />);
    labels.push(<PitchLabel key={`jkl${i}`} x={p[0]} y={p[1] - 16} text={j.lab} fill="#ffd97a" size={10.5} outline={3.5} />);
  });
  s.hover.forEach((h, i) => {
    const p = sc ? posOnLegs(h.p, sc.hovLegs[i], e) : h.p;
    els.push(<Circle key={`hv${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} />);
    labels.push(<PitchLabel key={`hvl${i}`} x={p[0]} y={p[1] - 16} text={h.lab} fill={RUGBY.defLbl} size={10.5} outline={3.5} />);
  });
  // their line, set from the start — the other half of the ledger
  s.wideDef.forEach((d, i) => {
    els.push(<Circle key={`wd${i}`} cx={d.p[0]} cy={d.p[1]} r={R_ACTOR} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} />);
    labels.push(<PitchLabel key={`wdl${i}`} x={d.p[0]} y={d.p[1] - 16} text={d.lab} fill={RUGBY.defLbl} size={10.5} outline={3.5} />);
  });
  {
    const cd = carrierDown(s);
    els.push(<Ellipse key="cd" cx={cd[0]} cy={cd[1]} rx={16} ry={8} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} opacity={0.9} />);
  }
  // your support pool — the SAME three bodies that either ruck or end up wide
  {
    const pool = poolPos(s);
    pool.forEach((base, i) => {
      const p = sc ? posOnLegs(base, sc.poolLegs[i], e) : base;
      els.push(<Circle key={`pl${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
      labels.push(<PitchLabel key={`pll${i}`} x={p[0]} y={p[1] - 16} text={POOL_LABELS[i]} size={10.5} outline={3.5} />);
    });
  }
  // the wide slots already filled before you spend
  s.wideSlots.slice(0, s.preWideN).forEach((p, i) => {
    els.push(<Circle key={`ws${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
    labels.push(<PitchLabel key={`wsl${i}`} x={p[0]} y={p[1] - 16} text={s.wideLab[i]} size={10.5} outline={3.5} />);
  });
  {
    const n9 = ninePos(s);
    els.push(<Circle key="nine" cx={n9[0]} cy={n9[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
    labels.push(<PitchLabel key="ninel" x={n9[0]} y={n9[1] - 16} text="9" size={10.5} outline={3.5} />);
  }
  {
    const b = sc ? posOnLegs(ballPos(s), sc.ball, e) : ballPos(s);
    els.push(<RugbyBall key="ball" x={b[0]} y={b[1]} />);
  }
  sc?.bursts.forEach((b, i) => els.push(<BurstRing key={`bu${i}`} x={b.x} y={b.y} prog={(e - b.at) / 600} color={b.color} maxR={28} />));
  els.push(...labels);
  els.push(
    <PitchLabel
      key="rlbl" x={s.ruck[0] - 4} y={s.ruck[1] + 38}
      text={sc && e >= sc.ruckFormedAt ? 'ruck — the fence goes up' : 'tackle — ball on the ground'}
      fill="#d9e2d9" size={9.5}
    />
  );
  sc?.labels.forEach((l, i) => { if (e >= l.at) els.push(<PitchLabel key={`lb${i}`} x={l.x} y={l.y} text={l.text} fill={l.fill} size={l.size} />); });

  const pitch = <RugbyPitch fill="width">{els}</RugbyPitch>;

  // ── chrome fragments ──
  const promptText = phase === 'idle'
    ? s.prompt
    : showVerdict
      ? 'The ruck is a <b>market</b> — you just saw what your spend bought.'
      : (sc?.prompts.filter(p => e >= p.at).pop()?.text ?? s.prompt);
  const prompt = <View style={[styles.prompt, landscape && styles.promptLs]}><Rich text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} /></View>;
  const hintText = showVerdict ? 'Reset, or pick another tackle.' : "Threat over the ball first — then count what's wide.";
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((x, i) => ({ key: String(i), name: x.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: RUGBY.att }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Attack (going right)</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: RUGBY.def }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Defense</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendRing, { backgroundColor: RUGBY.def }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Jackal — on his feet, hands on the ball</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendPill, { backgroundColor: RUGBY.att }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Tackled carrier (on the ground)</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendPill, { backgroundColor: RUGBY.def }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Tackler (on the ground)</Text></View>
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  const judgeButtons = (
    <View style={styles.judgeWrap}>
      {SEND_OPTIONS.map(o => (
        <TouchableOpacity key={o.n} style={[styles.judgeBtn, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose(o.n)}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{o.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const verdictCard = showVerdict && grade ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, grade.k === 'good' ? styles.vtagGood : grade.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {VERDICT_TAG[grade.k]}
      </Text>
      <Text style={styles.vtitle}>{grade.t}</Text>
      <Text style={styles.vbody}>{grade.b}</Text>
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
  const lsFooter = showVerdict ? (
    <View style={styles.lsPostRow}>
      {resetBtn}
      <NextButton visible variant="filled" style={styles.lsNextFill} label="Next tackle →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />
    </View>
  ) : undefined;

  // ── LANDSCAPE: the shared shell. The send buttons UNMOUNT on reveal (Reset + Next stay pinned). ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={RUGBY_PITCH_RATIO}
        belowFieldReserve={LS_BELOW_RESERVE}
        pills={pills}
        field={pitch}
        belowField={lsLegendUnder}
        controls={showVerdict
          ? <>{verdictCard}</>
          : <>{prompt}{phase === 'idle' && judgeButtons}{hint}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack (mirrors the prototype's column). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {pitch}
      {legend}
      {prompt}
      {phase === 'idle' && judgeButtons}
      {verdictCard}
      <View style={styles.controlsRow}>
        {resetBtn}
        {showVerdict && <NextButton visible variant="filled" label="Next tackle →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />}
        {hint}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: t.accentText, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendRing: { borderWidth: 2.5, borderColor: RUGBY.amber },
  legendPill: { width: 16, height: 8, borderRadius: 6 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  lsLegendUnder: { minHeight: LS_BELOW_RESERVE, paddingTop: 4, justifyContent: 'center' },
  judgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeBtn: { flexGrow: 1, flexBasis: '45%', minHeight: 52, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  judgeBtnLs: { minHeight: 46, paddingVertical: 8 },
  judgeTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  judgeSubLs: { fontSize: 10 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: RUGBY_TAG.goodBg, color: RUGBY_TAG.good },
  vtagOk: { backgroundColor: RUGBY_TAG.okBg, color: RUGBY_TAG.ok },
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
