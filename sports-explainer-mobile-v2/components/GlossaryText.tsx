import { useMemo } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Sport, Language } from '../lib/api';
import { segmentText } from '../lib/glossary/segment';

// Renders explanation text with curated glossary terms as subtly-tappable runs.
// English-only: for any other language — and for sports with no glossary — it falls
// back to plain text identical to before. Tapping a term toggles the shared
// definition box (state lives in the parent; onToggleTerm handles open/close/swap).
// Lifted out of LiveScreen so PlayCard can reuse it (Step D). The `styles` prop only
// needs `glossaryTerm`, so it's decoupled from any one screen's StyleSheet.
export default function GlossaryText({
  text, sport, baseStyle, language, styles, onToggleTerm,
}: {
  text: string;
  sport: Sport;
  baseStyle: StyleProp<TextStyle>;
  language: Language;
  styles: { glossaryTerm: StyleProp<TextStyle> };
  onToggleTerm: (t: { term: string; def: string }) => void;
}) {
  // Memoized so toggling a definition open/closed doesn't re-segment the text.
  const segments = useMemo(
    () => (language === 'en' ? segmentText(text, sport) : null),
    [text, sport, language],
  );
  // Non-English, or no terms matched → plain text, exactly as before.
  if (!segments || (segments.length === 1 && segments[0].type === 'text')) {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return (
    <Text style={baseStyle}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          seg.value
        ) : (
          <Text
            key={i}
            style={styles.glossaryTerm}
            suppressHighlighting
            onPress={() => { Haptics.selectionAsync(); onToggleTerm({ term: seg.term, def: seg.def }); }}
          >
            {seg.value}
          </Text>
        ),
      )}
    </Text>
  );
}
