import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Path, Rect, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { CricketOval, CRICKET_OVAL_RATIO, CricketBall, ActorDot, OutlinedLabel, clampLabelX, CK } from './fields/CricketOval';
import {
  SCENARIOS, OPTIONS, OUTCOME_PROMPT, PROMPT_KEEP, PROMPT_SET, changePrompt, BOWLER_ON_LABEL,
  BOWLER_TAKES_BALL, HINT_IDLE, HINT_DONE, SUB, FOOT, MARK, ropePt, gradeColor, gradeTag,
  type BOCOption, type BOCScenario, type BOCResult, type P, type Depth,
} from '../../lib/bowlOrChange';

// Bowl or Change? — the captain's over-by-over call. The read is GROUND GEOMETRY, drawn three ways:
// a pulled-in rope (dashed arc + the dead hatched strip out to the real fence), calibrated distance
// ARROWS from the bat to each boundary carrying their real meters (55m / 82m), and — on the trap
// tab — the spinner's deliberate wide channel. Every bowler is a ROLE, never a name: the men who can
// come on are the QUICK and the LEFT-ARM SPINNER, and the labels are fielding posts.
//
// Two mechanics the prototype did with a mouse and this port does with a thumb:
//   · GHOST FIELD PREVIEW — each option has a 44px 👁 toggle that draws where that choice would put
//     the field (and where the new bowler would come FROM) before you commit. Hover has no thumb
//     equivalent, so it becomes an explicit, cancellable toggle rather than a press-and-hold.
//   · THE SWAP — the incoming bowler jogs to the mark and the outgoing spinner INHERITS his fielding
//     post, relabelled to it ("fine leg · spinner"), so eleven men stay eleven men.
// Delivery timings are the slowed cricket set (560ms to the crease, 1050ms for the stroke) so the
// line and the carry are both readable. Board-less — the shared CricketOval at CRICKET_OVAL_RATIO.
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const OK_BG = '#fef3e2', OK_C = '#8a5a1c';
const RELEASE_MS = 560, STROKE_MS = 1050, WAIT_CHANGE = 1500, WAIT_KEEP = 700, VERDICT_DELAY = 400;

const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const arcAt = (from: P, to: P, peak: number, k: number): P => {
  const mx = (from[0] + to[0]) / 2, my = Math.min(from[1], to[1]) - peak, mk = 1 - k;
  return [mk * mk * from[0] + 2 * mk * k * mx + k * k * to[0], mk * mk * from[1] + 2 * mk * k * my + k * k * to[1]];
};
// A fielder's POST, stripped of his bowling role — what the outgoing bowler inherits.
const postOf = (n: string) => n.split('·')[0].trim();

// ── GHOST FIELD PREVIEW — the delta, computed from the SAME data `choose` animates ──
// An 👁 that produces no visible change is worse than no 👁 at all (owner: "when I click on the top
// one I can't find what it does"). So the preview is derived, per SCENARIO and per option, from the
// option's own newBowler + morphs: a null return means "this choice moves nobody here" and the module
// then renders NO eye for it in that scenario — the affordance can never promise a move that isn't
// coming. `caption` names the change in words; when exactly ONE thing moves it says so explicitly and
// spells out from→to, because otherwise the user has no idea where on the ground to look.
interface PvMove { key: string; from: P; to: P; lab: string }
interface PvDelta { moves: PvMove[]; caption: string }

function previewDelta(scn: BOCScenario, opt: BOCOption): PvDelta | null {
  const o = scn.opts[opt];
  const homeOf = (id: string) => scn.fielders.find(f => f.id === id);
  const moves: PvMove[] = [];
  const brief: string[] = [];   // destination posts — the multi-move caption
  const detail: string[] = [];  // from → to — the single-change caption
  if (o.newBowler) {
    const nb = o.newBowler;
    const h = homeOf(nb);
    if (h) {
      // the swap is ONE change with two moving men: he walks to the mark, the spinner takes his post
      const post = postOf(h.n);
      moves.push({ key: `on-${nb}`, from: h.p, to: MARK, lab: BOWLER_ON_LABEL[nb] });
      moves.push({ key: 'off-spinner', from: MARK, to: h.p, lab: `${post} · spinner` });
      brief.push(`${BOWLER_TAKES_BALL[nb]} on`);
      detail.push(`${BOWLER_TAKES_BALL[nb]} on — ${post} → the mark`);
    }
  }
  o.morphs.forEach(m => {
    const h = homeOf(m.f);
    if (!h || (h.p[0] === m.to[0] && h.p[1] === m.to[1])) return;   // a morph that doesn't actually move
    moves.push({ key: `mv-${m.f}`, from: h.p, to: m.to, lab: m.relab });
    brief.push(postOf(m.relab));
    detail.push(`${postOf(h.n)} → ${postOf(m.relab)}`);
  });
  if (!moves.length) return null;
  return { moves, caption: detail.length === 1 ? `only change: ${detail[0]}` : brief.join(' · ') };
}

