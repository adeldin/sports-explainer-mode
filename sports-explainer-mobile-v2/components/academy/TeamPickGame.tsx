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
  TeamInfo, TeamRound, PickVariant,
  crestSportForKeys, getTeamPool, crestPool, kitPool,
  subjectPoolForLevel, buildTeamRound, teachingFor, promptFor,
} from '../../lib/espnTeams';
import { CrestHero, CrestChoice, KitSwatches } from '../../lib/crestKitArt';
import type { AcademyGameProps } from '../../lib/academyGames';

// The shared engine behind Crest Rush (crest ↔ name) and Kit Clash (colors →
// name) — the Academy's FIRST live-data games. The team pool comes from
// lib/espnTeams (keyless ESPN /teams, session + disk cached); every visual
// (crest card, swatches) comes from lib/crestKitArt. This component is the
// ReadTheScoreGame shell (combo, milestones, points float, rank-up, teaching
// beat) plus what live data demands: a loading state, a friendly offline/retry
// state, and a per-question countdown for the Sporcle-style streak feel.

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

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function TeamPickGame({ sportKeys, categoryEmoji, variant }: AcademyGameProps & { variant: PickVariant }) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const sport = crestSportForKeys(sportKeys);

  // ── Live pool: load → ready | friendly error (never a crash, never blank) ──
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [pool, setPool] = useState<TeamInfo[]>([]);
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
      const teams = await getTeamPool(sport); // network-first, falls back to last-good disk pool
      const eligible = variant === 'kit-clash' ? kitPool(teams) : crestPool(teams);
      if (eligible.length < 4) throw new Error('pool too small');
      if (!mounted.current) return;
      setPool(eligible);
      setStatus('ready');
    } catch {
      if (mounted.current) setStatus('error');
    }
  }, [sport, variant]);
  useEffect(() => { load(); }, [load]);

  // Content selection: the SUBJECT deck is tiered (kid draws from the famous
  // franchises; other tiers from the full pool) and the distractor picking
  // inside buildTeamRound is where the difficulty really lives — see
  // lib/espnTeams. Tiers are derived from live data, so no tier is ever empty.
  //
  // ★ PRO SEAM (open, nothing gated): to gate intermediate/expert later, this
  // is the one value to wrap — e.g. const tier = isPro ? level : capFree(level);
  // feed `tier` to subjectPoolForLevel/buildTeamRound and nothing else changes.
  const subjects = useMemo(
    () => (sport ? subjectPoolForLevel(pool, sport, level) : pool),
    [pool, sport, level],
  );

  // No-repeat deck over the subject pool; re-dealt when it changes or empties.
  const [deck, setDeck] = useState<number[]>([]);
  const [deckPos, setDeckPos] = useState(0);
  useEffect(() => {
    setDeck(shuffle(subjects.map((_, i) => i)));
    setDeckPos(0);
    setChosen(null);
  }, [subjects]);

  // Crests whose image failed to load mid-session (offline, CDN hiccup) —
  // skipped when dealing so the game never shows an unanswerable blank tile.
  const brokenIds = useRef<Set<string>>(new Set());

  const round: TeamRound | null = useMemo(() => {
    if (!subjects.length || !deck.length) return null;
    let subject: TeamInfo | undefined;
    for (let i = 0; i < deck.length; i++) {
      const cand = subjects[deck[(deckPos + i) % deck.length]];
      if (cand && !brokenIds.current.has(cand.id)) { subject = cand; break; }
    }
    if (!subject) subject = subjects[deck[deckPos % deck.length]]; // all broken? play on anyway
    if (!subject) return null;
    const flip = Math.random() < 0.45; // crest↔name direction mix for Crest Rush
    return buildTeamRound(pool, subject, level, variant, flip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, pool, deckPos, level, variant]);

  // Answer state + the local explanation depth (VerdictCard tabs re-explain the
  // SAME team at any depth without touching the global app level).
  const [chosen, setChosen] = useState<number | null>(null);
  const judgedRef = useRef(false); // mirror for the timer/img-error callbacks
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

  // ── Countdown (the "Rush"/"Clash" pressure) ────────────────────────────────
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

  const choose = async (i: number) => {
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
    if (deckPos + 1 >= deck.length) {
      setDeck(shuffle(subjects.map((_, i) => i))); // exhausted → re-deal
      setDeckPos(0);
    } else {
      setDeckPos(deckPos + 1);
    }
  };

  // The subject crest never arrived (mid-session offline / CDN miss): bench that
  // team for this session and deal the next one — never an unanswerable board.
  const skipBrokenSubject = () => {
    if (!round || judgedRef.current) return;
    brokenIds.current.add(round.subject.id);
    next();
  };

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : variant === 'kit-clash' ? 'Two colors, one team! 🎨'
    : 'Know the crest, name the team! 🛡️';

  const judged = chosen !== null;
  const teaching = round ? teachingFor(round.subject, pool.length) : null;

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
            <Text style={styles.emptyText}>Calling up the teams…</Text>
          </View>
        ) : status === 'error' || !round || !teaching ? (
          // The friendly offline state: live data will fail sometimes; a blank
          // game reads as a broken app, so say what happened and offer retry.
          <View style={styles.card}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>
              Couldn't reach the league right now. Check your connection and try again — your points and streak are safe.
            </Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.85} onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.prompt}>{promptFor(round)}</Text>

            {/* Countdown bar — the timed-streak pressure. Frozen once judged. */}
            <View style={styles.timerTrack}>
              <Animated.View style={[styles.timerFill, timerStyle]} />
            </View>

            {/* The question visual — 100% owned by lib/crestKitArt. */}
            {round.mode === 'kit' ? (
              <KitSwatches primary={round.subject.color} alt={round.subject.altColor} />
            ) : round.mode === 'crest' ? (
              <CrestHero
                uri={round.subject.logo}
                zoom={round.zoom}
                seed={Number(round.subject.id) || round.subject.displayName.length}
                onError={skipBrokenSubject}
              />
            ) : (
              <View style={styles.namePanel}>
                <Text style={styles.nameText}>{round.subject.displayName}</Text>
              </View>
            )}

            {round.mode === 'name' ? (
              // name → crest: a 2×2 grid of crest tiles.
              <View style={styles.crestGrid}>
                {round.options.map((opt, i) => {
                  const isAnswer = i === round.answer;
                  const isChosen = chosen === i;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.85}
                      disabled={judged}
                      onPress={() => choose(i)}
                      style={[
                        styles.crestCell,
                        judged && isAnswer && styles.cellCorrect,
                        judged && isChosen && !isAnswer && styles.cellWrong,
                      ]}>
                      <CrestChoice uri={opt.logo} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              // crest/kit → name: text options (QuizGame grammar).
              <View style={styles.options}>
                {round.options.map((opt, i) => {
                  const isAnswer = i === round.answer;
                  const isChosen = chosen === i;
                  return (
                    <TouchableOpacity
                      key={opt.id}
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
                          judged && (isAnswer || (isChosen && !isAnswer)) && styles.optionTextJudged,
                        ]}>
                        {opt.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* The teaching beat: who this team is — market, abbreviation, colors,
                league context — re-explained at all four depths via the tabs.
                All of it composed from the live payload (lib/espnTeams.teachingFor). */}
            <VerdictCard
              visible={judged}
              correct={chosen === round.answer}
              tagText={
                chosen === round.answer ? '✓ CORRECT'
                : chosen === TIMED_OUT ? "⏱ TIME'S UP"
                : '✗ NOT QUITE'
              }
              modeText={TIER_LABEL[round.level]}
              title={round.subject.displayName}
              level={explainLevel}
              onSelectLevel={setExplainLevel}
              body={teaching[explainLevel]}
            />
            <View style={styles.nextRow}>
              <NextButton visible={judged} label="Next team →" onPress={next} variant="filled" />
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
  prompt: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 10, lineHeight: 22 },
  timerTrack: {
    height: 6, borderRadius: 3, backgroundColor: t.surfaceAlt, overflow: 'hidden', marginBottom: 12,
  },
  timerFill: { height: 6, borderRadius: 3, backgroundColor: t.accent },
  namePanel: {
    backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border,
    height: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  nameText: { color: t.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  options: { marginTop: 14, gap: 10 },
  option: {
    borderRadius: 14, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  optionCorrect: { borderColor: CORRECT, backgroundColor: CORRECT },
  optionWrong: { borderColor: WRONG, backgroundColor: WRONG },
  optionText: { color: t.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  optionTextJudged: { color: '#ffffff', fontWeight: '800' },
  crestGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  crestCell: {
    width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: 2.5, borderColor: t.border,
    padding: 4, backgroundColor: t.surfaceAlt,
  },
  cellCorrect: { borderColor: CORRECT },
  cellWrong: { borderColor: WRONG },
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
