import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAppState, RANK_EMOJI } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import { getGlossary, GlossaryEntry } from '../../lib/glossary';
import type { AcademyGameProps } from '../../lib/academyGames';

const CORRECT = '#34C759';
const WRONG = '#FF3B30';

// Tunable: pairs dealt per round, and points awarded per correct pair (a 5-pair round
// ≈ 25, comparable to a strong quiz streak). Flat + level-agnostic, like Term Match was.
const PAIRS_PER_ROUND = 5;
const MATCH_POINTS = 5;

interface Tile { id: string; text: string }
interface Round { termTiles: Tile[]; labelTiles: Tile[]; size: number }
type Col = 'term' | 'label';

// Dedupe by lowercased term (the Rugby category pools ['rugby','mlr'] → the same array).
function dedupeByTerm(entries: GlossaryEntry[]): GlossaryEntry[] {
  const seen = new Set<string>();
  const out: GlossaryEntry[] = [];
  for (const e of entries) {
    const k = e.term.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// First ~4 words of a def — the graceful fallback label for an entry that has no curated
// `match` (only used when too few entries in the pool have one; never fabricated).
function shortenDef(def: string): string {
  return def.split(/\s+/).slice(0, 4).join(' ');
}
function labelFor(e: GlossaryEntry): string {
  return e.match && e.match.trim() ? e.match.trim() : shortenDef(e.def);
}

// Deal one round of N pairs. Prefer entries that HAVE a `match` label — filter to those
// when ≥ N exist; only fall back to the whole pool (def-shortened) if too few. Pick N
// entries with DISTINCT labels (guard against a collision even though curated distinct).
// The two columns are shuffled independently so a term never sits across from its label.
function buildRound(pool: GlossaryEntry[]): Round | null {
  const withMatch = pool.filter(e => e.match && e.match.trim());
  const usable = withMatch.length >= PAIRS_PER_ROUND ? withMatch : pool;
  if (usable.length < PAIRS_PER_ROUND) return null;

  const chosen: { id: string; term: string; label: string }[] = [];
  const usedLabels = new Set<string>();
  for (const e of shuffle(usable.slice())) {
    const label = labelFor(e);
    const key = label.toLowerCase();
    if (usedLabels.has(key)) continue;
    usedLabels.add(key);
    chosen.push({ id: e.term, term: e.term, label });
    if (chosen.length === PAIRS_PER_ROUND) break;
  }
  if (chosen.length < PAIRS_PER_ROUND) return null;

  return {
    termTiles: shuffle(chosen.map(p => ({ id: p.id, text: p.term }))),
    labelTiles: shuffle(chosen.map(p => ({ id: p.id, text: p.label }))),
    size: chosen.length,
  };
}

type TileMode = 'idle' | 'selected' | 'cleared' | 'wrong';

// A board tile — its own Reanimated values so cleared (green lock + dim) and wrong (red
// flash + shake) animate independently. Selected = accent border + slight scale (instant).
function BoardTile({
  text, mode, baseBg, onPress, theme, styles,
}: { text: string; mode: TileMode; baseBg: string; onPress: () => void; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const op = useSharedValue(1);
  const fillG = useSharedValue(0); // → green when cleared
  const fillR = useSharedValue(0); // → red flash when wrong

  useEffect(() => {
    if (mode === 'cleared') {
      fillG.value = withTiming(1, { duration: 250 });
      op.value = withTiming(0.5, { duration: 300 });
      scale.value = withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 140 }));
    } else if (mode === 'wrong') {
      fillR.value = withSequence(withTiming(1, { duration: 120 }), withDelay(180, withTiming(0, { duration: 200 })));
      tx.value = withSequence(
        withTiming(-7, { duration: 50 }), withTiming(7, { duration: 50 }),
        withTiming(-7, { duration: 50 }), withTiming(7, { duration: 50 }), withTiming(0, { duration: 50 }),
      );
    } else if (mode === 'selected') {
      scale.value = withTiming(1.04, { duration: 120, easing: Easing.out(Easing.quad) });
    } else {
      scale.value = withTiming(1, { duration: 120 });
      op.value = withTiming(1, { duration: 120 });
      fillG.value = withTiming(0, { duration: 120 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: tx.value }],
    opacity: op.value,
    backgroundColor: fillR.value > 0
      ? interpolateColor(fillR.value, [0, 1], [baseBg, WRONG])
      : interpolateColor(fillG.value, [0, 1], [baseBg, CORRECT]),
  }));

  const disabled = mode === 'cleared';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.tilePress}>
      <Animated.View
        style={[
          styles.tile,
          mode === 'selected' && styles.tileSelected,
          mode === 'cleared' && styles.tileCleared,
          aStyle,
        ]}>
        <Text
          style={[styles.tileText, (mode === 'cleared') && styles.tileTextCleared]}
          numberOfLines={3}>
          {text}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Match Up — the tap-to-pair game. A column of TERMS and a shuffled column of their short
