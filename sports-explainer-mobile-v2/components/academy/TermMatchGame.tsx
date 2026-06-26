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

// Flat, level-agnostic award. The glossary isn't difficulty-tagged (do NOT invent tags),
// so term-match is one flat set in v1 — a mid value between the quiz's beginner (10) and
// intermediate (20) tiers, reflecting a moderate recall task. Tunable in one place.
const TERM_MATCH_POINTS = 15;

interface TermQuestion { term: string; options: string[]; answer: number }

// Dedupe by lowercased term — the Rugby category pools ['rugby','mlr'], both of which
// return the SAME array, so without this every rugby term would appear twice.
function dedupeByTerm(entries: GlossaryEntry[]): GlossaryEntry[] {
  const seen = new Set<string>();
  const out: GlossaryEntry[] = [];
  for (const e of entries) {
    const k = e.term.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

// Build one question from REAL glossary content only: a random term is the prompt, its
// own def is the correct option, and 3 distractors are the defs of OTHER real terms in
// the same pool (never fabricated). `avoidTerm` skips an immediate repeat of the prompt.
function buildQuestion(pool: GlossaryEntry[], avoidTerm?: string): TermQuestion | null {
  if (pool.length < 4) return null;
  const candidates = avoidTerm && pool.length > 4 ? pool.filter(e => e.term !== avoidTerm) : pool;
  const correct = candidates[Math.floor(Math.random() * candidates.length)];

  // Draw 3 distinct distractors whose def differs from the correct one (guards rare dupes).
  const distractors: GlossaryEntry[] = [];
  const used = new Set<string>([correct.term.toLowerCase()]);
  let guard = 0;
  while (distractors.length < 3 && guard < 500) {
    guard++;
    const e = pool[Math.floor(Math.random() * pool.length)];
    const k = e.term.toLowerCase();
    if (used.has(k) || e.def === correct.def) continue;
    used.add(k);
    distractors.push(e);
  }
  if (distractors.length < 3) return null;

  // Fisher–Yates shuffle the 4 options, tracking where the correct one (index 0) lands.
  const opts = [correct, ...distractors];
  const order = opts.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    term: correct.term,
    options: order.map(i => opts[i].def),
    answer: order.indexOf(0),
  };
}

type OptMode = 'idle' | 'green' | 'red' | 'dim';

// A single definition option — owns its own Reanimated values so correct/wrong reveals
// animate independently (green/red fill, a small bounce on the chosen-correct one). Mirrors
// the Quick Quiz reveal feel. Definitions can be 1–2 lines, so the text wraps freely.
function DefOption({
  label, mode, disabled, onPress, theme, styles,
}: { label: string; mode: OptMode; disabled: boolean; onPress: () => void; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  const fill = useSharedValue(0);
  const scale = useSharedValue(1);
  const op = useSharedValue(1);

  useEffect(() => {
    if (mode === 'green' || mode === 'red') {
      fill.value = withTiming(1, { duration: 250 });
      op.value = withTiming(1, { duration: 150 });
      if (mode === 'green') {
        scale.value = withSequence(
          withTiming(1.02, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160 }),
        );
      }
    } else if (mode === 'dim') {
      fill.value = withTiming(0, { duration: 150 });
      op.value = withTiming(0.5, { duration: 150 });
    } else {
      fill.value = withTiming(0, { duration: 150 });
      op.value = withTiming(1, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const target = mode === 'red' ? WRONG : CORRECT;
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: op.value,
    backgroundColor: interpolateColor(fill.value, [0, 1], [theme.surfaceAlt, target]),
    borderColor: interpolateColor(fill.value, [0, 1], [theme.border, target]),
  }));

  const revealed = mode === 'green' || mode === 'red';
  return (
    <Animated.View style={[styles.option, aStyle]}>
      <Pressable style={styles.optionPress} onPress={onPress} disabled={disabled}>
        <Text style={[styles.optionText, revealed && styles.optionTextRevealed]}>{label}</Text>
        {mode === 'green' && <Text style={styles.mark}>✓</Text>}
        {mode === 'red' && <Text style={styles.mark}>✕</Text>}
      </Pressable>
    </Animated.View>
  );
}

// Term Match — the second registered Academy game. Show a TERM, present 4 real glossary
// definitions (1 correct + 3 distractors from OTHER terms), tap the right one.
//
// v1 scope notes:
//  • Level-agnostic — the glossary has no difficulty tags, so there's one flat set (no
//    level picker) and a flat TERM_MATCH_POINTS award.
//  • Simple feedback — a "+N" float + points pulse + the green/red reveal. The quiz's
//    combo / milestone / rank-up cluster is NOT reused (it lives inside QuizGame and would
//    need a shared-feedback refactor); kept simple for v1 by design.
//  • Does not advance the daily streak / arm the reminder (those stay quiz-only for now).
//  • Combo-on-exit is a non-issue: there's no combo state here, and each correct answer
//    already persisted via awardPoints(), so leaving loses nothing.
export default function TermMatchGame({ sportKeys, categoryEmoji }: AcademyGameProps) {
  const { points, rank, awardPoints } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Deduped pool for this category's sport(s). Memoized on the keys so it's stable.
  const pool = useMemo(
    () => dedupeByTerm(sportKeys.flatMap(k => getGlossary(k))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sportKeys.join(',')],
  );

  const [question, setQuestion] = useState<TermQuestion | null>(() => buildQuestion(pool));
  const [selected, setSelected] = useState<number | null>(null);

  // Re-seed when the pool changes (e.g. category switched on the home before opening).
  useEffect(() => {
    setQuestion(buildQuestion(pool));
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  // "+N" float + points pulse (same pattern as QuizGame, minus combo/milestone/rank-up).
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

  const pointsFloatStyle = useAnimatedStyle(() => ({
    opacity: pointsFloatOpacity.value,
    transform: [{ translateY: pointsFloatY.value }],
  }));
  const pointsPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pointsPulse.value }] }));

  const answered = selected !== null;

  const choose = async (i: number) => {
    if (answered || !question) return;
    const isRight = i === question.answer;
    await Haptics.notificationAsync(
      isRight ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
    setSelected(i);
    if (isRight) {
      awardPoints(TERM_MATCH_POINTS);
      flashPointsGain(TERM_MATCH_POINTS);
    }
  };

  const next = () => {
    setQuestion(buildQuestion(pool, question?.term));
    setSelected(null);
  };

  const optMode = (i: number): OptMode =>
    !answered ? 'idle' : i === question!.answer ? 'green' : i === selected ? 'red' : 'dim';

  return (
    <View style={styles.root}>
      {/* Slim in-game header — the anchor for the "+N" float / points pulse (the full rank
          card lives on the Academy home). Consistent with QuizGame's header. */}
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
        {question ? (
          <View style={styles.card}>
            <Text style={styles.label}>🔤 TERM MATCH</Text>
            <Text style={styles.prompt}>What does <Text style={styles.promptTerm}>{question.term}</Text> mean?</Text>

            <View style={styles.options}>
              {question.options.map((opt, i) => (
                <DefOption
                  key={i}
                  label={opt}
                  mode={optMode(i)}
                  disabled={answered}
                  onPress={() => choose(i)}
                  theme={theme}
                  styles={styles}
                />
              ))}
            </View>

            {answered && (
              <TouchableOpacity onPress={next} activeOpacity={0.7} style={styles.nextRow}>
                <Text style={styles.nextText}>Next term →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // No glossary for this category (or too few terms). Term Match supports the
          // three sports with curated glossaries; guide the user back to pick one.
          <View style={styles.card}>
            <Text style={styles.label}>🔤 TERM MATCH</Text>
            <Text style={styles.emptyText}>
              Term Match supports MLB, NFL, and Rugby for now — tap ‹ Academy and pick one of those.
            </Text>
          </View>
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
  // Elevated "game card" feel — mirrors the Quick Quiz card.
  card: {
    backgroundColor: t.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
  },
  label: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  prompt: { color: t.textPrimary, fontSize: 18, fontWeight: '800', lineHeight: 25, marginBottom: 16 },
  promptTerm: { color: t.accent, fontWeight: '900' },
  options: { gap: 10 },
  option: { borderRadius: 14, borderWidth: 1, minHeight: 52, overflow: 'hidden' },
  optionPress: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  optionText: { color: t.textPrimary, fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 21 },
  optionTextRevealed: { color: '#ffffff', fontWeight: '700' },
  mark: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginLeft: 10 },
  nextRow: { marginTop: 16, alignSelf: 'flex-end' },
  nextText: { color: t.accentText, fontSize: 14, fontWeight: '700' },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22 },
});
