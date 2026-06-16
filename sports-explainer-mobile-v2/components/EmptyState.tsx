import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { Language } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';

interface Props {
  sport: string;
  reason: 'no-games' | 'off-season' | 'select-game';
  language: Language;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// IN-season month windows (1-12). Drives both off-season detection and the
// displayed "season runs X to Y" copy. World Cup has no annual window — handled
// specially (every 4 years).
const SEASON_WINDOWS: Record<string, { start: number; end: number }> = {
  mlb: { start: 3, end: 10 },    // March–October
  nfl: { start: 9, end: 2 },     // September–February
  nba: { start: 10, end: 6 },    // October–June
  nhl: { start: 10, end: 6 },    // October–June
  wnba: { start: 5, end: 10 },   // May–October
  soccer: { start: 3, end: 10 }, // March–October (MLS)
  epl: { start: 8, end: 5 },     // August–May
  laliga: { start: 8, end: 5 },  // August–May
  rugby: { start: 9, end: 6 },   // September–June (URC)
  mlr: { start: 2, end: 7 },     // February–July
};

const SPORT_EMOJI: Record<string, string> = {
  mlb: '⚾', nfl: '🏈', nba: '🏀', nhl: '🏒', soccer: '⚽', worldcup: '🌍', rugby: '🏉',
  wnba: '🏀', epl: '⚽', laliga: '⚽', mlr: '🏉',
};

function isOffSeason(sport: string): boolean {
  if (sport === 'worldcup') return true; // rare tournament — always show the season note
  const w = SEASON_WINDOWS[sport];
  if (!w) return false;
  const month = new Date().getMonth() + 1; // 1-12
  const inSeason = w.start <= w.end
    ? (month >= w.start && month <= w.end)
    : (month >= w.start || month <= w.end); // wraps the year (NFL/NBA/NHL/EPL/La Liga/rugby)
  return !inSeason;
}

export default function EmptyState({ sport, reason, language }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const emoji = SPORT_EMOJI[sport] || '📡';
  const names: Record<string, string> = {
    mlb: S.spBaseball, nfl: S.spFootball, nba: S.spBasketball, nhl: S.spHockey,
    soccer: S.spSoccer, worldcup: S.spWorldCup, rugby: S.spRugby,
    wnba: S.spWnba, epl: S.spPremierLeague, laliga: S.spLaLiga, mlr: S.spMlr,
  };
  const sportName = names[sport] || sport.toUpperCase();

  const detectedOffSeason = reason === 'no-games' && isOffSeason(sport);
  const effectiveReason = detectedOffSeason ? 'off-season' : reason;

  if (effectiveReason === 'select-game') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>📡</Text>
        <Text style={styles.title}>{S.selectGame}</Text>
      </View>
    );
  }

  if (effectiveReason === 'off-season') {
    const w = SEASON_WINDOWS[sport];
    const seasonSub = (sport === 'worldcup' || !w)
      ? S.worldCupRuns
      : S.seasonRuns.replace('{start}', MONTHS[w.start - 1]).replace('{end}', MONTHS[w.end - 1]);
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{S.seasonTitle.replace('{sport}', sportName)}</Text>
        <Text style={styles.subtitle}>{seasonSub}</Text>
      </View>
    );
  }

  // no-games
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{S.noGames.replace('{sport}', sportName)}</Text>
      <Text style={styles.subtitle}>{S.pullRefresh}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32, gap: 12 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { color: t.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: t.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  badge: { marginTop: 16, backgroundColor: t.warnBg, borderWidth: 1, borderColor: t.warn, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: t.warn, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
