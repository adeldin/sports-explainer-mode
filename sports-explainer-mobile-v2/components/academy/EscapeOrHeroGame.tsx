import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect, Defs, ClipPath, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import {
  SCENARIOS, OPTIONS, NARRATION, DEFAULT_MANTRA, HINT_IDLE, HINT_DONE, SUB, FOOT,
  VB, yds, gradeColor, gradeTag,
  type EHOption, type EHResult, type Bracket, type P, type Depth,
} from '../../lib/escapeOrHero';

// Escape or Hero? — the recovery-from-the-trees call. GOLF HAS NO SHARED RENDERER: this module
// paints its OWN 680×420 jail (tree-lined grove, two mow-banded fairway bands, layered green) and
// exports its own ratio, exactly as Go or Lay? and Sucker Pin do. The core read is the TWO BRACKETS
// standing side by side — the gap's width in yards against your shot's width in yards — and the
// whole lesson is comparing them. Outcomes: a threaded hero ball CLACKS off a trunk and ricochets
// deeper; the backward escape draws its payoff as a "clear line — nothing but grass" cone; and the
// post-call mantra is per-scenario, so the match-play tab can flip the 9-of-10 rule on its head.
// Single rAF, elapsed-driven — every mark below is a pure function of `e`.
export const ESCAPE_OR_HERO_RATIO = VB.w / VB.h;

const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const G_BASE = '#548f50', G_CORRIDOR = '#5e9a58', G_FW = '#8cc57f', G_BAND_A = '#95cd88', G_BAND_B = '#84bc77', G_FW_EDGE = '#a9dc9c';
const CHALK = '#F4F4EE';
const OK_BG = '#fef3e2', OK_C = '#8a5a1c';
const LBL_OUTLINE = '#16331b';

// Beat boundaries of the single-raf resolve timeline (ms).
const RIC_FLY = 700, RIC_RUN = 500, FLY_MS = 1000, RUN_MS = 800, RUN_LEG = 450;
const FINISH_DELAY = 450, BURST_MS = 600, CONE_LABEL_DELAY = 350;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// Two-pass outlined SVG label (react-native-svg has no paint-order) — legible on any turf.
function lbl(key: string, x: number, y: number, txt: string, fill: string, size = 11, opacity = 1): ReactNode[] {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD, opacity };
  return [
    <SvgText key={`${key}-o`} {...common} fill="none" stroke={LBL_OUTLINE} strokeWidth={4} strokeLinejoin="round">{txt}</SvgText>,
    <SvgText key={key} {...common} fill={fill}>{txt}</SvgText>,
  ];
}
// Prompt copy with <b>…</b> spans rendered amber-bold (spike prompt markup, verbatim copy).
function BoldText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={{ color: AMBER, fontWeight: '800' }}>{p}</Text> : p))}</Text>;
}

// A width bracket: |—| spanning y1..y2 at x, with its yardage caption. The gap's bracket is chalk,
// YOUR shot's bracket is amber and captions to the LEFT so the two read side by side, not stacked.
function bracketNodes(key: string, b: Bracket, color: string, left: boolean, op: number): ReactNode[] {
  return [
    <Line key={`${key}s`} x1={b.x} y1={b.y1} x2={b.x} y2={b.y2} stroke={color} strokeWidth={2.5} opacity={0.95 * op} />,
    <Line key={`${key}t1`} x1={b.x - 6} y1={b.y1} x2={b.x + 6} y2={b.y1} stroke={color} strokeWidth={2.5} opacity={0.95 * op} />,
    <Line key={`${key}t2`} x1={b.x - 6} y1={b.y2} x2={b.x + 6} y2={b.y2} stroke={color} strokeWidth={2.5} opacity={0.95 * op} />,
    ...lbl(`${key}L`, b.x + (left ? -8 : 8), b.y1 - 8, b.lab, color, 10, op),
  ];
}

