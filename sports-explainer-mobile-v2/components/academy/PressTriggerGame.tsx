import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Rect, Path, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { SoccerPitch, ScenarioPills, DifficultyTabs, NextButton, LandscapeGameShell, SOCCER_PITCH_RATIO, FE } from '../FieldEngine';
import {
  SCENARIOS, ROLE, themPosAt, usPosAt, ballLiveAt, classifyPress, scrubMessage, resolvedStateLine,
  timelineBands, type Pt, type PressKind, type Depth, type PressScenario,
} from '../../lib/pressTrigger';

// Press Trigger — 11v11 live press-timing module. They build out (attacking right); the PRESS button
// is live the whole sequence, and the call is graded against a two-phase window: cut the pass in
// flight (light green) or trap the receiver (deep green) — early and late are punished, and the bait
// scenario has no window at all (holding is correct). After the call, the timeline unlocks for
// VAR-style review with the trigger bands drawn. All copy/scenarios verbatim from the prototype.
const ATT = '#E87722', DEF = '#3B6FE0', GK_C = '#8e44ad', NAVY = '#0d1b3e', CHALK = '#F4F4EE';
const AMBER = '#F5A623', LBL_OUT = '#1b3a1b';
const F_BOLD = 'SpaceGrotesk_700Bold';
const LS_SCRUB_RESERVE = 76;   // bands bar + slider + state line under the pitch (stable pitch size)
const FX_GOOD_MS = 600, FX_BAD_MS = 1100;
const lerpPt = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

type Phase = 'idle' | 'running' | 'resolving' | 'done';
interface Track { key: string; from: Pt; to: Pt; start: number; dur: number }
interface Ev { at: number; run: () => void }
interface Fx { kind: 'good' | 'bad'; pos: Pt; born: number }
interface OutLabel { pos: Pt; text: string; color: string }

// Prompt text with **bold** segments rendered in the prototype's amber.
function Prompt({ text, styles, compact }: { text: string; styles: ReturnType<typeof makeStyles>; compact?: boolean }) {
  const parts = text.split('**');
  return (
    <View style={[styles.prompt, compact && styles.promptLs]}>
      <Text style={[styles.promptTxt, compact && styles.promptTxtLs]}>
        {parts.map((p, i) => (i % 2 ? <Text key={i} style={styles.promptB}>{p}</Text> : p))}
      </Text>
    </View>
  );
}

// Outlined on-pitch label (react-native-svg has no paint-order: outline pass first, fill on top).
function OutlinedText({ x, y, text, fill, size = 11, weight: _w, outlineW = 3 }: {
  x: number; y: number; text: string; fill: string; size?: number; weight?: never; outlineW?: number;
}) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={LBL_OUT} strokeWidth={outlineW} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </>
  );
}

