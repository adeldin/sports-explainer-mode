import { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../../lib/theme';
import { ScenarioPills, FE } from '../FieldEngine';
import {
  StatGeekEntry, StatGeekSport, getStatGeek, categoriesFor, searchStatGeek,
} from '../../lib/statGeek';

// Stat Geek — the analytics glossary browser.
//
// An EXPLORER, like Formations and Coach Speak: no call to make, no verdict, no scoring, so the
// visual-scenario authoring standard doesn't apply to it. Portrait, scrolling, mounted directly by
// CoachesCornerScreen through the explorer registry rather than GameHost.
//
// Two axes, because there are two ways in. SPORT first (this piece is cross-sport, unlike Coach
// Speak), then CATEGORY within a sport. Search overrides both and spans the whole bank, since a
// user who half-remembers "some plus-minus thing" doesn't know which sport bucket it lives in —
// and several of these stats have siblings across sports worth stumbling onto (WAR and VORP are
// the same idea in two languages).
//
// `initialSport` lets the caller open it already filtered: reached from the MLB tile, it opens on
// baseball. Passing nothing opens on All.
export default function StatGeekBrowser({ initialSport }: { initialSport?: StatGeekSport } = {}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [sport, setSport] = useState<StatGeekSport | 'all'>(initialSport ?? 'all');
  const [category, setCategory] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');

  const searching = query.trim().length > 0;
  const activeSport = sport === 'all' ? undefined : sport;

  // Categories only make sense inside one sport — "Batting" and "Passing" in the same pill row
  // would be noise. So the row appears only once a sport is chosen.
  const categories = useMemo(
    () => (activeSport ? categoriesFor(activeSport) : []),
    [activeSport],
  );

  const results = useMemo(() => {
    if (searching) return searchStatGeek(query);            // search spans everything, deliberately
    const pool = getStatGeek(activeSport);
    return category === 'all' ? pool : pool.filter(e => e.category === category);
  }, [searching, query, activeSport, category]);

  const SPORTS: { key: StatGeekSport | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'baseball', label: 'Baseball' },
    { key: 'football', label: 'Football' },
    { key: 'basketball', label: 'Basketball' },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search a stat you heard…"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Both filter rows hide while searching: leaving them visible would imply the results are
          narrowed to the selected sport when search deliberately spans the whole bank. */}
      {!searching && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {SPORTS.map(opt => {
              const on = sport === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { Haptics.selectionAsync(); setSport(opt.key); setCategory('all'); }}
                  style={[styles.filterChip, on && styles.filterChipActive]}
                  activeOpacity={0.8}>
                  <Text style={[styles.filterChipText, on && styles.filterChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {categories.length > 0 && (
            <ScenarioPills
              wrap
              items={[{ key: 'all', name: 'All' }, ...categories.map(c => ({ key: c, name: c }))]}
              currentKey={category}
              onSelect={(k) => { Haptics.selectionAsync(); setCategory(k); }}
            />
          )}
        </>
      )}

      <Text style={styles.resultCount}>
        {searching
          ? (results.length === 0
              ? 'No match — try the letters on their own, like "war" or "ops".'
              : `${results.length} ${results.length === 1 ? 'stat' : 'stats'} matching “${query.trim()}”`)
          : `${results.length} ${results.length === 1 ? 'stat' : 'stats'}`}
      </Text>

      {results.map(e => <StatCard key={`${e.sport}-${e.term}`} entry={e} styles={styles} showSport={searching || sport === 'all'} />)}

      <Text style={styles.footnote}>
        These are the numbers you'll hear on a broadcast without anyone stopping to explain them.
        None of them replace watching the game — they're shorthand for things you can already see.
      </Text>
    </ScrollView>
  );
}

const SPORT_LABEL: Record<StatGeekSport, string> = {
  baseball: 'Baseball', football: 'Football', basketball: 'Basketball',
};

function StatCard({ entry, styles, showSport }: {
  entry: StatGeekEntry;
  styles: ReturnType<typeof makeStyles>;
  showSport: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.term}>{entry.term}</Text>
        {showSport && <Text style={styles.sportTag}>{SPORT_LABEL[entry.sport]}</Text>}
        <Text style={styles.catTag}>{entry.category}</Text>
      </View>
      {!!entry.aka && <Text style={styles.aka}>{entry.aka}</Text>}

      <Text style={styles.fieldLabel}>WHAT IT MEANS</Text>
      <Text style={styles.body}>{entry.means}</Text>

      <Text style={styles.fieldLabel}>WHY IT MATTERS</Text>
      <Text style={styles.body}>{entry.why}</Text>

      {/* Set apart as speech — hearing it in context is the whole reason this piece exists. */}
      <View style={styles.heardWrap}>
        <Text style={styles.heardLabel}>SOUNDS LIKE</Text>
        <Text style={styles.heard}>{entry.heard}</Text>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },

  // Search.
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  search: { flex: 1, color: t.textPrimary, fontSize: 14.5, paddingVertical: 11, fontWeight: '600' },
  resultCount: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Sport filter — same chip treatment as the merged Rugby/Soccer league filter on LiveScreen.
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
  },
  filterChipActive: { backgroundColor: t.accent, borderColor: t.accent },
  filterChipText: { color: t.textSecondary, fontSize: 13, fontWeight: '700' },
  filterChipTextActive: { color: '#ffffff' },

  // Entry card.
  card: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  term: { color: t.textPrimary, fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  sportTag: {
    fontSize: 10, fontWeight: '800', color: FE.mode, backgroundColor: FE.modeBg,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },
  catTag: {
    fontSize: 10, fontWeight: '800', color: t.textSecondaryOnDark,
    borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
  },
  aka: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600', marginTop: -2 },

  fieldLabel: { color: t.textSecondaryOnDark, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  body: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 19.5 },

  heardWrap: { marginTop: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: FE.orange },
  heardLabel: { color: FE.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  heard: { color: t.textPrimary, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  footnote: { color: t.textSecondaryOnDark, fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
});
