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

export const darkTheme: Theme = {
  mode: 'dark',
  statusBar: 'light-content',
  background: '#000000',
  surface: '#111111',
  surfaceAlt: '#0a0a0a',
  surfaceActive: '#001133',
  border: '#222222',
  borderStrong: '#333333',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
  accent: '#0055ff',
  accentText: '#4488ff',
  onAccent: '#ffffff',
  live: '#ff3b30',
  liveSoftBg: '#1a0000',
  warn: '#ff6b00',
  warnBg: '#1a0a00',
  explanationBg: '#0a0a1a',
  stripe: 'rgba(255,255,255,0.13)',
  insightBg: '#00112a',
  insightBorder: '#001a44',
  insightLabel: '#4488ff',
  insightText: '#aac4ff',
  ruleBg: '#001a0d',
  ruleBorder: '#003319',
  ruleLabel: '#34C759',
  ruleText: '#a0ffb8',
  scrim: 'rgba(0,0,0,0.5)',
};

export const lightTheme: Theme = {
  mode: 'light',
  statusBar: 'dark-content',
  background: '#f4f5f7',
  surface: '#ffffff',
  surfaceAlt: '#eef0f3',
  surfaceActive: '#e8efff',
  border: '#e4e7ec',
  borderStrong: '#d4d8df',
  textPrimary: '#11151c',
  textSecondary: '#5b6573',
  textMuted: '#95a0ad',
  accent: '#0055ff',
  accentText: '#0055ff',
  onAccent: '#ffffff',
  live: '#ff3b30',
  liveSoftBg: '#ffecec',
  warn: '#d9480f',
  warnBg: '#fff3e8',
  explanationBg: '#ffffff',
  stripe: 'rgba(0,0,0,0.08)',
  insightBg: '#eef4ff',
  insightBorder: '#d6e4ff',
  insightLabel: '#0055ff',
  insightText: '#234a8f',
  ruleBg: '#e9f9ef',
  ruleBorder: '#cdebd6',
  ruleLabel: '#1a8a3c',
  ruleText: '#1f6b38',
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
