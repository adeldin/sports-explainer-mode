import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Level } from '../../lib/api';
import { useAppState, getRank, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { scheduleQuizReminder } from '../../lib/notifications';
import { VerdictCard, NextButton } from '../FieldEngine';
import { READ_THE_SCORE, poolForLevel, scoreSportForKeys, ScoreScenario } from '../../lib/readTheScore';
import { ScoreboardArt } from '../../lib/readTheScoreArt';
import type { AcademyGameProps } from '../../lib/academyGames';

// Same scoring contract as QuizGame (the canonical award block, copied verbatim):
// base points by the answered scenario's difficulty tier + a capped combo bonus.
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
const COMBO_BONUS_CAP = 10;

const CORRECT = '#34C759';
const WRONG = '#FF3B30';

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

// Read the Score — scoring-literacy game. Renders an SVG scoreboard (art module:
// lib/readTheScoreArt) and asks the user to READ it; after every answer the
// VerdictCard re-explains the ruling at all four depths (the teaching beat).
// The scenario bank lives in lib/readTheScore + lib/readTheScoreBank/* (pure data).
export default function ReadTheScoreGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Content selection: category → bank → the user's tier bucket, with the
  // NEVER-BLANK fallback to the full bank (build doc §1.9).
  //
  // ★ PRO SEAM (open, nothing gated): to gate intermediate/expert later, this
  // is the one line to wrap — e.g. poolForLevel(bank, isPro ? level : capFree(level)).
  const scoreSport = scoreSportForKeys(sportKeys);
  const bank = scoreSport ? READ_THE_SCORE[scoreSport] : [];
  const pool = useMemo(
    () => poolForLevel(bank, level),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoreSport, level],
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

  const scenario: ScoreScenario | undefined = pool.length ? pool[order[idx % order.length] ?? 0] : undefined;

  // Answer state + the local explanation depth (VerdictCard tabs re-explain the
  // SAME ruling at any depth without touching the global app level).
  const [chosen, setChosen] = useState<number | null>(null);
  const [explainLevel, setExplainLevel] = useState<Level>(level);
  useEffect(() => { setExplainLevel(level); }, [level]);

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

  const choose = async (i: number) => {
    if (!scenario || chosen !== null) return;
    setChosen(i);
    const correct = i === scenario.answer;
    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Canonical award block (QuizGame, verbatim): base by the SCENARIO's tier
      // (what was actually answered — the pool may be a fallback mix), plus the
      // capped pre-increment combo bonus. Wrong answers award nothing.
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
    setChosen(null);
    setExplainLevel(level);
    if (idx + 1 >= order.length) {
      setOrder(shuffle(pool.map((_, i) => i))); // exhausted → re-deal
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
  };

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Read the board, make the call! 🔢';

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
        {!scenario ? (
          // Dead path (every category maps to a bank with content) — guarded anyway,
          // because a blank game reads as a broken app.
          <View style={styles.card}>
            <Text style={styles.emptyText}>No scoreboards for this sport yet — try another category.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.prompt}>{scenario.prompt}</Text>

            <ScoreboardArt board={scenario.board} />

            <View style={styles.options}>
              {scenario.options.map((opt, i) => {
                const isAnswer = i === scenario.answer;
                const isChosen = chosen === i;
                const judged = chosen !== null;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.85}
                    disabled={judged}
                    onPress={() => choose(i)}
                    style={[
                      styles.option,
                      judged && isAnswer && styles.optionCorrect,
                      judged && isChosen && !isAnswer && styles.optionWrong,
                    ]}>
                    <Text
                      style={[
                        styles.optionText,
                        judged && isAnswer && styles.optionTextJudged,
                        judged && isChosen && !isAnswer && styles.optionTextJudged,
                      ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* The teaching beat: correct/incorrect tag + tier chip + the ruling,
                re-explained at any of the four depths via the difficulty tabs. */}
            <VerdictCard
              visible={chosen !== null}
              correct={chosen === scenario.answer}
              tagText={chosen === scenario.answer ? '✓ CORRECT' : '✗ NOT QUITE'}
              modeText={TIER_LABEL[scenario.level]}
              title={scenario.title}
              level={explainLevel}
              onSelectLevel={setExplainLevel}
              body={scenario.exp[explainLevel]}
            />
            <View style={styles.nextRow}>
              <NextButton visible={chosen !== null} label="Next board →" onPress={next} variant="filled" />
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
  options: { marginTop: 14, gap: 10 },
  option: {
    borderRadius: 14, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  optionCorrect: { borderColor: CORRECT, backgroundColor: CORRECT },
  optionWrong: { borderColor: WRONG, backgroundColor: WRONG },
  optionText: { color: t.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  optionTextJudged: { color: '#ffffff', fontWeight: '800' },
  nextRow: { marginTop: 14, alignItems: 'flex-start' },
  card: {
    backgroundColor: t.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: t.border,
    alignItems: 'center',
  },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
