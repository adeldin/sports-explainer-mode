import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Keyboard, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { askQuestion, Sport, Level } from '../lib/api';
import { useAppState } from '../lib/appState';
import { useTheme, Theme } from '../lib/theme';
import { UI_STRINGS } from '../lib/strings';
import { SPORT_FAQS } from '../lib/faqs';
import { SPORT_FULL_NAME } from '../lib/sports';
import { ACADEMY_CATEGORIES, AcademyCategory } from '../lib/academyCategories';
import { scheduleQuizReminder } from '../lib/notifications';

import DidYouKnow from '../components/DidYouKnow';
import QuizCard from '../components/QuizCard';

// Map a Live sport key to its Academy category (e.g. mlr → Rugby). Falls back to
// the first category (MLB) when there's no sport or no match.
function categoryForSport(sport?: Sport): AcademyCategory {
  return (sport && ACADEMY_CATEGORIES.find(c => c.sportKeys.includes(sport))) || ACADEMY_CATEGORIES[0];
}

// Route params the Live "Test your knowledge in the Academy →" CTA passes in.
type AcademyScreenProps = { route?: { params?: { sport?: Sport } } };

// Phase 1 quiz scoring: base points per correct answer, scaled by difficulty.
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
// Max combo bonus added to a correct answer (+1 per combo level, capped).
const COMBO_BONUS_CAP = 10;
// Rank → badge emoji for the rank card (keyed by RANKS[].name).
const RANK_EMOJI: Record<string, string> = {
  Rookie: '🔰', Starter: '⭐', 'All-Star': '🌟', Champion: '🏆', Legend: '👑',
};

