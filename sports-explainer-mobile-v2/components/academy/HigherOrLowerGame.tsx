import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Level } from '../../lib/api';
import { useAppState, getRank, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { scheduleQuizReminder } from '../../lib/notifications';
import { VerdictCard, NextButton } from '../FieldEngine';
import {
  StandingsPool, HLRound,
  standingsSportForKeys, getStandingsPool, buildStandingsRound, pairKey,
} from '../../lib/standings';
import { TeamStatCard, VsBadge } from '../../lib/higherLowerArt';
import type { AcademyGameProps } from '../../lib/academyGames';

// Higher or Lower — the live-STANDINGS game (Gate 5). Two teams from the same
// league table, side by side: which one has more wins / the better goal
// difference / the higher net run rate? Tap to pick, keep the streak alive.
// Every number is fetched from ESPN's keyless /standings at runtime
// (lib/standings — session + disk cached); every visual is lib/higherLowerArt.
// This component is the TeamPickGame shell (loading / friendly offline retry /
// countdown / combo / milestones / points float / rank-up / teaching beat)
// with the crest grid swapped for a two-card table read.

// Same scoring contract as QuizGame (the canonical award block, copied verbatim):
// base points by the answered round's difficulty tier + a capped combo bonus.
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
const COMBO_BONUS_CAP = 10;

const CORRECT = '#34C759';
const WRONG = '#FF3B30';

// Sporcle-style pressure, tuned by tier (generous for kids, tight for experts).
const TIMER_SECS: Record<Level, number> = { kid: 20, beginner: 15, intermediate: 12, expert: 9 };
const TIMED_OUT = -1; // sentinel for `chosen` when the clock beats the player

const TIER_LABEL: Record<Level, string> = {
  kid: 'ROOKIE', beginner: 'BEGINNER', intermediate: 'INTERMEDIATE', expert: 'EXPERT',
};

// How many recently-shown pairings to dodge when dealing the next round.
const RECENT_PAIRS = 12;

export default function HigherOrLowerGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const sport = standingsSportForKeys(sportKeys);

  // ── Live pool: load → ready | friendly error (never a crash, never blank) ──
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [pool, setPool] = useState<StandingsPool | null>(null);
  // Re-arm on mount, not just disarm on unmount: a bare `() => { mounted.current = false }`
  // cleanup latches false forever across a remount, so the load's success path would
  // early-return and the game would hang on its spinner.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!sport) { setStatus('error'); return; }
    setStatus('loading');
    try {
      const p = await getStandingsPool(sport); // network-first, falls back to last-good disk pool
      if (!mounted.current) return;
      setPool(p);
      setStatus('ready');
    } catch {
      if (mounted.current) setStatus('error');
    }
  }, [sport]);
  useEffect(() => { load(); }, [load]);

  // Round dealing. Difficulty is derived from the LIVE table in lib/standings:
  // the tier picks WHICH stat is asked (kid = wins … expert = differential /
  // net run rate) and HOW CLOSE the two teams are (kid = miles apart, expert =
  // razor thin), with the never-blank fallback ladder inside buildStandingsRound.
  //
  // ★ PRO SEAM (open, nothing gated): to gate intermediate/expert later, this
  // is the one value to wrap — e.g. const tier = isPro ? level : capFree(level);
  // feed `tier` to buildStandingsRound and nothing else changes.
  const recentPairs = useRef<Set<string>>(new Set());
  const [dealCount, setDealCount] = useState(0); // bump to deal the next round
  const round: HLRound | null = useMemo(() => {
    if (!pool) return null;
    const r = buildStandingsRound(pool, level, recentPairs.current);
    if (r) {
      recentPairs.current.add(pairKey(r.a, r.b, r.statKey));
      if (recentPairs.current.size > RECENT_PAIRS) {
        const first = recentPairs.current.values().next().value;
        if (first !== undefined) recentPairs.current.delete(first);
      }
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, level, dealCount]);

  // Answer state + the local explanation depth (VerdictCard tabs re-explain the
  // SAME comparison at any depth without touching the global app level).
  const [chosen, setChosen] = useState<number | null>(null);
  const judgedRef = useRef(false); // mirror for the timer callback
  judgedRef.current = chosen !== null;
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

  // ── Countdown (the streak pressure) ────────────────────────────────────────
  const timerProgress = useSharedValue(1);
  const timerHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timerHandle.current) { clearTimeout(timerHandle.current); timerHandle.current = null; }
    cancelAnimation(timerProgress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    // New live round → wind the clock. (Answered/verdict states have no clock.)
    if (status !== 'ready' || !round || chosen !== null) return;
    const secs = TIMER_SECS[round.level];
    timerProgress.value = 1;
    timerProgress.value = withTiming(0, { duration: secs * 1000, easing: Easing.linear });
    timerHandle.current = setTimeout(() => {
      if (judgedRef.current) return;
      setChosen(TIMED_OUT);
      setCombo(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      onAnswered();
    }, secs * 1000);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, status]);

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

  // Any answer (right OR wrong OR timed out) counts as activity — daily streak +
  // the "come back" reminder, both once per mount (verbatim from QuizGame).
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
  const timerStyle = useAnimatedStyle(() => ({ width: `${timerProgress.value * 100}%` }));

  const choose = async (i: 0 | 1) => {
    if (!round || chosen !== null) return;
    clearTimer();
    setChosen(i);
    const correct = i === round.answer;
    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Canonical award block (QuizGame, verbatim): base by the ROUND's tier,
      // plus the capped pre-increment combo bonus. Wrong answers award nothing.
      const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
      const gained = QUIZ_POINTS[round.level] + comboBonus;
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
    clearTimer();
    setChosen(null);
    setExplainLevel(level);
    setDealCount(c => c + 1);
  };

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Read the table, pick the leader! ⚖️';

  const judged = chosen !== null;

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
        {status === 'loading' ? (
          <View style={styles.card}>
            <ActivityIndicator color={theme.accent} />
            <Text style={styles.emptyText}>Pulling up the standings…</Text>
          </View>
        ) : status === 'error' ? (
          // The friendly offline state: live data will fail sometimes; a blank
          // game reads as a broken app, so say what happened and offer retry.
          <View style={styles.card}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>
              Couldn't reach the standings right now. Check your connection and try again — your points and streak are safe.
            </Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.85} onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !round ? (
          // Off-season / degenerate table: the pool loaded but no two teams can
          // be told apart on any stat (season not started, nothing played yet).
          // The prior-season fallback in lib/standings makes this rare — but a
          // friendly explanation beats a blank screen if we ever land here.
          <View style={styles.card}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyText}>
              The season hasn't started yet, so every team is level in the table. Check back once the games begin!
            </Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.85} onPress={load}>
              <Text style={styles.retryText}>Check again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* The prompt now names its own league AND season (lib/standings
                qualifyPrompt) — "So far in the 2025-26 NBA season, which team…".
                A separate context chip underneath would just say it twice, and
                it sat BELOW the question anyway, which is why the season never
                registered: you answer before your eye gets there. */}
            <Text style={styles.prompt}>{round.prompt}</Text>

            {/* Countdown bar — the timed-streak pressure. Frozen once judged. */}
            <View style={styles.timerTrack}>
              <Animated.View style={[styles.timerFill, timerStyle]} />
            </View>

            {/* The two-card compare — visuals 100% owned by lib/higherLowerArt. */}
            <View style={styles.compareRow}>
              <TouchableOpacity
                style={styles.cardTouch}
                activeOpacity={0.85}
                disabled={judged}
                onPress={() => choose(0)}>
                <TeamStatCard
                  name={round.a.displayName}
                  abbr={round.a.abbr}
                  logo={round.a.logo}
                  judged={judged}
                  isAnswer={round.answer === 0}
                  isChosen={chosen === 0}
                  statValue={round.aDisplay}
                />
              </TouchableOpacity>
              <VsBadge />
              <TouchableOpacity
                style={styles.cardTouch}
                activeOpacity={0.85}
                disabled={judged}
                onPress={() => choose(1)}>
                <TeamStatCard
                  name={round.b.displayName}
                  abbr={round.b.abbr}
                  logo={round.b.logo}
                  judged={judged}
                  isAnswer={round.answer === 1}
                  isChosen={chosen === 1}
                  statValue={round.bDisplay}
                />
              </TouchableOpacity>
            </View>

            {/* The teaching beat: what this stat MEANS and why it matters — the
                same comparison re-explained at all four depths via the tabs.
                Composed from the LIVE table + evergreen rules (lib/standings). */}
            <VerdictCard
              visible={judged}
              correct={chosen === round.answer}
              tagText={
                chosen === round.answer ? '✓ CORRECT'
                : chosen === TIMED_OUT ? "⏱ TIME'S UP"
                : '✗ NOT QUITE'
              }
              modeText={TIER_LABEL[round.level]}
              title={round.title}
              level={explainLevel}
              onSelectLevel={setExplainLevel}
              body={round.exp[explainLevel]}
            />
            <View style={styles.nextRow}>
              <NextButton visible={judged} label="Next matchup →" onPress={next} variant="filled" />
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
  prompt: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 4, lineHeight: 22 },
  timerTrack: {
    height: 6, borderRadius: 3, backgroundColor: t.surfaceAlt, overflow: 'hidden', marginBottom: 12,
  },
  timerFill: { height: 6, borderRadius: 3, backgroundColor: t.accent },
  compareRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  cardTouch: { flex: 1 },
  nextRow: { marginTop: 14, alignItems: 'flex-start' },
  card: {
    backgroundColor: t.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: t.border,
    alignItems: 'center', gap: 12,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  retryBtn: {
    borderRadius: 14, backgroundColor: t.accent, paddingHorizontal: 22, paddingVertical: 12,
  },
  retryText: { color: t.onAccent, fontSize: 15, fontWeight: '800' },
});
