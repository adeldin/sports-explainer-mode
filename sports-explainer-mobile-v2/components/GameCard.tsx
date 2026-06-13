import { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../lib/theme';

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  homeLogo?: string;
  awayLogo?: string;
  status: string;
  isLive: boolean;
  sport: string;
}

interface Props {
  game: Game;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

// Dark-mode card gradients (team-colored, dark).
const SPORT_COLORS: Record<string, [string, string]> = {
  nfl: ['#1a3a1a', '#0d2b0d'],
  mlb: ['#1a1a3a', '#0d0d2b'],
  nba: ['#3a1a00', '#2b1200'],
  nhl: ['#001a3a', '#000d2b'],
  mls: ['#1a001a', '#0d000d'],
  soccer: ['#0a2a1a', '#06180f'],
  worldcup: ['#2a1a3a', '#1a0d2b'],
  rugby: ['#06262a', '#03161a'],
};

// Light-mode top-accent color per sport (white card + colored edge).
const SPORT_ACCENT: Record<string, string> = {
  nfl: '#2f9e44',
  mlb: '#3b5bdb',
  nba: '#e8590c',
  nhl: '#1971c2',
  mls: '#ae3ec9',
  soccer: '#2f9e44',
  worldcup: '#7048e8',
  rugby: '#0c8599',
};

export default function GameCard({ game, isSelected, isFavorite, onPress, onToggleFavorite }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isLight = theme.mode === 'light';
  const sportAccent = SPORT_ACCENT[game.sport] || theme.accent;

  const gradientColors: [string, string] = isSelected
    ? ['#0055ff', '#0033aa']
    : isLight
      ? [theme.surface, theme.surface]
      : SPORT_COLORS[game.sport] || ['#1a1a1a', '#111'];

  // Text sits on a colored/dark gradient (white) unless it's a light, unselected card.
  const onCard = isSelected ? '#ffffff' : theme.textPrimary;
  const onCardSub = isSelected ? 'rgba(255,255,255,0.7)' : theme.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} style={styles.wrapper} activeOpacity={0.85}>
      <LinearGradient
        colors={gradientColors}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isLight && !isSelected && {
            borderTopWidth: 3,
            borderTopColor: sportAccent,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>

        <View style={styles.topRow}>
          {game.isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : <View />}

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            style={styles.starBtn}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={18}
              color={isFavorite ? '#ffcc00' : isSelected ? 'rgba(255,255,255,0.5)' : theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.matchup}>
          <View style={styles.teamRow}>
            <View style={styles.teamLeft}>
              {game.awayLogo ? (
                <Image source={{ uri: game.awayLogo }} style={styles.logo} resizeMode="contain" />
              ) : null}
              <Text style={[styles.teamName, { color: onCard }]} numberOfLines={1}>{game.awayTeam}</Text>
            </View>
            <Text style={[styles.score, { color: onCard }]}>{game.awayScore}</Text>
          </View>
          <View style={styles.teamRow}>
            <View style={styles.teamLeft}>
              {game.homeLogo ? (
                <Image source={{ uri: game.homeLogo }} style={styles.logo} resizeMode="contain" />
              ) : null}
              <Text style={[styles.teamName, { color: onCard }]} numberOfLines={1}>{game.homeTeam}</Text>
            </View>
            <Text style={[styles.score, { color: onCard }]}>{game.homeScore}</Text>
          </View>
        </View>

        <Text style={[styles.status, { color: onCardSub }]}>{game.status}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrapper: { marginRight: 12 },
  card: {
    width: 150,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.border,
  },
  cardSelected: {
    borderColor: 'rgba(0,120,255,0.6)',
    shadowColor: '#0055ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.live },
  liveText: { color: t.live, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  starBtn: { padding: 4, marginRight: -4 },
  matchup: { gap: 6, marginBottom: 10 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, marginRight: 8 },
  logo: { width: 24, height: 24 },
  teamName: { fontSize: 13, fontWeight: '700', flex: 1 },
  score: { fontSize: 18, fontWeight: '900' },
  status: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
