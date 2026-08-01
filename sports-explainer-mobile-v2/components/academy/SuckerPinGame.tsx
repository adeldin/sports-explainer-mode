import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Circle, Ellipse, Line, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import {
  SCENARIOS, OPTIONS, OTHER_DAYS, NARR_PICKED, NARR_OVAL, NARR_SWING, PROMPT_DONE, HINT_IDLE, HINT_DONE,
  VB, GC, GRX, GRY, BALL, STOCK_AIM, onGreen, feet,
  type SuckerPinOption, type Depth, type Grade, type Vec,
} from '../../lib/suckerPin';

// Sucker Pin — approach-shot targeting. The module's engine is the owner-driven teaching beat:
// the AIM MARKER (amber crosshair) slides to your target FIRST, then the whole dispersion OVAL
// re-centers on it (wind adds its push), faded "other days" balls appear inside the pattern, and
// only then does today's ball fly. GOLF HAS NO SHARED RENDERER: this module paints its own green
// complex per scenario (tree edges, layered green, rimmed bunkers, pond, approach corridor) —
// faithfully from golfcorner/sucker-pin.html. Reveals: short-side wedge fan, short-tail highlight
// arcs, ghost of the better aim. Single-rafRef timeline; verdict + 4-depth COACH'S READ.
export const SUCKER_PIN_RATIO = VB.w / VB.h;

const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const WATER = '#2a6fb8', WATER_SHADOW = '#245f9e', WATER_EDGE = '#7fb4e6';
const SAND = '#d8c48a', SAND_SHADOW = '#9c8550', SAND_RIM = '#b49b60', SAND_HI = '#e8d9a8';
const TREE_FILLS = ['#33652e', '#3b7135', '#2c5a28'];
const gradeColor = (k: Grade) => (k === 'good' ? TEAL : k === 'ok' ? AMBER : RED);

// Beat boundaries: marker moves FIRST → oval re-centers → other-days balls → the swing → reveal.
const MARKER_END = 550, OVAL_END = 1150, FLY_START = 1500, FLY_END = 2500, REVEAL_AT = 2950, TOTAL = 3550;
const BURST_MS = 600, SPLASH_RING_MS = 800;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerpV = (a: Vec, b: Vec, f: number): Vec => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

const CLUMPS: [number, number, number][] = [
  [52, 52, 17], [124, 34, 13], [58, 148, 15], [38, 248, 16], [66, 344, 14],
  [152, 398, 16], [244, 42, 13], [336, 30, 12], [600, 392, 15], [662, 368, 13],
];
const WATER_BLOB = 'M486 116 Q 462 180 476 226 Q 462 292 492 326 Q 570 350 634 330 Q 682 292 670 216 Q 678 152 646 118 Q 566 92 486 116 Z';

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

type Phase = 'idle' | 'run' | 'done';

