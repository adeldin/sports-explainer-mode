import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { ScenarioPills, DifficultyTabs, NextButton, LandscapeGameShell, FE } from '../FieldEngine';
import { CricketOvalScene, CricketBall, ActorDot, BurstRing, CK } from './fields/CricketOval';
import {
  RS_SCENARIOS, RS_FOOT, RS_SUB, drsVerdict, deliverySegs, ballAtScrub, tokenSub, LANE,
  type P2, type ReviewCall, type RSScenario, type EdgeLane, type LbwLane, type DrsVerdict, type GradeKey,
} from '../../lib/reviewOrSave';

// Review or Save? — the DRS module. Watch the appeal live (ball riding in the bowler's
// hand through the run-up), see the umpire answer, then decide: burn a review or bank
// it. The verdict is COMPUTED from the lane geometry (lib drsVerdict) and revealed as
// the three-beat tracking inset; the delivery replay scrubber (core mechanic: drag to
// re-watch WHERE IT PITCHED before you commit) unlocks at the freeze. This module has
// an LED board band, so it draws its OWN 680×534 scene (board + translated oval) with
// its own ratio — per the landscape port standard's board-module allowance.
const F_BOLD = 'SpaceGrotesk_700Bold';
const F_LED = 'Courier New';
const SCENE = { vbW: 680, vbH: 534, ovalY: 74 };
const SCENE_RATIO = SCENE.vbW / SCENE.vbH;      // this module's own scene ratio (board band + oval)
const LS_SCRUB_RESERVE = 64;                     // reserved height under the field for the scrubber row

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp2 = (a: P2, b: P2, k: number): P2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// <b>…</b> markers in the verbatim copy → bold amber spans (the prototype's .prompt b).
function Rich({ s, style, boldStyle }: { s: string; style: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle> }) {
  const parts = s.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}</Text>;
}

// ── the animated film frame (single rAF owner drives it) ──
interface Frame {
  keeper: P2; slip1: P2; slip2: P2; gully: P2; point: P2; bowler: P2;
  ball: P2 | null;
  fx: { p: P2; prog: number } | null;
  pitchMark: P2 | null;
  padLabel: boolean; takenLabel: boolean; howzat: boolean; allEleven: boolean; umpire: boolean;
}
const initialFrame = (): Frame => ({
  keeper: [340, 330], slip1: [318, 336], slip2: [301, 331], gully: [272, 318], point: [216, 282],
  bowler: [346, 96], ball: [346, 104], fx: null, pitchMark: null,
  padLabel: false, takenLabel: false, howzat: false, allEleven: false, umpire: false,
});

interface Act { dur: number; begin?: () => void; update?: (e: number) => void; }

type Phase = 'film' | 'idle' | 'run' | 'done';

