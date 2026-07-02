import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar, FlatList,
  RefreshControl, Animated, Alert, Image,
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
import RecapCard from '../components/RecapCard';
import MatchTimeline from '../components/MatchTimeline';
import CoachCard from '../components/CoachCard';
import VisionModal from '../components/VisionModal';
import SportStrip from '../components/SportStrip';
import DateStrip from '../components/DateStrip';
import TuneInCard from '../components/TuneInCard';
import WatchOn from '../components/WatchOn';
import LockedSection from '../components/LockedSection';
import GolfLeaderboard from '../components/GolfLeaderboard';
import TennisLiveCard from '../components/TennisLiveCard';
import { RecapResponse, hasRecapContent } from '../lib/recap';
import { derivePlayKey } from '../lib/playKey';
import { useCaps, presentPaywall } from '../lib/entitlement';

// Libs
import { fetchExplanation, askQuestion, fetchRecap, fetchLeaderboard, fetchFeedback, fetchTennisLive, fetchTennisMatch, Sport, Level, Language, ExplanationResponse, Leaderboard, TennisLiveMatch } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { SPORT_FAQS } from '../lib/faqs';
import { UI_STRINGS } from '../lib/strings';
import { Game, SPORT_CONFIG, fetchScoreboard, discoverGameDays, toLocalDayString, fromLocalDayString } from '../lib/scoreboard';
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
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null); // golf live leaderboard (liveFormat sports)
  const [tennisMatches, setTennisMatches] = useState<TennisLiveMatch[]>([]); // ESPN live singles list (liveFormat:'tennis')
  const [tennisSel, setTennisSel] = useState<string | null>(null);           // selected match espnId (null → first live)
  const [tennisDetail, setTennisDetail] = useState<TennisLiveMatch | null>(null); // selected match enriched w/ RapidAPI live overlay
  const [tennisRead, setTennisRead] = useState<ExplanationResponse | null>(null); // Gate-3 situational explanation
  const [tennisFilter, setTennisFilter] = useState<'all' | 'mens' | 'womens'>('all'); // category filter (All/Men's/Women's)
  const [gamesFetched, setGamesFetched] = useState(false); // true once a live-sport fetch completes

  const [result, setResult] = useState<ExplanationResponse | null>(null);
  // One-tap feedback flag — PLAY-KEYED here (NOT a useState inside PlayCard, whose remount key is
  // game-level and would keep the lightbulb lit on the next play). Reset alongside setAnswers([]) when
  // a genuinely new play arrives, so the lightbulb re-arms per play.
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  // Date strip: the day whose games are shown. null = today (default / live). The strip sets it;
  // threaded into fetchGames → fetchScoreboard so a chosen day refetches that day's slate.
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // The current sport's event-model game-days (dashed YYYY-MM-DD) for the strip. Recomputed per
  // sport (MLB's game-days ≠ World Cup's). Empty for learn-mode/core sports → the strip hides.
  const [gameDays, setGameDays] = useState<string[]>([]);
  // Live Q&A (Phase 2): an ordered list, not a single slot — chip taps + free-text asks
  // each append an item that renders as a layer in the PlayCard (live/final), or inline
  // under the ask box (learn-mode, where there's no card). Per-item loading/error status.
  const [answers, setAnswers] = useState<QAItem[]>([]);
  const [askText, setAskText] = useState('');
  // Free-tier caps. capBlocked surfaces a graceful, brand-matched "keep going" state when a
  // cap is hit (NOT an error wall); the RC drop-in paywall is one tap away from there.
  const caps = useCaps();
  const [explainBlocked, setExplainBlocked] = useState(false);
  const [qaBlocked, setQaBlocked] = useState(false);
  // Post-Game Recap (premium #1) — fetched for FINAL games, replaces the PlayCard.
  const [recap, setRecap] = useState<RecapResponse | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const recapReqRef = useRef(0);
  // Vision "analyze the screen" (premium #2) — full-screen capture modal (locked preview for free).
  const [visionOpen, setVisionOpen] = useState(false);
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
  // Live content in a non-game-based format (tennis matches / a live golf board). Used to suppress the
  // cross-sport WatchNext recommendation: those sports have empty `games`, so the games-only emptiness
  // check would wrongly flag them as "nothing live" and recommend another sport.
  const hasAltLiveContent =
    (SPORT_CONFIG[sport]?.liveFormat === 'tennis' && tennisMatches.length > 0) ||
    (SPORT_CONFIG[sport]?.liveFormat === 'leaderboard' && !!leaderboard?.isLive);
  // The selected game + its ESPN state. We only explain LIVE ('in') or FINAL ('post')
  // games — a scheduled ('pre') game has no play yet, so no explanation fetch and no
  // PlayCard (just the "hasn't started" state below). `state` is undefined until the
  // game is in `games`.
  const selectedGame = games.find(g => g.id === selectedGameId);
  const selectedGameState = selectedGame?.state;
  // Date strip anchors: today (labeled "TODAY" + centered) and the active day (selectedDate, or
  // today when null). Kept as local day-strings so they match the strip cells + the fetch filter.
  const todayDay = toLocalDayString(new Date());
  const selectedDay = selectedDate ? toLocalDayString(selectedDate) : todayDay;
  // Category filter (All / Men's / Women's). filteredMatches preserves the rank-sort order.
  const filteredMatches = useMemo(() => tennisMatches.filter(m =>
    tennisFilter === 'all' ? true
      : tennisFilter === 'mens' ? m.category === "Men's Singles"
        : m.category === "Women's Singles"
  ), [tennisMatches, tennisFilter]);
  // Live-tennis selection: explicit pick by espnId IF it's in the filtered set, else the first filtered
  // match (so switching filter never leaves a detail card for a now-hidden match). Drives TennisLiveCard
  // + the detail/explanation fetch. Null when the filtered set is empty.
  const selectedTennisMatch = filteredMatches.find(m => m.espnId === tennisSel) || filteredMatches[0] || null;
  // A LIVE game gets the play explanation (PlayCard); a FINAL game gets the Post-Game Recap
  // (RecapCard) instead — "what happened in this play" no longer fits a finished game.
  const isLive = selectedGameState === 'in';
  const isFinal = selectedGameState === 'post';
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
      setLeaderboard(null);
      setTennisMatches([]);
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
      // liveFormat sports (golf): fetch the live leaderboard alongside the thin ESPN context. Best-
      // effort — fetchLeaderboard returns null on any failure / no live tournament, so the render
      // falls through to the existing ESPN tournament line (additive upgrade, never a regression).
      if (cfg.liveFormat === 'leaderboard') {
        const board = await fetchLeaderboard();
        if (isCancelled()) return;
        setLeaderboard(board);
      }
      // liveFormat:'tennis' — fetch live matches from /api/tennis-live. Best-effort: fetchTennisLive
      // returns { matches: [] } on any failure OR when the backend TENNIS_LIVE flag is off, so the
      // render falls through to today's exact learn-mode tennis view (additive upgrade, never a
      // regression). Poll cadence is the shared 60s auto-refresh (fetchGames) — no tighter poll.
      if (cfg.liveFormat === 'tennis') {
        const { matches } = await fetchTennisLive();
        if (isCancelled()) return;
        setTennisMatches(matches.filter(m => m.isLive));
      }
      // A real fetch completed (even if there are no head-to-head games): mark fetched so
      // the Live Now trigger's `noLiveContent` (gamesFetched && games.length === 0) can fire
      // on offseason AND learn-mode sports. Set after the cancellation-guarded learn fetch.
      setGamesFetched(true);
      return;
    }
    setLearnContext(null);
    setLeaderboard(null);
    setTennisMatches([]);
    try {
      const parsed = await fetchScoreboard(sport, isCancelled, selectedDate ?? undefined);
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
  }, [sport, selectedGameId, favorites, selectedDate]);

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
      // Free-tier daily cap. Enforced HERE (post-fetch) because the per-(gameId,playKey)
      // unit needs playKey to tell a re-read (free) from a genuinely new play. The 60s
      // auto-refresh (isRefresh) and re-reads don't consume. On block: don't commit the
      // result — show the graceful "keep going" state instead (the paywall is one tap away).
      const allowed = caps.recordExplanation(selectedGameId, playKey, isRefresh);
      if (!allowed) {
        setExplainBlocked(true);
        setResult(null);
        return;
      }
      setExplainBlocked(false);
      if (playKey !== lastPlayKeyRef.current) {
        setAnswers([]);
        setFeedbackGiven(false);   // re-arm the "I learned something" lightbulb for the new play
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
      // (cap state handled above — see the recordExplanation gate)
    }
  }, [sport, level, selectedGameId, language, caps.recordExplanation]);

  const handleSportChange = async (s: Sport) => {
    if (s === sport) return;
    await Haptics.selectionAsync();
    setSport(s);
    setSelectedGameId(null);
    setSelectedDate(null); // reset the date strip to today — a chosen day is per-sport, never carried across
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
  // One-tap "I learned something" — fire once per play (feedbackGiven gates re-taps; it resets per
  // playKey in handleFetch). Fire-and-forget: fetchFeedback never throws / never blocks the UI.
  const handleFeedback = () => {
    if (feedbackGiven) return;
    setFeedbackGiven(true);
    fetchFeedback({
      sport, level, language,
      gameId: selectedGameId,
      playKey: lastPlayKeyRef.current,
      playType: result?.playType ?? result?.rawPlay ?? '',
      gameContext: result?.gameContext ?? '',
      helpful: true,
    });
  };

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
    // Per-game Q&A cap — gated BEFORE the fetch, and ONLY for real games (a live/final
    // selectedGameId). Learn-mode / gameless asks (selectedGameId null) stay ungated.
    // Counts chip + typed equally (both arrive here). On block: graceful "keep going" row,
    // no fetch.
    if (selectedGameId && !caps.recordQA(selectedGameId)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setQaBlocked(true);
      return;
    }
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
  }, [sport, favorites, selectedDate]);

  // Date strip: compute the current sport's event-model game-days (prev/today/next, gap-skipping).
  // Per-sport (recomputed on switch); head-to-head site sports only. Today is always injected as
  // the home anchor so there's a "TODAY" cell to return to even on an off/rest day.
  useEffect(() => {
    let cancelled = false;
    const cfg = SPORT_CONFIG[sport];
    if (!cfg || cfg.learnMode || cfg.core) { setGameDays([]); return; }
    (async () => {
      const disc = await discoverGameDays(sport);
      if (cancelled) return;
      const set = new Set(disc.gameDays);
      set.add(toLocalDayString(new Date()));
      setGameDays(Array.from(set).sort());
    })();
    return () => { cancelled = true; };
  }, [sport]);

  // Tap a strip day → show that day's games. Reset the selected game so the new day auto-selects
  // its first/live game (→ recap for a past final, countdown for a future 'pre', PlayCard for live).
  // Today is canonicalized to null so it uses the live "bare today" fetch path.
  const handleDaySelect = async (day: string) => {
    if (day === selectedDay) return;
    await Haptics.selectionAsync();
    setSelectedGameId(null);
    setSelectedDate(day === todayDay ? null : fromLocalDayString(day));
  };
  useEffect(() => {
    // Only LIVE games have a play to explain (PlayCard). FINAL games take the recap path
    // below; pre/no-selection → no fetch, and clear any prior result so a stale PlayCard
    // from the previous (live) game/sport can't linger.
    // Fresh context (game / level / language / state) → clear live Q&A so a prior game's
    // answers can't linger under a new card. The 60s same-play refresh does NOT pass through
    // this effect (it calls handleFetch directly), so its persistence is governed solely by
    // handleFetch's playKey gate.
    setAnswers([]);
    // Fresh context → clear the cap-blocked states too (the Q&A counter itself resets
    // per-game in caps.ts; this just drops the UI flags so a new game/play starts clean).
    setExplainBlocked(false); setQaBlocked(false);
    if (!selectedGameId || !isLive) { setResult(null); setLoading(false); return; }
    let cancelled = false;
    handleFetch(() => cancelled);
    return () => { cancelled = true; };
  }, [selectedGameId, level, language, isLive]);
  // Live-tennis detail (RapidAPI live overlay) + situational read (Gate-3). Self-contained / ADDITIVE:
  // independent of the PlayCard/handleFetch path (tennis stays learnMode → no caps, no PlayCard). When
  // a match is selected, lazy-fetch THAT match enriched (server/currentGame/timeline in ESPN
  // orientation) and the situational explanation. Best-effort: any failure leaves the plain ESPN card
  // intact (overlay/read stay null). Re-runs only on match/level/language change (no extra poll).
  //
  // KNOWN GAP (G3): the explain call still keys off rawId/first-live RapidAPI match (Gate-3 backend),
  // NOT the selected espnId — so with multiple concurrent live matches the situational read MAY
  // describe a different match than the one selected. Acceptable for G3 (cards/flags focus); revisit
  // by passing the ESPN player names to the explain branch if the read shows the wrong match.
  useEffect(() => {
    const espnId = selectedTennisMatch?.espnId;
    if (!espnId) { setTennisDetail(null); setTennisRead(null); return; }
    let cancelled = false;
    setTennisDetail(null); // clear the previous match's overlay so it can't linger under the new card
    (async () => {
      try {
        const detail = await fetchTennisMatch(espnId);
        if (!cancelled) setTennisDetail(detail);
      } catch { if (!cancelled) setTennisDetail(null); }
      try {
        // Pass category (+ names) so the Gate-3 read uses correct pronouns on women's matches and
        // can avoid fabricating shot detail at a fresh 0-0 start.
        const data = await fetchExplanation(sport, level, espnId, language, undefined, {
          tennisHome: selectedTennisMatch?.home,
          tennisAway: selectedTennisMatch?.away,
          tennisCategory: selectedTennisMatch?.category,
          tennisSets: selectedTennisMatch?.sets,            // ESPN set scores ground the read w/o RapidAPI
          tennisStatusDetail: selectedTennisMatch?.statusDetail,
        });
        if (!cancelled) setTennisRead(data);
      } catch { if (!cancelled) setTennisRead(null); }
    })();
    return () => { cancelled = true; };
  }, [selectedTennisMatch?.espnId, sport, level, language]);
  // Post-Game Recap (premium #1) — fetch for FINAL games (replaces the explanation). Mirrors
  // the explanation effect's cancellation + fresh-context reset; refetches on sport/game/level/
  // language AND on isPro (so buying Pro mid-view upgrades the teaser → full recap). Recap does
  // NOT touch the daily explanation cap — final games never call handleFetch/recordExplanation.
  useEffect(() => {
    if (!selectedGameId || !isFinal) { setRecap(null); setRecapLoading(false); return; }
    const req = ++recapReqRef.current;
    const cancelled = () => req !== recapReqRef.current;
    setRecap(null); setRecapLoading(true);
    (async () => {
      try {
        const r = await fetchRecap(sport, selectedGameId, level, language, caps.isPro);
        if (cancelled()) return;
        setRecap(r);
      } catch (e) {
        if (cancelled()) return;
        console.error('Recap fetch error:', e);
        setRecap({ score: '', story: '', turningPoint: '', keyPerformance: '', whyItMattered: '', articleLink: '' });
      } finally {
        if (!cancelled()) setRecapLoading(false);
      }
    })();
    return () => { recapReqRef.current++; };
  }, [selectedGameId, sport, level, language, isFinal, caps.isPro]);
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
    // Tennis/golf have empty `games` but their OWN live content — don't treat them as "nothing live".
    const noLiveContent = gamesFetched && games.length === 0 && !hasAltLiveContent;

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
  }, [games, selectedGameId, sport, gamesFetched, hasAltLiveContent]);

  useEffect(() => {
    // Only poll the live "today" view — a past/future day (selectedDate set) is static, so polling
    // it is pointless and would also re-run fetchGames against a non-today slate.
    if (autoRefresh && !selectedDate) {
      autoRefreshRef.current = setInterval(() => { fetchGames(); handleFetch(() => false, true); }, 60000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, sport, level, selectedGameId, language, selectedDate]);

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
            {/* Analyze-the-screen (premium #2) — always available; opens the capture modal
                (locked preview for free, full flow for Pro). */}
            <TouchableOpacity
              style={styles.visionBtn}
              onPress={() => { Haptics.selectionAsync(); setVisionOpen(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={S.visionTitle}>
              <Text style={styles.visionBtnIcon}>📸</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sport Tabs — visible sports in saved order (customize in Settings › My Sports). */}
        <SportStrip
          items={visibleSports.map(s => ({ key: s.key, emoji: s.emoji, label: SPORT_NAME_KEY[s.key] ? S[SPORT_NAME_KEY[s.key]!] : s.label }))}
          selectedKey={sport}
          onSelect={(key) => handleSportChange(key as Sport)}
          marginBottom={10}
        />

        {/* Event-model date strip — the current sport's game-days (prev/today/next, gap-skipping).
            Hidden for learn-mode/core sports (empty gameDays) and when today is the ONLY cell
            (length 1 = nothing to navigate to → a lone "TODAY" chip adds no value). */}
        {gameDays.length > 1 && (
          <DateStrip
            days={gameDays}
            selectedDay={selectedDay}
            todayDay={todayDay}
            onSelect={handleDaySelect}
            marginBottom={10}
          />
        )}

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
          ) : SPORT_CONFIG[sport]?.liveFormat === 'tennis' && tennisMatches.length > 0 ? (
            // Live tennis — an arm of the in-ScrollView score slot (page scrolls as ONE, so the
            // Ask/FAQ blocks below are reachable). Order: (1) inline filter, (2) bounded scrollable
            // match-list card, (3) the selected match's TennisLiveCard in NORMAL flow (page scroll
            // handles it — NOT independently scrollable).
            <>
              {/* Filter row — All / Men's / Women's (inline; scrolls with the page) */}
              <View style={styles.tFilterRow}>
                {(['all', 'mens', 'womens'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={async () => { await Haptics.selectionAsync(); setTennisFilter(f); }}
                    style={[styles.tFilterChip, tennisFilter === f && styles.tFilterChipActive]}
                    activeOpacity={0.8}>
                    <Text style={[styles.tFilterChipText, tennisFilter === f && styles.tFilterChipTextActive]}>
                      {f === 'all' ? S.tennisFilterAll : f === 'mens' ? S.tennisFilterMens : S.tennisFilterWomens}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Match list — a BOUNDED card that scrolls INTERNALLY (nestedScrollEnabled) so the list
                  stays compact while the page scrolls around it. tMatchCard JSX unchanged. */}
              <View style={styles.tListCard}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={{ paddingVertical: 8 }}>
                  {filteredMatches.map((item) => {
                    const sel = selectedTennisMatch?.espnId === item.espnId;
                    const lastIdx = item.sets.length - 1;
                    const caption = [item.round, item.court].filter(Boolean).join(' · ');
                    // serve only known for the SELECTED match (its overlay is in tennisDetail.live)
                    const server = sel ? tennisDetail?.live?.server : undefined;
                    const renderSide = (side: 'home' | 'away') => (
                      <View style={styles.tTeamRow}>
                        <View style={styles.tTeamLeft}>
                          {server === side ? <View style={styles.tServeDot} /> : <View style={styles.tServeDotSpacer} />}
                          {(side === 'home' ? item.homeFlag : item.awayFlag)
                            ? <Image source={{ uri: side === 'home' ? item.homeFlag : item.awayFlag }} style={styles.tFlag} resizeMode="contain" />
                            : <View style={styles.tFlagSpacer} />}
                          {(side === 'home' ? item.homeSeed : item.awaySeed) != null &&
                            <Text style={styles.tSeed}>({side === 'home' ? item.homeSeed : item.awaySeed})</Text>}
                          <Text style={styles.tTeamName} numberOfLines={1}>{side === 'home' ? item.home : item.away}</Text>
                        </View>
                        <View style={styles.tSetScores}>
                          {item.sets.map((s, i) => (
                            <Text key={i} style={[styles.tSetCell, i === lastIdx ? styles.tSetCellCurrent : styles.tSetCellDone]}>
                              {side === 'home' ? s.home : s.away}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                    return (
                      <TouchableOpacity
                        key={item.espnId}
                        onPress={async () => { await Haptics.selectionAsync(); setTennisSel(item.espnId); }}
                        style={[styles.tMatchCard, sel && styles.tMatchCardSel]}
                        activeOpacity={0.85}>
                        <View style={styles.tTopRow}>
                          <View style={styles.tLiveBadge}>
                            <View style={styles.tLiveDot} />
                            <Text style={styles.tLiveText}>LIVE</Text>
                            {!!item.statusDetail && <Text style={styles.tStatusDetail}>· {item.statusDetail}</Text>}
                          </View>
                          {!!item.category && <Text style={styles.tLeague} numberOfLines={1}>{item.category}</Text>}
                        </View>
                        {!!caption && <Text style={styles.tCaption} numberOfLines={1}>{caption}</Text>}
                        <View style={styles.tMatchup}>
                          {renderSide('home')}
                          {renderSide('away')}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Full-width hairline — a section break between the list and the detail card */}
              <View style={styles.tListDivider} />

              {/* Eyebrow label — shows only when a match is selected (so it never sits above an empty read) */}
              {selectedTennisMatch && (
                <Text style={styles.tCurrentSelLabel}>{S.currentSelection.toUpperCase()}</Text>
              )}

              {/* Selected-match detail — NORMAL flow (the page scroll handles it; not independently scrollable) */}
              {selectedTennisMatch && (
                <TennisLiveCard
                  match={selectedTennisMatch}
                  live={tennisDetail?.live ?? null}
                  read={tennisRead ? { simple: tennisRead.simple, whyItMatters: tennisRead.whyItMatters } : null}
                  labels={{ serving: S.tennisServing, breakPoint: S.tennisBreakPoint, gamePoint: S.tennisGamePoint }}
                />
              )}
            </>
          ) : SPORT_CONFIG[sport]?.liveFormat === 'leaderboard' && leaderboard ? (
            <GolfLeaderboard board={leaderboard} />
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
          {watchNext && selectedGameState !== 'pre' && !hasAltLiveContent && (
            <WatchNextCard
              rec={watchNext}
              isDiscovery={parentSport(watchNext.sport) !== parentSport(sport)}
              variant={selectedGameState === 'post' ? 'watch-next' : 'live-now'}
              language={language}
              onOpen={() => openWatchNext(watchNext)}
            />
          )}

          {/* Where-to-watch — QUIET variant, high on the LIVE card: a recessive TV reference label
              near the score, glanceable without scrolling past the play. The PlayCard stays the
              star (see WatchOn's quiet styling). Live-only + guarded on broadcast data. */}
          {isLive && !!selectedGame?.broadcasts?.length && (
            <WatchOn broadcasts={selectedGame.broadcasts} language={language} variant="quiet" />
          )}

          {isFinal ? (
            // FINAL game → Post-Game Recap (premium #1) replaces the PlayCard. Skeleton while
            // fetching, the card when it has content, a graceful "not available" when ESPN had
            // no usable data for this final game.
            recapLoading && !recap ? (
              <View style={styles.skeleton}>
                <View style={[styles.skeletonLine, { width: '50%', height: 24 }]} />
                <View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 14 }]} />
                <View style={[styles.skeletonLine, { width: '80%', height: 14, marginTop: 8 }]} />
              </View>
            ) : recap && hasRecapContent(recap) ? (
              <RecapCard recap={recap} isPro={caps.isPro} sport={sport} language={language} onUnlock={presentPaywall} />
            ) : !recapLoading ? (
              <View style={styles.capCard}><Text style={styles.capBody}>{S.recapNoData}</Text></View>
            ) : null
          ) : loading && !result ? (
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: '60%', height: 20 }]} />
              <View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 12 }]} />
            </View>
          ) : explainBlocked ? (
            // Daily free-explanation cap hit. PRO is the primary ask (filled brand button, first);
            // the still-free teaching surfaces (Academy + Coach's Corner — NOT cap-gated) sit below as
            // orange text-links. nbsp before each "→" keeps the arrow from orphaning on a wrap.
            <View style={styles.capCard}>
              <Text style={styles.capTitle}>{S.capExplainTitle.replace('{n}', String(caps.DAILY_FREE))}</Text>
              <Text style={styles.capBody}>{S.capExplainBody}</Text>
              {/* Locked play sections — mirror PlayCard (THE PLAY / WHY IT MATTERS / THE RULE) +
                  CoachCard's hardcoded "COACH'S READ" eyebrow. Static skeleton bars via the shared
                  <LockedSection>; NO real content, NO generation (this branch never fetches). */}
              <LockedSection label={`🎙️ ${S.thePlay}`} />
              <LockedSection label={`💡 ${S.whyItMatters}`} />
              <LockedSection label={`📜 ${S.theRule}`} />
              <LockedSection label="🧠 COACH'S READ" />
              {/* PRIMARY — Pro (the conversion ask), reusing the existing paywall trigger. */}
              <TouchableOpacity style={styles.teaseCta} onPress={presentPaywall} activeOpacity={0.85}>
                <Text style={styles.capBtnText}>{S.capCta.replace(' →', ' →')}</Text>
              </TouchableOpacity>
              {/* SECONDARY — still-free teaching surfaces, as text-links. */}
              <TouchableOpacity
                style={styles.capBtnSecondary}
                onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Academy', { sport }); }}
                activeOpacity={0.7}>
                <Text style={styles.capBtnSecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>{S.capAcademyCta.replace(' →', ' →')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.capBtnSecondary}
                onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate("Coach's Corner"); }}
                activeOpacity={0.7}>
                <Text style={styles.capBtnSecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>{S.capCoachCta.replace(' →', ' →')}</Text>
              </TouchableOpacity>
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
                feedbackGiven={feedbackGiven}
                onFeedback={handleFeedback}
              />

              {/* Coach's Corner (premium #3) — the live strategic layer, below THE PLAY. Keyed on
                  the play context so it resets/refetches per game/level/language. Renders
                  coming-soon for thin-data sports; the Groq read fires only on Pro expand. The
                  daily-explanation cap pill now lives in this card's header (top-right). */}
              {selectedGameId && (
                <CoachCard
                  // Key on the PLAY (lastPlayKeyRef), not just the game: a genuinely new play remounts
                  // the card → resets expanded/full → refetches the FREE state line and returns to
                  // collapsed (the paid Groq read fires only on the user's next expand — bounds cost).
                  // Same-play 60s refreshes keep the same key (lastPlayKeyRef only changes on a new
                  // play, set before setResult), so the card doesn't churn on routine polls.
                  key={`coach|${sport}|${selectedGameId}|${lastPlayKeyRef.current}|${level}|${language}`}
                  sport={sport}
                  gameId={selectedGameId}
                  level={level}
                  language={language}
                  isPro={caps.isPro}
                  onUnlock={presentPaywall}
                  capLeft={caps.explanationsLeft === Infinity ? undefined : caps.explanationsLeft}
                />
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

              {/* Soccer Match Timeline (Highlightly events from the explain response). Soccer-only;
                  renders the no-events state intentionally when the match is early/goalless. Free. */}
              {['soccer', 'worldcup', 'epl', 'laliga'].includes(sport) && (
                <MatchTimeline
                  events={result.events || []}
                  language={language}
                  teams={selectedGame ? {
                    home: { name: selectedGame.homeTeamFull ?? selectedGame.homeTeam, logo: selectedGame.homeLogo },
                    away: { name: selectedGame.awayTeamFull ?? selectedGame.awayTeam, logo: selectedGame.awayLogo },
                  } : undefined}
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

                {qaBlocked ? (
                  // Per-game Q&A cap hit — graceful "keep going" row in place of the ask box.
                  <View style={styles.capInline}>
                    <Text style={styles.capInlineTitle}>{S.capQaTitle.replace('{n}', String(caps.QA_FREE_PER_GAME))}</Text>
                    <Text style={styles.capInlineBody}>{S.capQaBody}</Text>
                    <TouchableOpacity style={styles.capBtn} onPress={presentPaywall} activeOpacity={0.85}>
                      <Text style={styles.capBtnText}>{S.capCta}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Free-tier Q&A scarcity pill — amber, prominent, hidden for Pro/trial (∞). */}
                    {selectedGameId && caps.qaLeft(selectedGameId) !== Infinity && (
                      <View style={styles.capPill}>
                        <Text style={styles.capPillText}>{S.capQaLeft.replace('{n}', String(caps.qaLeft(selectedGameId)))}</Text>
                      </View>
                    )}
                    {/* Discovery hint — only when no typed answer is present/pending under the box */}
                    {!answers.some(a => a.source === 'ask') && (
                      <Text style={styles.askHint}>{S.askHint}</Text>
                    )}
                    {/* Free-text ask box — typed answers render inline beneath it; chips → card layers */}
                    {renderAskBox(S.askPlaceholder)}
                  </>
                )}
              </View>
            </Animated.View>
          ) : selectedGame && selectedGameState === 'pre' ? (
            // Scheduled game — no play yet. The TuneInCard is the pre-game DETAIL card for THIS
            // selected game (matchup/time/venue/records/probables/weather + first-class Watch-on-TV),
            // degrading gracefully per sport. The always-on FAQ stays below so the user can explore.
            // The Watch Next / Live Now card still sits BENEATH: "Watch Next" 👀 when the sport has a
            // live game to point at, else "Live Now" 🔴 (cross-sport discovery of live alternatives).
            <>
              <TuneInCard game={selectedGame} language={language} />
              {watchNext && !hasAltLiveContent && (
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
                <Text style={styles.learnCtaPillText}>{S.capAcademyCta}</Text>
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

          {/* Game Information — STATIC reference furniture, DEAD LAST on the page (below the play
              stack AND Common Questions). Any selected LIVE game; independent of explanation state /
              free cap; never gated on isPro/caps. The quiet TV row lives up high. */}
          {isLive && selectedGame && (
            <TuneInCard game={selectedGame} language={language} variant="context" />
          )}
        </ScrollView>

        {/* Analyze-the-screen (premium #2). gameContext enriches the analysis when a game is
            selected; the modal renders a locked preview (no vision call) for free users. */}
        <VisionModal
          visible={visionOpen}
          onClose={() => setVisionOpen(false)}
          isPro={caps.isPro}
          sport={sport}
          level={level}
          language={language}
          gameContext={selectedGame ? {
            sport,
            homeTeam: selectedGame.homeTeam,
            awayTeam: selectedGame.awayTeam,
            homeScore: selectedGame.homeScore,
            awayScore: selectedGame.awayScore,
            state: selectedGame.state || '',
            status: selectedGame.status,
          } : undefined}
          onUnlock={() => { setVisionOpen(false); presentPaywall(); }}
        />
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
  visionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderStrong, alignItems: 'center', justifyContent: 'center' },
  visionBtnIcon: { fontSize: 18 },
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

  // Live-tennis (single-scroll page): inline filter row + a bounded internally-scrolling match-list card.
  tFilterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tFilterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  tFilterChipActive: { backgroundColor: t.accent, borderColor: t.accent },
  tFilterChipText: { color: t.textSecondary, fontSize: 13, fontWeight: '700' },
  tFilterChipTextActive: { color: '#ffffff' },
  // Bounded "match list" well — subtle surfaceAlt band + hairline edges, clips its inner scroll so it
  // reads as a distinct compact list region within the page (inner tMatchCards keep their own chrome).
  // Transparent bounded list — the dark-blue tMatchCards show directly on the page bg (distinct cards,
  // not a flat band); keeps the internal scroll so the list stays compact.
  tListCard: { maxHeight: 340, overflow: 'hidden' },
  // Light-blue handle divider — section break between the match list and the detail card below.
  tListDivider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: t.border, marginTop: 8, marginBottom: 10 },
  tCurrentSelLabel: { color: t.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, marginHorizontal: 16 },

  // Live-tennis match selector — VERTICAL stacked cards mirroring GameCard (topRow/matchup tokens).
  tMatchCard: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  tMatchCardSel: { borderColor: t.accent, borderWidth: 2 },           // selected → accent border (GameCard pattern)
  tTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.live },
  tLiveText: { color: t.live, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tStatusDetail: { color: t.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginLeft: 2 },
  tLeague: { color: t.textMuted, fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  tCaption: { color: t.textMuted, fontSize: 11, fontWeight: '600', marginTop: -2, marginBottom: 8 }, // round · court
  tMatchup: { gap: 6 },                                                // two teamRows, 6px gap (GameCard.matchup)
  tTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tTeamLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 7, marginRight: 8 },
  tServeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent },   // serve cue (same as TennisLiveCard)
  tServeDotSpacer: { width: 7, height: 7 },                            // keep names aligned when not serving
  tFlag: { width: 22, height: 16, borderRadius: 2 },                   // mirrors GameCard logo treatment (contain)
  tFlagSpacer: { width: 22, height: 16 },                              // reserve space when a flag is absent
  tSeed: { color: t.textMuted, fontSize: 13, fontWeight: '700' },      // ESPN-style "(4)" before the name
  tTeamName: { color: t.textPrimary, fontSize: 15, fontWeight: '700', flexShrink: 1 }, // GameCard teamName bumped 13→15
  tSetScores: { flexDirection: 'row', gap: 6 },
  tSetCell: { width: 18, textAlign: 'center', fontSize: 16, fontVariant: ['tabular-nums'] },
  tSetCellDone: { color: t.textSecondary, fontWeight: '700' },
  tSetCellCurrent: { color: t.textPrimary, fontWeight: '900' },        // in-progress set stands out
  // Scheduled-game "hasn't started yet" card (Bug 1) — neutral navy surface; the future
  // Live Now card can sit alongside this in the same slot.
  chipsWrap: { gap: 8 },                          // column of rows; 8px gap between the two rows
  chipRow: { flexDirection: 'row', gap: 8 },      // two chips per row, 8px gap between them
  chip: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  chipActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  chipText: { color: t.textPrimary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: t.accentText },
  askHint: { color: t.textMuted, fontSize: 12, lineHeight: 16, marginTop: 12 },
  // Free-tier caps — subtle indicator + the graceful "keep going" blocked states (brand
  // navy/orange; celebratory, not error-toned). Shared orange CTA → RC drop-in paywall.
  // Scarcity pill — amber, padded, self-aligned so it hugs its content (not full-width). Static
  // for now; count-aware urgency (color shift as N→0) is banked for a later pass.
  capPill: {
    alignSelf: 'center', marginTop: 12,
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: 'rgba(245,166,35,0.14)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.40)',
  },
  capPillText: { color: '#F5A623', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  capCard: { marginHorizontal: 16, marginBottom: 16, padding: 20, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent, alignItems: 'flex-start' },
  capTitle: { color: t.textPrimary, fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 8 },
  capBody: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  capInline: { marginTop: 12, padding: 14, backgroundColor: t.explanationBg, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  capInlineTitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  capInlineBody: { color: t.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  capBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'stretch', alignItems: 'center' },
  capBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  // Capped-tease Pro CTA — like capBtn but with a top margin (it follows the locked skeleton rows).
  teaseCta: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignSelf: 'stretch', alignItems: 'center', marginTop: 18 },
  // Secondary text-links (Academy / Coach's Corner) — no fill, full-width centered so long labels wrap
  // cleanly under the filled Pro button; orange, visually subordinate to the primary Pro button.
  capBtnSecondary: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, marginTop: 10 },
  capBtnSecondaryText: { color: t.accentText, fontSize: 13, fontWeight: '700', textAlign: 'center' },
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