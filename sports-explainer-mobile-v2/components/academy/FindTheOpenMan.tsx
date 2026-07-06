import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Ellipse, Line, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, LandscapeGameShell, ScenarioPills, VerdictCard, NextButton, FOOTBALL_FIELD_RATIO, FIELD, FE } from '../FieldEngine';
import { PLAYS, openReceiver, routeName, type Play, type Receiver, type Depth, type Pt } from '../../lib/findTheOpenMan';

// Find the Open Man — read-the-coverage tap-a-receiver module. Snap → the play develops → freeze at the
// throw → tap the open man (or call it PRE-snap for a challenge). Payoff is ON-FIELD: the ball arcs to
// your pick and the catch window closes as it arrives — completion in the gap (open) or shut (covered).
// The verdict + functional difficulty tiers live in the right-column VerdictCard; the tier gates the
// leverage arrow (Intermediate+). Reads are the data lib's (verbatim). Field = reused FootballField.
const F_BOLD = 'SpaceGrotesk_700Bold';
const GREEN = '#16a37f', RED = '#e24b4a', TEAL = '#14B8A6', AMBER = '#F5A623', BALL_BROWN = '#7a4a1e';
const RUN_MS = 2000, THROW_MS = 650, BURST_MS = 600, DROP_MS = 380;
const HIT_R = 36;                                                    // viewBox hit radius → ~44px on-screen at football scale
const HINT_PRE = '⚡ Want a challenge? Tap a receiver before the snap — or just snap to watch it develop.';
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const bez = (a: Pt, c: Pt, b: Pt, t: number): Pt => {
  const mt = 1 - t;
  return { x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y };
};

type Phase = 'preSnap' | 'running' | 'throwMoment' | 'resolving' | 'answered';
type Mode = 'read-before' | 'read-after';
interface Frame {
  recPos: Record<string, Pt>;
  defPos: Pt[];
  qbPos: Pt;
  ball: Pt | null; ballAngle: number; ballOpacity: number;
  win: { pos: Pt; r: number; color: string } | null;              // contracting catch-window ring at the chosen target
  ghost: Pt | null;                                                // teal dashed ring at the ACTUAL open window (wrong pick)
  ghostPulse: { pos: Pt; r: number; opacity: number } | null;     // expanding flash there
  fx: { kind: 'catch' | 'incomplete'; pos: Pt; prog: number } | null; // resolution effect at the catch point
}
const buildRecPos = (p: Play, at: (r: Receiver) => Pt): Record<string, Pt> => {
  const m: Record<string, Pt> = {};
  p.receivers.forEach(r => { m[r.id] = at(r); });
  return m;
};
const initialFrame = (p: Play): Frame => ({
  recPos: buildRecPos(p, r => r.start), defPos: p.defenders.map(d => ({ x: d.x, y: d.y })), qbPos: { x: p.qb.x, y: p.qb.y },
  ball: null, ballAngle: 0, ballOpacity: 1, win: null, ghost: null, ghostPulse: null, fx: null,
});

