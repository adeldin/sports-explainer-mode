import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Rect, Line, Circle, Path, Polygon, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { TennisCanvas, TennisCourtPaint } from './fields/TennisCourt';
import { SCENARIOS, gradeColor, gradeTag, type AOSOption, type AOSScenario, type GradeKind, type P, type Depth } from '../../lib/approachOrStay';

// Approach or Stay? — tennis short-ball judgment module. The incoming short ball arrives (with the
// contact-height chip — the rookie tell), you pick approach line / approach cross / stay / drop, the
// storyline animates the consequence, the LED board flips the score, and the reveal draws the right
// SEQUENCE (the teal road + the "…then stand here" ghost ring — never just a landing spot). This
// module has an LED BOARD, so it draws its OWN scene (680×494: board strip + court group at y=74)
// and its own ratio, per the landscape port standard. Copy/scenarios/reads are lib data (verbatim).
const SCENE_W = 680, SCENE_H = 494, COURT_Y = 74;
export const AOS_SCENE_RATIO = SCENE_W / SCENE_H;
const F_BOLD = 'SpaceGrotesk_700Bold';
const LED_FONT = 'Courier New';
const OUTLINE = '#132743';
const TEAL = '#14B8A6', RED = '#e24b4a', AMBER = '#F5A623';
const BALL_Y = '#D9E840', BALL_EDGE = '#98A61E';
const OK_BG = '#fef3e2', OK_C = '#8a5a1c';
const GHOST_DELAY = 550;              // owner-driven reveal beat — do not change
const HINT_IDLE = 'Contact height + real depth + where he’s standing.';
const HINT_DONE = 'Reset, or take another short ball.';

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
interface Fx { kind: 'burst' | 'celebrate'; pos: P; color: string; born: number }
interface Scene {
  you: P; opp: P; ball: { p: P; s: number } | null;
  oppTag: SceneLabel | null;
  chip: boolean;
  paths: ScenePath[];
  redLanes: { a: P; b: P }[];
  ghostRing: { p: P } | null;
  trail: { p: P; born: number }[];
  labels: SceneLabel[];
  fx: Fx[];
  board: { mode: 'score' } | { mode: 'msg'; state: GradeKind; msg: string; npt: string | null };
  boardDim: number;
}
const freshScene = (s: AOSScenario): Scene => ({
  you: s.you0, opp: s.opp0, ball: null, oppTag: null, chip: false,
  paths: [], redLanes: [], ghostRing: null, trail: [], labels: [], fx: [],
  board: { mode: 'score' }, boardDim: 1,
});

// ── timeline harness (per-module copy — single rafRef owner, per the port standard) ──
type TAnim = { at: number; d: number; f: (k: number, e: number) => void };
type TEv = { at: number; f: () => void };

type Phase = 'intro' | 'ready' | 'run' | 'done';

