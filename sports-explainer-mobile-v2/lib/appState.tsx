import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Level, Language } from './api';
import { SPORTS, orderSports, type SportTab } from './sports';

// Local YYYY-MM-DD (NOT toISOString, which is UTC and would flip the "day" across
// timezones near midnight). Used for the daily-quiz streak's day-boundary logic.
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Persisted shape of the daily streak: how many consecutive days the user took a
// quiz, plus the local date of the most recent quiz day. `count` only changes when
// recordQuizActivity() runs (on a quiz) — a day passing without playing never
// mutates it on load; the reset is computed lazily on the next quiz.
type DailyStreak = { count: number; lastDate: string };
const DEFAULT_DAILY_STREAK: DailyStreak = { count: 0, lastDate: '' };

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
  dailyStreak: 'quiz_daily_streak',
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
  // Consecutive days the user has taken a quiz (persisted; day-boundary aware).
  dailyStreak: number;

  // --- Raw setters (writes auto-persist via the effects below) ---
  setLanguage: (l: Language) => void;
  setLevel: (l: Level) => void;
  setOrderedSports: (s: SportTab[]) => void;
  setSportVisibility: (v: Record<string, boolean>) => void;
  setFavorites: (f: string[]) => void;
  setAutoRefresh: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;

  // Record that the user took a quiz today; updates the persisted daily streak
  // (continue if yesterday, restart at 1 on a gap, no-op if already counted today)
  // and returns the resulting count so callers can react synchronously.
  recordQuizActivity: () => number;

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
  const [dailyStreakData, setDailyStreakData] = useState<DailyStreak>(DEFAULT_DAILY_STREAK);
  const [hydrated, setHydrated] = useState(false);

  // --- Load persisted state once on mount (moved out of App.tsx's init()) ---
  useEffect(() => {
    async function load() {
      try {
        const [favs, notify, lang, tabOrder, visRaw, lvl, auto, streakRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.favorites),
          AsyncStorage.getItem(KEYS.notifications),
          AsyncStorage.getItem(KEYS.language),
          AsyncStorage.getItem(KEYS.tabOrder),
          AsyncStorage.getItem(KEYS.visibility),
          AsyncStorage.getItem(KEYS.level),
          AsyncStorage.getItem(KEYS.autoRefresh),
          AsyncStorage.getItem(KEYS.dailyStreak),
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
        // Hydrate the stored streak as-is — no recompute on load. A missed day only
        // resets when the next quiz runs recordQuizActivity() and sees the gap.
        if (streakRaw) {
          try {
            const parsed = JSON.parse(streakRaw);
            if (parsed && typeof parsed.count === 'number' && typeof parsed.lastDate === 'string') {
              setDailyStreakData({ count: parsed.count, lastDate: parsed.lastDate });
            }
          } catch { /* keep default {0,''} */ }
        }
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
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.dailyStreak, JSON.stringify(dailyStreakData)); }, [dailyStreakData, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favorites)); }, [favorites, hydrated]);
  // Persist the order as the bare key list (the shape orderSports() reads back).
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.tabOrder, JSON.stringify(orderedSports.map(s => s.key))); }, [orderedSports, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.visibility, JSON.stringify(sportVisibility)); }, [sportVisibility, hydrated]);

  // Record a quiz today and advance/restart/no-op the daily streak. Reads the
  // current streak from the render closure (correct because the Academy calls this
  // once per mount, after hydration) and returns the new count so the caller can
  // pass it straight to the streak-aware reminder without waiting for a re-render.
  const recordQuizActivity = useCallback((): number => {
    const now = new Date();
    const todayStr = localDateStr(now);
    if (dailyStreakData.lastDate === todayStr) return dailyStreakData.count; // already counted today
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localDateStr(yesterday);
    const newCount = dailyStreakData.lastDate === yesterdayStr ? dailyStreakData.count + 1 : 1;
    setDailyStreakData({ count: newCount, lastDate: todayStr });
    return newCount;
  }, [dailyStreakData]);

  const value: AppStateValue = {
    language, level, orderedSports, sportVisibility, favorites, autoRefresh, notificationsEnabled,
    dailyStreak: dailyStreakData.count,
    setLanguage, setLevel, setOrderedSports, setSportVisibility, setFavorites, setAutoRefresh, setNotificationsEnabled,
    recordQuizActivity,
    hydrated,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
