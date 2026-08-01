import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Rect, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { SoccerPitch, ScenarioPills, DifficultyTabs, NextButton, LandscapeGameShell, SOCCER_PITCH_RATIO, FE } from '../FieldEngine';
import {
  SCENARIOS, themPosAt, usPosAt, windowState, type Pt, type CoKOption, type CoKKind, type Depth, type Grade,
} from '../../lib/counterOrKeep';

// Counter or Keep? — 11v11 transition-moment module. You just won the ball; the scene is ALIVE (their
// recovery runners sprint home, the caught men jog) and the window bar drains in real time. Counter,
// keep, or clear — and countering after the window closes earns the lateCounter verdict. All
// copy/scenarios verbatim from the prototype; the living-recovery scene is a pure function of time.
const ATT = '#E87722', DEF = '#3B6FE0', GK_C = '#8e44ad', NAVY = '#0d1b3e', CHALK = '#F4F4EE';
const AMBER = '#F5A623', TEAL = '#14B8A6', LBL_OUT = '#1b3a1b';
const F_BOLD = 'SpaceGrotesk_700Bold';
const LS_BAR_RESERVE = 46;   // window bar + state line under the pitch
const FX_GOOD_MS = 600, FX_BAD_MS = 1100, FX_PULSE_MS = 700;
const lerpPt = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Phase = 'live' | 'resolving' | 'done';
interface Track { key: string; from: Pt; to: Pt; ctrl?: Pt; start: number; dur: number }
interface Ev { at: number; run: () => void }
interface Fx { kind: 'good' | 'bad' | 'pulse'; pos: Pt; color?: string; born: number }
interface OutLabel { pos: Pt; text: string; color: string }
interface Ghost { pos: Pt; txt: string }

function Prompt({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  const parts = text.split('**');
  return (
    <View style={styles.prompt}>
      <Text style={styles.promptTxt}>
        {parts.map((p, i) => (i % 2 ? <Text key={i} style={styles.promptB}>{p}</Text> : p))}
      </Text>
    </View>
  );
}

function OutlinedText({ x, y, text, fill, size = 11 }: { x: number; y: number; text: string; fill: string; size?: number }) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={LBL_OUT} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </>
  );
}

