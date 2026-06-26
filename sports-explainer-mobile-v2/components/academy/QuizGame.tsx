import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';

import { Level } from '../../lib/api';
import { useAppState, getRank, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { scheduleQuizReminder } from '../../lib/notifications';
import QuizCard from '../QuizCard';
import type { AcademyGameProps } from '../../lib/academyGames';

// Phase 1 quiz scoring: base points per correct answer, scaled by difficulty.
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
// Max combo bonus added to a correct answer (+1 per combo level, capped).
const COMBO_BONUS_CAP = 10;

// The full-screen Quick Quiz game. Owns the per-session feedback cluster that used to
// live inline in AcademyScreen — the in-session combo, the "+N" float, the milestone
// beat, and the rank-up beat — all anchored to a slim points header here (the full
// rank card stays on the Academy home). The scoring (awardPoints) is byte-identical
// to before; this is a re-housing, not a rewrite.
//
// Combo-on-exit: `combo` is local state. Tapping back unmounts this component, which
// discards `combo` (it ends naturally) — no points are lost, because each correct
// answer already called awardPoints() into the persisted global total. The home rank
// card reads that global total, so it reflects whatever was earned.
export default function QuizGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  // 3 / 5 / 7 / 10.
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

  // Any quiz answer (right OR wrong) counts as activity. Two once-per-mount concerns,
  // tracked by separate refs so they don't interfere:
  //  1. Daily streak — record today's quiz via recordQuizActivity() (idempotent per-day).
  //  2. "Come back" reminder — re-arm to the next 7pm, ONLY if Game Alerts is on.
  // The reminder copy uses the freshly-updated streak count from concern 1.
  const activityRecorded = useRef(false);
  const reminderArmed = useRef(false);
  const onQuizAnswered = () => {
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

  // Fire the "+N" micro-reward. The amount is computed at the award site (onCorrect)
  // and passed straight in. The float rises + fades (absolute overlay, never blocks
  // taps), and the points number pulses.
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

  // A tasteful one-time rank-up beat — an orange overlay pops on the slim header with
  // the new badge + name, then fades.
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

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Answer correctly to heat up! 🔥';

  return (
    <View style={styles.root}>
      {/* Slim in-game header — the anchor for the points feedback. The full rank card
          lives on the Academy home; this compact strip shows the running total so the
          "+N" float, combo, milestone, and rank-up beat have something to animate against. */}
      <View style={styles.statHeader}>
        <Animated.Text style={[styles.statPts, pointsPulseStyle]} numberOfLines={1}>
          {categoryEmoji ? `${categoryEmoji}  ` : ''}{RANK_EMOJI[rank.name] ?? '🔰'} {rank.name} · {points} pts
        </Animated.Text>
        <Animated.View style={comboStyle}>
          <Text style={combo > 0 ? styles.comboActive : styles.comboIdle} numberOfLines={1}>{comboLabel}</Text>
        </Animated.View>

        {/* "+N" points float */}
        {pointsFloat && (
          <Animated.View style={[styles.pointsFloat, pointsFloatStyle]} pointerEvents="none">
            <Text style={styles.pointsFloatText}>{pointsFloat}</Text>
          </Animated.View>
        )}

        {/* Milestone celebration (fades after ~2s) */}
        {milestone && (
          <Animated.View style={[styles.milestoneWrap, milestoneStyle]} pointerEvents="none">
            <Text style={styles.milestoneText}>{milestone}</Text>
          </Animated.View>
        )}

        {/* Rank-up beat — orange overlay on the header, fades after ~2s */}
        {rankUp && (
          <Animated.View style={[styles.rankUpOverlay, rankUpStyle]} pointerEvents="none">
            <Text style={styles.rankUpKicker}>RANK UP!</Text>
            <Text style={styles.rankUpName}>{rankUp}</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <QuizCard
          sportKeys={sportKeys}
          streak={combo}
          onCorrect={() => {
            // Score by the answered question's difficulty (the global app level, which
            // is exactly what the quiz filters by). Combo bonus uses the pre-increment
            // combo (+1/level, capped). Wrong answers award nothing.
            const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
            const gained = QUIZ_POINTS[level] + comboBonus;
            // Detect a rank cross BEFORE applying the award (points here is the pre-award
            // total from this render's closure). No math change.
            const beforeRank = getRank(points).name;
            const afterRank = getRank(points + gained).name;
            awardPoints(gained);
            flashPointsGain(gained, comboBonus > 0);
            if (beforeRank !== afterRank) celebrateRankUp(afterRank);
            setCombo(c => c + 1);
            onQuizAnswered();
          }}
          onWrong={() => { setCombo(0); onQuizAnswered(); }}
        />
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  // Slim points/combo header — the in-game anchor. Relative-positioned so the float,
  // milestone, and rank-up overlays anchor to it.
  statHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, alignItems: 'center', gap: 4 },
  statPts: { color: t.accent, fontSize: 15, fontWeight: '900' },
  comboActive: { color: t.accent, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  comboIdle: { color: t.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pointsFloat: { position: 'absolute', top: 4, right: 20 },
  pointsFloatText: { color: t.accent, fontSize: 20, fontWeight: '900' },
  milestoneWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  milestoneText: { color: t.accentText, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  // Rank-up beat — orange overlay, navy text (theme-safe via accent/onAccent).
  rankUpOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.accent, borderRadius: 14,
  },
  rankUpKicker: { color: t.onAccent, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  rankUpName: { color: t.onAccent, fontSize: 22, fontWeight: '900', marginTop: 4 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
});