// ── scene model (mutable ref; one bump/frame re-renders the SVG) ──
interface SceneLabel { x: number; y: number; txt: string; fill: string; size: number }
interface Fx { kind: 'burst' | 'celebrate'; pos: P; color: string; born: number }
interface Actor { p: P; label: string; dy?: number }
interface Scene {
  fielders: Record<string, Actor>;
  bowler: Actor;                                 // the man currently at the mark
  batter: P; nonStriker: P;
  ball: P | null;
  labels: SceneLabel[];
  fx: Fx[];
  reveals: { kind: 'ring' | 'arc' | 'wide'; p?: P; to?: P }[];
}
const freshScene = (s: BOCScenario): Scene => {
  const fielders: Record<string, Actor> = {};
  s.fielders.forEach(f => { fielders[f.id] = { p: f.p, label: f.n, dy: f.dy }; });
  return {
    fielders, bowler: { p: MARK, label: s.bowlerN }, batter: s.batter.p, nonStriker: [322, 168],
    ball: [346, 158], labels: [], fx: [], reveals: [],
  };
};

// ── timeline harness (per-module copy — single rafRef owner, per the port standard) ──
type TAnim = { at: number; d: number; f: (k: number) => void };
type TEv = { at: number; f: () => void };
type Phase = 'idle' | 'run' | 'done';

