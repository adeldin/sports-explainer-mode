import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Level, Language } from './api';
import { SPORTS, orderSports, type SportTab } from './sports';

// Languages shown in the picker at launch. The other 8 translations still exist in
// lib/strings.ts (and the Language type) but are hidden for now — a stored or device
// language outside this set falls back to English on load. Keep in sync with the
// LANGUAGES picker array in SettingsScreen.tsx.
const LAUNCH_LANGUAGES: Language[] = ['en', 'es'];

// All AsyncStorage keys this provider owns, in one place. `level` and `autoRefresh`
// are NEW vs. the pre-Stage-2 code (they were never persisted before) — centralizing
// persistence here means they now survive a cold start like everything else.
const KEYS = {
  favorites: 'favorite_teams',
  notifications: 'notifications_enabled',
  language: 'user_language',
  tabOrder: 'sport_tab_order',
  visibility: 'sport_visibility',
  level: 'user_level',
  autoRefresh: 'auto_refresh',
} as const;

interface AppStateValue {
  // --- Owned shared state ---
  language: Language;
  level: Level;
  orderedSports: SportTab[];
  sportVisibility: Record<string, boolean>;
  favorites: string[];
  autoRefresh: boolean;
  notificationsEnabled: boolean;

  // --- Raw setters (writes auto-persist via the effects below) ---
  setLanguage: (l: Language) => void;
  setLevel: (l: Level) => void;
  setOrderedSports: (s: SportTab[]) => void;
  setSportVisibility: (v: Record<string, boolean>) => void;
  setFavorites: (f: string[]) => void;
  setAutoRefresh: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;

  // True once the initial AsyncStorage load has completed. Consumers (the App gate)
  // should wait for this before persisting/rendering so defaults never clobber
  // stored values.
  hydrated: boolean;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [level, setLevel] = useState<Level>('beginner');
  const [orderedSports, setOrderedSports] = useState<SportTab[]>(SPORTS);
  const [sportVisibility, setSportVisibility] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // --- Load persisted state once on mount (moved out of App.tsx's init()) ---
  useEffect(() => {
    async function load() {
      try {
        const [favs, notify, lang, tabOrder, visRaw, lvl, auto] = await Promise.all([
          AsyncStorage.getItem(KEYS.favorites),
          AsyncStorage.getItem(KEYS.notifications),
          AsyncStorage.getItem(KEYS.language),
          AsyncStorage.getItem(KEYS.tabOrder),
          AsyncStorage.getItem(KEYS.visibility),
          AsyncStorage.getItem(KEYS.level),
          AsyncStorage.getItem(KEYS.autoRefresh),
        ]);

        if (favs) { try { setFavorites(JSON.parse(favs)); } catch { /* keep [] */ } }
        // Reconstruct the saved tab order from the shared SPORTS list so newly-added
        // sports appear and removed ones drop out.
        if (tabOrder) {
          try { setOrderedSports(orderSports(JSON.parse(tabOrder))); } catch { /* keep default order */ }
        }
        if (visRaw) {
          try { setSportVisibility(JSON.parse(visRaw)); } catch { /* keep all-visible */ }
        }
        if (notify !== null) setNotificationsEnabled(notify === 'true');
        if (auto !== null) setAutoRefresh(auto === 'true');
        if (lvl) setLevel(lvl as Level);
        if (lang) {
          // Honor a stored preference only if it's a currently-visible launch language.
          // A tester who previously picked a now-hidden language (e.g. fr) falls back to
          // English — and the auto-persist effect heals the stored value to 'en'.
          setLanguage(LAUNCH_LANGUAGES.includes(lang as Language) ? (lang as Language) : 'en');
        } else {
          // First run, no saved preference — default to the device language only if it's
          // a visible launch language; otherwise the 'en' default stands.
          const code = Localization.getLocales()[0]?.languageCode;
          if (code && LAUNCH_LANGUAGES.includes(code as Language)) setLanguage(code as Language);
        }
      } catch (e) {
        console.warn('AppState load error:', e);
      } finally {
        // Unblock the app even if the read failed — defaults are sensible.
        setHydrated(true);
      }
    }
    load();
  }, []);

  // --- Auto-persist on change (skipped until the initial load completes) ---
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.language, language); }, [language, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.level, level); }, [level, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.autoRefresh, autoRefresh ? 'true' : 'false'); }, [autoRefresh, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.notifications, notificationsEnabled ? 'true' : 'false'); }, [notificationsEnabled, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favorites)); }, [favorites, hydrated]);
  // Persist the order as the bare key list (the shape orderSports() reads back).
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.tabOrder, JSON.stringify(orderedSports.map(s => s.key))); }, [orderedSports, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.visibility, JSON.stringify(sportVisibility)); }, [sportVisibility, hydrated]);

  const value: AppStateValue = {
    language, level, orderedSports, sportVisibility, favorites, autoRefresh, notificationsEnabled,
    setLanguage, setLevel, setOrderedSports, setSportVisibility, setFavorites, setAutoRefresh, setNotificationsEnabled,
    hydrated,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
