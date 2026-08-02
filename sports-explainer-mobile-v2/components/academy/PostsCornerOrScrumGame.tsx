import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import { RugbyFieldCanvas, RugbyPitchMarks, RugbyPosts, RugbyBall, PitchLabel, BurstRing, RUGBY, RUGBY_TAG } from './fields/RugbyPitch';
import {
  SCENARIOS, tenLineX, defenderLine, fullbackPos,
  type PenaltyScenario, type PenaltyOption, type Depth, type XY,
} from '../../lib/postsCornerOrScrum';

// Posts, Corner, or Scrum? — the rugby penalty-menu module. A penalty is a MENU: kick at goal,
// kick to the corner (lineout → maul), take the scrum, or tap and run. The stadium LED board IS
// the scenario (score/clock/spot/note), every option plays out as film on the pitch, and the
// board takes over full-width with the outcome. Scene is the spike's 680×494 viewBox: scoreboard
// band on top, the 680×420 rugby pitch translated 74px below it — so this module carries its OWN
// aspect ratio, not RUGBY_PITCH_RATIO. All copy verbatim from the prototype (lib layer).
// Animation: everything is a pure function of one elapsed-ms clock driven by a single rafRef —
// the prototype's timer/callback chains are flattened into a prebuilt keyframe script.
export const PCS_SCENE = { vbW: 680, vbH: 494, pitchY: 74 };
export const PCS_SCENE_RATIO = PCS_SCENE.vbW / PCS_SCENE.vbH;

const F_BOLD = 'SpaceGrotesk_700Bold';
const LED_FONT = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const GOOD_COL = '#14B8A6', OK_COL = '#F5A623', BAD_COL = '#e24b4a';
const gradeColor = (k: 'good' | 'ok' | 'bad') => (k === 'good' ? GOOD_COL : k === 'ok' ? OK_COL : BAD_COL);

