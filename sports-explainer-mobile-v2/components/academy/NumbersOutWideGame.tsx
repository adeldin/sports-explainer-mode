import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Circle, Line, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import { RugbyPitch, RugbyBall, PitchLabel, BurstRing, RUGBY, RUGBY_TAG, RUGBY_PITCH_RATIO } from './fields/RugbyPitch';
import {
  SCENARIOS, HOP, R_ACTOR, clampY, ninePos, ballStart, passChainPts, slideDir, countReadouts,
  type NOWScenario, type NOWOption, type Side, type Depth, type XY,
} from '../../lib/numbersOutWide';

// Numbers Out Wide — the rugby overlap-count module. Stop watching the ball, COUNT SHIRTS on each
// side of the ruck, then send the nine that way. The teaching beat is the LIVING DRIFT DEFENSE: the
// line slides with the ball pass-by-pass (staggered, nearest first), the far-side edge folds around
// the ruck and the fullback scrambles across — so the overlap visibly EXPIRES if the ball is slow.
// On a right call the defender who would have made the tackle is instead DRAWN onto the passer,
// which is exactly why the corridor opens. The blitz scenario doesn't drift at all: every defender
// charges his man and the fullback is up in the line — leaving the backfield the chip attacks.
// All copy verbatim from the prototype (lib layer).
//
// Animation: the prototype's nested rAF + setTimeout chains are flattened into ONE prebuilt keyframe
// script, and the whole scene is a pure function of a single elapsed-ms clock driven by one rafRef
// (with a generation guard so a stale frame can never write after reset/scenario change).

// No under-field content in this module (the counts live ON the pitch), so the shell reserves
// nothing below the field and the pitch takes the full body height.
const LS_BELOW_RESERVE = 0;

