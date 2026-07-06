import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { BaseballDiamond, LandscapeGameShell, ScenarioPills, NextButton, BASEBALL_DIAMOND_RATIO, FE } from '../FieldEngine';
import {
  SCENARIOS, nextBaseIfForced, fldName, lerp, dist,
  HOME, FIRST, SECOND, THIRD, MOUND, BASEPOS, START, FIELD_AT, FREEZE_FRAC,
  type Scenario, type BaseKey, type Fielder, type Verdict, type Pt,
} from '../../lib/wheresThePlay';

// Where's the Play? — baseball diagnose-the-force module. Watch the grounder, then TAP the base to
// throw to; the module grades via the per-scenario force verdicts (data layer) and shows the play resolve
// on-field (throw → burst → verdict). Landscape uses the shared LandscapeGameShell (diamond field-left,
// prompt/verdict right). Colors/labels from the prototype; force logic is authoring-critical (lib).
const BLUE = FE.blue, ORANGE = FE.orange, NAVY = FE.navy, BALL = '#ffffff';
const AMBER = '#F5A623', TEAL = '#14B8A6', RED = '#e24b4a';           // freeze ring / verdict burst hues
const F_BOLD = 'SpaceGrotesk_700Bold';
const PITCH_MS = 500, BALL_PXPS = 200, THROW_PXPS = 300, CARRY_PXPS = 220, RELAY_MS = 710, BURST_MS = 600;
const BAT_MS = 1650, FORCED_MS = 1150;   // post-freeze completion — slow enough a force throw / DP relay beats them
const HINT_IDLE = 'Watch the grounder, then read the force.';
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const promptIdle = (s: Scenario) => s.prompt.replace('Where’s the play?', 'Press play.');

type Phase = 'idle' | 'pitch' | 'grounder' | 'frozen' | 'resolving' | 'done';
interface Frame {
  ball: Pt; batter: Pt;
  runners: { key: BaseKey; pos: Pt }[];
  fielders: Record<Fielder, Pt>;
  fielderRing: boolean;                                                // amber freeze ring on the play fielder
  burst: { pos: Pt; color: string; r: number; opacity: number } | null;
}

const initialScene = (s: Scenario): Frame => ({
  ball: MOUND, batter: HOME,
  runners: s.runners.map(k => ({ key: k, pos: BASEPOS[k] })),
  fielders: { ...START }, fielderRing: false, burst: null,
});

// Coverage fielders that ROTATE to a bag as the ball is fielded (prototype-verbatim): skip the fielder
// making the play, and skip second base when a non-forced runner is holding there (don't stack on him).
function computeMovers(s: Scenario): { who: Fielder; from: Pt; to: Pt }[] {
  const secondStaying = s.runners.includes('second') && !nextBaseIfForced(s, 'second');
  const movers: { who: Fielder; from: Pt; to: Pt }[] = [];
  (Object.entries(s.cover) as [BaseKey, Fielder][]).forEach(([baseKey, who]) => {
    if (who === s.fielder) return;
    if (baseKey === 'second' && secondStaying) return;
    movers.push({ who, from: START[who], to: BASEPOS[baseKey] });
  });
  return movers;
}

