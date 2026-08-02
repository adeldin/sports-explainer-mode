import { useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Sport } from '../../lib/api';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGame } from '../../lib/academyGames';
import GameErrorBoundary from './GameErrorBoundary';

// Generic full-screen host for any Academy game. Renders a back affordance + the game
// title, then the game's own Component with the uniform { sportKeys } contract. It
// holds NO game-specific logic — that's the seam: the host is the same for every game,
// so adding a game is "register a descriptor," never "edit the host."
export default function GameHost({
  game, sportKeys, categoryEmoji, onBack, backLabel = 'Academy',
}: { game: AcademyGame; sportKeys: Sport[]; categoryEmoji?: string; onBack: () => void; backLabel?: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const Game = game.Component;

  // Orientation + tab bar: field/diamond games opt into LANDSCAPE via `game.landscape`. On focus we
  // lock landscape AND hide the bottom tab bar; on blur (exit-unmount OR tab-switch) we restore portrait
  // and the bar. Hiding the bar isn't cosmetic — it's surface-colored, so in a dark landscape module it
  // blends into the field and an incidental touch on the (active) tab fires that tab's tap-active→root
  // listener, dropping the user out (and rotating back as we unmount). Owning both here means every
  // landscape piece, on any host tab, inherits the fix — no per-screen wiring. Portrait games no-op.
  // useFocusEffect (not a bare useEffect) is what makes the tab-switch case correct. The restore style
  // mirrors App.tsx's tabBarStyle so the bar returns identically.
  // The effect below MUST depend on `game.landscape` and nothing else.
  //
  // It calls navigation.setOptions(), which updates the navigator — and `navigation` and
  // `theme` are objects whose identity can change as a result. If either sits in the dep
  // array, the callback is recreated, useFocusEffect tears down and re-runs, the teardown
  // locks PORTRAIT_UP, and the effect immediately re-locks LANDSCAPE. That is a feedback
  // loop the effect feeds itself, and on device it reads as "the screen rotates back to
  // portrait on its own" mid-module. (It was misdiagnosed once before as an accidental tap
  // on the camouflaged tab bar; hiding the bar is what introduced the setOptions call that
  // closes the loop.) Refs give the callback fresh values without making it unstable.
  const navRef = useRef(navigation);
  navRef.current = navigation;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useFocusEffect(
    useCallback(() => {
      if (!game.landscape) return;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      navRef.current.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        const t = themeRef.current;
        navRef.current.setOptions({ tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, borderTopWidth: 1 } });
      };
    }, [game.landscape])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ {backLabel}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{game.icon} {game.title}</Text>
        {/* Spacer to keep the title visually centered against the back button. */}
        <View style={styles.backBtn} />
      </View>
      <GameErrorBoundary title={game.title}>
        <Game sportKeys={sportKeys} categoryEmoji={categoryEmoji} />
      </GameErrorBoundary>
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
