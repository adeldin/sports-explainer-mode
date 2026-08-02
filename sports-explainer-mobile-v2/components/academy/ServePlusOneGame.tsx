import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Path, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { TennisCourt, TENNIS_COURT_RATIO } from './fields/TennisCourt';
import {
  SCENARIOS, OPTIONS, NARRATION, HINT_IDLE, HINT_DONE, PROMPT_DONE, SUB, FOOT,
  gradeColor, gradeTag, isHeroMiss, counterBack,
  type SP1Option, type SP1Scenario, type GradeKind, type P, type Depth,
} from '../../lib/servePlusOne';

// Serve +1 — the third-shot module. The return arrives, everything freezes, and the read is the
// returner's RECOVERY TRAIL (static fading dots, oldest→newest): a MOVING man gets hit behind, a
// PARKED man gets space or a reset. On choose the read captions fade so the outcome owns the court;
// the two hero balls that MISS (netted / sailed) get their CAUSE drawn — a cause line plus the
// return-landing mark pulsing red — and the reset flies a taller arc with a "high & heavy — margin"
// apex caption so the three options never look like the same swing. Board-less, so it renders the
// shared 680×420 TennisCourt at TENNIS_COURT_RATIO. Copy/scenarios/reads are lib data (verbatim).
const F_BOLD = 'SpaceGrotesk_700Bold';
const OUTLINE = '#132743';
const TEAL = '#14B8A6', RED = '#e24b4a', AMBER = '#F5A623';
const BALL_Y = '#D9E840', BALL_EDGE = '#98A61E';
const CHALK = '#F4F4EE', SOFT = '#dfe5f0';
const OK_BG = '#fef3e2', OK_C = '#8a5a1c';
const GHOST_DELAY = 550;              // owner-driven reveal beat — do not change
const CAP_DIM = 0.25;                 // the reads did their job: captions fade on choose
const YOU_C = FE.orange, OPP_C = '#3B6FE0';

const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const clampLblX = (x: number, txt: string) => Math.max(14 + txt.length * 2.9, Math.min(666 - txt.length * 2.9, x));
// Quadratic path bowed perpendicular to travel (the spike's pathLine/shot geometry).
const qCtrl = (from: P, to: P, bow: number): P => {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
  return [mx - (dy / len) * bow, my + (dx / len) * bow];
};
const qPathD = (from: P, to: P, bow: number): string => {
  const c = qCtrl(from, to, bow);
  return `M${from[0]} ${from[1]} Q${c[0]} ${c[1]} ${to[0]} ${to[1]}`;
};
const bezAt = (from: P, to: P, bow: number, k: number): P => {
  const c = qCtrl(from, to, bow), mk = 1 - k;
  return [mk * mk * from[0] + 2 * mk * k * c[0] + k * k * to[0], mk * mk * from[1] + 2 * mk * k * c[1] + k * k * to[1]];
};

// ── scene model (mutable ref; one bump/frame re-renders the SVG) ──
interface SceneLabel { x: number; y: number; txt: string; fill: string; size: number }
interface ScenePath { d: string; color: string; op: number }
interface Fx { kind: 'burst' | 'celebrate' | 'markPulse'; pos: P; color: string; born: number }
interface Scene {
  you: P; opp: P; ball: { p: P; s: number } | null;
  staticTrail: { p: P; op: number; color: string }[];   // the recovery trail — the core read
  trail: { p: P; born: number; color: string }[];       // live motion dots
  paths: ScenePath[];
  labels: SceneLabel[];      // outcome labels (always bright)
  caps: SceneLabel[];        // read captions (fade on choose)
  capDim: number;
  mark: { p: P } | null;
  markLbl: SceneLabel | null;
  ghost: { p: P; txt: string } | null;
  redX: P | null;
  fx: Fx[];
}
const freshScene = (): Scene => ({
  you: [0, 0], opp: [0, 0], ball: null, staticTrail: [], trail: [], paths: [],
  labels: [], caps: [], capDim: 1, mark: null, markLbl: null, ghost: null, redX: null, fx: [],
});

// ── timeline harness (per-module copy — single rafRef owner, per the port standard) ──
type TAnim = { at: number; d: number; f: (k: number, e: number) => void };
type TEv = { at: number; f: () => void };
type Phase = 'intro' | 'ready' | 'run' | 'done';