export default function ReviewOrSaveGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('film');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<ReviewCall | null>(null);
  const [prompt, setPrompt] = useState('The bowler turns at the top of his mark…');
  const [hint, setHint] = useState('Geometry decides, not the volume of the appeal.');
  const [boardMsg, setBoardMsg] = useState<{ state: GradeKey; msg: string; sub: string } | null>(null);
  const [frame, setFrame] = useState<Frame>(initialFrame);
  const [scrubT, setScrubT] = useState(100);
  const [track, setTrack] = useState<{ ghost: boolean; beats: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const s = RS_SCENARIOS[idx];
  const segs = useMemo(() => deliverySegs(s), [s]);
  const verdict = useMemo(() => drsVerdict(s), [s]);
  const depth = level === 'kid' ? 'rookie' : level;

  // ── single rAF owner: sequential acts; parallel motion lives inside an act's update ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);
  const playActs = (acts: Act[], done?: () => void) => {
    stopLoop();
    let i = -1; let actStart = 0;
    const step = (now: number) => {
      if (i < 0) { i = 0; actStart = now; acts[0]?.begin?.(); }
      while (i < acts.length && now - actStart >= acts[i].dur) {
        acts[i].update?.(acts[i].dur);
        actStart += acts[i].dur; i++;
        if (i < acts.length) acts[i].begin?.();
      }
      if (i >= acts.length) { rafRef.current = null; done?.(); return; }
      acts[i].update?.(now - actStart);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // ── the FILM: run-up → delivery → strike → APPEAL → umpire → freeze ──
  const film = (sc: RSScenario, scIdx: number) => {
    const sg = deliverySegs(sc);
    const rel = sg[0].from;
    const f = initialFrame();
    const push = () => setFrame({ ...f });
    const big = scIdx === 1;
    const appealBegin = () => {
      f.howzat = true; f.allEleven = big;
      setPrompt('<b>HOWZAT?!</b> — the fielders are shouting <b>“how is that?”</b> at the umpire: cricket\'s formal appeal. He only answers if asked.');
    };
    const appealUpdate = (e: number) => {
      f.bowler = lerp2([346, 150], [356, 176], clamp01(e / 360));
      f.keeper = lerp2([340, 326], [346, 322], clamp01(e / 360));
      f.slip1 = lerp2([318, 332], [322, 328], clamp01(e / 360));
      if (big) {
        f.slip2 = lerp2([301, 327], [310, 322], clamp01(e / 400));
        f.gully = lerp2([272, 318], [286, 310], clamp01(e / 420));
        f.point = lerp2([216, 282], [238, 272], clamp01(e / 440));
      }
      f.fx = { p: [354, 296], prog: clamp01(e / 600) };
      push();
    };
    const acts: Act[] = [
      { // run-up: keeper + slips sink into the crouch as the bowler winds up; ball rides in his hand
        dur: 820,
        update: (e) => {
          const k = clamp01(e / 820);
          f.bowler = lerp2([346, 96], [346, 150], k);
          f.ball = lerp2([346, 104], rel, k);
          const kk = clamp01((e - 120) / 420);
          f.keeper = lerp2([340, 330], [340, 326], kk);
          f.slip1 = lerp2([318, 336], [318, 332], kk);
          f.slip2 = lerp2([301, 331], [301, 327], kk);
          push();
        },
      },
    ];
    if (sc.type === 'edge') {
      acts.push(
        { dur: 420, begin: () => setPrompt('He lets it go…'), update: (e) => { f.ball = lerp2(sg[0].from, sg[0].to, clamp01(e / 420)); push(); } },
        { dur: 240, update: (e) => { f.ball = lerp2(sg[1].from, sg[1].to, clamp01(e / 240)); push(); } },
        {
          dur: 300,
          begin: () => { f.fx = { p: sg[1].to, prog: 0 }; },
          update: (e) => { f.ball = lerp2(sg[2].from, sg[2].to, clamp01(e / 300)); if (f.fx) f.fx.prog = clamp01(e / 600); push(); },
        },
        { dur: 700, begin: () => { f.takenLabel = true; appealBegin(); }, update: appealUpdate },
      );
    } else {
      acts.push(
        { dur: 520, begin: () => setPrompt('He lets it go…'), update: (e) => { f.ball = lerp2(sg[0].from, sg[0].to, clamp01(e / 520)); push(); } },
        { dur: 320, begin: () => { f.pitchMark = sg[0].to; }, update: (e) => { f.ball = lerp2(sg[1].from, sg[1].to, clamp01(e / 320)); push(); } },
        { dur: 250, begin: () => { f.padLabel = true; f.fx = { p: sg[1].to, prog: 0 }; }, update: (e) => { if (f.fx) f.fx.prog = clamp01(e / 600); push(); } },
        { dur: 700, begin: appealBegin, update: appealUpdate },
      );
    }
    acts.push({ dur: 600, begin: () => { f.umpire = true; push(); } });
    playActs(acts, () => {
      setPhase('idle');
      setPrompt(sc.freeze);
      setHint('15 seconds on the DRS clock. Your call.');
      setScrubT(100);
    });
  };

  const resetTo = (i: number) => {
    stopLoop();
    setIdx(i); setPhase('film'); setChosen(null); setBoardMsg(null); setTrack(null); setScrubT(100);
    setFrame(initialFrame());
    setPrompt('The bowler turns at the top of his mark…');
    setHint('Geometry decides, not the volume of the appeal.');
    film(RS_SCENARIOS[i], i);
  };
  // first mount: roll the film for scenario 0
  useEffect(() => { if (!startedRef.current) { startedRef.current = true; film(RS_SCENARIOS[0], 0); } });  // eslint-disable-line react-hooks/exhaustive-deps
  const nextScenario = () => resetTo((idx + 1) % RS_SCENARIOS.length);

  // ── the TRACKING: computed, three-beat reveal, then the board flips ──
  const beatPrompts = [
    'Beat one: <b>where did it pitch?</b> The checks run in order — fail one and the appeal is dead.',
    'Beat two: <b>where did it strike him?</b> The checks run in order — fail one and the appeal is dead.',
    'Beat three: <b>was it hitting?</b> The checks run in order — fail one and the appeal is dead.',
  ];
  const choose = (opt: ReviewCall) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    setPhase('run'); setChosen(opt);
    const ghost = opt === 'save';
    const g = s.grade[opt];
    setPrompt(opt === 'review'
      ? "The 'T' sign goes up — <b>upstairs we go.</b> The big screen takes over…"
      : 'You pat the air — <b>review saved.</b> Here\'s what the tracking would have said…');
    const acts: Act[] = [{ dur: opt === 'review' ? 600 : 700 }];
    if (s.type === 'edge') {
      acts.push({ dur: ghost ? 350 : 800, begin: () => setTrack({ ghost, beats: 1 }) });
      acts.push({
        dur: 700,
        begin: () => {
          setTrack({ ghost, beats: 2 });
          if (!ghost) setPrompt('The mic and the frame line up… <b>spike.</b> He hit it.');
        },
      });
    } else {
      const nBeats = verdict.pitching === 'OUTSIDE LEG' ? 1 : (verdict.wickets ? 3 : 2);
      for (let bi = 0; bi < nBeats; bi++) {
        acts.push({
          dur: ghost ? 450 : 850,
          begin: () => { setTrack({ ghost, beats: bi + 1 }); if (!ghost) setPrompt(beatPrompts[Math.min(bi, 2)]); },
        });
      }
    }
    acts.push({ dur: 500, begin: () => setBoardMsg({ state: g.k, msg: g.bmsg, sub: tokenSub(s, opt, verdict) }) });
    playActs(acts, () => {
      setPhase('done');
      setPrompt('A review is a <b>bet</b> — and the odds were printed on the pitch before you asked.');
      setHint('Reset, or take another appeal.');
    });
  };

  // ── scene: LED board + oval + fielders + ball + fx + tracking inset ──
  const els: ReactNode[] = [];
  // board band
  els.push(<Rect key="bl1" x={80} y={70} width={6} height={22} fill="#3a3a3a" />);
  els.push(<Rect key="bl2" x={594} y={70} width={6} height={22} fill="#3a3a3a" />);
  els.push(<Rect key="bf" x={20} y={6} width={640} height={64} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />);
  if (boardMsg) {
    const screen = boardMsg.state === 'good' ? '#0a2a1c' : boardMsg.state === 'ok' ? '#2a2210' : '#2a0e0e';
    const color = boardMsg.state === 'good' ? '#3ff0a8' : boardMsg.state === 'ok' ? '#ffd23f' : '#ff6a6a';
    els.push(<Rect key="bs" x={28} y={13} width={624} height={50} rx={4} fill={screen} />);
    els.push(<SvgText key="bm" x={340} y={boardMsg.sub ? 42 : 50} textAnchor="middle" fontFamily={F_LED} fontSize={boardMsg.msg.length > 14 ? 26 : 34} fontWeight="800" fill={color} letterSpacing={2}>{boardMsg.msg}</SvgText>);
    if (boardMsg.sub) els.push(<SvgText key="bsu" x={340} y={60} textAnchor="middle" fontFamily={F_LED} fontSize={9} fontWeight="700" fill="#e8edf5" letterSpacing={1.5}>{boardMsg.sub}</SvgText>);
  } else {
    const cells: { cap: string; val?: string; color?: string; screen?: string; tokens?: boolean }[] = [
      { cap: 'THE APPEAL', val: s.board.appeal, color: '#ffd23f', screen: '#1c1808' },
      { cap: 'UMPIRE SAYS', val: s.board.umpire, color: s.board.umpire === 'OUT' ? '#ff6a6a' : '#e8edf5', screen: s.board.umpire === 'OUT' ? '#2a0e0e' : undefined },
      { cap: 'REVIEWS LEFT', tokens: true },
      { cap: 'MATCH', val: s.board.situ, color: '#e8edf5' },
    ];
    cells.forEach((c, i) => {
      const cx0 = 28 + i * 157, cx = cx0 + 75;
      els.push(<Rect key={`c${i}`} x={cx0} y={13} width={150} height={50} rx={4} fill={c.screen ?? '#0c1016'} />);
      els.push(<SvgText key={`cc${i}`} x={cx} y={24} textAnchor="middle" fontFamily={F_LED} fontSize={8} fontWeight="800" fill="#5a6b7a" letterSpacing={1}>{c.cap}</SvgText>);
      if (c.tokens) {
        for (let k = 0; k < 2; k++) {
          els.push(<Circle key={`tk${i}${k}`} cx={cx - 12 + k * 24} cy={46} r={7} fill={k < s.board.reviews ? '#3ff0a8' : '#232a33'} stroke="#3a4553" strokeWidth={1.5} />);
        }
      } else if (c.val) {
        const fs = c.val.length > 12 ? 10 : (c.val.length > 8 ? 13 : 17);
        els.push(<SvgText key={`cv${i}`} x={cx} y={51} textAnchor="middle" fontFamily={F_LED} fontSize={fs} fontWeight="800" fill={c.color} letterSpacing={fs < 12 ? 0.5 : 1.5}>{c.val}</SvgText>);
      }
    });
  }

  // pitch layer (translated below the board) — fielders labeled by real position
  const pit: ReactNode[] = [];
  pit.push(<G key="oval"><CricketOvalScene footnote="right-hand batter: off side left, leg side right" /></G>);
  const staticActors: [string, P2, string, string?, number?, number?][] = [
    ['cover', [204, 222], 'cover'], ['midoff', [272, 122], 'mid-off'], ['midon', [408, 122], 'mid-on'],
    ['midwkt', [474, 222], 'midwicket'], ['finelg', [436, 392], 'fine leg'],
  ];
  staticActors.forEach(([id, p, lab]) => pit.push(<ActorDot key={id as string} x={(p as P2)[0]} y={(p as P2)[1]} fill={CK.orange} label={lab as string} />));
  pit.push(<ActorDot key="gully" x={frame.gully[0]} y={frame.gully[1]} fill={CK.orange} label="gully" />);
  pit.push(<ActorDot key="point" x={frame.point[0]} y={frame.point[1]} fill={CK.orange} label="point" />);
  pit.push(<ActorDot key="slip1" x={frame.slip1[0]} y={frame.slip1[1]} fill={CK.orange} label="1st slip" />);
  pit.push(<ActorDot key="slip2" x={frame.slip2[0]} y={frame.slip2[1]} fill={CK.orange} label="2nd slip" dy={24} />);
  pit.push(<ActorDot key="keeper" x={frame.keeper[0]} y={frame.keeper[1]} fill={CK.keeper} label="keeper" labelFill="#e6d8f2" dy={24} />);
  pit.push(<ActorDot key="bowler" x={frame.bowler[0]} y={frame.bowler[1]} fill={CK.orange} label="bowler" />);
  pit.push(<ActorDot key="umpire" x={324} y={142} fill={CK.chalk} label="umpire" labelFill="#e8edf5" r={7} />);
  pit.push(<ActorDot key="striker" x={354} y={282} fill={CK.def} label="batter (RH)" labelFill="#bcd3ff" />);
  pit.push(<ActorDot key="nonstr" x={322} y={168} fill={CK.def} label="non-striker" labelFill="#bcd3ff" dy={24} />);
  if (frame.pitchMark) pit.push(<Circle key="pm" cx={frame.pitchMark[0]} cy={frame.pitchMark[1]} r={3} fill="#fff" opacity={0.7} />);
  // ball: film-driven while rolling; scrubber-driven once frozen
  const scrubbed = phase === 'idle' ? ballAtScrub(segs, scrubT) : null;
  const ballP = scrubbed ? scrubbed.p : frame.ball;
  if (ballP) pit.push(<CricketBall key="ball" x={ballP[0]} y={ballP[1]} />);
  if (frame.fx) pit.push(<BurstRing key="fx" x={frame.fx.p[0]} y={frame.fx.p[1]} prog={frame.fx.prog} color={CK.amber} />);
  // film labels
  const lbl = (key: string, x: number, y: number, text: string, fill: string, size: number) => (
    <G key={key}>
      <SvgText x={x} y={y} textAnchor="middle" fontSize={size} fontFamily={F_BOLD} fill="none" stroke={CK.labelOutline} strokeWidth={4} strokeLinejoin="round">{text}</SvgText>
      <SvgText x={x} y={y} textAnchor="middle" fontSize={size} fontFamily={F_BOLD} fill={fill}>{text}</SvgText>
    </G>
  );
  if (frame.padLabel && s.type === 'lbw') {
    const pad = segs[1].to;
    pit.push(lbl('padL', pad[0] - 84, pad[1] - 32, 'struck on the pad', '#ffe1b3', 10));
  }
  if (frame.takenLabel) pit.push(lbl('takL', 438, 330, "taken — keeper's up!", '#ffe1b3', 10.5));
  if (frame.howzat) {
    pit.push(lbl('hz1', 392, 300, 'HOWZAT!!', '#ffd23f', 14));
    pit.push(lbl('hz2', 398, 318, '“how is that?!” — the appeal', '#ffe9b0', 8.5));
  }
  if (frame.allEleven) pit.push(lbl('a11', 250, 300, 'all eleven up!', '#ffd23f', 10));
  if (frame.umpire) {
    if (s.board.umpire === 'OUT') {
      pit.push(lbl('umpL', 324, 88, 'finger goes up — OUT', '#ff8a80', 12));
      pit.push(<Path key="finger" d="M324 112 L324 96" stroke="#ff8a80" strokeWidth={3} strokeLinecap="round" />);
    } else {
      pit.push(lbl('umpL', 324, 88, 'umpire shakes his head — not out', '#bcd3ff', 11));
    }
  }
  if (track) pit.push(<TrackingInset key="inset" s={s} v={verdict} ghost={track.ghost} beats={track.beats} />);

  const scene = (
    <View style={styles.sceneWrap}>
      <Svg viewBox={`0 0 ${SCENE.vbW} ${SCENE.vbH}`} style={{ width: '100%', aspectRatio: SCENE_RATIO, backgroundColor: CK.pitchD }}>
        {els}
        <G y={SCENE.ovalY}>{pit}</G>
      </Svg>
    </View>
  );

  // ── controls ──
  const pills = <ScenarioPills wrap={landscape} items={RS_SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const scrubEnabled = phase === 'idle';
  const scrubber = (
    <View style={!scrubEnabled && styles.scrubLocked}>
      <Slider style={styles.slider} minimumValue={0} maximumValue={100} step={0.5} value={scrubEnabled ? scrubT : 100} disabled={!scrubEnabled}
        onValueChange={v => setScrubT(v)} minimumTrackTintColor={theme.accent} maximumTrackTintColor={theme.border} thumbTintColor={theme.accent} />
      <View style={styles.tinfoRow}>
        <Text style={styles.tinfo} numberOfLines={1}>⏪ drag to replay the delivery — watch <Text style={styles.tinfoBold}>where it pitches</Text></Text>
        {scrubbed && <Text style={styles.tinfoBeat} numberOfLines={1}>{scrubbed.beat}</Text>}
      </View>
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['Fielding side (you, most tabs)', CK.orange], ['Batters', CK.def], ['Wicket-keeper', CK.keeper], ['Umpire', CK.chalk]] as [string, string][]).map(([l, c]) => (
        <View key={l} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{l}</Text></View>
      ))}
    </View>
  );
  const promptBlock = <View style={[styles.prompt, landscape && styles.promptLs]}><Rich s={prompt} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} /></View>;
  const judgeRow = phase === 'idle' ? (
    <View style={landscape ? styles.judgeCol : styles.judgeRow}>
      <TouchableOpacity style={[styles.judgeBtn, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose('review')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>REVIEW IT</Text>
        <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>send it upstairs — lose it if the call stands</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.judgeBtn, landscape && styles.judgeBtnLs]} activeOpacity={0.85} onPress={() => choose('save')}>
        <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>SAVE THE REVIEW</Text>
        <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>trust the umpire — keep the token</Text>
      </TouchableOpacity>
    </View>
  ) : null;
  const g = chosen ? s.grade[chosen] : null;
  const verdictCard = phase === 'done' && g ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, g.k === 'good' ? styles.vtagGood : g.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>
        {g.k === 'good' ? 'Right call' : g.k === 'ok' ? 'Defensible' : 'Wrong call'}
      </Text>
      <Text style={styles.vtitle}>{g.t}</Text>
      <Text style={styles.vbody}>{g.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const hintLine = <Text style={[styles.hint, landscape && styles.hintLs]}>{hint}</Text>;
  const subLine = phase !== 'done' ? <Text style={styles.foot}>{RS_SUB}</Text> : null;
  const footLine = <Text style={styles.foot}>{RS_FOOT}</Text>;
  const resetBtn = <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => resetTo(idx)}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = phase === 'done' ? (
    <View style={styles.lsPostRow}>{resetBtn}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next appeal →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: shared shell; scene-left with the scrubber in the reserved strip. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SCENE_RATIO}
        belowFieldReserve={LS_SCRUB_RESERVE}
        pills={pills}
        field={scene}
        belowField={scrubber}
        controls={<>{promptBlock}{judgeRow}{verdictCard}{hintLine}{legend}{subLine}{footLine}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack (mirrors the prototype's column). ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {scene}
      {scrubber}
      {legend}
      {promptBlock}
      {judgeRow}
      {verdictCard}
      <View style={styles.controlsRow}>
        {resetBtn}
        {phase === 'done' && <NextButton visible variant="filled" label="Next appeal →" onPress={nextScenario} />}
        {hintLine}
      </View>
      {subLine}
      {footLine}
    </ScrollView>
  );
}

