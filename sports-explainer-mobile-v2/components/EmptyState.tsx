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

const OFF_SEASON_DATES: Record<string, { start: number; end: number }> = {
  nfl: { start: 2, end: 8 },   // Feb–Aug off
  nba: { start: 6, end: 9 },   // Jun–Sep off
  mlb: { start: 10, end: 2 },  // Oct–Feb off
  nhl: { start: 6, end: 9 },   // Jun–Sep off
};

const SPORT_EMOJI: Record<string, string> = {
  mlb: '⚾', nfl: '🏈', nba: '🏀', nhl: '🏒', soccer: '⚽', worldcup: '🌍', rugby: '🏉',
};

function isOffSeason(sport: string): boolean {
  const config = OFF_SEASON_DATES[sport];
  if (!config) return false;
  const month = new Date().getMonth() + 1; // 1-12
  if (config.start < config.end) return month >= config.start && month <= config.end;
  return month >= config.start || month <= config.end; // wraps year (MLB)
}

export default function EmptyState({ sport, reason, language }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const emoji = SPORT_EMOJI[sport] || '📡';
  const names: Record<string, string> = {
    mlb: S.spBaseball, nfl: S.spFootball, nba: S.spBasketball, nhl: S.spHockey,
    soccer: S.spSoccer, worldcup: S.spWorldCup, rugby: S.spRugby,
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
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{S.offSeason.replace('{sport}', sportName)}</Text>
        <Text style={styles.subtitle}>{S.offSeasonSub}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚡ {S.smartPlayReturns}</Text>
        </View>
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