function treeClump(key: string, cx: number, cy: number, r: number): ReactNode[] {
  return [
    <Ellipse key={`${key}s`} cx={cx + 3} cy={cy + 4} rx={r * 1.15} ry={r * 0.95} fill="#3a6b36" opacity={0.5} />,
    <Circle key={`${key}c`} cx={cx} cy={cy} r={r} fill="#33652e" stroke="#265223" strokeWidth={1.5} />,
    <Circle key={`${key}h`} cx={cx - r * 0.3} cy={cy - r * 0.35} r={r * 0.32} fill="#4d8f45" opacity={0.85} />,
    <Circle key={`${key}t`} cx={cx} cy={cy} r={3.2} fill="#5a3d1e" />,
  ];
}

type Phase = 'idle' | 'run' | 'done';

// Timeline boundaries for a chosen result (ricochets add the CLACK + kick-on beats).
function times(o: EHResult) {
  const landAt = o.type === 'ric' ? RIC_FLY + RIC_RUN : o.type === 'fly' ? FLY_MS : o.via ? RUN_LEG * 2 : RUN_MS;
  const viaAt = o.type === 'ric' ? RIC_FLY : o.via ? RUN_LEG : null;
  const finishAt = landAt + FINISH_DELAY;
  return { viaAt, landAt, finishAt, total: finishAt + BURST_MS };
}

// The explanation key rides UNDER the field, not at the bottom of the controls scroll: this field is
// WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved ALWAYS
// (~42pt, two compact rows at the field width) so the art size never jumps between states, and the
// height it frees is real height back in the controls column.
const LS_LEGEND_RESERVE = 42;

