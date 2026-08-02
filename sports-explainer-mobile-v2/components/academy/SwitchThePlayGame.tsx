import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { SoccerPitch, ScenarioPills, DifficultyTabs, NextButton, LandscapeGameShell, SOCCER_PITCH_RATIO, FE } from '../FieldEngine';
import {
  SCENARIOS, BUILD, WIDX, themPosAt, usPosAt, ballAt, breadcrumbTimes,
  type Pt, type StpOption, type Depth, type Grade,
} from '../../lib/switchThePlay';

// Switch the Play — 11v11 far-side read. The scene OPENS as FILM: tap ▶ and the ball travels
// CB → 6 → RB → winger while their block slides ACROSS in response, pass by pass. When your winger
// receives, the tape STOPS — that frozen picture is the whole teaching device, because the answer
// (line / pivot / switch) is only readable from where their block ended up. Then the ball you chose
// gets played out on the pitch. Scene math + all copy are the data lib's, VERBATIM from the
// prototype; the film and every resolve share ONE rAF loop.
const ATT = '#E87722', DEF = '#3B6FE0', GK_C = '#8e44ad', NAVY = '#0d1b3e', CHALK = '#F4F4EE';
const AMBER = '#F5A623', TEAL = '#14B8A6', LBL_OUT = '#1b3a1b';
const F_BOLD = 'SpaceGrotesk_700Bold';
const FX_GOOD_MS = 600, FX_BAD_MS = 1100, FX_PULSE_MS = 700;
const HINT_LIVE = "Where ISN'T the defense?";
const HINT_DONE = 'Reset, or read another block.';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Phase = 'idle' | 'playing' | 'ready' | 'resolving' | 'done';
interface Track { key: string; from: Pt; to: Pt; ctrl?: Pt; start: number; dur: number }
interface Ev { at: number; run: () => void }
interface Fx { kind: 'good' | 'bad' | 'pulse'; pos: Pt; color?: string; born: number }
interface OutLabel { pos: Pt; text: string; color: string }
interface Ghost { pos: Pt; txt: string }

const lerpPt = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const arcCtrl = (from: Pt, to: Pt, peak: number): Pt => ({ x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - peak });
const lblAbove = (y: number) => (y >= 40 && y < 75) || y > 385;

// Prompt text with **bold** segments in the prototype's amber.
function Prompt({ text, hint, styles, compact }: { text: string; hint?: string; styles: ReturnType<typeof makeStyles>; compact?: boolean }) {
  const parts = text.split('**');
  return (
    <View style={[styles.prompt, compact && styles.promptLs]}>
      <Text style={[styles.promptTxt, compact && styles.promptTxtLs]}>
        {parts.map((p, i) => (i % 2 ? <Text key={i} style={styles.promptB}>{p}</Text> : p))}
      </Text>
      {!!hint && <Text style={[styles.hintTxt, compact && styles.hintTxtLs]}>{hint}</Text>}
    </View>
  );
}

// Outlined on-pitch label (react-native-svg has no paint-order: outline pass first, fill on top).
function OutlinedText({ x, y, text, fill, size = 11 }: { x: number; y: number; text: string; fill: string; size?: number }) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={LBL_OUT} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </>
  );
}

// The explanation key rides UNDER the field, not at the bottom of the controls scroll: this field is
// WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved ALWAYS
// (~42pt, two compact rows at the field width) so the art size never jumps between states, and the
// height it frees is real height back in the controls column.
const LS_LEGEND_RESERVE = 42;

