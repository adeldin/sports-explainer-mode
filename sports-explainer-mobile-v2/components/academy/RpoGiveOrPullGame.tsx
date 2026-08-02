import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Rect, Line, Circle, Ellipse, Path, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FOOTBALL_FIELD_RATIO, FIELD, FE } from '../FieldEngine';
import {
  SCEN, MESH, QB, RB0, MESHPT, SLANT0, SLANTC, RUNLANE, GIVE_END, GIVE_STUFF,
  type RpoCall, type RpoScenario, type Depth, type Pt,
} from '../../lib/rpoGiveOrPull';

// Give or Pull? — the RPO mesh point as a freeze-and-decide module. The play DEVELOPS first (the
// back rides the mesh, the ringed backer takes his first two steps, the slant releases), freezes at
// the mesh, and only then do you call it: hand it off, or pull it and throw. The resolve is the
// teaching beat — a wrong pull is killed by the read defender himself (JUMPED / BATTED, per the
// data lib), a wrong give runs into the crash. Outcomes read out on a small LED strip using the
// lib's own led text; verdicts + the 4-depth COACH'S READ are the lib's, verbatim.
//
// All motion runs on ONE rafRef with a generation guard (scenario change / reset / choose / unmount
// invalidate the running loop). Field = the shared FootballField (680×380, LOS at x=235); the module
// owns every drawn pixel via the overlay slot (players=[], showLos={false}) so the LOS sits UNDER
// the dots instead of slicing them.
const F_BOLD = 'SpaceGrotesk_700Bold';
const F_LED = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a', GREEN = '#16a37f', BALL_BROWN = '#7a4a1e';
const DEV_MS = 1500;                                   // snap → the mesh freeze
const GIVE_MS = 900, STUFF_MS = 520, THROW_MS = 620;   // the three resolve timelines
const POST_MS = 700;                                   // the burst / flicker window after the ball lands
const DROP_MS = 420;                                   // a batted ball falling to the turf
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const L = (a: Pt, b: Pt, f: number): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
const bez = (a: Pt, c: Pt, b: Pt, f: number): Pt => {
  const m = 1 - f;
  return { x: m * m * a.x + 2 * m * f * c.x + f * f * b.x, y: m * m * a.y + 2 * m * f * c.y + f * f * b.y };
};
const ease = (f: number) => f * f * (3 - 2 * f);
const QB_BALL: Pt = { x: QB.x + 9, y: QB.y - 2 };
const SLANT_MID = L(SLANT0, SLANTC, 0.42);             // where the slant is when the mesh freezes

type Phase = 'develop' | 'mesh' | 'run' | 'done';
interface Frame {
  rb: Pt; key: Pt; slant: Pt; safety: Pt;
  ball: Pt; ballAng: number; ballOp: number;
  fx: { pos: Pt; kind: 'good' | 'bad'; prog: number } | null;
}
const baseFrame = (s: RpoScenario): Frame => ({
  rb: RB0, key: s.key0, slant: SLANT0, safety: s.safety.p0,
  ball: QB_BALL, ballAng: 0, ballOp: 1, fx: null,
});

// Outlined field label (react-native-svg has no paint-order, so outline pass then fill pass).
function fieldLabel(key: string, x: number, y: number, text: string, fill: string, size = 11): ReactNode {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <G key={key}>
      <SvgText {...common} fill="none" stroke={FE.labelOutline} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </G>
  );
}

// The laced football (the football-module standard — never a white dot).
function lacedBall(key: string, x: number, y: number, ang: number, op: number): ReactNode {
  return (
    <G key={key} x={x} y={y} rotation={ang} opacity={op}>
      <Ellipse cx={0} cy={0} rx={8} ry={5} fill={BALL_BROWN} stroke="#5a3512" strokeWidth={1} />
      <Line x1={-5} y1={0} x2={5} y2={0} stroke="#f3ead8" strokeWidth={1.4} strokeLinecap="round" />
      {[-2, 0, 2].map(dx => <Line key={`lc${dx}`} x1={dx} y1={-2.2} x2={dx} y2={2.2} stroke="#f3ead8" strokeWidth={1.2} />)}
    </G>
  );
}

// The explanation key rides UNDER the field, not at the bottom of the controls scroll: this field is
// WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved ALWAYS
// (~26pt, one compact row at the field width) so the art size never jumps between states, and the
// height it frees is real height back in the controls column.
const LS_LEGEND_RESERVE = 42;

