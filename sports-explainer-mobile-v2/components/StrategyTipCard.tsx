import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Sport } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { tipsForSport } from '../lib/strategyTips';

interface Props {
  sport: Sport; // the selected Coach's Corner sport; tips pooled per logical sport
}

// Picks a random index in [0, len), optionally avoiding `exclude`.
function randomIndex(len: number, exclude?: number): number {
  if (len <= 1) return 0;
  let n = Math.floor(Math.random() * len);
  while (n === exclude) n = Math.floor(Math.random() * len);
  return n;
}

// "Today's Strategy Tip" card — mirrors DidYouKnow (orange left-accent, one item at a time, fade-and-
// next), but backed by the strategy-tip bank (lib/strategyTips) instead of trivia FACTS.
export default function StrategyTipCard({ sport }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const tips = tipsForSport(sport);

  const [idx, setIdx] = useState(() => randomIndex(tips.length));
  const opacity = useSharedValue(1);

  // Fresh random tip whenever the selected sport changes.
  useEffect(() => {
    setIdx(randomIndex(tips.length));
    opacity.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  if (tips.length === 0) return null;

  const swap = () => {
    setIdx(prev => randomIndex(tips.length, prev));
    opacity.value = withTiming(1, { duration: 150 });
  };

  const next = () => {
    if (tips.length <= 1) return;
    opacity.value = withTiming(0, { duration: 150 }, finished => {
      if (finished) runOnJS(swap)();
    });
  };

  const tipStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>🧠 TODAY'S STRATEGY TIP</Text>
      <Animated.Text style={[styles.fact, tipStyle]}>{tips[idx]?.tip ?? ''}</Animated.Text>
      {tips.length > 1 && (
        <TouchableOpacity onPress={next} activeOpacity={0.7} style={styles.nextRow}>
          <Text style={styles.nextText}>Next tip →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Copied verbatim from DidYouKnow.tsx so the two cards are a visual family.
  card: {
    backgroundColor: t.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: t.accent,
    borderWidth: 1,
    borderColor: t.border,
  },
  label: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  fact: { color: t.textPrimary, fontSize: 15, lineHeight: 22 },
  nextRow: { marginTop: 12, alignSelf: 'flex-end' },
  nextText: { color: t.accentText, fontSize: 13, fontWeight: '700' },
});
