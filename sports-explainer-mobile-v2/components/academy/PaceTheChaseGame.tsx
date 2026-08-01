import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { CricketOvalScene, CricketBall, ActorDot, OutlinedLabel, clampLabelX, CK } from './fields/CricketOval';
import {
  SCENARIOS, OPTIONS, OUTCOME_PROMPT, PROMPT_RUNUP, HINT_IDLE, HINT_DONE, SUB, FOOT,
  DRAW_LABEL, DRAW_PROMPT, BAT, gradeColor, gradeTag,
  type PTCOption, type PTCScenario, type Grade, type P, type Depth,
} from '../../lib/paceTheChase';

// Pace the Chase — the run-chase module. The LED board is the READ, not decoration: it carries the
// two gauges (balls left, wickets left) and RE-DOES THE ARITHMETIC on every ball, so a dot ball
// visibly costs you (same runs, one fewer ball, required rate up). On the field the two free options
// are drawn as wedges — a teal SINGLE lane from the bat, and an amber OPEN SECTOR where no rider
// stands. The last tab flips the format: on day five of a Test the board becomes a SURVIVE counter
// that ticks down through a montage of dead bats until the draw is banked. This module has an LED
// board band, so it draws its OWN 680×534 scene (board + translated oval) with its own ratio, per
// the landscape port standard's board-module allowance.
const F_BOLD = 'SpaceGrotesk_700Bold';
const F_LED = 'Courier New';
const SCENE = { vbW: 680, vbH: 534, ovalY: 74 };
export const PACE_THE_CHASE_RATIO = SCENE.vbW / SCENE.vbH;
const OK_BG = '#fef3e2', OK_C = '#8a5a1c';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';

// Delivery + resolve beats (ms) — the spike's timings, kept.
const RUNUP_MS = 260, SHOT_MS = 650, CROSS_MS = 600, TICK_MS = 440;
const RESOLVE_AT = RUNUP_MS + SHOT_MS;

const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const arcAt = (from: P, to: P, peak: number, k: number): P => {
  const mx = (from[0] + to[0]) / 2, my = Math.min(from[1], to[1]) - peak, mk = 1 - k;
  return [mk * mk * from[0] + 2 * mk * k * mx + k * k * to[0], mk * mk * from[1] + 2 * mk * k * my + k * k * to[1]];
};

// ── scene model (mutable ref; one bump/frame re-renders the SVG) ──
interface SceneLabel { x: number; y: number; txt: string; fill: string; size: number }
interface Fx { kind: 'burst' | 'celebrate'; pos: P; color: string; born: number }
interface Scene {
  fielders: Record<string, P>;
  striker: P; nonStriker: P;
  ball: P | null;
  labels: SceneLabel[];
  fx: Fx[];
  freeSingleGhost: P | null;                    // the teaching ring: the single was FREE
  surviveLeft: number | null;
  board: { mode: 'score' } | { mode: 'msg'; state: Grade; msg: string; sub: string };
  boardDim: number;
}
const freshScene = (s: PTCScenario): Scene => {
  const fielders: Record<string, P> = {};
  s.fielders.forEach(f => { fielders[f.id] = f.p; });
  return {
    fielders, striker: BAT, nonStriker: [322, 168], ball: [346, 158], labels: [], fx: [],
    freeSingleGhost: null, surviveLeft: s.survive ?? null, board: { mode: 'score' }, boardDim: 1,
  };
};

// ── timeline harness (per-module copy — single rafRef owner, per the port standard) ──
type TAnim = { at: number; d: number; f: (k: number) => void };
type TEv = { at: number; f: () => void };
type Phase = 'idle' | 'run' | 'done';

