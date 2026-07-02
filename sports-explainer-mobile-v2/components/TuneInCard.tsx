import { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { Game, GameProbable } from '../lib/scoreboard';
import { Language } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';

// Pre-game "tune-in" card — the scheduled-game analog of PlayCard (live) / RecapCard (final).
// Shows matchup + LOCAL start time + venue, a first-class "Watch on {networks}" affordance (the
// TV-companion hook), and — WHEN PRESENT — team records, probable starters, and weather. Every
// enrich-field is conditional: a rich MLB game shows everything; a bare World Cup fixture shows
// matchup + time + venue + TV, with no broken/empty rows. No odds, no tickets (locked mission call).
interface Props {
  game: Game;
  language: Language;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Device-LOCAL start time (never the game's tz / UTC). English weekday+month abbrevs match DateStrip.
const fmtLocal = (ms?: number): string => {
  if (!ms) return '';
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()} · ${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function TuneInCard({ game, language }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const timeLine = fmtLocal(game.startTime) || game.status;
  const venueLine = game.venue
    ? `${game.venue}${game.venueCity ? ` · ${game.venueCity}` : ''}`
    : '';
  const weather = game.weather;
  const weatherLine = weather && (weather.temperature != null || weather.displayValue)
    ? `${weather.temperature != null ? `${weather.temperature}°` : ''}${weather.temperature != null && weather.displayValue ? ', ' : ''}${weather.displayValue || ''}`
    : '';

  const TeamRow = ({ logo, name, record }: { logo?: string; name: string; record?: string }) => (
    <View style={styles.teamRow}>
      {!!logo && <Image source={{ uri: logo }} style={styles.teamLogo} resizeMode="contain" />}
      <Text style={styles.teamName} numberOfLines={1}>{name}</Text>
      {!!record && <Text style={styles.teamRecord}>{record}</Text>}
    </View>
  );

  const ProbLine = ({ p }: { p: GameProbable }) => (
    <View style={styles.probLine}>
      {!!p.headshot && <Image source={{ uri: p.headshot }} style={styles.probHeadshot} resizeMode="cover" />}
      <Text style={styles.probName} numberOfLines={1}>{p.name}</Text>
      {!!p.record && <Text style={styles.probRecord}>{p.record}</Text>}
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>⏳ {S.tuneInEyebrow}</Text>

      {/* Matchup — away over home (the "away at home" reading), logos + records when present. */}
      <View style={styles.matchup}>
        <TeamRow logo={game.awayLogo} name={game.awayTeamFull || game.awayTeam} record={game.awayRecord} />
        <TeamRow logo={game.homeLogo} name={game.homeTeamFull || game.homeTeam} record={game.homeRecord} />
      </View>

      {!!timeLine && <Text style={styles.time}>{timeLine}</Text>}
      {!!venueLine && <Text style={styles.venue}>📍 {venueLine}</Text>}

      {/* Watch on — FIRST-CLASS. The companion-app hook. Omitted only when no broadcast data. */}
      {!!game.broadcasts?.length && (
        <View style={styles.watchRow}>
          <Text style={styles.watchText}>📺 {S.tuneInWatchOn} {game.broadcasts.join(', ')}</Text>
        </View>
      )}

      {/* Probable starters — MLB (pitchers). Absent elsewhere → whole block hidden. */}
      {(game.awayProbable || game.homeProbable) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.tuneInProbables}</Text>
          {game.awayProbable && <ProbLine p={game.awayProbable} />}
          {game.homeProbable && <ProbLine p={game.homeProbable} />}
        </View>
      )}

      {/* Weather — outdoor-MLB color. Hidden when absent. */}
      {!!weatherLine && <Text style={styles.weather}>🌤 {weatherLine}</Text>}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: { backgroundColor: t.explanationBg, borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: t.stripe, borderWidth: 1, borderColor: t.border },
  eyebrow: { color: t.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  matchup: { gap: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamLogo: { width: 28, height: 28 },
  teamName: { color: t.textPrimary, fontSize: 18, fontWeight: '800', flex: 1 },
  teamRecord: { color: t.textSecondary, fontSize: 13, fontWeight: '700' },
  time: { color: t.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 12 },
  venue: { color: t.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 4 },
  // Watch-on — the hero affordance: accent-bordered tinted row.
  watchRow: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: t.surfaceActive, borderWidth: 1, borderColor: t.accent },
  watchText: { color: t.accentText, fontSize: 15, fontWeight: '800' },
  section: { marginTop: 16, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
  sectionTitle: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  probLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  probHeadshot: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.surface },
  probName: { color: t.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  probRecord: { color: t.textSecondary, fontSize: 13, fontWeight: '600' },
  weather: { color: t.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 14 },
});
