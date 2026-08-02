import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import { RugbyPitch, RugbyBall, PitchLabel, BurstRing, RUGBY, RUGBY_TAG, RUGBY_PITCH_RATIO } from './fields/RugbyPitch';
import {
  SCENARIOS, T_RATE, R_ACTOR, bandsFor, outcomeFor, STATE_LINE,
  carrierPos, recPos, defPos, coverPos, chasePos, carriedBall, catchPoint,
  type DPScenario, type Outcome, type Depth, type XY,
} from '../../lib/drawAndPass';

// Draw and Pass — the rugby two-on-one TIMING module, and the only rugby piece where the user's
// input is a MOMENT rather than a choice. You've broken the line; the carrier runs at the last man
// and a live PASS! button is armed the whole way. Release too soon and he was never fixed (he slides
// off and eats the receiver); hold past the tackle point and he takes carrier and ball together.
// Only AFTER the attempt do the timing-window bands appear on the timeline — the same judge-blind-
// then-review feel as the shipped Onside/Off. Copy verbatim from the prototype (lib layer).
//
// Animation: ONE rafRef with a generation guard runs two modes in sequence — the live timeline
// (t 0..100, advancing T_RATE units/sec) and then the resolve film (a prebuilt keyframe script that
// is a pure function of elapsed ms). No second animation owner, ever.

const LS_TIMELINE_RESERVE = 62;  // reserved height UNDER the pitch for the timeline (stable pitch size)
const clampY = (y: number) => Math.max(24, Math.min(396, y));

