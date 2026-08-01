import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import {
  BasketballCourt, Basketball, OutlinedLabel, boldSegments, BASKETBALL_COURT_RATIO, RIM, HOOPS,
} from './fields/BasketballCourt';
import {
  SCEN, BASE, FREEZE, DRIVE_MID, OVER_TOP, TRAP_SPOT, LANE_TARGETS, STATIC_LABELS,
  FILM_PROMPT, CLOSE_PROMPT, HINT_IDLE, HINT_DONE, TAG_TEXT,
  type Pt, type Depth, type Grade, type PoisonOpt, type PoisonActorId, type PoisonScenario, type PoisonEnd,
  type GhostSpec, type NoteSpec,
} from '../../lib/pickYourPoison';

// Pick Your Poison — the pick-and-roll coverage call, played from the BIG behind the screen. Develop
// film plays first (their C walks up and plants the screen ON your PG's path), freezes at the call,
// then drop/switch/blitz resolves with the spike's authored choreography: the handler drives around
// the SAME shoulder (grazing the screen point), your PG fights over the top, the roller rolls AFTER
// the handler passes. All motion runs on ONE rAF timeline with a generation guard (replay/reset/
// choose/unmount all invalidate the running loop). Content verbatim from lib/pickYourPoison.ts.
// Court = fields/BasketballCourt (half-court, 680×460).
const TEAL = HOOPS.teal, AMBER = HOOPS.amber, RED = HOOPS.red;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hand = (p: Pt): Pt => [p[0] + 11, p[1] - 3];
const gradeColor = (k: Grade) => (k === 'good' ? TEAL : k === 'ok' ? AMBER : RED);

// ── the single-rafRef timeline: tracks (sorted position segs per actor/ball) + one-shot events ──
interface Seg { at: number; dur: number; to: Pt; arc?: number }
interface Track { from: Pt; segs: Seg[] }
interface TL { tracks: Record<string, Track>; events: { at: number; fn: () => void }[]; total: number }
const lerpPt = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const arcAt = (a: Pt, b: Pt, peak: number, k: number): Pt => {
  const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - peak, mk = 1 - k;
  return [mk * mk * a[0] + 2 * mk * k * mx + k * k * b[0], mk * mk * a[1] + 2 * mk * k * my + k * k * b[1]];
};
function trackPos(tr: Track, e: number): Pt {
  let cur = tr.from;
  for (const s of tr.segs) {
    if (e >= s.at + s.dur) { cur = s.to; continue; }
    if (e >= s.at) {
      const k = s.dur > 0 ? clamp01((e - s.at) / s.dur) : 1;
      return s.arc != null ? arcAt(cur, s.to, s.arc, k) : lerpPt(cur, s.to, k);
    }
    break;
  }
  return cur;
}

type Phase = 'film' | 'idle' | 'run' | 'done';
interface Fx { pos: Pt; color: string; r: number; opacity: number }
interface Frame { pos: Record<PoisonActorId, Pt>; ball: Pt; fx: Fx[] }
interface Decor { lanes: Pt | null; cone: Pt | null; ghosts: GhostSpec[]; notes: NoteSpec[] }
const EMPTY_DECOR: Decor = { lanes: null, cone: null, ghosts: [], notes: [] };

const ATT_IDS: PoisonActorId[] = ['h', 'scr', 'c', 'w', 'pf'];
const DEF_IDS: PoisonActorId[] = ['x1', 'x2', 'x3', 'dpf', 'you'];

const JUDGE: { key: PoisonOpt; label: string; sub: string; alt?: boolean }[] = [
  { key: 'drop', label: 'Drop', sub: 'sink, wall the paint' },
  { key: 'switch', label: 'Switch', sub: 'trade assignments' },
  { key: 'blitz', label: 'Blitz', sub: 'two on the ball', alt: true },
];

