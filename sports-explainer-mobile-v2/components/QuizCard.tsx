import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, interpolateColor, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Sport } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { QUIZ, QuizQuestion } from '../lib/facts';

interface Props {
  sportKeys: Sport[]; // one or more league keys; questions are pooled across them
  streak: number;
  onCorrect: () => void;
  onWrong: () => void;
}

const CORRECT = '#34C759';
const WRONG = '#FF3B30';

const ENCOURAGEMENT = [
  "Nice work! 🎯",
  "You got it! 🏆",
  "That's right! ⭐",
  "Correct! 🔥",
  "Nailed it! 🎉",
];
const WRONG_MESSAGES = [
  "So close! 📚",
  "Not quite — but now you know! 🎓",
  "Good try! 💪",
  "Almost! Check below 👇",
];

const LEVELS: Array<{ key: 'kid' | 'beginner' | 'intermediate' | 'expert'; label: string }> = [
  { key: 'kid', label: 'Kid' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'expert', label: 'Expert' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomIndex(len: number, exclude?: number): number {
  if (len <= 1) return 0;
  let n = Math.floor(Math.random() * len);
  while (n === exclude) n = Math.floor(Math.random() * len);
  return n;
}

// Fisher–Yates shuffle of a question's options, remapping the answer index so
// correctness checks still work. Called ONCE per question (not per render).
function shuffleQuestion(q: QuizQuestion): { options: string[]; answer: number } {
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const options = indices.map(i => q.options[i]);
  const answer = indices.indexOf(q.answer);
  return { options, answer };
}

type OptMode = 'idle' | 'green' | 'red' | 'dim';

interface OptionProps {
  label: string;
  mode: OptMode;
  bounce: boolean;
  shake: boolean;
  disabled: boolean;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof makeStyles>;
}

// A single answer option. Owns its own Reanimated values so correct/wrong reveals
// animate independently: green/red fill, a scale bounce on the chosen-correct one,
// and a shake on the chosen-wrong one.
function QuizOption({ label, mode, bounce, shake, disabled, onPress, theme, styles }: OptionProps) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const fill = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    if (mode === 'green' || mode === 'red') {
      fill.value = withTiming(1, { duration: 250 });
      op.value = withTiming(1, { duration: 150 });
    } else if (mode === 'dim') {
      fill.value = withTiming(0, { duration: 150 });
      op.value = withTiming(0.5, { duration: 150 });
    } else {
      fill.value = withTiming(0, { duration: 150 });
      op.value = withTiming(1, { duration: 150 });
    }
    if (bounce) {
      scale.value = withSequence(
        withTiming(1.03, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 150 }),
      );
    }
    if (shake) {
      tx.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, bounce, shake]);

  const target = mode === 'red' ? WRONG : CORRECT;
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: tx.value }],
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

