import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sport } from '../../lib/api';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGame } from '../../lib/academyGames';

// Generic full-screen host for any Academy game. Renders a back affordance + the game
// title, then the game's own Component with the uniform { sportKeys } contract. It
// holds NO game-specific logic — that's the seam: the host is the same for every game,
// so adding a game is "register a descriptor," never "edit the host."
export default function GameHost({
  game, sportKeys, categoryEmoji, onBack,
}: { game: AcademyGame; sportKeys: Sport[]; categoryEmoji?: string; onBack: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const Game = game.Component;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Academy</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{game.icon} {game.title}</Text>
        {/* Spacer to keep the title visually centered against the back button. */}
        <View style={styles.backBtn} />
      </View>
      <Game sportKeys={sportKeys} categoryEmoji={categoryEmoji} />
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { minWidth: 92 },
  backText: { color: t.accentText, fontSize: 16, fontWeight: '800' },
  title: { color: t.textPrimary, fontSize: 16, fontWeight: '900', flex: 1, textAlign: 'center' },
});
