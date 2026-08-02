import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import { CourtCanvas, HalfCourtPaint, Basketball, OutlinedLabel, boldSegments, RIM, HOOPS } from './fields/BasketballCourt';
import {
  SCEN, BSTATES, CORNER, fmtT, WATCH_PROMPT, CLOSE_PROMPT, HINT_IDLE, HINT_DONE, STRIP_CAP, STRIP_IDLE, TAG_TEXT,
  type Pt, type Depth, type Grade, type TwoOpt, type TwoScenario, type TwoEnd, type Band, type BoardState,
  type BoardSpec, type GhostSpec, type NoteSpec,
} from '../../lib/twoForOne';

// Two-for-One — the end-of-quarter clock call. The scene is a STADIUM broadcast frame: the LED board
// (GAME CLOCK / SHOT CLOCK / SCORE / PERIOD) on top, the POSSESSION MAP strip under it, the half-court
// below. The teaching beat is the map resolving band-by-band after your call (SHOT 1 → their
// possession → SHOT 2), with the board taking over full-width on each hand-off and again for the
// verdict. All motion + every board flip runs on ONE rAF timeline with a generation guard
// (reset/choose/unmount invalidate it). Content verbatim from lib/twoForOne.ts. Court paint =
// fields/BasketballCourt's HalfCourtPaint, composed into this module's taller 680×608 viewBox.
const F_LED = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const TEAL = HOOPS.teal, AMBER = HOOPS.amber, RED = HOOPS.red;
const SCENE = { vbW: 680, vbH: 608, courtY: 148 };
const SCENE_RATIO = SCENE.vbW / SCENE.vbH;   // this module's own scene ratio (board + strip + court)

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clampN = (lo: number, hi: number, v: number) => (v < lo ? lo : v > hi ? hi : v);
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

// ── the LED board (bx 20 / by 6 / 640×64, four 150-wide cells) ──
const BX = 20, BY = 6, BW = 640, BH = 64;
function BoardShell({ children }: { children: ReactNode }) {
  return (
    <G>
      <Rect x={BX + 60} y={BY + BH} width={6} height={22} fill="#3a3a3a" />
      <Rect x={BX + BW - 66} y={BY + BH} width={6} height={22} fill="#3a3a3a" />
      <Rect x={BX} y={BY} width={BW} height={BH} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />
      {children}
    </G>
  );
}
function Led({ x, y, txt, fs, fill, ls = 1 }: { x: number; y: number; txt: string; fs: number; fill: string; ls?: number }) {
  return <SvgText x={x} y={y} textAnchor="middle" fontFamily={F_LED} fontSize={fs} fontWeight="800" fill={fill} letterSpacing={ls}>{txt}</SvgText>;
}
function BoardCells({ b }: { b: BoardSpec }) {
  const cells: { cap: string; val?: string; color?: string; screen?: string | null; score?: boolean }[] = [
    { cap: 'GAME CLOCK', val: b.clock, color: '#ffd23f', screen: '#1c1808' },
    { cap: 'SHOT CLOCK', val: b.shot, color: b.shotWarn ? '#ff6a6a' : '#e8edf5', screen: b.shotWarn ? '#2a0e0e' : null },
    { cap: 'SCORE', score: true },
    { cap: 'PERIOD', val: b.period, color: '#e8edf5' },
  ];
  return (
    <BoardShell>
      {cells.map((c, i) => {
        const cx0 = BX + 8 + i * 157, cw = 150, cx = cx0 + cw / 2;
        const fs = c.val ? (c.val.length > 12 ? 10 : c.val.length > 8 ? 13 : 17) : 17;
        return (
          <G key={i}>
            <Rect x={cx0} y={BY + 7} width={cw} height={BH - 14} rx={4} fill={c.screen || '#0c1016'} />
            <Led x={cx} y={BY + 18} txt={c.cap} fs={8} fill="#5a6b7a" />
            {c.score ? (
              <G>
                <Led x={cx - 34} y={BY + 41} txt={String(b.you)} fs={16} fill="#e8edf5" />
                <Led x={cx} y={BY + 40} txt="–" fs={13} fill="#5a6b7a" />
                <Led x={cx + 34} y={BY + 41} txt={String(b.them)} fs={16} fill="#e8edf5" />
                <Led x={cx - 34} y={BY + 53} txt="YOU" fs={7} fill="#5a6b7a" />
                <Led x={cx + 34} y={BY + 53} txt="THEM" fs={7} fill="#5a6b7a" />
              </G>
            ) : (
              <Led x={cx} y={BY + 45} txt={c.val ?? ''} fs={fs} fill={c.color ?? '#e8edf5'} ls={fs < 12 ? 0.5 : 1.5} />
            )}
          </G>
        );
      })}
    </BoardShell>
  );
}
function BoardTakeover({ state, msg, sub }: { state: BoardState; msg: string; sub: string }) {
  const sc = BSTATES[state];
  const fs = msg.length > 16 ? 24 : msg.length > 12 ? 30 : 38;
  return (
    <BoardShell>
      <Rect x={BX + 8} y={BY + 7} width={BW - 16} height={BH - 14} rx={4} fill={sc[0]} />
      <Led x={BX + BW / 2} y={BY + (sub ? 38 : 44)} txt={msg} fs={fs} fill={sc[1]} ls={2} />
      {!!sub && <SvgText x={BX + BW / 2} y={BY + 54} textAnchor="middle" fontFamily={F_LED} fontSize={9} fontWeight="700" fill="#e8edf5" letterSpacing={1.5}>{sub}</SvgText>}
    </BoardShell>
  );
}

