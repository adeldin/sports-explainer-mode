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

import { askQuestion, Sport } from '../lib/api';
import { useAppState } from '../lib/appState';
import { useTheme, Theme } from '../lib/theme';
import { UI_STRINGS } from '../lib/strings';
import { SPORT_FAQS } from '../lib/faqs';
import { SPORT_FULL_NAME } from '../lib/sports';
import { ACADEMY_CATEGORIES, AcademyCategory } from '../lib/academyCategories';

import DidYouKnow from '../components/DidYouKnow';
import QuizCard from '../components/QuizCard';

// Map a Live sport key to its Academy category (e.g. mlr → Rugby). Falls back to
// the first category (MLB) when there's no sport or no match.
function categoryForSport(sport?: Sport): AcademyCategory {
  return (sport && ACADEMY_CATEGORIES.find(c => c.sportKeys.includes(sport))) || ACADEMY_CATEGORIES[0];
}

// Route params the Live "Test your knowledge in the Academy →" CTA passes in.
type AcademyScreenProps = { route?: { params?: { sport?: Sport } } };

// Academy tab — the always-on "learn" experience: pick a category, read a fact,
// take a quiz (with a streak mechanic), browse common questions, and ask anything.
// The category list is Academy-only (lib/academyCategories) and decoupled from the
// Live tab's sport settings; some categories (Soccer, Rugby) pool several leagues.
export default function AcademyScreen({ route }: AcademyScreenProps) {
  const { language, level } = useAppState();
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

  // --- Streak (the addicting bit) ---
  const [streak, setStreak] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);
  const prevStreak = useRef(0);
  const streakScale = useSharedValue(1);
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

  // Bounce the streak counter on each increment; bigger bounce + a milestone
  // banner at 3 / 5 / 10.
  useEffect(() => {
    const prev = prevStreak.current;
    prevStreak.current = streak;
    if (streak <= prev || streak === 0) return;

    const isMilestone = streak === 3 || streak === 5 || streak === 10;
    streakScale.value = withSequence(
      withTiming(isMilestone ? 1.3 : 1.15, { duration: isMilestone ? 180 : 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: isMilestone ? 220 : 140 }),
    );

    if (isMilestone) {
      setMilestone(streak === 3 ? 'Hat trick! 🎉' : streak === 5 ? 'On fire! 🔥🔥' : 'Legendary! 🏆');
      milestoneOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1600, withTiming(0, { duration: 300 }, finished => {
          if (finished) runOnJS(setMilestone)(null);
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

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

  const streakStyle = useAnimatedStyle(() => ({ transform: [{ scale: streakScale.value }] }));
  const milestoneStyle = useAnimatedStyle(() => ({ opacity: milestoneOpacity.value }));

  const streakLabel =
    streak >= 5 ? `🔥🔥 ${streak} in a row! Unstoppable!`
    : streak >= 3 ? `🔥 ${streak} in a row!`
    : streak >= 1 ? `🎯 ${streak} in a row!`
    : 'Start a streak — answer correctly!';

  const faqs = SPORT_FAQS[primarySport];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={theme.statusBar} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header — matches the Live tab wordmark, with "Academy 🎓" appended so the
            "Sportswise" portion stays visually anchored when switching tabs. Title +
            tagline are stacked in a column (tagline hugging the title) like Live;
            Academy has no right-side group, so there's no left/right split. */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Sports<Text style={styles.headerTitleAccent}>wise</Text> Academy 🎓</Text>
            <Text style={styles.tagline}>Quizzes and facts to level up your game IQ.</Text>
          </View>
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

        {/* Streak + milestone — pinned below the sport pills, fixed above the scroll
            so it stays visible while the cards scroll beneath. (Same Animated.Views as
            before, just lifted out of the ScrollView — scale/fade wiring unchanged.) */}
        <View style={styles.streakBar}>
          {/* Streak counter */}
          <Animated.View style={[styles.streakWrap, streakStyle]}>
            <Text style={streak > 0 ? styles.streakActive : styles.streakIdle}>{streakLabel}</Text>
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

          {/* 1. Quick Quiz */}
          <View style={styles.section}>
            <QuizCard
              sportKeys={category.sportKeys}
              streak={streak}
              onCorrect={() => setStreak(s => s + 1)}
              onWrong={() => setStreak(0)}
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
  headerTitle: { fontSize: 22, fontFamily: 'SpaceGrotesk_600SemiBold', color: t.textPrimary },
  headerTitleAccent: { color: t.accent },
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
  // Streak + milestone — fixed bar below the tagline (outside the ScrollView).
  // Opaque background + 16px horizontal padding to align with the cards below.
  streakBar: { backgroundColor: t.background, paddingHorizontal: 16 },
  streakWrap: { alignItems: 'center', paddingVertical: 12 },
  streakActive: { color: t.accent, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  streakIdle: { color: t.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  milestoneWrap: { alignItems: 'center', marginBottom: 12 },
  milestoneText: { color: t.accentText, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  // Energetic spacing — 20px between sections.
  section: { marginBottom: 20 },
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