export default function BowlOrChangeGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<BOCOption | null>(null);
  const [preview, setPreview] = useState<BOCOption | null>(null);
  const [, setTick] = useState(0);
  const sceneRef = useRef<Scene>(freshScene(SCENARIOS[0]));
  const promptRef = useRef<string>(SCENARIOS[0].prompt);
  const hintRef = useRef<string>(HINT_IDLE);
  const clockRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);                       // generation guard: a stale frame can never write
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  // Which options actually MOVE somebody in THIS scenario. Per scenario, never global: a choice that
  // is a no-op on one tab can rebuild half the field on the next, so the 👁 is decided per tab.
  const previewOf = useMemo(() => {
    const m = {} as Record<BOCOption, PvDelta | null>;
    OPTIONS.forEach(op => { m[op.key] = previewDelta(s, op.key); });
    return m;
  }, [s]);
  const anyPreview = OPTIONS.some(op => previewOf[op.key] !== null);
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
    sc().labels.push({ x: clampLabelX(x, txt, 2.8), y, txt, fill, size });
  const burstAt = (pos: P, color: string) => sc().fx.push({ kind: 'burst', pos, color, born: clockRef.current });
  const celebrateAt = (pos: P) => sc().fx.push({ kind: 'celebrate', pos, color: CK.good, born: clockRef.current });
  const mkSlide = (at: number, from: P, to: P, d: number): TAnim => ({ at, d, f: k => { sc().ball = lerpP(from, to, k); } });
  const mkArc = (at: number, from: P, to: P, peak: number, d: number): TAnim => ({ at, d, f: k => { sc().ball = arcAt(from, to, peak, k); } });
  const mkFielder = (at: number, id: string, from: P, to: P, d: number): TAnim =>
    ({ at, d, f: k => { sc().fielders[id] = { ...sc().fielders[id], p: lerpP(from, to, k) }; } });
  const mkBowlerMove = (at: number, from: P, to: P, d: number): TAnim =>
    ({ at, d, f: k => { sc().bowler = { ...sc().bowler, p: lerpP(from, to, k) }; } });

  const resetTo = (i: number) => {
    stopLoop();
    setIdx(i); setPhase('idle'); setChosen(null); setPreview(null);
    sceneRef.current = freshScene(SCENARIOS[i]);
    promptRef.current = SCENARIOS[i].prompt;
    hintRef.current = HINT_IDLE;
    clockRef.current = 0;
    bump();
  };
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);
  const showVerdict = () => { setPhase('done'); hintRef.current = HINT_DONE; };

  // ── choose: the field rebuilds around whoever takes the ball, then the over's first ball ──
  const choose = (opt: BOCOption) => {
    if (phaseRef.current !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreview(null);
    setChosen(opt);
    setPhase('run');
    const scn = s, o = scn.opts[opt], to = o.shot.to;
    const anims: TAnim[] = [];
    const evs: TEv[] = [];
    const ev = (at: number, f: () => void) => evs.push({ at, f });
    let wait = WAIT_KEEP;

    if (o.newBowler) {
      wait = WAIT_CHANGE;
      const nbId = o.newBowler;
      const nbHome = scn.fielders.find(f => f.id === nbId)?.p ?? MARK;
      const oldLabel = scn.bowlerN;
      promptRef.current = changePrompt(nbId);
      // the incoming bowler jogs to the mark, relabelled by his ROLE
      ev(0, () => { sc().fielders[nbId] = { ...sc().fielders[nbId], label: BOWLER_ON_LABEL[nbId] }; });
      anims.push(mkFielder(0, nbId, nbHome, [MARK[0], MARK[1] - 4], 900));
      // …and the outgoing bowler INHERITS his fielding post, relabelled to it
      ev(150, () => { sc().bowler = { ...sc().bowler, label: `${postOf(scn.fielders.find(f => f.id === nbId)?.n ?? oldLabel)} · spinner` }; });
      anims.push(mkBowlerMove(150, MARK, nbHome, 900));
      o.morphs.forEach((m, i) => {
        const from = scn.fielders.find(f => f.id === m.f)?.p ?? MARK;
        ev(250 + i * 110, () => { sc().fielders[m.f] = { ...sc().fielders[m.f], label: m.relab, dy: m.dy ?? sc().fielders[m.f].dy }; });
        anims.push(mkFielder(250 + i * 110, m.f, from, m.to, scn.moveDur));
      });
    } else {
      promptRef.current = PROMPT_KEEP;
      // living touch: his deep men take a settling step into their stations
      o.morphs.forEach((m, i) => {
        const from = scn.fielders.find(f => f.id === m.f)?.p ?? MARK;
        ev(i * 110, () => { sc().fielders[m.f] = { ...sc().fielders[m.f], label: m.relab, dy: m.dy ?? sc().fielders[m.f].dy }; });
        anims.push(mkFielder(i * 110, m.f, from, m.to, scn.moveDur));
      });
    }

    // the delivery — slowed on purpose: the LINE is the lesson on the trap tab
    const relTo: P = scn.wide && opt === 'keep' ? [scn.wide.to[0], scn.wide.to[1] - 4] : [348, 282];
    ev(wait, () => { promptRef.current = PROMPT_SET; });
    anims.push(mkSlide(wait, [346, 158], relTo, RELEASE_MS));
    const strokeAt = wait + RELEASE_MS;
    if (o.shot.air) anims.push(mkArc(strokeAt, scn.batter.p, to, o.shot.peak ?? 90, STROKE_MS));
    else anims.push(mkSlide(strokeAt, scn.batter.p, to, STROKE_MS));

    const resolveAt = strokeAt + STROKE_MS;
    const olx = o.olabAt ? o.olabAt[0] : to[0];
    const oly = o.olabAt ? o.olabAt[1] : to[1] < 60 ? to[1] + 28 : to[1] - 24;
    ev(resolveAt, () => {
      if (o.outcome === 'caught') {
        celebrateAt(to);
        addLabel(olx, o.olabAt ? oly : to[1] - 26, o.olab, '#bfe9da', 12);
      } else if (o.outcome === 'dot') {
        celebrateAt(to);
        addLabel(o.olabAt ? olx : to[0] + 66, o.olabAt ? oly : to[1] + 16, o.olab, '#bfe9da', 10.5);
      } else if (o.outcome === 'six' || o.outcome === 'four') {
        burstAt(to, RED);
        addLabel(olx, oly, o.olab, '#ffb3ae', 12);
      } else {
        burstAt(to, AMBER);
        addLabel(olx, o.olabAt ? oly : to[1] - 24, o.olab, '#ffe1b3', 11);
      }
      const op = OUTCOME_PROMPT[o.outcome];
      if (op) promptRef.current = op;
      // the teaching layer
      o.reveal.forEach(r => {
        if (r.type === 'ring') {
          sc().reveals.push({ kind: 'ring', p: r.p });
          addLabel(r.p[0], r.p[1] - 22, r.lab, '#7fe0cd', 9.5);
        } else if (r.type === 'arc') {
          sc().reveals.push({ kind: 'arc', to: r.to });
          addLabel(r.to[0] - 40, r.to[1] - 18, r.lab, '#ffd9a8', 9.5);
        } else if (r.type === 'wide') {
          sc().reveals.push({ kind: 'wide' });
          if (scn.wide) addLabel(scn.wide.to[0] - 60, scn.wide.to[1] + 22, r.lab, '#ffd9a8', 9.5);
        } else {
          addLabel(r.p[0], r.p[1], r.lab, '#ffd9a8', 10.5);
        }
      });
    });
    if (o.outcome === 'two') {
      const b0 = scn.batter.p, n0: P = [322, 168];
      anims.push({ at: resolveAt, d: 520, f: k => { sc().batter = lerpP(b0, [356, 176], k); sc().nonStriker = lerpP(n0, [324, 280], k); } });
    }
    ev(resolveAt + VERDICT_DELAY, showVerdict);
    runTimeline(anims, evs, resolveAt + VERDICT_DELAY + 700);
  };

  // ── SVG scene: oval → ropes/distances/wide-line → preview ghosts → reveals → actors → ball → fx ──
  const scene = sceneRef.current;
  const clock = clockRef.current;
  const els: ReactNode[] = [];

  // the pulled-in rope: dashed arc + the hatched dead strip out to the real fence
  s.ropes.forEach((r, ri) => {
    let dIn = '', dOut = '';
    for (let th = r.th0; th <= r.th1; th += 4) { const p = ropePt(r.scale, th); dIn += `${dIn ? ' L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }
    for (let th = r.th1; th >= r.th0; th -= 4) { const p = ropePt(1, th); dOut += ` L${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }
    const mid = ropePt(r.scale, (r.th0 + r.th1) / 2);
    els.push(<Path key={`rp${ri}`} d={`${dIn}${dOut} Z`} fill={CK.navy} opacity={0.28} />);
    els.push(<Path key={`rl${ri}`} d={dIn} fill="none" stroke={CK.chalk} strokeWidth={2.5} strokeDasharray="8 6" opacity={0.9} />);
    els.push(<G key={`rt${ri}`}><OutlinedLabel x={clampLabelX(mid[0], r.lab, 3)} y={mid[1] - 8} text={r.lab} fill="#ffd9a8" size={9} /></G>);
  });
  // calibrated boundary arrows from the bat — the meters ARE the decision
  s.dists.forEach((d, di) => {
    const b = s.batter.p;
    const dx = d.to[0] - b[0], dy = d.to[1] - b[1], len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const tipX = d.to[0] - ux * 4, tipY = d.to[1] - uy * 4;
    const col = d.warn ? '#ffb26e' : '#bcd3ff';
    els.push(<Line key={`dl${di}`} x1={b[0]} y1={b[1]} x2={tipX} y2={tipY} stroke={col} strokeWidth={1.6} strokeDasharray="3 6" opacity={0.75} />);
    els.push(<Path key={`da${di}`} d={`M${tipX} ${tipY} L${tipX - ux * 13 - uy * 5} ${tipY - uy * 13 + ux * 5} L${tipX - ux * 13 + uy * 5} ${tipY - uy * 13 - ux * 5} Z`} fill={col} opacity={0.85} />);
    els.push(<G key={`dt${di}`}><OutlinedLabel x={clampLabelX(b[0] + dx * 0.72, d.m, 3)} y={b[1] + dy * 0.72 - 6} text={d.m} fill={col} size={10} /></G>);
  });
  // the deliberate wide channel (the trap tab) — bright pre-call, ghosted in a reveal
  const wideGhost = scene.reveals.some(r => r.kind === 'wide');
  if (s.wide) {
    els.push(<Line key="wide" x1={s.wide.from[0]} y1={s.wide.from[1]} x2={s.wide.to[0]} y2={s.wide.to[1]} stroke={AMBER} strokeWidth={2.5} strokeDasharray="6 5" opacity={wideGhost ? 0.55 : 0.85} />);
    els.push(<G key="wideL"><OutlinedLabel x={clampLabelX(s.wide.to[0] - 154, s.wide.lab, 3)} y={s.wide.to[1] + 34} text={s.wide.lab} fill="#ffd9a8" size={8.5} /></G>);
  }
  // reveals that live under the actors
  scene.reveals.forEach((r, ri) => {
    if (r.kind === 'ring' && r.p) els.push(<Circle key={`rv${ri}`} cx={r.p[0]} cy={r.p[1]} r={13} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="4 4" />);
    if (r.kind === 'arc' && r.to) {
      const b = s.batter.p, mx = (b[0] + r.to[0]) / 2, my = Math.min(b[1], r.to[1]) - 90;
      els.push(<Path key={`rv${ri}`} d={`M${b[0]} ${b[1]} Q${mx} ${my} ${r.to[0]} ${r.to[1]}`} fill="none" stroke={AMBER} strokeWidth={2.5} strokeDasharray="6 6" opacity={0.9} />);
    }
  });
  s.fielders.forEach(f => {
    const a = scene.fielders[f.id];
    els.push(<ActorDot key={f.id} x={a.p[0]} y={a.p[1]} fill={f.id === 'keeper' ? CK.keeper : CK.orange}
      label={a.label} labelFill={f.id === 'keeper' ? '#e6d8f2' : '#fff'} dy={a.dy} />);
  });
  els.push(<ActorDot key="bowler" x={scene.bowler.p[0]} y={scene.bowler.p[1]} fill={CK.orange} label={scene.bowler.label} />);
  els.push(<ActorDot key="batter" x={scene.batter[0]} y={scene.batter[1]} fill={CK.def} label={s.batter.n} labelFill="#bcd3ff" />);
  els.push(<ActorDot key="nonstr" x={scene.nonStriker[0]} y={scene.nonStriker[1]} fill={CK.def} label="non-striker" labelFill="#bcd3ff" dy={24} />);
  if (scene.ball) els.push(<CricketBall key="ball" x={scene.ball[0]} y={scene.ball[1]} />);
  scene.fx.forEach((fx, i) => els.push(<FxEl key={`fx${i}`} fx={fx} clock={clock} />));
  scene.labels.forEach((l, i) => els.push(<G key={`lbl${i}`}><OutlinedLabel x={l.x} y={l.y} text={l.txt} fill={l.fill} size={l.size} /></G>));

  // GHOST FIELD PREVIEW — LAST, so it sits ON TOP of every actor and can't be lost behind a dot.
  // Four reinforcing signals per moving man (one alone was missable on device): a bright dashed
  // ghost where he stands NOW, a dashed TEAL arrow to where he'd go, a TEAL destination dot (the
  // "this is the alternative" colour, per the ghost-ring convention) with his new post named, and
  // a caption pill naming the whole change in words.
  const pv = phase === 'idle' && preview ? previewOf[preview] : null;
  if (pv) {
    pv.moves.forEach(m => {
      const dx = m.to[0] - m.from[0], dy = m.to[1] - m.from[1], len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const x0 = m.from[0] + ux * 15, y0 = m.from[1] + uy * 15;
      const tx = m.to[0] - ux * 13, ty = m.to[1] - uy * 13;
      els.push(<Circle key={`pvg${m.key}`} cx={m.from[0]} cy={m.from[1]} r={14} fill="none" stroke={CK.chalk} strokeWidth={2.2} strokeDasharray="3 4" opacity={0.95} />);
      els.push(<Line key={`pvl${m.key}`} x1={x0} y1={y0} x2={tx} y2={ty} stroke={TEAL} strokeWidth={2.4} strokeDasharray="6 5" opacity={0.95} />);
      els.push(<Path key={`pva${m.key}`} d={`M${tx} ${ty} L${tx - ux * 13 - uy * 5.5} ${ty - uy * 13 + ux * 5.5} L${tx - ux * 13 + uy * 5.5} ${ty - uy * 13 - ux * 5.5} Z`} fill={TEAL} />);
      els.push(<Circle key={`pvr${m.key}`} cx={m.to[0]} cy={m.to[1]} r={15} fill="none" stroke={TEAL} strokeWidth={1.6} strokeDasharray="4 4" opacity={0.9} />);
      els.push(<Circle key={`pvd${m.key}`} cx={m.to[0]} cy={m.to[1]} r={9} fill={TEAL} stroke={CK.navy} strokeWidth={2} />);
      els.push(<G key={`pvt${m.key}`}><OutlinedLabel x={clampLabelX(m.to[0], m.lab, 2.8)} y={m.to[1] - 20} text={m.lab} fill="#9ff0e2" size={9} /></G>);
    });
    const cap = `PREVIEW — ${pv.caption}`;
    const capW = Math.min(650, cap.length * 5.7 + 24);
    els.push(<Rect key="pvcapbg" x={340 - capW / 2} y={5} width={capW} height={23} rx={8} fill={CK.navy} opacity={0.9} stroke={TEAL} strokeWidth={1.5} />);
    els.push(<G key="pvcap"><OutlinedLabel x={340} y={21} text={cap} fill="#9ff0e2" size={10} /></G>);
  }

  const field = <CricketOval>{els}</CricketOval>;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc2, i) => ({ key: String(i), name: sc2.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.hud.map((c, i) => (
        <View key={i} style={[styles.chip, c.warn && styles.chipWarn]}><Text style={[styles.chipTxt, c.warn && styles.chipTxtWarn]}>{c.c}</Text></View>
      ))}
    </View>
  );
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <RichText text={promptRef.current} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{hintRef.current}</Text>
    </View>
  );
  const judge = phase === 'idle' ? (
    <View style={styles.judgeWrap}>
      {OPTIONS.map(o => {
        const pvd = previewOf[o.key];
        const on = preview === o.key;
        return (
          <View key={o.key} style={styles.judgeRow}>
            {/* Peer choices, one style. The module must not leak its answer key through colour. */}
            <TouchableOpacity style={[styles.judgeBtn, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose(o.key)}>
              <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{o.title}</Text>
              <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.sub}</Text>
            </TouchableOpacity>
            {/* No 👁 at all when the preview would change nothing (KEEP THIS BOWLER keeps the field
                exactly as drawn) — an affordance that does nothing is worse than no affordance. */}
            {!!pvd && (
              <TouchableOpacity
                style={[styles.pvBtn, on && styles.pvBtnOn]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={on ? `Hide the field preview for ${o.title}` : `Preview the field for ${o.title}`}
                onPress={() => setPreview(p => (p === o.key ? null : o.key))}>
                <Text style={[styles.pvTxt, on && styles.pvTxtOn]}>👁</Text>
                <Text style={[styles.pvTag, on && styles.pvTagOn]}>{on ? 'ON' : 'see'}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      {anyPreview && (
        <Text style={[styles.pvHint, !!preview && styles.pvHintOn]}>
          {preview
            ? '👁 ON — teal is where those men would stand, white dashed rings are where they stand now. Tap 👁 again to clear.'
            : '👁 previews the field that choice would set. A choice with no 👁 moves nobody — the field stays exactly as drawn.'}
        </Text>
      )}
    </View>
  ) : null;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Your XI (positions on dots)', CK.orange], ['Your keeper', CK.keeper], ['Their batter', CK.def]] as [string, string][]).map(([l, c]) => (
        <View key={l} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{l}</Text></View>
      ))}
      <Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>hatched strip = rope pulled in short</Text>
    </View>
  );
  const o: BOCResult | null = chosen ? s.opts[chosen] : null;
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
    <View style={styles.lsPostRow}>{resetBtn}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next over →" onPress={nextScenario} /></View>
  ) : undefined;

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={CRICKET_OVAL_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={phase === 'done' ? <>{promptBlock}{verdict}{legend}{footLine}</> : <>{hudChips}{promptBlock}{judge}{legend}{subLine}</>}
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
        <View style={styles.postRow}>{resetBtn}<NextButton visible variant="filled" label="Next over →" onPress={nextScenario} /></View>
      )}
      {subLine}
      {footLine}
    </ScrollView>
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
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipWarn: { borderColor: '#e8b3b0' },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipTxtWarn: { color: '#e24b4a' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: AMBER, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 11.5, marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeWrap: { gap: 8 },
  judgeRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  judgeBtn: { flex: 1, backgroundColor: FE.orange, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  judgeBtnLs: { minHeight: 44, paddingVertical: 9 },
  judgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  judgeSubLs: { fontSize: 10 },
  pvBtn: { width: 50, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  // ON state is unmistakable: the teal preview colour fills the button, not a hairline border tweak.
  pvBtnOn: { borderColor: TEAL, backgroundColor: TEAL },
  pvTxt: { fontSize: 17, opacity: 0.7 },
  pvTxtOn: { opacity: 1 },
  pvTag: { color: t.textSecondaryOnDark, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4, marginTop: 1 },
  pvTagOn: { color: '#052e28' },
  pvHint: { color: t.textSecondaryOnDark, fontSize: 10.5, marginTop: 2 },
  pvHintOn: { color: TEAL, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
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
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