export default function ApproachOrStayGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<AOSOption | null>(null);
  const [, setTick] = useState(0);
  const sceneRef = useRef<Scene>(freshScene(SCENARIOS[0]));
  const promptRef = useRef<string>(SCENARIOS[0].intro);
  const hintRef = useRef<string>(HINT_IDLE);
  const clockRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const bump = () => setTick(t => (t + 1) % 1000000);
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const runTimeline = (anims: TAnim[], evs: TEv[], total: number) => {
    stopLoop();
    const fired = new Set<TEv>(); const ended = new Set<TAnim>();
    let t0: number | null = null;
    const loop = (now: number) => {
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

  // ── choreography vocabulary (writes into sceneRef; all froms known at compile time) ──
  const sc = () => sceneRef.current;
  const addPath = (from: P, to: P, bow: number, color: string, op: number) =>
    sc().paths.push({ d: qPathD(from, to, bow), color, op });
  const addLabel = (x: number, y: number, txt: string, fill: string, size: number) =>
    sc().labels.push({ x: clampLblX(x, txt), y, txt, fill, size });
  const burstAt = (pos: P, color: string) => sc().fx.push({ kind: 'burst', pos, color, born: clockRef.current });
  const celebrateAt = (pos: P) => sc().fx.push({ kind: 'celebrate', pos, color: '#16a37f', born: clockRef.current });
  const mkBallShot = (at: number, from: P, to: P, d: number, bow: number, loft: number): TAnim =>
    ({ at, d, f: (k) => { sc().ball = { p: bezAt(from, to, bow, k), s: 1 + loft * Math.sin(Math.PI * k) }; } });
  const mkMove = (at: number, who: 'you' | 'opp', from: P, to: P, d: number): TAnim =>
    ({ at, d, f: (k) => { sc()[who] = lerpP(from, to, k); } });
  const mkMoveTrail = (at: number, from: P, to: P, d: number): TAnim => {
    let lastDrop = -100;
    return {
      at, d, f: (k, e) => {
        const p = lerpP(from, to, k);
        sc().opp = p;
        if (e - lastDrop > 80) { lastDrop = e; sc().trail.push({ p, born: clockRef.current }); }
      },
    };
  };
  // The reveal: right SEQUENCE ghost — the teal road + the "…then stand here" ring (owner-reviewed).
  const drawRightCall = (scn: AOSScenario) => {
    const r = scn.right;
    if (r.path) {
      addPath(r.path[0], r.path[1], r.arc ?? 24, TEAL, 0.55);
      if (r.plab) addLabel(r.plab[0], r.plab[1], r.plab[2], '#8fe6d4', 10);
    }
    if (r.you) {
      sc().ghostRing = { p: r.you };
      addLabel(r.you[0], r.you[1] + 34, r.ylab ?? '…then stand here', '#8fe6d4', 10);
    }
  };

  const showV = (opt: AOSOption) => {
    setPhase('done');
    promptRef.current = 'Height, depth, his feet — <b>three checks, one call.</b>';
    hintRef.current = HINT_DONE;
  };

  // ── intro: the incoming short ball arcs in and dies at your contact point ──
  const runIntro = (i: number) => {
    const scn = SCENARIOS[i];
    sceneRef.current = freshScene(scn);
    promptRef.current = scn.intro;
    hintRef.current = HINT_IDLE;
    setChosen(null);
    setPhase('intro');
    const scene = sceneRef.current;
    scene.oppTag = { x: clampLblX(scn.opp0[0], scn.oppLab), y: scn.opp0[1] + 30, txt: scn.oppLab, fill: '#bcd3ff', size: 9.5 };
    const ballFrom: P = [scn.opp0[0] - 14, scn.opp0[1] + 8];
    scene.ball = { p: ballFrom, s: 1 };
    addPath(ballFrom, scn.cp, 24, '#dfe5f0', 0.35);
    const anims: TAnim[] = [
      mkBallShot(0, ballFrom, scn.cp, 1100, 24, 0.3),
      mkMove(0, 'you', scn.you0, [scn.cp[0] - 14, scn.cp[1] + 16], 1050),
    ];
    const evs: TEv[] = [{ at: 1100, f: () => { sc().chip = true; setPhase('ready'); } }];
    runTimeline(anims, evs, 1200);
  };
  useEffect(() => { runIntro(0); /* mount */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectScenario = (i: number) => { setIdx(i); runIntro(i); };
  const resetScenario = () => runIntro(idx);
  const nextScenario = () => selectScenario((idx + 1) % SCENARIOS.length);

  // ── choose: compile the spike's storyline for (scenario, option) into one timeline ──
  const choose = (opt: AOSOption) => {
    if (phaseRef.current !== 'ready') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt);
    setPhase('run');
    const scn = s, g = scn.grade[opt], col = gradeColor(g.k), E = g.end;
    sc().chip = false;
    sc().oppTag = null;
    const anims: TAnim[] = [];
    const evs: TEv[] = [];
    const ev = (at: number, f: () => void) => evs.push({ at, f });
    let finAt = 0; let ghostAt: number | null = null;
    // fin = LED board flip (flicker) + verdict. Board dims, swaps to the message, pulses back up.
    const fin = (at: number) => {
      finAt = at;
      ev(at, () => { sc().boardDim = 0.35; });
      ev(at + 90, () => { sc().board = { mode: 'msg', state: g.k, msg: g.bmsg, npt: g.npt ?? null }; sc().boardDim = 1; });
      ev(at + 240, () => { sc().boardDim = 0.75; });
      ev(at + 360, () => { sc().boardDim = 1; });
      ev(at, () => showV(opt));
    };
    const ghost = (at: number) => { ghostAt = at + GHOST_DELAY; ev(at + GHOST_DELAY, () => drawRightCall(scn)); };

    if (opt === 'dtl' || opt === 'cc') {
      promptRef.current = opt === 'dtl'
        ? 'You take it early, drive it <b>down the line</b>… and follow it in.'
        : 'You carve the <b>crosscourt</b>… and come in behind it.';
      if (g.k === 'bad' && scn.high === false) {
        // the low-contact approach — passed or lobbed en route (clay scenario)
        const tgt: P = opt === 'dtl' ? [548, 148] : [520, 268];
        ev(0, () => addPath(scn.cp, tgt, 26, '#F4F4EE', 0.4));
        anims.push(mkBallShot(0, scn.cp, tgt, 700, 26, 0.25));
        anims.push(mkMove(0, 'you', sc().you, E.you, 1100));
        anims.push(mkMove(700, 'opp', scn.opp0, E.opp, 420));
        ev(1120, () => {
          promptRef.current = opt === 'dtl' ? 'He saw you coming the whole way — <b>dip pass…</b>' : 'He steps around it — <b>the lob…</b>';
          if (opt === 'dtl') sc().redLanes.push({ a: E.opp, b: E.ball });
          addPath(E.opp, E.ball, opt === 'cc' ? 70 : 18, '#ffb3ae', 0.5);
        });
        anims.push(mkBallShot(1120, E.opp, E.ball, 820, opt === 'cc' ? 70 : 18, opt === 'cc' ? 0.9 : 0.2));
        ev(1940, () => { burstAt(E.ball, col); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11); });
        ghost(1940); fin(1940);
      } else {
        const approachTgt: P = opt === 'dtl'
          ? (idx === 0 ? [552, 142] : idx === 3 ? [548, 286] : idx === 4 ? [548, 146] : [548, 124])
          : (idx === 0 ? [508, 282] : idx === 1 ? [452, 296] : idx === 3 ? [508, 166] : [516, 272]);
        ev(0, () => addPath(scn.cp, approachTgt, 26, '#F4F4EE', 0.4));
        anims.push(mkBallShot(0, scn.cp, approachTgt, 680, 26, 0.25));
        if (g.k === 'good' && idx === 1) {
          // stranded wide: the angle is the winner outright
          ev(680, () => { burstAt(E.ball, TEAL); celebrateAt(E.ball); addLabel(E.lab[0], E.lab[1], E.lab[2], '#bfe9da', 12); });
          anims.push(mkMoveTrail(680, scn.opp0, E.opp, 700));
          anims.push(mkMove(680, 'you', [scn.cp[0] - 14, scn.cp[1] + 16], E.you, 500));
          fin(1180);
        } else {
          ev(680, () => { promptRef.current = 'He scrambles for it — <b>watch the race…</b>'; });
          anims.push(mkMoveTrail(680, scn.opp0, E.opp, 700));
          anims.push(mkMove(680, 'you', [scn.cp[0] - 14, scn.cp[1] + 16], E.you, 650));
          if (g.k === 'bad') {
            // his pass threads the corridor you left open
            ev(1380, () => { sc().redLanes.push({ a: E.opp, b: E.ball }); addPath(E.opp, E.ball, 18, '#ffb3ae', 0.5); });
            anims.push(mkBallShot(1380, E.opp, E.ball, 760, 18, 0.2));
            ev(2140, () => { burstAt(E.ball, RED); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11); });
            ghost(2140); fin(2140);
          } else {
            // stretched reply floats — you volley it away
            const mid: P = [E.you[0] + 22, E.you[1] - 14];
            anims.push(mkBallShot(1380, E.opp, mid, 620, 30, 0.5));
            ev(2000, () => { promptRef.current = 'Floats up — <b>volley.</b>'; });
            anims.push(mkBallShot(2000, mid, E.ball, 460, 14, 0.15));
            ev(2460, () => {
              burstAt(E.ball, col);
              if (g.k === 'good') celebrateAt(E.ball);
              addLabel(E.lab[0], E.lab[1], E.lab[2], g.k === 'good' ? '#bfe9da' : '#ffe1b3', 12);
            });
            fin(2460);
          }
        }
      }
    } else if (opt === 'stay') {
      promptRef.current = 'You let it come, and put it back <b>deep…</b>';
      // when the story is "he counters", E.ball is where HIS drive finishes (your corner) —
      // YOUR reply gets its own deep target on HIS side
      const counter = g.k === 'bad' && idx !== 4;
      const replyTgt: P = counter ? (idx === 1 ? [524, 186] : [520, 214]) : E.ball;
      ev(0, () => addPath(scn.cp, replyTgt, 30, '#F4F4EE', 0.4));
      anims.push(mkBallShot(0, scn.cp, replyTgt, 750, 30, 0.35));
      if (!counter) anims.push(mkMove(0, 'you', sc().you, E.you, 700));
      anims.push(mkMoveTrail(750, scn.opp0, E.opp, 650));
      if (counter) {
        ev(1400, () => { promptRef.current = 'He’s back in it — and now <b>he</b> steps in…'; });
        anims.push(mkMove(1400, 'you', sc().you, E.you, 700));
        const back: P = [86, idx === 3 ? 144 : 142];
        ev(1700, () => addPath(E.opp, back, 20, '#ffb3ae', 0.5));
        anims.push(mkBallShot(1700, E.opp, back, 760, 20, 0.25));
        ev(2460, () => { burstAt(back, RED); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11); });
        ghost(2460); fin(2460);
      } else if (idx === 4 && g.k === 'bad') {
        // the cost here isn't a lost point — it's the lost MOMENT. Show it:
        // he ambles over and calmly pushes you back to your own baseline.
        ev(1400, () => { burstAt(E.ball, col); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffe1b3', 11); });
        ghost(1400);
        anims.push(mkMove(1400, 'you', E.you, E.you, 600));
        ev(2000, () => { promptRef.current = 'He ambles over… and strokes it back <b>deep</b>. The grind resumes — on his terms.'; });
        anims.push(mkMoveTrail(2000, E.opp, [524, 206], 450));
        ev(2450, () => addPath([524, 206], [92, 152], 26, '#ffb3ae', 0.5));
        anims.push(mkBallShot(2450, [524, 206], [92, 152], 820, 26, 0.3));
        anims.push(mkMove(2450, 'you', E.you, [106, 162], 780));
        ev(3270, () => { burstAt([92, 152], RED); addLabel(148, 132, 'pinned back — the moment is gone', '#ffb3ae', 11); });
        fin(3270);
      } else {
        ev(1400, () => { burstAt(E.ball, col); addLabel(E.lab[0], E.lab[1], E.lab[2], g.k === 'good' ? '#bfe9da' : '#ffe1b3', 11); });
        if (g.k !== 'good') ghost(1400);
        anims.push(mkMove(1400, 'you', E.you, E.you, 600));
        fin(2000);
      }
    } else {
      // drop
      promptRef.current = 'Soft hands… the <b>drop shot</b> floats over…';
      const dropSpot: P = g.k === 'bad' ? (idx === 0 ? [348, 166] : [348, 198]) : E.ball;
      ev(0, () => addPath(scn.cp, dropSpot, 34, '#F4F4EE', 0.4));
      anims.push(mkBallShot(0, scn.cp, dropSpot, 900, 34, 0.6));
      // two little bounce pulses = the dying ball
      ev(900, () => burstAt(dropSpot, '#dfe5f0'));
      ev(1160, () => burstAt([dropSpot[0] + 7, dropSpot[1]], '#dfe5f0'));
      if (g.k === 'bad') {
        ev(900, () => { promptRef.current = 'It hung too long — <b>he’s on it…</b>'; });
        anims.push(mkMoveTrail(900, scn.opp0, E.opp, 620));
        ev(1520, () => addPath(E.opp, E.ball, 20, '#ffb3ae', 0.5));
        anims.push(mkBallShot(1520, E.opp, E.ball, 700, 20, 0.2));
        ev(2220, () => { burstAt(E.ball, RED); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11); });
        ghost(2220); fin(2220);
      } else {
        ev(900, () => { promptRef.current = 'He’s sprinting — <b>but the runway is too long…</b>'; });
        anims.push(mkMoveTrail(900, scn.opp0, E.opp, 850));
        ev(1750, () => {
          burstAt(E.ball, col);
          if (g.k === 'good') celebrateAt(E.ball);
          addLabel(E.lab[0], E.lab[1], E.lab[2], g.k === 'good' ? '#bfe9da' : '#ffe1b3', 12);
        });
        if (g.k === 'ok') ghost(1750);
        fin(1750);
      }
    }
    const total = Math.max(finAt + 460, (ghostAt ?? 0) + 100) + 750;
    runTimeline(anims, evs, total);
  };

  // ── SVG scene render (spike z-order: court → zones → paths → trail → opp → you → ball → chip → fx → labels) ──
  const scene = sceneRef.current;
  const clock = clockRef.current;
  const els: ReactNode[] = [];
  // zones: red lanes + ghost ring
  scene.redLanes.forEach((ln, i) => {
    const dx = ln.b[0] - ln.a[0], dy = ln.b[1] - ln.a[1], len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 13, ny = (dx / len) * 13;
    const pts = `${ln.a[0] + nx},${ln.a[1] + ny} ${ln.b[0] + nx},${ln.b[1] + ny} ${ln.b[0] - nx},${ln.b[1] - ny} ${ln.a[0] - nx},${ln.a[1] - ny}`;
    els.push(<Polygon key={`lane${i}`} points={pts} fill={RED} opacity={0.16} stroke={RED} strokeWidth={1.5} strokeDasharray="4 5" />);
  });
  if (scene.ghostRing) els.push(<Circle key="ghost" cx={scene.ghostRing.p[0]} cy={scene.ghostRing.p[1]} r={19} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />);
  scene.paths.forEach((p, i) => els.push(<Path key={`p${i}`} d={p.d} fill="none" stroke={p.color} strokeWidth={2} opacity={p.op} strokeDasharray="5 6" />));
  scene.trail.forEach((d, i) => {
    const age = clock - d.born;
    const op = 0.5 * Math.max(0, 1 - age / 1400);
    if (op > 0.02) els.push(<Circle key={`tr${i}`} cx={d.p[0]} cy={d.p[1]} r={3.5} fill="#3B6FE0" opacity={op} />);
  });
  // actors (opponent then you), each with its travelling label
  els.push(<Circle key="opp" cx={scene.opp[0]} cy={scene.opp[1]} r={11} fill="#3B6FE0" stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="oppL" x={scene.opp[0]} y={scene.opp[1] - 16} txt="opponent" fill="#bcd3ff" size={10.5} />);
  els.push(<Circle key="you" cx={scene.you[0]} cy={scene.you[1]} r={11} fill={FE.orange} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="youL" x={scene.you[0]} y={scene.you[1] - 16} txt="YOU" fill="#fff" size={10.5} />);
  if (scene.ball) els.push(<TennisBall key="ball" p={scene.ball.p} s={scene.ball.s} />);
  if (scene.chip) els.push(<HeightChip key="chip" cp={s.cp} high={s.high} />);
  scene.fx.forEach((fx, i) => els.push(<FxEl key={`fx${i}`} fx={fx} clock={clock} />));
  if (scene.oppTag) els.push(<OutlinedLabel key="oppTag" x={scene.oppTag.x} y={scene.oppTag.y} txt={scene.oppTag.txt} fill={scene.oppTag.fill} size={scene.oppTag.size} />);
  scene.labels.forEach((l, i) => els.push(<OutlinedLabel key={`lbl${i}`} x={l.x} y={l.y} txt={l.txt} fill={l.fill} size={l.size} />));

  const field = (
    <TennisCanvas viewW={SCENE_W} viewH={SCENE_H} bg="#3E7A4C">
      <G opacity={scene.boardDim}><LedBoard scene={scene} s={s} /></G>
      <G y={COURT_Y}>
        <TennisCourtPaint surface={s.surface} />
        {els}
      </G>
    </TennisCanvas>
  );

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc2, i) => ({ key: String(i), name: sc2.tab }))} currentKey={String(idx)} onSelect={k => selectScenario(Number(k))} />;
  const promptBlock = (
    <View style={styles.prompt}>
      <RichText text={promptRef.current} style={styles.promptTxt} boldStyle={styles.promptBold} />
      <Text style={styles.hintTxt}>{hintRef.current}</Text>
    </View>
  );
  const ready = phase === 'ready';
  const judge = (
    <View style={styles.judgeWrap}>
      {([
        ['dtl', 'Approach down the line', 'follow it in, cover the line', false],
        ['cc', 'Approach crosscourt', 'hit the angle, come in behind it', false],
        ['stay', 'Stay back', 'reset, keep the baseline', true],
        ['drop', 'Drop shot', 'make him run the runway', true],
      ] as [AOSOption, string, string, boolean][]).map(([o, main, sub, alt]) => (
        <TouchableOpacity key={o} style={[styles.judgeBtn, alt && styles.judgeBtnAlt, !ready && styles.judgeBtnOff]} disabled={!ready} activeOpacity={0.85} onPress={() => choose(o)}>
          <Text style={styles.judgeTxt}>{main}</Text>
          <Text style={styles.judgeSub}>{sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={styles.legend}>
      {([['You', FE.orange], ['Opponent', '#3B6FE0'], ['Ball', BALL_Y]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
      <Text style={styles.legendTxt}>teal = the right call · red lane = the corridor you left open</Text>
    </View>
  );
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
  const resetBtn = <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetScenario}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = phase === 'done' ? (
    <View style={styles.lsPostRow}>{resetBtn}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={AOS_SCENE_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={phase === 'done' ? <>{verdict}{legend}</> : <>{promptBlock}{judge}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {field}
      {legend}
      {promptBlock}
      {phase === 'done' ? verdict : judge}
      {phase === 'done' && (
        <View style={styles.postRow}>{resetBtn}<NextButton visible variant="filled" label="Next scenario →" onPress={nextScenario} /></View>
      )}
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

// Contact-height chip: mini gauge at the contact point — ball above or below the cord (the rookie tell).
function HeightChip({ cp, high }: { cp: P; high: boolean }) {
  const x = cp[0], y = cp[1] - 30;
  return (
    <G>
      <Rect x={x - 14} y={y - 24} width={28} height={40} rx={5} fill="#0d1b3e" opacity={0.85} />
      <Line x1={x - 9} y1={y} x2={x + 9} y2={y} stroke="#F4F4EE" strokeWidth={1.6} />
      <SvgText x={x + 16} y={y + 3} fontSize={7.5} fontWeight="700" fill="#dfe5f0">net cord</SvgText>
      <Circle cx={x} cy={high ? y - 12 : y + 11} r={4.5} fill={high ? '#2fd39a' : '#ff6a6a'} stroke="#fff" strokeWidth={1} />
      <OutlinedLabel x={x} y={y - 30} txt={high ? 'contact ABOVE the net' : 'contact BELOW the cord'} fill={high ? '#8fe6d4' : '#ffb3ae'} size={9.5} />
    </G>
  );
}

// Burst / celebration effects, progress-driven off the timeline clock (SMIL doesn't port).
function FxEl({ fx, clock }: { fx: Fx; clock: number }) {
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

// Stadium LED board (the score drives some answers, so the board gets the big treatment).
function LedBoard({ scene, s }: { scene: Scene; s: AOSScenario }) {
  const bx = 20, by = 6, bw = 640, bh = 64;
  const frame = (
    <>
      <Rect x={bx + 60} y={by + bh} width={6} height={22} fill="#3a3a3a" />
      <Rect x={bx + bw - 66} y={by + bh} width={6} height={22} fill="#3a3a3a" />
      <Rect x={bx} y={by} width={bw} height={bh} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />
    </>
  );
  if (scene.board.mode === 'msg') {
    const { state, msg, npt } = scene.board;
    const screen = state === 'good' ? '#0a2a1c' : state === 'ok' ? '#2a2210' : '#2a0e0e';
    const color = state === 'good' ? '#3ff0a8' : state === 'ok' ? '#ffd23f' : '#ff6a6a';
    const hasSub = npt != null;
    const fs = msg.length > 12 ? 30 : 38;
    return (
      <G>
        {frame}
        <Rect x={bx + 8} y={by + 7} width={bw - 16} height={bh - 14} rx={4} fill={screen} />
        <SvgText x={bx + bw / 2} y={by + (hasSub ? 38 : 44)} textAnchor="middle" fontFamily={LED_FONT} fontSize={fs} fontWeight="800" fill={color} letterSpacing="2">{msg}</SvgText>
        {hasSub && <SvgText x={bx + bw / 2} y={by + 54} textAnchor="middle" fontFamily={LED_FONT} fontSize={9} fontWeight="700" fill="#e8edf5" letterSpacing="1.5">{`SCORE NOW  ${npt}`}</SvgText>}
      </G>
    );
  }
  const b = s.board;
  const cells = [
    { cap: 'POINT SCORE (YOU FIRST)', val: b.pt, color: '#ffd23f', screen: '#1c1808' },
    { cap: 'GAMES', val: b.games, color: '#e8edf5', screen: null as string | null },
    { cap: 'SETS', val: b.sets, color: '#e8edf5', screen: null as string | null },
    { cap: b.note.cap, val: b.note.val, color: b.note.warn ? '#ff6a6a' : '#e8edf5', screen: b.note.warn ? '#2a0e0e' : null },
  ];
  return (
    <G>
      {frame}
      {cells.map((c, i) => {
        const cx0 = bx + 8 + i * 157, cw = 150, cx = cx0 + cw / 2;
        const fs = c.val.length > 12 ? 10 : c.val.length > 8 ? 13 : 17;
        return (
          <G key={i}>
            <Rect x={cx0} y={by + 7} width={cw} height={bh - 14} rx={4} fill={c.screen ?? '#0c1016'} />
            <SvgText x={cx} y={by + 18} textAnchor="middle" fontFamily={LED_FONT} fontSize={7.5} fontWeight="800" fill="#5a6b7a" letterSpacing="1">{c.cap}</SvgText>
            <SvgText x={cx} y={by + 45} textAnchor="middle" fontFamily={LED_FONT} fontSize={fs} fontWeight="800" fill={c.color} letterSpacing={fs < 12 ? '0.5' : '1.5'}>{c.val}</SvgText>
          </G>
        );
      })}
    </G>
  );
}

// Prompt copy keeps the spike's <b>…</b> emphasis markers; render them as amber bold spans.
export function RichText({ text, style, boldStyle }: { text: string; style: object; boldStyle: object }) {
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
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptBold: { color: AMBER, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 11.5, marginTop: 6 },
  judgeWrap: { gap: 8 },
  judgeBtn: { backgroundColor: FE.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  judgeBtnAlt: { backgroundColor: '#2b3f6e' },
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtagOk: { backgroundColor: OK_BG, color: OK_C },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
