import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, G, LinearGradient, Stop, Rect, Ellipse, Polygon, Line, Circle, Image as SvgImage, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import {
  SCEN, TGT, Z, RELEASE, BATTER_BOX, PITCHER_BOX, MOUND_FAR,
  pitchCtrl, bez, lerp, clamp01, resultLabel,
  type TargetKey, type Depth, type Pt,
} from '../../lib/countLeverage';

// Own the Count — baseball count-leverage module. You're the pitcher looking in from the mound: the
// count decides whose zone it is. Tap a target ring; the pitch flies from the silhouette pitcher's
// release point and the result (whiff / called / barrel / ball / free take) plays out at the target.
// This module does NOT use the diamond: it draws its own catcher's-eye scene (below) on a 680×460
// viewBox — sky/dirt planes, the Character Roster batter + shadow-pitcher PNGs (assets/coach/), and
// a rulebook-scaled strike zone. Scenarios/verdicts/4-depth reads VERBATIM from the data lib.
const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const FLIGHT_MS = 650, FLY_MS = 520, BURST_MS = 600;
const HIT_R = 35;                       // viewBox hit radius → ≈44px on-screen at the landscape scale
const LS_HINT_RESERVE = 30;             // under-field strip for the tap hint (reserved ALWAYS — no reflow jump)
const BARREL_END: Pt = [650, 70];
const HINT_IDLE = 'Who NEEDS a strike here — you or him?';
const PROMPT_IDLE = 'Catcher\'s looking in. Where do you want the target? Tap a ring.';
const PROMPT_DONE = 'The count is a tug-of-war over the zone — whoever\'s ahead gets to shrink it.';

// ── the catcher's-eye scene (this module's own field; NOT FieldEngine's diamond) ──
// viewBox 680×460 — three depth planes: distant shadow pitcher (small, ghosted), the strike zone
// floating over the plate, the batter in the foreground. Exported ratio = the LandscapeGameShell
// aspectRatio for this module (the count-leverage counterpart of BASEBALL_DIAMOND_RATIO).
export const COUNT_SCENE = { vbW: 680, vbH: 460 };
export const COUNT_SCENE_RATIO = COUNT_SCENE.vbW / COUNT_SCENE.vbH;

function CountScene({ children }: { children?: ReactNode }) {
  return (
    <View style={sceneStyles.wrap}>
      <Svg viewBox={`0 0 ${COUNT_SCENE.vbW} ${COUNT_SCENE.vbH}`} style={{ width: '100%', aspectRatio: COUNT_SCENE_RATIO, backgroundColor: FE.navy }}>
        <Defs>
          <LinearGradient id="clSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#12224a" /><Stop offset="1" stopColor="#0d1b3e" />
          </LinearGradient>
          <LinearGradient id="clDirt" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#243456" /><Stop offset="1" stopColor="#1b2745" />
          </LinearGradient>
        </Defs>
        {/* far plane: sky, outfield, the mound */}
        <Rect x={0} y={0} width={680} height={150} fill="url(#clSky)" />
        <Ellipse cx={340} cy={150} rx={520} ry={78} fill="#16305a" opacity={0.55} />
        <Ellipse cx={MOUND_FAR.cx} cy={MOUND_FAR.cy + 28} rx={64} ry={16} fill="#22335c" opacity={0.9} />
        {/* the SHADOW PITCHER — Character Roster silhouette, ghosted in the distance */}
        <SvgImage href={require('../../assets/coach/pitcher.png')} x={PITCHER_BOX.x} y={PITCHER_BOX.y} width={PITCHER_BOX.w} height={PITCHER_BOX.h} preserveAspectRatio="xMidYMax meet" opacity={0.55} />
        {/* mid plane: infield dirt, batter's box, home plate */}
        <Rect x={0} y={150} width={680} height={310} fill="url(#clDirt)" />
        <Polygon points="150,378 292,378 318,450 122,450" fill="none" stroke={FE.chalk} strokeWidth={2} opacity={0.26} />
        <Polygon points="296,418 384,418 384,436 340,452 296,436" fill={FE.chalk} opacity={0.92} />
        {/* foreground: the BATTER — Character Roster silhouette, feet planted mid-box */}
        <SvgImage href={require('../../assets/coach/batter.png')} x={BATTER_BOX.x} y={BATTER_BOX.y} width={BATTER_BOX.w} height={BATTER_BOX.h} preserveAspectRatio="xMidYMax meet" />
        {/* the STRIKE ZONE, floating over the plate, sized to the batter */}
        <Rect x={Z.x} y={Z.y} width={Z.w} height={Z.h} fill="rgba(244,244,238,0.07)" stroke={FE.chalk} strokeWidth={2.5} />
        {[1, 2].map(i => (
          <Line key={`zv${i}`} x1={Z.x + i * Z.w / 3} y1={Z.y} x2={Z.x + i * Z.w / 3} y2={Z.y + Z.h} stroke={FE.chalk} strokeWidth={1} opacity={0.32} />
        ))}
        {[1, 2].map(i => (
          <Line key={`zh${i}`} x1={Z.x} y1={Z.y + i * Z.h / 3} x2={Z.x + Z.w} y2={Z.y + i * Z.h / 3} stroke={FE.chalk} strokeWidth={1} opacity={0.32} />
        ))}
        {/* knees / letters ticks — the zone's REAL definition, visible on the body */}
        {([[Z.y, 'letters'], [Z.y + Z.h, 'knees']] as [number, string][]).map(([y, txt]) => (
          <G key={txt}>
            <Line x1={Z.x - 16} y1={y} x2={Z.x - 4} y2={y} stroke="#8ea0c9" strokeWidth={1.5} opacity={0.7} />
            <SvgText x={Z.x - 20} y={y + 4} textAnchor="end" fontSize={9.5} fontFamily={F_BOLD} fill="#7e8fb8">{txt}</SvgText>
          </G>
        ))}
        {children}
      </Svg>
    </View>
  );
}

