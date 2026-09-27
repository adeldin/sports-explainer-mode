import { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useImmersive } from './lib/immersive';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { Sport } from './lib/api';
import { registerForPushNotificationsAsync, setupNotificationHandler } from './lib/notifications';
import { resyncGameAlerts } from './lib/gameAlerts';
import { resyncTeamAlerts } from './lib/teamAlerts';
import { useTheme } from './lib/theme';
import { useAppState } from './lib/appState';

import Onboarding from './components/Onboarding';
import ScrumIntro from './components/ScrumIntro';
import MorphCinematic from './components/MorphCinematic';
import LiveScreen from './screens/LiveScreen';
import AcademyScreen from './screens/AcademyScreen';
import CoachesCornerScreen from './screens/CoachesCornerScreen';
import SettingsTab from './screens/SettingsTab';

// Prevent the native splash from hiding automatically
SplashScreen.preventAutoHideAsync();

// Configure how notifications present (incl. while foregrounded) — once, on load.
setupNotificationHandler();

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Live: 'radio',
  Academy: 'school',
  "Coach's Corner": 'clipboard',
  Settings: 'settings',
};

export default function App() {
  const immersive = useImmersive();   // hides the tab bar while a landscape piece is open
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,     // "SportsWise" wordmark (cinematic — applied separately)
    SpaceGrotesk_600SemiBold, // main header
    SpaceGrotesk_500Medium,   // "Watch and ask why." tagline (applied separately)
  });

  // Shared persisted state now lives in AppStateProvider. App only reads what the
  // launch gate / onboarding needs and drives the cinematic + notification plumbing.
  const { language, setLevel, notificationsEnabled, hydrated } = useAppState();

  // (An earlier "orientation-change input-frame fix" toggled StatusBar.setHidden here
  // on every dimension change. It never worked: React Native refuses setHidden under
  // edge-to-edge — logcat shows "Ignored status bar change" — and the dead-touch bug it
  // targeted is actually a rotation-timing race, now fixed at the source in GameHost by
  // deferring the orientation lock. See scheduleLock() there.)

  // --- Gate state (launch-only, not shared) ---
  const [isAnimationComplete, setAnimationComplete] = useState(false);
  const [seenCinematic, setSeenCinematic] = useState(false);
  const [scrumIntroSeen, setScrumIntroSeen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [, setExpoPushToken] = useState('');
  // The sport chosen during onboarding seeds the Live tab's local selection (one-time).
  const [initialSport, setInitialSport] = useState<Sport>('mlb');

  const { theme } = useTheme();

  const notificationListener = useRef<import('expo-notifications').Subscription | null>(null);
  const responseListener = useRef<import('expo-notifications').Subscription | null>(null);

  // Base orientation: portrait everywhere. app.json is now "default" (so field-game screens can opt
  // into LANDSCAPE via GameHost); this root lock keeps every OTHER screen portrait, unchanged.
  useEffect(() => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); }, []);

  // --- Gate keys (onboarding + cinematic). Shared state is loaded by the provider. ---
  useEffect(() => {
    async function initGate() {
      try {
        const [onboarding, seenCine, scrumSeen] = await Promise.all([
          AsyncStorage.getItem('onboarding_complete'),
          AsyncStorage.getItem('seen_cinematic'),
          AsyncStorage.getItem('scrum_intro_seen'),
        ]);
        if (seenCine === 'true') setSeenCinematic(true);
        setScrumIntroSeen(scrumSeen === 'true');
        // Brief defer so the splash stays up until the first real frame is ready.
        setTimeout(() => setOnboardingComplete(onboarding === 'true'), 50);
      } catch (e) {
        console.warn('Gate init error:', e);
        setOnboardingComplete(false); // Still unblock the app if something fails
      }
    }
    initGate();
  }, []);

  // Hide the native splash only once state AND fonts are ready, so the first
  // real content paints with Space Grotesk already loaded — no font-swap flash.
  useEffect(() => {
    if (hydrated && fontsLoaded && onboardingComplete !== null) {
      SplashScreen.hideAsync();
    }
  }, [hydrated, fontsLoaded, onboardingComplete]);

  useEffect(() => {
    // Skip in Expo Go — not supported since SDK 53
    if (Constants.appOwnership === 'expo') return;

    if (onboardingComplete && notificationsEnabled) {
      registerForPushNotificationsAsync().then(token => setExpoPushToken(token || ''));
    }

    // Re-arm starred-game kickoff alerts. Stars are persisted, but the OS's pending-notification
    // list is not guaranteed to survive a reinstall or a restore from backup — rescheduling by
    // stable identifier is idempotent, so this repairs that without ever double-notifying. Also
    // prunes games that have already started. Independent of `notificationsEnabled`, which governs
    // the daily quiz nudge; a game alert is something the user asked for one game at a time.
    resyncGameAlerts();
    // Followed teams must be RE-materialized, not just repaired: their fixtures roll forward, so
    // without this a team follow would stop notifying once its first few games had been played.
    resyncTeamAlerts();

    import('expo-notifications').then(Notifications => {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification Received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        // gameId deep-link handling lives in the Live tab now; just log here.
        const gameId = response.notification.request.content.data?.gameId as string | undefined;
        if (gameId) { console.log('Notification tapped for game:', gameId); }
      });
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [onboardingComplete, notificationsEnabled]);

  // --- Conditional Returns (The Gatekeepers) ---
  if (!hydrated || !fontsLoaded || onboardingComplete === null) return null;

  if (!isAnimationComplete) {
    return (
      <MorphCinematic
        quick={seenCinematic}
        onComplete={() => {
          setAnimationComplete(true);
          AsyncStorage.setItem('seen_cinematic', 'true');
        }}
      />
    );
  }

  if (!scrumIntroSeen) {
    return (
      <ScrumIntro
        onComplete={() => {
          setScrumIntroSeen(true);
          AsyncStorage.setItem('scrum_intro_seen', 'true');
        }}
      />
    );
  }

  if (!onboardingComplete) {
    return <Onboarding language={language} onComplete={(l, s) => { setLevel(l); setInitialSport(s); setOnboardingComplete(true); }} />;
  }

  // Match the navigation container's background to our theme so tab switches and
  // the initial paint never flash white.
  const navTheme = {
    ...(theme.statusBar === 'light-content' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.statusBar === 'light-content' ? DarkTheme : DefaultTheme).colors,
      background: theme.background,
      card: theme.surface,
      border: theme.border,
      primary: theme.accent,
      text: theme.textPrimary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name] ?? 'ellipse'} size={size} color={color} />
          ),
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          // Driven by the immersive store, NOT by a per-screen setOptions override: this
          // function re-runs on every navigator render and would otherwise reinstate the bar
          // underneath an open landscape piece. See lib/immersive.ts.
          tabBarStyle: immersive
            ? { display: 'none' as const }
            : {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                borderTopWidth: 1,
              },
        })}>
        <Tab.Screen name="Live" options={{ tabBarLabel: 'Live' }}>
          {({ navigation }) => (
            <LiveScreen initialSport={initialSport} navigation={navigation} />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Coach's Corner"
          component={CoachesCornerScreen}
          options={{
            // Two-line stacked label so "Coach's Corner" fits the tab bar. Render-function form
            // (bottom-tabs supports it); sized to sit intentionally next to the single-line labels.
            tabBarLabel: ({ color }) => (
              <View style={{ alignItems: 'center', marginTop: -2 }}>
                {/* includeFontPadding is Android-only (no-op on iOS): without it Android adds
                    ascent padding that clips the second line at this tight lineHeight. */}
                <Text style={{ color, fontSize: 10, fontWeight: '600', lineHeight: 12, includeFontPadding: false }}>Coach's</Text>
                <Text style={{ color, fontSize: 10, fontWeight: '600', lineHeight: 12, includeFontPadding: false }}>Corner</Text>
              </View>
            ),
          }}
        />
        <Tab.Screen name="Academy" component={AcademyScreen} options={{ tabBarLabel: 'Academy' }} />
        <Tab.Screen name="Settings" component={SettingsTab} options={{ tabBarLabel: 'Settings' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
