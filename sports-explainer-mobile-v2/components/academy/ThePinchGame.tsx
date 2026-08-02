import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import {
  SCENARIOS, OPTIONS, OVAL, GHOSTS, VB, TEE, S, pxOf,
  NARR_OVAL, NARR_TODAY, PROMPT_DONE, HINT_IDLE, HINT_DONE,
  type PinchOption, type PinchScenario, type PinchResult, type Grade, type Depth, type Vec,
} from '../../lib/thePinch';

// The Pinch — tee-shot club selection. The myth is "driver risky, 3-wood smart"; the truth is that
// trouble pinches at a YARDAGE, and the right club is whichever one's landing oval misses it. The
// engine is the owner-reviewed dispersion beat, shared with Sucker Pin: the AIM MARKER slides to your
// target FIRST, then the club's oval re-centers on it (crosswind pushes the whole pattern), then
// SEVERAL faded possible finishes appear inside that oval — every normal outcome of this swing —
// before one of them resolves into today's ball. Landing fires the approach-distance popup (the
// two-line comparison that prices the decision), then the ghost oval of the better club.
// GOLF HAS NO SHARED RENDERER: this module paints its own hole map per scenario — including the
// CONTINUOUS dogleg fairway that turns at the corner with OB straight through it. All copy (prompts,
// HUD, popups, verdicts, the 4-depth COACH'S READ) is lib data, verbatim.
export const THE_PINCH_RATIO = VB.w / VB.h;

const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const G_BASE = '#548f50', G_CORRIDOR = '#5e9a58', G_FW = '#8cc57f', G_FW_EDGE = '#a9dc9c';
const WATER = '#2a6fb8', WATER_SHADOW = '#245f9e', WATER_EDGE = '#7fb4e6';
const SAND = '#d8c48a', SAND_SHADOW = '#9c8550', SAND_RIM = '#b49b60', SAND_HI = '#e8d9a8';
const TREE_FILLS = ['#33652e', '#3b7135', '#2c5a28'];
const OB_TINT = '#8d5b6b';
const gradeColor = (k: Grade) => (k === 'good' ? TEAL : k === 'ok' ? AMBER : RED);

// Beat boundaries (ms): marker → oval → the possible finishes → today's swing → popup → ghost club.
const MARKER_END = 520, OVAL_END = 1080, GHOSTS_AT = 1240, GHOST_STEP = 115;
const FLY_START = 1960, FLY_END = 2760, POPUP_AT = 2980, REVEAL_AT = 3280, TOTAL = 3900;
const BURST_MS = 600, SPLASH_RING_MS = 800;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerpV = (a: Vec, b: Vec, f: number): Vec => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
const ydOf = (px: number) => Math.round((px - TEE[0]) / S);
// 'away' swings the driver — same club, different line (lib note), so it borrows the driver's oval.
const ovalFor = (k: PinchOption) => OVAL[k === 'away' ? 'drv' : k];
// A result's oval centre in px: its aim, plus whatever the crosswind pushes it (y-px).
const centerOf = (r: PinchResult): Vec => [pxOf(r.aim[0]), r.aim[1] + (r.shift ?? 0)];

// Tree-lined edges (fixed clumps, clear of the HUD label band along the top).
const CLUMPS: [number, number, number][] = [
  [40, 44, 18], [116, 26, 14], [196, 46, 19], [284, 28, 15], [372, 44, 17], [452, 26, 14], [548, 44, 18], [636, 28, 15],
  [46, 380, 19], [140, 400, 15], [236, 380, 20], [332, 402, 16], [430, 384, 18], [530, 402, 15], [624, 382, 19],
  [18, 152, 14], [16, 300, 16], [664, 160, 13], [666, 306, 15],
];
// The dogleg's inside corner is architecturally defended — the trees the aim-away shot finds.
const CORNER_TREES: [number, number, number][] = [[430, 148, 20], [468, 122, 16], [398, 116, 15], [462, 168, 14]];

