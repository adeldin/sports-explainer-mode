import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Circle, Ellipse, Line, Path, Defs, ClipPath, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import {
  SCENARIOS, OPTIONS, NARRATION, HINT_IDLE, HINT_DONE, PROMPT_DONE,
  VB, BX, CY, GX, GY, GR, pxOf,
  type GoLayOption, type GoLayScenario, type Depth, type Grade,
} from '../../lib/goOrLay';

// Go or Lay? — the par-5 second-shot call ("golf's fourth-down decision"). GOLF HAS NO SHARED
// RENDERER: this module paints its OWN decorated hole map per scenario (tree-lined edges, wavy
// fairway ribbon with mow bands, bean-shaped water that SEVERS the fairway, rimmed bunkers,
// layered green) — owner-approved art style, ported faithfully from golfcorner/go-or-lay.html.
// The core read is the dispersion ZONE (oval of misses) with an E bubble (expected strokes) over
// each landing option. On choose: reads fade → ball flies → outcome (splash/burst) → on-map popup
// → ghost of the better zone → verdict + 4-depth COACH'S READ. Single-rafRef timeline.
export const GO_OR_LAY_RATIO = VB.w / VB.h;

const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const G_BASE = '#548f50', G_CORRIDOR = '#5e9a58', G_FW = '#8cc57f', G_BAND_A = '#95cd88', G_BAND_B = '#84bc77', G_FW_EDGE = '#a9dc9c';
const WATER = '#2a6fb8', WATER_SHADOW = '#245f9e', WATER_EDGE = '#7fb4e6';
const SAND = '#d8c48a', SAND_SHADOW = '#9c8550', SAND_RIM = '#b49b60', SAND_HI = '#e8d9a8';
const TREE_FILLS = ['#33652e', '#3b7135', '#2c5a28'];
const gradeColor = (k: Grade) => (k === 'good' ? TEAL : k === 'ok' ? AMBER : RED);

// Beat boundaries of the single-raf resolve timeline (ms).
const FLY_MS = 1100, SPLASH_HOLD = 700, GHOST_DELAY = 420, BURST_MS = 600, SPLASH_RING_MS = 800;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Tree clumps (fixed; kept clear of the top-right label zone) — the decorated tree-lined edges.
const CLUMPS: [number, number, number][] = [
  [60, 52, 20], [132, 34, 16], [205, 58, 22], [286, 36, 17], [362, 52, 19], [430, 32, 15],
  [70, 372, 21], [150, 394, 16], [238, 372, 22], [330, 396, 17], [420, 376, 20], [512, 398, 16], [598, 380, 21], [655, 346, 15],
  [24, 146, 15], [16, 232, 18], [30, 312, 15], [652, 120, 14],
];
// The fairway: soft-waisted ribbon (checkerboard mow bands clip to it).
const FW_PATH = 'M-20 198 C 50 188, 116 202, 188 195 C 258 188, 302 204, 372 197 C 438 191, 498 199, 542 212 Q 582 224, 585 240 Q 582 257, 542 269 C 498 283, 438 290, 372 283 C 302 276, 258 293, 188 286 C 116 279, 50 291, -20 282 Z';

// Two-pass outlined SVG label (react-native-svg has no paint-order) — legible on any turf.
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
// Prompt text with <b>…</b> spans rendered amber-bold (spike prompt markup, verbatim copy).
function BoldText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={{ color: AMBER, fontWeight: '800' }}>{p}</Text> : p))}</Text>;
}

type Phase = 'idle' | 'run' | 'done';