export default function SwitchThePlayGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [sec, setSec] = useState(0);                                 // film clock (seconds)
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<StpOption | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [over, setOver] = useState<Record<string, Pt>>({});          // resolve-phase position overrides
  const [fxList, setFxList] = useState<Fx[]>([]);
  const [outLabels, setOutLabels] = useState<OutLabel[]>([]);
  const [resPaths, setResPaths] = useState<{ from: Pt; to: Pt }[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [resClock, setResClock] = useState(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';

  // ── one rAF owner: the film AND every resolve run on it (stopped on freeze, choose, reset, unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => {
    stopLoop();
    setIdx(i); setSec(0); setPhase('idle'); phaseRef.current = 'idle';
    setChosen(null); setGrade(null); setOver({}); setFxList([]); setOutLabels([]); setResPaths([]); setGhosts([]); setResClock(0);
  };
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  // ── the build-up FILM: ball CB → 6 → RB → winger, block sliding in response, then a TRUE freeze ──
  const play = () => {
    if (phase !== 'idle') return;
    setPhase('playing'); phaseRef.current = 'playing';
    let localSec = 0, last: number | null = null;
    const loop = (now: number) => {
      if (phaseRef.current !== 'playing') return;
      if (last == null) last = now;
      localSec += (now - last) / 1000; last = now;
      if (localSec >= BUILD.end) {
        setSec(BUILD.end); rafRef.current = null;
        setPhase('ready'); phaseRef.current = 'ready';       // ⏸ the tape stops — the decision is yours
        return;
      }
      setSec(localSec);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── resolve runner: one rAF drives all tweens + timed events + the fx clock ──
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
          if (tr.ctrl) {
            const mk = 1 - k;
            next[tr.key] = {
              x: mk * mk * tr.from.x + 2 * mk * k * tr.ctrl.x + k * k * tr.to.x,
              y: mk * mk * tr.from.y + 2 * mk * k * tr.ctrl.y + k * k * tr.to.y,
            };
          } else next[tr.key] = lerpPt(tr.from, tr.to, k);
        }
      }
      evs.forEach((ev, i) => { if (c >= ev.at && !fired.has(i)) { fired.add(i); ev.run(); } });
      setOver(next); setResClock(c);
      if (c < endMs) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const addFx = (k: Fx['kind'], pos: Pt, born: number, color?: string) => setFxList(f => [...f, { kind: k, pos, color, born }]);
  const addLabel = (pos: Pt, text: string, color: string) => setOutLabels(l => [...l, { pos, text, color }]);
  const addPath = (from: Pt, to: Pt) => setResPaths(p => [...p, { from, to }]);

  // ── pick your ball off the frozen picture → play it out ──
  const choose = (opt: StpOption) => {
    if (phase !== 'ready') return;
    stopLoop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const g = s.grade[opt];
    const frozen = BUILD.end;
    const usP = (i: number) => usPosAt(s, i, frozen);
    const themP = (i: number) => themPosAt(s, i, frozen);
    const wp = usP(WIDX);
    const b0 = ballAt(s, frozen);
    const bNow: Pt = { x: b0.x + 10, y: b0.y - 2 };
    const rbIdx = s.them.findIndex(p => p.r === 'RB');
    setPhase('resolving'); phaseRef.current = 'resolving';
    setChosen(opt); setGrade(g);
    const showV = () => { setPhase('done'); phaseRef.current = 'done'; };
    // the far-side/channel ghost — drawn only when the ball you played was the wrong one
    const markGhost = (at: number) => { setGhosts(gs => [...gs, { pos: s.ghost.p, txt: s.ghost.txt }]); addFx('pulse', s.ghost.p, at, TEAL); };

    if (opt === 'switch') {
      if (g.k === 'good') {
        // back to the pivot, then the DRIVEN diagonal — not the floated one their eight reads
        const sixP = usP(5), wkP = usP(8);
        addPath(wp, sixP);
        const land: Pt = { x: 600, y: 100 };
        const tracks: Track[] = [
          { key: 'ball', from: bNow, to: { x: sixP.x + 10, y: sixP.y }, start: 0, dur: 360 },
          { key: 'ball', from: { x: sixP.x + 10, y: sixP.y }, to: { x: wkP.x + 10, y: wkP.y }, start: 360, dur: 340 },
          { key: 'us8', from: wkP, to: land, start: 700, dur: 600 },
          { key: 'ball', from: { x: wkP.x + 10, y: wkP.y }, to: { x: 610, y: 102 }, start: 700, dur: 600 },
        ];
        if (rbIdx >= 0) tracks.push({ key: `them${rbIdx}`, from: themP(rbIdx), to: { x: 588, y: 84 }, start: 700, dur: 600 });
        runTimeline(tracks, [
          { at: 360, run: () => addPath(sixP, wkP) },
          { at: 1300, run: () => { addFx('good', land, 1300); addLabel({ x: 600, y: 74 }, '1 v 1 — ROOM TO RUN', '#bfe9da'); showV(); } },
        ], 1300 + FX_GOOD_MS + 200);
      } else {
        // the fifty-yard ball hangs, and their weak-side man reads it the whole way
        const wkP = usP(8);
        addPath(wp, wkP);
        const meet: Pt = { x: wkP.x + 16, y: wkP.y + 12 };
        const tracks: Track[] = [{ key: 'ball', from: bNow, to: meet, ctrl: arcCtrl(bNow, meet, 130), start: 0, dur: 900 }];
        if (rbIdx >= 0) tracks.push({ key: `them${rbIdx}`, from: themP(rbIdx), to: { x: meet.x + 2, y: meet.y - 10 }, start: 900, dur: 240 });
        runTimeline(tracks, [
          { at: 900, run: () => { addFx('bad', meet, 900); addLabel({ x: meet.x, y: meet.y - 26 }, idx === 2 ? 'INTO TRAFFIC' : 'READ — a marked man', '#ffb3ae'); markGhost(900); showV(); } },
        ], 900 + FX_BAD_MS + 200);
      }
      return;
    }

    if (opt === 'line') {
      if (g.k === 'good' && s.channel) {
        // one touch past the jumped fullback, striker running the channel he vacated
        const sp = s.channel.space;
        addPath(wp, sp);
        runTimeline([
          { key: 'us9', from: usP(9), to: { x: sp.x - 8, y: sp.y - 6 }, start: 0, dur: 620 },
          { key: 'them1', from: themP(1), to: { x: sp.x - 40, y: sp.y - 24 }, start: 0, dur: 680 },
          { key: 'ball', from: bNow, to: { x: sp.x + 8, y: sp.y }, start: 0, dur: 520 },
        ], [
          { at: 520, run: () => { addFx('good', sp, 520); addLabel({ x: sp.x - 6, y: sp.y - 26 }, 'IN BEHIND — the channel', '#bfe9da'); showV(); } },
        ], 520 + FX_GOOD_MS + 200);
      } else {
        // the double team closes the corridor — the ball dies in the corner
        const dead: Pt = { x: 556, y: 392 };
        addPath(wp, dead);
        runTimeline([
          { key: 'them1', from: themP(1), to: { x: dead.x + 6, y: dead.y - 14 }, start: 0, dur: 300 },
          { key: 'them2', from: themP(2), to: { x: dead.x - 22, y: dead.y - 6 }, start: 0, dur: 300 },
          { key: 'ball', from: bNow, to: { x: dead.x, y: dead.y - 4 }, start: 0, dur: 380 },
        ], [
          { at: 380, run: () => { addFx('bad', { x: dead.x, y: dead.y - 6 }, 380); addLabel({ x: dead.x - 4, y: dead.y - 30 }, 'DOUBLED — dead end', '#ffb3ae'); markGhost(380); showV(); } },
        ], 380 + FX_BAD_MS + 200);
      }
      return;
    }

    // pivot — recycle. Good: the block has to shift AGAIN. Otherwise: it re-balances while you recycle.
    const sixP = usP(5);
    addPath(wp, sixP);
    const tracks: Track[] = [{ key: 'ball', from: bNow, to: { x: sixP.x + 10, y: sixP.y }, start: 0, dur: 420 }];
    if (g.k === 'good') {
      s.them.forEach((p, i) => {
        if (p.gk) return;
        const pp = themP(i);
        tracks.push({ key: `them${i}`, from: pp, to: { x: pp.x - 34, y: pp.y - 16 }, start: 420, dur: 650 });
      });
      runTimeline(tracks, [
        { at: 1120, run: () => { addFx('good', sixP, 1120); addLabel({ x: sixP.x, y: sixP.y - 26 }, 'MOVED THEM — again', '#bfe9da'); showV(); } },
      ], 1120 + FX_GOOD_MS + 200);
    } else {
      s.them.forEach((p, i) => {
        if (!p.pre) return;
        tracks.push({ key: `them${i}`, from: themP(i), to: { x: p.pre.x + 20, y: p.pre.y - 8 }, start: 420, dur: 650 });
      });
      runTimeline(tracks, [
        { at: 1120, run: () => { addFx('pulse', sixP, 1120, AMBER); addLabel({ x: 360, y: 96 }, 'RE-BALANCED — the moment is gone', '#ffe1b3'); markGhost(1120); showV(); } },
      ], 1120 + FX_PULSE_MS + 300);
    }
  };

  // ── the pitch: pure scene functions at `sec`, with resolve overrides on top ──
  const els: ReactNode[] = [];
  // the film's breadcrumbs — each pass line appears as its leg begins, derived from the clock
  breadcrumbTimes().forEach((b, i) => {
    if (sec < b.at) return;
    const a = usPosAt(s, b.fromI, b.at), c = usPosAt(s, b.toI, b.at);
    els.push(<Line key={`bc${i}`} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={CHALK} strokeWidth={2} opacity={0.5} strokeDasharray="4 5" />);
  });
  resPaths.forEach((p, i) => els.push(
    <Line key={`pth${i}`} x1={p.from.x} y1={p.from.y} x2={p.to.x} y2={p.to.y} stroke={CHALK} strokeWidth={2} opacity={0.5} strokeDasharray="4 5" />));
  s.them.forEach((p, i) => {
    const pos = over[`them${i}`] ?? themPosAt(s, i, sec);
    els.push(<Circle key={`tm${i}`} cx={pos.x} cy={pos.y} r={10} fill={p.gk ? GK_C : DEF} stroke={NAVY} strokeWidth={2} />);
    els.push(<OutlinedText key={`tml${i}`} x={pos.x} y={pos.y + (lblAbove(p.p.y) ? -16 : 21)} text={p.r} fill="#fff" />);
  });
  s.us.forEach((p, i) => {
    const pos = over[`us${i}`] ?? usPosAt(s, i, sec);
    const onBall = i === WIDX;                                    // your ball-side winger — the man deciding
    els.push(<Circle key={`us${i}`} cx={pos.x} cy={pos.y} r={10} fill={p.r === 'GK' ? GK_C : ATT} stroke={onBall ? AMBER : NAVY} strokeWidth={onBall ? 3.5 : 2} />);
    els.push(<OutlinedText key={`usl${i}`} x={pos.x} y={pos.y + (lblAbove(p.p.y) ? -16 : 21)} text={p.r} fill="#fff" />);
  });
  ghosts.forEach((g, i) => {
    els.push(<Circle key={`gh${i}`} cx={g.pos.x} cy={g.pos.y} r={11} fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray="3 4" opacity={0.95} />);
    els.push(<OutlinedText key={`ght${i}`} x={g.pos.x} y={g.pos.y + 21} text={g.txt} fill="#bfe9da" />);
  });
  const liveBall = ballAt(s, sec);
  const ballPos = over.ball ?? { x: liveBall.x + 10, y: liveBall.y - 2 };
  els.push(<Circle key="ball" cx={ballPos.x} cy={ballPos.y} r={6} fill="#fff" stroke={NAVY} strokeWidth={1.5} />);
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
    } else if (fx.kind === 'bad') {
      const p1 = clamp01(e / 500);
      els.push(<Circle key={`fb1${i}`} cx={fx.pos.x} cy={fx.pos.y} r={12 * (0.2 + 1.7 * p1)} fill="none" stroke="#e24b4a" strokeWidth={4} opacity={0.95 * (1 - p1)} />);
      const px = clamp01(e / FX_BAD_MS);
      const xo = px < 1 / 3 ? 3 * px : px < 2 / 3 ? 1 : 3 * (1 - px);
      els.push(<Path key={`fbx${i}`} d={`M${fx.pos.x - 8} ${fx.pos.y - 8} L${fx.pos.x + 8} ${fx.pos.y + 8} M${fx.pos.x + 8} ${fx.pos.y - 8} L${fx.pos.x - 8} ${fx.pos.y + 8}`} stroke="#e24b4a" strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={xo} />);
    } else {
      const p1 = clamp01(e / FX_PULSE_MS);
      els.push(<Circle key={`fp${i}`} cx={fx.pos.x} cy={fx.pos.y} r={6 + 20 * p1} fill="none" stroke={fx.color ?? TEAL} strokeWidth={3} opacity={0.9 * (1 - p1)} />);
    }
  });
  outLabels.forEach((l, i) => els.push(<OutlinedText key={`ol${i}`} x={l.pos.x} y={l.pos.y} text={l.text} fill={l.color} size={13} />));
  const pitch = <SoccerPitch fill="width">{els}</SoccerPitch>;

  // ── controls ──
  const promptText = phase === 'idle'
    ? 'Tap **▶ Play the build-up** — watch the ball travel, and watch the block move **because** of it.'
    : phase === 'playing'
      ? 'The ball travels — **watch them slide with it…**'
      : phase === 'ready'
        ? "⏸ **The tape stops here.** They've slid over — line, pivot, or switch?"
        : phase === 'done'
          ? "The switch attacks **where the defense isn't** — when it's on, and only then."
          : chosen === 'switch'
            ? (grade?.k === 'good' ? 'Back to the pivot — **and the driven diagonal!**' : 'The fifty-yard ball — **hangs…**')
            : chosen === 'line'
              ? (grade?.k === 'good' ? 'One touch past him — **into the channel!**' : 'Down the line — **into bodies.**')
              : 'Back to the six — **keep it moving.**';
  const promptBlock = <Prompt text={promptText} hint={answered ? HINT_DONE : HINT_LIVE} styles={styles} compact={landscape} />;
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Your team (attacking right)', ATT], ['Their block — sliding to the ball', DEF], ['Keepers', GK_C]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  // ▶ Play the build-up — the film that produces the frozen picture the whole read depends on.
  const filmRow = !answered ? (
    <View style={styles.controls}>
      {/* Colour follows the LIVE action: Play carries the accent until it is pressed, then the three
          calls take it and Play drops to muted blue. Enablement is untouched. */}
      <TouchableOpacity style={[styles.filmBtn, phase !== 'idle' && styles.btnMuted, landscape && styles.filmBtnLs]} activeOpacity={0.85} disabled={phase !== 'idle'} onPress={play}>
        <Text style={[styles.filmTxt, phase !== 'idle' && styles.btnMutedTxt, landscape && styles.filmTxtLs]}>▶ Play the build-up</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}>
        <Text style={styles.ghostTxt}>↺ Reset</Text>
      </TouchableOpacity>
    </View>
  ) : null;
  const judgeBtn = (o: StpOption, main: string, sub: string, alt: boolean) => (
    <TouchableOpacity key={o} style={[styles.judgeBtn, phase !== 'ready' && styles.btnMuted, landscape && styles.judgeBtnLs]} activeOpacity={0.85} disabled={phase !== 'ready'} onPress={() => choose(o)}>
      <Text style={[styles.judgeTxt, phase !== 'ready' && styles.btnMutedTxt, landscape && styles.judgeTxtLs]}>{main}</Text>
      <Text style={[styles.judgeSub, phase !== 'ready' && styles.btnMutedTxt, landscape && styles.judgeSubLs]}>{sub}</Text>
    </TouchableOpacity>
  );
  // the three balls — UNMOUNT on reveal so the verdict takes their space (Reset + Next stay, in the footer)
  const judge = !answered ? (
    <View style={landscape ? styles.judgeCol : styles.judgeRow}>
      {judgeBtn('line', 'Down the LINE', 'take them on at the touchline', false)}
      {judgeBtn('pivot', 'PIVOT — recycle', 'backwards to go forwards', true)}
      {judgeBtn('switch', 'SWITCH — long diagonal', 'attack the far side', true)}
    </View>
  ) : null;
  const verdictCard = answered && grade ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, grade.k === 'good' ? styles.vtagGood : grade.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {grade.k === 'good' ? 'Right ball' : grade.k === 'ok' ? 'Defensible' : 'Wrong ball'}
      </Text>
      <Text style={styles.vtitle}>{grade.t}</Text>
      <Text style={styles.vbody}>{grade.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const postRow = (
    <View style={landscape ? styles.lsPostRow : styles.postRow}>
      <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>
      <NextButton visible variant="filled" style={landscape ? styles.lsNextFill : undefined} label={landscape ? 'Next →' : 'Next scenario →'} onPress={nextScenario} />
    </View>
  );
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;

  // ── LANDSCAPE: pitch field-left, prompt + film/choice buttons (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SOCCER_PITCH_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={pills}
        field={pitch}
        belowField={lsLegendUnder}
        controls={answered ? <>{verdictCard}</> : <>{promptBlock}{filmRow}{judge}</>}
        controlsFooter={answered ? postRow : undefined}
      />
    );
  }

  // ── PORTRAIT: vertical stack (prototype order: pills · pitch · legend · prompt · judge · verdict · controls). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {pitch}
      {legend}
      {promptBlock}
      {filmRow}
      {judge}
      {verdictCard}
      {answered && postRow}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Prompt.
  legendTxtLs: { fontSize: 10 },
  lsLegendUnder: { minHeight: LS_LEGEND_RESERVE, paddingTop: 4, justifyContent: 'center' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptB: { color: AMBER, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  // Film row.
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  // Border on the BASE (transparent) so the muted state can show one without a 1pt size jump.
  filmBtn: { flex: 1, minWidth: 150, backgroundColor: t.accent, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  filmBtnLs: { minHeight: 44, paddingVertical: 9 },
  filmTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  filmTxtLs: { fontSize: 13 },
  // Not-yet-live control: muted blue (the module's own surface), NOT a dimmed accent — the accent
  // belongs to whichever button is actually pressable right now.
  // A dark button always carries a visible border, so it never reads as an unoutlined floating block.
  btnMuted: { backgroundColor: t.surface, borderColor: t.border },
  btnMutedTxt: { color: t.textSecondaryOnDark },
  // Choice buttons.
  judgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  judgeCol: { gap: 8, marginTop: 4, flexWrap: 'nowrap' },
  judgeBtn: { flex: 1, minWidth: 150, backgroundColor: t.accent, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  // Verdict.
  judgeSubLs: { fontSize: 10 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  // Post-call rows + shared buttons.
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
});
