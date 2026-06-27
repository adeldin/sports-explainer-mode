// MakeTheCallGame — the scoring wrapper for the universal "Make the Call" judgment quiz. Copies the
// FormationQuizGame body (combo, "+N" float, milestone + rank-up beats, daily-streak/reminder) and
// reuses awardPoints + the SAME scoring constants. The live QuizGame is left untouched; the constants
// are copied (values identical). Deltas vs FormationQuizGame (per BUILD_MAKE_THE_CALL.md Gate 2):
//   (1) takes AcademyGameProps so GameHost can mount it; (2) header uses categoryEmoji like the live
//   QuizGame; (3) renders MakeTheCallCard, passing sportKeys + streak (the card pools BY SPORT).

import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';

import { Level } from '../../lib/api';
import { useAppState, getRank, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { scheduleQuizReminder } from '../../lib/notifications';
import type { AcademyGameProps } from '../../lib/academyGames';
import MakeTheCallCard from './MakeTheCallCard';

// COPIED from QuizGame (values identical — reuse without touching the shipped file).
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
const COMBO_BONUS_CAP = 10;

export default function MakeTheCallGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [combo, setCombo] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);
  const prevCombo = useRef(0);
  const comboScale = useSharedValue(1);
  const milestoneOpacity = useSharedValue(0);

  const [pointsFloat, setPointsFloat] = useState<string | null>(null);
  const pointsFloatOpacity = useSharedValue(0);
  const pointsFloatY = useSharedValue(0);
  const pointsPulse = useSharedValue(1);

  const [rankUp, setRankUp] = useState<string | null>(null);
  const rankUpOpacity = useSharedValue(0);
  const rankUpScale = useSharedValue(0.8);

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
      setMilestone(combo === 3 ? 'Heating up! 🔥' : combo === 5 ? 'On fire! 🔥🔥' : combo === 7 ? 'Unstoppable! ⚡' : 'Legendary! 🏆');
      milestoneOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1600, withTiming(0, { duration: 300 }, (finished) => { if (finished) runOnJS(setMilestone)(null); })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo]);

  const activityRecorded = useRef(false);
  const reminderArmed = useRef(false);
  const onQuizAnswered = () => {
    let streakNow = dailyStreak;
    if (!activityRecorded.current) {
      activityRecorded.current = true;
      streakNow = recordQuizActivity();
    }
    if (notificationsEnabled && !reminderArmed.current) {
      reminderArmed.current = true;
      scheduleQuizReminder(streakNow);
    }
  };

  const flashPointsGain = (amount: number, hasCombo: boolean) => {
    setPointsFloat(`+${amount}${hasCombo ? ' 🔥' : ''}`);
    pointsFloatOpacity.value = 0;
    pointsFloatY.value = 0;
    pointsFloatOpacity.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withDelay(450, withTiming(0, { duration: 350 }, (finished) => { if (finished) runOnJS(setPointsFloat)(null); })),
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
      withDelay(1700, withTiming(0, { duration: 400 }, (finished) => { if (finished) runOnJS(setRankUp)(null); })),
    );
  };

  const comboStyle = useAnimatedStyle(() => ({ transform: [{ scale: comboScale.value }] }));
  const milestoneStyle = useAnimatedStyle(() => ({ opacity: milestoneOpacity.value }));
  const pointsFloatStyle = useAnimatedStyle(() => ({ opacity: pointsFloatOpacity.value, transform: [{ translateY: pointsFloatY.value }] }));
  const pointsPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pointsPulse.value }] }));
  const rankUpStyle = useAnimatedStyle(() => ({ opacity: rankUpOpacity.value, transform: [{ scale: rankUpScale.value }] }));

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Answer correctly to heat up! 🔥';

  return (
    <View style={styles.root}>
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
        <MakeTheCallCard
          sportKeys={sportKeys}
          streak={combo}
          onCorrect={() => {
            const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
            const gained = QUIZ_POINTS[level] + comboBonus;
            const beforeRank = getRank(points).name;
            const afterRank = getRank(points + gained).name;
            awardPoints(gained);
            flashPointsGain(gained, comboBonus > 0);
            if (beforeRank !== afterRank) celebrateRankUp(afterRank);
            setCombo((c) => c + 1);
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
  statHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, alignItems: 'center', gap: 4 },
  statPts: { color: t.accent, fontSize: 15, fontWeight: '900' },
  comboActive: { color: t.accent, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  comboIdle: { color: t.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pointsFloat: { position: 'absolute', top: 4, right: 20 },
  pointsFloatText: { color: t.accent, fontSize: 20, fontWeight: '900' },
  milestoneWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  milestoneText: { color: t.accentText, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  rankUpOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderRadius: 14 },
  rankUpKicker: { color: t.onAccent, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  rankUpName: { color: t.onAccent, fontSize: 22, fontWeight: '900', marginTop: 4 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
});
