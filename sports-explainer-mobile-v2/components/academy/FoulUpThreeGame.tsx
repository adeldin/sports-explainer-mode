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
  SCEN, BSTATES, FTPOS, FT_RELEASE, FT1_MISS, FT2_MISS, baseCast,
  FIVE_CAP, CLOSE_PROMPT, HINT_IDLE, HINT_DONE, TAG_TEXT,
  type Pt, type Depth, type Grade, type FoulOpt, type FoulEnd,
  type BoardState, type BoardSpec, type CastEntry, type GhostSpec,
} from '../../lib/foulUpThree';

// Foul Up Three? — the endgame bar argument, played from ON THE BALL. The scene is a stadium
// broadcast frame: the LED board (GAME CLOCK / SCORE / THEIR TIMEOUTS / the situation cell) over the
// half-court. Foul resolves into the FT-formation choreography — everyone JOGS into the lane (the
// defense owning both low slots), the board flips FT-by-FT, and the intentional miss on the second
// gets boxed out — while scenario c's foul becomes a full parade of stoppages ending in OVERTIME.
// All motion + every board flip runs on ONE rAF timeline with a generation guard (reset/choose/
// unmount invalidate it). Content verbatim from lib/foulUpThree.ts. Court paint =
// fields/BasketballCourt's HalfCourtPaint, composed into this module's taller 680×534 viewBox.
const F_LED = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const TEAL = HOOPS.teal, AMBER = HOOPS.amber, RED = HOOPS.red;
const SCENE = { vbW: 680, vbH: 534, courtY: 74 };
const SCENE_RATIO = SCENE.vbW / SCENE.vbH;   // this module's own scene ratio (board band + court)

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hand = (p: Pt): Pt => [p[0] + 11, p[1] - 3];
const gradeColor = (k: Grade) => (k === 'good' ? TEAL : k === 'ok' ? AMBER : RED);
// the order the FT formation assembles in (each man 70ms behind the last) — spike-verbatim.
const FT_ORDER = Object.keys(FTPOS);
// the order the post-timeout sideline set assembles in.
const SIDELINE_ORDER = ['w3', 'h', 'b5', 'you', 'x3', 'x5', 'c2', 'x2', 'o4', 'x4'];

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
    { cap: 'SCORE', score: true },
    { cap: 'THEIR TIMEOUTS', val: b.to, color: b.toWarn ? '#ff6a6a' : '#e8edf5', screen: b.toWarn ? '#2a0e0e' : null },
    { cap: b.note.cap, val: b.note.val, color: b.note.warn ? '#ff6a6a' : '#e8edf5', screen: b.note.warn ? '#2a0e0e' : null },
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

type Phase = 'idle' | 'run' | 'done';
interface Fx { pos: Pt; color: string; r: number; opacity: number }
interface Frame { pos: Record<string, Pt>; ball: Pt; fx: Fx[] }
interface Note { x: number; y: number; text: string; color: string; size: number }
interface Decor { ghosts: GhostSpec[]; notes: Note[] }
const EMPTY_DECOR: Decor = { ghosts: [], notes: [] };
type BoardView = { kind: 'cells' } | { kind: 'msg'; state: BoardState; msg: string; sub: string };

const castPos = (cast: CastEntry[]): Record<string, Pt> => {
  const o: Record<string, Pt> = {};
  cast.forEach(c => { o[c[0]] = [c[2], c[3]]; });
  return o;
};

const JUDGE: { key: FoulOpt; label: string; sub: string; alt?: boolean }[] = [
  { key: 'foul', label: 'Foul', sub: 'on the floor, before the shot' },
  { key: 'defend', label: 'Defend', sub: 'contest the three, no whistle', alt: true },
];

const FT_STAGE_PROMPT = 'Free throws. Your defenders take the low lane slots. <b>Watch the second one…</b>';

