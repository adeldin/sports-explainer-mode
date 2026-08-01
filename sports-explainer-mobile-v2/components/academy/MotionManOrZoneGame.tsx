import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Line, Circle, Ellipse, Path, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FOOTBALL_FIELD_RATIO, FIELD, FE } from '../FieldEngine';
import {
  SCEN, motionPos, M0, M1, OLINE, DLINE, QB, RB, WR_TOP, WR_BOT, BALL_AT,
  WR_REL, MOT_REL, LOCK_CORNERS, LOCK_NICKEL, ZONE_LANDMARKS, DROP_BK0, DROP_BK1, DROP_NICKEL,
  type CoverageCall, type MotionScenario, type Depth, type Pt,
} from '../../lib/motionManOrZone';

// Man or Zone? — the pre-snap motion tell. Send a receiver across the formation and watch what the
// defense does about it: somebody TRAVELS with him (man), everybody just BUMPS over one spot (zone),
// or — the half-truth — a defender starts to travel and then hands him off like a baton (match zone,
// still zone). You call it before the snap; the snap itself is the confirmation beat, where man
// defenders LOCK onto people and zone defenders DROP to landmarks.
//
// Motion + the confirm beat run on ONE rafRef with a generation guard (scenario change / reset /
// choose / unmount invalidate the running loop). The orbit is the lib's `motionPos` bezier, the
// choreography (traveler timing, the bump, the pass-off) is the lib's data, and both verdicts plus
// the 4-depth COACH'S READ are the lib's copy, verbatim. Field = the shared FootballField.
const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a', BALL_BROWN = '#7a4a1e';
const MOTION_MS = 2600;      // the orbit, bottom slot → top slot behind the backfield
const SNAP_MS = 950;         // the post-snap confirmation beat (lock onto people / drop to landmarks)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const L = (a: Pt, b: Pt, f: number): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
const ease = (f: number) => f * f * (3 - 2 * f);
const NICK_SPLIT = 0.55;     // the traveler's two legs: p0 → mid (first 55%), mid → end (last 45%)

type Phase = 'preMotion' | 'motion' | 'decide' | 'snap' | 'done';
interface Frame {
  motion: Pt; nickel: Pt; backers: Pt[]; corners: Pt[]; wr: Pt[];
  trail: number;    // how much of the orbit the dashed trail shows (0..1)
  reveal: number;   // the confirm layer's fade-in (0..1): lock lines / zone landmarks
}
const baseFrame = (s: MotionScenario): Frame => ({
  motion: M0, nickel: s.nickel.p0, backers: s.backers, corners: s.corners, wr: [WR_TOP, WR_BOT],
  trail: 0, reveal: 0,
});
const nickelAt = (s: MotionScenario, f: number): Pt => (f <= NICK_SPLIT
  ? L(s.nickel.p0, s.nickel.mid, ease(f / NICK_SPLIT))
  : L(s.nickel.mid, s.nickel.end, ease((f - NICK_SPLIT) / (1 - NICK_SPLIT))));

// Outlined field label (react-native-svg has no paint-order → outline pass, then fill pass).
function fieldLabel(key: string, x: number, y: number, text: string, fill: string, size = 10.5): ReactNode {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <G key={key}>
      <SvgText {...common} fill="none" stroke={FE.labelOutline} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </G>
  );
}