// ── THE POSSESSION MAP: who has the ball, from the freeze to the horn ──
function PossessionStrip({ bands, T0 }: { bands: Band[] | null; T0: number }) {
  const els: ReactNode[] = [];
  if (!bands) {
    els.push(<SvgText key="cap" x={40} y={110} fontSize={7.5} fontWeight="800" fill="#5a6b7a" letterSpacing={1.2}>{STRIP_CAP}</SvgText>);
    els.push(<SvgText key="idle" x={340} y={128} textAnchor="middle" fontSize={10} fontWeight="700" fill="#5a6b7a">{STRIP_IDLE}</SvgText>);
  } else {
    const X = (t: number) => 32 + ((T0 - t) / T0) * 616;
    bands.forEach((b, i) => {
      const x1 = X(b[0]), x2 = X(b[1]);
      els.push(<Rect key={`b${i}`} x={x1} y={112} width={Math.max(2, x2 - x1)} height={16} rx={3} fill={b[2] === 'you' ? HOOPS.orange : HOOPS.def} opacity={0.92} />);
      els.push(
        <SvgText key={`bl${i}`} x={clampN(70, 610, (x1 + x2) / 2)} y={138} textAnchor="middle" fontSize={8.5} fontWeight="800"
          fill={b[2] === 'you' ? '#ffd9b8' : '#bcd3ff'}>{b[3]}</SvgText>,
      );
    });
    const ticks = [bands[0][0]].concat(bands.map(b => b[1]));
    let last = -99;
    ticks.forEach((t, i) => {
      const x = clampN(46, 634, X(t));
      if (x - last < 36) return;
      last = x;
      els.push(<SvgText key={`t${i}`} x={x} y={109} textAnchor="middle" fontSize={8} fontWeight="700" fill="#8fa0b3" fontFamily={F_LED}>{fmtT(t)}</SvgText>);
    });
  }
  return (
    <G>
      <Rect x={26} y={94} width={628} height={48} rx={6} fill="#14181f" stroke="#2b3340" strokeWidth={1.5} />
      {els}
    </G>
  );
}

type Phase = 'idle' | 'run' | 'done';
interface Fx { pos: Pt; color: string; r: number; opacity: number }
interface Frame { pos: Record<string, Pt>; ball: Pt; fx: Fx[] }
interface Decor { ghosts: GhostSpec[]; notes: NoteSpec[] }
const EMPTY_DECOR: Decor = { ghosts: [], notes: [] };
type BoardView = { kind: 'cells' } | { kind: 'msg'; state: BoardState; msg: string; sub: string };

const castPos = (sc: TwoScenario): Record<string, Pt> => {
  const o: Record<string, Pt> = {};
  sc.cast.forEach(c => { o[c[0]] = [c[2], c[3]]; });
  return o;
};