export default function SuckerPinGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<SuckerPinOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);
  const rafRef = useRef<number | null>(null);

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const o = chosen ? s.opts[chosen] : null;
  const answered = phase === 'done';

  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  const choose = (opt: SuckerPinOption) => {
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

  // ── the green complex, painted per scenario ──
  const faded = phase !== 'idle';
  const readsOp = faded ? 0.25 : 1;                                  // labels fade on choose; the art stays
  const nodes: ReactNode[] = [];

  nodes.push(<Rect key="base" x={0} y={0} width={VB.w} height={VB.h} fill="#548f50" />);
  CLUMPS.forEach((c, i) => nodes.push(...treeClump(`t${i}`, c[0], c[1], c[2], i)));
  // approach corridor (fairway below the green) + break marks: the shot is longer than the frame
  nodes.push(<Rect key="corr" x={290} y={330} width={100} height={90} rx={24} fill="#8cc57f" opacity={0.95} />);
  nodes.push(<Rect key="corrE" x={290} y={330} width={100} height={90} rx={24} fill="none" stroke="#a9dc9c" strokeWidth={1.6} opacity={0.8} />);
  nodes.push(<Line key="brk1" x1={316} y1={376} x2={334} y2={366} stroke="#F4F4EE" strokeWidth={2} opacity={0.7} />);
  nodes.push(<Line key="brk2" x1={322} y1={382} x2={340} y2={372} stroke="#F4F4EE" strokeWidth={2} opacity={0.7} />);
  if (s.water) {
    nodes.push(<Path key="wS" d={WATER_BLOB} fill={WATER_SHADOW} opacity={0.55} translateX={3} translateY={4} />);
    nodes.push(<Path key="w" d={WATER_BLOB} fill={WATER} stroke={WATER_EDGE} strokeWidth={1.6} />);
    for (let i = 0; i < 4; i++) nodes.push(<Path key={`rip${i}`} d={`M488 ${140 + i * 52} q 40 -8 80 0 t 80 0`} fill="none" stroke={WATER_EDGE} strokeWidth={1.6} opacity={0.8} />);
    nodes.push(...lbl('wL', 572, 96, 'water', '#bfe0ff', 10.5, readsOp));
  }
  s.bunkers.forEach((b, i) => {
    nodes.push(<Ellipse key={`bkS${i}`} cx={b.cx + 2} cy={b.cy + 3} rx={b.rx + 1} ry={b.ry + 1} fill={SAND_SHADOW} opacity={0.6} />);
    nodes.push(<Ellipse key={`bk${i}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={SAND} stroke={SAND_RIM} strokeWidth={1.5} />);
    nodes.push(<Ellipse key={`bkH${i}`} cx={b.cx - b.rx * 0.25} cy={b.cy - b.ry * 0.3} rx={b.rx * 0.55} ry={b.ry * 0.5} fill={SAND_HI} opacity={0.8} />);
  });
  if (s.bunkers.length) nodes.push(...lbl('sandL', s.bunkers[0].cx, s.bunkers[0].cy + s.bunkers[0].ry + 14, 'sand', '#f0e0b0', 10, readsOp));
  // the green (layered) + pin
  nodes.push(<Ellipse key="grS" cx={GC[0] + 4} cy={GC[1] + 6} rx={GRX + 14} ry={GRY + 10} fill="#1c3f24" opacity={0.4} />);
  nodes.push(<Ellipse key="gr1" cx={GC[0]} cy={GC[1]} rx={GRX + 12} ry={GRY + 12} fill="#5cae6b" />);
  nodes.push(<Ellipse key="gr2" cx={GC[0]} cy={GC[1]} rx={GRX + 5} ry={GRY + 5} fill="#67b975" />);
  nodes.push(<Ellipse key="gr3" cx={GC[0]} cy={GC[1]} rx={GRX} ry={GRY} fill="#79c886" stroke="#a8e0b1" strokeWidth={1.2} />);
  nodes.push(<Circle key="cup" cx={s.pin[0]} cy={s.pin[1]} r={2.6} fill={FE.navy} />);
  nodes.push(<Line key="stick" x1={s.pin[0]} y1={s.pin[1]} x2={s.pin[0]} y2={s.pin[1] - 24} stroke="#eee" strokeWidth={2} />);
  nodes.push(<Path key="flag" d={`M${s.pin[0]} ${s.pin[1] - 24} l 12 4.5 l -12 4.5 z`} fill={FE.orange} />);
  if (s.opp) {
    nodes.push(<Circle key="opp" cx={s.opp[0]} cy={s.opp[1]} r={5} fill="#c9b2df" stroke="#8e44ad" strokeWidth={2} />);
    nodes.push(...lbl('oppL', s.opp[0] + 4, s.opp[1] - 12, 'OPP — 8 ft', '#e6d8f2', 9.5, readsOp));
  }
  if (s.wind) {
    nodes.push(<Line key="windA" x1={196} y1={64} x2={296} y2={64} stroke="#F4F4EE" strokeWidth={3} strokeLinecap="round" opacity={0.9} />);
    nodes.push(<Path key="windH" d="M296 64 l -12 -7 v 14 z" fill="#F4F4EE" opacity={0.9} />);
    nodes.push(...lbl('windL', 246, 48, 'wind — toward the water', '#F4F4EE', 10, readsOp));
  }

  // ── the aim marker + dispersion oval (the module's engine: marker moves FIRST, oval follows) ──
  const aimTarget: Vec = o ? o.aim : STOCK_AIM;
  const ovalTarget: Vec = o ? [o.aim[0] + s.shift[0], o.aim[1] + s.shift[1]] : STOCK_AIM;
  const markerP = o ? lerpV(STOCK_AIM, aimTarget, clamp01(e / MARKER_END)) : STOCK_AIM;
  const ovalP = o ? lerpV(STOCK_AIM, ovalTarget, clamp01((e - MARKER_END) / (OVAL_END - MARKER_END))) : STOCK_AIM;
  nodes.push(<Ellipse key="oval" cx={ovalP[0]} cy={ovalP[1]} rx={s.oval.rx} ry={s.oval.ry} fill="#F4F4EE" fillOpacity={0.1}
    stroke="#F4F4EE" strokeWidth={2} strokeDasharray="7 5" opacity={0.9} />);
  if (o && (s.shift[0] || s.shift[1]) && e >= MARKER_END) {          // the wind's push, drawn
    nodes.push(<Line key="shift" x1={o.aim[0]} y1={o.aim[1]} x2={ovalTarget[0]} y2={ovalTarget[1]} stroke="#ffe1b3" strokeWidth={2} strokeDasharray="3 4" opacity={0.9} />);
    if (e >= OVAL_END) nodes.push(...lbl('shiftL', ovalTarget[0], ovalTarget[1] - s.oval.ry - 10, 'wind pushed the pattern', '#ffe1b3', 9.5));
  }
  nodes.push(<Line key="mkH" x1={markerP[0] - 9} y1={markerP[1]} x2={markerP[0] + 9} y2={markerP[1]} stroke={AMBER} strokeWidth={2.5} />);
  nodes.push(<Line key="mkV" x1={markerP[0]} y1={markerP[1] - 9} x2={markerP[0]} y2={markerP[1] + 9} stroke={AMBER} strokeWidth={2.5} />);
  nodes.push(<Circle key="mkC" cx={markerP[0]} cy={markerP[1]} r={5.5} fill="none" stroke={AMBER} strokeWidth={2} />);

  // ── the resolve layer (pure function of e) ──
  if (o) {
    if (e >= FLY_START) {                                            // other days, same swing
      OTHER_DAYS.forEach((f, i) => nodes.push(
        <Circle key={`od${i}`} cx={ovalTarget[0] + f[0] * s.oval.rx * 0.85} cy={ovalTarget[1] + f[1] * s.oval.ry * 0.85} r={4} fill="#fff" opacity={0.28} />));
      nodes.push(...lbl('odL', ovalTarget[0], ovalTarget[1] + s.oval.ry + 18, 'faded balls = other days, same swing', '#d9e2d9', 8.5));
    }
    const k = clamp01((e - FLY_START) / (FLY_END - FLY_START));
    const mk = 1 - k, mx = (BALL[0] + o.land[0]) / 2 - 30, my = (BALL[1] + o.land[1]) / 2;
    const bx = mk * mk * BALL[0] + 2 * mk * k * mx + k * k * o.land[0];
    const by = mk * mk * BALL[1] + 2 * mk * k * my + k * k * o.land[1];
    nodes.push(<Circle key="ball" cx={bx} cy={by} r={5 + 3.4 * Math.sin(Math.PI * k)} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
    if (e >= FLY_END) {
      const col = gradeColor(o.k);
      if (o.splash) {
        for (let i = 0; i < 3; i++) {
          const p = clamp01((e - FLY_END - i * 140) / SPLASH_RING_MS);
          if (p > 0 && p < 1) nodes.push(<Circle key={`spl${i}`} cx={o.land[0]} cy={o.land[1]} r={4 + (16 + i * 8) * p} fill="none" stroke="#bfe0ff" strokeWidth={2.5} opacity={0.95 * (1 - p)} />);
        }
        nodes.push(...lbl('splL', o.land[0], o.land[1] - 20, 'SPLASH — hitting 4', '#ffb3ae', 12));
      } else if (o.sand) {
        const bp = clamp01((e - FLY_END) / BURST_MS);
        if (bp < 1) nodes.push(<Circle key="burst" cx={o.land[0]} cy={o.land[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        nodes.push(...lbl('sandedL', o.land[0], o.land[1] + 22, 'in the sand', '#ffb3ae', 11));
        if (o.fan) {                                                 // the short-side wedge fan: barely any green between lip and hole
          const strip = s.pin[0] - (GC[0] - GRX * Math.sqrt(1 - ((s.pin[1] - GC[1]) / GRY) ** 2)) - 8;
          ([[-10, -30], [6, -38]] as Vec[]).forEach((d, i) => nodes.push(
            <Line key={`fan${i}`} x1={o.land[0]} y1={o.land[1]} x2={s.pin[0] + d[0]} y2={s.pin[1] + d[1]} stroke="#ffd9b3" strokeWidth={1.6} strokeDasharray="4 4" opacity={0.9} />));
          nodes.push(...lbl('fanL', s.pin[0] + 6, s.pin[1] - 52, `SHORT-SIDED — ≈${Math.round(strip / 2)} ft of green to land on`, '#ffb3ae', 10.5));
        }
      } else {
        const bp = clamp01((e - FLY_END) / BURST_MS);
        if (bp < 1) nodes.push(<Circle key="burst" cx={o.land[0]} cy={o.land[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        const ft = feet(o.land, s.pin);                              // the putt, drawn: landing → hole
        nodes.push(<Line key="putt" x1={o.land[0]} y1={o.land[1]} x2={s.pin[0]} y2={s.pin[1]} stroke="#F4F4EE" strokeWidth={1.6} strokeDasharray="3 4" opacity={0.8} />);
        nodes.push(...lbl('puttL', (o.land[0] + s.pin[0]) / 2, (o.land[1] + s.pin[1]) / 2 - 12, `${ft} ft putt`, o.k === 'good' ? '#bfe9da' : '#ffe1b3', 11));
        if (!onGreen(o.land[0], o.land[1])) nodes.push(...lbl('offL', o.land[0], o.land[1] + 20, 'off the green — chipping', '#ffb3ae', 10));
      }
      if (o.tail && e >= REVEAL_AT) {                                // the short-tail highlight arc (red = still in play / teal = deleted)
        let d = '';
        for (let a = 35; a <= 145; a += 10) {
          const rr = (a * Math.PI) / 180;
          d += `${d ? ' L' : 'M'}${(ovalTarget[0] + s.oval.rx * Math.cos(rr)).toFixed(1)} ${(ovalTarget[1] + s.oval.ry * Math.sin(rr)).toFixed(1)}`;
        }
        nodes.push(<Path key="tail" d={d} fill="none" stroke={o.tail.col} strokeWidth={3} strokeDasharray="6 5" opacity={0.95} />);
        nodes.push(...lbl('tailL', ovalTarget[0], ovalTarget[1] + s.oval.ry + 18, o.tail.lab, o.tail.col === '#e24b4a' ? '#ffb3ae' : '#7be0cd', 9.5));
      }
      if (o.ghost && e >= REVEAL_AT) {                               // the better aim, revealed
        const g = s.opts[o.ghost];
        const c: Vec = [g.aim[0] + s.shift[0], g.aim[1] + s.shift[1]];
        nodes.push(<Ellipse key="ghost" cx={c[0]} cy={c[1]} rx={s.oval.rx} ry={s.oval.ry} fill="none" stroke={TEAL} strokeWidth={2.2} strokeDasharray="7 5" opacity={0.95} />);
        if (o.ghostLab) nodes.push(...lbl('ghL', c[0], c[1] - s.oval.ry - 10, o.ghostLab, '#7be0bf', 10));
      }
    }
  } else {
    nodes.push(<Circle key="ball" cx={BALL[0]} cy={BALL[1]} r={5} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
  }
  nodes.push(...lbl('distL', BALL[0] - 44, BALL[1] - 2, `${s.dist} yds`, '#fff', 10.5, readsOp));
  nodes.push(...lbl('youL', BALL[0] + 30, BALL[1] - 2, 'you', '#fff', 10, readsOp));
  if (s.oval.rx > 80) nodes.push(...lbl('grewL', 350, 196 + s.oval.ry + 16, 'rough + wind: the oval GREW', '#ffe1b3', 10, readsOp));

  const field = (
    <View style={styles.canvasWrap}>
      <Svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={styles.svg}>{nodes}</Svg>
    </View>
  );

  // ── chrome ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={kk => resetTo(Number(kk))} />;
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
    : e < OVAL_END ? NARR_PICKED
    : e < FLY_START ? NARR_OVAL
    : NARR_SWING;
  const promptBlock = (
    <View style={styles.prompt}>
      <BoldText text={promptText} style={styles.promptTxt} />
      <Text style={styles.hintTxt}>{answered ? HINT_DONE : HINT_IDLE}</Text>
    </View>
  );
  const judgeBtns = (
    <View style={styles.judgeCol}>
      {OPTIONS.map(ob => (
        <TouchableOpacity key={ob.key} style={[styles.judgeBtn, ob.alt && styles.judgeBtnAlt, phase === 'run' && styles.judgeBtnDim]}
          activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(ob.key)}>
          <Text style={styles.judgeTitle}>{ob.title}</Text>
          <Text style={styles.judgeSub}>{ob.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={styles.legend}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#999' }]} /><Text style={styles.legendTxt}>Your ball</Text></View>
      <Text style={styles.legendTxt}>⌖ Aim marker — it moves first</Text>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: '#F4F4EE' }]} /><Text style={styles.legendTxt}>Dispersion oval — re-centers on your aim</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, { backgroundColor: SAND }]} /><Text style={styles.legendTxt}>Sand</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: WATER }]} /><Text style={styles.legendTxt}>Water</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: TEAL }]} /><Text style={styles.legendTxt}>Ghost = the better aim</Text></View>
    </View>
  );
  const verdictCard = answered && o ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, o.k === 'good' ? styles.vtagGood : o.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {o.k === 'good' ? 'Right call' : o.k === 'ok' ? 'Defensible' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{o.t}</Text>
      <Text style={styles.vbody}>{o.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SUCKER_PIN_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{promptBlock}{verdictCard}{legend}</> : <>{hudChips}{promptBlock}{judgeBtns}{legend}</>}
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
      {answered ? verdictCard : judgeBtns}
      {answered && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
          <NextButton visible variant="filled" label="Next pin →" onPress={nextScenario} />
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  canvasWrap: { borderRadius: 14, overflow: 'hidden' },
  svg: { width: '100%', aspectRatio: SUCKER_PIN_RATIO, backgroundColor: '#24512f' },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipVal: { color: t.accentText },
  chipValWarn: { color: '#e24b4a' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  judgeCol: { gap: 8 },
  judgeBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', minHeight: 48 },
  judgeBtnAlt: { backgroundColor: '#0d1b3e' },
  judgeBtnDim: { opacity: 0.4 },
  judgeTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendDashed: { borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'transparent' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
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