export default function PressTriggerGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pressT, setPressT] = useState<number | null>(null);
  const [kind, setKind] = useState<PressKind | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [scrubbed, setScrubbed] = useState(false);
  const [over, setOver] = useState<Record<string, Pt>>({});
  const [fxList, setFxList] = useState<Fx[]>([]);
  const [outLabels, setOutLabels] = useState<OutLabel[]>([]);
  const [paths, setPaths] = useState<{ from: Pt; to: Pt }[]>([]);
  const [resClock, setResClock] = useState(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;

  // ── single rAF owner ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetScenario = (i: number = idx) => {
    stopLoop();
    setIdx(i); setT(0); setPhase('idle'); setPressT(null); setKind(null); setScrubbed(false);
    setOver({}); setFxList([]); setOutLabels([]); setPaths([]); setResClock(0);
  };
  const nextScenario = () => resetScenario((idx + 1) % SCENARIOS.length);

  // ── live build-out loop: t += dt*17 (slowed — the read needs watching time, not reflexes) ──
  const play = () => {
    if (phase !== 'idle') return;
    setPhase('running');
    let localT = 0, last: number | null = null;
    const loop = (now: number) => {
      if (phaseRef.current !== 'running') return;
      if (last == null) last = now;
      const dt = (now - last) / 1000; last = now;
      localT += dt * 17;
      if (localT >= 100) {
        setT(100); rafRef.current = null;
        finish(s.window === null ? 'hold' : 'late', null);
        return;
      }
      setT(localT);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── resolve-timeline runner: one rAF drives all tweens + timed events + fx clock ──
  const runTimeline = (tracks: Track[], evs: Ev[], endMs: number) => {
    stopLoop();
    const fired = new Set<number>();
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const c = now - t0;
      const next: Record<string, Pt> = {};
      for (const tr of tracks) {
        if (c >= tr.start) {
          const k = Math.min(1, (c - tr.start) / tr.dur);
          next[tr.key] = lerpPt(tr.from, tr.to, k);
        }
      }
      evs.forEach((e, i) => { if (c >= e.at && !fired.has(i)) { fired.add(i); e.run(); } });
      setOver(next); setResClock(c);
      if (c < endMs) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const finish = (k: PressKind, pT: number | null) => {
    setKind(k); setPressT(pT); setPhase('done');
  };
  const addFx = (kind2: 'good' | 'bad', pos: Pt, born: number) => setFxList(f => [...f, { kind: kind2, pos, born }]);
  const addLabel = (pos: Pt, text: string, color: string) => setOutLabels(l => [...l, { pos, text, color }]);
  const addPath = (from: Pt, to: Pt) => setPaths(p => [...p, { from, to }]);

  // ── PRESS! — classify against the window, then run the prototype's resolve choreography ──
  const pressNow = () => {
    if (phase !== 'running') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    const tp = t;
    setPhase('resolving'); setPressT(tp);
    const { kind: k, targetId } = classifyPress(s, tp);
    const themP = (id: string) => themPosAt(s, id, tp);
    const usP = (i: number) => usPosAt(s, i, tp);
    const ballDrawn: Pt = { x: ballLiveAt(s, tp).x + 12, y: ballLiveAt(s, tp).y };
    const w = s.window;

    if (k === 'cut' && w) {
      // the ball is airborne — it belongs to NOBODY. The nearest presser jumps the lane.
      const cutPt = lerpPt(ballDrawn, themP(w.to), 0.45);
      let near = 0, best = Infinity;
      s.us.forEach((_, i) => { const p = usP(i); const d = Math.hypot(p.x - cutPt.x, p.y - cutPt.y); if (d < best) { best = d; near = i; } });
      runTimeline(
        [
          { key: `us${near}`, from: usP(near), to: { x: cutPt.x + 2, y: cutPt.y + 12 }, start: 0, dur: 320 },
          { key: 'ball', from: ballDrawn, to: { x: cutPt.x + 10, y: cutPt.y }, start: 0, dur: 320 },
        ],
        [{ at: 320, run: () => { addFx('good', cutPt, 320); addLabel({ x: cutPt.x, y: cutPt.y - 28 }, 'PASS CUT OUT', '#bfe9da'); finish('cut', tp); } }],
        320 + FX_GOOD_MS + 200,
      );
      return;
    }

    // the cage converges on the TARGET PLAYER — never on a point in mid-air.
    const tgt = themP(targetId);
    const OFF: [number, number][] = [[-24, -10], [18, -18], [4, 22]];
    const sorted = s.us.map((_, i) => ({ i, d: Math.hypot(usP(i).x - tgt.x, usP(i).y - tgt.y) })).sort((a, b) => a.d - b.d).slice(0, 3);
    const cageTracks: Track[] = sorted.map((o, j) => ({
      key: `us${o.i}`, from: usP(o.i),
      to: { x: clamp(tgt.x + OFF[j][0], 16, 664), y: clamp(tgt.y + OFF[j][1], 22, 398) },
      start: 0, dur: 460,
    }));

    if (k === 'good') {
      runTimeline(
        [...cageTracks, { key: 'ball', from: ballDrawn, to: { x: tgt.x + 12, y: tgt.y }, start: 0, dur: 260 }],
        [{ at: 460, run: () => { addFx('good', tgt, 460); addLabel({ x: tgt.x, y: tgt.y - 28 }, 'TURNOVER', '#bfe9da'); finish('good', tp); } }],
        460 + FX_GOOD_MS + 200,
      );
      return;
    }

    if (k === 'late' && s.lateOut) {
      // too late: the receiver is set — he plays out of it exactly as the verdict says.
      const lo = s.lateOut;
      const carry = lo.carry;
      const tracks: Track[] = [
        ...cageTracks,
        { key: 'ball', from: ballDrawn, to: { x: tgt.x + 12, y: tgt.y }, start: 0, dur: 260 },
        { key: 'ball', from: { x: tgt.x + 12, y: tgt.y }, to: { x: lo.to.x + 12, y: lo.to.y }, start: 260, dur: 420 },
      ];
      if (carry) tracks.push({ key: 'ball', from: { x: lo.to.x + 12, y: lo.to.y }, to: { x: carry.x + 12, y: carry.y }, start: 680, dur: 480 });
      const finAt = carry ? 1160 : 680;
      const fin = carry ?? lo.to;
      runTimeline(
        tracks,
        [
          { at: 260, run: () => addPath(tgt, lo.to) },
          { at: finAt, run: () => { addFx('bad', fin, finAt); addLabel({ x: fin.x, y: fin.y - 26 }, lo.label, '#ffb3ae'); finish('late', tp); } },
        ],
        finAt + FX_BAD_MS + 200,
      );
      return;
    }

    // punished (early): a good player plays ONE TOUCH — the escape pass fires the instant the
    // ball arrives, while the cage is still landing on empty grass. Escape man breaks through.
    const ep = themP('six');
    const brk: Pt = { x: Math.min(600, ep.x + 180), y: ep.y + (s.overload ? 90 : 0) };
    runTimeline(
      [
        ...cageTracks,
        { key: 'ball', from: ballDrawn, to: { x: tgt.x + 12, y: tgt.y }, start: 0, dur: 260 },
        { key: 'ball', from: { x: tgt.x + 12, y: tgt.y }, to: { x: ep.x + 12, y: ep.y }, start: 260, dur: 420 },
        { key: 'them:six', from: ep, to: brk, start: 680, dur: 560 },
        { key: 'ball', from: { x: ep.x + 12, y: ep.y }, to: { x: brk.x + 12, y: brk.y }, start: 680, dur: 560 },
      ],
      [
        { at: 260, run: () => { addLabel({ x: tgt.x, y: tgt.y - 26 }, 'one touch!', '#ffe1b3'); addPath(tgt, ep); } },
        { at: 1240, run: () => { addFx('bad', brk, 1240); addLabel({ x: brk.x, y: brk.y - 26 }, 'PLAYED THROUGH', '#ffb3ae'); finish('early', tp); } },
      ],
      1240 + FX_BAD_MS + 200,
    );
  };

  // ── VAR review: dragging rewinds the BUILD-OUT — everyone back to their shape. ──
  const onScrub = (v: number) => {
    if (phase !== 'done') return;
    stopLoop();
    if (!scrubbed) { setScrubbed(true); setFxList([]); setPaths([]); setOutLabels([]); setOver({}); }
    setT(clamp(v, 0, 100));
  };

  // ── verdict ──
  const vv = kind ? (kind === 'hold' ? s.verd.hold : s.verd[kind]) : undefined;
  const correct = kind === 'good' || kind === 'cut' || (kind === 'hold' && !s.window);

  // ── the pitch at time t (pure functions + resolve overrides) ──
  const els: ReactNode[] = [];
  // their defensive-third box (they build out from the LEFT goal — prototype paint).
  els.push(<Rect key="lbox" x={6} y={110} width={96} height={200} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />);
  els.push(<Rect key="l6" x={6} y={160} width={40} height={100} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />);
  paths.forEach((p, i) => els.push(
    <Line key={`pth${i}`} x1={p.from.x} y1={p.from.y} x2={p.to.x} y2={p.to.y} stroke={CHALK} strokeWidth={2.5} opacity={0.55} strokeDasharray="4 5" />));
  const lblAbove = (y: number) => (y >= 40 && y < 75) || y > 385;
  s.them.forEach((p, i) => {
    const pos = over[`them:${p.id}`] ?? themPosAt(s, p.id, t);
    const above = lblAbove(p.p.y);
    els.push(<Circle key={`tm${i}`} cx={pos.x} cy={pos.y} r={10} fill={p.gk ? GK_C : DEF} stroke={NAVY} strokeWidth={2} />);
    els.push(<OutlinedText key={`tml${i}`} x={pos.x} y={pos.y + (above ? -16 : 21)} text={ROLE[p.id]} fill="#fff" />);
  });
  s.us.forEach((home, i) => {
    const pos = over[`us${i}`] ?? usPosAt(s, i, t);
    const above = lblAbove(home.y);
    els.push(<Circle key={`us${i}`} cx={pos.x} cy={pos.y} r={10} fill={s.usR[i] === 'GK' ? GK_C : ATT} stroke={NAVY} strokeWidth={2} />);
    els.push(<OutlinedText key={`usl${i}`} x={pos.x} y={pos.y + (above ? -16 : 21)} text={s.usR[i]} fill="#fff" />);
  });
  if (s.overload) { // the bait callouts — the free six + the loaded far side
    els.push(<OutlinedText key="co1" x={250} y={186} text="their six — free" fill="#ffd23f" size={10} />);
    els.push(<OutlinedText key="co2" x={430} y={404} text="far side: spare men — 2 v 1 on the switch" fill="#ffd23f" size={10} />);
  }
  const liveBall = ballLiveAt(s, t);
  const ballPos = over.ball ?? { x: liveBall.x + 12, y: liveBall.y };
  els.push(<Circle key="ball" cx={ballPos.x} cy={ballPos.y} r={6} fill="#fff" stroke={NAVY} strokeWidth={1.5} />);
  // fx (burst rings / red X), driven off the resolve clock
  fxList.forEach((fx, i) => {
    const e = resClock - fx.born;
    if (fx.kind === 'good') {
      const p1 = clamp01(e / FX_GOOD_MS);
      els.push(<Circle key={`fg1${i}`} cx={fx.pos.x} cy={fx.pos.y} r={14 * (0.2 + 1.7 * p1)} fill="none" stroke="#16a37f" strokeWidth={4} opacity={0.95 * (1 - p1)} />);
      const p2 = clamp01((e - 80) / FX_GOOD_MS);
      els.push(<Circle key={`fg2${i}`} cx={fx.pos.x} cy={fx.pos.y} r={14 * (0.2 + 1.7 * p2)} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />);
      for (let j = 0; j < 8; j++) {
        const ps = clamp01((e - j * 10) / 550);
        const a = (j / 8) * Math.PI * 2, d = 26 * ps;
        els.push(<Circle key={`fs${i}_${j}`} cx={fx.pos.x + Math.cos(a) * d} cy={fx.pos.y + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={ps < 0.7 ? 1 : 1 - (ps - 0.7) / 0.3} />);
      }
    } else {
      const p1 = clamp01(e / 500);
      els.push(<Circle key={`fb1${i}`} cx={fx.pos.x} cy={fx.pos.y} r={12 * (0.2 + 1.7 * p1)} fill="none" stroke="#e24b4a" strokeWidth={4} opacity={0.95 * (1 - p1)} />);
      const px = clamp01(e / FX_BAD_MS);
      const xo = px < 1 / 3 ? 3 * px : px < 2 / 3 ? 1 : 3 * (1 - px);
      els.push(<Path key={`fbx${i}`} d={`M${fx.pos.x - 8} ${fx.pos.y - 8} L${fx.pos.x + 8} ${fx.pos.y + 8} M${fx.pos.x + 8} ${fx.pos.y - 8} L${fx.pos.x - 8} ${fx.pos.y + 8}`} stroke="#e24b4a" strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={xo} />);
    }
  });
  outLabels.forEach((l, i) => els.push(<OutlinedText key={`ol${i}`} x={l.pos.x} y={l.pos.y} text={l.text} fill={l.color} size={13} />));
  const pitch = <SoccerPitch fill="width">{els}</SoccerPitch>;

  // ── timeline (bands bar + scrubber + state line) ──
  const bands = phase === 'done' ? timelineBands(s) : [];
  const sm = scrubbed ? scrubMessage(s, t) : null;
  const tstate = phase === 'idle' ? 'Press play, then pick your moment'
    : phase === 'running' || phase === 'resolving' ? 'Live — pick your moment'
      : sm ? sm.text : kind ? resolvedStateLine(kind) : '';
  const timeline = (
    <View style={styles.tline}>
      <View style={styles.bar}>
        {bands.map((b, i) => (
          <View key={i} style={[styles.band, { left: `${b.left}%`, width: `${b.width}%`, backgroundColor: b.color }]} />
        ))}
        <View style={[styles.mk, { left: `${clamp(t, 0, 100)}%` }]} />
      </View>
      <Slider
        style={styles.slider} minimumValue={0} maximumValue={100} step={0.5} value={pressT ?? (phase === 'done' ? 100 : t)}
        disabled={phase !== 'done'} onValueChange={onScrub}
        minimumTrackTintColor={theme.accent} maximumTrackTintColor={theme.border} thumbTintColor={theme.accent}
      />
      <View style={styles.tinfoRow}>
        <Text style={[styles.tinfo, sm?.emph && styles.tinfoEmph]} numberOfLines={1}>{tstate}</Text>
        {phase === 'done' && (
          <Text style={styles.winInfo} numberOfLines={1}>{s.window ? 'greens = the trigger (light = cut the pass)' : 'no trigger existed'}</Text>
        )}
      </View>
    </View>
  );

  // ── controls ──
  const promptText = phase === 'idle'
    ? 'Tap **Play**. The PRESS button is live the whole sequence — but a bad jump is worse than no jump.'
    : phase === 'done'
      ? 'A press is a **decision**, not an effort level. **Drag the slider** back to the green band — see the picture at the trigger.'
      : "They're building… **wait for the weakness.**";
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Them (building out)', DEF], ['Keepers', GK_C], ['Your press', ATT]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  const actionRow = phase !== 'done' && (
    <View style={styles.controls}>
      {/* Colour follows the LIVE action, not the loudest word: Play is primary until it is pressed,
          then PRESS! takes the accent and Play drops back to muted. Enablement is untouched. */}
      <TouchableOpacity style={[styles.ghostBtn, phase === 'idle' && styles.playHot]} activeOpacity={0.8} disabled={phase !== 'idle'} onPress={play}>
        <Text style={[styles.ghostTxt, phase === 'idle' && styles.playHotTxt, phase !== 'idle' && styles.disabledTxt]}>▶ Play</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.pressBtn, phase !== 'running' && styles.pressBtnOff, landscape && styles.pressBtnLs]} activeOpacity={0.85} disabled={phase !== 'running'} onPress={pressNow}>
        <Text style={[styles.pressTxt, phase !== 'running' && styles.pressTxtOff, landscape && styles.pressTxtLs]}>PRESS!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => resetScenario()}>
        <Text style={styles.ghostTxt}>↺ Reset</Text>
      </TouchableOpacity>
    </View>
  );
  const verdict = phase === 'done' && vv ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, correct ? styles.vtagGood : styles.vtagBad]}>{correct ? 'Right moment' : 'Not this time'}</Text>
      <Text style={styles.vtitle}>{vv.t}</Text>
      <Text style={styles.vbody}>{vv.b}</Text>
      <Text style={styles.readlbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const postRow = (
    <View style={landscape ? styles.lsPostRow : styles.postRow}>
      <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={() => resetScenario()}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>
      <NextButton visible variant="filled" style={landscape ? styles.lsNextFill : undefined} label="Next scenario →" onPress={nextScenario} />
    </View>
  );
  const pills = (
    <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={(k) => resetScenario(Number(k))} />
  );

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SOCCER_PITCH_RATIO}
        belowFieldReserve={LS_SCRUB_RESERVE}
        pills={pills}
        field={pitch}
        belowField={timeline}
        controls={
          phase === 'done'
            ? <>{verdict}{legend}</>
            : <><Prompt text={promptText} styles={styles} compact={landscape} />{actionRow}{legend}</>
        }
        controlsFooter={phase === 'done' ? postRow : undefined}
      />
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {pitch}
      {timeline}
      {legend}
      <Prompt text={promptText} styles={styles} compact={landscape} />
      {actionRow}
      {verdict}
      {phase === 'done' && postRow}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Timeline.
  tline: { marginTop: 6 },
  bar: { height: 12, borderRadius: 6, backgroundColor: t.border, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0 },
  mk: { position: 'absolute', top: -2, width: 3, height: 16, backgroundColor: t.textPrimary, borderRadius: 2 },
  slider: { height: 32, marginTop: 2 },
  tinfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tinfo: { flex: 1, color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '600' },
  tinfoEmph: { color: '#14B8A6', fontWeight: '800' },
  winInfo: { color: AMBER, fontSize: 10.5, fontWeight: '700' },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Prompt.
  legendTxtLs: { fontSize: 10 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptB: { color: AMBER, fontWeight: '800' },
  // Actions.
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  pressBtn: { flex: 1, minWidth: 120, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  pressBtnLs: { minHeight: 44, paddingVertical: 9 },
  // Not-yet-live PRESS!: muted blue (the module's own surface), NOT a dimmed accent — the accent
  // belongs to whichever button is actually pressable right now.
  pressBtnOff: { backgroundColor: t.surface },
  pressTxtOff: { color: t.textSecondaryOnDark },
  // Play carries the accent until it is pressed.
  playHot: { backgroundColor: t.accent, borderColor: t.accent },
  playHotTxt: { color: '#fff', fontWeight: '800' },
  pressTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  pressTxtLs: { fontSize: 14 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  disabledTxt: { opacity: 0.4 },
  // Verdict.
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readlbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  // Post-call rows.
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
