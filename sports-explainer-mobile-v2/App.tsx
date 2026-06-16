import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, FlatList,
  RefreshControl, Animated, Alert,
  TextInput, KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

// Components
import GameCard from './components/GameCard';
import SettingsScreen from './components/SettingsScreen';
import EmptyState from './components/EmptyState';
import Onboarding from './components/Onboarding';
import ShareCard from './components/ShareCard';
import MorphCinematic from './components/MorphCinematic';
import PastPlays from './components/PastPlays';

// Libs
import { fetchExplanation, askQuestion, Sport, Level, Language, ExplanationResponse } from './lib/api';
import { registerForPushNotificationsAsync } from './lib/notifications';
import { useTheme, Theme } from './lib/theme';
import { SPORT_FAQS } from './lib/faqs';
import { UI_STRINGS } from './lib/strings';
import { SPORTS, orderSports, type SportTab } from './lib/sports';
import Reanimated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';
import * as Localization from 'expo-localization';

// Prevent the native splash from hiding automatically
SplashScreen.preventAutoHideAsync();

// SPORTS now lives in ./lib/sports (shared with the onboarding picker).

// Cross-axis height of a single sport tab row (used by the sortable grid).
const TAB_ROW_HEIGHT = 52;

// Per-sport localized display-name key (acronyms like MLB/NBA aren't here — they
// fall back to s.label in render). Keyed by Sport for the tab + picker labels.
const SPORT_NAME_KEY: Partial<Record<Sport, keyof (typeof UI_STRINGS)['en']>> = {
  soccer: 'spSoccer', worldcup: 'spWorldCup', rugby: 'spRugby',
  wnba: 'spWnba', epl: 'spPremierLeague', laliga: 'spLaLiga', mlr: 'spMlr',
};

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt', 'de', 'ja', 'zh', 'ko', 'it', 'ar'];
// (follow-up chips are built per-language in render — see `followUps`)

// ESPN config per sport. `core` sports (rugby) are NOT on the normal scoreboard
// API and need the two-step Core-API $ref fetch. Leagues match the backend so
// the gameId we send is found server-side.
const SPORT_CONFIG: Record<Sport, { espnSport: string; league: string; core?: boolean }> = {
  mlb: { espnSport: 'baseball', league: 'mlb' },
  nhl: { espnSport: 'hockey', league: 'nhl' },
  nba: { espnSport: 'basketball', league: 'nba' },
  nfl: { espnSport: 'football', league: 'nfl' },
  soccer: { espnSport: 'soccer', league: 'usa.1' },
  worldcup: { espnSport: 'soccer', league: 'fifa.world' },
  rugby: { espnSport: 'rugby', league: '270557', core: true },
  wnba: { espnSport: 'basketball', league: 'wnba' },
  epl: { espnSport: 'soccer', league: 'eng.1' },
  laliga: { espnSport: 'soccer', league: 'esp.1' },
  mlr: { espnSport: 'rugby', league: '289262', core: true },
};

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  homeLogo?: string;
  awayLogo?: string;
  status: string;
  isLive: boolean;
  sport: string;
}