// ── the keyframe script ──
interface Leg { t0: number; t1: number; from: XY; to: XY; peak?: number } // peak → tumbling chip arc
interface LabelEv { at: number; x: number; y: number; text: string; fill: string; size: number }
interface BurstEv { at: number; x: number; y: number; color: string }
interface PathEv { at: number; x1: number; y1: number; x2: number; y2: number }
interface PromptEv { at: number; text: string }
type LegsBySide = Record<Side, Leg[][]>;
interface Script {
  total: number; verdictAt: number;
  attLegs: LegsBySide; defLegs: LegsBySide; fbLegs: Leg[];
  ball: Leg[];
  labels: LabelEv[]; bursts: BurstEv[]; paths: PathEv[]; prompts: PromptEv[];
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
// The oval's nose tracks its travel on a pass; a chip tumbles end over end.
const ballOnLegs = (base: XY, legs: Leg[], e: number): { x: number; y: number; ang: number } => {
  let p = base, ang = 0;
  for (const l of legs) {
    if (e <= l.t0) return { x: p[0], y: p[1], ang };
    const k = Math.min(1, (e - l.t0) / (l.t1 - l.t0));
    if (l.peak != null) {
      const mx = (l.from[0] + l.to[0]) / 2, my = Math.min(l.from[1], l.to[1]) - l.peak, mk = 1 - k;
      p = [mk * mk * l.from[0] + 2 * mk * k * mx + k * k * l.to[0], mk * mk * l.from[1] + 2 * mk * k * my + k * k * l.to[1]];
      ang = k * 900;
    } else {
      p = [l.from[0] + (l.to[0] - l.from[0]) * k, l.from[1] + (l.to[1] - l.from[1]) * k];
      ang = (Math.atan2(l.to[1] - l.from[1], l.to[0] - l.from[0]) * 180) / Math.PI;
    }
    if (e < l.t1) return { x: p[0], y: p[1], ang };
  }
  return { x: p[0], y: p[1], ang };
};
// The prototype's moveA-overrides-moveA semantics: a new move starts from wherever the actor
// CURRENTLY is. Truncate the running leg at `at` (so there's no jump) and return that position.
function interruptAt(base: XY, legs: Leg[], at: number): XY {
  const p = posOnLegs(base, legs, at);
  for (let i = legs.length - 1; i >= 0; i--) {
    const l = legs[i];
    if (l.t0 >= at) { legs.splice(i, 1); continue; }
    if (l.t1 > at) { l.t1 = at; l.to = p; }
  }
  return p;
}

const emptyLegsBySide = (s: NOWScenario): LegsBySide => ({
  open: s.open.def.map(() => []), short: s.short.def.map(() => []),
});

// THE LIVING DEFENSE. Non-blitz: the chosen side's defenders slide ball-ward (staggered, nearest
// first), the nearest far-side defender folds around the ruck, and the fullback scrambles across —
// unless he's up in the line. Blitz: nobody drifts; every defender charges TO his man and stops on
// his shoulder. `biteIdx` is the defender who gets DRAWN by the second-last passer on a right call.
function driftDefense(sc: Script, s: NOWScenario, side: Side, dur: number, biteIdx: number) {
  const atts = s[side].att;
  const dir = slideDir(s, side);
  if (s[side].blitz) {
    (['open', 'short'] as Side[]).forEach(sd => {
      s[sd].def.forEach((p, i) => {
        const man = s[sd].att[i];
        const to: XY = man ? [man[0] + 18, man[1]] : [p[0] - 44, p[1]];
        sc.defLegs[sd][i].push({ t0: i * 70, t1: i * 70 + dur * 0.8, from: p, to });
      });
    });
    if (s.fbInLine) sc.fbLegs.push({ t0: 0, t1: dur * 0.85, from: s.fullback, to: [s.fullback[0] - 30, s.fullback[1]] });
    return;
  }
  s[side].def.forEach((p, i) => {
    if (i === biteIdx && atts.length >= 2) {
      // the RIGHT call: he commits to the man who throws the LAST pass — the reason the corridor opens
      const drawer = atts[atts.length - 2];
      const t0 = (atts.length - 1) * HOP - 120;
      sc.defLegs[side][i].push({ t0, t1: t0 + 320, from: p, to: [drawer[0] + 13, drawer[1] + 6] });
      sc.labels.push({ at: t0 + 320, x: drawer[0] + 4, y: drawer[1] + 30, text: 'drawn in', fill: '#ffe1b3', size: 9.5 });
      return;
    }
    sc.defLegs[side][i].push({
      t0: i * 110, t1: i * 110 + dur * 0.92,
      from: p, to: [p[0] - 6, clampY(p[1] + dir * (34 + i * 7))],
    });
  });
  const other: Side = side === 'open' ? 'short' : 'open';
  if (s[other].def.length) {
    const p = s[other].def[0];
    sc.defLegs[other][0].push({ t0: 180, t1: 180 + dur, from: p, to: [p[0] + 6, clampY(p[1] + dir * 30)] });
  }
  if (!s.fbInLine) {
    sc.fbLegs.push({ t0: 0, t1: dur * 1.1, from: s.fullback, to: [s.fullback[0] - 24, clampY(s.fullback[1] + dir * 46)] });
  }
}

function buildScript(s: NOWScenario, opt: NOWOption): Script {
  const sc: Script = {
    total: 0, verdictAt: 0,
    attLegs: { open: s.open.att.map(() => []), short: s.short.att.map(() => []) },
    defLegs: emptyLegsBySide(s), fbLegs: [], ball: [],
    labels: [], bursts: [], paths: [], prompts: [],
  };
  const good = s.answer === opt;

  if (opt === 'kick') {
    sc.prompts.push({ at: 0, text: 'Chip over the top…' });
    const from = ballStart(s), to: XY = [560, 140];
    // the blitz keeps coming — their whole line surges forward UNDER the ball
    (['open', 'short'] as Side[]).forEach(side => {
      s[side].def.forEach((p, i) => {
        sc.defLegs[side][i].push({ t0: i * 60, t1: i * 60 + 700, from: p, to: [p[0] - 26, p[1]] });
      });
    });
    if (s.fbInLine && good) {
      sc.fbLegs.push({ t0: 0, t1: 700, from: s.fullback, to: [s.fullback[0] - 26, s.fullback[1]] });
    }
    // the wing chaser sprints after it — and is beaten to the spot when the FB is deep
    const ci = s.open.att.length - 1;
    sc.attLegs.open[ci].push({
      t0: 0, t1: 980, from: s.open.att[ci],
      to: good ? [to[0] - 14, to[1] + 10] : [to[0] - 52, to[1] + 22],
    });
    // a DEEP fullback reads the chip in the air — he's waiting under it
    if (!good) sc.fbLegs.push({ t0: 0, t1: 820, from: s.fullback, to: [to[0] + 4, to[1] - 2] });
    sc.ball.push({ t0: 0, t1: 900, from, to, peak: 90 });
    if (good) {
      sc.bursts.push({ at: 900, x: to[0], y: to[1], color: RUGBY.teal });
      sc.labels.push({ at: 900, x: to[0], y: to[1] - 22, text: 'regathered — nobody home', fill: '#bfe9da', size: 11 });
      sc.prompts.push({ at: 900, text: 'The backfield was <b>empty</b> — their aggression paid your bill.' });
    } else {
      sc.bursts.push({ at: 900, x: to[0], y: to[1], color: RUGBY.red });
      sc.labels.push({ at: 900, x: to[0], y: to[1] - 22, text: 'FB fields it — possession gone', fill: '#ffb3ae', size: 11 });
    }
    sc.verdictAt = 900;
  } else {
    sc.prompts.push({ at: 0, text: 'The nine goes — <b>watch their line slide with the ball…</b>' });
    const side = opt;
    const setup = s[side];
    const atts = setup.att;
    const chain = passChainPts(s, side);
    const dur = HOP * (chain.length - 1);
    for (let i = 0; i < chain.length - 1; i++) {
      sc.ball.push({ t0: i * HOP, t1: (i + 1) * HOP, from: chain[i], to: chain[i + 1] });
    }
    driftDefense(sc, s, side, dur, good ? setup.punish : -1);
    const end = chain[chain.length - 1];
    if (good) {
      // the extra man hits the gap before the drift arrives
      const li = atts.length - 1;
      const to: XY = [end[0] + 150, end[1]];
      sc.paths.push({ at: dur, x1: end[0], y1: end[1], x2: to[0], y2: to[1] });
      sc.ball.push({ t0: dur, t1: dur + 650, from: end, to });
      sc.attLegs[side][li].push({ t0: dur, t1: dur + 650, from: atts[li], to });
      sc.bursts.push({ at: dur + 650, x: to[0], y: to[1], color: RUGBY.teal });
      sc.labels.push({ at: dur + 650, x: to[0], y: to[1] - 22, text: 'the spare man — through', fill: '#bfe9da', size: 11 });
      sc.verdictAt = dur + 650;
    } else {
      // the drift arrives WITH the ball: the punisher jumps the last pass
      const pi = setup.punish;
      const legs = sc.defLegs[side][pi];
      const fromP = interruptAt(setup.def[pi], legs, dur);
      legs.push({ t0: dur, t1: dur + 300, from: fromP, to: [end[0] + 9, end[1] + 10] });
      sc.bursts.push({ at: dur + 300, x: end[0], y: end[1], color: RUGBY.red });
      sc.labels.push({ at: dur + 300, x: end[0], y: end[1] - 24, text: 'swallowed — the slide got there', fill: '#ffb3ae', size: 11 });
      sc.verdictAt = dur + 300;
    }
  }

  // total = the last thing that MOVES (bursts run 600ms) + a beat, never shorter than the verdict.
  let end = sc.verdictAt;
  const all: Leg[] = [...sc.ball, ...sc.fbLegs];
  (['open', 'short'] as Side[]).forEach(sd => { sc.attLegs[sd].forEach(l => all.push(...l)); sc.defLegs[sd].forEach(l => all.push(...l)); });
  all.forEach(l => { if (l.t1 > end) end = l.t1; });
  sc.bursts.forEach(b => { if (b.at + 600 > end) end = b.at + 600; });
  sc.total = end + 300;
  return sc;
}

// Prompt text with the prototype's inline <b>…</b> emphasis rendered as amber bold.
function Rich({ text, style, boldStyle }: { text: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

export default function NumbersOutWideGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState<Level>(appLevel);
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [opt, setOpt] = useState<NOWOption | null>(null);
  const [e, setE] = useState(0);
  const scriptRef = useRef<Script | null>(null);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const sc = scriptRef.current;
  const verd = opt ? s.verd[opt] : null;
  const showVerdict = phase !== 'idle' && sc != null && e >= sc.verdictAt;

  // ── single rAF owner + generation guard ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);
  const resetTo = (i: number) => {
    genRef.current++; stopLoop();
    setIdx(i); setPhase('idle'); setOpt(null); setE(0); scriptRef.current = null;
  };
  const choose = (o: NOWOption) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const script = buildScript(s, o);
    scriptRef.current = script; setOpt(o); setPhase('run'); setE(0);
    const gen = ++genRef.current;
    let begin: number | null = null;
    const loop = (now: number) => {
      if (genRef.current !== gen) return;
      if (begin == null) begin = now;
      const el = now - begin;
      if (el >= script.total) { setE(script.total); setPhase('done'); rafRef.current = null; return; }
      setE(el);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the pitch layer at time e (draw order: counts · paths · defense · attack · ball · fx · labels) ──
  const els: React.ReactNode[] = [];
  // counts — drawn the instant a call is made; THE COUNT IS THE WHOLE READ
  if (sc) {
    countReadouts(s).forEach((c, i) => (
      els.push(<PitchLabel key={`cnt${i}`} x={c.x} y={c.y} text={c.text} fill="#fff" size={22} outline={5} />)
    ));
  }
  // pre-call tells: blitz chevrons + the "line is flying up" callout (they vanish on the call)
  if (!sc) {
    (['open', 'short'] as Side[]).forEach(side => {
      if (!s[side].blitz) return;
      s[side].def.forEach((p, i) => {
        const x = p[0] - 18, y = p[1];
        els.push(<Path key={`tl${side}${i}`} d={`M${x + 6} ${y - 6} L${x} ${y} L${x + 6} ${y + 6}`} fill="none" stroke={RUGBY.defLbl} strokeWidth={2.5} strokeLinecap="round" />);
      });
    });
    if (s.open.blitz || s.short.blitz) {
      els.push(<PitchLabel key="blz" x={462} y={228} text="⟵ their line is flying up" fill={RUGBY.defLbl} size={9.5} />);
    }
  }
  // the running lane the spare man attacks
  sc?.paths.forEach((p, i) => {
    if (e < p.at) return;
    els.push(<Line key={`pt${i}`} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={RUGBY.chalk} strokeWidth={2.5} opacity={0.5} strokeDasharray="4 5" />);
  });
  // the ruck pile (a defender is in there too — that's what makes it a ruck)
  els.push(<Circle key="rk1" cx={s.ruck[0] - 8} cy={s.ruck[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} opacity={0.9} />);
  els.push(<Circle key="rk2" cx={s.ruck[0] + 8} cy={s.ruck[1] - 4} r={R_ACTOR} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} opacity={0.9} />);
  els.push(<Circle key="rk3" cx={s.ruck[0] - 2} cy={s.ruck[1] + 10} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} opacity={0.9} />);
  // their line + their fullback (positions are a pure function of e once the film is running)
  const defLabels: React.ReactNode[] = [];
  (['open', 'short'] as Side[]).forEach(side => {
    s[side].def.forEach((base, i) => {
      const p = sc ? posOnLegs(base, sc.defLegs[side][i], e) : base;
      els.push(<Circle key={`d${side}${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.def} stroke={RUGBY.navy} strokeWidth={2} />);
      defLabels.push(<PitchLabel key={`dl${side}${i}`} x={p[0]} y={p[1] - 16} text={s[side].dlab[i]} fill={RUGBY.defLbl} size={10.5} outline={3.5} />);
    });
  });
  {
    const p = sc ? posOnLegs(s.fullback, sc.fbLegs, e) : s.fullback;
    els.push(<Circle key="fb" cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.fb} stroke={RUGBY.navy} strokeWidth={2} />);
    defLabels.push(<PitchLabel key="fbl" x={p[0]} y={p[1] - 16} text="FB" fill={RUGBY.fbLbl} size={10.5} outline={3.5} />);
  }
  // your runners on both sides + the nine
  const attLabels: React.ReactNode[] = [];
  (['open', 'short'] as Side[]).forEach(side => {
    s[side].att.forEach((base, i) => {
      const p = sc ? posOnLegs(base, sc.attLegs[side][i], e) : base;
      els.push(<Circle key={`a${side}${i}`} cx={p[0]} cy={p[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
      attLabels.push(<PitchLabel key={`al${side}${i}`} x={p[0]} y={p[1] - 16} text={s[side].alab[i]} size={10.5} outline={3.5} />);
    });
  });
  {
    const n = ninePos(s);
    els.push(<Circle key="nine" cx={n[0]} cy={n[1]} r={R_ACTOR} fill={RUGBY.att} stroke={RUGBY.navy} strokeWidth={2} />);
    attLabels.push(<PitchLabel key="ninel" x={n[0]} y={n[1] - 16} text="9" size={10.5} outline={3.5} />);
  }
  // the ball — an oval, nose along its travel, tumbling on the chip
  {
    const b = sc ? ballOnLegs(ballStart(s), sc.ball, e) : { x: ballStart(s)[0], y: ballStart(s)[1], ang: 0 };
    els.push(<RugbyBall key="ball" x={b.x} y={b.y} ang={b.ang} />);
  }
  sc?.bursts.forEach((b, i) => els.push(<BurstRing key={`bu${i}`} x={b.x} y={b.y} prog={(e - b.at) / 600} color={b.color} maxR={26} />));
  els.push(...defLabels, ...attLabels);
  els.push(<PitchLabel key="rl" x={s.ruck[0] + 30} y={s.ruck[1] - 14} text="ruck" fill="#d9e2d9" size={9.5} outline={3} />);
  sc?.labels.forEach((l, i) => {
    if (e >= l.at) els.push(<PitchLabel key={`lb${i}`} x={l.x} y={l.y} text={l.text} fill={l.fill} size={l.size} />);
  });

  const pitch = <RugbyPitch fill="width">{els}</RugbyPitch>;

  // ── chrome fragments ──
  const promptText = phase === 'idle'
    ? s.prompt
    : showVerdict
      ? "Look at the counts on the pitch — <b>that's the whole read.</b>"
      : (sc?.prompts.filter(p => e >= p.at).pop()?.text ?? s.prompt);
  const prompt = <View style={[styles.prompt, landscape && styles.promptLs]}><Rich text={promptText} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} /></View>;
  const hintText = showVerdict ? 'Reset, or pick another ruck.' : 'Count both sides before you call it.';
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((x, i) => ({ key: String(i), name: x.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Attack (going right)', RUGBY.att], ['Defense', RUGBY.def], ['Fullback (last line)', RUGBY.fb]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  const judgeButtons = (
    <View style={styles.judgeWrap}>
      <TouchableOpacity style={[styles.judgeBtn, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose('open')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{s.open.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.judgeBtn, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose('short')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{s.short.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.judgeBtn, styles.judgeBtnAlt, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose('kick')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>Kick behind</Text>
      </TouchableOpacity>
    </View>
  );
  const verdictCard = showVerdict && verd ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, verd.k === 'good' ? styles.vtagGood : styles.vtagBad]}>
        {verd.k === 'good' ? 'Right call' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{verd.t}</Text>
      <Text style={styles.vbody}>{verd.b}</Text>
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
      <NextButton visible variant="filled" style={styles.lsNextFill} label="Next ruck →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />
    </View>
  ) : undefined;

  // ── LANDSCAPE: the shared shell (pitch left, call/verdict right). Pre-call the three call buttons
  // are mounted; on reveal they UNMOUNT and the verdict takes their space, with Reset + Next pinned. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={RUGBY_PITCH_RATIO}
        belowFieldReserve={LS_BELOW_RESERVE}
        pills={pills}
        field={pitch}
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
      {pitch}
      {legend}
      {prompt}
      {phase === 'idle' && judgeButtons}
      {verdictCard}
      <View style={styles.controlsRow}>
        {resetBtn}
        {showVerdict && <NextButton visible variant="filled" label="Next ruck →" onPress={() => resetTo((idx + 1) % SCENARIOS.length)} />}
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
  judgeBtn: { flexGrow: 1, flexBasis: '45%', minHeight: 48, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  judgeBtnLs: { minHeight: 46, paddingVertical: 8 },
  judgeBtnAlt: { backgroundColor: '#0d1b3e', borderWidth: 1, borderColor: t.border },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800', textAlign: 'center' },
  judgeTxtLs: { fontSize: 13 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: RUGBY_TAG.goodBg, color: RUGBY_TAG.good },
  vtagBad: { backgroundColor: RUGBY_TAG.badBg, color: RUGBY_TAG.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  readLbl: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 2 },
  vread: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  hint: { color: t.textSecondaryOnDark, fontSize: 12, marginTop: 4, flexShrink: 1 },
  hintLs: { fontSize: 10.5, marginTop: 2 },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
});
