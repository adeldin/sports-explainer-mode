import { useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import { Circle, Rect, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Level } from '../../lib/api';
import { useAppState, getRank, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { scheduleQuizReminder } from '../../lib/notifications';
import {
  FootballField, SoccerPitch, BaseballDiamond, BasketballCourt, HockeyRink,
  TennisCourt, CricketGround, GolfHole, RugbyPitch, VerdictCard, NextButton, FIELD, FE,
} from '../FieldEngine';
import {
  ZONE_TAP, SURFACE_FOR_SPORT, poolForLevel, zoneSportForKeys, regionCenter,
  ZoneScenario, ZoneSpot, ZoneRegion,
} from '../../lib/zoneTap';
import type { AcademyGameProps } from '../../lib/academyGames';

// Same scoring contract as QuizGame (the canonical award block, copied verbatim):
// base points by the answered scenario's difficulty tier + a capped combo bonus.
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
const COMBO_BONUS_CAP = 10;

// Spot colors — module-owned state hues (the engine's FE palette stays field-intrinsic).
const AMBER = '#F5A623';
const TEAL = '#14B8A6';
const RED = '#e24b4a';
const F_BOLD = 'SpaceGrotesk_700Bold';
// Two-circle hit pattern (Where's the Play / FindTheOpenMan): oversized transparent hit
// target BEHIND the visible marker. 36 viewBox px ≈ 44px on-screen at the 680-wide scale.
const HIT_R = 36;
const RECT_HIT_PAD = 14;
const BURST_MS = 600;

// Tier display names — 'kid' shows as "Rookie" app-wide (FieldEngine convention).
const TIER_LABEL: Record<Level, string> = {
  kid: 'ROOKIE', beginner: 'BEGINNER', intermediate: 'INTERMEDIATE', expert: 'EXPERT',
};

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Zone Tap — spatial-literacy game. Renders the sport's FieldEngine surface and asks
// the user to TAP the answer region (positions/zones/lines — rule-based, evergreen).
// Answers are tapped regions, not multiple choice; after the tap the correct region
// highlights and the VerdictCard re-explains the spot at all four depths (the teaching
// beat). Scenario banks live in lib/zoneTap + lib/zoneTapBank/* (pure data).
export default function ZoneTapGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Content selection: category → bank → the user's tier bucket, with the NEVER-BLANK
  // fallback to the full bank (build doc §1.9).
  //
  // ★ PRO SEAM (open, nothing gated): to gate intermediate/expert later, this is the
  // one line to wrap — e.g. poolForLevel(bank, isPro ? level : capFree(level)).
  const zoneSport = zoneSportForKeys(sportKeys);
  const bank = zoneSport ? ZONE_TAP[zoneSport] : [];
  const pool = useMemo(
    () => poolForLevel(bank, level),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoneSport, level],
  );

  // Deck of pool indices, shuffled; re-dealt when the pool changes and when exhausted.
  const [order, setOrder] = useState<number[]>(() => shuffle(pool.map((_, i) => i)));
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setOrder(shuffle(pool.map((_, i) => i)));
    setIdx(0);
    setChosen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const scenario: ZoneScenario | undefined = pool.length ? pool[order[idx % order.length] ?? 0] : undefined;

  // Answer state + the local explanation depth (VerdictCard tabs re-explain the SAME
  // spot at any depth without touching the global app level).
  const [chosen, setChosen] = useState<string | null>(null);
  const [explainLevel, setExplainLevel] = useState<Level>(level);
  useEffect(() => { setExplainLevel(level); }, [level]);

  // On-field burst ring at the tapped region (raw rAF — the on-field animation system;
  // one owner, cancelled on next/unmount, per the FieldEngine idiom).
  const [burst, setBurst] = useState<{ x: number; y: number; color: string; r: number; opacity: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);
  const fireBurst = (x: number, y: number, color: string) => {
    stopLoop();
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const p = Math.min(1, (now - t0) / BURST_MS);
      setBurst({ x, y, color, r: 10 + 26 * p, opacity: 0.9 * (1 - p) });
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; setBurst(null); }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // In-session consecutive-correct counter (resets on a wrong answer or on unmount).
  const [combo, setCombo] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);
  const prevCombo = useRef(0);
  const comboScale = useSharedValue(1);
  const milestoneOpacity = useSharedValue(0);

  // "+N" micro-reward float + the points-number pulse.
  const [pointsFloat, setPointsFloat] = useState<string | null>(null);
  const pointsFloatOpacity = useSharedValue(0);
  const pointsFloatY = useSharedValue(0);
  const pointsPulse = useSharedValue(1);

  // Rank-up beat (one-time, on crossing a tier).
  const [rankUp, setRankUp] = useState<string | null>(null);
  const rankUpOpacity = useSharedValue(0);
  const rankUpScale = useSharedValue(0.8);

  // Bounce the combo counter on each increment; bigger bounce + a milestone banner at
  // 3 / 5 / 7 / 10. (Copied verbatim from QuizGame — the shared feedback grammar.)
  useEffect(() => {
    const prev = prevCombo.current;
    prevCombo.current = combo;
    if (combo <= prev || combo === 0) return;

    const isMilestone = combo === 3 || combo === 5 || combo === 7 || combo === 10;
    comboScale.value = withSequence(
      withTiming(isMilestone ? 1.3 : 1.15, { duration: isMilestone ? 180 : 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: isMilestone ? 220 : 140 }),
    );

    if (isMilestone) {
      setMilestone(
        combo === 3 ? 'Heating up! 🔥'
        : combo === 5 ? 'On fire! 🔥🔥'
        : combo === 7 ? 'Unstoppable! ⚡'
        : 'Legendary! 🏆',
      );
      milestoneOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1600, withTiming(0, { duration: 300 }, finished => {
          if (finished) runOnJS(setMilestone)(null);
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo]);

  // Any answer (right OR wrong) counts as activity — daily streak + the "come back"
  // reminder, both once per mount (verbatim from QuizGame).
  const activityRecorded = useRef(false);
  const reminderArmed = useRef(false);
  const onAnswered = () => {
    let streakNow = dailyStreak;
    if (!activityRecorded.current) {
      activityRecorded.current = true;
      streakNow = recordQuizActivity(); // returns today's updated count
    }
    if (notificationsEnabled && !reminderArmed.current) {
      reminderArmed.current = true;
      scheduleQuizReminder(streakNow); // fire-and-forget; no-ops without permission
    }
  };

  const flashPointsGain = (amount: number, hasCombo: boolean) => {
    setPointsFloat(`+${amount}${hasCombo ? ' 🔥' : ''}`);
    pointsFloatOpacity.value = 0;
    pointsFloatY.value = 0;
    pointsFloatOpacity.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withDelay(450, withTiming(0, { duration: 350 }, finished => {
        if (finished) runOnJS(setPointsFloat)(null);
      })),
    );
    pointsFloatY.value = withTiming(-46, { duration: 960, easing: Easing.out(Easing.quad) });
    pointsPulse.value = withSequence(
      withTiming(1.22, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220 }),
    );
  };

  const celebrateRankUp = (newRankName: string) => {
    setRankUp(`${RANK_EMOJI[newRankName] ?? '🎉'} ${newRankName}`);
    rankUpScale.value = 0.8;
    rankUpScale.value = withSequence(
      withTiming(1.1, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 180 }),
    );
    rankUpOpacity.value = withSequence(
      withTiming(1, { duration: 220 }),
      withDelay(1700, withTiming(0, { duration: 400 }, finished => {
        if (finished) runOnJS(setRankUp)(null);
      })),
    );
  };

  const comboStyle = useAnimatedStyle(() => ({ transform: [{ scale: comboScale.value }] }));
  const milestoneStyle = useAnimatedStyle(() => ({ opacity: milestoneOpacity.value }));
  const pointsFloatStyle = useAnimatedStyle(() => ({
    opacity: pointsFloatOpacity.value,
    transform: [{ translateY: pointsFloatY.value }],
  }));
  const pointsPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pointsPulse.value }] }));
  const rankUpStyle = useAnimatedStyle(() => ({
    opacity: rankUpOpacity.value,
    transform: [{ scale: rankUpScale.value }],
  }));

  const choose = async (spot: ZoneSpot) => {
    if (!scenario || chosen !== null) return;
    setChosen(spot.key);
    const correct = spot.key === scenario.answer;
    const [cx, cy] = regionCenter(spot.region);
    fireBurst(cx, cy, correct ? TEAL : RED);
    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Canonical award block (QuizGame, verbatim): base by the SCENARIO's tier (what
      // was actually answered — the pool may be a fallback mix), plus the capped
      // pre-increment combo bonus. Wrong answers award nothing.
      const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
      const gained = QUIZ_POINTS[scenario.level] + comboBonus;
      const beforeRank = getRank(points).name;
      const afterRank = getRank(points + gained).name;
      awardPoints(gained);
      flashPointsGain(gained, comboBonus > 0);
      if (beforeRank !== afterRank) celebrateRankUp(afterRank);
      setCombo(c => c + 1);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCombo(0);
    }
    onAnswered();
  };

  const next = () => {
    stopLoop();
    setBurst(null);
    setChosen(null);
    setExplainLevel(level);
    if (idx + 1 >= order.length) {
      setOrder(shuffle(pool.map((_, i) => i))); // exhausted → re-deal
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
  };

  // ── the tappable spot layer (SVG children of the surface) ─────────────────
  // Two-PASS render: ALL oversized transparent hit targets first, then ALL visible
  // markers on top (both pressable — the two-circle pattern from Where's the Play).
  // The pass split matters: a neighbor's oversized hit disc must never sit ABOVE
  // another spot's visible marker, or a precise tap could resolve to the wrong spot.
  // Judged: the answer region turns teal (revealed even on a miss), the wrong tap
  // turns red, other decoys dim. No SMIL pulse (doesn't port to react-native-svg).
  const judged = chosen !== null;
  const hitNodes: ReactNode[] = [];
  const visNodes: ReactNode[] = [];
  if (scenario) {
    scenario.spots.forEach(spot => {
      const isAnswer = spot.key === scenario.answer;
      const isChosen = spot.key === chosen;
      const color = !judged ? AMBER : isAnswer ? TEAL : isChosen ? RED : AMBER;
      const fillOpacity = !judged ? 0.12 : isAnswer ? 0.2 : isChosen ? 0.18 : 0.05;
      const ringOpacity = !judged ? 1 : isAnswer || isChosen ? 1 : 0.25;
      const onPress = judged ? undefined : () => { void choose(spot); };
      const r: ZoneRegion = spot.region;
      if (r.kind === 'circle') {
        if (!judged) {
          hitNodes.push(
            <Circle key={`hit-${spot.key}`} cx={r.cx} cy={r.cy} r={Math.max(r.r + 10, HIT_R)} fill="transparent" onPress={onPress} />,
          );
        }
        visNodes.push(
          <Circle
            key={`vis-${spot.key}`} cx={r.cx} cy={r.cy} r={r.r}
            fill={color} fillOpacity={fillOpacity}
            stroke={color} strokeWidth={2.5} strokeOpacity={ringOpacity}
            onPress={onPress}
          />,
        );
      } else {
        if (!judged) {
          hitNodes.push(
            <Rect
              key={`hit-${spot.key}`} x={r.x - RECT_HIT_PAD} y={r.y - RECT_HIT_PAD}
              width={r.w + RECT_HIT_PAD * 2} height={r.h + RECT_HIT_PAD * 2}
              fill="transparent" onPress={onPress}
            />,
          );
        }
        visNodes.push(
          <Rect
            key={`vis-${spot.key}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={8}
            fill={color} fillOpacity={fillOpacity}
            stroke={color} strokeWidth={2.5} strokeOpacity={ringOpacity} strokeDasharray="7 5"
            onPress={onPress}
          />,
        );
      }
    });
  }
  const spotNodes: ReactNode[] = [...hitNodes, ...visNodes];
  if (burst) {
    spotNodes.push(
      <Circle key="burst" cx={burst.x} cy={burst.y} r={burst.r} fill="none" stroke={burst.color} strokeWidth={3.5} opacity={burst.opacity} />,
    );
  }

  // ── the surface (one FieldEngine renderer per sport — the swappable art layer) ──
  const surface = zoneSport ? SURFACE_FOR_SPORT[zoneSport] : null;
  let art: ReactNode = null;
  if (surface === 'football') {
    // Engine LOS is drawn ABOVE the overlay by default; spots must sit on top of it, so
    // draw the LOS ourselves as the FIRST overlay element (the documented showLos={false}
    // pattern from FieldEngine).
    art = (
      <FootballField
        players={[]}
        showLos={false}
        overlay={
          <>
            <Line x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />
            <SvgText x={FIELD.los + 5} y={22} fill={FE.losLabel} fontSize={10.5} fontFamily={F_BOLD}>Line of scrimmage</SvgText>
            {spotNodes}
          </>
        }
      />
    );
  } else if (surface === 'soccer') {
    art = <SoccerPitch>{spotNodes}</SoccerPitch>;
  } else if (surface === 'baseball') {
    art = <BaseballDiamond>{spotNodes}</BaseballDiamond>;
  } else if (surface === 'basketball') {
    art = <BasketballCourt>{spotNodes}</BasketballCourt>;
  } else if (surface === 'hockey') {
    art = <HockeyRink>{spotNodes}</HockeyRink>;
  } else if (surface === 'tennis') {
    art = <TennisCourt>{spotNodes}</TennisCourt>;
  } else if (surface === 'cricket') {
    art = <CricketGround>{spotNodes}</CricketGround>;
  } else if (surface === 'golf') {
    art = <GolfHole>{spotNodes}</GolfHole>;
  } else if (surface === 'rugby') {
    art = <RugbyPitch>{spotNodes}</RugbyPitch>;
  }

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Tap the spot on the field! 📍';

  return (
    <View style={styles.root}>
      {/* Slim in-game header — the anchor for the points feedback (QuizGame pattern). */}
      <View style={styles.statHeader}>
        <Animated.Text style={[styles.statPts, pointsPulseStyle]} numberOfLines={1}>
          {categoryEmoji ? `${categoryEmoji}  ` : ''}{RANK_EMOJI[rank.name] ?? '🔰'} {rank.name} · {points} pts
        </Animated.Text>
        <Animated.View style={comboStyle}>
          <Text style={combo > 0 ? styles.comboActive : styles.comboIdle} numberOfLines={1}>{comboLabel}</Text>
        </Animated.View>

        {pointsFloat && (
          <Animated.View style={[styles.pointsFloat, pointsFloatStyle]} pointerEvents="none">
            <Text style={styles.pointsFloatText}>{pointsFloat}</Text>
          </Animated.View>
        )}
        {milestone && (
          <Animated.View style={[styles.milestoneWrap, milestoneStyle]} pointerEvents="none">
            <Text style={styles.milestoneText}>{milestone}</Text>
          </Animated.View>
        )}
        {rankUp && (
          <Animated.View style={[styles.rankUpOverlay, rankUpStyle]} pointerEvents="none">
            <Text style={styles.rankUpKicker}>RANK UP!</Text>
            <Text style={styles.rankUpName}>{rankUp}</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!scenario || !art ? (
          // Dead path (every category maps to a bank + surface) — guarded anyway,
          // because a blank game reads as a broken app.
          <View style={styles.card}>
            <Text style={styles.emptyText}>No field scenarios for this sport yet — try another category.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.prompt}>{scenario.prompt}</Text>

            {art}

            <Text style={styles.hint}>
              {judged
                ? (chosen === scenario.answer ? 'Nailed it — the green zone is the spot.' : 'The green zone shows the right spot.')
                : 'Tap one of the highlighted zones.'}
            </Text>

            {/* The teaching beat: correct/incorrect tag + tier chip + the spot,
                re-explained at any of the four depths via the difficulty tabs. */}
            <VerdictCard
              visible={judged}
              correct={chosen === scenario.answer}
              tagText={chosen === scenario.answer ? '✓ CORRECT' : '✗ NOT QUITE'}
              modeText={TIER_LABEL[scenario.level]}
              title={scenario.title}
              level={explainLevel}
              onSelectLevel={setExplainLevel}
              body={scenario.exp[explainLevel]}
            />
            <View style={styles.nextRow}>
              <NextButton visible={judged} label="Next spot →" onPress={next} variant="filled" />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  statHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, alignItems: 'center', gap: 4 },
  statPts: { color: t.accent, fontSize: 15, fontWeight: '900' },
  comboActive: { color: t.accent, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  comboIdle: { color: t.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pointsFloat: { position: 'absolute', top: 4, right: 20 },
  pointsFloatText: { color: t.accent, fontSize: 20, fontWeight: '900' },
  milestoneWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  milestoneText: { color: t.accentText, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  rankUpOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.accent, borderRadius: 14,
  },
  rankUpKicker: { color: t.onAccent, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  rankUpName: { color: t.onAccent, fontSize: 22, fontWeight: '900', marginTop: 4 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  prompt: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12, lineHeight: 22 },
  hint: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600', marginTop: 10 },
  nextRow: { marginTop: 14, alignItems: 'flex-start' },
  card: {
    backgroundColor: t.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: t.border,
    alignItems: 'center',
  },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