export default function EscapeOrHeroGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<EHOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);                                    // resolve-timeline elapsed ms
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);                                         // generation guard

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const o = chosen ? s.opts[chosen] : null;
  const answered = phase === 'done';

  // ── one rAF owner — stopLoop cancels it (on reset, on select, on unmount) ──
  const stopLoop = () => { genRef.current += 1; if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  const choose = (opt: EHOption) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    setChosen(opt); setPhase('run'); setE(0);
    const gen = genRef.current;
    const T = times(s.opts[opt]);
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;                           // stale generation — drop the frame
      if (t0 == null) t0 = now;
      const el = Math.min(now - t0, T.total);
      setE(el);
      if (!revealed && el >= T.finishAt) { revealed = true; setPhase('done'); }
      if (el < T.total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the jail, painted per scenario (derived from s / chosen / e each render) ──
  const faded = phase !== 'idle';                                   // the brackets did their job
  const readsOp = faded ? 0.25 : 1;
  const brOp = faded ? 0.22 : 1;
  const T = o ? times(o) : null;
  const nodes: ReactNode[] = [];

  // ground: deep rough base → light rough between grove and green → two mow-banded fairway bands
  nodes.push(<Rect key="base" x={0} y={0} width={VB.w} height={VB.h} fill={G_BASE} />);
  nodes.push(<Rect key="rough" x={330} y={186} width={200} height={118} rx={24} fill={G_CORRIDOR} />);
  const FW: [number, number, number, number, number][] = [[100, 300, 540, 84, 26], [500, 186, 140, 118, 24]];
  nodes.push(
    <Defs key="fwdefs">
      {FW.map((f, fi) => <ClipPath key={fi} id={`ehfw${fi}`}><Rect x={f[0]} y={f[1]} width={f[2]} height={f[3]} rx={f[4]} /></ClipPath>)}
    </Defs>,
  );
  FW.forEach((f, fi) => {
    nodes.push(<Rect key={`fw${fi}`} x={f[0]} y={f[1]} width={f[2]} height={f[3]} rx={f[4]} fill={G_FW} />);
    nodes.push(
      <G key={`fwb${fi}`} clipPath={`url(#ehfw${fi})`}>
        {Array.from({ length: Math.ceil(f[2] / 58) }, (_, i) => (
          <Rect key={i} x={f[0] + i * 58} y={f[1]} width={58} height={f[3]} fill={i % 2 ? G_BAND_A : G_BAND_B} opacity={0.9} />
        ))}
      </G>,
    );
    nodes.push(<Rect key={`fwe${fi}`} x={f[0]} y={f[1]} width={f[2]} height={f[3]} rx={f[4]} fill="none" stroke={G_FW_EDGE} strokeWidth={1.6} opacity={0.8} />);
  });
  nodes.push(...lbl('fwL', 438, 368, 'fairway', '#9fd4a8', 10, readsOp));

  // the green + flag
  const gc = s.green.c, gr = s.green.r;
  nodes.push(<Ellipse key="grS" cx={gc[0] + 4} cy={gc[1] + 6} rx={gr + 12} ry={gr + 8} fill="#1c3f24" opacity={0.4} />);
  nodes.push(<Circle key="gr1" cx={gc[0]} cy={gc[1]} r={gr + 10} fill="#5cae6b" />);
  nodes.push(<Circle key="gr2" cx={gc[0]} cy={gc[1]} r={gr + 4} fill="#67b975" />);
  nodes.push(<Circle key="gr3" cx={gc[0]} cy={gc[1]} r={gr} fill="#79c886" stroke="#a8e0b1" strokeWidth={1.2} />);
  nodes.push(<Line key="stick" x1={gc[0]} y1={gc[1]} x2={gc[0]} y2={gc[1] - 24} stroke="#eee" strokeWidth={2} />);
  nodes.push(<Path key="flag" d={`M${gc[0]} ${gc[1] - 24} l 12 4.5 l -12 4.5 z`} fill={FE.orange} />);
  if (s.opp) {
    nodes.push(<Circle key="opp" cx={s.opp[0]} cy={s.opp[1]} r={5} fill="#c9b2df" stroke="#8e44ad" strokeWidth={2} />);
    nodes.push(...lbl('oppL', s.opp[0] - 6, s.opp[1] - 14, 'OPP — on in 2, putting for par', '#e6d8f2', 9.5));
  }

  // the grove
  s.trees.forEach((t, i) => nodes.push(...treeClump(`t${i}`, t[0], t[1], t[2])));
  nodes.push(...lbl('treeL', 190, 158, 'the trees', '#9fd4a8', 10, readsOp));
  if (s.blockLab) nodes.push(...lbl('blockL', s.blockLab[0], s.blockLab[1], s.blockLab[2], '#ffb3ae', 9.5, readsOp));

  // THE TWO BRACKETS — gap width and shot width, side by side (the whole decision)
  nodes.push(...bracketNodes('gap', s.gapB, CHALK, false, brOp));
  nodes.push(...bracketNodes('spr', s.sprB, AMBER, true, brOp));
  if (s.gate2) nodes.push(...bracketNodes('gate2', s.gate2, CHALK, false, brOp));

  // ── resolve layer (pure function of e) ──
  // A FLOWN shot swells mid-flight (the height pulse) and a RUN shot stays flat on the deck —
  // that difference is how "punch/low squirt" reads differently from "the long club".
  let ballP: P = s.ball;
  let ballR = 5;
  if (o && T) {
    const col = gradeColor(o.k);
    if (o.type === 'ric' && o.via) {
      const k1 = clamp01(e / RIC_FLY);
      if (e < RIC_FLY) {
        ballP = lerpP(s.ball, o.via, k1);
        ballR = 5 + 3.2 * Math.sin(Math.PI * k1);
      } else {
        ballP = lerpP(o.via, o.land, clamp01((e - RIC_FLY) / RIC_RUN));
      }
      nodes.push(<Polyline key="tr1" points={`${s.ball[0]},${s.ball[1]} ${o.via[0]},${o.via[1]}`} fill="none" stroke={CHALK} strokeWidth={2} strokeDasharray="4 5" opacity={0.5} />);
      if (e >= RIC_FLY) {
        // CLACK — the trunk doesn't care how pure the strike was
        const bp = clamp01((e - RIC_FLY) / BURST_MS);
        if (bp < 1) nodes.push(<Circle key="ricB" cx={o.via[0]} cy={o.via[1]} r={8 + 18 * bp} fill="none" stroke={RED} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        const ck = o.clackAt ?? [o.via[0] + 4, o.via[1] - 20];
        nodes.push(...lbl('clack', ck[0], ck[1], 'CLACK', '#ffb3ae', 11));
        nodes.push(<Polyline key="tr2" points={`${o.via[0]},${o.via[1]} ${o.land[0]},${o.land[1]}`} fill="none" stroke={RED} strokeWidth={2} strokeDasharray="4 5" opacity={0.6} />);
      }
    } else if (o.type === 'fly') {
      const kf = clamp01(e / FLY_MS);
      ballP = lerpP(s.ball, o.land, kf);
      ballR = 5 + 3.2 * Math.sin(Math.PI * kf);
      nodes.push(<Polyline key="tr1" points={`${s.ball[0]},${s.ball[1]} ${o.land[0]},${o.land[1]}`} fill="none" stroke={CHALK} strokeWidth={2} strokeDasharray="4 5" opacity={0.5} />);
    } else if (o.via) {
      ballP = e < RUN_LEG ? lerpP(s.ball, o.via, clamp01(e / RUN_LEG)) : lerpP(o.via, o.land, clamp01((e - RUN_LEG) / RUN_LEG));
      nodes.push(<Polyline key="tr1" points={`${s.ball[0]},${s.ball[1]} ${o.via[0]},${o.via[1]}`} fill="none" stroke={CHALK} strokeWidth={2} strokeDasharray="4 5" opacity={0.5} />);
      nodes.push(<Polyline key="tr2" points={`${o.via[0]},${o.via[1]} ${o.land[0]},${o.land[1]}`} fill="none" stroke={CHALK} strokeWidth={2} strokeDasharray="4 5" opacity={0.5} />);
    } else {
      ballP = lerpP(s.ball, o.land, clamp01(e / RUN_MS));
      nodes.push(<Polyline key="tr1" points={`${s.ball[0]},${s.ball[1]} ${o.land[0]},${o.land[1]}`} fill="none" stroke={CHALK} strokeWidth={2} strokeDasharray="4 5" opacity={0.5} />);
    }
    if (e >= T.landAt) {
      const bp = clamp01((e - T.landAt) / BURST_MS);
      if (bp < 1) nodes.push(<Circle key="landB" cx={o.land[0]} cy={o.land[1]} r={8 + 18 * bp} fill="none" stroke={o.type === 'ric' ? RED : col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
      const la = o.labAt ?? [o.land[0], o.land[1] - (o.type === 'fly' ? 18 : 16)];
      const labFill = o.k === 'good' ? '#bfe9da' : o.k === 'ok' ? '#ffe1b3' : '#ffb3ae';
      nodes.push(...lbl('resL', la[0], la[1], o.lab, o.type === 'ric' ? '#ffb3ae' : labFill, 10.5));
      if (o.clearCone) {
        // the payoff of playing backward, DRAWN: an unobstructed lane to the flag
        const r = gr + 14;
        const dx = gc[0] - o.land[0], dy = gc[1] - o.land[1], len = Math.hypot(dx, dy) || 1;
        const px = (-dy / len) * r, py = (dx / len) * r;
        nodes.push(<Polygon key="cone" points={`${o.land[0]},${o.land[1]} ${gc[0] + px},${gc[1] + py} ${gc[0] - px},${gc[1] - py}`} fill="#bfe9da" opacity={0.1} stroke="#7be0bf" strokeWidth={1} strokeDasharray="3 6" />);
        if (e >= T.landAt + CONE_LABEL_DELAY) {
          nodes.push(...lbl('coneL', (o.land[0] + gc[0]) / 2, (o.land[1] + gc[1]) / 2 - 10, 'clear line — nothing but grass', '#7be0bf', 9.5));
        }
      }
    }
    if (e >= T.finishAt && o.ghost) {
      // the smarter route, revealed after the outcome has been watched
      nodes.push(<Line key="ghL" x1={s.ball[0]} y1={s.ball[1]} x2={o.ghost.to[0]} y2={o.ghost.to[1]} stroke={TEAL} strokeWidth={2.2} strokeDasharray="7 5" opacity={0.95} />);
      nodes.push(<Circle key="ghR" cx={o.ghost.to[0]} cy={o.ghost.to[1]} r={9} fill="none" stroke={TEAL} strokeWidth={2.2} strokeDasharray="4 4" opacity={0.95} />);
      nodes.push(...lbl('ghLbl', o.ghost.to[0], o.ghost.to[1] + 22, o.ghost.lab, '#7be0bf', 9.5));
    }
  }
  nodes.push(<Circle key="ball" cx={ballP[0]} cy={ballP[1]} r={ballR} fill="#fff" stroke="#8a8f98" strokeWidth={1} />);
  nodes.push(...lbl('youL', s.ball[0], s.ball[1] - 14, 'you', '#fff', 10, readsOp));
  nodes.push(...lbl('flagL', gc[0], gc[1] + gr + 16, `${yds(s.ball, gc)} to the flag`, '#d9e2d9', 9.5, readsOp));

  const field = (
    <View style={styles.canvasWrap}>
      <Svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={styles.svg}>{nodes}</Svg>
    </View>
  );

  // ── chrome fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.hud.map((c, i) => (
        <View key={i} style={[styles.chip, c.warn && styles.chipWarn]}>
          <Text style={[styles.chipTxt, c.warn && styles.chipTxtWarn]}>{c.cap}: <Text style={[styles.chipVal, c.warn && styles.chipValWarn]}>{c.val}</Text></Text>
        </View>
      ))}
    </View>
  );
  const promptText = answered ? (s.mantra ?? DEFAULT_MANTRA) : chosen ? NARRATION[chosen] : s.prompt;
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <BoldText text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{answered ? HINT_DONE : HINT_IDLE}</Text>
    </View>
  );
  const judgeBtns = (
    <View style={styles.judgeCol}>
      {OPTIONS.map(op => (
        <TouchableOpacity key={op.key} style={[styles.judgeBtn, phase !== 'idle' && styles.judgeBtnDim, landscape && styles.judgeBtnLs]}
          activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(op.key)}>
          <Text style={[styles.judgeTitle, landscape && styles.judgeTitleLs]}>{op.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{op.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#999' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Your ball</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#1d4023', borderWidth: 1, borderColor: '#142e19' }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Tree (canopy)</Text></View>
      <Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>|—| chalk = the gap’s width · <Text style={styles.legendAmber}>amber = your shot’s width</Text></Text>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: TEAL }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>Ghost = the smarter route</Text></View>
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  const verdictCard = answered && o ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, o.k === 'good' ? styles.vtagGood : o.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>{gradeTag(o.k)}</Text>
      <Text style={styles.vtitle}>{o.t}</Text>
      <Text style={styles.vbody}>{o.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const subLine = !answered ? <BoldText text={SUB} style={styles.foot} /> : null;
  const footLine = <Text style={styles.foot}>{FOOT}</Text>;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next jail →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: hole map left via the shell; chips + prompt + calls (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={ESCAPE_OR_HERO_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={pills}
        field={field}
        belowField={lsLegendUnder}
        controls={answered ? <>{promptBlock}{verdictCard}{footLine}</> : <>{hudChips}{promptBlock}{judgeBtns}{subLine}</>}
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
          <NextButton visible variant="filled" label="Next jail →" onPress={nextScenario} />
        </View>
      )}
      {subLine}
      {footLine}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  canvasWrap: { borderRadius: 14, overflow: 'hidden' },
  svg: { width: '100%', aspectRatio: ESCAPE_OR_HERO_RATIO, backgroundColor: '#24512f' },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipWarn: { borderColor: '#e8b3b0' },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipTxtWarn: { color: t.textPrimary },
  chipVal: { color: t.accentText },
  chipValWarn: { color: '#e24b4a' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeCol: { gap: 8 },
  judgeBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeBtnDim: { opacity: 0.4 },
  judgeTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeTitleLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendDashed: { borderWidth: 2, backgroundColor: 'transparent' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  legendAmber: { color: OK_C, fontWeight: '700' },
  lsLegendUnder: { minHeight: LS_LEGEND_RESERVE, paddingTop: 4, justifyContent: 'center' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: OK_BG, color: OK_C },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 17, opacity: 0.85 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