// ── the keyframe script: the whole run is a pure function of elapsed ms ──
interface Leg { t0: number; t1: number; from: XY; to: XY; peak?: number } // peak → tumbling kick arc
interface LabelEv { at: number; x: number; y: number; text: string; fill: string; size: number }
interface BurstEv { at: number; x: number; y: number; color: string }
interface Spawn { base: XY; legs: Leg[]; fill: string; r: number; opacity?: number }
interface PromptEv { at: number; text: string }
interface Script {
  total: number; boardAt: number; verdictAt: number;
  hideTenLine: boolean;
  fbLegs: Leg[]; fbLabelHideAt: number;
  lineLegs: Leg[][];             // one legs-list per defender in the 10m line
  spawns: { at: number; actors: Spawn[] }[];
  ball: Leg[];
  labels: LabelEv[]; bursts: BurstEv[]; celebrates: { at: number; x: number; y: number }[];
  prompts: PromptEv[];
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
const ballOnLegs = (base: XY, legs: Leg[], e: number): { x: number; y: number; ang: number } => {
  let p = base, ang = 0;
  for (const l of legs) {
    if (e <= l.t0) return { x: p[0], y: p[1], ang };
    const k = Math.min(1, (e - l.t0) / (l.t1 - l.t0));
    if (l.peak != null) {
      const mx = (l.from[0] + l.to[0]) / 2, my = Math.min(l.from[1], l.to[1]) - l.peak, mk = 1 - k;
      p = [mk * mk * l.from[0] + 2 * mk * k * mx + k * k * l.to[0], mk * mk * l.from[1] + 2 * mk * k * my + k * k * l.to[1]];
      ang = k * 900; // kicked: end over end
    } else {
      p = [l.from[0] + (l.to[0] - l.from[0]) * k, l.from[1] + (l.to[1] - l.from[1]) * k];
      ang = 0;       // carried / mauled: flat
    }
    if (e < l.t1) return { x: p[0], y: p[1], ang };
  }
  return { x: p[0], y: p[1], ang };
};

// Build the option's film as a keyframe script (timings verbatim from the prototype's chains).
function buildScript(s: PenaltyScenario, opt: PenaltyOption): Script {
  const g = s.grade[opt];
  const col = gradeColor(g.k);
  const line = defenderLine(s);
  const fb = fullbackPos(s);
  const sc: Script = {
    total: 0, boardAt: 0, verdictAt: 0, hideTenLine: false,
    fbLegs: [], fbLabelHideAt: Number.POSITIVE_INFINITY,
    lineLegs: line.map(() => []), spawns: [], ball: [],
    labels: [], bursts: [], celebrates: [], prompts: [],
  };
  const finish = (at: number) => { sc.boardAt = at; sc.verdictAt = at; sc.total = at + 700; };

  if (opt === 'posts') {
    sc.prompts.push({ at: 0, text: "Tee's out… the kick is up…" });
    if (s.makes) {
      sc.ball.push({ t0: 0, t1: 1100, from: s.spot, to: [610, 210], peak: 120 });
      if (g.k === 'good') sc.celebrates.push({ at: 1100, x: 610, y: 210 });
      else sc.bursts.push({ at: 1100, x: 610, y: 210, color: col });
      sc.labels.push({
        at: 1100, x: 610, y: 166,
        text: g.k === 'bad' ? "over — but it's not enough" : 'OVER — +3',
        fill: g.k === 'bad' ? '#ffb3ae' : '#bfe9da', size: 12,
      });
      finish(1100);
    } else {
      sc.ball.push({ t0: 0, t1: 1100, from: s.spot, to: [560, 214], peak: 130 });
      sc.bursts.push({ at: 1100, x: 560, y: 214, color: '#e24b4a' });
      sc.labels.push({ at: 1100, x: 560, y: 180, text: 'SHORT', fill: '#ffb3ae', size: 13 });
      sc.fbLabelHideAt = 1100;
      sc.fbLegs.push({ t0: 1100, t1: 1520, from: fb, to: [560, 214] });
      sc.labels.push({ at: 1520, x: 560, y: 236, text: 'FB gathers — counter on', fill: '#e6d8f2', size: 10 });
      finish(1520);
    }
  } else if (opt === 'corner') {
    sc.prompts.push({ at: 0, text: 'He points to the corner…' });
    sc.hideTenLine = true;
    const isPlatform = s.makes === false; // out-of-range scenario: long touch-finder for territory
    const touch: XY = isPlatform ? [566, 30] : [588, 30];
    const lx = touch[0], catchY = 80;
    sc.ball.push({ t0: 0, t1: 1000, from: s.spot, to: touch, peak: 40 });
    sc.bursts.push({ at: 1000, x: touch[0], y: touch[1], color: '#ffe1b3' });
    sc.labels.push({ at: 1000, x: touch[0] - 52, y: 24, text: 'into touch', fill: '#ffe1b3', size: 10.5 });
    sc.prompts.push({ at: 1000, text: 'Out of play — but a penalty kicked to touch keeps <b>your throw</b>. Both packs head to the lineout…' });
    // YOUR pack jogs up from behind the play to form the lineout; the hooker takes the throw.
    const pack: Spawn[] = [];
    for (let i = 0; i < 5; i++) {
      const from: XY = [s.spot[0] - 130 - (i % 2) * 34, 140 + i * 44];
      pack.push({ base: from, legs: [{ t0: 1000, t1: 1950, from, to: [lx, 58 + i * 22] }], fill: RUGBY.att, r: 9 });
    }
    pack.push({ base: [lx, 22], legs: [], fill: RUGBY.att, r: 9 }); // hooker
    sc.spawns.push({ at: 1000, actors: pack });
    sc.labels.push({ at: 1000, x: lx - 58, y: 44, text: 'hooker — your throw', fill: '#ffe1b3', size: 10 });
    // five of THEIR line fold in to defend it; the sixth drops off as backline cover.
    line.forEach((p, i) => {
      sc.lineLegs[i].push(i < 5
        ? { t0: 1000, t1: 1950, from: p, to: [lx + 14, 64 + i * 22] }
        : { t0: 1000, t1: 1950, from: p, to: [lx + 52, 250] });
    });
    if (isPlatform) {
      sc.labels.push({ at: 2050, x: lx - 6, y: 190, text: 'attacking platform — their 22', fill: '#bfe9da', size: 11 });
      finish(2050);
    } else {
      sc.prompts.push({ at: 2050, text: "Throw in… caught — the pack binds around the catcher: <b>maul, drive!</b>" });
      sc.ball.push({ t0: 2050, t1: 2500, from: [lx, 22], to: [lx, catchY], peak: 26 });
      const good = g.k === 'good', shove = good ? 26 : 12;
      sc.labels.push({ at: 2500, x: lx + 10, y: 186, text: 'maul', fill: '#fff', size: 10 });
      pack.forEach((a, i) => {
        if (i < 5) a.legs.push({ t0: 2500, t1: 3200, from: [lx, 58 + i * 22], to: [lx + shove, 58 + i * 22] });
      });
      line.forEach((_, i) => {
        if (i < 5) sc.lineLegs[i].push({ t0: 2500, t1: 3200, from: [lx + 14, 64 + i * 22], to: [lx + 14 + shove * 0.8, 64 + i * 22] });
      });
      sc.ball.push({ t0: 2500, t1: 3200, from: [lx, catchY], to: [lx + shove, catchY] });
      if (good) {
        sc.celebrates.push({ at: 3200, x: lx + shove, y: catchY });
        sc.labels.push({ at: 3200, x: lx + shove, y: 168, text: 'TRY!', fill: '#bfe9da', size: 14 });
      } else {
        sc.bursts.push({ at: 3200, x: lx + shove, y: catchY, color: col });
        sc.labels.push({ at: 3200, x: lx + shove, y: 168, text: 'held up', fill: '#ffe1b3', size: 11 });
      }
      finish(3200);
    }
  } else if (opt === 'scrum') {
    sc.prompts.push({ at: 0, text: 'A penalty lets you <b>choose a scrum</b> at the mark instead of kicking. Packs bind — eight on eight…' });
    const sx = s.spot[0], sy = s.spot[1];
    const shove = g.k === 'bad' ? 6 : g.k === 'ok' ? 16 : 26;
    const packs: Spawn[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 2 && c !== 1) continue;
      const mine: XY = [sx - 14 - r * 16, sy - 16 + c * 16];
      const theirs: XY = [sx + 14 + r * 16, sy - 16 + c * 16];
      packs.push({ base: mine, legs: [{ t0: 550, t1: 1150, from: mine, to: [mine[0] + shove, mine[1]] }], fill: RUGBY.att, r: 8 });
      packs.push({ base: theirs, legs: [{ t0: 550, t1: 1150, from: theirs, to: [theirs[0] + shove, theirs[1]] }], fill: RUGBY.def, r: 8, opacity: 0.9 });
    }
    sc.spawns.push({ at: 0, actors: packs });
    sc.labels.push({ at: 0, x: sx, y: sy - 38, text: 'scrum', fill: '#fff', size: 10 });
    sc.ball.push({ t0: 550, t1: 1150, from: s.spot, to: [sx + shove, sy] });
    sc.bursts.push({ at: 1150, x: sx + shove + 30, y: sy, color: col });
    sc.labels.push({
      at: 1150, x: sx + shove + 30, y: sy - 24,
      text: g.k === 'bad' ? 'absorbed' : 'the shove is on',
      fill: g.k === 'bad' ? '#ffb3ae' : '#ffe1b3', size: 10.5,
    });
    finish(1150);
  } else { // quick tap
    sc.prompts.push({ at: 0, text: 'Tap and go!' });
    const good = g.k === 'good', run = g.k === 'ok' ? 64 : good ? 110 : 40;
    const tox = Math.min(s.spot[0] + run, 588); // a stopped tap can NEVER cross the try line
    const to: XY = [tox, s.spot[1] + 4];
    const from: XY = [s.spot[0] - 18, s.spot[1] + 4];
    sc.spawns.push({ at: 0, actors: [{ base: from, legs: [{ t0: 0, t1: 480, from, to }], fill: RUGBY.att, r: 11 }] });
    sc.labels.push({ at: 0, x: s.spot[0] - 18, y: s.spot[1] + 24, text: 'tap!', fill: '#ffe1b3', size: 10 });
    sc.ball.push({ t0: 0, t1: 480, from: s.spot, to: [Math.min(tox + 10, 596), to[1]] });
    if (!good) {
      // the nearest defender in the line closes and WRAPS him — that is what "held up" means
      let ni = 0, best = Number.POSITIVE_INFINITY;
      line.forEach((p, i) => { const d = Math.abs(p[1] - to[1]); if (d < best) { best = d; ni = i; } });
      sc.lineLegs[ni].push({ t0: 480, t1: 740, from: line[ni], to: [to[0] + 8, to[1] - 4] });
      sc.bursts.push({ at: 740, x: to[0], y: to[1], color: col });
      sc.labels.push({
        at: 740, x: to[0], y: to[1] - 24,
        text: g.k === 'ok' ? 'wrapped up — held' : 'swallowed',
        fill: g.k === 'ok' ? '#ffe1b3' : '#ffb3ae', size: 10.5,
      });
      finish(740);
    } else {
      sc.bursts.push({ at: 480, x: to[0], y: to[1], color: col });
      finish(480);
    }
  }
  return sc;
}

