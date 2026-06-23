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
import WatchNextCard from '../components/WatchNextCard';
import PlayCard, { QAItem } from '../components/PlayCard';
import { derivePlayKey } from '../lib/playKey';

// Libs
import { fetchExplanation, askQuestion, Sport, Level, Language, ExplanationResponse } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { SPORT_FAQS } from '../lib/faqs';
import { UI_STRINGS } from '../lib/strings';
import { Game, SPORT_CONFIG, fetchScoreboard } from '../lib/scoreboard';
import { WatchCandidate, gatherWatchCandidates, selectWatchNext, parentSport } from '../lib/watchNext';
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

// SPORT_CONFIG + the Game type + the scoreboard→Game[] fetch now live in
// lib/scoreboard.ts (extracted so Watch Next can reuse the same fetcher).

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
  // Live Q&A (Phase 2): an ordered list, not a single slot — chip taps + free-text asks
  // each append an item that renders as a layer in the PlayCard (live/final), or inline
  // under the ask box (learn-mode, where there's no card). Per-item loading/error status.
  const [answers, setAnswers] = useState<QAItem[]>([]);
  const [askText, setAskText] = useState('');
  const anyLoading = answers.some(a => a.status === 'loading');
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

  // Glossary tap-to-define now lives inside PlayCard (which owns its open-term state).

  // --- Watch Next (end-of-game recommendation) ---
  const [watchNext, setWatchNext] = useState<WatchCandidate | null>(null);

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
  // The selected game + its ESPN state. We only explain LIVE ('in') or FINAL ('post')
  // games — a scheduled ('pre') game has no play yet, so no explanation fetch and no
  // PlayCard (just the "hasn't started" state below). `state` is undefined until the
  // game is in `games`.
  const selectedGame = games.find(g => g.id === selectedGameId);
  const selectedGameState = selectedGame?.state;
  const isExplainable = selectedGameState === 'in' || selectedGameState === 'post';
  // Sports shown in the tab bar: ordered, minus any hidden in My Sports (missing key = visible).
  const visibleSports = orderedSports.filter(s => sportVisibility[s.key] !== false);

  // --- Refs ---
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shareRef = useRef<ViewShot>(null);
  // Guards the onLayout-gated capture so it fires exactly once per share session.
  const captureInProgress = useRef(false);
  // Watch Next: the gameId we've already gathered a recommendation for (so a 60s
  // refresh of a final game doesn't re-gather), + a bumpable request token so a
  // superseded gather (user switched games/sports) writes nothing.
  const watchNextForGameRef = useRef<string | null>(null);
  const watchNextReqRef = useRef(0);
  // Live Q&A: monotonic id source (no Date.now()/random), + the play identity of the
  // currently-loaded explanation so a 60s refresh of the SAME play keeps answers while a
  // genuinely new play clears them ("fresh play, fresh card").
  const qaIdRef = useRef(0);
  const lastPlayKeyRef = useRef<string>('');

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
  // `isCancelled` lets the calling effect discard this response if the user has since
  // switched sport/context (see the effects below). Defaults to never-cancelled so
  // non-effect callers (pull-to-refresh, auto-refresh) behave exactly as before.
  const fetchGames = useCallback(async (isCancelled: () => boolean = () => false) => {
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
          if (isCancelled()) return; // superseded by a newer sport switch — don't commit
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
      // A real fetch completed (even if there are no head-to-head games): mark fetched so
      // the Live Now trigger's `noLiveContent` (gamesFetched && games.length === 0) can fire
      // on offseason AND learn-mode sports. Set after the cancellation-guarded learn fetch.
      setGamesFetched(true);
      return;
    }
    setLearnContext(null);
    try {
      const parsed = await fetchScoreboard(sport, isCancelled);
      // Favorites-first ordering is a LiveScreen preference (depends on `favorites`),
      // so it stays here rather than in the shared fetcher.
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
      if (isCancelled()) return; // superseded by a newer sport switch — discard this response
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

  // `isCancelled` (first arg) lets the calling effect discard a superseded response.
  // Defaults to never-cancelled so the refresh callers below behave as before.
  const handleFetch = useCallback(async (isCancelled: () => boolean = () => false, isRefresh = false) => {
    if (!selectedGameId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchExplanation(sport, level, selectedGameId, language);
      if (isCancelled()) return; // superseded — don't commit a stale explanation
      // Fresh play, fresh card: clear live Q&A only when the play genuinely changed. A
      // same-play 60s refresh keeps the same key, so answers persist (matches the
      // PlayCard context-key, which excludes result/lastUpdated and so doesn't remount).
      const playKey = derivePlayKey(data.rawPlay, data.playType);
      if (playKey !== lastPlayKeyRef.current) {
        setAnswers([]);
        lastPlayKeyRef.current = playKey;
      }
      setResult(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      fadeIn();
    } catch (e) {
      if (isCancelled()) return; // superseded — don't land a stale error either
      console.error(e);
    } finally {
      // Clear loading/refreshing UNCONDITIONALLY. The isCancelled guards above already
      // prevent stale DATA from landing; loading is owned by the effect/context (see
      // the explanation effect's !selectedGameId branch), so a fetch always clearing
      // its own spinner here can't strand it — even when cancelled.
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
    setLoading(false); // start the switch from a clean loading state (no stranded skeleton)
    setGamesFetched(false); // new sport — don't flash Academy until its fetch resolves
  };

  // Open a Watch Next recommendation. A cross-sport (discovery) jump reuses
  // handleSportChange — the SAME reset path the race-condition + stale-ask fixes rely
  // on (clears result/games/loading and the [sport,level,language] effect clears the
  // ask answer) — so discovery can't reintroduce a stale-state bug. Same-sport just
  // reselects. Either way setSelectedGameId drives the explanation fetch.
  const openWatchNext = (rec: WatchCandidate) => {
    setWatchNext(null);
    if (rec.sport !== sport) {
      handleSportChange(rec.sport); // async; fire-and-forget — state updates queue
    } else {
      Haptics.selectionAsync();
    }
    setSelectedGameId(rec.gameId);
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

  // Free-text ask box. TYPED answers (source 'ask') always render inline beneath the box —
  // that's where the user's attention is. Chip answers (source 'chip') render as PlayCard
  // layers instead (handled there). Routes through handleAsk (context-less when no play).
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
          editable={!anyLoading}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.askSend, (!askText.trim() || anyLoading) && styles.askSendDisabled]}
          onPress={handleAsk}
          disabled={!askText.trim() || anyLoading}>
          <Text style={[styles.askSendText, (!askText.trim() || anyLoading) && { color: theme.textMuted }]}>↑</Text>
        </TouchableOpacity>
      </View>
      {answers.filter(a => a.source === 'ask').map(a => (
        <View key={a.id} style={styles.answerCard}>
          <Text style={styles.answerHeader}>{a.question}</Text>
          {a.status === 'loading'
            ? <Text style={styles.thinkingText}>{S.thinking}</Text>
            : <Text style={styles.answerText}>{a.answer}</Text>}
        </View>
      ))}
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

  const handleFollowUp = async (question: string, source: 'chip' | 'ask') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = ++qaIdRef.current;
    setAnswers(prev => [...prev, { id, question, answer: null, status: 'loading', source }]);
    try {
      // Play-grounded when an explanation is loaded; context-less otherwise (gameless
      // states — off-season, or rugby/MLR with no games) so general questions like
      // "how long is a rugby match?" still get a sport+level answer, like Academy/FAQ.
      const context = result ? `${result.simple} ${result.whyItMatters || ''}` : '';
      const answer = await askQuestion(question, sport, level, context, language);
      setAnswers(prev => prev.map(a => (a.id === id ? { ...a, answer, status: 'done' } : a)));
    } catch {
      setAnswers(prev => prev.map(a => (a.id === id ? { ...a, answer: S.answerError, status: 'error' } : a)));
    }
  };

  const handleAsk = async () => {
    const q = askText.trim();
    if (!q || anyLoading) return;
    Keyboard.dismiss();
    setAskText('');
    await handleFollowUp(q, 'ask'); // same context-grounded path as chips; typed answers render inline
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
  // Each fetch owns a cancellation flag: if sport/context changes before the response
  // lands, the cleanup flips `cancelled` true and the resolved fetch bails before any
  // setState — so a slow earlier-sport response can't overwrite the current state.
  useEffect(() => {
    let cancelled = false;
    fetchGames(() => cancelled);
    return () => { cancelled = true; };
  }, [sport, favorites]);
  useEffect(() => {
    // Only LIVE/FINAL games have a play to explain. For no selection or a scheduled
    // ('pre') game: no fetch, and clear any prior result so a stale PlayCard from the
    // previous (live) game/sport can't linger. Re-fires on a pre→in transition because
    // `isExplainable` is a dep. (Game state comes from `games`, set with selectedGameId.)
    // Fresh context (game / level / language / explainability) → clear live Q&A so a
    // prior game's answers can't linger under a new card. The 60s same-play refresh does
    // NOT pass through this effect (it calls handleFetch directly), so its persistence is
    // governed solely by handleFetch's playKey gate.
    setAnswers([]);
    if (!selectedGameId || !isExplainable) { setResult(null); setLoading(false); return; }
    let cancelled = false;
    handleFetch(() => cancelled);
    return () => { cancelled = true; };
  }, [selectedGameId, level, language, isExplainable]);
  // Cached FAQ answers are specific to sport/level/language — reset when they change.
  useEffect(() => {
    setActiveFaq(null); setFaqAnswers({}); setFaqExpanded(false);
    // Ask/follow-up answers are sport+level+language-specific — clear them here too so
    // a previous sport's answer can't linger under the new sport's ask box. (Gameless
    // switches never run handleFetch, the only other place these reset.) Also drop the
    // tracked play identity — a new sport has no prior play.
    setAnswers([]); setAskText(''); lastPlayKeyRef.current = '';
  }, [sport, level, language]);
  // FAQ default-open is derived from STATE, not pinned: open by default in learn-mode/
  // no-games (it's the primary content there) but still collapsible, closed by default in
  // game states. Keyed on [sport, learnMode] so the default re-applies on sport switch AND
  // catches the async-settle case (URC: learnMode flips true only after the empty fetch
  // lands). A genuine mid-session learnMode flip re-applies the default — intended, since
  // the screen's nature changed. Within a settled sport, neither dep changes, so the user's
  // manual toggle persists.
  useEffect(() => { setFaqSectionOpen(learnMode); }, [sport, learnMode]);
  // (Glossary open-state + PlayCard layer state reset via PlayCard's context `key`
  // below — keyed on sport|game|level|language — so no separate effect is needed.)

  // Dual-trigger Watch Next / Live Now. One effect, one pick. The trigger + its params
  // are derived from the current state and folded into a composite dedup key so each
  // distinct context gathers exactly once (the ref guards re-gather on the 60s refresh —
  // no new polling loop):
  //   A)  final game selected                     → "Watch Next" (👀): same-sport allowed; exclude only the finished game.
  //   B1) scheduled game + sport HAS a live game   → "Watch Next": point at the same-sport live game.
  //   B2) scheduled game + NO live in sport        → "Live Now" (🔴): exclude the whole sport (cross-sport).
  //   B3) no games / off-season                    → "Live Now": exclude the whole sport (cross-sport).
  // No trigger active (a live/explainable game) → clear the card. The request token makes
  // a superseded gather (user switched games/sports) a no-op (cancellation-safe).
  useEffect(() => {
    const selGame = games.find(g => g.id === selectedGameId);
    const state = selGame?.state;
    const hasLiveInSport = games.some(g => g.state === 'in');
    const noLiveContent = gamesFetched && games.length === 0;

    let key: string | null = null;
    let excludeCurrentSport = false;
    let excludeGameId = '';
    if (selGame && state === 'post') {
      key = `post:${selectedGameId}`; excludeGameId = selectedGameId!;            // A
    } else if (selGame && state === 'pre' && hasLiveInSport) {
      key = `pre-live:${selectedGameId}`; excludeGameId = selectedGameId!;        // B1
    } else if (selGame && state === 'pre') {
      key = `pre:${selectedGameId}`; excludeCurrentSport = true;                  // B2
    } else if (noLiveContent) {
      key = `empty:${sport}`; excludeCurrentSport = true;                         // B3
    }

    if (!key) {
      watchNextForGameRef.current = null;
      setWatchNext(null);
      return;
    }
    if (watchNextForGameRef.current === key) return; // already handled this context
    watchNextForGameRef.current = key;
    const req = ++watchNextReqRef.current;
    const cancelled = () => req !== watchNextReqRef.current;
    (async () => {
      const candidates = await gatherWatchCandidates(cancelled);
      if (cancelled()) return;
      const pick = selectWatchNext(candidates, sport, excludeGameId, Date.now(), excludeCurrentSport);
      if (cancelled()) return;
      setWatchNext(pick); // pick may be null → no card (correct empty state)
    })();
  }, [games, selectedGameId, sport, gamesFetched]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => { fetchGames(); handleFetch(() => false, true); }, 60000);
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
                await handleFetch(() => false, true);
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

          {/* Watch Next / Live Now — under the score card, above THE PLAY. Serves the
              final-game ("Watch Next" 👀) and no-games/off-season ("Live Now" 🔴) states;
              the scheduled-game case renders its own card beneath the "hasn't started"
              card below (so it sits under that content). Glanceable; primary tap opens
              the game (cross-sport reuses handleSportChange's reset path). */}
          {watchNext && selectedGameState !== 'pre' && (
            <WatchNextCard
              rec={watchNext}
              isDiscovery={parentSport(watchNext.sport) !== parentSport(sport)}
              variant={selectedGameState === 'post' ? 'watch-next' : 'live-now'}
              language={language}
              onOpen={() => openWatchNext(watchNext)}
            />
          )}

          {loading && !result ? (
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: '60%', height: 20 }]} />
              <View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12 }]} />
            </View>
          ) : result ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Layered Play Card (Step D) — derived headline + core lesson + WHY
                  (open) + RULE (collapsed), glossary inside. Keyed on the play context
                  so expand/collapse + glossary state reset on game/sport/level/language. */}
              <PlayCard
                key={`${sport}|${selectedGameId}|${level}|${language}`}
                result={result}
                sport={sport}
                language={language}
                lastUpdated={lastUpdated}
                answers={answers.filter(a => a.source === 'chip')}
              />

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
                      {row.map(q => {
                        const qLoading = answers.some(a => a.question === q && a.status === 'loading');
                        return (
                          <TouchableOpacity
                            key={q}
                            style={[styles.chip, qLoading && styles.chipActive]}
                            onPress={() => handleFollowUp(q, 'chip')}
                            disabled={anyLoading}>
                            <Text style={[styles.chipText, qLoading && styles.chipTextActive]} numberOfLines={1}>{q}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>

                {/* Discovery hint — only when no typed answer is present/pending under the box */}
                {!answers.some(a => a.source === 'ask') && (
                  <Text style={styles.askHint}>{S.askHint}</Text>
                )}

                {/* Free-text ask box — typed answers render inline beneath it; chips → card layers */}
                {renderAskBox(S.askPlaceholder)}
              </View>
            </Animated.View>
          ) : selectedGame && selectedGameState === 'pre' ? (
            // Scheduled game — no play yet. Matchup + start time; the always-on FAQ
            // stays below so the user can still explore. The Watch Next / Live Now card
            // sits BENEATH this card: "Watch Next" 👀 when the sport has a live game to
            // point at, else "Live Now" 🔴 (cross-sport discovery).
            <>
              <View style={styles.upcomingCard}>
                <Text style={styles.upcomingLabel}>⏳ {S.gameNotStarted}</Text>
                <Text style={styles.upcomingMatchup}>{selectedGame.awayTeam} vs {selectedGame.homeTeam}</Text>
                {!!selectedGame.status && <Text style={styles.upcomingTime}>{selectedGame.status}</Text>}
              </View>
              {watchNext && (
                <WatchNextCard
                  rec={watchNext}
                  isDiscovery={parentSport(watchNext.sport) !== parentSport(sport)}
                  variant={games.some(g => g.state === 'in') ? 'watch-next' : 'live-now'}
                  language={language}
                  onOpen={() => openWatchNext(watchNext)}
                />
              )}
            </>
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
  // Glossary: clean thin SOLID underline in the accent — reads as a tappable link and
  // renders cleanly on iOS (the dotted version looked ragged, esp. under hyphenated
  // terms like "at-bat"). Inherits the surrounding text's size/weight/lineHeight;
  // only color + underline are added.
  glossaryTerm: { color: t.accent, textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  // Shared definition box below the explanation cards — mirrors the section cards /
  // FAQ answer treatment (surface bg, rounded, bordered) with an accent left stripe.
  glossaryDefBox: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  glossaryDefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  glossaryDefTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  glossaryDefClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  glossaryDefText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
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
  // Scheduled-game "hasn't started yet" card (Bug 1) — neutral navy surface; the future
  // Live Now card can sit alongside this in the same slot.
  upcomingCard: { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  upcomingLabel: { color: t.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  upcomingMatchup: { color: t.textPrimary, fontSize: 18, fontWeight: '800' },
  upcomingTime: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
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