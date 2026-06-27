import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useAppState, RANK_EMOJI } from '../lib/appState';
import { useTheme, Theme } from '../lib/theme';

// Shared progression rank card — extracted from AcademyScreen's inline rank card so both Academy and
// Coach's Corner render the same component (the rank is a single GLOBAL points total). The kicker label
// is a prop so it isn't hardcoded "YOUR ACADEMY RANK".
export default function RankCard({ kicker = 'YOUR RANK' }: { kicker?: string }) {
  const { points, rank } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const barWidth = useSharedValue(0);
  const rankPct = rank.next
    ? Math.min(100, Math.max(0, ((points - rank.min) / (rank.next.min - rank.min)) * 100))
    : 100;
  useEffect(() => {
    barWidth.value = withTiming(rankPct, { duration: 600, easing: Easing.out(Easing.quad) });
  }, [rankPct]);
  const rankBarFillStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));

  return (
    <View style={styles.rankCard}>
      <View style={styles.rankTopRow}>
        <Text style={styles.rankEmoji}>{RANK_EMOJI[rank.name] ?? '🔰'}</Text>
        <View style={styles.rankNameCol}>
          <Text style={styles.rankKicker}>{kicker}</Text>
          <Text style={styles.rankName}>{rank.name}</Text>
        </View>
        <Text style={styles.rankPts}>{points} pts</Text>
      </View>
      {rank.next ? (
        <>
          <View style={styles.rankBarTrack}>
            <Animated.View style={[styles.rankBarFill, rankBarFillStyle]} />
          </View>
          <Text style={styles.rankProgressText}>
            {points} / {rank.next.min} → {rank.next.name} {RANK_EMOJI[rank.next.name] ?? ''}
          </Text>
        </>
      ) : (
        <Text style={styles.rankMaxed}>👑 Legend — maxed</Text>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // COPIED EXACTLY from AcademyScreen's rank* styles so Academy looks identical after the extraction.
  rankCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16 },
  rankTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankEmoji: { fontSize: 30 },
  rankNameCol: { flex: 1 },
  rankKicker: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rankName: { color: t.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 1 },
  rankPts: { color: t.accent, fontSize: 14, fontWeight: '800' },
  rankBarTrack: { height: 10, borderRadius: 5, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, marginTop: 14, overflow: 'hidden' },
  rankBarFill: { height: '100%', backgroundColor: t.accent, borderRadius: 5 },
  rankProgressText: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 8 },
  rankMaxed: { color: t.accent, fontSize: 14, fontWeight: '800', marginTop: 12, textAlign: 'center' },
});
