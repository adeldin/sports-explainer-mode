import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { Sport, Level, Language } from './lib/api';
import { registerForPushNotificationsAsync } from './lib/notifications';
import { useTheme } from './lib/theme';
import { SPORTS, orderSports, type SportTab } from './lib/sports';

import Onboarding from './components/Onboarding';
import MorphCinematic from './components/MorphCinematic';
import LiveScreen from './screens/LiveScreen';
import AcademyScreen from './screens/AcademyScreen';
import SettingsTab from './screens/SettingsTab';

// Prevent the native splash from hiding automatically
SplashScreen.preventAutoHideAsync();

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt', 'de', 'ja', 'zh', 'ko', 'it', 'ar'];

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Live: 'radio',
  Academy: 'school',
  Settings: 'settings',
};

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,     // "SportsWise" wordmark (cinematic — applied separately)
    SpaceGrotesk_600SemiBold, // main header
    SpaceGrotesk_500Medium,   // "Watch and ask why." tagline (applied separately)
  });

  // --- Gate state ---
  const [appReady, setAppReady] = useState(false);
  const [isAnimationComplete, setAnimationComplete] = useState(false);
  const [seenCinematic, setSeenCinematic] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [, setExpoPushToken] = useState('');

  // --- Shared state (passed to Live + Settings tabs) ---
  const [favorites, setFavorites] = useState<string[]>([]);
  const [orderedSports, setOrderedSports] = useState<SportTab[]>(SPORTS);
  const [sportVisibility, setSportVisibility] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState<Level>('beginner');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // The sport chosen during onboarding seeds the Live tab's initial selection.
  const [initialSport, setInitialSport] = useState<Sport>('mlb');

  const { theme } = useTheme();

  const notificationListener = useRef<import('expo-notifications').Subscription | null>(null);
  const responseListener = useRef<import('expo-notifications').Subscription | null>(null);

  // --- Effects ---
  useEffect(() => {
    async function init() {
      try {
        const [onboarding, favs, notify, seenCine, lang, tabOrder, visRaw] = await Promise.all([
          AsyncStorage.getItem('onboarding_complete'),
          AsyncStorage.getItem('favorite_teams'),
          AsyncStorage.getItem('notifications_enabled'),
          AsyncStorage.getItem('seen_cinematic'),
          AsyncStorage.getItem('user_language'),
          AsyncStorage.getItem('sport_tab_order'),
          AsyncStorage.getItem('sport_visibility'),
        ]);

        if (favs) setFavorites(JSON.parse(favs));
        // Restore the user's saved sport-tab order (reconstructed from the shared
        // SPORTS list so new sports appear and removed ones drop out).
        if (tabOrder) {
          try { setOrderedSports(orderSports(JSON.parse(tabOrder))); } catch { /* keep default order */ }
        }
        if (visRaw) {
          try { setSportVisibility(JSON.parse(visRaw)); } catch { /* keep all-visible */ }
        }
        if (notify !== null) setNotificationsEnabled(notify === 'true');
        if (seenCine === 'true') setSeenCinematic(true);
        if (lang) {
          setLanguage(lang as Language);
        } else {
          // First run, no saved preference — default to the device language if supported.
          const code = Localization.getLocales()[0]?.languageCode;
          if (code && SUPPORTED_LANGS.includes(code)) setLanguage(code as Language);
        }

        setAppReady(true);

        setTimeout(() => {
          setOnboardingComplete(onboarding === 'true');
        }, 50);

      } catch (e) {
        console.warn('Init error:', e);
        setAppReady(true); // Still unblock the app if something fails
      }
    }
    init();
  }, []);

  // Hide the native splash only once data AND fonts are ready, so the first
  // real content paints with Space Grotesk already loaded — no font-swap flash.
  useEffect(() => {
    if (appReady && fontsLoaded && onboardingComplete !== null) {
      SplashScreen.hideAsync();
    }
  }, [appReady, fontsLoaded, onboardingComplete]);

  useEffect(() => {
    // Skip in Expo Go — not supported since SDK 53
    if (Constants.appOwnership === 'expo') return;

    if (onboardingComplete && notificationsEnabled) {
      registerForPushNotificationsAsync().then(token => setExpoPushToken(token || ''));
    }

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

  // My Sports: persist the new order + visibility. If this hides the active Live
  // sport, the Live tab's own effect switches to the first visible one.
  const handleSportsChange = (order: string[], visibility: Record<string, boolean>) => {
    setOrderedSports(orderSports(order));
    setSportVisibility(visibility);
    AsyncStorage.setItem('sport_tab_order', JSON.stringify(order));
    AsyncStorage.setItem('sport_visibility', JSON.stringify(visibility));
  };

  const handleLanguageChange = async (lng: Language) => {
    setLanguage(lng);
    await AsyncStorage.setItem('user_language', lng);
  };

  const handleNotificationsToggle = async (val: boolean) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem('notifications_enabled', val ? 'true' : 'false');
  };

  // --- Conditional Returns (The Gatekeepers) ---
  if (!appReady || !fontsLoaded || onboardingComplete === null) return null;

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
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: 1,
          },
        })}>
        <Tab.Screen name="Live" options={{ tabBarLabel: 'Live' }}>
          {({ navigation }) => (
            <LiveScreen
              language={language}
              level={level}
              autoRefresh={autoRefresh}
              favorites={favorites}
              setFavorites={setFavorites}
              orderedSports={orderedSports}
              sportVisibility={sportVisibility}
              initialSport={initialSport}
              navigation={navigation}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Academy" component={AcademyScreen} options={{ tabBarLabel: 'Academy' }} />
        <Tab.Screen name="Settings" options={{ tabBarLabel: 'Settings' }}>
          {() => (
            <SettingsTab
              language={language}
              level={level}
              autoRefresh={autoRefresh}
              notificationsEnabled={notificationsEnabled}
              orderedSports={orderedSports}
              sportVisibility={sportVisibility}
              onLevelChange={setLevel}
              onLanguageChange={handleLanguageChange}
              onAutoRefreshChange={setAutoRefresh}
              onNotificationsToggle={handleNotificationsToggle}
              onSportsChange={handleSportsChange}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
