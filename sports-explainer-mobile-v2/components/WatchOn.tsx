import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { Language } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';

// Shared "where to watch" element — same info, two weights matched to context:
//  • prominent — pre-game TuneInCard hero: accent-bordered tinted row, bold accent text, "Watch on
//    {networks}". Lives INSIDE the card's padding (no own horizontal margin).
//  • quiet — live card: a recessive one-line reference label ("📺 {networks}", muted, no fill/
//    border/accent), so it's findable near the score without competing with the PlayCard (the
//    teaching star). Rendered directly in the page scroll → owns its horizontal margin.
// Returns null when there's no broadcast data (caller can render unconditionally).
interface Props {
  broadcasts?: string[];
  language: Language;
  variant?: 'prominent' | 'quiet';
}

export default function WatchOn({ broadcasts, language, variant = 'prominent' }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];
  if (!broadcasts?.length) return null;
  const quiet = variant === 'quiet';
  const networks = broadcasts.join(', ');
  return (
    <View style={quiet ? styles.quietRow : styles.prominentRow}>
      <Text style={quiet ? styles.quietText : styles.prominentText} numberOfLines={quiet ? 1 : undefined}>
        📺 {quiet ? networks : `${S.tuneInWatchOn} ${networks}`}
      </Text>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Prominent (pre-game hero) — unchanged look, lifted verbatim from TuneInCard's old watchRow.
  prominentRow: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: t.surfaceActive, borderWidth: 1, borderColor: t.accent },
  prominentText: { color: t.accentText, fontSize: 15, fontWeight: '800' },
  // Quiet (live) — muted, no chrome, small; a reference label that recedes behind the PlayCard.
  quietRow: { marginHorizontal: 16, marginTop: 2, marginBottom: 10 },
  quietText: { color: t.textSecondary, fontSize: 12, fontWeight: '600' },
});
