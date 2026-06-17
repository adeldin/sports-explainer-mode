import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../lib/theme';

// Stage 1 placeholder. The Academy tab will host Learn Mode content
// (lessons, drills, off-season explainers) in a later stage.
export default function AcademyScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🎓</Text>
        <Text style={styles.title}>Academy</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { color: t.textPrimary, fontSize: 24, fontWeight: '900' },
  subtitle: { color: t.textMuted, fontSize: 15, fontWeight: '600' },
});