export default function FoulUpThreeGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<FoulOpt | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [prompt, setPrompt] = useState<string>(SCEN[0].prompt);
  const [hint, setHint] = useState<string>(HINT_IDLE);
  const [decor, setDecor] = useState<Decor>(EMPTY_DECOR);
  const [board, setBoard] = useState<BoardView>({ kind: 'cells' });
  const [boardOp, setBoardOp] = useState(1);
  const [frame, setFrame] = useState<Frame>(() => {
    const c = castPos(baseCast(SCEN[0]));
    return { pos: c, ball: hand(c.h), fx: [] };
  });

  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const basePosRef = useRef<Record<string, Pt>>(castPos(baseCast(SCEN[0])));
  const ballBaseRef = useRef<Pt>(hand(castPos(baseCast(SCEN[0])).h));
  const burstsRef = useRef<{ pos: Pt; color: string; at: number }[]>([]);

  const s = SCEN[idx];
  const cast = useMemo(() => baseCast(s), [s]);
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

  // The scene opens PARKED at the decision (the clock IS the decision — no pre-roll film here).
  const resetTo = (i: number) => {
    genRef.current++;
    stopLoop();
    const c = castPos(baseCast(SCEN[i]));
    basePosRef.current = c;
    ballBaseRef.current = hand(c.h);
    burstsRef.current = [];
    setIdx(i); setPhase('idle'); setChosen(null); setDecor(EMPTY_DECOR);
    setBoard({ kind: 'cells' }); setBoardOp(1);
    setPrompt(SCEN[i].prompt); setHint(HINT_IDLE);
    setFrame({ pos: c, ball: hand(c.h), fx: [] });
  };
  useEffect(() => { resetTo(0); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const resetPlay = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── resolve: the chosen call's authored choreography → finish snaps the audited end state ──
  const choose = (opt: FoulOpt) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run');
    const e = s.end[opt];
    const start = basePosRef.current;
    const hp = s.hStart;
    const hb = hand(hp);
    const tracks: Record<string, Track> = {};
    const events: { at: number; fn: () => void }[] = [];
    const mv = (key: string, at: number, dur: number, to: Pt | undefined, arc?: number) => {
      const from = key === 'ball' ? hb : start[key];
      if (!from || !to) return;
      (tracks[key] ?? (tracks[key] = { from, segs: [] })).segs.push({ at, dur, to, arc });
    };
    const say = (at: number, text: string) => events.push({ at, fn: () => setPrompt(text) });
    const note = (at: number, n: Note) => events.push({ at, fn: () => setDecor(d => ({ ...d, notes: [...d.notes, n] })) });
    const bang = (at: number, pos: Pt, color: string) => events.push({ at, fn: () => { burstsRef.current.push({ pos, color, at }); } });
    // the LED flip: dim → swap the message → the two-beat settle (spike flipBoard).
    const flip = (at: number, state: BoardState, msg: string, sub: string) => {
      events.push({ at, fn: () => setBoardOp(0.35) });
      events.push({ at: at + 90, fn: () => { setBoard({ kind: 'msg', state, msg, sub }); setBoardOp(1); } });
      events.push({ at: at + 240, fn: () => setBoardOp(0.75) });
      events.push({ at: at + 360, fn: () => setBoardOp(1) });
    };
    // the whistle: YOU close and wrap — a burst plus the "this is a legal foul" tag.
    const wrap = (at: number) => {
      mv('you', at, 400, [hp[0] + 14, hp[1] + 10]);
      bang(at + 400, [hp[0] + 6, hp[1] + 4], AMBER);
      if (e.wrapLbl) note(at + 400, { x: e.wrapLbl[0], y: e.wrapLbl[1], text: e.wrapLbl[2], color: '#ffe1b3', size: 10 });
    };
    // everyone JOGS to the free-throw formation — defense owns the low slots, never spawned.
    const ftStage = (at: number): number => {
      say(at, FT_STAGE_PROMPT);
      FT_ORDER.forEach((k, i) => mv(k, at + i * 70, 900, FTPOS[k]));
      mv('ball', at + 120, 900, FT_RELEASE);
      return at + 1400;
    };
    // one free throw: arc up off the line; a make drops through, a miss caroms to `missTo`.
    const shootFT = (at: number, make: boolean, missTo: Pt): number => {
      mv('ball', at, 600, [RIM[0], RIM[1] - 6], 46);
      if (make) { mv('ball', at + 600, 0, [RIM[0], RIM[1] + 6]); return at + 600; }
      mv('ball', at + 600, 300, missTo, 22);
      return at + 900;
    };
    let finishAt = 0;

    if (e.play === 'foulice') {                     // the whistle, the two FTs, the intentional miss
      say(0, "<b>Wrap their PG — on the floor, before any shot motion.</b> Up 3, that's two free throws, max two points. The tying three never exists.");
      wrap(600);
      const ft = ftStage(1600);
      const cb1 = shootFT(ft, !!e.ft1Make, FT1_MISS);
      if (e.flips) flip(cb1, e.flips[0][0], e.flips[0][1], e.flips[0][2]);
      mv('ball', cb1 + 650, 450, FT_RELEASE);
      const ft2make = e.ball[1] > 396;              // d: FT2 drops; a/b: intentional miss
      const cb2 = shootFT(cb1 + 1300, ft2make, FT2_MISS);
      if (e.flips) flip(cb2, e.flips[1][0], e.flips[1][1], e.flips[1][2]);
      if (!ft2make) {
        say(cb2, 'Intentional miss — <b>your C is boxed out and waiting…</b>');
        mv('x5', cb2, 350, e.pos.x5);               // the waiting rebounder reaches over
        mv('b5', cb2 + 160, 400, e.pos.b5);         // their C's crash arrives late
      } else {
        say(cb2, 'It drops — down two, no timeouts, <b>0:05 and the ball is yours to inbound…</b>');
      }
      finishAt = cb2 + 1200;

    } else if (e.play === 'nightmare') {            // too much runway: every stoppage is a lifeline
      say(0, 'You foul at 0:10… <b>watch what each stoppage hands back.</b>');
      wrap(600);
      const ft = ftStage(1500);
      const a1 = shootFT(ft, true, FT1_MISS);
      mv('ball', a1 + 400, 400, FT_RELEASE);
      const a2 = shootFT(a1 + 950, true, FT1_MISS);
      flip(a2, 'them', 'FTs 2/2', 'YOU 84 – THEM 83 · 0:10');
      flip(5600, 'you', 'THEY FOUL YOU BACK', 'YOUR FTs 2/2 · YOU 86 – THEM 83');
      note(5600, { x: 340, y: 80, text: 'at the other end: they foul instantly — you make both', color: '#ffd9b8', size: 10 });
      flip(7600, 'them', 'TIMEOUT', 'BALL ADVANCED TO THE FRONTCOURT');
      say(7600, 'The timeout they saved: <b>ball advanced, sideline set, 0:07…</b>');
      // the sideline set ASSEMBLES — everyone jogs to the inbound picture
      SIDELINE_ORDER.forEach((k, i) => mv(k, 7600 + i * 70, 900, k === 'h' ? [470, 240] : e.pos[k]));
      mv('ball', 7845, 0, FT_RELEASE);
      mv('ball', 7850, 800, [666, 302]);
      say(9800, 'Inbound… <b>their PG, catch-and-shoot at 0:03…</b>');
      mv('ball', 9800, 450, [527, 205]);
      mv('h', 10250, 280, e.pos.h);
      mv('you', 10400, 420, e.pos.you);             // your contest — a beat late
      mv('ball', 10250, 900, [RIM[0], RIM[1] - 6], 120);
      mv('ball', 11150, 0, [RIM[0], RIM[1] + 6]);
      finishAt = 11150;

    } else if (e.play === 'contest') {              // no whistle: switch everything, stay down
      say(0, 'No whistle. <b>Switch everything, stay down, chase him off the line…</b>');
      if (e.kick) {
        mv('h', 600, 650, e.pos.h);
        mv('you', 600, 680, e.pos.you);
        mv('ball', 600, 650, hand(e.pos.h));
        say(1250, 'Swing to their SF in the corner — closeout flying — <b>pump-fake… double-clutch…</b>');
        const sf = e.shotFrom ?? e.pos.h;
        mv('ball', 1250, 520, [sf[0] + 8, sf[1] - 10]);
        mv('x3', 1770, 420, e.pos.x3);              // the closeout causes the clutch
        mv('ball', 2290, 950, [RIM[0], RIM[1] - 6], 120);
        mv('ball', 3240, 0, [RIM[0], RIM[1] + 6]);
        finishAt = 3240;
      } else {
        mv('h', 600, 720, e.pos.h);
        mv('you', 600, 760, e.pos.you);
        mv('ball', 600, 720, hand(e.pos.h));
        say(1320, 'Step-back with the clock draining — <b>hand in his eyes…</b>');
        mv('ball', 1880, 900, [RIM[0], RIM[1] - 6], 110);
        mv('ball', 2780, 330, e.ball, 26);
        mv('x5', 3110, 400, e.pos.x5);              // your rebound — horn
        say(3110, 'Off the rim — <b>your rebound, horn.</b>');
        finishAt = 3810;
      }

    } else {                                        // heave: back off, wall the arc, and pray with them
      say(0, 'You back off and wall the arc… <b>the heave is up…</b>');
      mv('h', 600, 450, e.pos.h);
      mv('ball', 600, 450, hand(e.pos.h));          // the ball travels WITH the dribble
      mv('you', 600, 470, e.pos.you);
      mv('ball', 1300, 1150, [RIM[0], RIM[1] - 6], 170);
      mv('ball', 2450, 0, [RIM[0], RIM[1] + 6]);
      finishAt = 2450;
    }

    // finish: snap the authored end state, reveal the teaching layers, verdict.
    Object.entries(e.pos).forEach(([k, p]) => mv(k, finishAt, 0, p));
    mv('ball', finishAt, 0, e.ball);
    events.push({ at: finishAt, fn: () => finish(e, finishAt) });
    run({ tracks, events, total: finishAt + 660 });
  };

  const finish = (e: FoulEnd, at: number) => {
    setDecor(d => ({
      ghosts: e.ghost ? [e.ghost] : d.ghosts,
      notes: e.note ? [...d.notes, { x: e.note[0], y: e.note[1], text: e.note[2], color: e.note[3], size: 10.5 }] : d.notes,
    }));
    setBoard({ kind: 'msg', state: e.bmsg[0], msg: e.bmsg[1], sub: e.bmsg[2] });
    setBoardOp(1);
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
  const at = (c: CastEntry): Pt => frame.pos[c[0]] ?? [c[2], c[3]];
  const fillFor = (side: CastEntry[1]) => (side === 'att' ? HOOPS.orange : side === 'you' ? HOOPS.you : HOOPS.def);
  const textFor = (side: CastEntry[1]) => (side === 'att' ? '#fff' : side === 'you' ? '#e6d8f2' : '#bcd3ff');
  cast.forEach(c => {
    if (c[1] === 'att') return;                     // the spike paints the def group (incl. YOU) first
    const p = at(c);
    dyn.push(<Circle key={`d${c[0]}`} cx={p[0]} cy={p[1]} r={11} fill={fillFor(c[1])} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  cast.forEach(c => {
    if (c[1] !== 'att') return;
    const p = at(c);
    dyn.push(<Circle key={`a${c[0]}`} cx={p[0]} cy={p[1]} r={11} fill={HOOPS.orange} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  dyn.push(<Basketball key="ball" x={frame.ball[0]} y={frame.ball[1]} />);
  frame.fx.forEach((f, i) => dyn.push(<Circle key={`fx${i}`} cx={f.pos[0]} cy={f.pos[1]} r={f.r} fill="none" stroke={f.color} strokeWidth={3} opacity={f.opacity} />));
  cast.forEach(c => {
    const p = at(c);
    dyn.push(<OutlinedLabel key={`l${c[0]}`} x={p[0]} y={p[1] - 16} text={c[4]} color={textFor(c[1])} size={10.5} outline={3.5} />);
  });
  // the shooter-quality tag rides above the ball-handler's LINEUP spot (it names the man, not the spot).
  dyn.push(<OutlinedLabel key="hqual" x={s.hStart[0]} y={s.hStart[1] - 30} text={s.hQual} color="#ffd9b3" size={9} />);
  decor.ghosts.forEach((g, i) => dyn.push(<OutlinedLabel key={`ghl${i}`} x={g[3] ?? g[0]} y={g[4] ?? g[1] + 32} text={g[2]} color="#bfe9da" size={9.5} />));
  decor.notes.forEach((n, i) => dyn.push(<OutlinedLabel key={`nt${i}`} x={n.x} y={n.y} text={n.text} color={n.color} size={n.size} />));

  const field = (
    <CourtCanvas viewW={SCENE.vbW} viewH={SCENE.vbH} fill="width">
      <G opacity={boardOp}>
        {board.kind === 'cells'
          ? <BoardCells b={s.board} />
          : <BoardTakeover state={board.state} msg={board.msg} sub={board.sub} />}
      </G>
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
  const fiveStrip = (
    <View>
      <Text style={styles.fiveCap}>{FIVE_CAP}</Text>
      <View style={styles.five}>
        {s.five.map(([posn, txt], i) => (
          <View key={i} style={styles.pcard}>
            <Text style={styles.pcardPos}>{posn}</Text>
            <Text style={styles.pcardTxt}>{txt}</Text>
          </View>
        ))}
      </View>
    </View>
  );
  const promptBlock = <View style={[styles.prompt, landscape && styles.promptLs]}>{rich(prompt, AMBER, landscape ? [styles.promptTxt, styles.promptTxtLs] : styles.promptTxt, styles.promptBold)}</View>;
  const judge = (
    <View style={[styles.judge, landscape && styles.judgeCol]}>
      {JUDGE.map(b => (
        <TouchableOpacity key={b.key} disabled={phase !== 'idle'} activeOpacity={0.85} onPress={() => choose(b.key)}
          style={[styles.judgeBtn, b.alt && styles.judgeBtnAlt, phase !== 'idle' && styles.judgeBtnOff, landscape && styles.judgeBtnLs]}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{b.label}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{b.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Their offense (they trail by 3)', HOOPS.orange], ['Your defense', HOOPS.def], ['YOU (on the ball)', HOOPS.you]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={styles.legendGhost} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>dashed teal = where the right call would have happened</Text></View>
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
        : <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]} numberOfLines={2}>{hint}</Text>}
    </View>
  );

  // ── LANDSCAPE: board+court left via the shell; scout + prompt + calls (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SCENE_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{verdict}</> : <>{fiveStrip}{promptBlock}{judge}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {fiveStrip}
      {field}
      {legend}
      {answered ? verdict : promptBlock}
      {!answered && judge}
      <View style={styles.controls}>
        {resetBtn}
        {answered && <NextButton visible variant="filled" label="Next lead →" onPress={nextScenario} />}
        <Text style={[styles.hintTxt, styles.hintFlex, landscape && styles.hintTxtLs]}>{hint}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  fiveCap: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: t.textSecondaryOnDark, marginBottom: 3 },
  five: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  pcard: { flexGrow: 1, minWidth: 112, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderLeftWidth: 3, borderLeftColor: t.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pcardPos: { fontSize: 11, fontWeight: '800', color: t.textPrimary },
  pcardTxt: { fontSize: 10.5, color: t.textSecondaryOnDark, lineHeight: 14 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { fontWeight: '800' },
  judge: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeCol: { flexDirection: 'column', flexWrap: 'nowrap' },
  judgeBtn: { flexGrow: 1, minWidth: 140, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', minHeight: 48 },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  judgeBtnAlt: { backgroundColor: '#0d1b3e', borderWidth: 1, borderColor: t.border },
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, justifyContent: 'center' },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
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
