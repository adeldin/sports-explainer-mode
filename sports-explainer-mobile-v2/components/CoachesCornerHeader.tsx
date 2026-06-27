import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme, Theme } from '../lib/theme';

// Coach's Corner text header — mirrors AcademyScreen's wordmark + tagline so the two tabs read as a
// family. "wise" uses the orange accent (same treatment as Academy). No image (the clipboard emblem
// asset stays in the repo unused, possibly revisited later). CC_HEADER_HEIGHT stays exported (nominal —
// the header sizes to its own content via padding, like AcademyScreen's header).
export const CC_HEADER_HEIGHT = 88;

export default function CoachesCornerHeader() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.header}>
      <View style={styles.headerTextCol}>
        <Text style={styles.headerTitle}>Sports<Text style={styles.headerTitleAccent}>wise</Text> Coach's Corner</Text>
        <Text style={styles.tagline}>The why behind every play.</Text>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Copied EXACTLY from AcademyScreen's header* styles so the two tab headers match.
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTextCol: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'SpaceGrotesk_600SemiBold', color: t.textPrimary },
  headerTitleAccent: { color: t.accent },
  tagline: { color: t.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 1 },
});
