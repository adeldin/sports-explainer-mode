import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Level } from '../../lib/api';
import { useAppState, getRank, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { scheduleQuizReminder } from '../../lib/notifications';
import { VerdictCard, NextButton } from '../FieldEngine';
import { ScoreboardArt } from '../../lib/readTheScoreArt';
import { SignalArt } from '../../lib/signalArt';
import { CrestHero } from '../../lib/crestKitArt';
import {
  buildJeopardyBoard, JeopardyBoard, JeopardyTile, COLUMN_META,
} from '../../lib/jeopardy';
import {
  BoardGrid, ClueChip, OptionList, TermPanel, ZoneClueField, TablePair,
  BoardSummary, CrestFallback, TileResult, TIER_LABEL,
} from './jeopardyTiles';
import type { AcademyGameProps } from '../../lib/academyGames';

// Sportswise Jeopardy — the Academy's capstone LESSON unit. A board of columns
// (one per engine the sport supports — built by lib/jeopardy) × 5 value rows
// (the tier ladder). Tap a tile → that engine's own VISUAL clue → answer →
// the tile banks its points and TEACHES (each engine's 4-depth exp, verbatim)
// → clear the board for a real completion summary. This component owns state
// and scoring only; everything it draws comes from the engines' art modules +
// the dedicated presentation module (jeopardyTiles — the swappable layer).

// Same scoring contract as QuizGame (the canonical award block, copied verbatim):
// base XP by the answered clue's difficulty tier + a capped combo bonus. The
// BOARD score (100–500 per tile) is session-local flavor — XP is what persists.
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
const COMBO_BONUS_CAP = 10;

export default function JeopardyGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { level, notificationsEnabled, dailyStreak, recordQuizActivity, points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // ── Board build: load → ready | friendly error (never a crash, never blank) ──
  // The static engines always produce columns, so 'error' is effectively
  // unreachable — guarded anyway (a blank game reads as a broken app).
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [board, setBoard] = useState<JeopardyBoard | null>(null);
  // Re-arm on mount, not just disarm on unmount (the TeamPickGame remount fix).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setResults({});
    setActive(null);
    setChosen(null);
    setBanked(0);
    setXpEarned(0);
    setCorrectCount(0);
    setBestStreak(0);
    setCombo(0);
    completionDone.current = false;
    try {
      const b = await buildJeopardyBoard(sportKeys);
      if (!mounted.current) return;
      if (!b.columns.length) { setStatus('error'); return; }
      setBoard(b);
      setStatus('ready');
    } catch {
      if (mounted.current) setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportKeys]);
  useEffect(() => { load(); }, [load]);

  // ── Board / clue state ───────────────────────────────────────────────────
  const [results, setResults] = useState<Record<string, TileResult>>({});
  const [active, setActive] = useState<JeopardyTile | null>(null);
  // The active clue's answer: option index (score/signal/crest/term), spot key
  // (zone), or side 0|1 (table). null = not yet judged.
  const [chosen, setChosen] = useState<number | string | null>(null);
  const judged = chosen !== null;
  const [explainLevel, setExplainLevel] = useState<Level>(level);
  useEffect(() => { setExplainLevel(level); }, [level]);

  // Session tallies for the completion summary.
  const [banked, setBanked] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const totalTiles = board ? board.columns.reduce((n, c) => n + c.tiles.length, 0) : 0;
  const answeredCount = Object.keys(results).length;
  const boardCleared = status === 'ready' && totalTiles > 0 && answeredCount >= totalTiles;

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

  // Any answer counts as activity — daily streak + the "come back" reminder,
  // once per mount (the canonical pattern), so an abandoned board still counts.
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

  // Board completion beat (spec: recordQuizActivity + scheduleQuizReminder on
  // completion). recordQuizActivity is idempotent per day, so this is safe on
  // top of the first-answer call above.
  const completionDone = useRef(false);
  useEffect(() => {
    if (!boardCleared || completionDone.current) return;
    completionDone.current = true;
    const streakNow = recordQuizActivity();
    if (notificationsEnabled) scheduleQuizReminder(streakNow);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardCleared]);

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

  // ── Judging (one path for every clue kind) ─────────────────────────────────
  const judge = async (tile: JeopardyTile, picked: number | string, correct: boolean) => {
    if (chosen !== null) return;
    setChosen(picked);
    setResults(prev => ({ ...prev, [tile.key]: { correct } }));
    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Canonical award block (QuizGame, verbatim): base by the tile's ACTUAL
      // content tier (xpLevel — what was really answered, since a never-blank
      // fallback can deal off-tier), plus the capped pre-increment combo bonus.
      const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
      const gained = QUIZ_POINTS[tile.xpLevel] + comboBonus;
      const beforeRank = getRank(points).name;
      const afterRank = getRank(points + gained).name;
      awardPoints(gained);
      flashPointsGain(gained, comboBonus > 0);
      if (beforeRank !== afterRank) celebrateRankUp(afterRank);
      setXpEarned(x => x + gained);
      setBanked(b => b + tile.value);
      setCorrectCount(c => c + 1);
      setCombo(c => {
        const n = c + 1;
        setBestStreak(s => Math.max(s, n));
        return n;
      });
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCombo(0);
    }
    onAnswered();
  };

  const openTile = (tile: JeopardyTile) => {
    setChosen(null);
    setExplainLevel(level);
    setCrestBroken(false);
    setActive(tile);
  };

  const backToBoard = () => {
    setActive(null);
    setChosen(null);
    setExplainLevel(level);
  };

  // Crest image failed mid-clue (offline / CDN miss): show the fallback panel;
  // the name options keep the tile answerable — never blank.
  const [crestBroken, setCrestBroken] = useState(false);

  // ── Renderers ──────────────────────────────────────────────────────────────

  const renderClue = (tile: JeopardyTile) => {
    const clue = tile.clue;
    const meta = COLUMN_META[tile.column];

    let prompt: string;
    let visual: React.ReactNode;
    let answerUi: React.ReactNode = null;
    let verdictTitle: string;
    let exp: Record<Level, string>;
    let correctNow = false;

    switch (clue.kind) {
      case 'score': {
        const sc = clue.scenario;
        prompt = sc.prompt;
        visual = <ScoreboardArt board={sc.board} />;
        answerUi = (
          <OptionList
            options={sc.options}
            chosen={typeof chosen === 'number' ? chosen : null}
            answer={sc.answer}
            judged={judged}
            onChoose={i => { void judge(tile, i, i === sc.answer); }}
          />
        );
        verdictTitle = sc.title;
        exp = sc.exp;
        correctNow = chosen === sc.answer;
        break;
      }
      case 'signal': {
        const sc = clue.scenario;
        prompt = sc.prompt;
        // Animation freezes at the signal's peak pose once judged (source-game behavior).
        visual = <SignalArt signal={sc.signal} playing={!judged} />;
        answerUi = (
          <OptionList
            options={clue.options}
            chosen={typeof chosen === 'number' ? chosen : null}
            answer={clue.answer}
            judged={judged}
            onChoose={i => { void judge(tile, i, i === clue.answer); }}
          />
        );
        verdictTitle = sc.title;
        exp = sc.exp;
        correctNow = chosen === clue.answer;
        break;
      }
      case 'crest': {
        const round = clue.round;
        prompt = clue.prompt;
        visual = crestBroken ? (
          <CrestFallback />
        ) : (
          <CrestHero
            uri={round.subject.logo}
            zoom={round.zoom}
            seed={Number(round.subject.id) || round.subject.displayName.length}
            onError={() => setCrestBroken(true)}
          />
        );
        answerUi = (
          <OptionList
            options={round.options.map(o => o.displayName)}
            chosen={typeof chosen === 'number' ? chosen : null}
            answer={round.answer}
            judged={judged}
            onChoose={i => { void judge(tile, i, i === round.answer); }}
          />
        );
        verdictTitle = clue.title;
        exp = clue.exp;
        correctNow = chosen === round.answer;
        break;
      }
      case 'zone': {
        const sc = clue.scenario;
        prompt = sc.prompt;
        visual = (
          <ZoneClueField
            scenario={sc}
            surface={clue.surface}
            chosen={typeof chosen === 'string' ? chosen : null}
            onChoose={spot => { void judge(tile, spot.key, spot.key === sc.answer); }}
          />
        );
        answerUi = (
          <Text style={styles.hint}>
            {judged
              ? (chosen === sc.answer ? 'Nailed it — the green zone is the spot.' : 'The green zone shows the right spot.')
              : 'Tap one of the highlighted zones.'}
          </Text>
        );
        verdictTitle = sc.title;
        exp = sc.exp;
        correctNow = chosen === sc.answer;
        break;
      }
      case 'table': {
        const round = clue.round;
        prompt = round.prompt;
        visual = (
          <TablePair
            round={round}
            chosen={typeof chosen === 'number' ? chosen : null}
            onChoose={i => { void judge(tile, i, i === round.answer); }}
          />
        );
        verdictTitle = round.title;
        exp = round.exp;
        correctNow = chosen === round.answer;
        break;
      }
      case 'term': {
        prompt = clue.prompt;
        visual = <TermPanel term={clue.entry.term} />;
        answerUi = (
          <OptionList
            options={clue.options}
            chosen={typeof chosen === 'number' ? chosen : null}
            answer={clue.answer}
            judged={judged}
            onChoose={i => { void judge(tile, i, i === clue.answer); }}
          />
        );
        verdictTitle = clue.title;
        exp = clue.exp;
        correctNow = chosen === clue.answer;
        break;
      }
    }

    return (
      <>
        {/* Escape hatch BEFORE answering (tile stays live); after answering the
            only way out is "Back to board", which the results map has recorded. */}
        {!judged && (
          <TouchableOpacity onPress={backToBoard} hitSlop={10} activeOpacity={0.7} style={styles.boardBack}>
            <Text style={styles.boardBackText}>‹ Board</Text>
          </TouchableOpacity>
        )}
        <ClueChip icon={meta.icon} title={meta.title} value={tile.value} tier={tile.tier} />
        <Text style={styles.prompt}>{prompt}</Text>
        {visual}
        {answerUi}
        {/* The teaching beat: the engine's own 4-depth explanation, re-readable
            at any depth via the VerdictCard tabs — never dropped. */}
        <VerdictCard
          visible={judged}
          correct={correctNow}
          tagText={correctNow ? `✓ +${tile.value} BANKED` : '✗ NOT QUITE'}
          modeText={TIER_LABEL[tile.xpLevel]}
          title={verdictTitle}
          level={explainLevel}
          onSelectLevel={setExplainLevel}
          body={exp[explainLevel]}
        />
        <View style={styles.nextRow}>
          <NextButton visible={judged} label="Back to board →" onPress={backToBoard} variant="filled" />
        </View>
      </>
    );
  };

  const comboLabel =
    combo >= 5 ? `🔥🔥 ${combo} in a row!`
    : combo >= 3 ? `🔥 ${combo} in a row!`
    : combo >= 1 ? `🎯 ${combo} in a row!`
    : 'Clear the board! 🎪';

  const rankInfo = getRank(points);

  return (
    <View style={styles.root}>
      {/* Slim in-game header — the anchor for the points feedback (QuizGame pattern),
          plus the session bank (the Jeopardy score). */}
      <View style={styles.statHeader}>
        <Animated.Text style={[styles.statPts, pointsPulseStyle]} numberOfLines={1}>
          {categoryEmoji ? `${categoryEmoji}  ` : ''}{RANK_EMOJI[rank.name] ?? '🔰'} {rank.name} · {points} pts
          {status === 'ready' ? `   🏦 ${banked}` : ''}
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
            <Text style={styles.emptyText}>Setting up the board…</Text>
          </View>
        ) : status === 'error' || !board ? (
          // Effectively unreachable (static engines always build) — guarded anyway.
          <View style={styles.card}>
            <Text style={styles.emptyEmoji}>🎪</Text>
            <Text style={styles.emptyText}>
              Couldn't build a board right now. Try again — your points and streak are safe.
            </Text>
            <TouchableOpacity style={styles.retryBtn} activeOpacity={0.85} onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : active ? (
          renderClue(active)
        ) : boardCleared ? (
          <BoardSummary
            banked={banked}
            maxBank={board.maxBank}
            correct={correctCount}
            total={totalTiles}
            bestStreak={bestStreak}
            xpEarned={xpEarned}
            rankEmoji={RANK_EMOJI[rankInfo.name] ?? '🔰'}
            rankName={rankInfo.name}
            pointsNow={points}
            nextRankName={rankInfo.next?.name ?? null}
            nextRankIn={rankInfo.next ? Math.max(0, rankInfo.next.min - points) : 0}
            onPlayAgain={load}
          />
        ) : (
          <>
            {board.dropped.length > 0 && (
              <Text style={styles.droppedNote}>
                📡 {board.dropped.map(d => COLUMN_META[d].title).join(' & ')} unavailable offline — playing a {board.columns.length}-column board.
              </Text>
            )}
            <BoardGrid columns={board.columns} results={results} onOpen={openTile} />
            <Text style={styles.hint}>
              {answeredCount === 0
                ? 'Pick any tile — higher rows, harder clues, bigger points.'
                : `${totalTiles - answeredCount} tile${totalTiles - answeredCount === 1 ? '' : 's'} to go.`}
            </Text>
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
  prompt: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12, lineHeight: 22 },
  hint: { color: t.textMuted, fontSize: 12.5, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  droppedNote: {
    color: t.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center',
  },
  boardBack: { alignSelf: 'flex-start', marginBottom: 8 },
  boardBackText: { color: t.accentText, fontSize: 14, fontWeight: '800' },
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