// "Quick Quiz" — one multiple-choice question at a time. Tapping an option reveals
// the answer (green/red + bounce/shake), shows a random encouragement/consolation
// line + explanation, and reports the result up so Academy can drive the streak.
export default function QuizCard({ sportKeys, streak, onCorrect, onWrong }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Difficulty is the GLOBAL app level (shared with Settings + the Live tab), so the
  // quiz picker and Settings stay in sync. Always set (never null) — and tapping a
  // pill here updates Settings/Live too.
  const { level, setLevel } = useAppState();

  // Full pool across the category's keys, then narrowed to the active difficulty.
  const fullPool = sportKeys.flatMap(k => QUIZ[k] || []);
  const questions = fullPool.filter(q => q.difficulty === level);

  const [qIdx, setQIdx] = useState(() => randomIndex(questions.length));
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // The current question's shuffled options + remapped answer index (set once per
  // question). Null until the first shuffle runs (reset effect on mount).
  const [shuffled, setShuffled] = useState<{ options: string[]; answer: number } | null>(null);

  // Recently shown indices (incl. current) — excluded when picking the next so the
  // whole pool cycles before any repeat. Window = len - 1, so a 5-question pool shows
  // all 5 before repeating; a 20-question pool cycles through all 20.
  const recent = useRef<number[]>([]);
  const pickIndex = (len: number): number => {
    if (len <= 1) { recent.current = [0]; return 0; }
    const exclude = recent.current.slice(-(len - 1));
    let pool = Array.from({ length: len }, (_, i) => i).filter(i => !exclude.includes(i));
    if (pool.length === 0) pool = Array.from({ length: len }, (_, i) => i);
    const n = pool[Math.floor(Math.random() * pool.length)];
    recent.current = [...recent.current, n].slice(-(len - 1));
    return n;
  };

  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const revealOpacity = useSharedValue(0);

  // Fresh question (recent history reset) whenever the category keys OR level change.
  useEffect(() => {
    recent.current = [];
    const idx = pickIndex(questions.length);
    setQIdx(idx);
    setShuffled(questions[idx] ? shuffleQuestion(questions[idx]) : null);
    setSelected(null);
    setMessage(null);
    cardOpacity.value = 1;
    revealOpacity.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportKeys.join(','), level]);

  // No early return here — all hooks above run unconditionally. Emptiness is handled
  // in the render by gating on `question` itself: this covers both a category+level
  // combo with no questions AND the one render right after the level/category changes
  // where qIdx is still stale/out-of-range for the new pool (before the reset effect
  // re-picks). `questions[qIdx]` is undefined in both cases → render the safe branch.
  const question = questions[qIdx];
  // Use the shuffled presentation; fall back to the unshuffled question for the
  // brief first frame before the reset effect sets `shuffled`. When there are no
  // questions, `view` is an empty placeholder (the question block isn't rendered).
  const view = shuffled ?? (question
    ? { options: question.options, answer: question.answer }
    : { options: [] as string[], answer: -1 });
  const answered = selected !== null;

  const choose = async (i: number) => {
    if (answered) return;
    const isRight = i === view.answer;
    await Haptics.notificationAsync(
      isRight ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
    setSelected(i);
    if (isRight) {
      setMessage(pick(ENCOURAGEMENT));
      cardScale.value = withSequence(
        withTiming(1.03, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 150 }),
      );
      onCorrect();
    } else {
      setMessage(pick(WRONG_MESSAGES));
      onWrong();
    }
    revealOpacity.value = withTiming(1, { duration: 250 });
  };

  const applyNext = () => {
    const idx = pickIndex(questions.length);
    setQIdx(idx);
    setShuffled(questions[idx] ? shuffleQuestion(questions[idx]) : null);
    setSelected(null);
    setMessage(null);
    revealOpacity.value = 0;
    cardOpacity.value = withTiming(1, { duration: 150 });
  };

  const next = () => {
    revealOpacity.value = withTiming(0, { duration: 120 });
    cardOpacity.value = withTiming(0, { duration: 150 }, finished => {
      if (finished) runOnJS(applyNext)();
    });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const revealStyle = useAnimatedStyle(() => ({ opacity: revealOpacity.value }));

  const optMode = (i: number): OptMode =>
    !answered ? 'idle' : i === view.answer ? 'green' : i === selected ? 'red' : 'dim';

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Text style={styles.label}>🎯 QUICK QUIZ</Text>

      {/* Level picker — tapping re-pools/re-picks via the level-dependent reset effect.
          The highlighted pill doubles as the "what level am I on" indicator. */}
      <View style={styles.levelRow}>
        {LEVELS.map(l => {
          const active = level === l.key;
          return (
            <TouchableOpacity
              key={l.key}
              style={[styles.levelPill, active && styles.levelPillActive]}
              onPress={async () => { await Haptics.selectionAsync(); setLevel(l.key); }}
              activeOpacity={0.7}>
              <Text
                style={[styles.levelPillText, active && styles.levelPillTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {question ? (
        <>
          <Text style={styles.question}>{question.q}</Text>

          <View style={styles.options}>
            {view.options.map((opt, i) => (
              <QuizOption
                key={i}
                label={opt}
                mode={optMode(i)}
                bounce={answered && i === view.answer && selected === view.answer}
                shake={i === selected && selected !== view.answer}
                disabled={answered}
                onPress={() => choose(i)}
                theme={theme}
                styles={styles}
              />
            ))}
          </View>

          {answered && (
            <Animated.View style={revealStyle}>
              {message && <Text style={styles.message}>{message}</Text>}
              <Text style={styles.explanation}>{question.explanation}</Text>
              {questions.length > 1 && (
                <TouchableOpacity onPress={next} activeOpacity={0.7} style={styles.nextRow}>
                  <Text style={styles.nextText}>Next question →</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No questions at this level yet — try another level.</Text>
      )}
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Elevated "game card" feel.
  card: {
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  label: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  // Level picker — four equal-width pills forced onto a single row (no wrap).
  levelRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  levelPill: { flex: 1, minHeight: 34, paddingHorizontal: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  levelPillActive: { backgroundColor: t.accent, borderColor: t.accent },
  levelPillText: { color: t.textSecondary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  levelPillTextActive: { color: t.onAccent },
  question: { color: t.textPrimary, fontSize: 17, fontWeight: '800', lineHeight: 24, marginBottom: 16 },
  options: { gap: 10 },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 52,
    overflow: 'hidden',
  },
  optionPress: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: { color: t.textPrimary, fontSize: 16, fontWeight: '600', flex: 1 },
  optionTextRevealed: { color: '#ffffff', fontWeight: '800' },
  mark: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginLeft: 10 },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22 },
  message: { color: t.accentText, fontSize: 15, fontWeight: '800', marginTop: 16 },
  explanation: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  nextRow: { marginTop: 16, alignSelf: 'flex-end' },
  nextText: { color: t.accentText, fontSize: 14, fontWeight: '700' },
});
