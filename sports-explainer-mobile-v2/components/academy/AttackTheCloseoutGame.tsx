import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, AccessibilityInfo } from 'react-native';
import { Circle, Line, Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton } from '../FieldEngine';
import {
  BasketballCourt, Basketball, OutlinedLabel, boldSegments, BASKETBALL_COURT_RATIO, RIM, HOOPS,
} from './fields/BasketballCourt';
import {
  BASE, FREEZE, ATT_IDS, DEF_IDS, LABELS, LANE_POINTS, TAB, CHIPS, FILM_PROMPT, PROMPT, CLOSE_PROMPT,
  HINT_IDLE, HINT_DONE, COURT_A11Y, CORRECT, OPTIONS, TAG_TEXT, GRADE, WHY,
  type Pt, type Depth, type CloseoutOpt, type CloseoutActorId,
} from '../../lib/attackTheCloseout';

// Attack the Closeout — NBA offensive read (backlog RND-41). The ball swings to YOU on the right
// wing while your defender sprints out of the paint from the middle; the film freezes at the catch
// and the fan picks one of four reads (exactly one correct). Same tap grammar and single-rAF
// timeline as Help or Stay / Pick Your Poison (generation guard: replay/reset/choose/unmount all
// invalidate the running loop).
//
// Animation invariant (authoring standard, hygiene rule 3): every player moves at ONE on-screen
// pace and the ball at ONE pass pace; a segment's duration is derived from its length, never the
// reverse, so moving a spot can never change visual speed.
const TEAL = HOOPS.teal, AMBER = HOOPS.amber, RED = HOOPS.red;
const PLAYER_PACE = 0.2;   // court units per ms
const BALL_PACE = 0.5;     // court units per ms
const PRE_ROLL = 650;      // same opening beat as the other NBA pieces
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hand = (p: Pt): Pt => [p[0] + 11, p[1] - 3];
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

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

// Builds tracks at constant pace. path() chains points from wherever that track currently ends and
// returns the time the last leg finishes.
function makeBuilder(start: Record<CloseoutActorId, Pt>, ballStart: Pt) {
  const tracks: Record<string, Track> = {};
  const ends: Record<string, { p: Pt; t: number }> = {};
  const cur = (key: string): Pt => ends[key]?.p ?? (key === 'ball' ? ballStart : start[key as CloseoutActorId]);
  // `carried`: the ball is in a dribbler's hand, so it moves at PLAYER pace with him.
  const path = (key: string, at: number, pts: Pt[], arc?: number, carried = false): number => {
    const tr = tracks[key] ?? (tracks[key] = { from: cur(key), segs: [] });
    let t = at, from = cur(key);
    for (const p of pts) {
      const dur = dist(from, p) / (key === 'ball' && !carried ? BALL_PACE : PLAYER_PACE);
      tr.segs.push({ at: t, dur, to: p, arc });
      t += dur; from = p;
    }
    ends[key] = { p: from, t };
    return t;
  };
  return { tracks, path };
}

type Phase = 'film' | 'idle' | 'run' | 'done';
interface Fx { pos: Pt; color: string; r: number; opacity: number }
interface Frame { pos: Record<CloseoutActorId, Pt>; ball: Pt; fx: Fx[] }
interface Decor { lane: boolean; ghost: boolean; note: [number, number, string, string] | null; reads: boolean }
const EMPTY_DECOR: Decor = { lane: false, ghost: false, note: null, reads: false };