interface Leg { t0: number; t1: number; from: XY; to: XY }
interface LabelEv { at: number; x: number; y: number; text: string; fill: string; size: number }
interface BurstEv { at: number; x: number; y: number; color: string }
interface Script {
  total: number; verdictAt: number;
  carrier: XY;                               // frozen at the release/contact frame
  recBase: XY; recLegs: Leg[];
  defBase: XY; defLegs: Leg[];
  covBase: XY; covLegs: Leg[];
  ballBase: XY; ball: Leg[];
  path: { at: number; x1: number; y1: number; x2: number; y2: number } | null;
  labels: LabelEv[]; bursts: BurstEv[];
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
// The oval's nose tracks the flight of the pass.
const ballOnLegs = (base: XY, legs: Leg[], e: number): { x: number; y: number; ang: number } => {
  let p = base, ang = 0;
  for (const l of legs) {
    if (e <= l.t0) return { x: p[0], y: p[1], ang };
    const k = Math.min(1, (e - l.t0) / (l.t1 - l.t0));
    p = [l.from[0] + (l.to[0] - l.from[0]) * k, l.from[1] + (l.to[1] - l.from[1]) * k];
    ang = (Math.atan2(l.to[1] - l.from[1], l.to[0] - l.from[0]) * 180) / Math.PI;
    if (e < l.t1) return { x: p[0], y: p[1], ang };
  }
  return { x: p[0], y: p[1], ang };
};

// The film that plays out AFTER the release (or after contact, when there was none). Timings and
// destinations verbatim from the prototype's pass()/lateTackle() chains.
function buildResolve(s: DPScenario, tAt: number, kind: Outcome): Script {
  const cp = carrierPos(s, tAt), rp = recPos(s, tAt), dp = defPos(s, tAt);
  const ballFrom: XY = [cp[0] + 11, cp[1] - 3];
  const sc: Script = {
    total: 0, verdictAt: 0, carrier: cp,
    recBase: rp, recLegs: [], defBase: dp, defLegs: [],
    covBase: s.cover ? coverPos(s, tAt) : [0, 0], covLegs: [],
    ballBase: ballFrom, ball: [], path: null, labels: [], bursts: [],
  };
  if (kind === 'late') {
    // never released: he gets the carrier AND the ball
    sc.defLegs.push({ t0: 0, t1: 200, from: dp, to: [cp[0] + 10, cp[1] + 12] });
    sc.bursts.push({ at: 200, x: cp[0], y: cp[1], color: RUGBY.red });
    sc.labels.push({ at: 200, x: cp[0], y: cp[1] - 30, text: 'wrapped up — ball and all', fill: '#ffb3ae', size: 11 });
    sc.verdictAt = 200;
  } else {
    const catchP = catchPoint(s, tAt);
    const flight = 340;
    // ball and receiver arrive at the catch point together
    sc.ball.push({ t0: 0, t1: flight, from: ballFrom, to: catchP });
    sc.recLegs.push({ t0: 0, t1: flight, from: rp, to: catchP });
    if (kind === 'early') {
      // he never committed — he reads the pass and hits the receiver AS it arrives
      sc.defLegs.push({ t0: flight, t1: flight + 220, from: dp, to: [catchP[0] + 10, catchP[1] + 12] });
      sc.bursts.push({ at: flight + 220, x: catchP[0], y: catchP[1], color: RUGBY.red });
      sc.labels.push({ at: flight + 220, x: catchP[0], y: catchP[1] - 30, text: 'read it — hit as it arrived', fill: '#ffb3ae', size: 11 });
      sc.verdictAt = flight + 220;
    } else {
      // THE DRAW: he committed to the carrier — wrap him just as the ball leaves
      sc.defLegs.push({ t0: 0, t1: 240, from: dp, to: [cp[0] + 10, cp[1] + 12] });
      sc.bursts.push({ at: 240, x: cp[0], y: cp[1], color: RUGBY.amber });
      sc.labels.push({ at: 240, x: cp[0], y: cp[1] - 30, text: 'drawn in', fill: '#ffe1b3', size: 10 });
      // a rusher's own speed carries him past the carrier and out of the play
      if (s.mode === 'rush') sc.defLegs.push({ t0: 300, t1: 680, from: [cp[0] + 10, cp[1] + 12], to: [cp[0] - 34, cp[1] + 16] });
      const away: XY = [Math.min(596, catchP[0] + 170), clampY(catchP[1] - 8)];
      sc.path = { at: flight, x1: catchP[0], y1: catchP[1], x2: away[0], y2: away[1] };
      sc.ball.push({ t0: flight, t1: flight + 620, from: catchP, to: away });
      sc.recLegs.push({ t0: flight, t1: flight + 620, from: catchP, to: away });
      if (s.cover) sc.covLegs.push({ t0: flight, t1: flight + 620, from: sc.covBase, to: [away[0] - 55, away[1] + 16] }); // cover chases — and stays behind
      sc.bursts.push({ at: flight + 620, x: away[0], y: away[1], color: RUGBY.teal });
      sc.labels.push({ at: flight + 620, x: away[0], y: away[1] - 28, text: 'through — in the clear', fill: '#bfe9da', size: 11 });
      sc.verdictAt = flight + 620;
    }
  }
  let end = sc.verdictAt;
  [...sc.recLegs, ...sc.defLegs, ...sc.covLegs, ...sc.ball].forEach(l => { if (l.t1 > end) end = l.t1; });
  sc.bursts.forEach(b => { if (b.at + 600 > end) end = b.at + 600; });
  sc.total = end + 300;
  return sc;
}

function Rich({ text, style, boldStyle }: { text: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

export default function DrawAndPassGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState<Level>(appLevel);
  const [phase, setPhase] = useState<'idle' | 'running' | 'resolving' | 'done'>('idle');
  const [t, setT] = useState(0);
  const [passT, setPassT] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [e, setE] = useState(0);
  const scriptRef = useRef<Script | null>(null);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const tRef = useRef(0);   // the exact live t the PASS tap is graded against (state lags a frame)

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const sc = scriptRef.current;
  const resolved = (phase === 'resolving' || phase === 'done') && sc != null;
  const showVerdict = resolved && e >= sc!.verdictAt;
  const verd = outcome ? s.verd[outcome] : null;

  // ── single rAF owner + generation guard ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);
  const resetTo = (i: number) => {
    genRef.current++; stopLoop();
    setIdx(i); setPhase('idle'); setT(0); tRef.current = 0;
    setPassT(null); setOutcome(null); setE(0); scriptRef.current = null;
  };

  // Mode 2 of the SAME loop: the resolve film.
  const runResolve = (script: Script, kind: Outcome) => {
    scriptRef.current = script; setOutcome(kind); setPhase('resolving'); setE(0);
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

  // Mode 1: the live carry. t advances until the tackle point — reach it with the ball still in hand
  // and the defender takes both, which IS the 'late' outcome (there is no "nothing happened" branch).
  const play = () => {
    if (phase !== 'idle') return;
    setPhase('running');
    const gen = ++genRef.current;
    let localT = 0, last: number | null = null;
    const loop = (now: number) => {
      if (genRef.current !== gen) return;
      if (last == null) last = now;
      const dt = (now - last) / 1000; last = now;
      localT += dt * T_RATE;
      if (localT >= s.lateT) {
        localT = s.lateT; tRef.current = localT; setT(localT); rafRef.current = null;
        runResolve(buildResolve(s, s.lateT, 'late'), 'late');
        return;
      }
      tRef.current = localT; setT(localT);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const pass = () => {
    if (phase !== 'running') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    genRef.current++; stopLoop();                     // retire the live loop before the resolve loop starts
    const at = tRef.current;
    setPassT(at); setT(at);
    const kind = outcomeFor(s, at);
    runResolve(buildResolve(s, at, kind), kind);
  };

  // ── the pitch layer ──
  // Pre-resolve everything reads the live t; once the film starts the world freezes at the release
  // frame and only the scripted actors move.
  const frameT = resolved ? (passT ?? s.lateT) : t;
  const cp = carrierPos(s, frameT);
  const rp = resolved ? posOnLegs(sc!.recBase, sc!.recLegs, e) : recPos(s, frameT);
  const dp = resolved ? posOnLegs(sc!.defBase, sc!.defLegs, e) : defPos(s, frameT);
  const vp: XY | null = s.cover ? (resolved ? posOnLegs(sc!.covBase, sc!.covLegs, e) : coverPos(s, frameT)) : null;

  const els: React.ReactNode[] = [];
  if (sc?.path && e >= sc.path.at) {
    els.push(<Line key="lane" x1={sc.path.x1} y1={sc.path.y1} x2={sc.path.x2} y2={sc.path.y2} stroke={RUGBY.chalk} strokeWidth={2.5} opacity={0.5} strokeDasharray="4 5" />);
  }
  const labels: React.ReactNode[] = [];
  // the beaten line, chasing back — the reason this is a two-on-one at all
  s.chase.forEach((_, i) => {
    const p = chasePos(s, i, frameT);
    els.push(<Circle key={`ch${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} />);
    labels.push(<PitchLabel key={`chl${i}`} x={p[0]} y={p[1] - 17} text={i === 0 ? '8' : '6'} fill={RUGBY.defLbl} size={10.5} outline={3.5} />);
  });
  if (vp) {
    els.push(<Circle key="cov" cx={vp[0]} cy={vp[1]} r={R_ACTOR} fill={RUGBY.fb} stroke={RUGBY.navy} strokeWidth={2} />);
    labels.push(<PitchLabel key="covl" x={vp[0]} y={vp[1] - 17} text="FB" fill={RUGBY.fbLbl} size={10.5} outline={3.5} />);
  }
  els.push(<Circle key="def" cx={dp[0]} cy={dp[1]} r={R_ACTOR} fill={s.dFill} stroke={RUGBY.navy} strokeWidth={2} />);
  labels.push(<PitchLabel key="defl" x={dp[0]} y={dp[1] - 17} text={s.dLab} fill={s.dTxtFill} size={10.5} outline={3.5} />);
  els.push(<Circle key="car" cx={cp[0]} cy={cp[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
  labels.push(<PitchLabel key="carl" x={cp[0]} y={cp[1] - 17} text="13" size={10.5} outline={3.5} />);
  els.push(<Circle key="rec" cx={rp[0]} cy={rp[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
  labels.push(<PitchLabel key="recl" x={rp[0]} y={rp[1] - 17} text="11" size={10.5} outline={3.5} />);
  {
    const b = resolved ? ballOnLegs(sc!.ballBase, sc!.ball, e) : (() => { const q = carriedBall(s, frameT); return { x: q[0], y: q[1], ang: 0 }; })();
    els.push(<RugbyBall key="ball" x={b.x} y={b.y} ang={b.ang} />);
  }
  sc?.bursts.forEach((b, i) => els.push(<BurstRing key={`bu${i}`} x={b.x} y={b.y} prog={(e - b.at) / 600} color={b.color} maxR={26} />));
  els.push(...labels);
  els.push(
    <PitchLabel
      key="beaten"
      x={(s.chase[0][0] + s.chase[1][0]) / 2 + 14}
      y={(s.chase[0][1] + s.chase[1][1]) / 2 + 4}
      text="beaten — chasing back" fill={RUGBY.defLbl} size={9}
    />
  );
  sc?.labels.forEach((l, i) => { if (e >= l.at) els.push(<PitchLabel key={`lb${i}`} x={l.x} y={l.y} text={l.text} fill={l.fill} size={l.size} />); });

  const pitch = <RugbyPitch fill="width">{els}</RugbyPitch>;

  // ── the timeline. The window bands are HIDDEN until the attempt is over — the whole point is that
  // you time it by watching the defender, not by reading a green stripe. ──
  const markPct = phase === 'idle' ? 0 : resolved ? (passT ?? s.lateT) : t;
  const tstate = phase === 'idle' ? 'Press play, then time the pass'
    : phase === 'running' ? 'Live — make the call'
      : outcome ? STATE_LINE[outcome] : '';
  const timeline = (
    <View style={styles.tline}>
      <View style={styles.bar}>
        {showVerdict && bandsFor(s).map((b, i) => (
          <View key={i} style={[styles.band, { left: `${b.left}%`, width: `${b.width}%`, backgroundColor: b.color }]} />
        ))}
        <View style={[styles.mk, { left: `${markPct}%` }]} />
      </View>
      <View style={styles.tinfoRow}>
        <Text style={styles.tinfo} numberOfLines={1}>{tstate}</Text>
        {showVerdict && <Text style={styles.winInfo} numberOfLines={1}>green = the fix moment</Text>}
      </View>
    </View>
  );

  // ── chrome fragments ──
  const promptText = phase === 'idle'
    ? 'Tap <b>Play</b> to start the break. The PASS button goes live while the carrier runs.'
    : showVerdict
      ? 'Check the timeline — <b>the green band is when he was fixed.</b> Reset to try again.'
      : s.runPrompt;
  const prompt = <View style={[styles.prompt, landscape && styles.promptLs]}><Rich text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} /></View>;
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((x, i) => ({ key: String(i), name: x.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Carrier (13) + support (11)', RUGBY.att], ['Defense', RUGBY.def], ['Fullback (last line)', RUGBY.fb]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  // PRE-CALL actions only: Play, then the armed PASS. Both UNMOUNT on reveal so the verdict has room.
  const actions = (
    <>
      {phase === 'idle' && (
        <TouchableOpacity style={[styles.playBtn, landscape && styles.playBtnLs]} activeOpacity={0.85} onPress={play}>
          <Text style={[styles.playTxt, landscape && styles.playTxtLs]}>▶ Play</Text>
        </TouchableOpacity>
      )}
      {phase === 'running' && (
        <TouchableOpacity style={styles.passBtn} activeOpacity={0.8} onPress={pass}>
          <Text style={styles.passTxt}>PASS!</Text>
        </TouchableOpacity>
      )}
    </>
  );
  const verdictCard = showVerdict && verd ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, outcome === 'good' ? styles.vtagGood : styles.vtagBad]}>
        {outcome === 'good' ? 'Perfect timing' : 'Not this time'}
      </Text>
      <Text style={styles.vtitle}>{verd.t}</Text>
      <Text style={styles.vbody}>{verd.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vread}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtn = (
    <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => resetTo(idx)}>
      <Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text>
    </TouchableOpacity>
  );
  const lsFooter = showVerdict ? (
    <View style={styles.lsPostRow}>
      {resetBtn}
      <NextButton visible variant="filled" style={styles.lsNextFill} label="Next break →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />
    </View>
  ) : undefined;

  // ── LANDSCAPE: pitch left with the timeline in the reserved strip under it (a wide control belongs
  // under the field, not in the narrow column); prompt + the live PASS button + verdict on the right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={RUGBY_PITCH_RATIO}
        belowFieldReserve={LS_TIMELINE_RESERVE}
        pills={pills}
        field={pitch}
        belowField={timeline}
        controls={showVerdict
          ? <>{verdictCard}{legend}</>
          : <>{prompt}{actions}{legend}</>}
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
      {timeline}
      {prompt}
      {actions}
      {verdictCard}
      <View style={styles.controlsRow}>
        {resetBtn}
        {showVerdict && <NextButton visible variant="filled" label="Next break →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Timeline.
  tline: { marginTop: 8 },
  bar: { position: 'relative', height: 12, borderRadius: 6, backgroundColor: t.border, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0 },
  mk: { position: 'absolute', top: -3, width: 3, height: 18, borderRadius: 2, backgroundColor: t.textPrimary },
  tinfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  tinfo: { color: t.textSecondaryOnDark, fontSize: 11.5, fontWeight: '600', flexShrink: 1 },
  winInfo: { color: RUGBY.amber, fontSize: 11.5, fontWeight: '700' },
  // Chrome.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: t.accentText, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  // Play is the ONLY pressable control pre-run, so it carries the accent; PASS! (below) takes it
  // over once the play is live. The eye should land on the button you can actually press.
  playBtn: { marginTop: 10, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: t.accent, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  playBtnLs: { minHeight: 44, paddingVertical: 10, marginTop: 6 },
  playTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  // The live control — deliberately the biggest target on screen; it is tapped under time pressure.
  playTxtLs: { fontSize: 14 },
  passBtn: { marginTop: 10, minHeight: 60, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  passTxt: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: RUGBY_TAG.goodBg, color: RUGBY_TAG.good },
  vtagBad: { backgroundColor: RUGBY_TAG.badBg, color: RUGBY_TAG.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  readLbl: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 2 },
  vread: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
});
