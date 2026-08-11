import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../../lib/theme';
import { FE } from '../FieldEngine';
import {
  StatGeekEntry, StatGeekSport, STAT_GEEK_ENTRIES, getStatGeek, categoriesFor, searchStatGeek,
} from '../../lib/statGeek';

// Stat Geek — the analytics glossary browser.
//
// An EXPLORER, like Formations and Coach Speak: no call to make, no verdict, no scoring, so the
// visual-scenario authoring standard doesn't apply. Portrait, scrolling, mounted directly by
// CoachesCornerScreen through the explorer registry rather than GameHost.
//
// DESIGN: this is a LOOKUP surface, not a reading surface. Someone hears "wRC plus" on a broadcast
// and has seconds to find it. So the list is a dense index of closed rows — term, category, and the
// spelled-out name — and the definition only appears when asked for. An always-expanded list read
// beautifully and made you scroll past four paragraphs to reach the fifth stat, which is exactly
// backwards for the job.
//
// Sport selection is MULTI-select behind a button rather than a permanent chip row, for the same
// reason: the chips cost a line of vertical space on every screen to serve a choice most people
// make once, or never.

type SortKey = 'sport' | 'az' | 'category';
const SORT_LABEL: Record<SortKey, string> = {
  sport: 'By sport',
  az: 'A–Z',
  category: 'By category',
};

const SPORT_LABEL: Record<StatGeekSport, string> = {
  baseball: 'Baseball', football: 'Football', basketball: 'Basketball',
};
const ALL_SPORTS: StatGeekSport[] = ['baseball', 'football', 'basketball'];

// Authored order = the array's own order (baseball, then football, then basketball, each grouped by
// category). Captured once so the 'By sport' sort can restore it without an O(n²) indexOf per row.
const AUTHORED_INDEX = new Map(STAT_GEEK_ENTRIES.map((e, i) => [`${e.sport}-${e.term}`, i]));
const keyOf = (e: StatGeekEntry) => `${e.sport}-${e.term}`;

