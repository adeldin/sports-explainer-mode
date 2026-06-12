import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, FlatList,
  RefreshControl, Animated, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';

// Components
import GameCard from './components/GameCard';
import SettingsScreen from './components/SettingsScreen';
import EmptyState from './components/EmptyState';
import Onboarding from './components/Onboarding';
import ShareCard from './components/ShareCard';
import MorphCinematic from './components/MorphCinematic';

// Libs
import { fetchExplanation, askQuestion, Sport, Level, ExplanationResponse } from './lib/api';
import { registerForPushNotificationsAsync } from './lib/notifications';

// Prevent the native splash from hiding automatically
SplashScreen.preventAutoHideAsync();

const SPORTS = [
  { key: 'mlb' as Sport, emoji: '⚾', label: 'MLB' },
  { key: 'nhl' as Sport, emoji: '🏒', label: 'NHL' },
  { key: 'nba' as Sport, emoji: '🏀', label: 'NBA' },
  { key: 'nfl' as Sport, emoji: '🏈', label: 'NFL' },
];

const FOLLOW_UPS = [
  '🤔 Why did that matter?',
  '📜 Explain the rule',
  '👋 Explain like I\'m new',
  '👀 What to watch for next?',
];

const ESPN_APIS: Record<string, string> = {
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
};

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
  isLive: boolean;
  sport: string;
}

export default function App() {
  // --- State ---
  const [appReady, setAppReady] = useState(false);
  const [isAnimationComplete, setAnimationComplete] = useState(false);
  const [seenCinematic, setSeenCinematic] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sport, setSport] = useState<Sport>('mlb');
  const [level, setLevel] = useState<Level>('beginner');
  const [autoRefresh, setAutoRefresh] = useState(true);
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // --- Refs ---
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shareRef = useRef<ViewShot>(null);
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
    try {
      const res = await fetch(ESPN_APIS[sport]);
      const data = await res.json();
      const parsed: Game[] = (data?.events || []).map((e: any) => {
        const comp = e.competitions?.[0];
        const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
        const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
        return {
          id: e.id,
          homeTeam: home?.team?.abbreviation || '?',
          awayTeam: away?.team?.abbreviation || '?',
          homeScore: home?.score || '0',
          awayScore: away?.score || '0',
          status: e.status?.type?.shortDetail || '',
          isLive: e.status?.type?.state === 'in',
          sport,
        };
      });

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
      const data = await fetchExplanation(sport, level, selectedGameId);
      setResult(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      fadeIn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport, level, selectedGameId]);

  const handleSportChange = async (s: Sport) => {
    if (s === sport) return;
    await Haptics.selectionAsync();
    setSport(s);
    setSelectedGameId(null);
    setResult(null);
    setGames([]);
  };

  const toggleFavorite = async (teamAbbr: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFavs = favorites.includes(teamAbbr)
      ? favorites.filter(f => f !== teamAbbr)
      : [...favorites, teamAbbr];
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorite_teams', JSON.stringify(newFavs));
  };

  const handleShare = async () => {
    if (!shareRef.current || !result) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await (shareRef.current as any).capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share The Smart Play' });
    } catch (e) { console.error('Share failed:', e); }
  };

  const handleFollowUp = async (question: string) => {
    if (!result) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveChip(question);
    setFollowUpLoading(true);
    setFollowUpAnswer(null);
    try {
      const context = `${result.simple} ${result.whyItMatters || ''}`;
      const answer = await askQuestion(question, sport, level, context);
      setFollowUpAnswer(answer);
    } catch {
      setFollowUpAnswer('Could not get an answer. Try again.');
    } finally {
      setFollowUpLoading(false);
    }
  };