export default function RpoGiveOrPullGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('develop');
  const [chosen, setChosen] = useState<RpoCall | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [frame, setFrame] = useState<Frame>(() => baseFrame(SCEN[0]));
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;   // app Level → data-lib Depth
  const answered = phase === 'done';
  const v = chosen ? s.verd[chosen] : null;

  // ── one rAF owner — the generation guard kills any in-flight loop on every state change ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);

  // ── the develop film: the back rides the mesh, the ringed backer declares, the slant releases ──
  const develop = (sc: RpoScenario) => {
    stopLoop();
    const gen = ++genRef.current;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const t = MESH * clamp01((now - t0) / DEV_MS);     // t-units, 0 → MESH (the mesh freeze)
      const f = ease(t / MESH);
      setFrame({
        rb: L(RB0, MESHPT, f),
        key: L(sc.key0, sc.keyMesh, f),
        slant: L(SLANT0, SLANT_MID, f),
        safety: L(sc.safety.p0, sc.safety.pResolve, 0.16 * f),   // the safety has barely moved yet
        ball: L(QB_BALL, MESHPT, f), ballAng: 0, ballOp: 1, fx: null,
      });
      if (t < MESH) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; setPhase('mesh'); }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const resetTo = (i: number) => {
    genRef.current++;
    stopLoop();
    setIdx(i); setPhase('develop'); setChosen(null);
    setFrame(baseFrame(SCEN[i]));
    develop(SCEN[i]);
  };
  useEffect(() => { resetTo(0); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const resetPlay = () => resetTo(idx);
  const selectScenario = (i: number) => resetTo(i);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── resolve: the give runs the lane (or dies in it); the pull throws the slant (or feeds the man
  // who never left the throwing lane — JUMPED or BATTED, exactly as the lib's led text says). ──
  const choose = (call: RpoCall) => {
    if (phase !== 'mesh') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    const gen = ++genRef.current;
    setChosen(call); setPhase('run');
    const works = s.answer === call;
    const give = call === 'give';
    const motionMs = give ? (works ? GIVE_MS : STUFF_MS) : THROW_MS;
    const total = motionMs + POST_MS;

    // where it ends, and where the colored result fires
    const rbEnd = give ? (works ? GIVE_END : GIVE_STUFF) : { x: RUNLANE.x - 30, y: RUNLANE.y };
    const target = give ? rbEnd : works ? SLANTC : s.keyMesh;    // the pull's ball destination
    const keyEnd: Pt = give
      ? works
        ? { x: rbEnd.x - 26, y: rbEnd.y - 18 }                   // he fills, late and behind it
        : { x: GIVE_STUFF.x + 12, y: GIVE_STUFF.y - 2 }          // he was crashing — he meets the back
      : works
        ? { x: s.keyMesh.x + (s.keyMesh.x - s.key0.x) * 0.5, y: s.keyMesh.y + (s.keyMesh.y - s.key0.y) * 0.5 }
        : { x: s.keyMesh.x - 6, y: s.keyMesh.y + 8 };            // he steps INTO the throwing lane
    const ctrl: Pt = { x: (QB_BALL.x + target.x) / 2, y: (QB_BALL.y + target.y) / 2 - 26 };
    const fxKind: 'good' | 'bad' = works ? 'good' : 'bad';

    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const e = now - t0;
      const k = clamp01(e / motionMs);
      const landed = e >= motionMs;
      const fe = landed ? e - motionMs : 0;
      if (landed && !revealed) { revealed = true; setPhase('done'); }

      // the back: through the lane on a give (two segments via the aiming point), carrying out the fake on a pull
      const rb = give
        ? works
          ? (k < 0.5 ? L(MESHPT, RUNLANE, k / 0.5) : L(RUNLANE, GIVE_END, (k - 0.5) / 0.5))
          : L(MESHPT, GIVE_STUFF, ease(k))
        : L(MESHPT, rbEnd, ease(k));
      // the ball: in the back's belly on a give; a thrown rope on a pull (and it hits the turf if batted)
      let ball: Pt, ballAng = 0, ballOp = 1;
      if (give) {
        ball = { x: rb.x + 5, y: rb.y - 6 };
      } else if (!landed) {
        ball = bez(QB_BALL, ctrl, target, k);
        const ahead = bez(QB_BALL, ctrl, target, Math.min(k + 0.02, 1));
        ballAng = Math.atan2(ahead.y - ball.y, ahead.x - ball.x) * 180 / Math.PI;
      } else if (s.pullFail === 'batted' && !works) {
        const d = clamp01(fe / DROP_MS);
        ball = { x: target.x + 16 * d, y: target.y + 32 * d + 8 * Math.sin(d * Math.PI) };
        ballAng = d * 240; ballOp = 1 - 0.55 * d;
      } else {
        ball = target;
      }
      setFrame({
        rb,
        key: L(s.keyMesh, keyEnd, ease(k)),
        slant: L(SLANT_MID, SLANTC, ease(k)),
        safety: L(s.safety.p0, s.safety.pResolve, ease(Math.min(1, 0.16 + 0.84 * k))),
        ball, ballAng, ballOp,
        fx: landed ? { pos: target, kind: fxKind, prog: clamp01(fe / POST_MS) } : null,
      });
      if (e < total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the on-field overlay (rebuilt from `frame` each render; players=[] on the field itself) ──
  const dyn: ReactNode[] = [];
  // LOS first → it sits UNDER the dots (FootballField's own LOS is suppressed).
  dyn.push(<Line key="los" x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />);
  dyn.push(<SvgText key="losL" x={FIELD.los + 5} y={22} fontSize={10.5} fontFamily={F_BOLD} fill={FE.losLabel}>Line of scrimmage</SvgText>);

  // The box-count fallback annotation (scenario 3): an outline you can COUNT into pre-call, filled
  // in with the arithmetic on reveal. Counts are computed from the formation, never hand-declared.
  if (s.lightBox) {
    dyn.push(
      <Rect key="lbox" x={236} y={128} width={86} height={132} rx={8}
        fill={answered ? AMBER : 'none'} fillOpacity={answered ? 0.16 : 0}
        stroke={answered ? AMBER : '#e8eef7'} strokeWidth={answered ? 2 : 1.5}
        strokeDasharray={answered ? undefined : '5 5'} opacity={answered ? 1 : 0.7} />,
    );
    dyn.push(fieldLabel('lboxL', 279, 122,
      answered ? `light box · ${s.oline.length} blockers, ${s.dline.length} down` : 'count the box',
      answered ? '#ffe1b3' : '#e8eef7', 10));
  }

  // The two options, drawn at the freeze (and kept through the resolve): the run lane and the slant.
  if (phase !== 'develop') {
    dyn.push(<Path key="lane" d={`M${MESHPT.x} ${MESHPT.y} L${RUNLANE.x} ${RUNLANE.y} L${GIVE_END.x} ${GIVE_END.y}`} fill="none" stroke={FE.chalk} strokeWidth={2.5} strokeDasharray="6 6" opacity={chosen === 'give' ? 0.15 : 0.45} strokeLinecap="round" />);
    dyn.push(<Line key="slant" x1={SLANT0.x} y1={SLANT0.y} x2={SLANTC.x} y2={SLANTC.y} stroke={FE.chalk} strokeWidth={2.5} strokeDasharray="6 6" opacity={chosen === 'pull' ? 0.15 : 0.45} strokeLinecap="round" />);
  }

  // the lines — small dots, identified via the legend
  s.oline.forEach((p, i) => dyn.push(<Circle key={`ol${i}`} cx={p.x} cy={p.y} r={7} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />));
  s.dline.forEach((p, i) => dyn.push(<Circle key={`dl${i}`} cx={p.x} cy={p.y} r={7} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />));
  // the other labeled defenders
  s.others.forEach((p, i) => {
    dyn.push(<Circle key={`ot${i}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`otl${i}`, p.x, p.y + 21, s.othersR[i], FE.defLabel, 10.5));
  });
  // the safety
  dyn.push(<Circle key="saf" cx={frame.safety.x} cy={frame.safety.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
  dyn.push(fieldLabel('safl', frame.safety.x, frame.safety.y + 21, 'S', FE.defLabel, 10.5));
  // THE READ DEFENDER — ringed pre-snap and ringed all the way through (the module's coherence anchor)
  {
    const grade = answered && v ? (v.k === 'good' ? TEAL : RED) : AMBER;
    dyn.push(<Circle key="keyring" cx={frame.key.x} cy={frame.key.y} r={17} fill="none" stroke={grade} strokeWidth={2.5} strokeDasharray="4 4" opacity={0.95} />);
    dyn.push(<Circle key="key" cx={frame.key.x} cy={frame.key.y} r={10} fill={FE.blue} stroke={grade} strokeWidth={3} />);
    dyn.push(fieldLabel('keyl', frame.key.x, frame.key.y + 24, 'LB · the read', grade === AMBER ? '#ffe1b3' : grade, 10));
  }
  // offense: the slant receiver, the QB, the back
  dyn.push(<Circle key="slantR" cx={frame.slant.x} cy={frame.slant.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
  dyn.push(fieldLabel('slantL', frame.slant.x, frame.slant.y - 14, 'slant', FE.offLabel, 10.5));
  dyn.push(<Circle key="qb" cx={QB.x} cy={QB.y} r={10} fill={FE.orange} stroke="#fff" strokeWidth={2.5} />);
  dyn.push(fieldLabel('qbl', QB.x, QB.y + 23, 'QB', FE.offLabel, 10.5));
  dyn.push(<Circle key="rb" cx={frame.rb.x} cy={frame.rb.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
  dyn.push(fieldLabel('rbl', frame.rb.x, frame.rb.y + 23, 'RB', FE.offLabel, 10.5));
  // the mesh point itself, marked while the decision is live
  if (phase === 'mesh') {
    dyn.push(<Circle key="mesh" cx={MESHPT.x} cy={MESHPT.y} r={20} fill="none" stroke={TEAL} strokeWidth={2} opacity={0.75} />);
    dyn.push(fieldLabel('meshl', MESHPT.x - 4, MESHPT.y - 26, 'the mesh', '#bfe9da', 10));
  }
  dyn.push(lacedBall('ball', frame.ball.x, frame.ball.y, frame.ballAng, frame.ballOp));
  // the result fires ON THE FIELD, where it happened
  if (frame.fx) {
    const { pos, kind, prog } = frame.fx;
    if (kind === 'good') {
      dyn.push(<Circle key="fx1" cx={pos.x} cy={pos.y} r={14 + 30 * prog} fill="none" stroke={GREEN} strokeWidth={4} opacity={0.95 * (1 - prog)} />);
      const p2 = clamp01((prog - 0.14) / 0.86);
      dyn.push(<Circle key="fx2" cx={pos.x} cy={pos.y} r={14 + 22 * p2} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, d = 12 + 24 * prog;
        dyn.push(<Circle key={`sp${i}`} cx={pos.x + Math.cos(a) * d} cy={pos.y + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={Math.max(0, 1 - prog * 1.15)} />);
      }
    } else {
      dyn.push(<Circle key="fxb" cx={pos.x} cy={pos.y} r={12 + 16 * prog} fill="none" stroke={RED} strokeWidth={4} opacity={0.9 * (1 - prog)} />);
      const xp = prog < 1 / 3 ? prog * 3 : prog < 2 / 3 ? 1 : Math.max(0, 3 * (1 - prog));
      dyn.push(<Path key="fxx" d={`M${pos.x - 8} ${pos.y - 8} L${pos.x + 8} ${pos.y + 8} M${pos.x + 8} ${pos.y - 8} L${pos.x - 8} ${pos.y + 8}`} stroke={RED} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={xp} />);
    }
  }
  // ── the LED strip: the outcome text is the data lib's (s.led), never re-worded here ──
  {
    const bx = 404, by = 30, bw = 256, bh = 46;
    const cap = phase === 'develop' ? 'MESH' : phase === 'mesh' ? 'YOUR CALL' : 'RESULT';
    const val = phase === 'develop' ? 'READ HIM' : phase === 'mesh' ? 'GIVE / PULL' : chosen ? s.led[chosen] : '';
    const good = v?.k === 'good';
    const screen = phase === 'develop' || phase === 'mesh' ? '#0c1016' : good ? '#0a2a1c' : '#2a0e0e';
    const color = phase === 'develop' ? '#e8edf5' : phase === 'mesh' ? '#ffd23f' : good ? '#3ff0a8' : '#ff6a6a';
    dyn.push(
      <G key="led">
        <Rect x={bx} y={by} width={bw} height={bh} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />
        <Rect x={bx + 6} y={by + 6} width={bw - 12} height={bh - 12} rx={4} fill={screen} />
        <SvgText x={bx + bw / 2} y={by + 19} textAnchor="middle" fontFamily={F_LED} fontWeight="800" fontSize={8} fill="#5a6b7a" letterSpacing="1.5">{cap}</SvgText>
        <SvgText x={bx + bw / 2} y={by + 38} textAnchor="middle" fontFamily={F_LED} fontWeight="800" fontSize={17} fill={color} letterSpacing="2">{val}</SvgText>
      </G>,
    );
  }
  const field = (
    <View style={styles.stageWrap}>
      <FootballField players={[]} overlay={dyn} showLos={false} />
      {phase === 'mesh' && (
        <TouchableOpacity style={styles.replay} activeOpacity={0.8} hitSlop={10} onPress={resetPlay}>
          <Text style={styles.replayTxt}>↺ watch the mesh again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => selectScenario(Number(k))} />;
  const promptNode = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <Text style={[styles.promptTxt, landscape && styles.promptTxtLs]}>
        {phase === 'develop'
          ? <>The mesh is forming. <Text style={styles.promptB}>Watch the ringed backer's first two steps.</Text></>
          : phase === 'mesh'
            ? <>Frozen at the mesh. Ball in the back's belly — <Text style={styles.promptB}>give it, or pull it and throw the slant?</Text></>
            : chosen === 'give'
              ? <>Handed off — the back is into the lane…</>
              : <>Pulled — the ball is out…</>}
      </Text>
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>
        {phase === 'mesh'
          ? 'He can defend the run or the pass. Not both.'
          : phase === 'develop' ? 'Downhill at the back = pull. Widening under the slant = give.' : ''}
      </Text>
    </View>
  );
  const callBtn = (opt: RpoCall, title: string, sub: string, alt?: boolean) => (
    <TouchableOpacity key={opt} style={[styles.callBtn, landscape && styles.callBtnLs]} activeOpacity={0.85} onPress={() => choose(opt)}>
      <Text style={[styles.callTitle, landscape && styles.callTitleLs]}>{title}</Text>
      <Text style={[styles.callSub, landscape && styles.callSubLs]}>{sub}</Text>
    </TouchableOpacity>
  );
  const callButtons = phase === 'mesh' ? (
    <View style={landscape ? styles.callCol : styles.callRow}>
      {callBtn('give', 'Give it', 'hand it to the back')}
      {callBtn('pull', 'Pull it', 'throw the slant', true)}
    </View>
  ) : null;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Offense', FE.orange], ['Defense', FE.blue], ['Ball', BALL_BROWN]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={styles.legendRing} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>the read defender</Text></View>
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  const verdictCard = answered && v ? (
    <View style={[styles.verdict, landscape && styles.verdictCompact]}>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, v.k === 'good' ? styles.tagGood : styles.tagBad]}>{v.k === 'good' ? 'Good read' : 'Rethink it'}</Text>
        <Text style={[styles.tag, styles.tagMode]}>{chosen === 'give' ? 'You gave it' : 'You pulled it'}</Text>
      </View>
      <Text style={styles.vtitle} numberOfLines={landscape ? 2 : undefined}>{v.t}</Text>
      <Text style={styles.vbody}>{v.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const foot = (
    <Text style={styles.foot}>One run-pass conflict defender, ringed. <Text style={styles.footB}>His first two steps make the call</Text> — the quarterback just answers it.</Text>
  );
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = (
    <View style={styles.lsPostRow}>
      {resetBtnC}
      {answered
        ? <NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} />
        : <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]} numberOfLines={2}>Same play, three answers.</Text>}
    </View>
  );

  // ── LANDSCAPE: field-left via the shell; prompt + calls (pre) / verdict (post) in the right column. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={pills}
        field={field}
        belowField={lsLegendUnder}
        controls={answered ? <>{verdictCard}</> : <>{promptNode}{callButtons}</>}
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
      {answered ? verdictCard : promptNode}
      {callButtons}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
        {answered && <NextButton visible variant="filled" label="Next look →" onPress={nextScenario} />}
      </View>
      {foot}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  stageWrap: { position: 'relative' },
  replay: { position: 'absolute', top: 10, left: 10, borderWidth: 1.5, borderColor: 'rgba(244,244,238,.75)', backgroundColor: 'rgba(13,27,62,.6)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  replayTxt: { color: '#F4F4EE', fontSize: 11.5, fontWeight: '700' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptB: { color: t.accentText, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  callRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  callCol: { gap: 8, flexWrap: 'nowrap' },
  callBtn: { flexGrow: 1, minWidth: 140, minHeight: 48, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  callBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  callTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  callTitleLs: { fontSize: 13 },
  callSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  callSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendRing: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: AMBER },
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