export default function PickYourPoisonGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('film');
  const [chosen, setChosen] = useState<PoisonOpt | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [prompt, setPrompt] = useState<string>(FILM_PROMPT);
  const [hint, setHint] = useState<string>(HINT_IDLE);
  const [decor, setDecor] = useState<Decor>(EMPTY_DECOR);
  const [frame, setFrame] = useState<Frame>(() => ({ pos: { ...BASE }, ball: hand(BASE.h), fx: [] }));

  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const basePosRef = useRef<Record<PoisonActorId, Pt>>({ ...BASE });
  const ballBaseRef = useRef<Pt>(hand(BASE.h));
  const burstsRef = useRef<{ pos: Pt; color: string; at: number }[]>([]);

  const s = SCEN[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';

  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);

  // One rAF owner. Events fire once, in order; positions derive from the tracks each frame.
  const run = (tl: TL) => {
    stopLoop();
    const gen = ++genRef.current;
    burstsRef.current = [];
    Object.values(tl.tracks).forEach(tr => tr.segs.sort((a, b) => a.at - b.at));   // trackPos walks segs in time order
    const evs = [...tl.events].sort((a, b) => a.at - b.at);
    let ei = 0;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const e = now - t0;
      while (ei < evs.length && evs[ei].at <= e) { evs[ei].fn(); ei++; }
      const pos = { ...basePosRef.current };
      let ball = ballBaseRef.current;
      Object.keys(tl.tracks).forEach(k => {
        const p = trackPos(tl.tracks[k], e);
        if (k === 'ball') ball = p; else pos[k as PoisonActorId] = p;
      });
      const fx: Fx[] = [];
      burstsRef.current.forEach(b => {
        const k = clamp01((e - b.at) / 600);
        if (k < 1) fx.push({ pos: b.pos, color: b.color, r: 8 + 18 * k, opacity: 0.9 * (1 - k) });
      });
      setFrame({ pos, ball, fx });
      if (e < tl.total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the develop film (spike-verbatim keyframes): the pre-roll is 650ms and ~50% slower than the
  // resolve — their C jogs up and plants the screen ON your PG's shoulder, so the coverage call is
  // made BEFORE the ball ever moves. Then freeze. ──
  const runFilm = (sc: PoisonScenario) => {
    basePosRef.current = { ...BASE };
    ballBaseRef.current = hand(BASE.h);
    const tracks: Record<string, Track> = {
      scr: { from: BASE.scr, segs: [{ at: 650, dur: 1050, to: FREEZE.scr }] },
      h: { from: BASE.h, segs: [{ at: 1750, dur: 450, to: FREEZE.h }] },
      ball: { from: hand(BASE.h), segs: [{ at: 1750, dur: 450, to: hand(FREEZE.h) }] },
      x1: { from: BASE.x1, segs: [{ at: 1750, dur: 450, to: FREEZE.x1 }] },
      you: { from: BASE.you, segs: [{ at: 1750, dur: 550, to: FREEZE.you }] },
      pf: { from: BASE.pf, segs: [{ at: 1750, dur: 550, to: FREEZE.pf }] },
      dpf: { from: BASE.dpf, segs: [{ at: 1750, dur: 550, to: FREEZE.dpf }] },
    };
    const events = [{
      at: 2500, fn: () => {
        basePosRef.current = { ...FREEZE };
        ballBaseRef.current = hand(FREEZE.h);
        setPhase('idle');
        setPrompt(sc.prompt);
      },
    }];
    run({ tracks, events, total: 2550 });
  };

  const resetTo = (i: number) => {
    genRef.current++;
    stopLoop();
    setIdx(i); setPhase('film'); setChosen(null); setDecor(EMPTY_DECOR);
    setPrompt(FILM_PROMPT); setHint(HINT_IDLE);
    setFrame({ pos: { ...BASE }, ball: hand(BASE.h), fx: [] });
    runFilm(SCEN[i]);
  };
  useEffect(() => { resetTo(0); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const resetPlay = () => resetTo(idx);   // Reset AND the replay button: full generation-guarded rebuild
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── resolve: the chosen coverage's authored choreography → finish snaps the audited end state ──
  const choose = (opt: PoisonOpt) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run');
    const e = s.end[opt];
    const hb = hand(FREEZE.h);
    const tracks: Record<string, Track> = {};
    const events: { at: number; fn: () => void }[] = [];
    const mv = (key: string, at: number, dur: number, to: Pt, arc?: number) => {
      const from = key === 'ball' ? hb : FREEZE[key as PoisonActorId];
      (tracks[key] ?? (tracks[key] = { from, segs: [] })).segs.push({ at, dur, to, arc });
    };
    const say = (at: number, text: string) => events.push({ at, fn: () => setPrompt(text) });
    // the shot (spike `shoot`): arc to the rim — a three hangs higher and longer; a make drops
    // through, a miss rims out to the authored end ball. Returns the moment it resolves.
    const shoot = (at: number): number => {
      const dur = e.three ? 700 : 520;
      mv('ball', at, dur, [RIM[0], RIM[1] - 6], e.three ? 130 : 70);
      if (e.make) { mv('ball', at + dur, 0, [RIM[0], RIM[1] + 6]); return at + dur; }
      mv('ball', at + dur, 240, e.ball, 26);
      return at + dur + 240;
    };
    let finishAt = 0;

    if (e.play === 'pullup') {                      // drop: their PG drives around his C's screen — same shoulder
      say(0, 'You sink into the paint — their PG comes off the screen, <b>shoulder to shoulder…</b>');
      mv('you', 0, 600, e.pos.you!);
      mv('h', 500, 450, DRIVE_MID);                 // graze 15–25px off the screen spot
      mv('h', 950, 650, e.pos.h!);
      mv('ball', 500, 450, hand(DRIVE_MID));
      mv('ball', 950, 650, hand(e.pos.h!));
      mv('x1', 600, 240, OVER_TOP[0]);              // your PG runs into the screen
      mv('x1', 1100, 140, OVER_TOP[1]);             // …climbs around the C's shoulder
      mv('x1', 1250, 150, OVER_TOP[2]);             // …fights over the top
      mv('x1', 1400, 550, e.pos.x1!);               // …trails into the contest
      mv('scr', 1250, 700, e.pos.scr!);             // their C rolls, after the PG passes
      finishAt = shoot(2000);

    } else if (e.play === 'iso') {                  // switch: assignments trade, then the hunt
      say(0, '<b>Switch!</b> — you jump their PG, your PG peels to their C…');
      mv('you', 0, 480, [382, 148]);
      mv('x1', 180, 720, e.pos.x1!);
      mv('scr', 280, 720, e.pos.scr!);
      say(700, 'He sizes you up… step-back coming…');
      mv('h', 700, 650, e.pos.h!);
      mv('ball', 700, 650, hand(e.pos.h!));
      mv('you', 700, 760, e.pos.you!);              // you mirror, staying square
      finishAt = shoot(1650);

    } else if (e.play === 'drive') {                // switch vs a driver: he attacks your feet
      say(0, '<b>Switch!</b> — and their PG sees a big on an island…');
      mv('you', 0, 480, [382, 148]);
      mv('x1', 180, 720, e.pos.x1!);
      mv('scr', 280, 720, e.pos.scr!);
      mv('h', 730, 720, e.pos.h!);
      mv('ball', 730, 720, hand(e.pos.h!));
      mv('you', 730, 780, e.pos.you!);              // beaten, trailing
      finishAt = shoot(1700);

    } else if (e.play === 'seal') {                 // switch vs elite roller: seal + entry
      say(0, '<b>Switch!</b> — and their C seals your PG under the rim…');
      mv('you', 0, 480, [382, 148]);
      mv('scr', 220, 780, e.pos.scr!);
      mv('x1', 220, 780, e.pos.x1!);
      mv('h', 780, 420, e.pos.h!);
      mv('you', 780, 450, e.pos.you!);
      say(1300, 'Entry pass over the top…');
      mv('ball', 1300, 700, [e.pos.scr![0] + 4, e.pos.scr![1] - 20], 90);
      mv('ball', 2000, 340, [RIM[0], RIM[1] - 4], 26);
      finishAt = 2340;

    } else if (e.play === 'trap-sail') {            // blitz works: the escape pass sails away
      say(0, '<b>Blitz!</b> — two on the ball, his airspace is gone…');
      mv('you', 0, 430, e.pos.you!);
      mv('x1', 120, 370, e.pos.x1!);
      mv('h', 360, 370, e.pos.h!);                  // picks up, retreating
      mv('scr', 430, 680, e.pos.scr!);              // their C pops, calling for it
      say(1300, 'The only out is the pocket pass — <b>from their worst passer…</b>');
      mv('ball', 1300, 900, e.ball, 60);
      finishAt = 2200;

    } else if (e.play === 'trap-kick') {            // blitz beaten by the short roll: 4-on-3
      say(0, '<b>Blitz!</b> — but the pocket pass slips out…');
      mv('you', 0, 430, e.pos.you!);
      mv('x1', 120, 370, e.pos.x1!);
      mv('h', 360, 370, e.pos.h!);
      mv('scr', 960, 540, e.pos.scr!);
      const pocket: Pt = [e.pos.scr![0] + 8, e.pos.scr![1] - 10];
      mv('ball', 950, 600, pocket, 50);
      say(1550, 'Short roll — <b>4-on-3.</b> Your low man has to pick…');
      events.push({ at: 1550, fn: () => setDecor(d => ({ ...d, lanes: e.pos.scr! })) });
      mv('x2', 1550, 600, e.pos.x2!);               // low man dragged in
      mv('ball', 2250, 600, [BASE.c[0] + 8, BASE.c[1] - 10]);
      if (e.cone) events.push({ at: 2850, fn: () => setDecor(d => ({ ...d, cone: e.cone! })) });
      finishAt = shoot(2850);

    } else {                                        // trap-split: blitz split — downhill 4-on-3 layup
      say(0, '<b>Blitz!</b> — their PG sees it coming…');
      mv('you', 0, 430, TRAP_SPOT.you);
      mv('x1', 120, 370, TRAP_SPOT.x1);
      say(720, '<b>Split!</b> — right between the trap, downhill…');
      mv('h', 720, 290, TRAP_SPOT.split1);
      mv('h', 1010, 430, TRAP_SPOT.split2);
      mv('h', 1440, 540, e.pos.h!);
      mv('ball', 720, 290, [403, 139]);
      mv('ball', 1010, 430, [351, 237]);
      mv('ball', 1440, 540, hand(e.pos.h!));
      mv('you', 1100, 680, e.pos.you!);             // spin and chase
      mv('x1', 1100, 680, e.pos.x1!);
      mv('scr', 1160, 600, e.pos.scr!);
      mv('x2', 1300, 600, e.pos.x2!);
      mv('ball', 2500, 400, [RIM[0], RIM[1] - 4], 30);
      finishAt = 2900;
    }

    // finish: snap the authored end state, reveal the teaching layers, verdict.
    Object.entries(e.pos).forEach(([k, p]) => mv(k, finishAt, 0, p as Pt));
    mv('ball', finishAt, 0, e.ball);
    events.push({ at: finishAt, fn: () => finish(e, finishAt) });
    run({ tracks, events, total: finishAt + 660 });
  };

  const finish = (e: PoisonEnd, at: number) => {
    setDecor(d => ({
      lanes: e.lanes && e.pos.scr ? e.pos.scr : d.lanes,
      cone: e.cone ?? d.cone,
      ghosts: e.ghost ? [e.ghost] : d.ghosts,
      notes: e.note ? [...d.notes, e.note] : d.notes,
    }));
    burstsRef.current.push({
      pos: e.burst ? e.burst[0] : (e.make ? RIM : e.ball),
      color: e.burst ? e.burst[1] : gradeColor(e.k),
      at,
    });
    basePosRef.current = { ...FREEZE, ...e.pos };
    ballBaseRef.current = e.ball;
    setPhase('done');
    setPrompt(CLOSE_PROMPT);
    setHint(HINT_DONE);
  };

  // ── the dynamic SVG layer (spike group order: zones → def → att → ball → fx → labels) ──
  const dyn: ReactNode[] = [];
  if (decor.lanes) {
    LANE_TARGETS.forEach((p, i) => dyn.push(
      <Line key={`ln${i}`} x1={decor.lanes![0]} y1={decor.lanes![1]} x2={p[0]} y2={p[1]}
        stroke={HOOPS.chalk} strokeWidth={2} strokeDasharray="5 6" opacity={0.5} />,
    ));
  }
  if (decor.cone) dyn.push(<Polygon key="cone" points={`${decor.cone[0]},${decor.cone[1]} 326,376 352,410`} fill={TEAL} opacity={0.16} />);
  decor.ghosts.forEach((g, i) => dyn.push(<Circle key={`gh${i}`} cx={g[0]} cy={g[1]} r={16} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />));
  const labelFor = (id: PoisonActorId): string => (s.lab as Record<string, string | undefined>)[id] ?? STATIC_LABELS[id] ?? '';
  DEF_IDS.forEach(id => {
    const p = frame.pos[id];
    dyn.push(<Circle key={`d${id}`} cx={p[0]} cy={p[1]} r={11} fill={id === 'you' ? HOOPS.you : HOOPS.def} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  ATT_IDS.forEach(id => {
    const p = frame.pos[id];
    dyn.push(<Circle key={`a${id}`} cx={p[0]} cy={p[1]} r={11} fill={HOOPS.orange} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  dyn.push(<Basketball key="ball" x={frame.ball[0]} y={frame.ball[1]} />);
  frame.fx.forEach((f, i) => dyn.push(<Circle key={`fx${i}`} cx={f.pos[0]} cy={f.pos[1]} r={f.r} fill="none" stroke={f.color} strokeWidth={3} opacity={f.opacity} />));
  ([...DEF_IDS, ...ATT_IDS] as PoisonActorId[]).forEach(id => {
    const p = frame.pos[id];
    const color = id === 'you' ? '#e6d8f2' : DEF_IDS.includes(id) ? '#bcd3ff' : '#fff';
    dyn.push(<OutlinedLabel key={`l${id}`} x={p[0]} y={p[1] - 16} text={labelFor(id)} color={color} size={10.5} outline={3.5} />);
  });
  decor.ghosts.forEach((g, i) => dyn.push(<OutlinedLabel key={`ghl${i}`} x={g[3] ?? g[0]} y={g[4] ?? g[1] + 32} text={g[2]} color="#bfe9da" size={9.5} />));
  decor.notes.forEach((n, i) => dyn.push(<OutlinedLabel key={`nt${i}`} x={n[0]} y={n[1]} text={n[2]} color={n[3]} size={11} />));

  const field = (
    <View style={styles.stageWrap}>
      <BasketballCourt fill="width">{dyn}</BasketballCourt>
      {phase === 'idle' && (
        <TouchableOpacity style={styles.replay} activeOpacity={0.8} hitSlop={10} onPress={resetPlay}>
          <Text style={styles.replayTxt}>↺ watch the play again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── control fragments ──
  const rich = (text: string, boldColor: string, base: object, bold: object) => (
    <Text style={base}>
      {boldSegments(text).map((seg, i) => seg.bold
        ? <Text key={i} style={[bold, { color: boldColor }]}>{seg.text}</Text>
        : <Text key={i}>{seg.text}</Text>)}
    </Text>
  );
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const chips = (
    <View style={styles.hud}>
      {s.chips.map((c, i) => <View key={i} style={styles.chip}>{rich(c, HOOPS.orange, styles.chipTxt, styles.chipBold)}</View>)}
    </View>
  );
  const promptBlock = <View style={styles.prompt}>{rich(prompt, AMBER, styles.promptTxt, styles.promptBold)}</View>;
  const judge = (
    <View style={[styles.judge, landscape && styles.judgeCol]}>
      {JUDGE.map(b => (
        <TouchableOpacity key={b.key} disabled={phase !== 'idle'} activeOpacity={0.85} onPress={() => choose(b.key)}
          style={[styles.judgeBtn, b.alt && styles.judgeBtnAlt, phase !== 'idle' && styles.judgeBtnOff, landscape && styles.judgeBtnLs]}>
          <Text style={styles.judgeTxt}>{b.label}</Text>
          <Text style={styles.judgeSub}>{b.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={styles.legend}>
      {([['Their offense', HOOPS.orange], ['Your defense', HOOPS.def], ['YOU (the big)', HOOPS.you]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: 'rgba(20,184,166,.35)' }]} /><Text style={styles.legendTxt}>open shot window</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: 'rgba(244,244,238,.5)' }]} /><Text style={styles.legendTxt}>dashed lanes = the 4-on-3 the pass opens</Text></View>
      <View style={styles.legendItem}><View style={styles.legendGhost} /><Text style={styles.legendTxt}>where the right coverage was</Text></View>
    </View>
  );
  const verdict = answered && chosen ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, s.end[chosen].k === 'good' ? styles.vtagGood : s.end[chosen].k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {TAG_TEXT[s.end[chosen].k]}
      </Text>
      <Text style={styles.vtitle}>{s.grade[chosen].t}</Text>
      <Text style={styles.vbody}>{s.grade[chosen].b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vread}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtn = (
    <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} hitSlop={8} onPress={resetPlay}>
      <Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text>
    </TouchableOpacity>
  );
  const lsFooter = (
    <View style={styles.lsPostRow}>
      {resetBtn}
      {answered
        ? <NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} />
        : <Text style={styles.hintTxt} numberOfLines={2}>{hint}</Text>}
    </View>
  );

  // ── LANDSCAPE: court-left via the shell; chips + prompt + calls (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={BASKETBALL_COURT_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{verdict}</> : <>{chips}{promptBlock}{judge}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {chips}
      {field}
      {legend}
      {answered ? verdict : promptBlock}
      {!answered && judge}
      <View style={styles.controls}>
        {resetBtn}
        {answered && <NextButton visible variant="filled" label="Next coverage →" onPress={nextScenario} />}
        <Text style={[styles.hintTxt, styles.hintFlex]}>{hint}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  stageWrap: { position: 'relative' },
  replay: { position: 'absolute', top: 10, right: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(244,244,238,.75)', backgroundColor: 'rgba(13,27,62,.6)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  replayTxt: { color: '#F4F4EE', fontSize: 11.5, fontWeight: '700' },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt: { color: t.textPrimary, fontSize: 12, fontWeight: '700' },
  chipBold: { fontWeight: '800' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptBold: { fontWeight: '800' },
  judge: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeCol: { flexDirection: 'column' },
  judgeBtn: { flexGrow: 1, minWidth: 140, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', minHeight: 48 },
  judgeBtnLs: { minWidth: 0 },
  judgeBtnAlt: { backgroundColor: '#0d1b3e', borderWidth: 1, borderColor: t.border },
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSwatch: { width: 14, height: 8, borderRadius: 2 },
  legendGhost: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderStyle: 'dashed', borderColor: '#14B8A6' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: '#e7f7f1', color: '#0c7a5e' },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: '#fdecec', color: '#b3261e' },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  readLbl: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: t.textSecondaryOnDark, marginTop: 2 },
  vread: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600' },
  hintFlex: { flex: 1, textAlign: 'right' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