// ── the tracking inset: pure render of scenario × computed verdict × revealed beats ──
function TrackingInset({ s, v, ghost, beats }: { s: RSScenario; v: DrsVerdict; ghost: boolean; beats: number }) {
  const stroke = ghost ? '#5a6b8a' : '#3B6FE0';
  const els: ReactNode[] = [];
  els.push(<Rect key="p" x={22} y={86} width={224} height={364} rx={10} fill="#0a1430" opacity={0.97} stroke={stroke} strokeWidth={1.5} strokeDasharray={ghost ? '5 5' : undefined} />);
  els.push(<SvgText key="t" x={134} y={106} textAnchor="middle" fontSize={9.5} fontFamily={F_BOLD} fill={ghost ? '#9fb0cc' : '#7fd8ff'} letterSpacing={1.5}>{ghost ? 'THE TRACKING YOU SAVED' : 'DRS — BALL TRACKING'}</SvgText>);
  const chip = (row: number, txt: string, state: 'red' | 'blue' | 'amber' | 'off') => {
    const y = 364 + row * 26;
    const bgc = state === 'red' ? '#5c1210' : state === 'amber' ? '#4a3a08' : state === 'blue' ? '#12275c' : '#141a26';
    const fgc = state === 'red' ? '#ff8a80' : state === 'amber' ? '#ffd23f' : state === 'blue' ? '#8fb4ff' : '#5a6b7a';
    return (
      <G key={`chip${row}`}>
        <Rect x={34} y={y} width={200} height={20} rx={4} fill={bgc} />
        <SvgText x={134} y={y + 14} textAnchor="middle" fontSize={10} fontFamily={F_BOLD} fill={fgc} letterSpacing={0.5}>{txt}</SvgText>
      </G>
    );
  };
  const note = (txt: string, fill: string) => (
    <SvgText key="note" x={134} y={150} textAnchor="middle" fontSize={9.5} fontFamily={F_BOLD} fill={fill}>{txt}</SvgText>
  );

  if (s.type === 'edge') {
    const lane = s.lane as EdgeLane;
    const bx = 170, edgeX = bx - 8, passY = 232, gap = lane.gap;
    els.push(<Rect key="bat" x={bx - 8} y={150} width={16} height={130} rx={5} fill="#d8c48a" stroke="#a08b54" strokeWidth={1.5} />);
    els.push(<SvgText key="batL" x={bx} y={142} textAnchor="middle" fontSize={8.5} fontFamily={F_BOLD} fill="#d8c48a">bat (side view)</SvgText>);
    els.push(<Path key="path" d={`M60 200 Q${edgeX - 30} ${passY - 6} ${edgeX - gap} ${passY} L 216 ${passY + 26}`} fill="none" stroke="#ff6a5e" strokeWidth={3} strokeLinecap="round" />);
    els.push(<Circle key="pb" cx={edgeX - gap} cy={passY} r={LANE.BALL_R} fill="#c0392b" stroke="#fff" strokeWidth={1} />);
    if (beats >= 2) {
      els.push(<SvgText key="pl" x={72} y={192} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#ff9d94">the ball's path</SvgText>);
      els.push(<Rect key="wf" x={36} y={300} width={196} height={44} rx={5} fill="#050a14" stroke="#2b3a55" strokeWidth={1} />);
      els.push(<SvgText key="wt" x={134} y={294} textAnchor="middle" fontSize={8.5} fontFamily={F_BOLD} fill="#7fd8ff" letterSpacing={1}>ULTRAEDGE — STUMP MIC</SvgText>);
      const explain = ['a microphone in the stumps records the', 'sound as the ball passes the bat —', 'a SPIKE at that frame = a touch'];
      explain.forEach((c, i) => els.push(<SvgText key={`ex${i}`} x={134} y={118 + i * 10} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#8fa3c8">{c}</SvgText>));
      // the waveform: flat, flat, SPIKE at the pass frame, flat (deterministic jitter — a
      // per-render Math.random() would strobe the trace every frame)
      let d = 'M40 322', x = 40;
      while (x < 226) {
        x += 4;
        const jitter = Math.abs(Math.sin(x * 12.9898) * 43758.5453 % 1) * 1.6;
        const amp = Math.abs(x - 134) < 5 && v.contact ? 16 : jitter;
        d += ` L${x} ${(322 - ((x / 4) % 2 ? amp : -amp)).toFixed(1)}`;
      }
      els.push(<Path key="wave" d={d} fill="none" stroke={v.contact ? '#3ff0a8' : '#4a5a74'} strokeWidth={1.4} />);
      els.push(<Path key="fr" d="M134 302 L134 344" stroke="#ffd23f" strokeWidth={1} strokeDasharray="3 3" />);
      els.push(<SvgText key="frL" x={134} y={356} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#8fa3c8">frame: ball passes bat</SvgText>);
      els.push(chip(0, v.contact ? 'SPIKE — CONTACT CONFIRMED' : 'FLAT — NO CONTACT', v.contact ? 'red' : 'blue'));
    }
    return <G opacity={ghost ? 0.88 : 1}>{els}</G>;
  }

  // LBW lane base: the corridor of the stumps
  const lane = s.lane as LbwLane;
  const p = lane.pitch, i = lane.impact, rel = lane.release;
  els.push(<Rect key="cor" x={LANE.OFF} y={118} width={LANE.LEG - LANE.OFF} height={LANE.STUMP_Y - 118} fill="#22355e" opacity={0.5} />);
  [LANE.OFF, LANE.LEG].forEach(x => els.push(<Path key={`cl${x}`} d={`M${x} 118 L${x} ${LANE.STUMP_Y}`} stroke="#5f79ab" strokeWidth={1} strokeDasharray="4 4" />));
  els.push(<SvgText key="lo" x={LANE.OFF - 22} y={210} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#8fa3c8">off</SvgText>);
  els.push(<SvgText key="ll" x={LANE.LEG + 22} y={210} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#8fa3c8">leg</SvgText>);
  const showWk = beats >= 3 && !!v.wickets;
  const stumpFill = showWk
    ? (v.wickets === 'HITTING' ? '#e24b4a' : v.wickets === "UMPIRE'S CALL" ? '#F5A623' : '#aebfdd')
    : (ghost ? '#7286a8' : '#aebfdd');
  [-9.3, 0, 9.3].forEach(dx => els.push(<Rect key={`st${dx}`} x={LANE.C + dx - 2.4} y={LANE.STUMP_Y} width={4.8} height={28} rx={1.5} fill={stumpFill} />));
  els.push(<Path key="base" d={`M${LANE.OFF - 6} ${LANE.STUMP_Y} L${LANE.LEG + 6} ${LANE.STUMP_Y}`} stroke="#8fa3c8" strokeWidth={1} />);
  els.push(<SvgText key="stL" x={LANE.C} y={LANE.STUMP_Y + 40} textAnchor="middle" fontSize={8} fontFamily={F_BOLD} fill="#8fa3c8">the stumps he defends</SvgText>);
  // delivered path: release → pitch → impact
  els.push(<Path key="dp" d={`M${rel[0]} ${rel[1]} L${p[0]} ${p[1]} L${i[0]} ${i[1]}`} fill="none" stroke="#ff6a5e" strokeWidth={3} strokeLinecap="round" opacity={ghost ? 0.75 : 1} />);
  if (beats >= 1 && v.pitching) {
    els.push(<Ellipse key="pe" cx={p[0]} cy={p[1]} rx={7} ry={4} fill={v.pitching === 'OUTSIDE LEG' ? '#3B6FE0' : '#e24b4a'} stroke="#fff" strokeWidth={1} />);
    els.push(chip(0, `1 · PITCHING — ${v.pitching}`, v.pitching === 'OUTSIDE LEG' ? 'blue' : 'red'));
    if (v.pitching === 'OUTSIDE LEG') {
      els.push(note('outside leg = LBW impossible', '#8fb4ff'));
      els.push(chip(1, '2 · IMPACT — not checked', 'off'));
      els.push(chip(2, '3 · WICKETS — not checked', 'off'));
    }
  }
  if (beats >= 2 && v.impact) {
    const dead = v.impact !== 'IN LINE' && !!s.shotOffered;
    els.push(<Circle key="ic" cx={i[0]} cy={i[1]} r={5} fill={dead ? '#3B6FE0' : '#e24b4a'} stroke="#fff" strokeWidth={1} />);
    els.push(chip(1, `2 · IMPACT — ${v.impact}${dead ? ' (shot)' : ''}`, dead ? 'blue' : 'red'));
    if (dead) {
      els.push(note('outside off + a shot = not out', '#8fb4ff'));
      els.push(chip(2, '3 · WICKETS — not checked', 'off'));
    }
  }
  if (showWk && v.proj != null && v.wickets) {
    els.push(<Path key="proj" d={`M${i[0]} ${i[1]} L${v.proj.toFixed(1)} ${LANE.STUMP_Y}`} fill="none" stroke="#ffd23f" strokeWidth={2.5} strokeDasharray="5 4" />);
    els.push(<Circle key="pball" cx={v.proj} cy={LANE.STUMP_Y} r={LANE.BALL_R} fill={v.wickets === 'HITTING' ? '#e24b4a' : v.wickets === "UMPIRE'S CALL" ? '#F5A623' : '#3B6FE0'} stroke="#fff" strokeWidth={1} />);
    els.push(chip(2, `3 · WICKETS — ${v.wickets}`, v.wickets === 'HITTING' ? 'red' : v.wickets === "UMPIRE'S CALL" ? 'amber' : 'blue'));
    if (v.wickets === "UMPIRE'S CALL") els.push(note('less than half the ball — his call stands', '#ffd23f'));
  }
  return <G opacity={ghost ? 0.88 : 1}>{els}</G>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  sceneWrap: { borderRadius: 14, overflow: 'hidden' },
  scrubLocked: { opacity: 0.45 },
  slider: { width: '100%', height: 34 },
  tinfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tinfo: { color: t.textSecondaryOnDark, fontSize: 11, flexShrink: 1 },
  tinfoBold: { fontWeight: '800', color: t.textPrimary },
  tinfoBeat: { color: t.accent, fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: t.accentText, fontWeight: '800' },
  judgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  judgeCol: { flexDirection: 'column', flexWrap: 'nowrap', gap: 8 },
  judgeBtn: { flex: 1, minWidth: 150, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  judgeSubLs: { fontSize: 10 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  hint: { color: t.textSecondaryOnDark, fontSize: 12.5, flexShrink: 1 },
  hintLs: { fontSize: 10.5, marginTop: 2 },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 17, opacity: 0.8 },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