// Academy tab — the always-on "learn" experience: pick a category, read a fact,
// take a quiz (with a streak mechanic), browse common questions, and ask anything.
// The category list is Academy-only (lib/academyCategories) and decoupled from the
// Live tab's sport settings; some categories (Soccer, Rugby) pool several leagues.
export default function AcademyScreen({ route }: AcademyScreenProps) {
  const { language, level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  // Academy-local selected category (decoupled from Live's sport list). Seeded from
  // the sport the Live CTA passed (e.g. mlr → Rugby), else the first category (MLB).
  const routeSport = route?.params?.sport;
  const [category, setCategory] = useState<AcademyCategory>(() => categoryForSport(routeSport));
  // Representative sport for the FAQ + ask box, which need a single Sport key.
  const primarySport = category.sportKeys[0];

  // When the Live CTA navigates here with a (possibly new) sport, open its matching
  // category. De-duped: only updates when the resolved category actually changes, so
  // tapping the CTA from a different sport (e.g. mlr after mlb) switches correctly.
  useEffect(() => {
    if (!routeSport) return;
    const next = categoryForSport(routeSport);
    setCategory(prev => (prev.key === next.key ? prev : next));
  }, [routeSport]);

  // --- Combo (the in-session consecutive-correct counter; resets on a wrong answer
  // or on unmount). Distinct from the persisted day-over-day `dailyStreak` from
  // useAppState, which is shown as a chip in the header. ---
  const [combo, setCombo] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);
  const prevCombo = useRef(0);
  const comboScale = useSharedValue(1);
  const milestoneOpacity = useSharedValue(0);

  // --- FAQ state ---
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [faqAnswers, setFaqAnswers] = useState<Record<string, string>>({});
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState(false);

  // --- Ask box state ---
  const [askText, setAskText] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askedQ, setAskedQ] = useState<string | null>(null);

  const sportName = S[SPORT_FULL_NAME[primarySport]];

  // Bounce the combo counter on each increment; bigger bounce + a milestone
  // banner at 3 / 5 / 7 / 10.
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

  // Cached answers are specific to category/level/language — reset when they change.
  useEffect(() => {
    setActiveFaq(null);
    setFaqAnswers({});
    setFaqExpanded(false);
    setAnswer(null);
    setAskedQ(null);
    setAskText('');
  }, [category.key, level, language]);

  const handleCategoryChange = async (c: AcademyCategory) => {
    if (c.key === category.key) return;
    await Haptics.selectionAsync();
    setCategory(c);
  };

  // FAQ rows ask without play context — the questions are self-contained, and
  // sport/level/language still drive a correct, level-appropriate answer.
  const toggleFaq = async (question: string) => {
    await Haptics.selectionAsync();
    if (activeFaq === question) { setActiveFaq(null); return; }
    setActiveFaq(question);
    if (faqAnswers[question]) return; // already cached
    setFaqLoading(true);
    try {
      const a = await askQuestion(question, primarySport, level, '', language);
      setFaqAnswers(prev => ({ ...prev, [question]: a }));
    } catch {
      setFaqAnswers(prev => ({ ...prev, [question]: S.answerError }));
    } finally {
      setFaqLoading(false);
    }
  };

  // Sport-general ask — no play context, same path as the Live tab's off-season ask.
  const handleAsk = async () => {
    const q = askText.trim();
    if (!q || asking) return;
    Keyboard.dismiss();
    setAskText('');
    setAskedQ(q);
    setAnswer(null);
    setAsking(true);
    try {
      const a = await askQuestion(q, primarySport, level, '', language);
      setAnswer(a);
    } catch {
      setAnswer(S.answerError);
    } finally {
      setAsking(false);
    }
  };

  // Any quiz answer (right OR wrong) counts as activity. Two once-per-mount concerns,
  // tracked by separate refs so they don't interfere:
  //  1. Daily streak — record today's quiz via recordQuizActivity(). Happens
  //     regardless of the Game Alerts toggle (the streak is independent of
  //     notifications). Idempotent per-day, but the ref avoids redundant calls.
  //  2. "Come back" reminder — re-arm to the next 7pm, ONLY if Game Alerts is on.
  //     Kept on its own ref so enabling alerts mid-session and answering still arms
  //     it once (the original behavior), even though the streak was recorded earlier.
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

  const comboStyle = useAnimatedStyle(() => ({ transform: [{ scale: comboScale.value }] }));
  const milestoneStyle = useAnimatedStyle(() => ({ opacity: milestoneOpacity.value }));

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Answer correctly to heat up! 🔥';

  // Progress within the current rank tier toward the next (0–100; 100 at Legend).
  const rankPct = rank.next
    ? Math.min(100, Math.max(0, ((points - rank.min) / (rank.next.min - rank.min)) * 100))
    : 100;

  const faqs = SPORT_FAQS[primarySport];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={theme.statusBar} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header — matches the Live tab wordmark, with "Academy" appended so the
            "Sportswise" portion stays visually anchored when switching tabs. Title +
            tagline are stacked in a column (tagline hugging the title) like Live;
            Academy has no right-side group, so there's no left/right split. */}
        <View style={styles.header}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Sports<Text style={styles.headerTitleAccent}>wise</Text> Academy</Text>
            <Text style={styles.tagline}>Quizzes and facts to level up your game IQ.</Text>
          </View>
          {/* Persisted day-over-day streak (distinct from the in-session combo below).
              Hidden at 0; shows once the user has a 1+ day streak. */}
          {dailyStreak >= 1 && (
            <View style={styles.dayStreakChip}>
              <Text style={styles.dayStreakNum}>🔥 {dailyStreak}</Text>
              <Text style={styles.dayStreakLabel}>DAY STREAK</Text>
            </View>
          )}
        </View>

        {/* Category selector — Academy-only learning categories (lib/academyCategories),
            independent of the Live tab's My Sports settings. */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportTabsContent}>
            {ACADEMY_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.sportTab, category.key === c.key && styles.sportTabActive]}
                onPress={() => handleCategoryChange(c)}>
                <Text style={styles.sportEmoji}>{c.emoji}</Text>
                <Text style={[styles.sportLabel, category.key === c.key && styles.sportLabelActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Combo + milestone — pinned below the sport pills, fixed above the scroll
            so it stays visible while the cards scroll beneath. This is the in-session
            consecutive-correct counter (resets on a wrong answer); the day-over-day
            streak lives in the header chip above. */}
        <View style={styles.comboBar}>
          {/* Combo counter */}
          <Animated.View style={[styles.comboWrap, comboStyle]}>
            <Text style={combo > 0 ? styles.comboActive : styles.comboIdle}>{comboLabel}</Text>
          </Animated.View>

          {/* Milestone celebration (fades out after ~2s) */}
          {milestone && (
            <Animated.View style={[styles.milestoneWrap, milestoneStyle]} pointerEvents="none">
              <Text style={styles.milestoneText}>{milestone}</Text>
            </Animated.View>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* 0. Rank card — the user's progression status (earned, separate from the
              difficulty level). Quiz-fed in Phase 1; any future game feeds the same
              points total. */}
          <View style={styles.section}>
            <View style={styles.rankCard}>
              <View style={styles.rankTopRow}>
                <Text style={styles.rankEmoji}>{RANK_EMOJI[rank.name] ?? '🔰'}</Text>
                <View style={styles.rankNameCol}>
                  <Text style={styles.rankKicker}>YOUR RANK</Text>
                  <Text style={styles.rankName}>{rank.name}</Text>
                </View>
                <Text style={styles.rankPts}>{points} pts</Text>
              </View>

              {rank.next ? (
                <>
                  <View style={styles.rankBarTrack}>
                    <View style={[styles.rankBarFill, { width: `${rankPct}%` }]} />
                  </View>
                  <Text style={styles.rankProgressText}>
                    {points - rank.min} / {rank.next.min - rank.min} to {rank.next.name} {RANK_EMOJI[rank.next.name] ?? ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.rankMaxed}>👑 Legend — maxed</Text>
              )}
            </View>
          </View>

          {/* 1. Quick Quiz */}
          <View style={styles.section}>
            <QuizCard
              sportKeys={category.sportKeys}
              streak={combo}
              onCorrect={() => {
                // Score by the answered question's difficulty (the global app level,
                // which is exactly what the quiz filters by). Combo bonus uses the
                // pre-increment combo (+1/level, capped) — so the Nth correct in a row
                // adds N before becoming N+1. Wrong answers award nothing.
                const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
                awardPoints(QUIZ_POINTS[level] + comboBonus);
                setCombo(c => c + 1);
                onQuizAnswered();
              }}
              onWrong={() => { setCombo(0); onQuizAnswered(); }}
            />
          </View>

          {/* 2. Did You Know */}
          <View style={styles.section}>
            <DidYouKnow sportKeys={category.sportKeys} />
          </View>

          {/* 3. Common Questions — auto-expanded (Academy is always learn mode). */}
          <View style={styles.section}>
            <View style={styles.faqSection}>
              <View style={styles.faqHeadingRow}>
                <Text style={styles.faqHeading}>{faqs.label[language]}</Text>
              </View>
              {(faqExpanded ? faqs.questions : faqs.questions.slice(0, 4)).map(q => {
                const text = q[language] || q.en;
                return (
                  <View key={q.en} style={styles.faqItem}>
                    <TouchableOpacity style={styles.faqRow} onPress={() => toggleFaq(text)} activeOpacity={0.7}>
                      <Text style={styles.faqQ}>{text}</Text>
                      <Text style={styles.faqChevron}>{activeFaq === text ? '−' : '+'}</Text>
                    </TouchableOpacity>
                    {activeFaq === text && (
                      <View style={styles.faqAnswerBox}>
                        {faqAnswers[text]
                          ? <Text style={styles.faqAnswer}>{faqAnswers[text]}</Text>
                          : <Text style={styles.faqThinking}>{S.thinking}</Text>}
                      </View>
                    )}
                  </View>
                );
              })}
              {faqs.questions.length > 4 && (
                <TouchableOpacity onPress={() => setFaqExpanded(v => !v)} style={styles.faqMoreBtn}>
                  <Text style={styles.faqMoreText}>
                    {faqExpanded ? S.showLess : `${S.showMore} (${faqs.questions.length - 4})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 4. Ask anything — sport-general, no play context. */}
          <View style={styles.section}>
            <Text style={styles.askTitle}>{S.askLearnPlaceholder.replace('{sport}', sportName).replace('…', '')}</Text>
            <View style={styles.askRow}>
              <TextInput
                style={styles.askInput}
                value={askText}
                onChangeText={setAskText}
                placeholder={S.askLearnPlaceholder.replace('{sport}', sportName)}
                placeholderTextColor={theme.placeholderText}
                returnKeyType="send"
                onSubmitEditing={handleAsk}
                editable={!asking}
                blurOnSubmit
              />
              <TouchableOpacity
                style={[styles.askSend, (!askText.trim() || asking) && styles.askSendDisabled]}
                onPress={handleAsk}
                disabled={!askText.trim() || asking}>
                <Text style={[styles.askSendText, (!askText.trim() || asking) && { color: theme.textMuted }]}>↑</Text>
              </TouchableOpacity>
            </View>
            {asking && (
              <View style={styles.thinkingRow}>
                <Text style={styles.thinkingText}>{S.thinking}</Text>
              </View>
            )}
            {answer && (
              <View style={styles.answerCard}>
                {askedQ && <Text style={styles.answerHeader}>{askedQ}</Text>}
                <Text style={styles.answerText}>{answer}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  safe: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  // Title column shrinks so the day-streak chip always has room on the right.
  headerTextCol: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'SpaceGrotesk_600SemiBold', color: t.textPrimary },
  headerTitleAccent: { color: t.accent },
  // Day-over-day streak chip (header, right side) — navy surface + orange accent.
  dayStreakChip: { alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.accent, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  dayStreakNum: { color: t.accent, fontSize: 16, fontWeight: '900' },
  dayStreakLabel: { color: t.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
  tabsContainer: { height: 70, marginBottom: 4 },
  // Hugs the title in the header column, matching the Live tab's headerTagline.
  tagline: { color: t.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 1 },
  sportTabsContent: { paddingHorizontal: 16, gap: 8 },
  sportTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, minWidth: 64 },
  sportTabActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  sportEmoji: { fontSize: 20 },
  sportLabel: { color: t.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  sportLabelActive: { color: t.accentText },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  // Combo + milestone — fixed bar below the tagline (outside the ScrollView).
  // Opaque background + 16px horizontal padding to align with the cards below.
  comboBar: { backgroundColor: t.background, paddingHorizontal: 16 },
  comboWrap: { alignItems: 'center', paddingVertical: 12 },
  comboActive: { color: t.accent, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  comboIdle: { color: t.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  milestoneWrap: { alignItems: 'center', marginBottom: 12 },
  milestoneText: { color: t.accentText, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  // Energetic spacing — 20px between sections.
  section: { marginBottom: 20 },
  // Rank card — the progression "status" area. Navy surface, orange accents.
  rankCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16 },
  rankTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankEmoji: { fontSize: 30 },
  rankNameCol: { flex: 1 },
  rankKicker: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rankName: { color: t.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 1 },
  rankPts: { color: t.accent, fontSize: 14, fontWeight: '800' },
  rankBarTrack: { height: 10, borderRadius: 5, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, marginTop: 14, overflow: 'hidden' },
  rankBarFill: { height: '100%', backgroundColor: t.accent, borderRadius: 5 },
  rankProgressText: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 8 },
  rankMaxed: { color: t.accent, fontSize: 14, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  // FAQ (mirrors Live tab styling)
  faqSection: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border },
  faqHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  faqHeading: { color: t.textPrimary, fontSize: 15, fontWeight: '800' },
  faqItem: { borderTopWidth: 1, borderTopColor: t.border },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  faqQ: { color: t.textSecondary, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 19 },
  faqChevron: { color: t.accentText, fontSize: 18, fontWeight: '800', width: 18, textAlign: 'center' },
  faqAnswerBox: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2 },
  faqAnswer: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
  faqThinking: { color: t.textMuted, fontSize: 13, fontStyle: 'italic' },
  faqMoreBtn: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: t.border },
  faqMoreText: { color: t.accentText, fontSize: 13, fontWeight: '700' },
  // Ask box (mirrors Live tab styling)
  askTitle: { color: t.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  askInput: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: t.textPrimary, fontSize: 15 },
  askSend: { width: 46, height: 46, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  askSendDisabled: { backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
  askSendText: { color: t.onAccent, fontSize: 18, fontWeight: '900' },
  thinkingRow: { marginTop: 16, alignItems: 'center' },
  thinkingText: { color: t.textMuted, fontSize: 13, fontStyle: 'italic' },
  answerCard: { marginTop: 16, padding: 16, backgroundColor: t.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: t.border },
  answerHeader: { color: t.accentText, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  answerText: { color: t.textSecondary, fontSize: 15, lineHeight: 23 },
});