export default function FindTheOpenMan(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('preSnap');
  const [level, setLevel] = useState<Level>(appLevel);            // verdict-depth tabs (VerdictCard); 'kid' shows as Rookie
  const [preSnapPick, setPreSnapPick] = useState<Receiver | null>(null);
  const [chosen, setChosen] = useState<Receiver | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [hint, setHint] = useState<string>(HINT_PRE);
  const [frame, setFrame] = useState<Frame>(() => initialFrame(PLAYS[0]));
  const rafRef = useRef<number | null>(null);

  const play = PLAYS[idx];
  const open = openReceiver(play)!;
  const depth: Depth = level === 'kid' ? 'rookie' : level;         // map app Level → data-lib Depth
  const answered = phase === 'answered';
  const showArrow = answered && (level === 'intermediate' || level === 'expert'); // tier-gated leverage arrow

  // ── one rAF owner — stopLoop cancels it (on tap, on reset, on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => {
    stopLoop();
    setIdx(i); setPhase('preSnap'); setPreSnapPick(null); setChosen(null); setMode(null);
    setFrame(initialFrame(PLAYS[i])); setHint(HINT_PRE);
  };
  const resetPlay = () => resetTo(idx);
  const selectPlay = (i: number) => resetTo(i);
  const nextPlay = () => resetTo((idx + 1) % PLAYS.length);

  // ── snap → the play develops (receivers/defenders/QB interpolate start→win over RUN_MS) ──
  const snap = () => {
    if (phase !== 'preSnap') return;
    setPhase('running');
    setHint(preSnapPick ? 'Your call is in the air…' : 'Watch it develop…');
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const p = clamp01((now - t0) / RUN_MS);
      const recPos = buildRecPos(play, r => lerpPt(r.start, r.win, p));
      const defPos = play.defenders.map(d => lerpPt({ x: d.x, y: d.y }, d.to, p));
      const qbPos = play.qb.drop ? lerpPt({ x: play.qb.x, y: play.qb.y }, play.qb.drop, p) : { x: play.qb.x, y: play.qb.y };
      setFrame({ recPos, defPos, qbPos, ball: null, ballAngle: 0, ballOpacity: 1, win: null, ghost: null, ghostPulse: null, fx: null });
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
      else {
        rafRef.current = null;
        if (preSnapPick) resolve(preSnapPick, 'read-before');       // challenge: throw straight to the pre-snap call
        else { setPhase('throwMoment'); setHint('Now tap the open man.'); } // normal: freeze for the tap
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the two on-field tap phases, routed by phase ──
  const onReceiverTap = (r: Receiver) => {
    if (phase === 'preSnap') {                                       // ARM the challenge
      setPreSnapPick(r);
      setHint(`⚡ Challenge: you called ${routeName(r.label)} — snap to see if you're right.`);
    } else if (phase === 'throwMoment') {                            // THROW (read-after)
      resolve(r, 'read-after');
    }
  };

  // ── resolve: ball arcs to the window, the window ring contracts as it arrives, burst + verdict on landing ──
  const resolve = (r: Receiver, m: Mode) => {
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const correct = r.open;
    setChosen(r); setMode(m); setPhase('resolving');
    setHint(correct ? 'Caught — completion' : 'Into coverage — incomplete');
    const q = play.qb.drop ?? { x: play.qb.x, y: play.qb.y };
    const ctrl = { x: (q.x + r.win.x) / 2, y: (q.y + r.win.y) / 2 - 46 }; // bezier arc height
    const winColor = correct ? TEAL : RED;
    // the play is frozen at the throw (receivers at windows, defenders committed, QB at drop) — deterministic
    const base: Frame = {
      recPos: buildRecPos(play, x => x.win), defPos: play.defenders.map(d => d.to), qbPos: q,
      ball: null, ballAngle: 0, ballOpacity: 1, win: null, ghost: null, ghostPulse: null, fx: null,
    };
    let revealed = false;
    const total = THROW_MS + BURST_MS;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const e = now - t0;
      const tt = clamp01(e / THROW_MS);
      // ball: bezier arc in flight; then held at the window (catch) OR arriving-and-falling to the turf (incompletion).
      let ball: Pt, ballAngle = 0, ballOpacity = 1;
      if (e < THROW_MS) {
        ball = bez(q, ctrl, r.win, tt);
        const ahead = bez(q, ctrl, r.win, Math.min(tt + 0.02, 1));
        ballAngle = Math.atan2(ahead.y - ball.y, ahead.x - ball.x) * 180 / Math.PI;
      } else if (correct) {
        ball = r.win;                                                // caught, held at the window
      } else {                                                       // incomplete: hits the turf — down + settle, tumbling and fading
        const dt = clamp01((e - THROW_MS) / DROP_MS);
        ball = { x: r.win.x + 20 * dt, y: r.win.y + 34 * dt + 8 * Math.sin(dt * Math.PI) };
        ballAngle = dt * 220; ballOpacity = 1 - 0.6 * dt;
      }
      // window ring contracts as the ball arrives: correct = still cracking open (a gap) at landing; wrong = shut tight
      const win = { pos: r.win, r: correct ? 22 - 13 * tt : 16 - 12 * tt, color: winColor };
      let fx: Frame['fx'] = null, ghost: Frame['ghost'] = null, ghostPulse: Frame['ghostPulse'] = null;
      if (e >= THROW_MS) {
        if (!revealed) { revealed = true; setPhase('answered'); }   // verdict reveals when the ball lands
        const bp = clamp01((e - THROW_MS) / BURST_MS);
        fx = { kind: correct ? 'catch' : 'incomplete', pos: r.win, prog: bp };
        if (!correct) {                                              // flash WHERE it was open (all tiers — core feedback)
          ghost = open.win;
          ghostPulse = { pos: open.win, r: 6 + 22 * bp, opacity: 0.9 * (1 - bp) };
        }
      }
      setFrame({ ...base, ball, ballAngle, ballOpacity, win, ghost, ghostPulse, fx });
      if (e < total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the on-field overlay (FootballField overlay slot; players=[]) — rebuilt from `frame` each render ──
  const dyn: ReactNode[] = [];
  // Line of scrimmage — drawn HERE (first → bottom of the overlay) because FootballField's own LOS is
  // suppressed (showLos={false}); this keeps it UNDER the receiver dots/labels instead of slicing them.
  dyn.push(<Line key="los" x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />);
  dyn.push(<SvgText key="losL" x={FIELD.los + 5} y={22} fontSize={10.5} fontFamily={F_BOLD} fill={FE.losLabel}>Line of scrimmage</SvgText>);
  if (phase !== 'preSnap') {                                         // routes appear on the snap
    play.receivers.forEach(r => dyn.push(
      <Line key={`rt${r.id}`} x1={r.start.x} y1={r.start.y} x2={r.win.x} y2={r.win.y} stroke={FE.chalk} strokeWidth={2.5} opacity={0.4} strokeLinecap="round" />));
  }
  if (frame.win) dyn.push(<Circle key="win" cx={frame.win.pos.x} cy={frame.win.pos.y} r={frame.win.r} fill="none" stroke={frame.win.color} strokeWidth={3} opacity={0.9} />);
  if (frame.ghost) dyn.push(<Circle key="ghost" cx={frame.ghost.x} cy={frame.ghost.y} r={11} fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray="3 4" opacity={0.95} />);
  if (frame.ghostPulse) dyn.push(<Circle key="gp" cx={frame.ghostPulse.pos.x} cy={frame.ghostPulse.pos.y} r={frame.ghostPulse.r} fill="none" stroke={TEAL} strokeWidth={2.5} opacity={frame.ghostPulse.opacity} />);
  if (frame.ball) dyn.push(<Ellipse key="ball" cx={frame.ball.x} cy={frame.ball.y} rx={9} ry={5.5} fill={BALL_BROWN} stroke="#5a3512" strokeWidth={1} opacity={frame.ballOpacity} rotation={frame.ballAngle} originX={frame.ball.x} originY={frame.ball.y} />);
  play.receivers.forEach(r => {
    const p = frame.recPos[r.id];
    let stroke: string = FE.navy, sw = 1.5, fill: string = FE.orange;
    if ((phase === 'preSnap' || phase === 'running') && preSnapPick?.id === r.id) { stroke = AMBER; sw = 3.5; } // armed challenge pick
    if (chosen?.id === r.id && (phase === 'resolving' || phase === 'answered')) { stroke = chosen.open ? GREEN : RED; sw = 3.5; if (chosen.open) fill = GREEN; }
    dyn.push(<Circle key={`rc${r.id}`} cx={p.x} cy={p.y} r={14} fill={fill} stroke={stroke} strokeWidth={sw} />);
    dyn.push(<SvgText key={`rl${r.id}`} x={p.x} y={p.y - 19} textAnchor="middle" fontSize={13} fontFamily={F_BOLD} fill="#fff">{routeName(r.label)}</SvgText>);
  });
  frame.defPos.forEach((p, i) => {
    dyn.push(<Circle key={`d${i}`} cx={p.x} cy={p.y} r={11} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(<SvgText key={`dl${i}`} x={p.x} y={p.y + 21} textAnchor="middle" fontSize={12} fontFamily={F_BOLD} fill="#dbeaff">{play.defenders[i].role}</SvgText>);
  });
  dyn.push(<Circle key="qb" cx={frame.qbPos.x} cy={frame.qbPos.y} r={13} fill={FE.orange} stroke="#fff" strokeWidth={2.5} />);
  dyn.push(<SvgText key="qbl" x={frame.qbPos.x} y={frame.qbPos.y + 21} textAnchor="middle" fontSize={13} fontFamily={F_BOLD} fill="#fff">QB</SvgText>);
  if (showArrow) {                                                   // leverage arrow: nearest defender's commit direction, away from the open man
    let nearest = play.defenders[0], best = Infinity;
    play.defenders.forEach(d => { const dd = Math.hypot(d.to.x - open.win.x, d.to.y - open.win.y); if (dd < best) { best = dd; nearest = d; } });
    const x0 = nearest.to.x, y0 = nearest.to.y;
    const vx = nearest.to.x - nearest.x, vy = nearest.to.y - nearest.y, len = Math.hypot(vx, vy) || 1;
    const ax = x0 + (vx / len) * 20, ay = y0 + (vy / len) * 20, ang = Math.atan2(ay - y0, ax - x0), h = 7;
    dyn.push(<Line key="lev" x1={x0} y1={y0} x2={ax} y2={ay} stroke="#9fd0ff" strokeWidth={3} strokeLinecap="round" />);
    dyn.push(<Polygon key="levh" points={`${ax},${ay} ${ax - h * Math.cos(ang - 0.5)},${ay - h * Math.sin(ang - 0.5)} ${ax - h * Math.cos(ang + 0.5)},${ay - h * Math.sin(ang + 0.5)}`} fill="#9fd0ff" />);
    dyn.push(<SvgText key="levt" x={open.win.x} y={open.win.y + 20} textAnchor="middle" fontSize={11} fontFamily={F_BOLD} fill="#bfe9da">open</SvgText>);
  }
  if (frame.fx) {                                                    // resolution effect at the catch point (off the resolve t)
    const { kind, pos, prog } = frame.fx;
    if (kind === 'catch') {                                          // completion — celebratory: two expanding rings + radiating sparks
      dyn.push(<Circle key="cr1" cx={pos.x} cy={pos.y} r={14 + 30 * prog} fill="none" stroke={GREEN} strokeWidth={4} opacity={0.95 * (1 - prog)} />);
      const p2 = clamp01((prog - 0.14) / 0.86);
      dyn.push(<Circle key="cr2" cx={pos.x} cy={pos.y} r={14 + 22 * p2} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, d = 12 + 24 * prog;
        dyn.push(<Circle key={`sp${i}`} cx={pos.x + Math.cos(a) * d} cy={pos.y + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={Math.max(0, 1 - prog * 1.15)} />);
      }
    } else {                                                         // incompletion — a single red flash (the ball itself drops, above)
      dyn.push(<Circle key="inc" cx={pos.x} cy={pos.y} r={12 + 14 * prog} fill="none" stroke={RED} strokeWidth={4} opacity={0.9 * (1 - prog)} />);
    }
  }
  if (phase === 'preSnap' || phase === 'throwMoment') {              // two-circle tap targets (transparent hit disc + static ring at the throw)
    play.receivers.forEach(r => {
      const p = frame.recPos[r.id];
      dyn.push(<Circle key={`hit${r.id}`} cx={p.x} cy={p.y} r={HIT_R} fill="transparent" onPress={() => onReceiverTap(r)} />);
      if (phase === 'throwMoment') dyn.push(<Circle key={`aff${r.id}`} cx={p.x} cy={p.y} r={20} fill="none" stroke={AMBER} strokeWidth={2.5} opacity={0.9} onPress={() => onReceiverTap(r)} />);
    });
  }
  const field = <FootballField players={[]} overlay={dyn} showLos={false} />;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={PLAYS.map((p, i) => ({ key: String(i), name: p.name }))} currentKey={String(idx)} onSelect={k => selectPlay(Number(k))} />;
  const legend = (
    <View style={styles.legend}>
      {([['Receivers', FE.orange], ['Defenders', FE.blue], ['Ball', BALL_BROWN]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
    </View>
  );
  const snapBtn = <TouchableOpacity style={styles.snapBtn} activeOpacity={0.85} onPress={snap}><Text style={styles.snapTxt}>Snap the ball</Text></TouchableOpacity>;
  const promptBlock = <View style={styles.prompt}><Text style={styles.promptTxt}>{hint}</Text></View>;
  const verdictBody = chosen
    ? (chosen.open ? chosen.exp[depth] : `${chosen.exp[depth]}  —  The open man was ${routeName(open.label)}: ${open.exp[depth]}`)
    : '';
  const verdictCard = answered && chosen ? (
    <VerdictCard
      visible correct={chosen.open}
      tagText={chosen.open ? 'Completion' : 'Incomplete'}
      modeText={mode === 'read-before' ? '⚡ Pre-snap call' : 'Read after snap'}
      title={`${routeName(chosen.label)} was ${chosen.open ? 'open' : 'covered'}`}
      level={level} onSelectLevel={setLevel}
      body={verdictBody} compact={landscape}
    />
  ) : null;
  const restartBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Restart</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{restartBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextPlay} /></View>
  ) : undefined;

  // ── LANDSCAPE: field-left via the shell; prompt+Snap (pre) / VerdictCard+tiers (post) in the right column. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{verdictCard}{legend}</> : <>{promptBlock}{phase === 'preSnap' && snapBtn}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {field}
      {legend}
      {answered ? verdictCard : promptBlock}
      <View style={styles.controls}>
        {phase === 'preSnap' && snapBtn}
        {answered && <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Restart</Text></TouchableOpacity>}
        {answered && <NextButton visible variant="filled" label="Next play →" onPress={nextPlay} />}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  snapBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  snapTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