export default function StatGeekBrowser({ initialSport }: { initialSport?: StatGeekSport } = {}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [query, setQuery] = useState('');
  // Empty set means "everything" — simpler than tracking an explicit all-selected state, and it
  // makes "clear filters" a single reset.
  const [sports, setSports] = useState<Set<StatGeekSport>>(
    () => new Set(initialSport ? [initialSport] : []),
  );
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>('sport');
  const [panel, setPanel] = useState<'none' | 'filter' | 'sort'>('none');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const searching = query.trim().length > 0;

  const toggleIn = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    return next;
  };

  const togglePanel = useCallback((p: 'filter' | 'sort') => {
    Haptics.selectionAsync();
    setPanel(cur => (cur === p ? 'none' : p));
  }, []);

  // Categories offered are the union across the SELECTED sports — showing "Batting" while only
  // football is selected would be a dead option.
  const catOptions = useMemo(() => {
    const pool = sports.size ? [...sports] : ALL_SPORTS;
    const out: string[] = [];
    for (const sp of pool) for (const c of categoriesFor(sp)) if (!out.includes(c)) out.push(c);
    return out;
  }, [sports]);

  const results = useMemo(() => {
    // Search runs INSIDE the current filter. When nothing is filtered — the default — that means it
    // still spans every sport, which is the case that matters: you don't know which bucket the
    // half-heard stat lives in. But once you've explicitly narrowed, overriding you would be wrong.
    let pool = searching ? searchStatGeek(query) : getStatGeek();
    if (sports.size) pool = pool.filter(e => sports.has(e.sport));
    if (cats.size) pool = pool.filter(e => cats.has(e.category));

    const byTerm = (a: StatGeekEntry, b: StatGeekEntry) =>
      a.term.localeCompare(b.term, undefined, { sensitivity: 'base' });

    const sorted = [...pool];
    if (sort === 'az') sorted.sort(byTerm);
    else if (sort === 'category') {
      sorted.sort((a, b) => a.category.localeCompare(b.category) || byTerm(a, b));
    } else {
      sorted.sort((a, b) => (AUTHORED_INDEX.get(keyOf(a)) ?? 0) - (AUTHORED_INDEX.get(keyOf(b)) ?? 0));
    }
    return sorted;
  }, [searching, query, sports, cats, sort]);

  const filterCount = sports.size + cats.size;
  const filterLabel =
    sports.size === 0 ? 'All sports'
    : sports.size === 1 ? SPORT_LABEL[[...sports][0]]
    : `${sports.size} sports`;

  const mixed = sports.size !== 1;   // show the sport tag only when the list actually mixes sports

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

      {/* Toolbar — two buttons instead of a permanent chip row. */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, (panel === 'filter' || filterCount > 0) && styles.toolBtnOn]}
          onPress={() => togglePanel('filter')}
          activeOpacity={0.8}>
          <Text style={[styles.toolBtnTxt, (panel === 'filter' || filterCount > 0) && styles.toolBtnTxtOn]}>
            ⧉  {filterLabel}{cats.size ? ` · ${cats.size} cat` : ''}  {panel === 'filter' ? '▾' : '▸'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, panel === 'sort' && styles.toolBtnOn]}
          onPress={() => togglePanel('sort')}
          activeOpacity={0.8}>
          <Text style={[styles.toolBtnTxt, panel === 'sort' && styles.toolBtnTxtOn]}>
            ⇅  {SORT_LABEL[sort]}  {panel === 'sort' ? '▾' : '▸'}
          </Text>
        </TouchableOpacity>
      </View>

      {panel === 'filter' && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>SPORT</Text>
          {ALL_SPORTS.map(sp => {
            const on = sports.has(sp);
            return (
              <TouchableOpacity
                key={sp}
                style={styles.optRow}
                onPress={() => { Haptics.selectionAsync(); setSports(s => toggleIn(s, sp)); setCats(new Set()); }}
                activeOpacity={0.7}>
                <Text style={[styles.optBox, on && styles.optBoxOn]}>{on ? '✓' : ''}</Text>
                <Text style={styles.optTxt}>{SPORT_LABEL[sp]}</Text>
                <Text style={styles.optCount}>{getStatGeek(sp).length}</Text>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.panelLabel, { marginTop: 12 }]}>CATEGORY</Text>
          {catOptions.map(c => {
            const on = cats.has(c);
            return (
              <TouchableOpacity
                key={c}
                style={styles.optRow}
                onPress={() => { Haptics.selectionAsync(); setCats(s => toggleIn(s, c)); }}
                activeOpacity={0.7}>
                <Text style={[styles.optBox, on && styles.optBoxOn]}>{on ? '✓' : ''}</Text>
                <Text style={styles.optTxt}>{c}</Text>
              </TouchableOpacity>
            );
          })}

          {filterCount > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { Haptics.selectionAsync(); setSports(new Set()); setCats(new Set()); }}
              activeOpacity={0.8}>
              <Text style={styles.clearTxt}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {panel === 'sort' && (
        <View style={styles.panel}>
          {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
            <TouchableOpacity
              key={k}
              style={styles.optRow}
              onPress={() => { Haptics.selectionAsync(); setSort(k); setPanel('none'); }}
              activeOpacity={0.7}>
              <Text style={[styles.optBox, sort === k && styles.optBoxOn]}>{sort === k ? '✓' : ''}</Text>
              <Text style={styles.optTxt}>{SORT_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.countRow}>
        <Text style={styles.resultCount}>
          {results.length} {results.length === 1 ? 'stat' : 'stats'}
          {searching ? ` matching “${query.trim()}”` : ''}
        </Text>
        {results.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setExpanded(cur => (cur.size ? new Set() : new Set(results.map(keyOf))));
            }}
            activeOpacity={0.7}>
            <Text style={styles.expandAll}>{expanded.size ? 'Collapse all' : 'Expand all'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {results.length === 0 && (
        <Text style={styles.empty}>
          {searching
            ? 'No match — try the letters on their own, like “war” or “ops”.'
            : 'Nothing matches those filters.'}
        </Text>
      )}

      {results.map(e => (
        <StatRow
          key={keyOf(e)}
          entry={e}
          styles={styles}
          showSport={mixed}
          open={expanded.has(keyOf(e))}
          onToggle={() => {
            Haptics.selectionAsync();
            setExpanded(cur => toggleIn(cur, keyOf(e)));
          }}
        />
      ))}

      <Text style={styles.footnote}>
        These are the numbers you'll hear on a broadcast without anyone stopping to explain them.
        None of them replace watching the game — they're shorthand for things you can already see.
      </Text>
    </ScrollView>
  );
}

// A closed row is the INDEX: term, category, and the spelled-out name. That's enough to recognise
// what you heard without opening anything, which is what makes fast scrolling possible.
function StatRow({ entry, styles, showSport, open, onToggle }: {
  entry: StatGeekEntry;
  styles: ReturnType<typeof makeStyles>;
  showSport: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.rowHead}>
        <View style={styles.rowMain}>
          <View style={styles.titleLine}>
            <Text style={styles.term}>{entry.term}</Text>
            <Text style={styles.catTag}>{entry.category}</Text>
            {showSport && <Text style={styles.sportTag}>{SPORT_LABEL[entry.sport]}</Text>}
          </View>
          {!!entry.aka && <Text style={styles.aka} numberOfLines={open ? undefined : 1}>{entry.aka}</Text>}
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <Text style={styles.fieldLabel}>WHAT IT MEANS</Text>
          <Text style={styles.bodyTxt}>{entry.means}</Text>

          <Text style={styles.fieldLabel}>WHY IT MATTERS</Text>
          <Text style={styles.bodyTxt}>{entry.why}</Text>

          {/* Set apart as speech — hearing it in context is the whole reason this piece exists. */}
          <View style={styles.heardWrap}>
            <Text style={styles.heardLabel}>SOUNDS LIKE</Text>
            <Text style={styles.heard}>{entry.heard}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 8 },

  // Search.
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  search: { flex: 1, color: t.textPrimary, fontSize: 14.5, paddingVertical: 11, fontWeight: '600' },

  // Toolbar.
  toolbar: { flexDirection: 'row', gap: 8 },
  toolBtn: {
    flex: 1, backgroundColor: t.surface, borderRadius: 10, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center',
  },
  toolBtnOn: { borderColor: t.accent },
  toolBtnTxt: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '800' },
  toolBtnTxtOn: { color: t.accent },

  // Filter / sort panels.
  panel: {
    backgroundColor: t.explanationBg, borderRadius: 10, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  panelLabel: { color: t.textSecondaryOnDark, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  optBox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: t.border,
    color: '#ffffff', fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18, overflow: 'hidden',
  },
  optBoxOn: { backgroundColor: t.accent, borderColor: t.accent },
  optTxt: { flex: 1, color: t.textPrimary, fontSize: 14, fontWeight: '700' },
  optCount: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '700' },
  clearBtn: { marginTop: 10, alignSelf: 'flex-start' },
  clearTxt: { color: FE.orange, fontSize: 13, fontWeight: '800' },

  // Count row.
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  resultCount: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '700' },
  expandAll: { color: FE.orange, fontSize: 12, fontWeight: '800' },
  empty: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 19, marginTop: 6 },

  // Rows.
  card: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14 },
  cardOpen: { borderColor: t.borderStrong },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowMain: { flex: 1, gap: 2 },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  term: { color: t.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
  catTag: {
    fontSize: 10, fontWeight: '800', color: t.textSecondaryOnDark,
    borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden',
  },
  sportTag: {
    fontSize: 10, fontWeight: '800', color: FE.mode, backgroundColor: FE.modeBg,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden',
  },
  aka: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600' },
  chevron: { color: t.textSecondaryOnDark, fontSize: 14, fontWeight: '900' },

  body: { paddingBottom: 14, gap: 5 },
  fieldLabel: { color: t.textSecondaryOnDark, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  bodyTxt: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 19.5 },
  heardWrap: { marginTop: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: FE.orange },
  heardLabel: { color: FE.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  heard: { color: t.textPrimary, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  footnote: { color: t.textSecondaryOnDark, fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
});
