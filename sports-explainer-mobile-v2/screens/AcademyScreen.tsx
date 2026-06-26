import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Keyboard, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, FadeIn, SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { askQuestion, Sport } from '../lib/api';
import { useAppState, RANK_EMOJI } from '../lib/appState';
import { useTheme, Theme } from '../lib/theme';
import { UI_STRINGS } from '../lib/strings';
import { SPORT_FAQS } from '../lib/faqs';
import { SPORT_FULL_NAME } from '../lib/sports';
import { ACADEMY_CATEGORIES, AcademyCategory } from '../lib/academyCategories';
import { AcademyGameId, getAcademyGame, gamesForSportKeys } from '../lib/academyGames';

import DidYouKnow from '../components/DidYouKnow';
import GameHost from '../components/academy/GameHost';

// Map a Live sport key to its Academy category (e.g. mlr → Rugby). Falls back to
// the first category (MLB) when there's no sport or no match.
function categoryForSport(sport?: Sport): AcademyCategory {
  return (sport && ACADEMY_CATEGORIES.find(c => c.sportKeys.includes(sport))) || ACADEMY_CATEGORIES[0];
}

// Route params the Live "Test your knowledge in the Academy →" CTA passes in.
type AcademyScreenProps = { route?: { params?: { sport?: Sport } } };