function lbl(key: string, x: number, y: number, txt: string, fill: string, size = 11, opacity = 1): ReactNode[] {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD, opacity };
  return [
    <SvgText key={`${key}-o`} {...common} fill="none" stroke="#16331b" strokeWidth={4} strokeLinejoin="round">{txt}</SvgText>,
    <SvgText key={key} {...common} fill={fill}>{txt}</SvgText>,
  ];
}
function treeClump(key: string, cx: number, cy: number, r: number, i: number): ReactNode[] {
  const offs: [number, number, number][] = [[0, 0, r], [-r * 0.55, r * 0.3, r * 0.72], [r * 0.5, r * 0.32, r * 0.66]];
  return [
    <Ellipse key={`${key}s`} cx={cx + 3} cy={cy + 4} rx={r * 1.5} ry={r * 1.1} fill="#3a6b36" opacity={0.5} />,
    ...offs.map((o, j) => <Circle key={`${key}c${j}`} cx={cx + o[0]} cy={cy + o[1]} r={o[2]} fill={TREE_FILLS[(i + j) % 3]} stroke="#265223" strokeWidth={1.2} />),
    <Circle key={`${key}h`} cx={cx - r * 0.3} cy={cy - r * 0.35} r={r * 0.32} fill="#4d8f45" opacity={0.85} />,
  ];
}
function BoldText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={{ color: AMBER, fontWeight: '800' }}>{p}</Text> : p))}</Text>;
}

// The dogleg: ONE continuous fairway that runs out from the tee and turns UP at the corner —
// drawn as a thick round-joined stroke so the straight leg and the turn are the same ribbon.
const DOGLEG_SPINE = 'M300 240 L392 240 Q426 240 429 198 L431 106';
const DOGLEG_GREEN: Vec = [431, 74];

type Phase = 'idle' | 'run' | 'done';

// The explanation key rides UNDER the field, not at the bottom of the controls scroll: this field is
// WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved ALWAYS
// (~58pt, three compact rows at the field width) so the art size never jumps between states, and the
// height it frees is real height back in the controls column.
const LS_LEGEND_RESERVE = 58;