export default function PaceTheChaseGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<PTCOption | null>(null);
  const [, setTick] = useState(0);
  const sceneRef = useRef<Scene>(freshScene(SCENARIOS[0]));
  const promptRef = useRef<string>(SCENARIOS[0].prompt);
  const hintRef = useRef<string>(HINT_IDLE);
  const clockRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);                     // generation guard: a stale frame can never write
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const bump = () => setTick(t => (t + 1) % 1000000);
  const stopLoop = () => { genRef.current += 1; if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const runTimeline = (anims: TAnim[], evs: TEv[], total: number) => {
    stopLoop();
    const gen = genRef.current;
    const fired = new Set<TEv>(); const ended = new Set<TAnim>();
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;                       // stale generation — drop the frame
      if (t0 == null) t0 = now;
      const e = now - t0;
      clockRef.current = e;
      evs.forEach(ev => { if (!fired.has(ev) && e >= ev.at) { fired.add(ev); ev.f(); } });
      anims.forEach(a => {
        if (e >= a.at && !ended.has(a)) {
          const k = Math.min(1, (e - a.at) / a.d);
          a.f(k);
          if (k >= 1) ended.add(a);
        }
      });
      bump();
      if (e >= total) { rafRef.current = null; return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const sc = () => sceneRef.current;
  const addLabel = (x: number, y: number, txt: string, fill: string, size: number) =>
    sc().labels.push({ x: clampLabelX(x, txt), y, txt, fill, size });
  const burstAt = (pos: P, color: string) => sc().fx.push({ kind: 'burst', pos, color, born: clockRef.current });
  const celebrateAt = (pos: P) => sc().fx.push({ kind: 'celebrate', pos, color: CK.good, born: clockRef.current });
  const mkSlide = (at: number, from: P, to: P, d: number): TAnim => ({ at, d, f: k => { sc().ball = lerpP(from, to, k); } });
  const mkArc = (at: number, from: P, to: P, peak: number, d: number): TAnim => ({ at, d, f: k => { sc().ball = arcAt(from, to, peak, k); } });
  const mkFielder = (at: number, id: string, from: P, to: P, d: number): TAnim => ({ at, d, f: k => { sc().fielders[id] = lerpP(from, to, k); } });
  const mkBatters = (at: number, d: number): TAnim => {
    const s0 = sc().striker, n0 = sc().nonStriker;
    return { at, d, f: k => { sc().striker = lerpP(s0, [356, 172], k); sc().nonStriker = lerpP(n0, [324, 284], k); } };
  };

  const resetTo = (i: number) => {
    stopLoop();
    setIdx(i); setPhase('idle'); setChosen(null);
    sceneRef.current = freshScene(SCENARIOS[i]);
    promptRef.current = SCENARIOS[i].prompt;
    hintRef.current = HINT_IDLE;
    clockRef.current = 0;
    bump();
  };
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);
  const showVerdict = () => { setPhase('done'); hintRef.current = HINT_DONE; };

  // ── choose: bowler runs in, the ball is played, and the BOARD re-does the maths ──
  const choose = (opt: PTCOption) => {
    if (phaseRef.current !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt);
    setPhase('run');
    const scn = s, o = scn.opts[opt], col = gradeColor(o.k), to = o.shot.to;
    promptRef.current = PROMPT_RUNUP;
    const anims: TAnim[] = [];
    const evs: TEv[] = [];
    const ev = (at: number, f: () => void) => evs.push({ at, f });
    // the LED board flip: dim → swap to the message → pulse back up
    const flipBoard = (at: number, state: Grade, msg: string, sub: string) => {
      ev(at, () => { sc().boardDim = 0.35; });
      ev(at + 90, () => { sc().board = { mode: 'msg', state, msg, sub }; sc().boardDim = 1; });
      ev(at + 240, () => { sc().boardDim = 0.75; });
      ev(at + 360, () => { sc().boardDim = 1; });
    };

    anims.push(mkSlide(0, [346, 158], [348, 282], RUNUP_MS));
    if (o.shot.air) anims.push(mkArc(RUNUP_MS, BAT, to, o.shot.peak ?? 90, SHOT_MS));
    else anims.push(mkSlide(RUNUP_MS, BAT, to, SHOT_MS));
    // the fielding side is ALIVE: the ring squeezes a step toward wherever the ball went
    if (o.outcome !== 'dot' && o.outcome !== 'block_survive') {
      scn.fielders.forEach((f, i) => {
        if (f.id === 'keeper' || f.id === 'bowler') return;
        const d = Math.hypot(to[0] - f.p[0], to[1] - f.p[1]);
        if (d >= 160 || d <= 26) return;
        const target: P = [f.p[0] + (to[0] - f.p[0]) * 0.12, f.p[1] + (to[1] - f.p[1]) * 0.12];
        anims.push(mkFielder(RUNUP_MS + 60 + i * 40, f.id, f.p, target, 420));
      });
    }

    const olx = o.olabAt ? o.olabAt[0] : to[0];
    const oly = o.olabAt ? o.olabAt[1] : to[1] + (to[1] < 60 ? 26 : -26);
    let finAt = RESOLVE_AT;
    let total = RESOLVE_AT + 900;

    if (o.outcome === 'four' || o.outcome === 'six') {
      ev(RESOLVE_AT, () => {
        celebrateAt(to);
        addLabel(olx, oly, o.olab, '#bfe9da', 12);
        promptRef.current = OUTCOME_PROMPT[o.outcome] ?? '';
      });
      flipBoard(RESOLVE_AT, o.k, o.bmsg, o.bsub);
    } else if (o.outcome === 'single') {
      anims.push(mkBatters(RESOLVE_AT, CROSS_MS));
      ev(RESOLVE_AT, () => {
        burstAt(to, col);
        addLabel(olx, o.olabAt ? oly : to[1] - 24, o.olab, o.k === 'good' ? '#bfe9da' : '#ffe1b3', 11);
        promptRef.current = OUTCOME_PROMPT.single ?? '';
      });
      flipBoard(RESOLVE_AT, o.k, o.bmsg, o.bsub);
      finAt = RESOLVE_AT + 650;
      total = finAt + 900;
    } else if (o.outcome === 'dot') {
      ev(RESOLVE_AT, () => {
        burstAt(to, col);
        addLabel(o.olabAt ? olx : to[0] + 56, o.olabAt ? oly : to[1] + 18, o.olab, o.k === 'ok' ? '#ffe1b3' : '#ffb3ae', 10.5);
        promptRef.current = OUTCOME_PROMPT.dot ?? '';
      });
      flipBoard(RESOLVE_AT, o.k, o.bmsg, o.bsub);
    } else if (o.outcome === 'caught') {
      ev(RESOLVE_AT, () => {
        burstAt(to, RED);
        addLabel(o.olabAt ? olx : to[0] - 8, o.olabAt ? oly : to[1] - 26, o.olab, '#ffb3ae', 12);
        promptRef.current = OUTCOME_PROMPT.caught ?? '';
        // the ghost that teaches: the green wedge was free
        sc().freeSingleGhost = scn.single.end;
        addLabel(scn.single.end[0], scn.single.end[1] - 22, 'the single was FREE', '#7fe0cd', 10);
      });
      flipBoard(RESOLVE_AT, 'bad', o.bmsg, o.bsub);
    } else if (o.outcome === 'out_edge') {
      ev(RESOLVE_AT, () => {
        burstAt(to, RED);
        addLabel(to[0] - 40, to[1] + 38, o.olab, '#ffb3ae', 12);
        promptRef.current = OUTCOME_PROMPT.out_edge ?? '';
      });
      flipBoard(RESOLVE_AT, 'bad', o.bmsg, o.bsub);
    } else if (o.outcome === 'single_meaning') {
      anims.push(mkBatters(RESOLVE_AT, CROSS_MS));
      ev(RESOLVE_AT, () => {
        burstAt(to, AMBER);
        addLabel(to[0], to[1] - 24, o.olab, '#ffe1b3', 10.5);
        sc().surviveLeft = (sc().surviveLeft ?? 1) - 1;
      });
      flipBoard(RESOLVE_AT, 'ok', o.bmsg, o.bsub);
      finAt = RESOLVE_AT + 650;
      total = finAt + 900;
    } else {
      // block_survive — the montage: each survived ball ticks the counter down to the draw
      const start = scn.survive ?? 0;
      ev(RESOLVE_AT, () => {
        burstAt(to, TEAL);
        addLabel(o.olabAt ? o.olabAt[0] : to[0] + 62, o.olabAt ? o.olabAt[1] : to[1] + 16, o.olab, '#bfe9da', 10.5);
        sc().surviveLeft = start - 1;
        promptRef.current = `Dead bat. <b>${start - 1} to go</b> — again. And again…`;
      });
      for (let i = 0; i < start - 1; i++) {
        const cur = start - 1 - i;                       // balls left before this one is bowled
        const base = RESOLVE_AT + i * TICK_MS;
        anims.push(mkSlide(base + 240, [346, 158], [348, 282], 110));
        anims.push(mkSlide(base + 350, [348, 282], [346 + ((cur % 3) - 1) * 6, 300], 90));
        ev(base + TICK_MS, () => { sc().surviveLeft = cur - 1; });
      }
      const drawAt = RESOLVE_AT + (start - 1) * TICK_MS;
      ev(drawAt, () => {
        celebrateAt(BAT);
        addLabel(430, 250, DRAW_LABEL, '#bfe9da', 14);
        promptRef.current = DRAW_PROMPT;
      });
      flipBoard(drawAt, 'good', o.bmsg, o.bsub);
      finAt = drawAt;
      total = drawAt + 900;
    }
    ev(finAt, showVerdict);
    runTimeline(anims, evs, total);
  };

  // ── SVG scene: LED board strip → oval → wedges → fielders → batters → ball → fx → labels ──
  const scene = sceneRef.current;
  const clock = clockRef.current;
  const pit: ReactNode[] = [];
  pit.push(<G key="oval"><CricketOvalScene /></G>);
  // the two FREE options, drawn: the open sector (amber) and the single lane (teal)
  const w = s.wedge;
  const wCol = w.kind === 'single' ? TEAL : AMBER;
  pit.push(<Path key="wedge" d={`M${BAT[0]} ${BAT[1]} L${w.a[0]} ${w.a[1]} L${w.end[0]} ${w.end[1]} L${w.b[0]} ${w.b[1]} Z`}
    fill={wCol} opacity={0.14} stroke={wCol} strokeWidth={1.5} strokeDasharray="5 5" />);
  pit.push(<G key="wedgeL" opacity={0.95}>
    <OutlinedLabel x={clampLabelX((w.a[0] + w.b[0] + w.end[0]) / 3, w.lab)} y={(w.a[1] + w.b[1] + w.end[1]) / 3} text={w.lab} fill={wCol} size={9} />
  </G>);
  if (w.kind !== 'single') {
    const ex = s.single.end[0], ey = s.single.end[1];
    const dx = ex - BAT[0], dy = ey - BAT[1], len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * 14, py = (dx / len) * 14;
    pit.push(<Path key="lane" d={`M${BAT[0]} ${BAT[1]} L${ex + px} ${ey + py} L${ex - px} ${ey - py} Z`}
      fill={TEAL} opacity={0.12} stroke={TEAL} strokeWidth={1.2} strokeDasharray="4 5" />);
    pit.push(<G key="laneL" opacity={0.9}><OutlinedLabel x={clampLabelX(ex - 6, s.single.lab)} y={ey - 22} text={s.single.lab} fill="#7fe0cd" size={8.5} /></G>);
  }
  if (scene.freeSingleGhost) {
    pit.push(<Circle key="freeG" cx={scene.freeSingleGhost[0]} cy={scene.freeSingleGhost[1]} r={13} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="4 4" />);
  }
  s.fielders.forEach(f => {
    const p = scene.fielders[f.id] ?? f.p;
    pit.push(<ActorDot key={f.id} x={p[0]} y={p[1]} fill={f.id === 'keeper' ? CK.keeper : CK.def}
      label={f.n} labelFill={f.id === 'keeper' ? '#e6d8f2' : '#bcd3ff'} dy={f.dy} />);
  });
  pit.push(<ActorDot key="striker" x={scene.striker[0]} y={scene.striker[1]} fill={CK.orange} label="you" />);
  pit.push(<ActorDot key="nonstr" x={scene.nonStriker[0]} y={scene.nonStriker[1]} fill={CK.orange} label="partner" dy={24} />);
  if (scene.ball) pit.push(<CricketBall key="ball" x={scene.ball[0]} y={scene.ball[1]} />);
  scene.fx.forEach((fx, i) => pit.push(<FxEl key={`fx${i}`} fx={fx} clock={clock} />));
  if (scene.surviveLeft != null) {
    pit.push(<G key="survive"><OutlinedLabel x={560} y={84} text={`SURVIVE: ${scene.surviveLeft}`} fill="#ffd23f" size={15} /></G>);
  }
  scene.labels.forEach((l, i) => pit.push(<G key={`lbl${i}`}><OutlinedLabel x={l.x} y={l.y} text={l.txt} fill={l.fill} size={l.size} /></G>));

  const scene3 = (
    <View style={styles.sceneWrap}>
      <Svg viewBox={`0 0 ${SCENE.vbW} ${SCENE.vbH}`} style={styles.svg}>
        <G opacity={scene.boardDim}><LedBoard scene={scene} s={s} /></G>
        <G y={SCENE.ovalY}>{pit}</G>
      </Svg>
    </View>
  );

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc2, i) => ({ key: String(i), name: sc2.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const promptBlock = (
    <View style={styles.prompt}>
      <RichText text={promptRef.current} style={styles.promptTxt} boldStyle={styles.promptBold} />
      <Text style={styles.hintTxt}>{hintRef.current}</Text>
    </View>
  );
  const judge = phase === 'idle' ? (
    <View style={styles.judgeWrap}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.key} style={[styles.judgeBtn, o.alt && styles.judgeBtnAlt]} activeOpacity={0.85} onPress={() => choose(o.key)}>
          <Text style={styles.judgeTxt}>{o.title}</Text>
          <Text style={styles.judgeSub}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  ) : null;
  const legend = (
    <View style={styles.legend}>
      {([['You — the batters', CK.orange], ['Their fielders (labeled)', CK.def], ['Their keeper', CK.keeper]] as [string, string][]).map(([l, c]) => (
        <View key={l} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{l}</Text></View>
      ))}
      <Text style={styles.legendTeal}>green wedge = safe single · lit sector = open rope</Text>
    </View>
  );
  const o = chosen ? s.opts[chosen] : null;
  const verdict = phase === 'done' && o ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, o.k === 'good' ? styles.vtagGood : o.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>{gradeTag(o.k)}</Text>
      <Text style={styles.vtitle}>{o.t}</Text>
      <Text style={styles.vbody}>{o.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const subLine = phase !== 'done' ? <RichText text={SUB} style={styles.foot} boldStyle={styles.footBold} /> : null;
  const footLine = <Text style={styles.foot}>{FOOT}</Text>;
  const resetBtn = <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => resetTo(idx)}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = phase === 'done' ? (
    <View style={styles.lsPostRow}>{resetBtn}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next ball →" onPress={nextScenario} /></View>
  ) : undefined;

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={PACE_THE_CHASE_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={scene3}
        controls={phase === 'done' ? <>{promptBlock}{verdict}{legend}{footLine}</> : <>{promptBlock}{judge}{legend}{subLine}</>}
        controlsFooter={lsFooter}
      />
    );
  }
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {scene3}
      {legend}
      {promptBlock}
      {phase === 'done' ? verdict : judge}
      {phase === 'done' && (
        <View style={styles.postRow}>{resetBtn}<NextButton visible variant="filled" label="Next ball →" onPress={nextScenario} /></View>
      )}
      {subLine}
      {footLine}
    </ScrollView>
  );
}