// A dashed arrow (closeout sprint, rotation, dump-off pass). Drawn helpers, never the answer key.
function Arrow({ from, to, color, k }: { from: Pt; to: Pt; color: string; k: string }) {
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const h = 9;
  const p1: Pt = [to[0] - h * Math.cos(ang - 0.45), to[1] - h * Math.sin(ang - 0.45)];
  const p2: Pt = [to[0] - h * Math.cos(ang + 0.45), to[1] - h * Math.sin(ang + 0.45)];
  return (
    <>
      <Line key={`${k}l`} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={2.5} strokeDasharray="6 5" opacity={0.9} />
      <Polygon key={`${k}h`} points={`${to[0]},${to[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={color} opacity={0.9} />
    </>
  );
}

export default function AttackTheCloseoutGame() {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [phase, setPhase] = useState<Phase>('film');
  const [chosen, setChosen] = useState<CloseoutOpt | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [prompt, setPrompt] = useState<string>(FILM_PROMPT);
  const [hint, setHint] = useState<string>(HINT_IDLE);
  const [decor, setDecor] = useState<Decor>(EMPTY_DECOR);
  const [frame, setFrame] = useState<Frame>(() => ({ pos: { ...BASE }, ball: hand(BASE.g), fx: [] }));

  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const lockRef = useRef(true);              // taps ignored until the freeze; first tap wins
  const basePosRef = useRef<Record<CloseoutActorId, Pt>>({ ...BASE });
  const ballBaseRef = useRef<Pt>(hand(BASE.g));
  const burstsRef = useRef<{ pos: Pt; color: string; at: number }[]>([]);

  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';
  const right = chosen === CORRECT;

  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => { genRef.current++; stopLoop(); }, []);

  const run = (tl: TL) => {
    stopLoop();
    const gen = ++genRef.current;
    burstsRef.current = [];
    const evs = [...tl.events].sort((a, b) => a.at - b.at);
    let ei = 0;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;
      if (t0 == null) t0 = now;
      const e = now - t0;
      while (ei < evs.length && evs[ei].at <= e) { evs[ei].fn(); ei++; }
      if (gen !== genRef.current) return;
      const pos = { ...basePosRef.current };
      let ball = ballBaseRef.current;
      Object.keys(tl.tracks).forEach(k => {
        const p = trackPos(tl.tracks[k], e);
        if (k === 'ball') ball = p; else pos[k as CloseoutActorId] = p;
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

  // ── the film: hold, swing pass top → right wing; the closing defender sprints out of the paint
  // from the middle side, the top defender jumps toward the ball. Freeze at the catch. ──
  const runFilm = () => {
    basePosRef.current = { ...BASE };
    ballBaseRef.current = hand(BASE.g);
    const b = makeBuilder(BASE, hand(BASE.g));
    const catchAt = b.path('ball', PRE_ROLL, [hand(BASE.you)], 22);
    // The closeout leaves early enough to arrive at the freeze spot on the catch, at player pace.
    const xcDur = dist(BASE.xc, FREEZE.xc) / PLAYER_PACE;
    b.path('xc', catchAt - xcDur, [FREEZE.xc]);
    b.path('xg', PRE_ROLL + 120, [FREEZE.xg]);
    b.path('xn', PRE_ROLL + 120, [FREEZE.xn]);
    const events = [{
      at: catchAt + 60, fn: () => {
        basePosRef.current = { ...FREEZE };
        ballBaseRef.current = hand(FREEZE.you);
        lockRef.current = false;
        setPhase('idle');
        setPrompt(PROMPT);
      },
    }];
    run({ tracks: b.tracks, events, total: catchAt + 100 });
  };

  const reset = () => {
    genRef.current++;
    stopLoop();
    lockRef.current = true;
    setPhase('film'); setChosen(null); setDecor(EMPTY_DECOR);
    setPrompt(FILM_PROMPT); setHint(HINT_IDLE);
    setFrame({ pos: { ...BASE }, ball: hand(BASE.g), fx: [] });
    runFilm();
  };
  // First mount: state already starts at the film's opening frame, so only start the loop.
  useEffect(() => { runFilm(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── resolve the chosen read ──
  const choose = (opt: CloseoutOpt) => {
    if (lockRef.current || phase !== 'idle') return;
    lockRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run');
    const b = makeBuilder(FREEZE, hand(FREEZE.you));
    const events: { at: number; fn: () => void }[] = [];
    const say = (at: number, text: string) => events.push({ at, fn: () => setPrompt(text) });
    let finishAt = 0;
    let end: Partial<Record<CloseoutActorId, Pt>> = {};
    let endBall: Pt = hand(FREEZE.you);
    let burst: [Pt, string] = [RIM, TEAL];
    let note: Decor['note'] = null;

    if (opt === 'baseline') {
      say(0, 'One hard dribble <b>to the baseline</b>, past him…');
      const youPath: Pt[] = [[584, 288], [524, 366], [446, 394]];
      const drove = b.path('you', 0, youPath);
      b.path('ball', 0, youPath.map(hand), undefined, true);
      b.path('xc', 0, [[528, 222], [552, 262]]);            // overruns, turns too late
      b.path('x5', 260, [[408, 382]]);                       // their C rotates to meet the drive
      b.path('c', 300, [[300, 404]]);                        // our C slides behind him
      const passed = b.path('ball', drove, [[300, 398]]);    // the dump-off
      finishAt = b.path('ball', passed + 80, [[RIM[0], RIM[1] - 4]], 18);
      end = { you: [446, 394], xc: [552, 262], x5: [408, 382], c: [300, 404] };
      endBall = [RIM[0], RIM[1] - 4];
      burst = [RIM, TEAL];
      note = [470, 340, 'their C came, our C is open', '#bfe9da'];
      events.push({ at: drove, fn: () => setDecor(d => ({ ...d, reads: true })) });

    } else if (opt === 'shoot') {
      say(0, 'Catch and shoot… <b>he is right there</b>…');
      const shotAt = 120;
      b.path('xc', 0, [[530, 220]]);                         // arrives as the ball goes up
      const atRim = b.path('ball', shotAt, [[RIM[0], RIM[1] - 6]], 140);
      finishAt = b.path('ball', atRim, [[374, 368]], 20);    // off the rim
      end = { xc: [530, 220] };
      endBall = [374, 368];
      burst = [[530, 212], RED];
      note = [566, 176, 'contested three', '#ffb3ae'];

    } else if (opt === 'middle') {
      say(0, 'You drive to the middle… <b>he is already there</b>…');
      const youEnd: Pt = [520, 228];
      b.path('you', 0, [youEnd]);
      b.path('ball', 0, [hand(youEnd)], undefined, true);
      b.path('xc', 0, [[504, 236]]);                         // chest to chest in that lane
      finishAt = b.path('xn', 0, [[452, 250]]);              // the nail defender waiting behind him
      end = { you: youEnd, xc: [504, 236], xn: [452, 250] };
      endBall = hand(youEnd);
      burst = [[510, 232], RED];
      note = [470, 196, 'two defenders, no room', '#ffb3ae'];

    } else {
      say(0, 'You pass it back to the top… <b>the defense gets a breather</b>…');
      const tip: Pt = [394, 160];
      const reached = b.path('ball', 0, [tip]);
      b.path('xg', 0, [[392, 166]]);                         // he gets a hand to it
      events.push({ at: reached, fn: () => burstsRef.current.push({ pos: tip, color: AMBER, at: reached }) });
      b.path('ball', reached, [hand(FREEZE.g)]);
      // everyone resets: the closeout arrives under control, help goes home
      b.path('xc', 0, [[522, 224]]);
      b.path('xg', reached, [[344, 180]]);
      b.path('x5', 0, [[276, 396]]);
      finishAt = b.path('xn', 0, [[300, 248]]) + 100;
      end = { xc: [522, 224], xg: [344, 180], x5: [276, 396], xn: [300, 248] };
      endBall = hand(FREEZE.g);
      burst = [[522, 220], RED];
      note = [470, 120, 'everyone is back home', '#ffb3ae'];
    }

    Object.entries(end).forEach(([k, p]) => b.path(k, finishAt, [p as Pt]));
    const rightPick = opt === CORRECT;
    events.push({
      at: finishAt, fn: () => {
        burstsRef.current.push({ pos: burst[0], color: burst[1], at: finishAt });
        basePosRef.current = { ...FREEZE, ...end };
        ballBaseRef.current = endBall;
        setDecor(d => ({ ...d, note, ghost: !rightPick }));
        setPhase('done');
        setPrompt(CLOSE_PROMPT);
        setHint(HINT_DONE);
        AccessibilityInfo.announceForAccessibility(
          `${rightPick ? TAG_TEXT.right : TAG_TEXT.wrong}. ${GRADE[opt].t}. ${GRADE[opt].b}`,
        );
      },
    });
    let total = finishAt + 660;
    if (!rightPick) {
      // Tap-the-read addendum: flash the correct lane, then leave it on. Slow pulses (on/off every
      // 400ms), no faster than the other pieces' 600ms bursts.
      [0, 400, 800, 1200, 1600].forEach((dt, i) =>
        events.push({ at: finishAt + dt, fn: () => setDecor(d => ({ ...d, lane: i % 2 === 0 })) }));
      total = finishAt + 1700;
    }
    run({ tracks: b.tracks, events, total });
  };

  // ── SVG layer: zones → arrows → defense → offense → ball → fx → labels ──
  const showHelpers = depth !== 'expert';
  const dyn: ReactNode[] = [];
  const laneOn = decor.lane || (depth === 'rookie' && phase === 'idle');
  if (laneOn) dyn.push(<Polygon key="lane" points={LANE_POINTS} fill={TEAL} opacity={0.22} />);
  if (decor.ghost) dyn.push(<Circle key="ghost" cx={590} cy={300} r={16} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />);
  if (showHelpers && phase === 'idle') dyn.push(<Arrow key="sprint" k="sprint" from={BASE.xc} to={[508, 232]} color="#bcd3ff" />);
  if (answered && right && decor.reads && (depth === 'intermediate' || depth === 'expert')) {
    dyn.push(<Arrow key="rot" k="rot" from={FREEZE.x5} to={[396, 382]} color={AMBER} />);
    dyn.push(<Arrow key="dump" k="dump" from={[446, 404]} to={[312, 406]} color={TEAL} />);
  }
  DEF_IDS.forEach(id => {
    const p = frame.pos[id];
    dyn.push(<Circle key={`d${id}`} cx={p[0]} cy={p[1]} r={11} fill={HOOPS.def} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  ATT_IDS.forEach(id => {
    const p = frame.pos[id];
    dyn.push(<Circle key={`a${id}`} cx={p[0]} cy={p[1]} r={11} fill={id === 'you' ? HOOPS.you : HOOPS.orange} stroke={HOOPS.navy} strokeWidth={2} />);
  });
  dyn.push(<Basketball key="ball" x={frame.ball[0]} y={frame.ball[1]} />);
  frame.fx.forEach((f, i) => dyn.push(<Circle key={`fx${i}`} cx={f.pos[0]} cy={f.pos[1]} r={f.r} fill="none" stroke={f.color} strokeWidth={3} opacity={f.opacity} />));
  ([...DEF_IDS, ...ATT_IDS] as CloseoutActorId[]).forEach(id => {
    const text = id === 'you' || showHelpers ? LABELS[id] : undefined;
    if (!text) return;
    const p = frame.pos[id];
    const color = id === 'you' ? '#e6d8f2' : DEF_IDS.includes(id) ? '#bcd3ff' : '#fff';
    dyn.push(<OutlinedLabel key={`l${id}`} x={p[0]} y={p[1] - 16} text={text} color={color} size={10.5} outline={3.5} />);
  });
  if (decor.ghost) dyn.push(<OutlinedLabel key="ghl" x={600} y={340} text="the open side" color="#bfe9da" size={9.5} />);
  if (decor.note) dyn.push(<OutlinedLabel key="note" x={decor.note[0]} y={decor.note[1]} text={decor.note[2]} color={decor.note[3]} size={11} />);

  const field = (
    <View style={styles.stageWrap} accessible accessibilityRole="image" accessibilityLabel={COURT_A11Y}>
      <BasketballCourt fill="width">{dyn}</BasketballCourt>
      {phase === 'idle' && (
        <TouchableOpacity style={styles.replay} activeOpacity={0.8} hitSlop={10} onPress={reset} accessibilityLabel="Watch the play again">
          <Text style={styles.replayTxt}>↺ watch the play again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const rich = (text: string, boldColor: string, base: object, bold: object) => (
    <Text style={base}>
      {boldSegments(text).map((seg, i) => seg.bold
        ? <Text key={i} style={[bold, { color: boldColor }]}>{seg.text}</Text>
        : <Text key={i}>{seg.text}</Text>)}
    </Text>
  );
  const pills = <ScenarioPills wrap={landscape} items={[{ key: '0', name: TAB }]} currentKey="0" onSelect={reset} />;
  const chips = (
    <View style={styles.hud}>
      {CHIPS.map((c, i) => <View key={i} style={styles.chip}>{rich(c, HOOPS.orange, styles.chipTxt, styles.chipBold)}</View>)}
    </View>
  );
  const promptBlock = <View style={[styles.prompt, landscape && styles.promptLs]}>{rich(prompt, AMBER, landscape ? [styles.promptTxt, styles.promptTxtLs] : styles.promptTxt, styles.promptBold)}</View>;
  const judge = (
    <View style={[styles.judge, landscape && styles.judgeCol]}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.key} disabled={phase !== 'idle'} activeOpacity={0.85} onPress={() => choose(o.key)}
          accessibilityRole="button" accessibilityLabel={o.label}
          style={[styles.judgeBtn, phase !== 'idle' && styles.judgeBtnOff, landscape && styles.judgeBtnLs]}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{o.label}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={styles.legend}>
      {([['Your team', HOOPS.orange], ['Defense', HOOPS.def], ['YOU (with the ball)', HOOPS.you]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: 'rgba(20,184,166,.35)' }]} /><Text style={styles.legendTxt}>open lane</Text></View>
    </View>
  );
  const verdict = answered && chosen ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, right ? styles.vtagGood : styles.vtagBad]}>{right ? TAG_TEXT.right : TAG_TEXT.wrong}</Text>
      <Text style={styles.vtitle}>{GRADE[chosen].t}</Text>
      <Text style={styles.vbody}>{GRADE[chosen].b}</Text>
      <Text style={styles.readLbl}>{"COACH'S READ"}</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vread}>{WHY[depth]}</Text>
    </View>
  ) : null;
  const resetBtn = (
    <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={reset} accessibilityLabel="Replay">
      <Text style={styles.ghostTxt} numberOfLines={1}>↺ Replay</Text>
    </TouchableOpacity>
  );
  const lsFooter = (
    <View style={styles.lsPostRow}>
      {resetBtn}
      {answered
        ? <NextButton visible variant="filled" style={styles.lsNextFill} label="Try again →" onPress={reset} />
        : <Text style={[styles.hintTxt, styles.hintTxtLs, { flex: 1 }]} numberOfLines={2}>{hint}</Text>}
    </View>
  );

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
        {answered && <NextButton visible variant="filled" label="Try again →" onPress={reset} />}
        <Text style={[styles.hintTxt, styles.hintFlex]}>{hint}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  stageWrap: { position: 'relative' },
  replay: { position: 'absolute', top: 10, right: 10, borderWidth: 1.5, borderColor: 'rgba(244,244,238,.75)', backgroundColor: 'rgba(13,27,62,.6)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  replayTxt: { color: '#F4F4EE', fontSize: 11.5, fontWeight: '700' },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt: { color: t.textPrimary, fontSize: 12, fontWeight: '700' },
  chipBold: { fontWeight: '800' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { fontWeight: '800' },
  judge: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeCol: { flexDirection: 'column', flexWrap: 'nowrap' },
  judgeBtn: { flexGrow: 1, minWidth: 140, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', minHeight: 48 },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 7 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSwatch: { width: 14, height: 8, borderRadius: 2 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: '#e7f7f1', color: '#0c7a5e' },
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