export default function WheresThePlayGame(_props: AcademyGameProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<BaseKey | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [frame, setFrame] = useState<Frame>(() => initialScene(SCENARIOS[0]));
  const [prompt, setPrompt] = useState<string>(() => promptIdle(SCENARIOS[0]));
  const [hint, setHint] = useState<string>(HINT_IDLE);
  const rafRef = useRef<number | null>(null);
  const frozenFrameRef = useRef<Frame | null>(null);

  const s = SCENARIOS[idx];
  const answered = verdict != null;

  // ── one rAF owner — stopLoop cancels it (called on freeze AND on choose, and on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => {
    stopLoop();
    setIdx(i); setPhase('idle'); setChosen(null); setVerdict(null);
    setFrame(initialScene(SCENARIOS[i])); setPrompt(promptIdle(SCENARIOS[i])); setHint(HINT_IDLE);
  };
  const resetPlay = () => resetTo(idx);
  const selectScenario = (i: number) => resetTo(i);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  // ── phase 1: the pitch (ball mound → home) ──
  const play = () => {
    if (phase !== 'idle') return;
    setPhase('pitch'); setPrompt('The pitch…');
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const p = clamp01((now - t0) / PITCH_MS);
      setFrame(f => ({ ...f, ball: lerp(MOUND, HOME, p) }));
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; grounder(); }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── phase 2: the grounder (constant PACE: dur scales to distance so every scenario moves the same px/s) ──
  const grounder = () => {
    const fld = s.fielder, fieldPos = FIELD_AT[fld]!;
    setPhase('grounder'); setPrompt(`Ground ball to the ${fldName(fld)}…`);
    const fielderStart = START[fld];
    const ballDur = (dist(HOME, fieldPos) / BALL_PXPS) * 1000;
    const movers = computeMovers(s);
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const bt = clamp01((now - t0) / ballDur);
      const fielders: Record<Fielder, Pt> = { ...START };
      fielders[fld] = lerp(fielderStart, fieldPos, bt);
      movers.forEach(m => { fielders[m.who] = lerp(m.from, m.to, bt); });
      const mf = bt * FREEZE_FRAC;
      const runners = s.runners.map(k => {
        const nb = nextBaseIfForced(s, k);
        if (nb) return { key: k, pos: lerp(BASEPOS[k], BASEPOS[nb], mf) };
        if (k === 'third') return { key: k, pos: lerp(THIRD, HOME, bt * 0.18) };   // secondary lead toward home
        if (k === 'second') return { key: k, pos: lerp(SECOND, THIRD, bt * 0.18) }; // secondary lead toward third
        return { key: k, pos: BASEPOS[k] };
      });
      setFrame({ ball: lerp(HOME, fieldPos, bt), batter: lerp(HOME, FIRST, mf), runners, fielders, fielderRing: false, burst: null });
      if (bt < 1) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; freeze(); }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── phase 3: freeze (fielder has the ball; targets spawn). Captures the static frame the resolve builds on ──
  const freeze = () => {
    stopLoop();
    const fld = s.fielder, fieldPos = FIELD_AT[fld]!;
    const fielders: Record<Fielder, Pt> = { ...START };
    fielders[fld] = fieldPos;
    computeMovers(s).forEach(m => { fielders[m.who] = m.to; });
    const runners = s.runners.map(k => {
      const nb = nextBaseIfForced(s, k);
      if (nb) return { key: k, pos: lerp(BASEPOS[k], BASEPOS[nb], FREEZE_FRAC) };
      if (k === 'third') return { key: k, pos: lerp(THIRD, HOME, 0.18) };
      if (k === 'second') return { key: k, pos: lerp(SECOND, THIRD, 0.18) };
      return { key: k, pos: BASEPOS[k] };
    });
    const fz: Frame = { ball: fieldPos, batter: lerp(HOME, FIRST, FREEZE_FRAC), runners, fielders, fielderRing: true, burst: null };
    frozenFrameRef.current = fz;
    setFrame(fz); setPhase('frozen');
    setPrompt(`Frozen. The ${fldName(fld)} has the ball. Tap the base to throw to.`);
    setHint("Where's the force?");
  };

  // ── phase 4: choose a base → throw + burst + verdict (reveal timed to on-field resolution, incl. the DP relay) ──
  const choose = (key: BaseKey) => {
    if (phase !== 'frozen' || chosen) return;
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fieldPos = FIELD_AT[s.fielder]!, target = BASEPOS[key], v = s.verdicts[key];
    const color = v.k === 'good' ? TEAL : v.k === 'ok' ? AMBER : RED;
    const carrySelf = s.cover[key] === s.fielder;                     // coverer IS the fielder → he carries the ball to the bag
    const isDP = !!s.dp && key === 'second';                          // classic 6-4-3: force at second, relay to first
    const base = frozenFrameRef.current!;
    setChosen(key); setPhase('resolving');
    setPrompt(carrySelf ? `The ${fldName(s.fielder)} steps on ${key}…` : `Throw to ${key}…`);

    // Runners keep DEVELOPING under the throw (prototype-verbatim): the batter completes to first and each
    // FORCED runner keeps bearing down on his bag. The race between throw and runner is what makes the force
    // read. Driven on THIS resolve loop from the frozen positions — NO second rAF.
    const runnerPlan = base.runners.map(r => {
      const nb = nextBaseIfForced(s, r.key);
      return { key: r.key, from: r.pos, to: nb ? BASEPOS[nb] : null };
    });
    const motionMs = Math.max(BAT_MS, runnerPlan.some(r => r.to) ? FORCED_MS : 0);

    const dur1 = carrySelf
      ? Math.max(300, (dist(fieldPos, target) / CARRY_PXPS) * 1000)
      : Math.max(300, (dist(fieldPos, isDP ? SECOND : target) / THROW_PXPS) * 1000);
    const resolveMs = isDP ? dur1 + 250 + RELAY_MS : dur1;
    const ballAt = (e: number): Pt => {
      if (isDP) {
        if (e < dur1) return lerp(fieldPos, SECOND, e / dur1);
        if (e < dur1 + 250) return SECOND;
        return lerp(SECOND, FIRST, clamp01((e - dur1 - 250) / RELAY_MS));
      }
      return lerp(fieldPos, target, clamp01(e / dur1));
    };

    let relayAnnounced = false, revealed = false, revealE = 0;
    const total = Math.max(resolveMs + BURST_MS, motionMs);          // run until throw+burst AND the runners finish
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const e = now - t0;
      const ballPos = ballAt(e);
      if (isDP && !relayAnnounced && e >= dur1) { relayAnnounced = true; setPrompt('Force at second! The relay to first…'); }
      if (!revealed && e >= resolveMs) {
        revealed = true; revealE = e;
        setVerdict(v); setPhase('done'); setHint('Reset, or pick another scenario.');
      }
      let burst: Frame['burst'] = null;
      if (revealed) {
        const bp = clamp01((e - revealE) / BURST_MS);
        burst = { pos: isDP ? FIRST : target, color, r: 8 + 18 * bp, opacity: 0.9 * (1 - bp) };
      } else if (isDP && relayAnnounced) {                            // brief burst at second as the force is recorded
        const bp = clamp01((e - dur1) / BURST_MS);
        burst = { pos: SECOND, color: TEAL, r: 8 + 18 * bp, opacity: 0.9 * (1 - bp) };
      }
      const fielders = carrySelf ? { ...base.fielders, [s.fielder]: ballPos } : base.fielders;
      const batter = lerp(base.batter, FIRST, clamp01(e / BAT_MS));
      const runners = runnerPlan.map(rp => ({ key: rp.key, pos: rp.to ? lerp(rp.from, rp.to, clamp01(e / FORCED_MS)) : rp.from }));
      setFrame({ ...base, fielders, ball: ballPos, burst, batter, runners });
      if (e < total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the dynamic SVG layer (children of BaseballDiamond), rebuilt from `frame` each render ──
  const dyn: ReactNode[] = [];
  (Object.keys(frame.fielders) as Fielder[]).forEach(name => {
    const [x, y] = frame.fielders[name];
    const ring = frame.fielderRing && name === s.fielder;
    dyn.push(<Circle key={`f${name}`} cx={x} cy={y} r={12} fill={BLUE} stroke={ring ? AMBER : NAVY} strokeWidth={ring ? 3.5 : 2} />);
    dyn.push(<SvgText key={`fl${name}`} x={x} y={y + 4} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill="#fff">{name}</SvgText>);
  });
  frame.runners.forEach((r, i) => {
    dyn.push(<Circle key={`r${i}`} cx={r.pos[0]} cy={r.pos[1]} r={11} fill={ORANGE} stroke={NAVY} strokeWidth={2} />);
    dyn.push(<SvgText key={`rl${i}`} x={r.pos[0]} y={r.pos[1] + 4} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#fff">R</SvgText>);
  });
  dyn.push(<Circle key="bat" cx={frame.batter[0]} cy={frame.batter[1]} r={11} fill={ORANGE} stroke={NAVY} strokeWidth={2} />);
  dyn.push(<SvgText key="batl" x={frame.batter[0]} y={frame.batter[1] + 4} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#fff">B</SvgText>);
  // persistent highlight on the chosen base (stays through the verdict) — colored by the verdict
  if (chosen) {
    const cv = s.verdicts[chosen];
    const c = cv.k === 'good' ? TEAL : cv.k === 'ok' ? AMBER : RED;
    dyn.push(<Circle key="chosen" cx={BASEPOS[chosen][0]} cy={BASEPOS[chosen][1]} r={17} fill="none" stroke={c} strokeWidth={3.5} />);
  }
  dyn.push(<Circle key="ball" cx={frame.ball[0]} cy={frame.ball[1]} r={5} fill={BALL} stroke={NAVY} strokeWidth={1.2} />);
  if (frame.burst) dyn.push(<Circle key="burst" cx={frame.burst.pos[0]} cy={frame.burst.pos[1]} r={frame.burst.r} fill="none" stroke={frame.burst.color} strokeWidth={3} opacity={frame.burst.opacity} />);
  // tap targets (only while frozen): a transparent HIT circle (r=40 viewBox ≈ 44px on-screen) + a static
  // visible ring. Two-circle pattern per the authoring standard — the filled hit disc, not the stroked ring,
  // is what catches the tap. No SMIL pulse (doesn't port to react-native-svg).
  if (phase === 'frozen') {
    (Object.keys(BASEPOS) as BaseKey[]).forEach(k => {
      const [x, y] = BASEPOS[k];
      dyn.push(<Circle key={`hit${k}`} cx={x} cy={y} r={40} fill="transparent" onPress={() => choose(k)} />);
      dyn.push(<Circle key={`tg${k}`} cx={x} cy={y} r={18} fill="rgba(245,166,35,0.12)" stroke={AMBER} strokeWidth={2.5} onPress={() => choose(k)} />);
    });
  }
  const diamond = <BaseballDiamond fill="width">{dyn}</BaseballDiamond>;

  // ── shared control fragments ──
  const pills = (
    <ScenarioPills items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => selectScenario(Number(k))} wrap={landscape} />
  );
  const legend = (
    <View style={styles.legend}>
      {([['Fielders', BLUE], ['Runners', ORANGE], ['Ball', BALL]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c, borderWidth: c === BALL ? 1 : 0, borderColor: '#999' }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
    </View>
  );
  const playBtn = <TouchableOpacity style={styles.playBtn} activeOpacity={0.85} onPress={play}><Text style={styles.playTxt}>▶ Play</Text></TouchableOpacity>;
  const promptOrVerdict = answered && verdict ? (
    <View style={styles.verdict}>
      <Text style={styles.vkicker}>{`Threw to ${chosen}`}</Text>
      <Text style={[styles.vtag, verdict.k === 'good' ? styles.vtagGood : verdict.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {verdict.k === 'good' ? 'Best play' : verdict.k === 'ok' ? 'Got an out' : 'No play'}
      </Text>
      <Text style={styles.vtitle}>{verdict.t}</Text>
      <Text style={styles.vbody}>{verdict.b}</Text>
    </View>
  ) : (
    <View style={styles.prompt}>
      <Text style={styles.promptTxt}>{prompt}</Text>
      {!!hint && <Text style={styles.hintTxt}>{hint}</Text>}
    </View>
  );
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: diamond field-left, prompt/verdict right (belowFieldReserve 0 — no under-field strip). ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={BASEBALL_DIAMOND_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={diamond}
        controls={<>{promptOrVerdict}{phase === 'idle' && playBtn}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {diamond}
      {legend}
      {promptOrVerdict}
      <View style={styles.controls}>
        {phase === 'idle' && playBtn}
        {answered && <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>}
        {answered && <NextButton visible variant="filled" label="Next scenario →" onPress={nextScenario} />}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Prompt (navy block, first-class instruction) → verdict swap.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vkicker: { color: t.textSecondaryOnDark, fontSize: 10.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Buttons.
  playBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  playTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  // Landscape pinned footer.
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
