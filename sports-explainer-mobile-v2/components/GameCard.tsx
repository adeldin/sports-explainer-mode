import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // Added for the star

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
  isLive: boolean;
  sport: string;
}

interface Props {
  game: Game;
  isSelected: boolean;
  isFavorite: boolean; // New prop
  onPress: () => void;
  onToggleFavorite: () => void; // New prop
}

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

export default function GameCard({ game, isSelected, isFavorite, onPress, onToggleFavorite }: Props) {
  const colors = SPORT_COLORS[game.sport] || ['#1a1a1a', '#111'];

  return (
    <TouchableOpacity onPress={onPress} style={styles.wrapper} activeOpacity={0.85}>
      <LinearGradient
        colors={isSelected ? ['#0055ff', '#0033aa'] : colors}
        style={[styles.card, isSelected && styles.cardSelected]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <View style={styles.topRow}>
          {/* Live badge */}
          {game.isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : <View />}

          {/* Favorite Star */}
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation(); // Prevents selecting the game when starring
              onToggleFavorite();
            }}
            style={styles.starBtn}
          >
            <Ionicons 
              name={isFavorite ? "star" : "star-outline"} 
              size={18} 
              color={isFavorite ? "#ffcc00" : "rgba(255,255,255,0.3)"} 
            />
          </TouchableOpacity>
        </View>

        {/* Teams + Scores */}
        <View style={styles.matchup}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName} numberOfLines={1}>{game.awayTeam}</Text>
            <Text style={styles.score}>{game.awayScore}</Text>
          </View>
          <View style={styles.teamRow}>
            <Text style={styles.teamName} numberOfLines={1}>{game.homeTeam}</Text>
            <Text style={styles.score}>{game.homeScore}</Text>
          </View>
        </View>

        {/* Game status */}
        <Text style={styles.status}>{game.status}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginRight: 12 },
  card: {
    width: 150,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3b30',
  },
  liveText: {
    color: '#ff3b30',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  starBtn: {
    padding: 4,
    marginRight: -4,
  },
  matchup: { gap: 6, marginBottom: 10 },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  score: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  status: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});