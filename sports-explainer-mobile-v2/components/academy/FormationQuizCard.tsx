// FormationQuizCard — the "Read the Play" quiz card. The MECHANIC is untouched (4 shuffled options,
// no-repeat cycling over a 12-question pool, haptics, green/red reveal, explanation + Next, and the
// difficulty tabs that swap the question TYPE: kid/beginner → name-the-formation, intermediate/expert
// → weakness). What changed is the SKIN, which had drifted a generation behind the rest of Coach's
// Corner: the question visual is now FormationDiagram on FieldEngine's shared SoccerPitch (striped
// turf, chalk, boxes, modern actors) at full content width instead of a thin outlined diagram squeezed
// into 62% of a card; the bespoke level pills are the shared DifficultyTabs; the question and the
// reveal sit in the modern prompt/verdict cards; and Next is the shared NextButton.
//
// PORTRAIT, deliberately: a four-option text quiz with a scoring header is a portrait form, and the
// tiers here mutate the app-wide level (they always have) — that behaviour is load-bearing and is
// preserved exactly. Pinch-to-zoom on the pitch covers close reading of the shape.

import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, interpolateColor, runOnJS, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import type { Level } from '../../lib/api';
import ZoomableField from '../ZoomableField';
import FormationDiagram from '../FormationDiagram';
import { DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { FormationQuizQuestion, buildFormationQuestionPool } from '../../lib/formationQuiz';
import { synthTeam } from '../../lib/canonicalFormations';

interface Props {
  onCorrect: () => void;
  onWrong: () => void;
}

const CORRECT = '#34C759';
const WRONG = '#FF3B30';
const GK_C = '#8e44ad';

const ENCOURAGEMENT = ['Nice work! 🎯', 'You got it! 🏆', "That's right! ⭐", 'Correct! 🔥', 'Nailed it! 🎉'];
const WRONG_MESSAGES = ['So close! 📚', 'Not quite — but now you know! 🎓', 'Good try! 💪', 'Almost! Check below 👇'];

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

// All four options share ONE style — the accent fill every modern module uses for peer choices. A
// colour difference between options would leak the answer key, so the ONLY colour that ever differs
// is the post-answer RESULT (green correct / red chosen-wrong / dimmed rest).
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
      op.value = withTiming(0.45, { duration: 150 });
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
    backgroundColor: interpolateColor(fill.value, [0, 1], [theme.accent, target]),
    borderColor: interpolateColor(fill.value, [0, 1], [theme.accent, target]),
  }));

  return (
    <Animated.View style={[styles.option, aStyle]}>
      <Pressable style={styles.optionPress} onPress={onPress} disabled={disabled}>
        <Text style={styles.optionText}>{label}</Text>
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
  const correct = answered && selected === view.answer;

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

  // Tier tabs — SAME behaviour as before (they set the app level, which re-pools and flips the
  // question type at the intermediate boundary); only the control is now the shared one.
  const onPickLevel = async (l: Level) => { await Haptics.selectionAsync(); setLevel(l); };

  return (
    <Animated.View style={[styles.wrap, cardStyle]}>
      <DifficultyTabs level={level} onSelect={onPickLevel} />

      {question ? (
        <>
          {/* The QUESTION VISUAL: the canonical formation on the shared pitch. Name-the questions hide
              the formation label; weakness questions show it. The coach's read is never drawn on the
              pitch (it is the reveal). */}
          <ZoomableField>
            <FormationDiagram team={synthTeam(question.formation)} hideFormationLabel={!question.showLabel} />
          </ZoomableField>

          <View style={styles.legend}>
            {([['Outfield', FE.orange], ['Keeper', GK_C]] as [string, string][]).map(([lbl, c]) => (
              <View key={lbl} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c }]} />
                <Text style={styles.legendTxt}>{lbl}</Text>
              </View>
            ))}
            <Text style={styles.legendTxt}>Own goal left · attacking right</Text>
          </View>

          <View style={styles.prompt}>
            <Text style={styles.promptTxt}>{question.q}</Text>
          </View>

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
            <Animated.View style={[styles.revealCol, revealStyle]}>
              <View style={styles.verdict}>
                <Text style={[styles.vtag, correct ? styles.vtagGood : styles.vtagBad]}>
                  {correct ? 'Correct' : 'Not quite'}
                </Text>
                {message && <Text style={styles.vtitle}>{message}</Text>}
                <Text style={styles.readlbl}>COACH'S READ</Text>
                <Text style={styles.vbody}>{question.explanation}</Text>
              </View>
              {pool.length > 1 && (
                <NextButton visible variant="filled" label="Next question →" onPress={next} style={styles.nextFill} />
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
  wrap: { gap: 10 },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Question prompt.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 15, lineHeight: 22, fontWeight: '800' },
  // Options — one shared style; 52pt clears the 44pt touch minimum.
  options: { gap: 8 },
  option: { borderRadius: 12, borderWidth: 1, minHeight: 52, overflow: 'hidden' },
  optionPress: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  optionText: { color: '#ffffff', fontSize: 15, fontWeight: '800', flex: 1 },
  mark: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginLeft: 10 },
  emptyText: { color: t.textSecondaryOnDark, fontSize: 15, lineHeight: 22 },
  // Reveal.
  revealCol: { gap: 10 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  readlbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20, marginTop: 4 },
  nextFill: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
});
