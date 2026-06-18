import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, interpolateColor, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Sport } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { QUIZ } from '../lib/facts';

interface Props {
  sport: Sport;
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomIndex(len: number, exclude?: number): number {
  if (len <= 1) return 0;
  let n = Math.floor(Math.random() * len);
  while (n === exclude) n = Math.floor(Math.random() * len);
  return n;
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
export default function QuizCard({ sport, streak, onCorrect, onWrong }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const questions = QUIZ[sport] || [];

  const [qIdx, setQIdx] = useState(() => randomIndex(questions.length));
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Last 3 shown indices (incl. current) — excluded when picking the next question
  // so the same one can't reappear within 3 questions of itself.
  const recent = useRef<number[]>([]);
  const pickIndex = (len: number): number => {
    if (len <= 1) { recent.current = [0]; return 0; }
    const exclude = recent.current.slice(-3);
    let pool = Array.from({ length: len }, (_, i) => i).filter(i => !exclude.includes(i));
    if (pool.length === 0) pool = Array.from({ length: len }, (_, i) => i);
    const n = pool[Math.floor(Math.random() * pool.length)];
    recent.current = [...recent.current, n].slice(-3);
    return n;
  };

  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const revealOpacity = useSharedValue(0);

  // Fresh question (recent history reset) whenever the sport changes.
  useEffect(() => {
    recent.current = [];
    setQIdx(pickIndex((QUIZ[sport] || []).length));
    setSelected(null);
    setMessage(null);
    cardOpacity.value = 1;
    revealOpacity.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  if (questions.length === 0) return null;

  const question = questions[qIdx];
  const answered = selected !== null;

  const choose = async (i: number) => {
    if (answered) return;
    const isRight = i === question.answer;
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
    setQIdx(pickIndex(questions.length));
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
    !answered ? 'idle' : i === question.answer ? 'green' : i === selected ? 'red' : 'dim';

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Text style={styles.label}>🎯 QUICK QUIZ</Text>
      <Text style={styles.question}>{question.q}</Text>

      <View style={styles.options}>
        {question.options.map((opt, i) => (
          <QuizOption
            key={i}
            label={opt}
            mode={optMode(i)}
            bounce={answered && i === question.answer && selected === question.answer}
            shake={i === selected && selected !== question.answer}
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
  message: { color: t.accentText, fontSize: 15, fontWeight: '800', marginTop: 16 },
  explanation: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  nextRow: { marginTop: 16, alignSelf: 'flex-end' },
  nextText: { color: t.accentText, fontSize: 14, fontWeight: '700' },
});