type Phase = 'idle' | 'run' | 'done';

export default function CountLeverageGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<TargetKey | null>(null);
  const [e, setE] = useState(0);                                     // choreography elapsed (ms)
  const rafRef = useRef<number | null>(null);

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';

  // ── one rAF owner — stopLoop cancels it (on choose, on reset, on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── choose a target → the pitch flies release→target, then the result plays out (single rAF loop) ──
  const choose = (key: TargetKey) => {
    if (phase !== 'idle') return;
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(key); setPhase('run');
    const barrel = s.grade[key].res === 'barrel';
    const revealAt = barrel ? FLIGHT_MS + FLY_MS : FLIGHT_MS;        // barrel: verdict when the fly-away lands
    const total = Math.max(revealAt, FLIGHT_MS + BURST_MS);
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = now - t0;
      setE(el);
      if (!revealed && el >= revealAt) { revealed = true; setPhase('done'); }
      if (el < total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the dynamic layer, derived from (chosen, e) each render ──
  const dyn: ReactNode[] = [];
  const g = chosen ? s.grade[chosen] : null;
  const to = chosen ? TGT[chosen].p : null;
  const col = g ? (g.k === 'good' ? TEAL : g.k === 'ok' ? AMBER : RED) : AMBER;
  // target rings: all four while idle; after the choice the others dim, the chosen ring persists
  (Object.keys(TGT) as TargetKey[]).forEach(key => {
    const t = TGT[key];
    const dim = chosen != null && chosen !== key ? 0.25 : 1;
    const press = phase === 'idle' ? () => choose(key) : undefined;
    dyn.push(<Circle key={`hit${key}`} cx={t.p[0]} cy={t.p[1]} r={HIT_R} fill="transparent" onPress={press} />);
    dyn.push(<Circle key={`ring${key}`} cx={t.p[0]} cy={t.p[1]} r={20} fill="rgba(232,119,34,0.14)" stroke={FE.orange} strokeWidth={2.5} strokeDasharray="5 5" opacity={dim} onPress={press} />);
    dyn.push(<Circle key={`dot${key}`} cx={t.p[0]} cy={t.p[1]} r={5} fill={FE.orange} opacity={dim} onPress={press} />);
  });
  if (g && to && phase !== 'idle') {
    const ctrl = pitchCtrl(to);
    // the ball: release → target (growing as it closes — the depth cue); a barreled ball then flies away
    if (e < FLIGHT_MS) {
      const tf = clamp01(e / FLIGHT_MS);
      const p = bez(RELEASE, ctrl, to, tf);
      dyn.push(<Circle key="ball" cx={p[0]} cy={p[1]} r={3 + 5.5 * tf} fill="#fff" stroke={FE.navy} strokeWidth={1} />);
    } else if (g.res === 'barrel') {
      const k = clamp01((e - FLIGHT_MS) / FLY_MS);
      const p = lerp(to, BARREL_END, k);
      dyn.push(<Circle key="ball" cx={p[0]} cy={p[1]} r={8 - 5 * k} fill="#fff" stroke={FE.navy} strokeWidth={1.2} />);
    } else {
      dyn.push(<Circle key="ball" cx={to[0]} cy={to[1]} r={8.5} fill="#fff" stroke={FE.navy} strokeWidth={1} />);
    }
    if (e >= FLIGHT_MS) {
      // burst at the landing spot, colored by the grade
      const bp = clamp01((e - FLIGHT_MS) / BURST_MS);
      if (bp < 1) dyn.push(<Circle key="burst" cx={to[0]} cy={to[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
      // the shout label (two-pass outline — react-native-svg has no paint-order)
      const lblFill = g.res === 'barrel' ? '#ffb3ae' : g.res === 'ball' ? '#ffe1b3' : '#bfe9da';
      const lbl = resultLabel(s, g.res);
      const common = { x: to[0], y: to[1] - 34, textAnchor: 'middle' as const, fontSize: 14, fontFamily: F_BOLD };
      dyn.push(<SvgText key="lblO" {...common} fill="none" stroke="#0a142e" strokeWidth={4} strokeLinejoin="round">{lbl}</SvgText>);
      dyn.push(<SvgText key="lblF" {...common} fill={lblFill}>{lbl}</SvgText>);
    }
  }
  const scene = <CountScene>{dyn}</CountScene>;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.hud.map(h => <Text key={h} style={styles.chip}>{h}</Text>)}
    </View>
  );
  const promptBlock = (
    <View style={styles.prompt}>
      <Text style={styles.promptTxt}>{phase === 'run' ? 'The pitch…' : answered ? PROMPT_DONE : PROMPT_IDLE}</Text>
      {phase !== 'run' && <Text style={styles.hintTxt}>{answered ? 'Reset, or take another count.' : HINT_IDLE}</Text>}
    </View>
  );
  const verdictCard = answered && g ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, g.k === 'good' ? styles.vtagGood : g.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {g.k === 'good' ? 'Right pitch' : g.k === 'ok' ? 'Defensible' : 'Wrong pitch'}
      </Text>
      <Text style={styles.vtitle}>{g.t}</Text>
      <Text style={styles.vbody}>{g.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vread}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;
  // pre-tap hint UNDER the field, pointing up at the rings; space reserved always (no reflow jump)
  const lsHint = (
    <View style={styles.lsHint}>
      {phase === 'idle' && <Text style={styles.lsHintTxt}>👆 Tap a target ring to throw there</Text>}
    </View>
  );

  // ── LANDSCAPE: scene field-left (own ratio), HUD + prompt/verdict right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={COUNT_SCENE_RATIO}
        belowFieldReserve={LS_HINT_RESERVE}
        pills={pills}
        field={scene}
        belowField={lsHint}
        controls={answered ? <>{hudChips}{verdictCard}</> : <>{hudChips}{promptBlock}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack (prototype order: pills · HUD · scene · legend · prompt · verdict). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {scene}
      <Text style={styles.legendTxt}>Tap a target ring to throw there</Text>
      {promptBlock}
      {verdictCard}
      <View style={styles.controls}>
        {answered && <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>}
        {answered && <NextButton visible variant="filled" label="Next count →" onPress={nextScenario} />}
      </View>
    </ScrollView>
  );
}

const sceneStyles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden' },
});

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Situation chips (the prototype HUD).
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: '700', color: t.textPrimary, overflow: 'hidden' },
  // Prompt block.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  // Verdict + COACH'S READ.
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  vread: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  // Legend line (portrait, under the scene — mirrors the prototype).
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11, textAlign: 'center' },
  // Landscape under-field hint (reserved strip).
  lsHint: { height: LS_HINT_RESERVE, justifyContent: 'center' },
  lsHintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  // Buttons.
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  // Landscape pinned footer.
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