const JUDGE: { key: TwoOpt; label: string; sub: string; alt?: boolean }[] = [
  { key: 'shoot', label: 'Shoot now', sub: 'bank shot 1, buy shot 2' },
  { key: 'run', label: 'Run the set', sub: 'hunt quality first' },
  { key: 'hold', label: 'Hold for last shot', sub: 'one-shot quarter', alt: true },
];

export default function TwoForOneGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<TwoOpt | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [prompt, setPrompt] = useState<string>(SCEN[0].prompt);
  const [hint, setHint] = useState<string>(HINT_IDLE);
  const [decor, setDecor] = useState<Decor>(EMPTY_DECOR);
  const [board, setBoard] = useState<BoardView>({ kind: 'cells' });
  const [boardOp, setBoardOp] = useState(1);
  const [bands, setBands] = useState<Band[] | null>(null);
  const [frame, setFrame] = useState<Frame>(() => ({ pos: castPos(SCEN[0]), ball: hand(castPos(SCEN[0]).h), fx: [] }));

  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const basePosRef = useRef<Record<string, Pt>>(castPos(SCEN[0]));
  const ballBaseRef = useRef<Pt>(hand(castPos(SCEN[0]).h));
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
        if (k === 'ball') ball = p; else pos[k] = p;
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

  // The scene opens PARKED at the freeze (the clock IS the decision — there is no pre-roll film here).
  const resetTo = (i: number) => {
    genRef.current++;
    stopLoop();
    const cast = castPos(SCEN[i]);
    basePosRef.current = cast;
    ballBaseRef.current = hand(cast.h);
    burstsRef.current = [];
    setIdx(i); setPhase('idle'); setChosen(null); setDecor(EMPTY_DECOR);
    setBoard({ kind: 'cells' }); setBoardOp(1); setBands(null);
    setPrompt(SCEN[i].prompt); setHint(HINT_IDLE);
    setFrame({ pos: cast, ball: hand(cast.h), fx: [] });
  };
  useEffect(() => { resetTo(0); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── resolve: the chosen call's authored choreography, then the possession map resolves band-by-band ──
  const choose = (opt: TwoOpt) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run');
    const e = s.end[opt];
    const start = basePosRef.current;
    const hb = hand(start.h);
    const tracks: Record<string, Track> = {};
    const events: { at: number; fn: () => void }[] = [];
    const mv = (key: string, at: number, dur: number, to: Pt | undefined, arc?: number) => {
      const from = key === 'ball' ? hb : start[key];
      if (!from || !to) return;                           // an actor this scenario's cast doesn't field
      (tracks[key] ?? (tracks[key] = { from, segs: [] })).segs.push({ at, dur, to, arc });
    };
    const say = (at: number, text: string) => events.push({ at, fn: () => setPrompt(text) });
    // the LED flip: dim → swap the message → the two-beat settle (spike flipBoard).
    const flip = (at: number, state: BoardState, msg: string, sub: string) => {
      events.push({ at, fn: () => setBoardOp(0.35) });
      events.push({ at: at + 90, fn: () => { setBoard({ kind: 'msg', state, msg, sub }); setBoardOp(1); } });
      events.push({ at: at + 240, fn: () => setBoardOp(0.75) });
      events.push({ at: at + 360, fn: () => setBoardOp(1) });
    };
    // the possession-counter resolve: strip bands land one at a time, board flips with them.
    const playBands = (at0: number): number => {
      e.bands.forEach((b, i) => {
        const t = at0 + 600 + i * 900;
        events.push({ at: t, fn: () => setBands(e.bands.slice(0, i + 1)) });
        if (i > 0) {
          if (b[2] === 'them') flip(t, 'them', 'THEIR BALL', b[3].toUpperCase());
          else flip(t, 'you', 'SHOT 2', "BALL'S BACK — " + fmtT(b[0]) + ' LEFT');
        }
      });
      const endAt = at0 + 600 + e.bands.length * 900 + 300;
      flip(endAt, e.bmsg[0], e.bmsg[1], e.bmsg[2]);
      return endAt;
    };

    say(0, WATCH_PROMPT);
    const B = 600;
    let playEnd = 0;

    if (e.play === 'corner3') {                     // the look was already there — swing and fire
      say(B, "Swing it — <b>the corner's open, let it fly…</b>");
      mv('ball', B, 570, [CORNER[0] + 8, CORNER[1] - 10]);
      mv('x2', B + 710, 680, e.pos.x2);             // closeout — after the release
      mv('ball', B + 570, 950, [RIM[0], RIM[1] - 4], 130);
      mv('ball', B + 1520, 0, [RIM[0], RIM[1] + 6]);
      playEnd = B + 1520;

    } else if (e.play === 'setlook') {              // drive, bend the floor, kick to the corner
      say(B, 'Work it — <b>drive, bend them, then the kick…</b>');
      mv('h', B, 680, e.pos.h);
      mv('ball', B, 680, hand(e.pos.h));
      const t1 = B + 680;
      if (e.pos.x2) mv('x2', t1, 510, e.pos.x2);    // helper dragged in — cause, then effect
      if (e.pos.x4) mv('x4', t1, 510, e.pos.x4);    // weak-side PF sinks a step too
      if (e.pos.o4) mv('o4', t1, 510, e.pos.o4);
      if (e.pos.x1) mv('x1', t1 + 110, 570, e.pos.x1);
      mv('ball', t1 + 610, 510, [CORNER[0] + 8, CORNER[1] - 10]);
      mv('ball', t1 + 1120, 950, [RIM[0], RIM[1] - 4], 130);
      mv('ball', t1 + 2070, 0, [RIM[0], RIM[1] + 6]);
      playEnd = t1 + 2070;

    } else if (e.play === 'holdforce') {            // your own shot clock votes: a forced heave
      say(B, 'You wave it off and dribble… <b>but your own shot clock is running…</b>');
      mv('h', B, 650, [390, 105]); mv('h', B + 650, 800, [290, 105]); mv('h', B + 1450, 540, e.pos.h);
      mv('ball', B, 650, [401, 102]); mv('ball', B + 650, 800, [301, 102]); mv('ball', B + 1450, 540, hand(e.pos.h));
      const tf = B + 2250;
      if (e.pos.x1) mv('x1', tf, 400, e.pos.x1);
      say(tf, '<b>Shot clock!</b> — forced heave…');
      mv('ball', tf, 850, [RIM[0], RIM[1] - 6], 110);
      mv('ball', tf + 850, 330, e.ball, 26);
      playEnd = tf + 1180;

    } else if (e.play === 'pullup2') {              // the early contested pull-up
      say(B, 'You force it — <b>contested pull-up, early…</b>');
      mv('h', B, 510, e.pos.h);
      mv('ball', B, 510, hand(e.pos.h));
      const t2 = B + 510;
      mv('x1', t2, 350, e.pos.x1);
      mv('ball', t2, 700, [RIM[0], RIM[1] - 6], 80);
      mv('ball', t2 + 700, 330, e.ball, 26);
      playEnd = t2 + 1030;

    } else if (e.play === 'holdwin') {              // shot clock off: mirror the dribble, shoot at 0:02
      say(B, 'You hold. <b>No shot clock — nothing they can do but wait…</b>');
      mv('h', B, 800, [390, 105]); mv('h', B + 800, 950, [290, 105]);
      mv('ball', B, 800, [401, 102]); mv('ball', B + 800, 950, [301, 102]);
      const td = B + 1750;
      say(td, '0:05… the drive — <b>floater at 0:02…</b>');
      mv('h', td, 570, e.pos.h);
      mv('x1', td, 570, e.pos.x1);
      mv('x5', td + 270, 400, e.pos.x5);
      mv('ball', td, 570, hand(e.pos.h));
      const ts = B + 2550;
      mv('ball', ts, 650, [RIM[0], RIM[1] - 6], 60);
      mv('ball', ts + 650, 0, [RIM[0], RIM[1] + 6]);
      playEnd = ts + 650;

    } else if (e.play === 'quick3') {               // the rushed trigger that donates the last word
      say(B, 'Quick trigger at 0:18…');
      mv('h', B, 430, e.pos.h);
      mv('ball', B, 430, hand(e.pos.h));
      const t3 = B + 430;
      mv('x1', t3, 330, e.pos.x1);
      mv('ball', t3, 850, [RIM[0], RIM[1] - 6], 110);
      mv('ball', t3 + 850, 330, e.ball, 26);
      const tr = t3 + 1180;
      mv('x5', tr, 430, e.pos.x5);                  // their rebound — they hold now
      say(tr, 'They rebound — <b>and now THEY get to hold.</b>');
      playEnd = tr;

    } else if (e.play === 'breaklay') {             // 3-on-1: the last man commits, pocket pass, layup
      say(B, 'Push it — <b>their last man has to pick someone…</b>');
      mv('h', B, 650, e.pos.h);
      mv('ball', B, 650, hand(e.pos.h));
      mv('xb', B, 570, e.pos.xb);                   // he commits to the ball
      const tw = B + 200;
      mv('r2', tw, 570, [280, 320]);
      mv('r3', tw, 570, e.pos.r3);
      (['t1', 't2', 'o4', 'o5', 'd2', 'd3'] as const).forEach(k => mv(k, tw, 950, e.pos[k]));
      const tp = B + 950;
      say(tp, 'Pocket pass — <b>your SG lays it in.</b>');
      mv('ball', tp, 330, [288, 312]);
      const tl2 = tp + 330;
      mv('r2', tl2, 410, e.pos.r2);
      mv('ball', tl2, 410, [RIM[0], RIM[1] - 4], 30);
      mv('ball', tl2 + 410, 0, [RIM[0], RIM[1] + 6]);
      playEnd = tl2 + 410;

    } else {                                        // pullout: nobody spawns — the defense RUNS back
      say(B, 'You pull it back out — <b>and their defense sprints home…</b>');
      const first: Pt = opt === 'hold' ? [380, 80] : e.pos.h;
      mv('h', B, 650, first);
      mv('ball', B, 650, hand(first));
      mv('xb', B, 680, e.pos.xb);
      const tw2 = B + 270;
      (['t1', 't2', 'd2', 'd3', 'r2', 'r3', 'o4', 'o5'] as const).forEach(k => mv(k, tw2, 950, e.pos[k]));
      const tsh = B + 1350;
      say(tsh, opt === 'hold' ? 'Held to 0:03 — <b>heave over a set wall…</b>' : "The 'set' at 0:12 — <b>contested…</b>");
      const sf = e.shotFrom ?? e.pos.h;
      if (opt === 'hold') mv('h', tsh, 510, e.pos.h);
      mv('ball', tsh, 510, hand(sf));
      const ta = tsh + 610;
      mv('ball', ta, 850, [RIM[0], RIM[1] - 6], 110);
      mv('ball', ta + 850, 330, e.ball, 26);
      playEnd = ta + 1180;
    }

    const finishAt = playBands(playEnd);
    // finish: snap the authored end state, reveal the teaching layers, verdict.
    Object.entries(e.pos).forEach(([k, p]) => mv(k, finishAt, 0, p));
    mv('ball', finishAt, 0, e.ball);
    events.push({ at: finishAt, fn: () => finish(e, finishAt) });
    run({ tracks, events, total: finishAt + 660 });
  };

  const finish = (e: TwoEnd, at: number) => {
    setDecor(d => ({
      ghosts: e.ghost ? [e.ghost] : d.ghosts,
      notes: e.note ? [...d.notes, e.note] : d.notes,
    }));
    setBands(e.bands);
    setBoard({ kind: 'msg', state: e.bmsg[0], msg: e.bmsg[1], sub: e.bmsg[2] });
    burstsRef.current.push({
      pos: e.ball[1] > 396 ? RIM : e.ball,
      color: gradeColor(e.k),
      at,
    });
    basePosRef.current = { ...basePosRef.current, ...e.pos };
    ballBaseRef.current = e.ball;
    setPhase('done');
    setPrompt(CLOSE_PROMPT);
    setHint(HINT_DONE);
  };

  // ── the dynamic half-court layer (spike group order: zones → def → att → ball → fx → labels) ──
  const dyn: ReactNode[] = [];
  decor.ghosts.forEach((g, i) => dyn.push(<Circle key={`gh${i}`} cx={g[0]} cy={g[1]} r={16} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />));
  const at = (id: string, fallback: Pt): Pt => frame.pos[id] ?? fallback;
  s.cast.forEach(c => {
    if (c[1] !== 'def') return;
    const p = at(c[0], [c[2], c[3]]);
    dyn.push(<Circle key={`d${c[0]}`} cx={p[0]} cy={p[1]} r={11} fill={HOOPS.def} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  s.cast.forEach(c => {
    if (c[1] !== 'att') return;
    const p = at(c[0], [c[2], c[3]]);
    dyn.push(<Circle key={`a${c[0]}`} cx={p[0]} cy={p[1]} r={11} fill={HOOPS.orange} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  dyn.push(<Basketball key="ball" x={frame.ball[0]} y={frame.ball[1]} />);
  frame.fx.forEach((f, i) => dyn.push(<Circle key={`fx${i}`} cx={f.pos[0]} cy={f.pos[1]} r={f.r} fill="none" stroke={f.color} strokeWidth={3} opacity={f.opacity} />));
  s.cast.forEach(c => {
    const p = at(c[0], [c[2], c[3]]);
    dyn.push(<OutlinedLabel key={`l${c[0]}`} x={p[0]} y={p[1] - 16} text={c[4]} color={c[1] === 'att' ? '#fff' : '#bcd3ff'} size={10.5} outline={3.5} />);
  });
  if (phase === 'idle' && s.fact) dyn.push(<OutlinedLabel key="fact" x={s.fact[0]} y={s.fact[1]} text={s.fact[2]} color={s.fact[3]} size={9.5} />);
  decor.ghosts.forEach((g, i) => dyn.push(<OutlinedLabel key={`ghl${i}`} x={g[3] ?? g[0]} y={g[4] ?? g[1] + 32} text={g[2]} color="#bfe9da" size={9.5} />));
  decor.notes.forEach((n, i) => dyn.push(<OutlinedLabel key={`nt${i}`} x={n[0]} y={n[1]} text={n[2]} color={n[3]} size={10.5} />));

  const field = (
    <CourtCanvas viewW={SCENE.vbW} viewH={SCENE.vbH} fill="width">
      <G opacity={boardOp}>
        {board.kind === 'cells'
          ? <BoardCells b={s.board} />
          : <BoardTakeover state={board.state} msg={board.msg} sub={board.sub} />}
      </G>
      <PossessionStrip bands={bands} T0={s.T0} />
      <G transform={`translate(0,${SCENE.courtY})`}>
        <HalfCourtPaint />
        {dyn}
      </G>
    </CourtCanvas>
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
  const promptBlock = <View style={[styles.prompt, landscape && styles.promptLs]}>{rich(prompt, AMBER, landscape ? [styles.promptTxt, styles.promptTxtLs] : styles.promptTxt, styles.promptBold)}</View>;
  const judge = (
    <View style={[styles.judge, landscape && styles.judgeCol]}>
      {JUDGE.map(b => (
        <TouchableOpacity key={b.key} disabled={phase !== 'idle'} activeOpacity={0.85} onPress={() => choose(b.key)}
          style={[styles.judgeBtn, phase !== 'idle' && styles.judgeBtnOff, landscape && styles.judgeBtnLs]}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{b.label}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{b.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Your offense', HOOPS.orange], ['Their defense', HOOPS.def]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: HOOPS.orange }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>your possession (map)</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: HOOPS.def }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>their possession (map)</Text></View>
      <View style={styles.legendItem}><View style={styles.legendGhost} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>the shot you passed up</Text></View>
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
        : <Text style={[styles.hintTxt, landscape && styles.hintTxtLs, { flex: 1 }]} numberOfLines={2}>{hint}</Text>}
    </View>
  );

  // ── LANDSCAPE: board+strip+court left via the shell; prompt + calls (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SCENE_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{verdict}</> : <>{promptBlock}{judge}</>}
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
      {answered ? verdict : promptBlock}
      {!answered && judge}
      <View style={styles.controls}>
        {resetBtn}
        {answered && <NextButton visible variant="filled" label="Next clock →" onPress={nextScenario} />}
        <Text style={[styles.hintTxt, styles.hintFlex, landscape && styles.hintTxtLs]}>{hint}</Text>
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
  promptBold: { fontWeight: '800' },
  judge: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeCol: { flexDirection: 'column', flexWrap: 'nowrap' },
  judgeBtn: { flexGrow: 1, minWidth: 140, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', minHeight: 48 },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, justifyContent: 'center' },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSwatch: { width: 14, height: 8, borderRadius: 2 },
  legendGhost: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#14B8A6' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
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
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  hintFlex: { flex: 1, textAlign: 'right' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