// `match` LABELS; tap one then the other to pair them. Spatial + short-label based —
// mechanically distinct from the quiz (no reading four long definitions).
//
// Combo-on-exit is a non-issue: there's no persistent combo, and every correct pair already
// banked via awardPoints() before the player can leave.
export default function MatchGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const pool = useMemo(
    () => dedupeByTerm(sportKeys.flatMap(k => getGlossary(k))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sportKeys.join(',')],
  );

  const [round, setRound] = useState<Round | null>(() => buildRound(pool));
  const [cleared, setCleared] = useState<string[]>([]);
  const [selected, setSelected] = useState<{ col: Col; id: string } | null>(null);
  const [wrong, setWrong] = useState<{ termId: string; labelId: string } | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-deal when the pool changes (category switched on the home before opening).
  useEffect(() => {
    setRound(buildRound(pool));
    setCleared([]); setSelected(null); setWrong(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); }, []);

  // "+N" float + points pulse (same slim-header pattern as QuizGame / Term Match).
  const [pointsFloat, setPointsFloat] = useState<string | null>(null);
  const pointsFloatOpacity = useSharedValue(0);
  const pointsFloatY = useSharedValue(0);
  const pointsPulse = useSharedValue(1);

  const flashPointsGain = (amount: number) => {
    setPointsFloat(`+${amount}`);
    pointsFloatOpacity.value = 0;
    pointsFloatY.value = 0;
    pointsFloatOpacity.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withDelay(400, withTiming(0, { duration: 350 }, finished => {
        if (finished) runOnJS(setPointsFloat)(null);
      })),
    );
    pointsFloatY.value = withTiming(-44, { duration: 900, easing: Easing.out(Easing.quad) });
    pointsPulse.value = withSequence(
      withTiming(1.22, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220 }),
    );
  };

  const pointsFloatStyle = useAnimatedStyle(() => ({
    opacity: pointsFloatOpacity.value,
    transform: [{ translateY: pointsFloatY.value }],
  }));
  const pointsPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pointsPulse.value }] }));

  const roundComplete = !!round && cleared.length === round.size;

  const modeFor = (col: Col, id: string): TileMode => {
    if (cleared.includes(id)) return 'cleared';
    if (wrong && ((col === 'term' && wrong.termId === id) || (col === 'label' && wrong.labelId === id))) return 'wrong';
    if (selected && selected.col === col && selected.id === id) return 'selected';
    return 'idle';
  };

  const onTap = async (col: Col, id: string) => {
    if (cleared.includes(id) || wrong) return;            // ignore cleared tiles + taps mid-shake
    if (!selected) { await Haptics.selectionAsync(); setSelected({ col, id }); return; }
    if (selected.col === col) { await Haptics.selectionAsync(); setSelected({ col, id }); return; } // re-pick same column

    const termId = col === 'term' ? id : selected.id;
    const labelId = col === 'label' ? id : selected.id;
    if (termId === labelId) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCleared(c => [...c, termId]);
      setSelected(null);
      awardPoints(MATCH_POINTS);
      flashPointsGain(MATCH_POINTS);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrong({ termId, labelId });
      setSelected(null);
      wrongTimer.current = setTimeout(() => setWrong(null), 520);
    }
  };

  const nextRound = () => {
    setRound(buildRound(pool));
    setCleared([]); setSelected(null); setWrong(null);
  };

  return (
    <View style={styles.root}>
      {/* Slim in-game header — the anchor for the "+N" float / points pulse. */}
      <View style={styles.statHeader}>
        <Animated.Text style={[styles.statPts, pointsPulseStyle]} numberOfLines={1}>
          {categoryEmoji ? `${categoryEmoji}  ` : ''}{RANK_EMOJI[rank.name] ?? '🔰'} {rank.name} · {points} pts
        </Animated.Text>
        {pointsFloat && (
          <Animated.View style={[styles.pointsFloat, pointsFloatStyle]} pointerEvents="none">
            <Text style={styles.pointsFloatText}>{pointsFloat}</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!round ? (
          // Dead path at full parity (every sport has ≥ N labeled terms) — guarded anyway.
          <View style={styles.card}>
            <Text style={styles.emptyText}>Not enough terms yet for this sport.</Text>
          </View>
        ) : roundComplete ? (
          <View style={styles.card}>
            <Text style={styles.doneTitle}>Round complete! 🎉</Text>
            <Text style={styles.doneBody}>Nice pairing. Deal a fresh board?</Text>
            <TouchableOpacity onPress={nextRound} activeOpacity={0.85} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>Next round →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.prompt}>Tap a term, then its meaning.</Text>
            <View style={styles.board}>
              <View style={styles.col}>
                {round.termTiles.map(t => (
                  <BoardTile key={`t-${t.id}`} text={t.text} mode={modeFor('term', t.id)}
                    baseBg={theme.surfaceAlt} onPress={() => onTap('term', t.id)} theme={theme} styles={styles} />
                ))}
              </View>
              <View style={styles.col}>
                {round.labelTiles.map(t => (
                  <BoardTile key={`l-${t.id}`} text={t.text} mode={modeFor('label', t.id)}
                    baseBg={theme.surfaceActive} onPress={() => onTap('label', t.id)} theme={theme} styles={styles} />
                ))}
              </View>
            </View>
            <Text style={styles.progress}>{cleared.length} / {round.size} matched</Text>
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
  pointsFloat: { position: 'absolute', top: 4, right: 20 },
  pointsFloatText: { color: t.accent, fontSize: 20, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  prompt: { color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 16 },
  // Two-column board: terms left, shuffled labels right.
  board: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 10 },
  tilePress: { borderRadius: 14 },
  tile: {
    minHeight: 64, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10,
  },
  tileSelected: { borderColor: t.accent, borderWidth: 2 },
  tileCleared: { borderColor: CORRECT },
  tileText: { color: t.textPrimary, fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  tileTextCleared: { color: '#ffffff', fontWeight: '800' },
  progress: { color: t.textMuted, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  // Round-complete + empty cards.
  card: {
    backgroundColor: t.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: t.border,
    alignItems: 'center',
  },
  doneTitle: { color: t.accent, fontSize: 20, fontWeight: '900', marginBottom: 6 },
  doneBody: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16, textAlign: 'center' },
  nextBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22 },
  nextBtnText: { color: t.onAccent, fontSize: 15, fontWeight: '900' },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