export default function App() {
  // --- Fonts (Space Grotesk — SportsWise brand) ---
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,     // "SportsWise" wordmark (cinematic — applied separately)
    SpaceGrotesk_600SemiBold, // main header
    SpaceGrotesk_500Medium,   // "The Smart Play" tagline (applied separately)
  });

  // --- State ---
  const [appReady, setAppReady] = useState(false);
  const [isAnimationComplete, setAnimationComplete] = useState(false);
  const [seenCinematic, setSeenCinematic] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sport, setSport] = useState<Sport>('mlb');
  const [orderedSports, setOrderedSports] = useState<SportTab[]>(SPORTS);
  const [level, setLevel] = useState<Level>('beginner');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');
  
  const [result, setResult] = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [askText, setAskText] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // Share: snapshot of the data to render into the off-screen capture card. Non-null
  // only during a capture, so the ShareCard is mounted on demand (never permanently).
  const [shareData, setShareData] = useState<{
    gameContext: string; rawPlay: string; simple: string; whyItMatters?: string; sport: string;
  } | null>(null);

  // --- FAQ (per-sport common questions) ---
  const [faqSectionOpen, setFaqSectionOpen] = useState(false); // collapsed by default
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqAnswers, setFaqAnswers] = useState<Record<string, string>>({});
  const [faqExpanded, setFaqExpanded] = useState(false);

  // --- Theme + i18n ---
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];
  const followUps = [`🤔 ${S.fuWhy}`, `📜 ${S.fuRule}`, `👋 ${S.fuNew}`, `👀 ${S.fuNext}`];

  // --- Refs ---
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sportTabsRef = useAnimatedRef<Reanimated.ScrollView>(); // for drag auto-scroll
  const shareRef = useRef<ViewShot>(null);
  // Guards the onLayout-gated capture so it fires exactly once per share session.
  const captureInProgress = useRef(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // --- Animations ---
  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  // --- Logic Functions ---
  const fetchGames = useCallback(async () => {
    const cfg = SPORT_CONFIG[sport];
    // Team labels: prefer abbreviation, fall back for sports that lack it (rugby/soccer).
    const teamName = (c: any) =>
      c?.team?.abbreviation || c?.team?.shortDisplayName || c?.team?.displayName || '?';
    const scoreOf = (c: any) => {
      const s = c?.score;
      if (s == null) return '0';
      return typeof s === 'object' ? String(s.displayValue ?? s.value ?? '0') : String(s);
    };
    // Site API gives team.logo (a URL); Core API (rugby) gives team.logos[].href.
    const logoOf = (c: any): string | undefined =>
      c?.team?.logo || c?.team?.logos?.[0]?.href || undefined;
    const toGame = (e: any): Game => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
      return {
        id: String(e.id),
        homeTeam: teamName(home),
        awayTeam: teamName(away),
        homeScore: scoreOf(home),
        awayScore: scoreOf(away),
        homeLogo: logoOf(home),
        awayLogo: logoOf(away),
        status: e.status?.type?.shortDetail || '',
        isLive: e.status?.type?.state === 'in',
        sport,
      };
    };

    try {
      let parsed: Game[] = [];

      if (cfg.core) {
        // Rugby: Core-API two-step — list today's event $refs, then resolve each.
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const evRes = await fetch(
          `https://sports.core.api.espn.com/v2/sports/${cfg.espnSport}/leagues/${cfg.league}/events?dates=${today}`,
        );
        const evData = await evRes.json();
        const items: any[] = (evData.items || []).slice(0, 25);
        const events = await Promise.all(
          items.map(async (it: any) => {
            try {
              const r = await fetch(it.$ref);
              return await r.json();
            } catch {
              return null;
            }
          }),
        );
        parsed = events.filter(Boolean).map(toGame);
      } else {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard`,
        );
        const data = await res.json();
        parsed = (data?.events || []).map(toGame);
      }

      const sorted = [...parsed].sort((a, b) => {
        const aFav = favorites.includes(a.homeTeam) || favorites.includes(a.awayTeam);
        const bFav = favorites.includes(b.homeTeam) || favorites.includes(b.awayTeam);
        if ((a.isLive && aFav) && !(b.isLive && bFav)) return -1;
        if (!(a.isLive && aFav) && (b.isLive && bFav)) return 1;
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });

      setGames(sorted);
      if (sorted.length > 0 && !selectedGameId) {
        const live = sorted.find((g) => g.isLive);
        setSelectedGameId(live?.id || sorted[0].id);
      }
    } catch (e) {
      console.error('Games fetch error:', e);
    }
  }, [sport, selectedGameId, favorites]);

  const handleFetch = useCallback(async (isRefresh = false) => {
    if (!selectedGameId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setFollowUpAnswer(null);
    setActiveChip(null);
    try {
      const data = await fetchExplanation(sport, level, selectedGameId, language);
      setResult(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      fadeIn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport, level, selectedGameId, language]);

  const handleSportChange = async (s: Sport) => {
    if (s === sport) return;
    await Haptics.selectionAsync();
    setSport(s);
    setSelectedGameId(null);
    setResult(null);
    setGames([]);
  };

  // Renders one draggable sport tab. Tap selects; long-press (handled by the
  // grid) starts a drag. Selection is keyed by `sport`, so it survives reorders.
  const renderSportTab: SortableGridRenderItem<SportTab> = ({ item: s }) => (
    <TouchableOpacity
      style={[styles.sportTab, sport === s.key && styles.sportTabActive]}
      onPress={() => handleSportChange(s.key)}>
      <Text style={styles.sportEmoji}>{s.emoji}</Text>
      <Text style={[styles.sportLabel, sport === s.key && styles.sportLabelActive]}>
        {SPORT_NAME_KEY[s.key] ? S[SPORT_NAME_KEY[s.key]!] : s.label}
      </Text>
    </TouchableOpacity>
  );

  const toggleFavorite = async (teamAbbr: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFavs = favorites.includes(teamAbbr)
      ? favorites.filter(f => f !== teamAbbr)
      : [...favorites, teamAbbr];
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorite_teams', JSON.stringify(newFavs));
  };

  // Step 1 of the share flow: snapshot the CURRENT result into shareData, which
  // mounts the off-screen ShareCard (populated with real content, not placeholders).
  // The actual capture is deferred to onShareCardLayout, once the card has laid out.
  const handleShare = async () => {
    if (!result || shareData) return; // ignore taps while a capture is already in flight
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    captureInProgress.current = false;
    setShareData({
      gameContext: result.gameContext || 'Live Game',
      rawPlay: result.rawPlay || result.playType || 'Latest Play',
      simple: result.simple,
      whyItMatters: result.whyItMatters,
      sport,
    });
  };

  // Step 2: fired by the ShareCard's onLayout — the view has confirmed it's laid
  // out, so it's safe to rasterize. One extra frame lets the paint settle, then we
  // capture, unmount the card, and hand the image to the share sheet.
  const onShareCardLayout = () => {
    if (captureInProgress.current) return; // onLayout can fire more than once
    captureInProgress.current = true;
    requestAnimationFrame(async () => {
      try {
        if (!shareRef.current) throw new Error('ShareCard ref missing');
        const uri = await (shareRef.current as any).capture();
        setShareData(null); // unmount the off-screen card now that we have the image
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: S.share });
      } catch (e) {
        console.error('Share failed:', e);
        setShareData(null);
      } finally {
        captureInProgress.current = false;
      }
    });
  };

  const handleFollowUp = async (question: string) => {
    if (!result) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveChip(question);
    setFollowUpLoading(true);
    setFollowUpAnswer(null);
    try {
      const context = `${result.simple} ${result.whyItMatters || ''}`;
      const answer = await askQuestion(question, sport, level, context, language);
      setFollowUpAnswer(answer);
    } catch {
      setFollowUpAnswer(S.answerError);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleAsk = async () => {
    const q = askText.trim();
    if (!q || followUpLoading) return;
    Keyboard.dismiss();
    setAskText('');
    await handleFollowUp(q); // reuse the same context-grounded path as the chips
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
      const answer = await askQuestion(question, sport, level, '', language);
      setFaqAnswers(prev => ({ ...prev, [question]: answer }));
    } catch {
      setFaqAnswers(prev => ({ ...prev, [question]: S.answerError }));
    } finally {
      setFaqLoading(false);
    }
  };

// --- Effects ---
useEffect(() => {
  async function init() {
    try {
      const [onboarding, favs, notify, seenCine, lang, tabOrder] = await Promise.all([
        AsyncStorage.getItem('onboarding_complete'),
        AsyncStorage.getItem('favorite_teams'),
        AsyncStorage.getItem('notifications_enabled'),
        AsyncStorage.getItem('seen_cinematic'),
        AsyncStorage.getItem('user_language'),
        AsyncStorage.getItem('sport_tab_order'),
      ]);

      if (favs) setFavorites(JSON.parse(favs));
      // Restore the user's saved sport-tab order (reconstructed from the shared
      // SPORTS list so new sports appear and removed ones drop out).
      if (tabOrder) {
        try { setOrderedSports(orderSports(JSON.parse(tabOrder))); } catch { /* keep default order */ }
      }
      if (notify !== null) setNotificationsEnabled(notify === 'true');
      if (seenCine === 'true') setSeenCinematic(true);
      if (lang) {
        setLanguage(lang as Language);
      } else {
        // First run, no saved preference — default to the device language if supported.
        const code = Localization.getLocales()[0]?.languageCode;
        if (code && SUPPORTED_LANGS.includes(code)) setLanguage(code as Language);
      }

      setAppReady(true);

      setTimeout(() => {
        setOnboardingComplete(onboarding === 'true');
      }, 50);

    } catch (e) {
      console.warn('Init error:', e);
      setAppReady(true); // Still unblock the app if something fails
    }
  }
  init();
}, []);

// Hide the native splash only once data AND fonts are ready, so the first
// real content paints with Space Grotesk already loaded — no font-swap flash.
useEffect(() => {
  if (appReady && fontsLoaded && onboardingComplete !== null) {
    SplashScreen.hideAsync();
  }
}, [appReady, fontsLoaded, onboardingComplete]);

useEffect(() => {
  // Skip in Expo Go — not supported since SDK 53
  if (Constants.appOwnership === 'expo') return;

  if (onboardingComplete && notificationsEnabled) {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token || ''));
  }

  import('expo-notifications').then(Notifications => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const gameId = response.notification.request.content.data?.gameId as string | undefined;
      if (gameId) { setSelectedGameId(gameId); }
    });
  });

  return () => {
    if (notificationListener.current) notificationListener.current.remove();
    if (responseListener.current) responseListener.current.remove();
  };
}, [onboardingComplete, notificationsEnabled]);

  useEffect(() => { fetchGames(); }, [sport, favorites]);
  useEffect(() => { if (selectedGameId) handleFetch(); }, [selectedGameId, level, language]);
  // Cached FAQ answers are specific to sport/level/language — reset when they change.
  useEffect(() => { setActiveFaq(null); setFaqAnswers({}); setFaqExpanded(false); }, [sport, level, language]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => { fetchGames(); handleFetch(true); }, 60000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, sport, level, selectedGameId, language]);

  // --- Conditional Returns (The Gatekeepers) ---
  if (!appReady || !fontsLoaded || onboardingComplete === null) return null;

  if (!isAnimationComplete) {
    return (
      <MorphCinematic
        quick={seenCinematic}
        onComplete={() => {
          setAnimationComplete(true);
          AsyncStorage.setItem('seen_cinematic', 'true');
        }}
      />
    );
  }

  if (!onboardingComplete) {
    return <Onboarding language={language} onComplete={(l, s) => { setLevel(l); setSport(s); setOnboardingComplete(true); }} />;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={theme.statusBar} />

      {/* Off-screen share-capture layer: rendered on-screen at full opacity so the
          renderer genuinely paints it, but sits BEHIND the opaque SafeAreaView so the
          user never sees it. Mounted only while sharing; capture is gated on onLayout. */}
      {shareData && (
        <View style={styles.captureLayer} pointerEvents="none">
          <ViewShot
            ref={shareRef}
            options={{ format: 'png', quality: 1.0 }}
            onLayout={onShareCardLayout}>
            {/* collapsable={false} keeps Android from flattening the captured
                subtree out of the native view tree, which would blank the image. */}
            <View collapsable={false}>
              <ShareCard
                gameContext={shareData.gameContext}
                rawPlay={shareData.rawPlay}
                simple={shareData.simple}
                whyItMatters={shareData.whyItMatters}
                sport={shareData.sport}
              />
            </View>
          </ViewShot>
        </View>
      )}

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sports<Text style={styles.headerTitleAccent}>wise</Text></Text>
          <View style={styles.headerRight}>
            {autoRefresh && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cogBtn} onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowSettings(true);
            }}>
              <Text style={styles.cogIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sport Tabs — long-press a tab to drag-reorder; order persists. */}
        <View style={styles.tabsContainer}>
          <Reanimated.ScrollView
            ref={sportTabsRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportTabsContent}>
            <Sortable.Grid
              rows={1}
              rowHeight={TAB_ROW_HEIGHT}
              columnGap={8}
              data={orderedSports}
              keyExtractor={(s) => s.key}
              renderItem={renderSportTab}
              scrollableRef={sportTabsRef}
              dragActivationDelay={180}
              activeItemScale={1.05}
              activeItemOpacity={0.9}
              onDragStart={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              onDragEnd={({ indexToKey }) => {
                setOrderedSports(orderSports(indexToKey));
                AsyncStorage.setItem('sport_tab_order', JSON.stringify(indexToKey));
              }}
            />
          </Reanimated.ScrollView>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await fetchGames();
                await handleFetch(true);
              }}
              tintColor={theme.textSecondary}
            />
          }>

          {/* Game Strip */}
          {games.length > 0 ? (
            <View style={styles.gameStripContainer}>
              <FlatList
                data={games}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={g => g.id}
                renderItem={({ item }) => (
                  <GameCard
                    game={item}
                    isSelected={selectedGameId === item.id}
                    isFavorite={favorites.includes(item.homeTeam) || favorites.includes(item.awayTeam)}
                    onPress={async () => { await Haptics.selectionAsync(); setSelectedGameId(item.id); }}
                    onToggleFavorite={() => {
                      const game = games.find(g => g.id === item.id);
                      if (!game) return;
                      const homeIsFav = favorites.includes(game.homeTeam);
                      const awayIsFav = favorites.includes(game.awayTeam);
                      if (homeIsFav || awayIsFav) {
                        toggleFavorite(homeIsFav ? game.homeTeam : game.awayTeam);
                        return;
                      }
                      Alert.alert(
                        S.favTitle,
                        S.favMsg,
                        [
                          { text: game.awayTeam, onPress: () => toggleFavorite(game.awayTeam) },
                          { text: game.homeTeam, onPress: () => toggleFavorite(game.homeTeam) },
                          { text: S.cancel, style: 'cancel' },
                        ]
                      );
                    }}
                  />
                )}
              />
            </View>
          ) : !loading ? <EmptyState sport={sport} reason="no-games" language={language} /> : null}

          {loading && !result ? (
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: '60%', height: 20 }]} />
              <View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12 }]} />
            </View>
          ) : result ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Explanation Card */}
              <View style={styles.explanationCard}>
                <Text style={styles.explanationLabel}>🎙️ {S.thePlay}</Text>
                <View style={styles.explanationHeader}>
                  <Text style={styles.playPillText}>▶ {result.rawPlay || result.playType || S.latestPlay}</Text>
                  {lastUpdated && <Text style={styles.contextTime}>{S.updated} {lastUpdated}</Text>}
                </View>
                {result.complexity === 'high' && (
                  <View style={styles.complexityBadge}>
                    <Text style={styles.complexityText}>⚡ {S.complexPlay}</Text>
                  </View>
                )}
                <Text style={styles.explanationText}>{result.simple}</Text>
              </View>

              {/* Why It Matters */}
              {result.whyItMatters && (
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>💡 {S.whyItMatters}</Text>
                  <Text style={styles.insightText}>{result.whyItMatters}</Text>
                </View>
              )}

              {/* Rule Detail */}
              {result.ruleDetail && result.showRule && (
                <View style={styles.ruleCard}>
                  <Text style={styles.ruleLabel}>📜 {S.theRule}</Text>
                  <Text style={styles.ruleText}>{result.ruleDetail}</Text>
                </View>
              )}

              {(sport === 'mlb' || sport === 'nhl' || sport === 'nba' || sport === 'wnba') && selectedGameId && (
                <PastPlays
                  key={`${sport}-${selectedGameId}-${language}-${level}`}
                  sport={sport}
                  gameId={selectedGameId}
                  level={level}
                  language={language}
                />
              )}

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.shareBtnText}>↑ {S.share}</Text>
              </TouchableOpacity>

              {/* Follow-up Chips */}
              <View style={styles.followUpSection}>
                <Text style={styles.followUpTitle}>{S.askFollowUp}</Text>
                <View style={styles.chipsWrap}>
                  {[followUps.slice(0, 2), followUps.slice(2, 4)].map((row, i) => (
                    <View key={i} style={styles.chipRow}>
                      {row.map(q => (
                        <TouchableOpacity
                          key={q}
                          style={[styles.chip, activeChip === q && styles.chipActive]}
                          onPress={() => handleFollowUp(q)}
                          disabled={followUpLoading}>
                          <Text style={[styles.chipText, activeChip === q && styles.chipTextActive]} numberOfLines={1}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>

                {/* Discovery hint — only when the ask box is idle */}
                {!followUpLoading && !followUpAnswer && (
                  <Text style={styles.askHint}>{S.askHint}</Text>
                )}

                {/* Free-text ask box — grounded in THIS play's explanation */}
                <View style={styles.askRow}>
                  <TextInput
                    style={styles.askInput}
                    value={askText}
                    onChangeText={setAskText}
                    placeholder={S.askPlaceholder}
                    placeholderTextColor={theme.placeholderText}
                    returnKeyType="send"
                    onSubmitEditing={handleAsk}
                    editable={!followUpLoading}
                    blurOnSubmit
                  />
                  <TouchableOpacity
                    style={[styles.askSend, (!askText.trim() || followUpLoading) && styles.askSendDisabled]}
                    onPress={handleAsk}
                    disabled={!askText.trim() || followUpLoading}>
                    <Text style={[styles.askSendText, (!askText.trim() || followUpLoading) && { color: theme.textMuted }]}>↑</Text>
                  </TouchableOpacity>
                </View>

                {followUpLoading && (
                  <View style={styles.thinkingRow}>
                    <Text style={styles.thinkingText}>{S.thinking}</Text>
                  </View>
                )}
                {followUpAnswer && (
                  <View style={styles.answerCard}>
                    <Text style={styles.answerHeader}>{activeChip}</Text>
                    <Text style={styles.answerText}>{followUpAnswer}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : !loading ? <EmptyState sport={sport} reason="select-game" language={language} /> : null}

          {/* Common Questions — per-sport FAQ. Secondary/educational, so it lives at
              the bottom; collapsed by default. */}
          <View style={styles.faqSection}>
            <TouchableOpacity style={styles.faqHeadingRow} onPress={() => setFaqSectionOpen(v => !v)} activeOpacity={0.7}>
              <Text style={styles.faqHeading}>{SPORT_FAQS[sport].label[language]}</Text>
              <Text style={styles.faqHeadingChevron}>{faqSectionOpen ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {faqSectionOpen && (
              <>
                {(faqExpanded ? SPORT_FAQS[sport].questions : SPORT_FAQS[sport].questions.slice(0, 4)).map(q => {
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
                {SPORT_FAQS[sport].questions.length > 4 && (
                  <TouchableOpacity onPress={() => setFaqExpanded(v => !v)} style={styles.faqMoreBtn}>
                    <Text style={styles.faqMoreText}>
                      {faqExpanded ? S.showLess : `${S.showMore} (${SPORT_FAQS[sport].questions.length - 4})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <SettingsScreen
        visible={showSettings}
        level={level}
        language={language}
        autoRefresh={autoRefresh}
        notificationsEnabled={notificationsEnabled}
        onClose={() => setShowSettings(false)}
        onLevelChange={(l) => { setLevel(l); setShowSettings(false); }}
        onLanguageChange={async (lng) => {
          setLanguage(lng);
          await AsyncStorage.setItem('user_language', lng);
        }}
        onAutoRefreshChange={setAutoRefresh}
        onNotificationsToggle={async (val) => {
          setNotificationsEnabled(val);
          await AsyncStorage.setItem('notifications_enabled', val ? 'true' : 'false');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  // Opaque so it fully covers the off-screen share-capture layer beneath it.
  safe: { flex: 1, backgroundColor: t.background },
  // Full-screen layer drawn behind `safe`; centers the capture card on-screen
  // (real layout + full opacity for a reliable rasterize) but stays hidden.
  captureLayer: { ...StyleSheet.absoluteFillObject, zIndex: -1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'SpaceGrotesk_600SemiBold', color: t.textPrimary },
  headerTitleAccent: { color: t.accent },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.liveSoftBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: t.live + '33' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.live },
  livePillText: { color: t.live, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cogBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: t.border },
  cogIcon: { fontSize: 18 },
  tabsContainer: { height: 70, marginBottom: 10 },
  sportTabsContent: { paddingHorizontal: 16, gap: 8 },
  sportTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, minWidth: 64 },
  sportTabActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  sportEmoji: { fontSize: 20 },
  sportLabel: { color: t.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  sportLabelActive: { color: t.accentText },
  gameStripContainer: { paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  skeleton: { padding: 20, marginHorizontal: 16, backgroundColor: t.surface, borderRadius: 16 },
  skeletonLine: { backgroundColor: t.surfaceAlt, borderRadius: 6 },
  explanationCard: { backgroundColor: t.explanationBg, borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: t.stripe, borderWidth: 1, borderColor: t.border },
  explanationLabel: { color: t.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  explanationHeader: { flexDirection: 'column', marginBottom: 12, gap: 4 },
  explanationText: { color: t.textPrimary, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  contextTime: { color: t.textMuted, fontSize: 11 },
  playPillText: { color: t.textSecondary, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  insightCard: { backgroundColor: t.insightBg, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: t.accent, borderWidth: 1, borderColor: t.insightBorder },
  insightLabel: { color: t.insightLabel, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  insightText: { color: t.textPrimary, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  ruleCard: { backgroundColor: t.ruleBg, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: t.ruleLabel, borderWidth: 1, borderColor: t.ruleBorder },
  ruleLabel: { color: t.ruleLabel, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  ruleText: { color: t.ruleText, fontSize: 15, lineHeight: 22 },
  shareBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderStrong, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  complexityBadge: { alignSelf: 'flex-start', backgroundColor: t.warnBg, borderWidth: 1, borderColor: t.warn, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  complexityText: { color: t.warn, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  faqSection: { marginHorizontal: 16, marginTop: 4, marginBottom: 12, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border },
  faqHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  faqHeading: { color: t.textPrimary, fontSize: 14, fontWeight: '800' },
  faqHeadingChevron: { color: t.textSecondary, fontSize: 13, fontWeight: '800' },
  faqItem: { borderTopWidth: 1, borderTopColor: t.border },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  faqQ: { color: t.textSecondary, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 19 },
  faqChevron: { color: t.accentText, fontSize: 18, fontWeight: '800', width: 18, textAlign: 'center' },
  faqAnswerBox: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2 },
  faqAnswer: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
  faqThinking: { color: t.textMuted, fontSize: 13, fontStyle: 'italic' },
  faqMoreBtn: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: t.border },
  faqMoreText: { color: t.accentText, fontSize: 13, fontWeight: '700' },
  followUpSection: { marginTop: 8, paddingHorizontal: 16 },
  followUpTitle: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  chipsWrap: { gap: 8 },                          // column of rows; 8px gap between the two rows
  chipRow: { flexDirection: 'row', gap: 8 },      // two chips per row, 8px gap between them
  chip: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  chipActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  chipText: { color: t.textPrimary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: t.accentText },
  askHint: { color: t.textMuted, fontSize: 12, lineHeight: 16, marginTop: 12 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  askInput: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: t.textPrimary, fontSize: 14 },
  askSend: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  askSendDisabled: { backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
  askSendText: { color: t.onAccent, fontSize: 18, fontWeight: '900' },
  thinkingRow: { marginTop: 16, alignItems: 'center' },
  thinkingText: { color: t.textMuted, fontSize: 13, fontStyle: 'italic' },
  answerCard: { marginTop: 16, padding: 16, backgroundColor: t.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: t.border },
  answerHeader: { color: t.accentText, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  answerText: { color: t.textSecondary, fontSize: 15, lineHeight: 23 },
});