// Academy tab — a Duolingo-style home shell. The identity strip (rank card + streak +
// sport selector) sits at the top; a hero features a game; a grid surfaces the game
// library (read from the lib/academyGames registry — the shell never names a game).
// Tapping a game opens it full-screen via GameHost; `activeGameId` swaps the home for
// the game (a local-state full-screen, NOT a nav stack — so the Live CTA's
// route.params.sport keeps working untouched). Did You Know + FAQ + Ask live on the
// home below the grid.
export default function AcademyScreen({ route }: AcademyScreenProps) {
  const { language, level, dailyStreak, points, rank } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  // Academy-local selected category (decoupled from Live's sport list). Seeded from
  // the sport the Live CTA passed (e.g. mlr → Rugby), else the first category (MLB).
  const routeSport = route?.params?.sport;
  const [category, setCategory] = useState<AcademyCategory>(() => categoryForSport(routeSport));
  // Representative sport for the FAQ + ask box, which need a single Sport key.
  const primarySport = category.sportKeys[0];

  // Which game is open full-screen (null = the home). Local state, no nav stack.
  const [activeGameId, setActiveGameId] = useState<AcademyGameId | null>(null);

  // When the Live CTA navigates here with a (possibly new) sport, open its matching
  // category. De-duped: only updates when the resolved category actually changes, so
  // tapping the CTA from a different sport (e.g. mlr after mlb) switches correctly.
  useEffect(() => {
    if (!routeSport) return;
    const next = categoryForSport(routeSport);
    setCategory(prev => (prev.key === next.key ? prev : next));
  }, [routeSport]);

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

  const openGame = async (id: AcademyGameId) => {
    await Haptics.selectionAsync();
    setActiveGameId(id);
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

  // --- Home rank card: ease the bar fill to its current width on mount / point change
  // (the user returns from a game with more points → the bar fills in on the home). ---
  const barWidth = useSharedValue(0);
  const rankPct = rank.next
    ? Math.min(100, Math.max(0, ((points - rank.min) / (rank.next.min - rank.min)) * 100))
    : 100;
  useEffect(() => {
    barWidth.value = withTiming(rankPct, { duration: 600, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankPct]);
  const rankBarFillStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));

  const faqs = SPORT_FAQS[primarySport];

  // Games available for the current category (filters by each game's supportedSports).
  const visibleGames = gamesForSportKeys(category.sportKeys);

  // --- Full-screen game view (swaps the home; back returns here) ---
  const activeGame = activeGameId ? getAcademyGame(activeGameId) : undefined;
  if (activeGame) {
    return (
      <Animated.View key={activeGame.id} style={styles.root} entering={SlideInRight.duration(220)}>
        <GameHost game={activeGame} sportKeys={category.sportKeys} categoryEmoji={category.emoji} onBack={() => setActiveGameId(null)} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.root} entering={FadeIn.duration(200)}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle={theme.statusBar} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          {/* ── Identity strip: header (title + streak chip) + sport selector ── */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Sports<Text style={styles.headerTitleAccent}>wise</Text> Academy</Text>
              <Text style={styles.tagline}>Quizzes and facts to level up your game IQ.</Text>
            </View>
            {/* Persisted day-over-day streak. Hidden at 0; shows at a 1+ day streak. */}
            {dailyStreak >= 1 && (
              <View style={styles.dayStreakChip}>
                <Text style={styles.dayStreakNum}>🔥 {dailyStreak}</Text>
                <Text style={styles.dayStreakLabel}>DAY STREAK</Text>
              </View>
            )}
          </View>

          {/* Category selector — Academy-only categories, independent of My Sports. */}
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

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">

            {/* ── Identity: the full rank card (overall journey across the Academy) ── */}
            <View style={styles.section}>
              <View style={styles.rankCard}>
                <View style={styles.rankTopRow}>
                  <Text style={styles.rankEmoji}>{RANK_EMOJI[rank.name] ?? '🔰'}</Text>
                  <View style={styles.rankNameCol}>
                    <Text style={styles.rankKicker}>YOUR ACADEMY RANK</Text>
                    <Text style={styles.rankName}>{rank.name}</Text>
                  </View>
                  <Text style={styles.rankPts}>{points} pts</Text>
                </View>

                {rank.next ? (
                  <>
                    <View style={styles.rankBarTrack}>
                      <Animated.View style={[styles.rankBarFill, rankBarFillStyle]} />
                    </View>
                    {/* Absolute totals so the numbers match the big "{points} pts" above. */}
                    <Text style={styles.rankProgressText}>
                      {points} / {rank.next.min} → {rank.next.name} {RANK_EMOJI[rank.next.name] ?? ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.rankMaxed}>👑 Legend — maxed</Text>
                )}
              </View>
            </View>

            {/* ── Hero: the featured game (registry-driven; a Daily Challenge can replace
                 this later without restructuring) ── */}
            {visibleGames.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.heroCard}
                  activeOpacity={0.85}
                  onPress={() => openGame(visibleGames[0].id)}>
                  <Text style={styles.heroKicker}>FEATURED</Text>
                  <View style={styles.heroRow}>
                    <Text style={styles.heroIcon}>{visibleGames[0].icon}</Text>
                    <View style={styles.heroTextCol}>
                      <Text style={styles.heroTitle}>{visibleGames[0].title}</Text>
                      <Text style={styles.heroBlurb}>{visibleGames[0].blurb}</Text>
                    </View>
                    <Text style={styles.heroPlay}>▶</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Game library: a grid of tiles, rendered from the registry ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GAMES</Text>
              <View style={styles.gameGrid}>
                {visibleGames.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={styles.gameTile}
                    activeOpacity={0.8}
                    onPress={() => openGame(g.id)}>
                    <Text style={styles.gameTileIcon}>{g.icon}</Text>
                    <Text style={styles.gameTileTitle} numberOfLines={1}>{g.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Did You Know (below the grid, home content) ── */}
            <View style={styles.section}>
              <DidYouKnow sportKeys={category.sportKeys} />
            </View>

            {/* ── Common Questions — auto-expanded (Academy is always learn mode) ── */}
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

            {/* ── Ask anything — sport-general, no play context ── */}
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
    </Animated.View>
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
  // paddingTop un-crowds the rank card from the sport-category selector above it.
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 48 },
  // Energetic spacing — 20px between sections.
  section: { marginBottom: 20 },
  sectionLabel: { color: t.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
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
  // Hero — the featured game. Orange-accented, prominent.
  heroCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.accent, padding: 16 },
  heroKicker: { color: t.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { fontSize: 34 },
  heroTextCol: { flex: 1 },
  heroTitle: { color: t.textPrimary, fontSize: 18, fontWeight: '900' },
  heroBlurb: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  heroPlay: { color: t.accent, fontSize: 20, fontWeight: '900' },
  // Game library grid — compact tiles, two per row.
  gameGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gameTile: {
    width: '47%', flexGrow: 1, minHeight: 92, borderRadius: 14, backgroundColor: t.surface,
    borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
  },
  gameTileIcon: { fontSize: 28 },
  gameTileTitle: { color: t.textPrimary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
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