export default function MotionManOrZoneGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('preMotion');
  const [called, setCalled] = useState<CoverageCall | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [frame, setFrame] = useState<Frame>(() => baseFrame(SCEN[0]));
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;    // app Level → data-lib Depth
  const answered = phase === 'done';
  const correct = called === s.answer;
  const v = called ? (correct ? s.verd.good : s.verd.bad) : null;

  // ── one rAF owner — the generation guard kills any in-flight loop on every state change ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);

  const resetTo = (i: number) => {
    genRef.current++;
    stopLoop();
    setIdx(i); setPhase('preMotion'); setCalled(null);
    setFrame(baseFrame(SCEN[i]));
  };
  const resetPlay = () => resetTo(idx);
  const selectScenario = (i: number) => resetTo(i);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── the motion: the orbit runs, the defense answers it (travel / bump / half-travel-then-handoff) ──
  const sendMotion = () => {
    if (phase !== 'preMotion') return;
    Haptics.selectionAsync();
    stopLoop();
    const gen = ++genRef.current;
    setPhase('motion');
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const f = clamp01((now - t0) / MOTION_MS);
      const bump = ease(clamp01((f - 0.25) / 0.6));                       // the underneath shuffle, mid-orbit
      setFrame({
        motion: motionPos(f),
        nickel: nickelAt(s, f),
        backers: s.backers.map((b, i) => L(b, s.backersEnd[i], bump)),
        corners: s.corners, wr: [WR_TOP, WR_BOT],
        trail: f, reveal: 0,
      });
      if (f < 1) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; setPhase('decide'); }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the snap: the confirmation beat. 'lock' = corners/nickel glue to PEOPLE; 'zoneDrop' = the
  // underneath defenders sink to LANDMARKS. Same beat either way — it just answers the call. ──
  const choose = (call: CoverageCall) => {
    if (phase !== 'decide') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    const gen = ++genRef.current;
    setCalled(call); setPhase('snap');
    const lock = s.confirm === 'lock';
    const bk0 = s.backersEnd[0], bk1 = s.backersEnd[1];
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const e = now - t0;
      const k = ease(clamp01(e / SNAP_MS));
      if (e >= SNAP_MS && !revealed) { revealed = true; setPhase('done'); }
      setFrame({
        motion: L(M1, MOT_REL, k),
        nickel: lock ? L(s.nickel.end, LOCK_NICKEL, k) : L(s.nickel.end, DROP_NICKEL, k),
        backers: lock ? [bk0, bk1] : [L(bk0, DROP_BK0, k), L(bk1, DROP_BK1, k)],
        corners: lock ? s.corners.map((c, i) => L(c, LOCK_CORNERS[i], k)) : s.corners,
        wr: [L(WR_TOP, WR_REL[0], k), L(WR_BOT, WR_REL[1], k)],
        trail: 1,
        reveal: clamp01((e - SNAP_MS * 0.55) / (SNAP_MS * 0.45)),
      });
      if (e < SNAP_MS) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the on-field overlay (rebuilt from `frame` each render; players=[] on the field itself) ──
  const dyn: ReactNode[] = [];
  // LOS first → it sits UNDER the dots (FootballField's own LOS is suppressed).
  dyn.push(<Line key="los" x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />);
  dyn.push(<SvgText key="losL" x={FIELD.los + 5} y={22} fontSize={10.5} fontFamily={F_BOLD} fill={FE.losLabel}>Line of scrimmage</SvgText>);

  // the orbit the motion man has already run — the visual memory of "he came from over there"
  if (frame.trail > 0.02) {
    const steps = Math.max(2, Math.round(frame.trail * 26));
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const p = motionPos((i / steps) * frame.trail);
      d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    }
    dyn.push(<Path key="trail" d={d} fill="none" stroke={AMBER} strokeWidth={2.5} strokeDasharray="6 6" opacity={0.7} strokeLinecap="round" />);
  }
  // the confirm layer: zone landmarks (patches of grass) or man lock lines (a name, not a patch)
  if (frame.reveal > 0 && s.confirm === 'zoneDrop') {
    ZONE_LANDMARKS.forEach((p, i) => {
      dyn.push(<Circle key={`zl${i}`} cx={p.x} cy={p.y} r={38} fill={TEAL} opacity={0.1 * frame.reveal} />);
      dyn.push(<Circle key={`zr${i}`} cx={p.x} cy={p.y} r={38} fill="none" stroke={TEAL} strokeWidth={2} strokeDasharray="6 6" opacity={0.75 * frame.reveal} />);
    });
    dyn.push(fieldLabel('zlab', ZONE_LANDMARKS[0].x, ZONE_LANDMARKS[0].y - 46, 'landmarks, not names', '#bfe9da', 10));
  }
  if (frame.reveal > 0 && s.confirm === 'lock') {
    frame.corners.forEach((c, i) => dyn.push(
      <Line key={`lk${i}`} x1={c.x} y1={c.y} x2={frame.wr[i].x} y2={frame.wr[i].y} stroke={TEAL} strokeWidth={2} strokeDasharray="4 4" opacity={0.8 * frame.reveal} />));
    dyn.push(<Line key="lkn" x1={frame.nickel.x} y1={frame.nickel.y} x2={frame.motion.x} y2={frame.motion.y} stroke={TEAL} strokeWidth={2.5} strokeDasharray="4 4" opacity={0.9 * frame.reveal} />);
    dyn.push(fieldLabel('lklab', frame.motion.x, frame.motion.y - 26, 'locked on', '#bfe9da', 10));
  }

  // the lines — small dots, identified via the legend
  OLINE.forEach((p, i) => dyn.push(<Circle key={`ol${i}`} cx={p.x} cy={p.y} r={7} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />));
  DLINE.forEach((p, i) => dyn.push(<Circle key={`dl${i}`} cx={p.x} cy={p.y} r={7} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />));
  // deep safeties — the second clue, and they never move in any of these looks
  s.safeties.forEach((p, i) => {
    dyn.push(<Circle key={`sf${i}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`sfl${i}`, p.x, p.y + 21, 'S', FE.defLabel));
  });
  frame.corners.forEach((p, i) => {
    dyn.push(<Circle key={`cb${i}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`cbl${i}`, p.x, p.y + 21, 'CB', FE.defLabel));
  });
  frame.backers.forEach((p, i) => {
    dyn.push(<Circle key={`lb${i}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`lbl${i}`, p.x, p.y + 21, 'LB', FE.defLabel));
  });
  // the candidate traveler — the defender the whole read hangs on
  {
    const grade = answered ? (correct ? TEAL : RED) : FE.navy;
    dyn.push(<Circle key="nk" cx={frame.nickel.x} cy={frame.nickel.y} r={10} fill={FE.blue} stroke={grade} strokeWidth={answered ? 3 : 1.5} />);
    dyn.push(fieldLabel('nkl', frame.nickel.x, frame.nickel.y + 22, 'NB', FE.defLabel));
  }
  // offense
  dyn.push(<Circle key="qb" cx={QB.x} cy={QB.y} r={10} fill={FE.orange} stroke="#fff" strokeWidth={2.5} />);
  dyn.push(fieldLabel('qbl', QB.x, QB.y + 23, 'QB', FE.offLabel));
  dyn.push(<Circle key="rb" cx={RB.x} cy={RB.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
  dyn.push(fieldLabel('rbl', RB.x, RB.y + 22, 'RB', FE.offLabel));
  frame.wr.forEach((p, i) => {
    dyn.push(<Circle key={`wr${i}`} cx={p.x} cy={p.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`wrl${i}`, p.x, p.y + 22, 'WR', FE.offLabel));
  });
  // THE MOTION MAN — ringed amber from the start (the module's coherence anchor: watch HIM)
  dyn.push(<Circle key="motring" cx={frame.motion.x} cy={frame.motion.y} r={17} fill="none" stroke={AMBER} strokeWidth={2.5} strokeDasharray="4 4" opacity={0.95} />);
  dyn.push(<Circle key="mot" cx={frame.motion.x} cy={frame.motion.y} r={10} fill={FE.orange} stroke={AMBER} strokeWidth={3} />);
  dyn.push(fieldLabel('motl', frame.motion.x, frame.motion.y + 24, 'motion', '#ffe1b3', 10));
  // the ball, on the ground at the center's hands until the snap beat
  dyn.push(
    <G key="ball" x={BALL_AT.x} y={BALL_AT.y}>
      <Ellipse cx={0} cy={0} rx={7} ry={4.4} fill={BALL_BROWN} stroke="#5a3512" strokeWidth={1} />
      <Line x1={-4.4} y1={0} x2={4.4} y2={0} stroke="#f3ead8" strokeWidth={1.3} strokeLinecap="round" />
    </G>,
  );
  const field = (
    <View style={styles.stageWrap}>
      <FootballField players={[]} overlay={dyn} showLos={false} />
      {phase === 'decide' && (
        <TouchableOpacity style={styles.replay} activeOpacity={0.8} hitSlop={10} onPress={resetPlay}>
          <Text style={styles.replayTxt}>↺ run the motion again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => selectScenario(Number(k))} />;
  const promptNode = (
    <View style={styles.prompt}>
      <Text style={styles.promptTxt}>
        {phase === 'preMotion'
          ? <>Same formation, same defense. <Text style={styles.promptB}>Send the ringed man across and watch what they do about it.</Text></>
          : phase === 'motion'
            ? <>He's moving — <Text style={styles.promptB}>who goes with him?</Text></>
            : phase === 'decide'
              ? <>Motion's done. <Text style={styles.promptB}>Man coverage or zone?</Text></>
              : <>The snap answers it: people, or patches of grass.</>}
      </Text>
      <Text style={styles.hintTxt}>
        {phase === 'preMotion' ? 'Grass doesn\'t travel. People do.'
          : phase === 'decide' ? 'Chased across = man. Everyone bumps one spot = zone. Half-chase then a handoff is its own answer.' : ''}
      </Text>
    </View>
  );
  const motionBtn = phase === 'preMotion'
    ? <TouchableOpacity style={styles.goBtn} activeOpacity={0.85} onPress={sendMotion}><Text style={styles.goTxt}>Send him in motion</Text></TouchableOpacity>
    : null;
  const callBtn = (opt: CoverageCall, title: string, sub: string, alt?: boolean) => (
    <TouchableOpacity key={opt} style={[styles.callBtn, alt && styles.callBtnAlt, landscape && styles.callBtnLs]} activeOpacity={0.85} onPress={() => choose(opt)}>
      <Text style={styles.callTitle}>{title}</Text>
      <Text style={styles.callSub}>{sub}</Text>
    </TouchableOpacity>
  );
  const callButtons = phase === 'decide' ? (
    <View style={landscape ? styles.callCol : styles.callRow}>
      {callBtn('man', 'Man', 'they guard people')}
      {callBtn('zone', 'Zone', 'they guard grass', true)}
    </View>
  ) : null;
  const legend = (
    <View style={styles.legend}>
      {([['Offense', FE.orange], ['Defense', FE.blue], ['Ball', BALL_BROWN]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={styles.legendRing} /><Text style={styles.legendTxt}>the man in motion</Text></View>
    </View>
  );
  const verdictCard = answered && v ? (
    <View style={[styles.verdict, landscape && styles.verdictCompact]}>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, correct ? styles.tagGood : styles.tagBad]}>{correct ? 'Called it' : 'Missed it'}</Text>
        <Text style={[styles.tag, styles.tagMode]}>{called === 'man' ? 'You said man' : 'You said zone'}</Text>
      </View>
      <Text style={styles.vtitle} numberOfLines={landscape ? 2 : undefined}>{v.t}</Text>
      <Text style={styles.vbody}>{v.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const foot = (
    <Text style={styles.foot}>Motion doesn't just move a player — <Text style={styles.footB}>it buys information</Text>. Watch who answers it.</Text>
  );
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = (
    <View style={styles.lsPostRow}>
      {resetBtnC}
      {answered
        ? <NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} />
        : <Text style={styles.hintTxt} numberOfLines={2}>Three looks, one question.</Text>}
    </View>
  );

  // ── LANDSCAPE: field-left via the shell; prompt + motion/call buttons (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{verdictCard}{legend}</> : <>{promptNode}{motionBtn}{callButtons}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {field}
      {legend}
      {answered ? verdictCard : promptNode}
      {motionBtn}
      {callButtons}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
        {answered && <NextButton visible variant="filled" label="Next look →" onPress={nextScenario} />}
      </View>
      {foot}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  stageWrap: { position: 'relative' },
  replay: { position: 'absolute', top: 10, right: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(244,244,238,.75)', backgroundColor: 'rgba(13,27,62,.6)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  replayTxt: { color: '#F4F4EE', fontSize: 11.5, fontWeight: '700' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptB: { color: t.accentText, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  goBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  goTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  callRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  callCol: { gap: 8 },
  callBtn: { flexGrow: 1, minWidth: 140, minHeight: 48, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  callBtnLs: { minWidth: 0 },
  callBtnAlt: { backgroundColor: FE.navy, borderWidth: 1, borderColor: '#2b3a5e' },
  callTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  callSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendRing: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderStyle: 'dashed', borderColor: AMBER },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border },
  verdictCompact: { padding: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagGood: { backgroundColor: FE.goodBg, color: FE.good },
  tagBad: { backgroundColor: FE.badBg, color: FE.bad },
  tagMode: { backgroundColor: FE.modeBg, color: FE.mode },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  footB: { fontWeight: '800' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
