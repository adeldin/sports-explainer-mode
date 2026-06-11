import { View, Text, StyleSheet } from 'react-native';

interface Props {
  sport: string;
  reason: 'no-games' | 'off-season' | 'select-game';
}

const OFF_SEASON_DATES: Record<string, { start: number; end: number; next: string }> = {
  nfl: { start: 2, end: 8, next: 'September' },   // Feb–Aug off
  nba: { start: 6, end: 9, next: 'October' },      // Jun–Sep off
  mlb: { start: 10, end: 2, next: 'March' },       // Oct–Feb off
  nhl: { start: 6, end: 9, next: 'October' },      // Jun–Sep off
};

const SPORT_CONFIG: Record<string, {
  emoji: string;
  name: string;
  noGamesMsg: string;
  offSeasonMsg: string;
  offSeasonSub: string;
  selectMsg: string;
}> = {
  mlb: {
    emoji: '⚾',
    name: 'MLB',
    noGamesMsg: 'No MLB games today',
    offSeasonMsg: 'MLB is in the off-season',
    offSeasonSub: 'Spring Training starts in February. Check back then!',
    selectMsg: 'Select a game above to get The Smart Play',
  },
  nfl: {
    emoji: '🏈',
    name: 'NFL',
    noGamesMsg: 'No NFL games today',
    offSeasonMsg: 'NFL is in the off-season',
    offSeasonSub: 'The regular season kicks off in September.',
    selectMsg: 'Select a game above to get The Smart Play',
  },
  nba: {
    emoji: '🏀',
    name: 'NBA',
    noGamesMsg: 'No NBA games tonight',
    offSeasonMsg: 'NBA is in the off-season',
    offSeasonSub: 'The regular season tips off in October.',
    selectMsg: 'Select a game above to get The Smart Play',
  },
  nhl: {
    emoji: '🏒',
    name: 'NHL',
    noGamesMsg: 'No NHL games tonight',
    offSeasonMsg: 'NHL is in the off-season',
    offSeasonSub: 'The regular season drops the puck in October.',
    selectMsg: 'Select a game above to get The Smart Play',
  },
};

function isOffSeason(sport: string): boolean {
  const config = OFF_SEASON_DATES[sport];
  if (!config) return false;
  const month = new Date().getMonth() + 1; // 1-12
  if (config.start < config.end) {
    return month >= config.start && month <= config.end;
  }
  // Wraps year (e.g. MLB: Oct–Feb)
  return month >= config.start || month <= config.end;
}

export default function EmptyState({ sport, reason }: Props) {
  const config = SPORT_CONFIG[sport] || {
    emoji: '📡',
    name: sport.toUpperCase(),
    noGamesMsg: 'No games available',
    offSeasonMsg: 'Off-season',
    offSeasonSub: 'Check back when the season starts.',
    selectMsg: 'Select a game to get The Smart Play',
  };

  const detectedOffSeason = reason === 'no-games' && isOffSeason(sport);
  const effectiveReason = detectedOffSeason ? 'off-season' : reason;

  if (effectiveReason === 'select-game') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>📡</Text>
        <Text style={styles.title}>{config.selectMsg}</Text>
      </View>
    );
  }

  if (effectiveReason === 'off-season') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={styles.title}>{config.offSeasonMsg}</Text>
        <Text style={styles.subtitle}>{config.offSeasonSub}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚡ THE SMART PLAY RETURNS SOON</Text>
        </View>
      </View>
    );
  }

  // no-games
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={styles.title}>{config.noGamesMsg}</Text>
      <Text style={styles.subtitle}>Pull down to refresh or check back later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  badge: {
    marginTop: 16,
    backgroundColor: '#1a0a00',
    borderWidth: 1,
    borderColor: '#ff6b00',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#ff6b00',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});