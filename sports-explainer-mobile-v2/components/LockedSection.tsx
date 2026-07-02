import { useMemo } from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { useTheme, Theme } from '../lib/theme';

// Shared "locked Pro section" teaser — a section title (🔒 when locked) over greyed placeholder
// bars: a STATIC skeleton, never real content. Extracted from RecapCard so the recap's Pro-narrative
// locks AND the capped-play tease share ONE visual ("locked headers = Pro content", learned once).
// When `locked` is false the caller supplies the real body via children (RecapCard's unlocked Pro
// sections). `alignSelf: 'stretch'` lets the % bars span full width even inside a flex-start card.
interface Props {
  label: string;
  locked?: boolean;
  children?: React.ReactNode;
  barWidths?: DimensionValue[];
}

export default function LockedSection({ label, locked = true, children, barWidths = ['92%', '78%'] }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{locked ? '🔒 ' : ''}{label}</Text>
      {locked ? (
        <View style={styles.lockedBars}>
          {barWidths.map((w, i) => <View key={i} style={[styles.lockedBar, { width: w }]} />)}
        </View>
      ) : children}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  section: { alignSelf: 'stretch', marginTop: 14, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
  sectionTitle: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  // Locked teaser bars (suggest hidden prose without revealing / generating it).
  lockedBars: { gap: 8, marginTop: 2 },
  lockedBar: { height: 12, borderRadius: 6, backgroundColor: t.border, opacity: 0.6 },
});
