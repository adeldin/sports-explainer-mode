import { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { ScenarioPills, FE } from './FieldEngine';
import {
  COACH_SPEAK_CATEGORIES, CoachSpeakCategory, CoachSpeakTerm,
  termsForCategory, searchTerms,
} from '../lib/coachSpeak';

// NFL "Coach Speak" — the terminology browser.
//
// Same class of piece as the soccer Formations browser: an EXPLORER, not a scenario. There is no
// call to make, so no verdict card, no difficulty tabs and no right answer — a glossary that graded
// you would be a quiz wearing a dictionary's clothes. Portrait, scrolling, mounted directly by
// CoachesCornerScreen through the explorer registry rather than GameHost.
//
// Two ways in, because there are two ways people arrive at a term. Browsing by category is for "what
// should I know about defenses?"; search is for "I just heard "big nickel" and I have eight seconds
// before the next snap." Typing overrides the category filter and searches the whole bank, since a
// user who half-remembers a phrase does not know which bucket it lives in.
export default function CoachSpeakBrowser() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [category, setCategory] = useState<CoachSpeakCategory>('personnel');
  const [query, setQuery] = useState('');

  const searching = query.trim().length > 0;
  const results = searching ? searchTerms(query) : termsForCategory(category);
  const activeCat = COACH_SPEAK_CATEGORIES.find(c => c.key === category);

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
          placeholder="Search a term you heard…"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category pills are hidden while searching: they'd imply the results are filtered to one
          category when search deliberately spans the whole bank. */}
      {!searching && (
        <>
          <ScenarioPills
            wrap
            items={COACH_SPEAK_CATEGORIES.map(c => ({ key: c.key, name: c.label }))}
            currentKey={category}
            onSelect={(k) => { Haptics.selectionAsync(); setCategory(k as CoachSpeakCategory); }}
          />
          {!!activeCat && (
            <View style={styles.prompt}>
              <Text style={styles.promptTxt}>{activeCat.blurb}</Text>
            </View>
          )}
        </>
      )}

      {searching && (
        <Text style={styles.resultCount}>
          {results.length === 0
            ? 'No match — try the word on its own, like "nickel" or "zone".'
            : `${results.length} ${results.length === 1 ? 'term' : 'terms'} matching “${query.trim()}”`}
        </Text>
      )}

      {results.map(t => <TermCard key={t.term} term={t} styles={styles} />)}

      <Text style={styles.footnote}>
        Personnel numbers are a code: the first digit is running backs, the second is tight ends.
        Receivers are whatever's left to make five. That's the whole rule — 12 personnel is 1 back,
        2 tight ends, so 2 receivers.
      </Text>
    </ScrollView>
  );
}

function TermCard({ term, styles }: { term: CoachSpeakTerm; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.term}>{term.term}</Text>
        {!!term.aka && <Text style={styles.aka}>{term.aka}</Text>}
      </View>

      {/* Position breakdown — only for groupings, where the counts ARE the definition. */}
      {!!term.counts && (
        <View style={styles.countRow}>
          {term.counts.map(c => (
            <View key={c.label} style={styles.countChip}>
              <Text style={styles.countN}>{c.n}</Text>
              <Text style={styles.countLbl}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.fieldLabel}>WHAT IT MEANS</Text>
      <Text style={styles.body}>{term.means}</Text>

      <Text style={styles.fieldLabel}>WHY IT MATTERS</Text>
      <Text style={styles.body}>{term.why}</Text>

      <View style={styles.heardWrap}>
        <Text style={styles.heardLabel}>YOU'LL HEAR</Text>
        <Text style={styles.heard}>{term.heard}</Text>
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

  // Category blurb.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },

  // Term card.
  card: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  term: { color: t.textPrimary, fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  aka: {
    fontSize: 11, fontWeight: '800', color: FE.mode, backgroundColor: FE.modeBg,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },

  // Position-count chips.
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 2 },
  countChip: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: t.explanationBg, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  countN: { color: FE.orange, fontSize: 14, fontWeight: '900' },
  countLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  fieldLabel: { color: t.textSecondaryOnDark, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  body: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 19.5 },

  // "You'll hear" — set apart as speech, because that's the whole point of the piece.
  heardWrap: {
    marginTop: 6, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: FE.orange,
  },
  heardLabel: { color: FE.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  heard: { color: t.textPrimary, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  footnote: { color: t.textSecondaryOnDark, fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
});
