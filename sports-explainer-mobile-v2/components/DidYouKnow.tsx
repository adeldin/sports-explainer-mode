import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Sport } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import FACTS from '../lib/facts';

interface Props {
  sport: Sport;
}

// Picks a random index in [0, len), optionally avoiding `exclude`.
function randomIndex(len: number, exclude?: number): number {
  if (len <= 1) return 0;
  let n = Math.floor(Math.random() * len);
  while (n === exclude) n = Math.floor(Math.random() * len);
  return n;
}

// "Did You Know" card — one fact at a time from the per-sport facts bank. "Next
// fact" cross-fades to a different random fact (fade out → swap → fade in). Orange
// left accent matches the Live tab's WHY IT MATTERS card.
export default function DidYouKnow({ sport }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const facts = FACTS[sport] || [];

  const [idx, setIdx] = useState(() => randomIndex(facts.length));
  const opacity = useSharedValue(1);

  // Fresh random fact whenever the sport changes.
  useEffect(() => {
    setIdx(randomIndex((FACTS[sport] || []).length));
    opacity.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  if (facts.length === 0) return null;

  const swap = () => {
    setIdx(prev => randomIndex(facts.length, prev));
    opacity.value = withTiming(1, { duration: 150 });
  };

  const next = () => {
    if (facts.length <= 1) return;
    opacity.value = withTiming(0, { duration: 150 }, finished => {
      if (finished) runOnJS(swap)();
    });
  };

  const factStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>💡 DID YOU KNOW?</Text>
      <Animated.Text style={[styles.fact, factStyle]}>{facts[idx]}</Animated.Text>
      {facts.length > 1 && (
        <TouchableOpacity onPress={next} activeOpacity={0.7} style={styles.nextRow}>
          <Text style={styles.nextText}>Next fact →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
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