// The explanation key rides UNDER the field, not at the bottom of the controls scroll: this field is
// WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved ALWAYS
// (~42pt, two compact rows at the field width) so the art size never jumps between states, and the
// height it frees is real height back in the controls column.
const LS_LEGEND_RESERVE = 42;

export default function ServePlusOneGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<SP1Option | null>(null);
  const [, setTick] = useState(0);
  const sceneRef = useRef<Scene>(freshScene());
  const promptRef = useRef<string>(SCENARIOS[0].intro);
  const hintRef = useRef<string>(HINT_IDLE);
  const clockRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);                 // generation guard: a stale frame can never write
  const phaseRef = useRef<Phase>('intro');
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
      if (gen !== genRef.current) return;               // stale generation — drop the frame
      if (t0 == null) t0 = now;
      const e = now - t0;
      clockRef.current = e;
      evs.forEach(ev => { if (!fired.has(ev) && e >= ev.at) { fired.add(ev); ev.f(); } });
      anims.forEach(a => {
        if (e >= a.at && !ended.has(a)) {
          const k = Math.min(1, (e - a.at) / a.d);
          a.f(k, e - a.at);
          if (k >= 1) ended.add(a);
        }
      });
      bump();
      if (e >= total) { rafRef.current = null; return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── choreography vocabulary (writes into sceneRef) ──
  const sc = () => sceneRef.current;
  const addPath = (from: P, to: P, bow: number, color: string, op: number) =>
    sc().paths.push({ d: qPathD(from, to, bow), color, op });
  const addLabel = (x: number, y: number, txt: string, fill: string, size: number) =>
    sc().labels.push({ x: clampLblX(x, txt), y, txt, fill, size });
  const addCap = (x: number, y: number, txt: string, fill: string, size: number) =>
    sc().caps.push({ x: clampLblX(x, txt), y, txt, fill, size });
  const burstAt = (pos: P, color: string) => sc().fx.push({ kind: 'burst', pos, color, born: clockRef.current });
  const celebrateAt = (pos: P) => sc().fx.push({ kind: 'celebrate', pos, color: '#16a37f', born: clockRef.current });
  const mkBallShot = (at: number, from: P, to: P, d: number, bow: number, loft: number): TAnim =>
    ({ at, d, f: (k) => { sc().ball = { p: bezAt(from, to, bow, k), s: 1 + loft * Math.sin(Math.PI * k) }; } });
  const mkMove = (at: number, who: 'you' | 'opp', from: P, to: P, d: number): TAnim =>
    ({ at, d, f: (k) => { sc()[who] = lerpP(from, to, k); } });
  const mkMoveTrail = (at: number, who: 'you' | 'opp', from: P, to: P, d: number, color: string): TAnim => {
    let lastDrop = -1000;
    return {
      at, d, f: (k, e) => {
        const p = lerpP(from, to, k);
        sc()[who] = p;
        if (e - lastDrop > 80) { lastDrop = e; sc().trail.push({ p, born: clockRef.current, color }); }
      },
    };
  };

  // ── intro: the return arcs in and dies at your contact point; everything freezes ──
  const runIntro = (i: number) => {
    const scn = SCENARIOS[i];
    sceneRef.current = freshScene();
    promptRef.current = scn.intro;
    hintRef.current = HINT_IDLE;
    setChosen(null);
    setPhase('intro');
    const scene = sceneRef.current;
    const oppPos: P = scn.trailYou ? [586, 204] : scn.trail[scn.trail.length - 1];
    scene.you = scn.you0;
    scene.opp = oppPos;
    // the static recovery trail: oldest dots faintest, newest brightest (the read)
    const trailColor = scn.trailYou ? YOU_C : OPP_C;
    const n = Math.max(1, scn.trail.length - 1);
    scn.trail.forEach((p, ti) => scene.staticTrail.push({ p, op: 0.14 + 0.4 * (ti / n), color: trailColor }));
    addCap(scn.trail[0][0], scn.trail[0][1] - 14, scn.trailLbl, '#bcd3ff', 9.5);
    if (scn.mark) {
      scene.mark = { p: scn.mark.p };
      scene.markLbl = { x: clampLblX(scn.mark.p[0] + 148, scn.mark.lbl), y: scn.mark.p[1] + 26, txt: scn.mark.lbl, fill: SOFT, size: 9.5 };
    }
    const retFrom: P = scn.trailYou ? [560, 208] : scn.trail[scn.trail.length - 1];
    scene.ball = { p: retFrom, s: 1 };
    addPath(retFrom, scn.cp, 26, SOFT, 0.35);
    const anims: TAnim[] = [mkBallShot(0, retFrom, scn.cp, 1000, 26, 0.35)];
    const evs: TEv[] = [{
      at: 1000, f: () => { addCap(scn.cp[0] + 4, scn.cp[1] + 26, 'ball 3 — your call', '#ffe1b3', 10); setPhase('ready'); },
    }];
    runTimeline(anims, evs, 1120);
  };
  useEffect(() => { runIntro(0); /* mount */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectScenario = (i: number) => { setIdx(i); runIntro(i); };
  const resetScenario = () => runIntro(idx);
  const nextScenario = () => selectScenario((idx + 1) % SCENARIOS.length);

  // ── choose: compile the spike's storyline for (scenario, option) into one timeline ──
  const choose = (opt: SP1Option) => {
    if (phaseRef.current !== 'ready') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt);
    setPhase('run');
    const scn = s, g = scn.grade[opt], col = gradeColor(g.k), E = g.end;
    sc().capDim = CAP_DIM;                        // the reads did their job — fade them
    const anims: TAnim[] = [];
    const evs: TEv[] = [];
    const ev = (at: number, f: () => void) => evs.push({ at, f });
    let finAt = 0; let ghostAt: number | null = null;
    const fin = (at: number) => { finAt = at; ev(at, () => showVerdict()); };
    // the reveal: a dashed teal ring where the BETTER +1 finished (never just a red X)
    const ghost = (at: number) => {
      ghostAt = at + GHOST_DELAY;
      ev(at + GHOST_DELAY, () => {
        const bestKey = (Object.keys(scn.grade) as SP1Option[]).find(k => scn.grade[k].k === 'good');
        if (!bestKey) return;
        const bp = scn.grade[bestKey].end.ball;
        sc().ghost = { p: bp, txt: 'the better +1 was here' };
      });
    };
    promptRef.current = NARRATION[opt];

    if (isHeroMiss(idx, opt)) {
      // the hero swing that MISSES — and its CAUSE gets drawn, not just a red X
      if (g.causePrompt) promptRef.current = g.causePrompt;
      ev(0, () => addPath(scn.cp, E.ball, 16, '#ffb3ae', 0.5));
      anims.push(mkBallShot(0, scn.cp, E.ball, 600, 16, 0.15));
      ev(600, () => { sc().redX = E.ball; addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11); });
      ev(900, () => {
        if (g.cause && g.causeAt) addLabel(g.causeAt[0], g.causeAt[1], g.cause, '#ffb3ae', 9.5);
        // the return-landing mark pulses red: THAT ball is why this swing was uphill
        if (scn.mark) sc().fx.push({ kind: 'markPulse', pos: scn.mark.p, color: RED, born: clockRef.current });
      });
      anims.push(mkMove(600, 'you', sc().you, E.you, 400));
      ghost(600); fin(1700);
    } else {
      const b3: P = g.via ?? E.ball;                      // where ball three itself lands
      const bow = opt === 'reset' ? 48 : 22;              // a reset is HIGH and heavy — show the height
      const flight = idx === 3 && opt === 'reset' ? 900 : 650;
      ev(0, () => addPath(scn.cp, b3, bow, CHALK, 0.4));
      if (opt === 'reset') {
        const apex: P = [(scn.cp[0] + b3[0]) / 2, Math.min(scn.cp[1], b3[1]) - bow - 6];
        ev(250, () => addLabel(apex[0], apex[1], 'high & heavy — margin', SOFT, 9.5));
      }
      anims.push(mkBallShot(0, scn.cp, b3, flight, bow, opt === 'reset' ? 0.5 : 0.2));
      if (g.k === 'bad') {
        // he reads it off your racquet — moving while the ball is still in the air
        promptRef.current = '<b>He read it off your strings…</b>';
        anims.push(mkMoveTrail(0, 'opp', sc().opp, E.opp, idx === 1 ? 420 : idx === 0 ? 300 : 520, OPP_C));
        anims.push(mkMove(0, 'you', sc().you, E.you, 650));
      }
      if (g.k === 'good') {
        if (!(idx === 3 && opt === 'reset')) anims.push(mkMove(flight, 'you', sc().you, E.you, 600));
        if (opt === 'behind') {
          // he sprints on PAST the ball, plants, reverses — and loses the race
          anims.push(mkMoveTrail(flight, 'opp', sc().opp, [596, 208], 320, OPP_C));
          ev(flight + 320, () => addLabel(600, 232, 'plants — reverses', '#bcd3ff', 9.5));
          anims.push(mkMoveTrail(flight + 320, 'opp', [596, 208], E.opp, 480, OPP_C));
          ev(flight + 800, () => { celebrateAt(E.ball); addLabel(E.lab[0], E.lab[1], E.lab[2], '#bfe9da', 12); });
          fin(flight + 800);
        } else if (opt === 'open') {
          anims.push(mkMoveTrail(flight, 'opp', sc().opp, E.opp, 700, OPP_C));
          ev(flight + 700, () => { celebrateAt(E.ball); addLabel(E.lab[0], E.lab[1], E.lab[2], '#bfe9da', 12); });
          fin(flight + 700);
        } else {
          anims.push(mkMove(flight, 'opp', sc().opp, E.opp, 600));
          if (idx === 3) anims.push(mkMoveTrail(flight, 'you', sc().you, E.you, 800, YOU_C));
          ev(flight + 600, () => { burstAt(E.ball, col); addLabel(E.lab[0], E.lab[1], E.lab[2], '#bfe9da', 11); });
          fin(flight + 600);
        }
      } else if (g.k === 'bad') {
        // he was already there when it landed — and the counter comes back
        const back = counterBack(idx);
        ev(flight, () => { promptRef.current = '<b>He beat the ball there…</b>'; addPath(E.opp, back, 18, '#ffb3ae', 0.5); });
        anims.push(mkBallShot(flight, E.opp, back, 700, 18, 0.2));
        ev(flight + 700, () => {
          burstAt(back, RED);
          addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11);
          addLabel(back[0] + 14, back[1] - 16, 'into YOUR open court', '#ffb3ae', 10);
        });
        ghost(flight + 700); fin(flight + 700);
      } else {
        anims.push(mkMove(flight, 'opp', sc().opp, E.opp, 600));
        if (idx !== 3) anims.push(mkMove(flight, 'you', sc().you, E.you, 600));
        if (idx === 3) {
          // his firm reply sends you running again
          ev(flight + 600, () => addPath(E.opp, E.ball, 20, '#ffe1b3', 0.45));
          anims.push(mkBallShot(flight + 600, E.opp, E.ball, 650, 20, 0.25));
          ev(flight + 1250, () => { burstAt(E.ball, AMBER); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffe1b3', 11); });
          anims.push(mkMoveTrail(flight + 1250, 'you', sc().you, E.you, 500, YOU_C));
          ghost(flight + 1250); fin(flight + 1750);
        } else {
          ev(flight + 600, () => { burstAt(E.ball, AMBER); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffe1b3', 11); });
          ghost(flight + 600); fin(flight + 600);
        }
      }
    }
    const total = Math.max(finAt + 460, (ghostAt ?? 0) + 100) + 750;
    runTimeline(anims, evs, total);
  };

  const showVerdict = () => {
    setPhase('done');
    promptRef.current = PROMPT_DONE;
    hintRef.current = HINT_DONE;
  };

  // ── SVG scene (spike z-order: court → zones → paths → trail → opp → you → ball → fx → labels) ──
  const scene = sceneRef.current;
  const clock = clockRef.current;
  const els: ReactNode[] = [];
  if (scene.mark) {
    els.push(<Circle key="markR" cx={scene.mark.p[0]} cy={scene.mark.p[1]} r={5} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.8} />);
    els.push(<Line key="markL" x1={scene.mark.p[0] + 6} y1={scene.mark.p[1] + 4} x2={scene.mark.p[0] + 92} y2={scene.mark.p[1] + 20} stroke={SOFT} strokeWidth={1} opacity={0.5} />);
  }
  if (scene.ghost) {
    els.push(<Circle key="ghost" cx={scene.ghost.p[0]} cy={scene.ghost.p[1]} r={17} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />);
  }
  scene.paths.forEach((p, i) => els.push(<Path key={`p${i}`} d={p.d} fill="none" stroke={p.color} strokeWidth={2} opacity={p.op} strokeDasharray="5 6" />));
  // the RECOVERY TRAIL — the core read of this module
  scene.staticTrail.forEach((d, i) => els.push(<Circle key={`st${i}`} cx={d.p[0]} cy={d.p[1]} r={4} fill={d.color} opacity={d.op} />));
  scene.trail.forEach((d, i) => {
    const op = 0.5 * Math.max(0, 1 - (clock - d.born) / 1600);
    if (op > 0.02) els.push(<Circle key={`tr${i}`} cx={d.p[0]} cy={d.p[1]} r={3.5} fill={d.color} opacity={op} />);
  });
  els.push(<Circle key="opp" cx={scene.opp[0]} cy={scene.opp[1]} r={11} fill={OPP_C} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="oppL" x={scene.opp[0]} y={scene.opp[1] - 16} txt="returner" fill="#bcd3ff" size={10.5} />);
  els.push(<Circle key="you" cx={scene.you[0]} cy={scene.you[1]} r={11} fill={YOU_C} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="youL" x={scene.you[0]} y={scene.you[1] - 16} txt="YOU" fill="#fff" size={10.5} />);
  if (scene.ball) els.push(<TennisBall key="ball" p={scene.ball.p} s={scene.ball.s} />);
  if (scene.redX) {
    const [x, y] = scene.redX;
    els.push(<Path key="redX" d={`M${x - 8} ${y - 8} L${x + 8} ${y + 8} M${x + 8} ${y - 8} L${x - 8} ${y + 8}`} stroke={RED} strokeWidth={3.5} strokeLinecap="round" fill="none" />);
  }
  scene.fx.forEach((fx, i) => els.push(<FxEl key={`fx${i}`} fx={fx} clock={clock} />));
  if (scene.markLbl) els.push(<OutlinedLabel key="markT" {...scene.markLbl} />);
  scene.caps.forEach((l, i) => (
    els.push(<G key={`cap${i}`} opacity={scene.capDim}><OutlinedLabel x={l.x} y={l.y} txt={l.txt} fill={l.fill} size={l.size} /></G>)
  ));
  scene.labels.forEach((l, i) => els.push(<OutlinedLabel key={`lbl${i}`} x={l.x} y={l.y} txt={l.txt} fill={l.fill} size={l.size} />));

  const field = <TennisCourt surface="hard">{els}</TennisCourt>;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc2, i) => ({ key: String(i), name: sc2.tab }))} currentKey={String(idx)} onSelect={k => selectScenario(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.chips.map((c, i) => <View key={i} style={styles.chip}><RichText text={c} style={styles.chipTxt} boldStyle={styles.chipVal} /></View>)}
    </View>
  );
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <RichText text={promptRef.current} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{hintRef.current}</Text>
    </View>
  );
  const ready = phase === 'ready';
  const judge = (
    <View style={styles.judgeWrap}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.key} style={[styles.judgeBtn, !ready && styles.judgeBtnOff, landscape && styles.judgeBtnLs]}
          disabled={!ready} activeOpacity={0.85} onPress={() => choose(o.key)}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{o.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['You (served)', YOU_C], ['Returner', OPP_C]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
      <Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>● fading dots = his recovery trail</Text>
      <Text style={styles.legendTeal}>dashed teal ring = the better +1</Text>
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  const g = chosen ? s.grade[chosen] : null;
  const verdict = phase === 'done' && g ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, g.k === 'good' ? styles.vtagGood : g.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>{gradeTag(g.k)}</Text>
      <Text style={styles.vtitle}>{g.t}</Text>
      <Text style={styles.vbody}>{g.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const subLine = phase !== 'done' ? <RichText text={SUB} style={styles.foot} boldStyle={styles.footBold} /> : null;
  const footLine = <Text style={styles.foot}>{FOOT}</Text>;
  const resetBtn = <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetScenario}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = phase === 'done' ? (
    <View style={styles.lsPostRow}>{resetBtn}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next +1 →" onPress={nextScenario} /></View>
  ) : undefined;

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={TENNIS_COURT_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={pills}
        field={field}
        belowField={lsLegendUnder}
        controls={phase === 'done' ? <>{verdict}{footLine}</> : <>{hudChips}{promptBlock}{judge}{subLine}</>}
        controlsFooter={lsFooter}
      />
    );
  }
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {field}
      {legend}
      {promptBlock}
      {phase === 'done' ? verdict : judge}
      {phase === 'done' && (
        <View style={styles.postRow}>{resetBtn}<NextButton visible variant="filled" label="Next +1 →" onPress={nextScenario} /></View>
      )}
      {subLine}
      {footLine}
    </ScrollView>
  );
}

