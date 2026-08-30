import { useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Sport } from '../../lib/api';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGame } from '../../lib/academyGames';
import { setImmersive } from '../../lib/immersive';
import GameErrorBoundary from './GameErrorBoundary';

// Generic full-screen host for any Academy game. Renders a back affordance + the game
// title, then the game's own Component with the uniform { sportKeys } contract. It
// holds NO game-specific logic — that's the seam: the host is the same for every game,
// so adding a game is "register a descriptor," never "edit the host."
// Orientation is device-global state, so we track what we last ASKED for and skip
// redundant requests. Two reasons, both learned the hard way:
//   1. lockAsync returns a promise. A re-entrant effect that calls it every cycle floods
//      the microtask queue; the resulting allocation churn crashed Hermes' GC outright
//      (EXC_BAD_ACCESS in HadesGC::writeBarrierSlow during drainJobs) rather than merely
//      rotating the screen back and forth.
//   2. An unhandled rejection from lockAsync (iOS can refuse a lock) would otherwise
//      surface as a crash with no useful stack.
// Idempotence turns "how often does this run" from a correctness question into a
// performance one — the failure mode above can't return even if an effect misbehaves.
let lastRequestedLock: ScreenOrientation.OrientationLock | null = null;
function requestLock(lock: ScreenOrientation.OrientationLock) {
  if (lastRequestedLock === lock) return;
  lastRequestedLock = lock;
  ScreenOrientation.lockAsync(lock).catch(() => { lastRequestedLock = null; });
}

// Android: locking orientation in the same frame as GameHost's mount/unmount churn
// (tab-bar hide, navigator update, first layout) races WindowManager's rotation
// handshake. When the app loses the race, Android leaves the activity in a
// half-finished "fixed rotation": the picture rotates but the window's TOUCH frame
// keeps the old orientation, so in a landscape drill everything right of the old
// portrait width — the call buttons, the right half of the field — is visible but
// dead to taps (and on the way back, the tab bar dies the same way). Reproduced
// ~2-in-3 on API 35/36 emulators in release builds; dev-client builds mask it (their
// overlay window forces the rotation to commit), which is how it once shipped with a
// "verified" fix that didn't work. Deferring the lock until the churn has settled
// won 6/6 trials where immediate locking died 2/3. One module-scope, last-wins
// scheduler serves both directions: an exit's PORTRAIT restore must survive the
// component unmounting, and a quick re-entry within the window must supersede it.
const LOCK_SETTLE_MS = 400;
let pendingLock: ReturnType<typeof setTimeout> | null = null;
function scheduleLock(lock: ScreenOrientation.OrientationLock) {
  if (Platform.OS !== 'android') { requestLock(lock); return; }
  if (pendingLock) clearTimeout(pendingLock);
  pendingLock = setTimeout(() => { pendingLock = null; requestLock(lock); }, LOCK_SETTLE_MS);
}

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
      scheduleLock(ScreenOrientation.OrientationLock.LANDSCAPE);
      setImmersive(true);
      return () => {
        scheduleLock(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setImmersive(false);
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