export default function CounterOrKeepGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [runId, setRunId] = useState(0);   // bumps on every (re)start so the live-loop effect re-arms
  const [sec, setSec] = useState(0);
  const [phase, setPhase] = useState<Phase>('live');
  const [kind, setKind] = useState<CoKKind | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [over, setOver] = useState<Record<string, Pt>>({});
  const [fxList, setFxList] = useState<Fx[]>([]);
  const [outLabels, setOutLabels] = useState<OutLabel[]>([]);
  const [paths, setPaths] = useState<{ from: Pt; to: Pt }[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [resClock, setResClock] = useState(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('live');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const win = windowState(s, sec);

  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  // ── the scene lives from the first frame: recovery runners track home while you decide ──
  const startLive = () => {
    let localSec = 0, last: number | null = null;
    const loop = (now: number) => {
      if (phaseRef.current !== 'live') return;
      if (last == null) last = now;
      localSec += (now - last) / 1000; last = now;
      setSec(localSec);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };
  const resetScenario = (i: number = idx) => {
    stopLoop();
    setIdx(i); setSec(0); setKind(null); setGrade(null);
    setOver({}); setFxList([]); setOutLabels([]); setPaths([]); setGhosts([]); setResClock(0);
    setPhase('live'); setRunId(r => r + 1);
  };
  const nextScenario = () => resetScenario((idx + 1) % SCENARIOS.length);
  // kick the live loop whenever a scenario (re)starts — runId bumps even when phase was already 'live'
  useEffect(() => { startLive(); return stopLoop; }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      evs.forEach((e, i) => { if (c >= e.at && !fired.has(i)) { fired.add(i); e.run(); } });
      setOver(next); setResClock(c);
      if (c < endMs) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const addFx = (k: Fx['kind'], pos: Pt, born: number, color?: string) => setFxList(f => [...f, { kind: k, pos, color, born }]);
  const addLabel = (pos: Pt, text: string, color: string) => setOutLabels(l => [...l, { pos, text, color }]);
  const addPath = (from: Pt, to: Pt) => setPaths(p => [...p, { from, to }]);
  const addGhost = (g: Ghost) => setGhosts(gs => [...gs, g]);
  const arcCtrl = (from: Pt, to: Pt, peak: number): Pt => ({ x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - peak });

  // ── choose: freeze the living scene, grade the call, run the prototype's resolve choreography ──
  const choose = (opt: CoKOption) => {
    if (phase !== 'live') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    const frozen = sec;
    const gone = windowState(s, frozen).gone;
    let g = s.grade[opt]!;
    let k: CoKKind = opt;
    if (opt === 'counter' && gone && s.grade.lateCounter) { g = s.grade.lateCounter; k = 'lateCounter'; }
    setPhase('resolving'); setKind(k); setGrade(g);
    const usP = (i: number) => usPosAt(s, i, frozen);
    const themP = (i: number) => themPosAt(s, i, frozen);
    const wPos = usP(s.wIdx);
    const ballHome: Pt = { x: s.us[s.wIdx].p.x + 12, y: s.us[s.wIdx].p.y - 4 };
    const showV = () => setPhase('done');

    if (k === 'lateCounter') {
      // the right idea against a picture that no longer exists — the nearest RECOVERED defender steps in
      const tp = usP(s.runners[0]);
      addPath(wPos, tp);
      const mid = lerpPt(wPos, tp, 0.62);
      let best = -1, bd = Infinity;
      s.them.forEach((p, i) => {
        if (p.rec && !p.slow) { const pp = themP(i); const d = Math.hypot(pp.x - mid.x, pp.y - mid.y); if (d < bd) { bd = d; best = i; } }
      });
      const tracks: Track[] = [{ key: 'ball', from: ballHome, to: mid, start: 0, dur: 380 }];
      if (best >= 0) tracks.push({ key: `them${best}`, from: themP(best), to: { x: mid.x + 4, y: mid.y - 12 }, start: 380, dur: 220 });
      runTimeline(tracks, [
        { at: 380, run: () => { addFx('bad', mid, 380); addLabel({ x: mid.x, y: mid.y - 26 }, 'CUT OUT — TOO LATE', '#ffb3ae'); showV(); } },
      ], 600 + FX_BAD_MS);
      return;
    }

    if (opt === 'counter') {
      const tp = usP(s.runners[0]);
      addPath(wPos, tp);
      if (g.k === 'good') {
        // the break: runners surge, their last line backpedals, ball to the shot
        const tracks: Track[] = [
          { key: 'ball', from: ballHome, to: { x: tp.x + 10, y: tp.y }, start: 0, dur: 380 },
          { key: 'ball', from: { x: tp.x + 10, y: tp.y }, to: s.shot!, start: 380, dur: 620 },
        ];
        s.runners.forEach((ri, j) => {
          if (s.surgeUs && s.surgeUs[j]) tracks.push({ key: `us${ri}`, from: usP(ri), to: s.surgeUs[j], start: 380, dur: 620 });
        });
        let si = 0;
        s.them.forEach((p, i) => {
          if (p.r === 'CB' && s.surgeThem && si < s.surgeThem.length) { tracks.push({ key: `them${i}`, from: themP(i), to: s.surgeThem[si], start: 380, dur: 620 }); si++; }
        });
        runTimeline(tracks, [
          { at: 1000, run: () => { addFx('good', s.shot!, 1000); addLabel({ x: s.shot!.x - 6, y: s.shot!.y - 26 }, 'CHANCE CREATED', '#bfe9da'); showV(); } },
        ], 1000 + FX_GOOD_MS + 200);
      } else {
        // punished: the lone striker is swallowed — their nearest two collapse
        const near = s.them.map((_, i) => ({ i, d: Math.hypot(themP(i).x - tp.x, themP(i).y - tp.y) })).sort((a, b) => a.d - b.d).slice(0, 2);
        const tracks: Track[] = [
          { key: 'ball', from: ballHome, to: { x: tp.x + 10, y: tp.y }, ctrl: arcCtrl(ballHome, { x: tp.x + 10, y: tp.y }, 90), start: 0, dur: 600 },
          ...near.map((o, j) => ({ key: `them${o.i}`, from: themP(o.i), to: { x: tp.x + (j ? 14 : -14), y: tp.y + (j ? 10 : -10) }, start: 600, dur: 300 })),
        ];
        runTimeline(tracks, [
          { at: 940, run: () => { addFx('bad', tp, 940); addLabel({ x: tp.x, y: tp.y - 26 }, 'SWALLOWED — 1 v 3', '#ffb3ae'); addGhost({ pos: s.ghost.p, txt: s.ghost.txt }); addFx('pulse', s.ghost.p, 940, TEAL); showV(); } },
        ], 940 + FX_BAD_MS);
      }
      return;
    }

    if (opt === 'keep') {
      const out = usP(s.keepTo);
      addPath(wPos, out);
      if (g.k === 'good') {
        // the team climbs the pitch together
        const tracks: Track[] = [{ key: 'ball', from: ballHome, to: { x: out.x + 10, y: out.y }, start: 0, dur: 420 }];
        s.us.forEach((p, i) => { if (p.r !== 'GK') tracks.push({ key: `us${i}`, from: usP(i), to: { x: usP(i).x + 22, y: usP(i).y }, start: 420, dur: 600 }); });
        runTimeline(tracks, [
          { at: 420, run: () => { addFx('good', out, 420); addLabel({ x: out.x, y: out.y - 26 }, 'POSSESSION KEPT', '#bfe9da'); } },
          { at: 1070, run: showV },
        ], 1070 + FX_GOOD_MS);
      } else {
        // the reveal: their recovery COMPLETES while you recycle — window closed
        const tracks: Track[] = [{ key: 'ball', from: ballHome, to: { x: out.x + 10, y: out.y }, start: 0, dur: 420 }];
        s.them.forEach((p, i) => { if (p.rec) tracks.push({ key: `them${i}`, from: themP(i), to: p.rec, start: 420, dur: 600 }); });
        runTimeline(tracks, [
          { at: 1100, run: () => { addFx('pulse', out, 1100, AMBER); addLabel({ x: 360, y: 96 }, "WINDOW CLOSED — they're set again", '#ffe1b3'); addGhost({ pos: s.ghost.p, txt: s.ghost.txt }); addFx('pulse', s.ghost.p, 1100, TEAL); showV(); } },
        ], 1100 + FX_PULSE_MS + 300);
      }
      return;
    }

    // clear
    const end: Pt = { x: 560, y: 60 };
    runTimeline(
      [{ key: 'ball', from: ballHome, to: end, ctrl: arcCtrl(ballHome, end, 140), start: 0, dur: 900 }],
      [{
        at: 900, run: () => {
          if (g.k === 'ok') { addFx('pulse', end, 900, AMBER); addLabel({ x: end.x, y: end.y - 20 }, 'THEIR THROW — danger gone', '#ffe1b3'); }
          else { addFx('bad', end, 900); addLabel({ x: end.x, y: end.y - 20 }, 'POSSESSION DONATED', '#ffb3ae'); addGhost({ pos: s.ghost.p, txt: s.ghost.txt }); addFx('pulse', s.ghost.p, 900, TEAL); }
          showV();
        },
      }],
      900 + FX_BAD_MS,
    );
  };

  // ── the pitch ──
  const els: ReactNode[] = [];
  els.push(<Rect key="lbox" x={6} y={110} width={96} height={200} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />);
  paths.forEach((p, i) => els.push(
    <Line key={`pth${i}`} x1={p.from.x} y1={p.from.y} x2={p.to.x} y2={p.to.y} stroke={CHALK} strokeWidth={2} opacity={0.5} strokeDasharray="4 5" />));
  const lblAbove = (y: number) => (y >= 40 && y < 75) || y > 385;
  s.them.forEach((p, i) => {
    const pos = over[`them${i}`] ?? themPosAt(s, i, sec);
    els.push(<Circle key={`tm${i}`} cx={pos.x} cy={pos.y} r={10} fill={p.gk ? GK_C : DEF} stroke={NAVY} strokeWidth={2} />);
    els.push(<OutlinedText key={`tml${i}`} x={pos.x} y={pos.y + (lblAbove(p.p.y) ? -16 : 21)} text={p.r} fill="#fff" />);
  });
  s.us.forEach((p, i) => {
    const pos = over[`us${i}`] ?? usPosAt(s, i, sec);
    const won = i === s.wIdx;
    els.push(<Circle key={`us${i}`} cx={pos.x} cy={pos.y} r={10} fill={p.r === 'GK' ? GK_C : ATT} stroke={won ? AMBER : NAVY} strokeWidth={won ? 3.5 : 2} />);
    els.push(<OutlinedText key={`usl${i}`} x={pos.x} y={pos.y + (lblAbove(p.p.y) ? -16 : 21)} text={p.r} fill="#fff" />);
  });
  if (s.freeMan != null) {
    const fp = s.us[s.freeMan].p;
    els.push(<OutlinedText key="fm" x={fp.x} y={fp.y - 22} text="free man" fill="#ffd23f" />);
  }
  ghosts.forEach((g, i) => {
    els.push(<Circle key={`gh${i}`} cx={g.pos.x} cy={g.pos.y} r={11} fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray="3 4" opacity={0.95} />);
    els.push(<OutlinedText key={`ght${i}`} x={g.pos.x} y={g.pos.y + 21} text={g.txt} fill="#bfe9da" />);
  });
  const ballPos = over.ball ?? { x: s.us[s.wIdx].p.x + 12, y: s.us[s.wIdx].p.y - 4 };
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

  // ── window bar + state line ──
  const tstate = !s.winSec
    ? 'No window — nothing to cash in'
    : win.gone ? "The window is GONE — they're set" : 'The window is open — and closing';
  const winInfo = !s.winSec
    ? 'their shape is already set'
    : win.gone ? "counter now and it's too late" : 'their runners are sprinting home';
  const windowBar = (
    <View style={styles.tline}>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${win.frac * 100}%`, backgroundColor: win.color }]} />
      </View>
      <View style={styles.tinfoRow}>
        <Text style={styles.tinfo} numberOfLines={1}>{tstate}</Text>
        <Text style={styles.winInfo} numberOfLines={1}>{winInfo}</Text>
      </View>
    </View>
  );

  // ── controls ──
  const promptText = phase === 'done'
    ? 'Transition is a **countdown** — the picture decides, not the philosophy.'
    : phase === 'resolving'
      ? (kind === 'lateCounter' ? 'First pass — **forward!** …into a set block.'
        : kind === 'counter' ? 'First pass — **forward!**'
          : kind === 'keep' ? 'Calm… secure it…' : 'Launched…')
      : win.gone
        ? 'Too slow — **the picture closed.** Whatever you do now, do it knowing that.'
        : '**Ball won.** The five-second clock starts now — what do you do with it?';
  const legend = (
    <View style={styles.legend}>
      {([['Your team (attacking right)', ATT], ['Them — caught in transition', DEF], ['Keepers', GK_C]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
    </View>
  );
  const judgeBtn = (o: CoKOption, main: string, sub: string, alt: boolean) => (
    <TouchableOpacity key={o} style={[styles.judgeBtn, alt && styles.judgeAlt, phase !== 'live' && styles.judgeOff]} activeOpacity={0.85} disabled={phase !== 'live'} onPress={() => choose(o)}>
      <Text style={styles.judgeTxt}>{main}</Text>
      <Text style={styles.judgeSub}>{sub}</Text>
    </TouchableOpacity>
  );
  const judge = phase !== 'done' && (
    <View style={landscape ? styles.judgeCol : styles.judgeRow}>
      {judgeBtn('counter', 'Counter — go NOW', 'attack before they set', false)}
      {judgeBtn('keep', 'Keep it', 'secure, build again', true)}
      {judgeBtn('clear', 'Clear it long', 'safety first', true)}
    </View>
  );
  const verdict = phase === 'done' && grade ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, grade.k === 'good' ? styles.vtagGood : grade.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {grade.k === 'good' ? 'Right call' : grade.k === 'ok' ? 'Defensible' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{grade.t}</Text>
      <Text style={styles.vbody}>{grade.b}</Text>
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
        belowFieldReserve={LS_BAR_RESERVE}
        pills={pills}
        field={pitch}
        belowField={windowBar}
        controls={
          phase === 'done'
            ? <>{verdict}{legend}</>
            : <><Prompt text={promptText} styles={styles} />{judge}{legend}</>
        }
        controlsFooter={phase === 'done' ? postRow : undefined}
      />
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {pitch}
      {windowBar}
      {legend}
      <Prompt text={promptText} styles={styles} />
      {judge}
      {verdict}
      {phase === 'done' && postRow}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Window bar.
  tline: { marginTop: 6 },
  bar: { height: 12, borderRadius: 6, backgroundColor: t.border, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  tinfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 5 },
  tinfo: { flex: 1, color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '600' },
  winInfo: { color: AMBER, fontSize: 10.5, fontWeight: '700' },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Prompt.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptB: { color: AMBER, fontWeight: '800' },
  // Judge buttons.
  judgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  judgeCol: { gap: 8, marginTop: 4 },
  judgeBtn: { flex: 1, minWidth: 150, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  judgeAlt: { backgroundColor: '#22345e' },
  judgeOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  // Verdict.
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readlbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  // Post rows + shared buttons.
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
});