// The chase board: four LED cells that carry the two gauges, flipping to the outcome + the
// re-done arithmetic once the ball is played. The board IS the decision, so it gets the big paint.
function LedBoard({ scene, s }: { scene: Scene; s: PTCScenario }) {
  const bx = 20, by = 6, bw = 640, bh = 64;
  const frame = (
    <>
      <Rect x={bx + 60} y={by + bh} width={6} height={22} fill="#3a3a3a" />
      <Rect x={bx + bw - 66} y={by + bh} width={6} height={22} fill="#3a3a3a" />
      <Rect x={bx} y={by} width={bw} height={bh} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />
    </>
  );
  if (scene.board.mode === 'msg') {
    const { state, msg, sub } = scene.board;
    const screen = state === 'good' ? '#0a2a1c' : state === 'ok' ? '#2a2210' : '#2a0e0e';
    const color = state === 'good' ? '#3ff0a8' : state === 'ok' ? '#ffd23f' : '#ff6a6a';
    return (
      <G>
        {frame}
        <Rect x={bx + 8} y={by + 7} width={bw - 16} height={bh - 14} rx={4} fill={screen} />
        <SvgText x={bx + bw / 2} y={by + 36} textAnchor="middle" fontFamily={F_LED} fontSize={msg.length > 13 ? 27 : 36} fontWeight="800" fill={color} letterSpacing={2}>{msg}</SvgText>
        <SvgText x={bx + bw / 2} y={by + 54} textAnchor="middle" fontFamily={F_LED} fontSize={9} fontWeight="700" fill="#e8edf5" letterSpacing={1.5}>{sub}</SvgText>
      </G>
    );
  }
  return (
    <G>
      {frame}
      {s.board.map((c, i) => {
        const cx0 = bx + 8 + i * 157, cw = 150, cx = cx0 + cw / 2;
        const fs = c.val.length > 14 ? 9.5 : c.val.length > 9 ? 12 : 15;
        return (
          <G key={i}>
            <Rect x={cx0} y={by + 7} width={cw} height={bh - 14} rx={4} fill={c.warn ? '#2a0e0e' : i === 0 ? '#1c1808' : '#0c1016'} />
            <SvgText x={cx} y={by + 18} textAnchor="middle" fontFamily={F_LED} fontSize={8} fontWeight="800" fill="#5a6b7a" letterSpacing={1}>{c.cap}</SvgText>
            <SvgText x={cx} y={by + 45} textAnchor="middle" fontFamily={F_LED} fontSize={fs} fontWeight="800" fill={c.warn ? '#ff6a6a' : i === 0 ? '#ffd23f' : '#e8edf5'} letterSpacing={fs < 12 ? 0.5 : 1}>{c.val}</SvgText>
          </G>
        );
      })}
    </G>
  );
}

