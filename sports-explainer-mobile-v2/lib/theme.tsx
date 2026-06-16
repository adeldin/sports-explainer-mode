import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface Theme {
  mode: 'dark' | 'light';
  statusBar: 'light-content' | 'dark-content';

  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceActive: string;
  border: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  placeholderText: string;

  accent: string;
  accentText: string;
  onAccent: string;

  live: string;
  liveSoftBg: string;
  warn: string;
  warnBg: string;

  explanationBg: string;
  stripe: string;
  insightBg: string;
  insightBorder: string;
  insightLabel: string;
  insightText: string;
  ruleBg: string;
  ruleBorder: string;
  ruleLabel: string;
  ruleText: string;

  scrim: string;
}

// Raw brand palette — single source of truth for the navy/orange identity.
// Themed UI should use the Theme tokens below; the static, non-themed assets
// (share image, splash) reference these directly so they always render the
// brand regardless of the user's light/dark setting.
export const brand = {
  navy: '#0d1b3e',
  navyDeep: '#0a1733',
  navySurface: '#1a2d52',
  navyAlt: '#142544',
  slate: '#1e2c4d',
  slateAccent: '#9ab4e0',
  slateText: '#c2d4ee',
  orange: '#E87722',
  amber: '#F5A623',
  white: '#ffffff',
};

export const darkTheme: Theme = {
  mode: 'dark',
  statusBar: 'light-content',
  background: '#0d1b3e',
  surface: '#1a2d52',
  surfaceAlt: '#142544',
  surfaceActive: '#243b6a',
  border: '#2a3a5e',
  borderStrong: '#3a4d75',
  textPrimary: '#ffffff',
  textSecondary: '#6b7690',
  textMuted: '#6b7690',
  placeholderText: '#8b94a8',
  accent: '#E87722',
  accentText: '#F5A623',
  onAccent: '#0d1b3e',
  live: '#E87722',
  liveSoftBg: '#2a1a08',
  warn: '#ff5400',
  warnBg: '#241406',
  explanationBg: '#0a1733',
  stripe: 'rgba(255,255,255,0.13)',
  insightBg: '#2a3a5e',
  insightBorder: '#3d527d',
  insightLabel: '#9ab4e0',
  insightText: '#c2d4ee',
  ruleBg: '#2a1a0a',
  ruleBorder: '#4a2f14',
  ruleLabel: '#E87722',
  ruleText: '#ffc9a0',
  scrim: 'rgba(0,0,0,0.5)',
};

export const lightTheme: Theme = {
  mode: 'light',
  statusBar: 'dark-content',
  background: '#f4f5f7',
  surface: '#ffffff',
  surfaceAlt: '#eef0f3',
  surfaceActive: '#fdeede',
  border: '#e4e7ec',
  borderStrong: '#d4d8df',
  textPrimary: '#11151c',
  textSecondary: '#5b6573',
  textMuted: '#95a0ad',
  placeholderText: '#8896a8',
  accent: '#E87722',
  accentText: '#C2611A',
  onAccent: '#0d1b3e',
  live: '#E87722',
  liveSoftBg: '#fdeede',
  warn: '#d9480f',
  warnBg: '#fff3e8',
  explanationBg: '#ffffff',
  stripe: 'rgba(0,0,0,0.08)',
  insightBg: '#eef4ff',
  insightBorder: '#d6e4ff',
  insightLabel: '#0055ff',
  insightText: '#234a8f',
  ruleBg: '#fff1e3',
  ruleBorder: '#ffd9b8',
  ruleLabel: '#C2521A',
  ruleText: '#8a3f14',
  scrim: 'rgba(0,0,0,0.35)',
};

interface Ctx {
  mode: ThemeMode;
  theme: Theme;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<Ctx>({ mode: 'system', theme: darkTheme, setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((v) => {
      if (v === 'system' || v === 'dark' || v === 'light') setModeState(v);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem('theme_mode', m);
  };

  const resolved: 'dark' | 'light' = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const theme = resolved === 'light' ? lightTheme : darkTheme;

  const value = useMemo(() => ({ mode, theme, setMode }), [mode, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
