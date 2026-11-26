import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, AccessibilityInfo } from 'react-native';
import { Line, Circle, Ellipse, Path, Polygon, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, LandscapeGameShell, DifficultyTabs, NextButton, FOOTBALL_FIELD_RATIO, FIELD, FE } from '../FieldEngine';
import {
  OPTIONS, QB, QB_MESH, RB0, RB_MESH, RB_BLOCK, MESH_FRAC, OLINE, DLINE, SLOT,
  MIKE, WILL, FREE_SAFETY, LEFT_CORNER, RIGHT_CORNER, NICKEL, SAM, WHY, SITUATION, correctOption,
  type PafOption, type Depth, type Pt, type Mover,
} from '../../lib/playActionFreeze';

// Play-Action Freeze: a tap-the-read module (exactly one correct option). Snap, watch the run fake:
// the back and the quarterback mesh, the two inside linebackers step forward. The play freezes as the
// quarterback turns back, and the fan taps the receiver he would throw to. A right pick lands in the
// window behind the linebackers as the free safety arrives a beat late; a wrong pick is broken up by
// the named punisher (the Will on the shallow cross, the right corner on the go route) and the
// correct window flashes. Verdict + four-level COACH'S READ come from the data lib.
//
// Same grammar and pace as Find the Open Man and Give or Pull: one rAF owner with a generation guard
// (reset / pick / unmount kill the running loop), taps ignored until the freeze, whole-disc hit
// targets. Constant-pace rule: the ball travels at one on-screen speed, so a deeper throw takes
// longer (duration scales to distance, never the reverse).
const F_BOLD = 'SpaceGrotesk_700Bold';
const GREEN = '#16a37f', RED = '#e24b4a', TEAL = '#14B8A6', AMBER = '#F5A623', BALL_BROWN = '#7a4a1e';
// Linebacker step arrows: a light yellow that clears 3:1 against both turf stripes.
const STEP = '#ffe08a';
const DEV_MS = 2200;                 // snap to the freeze (the fake needs runway to read)
const BALL_PX_PER_MS = 0.32;         // constant ball pace (Find the Open Man's typical throw speed)
const BURST_MS = 650, DROP_MS = 400;
const HIT_R = 36;                    // viewBox hit radius, about 44pt on screen at football scale
const LS_LEGEND_RESERVE = 42;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const L = (a: Pt, b: Pt, f: number): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
const bez = (a: Pt, c: Pt, b: Pt, f: number): Pt => {
  const m = 1 - f;
  return { x: m * m * a.x + 2 * m * f * c.x + f * f * b.x, y: m * m * a.y + 2 * m * f * c.y + f * f * b.y };
};
const ease = (f: number) => f * f * (3 - 2 * f);
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

type Phase = 'preSnap' | 'fake' | 'freeze' | 'throw' | 'done';
type DefKey = 'mike' | 'will' | 'fs' | 'lcb' | 'rcb' | 'nickel' | 'sam';
const DEFS: Record<DefKey, { m: Mover; label: string }> = {
  mike: { m: MIKE, label: 'Mike' },
  will: { m: WILL, label: 'Will' },
  fs: { m: FREE_SAFETY, label: 'FS' },
  lcb: { m: LEFT_CORNER, label: 'CB' },
  rcb: { m: RIGHT_CORNER, label: 'CB' },
  nickel: { m: NICKEL, label: 'NB' },
  sam: { m: SAM, label: 'LB' },
};
const DEF_KEYS = Object.keys(DEFS) as DefKey[];
const PUNISHER_KEY: Record<'will' | 'rightCorner', DefKey> = { will: 'will', rightCorner: 'rcb' };

interface Frame {
  qb: Pt; rb: Pt; slot: Pt;
  rec: Record<string, Pt>;
  def: Record<DefKey, Pt>;
  ball: Pt; ballAng: number; ballOp: number;
  fx: { pos: Pt; kind: 'good' | 'bad'; prog: number } | null;
  ghost: { pos: Pt; prog: number } | null;       // the correct window flashing on a wrong pick
}
const recAt = (f: (o: PafOption) => Pt) => Object.fromEntries(OPTIONS.map(o => [o.id, f(o)])) as Record<string, Pt>;
const defAt = (f: (m: Mover) => Pt) => Object.fromEntries(DEF_KEYS.map(k => [k, f(DEFS[k].m)])) as Record<DefKey, Pt>;
const ballAtQb = (q: Pt): Pt => ({ x: q.x + 9, y: q.y - 3 });
const startFrame = (): Frame => ({
  qb: QB.start, rb: RB0, slot: SLOT.start,
  rec: recAt(o => o.receiver.start), def: defAt(m => m.start),
  ball: ballAtQb(QB.start), ballAng: 0, ballOp: 1, fx: null, ghost: null,
});
const freezeFrame = (): Frame => ({
  qb: QB.freeze, rb: RB_BLOCK, slot: SLOT.freeze,
  rec: recAt(o => o.receiver.freeze), def: defAt(m => m.freeze),
  ball: ballAtQb(QB.freeze), ballAng: 0, ballOp: 1, fx: null, ghost: null,
});