export default function ThePinchGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<PinchOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);
  const rafRef = useRef<number | null>(null);

  const s: PinchScenario = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const r = chosen ? s.res[chosen] : null;
  const answered = phase === 'done';

  // ── one rAF owner ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  const choose = (opt: PinchOption) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run'); setE(0);
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = Math.min(now - t0, TOTAL);
      setE(el);
      if (!revealed && el >= REVEAL_AT) { revealed = true; setPhase('done'); }
      if (el < TOTAL) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the hole map, painted per scenario ──
  const faded = phase !== 'idle';
  const readsOp = faded ? 0.3 : 1;
  const nodes: ReactNode[] = [];
  const greenC: Vec = s.dogleg ? DOGLEG_GREEN : [Math.min(646, pxOf(s.hole)), s.gy];

  nodes.push(<Rect key="base" x={0} y={0} width={VB.w} height={VB.h} fill={G_BASE} />);
  nodes.push(<Rect key="corr" x={10} y={112} width={660} height={236} rx={92} fill={G_CORRIDOR} opacity={0.85} />);
  if (s.dogleg) nodes.push(<Rect key="corr2" x={356} y={40} width={150} height={230} rx={70} fill={G_CORRIDOR} opacity={0.85} />);
  CLUMPS.forEach((c, i) => nodes.push(...treeClump(`t${i}`, c[0], c[1], c[2], i)));

  // OUT OF BOUNDS: on a dogleg, everything straight THROUGH the corner. Painted under the fairway so
  // the ribbon's turn reads as the hole leaving the boundary behind.
  if (s.dogleg) {
    const obX = pxOf(258) + 4;
    nodes.push(<Rect key="ob" x={obX} y={206} width={VB.w - obX} height={126} fill={OB_TINT} opacity={0.3} />);
    for (let y = 208; y <= 330; y += 24) {
      nodes.push(<Rect key={`obsV${y}`} x={obX - 2} y={y} width={4} height={13} rx={1.5} fill="#F4F4EE" opacity={0.95} />);
    }
    for (let x = obX + 24; x <= VB.w - 12; x += 34) {
      nodes.push(<Rect key={`obsH${x}`} x={x} y={202} width={4} height={13} rx={1.5} fill="#F4F4EE" opacity={0.95} />);
    }
    nodes.push(...lbl('obL', Math.min(600, obX + 116), 268, 'OUT OF BOUNDS', '#ffc9d4', 11, readsOp));
  }

  // the fairway: the authored bands, plus the continuous turn when the hole doglegs
  s.fw.forEach((f, i) => {
    nodes.push(<Rect key={`fw${i}`} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.h / 2} fill={G_FW} />);
    nodes.push(<Rect key={`fwe${i}`} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.h / 2} fill="none" stroke={G_FW_EDGE} strokeWidth={1.6} opacity={0.8} />);
  });
  if (s.dogleg) {
    nodes.push(<Path key="dogFw" d={DOGLEG_SPINE} fill="none" stroke={G_FW} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />);
    nodes.push(<Path key="dogFwE" d={DOGLEG_SPINE} fill="none" stroke={G_FW_EDGE} strokeWidth={47} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} />);
    CORNER_TREES.forEach((c, i) => nodes.push(...treeClump(`ct${i}`, c[0], c[1], c[2], i + 2)));
    nodes.push(...lbl('cornL', pxOf(258), 314, 'the corner — 258', '#f2f7ef', 10, readsOp));
  }

  // yardage ruler along the bottom of the fairway — the module's whole thesis is a yardage
  for (let y = 50; y <= 400; y += 50) {
    const x = pxOf(y);
    if (x > VB.w - 18) break;
    nodes.push(<Line key={`tk${y}`} x1={x} y1={298} x2={x} y2={306} stroke="#F4F4EE" strokeWidth={1.2} opacity={0.45 * readsOp} />);
    nodes.push(<SvgText key={`tkl${y}`} x={x} y={318} textAnchor="middle" fontSize={8.5} fontFamily={F_BOLD} fill="#e6efe4" opacity={0.55 * readsOp}>{String(y)}</SvgText>);
  }

  // water: the one-sided hazard (the AIM AWAY hole)
  if (s.water) {
    const w = s.water, ww = w.x2 - w.x1, wh = w.y2 - w.y1;
    nodes.push(<Rect key="wS" x={w.x1 + 3} y={w.y1 + 4} width={ww} height={wh} rx={22} fill={WATER_SHADOW} opacity={0.55} />);
    nodes.push(<Rect key="w" x={w.x1} y={w.y1} width={ww} height={wh} rx={22} fill={WATER} stroke={WATER_EDGE} strokeWidth={1.6} />);
    for (let i = 0; i < 2; i++) {
      nodes.push(<Path key={`rip${i}`} d={`M${w.x1 + 20} ${w.y1 + 14 + i * 16} q ${ww / 4} -6 ${ww / 2 - 10} 0 t ${ww / 2 - 30} 0`} fill="none" stroke={WATER_EDGE} strokeWidth={1.4} opacity={0.75} />);
    }
    nodes.push(...lbl('wL', (w.x1 + w.x2) / 2, w.y2 - 10, 'water', '#bfe0ff', 10.5, readsOp));
  }

  // the PINCH itself: sand both sides, and the yardage band they squeeze
  if (s.bunkers?.length) {
    const x1 = Math.min(...s.bunkers.map(b => b.cx - b.rx));
    const x2 = Math.max(...s.bunkers.map(b => b.cx + b.rx));
    nodes.push(<Rect key="band" x={x1} y={198} width={x2 - x1} height={92} fill={RED} opacity={0.13} />);
    [x1, x2].forEach((x, i) => nodes.push(<Line key={`bd${i}`} x1={x} y1={198} x2={x} y2={290} stroke="#ffb3ae" strokeWidth={1.6} strokeDasharray="5 5" opacity={0.85 * readsOp} />));
    nodes.push(...lbl('bandL', (x1 + x2) / 2, 190, `${ydOf(x1)}–${ydOf(x2)} out`, '#ffb3ae', 10, readsOp));
    s.bunkers.forEach((b, i) => {
      nodes.push(<Ellipse key={`bkS${i}`} cx={b.cx + 2} cy={b.cy + 3} rx={b.rx + 1} ry={b.ry + 1} fill={SAND_SHADOW} opacity={0.6} />);
      nodes.push(<Ellipse key={`bk${i}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={SAND} stroke={SAND_RIM} strokeWidth={1.5} />);
      nodes.push(<Ellipse key={`bkH${i}`} cx={b.cx - b.rx * 0.25} cy={b.cy - b.ry * 0.3} rx={b.rx * 0.55} ry={b.ry * 0.5} fill={SAND_HI} opacity={0.8} />);
    });
  }

  // the green + pin
  nodes.push(<Ellipse key="grS" cx={greenC[0] + 4} cy={greenC[1] + 6} rx={40} ry={34} fill="#1c3f24" opacity={0.45} />);
  nodes.push(<Circle key="gr1" cx={greenC[0]} cy={greenC[1]} r={36} fill="#5cae6b" />);
  nodes.push(<Circle key="gr2" cx={greenC[0]} cy={greenC[1]} r={30} fill="#67b975" />);
  nodes.push(<Circle key="gr3" cx={greenC[0]} cy={greenC[1]} r={24} fill="#79c886" stroke="#a8e0b1" strokeWidth={1.2} />);
  nodes.push(<Circle key="cup" cx={greenC[0]} cy={greenC[1]} r={2.6} fill={FE.navy} />);
  nodes.push(<Line key="stick" x1={greenC[0]} y1={greenC[1]} x2={greenC[0]} y2={greenC[1] - 26} stroke="#eee" strokeWidth={2} />);
  nodes.push(<Path key="flag" d={`M${greenC[0]} ${greenC[1] - 26} l 13 5 l -13 5 z`} fill={FE.orange} />);
  nodes.push(...lbl('grL', greenC[0], greenC[1] - 42, `${s.hole} yds`, '#d9e2d9', 10, readsOp));

  // the crosswind, pushing everything toward the hazard
  if (s.wind) {
    nodes.push(<Line key="wd" x1={160} y1={146} x2={160} y2={192} stroke="#F4F4EE" strokeWidth={3} strokeLinecap="round" opacity={0.9} />);
    nodes.push(<Path key="wdh" d="M160 196 l -7 -13 h 14 z" fill="#F4F4EE" opacity={0.9} />);
    nodes.push(...lbl('wdL', 160, 136, 'wind', '#F4F4EE', 10, readsOp));
  }

  // ── the aim marker + the dispersion oval (marker first, oval follows) ──
  const stockAim: Vec = [pxOf((s.clubs.drv + s.clubs.irn) / 2), s.gy];
  const aimP: Vec = r ? lerpV(stockAim, [pxOf(r.aim[0]), r.aim[1]], clamp01(e / MARKER_END)) : stockAim;
  const ovalTgt: Vec = r ? centerOf(r) : stockAim;
  const ovalP: Vec = r ? lerpV(stockAim, ovalTgt, clamp01((e - MARKER_END) / (OVAL_END - MARKER_END))) : stockAim;
  const ov = ovalFor(chosen ?? 'drv');
  nodes.push(<Ellipse key="oval" cx={ovalP[0]} cy={ovalP[1]} rx={ov.rx} ry={ov.ry} fill="#F4F4EE" fillOpacity={r ? 0.13 : 0.06}
    stroke="#F4F4EE" strokeWidth={r ? 2.2 : 1.4} strokeDasharray="7 5" opacity={r ? 0.95 : 0.5} />);
  if (r && r.shift && e >= MARKER_END) {
    nodes.push(<Line key="shift" x1={pxOf(r.aim[0])} y1={r.aim[1]} x2={ovalTgt[0]} y2={ovalTgt[1]} stroke="#ffe1b3" strokeWidth={2} strokeDasharray="3 4" opacity={0.9} />);
    if (e >= OVAL_END) nodes.push(...lbl('shL', ovalTgt[0], ovalTgt[1] + ov.ry + 16, 'wind pushed the pattern', '#ffe1b3', 9.5));
  }
  nodes.push(<Line key="mkH" x1={aimP[0] - 9} y1={aimP[1]} x2={aimP[0] + 9} y2={aimP[1]} stroke={AMBER} strokeWidth={2.5} />);
  nodes.push(<Line key="mkV" x1={aimP[0]} y1={aimP[1] - 9} x2={aimP[0]} y2={aimP[1] + 9} stroke={AMBER} strokeWidth={2.5} />);
  nodes.push(<Circle key="mkC" cx={aimP[0]} cy={aimP[1]} r={5.5} fill="none" stroke={AMBER} strokeWidth={2} />);

  // ── the resolve layer (pure function of e) ──
  if (r) {
    // several possible finishes inside the oval, arriving one by one — then one of them is today's
    if (e >= GHOSTS_AT) {
      GHOSTS.forEach((f, i) => {
        if (e < GHOSTS_AT + i * GHOST_STEP) return;
        const op = clamp01((e - (GHOSTS_AT + i * GHOST_STEP)) / 220);
        nodes.push(<Circle key={`gh${i}`} cx={ovalTgt[0] + f[0] * ov.rx * 0.82} cy={ovalTgt[1] + f[1] * ov.ry * 0.82} r={4.2} fill="#fff" opacity={0.3 * op} />);
      });
      nodes.push(...lbl('ghL', ovalTgt[0], ovalTgt[1] + ov.ry + (r.shift ? 30 : 16), 'possible finishes — same swing', '#e6efe4', 8.5, clamp01((e - GHOSTS_AT) / 300)));
    }
    const landP: Vec = [pxOf(r.land[0]), r.land[1]];
    const k = clamp01((e - FLY_START) / (FLY_END - FLY_START));
    if (e >= FLY_START) {
      const mk = 1 - k, mx = (TEE[0] + landP[0]) / 2, my = (TEE[1] + landP[1]) / 2 - 40;
      const bx = mk * mk * TEE[0] + 2 * mk * k * mx + k * k * landP[0];
      const by = mk * mk * TEE[1] + 2 * mk * k * my + k * k * landP[1];
      nodes.push(<Circle key="ball" cx={bx} cy={by} r={5 + 3.6 * Math.sin(Math.PI * k)} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
    } else {
      nodes.push(<Circle key="ball" cx={TEE[0]} cy={TEE[1]} r={5} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
    }
    if (e >= FLY_END) {
      const col = gradeColor(r.k);
      if (r.splash) {
        for (let i = 0; i < 3; i++) {
          const p = clamp01((e - FLY_END - i * 140) / SPLASH_RING_MS);
          if (p > 0 && p < 1) nodes.push(<Circle key={`spl${i}`} cx={landP[0]} cy={landP[1]} r={4 + (16 + i * 8) * p} fill="none" stroke="#bfe0ff" strokeWidth={2.5} opacity={0.95 * (1 - p)} />);
        }
        nodes.push(...lbl('splL', landP[0], landP[1] - 20, 'SPLASH', '#ffb3ae', 12));
      } else {
        const bp = clamp01((e - FLY_END) / BURST_MS);
        if (bp < 1) nodes.push(<Circle key="burst" cx={landP[0]} cy={landP[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        if (r.sand) nodes.push(...lbl('sdL', landP[0], landP[1] + 22, 'in the sand', '#ffb3ae', 10.5));
        if (r.ob) nodes.push(...lbl('obR', landP[0], landP[1] - 20, 'OB — stroke AND distance', '#ffb3ae', 10.5));
        if (r.tree) nodes.push(...lbl('trL', landP[0], landP[1] - 20, 'in the corner trees', '#ffb3ae', 10.5));
      }
      // the approach-distance comparison — the number that prices the whole decision
      if (e >= POPUP_AT) {
        const tone = r.k === 'bad' ? RED : r.k === 'good' ? TEAL : '#48557a';
        nodes.push(<Rect key="pop" x={18} y={14} width={292} height={48} rx={9} fill={FE.navy} opacity={0.95} stroke={tone} strokeWidth={1.6} />);
        r.pop.forEach((line, i) => nodes.push(
          <SvgText key={`popT${i}`} x={164} y={35 + i * 17} textAnchor="middle" fontSize={i ? 10.5 : 12} fontFamily={F_BOLD}
            fill={i ? '#d7dfef' : r.k === 'bad' ? '#ffb3ae' : r.k === 'good' ? '#bfe9da' : '#ffd9b3'}>{line}</SvgText>));
      }
      // the club that was right, as its own oval
      if (e >= REVEAL_AT && r.ghost) {
        const gr = s.res[r.ghost], gov = ovalFor(r.ghost), gc = centerOf(gr);
        nodes.push(<Ellipse key="ghost" cx={gc[0]} cy={gc[1]} rx={gov.rx} ry={gov.ry} fill={TEAL} fillOpacity={0.07}
          stroke={TEAL} strokeWidth={2.2} strokeDasharray="7 5" opacity={0.95} />);
        if (r.ghostLab) nodes.push(...lbl('ghostL', Math.max(96, Math.min(584, gc[0])), gc[1] - gov.ry - 12, r.ghostLab, '#7be0bf', 10));
      }
    }
  } else {
    nodes.push(<Circle key="ball" cx={TEE[0]} cy={TEE[1]} r={5} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
  }
  nodes.push(...lbl('teeL', TEE[0] + 2, TEE[1] - 16, 'tee', '#fff', 10, readsOp));

  const field = (
    <View style={styles.canvasWrap}>
      <Svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={styles.svg}>{nodes}</Svg>
    </View>
  );

  // ── chrome ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.hud.map((c, i) => (
        <View key={i} style={styles.chip}>
          <Text style={styles.chipTxt}>{c.label}: <Text style={[styles.chipVal, c.warn && styles.chipValWarn]}>{c.value}</Text></Text>
        </View>
      ))}
    </View>
  );
  const promptText = answered ? PROMPT_DONE
    : !chosen ? s.prompt
    : e < FLY_START ? NARR_OVAL
    : NARR_TODAY;
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <BoldText text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{answered ? HINT_DONE : HINT_IDLE}</Text>
    </View>
  );
  const judgeBtns = (
    <View style={styles.judgeCol}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.key} style={[styles.judgeBtn, phase === 'run' && styles.judgeBtnDim, landscape && styles.judgeBtnLs]}
          activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(o.key)}>
          <Text style={[styles.judgeTitle, landscape && styles.judgeTitleLs]}>{o.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.key !== 'away' ? `${s.clubs[o.key]} yds` : o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#999' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Your ball</Text></View>
      <Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>⌖ Aim — moves first</Text>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: '#F4F4EE' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Oval — every normal outcome</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, { backgroundColor: SAND }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Sand</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: WATER }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Water</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: TEAL }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Ghost = the safer club</Text></View>
      <Text style={styles.legendMuted}>numbers = yards from tee</Text>
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  const verdictCard = answered && r ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, r.k === 'good' ? styles.vtagGood : r.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {r.k === 'good' ? 'Right call' : r.k === 'ok' ? 'Defensible' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{r.t}</Text>
      <Text style={styles.vbody}>{r.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: hole map left via the shell; chips + prompt + clubs (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={THE_PINCH_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={pills}
        field={field}
        belowField={lsLegendUnder}
        controls={answered ? <>{promptBlock}{verdictCard}</> : <>{hudChips}{promptBlock}{judgeBtns}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {field}
      {legend}
      {promptBlock}
      {answered ? verdictCard : judgeBtns}
      {answered && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
          <NextButton visible variant="filled" label="Next tee shot →" onPress={nextScenario} />
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  canvasWrap: { borderRadius: 14, overflow: 'hidden' },
  svg: { width: '100%', aspectRatio: THE_PINCH_RATIO, backgroundColor: '#24512f' },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipVal: { color: t.accentText },
  chipValWarn: { color: '#e24b4a' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeCol: { gap: 8 },
  judgeBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', minHeight: 48 },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeBtnDim: { opacity: 0.4 },
  judgeTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTitleLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendDashed: { borderWidth: 2, backgroundColor: 'transparent' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  legendMuted: { color: t.textSecondaryOnDark, fontSize: 11, opacity: 0.7 },
  lsLegendUnder: { minHeight: LS_LEGEND_RESERVE, paddingTop: 4, justifyContent: 'center' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
