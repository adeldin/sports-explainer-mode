import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme, Theme } from '../lib/theme';

// Shared presentational sport/category strip — extracted from the byte-identical inline pickers in
// AcademyScreen + LiveScreen (and reused by Coach's Corner). Knows nothing about sports: it takes
// items + selectedKey + onSelect, so selection styling lives in ONE place.
export interface SportStripItem {
  key: string;        // the selection key (sport key, category key — caller's choice)
  emoji: string;
  label: string;
}

export default function SportStrip({
  items, selectedKey, onSelect, marginBottom = 4,
}: {
  items: SportStripItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  // Academy used marginBottom:4, Live used 10 — kept identical per-screen via this prop (default 4).
  marginBottom?: number;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.tabsContainer, { marginBottom }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportTabsContent}>
        {items.map(it => {
          const active = selectedKey === it.key;
          return (
            <TouchableOpacity
              key={it.key}
              style={[styles.sportTab, active && styles.sportTabActive]}
              onPress={() => onSelect(it.key)}>
              <Text style={styles.sportEmoji}>{it.emoji}</Text>
              <Text style={[styles.sportLabel, active && styles.sportLabelActive]} numberOfLines={1}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Values copied EXACTLY from AcademyScreen/LiveScreen (marginBottom moved to the prop above so each
  // screen stays pixel-identical: Academy 4, Live 10).
  tabsContainer: { height: 70 },
  sportTabsContent: { paddingHorizontal: 16, gap: 8 },
  sportTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, minWidth: 64 },
  sportTabActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  sportEmoji: { fontSize: 20 },
  sportLabel: { color: t.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  sportLabelActive: { color: t.accentText },
});
