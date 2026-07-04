import { memo, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Line, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { SoccerPitch, ScenarioPills, NextButton, FE } from '../FieldEngine';
import { SCENARIOS, posAt, computeVerdict, offsideLineAt, R, type Call } from '../../lib/onsideOrOff';

// Onside or Off? — soccer diagnose-live/rewind-like-a-fan module. Judge blind (like a linesman),
// THEN the scrubber unlocks and the offside line (2nd-last opponent's leading edge, from the data
// layer) is drawn so you can verify against your call. Colors/labels verbatim from the prototype.
const ATT = '#E87722', DEF = '#3B6FE0', GK_C = '#8e44ad', OFFLINE = '#ffd23f', ATTLINE = '#E87722';
const NAVY = '#0d1b3e', BALL = '#ffffff', OUTLINE = '#1b3a1b';
const F_BOLD = 'SpaceGrotesk_700Bold';
const SPEEDS = [0.5, 1, 2];
const PITCH_RATIO = 680 / 420;
const LS_CUSHION = 24;        // navy band between pitch and controls (real margin)
const LS_SCRUB_RESERVE = 64;  // reserved height UNDER the pitch for the scrubber + tinfo (stable pitch size)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Total pixels the runner travels — used to normalize on-screen PACE across path lengths (constant
// px/sec regardless of run length; longer runs just take longer to watch). Verbatim from the prototype.
const runnerPathLen = (s: (typeof SCENARIOS)[number]) => {
  const r = s.runner, pe = r.pEnd || r.pStrike;
  return Math.hypot(r.pStrike.x - r.p0.x, r.pStrike.y - r.p0.y) + Math.hypot(pe.x - r.pStrike.x, pe.y - r.pStrike.y);
};

// Under-pitch state line. The t-loop re-renders the module ~60fps; the label must NOT churn with it or
// it strobes illegibly during playback. So it's a memoized child keyed on the DISCRETE phase (not raw
// t) — it repaints only at the before→strike→after thresholds. style is a stable ref from the memoized
// stylesheet, so React.memo bails out on every frame where the phase is unchanged.
type Phase = 'before' | 'strike' | 'after';
const PHASE_LABEL: Record<Phase, string> = {
  before: 'Before the pass',
  strike: '⚽ Ball played — this is the frame that counts',
  after: 'After the pass (ball travelling)',
};
const PhaseLine = memo(function PhaseLine({ phase, style }: { phase: Phase; style: StyleProp<TextStyle> }) {
  return <Text style={style} numberOfLines={1}>{PHASE_LABEL[phase]}</Text>;
});

export default function OnsideOrOffGame(_props: AcademyGameProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(false); // first full live watch done → judge buttons appear
  const [judged, setJudged] = useState(false);    // call made → scrubber unlocks + lines draw + verdict
  const [call, setCall] = useState<Call | null>(null);
  const [speedI, setSpeedI] = useState(1);
  const [ls, setLs] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  const s = SCENARIOS[idx];
  const scrubUnlocked = judged;

  // ── animation loop (rAF; drives `t` → posAt re-renders the pitch) ──
  const stopLoop = () => {
    playingRef.current = false; setPlaying(false);
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };
  // fromScrub=false means a deliberate "watch it live"/replay; only that first full watch unlocks judging.
  const playFrom = (startT: number, fromScrub: boolean) => {
    playingRef.current = true; setPlaying(true);
    const spd = SPEEDS[speedI];
    const paceScale = 220 / Math.max(120, runnerPathLen(s)); // REF path 220px; longer paths advance slower
    let localT = startT, last: number | null = null;
    const loop = (now: number) => {
      if (!playingRef.current) return;
      if (last == null) last = now;
      const dt = (now - last) / 1000; last = now;
      localT += dt * 40 * spd * paceScale;
      if (localT >= 100) {
        localT = 100; setT(100); playingRef.current = false; setPlaying(false); rafRef.current = null;
        if (!judged && !fromScrub) setWatched(true); // reached the end of the first live watch → allow the call
        return;
      }
      setT(localT);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const resetScenario = () => { stopLoop(); setT(0); setWatched(false); setJudged(false); setCall(null); setSpeedI(1); };
  const selectScenario = (i: number) => { stopLoop(); setIdx(i); setT(0); setWatched(false); setJudged(false); setCall(null); setSpeedI(1); };
  const nextScenario = () => selectScenario((idx + 1) % SCENARIOS.length);
  const watchLive = () => { setT(0); playFrom(0, false); };
  const togglePlay = () => { if (playing) { stopLoop(); } else { const start = t >= 100 ? 0 : t; setT(start); playFrom(start, true); } };
  const onScrub = (v: number) => { stopLoop(); setT(v); };
  const callIt = (c: Call) => {
    if (judged) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopLoop();
    setCall(c); setJudged(true); setT(s.strikeT); // SNAP to the decisive frame — same t the scrubber uses
  };

  const verdict = computeVerdict(s);
  const truth: Call = verdict.off ? 'offside' : 'onside';
  const correct = call === truth;
  const atStrike = Math.abs(t - s.strikeT) < 1.2;

  // ── the DYNAMIC pitch layer at time t (SVG children of SoccerPitch) ──
  const playEls: React.ReactNode[] = [];
  s.defs.forEach((d, i) => {
    const p = posAt(d, t, s.strikeT);
    playEls.push(<Circle key={`d${i}`} cx={p.x} cy={p.y} r={R} fill={d.gk ? GK_C : DEF} stroke={NAVY} strokeWidth={2} />);
    if (d.gk) playEls.push(<SvgText key={`gk${i}`} x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill="#fff">GK</SvgText>);
  });
  const pp = posAt(s.passer, t, s.strikeT);
  playEls.push(<Circle key="pass" cx={pp.x} cy={pp.y} r={R} fill={ATT} stroke={NAVY} strokeWidth={2} />);
  const rp = posAt(s.runner, t, s.strikeT);
  playEls.push(<Circle key="run" cx={rp.x} cy={rp.y} r={R} fill={ATT} stroke={NAVY} strokeWidth={2} />);
  // ball: at the passer's feet before the strike; travels to the receive point after
  let bx: number, by: number;
  if (t <= s.strikeT) { bx = pp.x + R; by = pp.y; }
  else { const k = (t - s.strikeT) / (100 - s.strikeT); const rEnd = posAt(s.runner, 100, s.strikeT); bx = lerp(pp.x + R, rEnd.x, k); by = lerp(pp.y, rEnd.y, k); }
  playEls.push(<Circle key="ball" cx={bx} cy={by} r={6} fill={BALL} stroke={NAVY} strokeWidth={1.5} />);
  if (atStrike) playEls.push(<Circle key="flash" cx={pp.x + R} cy={pp.y} r={14} fill="none" stroke={OFFLINE} strokeWidth={3} opacity={0.95} />);
  // offside lines — only AFTER the call (verify against your judgment). Drawn live at t; on the snap
  // to strikeT the drawn line equals the frozen-verdict line (coherence).
  if (scrubUnlocked) {
    const { lineX, rEdge } = offsideLineAt(s, t);
    playEls.push(<Line key="offl" x1={lineX} y1={6} x2={lineX} y2={414} stroke={OFFLINE} strokeWidth={2.5} opacity={0.95} />);
    playEls.push(<Line key="attl" x1={rEdge} y1={6} x2={rEdge} y2={414} stroke={ATTLINE} strokeWidth={2} strokeDasharray="5 4" opacity={0.9} />);
    playEls.push(<SvgText key="lo" x={lineX} y={20} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill="none" stroke={OUTLINE} strokeWidth={3}>2nd-last defender</SvgText>);
    playEls.push(<SvgText key="li" x={lineX} y={20} textAnchor="middle" fontSize={9} fontFamily={F_BOLD} fill={OFFLINE}>2nd-last defender</SvgText>);
  }
  const pitch = <SoccerPitch fill="width">{playEls}</SoccerPitch>;

  // ── reusable control fragments ──
  const scrubber = (
    <View style={[styles.scrubRow, !scrubUnlocked && styles.scrubLocked]}>
      <TouchableOpacity style={styles.tbtn} disabled={!scrubUnlocked} onPress={() => { stopLoop(); setT(clamp(t - 1)); }}><Text style={styles.tbtnTxt}>◀</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.tbtn, styles.tbtnPlay]} disabled={!scrubUnlocked} onPress={togglePlay}><Text style={styles.tbtnPlayTxt}>{playing ? '❚❚' : '▶'}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.tbtn} disabled={!scrubUnlocked} onPress={() => { stopLoop(); setT(clamp(t + 1)); }}><Text style={styles.tbtnTxt}>▶</Text></TouchableOpacity>
      <Slider style={styles.slider} minimumValue={0} maximumValue={100} step={0.5} value={t} disabled={!scrubUnlocked}
        onValueChange={onScrub} minimumTrackTintColor={theme.accent} maximumTrackTintColor={theme.border} thumbTintColor={theme.accent} />
      <TouchableOpacity style={styles.speed} disabled={!scrubUnlocked} onPress={() => setSpeedI((speedI + 1) % SPEEDS.length)}><Text style={styles.speedTxt}>{SPEEDS[speedI]}×</Text></TouchableOpacity>
    </View>
  );
  // State line. 'strike' is gated on !playing on purpose: during live playback the ball crosses the
  // strike frame in ~3 frames (~55ms), so the atStrike window (±1.2) is a razor-thin state the phase
  // truly passes THROUGH — surfacing "Ball played" there just flashes it by unreadably, and no memo can
  // smooth a state that genuinely exists for 3 frames. While moving, the line reads the wide, stable
  // Before/After states; "Ball played" appears and HOLDS only when the playhead is PARKED on the strike
  // frame (post-judge snap / pause / scrub-to-frame) — exactly when it's meant to be read.
  const phase: Phase = (!playing && atStrike) ? 'strike' : (t < s.strikeT ? 'before' : 'after');
  const tinfo = <PhaseLine phase={phase} style={styles.tinfo} />;
  const legend = (
    <View style={styles.legend}>
      {[['Attackers', ATT], ['Defenders', DEF], ['Keeper', GK_C], ['Offside line', OFFLINE]].map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
    </View>
  );
  const promptOrVerdict = !judged ? (
    <View style={styles.prompt}>
      <Text style={styles.promptTxt}>
        {!watched ? 'Tap Play to watch the move at full speed, then make your call.'
          : 'Your call — onside or offside? You watched it live, like the linesman. Replay it if you missed it.'}
      </Text>
    </View>
  ) : (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, correct ? styles.vtagGood : styles.vtagBad]}>{correct ? 'Correct' : 'Not quite'}</Text>
      <Text style={styles.vtitle}>{truth === 'offside' ? 'Offside 🚩' : 'Onside ✓'}</Text>
      <Text style={styles.vbody}>{s.why}</Text>
    </View>
  );
  const replayBtn = <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={() => { setT(0); playFrom(0, false); }}><Text style={styles.ghostTxt}>↻ Replay</Text></TouchableOpacity>;
  const actions = (
    <>
      {!watched && !playing && (
        <TouchableOpacity style={styles.playLiveBtn} activeOpacity={0.85} onPress={watchLive}><Text style={styles.playLiveTxt}>▶ Play it live</Text></TouchableOpacity>
      )}
      {watched && !judged && (
        <>
          <View style={styles.judgeRow}>
            <TouchableOpacity style={[styles.judgeBtn, styles.judgeOn]} activeOpacity={0.85} onPress={() => callIt('onside')}><Text style={styles.judgeTxt}>Onside ✓</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.judgeBtn, styles.judgeOff]} activeOpacity={0.85} onPress={() => callIt('offside')}><Text style={styles.judgeTxt}>Offside 🚩</Text></TouchableOpacity>
          </View>
          {replayBtn}
        </>
      )}
      {/* POST-CALL: judgment buttons UNMOUNT; Reset · Replay · Next stay (Next primary). */}
      {judged && (
        <View style={styles.postRow}>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetScenario}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
          {replayBtn}
          <NextButton visible label="Next scenario →" onPress={nextScenario} />
        </View>
      )}
    </>
  );
  const pills = (
    <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={(k) => selectScenario(Number(k))} />
  );

  // LANDSCAPE post-call footer — Reset · Replay · Next on ONE fixed row, pinned below the (scrollable)
  // verdict so the forward action is ALWAYS reachable regardless of verdict length (VAR 4's long body no
  // longer pushes Next off-screen). Next is the primary/emphasized control (filled accent, flex-fills the
  // remaining width); Reset/Replay stay compact and intrinsic-width so all three fit one row at any controlW.
  const lsPostRow = (
    <View style={styles.lsPostRow}>
      <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetScenario}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={() => { setT(0); playFrom(0, false); }}><Text style={styles.ghostTxt} numberOfLines={1}>↻ Replay</Text></TouchableOpacity>
      <TouchableOpacity style={styles.lsNextBtn} activeOpacity={0.85} onPress={nextScenario}><Text style={styles.lsNextTxt} numberOfLines={1}>Next →</Text></TouchableOpacity>
    </View>
  );

  // ── LANDSCAPE: pills top, pitch-left (scrubber under it), prompt/verdict + actions right ──
  const controlW = ls.w ? Math.round(Math.max(300, Math.min(380, ls.w * 0.42))) : 0;
  const fieldW = ls.w ? Math.round(Math.min((ls.h - LS_SCRUB_RESERVE) * PITCH_RATIO, ls.w - controlW - LS_CUSHION)) : 0;
  if (landscape) {
    return (
      <View style={[styles.lsRoot, { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
        <View style={styles.lsTopBar}><View style={styles.lsPills}>{pills}</View></View>
        <View style={styles.lsBody} onLayout={e => setLs({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {fieldW > 0 && (
            <View style={[styles.lsFieldCol, { width: fieldW }]}>
              {pitch}
              {scrubber}
              {tinfo}
            </View>
          )}
          {controlW > 0 && (judged ? (
            // POST-CALL: full-height column — verdict (+ legend) scrolls internally, footer row pinned
            // at the bottom so Reset · Replay · Next are always visible even for a long verdict (VAR 4).
            <View style={[styles.lsControls, styles.lsControlsCol, { width: controlW }]}>
              <ScrollView style={styles.lsVerdictScroll} contentContainerStyle={styles.lsVerdictScrollContent} showsVerticalScrollIndicator={false}>
                {promptOrVerdict}
                {legend}
              </ScrollView>
              {lsPostRow}
            </View>
          ) : (
            <ScrollView style={[styles.lsControls, { width: controlW }]} contentContainerStyle={styles.lsControlsContent} showsVerticalScrollIndicator={false}>
              {promptOrVerdict}
              {actions}
              {legend}
            </ScrollView>
          ))}
        </View>
      </View>
    );
  }

  // ── PORTRAIT: vertical stack (mirrors the prototype's column) ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {pitch}
      {scrubber}
      {tinfo}
      {legend}
      {promptOrVerdict}
      {actions}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Scrubber.
  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  scrubLocked: { opacity: 0.45 },
  tbtn: { width: 34, height: 32, borderRadius: 8, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  tbtnTxt: { color: t.textPrimary, fontSize: 13, fontWeight: '700' },
  tbtnPlay: { width: 40, backgroundColor: t.accent, borderColor: t.accent },
  tbtnPlayTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  slider: { flex: 1, height: 34 },
  speed: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  speedTxt: { color: t.textPrimary, fontSize: 11.5, fontWeight: '700' },
  tinfo: { color: t.textSecondaryOnDark, fontSize: 11.5, fontWeight: '600', marginTop: 4 },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Prompt (navy block, first-class instruction) → verdict swap in the same slot.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  // Judgment + actions.
  playLiveBtn: { marginTop: 10, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  playLiveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  judgeRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  judgeBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  judgeOn: { backgroundColor: '#14B8A6' },
  judgeOff: { backgroundColor: '#d8632a' },
  judgeTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  // Landscape.
  lsRoot: { flex: 1, backgroundColor: t.background, paddingVertical: 10 },
  lsTopBar: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, flexGrow: 0 },
  lsPills: { flex: 1 },
  lsBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  lsFieldCol: { marginRight: LS_CUSHION },
  lsControls: { flexShrink: 0 },
  lsControlsContent: { gap: 10, paddingBottom: 12 },
  // Post-call control column: verdict scrolls, footer pins. alignSelf stretch → fill lsBody's height so
  // the inner ScrollView (flex:1) is bounded and the footer sits at the bottom.
  lsControlsCol: { alignSelf: 'stretch', flexDirection: 'column' },
  lsVerdictScroll: { flex: 1 },
  lsVerdictScrollContent: { gap: 10, paddingBottom: 10 },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  lsNextBtn: { flex: 1, backgroundColor: t.accent, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  lsNextTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
