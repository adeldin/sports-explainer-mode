import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { UI_STRINGS } from '../lib/strings';
import {
  fetchPlays, translatePlays, fetchExplanation,
  Sport, Level, Language, Play, ExplanationResponse,
} from '../lib/api';

interface Props {
  sport: Sport;
  gameId: string;
  level: Level;
  language: Language;
}

const SCORING = '#ffcc00'; // gold — scannable "important moment" marker
const INITIAL_VISIBLE = 30; // show 30 rows, then a "Load more" up to the fetch cap
const MAX_VISIBLE = 50;

// Self-contained inline play-by-play. Owns its own list/translation/explanation
// state and never touches the live explanation card above it. Designed to be
// remounted (via a key on sport/game/language/level) when those change, so it
// needs no prop-sync effects — a fresh mount starts collapsed and empty.
export default function PastPlays({ sport, gameId, level, language }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false); // list fetched at least once
  const [loading, setLoading] = useState(false);
  const [plays, setPlays] = useState<Play[]>([]);
  const [translations, setTranslations] = useState<string[]>([]); // parallel to plays
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ExplanationResponse>>({});
  const [explLoadingId, setExplLoadingId] = useState<string | null>(null);

  // Lazy-load (and translate) the list the first time the section is opened.
  const toggleSection = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !open;
    setOpen(next);
    if (!next || loaded) return;
    setLoading(true);
    try {
      const list = await fetchPlays(sport, gameId);
      setPlays(list);
      if (language !== 'en' && list.length) {
        setTranslations(await translatePlays(list.map(p => p.text), language));
      }
    } catch {
      setPlays([]);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  };

  // Expand a row → lazily fetch its explanation (English play text in, localized
  // explanation out). Errors are not cached, so collapsing + re-expanding retries.
  const togglePlay = async (p: Play) => {
    await Haptics.selectionAsync();
    if (expandedId === p.id) { setExpandedId(null); return; }
    setExpandedId(p.id);
    if (explanations[p.id]) return; // cached
    setExplLoadingId(p.id);
    try {
      // Cricket: send the delivery KEY, not the row label — the backend reducer rebuilds both the
      // play line and the state-as-of-that-ball from the key. Other sports send the play text.
      const data = sport === 'cricket'
        ? await fetchExplanation(sport, level, gameId, language, undefined, { playKey: p.id })
        : await fetchExplanation(sport, level, gameId, language, p.text);
      setExplanations(prev => ({ ...prev, [p.id]: data }));
    } catch {
      // leave uncached → next expand retries
    } finally {
      setExplLoadingId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} onPress={toggleSection} activeOpacity={0.7}>
        <Text style={styles.headerText}>⏪ {S.playByPlay}</Text>
        <Text style={styles.headerChevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {open && (
        loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 24 }} />
        ) : plays.length === 0 ? (
          <Text style={styles.empty}>{S.noPlays}</Text>
        ) : (
          <View>
            <Text style={styles.hint}>{S.pbpHint}</Text>
            {plays.slice(0, visible).map((p, i) => {
              const isOpen = expandedId === p.id;
              const expl = explanations[p.id];
              return (
                <View key={p.id} style={styles.item}>
                  <TouchableOpacity style={styles.row} onPress={() => togglePlay(p)} activeOpacity={0.7}>
                    <View style={[styles.dot, { backgroundColor: p.scoring ? SCORING : theme.border }]} />
                    <View style={styles.rowText}>
                      <Text
                        style={[styles.playText, p.scoring && styles.playTextScoring]}
                        numberOfLines={isOpen ? undefined : 3}>
                        {translations[i] || p.text}
                      </Text>
                      {!!p.period && <Text style={styles.period}>{p.period}</Text>}
                    </View>
                    <Text style={styles.rowChevron}>{isOpen ? '−' : '+'}</Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.explBox}>
                      {explLoadingId === p.id ? (
                        <Text style={styles.thinking}>{S.thinking}</Text>
                      ) : expl ? (
                        <>
                          <Text style={styles.explText}>{expl.simple}</Text>
                          {!!expl.whyItMatters && (
                            <>
                              <Text style={styles.explWhyLabel}>💡 {S.whyItMatters}</Text>
                              <Text style={styles.explWhy}>{expl.whyItMatters}</Text>
                            </>
                          )}
                        </>
                      ) : (
                        <Text style={styles.explError}>{S.answerError}</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {plays.length > visible && (
              <TouchableOpacity style={styles.moreBtn} onPress={() => setVisible(MAX_VISIBLE)} activeOpacity={0.7}>
                <Text style={styles.moreText}>{S.loadMore}</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerText: { color: t.accentText, fontSize: 15, fontWeight: '700' },
  headerChevron: { color: t.textSecondary, fontSize: 13, fontWeight: '800' },
  hint: { color: t.textMuted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },
  empty: { color: t.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  item: { borderTopWidth: 1, borderTopColor: t.border },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  rowText: { flex: 1 },
  playText: { color: t.textPrimary, fontSize: 14, lineHeight: 20 },
  playTextScoring: { fontWeight: '800' },
  period: { color: t.textMuted, fontSize: 11, marginTop: 3, fontWeight: '600' },
  rowChevron: { color: t.accentText, fontSize: 18, fontWeight: '800', width: 18, textAlign: 'center' },
  explBox: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2, backgroundColor: t.surfaceAlt },
  thinking: { color: t.textMuted, fontSize: 13, fontStyle: 'italic', paddingTop: 8 },
  explText: { color: t.textPrimary, fontSize: 15, lineHeight: 22, paddingTop: 8 },
  explWhyLabel: { color: t.insightLabel, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
  explWhy: { color: t.insightText, fontSize: 14, lineHeight: 21 },
  explError: { color: t.textSecondary, fontSize: 14, paddingTop: 8 },
  moreBtn: { paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: t.border },
  moreText: { color: t.accentText, fontSize: 13, fontWeight: '700' },
});
