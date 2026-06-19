import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, FlatList,
  RefreshControl, Animated, Alert,
  TextInput, KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Components
import GameCard from '../components/GameCard';
import EmptyState from '../components/EmptyState';
import ShareCard from '../components/ShareCard';
import PastPlays from '../components/PastPlays';

// Libs
import { fetchExplanation, askQuestion, Sport, Level, Language, ExplanationResponse } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { SPORT_FAQS } from '../lib/faqs';
import { UI_STRINGS } from '../lib/strings';
import { SPORTS, isOffSeason, SPORT_FULL_NAME } from '../lib/sports';
import { useAppState } from '../lib/appState';

// SPORTS now lives in ./lib/sports (shared with the onboarding picker).

// Per-sport localized display-name key (acronyms like MLB/NBA aren't here — they
// fall back to s.label in render). Keyed by Sport for the tab + picker labels.
const SPORT_NAME_KEY: Partial<Record<Sport, keyof (typeof UI_STRINGS)['en']>> = {
  soccer: 'spSoccer', worldcup: 'spWorldCup', rugby: 'spRugby',
  wnba: 'spWnba', epl: 'spPremierLeague', laliga: 'spLaLiga', mlr: 'spMlr',
};

// (follow-up chips are built per-language in render — see `followUps`)