export default function GoOrLayGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<GoLayOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);                                    // resolve-timeline elapsed ms
  const rafRef = useRef<number | null>(null);

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const px = (yds: number) => pxOf(s.dist, yds);
  const r = chosen ? s.res[chosen] : null;
  const answered = phase === 'done';

  // ── one rAF owner — stopLoop cancels it (on reset, on select, on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  // Timeline boundaries for the chosen result (splash outcomes add the penalty-drop beat).
  const times = (res: NonNullable<typeof r>) => {
    const landAt = FLY_MS;
    const popupAt = res.splash ? landAt + SPLASH_HOLD : landAt;      // drop+burst+popup after the splash beat
    const ghostAt = popupAt + GHOST_DELAY;                            // ghost zone + verdict together
    return { landAt, popupAt, ghostAt, total: ghostAt + BURST_MS };
  };

  const choose = (opt: GoLayOption) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run'); setE(0);
    const T = times(s.res[opt]);
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = Math.min(now - t0, T.total);
      setE(el);
      if (!revealed && el >= T.ghostAt) { revealed = true; setPhase('done'); }
      if (el < T.total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the hole map, painted per scenario (derived from s / chosen / e each render) ──
  const faded = phase !== 'idle';                                    // reads did their job — outcome owns the map
  const readsOp = faded ? 0.25 : 1;
  const T = r ? times(r) : null;
  const nodes: ReactNode[] = [];

  // ground: deep rough base → lighter corridor → tree-lined edges → fairway ribbon + mow bands
  nodes.push(<Rect key="base" x={0} y={0} width={VB.w} height={VB.h} fill={G_BASE} />);
  nodes.push(<Rect key="corr" x={14} y={104} width={652} height={250} rx={96} fill={G_CORRIDOR} opacity={0.9} />);
  CLUMPS.forEach((c, i) => nodes.push(...treeClump(`t${i}`, c[0], c[1], c[2], i)));
  nodes.push(<Path key="fw" d={FW_PATH} fill={G_FW} />);
  nodes.push(
    <Defs key="fwdef"><ClipPath id="golFw"><Path d={FW_PATH} /></ClipPath></Defs>,
    <G key="fwbands" clipPath="url(#golFw)">
      {Array.from({ length: 11 }, (_, i) => (
        <Rect key={`b${i}`} x={-20 + i * 58} y={184} width={58} height={112} fill={i % 2 ? G_BAND_A : G_BAND_B} opacity={0.9} />
      ))}
    </G>,
    <Path key="fwedge" d={FW_PATH} fill="none" stroke={G_FW_EDGE} strokeWidth={2} opacity={0.8} />,
  );

  // hazards: the bean water SEVERS the fairway (no mowed grass sneaks past its right side)
  if (s.water) {
    const x1 = px(s.water.from), x2 = px(s.water.to), cx = (x1 + x2) / 2;
    const sever = `M${x1 - 4} 178 Q ${x1 - 16} 214 ${x1 - 2} 244 Q ${x1 - 14} 276 ${x1 - 6} 300 L 668 300 L 668 178 Z`;
    const bean = `M${x1 + 6} 186 Q ${x1 - 10} 212 ${x1 + 2} 240 Q ${x1 + 12} 274 ${x1 + 22} 296 Q ${cx} 314 ${x2 - 16} 299 Q ${x2 + 10} 272 ${x2 + 2} 240 Q ${x2 - 4} 210 ${x2 - 18} 191 Q ${cx} 172 ${x1 + 6} 186 Z`;
    nodes.push(<Path key="sever" d={sever} fill={G_CORRIDOR} />);
    nodes.push(<Path key="beanS" d={bean} fill={WATER_SHADOW} opacity={0.55} translateX={3} translateY={4} />);
    nodes.push(<Path key="bean" d={bean} fill={WATER} stroke={WATER_EDGE} strokeWidth={1.6} />);
    for (let i = 0; i < 3; i++) {
      const dx = x2 - x1;
      nodes.push(<Path key={`rip${i}`} d={`M${x1 + 12} ${210 + i * 30} q ${dx / 4} -6 ${dx / 2 - 6} 0 t ${dx / 2 - 22} 0`} fill="none" stroke={WATER_EDGE} strokeWidth={1.4} opacity={0.75} />);
    }
    nodes.push(...lbl('waterL', cx - 16, 162, 'water', '#bfe0ff', 10.5, readsOp));
  }
  if (s.neck) {                                                      // the pinched neck: bunkers both sides of the close zone
    [194, 286].forEach((yy, i) => {
      nodes.push(<Ellipse key={`nkS${i}`} cx={px(202) + 2} cy={yy + 3} rx={27} ry={16} fill={SAND_SHADOW} opacity={0.6} />);
      nodes.push(<Ellipse key={`nk${i}`} cx={px(202)} cy={yy} rx={26} ry={15} fill={SAND} stroke={SAND_RIM} strokeWidth={1.5} />);
      nodes.push(<Ellipse key={`nkH${i}`} cx={px(202) - 5} cy={yy - 4} rx={15} ry={8} fill={SAND_HI} opacity={0.8} />);
    });
    nodes.push(...lbl('neckL', px(202), 332, 'the neck — sand both sides', '#f0e0b0', 10, readsOp));
  }

  // the green + flag: pin sits at the FRONT of a green pushed back past the water
  const gc = px(s.dist) + 24;
  nodes.push(<Ellipse key="grS" cx={gc + 4} cy={GY + 6} rx={GR + 12} ry={GR + 8} fill="#1c3f24" opacity={0.45} />);
  nodes.push(<Circle key="gr1" cx={gc} cy={GY} r={GR + 10} fill="#5cae6b" />);
  nodes.push(<Circle key="gr2" cx={gc} cy={GY} r={GR + 4} fill="#67b975" />);
  nodes.push(<Circle key="gr3" cx={gc} cy={GY} r={GR} fill="#79c886" stroke="#a8e0b1" strokeWidth={1.2} />);
  nodes.push(<Circle key="cup" cx={GX} cy={GY} r={2.6} fill={FE.navy} />);
  nodes.push(<Line key="stick" x1={GX} y1={GY} x2={GX} y2={GY - 26} stroke="#eee" strokeWidth={2} />);
  nodes.push(<Path key="flag" d={`M${GX} ${GY - 26} l 13 5 l -13 5 z`} fill={FE.orange} />);
  nodes.push(...lbl('grL', gc - 8, GY - GR - 30, `${s.dist} to the flag`, '#d9e2d9', 10, readsOp));
  if (s.opp && s.water) {                                            // match play: opponent's ball in the pond
    const ox = (px(s.water.from) + px(s.water.to)) / 2 + 14, oy = 262;
    nodes.push(<Circle key="opp" cx={ox} cy={oy} r={5} fill="#c9b2df" stroke="#8e44ad" strokeWidth={2} />);
    nodes.push(...lbl('oppL', ox, oy + 18, 'OPP — wet', '#e6d8f2', 10, readsOp));
  }

  // carry arcs (the yardage facts, on the map) — dashed, ±24° about the ball
  const carryArc = (key: string, rYds: number, color: string, txt: string, dyLbl: number) => {
    const R = rYds * ((GX - BX) / s.dist), a = 24 * Math.PI / 180;
    const p1 = [BX + R * Math.cos(-a), CY + R * Math.sin(-a)], p2 = [BX + R * Math.cos(a), CY + R * Math.sin(a)];
    nodes.push(<Path key={key} d={`M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${R} ${R} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 6" opacity={0.9 * readsOp} />);
    nodes.push(...lbl(`${key}L`, BX + R, CY - R * Math.sin(a) - 8 + dyLbl, txt, color, 10, readsOp));
  };
  if (s.water) { carryArc('carryW', s.water.to, '#bfe0ff', `CARRY ${s.water.to}`, 0); carryArc('carry3w', 232, AMBER, 'your 3-wood: 232', 14); }
  else carryArc('carry3w', 232, AMBER, 'your 3-wood carry: 232', 0);

  // the three dispersion zones + E bubbles + captions (chosen zone brightens on choose)
  (Object.keys(s.zones) as GoLayOption[]).forEach(z => {
    const zd = s.zones[z];
    const hot = chosen === z;
    nodes.push(<Ellipse key={`z${z}`} cx={px(zd.c)} cy={CY} rx={zd.rx * ((GX - BX) / s.dist)} ry={zd.ry} fill="#F4F4EE" fillOpacity={hot ? 0.14 : 0.06}
      stroke="#F4F4EE" strokeWidth={hot ? 2.4 : 1.4} strokeDasharray="6 5" opacity={hot ? 0.95 : 0.55 * readsOp} />);
    nodes.push(<Rect key={`zb${z}`} x={px(zd.c) - 23} y={CY - zd.ry - 22 - 11} width={46} height={18} rx={9} fill={FE.navy} opacity={0.92 * readsOp} stroke="#48557a" strokeWidth={1} />);
    nodes.push(<SvgText key={`zbt${z}`} x={px(zd.c)} y={CY - zd.ry - 22 + 2.5} textAnchor="middle" fontSize={10.5} fontFamily={F_BOLD} fill="#ffd9b3" opacity={readsOp}>{zd.E}</SvgText>);
    if (zd.cap) nodes.push(...lbl(`zc${z}`, px(zd.c), CY + zd.ry + 18, zd.cap, '#d9e2d9', 9.5, readsOp));
  });

  // ── resolve layer (pure function of e) ──
  if (r && T) {
    const landP: [number, number] = [px(r.land[0]), CY + r.land[1]];
    const k = clamp01(e / FLY_MS);
    const mk = 1 - k, mx = (BX + landP[0]) / 2, my = (CY + landP[1]) / 2 - 34;   // gentle bow; radius pulse = height
    const bx = mk * mk * BX + 2 * mk * k * mx + k * k * landP[0];
    const by = mk * mk * CY + 2 * mk * k * my + k * k * landP[1];
    nodes.push(<Circle key="ball" cx={bx} cy={by} r={5 + 3.4 * Math.sin(Math.PI * k)} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
    if (e >= T.landAt) {
      const col = gradeColor(r.k);
      if (r.splash) {
        for (let i = 0; i < 3; i++) {                               // staggered splash rings
          const p = clamp01((e - T.landAt - i * 140) / SPLASH_RING_MS);
          if (p > 0 && p < 1) nodes.push(<Circle key={`spl${i}`} cx={landP[0]} cy={landP[1]} r={4 + (16 + i * 8) * p} fill="none" stroke="#bfe0ff" strokeWidth={2.5} opacity={0.95 * (1 - p)} />);
        }
        nodes.push(...lbl('splashL', landP[0], landP[1] > CY ? landP[1] - 26 : landP[1] + 26, 'SPLASH', '#ffb3ae', 12));
        if (e >= T.popupAt && r.drop) {                             // penalty drop short of the hazard — hitting 4
          const dp: [number, number] = [px(r.drop[0]), CY + r.drop[1]];
          nodes.push(<Circle key="drop" cx={dp[0]} cy={dp[1]} r={5} fill="#fff" stroke="#8a8f98" strokeWidth={1} opacity={0.95} />);
          nodes.push(...lbl('dropL', dp[0], dp[1] + (r.drop[1] < 0 ? -14 : 16), 'drop — hitting 4', '#ffe1b3', 10));
          const bp = clamp01((e - T.popupAt) / BURST_MS);
          if (bp < 1) nodes.push(<Circle key="dropB" cx={dp[0]} cy={dp[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        }
      } else {
        const bp = clamp01((e - T.landAt) / BURST_MS);
        if (bp < 1) nodes.push(<Circle key="landB" cx={landP[0]} cy={landP[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
      }
      if (e >= T.popupAt) {                                          // on-map result popup, top-left
        const tone = r.splash ? 'bad' : r.k;
        nodes.push(<Rect key="pop" x={20} y={16} width={252} height={36} rx={9} fill={FE.navy} opacity={0.95}
          stroke={tone === 'bad' ? RED : tone === 'good' ? TEAL : '#48557a'} strokeWidth={1.6} />);
        nodes.push(<SvgText key="popT" x={20 + 126} y={39} textAnchor="middle" fontSize={12} fontFamily={F_BOLD}
          fill={tone === 'bad' ? '#ffb3ae' : tone === 'good' ? '#bfe9da' : '#ffd9b3'}>{r.lab}</SvgText>);
      }
      if (e >= T.ghostAt && r.ghost) {                               // the better zone, revealed
        const gz = s.zones[r.ghost];
        nodes.push(<Ellipse key="ghost" cx={px(gz.c)} cy={CY} rx={gz.rx * ((GX - BX) / s.dist)} ry={gz.ry} fill="#F4F4EE" fillOpacity={0.06}
          stroke={TEAL} strokeWidth={1.4} strokeDasharray="6 5" opacity={0.95} />);
        nodes.push(<Rect key="ghB" x={px(gz.c) - 23} y={CY + gz.ry + 38 - 11} width={46} height={18} rx={9} fill="#0f3d33" opacity={0.92} stroke={TEAL} strokeWidth={1} />);
        nodes.push(<SvgText key="ghBt" x={px(gz.c)} y={CY + gz.ry + 38 + 2.5} textAnchor="middle" fontSize={10.5} fontFamily={F_BOLD} fill="#7be0bf">{gz.E}</SvgText>);
        if (r.ghostLab) nodes.push(...lbl('ghL', px(gz.c), CY - gz.ry - 44, r.ghostLab, '#7be0bf', 10));
      }
    }
  } else {
    nodes.push(<Circle key="ball" cx={BX} cy={CY} r={5} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
  }
  nodes.push(...lbl('youL', BX, CY - 14, 'you', '#fff', 10, readsOp));

  const field = (
    <View style={styles.canvasWrap}>
      <Svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={landscape ? styles.svgLandscape : styles.svgPortrait}>{nodes}</Svg>
    </View>
  );

  // ── chrome fragments ──
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
  const promptText = answered ? PROMPT_DONE : chosen ? NARRATION[chosen] : s.prompt;
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <BoldText text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{answered ? HINT_DONE : HINT_IDLE}</Text>
    </View>
  );
  const judgeBtns = (
    <View style={styles.judgeCol}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.key} style={[styles.judgeBtn, o.alt && styles.judgeBtnAlt, phase === 'run' && styles.judgeBtnDim, landscape && styles.judgeBtnLs]}
          activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(o.key)}>
          <Text style={[styles.judgeTitle, landscape && styles.judgeTitleLs]}>{o.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#999' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Your ball</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: WATER }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Water</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, { backgroundColor: SAND }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Sand</Text></View>
      <Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}><Text style={styles.legendBold}>E 2.92</Text> = expected strokes to hole out from that spot</Text>
      <Text style={styles.legendMuted}>assumes flat lie · calm air</Text>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: '#F4F4EE' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Dispersion oval — where your misses land</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: TEAL }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Ghost = the better zone</Text></View>
    </View>
  );
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

  // ── LANDSCAPE: hole map left via the shell; chips + prompt + calls (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={GO_OR_LAY_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{promptBlock}{verdictCard}{legend}</> : <>{hudChips}{promptBlock}{judgeBtns}{legend}</>}
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
          <NextButton visible variant="filled" label="Next second shot →" onPress={nextScenario} />
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  canvasWrap: { borderRadius: 14, overflow: 'hidden' },
  svgPortrait: { width: '100%', aspectRatio: GO_OR_LAY_RATIO, backgroundColor: '#24512f' },
  svgLandscape: { width: '100%', aspectRatio: GO_OR_LAY_RATIO, backgroundColor: '#24512f' },
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
  judgeBtnAlt: { backgroundColor: '#0d1b3e' },
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
  legendBold: { fontWeight: '800', color: t.textPrimary },
  legendMuted: { color: t.textSecondaryOnDark, fontSize: 11, opacity: 0.7 },
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