// Burst / celebration, progress-driven off the timeline clock (SMIL doesn't port to react-native-svg).
function FxEl({ fx, clock }: { fx: Fx; clock: number }) {
  const prog = Math.min(1, Math.max(0, (clock - fx.born) / 600));
  if (prog >= 1) return null;
  if (fx.kind === 'burst') {
    return <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={8 + 18 * prog} fill="none" stroke={fx.color} strokeWidth={3} opacity={0.9 * (1 - prog)} />;
  }
  const sparks: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = 12 + 20 * prog;
    sparks.push(<Circle key={i} cx={fx.pos[0] + Math.cos(a) * d} cy={fx.pos[1] + Math.sin(a) * d} r={3} fill={CK.goodSpark} opacity={Math.max(0, 1 - prog * 1.15)} />);
  }
  return (
    <G>
      <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={14 + 22 * prog} fill="none" stroke={CK.good} strokeWidth={4} opacity={0.95 * (1 - prog)} />
      {sparks}
    </G>
  );
}

function RichText({ text, style, boldStyle }: { text: string; style: object; boldStyle: object }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 === 1 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  sceneWrap: { borderRadius: 14, overflow: 'hidden' },
  svg: { width: '100%', aspectRatio: PACE_THE_CHASE_RATIO, backgroundColor: CK.pitchD },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptBold: { color: AMBER, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 11.5, marginTop: 6 },
  judgeWrap: { gap: 8 },
  judgeBtn: { backgroundColor: FE.orange, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  judgeBtnAlt: { backgroundColor: '#0d1b3e' },
  judgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTeal: { color: TEAL, fontSize: 11, fontWeight: '700' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: OK_BG, color: OK_C },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 17, opacity: 0.85 },
  footBold: { color: t.textPrimary, fontWeight: '800' },
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