// Prompt text with the prototype's inline <b>…</b> emphasis rendered as amber bold.
function Rich({ text, style, boldStyle }: { text: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

export default function PostsCornerOrScrumGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState<Level>(appLevel);
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [opt, setOpt] = useState<PenaltyOption | null>(null);
  const [e, setE] = useState(0);
  const scriptRef = useRef<Script | null>(null);
  const rafRef = useRef<number | null>(null);

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const sc = scriptRef.current;
  const grade = opt ? s.grade[opt] : null;
  const showVerdict = phase !== 'idle' && sc != null && e >= sc.verdictAt;

  // ── single rAF owner ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);
  const resetTo = (i: number) => {
    stopLoop(); setIdx(i); setPhase('idle'); setOpt(null); setE(0); scriptRef.current = null;
  };
  const choose = (o: PenaltyOption) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const script = buildScript(s, o);
    scriptRef.current = script; setOpt(o); setPhase('run'); setE(0);
    let begin: number | null = null;
    const loop = (now: number) => {
      if (begin == null) begin = now;
      const el = now - begin;
      if (el >= script.total) { setE(script.total); setPhase('done'); rafRef.current = null; return; }
      setE(el);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the LED stadium board (live cells → full-board takeover, with the flip flicker) ──
  const boardNodes: ReactNode[] = [];
  {
    const bx = 20, by = 6, bw = 640, bh = 64;
    const b = s.board;
    const takeover = sc != null && grade != null && e >= sc.boardAt + 90;
    boardNodes.push(<Rect key="lg1" x={bx + 60} y={by + bh} width={6} height={22} fill="#3a3a3a" />);
    boardNodes.push(<Rect key="lg2" x={bx + bw - 66} y={by + bh} width={6} height={22} fill="#3a3a3a" />);
    boardNodes.push(<Rect key="bd" x={bx} y={by} width={bw} height={bh} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />);
    const led = (key: string, x: number, y: number, txt: string, fs: number, fill: string, ls?: number) => (
      <SvgText key={key} x={x} y={y} textAnchor="middle" fontFamily={LED_FONT} fontSize={fs} fontWeight="800" fill={fill} letterSpacing={ls ?? 1}>{txt}</SvgText>
    );
    if (!takeover) {
      const cells: { cap: string; val?: string; color?: string; screen?: string | null; score?: boolean }[] = [
        { cap: 'PENALTY AT', val: b.spot, color: '#ffd23f', screen: '#1c1808' },
        { cap: 'SCORE', score: true },
        { cap: 'CLOCK', val: b.clock, color: '#e8edf5' },
        { cap: b.note.cap, val: b.note.val, color: b.note.warn ? '#ff6a6a' : '#e8edf5', screen: b.note.warn ? '#2a0e0e' : null },
      ];
      cells.forEach((c, i) => {
        const cx0 = bx + 8 + i * 157, cw = 150, cx = cx0 + cw / 2;
        boardNodes.push(<Rect key={`cs${i}`} x={cx0} y={by + 7} width={cw} height={bh - 14} rx={4} fill={c.screen || '#0c1016'} />);
        boardNodes.push(led(`cc${i}`, cx, by + 18, c.cap, 8, '#5a6b7a'));
        if (c.score) {
          boardNodes.push(led(`sy${i}`, cx - 34, by + 41, String(b.you), 16, '#e8edf5'));
          boardNodes.push(led(`sd${i}`, cx, by + 40, '–', 13, '#5a6b7a'));
          boardNodes.push(led(`st${i}`, cx + 34, by + 41, String(b.them), 16, '#e8edf5'));
          boardNodes.push(led(`syl${i}`, cx - 34, by + 53, 'YOU', 7, '#5a6b7a'));
          boardNodes.push(led(`stl${i}`, cx + 34, by + 53, 'THEM', 7, '#5a6b7a'));
        } else if (c.val != null) {
          const fs = c.val.length > 12 ? 10 : c.val.length > 8 ? 13 : 17;
          boardNodes.push(led(`cv${i}`, cx, by + 45, c.val, fs, c.color ?? '#e8edf5', fs < 12 ? 0.5 : 1.5));
        }
      });
    } else if (grade) {
      const st = grade.k;
      const screen = st === 'good' ? '#0a2a1c' : st === 'ok' ? '#2a2210' : '#2a0e0e';
      const color = st === 'good' ? '#3ff0a8' : st === 'ok' ? '#ffd23f' : '#ff6a6a';
      const scoreYou = grade.pts != null ? s.board.you + grade.pts : null;
      boardNodes.push(<Rect key="tk" x={bx + 8} y={by + 7} width={bw - 16} height={bh - 14} rx={4} fill={screen} />);
      const hasSub = scoreYou != null;
      const fs = grade.bmsg.length > 12 ? 30 : 38;
      boardNodes.push(led('tm', bx + bw / 2, by + (hasSub ? 38 : 44), grade.bmsg, fs, color, 2));
      if (hasSub) boardNodes.push(led('ts', bx + bw / 2, by + 54, `SCORE NOW  YOU ${scoreYou} – THEM ${b.them}`, 9, '#e8edf5', 1.5));
    }
  }
  // the flip flicker: dim old → swap → dip → settle (pure function of e − boardAt)
  let boardOpacity = 1;
  if (sc != null && phase !== 'idle') {
    const d = e - sc.boardAt;
    if (d >= 0 && d < 90) boardOpacity = 0.35;
    else if (d >= 240 && d < 360) boardOpacity = 0.75;
  }

  // ── the pitch layer at time e ──
  const pitchEls: ReactNode[] = [];
  const line = defenderLine(s);
  const fb = fullbackPos(s);
  const tenX = tenLineX(s);
  // the law: their line must retreat 10m — dashed line (hidden once the corner kick is away)
  if (!(sc?.hideTenLine)) {
    pitchEls.push(<Line key="ten" x1={tenX} y1={Math.max(20, s.spot[1] - 150)} x2={tenX} y2={Math.min(400, s.spot[1] + 150)} stroke="#bcd3ff" strokeWidth={1.5} strokeDasharray="5 6" opacity={0.65} />);
    pitchEls.push(<PitchLabel key="tenl" x={tenX} y={Math.min(408, s.spot[1] + 164)} text="their line — back 10m" fill="#bcd3ff" size={9.5} />);
  }
  // their six-man line (script moves them for corner/tap)
  line.forEach((p, i) => {
    const pos = sc ? posOnLegs(p, sc.lineLegs[i], e) : p;
    pitchEls.push(<Circle key={`ld${i}`} cx={pos[0]} cy={pos[1]} r={10} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} opacity={0.9} />);
  });
  // their fullback (gathers the short kick in the posts-miss film)
  {
    const pos = sc ? posOnLegs(fb, sc.fbLegs, e) : fb;
    pitchEls.push(<Circle key="fb" cx={pos[0]} cy={pos[1]} r={10} fill={RUGBY.fb} stroke={RUGBY.navy} strokeWidth={2} />);
    if (!(sc != null && e >= sc.fbLabelHideAt)) {
      pitchEls.push(<PitchLabel key="fbl" x={pos[0]} y={pos[1] - 16} text="FB" fill={RUGBY.fbLbl} size={10.5} />);
    }
  }
  // ball on the mark, kicker + 9 + 13 labeled (static through every film)
  pitchEls.push(<Circle key="k10" cx={s.spot[0] - 18} cy={s.spot[1] + 4} r={11} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
  pitchEls.push(<PitchLabel key="k10l" x={s.spot[0] - 18} y={s.spot[1] - 12} text="10" size={10.5} />);
  pitchEls.push(<Circle key="k9" cx={s.spot[0] - 46} cy={s.spot[1] - 52} r={10} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
  pitchEls.push(<PitchLabel key="k9l" x={s.spot[0] - 46} y={s.spot[1] - 68} text="9" size={10.5} />);
  pitchEls.push(<Circle key="k13" cx={s.spot[0] - 46} cy={s.spot[1] + 58} r={10} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
  pitchEls.push(<PitchLabel key="k13l" x={s.spot[0] - 46} y={s.spot[1] + 42} text="13" size={10.5} />);
  // spawned film actors (lineout packs / scrum packs / tap carrier)
  sc?.spawns.forEach((sp, si) => {
    if (e < sp.at) return;
    sp.actors.forEach((a, ai) => {
      const pos = posOnLegs(a.base, a.legs, e);
      pitchEls.push(<Circle key={`sp${si}-${ai}`} cx={pos[0]} cy={pos[1]} r={a.r} fill={a.fill} stroke={RUGBY.navy} strokeWidth={2} opacity={a.opacity ?? 1} />);
    });
  });
  // the ball
  {
    const bp = sc ? ballOnLegs(s.spot, sc.ball, e) : { x: s.spot[0], y: s.spot[1], ang: 0 };
    pitchEls.push(<RugbyBall key="ball" x={bp.x} y={bp.y} ang={bp.ang} />);
  }
  // FX + film labels (appear at their scheduled beats and persist)
  sc?.bursts.forEach((bu, i) => {
    pitchEls.push(<BurstRing key={`bu${i}`} x={bu.x} y={bu.y} prog={(e - bu.at) / 600} color={bu.color} maxR={28} />);
  });
  sc?.celebrates.forEach((c, i) => {
    const p = (e - c.at) / 600;
    if (p <= 0 || p >= 1) return;
    pitchEls.push(<Circle key={`ce1${i}`} cx={c.x} cy={c.y} r={14 * (0.2 + 1.7 * p)} fill="none" stroke="#16a37f" strokeWidth={4} opacity={0.95 * (1 - p)} />);
    const p2 = Math.max(0, Math.min(1, (e - c.at - 80) / 600));
    if (p2 > 0 && p2 < 1) pitchEls.push(<Circle key={`ce2${i}`} cx={c.x} cy={c.y} r={14 * (0.2 + 1.7 * p2)} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, d = 26 * p;
      pitchEls.push(<Circle key={`ces${i}-${k}`} cx={c.x + Math.cos(a) * d} cy={c.y + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={Math.max(0, 1 - p * 1.15)} />);
    }
  });
  sc?.labels.forEach((l, i) => {
    if (e >= l.at) pitchEls.push(<PitchLabel key={`lb${i}`} x={l.x} y={l.y} text={l.text} fill={l.fill} size={l.size} />);
  });

  const scene = (
    <RugbyFieldCanvas viewW={PCS_SCENE.vbW} viewH={PCS_SCENE.vbH} fill="width" bg={RUGBY.turfD}>
      <G opacity={boardOpacity}>{boardNodes}</G>
      <G transform={`translate(0,${PCS_SCENE.pitchY})`}>
        <RugbyPitchMarks />
        <RugbyPosts />
        {pitchEls}
      </G>
    </RugbyFieldCanvas>
  );

  // ── chrome fragments ──
  const promptText = phase === 'idle'
    ? 'Penalty, <b>your call, captain.</b> Where do you point?'
    : showVerdict
      ? 'Every penalty is a <b>trade</b> — points now, or a platform for more.'
      : (sc?.prompts.filter(p => e >= p.at).pop()?.text ?? '');
  const prompt = <View style={[styles.prompt, landscape && styles.promptLs]}><Rich text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} /></View>;
  const hintText = showVerdict ? 'Reset, or take another penalty.' : 'Score, clock, spot — the board has everything.';
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((x, i) => ({ key: String(i), name: x.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Your team (attacking right)', RUGBY.att], ['Their defense', RUGBY.def], ['Their fullback', RUGBY.fb]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  const JUDGE: { o: PenaltyOption; t: string; sub: string; alt?: boolean }[] = [
    { o: 'posts', t: 'Kick at goal', sub: '3 points' },
    { o: 'corner', t: 'Kick to corner', sub: 'lineout → maul' },
    { o: 'scrum', t: 'Take the scrum', sub: 'set-piece launch' },
    { o: 'tap', t: 'Quick tap', sub: 'catch them cold', alt: true },
  ];
  const judgeButtons = (
    <View style={styles.judgeWrap}>
      {JUDGE.map(j => (
        <TouchableOpacity key={j.o} style={[styles.judgeBtn, j.alt && styles.judgeBtnAlt, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose(j.o)}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{j.t}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{j.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const verdictCard = showVerdict && grade ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, grade.k === 'good' ? styles.vtagGood : grade.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {grade.k === 'good' ? "Captain's call" : grade.k === 'ok' ? 'Defensible' : 'Wrong call'}
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
      <NextButton visible variant="filled" style={styles.lsNextFill} label="Next penalty →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />
    </View>
  ) : undefined;

  // ── LANDSCAPE: the shared shell; the 680×494 board+pitch scene carries its OWN ratio. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={PCS_SCENE_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={scene}
        controls={showVerdict
          ? <>{verdictCard}{legend}</>
          : <>{prompt}{phase === 'idle' && judgeButtons}{legend}{hint}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack (mirrors the prototype's column). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {scene}
      {legend}
      {prompt}
      {phase === 'idle' && judgeButtons}
      {verdictCard}
      <View style={styles.controlsRow}>
        {resetBtn}
        {showVerdict && <NextButton visible variant="filled" label="Next penalty →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />}
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  judgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeBtn: { flexGrow: 1, flexBasis: '45%', minHeight: 52, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  judgeBtnLs: { minHeight: 46, paddingVertical: 8 },
  judgeBtnAlt: { backgroundColor: '#0d1b3e', borderWidth: 1, borderColor: t.border },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
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
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