// ESPN config per sport. `core` sports (rugby) are NOT on the normal scoreboard
// API and need the two-step Core-API $ref fetch. Leagues match the backend so
// the gameId we send is found server-side.
const SPORT_CONFIG: Record<Sport, { espnSport?: string; league?: string; core?: boolean; learnMode?: boolean }> = {
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
  // Learn Mode sports — tennis/golf fetch tournament context; cricket has no data source.
  tennis: { espnSport: 'tennis', league: 'atp', learnMode: true },
  golf: { espnSport: 'golf', league: 'pga', learnMode: true },
  cricket: { learnMode: true },
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

// Shared state now comes from AppStateProvider via useAppState(). `initialSport`
// (the onboarding pick) seeds the Live tab's local selection once on mount.
// `navigation` is the bottom-tab navigation (the Academy CTA jumps to the Academy
// tab, optionally passing the current sport so it opens the matching category).
interface LiveScreenProps {
  initialSport: Sport;
  navigation: { navigate: (name: string, params?: { sport?: Sport }) => void };
}

export default function LiveScreen({ initialSport, navigation }: LiveScreenProps) {
  // --- Shared state (owned by AppStateProvider) ---
  const { language, level, autoRefresh, favorites, setFavorites, orderedSports, sportVisibility } = useAppState();

  // --- State (Live-local) ---
  const [sport, setSport] = useState<Sport>(initialSport);
  const [learnContext, setLearnContext] = useState<string | null>(null); // tennis/golf tournament info
  const [gamesFetched, setGamesFetched] = useState(false); // true once a live-sport fetch completes

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
  // Learn Mode = explicit Learn sport (tennis/golf/cricket) OR an off-season Live sport.
  // Both show the educational state (no PLAY card; ask box + FAQ).
  const offSeason = isOffSeason(sport);
  // Learn/Academy state: explicit Learn sport, off-season, OR a fetch came back empty
  // (covers a season that ended mid-window, e.g. NBA/NHL in June).
  const learnMode = SPORT_CONFIG[sport]?.learnMode === true || offSeason || (gamesFetched && games.length === 0);
  // Distinguish "season just ended" (in-window Live sport, fetched empty) from
  // off-season / explicit Learn sports — drives the EmptyState message.
  const seasonEnded = gamesFetched && games.length === 0 && !offSeason && SPORT_CONFIG[sport]?.learnMode !== true;
  // Sports shown in the tab bar: ordered, minus any hidden in My Sports (missing key = visible).
  const visibleSports = orderedSports.filter(s => sportVisibility[s.key] !== false);

  // --- Refs ---
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shareRef = useRef<ViewShot>(null);
  // Guards the onLayout-gated capture so it fires exactly once per share session.
  const captureInProgress = useRef(false);

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
    // Learn Mode (explicit tennis/golf/cricket) or an off-season Live sport: no
    // head-to-head games. Tennis/golf fetch the current tournament for the card;
    // cricket / off-season have no card (EmptyState shows the right message).
    if (cfg.learnMode || isOffSeason(sport)) {
      setGames([]);
      setSelectedGameId(null);
      setResult(null);
      setLearnContext(null);
      if (cfg.learnMode && cfg.espnSport && cfg.league) {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard`);
          const data = await res.json();
          const ev = data?.events?.[0];
          if (ev) {
            if (sport === 'golf') {
              const comp = ev.competitions?.[0];
              const sorted = (comp?.competitors || []).slice().sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));
              const leader = sorted[0];
              setLearnContext(leader?.athlete?.displayName ? `${ev.name} — ${leader.athlete.displayName} (${leader.score})` : ev.name);
            } else {
              setLearnContext(ev.status?.type?.shortDetail ? `${ev.name} — ${ev.status.type.shortDetail}` : ev.name);
            }
          }
        } catch { /* leave null → EmptyState shows "no tournaments this week" */ }
      }
      return;
    }
    setLearnContext(null);
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
        // Rugby: Core-API two-step — list event $refs for the next 7 days, then
        // resolve + dedup. A single-date query misses upcoming finals (and ESPN's
        // single-day matching is unreliable); the range form is what it answers.
        const today = new Date();
        const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
        const start = fmt(today);
        const end = fmt(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
        const evRes = await fetch(
          `https://sports.core.api.espn.com/v2/sports/${cfg.espnSport}/leagues/${cfg.league}/events?dates=${start}-${end}`,
        );
        const evData = await evRes.json();
        const items: any[] = (evData.items || []).slice(0, 25);
        const resolvedEvents = (await Promise.all(
          items.map(async (it: any) => {
            try {
              const r = await fetch(it.$ref);
              return await r.json();
            } catch {
              return null;
            }
          }),
        )).filter(Boolean);
        // Dedup by event ID — ESPN can list the same fixture twice.
        const seen = new Set<string>();
        const uniqueEvents = resolvedEvents.filter((ev: any) => {
          if (seen.has(ev.id)) return false;
          seen.add(ev.id);
          return true;
        });

        // Core API competitors carry $ref pointers for team + score (the Site API
        // inlines them). Resolve those refs so each competitor matches the Site
        // shape and toGame needs no changes. Each fetch is bounded by a 3s timeout
        // and falls back to '?'/'0' on failure instead of crashing the whole list.
        const fetchRef = async (url: string): Promise<any> => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 3000);
          try {
            const r = await fetch(url, { signal: ctrl.signal });
            if (!r.ok) throw new Error(`ref ${r.status}`);
            return await r.json();
          } finally {
            clearTimeout(t);
          }
        };
        const expandCompetitor = async (c: any): Promise<any> => {
          let team = c?.team;
          let score = c?.score;
          const jobs: Promise<void>[] = [];
          if (team?.$ref && !team.abbreviation) {
            jobs.push(fetchRef(team.$ref).then(t => { team = t; }).catch(() => { team = undefined; }));
          }
          if (score?.$ref && !score.displayValue) {
            jobs.push(fetchRef(score.$ref).then(s => { score = s; }).catch(() => { score = undefined; }));
          }
          await Promise.all(jobs);
          return { ...c, team, score };
        };
        const expandEvent = async (ev: any): Promise<any> => {
          const comp = ev.competitions?.[0];
          if (!comp?.competitors) return ev;
          const competitors = await Promise.all(comp.competitors.map(expandCompetitor));
          return { ...ev, competitions: [{ ...comp, competitors }, ...ev.competitions.slice(1)] };
        };
        const expandedEvents = await Promise.all(uniqueEvents.map(expandEvent));
        parsed = expandedEvents.map(toGame);
      } else {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard`,
        );
        const data = await res.json();
        // Belt-and-suspenders: drop completed games older than 24h so a stale
        // scoreboard can't surface last season's results even if isOffSeason misses.
        const now = Date.now();
        parsed = (data?.events || [])
          .filter((e: any) => {
            const isFinal = e.status?.type?.state === 'post';
            const ageMs = e.date ? now - new Date(e.date).getTime() : 0;
            return !(isFinal && ageMs > 24 * 60 * 60 * 1000);
          })
          .map(toGame);

        // End-of-season guard (date-aware): clear the list only when ESPN returns
        // nothing live/upcoming AND no game dated today-or-later — i.e. genuinely
        // past completed games. Daily sports (MLB) briefly show today's whole slate
        // as `post` between games; those are dated today/future, so we keep them.
        const todayStr = new Date().toISOString().slice(0, 10);
        const hasCurrent = (data?.events || []).some((e: any) => {
          const st = e.status?.type?.state;
          if (st === 'in' || st === 'pre') return true;
          return (e.date || '').slice(0, 10) >= todayStr;
        });
        if (!hasCurrent && parsed.length > 0) {
          parsed = [];
        }
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
      setGamesFetched(true); // a real fetch completed — empty now means season ended / no games
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
    setGamesFetched(false); // new sport — don't flash Academy until its fetch resolves
  };

  // If My Sports (Settings tab) hides the currently-selected sport, switch to the
  // first visible one. orderedSports/sportVisibility flow in as props from App.
  useEffect(() => {
    if (sportVisibility[sport] === false) {
      const firstVisible = orderedSports.find(s => sportVisibility[s.key] !== false);
      if (firstVisible) handleSportChange(firstVisible.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportVisibility, orderedSports]);

  // Free-text ask box (input + thinking + answer). Reused by the Live-mode
  // play card and the off-season educational state, with a mode-specific
  // placeholder. Routes through handleAsk (context-less when there's no play).
  const renderAskBox = (placeholder: string) => (
    <>
      <View style={styles.askRow}>
        <TextInput
          style={styles.askInput}
          value={askText}
          onChangeText={setAskText}
          placeholder={placeholder}
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
    </>
  );

  const toggleFavorite = async (teamAbbr: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFavs = favorites.includes(teamAbbr)
      ? favorites.filter(f => f !== teamAbbr)
      : [...favorites, teamAbbr];
    // Persistence is handled by AppStateProvider's auto-persist effect (single
    // source of truth for favorites) — just update shared state here.
    setFavorites(newFavs);
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
          <View>
            <Text style={styles.headerTitle}>Sports<Text style={styles.headerTitleAccent}>wise</Text></Text>
            <Text style={styles.headerTagline}>Watch and ask why.</Text>
          </View>
          <View style={styles.headerRight}>
            {games.length > 0 ? (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Sport Tabs — visible sports in saved order (customize in Settings › My Sports). */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportTabsContent}>
            {visibleSports.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sportTab, sport === s.key && styles.sportTabActive]}
                onPress={() => handleSportChange(s.key)}>
                <Text style={styles.sportEmoji}>{s.emoji}</Text>
                <Text style={[styles.sportLabel, sport === s.key && styles.sportLabelActive]}>
                  {SPORT_NAME_KEY[s.key] ? S[SPORT_NAME_KEY[s.key]!] : s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
          ) : learnMode && learnContext ? (
            <View style={styles.tournamentCard}>
              <Text style={styles.tournamentText}>🏆 {learnContext}</Text>
            </View>
          ) : !loading ? <EmptyState sport={sport} reason="no-games" language={language} seasonEnded={seasonEnded} /> : null}

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
                {renderAskBox(S.askPlaceholder)}
              </View>
            </Animated.View>
          ) : learnMode ? (
            <View style={styles.learnBlock}>
              <TouchableOpacity
                style={styles.learnCtaPill}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('Academy', { sport });
                }}
                activeOpacity={0.7}>
                <Text style={styles.learnCtaPillText}>Test your knowledge in the Academy →</Text>
              </TouchableOpacity>
              <Text style={styles.learnExplainer}>{learnContext ? S.learnModeFollowAlong : S.learnModeExplainer}</Text>
              <View style={styles.learnAskCard}>
                <Text style={styles.learnPrompt}>
                  {S.askLearnPlaceholder.replace('{sport}', S[SPORT_FULL_NAME[sport]]).replace('…', '')}
                </Text>
                {renderAskBox(S.askLearnPlaceholder.replace('{sport}', S[SPORT_FULL_NAME[sport]]))}
              </View>
            </View>
          ) : !loading ? <EmptyState sport={sport} reason="select-game" language={language} /> : null}

          {/* Common Questions — per-sport FAQ. Secondary/educational, so it lives at
              the bottom; collapsed by default. */}
          <View style={styles.faqSection}>
            <TouchableOpacity style={styles.faqHeadingRow} onPress={() => setFaqSectionOpen(v => !v)} activeOpacity={0.7}>
              <Text style={styles.faqHeading}>{SPORT_FAQS[sport].label[language]}</Text>
              <Text style={styles.faqHeadingChevron}>{(faqSectionOpen || learnMode) ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {(faqSectionOpen || learnMode) && (
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
  headerTagline: { color: t.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.liveSoftBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: t.live + '33' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.live },
  livePillText: { color: t.live, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
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
  explanationCard: { backgroundColor: t.explanationBg, borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: t.stripe, borderWidth: 1, borderColor: t.border },
  explanationLabel: { color: t.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  explanationHeader: { flexDirection: 'column', marginBottom: 12, gap: 4 },
  explanationText: { color: t.textPrimary, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  contextTime: { color: t.textMuted, fontSize: 11 },
  playPillText: { color: t.textSecondary, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  insightCard: { backgroundColor: t.insightBg, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: t.accent, borderWidth: 1, borderColor: t.insightBorder },
  insightLabel: { color: t.insightLabel, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  insightText: { color: t.textPrimary, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  ruleCard: { backgroundColor: t.ruleBg, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: t.ruleLabel, borderWidth: 1, borderColor: t.ruleBorder },
  ruleLabel: { color: t.ruleLabel, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  ruleText: { color: t.ruleText, fontSize: 15, lineHeight: 22 },
  shareBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderStrong, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  complexityBadge: { alignSelf: 'flex-start', backgroundColor: t.warnBg, borderWidth: 1, borderColor: t.warn, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  complexityText: { color: t.warn, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  faqSection: { marginHorizontal: 16, marginTop: 4, marginBottom: 16, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border },
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
  // Carded to match the other sections (was a bare padded block that ran into Share above).
  followUpSection: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border },
  followUpTitle: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  // Off-season educational ask block
  learnBlock: { marginTop: 8, paddingHorizontal: 16 },
  learnAskCard: { marginTop: 8, padding: 16, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border },
  learnPrompt: { color: t.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  // Header status chip (small).
  // Empty-state body CTA (enlarged, full-width, centered).
  learnCtaPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', backgroundColor: t.accent + '22', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: t.accent + '55' },
  learnCtaPillText: { color: t.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
  learnBadge: { alignSelf: 'flex-start', backgroundColor: t.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  learnBadgeText: { color: t.onAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  learnExplainer: { color: t.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  tournamentCard: { marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  tournamentText: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
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