// --- Effects ---
useEffect(() => {
  async function init() {
    try {
      await SplashScreen.hideAsync();

      const [onboarding, favs, notify, seenCine] = await Promise.all([
        AsyncStorage.getItem('onboarding_complete'),
        AsyncStorage.getItem('favorite_teams'),
        AsyncStorage.getItem('notifications_enabled'),
        AsyncStorage.getItem('seen_cinematic'),
      ]);

      if (favs) setFavorites(JSON.parse(favs));
      if (notify !== null) setNotificationsEnabled(notify === 'true');
      if (seenCine === 'true') setSeenCinematic(true);

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
      if (gameId) setSelectedGameId(gameId);
    });
  });

  return () => {
    if (notificationListener.current) notificationListener.current.remove();
    if (responseListener.current) responseListener.current.remove();
  };
}, [onboardingComplete, notificationsEnabled]);

  useEffect(() => { fetchGames(); }, [sport, favorites]);
  useEffect(() => { if (selectedGameId) handleFetch(); }, [selectedGameId, level]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => { fetchGames(); handleFetch(true); }, 60000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, sport, level, selectedGameId]);

  // --- Conditional Returns (The Gatekeepers) ---
  if (!appReady || onboardingComplete === null) return null;

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
    return <Onboarding onComplete={(l, s) => { setLevel(l); setSport(s); setOnboardingComplete(true); }} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏆 Sports Explainer</Text>
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

        {/* Sport Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportTabsContent}>
            {SPORTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sportTab, sport === s.key && styles.sportTabActive]}
                onPress={() => handleSportChange(s.key)}>
                <Text style={styles.sportEmoji}>{s.emoji}</Text>
                <Text style={[styles.sportLabel, sport === s.key && styles.sportLabelActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await fetchGames();
                await handleFetch(true);
              }}
              tintColor="#ffffff"
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
                        'Favorite a Team',
                        'Which team do you want to follow?',
                        [
                          { text: game.awayTeam, onPress: () => toggleFavorite(game.awayTeam) },
                          { text: game.homeTeam, onPress: () => toggleFavorite(game.homeTeam) },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                  />
                )}
              />
            </View>
          ) : !loading ? <EmptyState sport={sport} reason="no-games" /> : null}

          {loading && !result ? (
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: '60%', height: 20 }]} />
              <View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12 }]} />
            </View>
          ) : result ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              <ViewShot ref={shareRef} options={{ format: 'png', quality: 1.0 }} style={styles.hiddenCard}>
                <ShareCard gameContext={result.gameContext || 'Live Game'} rawPlay={result.rawPlay || result.playType || 'Latest Play'} simple={result.simple} whyItMatters={result.whyItMatters} sport={sport} />
              </ViewShot>

              {/* Explanation Card */}
              <View style={styles.explanationCard}>
                <Text style={styles.explanationLabel}>🎙️ THE PLAY</Text>
                <View style={styles.explanationHeader}>
                  <Text style={styles.playPillText}>▶ {result.rawPlay || result.playType || 'Latest Play'}</Text>
                  {lastUpdated && <Text style={styles.contextTime}>Updated {lastUpdated}</Text>}
                </View>
                {result.complexity === 'high' && (
                  <View style={styles.complexityBadge}>
                    <Text style={styles.complexityText}>⚡ COMPLEX PLAY</Text>
                  </View>
                )}
                <Text style={styles.explanationText}>{result.simple}</Text>
              </View>

              {/* Why It Matters */}
              {result.whyItMatters && (
                <View style={styles.insightCard}>
                  <Text style={styles.insightLabel}>💡 WHY IT MATTERS</Text>
                  <Text style={styles.insightText}>{result.whyItMatters}</Text>
                </View>
              )}

              {/* Rule Detail */}
              {result.ruleDetail && result.showRule && (
                <View style={styles.ruleCard}>
                  <Text style={styles.ruleLabel}>📜 THE RULE</Text>
                  <Text style={styles.ruleText}>{result.ruleDetail}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.shareBtnText}>↑ Share The Smart Play</Text>
              </TouchableOpacity>

              {/* Follow-up Chips */}
              <View style={styles.followUpSection}>
                <Text style={styles.followUpTitle}>Ask a follow-up</Text>
                <View style={styles.chipsWrap}>
                  {FOLLOW_UPS.map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[styles.chip, activeChip === q && styles.chipActive]}
                      onPress={() => handleFollowUp(q)}
                      disabled={followUpLoading}>
                      <Text style={[styles.chipText, activeChip === q && styles.chipTextActive]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {followUpLoading && (
                  <View style={styles.thinkingRow}>
                    <Text style={styles.thinkingText}>Thinking...</Text>
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
          ) : !loading ? <EmptyState sport={sport} reason="select-game" /> : null}
        </ScrollView>
      </SafeAreaView>

      <SettingsScreen
        visible={showSettings}
        level={level}
        autoRefresh={autoRefresh}
        notificationsEnabled={notificationsEnabled}
        onClose={() => setShowSettings(false)}
        onLevelChange={(l) => { setLevel(l); setShowSettings(false); }}
        onAutoRefreshChange={setAutoRefresh}
        onNotificationsToggle={async (val) => {
          setNotificationsEnabled(val);
          await AsyncStorage.setItem('notifications_enabled', val ? 'true' : 'false');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: '#ff3b3033' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff3b30' },
  livePillText: { color: '#ff3b30', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cogBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  cogIcon: { fontSize: 18 },
  tabsContainer: { height: 70, marginBottom: 10 },
  sportTabsContent: { paddingHorizontal: 16, gap: 8 },
  sportTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', minWidth: 64 },
  sportTabActive: { backgroundColor: '#001133', borderColor: '#0055ff' },
  sportEmoji: { fontSize: 20 },
  sportLabel: { color: '#666', fontSize: 11, fontWeight: '700', marginTop: 2 },
  sportLabelActive: { color: '#4488ff' },
  gameStripContainer: { paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  skeleton: { padding: 20, marginHorizontal: 16, backgroundColor: '#111', borderRadius: 16 },
  skeletonLine: { backgroundColor: '#1a1a1a', borderRadius: 6 },
  explanationCard: { backgroundColor: '#0a0a1a', borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#ffffff22', borderWidth: 1, borderColor: '#1a1a2e' },
  explanationLabel: { color: '#888', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  explanationHeader: { flexDirection: 'column', marginBottom: 12, gap: 4 },
  explanationText: { color: '#f0f0f0', fontSize: 17, lineHeight: 26 },
  contextTime: { color: '#444', fontSize: 11 },
  playPillText: { color: '#888', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  insightCard: { backgroundColor: '#00112a', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#0055ff', borderWidth: 1, borderColor: '#001a44' },
  insightLabel: { color: '#4488ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  insightText: { color: '#aac4ff', fontSize: 15, lineHeight: 22 },
  ruleCard: { backgroundColor: '#001a0d', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#34C759', borderWidth: 1, borderColor: '#003319' },
  ruleLabel: { color: '#34C759', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  ruleText: { color: '#a0ffb8', fontSize: 15, lineHeight: 22 },
  hiddenCard: { position: 'absolute', top: -9999, left: -9999, opacity: 0 },
  shareBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  complexityBadge: { alignSelf: 'flex-start', backgroundColor: '#1a0a00', borderWidth: 1, borderColor: '#ff6b00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  complexityText: { color: '#ff6b00', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  followUpSection: { marginTop: 8, paddingHorizontal: 16 },
  followUpTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  chipActive: { backgroundColor: '#001133', borderColor: '#0055ff' },
  chipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#4488ff' },
  thinkingRow: { marginTop: 16, alignItems: 'center' },
  thinkingText: { color: '#444', fontSize: 13, fontStyle: 'italic' },
  answerCard: { marginTop: 16, padding: 16, backgroundColor: '#0a0a0a', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a1a' },
  answerHeader: { color: '#4488ff', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  answerText: { color: '#bbb', fontSize: 15, lineHeight: 23 },
});