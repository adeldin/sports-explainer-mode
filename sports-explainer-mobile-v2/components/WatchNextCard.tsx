import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { SPORTS } from '../lib/sports';
import { WatchCandidate } from '../lib/watchNext';
import { WHY_YOUD_LIKE_IT } from '../lib/whyYoudLikeIt';

// Glanceable "Watch Next" card (Weather-app pattern): collapsed = matchup + status +
// sport; the whole top area is the PRIMARY tap → opens the game. A separate "Why
// watch?" gesture expands the data-driven (same-sport) or hook (discovery) reason.
interface Props {
  rec: WatchCandidate;
  isDiscovery: boolean;     // pick is a different parent sport than the just-finished game
  onOpen: () => void;       // navigate into the recommended game (parent decides reset path)
}

export default function WatchNextCard({ rec, isDiscovery, onOpen }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  const meta = SPORTS.find(s => s.key === rec.sport);
  const sportLabel = meta?.label ?? rec.sport;
  const sportEmoji = meta?.emoji ?? '🏟️';

  const scoreStr =
    rec.status === 'live' && rec.homeScore != null && rec.awayScore != null
      ? `${rec.awayTeam} ${rec.awayScore}–${rec.homeTeam} ${rec.homeScore}`
      : '';

  const why = isDiscovery
    ? (WHY_YOUD_LIKE_IT[rec.sport] ?? `A great ${sportLabel} matchup to discover.`)
    : rec.status === 'live'
      ? `Another ${sportLabel} game on right now${scoreStr ? ` — ${scoreStr}` : ''}.`
      : `The next ${sportLabel} game, starting soon.`;

  const toggle = () => { Haptics.selectionAsync(); setExpanded(e => !e); };

  return (
    <View style={styles.card}>
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>👀 {('Watch Next').toUpperCase()}</Text>
        <Text style={styles.sportChip}>{sportEmoji} {sportLabel}</Text>
      </View>

      {/* PRIMARY tap → open the game */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpen} style={styles.main}>
        <Text style={styles.matchup}>{rec.awayTeam} vs {rec.homeTeam}</Text>
        {rec.status === 'live'
          ? <Text style={styles.live}>🔴 LIVE{scoreStr ? `  ·  ${scoreStr}` : ''}</Text>
          : <Text style={styles.upcoming}>{rec.statusLabel || 'Upcoming'}</Text>}
      </TouchableOpacity>

      {/* SEPARATE gesture → expand the "why" (does not navigate) */}
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={styles.whyRow}>
        <Text style={styles.whyToggle}>{expanded ? 'Hide' : 'Why watch?'}</Text>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && <Text style={styles.whyText}>{why}</Text>}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Teal "discovery" accent (t.accentCool) marks this as a distinct "next action",
  // not another orange explanation card. The 🔴 LIVE line stays orange (real signal).
  card: { backgroundColor: t.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accentCool },
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eyebrow: { color: t.accentCool, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sportChip: { color: t.textMuted, fontSize: 12, fontWeight: '700' },
  main: { paddingVertical: 2 },
  matchup: { color: t.textPrimary, fontSize: 18, fontWeight: '800' },
  live: { color: t.accent, fontSize: 13, fontWeight: '800', marginTop: 4 },
  upcoming: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  whyToggle: { color: t.accentCoolLight, fontSize: 13, fontWeight: '700' },
  chevron: { color: t.accentCoolLight, fontSize: 13, fontWeight: '700' },
  whyText: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
});
