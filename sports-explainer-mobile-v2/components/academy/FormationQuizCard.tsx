// FormationQuizCard — the read-the-play quiz card. Mirrors the live QuizCard's mechanic (level pills,
// 4 animated options, reveal + explanation + Next, no-repeat cycling) but renders a FormationDiagram
// (quiz mode) as the QUESTION VISUAL above the options. Questions come from lib/formationQuiz (generated
// from the canonical formations), NOT from facts.QUIZ. QuizOption is COPIED from the live QuizCard so
// the shipped Academy quiz is left completely untouched.

import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, interpolateColor, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import FormationDiagram from '../FormationDiagram';
import { FormationQuizQuestion, buildFormationQuestionPool } from '../../lib/formationQuiz';
import { synthTeam } from '../../lib/canonicalFormations';

interface Props {
  onCorrect: () => void;
  onWrong: () => void;
}

const CORRECT = '#34C759';
const WRONG = '#FF3B30';

const ENCOURAGEMENT = ['Nice work! 🎯', 'You got it! 🏆', "That's right! ⭐", 'Correct! 🔥', 'Nailed it! 🎉'];
const WRONG_MESSAGES = ['So close! 📚', 'Not quite — but now you know! 🎓', 'Good try! 💪', 'Almost! Check below 👇'];

const LEVELS: Array<{ key: 'kid' | 'beginner' | 'intermediate' | 'expert'; label: string }> = [
  { key: 'kid', label: 'Rookie' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'expert', label: 'Expert' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fisher–Yates shuffle of a question's options, remapping the answer index (once per question).
function shuffleOptions(q: FormationQuizQuestion): { options: string[]; answer: number } {
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { options: idx.map((i) => q.options[i]), answer: idx.indexOf(q.answer) };
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

// COPIED VERBATIM from the live QuizCard so the shipped quiz isn't touched. Owns its own Reanimated
// values: green/red fill, scale bounce on chosen-correct, shake on chosen-wrong.
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
        withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }),
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

export default function FormationQuizCard({ onCorrect, onWrong }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { level, setLevel } = useAppState();

  // The pool is one generated question per formation at the current level; regenerated on level change
  // (the question TYPE changes: name → weakness). 12 questions, cycled with no-repeat like the live quiz.
  const [pool, setPool] = useState<FormationQuizQuestion[]>(() => buildFormationQuestionPool(level));
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shuffled, setShuffled] = useState<{ options: string[]; answer: number } | null>(null);

  const recent = useRef<number[]>([]);
  const pickIndex = (len: number): number => {
    if (len <= 1) { recent.current = [0]; return 0; }
    const exclude = recent.current.slice(-(len - 1));
    let p = Array.from({ length: len }, (_, i) => i).filter((i) => !exclude.includes(i));
    if (p.length === 0) p = Array.from({ length: len }, (_, i) => i);
    const n = p[Math.floor(Math.random() * p.length)];
    recent.current = [...recent.current, n].slice(-(len - 1));
    return n;
  };

  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const revealOpacity = useSharedValue(0);

  // Fresh pool + question whenever the level changes (name-the ↔ weakness).
  useEffect(() => {
    const next = buildFormationQuestionPool(level);
    setPool(next);
    recent.current = [];
    const idx = pickIndex(next.length);
    setQIdx(idx);
    setShuffled(next[idx] ? shuffleOptions(next[idx]) : null);
    setSelected(null);
    setMessage(null);
    cardOpacity.value = 1;
    revealOpacity.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const question = pool[qIdx];
  const view = shuffled ?? (question ? { options: question.options, answer: question.answer } : { options: [] as string[], answer: -1 });
  const answered = selected !== null;

  const choose = async (i: number) => {
    if (answered) return;
    const isRight = i === view.answer;
    await Haptics.notificationAsync(isRight ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
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
    const idx = pickIndex(pool.length);
    setQIdx(idx);
    setShuffled(pool[idx] ? shuffleOptions(pool[idx]) : null);
    setSelected(null);
    setMessage(null);
    revealOpacity.value = 0;
    cardOpacity.value = withTiming(1, { duration: 150 });
  };

  const next = () => {
    revealOpacity.value = withTiming(0, { duration: 120 });
    cardOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(applyNext)();
    });
  };

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }], opacity: cardOpacity.value }));
  const revealStyle = useAnimatedStyle(() => ({ opacity: revealOpacity.value }));

  const optMode = (i: number): OptMode =>
    !answered ? 'idle' : i === view.answer ? 'green' : i === selected ? 'red' : 'dim';

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Level picker — tapping re-pools (and flips the question type at the int/expert boundary). */}
      <View style={styles.levelRow}>
        {LEVELS.map((l) => {
          const active = level === l.key;
          return (
            <TouchableOpacity
              key={l.key}
              style={[styles.levelPill, active && styles.levelPillActive]}
              onPress={async () => { await Haptics.selectionAsync(); setLevel(l.key); }}
              activeOpacity={0.7}>
              <Text style={[styles.levelPillText, active && styles.levelPillTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {question ? (
        <>
          {/* The QUESTION VISUAL: the canonical formation diagram in quiz mode. Name-the questions hide
              the label; weakness questions show it. The coach's read is always hidden (it's the answer). */}
          <View style={styles.diagramWrap}>
            <FormationDiagram
              team={synthTeam(question.formation)}
              level={level}
              hideFormationLabel={!question.showLabel}
              hideExplanation
            />
          </View>

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
              {pool.length > 1 && (
                <TouchableOpacity onPress={next} activeOpacity={0.7} style={styles.nextRow}>
                  <Text style={styles.nextText}>Next question →</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No questions available.</Text>
      )}
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: {
    backgroundColor: t.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
  },
  levelRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  levelPill: { flex: 1, minHeight: 34, paddingHorizontal: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  levelPillActive: { backgroundColor: t.accent, borderColor: t.accent },
  levelPillText: { color: t.textSecondary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  levelPillTextActive: { color: t.onAccent },
  // The diagram sits in a constrained-width box so the tall pitch doesn't dominate the card.
  diagramWrap: { width: '62%', alignSelf: 'center', marginBottom: 14 },
  question: { color: t.textPrimary, fontSize: 17, fontWeight: '800', lineHeight: 24, marginBottom: 16 },
  options: { gap: 10 },
  option: { borderRadius: 14, borderWidth: 1, minHeight: 52, overflow: 'hidden' },
  optionPress: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  optionText: { color: t.textPrimary, fontSize: 16, fontWeight: '600', flex: 1 },
  optionTextRevealed: { color: '#ffffff', fontWeight: '800' },
  mark: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginLeft: 10 },
  emptyText: { color: t.textSecondary, fontSize: 15, lineHeight: 22 },
  message: { color: t.accentText, fontSize: 15, fontWeight: '800', marginTop: 16 },
  explanation: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  nextRow: { marginTop: 16, alignSelf: 'flex-end' },
  nextText: { color: t.accentText, fontSize: 14, fontWeight: '700' },
});