// Outlined field label (react-native-svg has no paint-order, so outline pass then fill pass).
function fieldLabel(key: string, x: number, y: number, text: string, fill: string, size = 10.5): ReactNode {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <G key={key}>
      <SvgText {...common} fill="none" stroke={FE.labelOutline} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </G>
  );
}
function arrow(key: string, a: Pt, b: Pt, color: string, width = 3): ReactNode {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), h = 8;
  return (
    <G key={key}>
      <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <Polygon points={`${b.x},${b.y} ${b.x - h * Math.cos(ang - 0.5)},${b.y - h * Math.sin(ang - 0.5)} ${b.x - h * Math.cos(ang + 0.5)},${b.y - h * Math.sin(ang + 0.5)}`} fill={color} />
    </G>
  );
}
function lacedBall(key: string, x: number, y: number, ang: number, op: number): ReactNode {
  return (
    <G key={key} x={x} y={y} rotation={ang} opacity={op}>
      <Ellipse cx={0} cy={0} rx={8} ry={5} fill={BALL_BROWN} stroke="#5a3512" strokeWidth={1} />
      <Line x1={-5} y1={0} x2={5} y2={0} stroke="#f3ead8" strokeWidth={1.4} strokeLinecap="round" />
      {[-2, 0, 2].map(dx => <Line key={`lc${dx}`} x1={dx} y1={-2.2} x2={dx} y2={2.2} stroke="#f3ead8" strokeWidth={1.2} />)}
    </G>
  );
}

