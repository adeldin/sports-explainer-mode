import { View, Text, StyleSheet } from 'react-native';
import { brand } from '../lib/theme';

interface Props {
  gameContext: string;
  rawPlay: string;
  simple: string;
  whyItMatters?: string;
  sport: string;
}

const SPORT_EMOJI: Record<string, string> = {
  mlb: '⚾', nfl: '🏈', nba: '🏀', nhl: '🏒', soccer: '⚽', worldcup: '🌍', rugby: '🏉',
  wnba: '🏀', epl: '⚽', laliga: '⚽', mlr: '🏉',
};

export default function ShareCard({ gameContext, rawPlay, simple, whyItMatters, sport }: Props) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Sports<Text style={styles.appNameAccent}>wise</Text></Text>
          <Text style={styles.tagline}>⚡ THE SMART PLAY</Text>
        </View>
        <Text style={styles.sportEmoji}>{SPORT_EMOJI[sport]}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Game Context */}
      <Text style={styles.gameContext}>{gameContext}</Text>
      <View style={styles.playPill}>
        <Text style={styles.playText}>▶ {rawPlay}</Text>
      </View>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationText}>{simple}</Text>
      </View>

      {/* Why It Matters */}
      {whyItMatters ? (
        <View style={styles.whyBox}>
          <Text style={styles.whyLabel}>💡 WHY IT MATTERS</Text>
          <Text style={styles.whyText}>{whyItMatters}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>sportswise.app</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 360,
    backgroundColor: brand.navy,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: brand.navySurface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  appName: { color: brand.white, fontSize: 16, fontWeight: '900' },
  appNameAccent: { color: brand.orange },
  tagline: { color: brand.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  sportEmoji: { fontSize: 28, marginLeft: 'auto' },
  divider: { height: 1, backgroundColor: brand.navySurface, marginBottom: 16 },
  gameContext: { color: brand.white, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  playPill: {
    backgroundColor: brand.navySurface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  playText: { color: '#9aa6bd', fontSize: 13 },
  explanationBox: {
    backgroundColor: brand.navySurface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  explanationText: { color: '#f0f0f0', fontSize: 15, lineHeight: 24 },
  whyBox: {
    backgroundColor: brand.slate,
    borderLeftWidth: 3,
    borderLeftColor: brand.slateAccent,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  whyLabel: { color: brand.slateAccent, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  whyText: { color: brand.slateText, fontSize: 14, lineHeight: 22 },
  footer: { alignItems: 'center', marginTop: 8 },
  footerText: { color: '#4a5a78', fontSize: 11 },
});