// ── small scene pieces ──
// Label with a dark outline (the spike's paint-order:stroke): outline pass first, fill pass on top.
function OutlinedLabel({ x, y, txt, fill, size }: { x: number; y: number; txt: string; fill: string; size: number }) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={OUTLINE} strokeWidth={3.5} strokeLinejoin="round">{txt}</SvgText>
      <SvgText {...common} fill={fill}>{txt}</SvgText>
    </>
  );
}

// The tennis ball: optic yellow with seam curves; s = scale (lofted shots swell mid-flight).
function TennisBall({ p, s }: { p: P; s: number }) {
  return (
    <G x={p[0]} y={p[1]} scale={s}>
      <Circle cx={0} cy={0} r={5} fill={BALL_Y} stroke={BALL_EDGE} strokeWidth={1} />
      <Path d="M-4 -2.4 Q0 0 -4 2.4" fill="none" stroke="#fff" strokeWidth={1} />
      <Path d="M4 -2.4 Q0 0 4 2.4" fill="none" stroke="#fff" strokeWidth={1} />
    </G>
  );
}

// Burst / celebration / mark-pulse, progress-driven off the timeline clock (SMIL doesn't port).
function FxEl({ fx, clock }: { fx: Fx; clock: number }) {
  if (fx.kind === 'markPulse') {
    const prog = Math.min(1, Math.max(0, (clock - fx.born) / 800));
    if (prog >= 1) return null;
    return <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={6 + 14 * prog} fill="none" stroke={fx.color} strokeWidth={2.5} opacity={0.9 * (1 - prog)} />;
  }
  const prog = Math.min(1, Math.max(0, (clock - fx.born) / 600));
  if (fx.kind === 'burst') {
    if (prog >= 1) return null;
    return <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={8 + 18 * prog} fill="none" stroke={fx.color} strokeWidth={3} opacity={0.9 * (1 - prog)} />;
  }
  const p2 = Math.min(1, Math.max(0, (prog - 0.14) / 0.86));
  const sparks: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = 26 * prog;
    const op = prog < 0.7 ? 1 : Math.max(0, 1 - (prog - 0.7) / 0.3);
    sparks.push(<Circle key={i} cx={fx.pos[0] + Math.cos(a) * d} cy={fx.pos[1] + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={op} />);
  }
  return (
    <G>
      {prog < 1 && <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={2.8 + 23.8 * prog} fill="none" stroke="#16a37f" strokeWidth={4} opacity={0.95 * (1 - prog)} />}
      {p2 < 1 && <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={2.8 + 23.8 * p2} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />}
      {sparks}
    </G>
  );
}

// Copy keeps the spike's <b>…</b> emphasis markers; render them as bold spans.
function RichText({ text, style, boldStyle }: { text: string; style: object; boldStyle: object }) {
  const parts = text.split(/<\/?b>/);
  return (
    <Text style={style}>
      {parts.map((p, i) => (i % 2 === 1 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}
    </Text>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipVal: { color: t.accentText, fontWeight: '800' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: AMBER, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 11.5, marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeWrap: { gap: 8 },
  judgeBtn: { backgroundColor: FE.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  legendTeal: { color: TEAL, fontSize: 11, fontWeight: '700' },
  lsLegendUnder: { minHeight: LS_LEGEND_RESERVE, paddingTop: 4, justifyContent: 'center' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtagOk: { backgroundColor: OK_BG, color: OK_C },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 17, opacity: 0.85 },
  footBold: { color: t.textPrimary, fontWeight: '800' },
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