export default function PlayActionFreezeGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [phase, setPhase] = useState<Phase>('preSnap');
  const [chosen, setChosen] = useState<PafOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [frame, setFrame] = useState<Frame>(startFrame);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const depth: Depth = level === 'kid' ? 'rookie' : level;   // app Level to data-lib Depth
  const answered = phase === 'done';
  const right = correctOption();
  const showWindow = depth === 'intermediate' || depth === 'expert';

  // Reduced motion: skip the ball arc and show the end state with the verdict.
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (live) setReduceMotion(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduceMotion(v));
    return () => { live = false; sub.remove(); };
  }, []);

  // ── one rAF owner: the generation guard kills any in-flight loop on every state change ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);

  const reset = () => {
    genRef.current++;
    stopLoop();
    setPhase('preSnap'); setChosen(null); setFrame(startFrame());
  };

  // ── the fake: back and QB mesh, the linebackers step up, routes release; freeze as the QB turns back ──
  const snap = () => {
    if (phase !== 'preSnap') return;
    Haptics.selectionAsync();
    stopLoop();
    const gen = ++genRef.current;
    setPhase('fake');
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const p = clamp01((now - t0) / DEV_MS);
      const pm = clamp01(p / MESH_FRAC);                       // 0..1 up to the mesh
      const pa = clamp01((p - MESH_FRAC) / (1 - MESH_FRAC));   // 0..1 after the mesh
      // linebackers read the run: they step forward through the mesh, then hold their spot
      const lbF = ease(clamp01(p / (MESH_FRAC + 0.2)));
      const qb = p < MESH_FRAC ? L(QB.start, QB_MESH, ease(pm)) : L(QB_MESH, QB.freeze, ease(pa));
      const rb = p < MESH_FRAC ? L(RB0, RB_MESH, ease(pm)) : L(RB_MESH, RB_BLOCK, ease(pa));
      const def = defAt(m => L(m.start, m.freeze, ease(p)));
      def.mike = L(MIKE.start, MIKE.freeze, lbF);
      def.will = L(WILL.start, WILL.freeze, lbF);
      setFrame({
        qb, rb, slot: L(SLOT.start, SLOT.freeze, ease(p)),
        rec: recAt(o => L(o.receiver.start, o.receiver.freeze, p)),
        def,
        ball: ballAtQb(qb), ballAng: 0, ballOp: 1, fx: null, ghost: null,
      });
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; setFrame(freezeFrame()); setPhase('freeze'); }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the throw: ball at constant pace to the pick; defenders finish; punisher arrives on a wrong pick ──
  const pick = (o: PafOption) => {
    if (phase !== 'freeze') return;                  // taps ignored until the freeze
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    const gen = ++genRef.current;
    setChosen(o); setPhase('throw');
    const from = ballAtQb(QB.freeze);
    const target = o.receiver.catch;
    const throwMs = dist(from, target) / BALL_PX_PER_MS;
    const ctrl: Pt = { x: (from.x + target.x) / 2, y: (from.y + target.y) / 2 - 30 - dist(from, target) * 0.12 };
    const punKey = o.punisher ? PUNISHER_KEY[o.punisher] : null;
    const defEnd = defAt(m => m.end);
    if (punKey && o.punisherEnd) defEnd[punKey] = o.punisherEnd;
    const endFrame = (fe: number): Frame => {
      const bp = clamp01(fe / BURST_MS);
      const dropped = !o.correct;
      const d = clamp01(fe / DROP_MS);
      return {
        qb: QB.end, rb: RB_BLOCK, slot: SLOT.end,
        rec: recAt(r => (r.id === o.id ? r.receiver.catch : L(r.receiver.freeze, r.receiver.catch, 0.6))),
        def: defEnd,
        ball: dropped ? { x: target.x + 16 * d, y: target.y + 30 * d + 8 * Math.sin(d * Math.PI) } : target,
        ballAng: dropped ? d * 220 : 0, ballOp: dropped ? 1 - 0.55 * d : 1,
        fx: { pos: target, kind: o.correct ? 'good' : 'bad', prog: bp },
        ghost: o.correct ? null : { pos: right.receiver.catch, prog: bp },
      };
    };
    if (reduceMotion) {                               // no arc: straight to the end state + verdict
      setFrame({ ...endFrame(BURST_MS), fx: null, ghost: o.correct ? null : { pos: right.receiver.catch, prog: 0 } });
      setPhase('done');
      return;
    }
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const e = now - t0;
      if (e >= throwMs) {
        if (!revealed) { revealed = true; setPhase('done'); }
        const fe = e - throwMs;
        setFrame(endFrame(fe));   // the static dashed ghost ring stays on the window after its pulse
        if (fe < Math.max(BURST_MS, DROP_MS)) rafRef.current = requestAnimationFrame(loop);
        else rafRef.current = null;
        return;
      }
      const k = e / throwMs;
      const ball = bez(from, ctrl, target, k);
      const ahead = bez(from, ctrl, target, Math.min(k + 0.02, 1));
      setFrame({
        qb: QB.end, rb: RB_BLOCK, slot: L(SLOT.freeze, SLOT.end, k),
        rec: recAt(r => (r.id === o.id ? L(r.receiver.freeze, r.receiver.catch, ease(k)) : L(r.receiver.freeze, r.receiver.catch, 0.6 * k))),
        // the free safety is a beat late by design: he finishes his drive just after the catch
        def: Object.fromEntries(DEF_KEYS.map(key => [
          key, L(DEFS[key].m.freeze, defEnd[key], ease(key === 'fs' ? k * 0.85 : k)),
        ])) as Record<DefKey, Pt>,
        ball, ballAng: Math.atan2(ahead.y - ball.y, ahead.x - ball.x) * 180 / Math.PI, ballOp: 1,
        fx: null, ghost: null,
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the on-field overlay (players=[] on the field itself; the module draws every pixel) ──
  const dyn: ReactNode[] = [];
  dyn.push(<Line key="los" x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />);
  dyn.push(<SvgText key="losL" x={FIELD.los + 5} y={22} fontSize={10.5} fontFamily={F_BOLD} fill={FE.losLabel}>Line of scrimmage</SvgText>);

  // routes appear on the snap (chalk, the three options only)
  if (phase !== 'preSnap') {
    OPTIONS.forEach(o => {
      const r = o.receiver;
      dyn.push(<Path key={`rt${o.id}`} d={`M${r.start.x} ${r.start.y} L${r.freeze.x} ${r.freeze.y} L${r.catch.x} ${r.catch.y}`} fill="none" stroke={FE.chalk} strokeWidth={2.5} strokeDasharray="6 6" opacity={chosen && chosen.id !== o.id ? 0.18 : 0.42} strokeLinecap="round" />);
    });
  }
  // THE TEACHING VISUAL: the linebackers' forward step, drawn from where they started
  if (phase !== 'preSnap') {
    dyn.push(<Circle key="mike0" cx={MIKE.start.x} cy={MIKE.start.y} r={9} fill="none" stroke={STEP} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.8} />);
    dyn.push(<Circle key="will0" cx={WILL.start.x} cy={WILL.start.y} r={9} fill="none" stroke={STEP} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.8} />);
    if (phase !== 'fake') {
      dyn.push(arrow('mikeA', { x: MIKE.start.x - 10, y: MIKE.start.y }, { x: MIKE.freeze.x + 14, y: MIKE.freeze.y - 1 }, STEP));
      dyn.push(arrow('willA', { x: WILL.start.x - 10, y: WILL.start.y }, { x: WILL.freeze.x + 14, y: WILL.freeze.y }, STEP));
      if (depth === 'rookie' || depth === 'beginner') {
        dyn.push(fieldLabel('stepL', 300, 246, 'fake pulls them forward', '#fff0c2', 10));
      }
    }
  }
  // Intermediate and up, on the reveal: the window behind them and the safety driving down on it
  if (answered && showWindow) {
    dyn.push(<Circle key="win" cx={right.receiver.catch.x} cy={right.receiver.catch.y} r={30} fill={TEAL} fillOpacity={0.12} stroke={TEAL} strokeWidth={2} strokeDasharray="6 5" />);
    dyn.push(fieldLabel('winL', right.receiver.catch.x, right.receiver.catch.y - 36, 'window closing', '#bfe9da', 10));
    dyn.push(arrow('fsA', FREE_SAFETY.start, { x: FREE_SAFETY.end.x + 12, y: FREE_SAFETY.end.y + 2 }, '#9fd0ff', 2.5));
  }

  // lines: small dots, identified via the legend
  OLINE.forEach((p, i) => dyn.push(<Circle key={`ol${i}`} cx={p.x} cy={p.y} r={7} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />));
  DLINE.forEach((p, i) => dyn.push(<Circle key={`dl${i}`} cx={p.x} cy={p.y} r={7} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />));
  // defenders
  DEF_KEYS.forEach(k => {
    const p = frame.def[k];
    const isPun = answered && chosen?.punisher != null && PUNISHER_KEY[chosen.punisher] === k;
    const isLb = k === 'mike' || k === 'will';
    dyn.push(<Circle key={`d${k}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={isPun ? RED : FE.navy} strokeWidth={isPun ? 3.5 : 1.5} />);
    dyn.push(fieldLabel(`dl${k}`, p.x, p.y + 21, DEFS[k].label, isPun ? '#ffb3ae' : isLb && phase !== 'preSnap' ? '#fff0c2' : FE.defLabel, 10.5));
  });
  // offense: slot (not an option), the back, the QB, the three options
  dyn.push(<Circle key="slot" cx={frame.slot.x} cy={frame.slot.y} r={8} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} opacity={0.75} />);
  dyn.push(<Circle key="rb" cx={frame.rb.x} cy={frame.rb.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
  dyn.push(fieldLabel('rbl', frame.rb.x - 2, frame.rb.y + 22, 'RB', FE.offLabel));
  dyn.push(<Circle key="qb" cx={frame.qb.x} cy={frame.qb.y} r={10} fill={FE.orange} stroke="#fff" strokeWidth={2.5} />);
  dyn.push(fieldLabel('qbl', frame.qb.x - 6, frame.qb.y - 15, 'QB', FE.offLabel));
  if (phase === 'fake') dyn.push(fieldLabel('fakeL', 186, 236, 'run fake', '#ffe1b3', 10));
  OPTIONS.forEach(o => {
    const p = frame.rec[o.id];
    let stroke: string = FE.navy, sw = 1.5, fill: string = FE.orange;
    if (chosen?.id === o.id && (phase === 'throw' || phase === 'done')) { stroke = o.correct ? GREEN : RED; sw = 3.5; if (o.correct) fill = GREEN; }
    dyn.push(<Circle key={`rc${o.id}`} cx={p.x} cy={p.y} r={11} fill={fill} stroke={stroke} strokeWidth={sw} />);
    const ly = o.id === 'go' ? p.y - 16 : p.y - 17;
    dyn.push(fieldLabel(`rl${o.id}`, p.x, ly, o.id === 'shallow' ? 'TE' : o.fieldLabel, FE.offLabel, 11));
  });
  // wrong pick: the correct window flashes (tap-the-read addendum)
  if (frame.ghost) {
    const { pos, prog } = frame.ghost;
    dyn.push(<Circle key="ghost" cx={pos.x} cy={pos.y} r={14} fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray="3 4" opacity={0.95} />);
    if (prog > 0 && prog < 1) dyn.push(<Circle key="gp" cx={pos.x} cy={pos.y} r={8 + 24 * prog} fill="none" stroke={TEAL} strokeWidth={2.5} opacity={0.9 * (1 - prog)} />);
    dyn.push(fieldLabel('ghostL', pos.x + 2, pos.y + 30, 'open here', '#bfe9da', 10));
  }
  dyn.push(lacedBall('ball', frame.ball.x, frame.ball.y, frame.ballAng, frame.ballOp));
  if (frame.fx) {
    const { pos, kind, prog } = frame.fx;
    if (kind === 'good') {
      dyn.push(<Circle key="fx1" cx={pos.x} cy={pos.y} r={14 + 30 * prog} fill="none" stroke={GREEN} strokeWidth={4} opacity={0.95 * (1 - prog)} />);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, d = 12 + 24 * prog;
        dyn.push(<Circle key={`sp${i}`} cx={pos.x + Math.cos(a) * d} cy={pos.y + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={Math.max(0, 1 - prog * 1.15)} />);
      }
    } else {
      dyn.push(<Circle key="fxb" cx={pos.x} cy={pos.y} r={12 + 16 * prog} fill="none" stroke={RED} strokeWidth={4} opacity={0.9 * (1 - prog)} />);
    }
  }
  if (answered && chosen) {
    const c = chosen.receiver.catch;
    const lx = Math.min(c.x, 600);
    dyn.push(fieldLabel('ledL', lx, c.y + (chosen.id === 'go' ? -34 : 30), chosen.led, chosen.correct ? '#7be0bf' : '#ffb3ae', 11));
  }
  // tap targets at the freeze: transparent whole-disc hit + a pulsing-style amber ring
  if (phase === 'freeze') {
    OPTIONS.forEach(o => {
      const p = frame.rec[o.id];
      dyn.push(<Circle key={`hit${o.id}`} cx={p.x} cy={p.y} r={HIT_R} fill="transparent" onPress={() => pick(o)} />);
      dyn.push(<Circle key={`aff${o.id}`} cx={p.x} cy={p.y} r={19} fill="none" stroke={AMBER} strokeWidth={2.5} opacity={0.9} onPress={() => pick(o)} />);
    });
  }
  const field = (
    <View style={styles.stageWrap}>
      <FootballField players={[]} overlay={dyn} showLos={false} />
      {phase === 'freeze' && (
        <TouchableOpacity style={styles.replay} activeOpacity={0.8} hitSlop={10} onPress={reset} accessibilityRole="button" accessibilityLabel="Replay the snap">
          <Text style={styles.replayTxt}>↺ Replay snap</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── control fragments ──
  const promptNode = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <Text style={[styles.promptTxt, landscape && styles.promptTxtLs]}>
        {phase === 'preSnap'
          ? <>{SITUATION} <Text style={styles.promptB}>Snap it and watch the linebackers on the run fake.</Text></>
          : phase === 'fake'
            ? <>The run fake. <Text style={styles.promptB}>Watch the two inside linebackers.</Text></>
            : phase === 'freeze'
              ? <>The quarterback turns back. <Text style={styles.promptB}>Where does the fake leave space?</Text></>
              : <>The ball is out…</>}
      </Text>
      {phase === 'freeze' && (
        <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>Tap a receiver on the field, or pick below.</Text>
      )}
    </View>
  );
  const snapBtn = phase === 'preSnap' ? (
    <TouchableOpacity style={[styles.callBtn, landscape && styles.callBtnLs]} activeOpacity={0.85} onPress={snap} accessibilityRole="button" accessibilityLabel="Snap the ball">
      <Text style={[styles.callTitle, landscape && styles.callTitleLs]}>Snap the ball</Text>
    </TouchableOpacity>
  ) : null;
  // Peer CHOICE buttons share ONE style; a colour difference would leak the answer.
  const choiceButtons = phase === 'freeze' ? (
    <View style={landscape ? styles.callCol : styles.callColP}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.id} style={[styles.callBtn, landscape && styles.callBtnLs]} activeOpacity={0.85} onPress={() => pick(o)} accessibilityRole="button" accessibilityLabel={o.a11y}>
          <Text style={[styles.callTitle, landscape && styles.callTitleLs]}>{o.buttonTitle}</Text>
          <Text style={[styles.callSub, landscape && styles.callSubLs]}>{o.buttonSub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  ) : null;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Offense', FE.orange], ['Defense', FE.blue], ['Ball', BALL_BROWN]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={styles.legendArrow} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{"linebackers' step on the fake"}</Text></View>
    </View>
  );
  const verdictBody = chosen
    ? chosen.correct ? chosen.verdict.body : `${chosen.verdict.body} The open window was the dig, behind the linebackers.`
    : '';
  const verdictCard = answered && chosen ? (
    <View style={[styles.verdict, landscape && styles.verdictCompact]} accessible accessibilityLiveRegion="polite">
      <View style={styles.tagRow}>
        <Text style={[styles.tag, chosen.correct ? styles.tagGood : styles.tagBad]}>{chosen.correct ? 'Right read' : 'Rethink it'}</Text>
        <Text style={[styles.tag, styles.tagMode]}>{chosen.correct ? 'Complete' : 'Broken up'}</Text>
      </View>
      <Text style={styles.vtitle}>{chosen.verdict.title}</Text>
      <Text style={styles.vbody}>{verdictBody}</Text>
      <Text style={styles.readLbl}>{"COACH'S READ"}</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{WHY[depth]}</Text>
    </View>
  ) : null;

  // Announce the verdict for screen readers once it lands.
  useEffect(() => {
    if (answered && chosen) AccessibilityInfo.announceForAccessibility(`${chosen.verdict.title}. ${verdictBody}`);
  }, [answered]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={reset}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Replay</Text></TouchableOpacity>;
  const lsFooter = (
    <View style={styles.lsPostRow}>
      {resetBtnC}
      {answered
        ? <NextButton visible variant="filled" style={styles.lsNextFill} label="Try another level →" onPress={() => { const order: Level[] = ['kid', 'beginner', 'intermediate', 'expert']; setLevel(order[(order.indexOf(level) + 1) % 4]); reset(); }} />
        : <Text style={[styles.hintTxt, landscape && styles.hintTxtLs, { flex: 1 }]} numberOfLines={2}>One fake. Three receivers. One right read.</Text>}
    </View>
  );
  const foot = (
    <Text style={styles.foot}>Play-action fools the players who watch the backfield. <Text style={styles.footB}>Throw it behind the linebackers</Text>, before the safety gets there.</Text>
  );

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={<Text style={styles.situation} numberOfLines={1}>{SITUATION}</Text>}
        field={field}
        belowField={<View style={styles.lsLegendUnder}>{legend}</View>}
        controls={answered ? <>{verdictCard}</> : <>{promptNode}{snapBtn}{choiceButtons}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {field}
      {legend}
      {answered ? verdictCard : promptNode}
      {snapBtn}
      {choiceButtons}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={reset}><Text style={styles.ghostTxt}>↺ Replay</Text></TouchableOpacity>
        {answered && <NextButton visible variant="filled" label="Try another level →" onPress={() => { const order: Level[] = ['kid', 'beginner', 'intermediate', 'expert']; setLevel(order[(order.indexOf(level) + 1) % 4]); reset(); }} />}
      </View>
      {foot}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  stageWrap: { position: 'relative' },
  situation: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '700' },
  replay: { position: 'absolute', top: 10, left: 10, borderWidth: 1.5, borderColor: 'rgba(244,244,238,.75)', backgroundColor: 'rgba(13,27,62,.6)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  replayTxt: { color: '#F4F4EE', fontSize: 11.5, fontWeight: '700' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptB: { color: t.accentText, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  callColP: { gap: 8 },
  callCol: { gap: 8, flexWrap: 'nowrap' },
  callBtn: { minHeight: 48, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  callBtnLs: { alignSelf: 'stretch', minHeight: 44, paddingVertical: 8 },
  callTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800', textAlign: 'center' },
  callTitleLs: { fontSize: 12.5 },
  callSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  callSubLs: { fontSize: 9.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendArrow: { width: 14, height: 3, borderRadius: 2, backgroundColor: STEP },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  lsLegendUnder: { minHeight: LS_LEGEND_RESERVE, paddingTop: 4, justifyContent: 'center' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border },
  verdictCompact: { padding: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagGood: { backgroundColor: FE.goodBg, color: FE.good },
  tagBad: { backgroundColor: FE.badBg, color: FE.bad },
  tagMode: { backgroundColor: FE.modeBg, color: FE.mode },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  footB: { fontWeight: '800' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
