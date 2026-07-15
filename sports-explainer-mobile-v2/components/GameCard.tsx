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
  // Flag/crest presentation value (cricket national sides): emoji OR an https URL. The renderer
  // branches Text-vs-Image on the value so a future licensed flag-art source is a backend
  // values-only swap. Absent → the existing null-render (name-only row), same as a missing logo.
  homeFlag?: string;
  awayFlag?: string;
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

// Dark-mode card gradients (team-colored). Tuned to read as raised, premium
// surfaces on the navy app background (#0d1b3e) — each is a navy-blended
// mid-tone of the sport's hue, lighter than the bg so cards lift off it.
const SPORT_COLORS: Record<string, [string, string]> = {
  nfl: ['#2b3340', '#1e242e'],
  mlb: ['#26315e', '#1a2344'],
  nba: ['#4a2a10', '#33200c'],
  nhl: ['#1a3a6b', '#12294d'],
  mls: ['#3a1a4a', '#281236'],
  // MLS uses the 'soccer' key — navy-blended (was off-brand pitch-green). Per-sport
  // vs. per-state color-coding is a deliberate decision for later.
  soccer: ['#26315e', '#1a2344'],
  worldcup: ['#3a2a5e', '#281c44'],
  rugby: ['#124449', '#0c3035'],
};

// Selected card is a brand treatment — navy fill + orange border in BOTH
// themes (white text sits on it), so the navy is explicit rather than a
// mode-dependent surface token.
const SELECTED_GRADIENT: [string, string] = ['#1a2d52', '#0d1b3e'];

export default function GameCard({ game, isSelected, isFavorite, onPress, onToggleFavorite }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isLight = theme.mode === 'light';

  const gradientColors: [string, string] = isSelected
    ? SELECTED_GRADIENT
    : isLight
      ? [theme.surface, theme.surface]
      : SPORT_COLORS[game.sport] || [theme.surface, theme.background];

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
            borderTopColor: theme.accent,
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
              ) : game.awayFlag ? (
                game.awayFlag.startsWith('http')
                  ? <Image source={{ uri: game.awayFlag }} style={styles.logo} resizeMode="contain" />
                  : <Text style={styles.flag}>{game.awayFlag}</Text>
              ) : null}
              <Text style={[styles.teamName, { color: onCard }]} numberOfLines={1}>{game.awayTeam}</Text>
            </View>
            <Text style={[styles.score, { color: onCard }]}>{game.awayScore}</Text>
          </View>
          <View style={styles.teamRow}>
            <View style={styles.teamLeft}>
              {game.homeLogo ? (
                <Image source={{ uri: game.homeLogo }} style={styles.logo} resizeMode="contain" />
              ) : game.homeFlag ? (
                game.homeFlag.startsWith('http')
                  ? <Image source={{ uri: game.homeFlag }} style={styles.logo} resizeMode="contain" />
                  : <Text style={styles.flag}>{game.homeFlag}</Text>
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
    borderColor: t.accent,
    borderWidth: 2,
    shadowColor: t.accent,
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
  // Emoji flag in the logo slot: sized so its rendered width ≈ the 24px logo box, keeping cricket
  // rows aligned with MLB rows. A ~19px glyph + the row's gap leaves the name column its 12a width
  // — the flag must never re-crush what the short scores freed (Gate 12 Bug 1).
  flag: { fontSize: 16, width: 24, textAlign: 'center' },
  teamName: { fontSize: 13, fontWeight: '700', flex: 1 },
  score: { fontSize: 18, fontWeight: '900' },
  status: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
