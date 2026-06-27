import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { Leaderboard } from '../lib/api';

// Golf live leaderboard — the app's first vertical-list archetype. CLEAN board only (Build 2):
// position / name / total / today / thru, with a tournament header. Tappable teaching concepts are
// Build 3. Rendered via .map() (NOT a nested FlatList) because this sits inside LiveScreen's parent
// ScrollView; ~72 rows is fine. Styling derives from LiveScreen's tournamentCard token set so it
// reads as the same app; under-par scores get a restrained teal accent (t.accentCool).
//
// Best-effort consumer: LiveScreen only mounts this when a live `board` exists; a null leaderboard
// falls through to the existing ESPN thin tournament line (so this component assumes a real board).

// Under-par reads positive — "-4", "-20" start with a minus. Even ("E"/"0") and over ("+3") are neutral.
const isUnderPar = (s: string): boolean => typeof s === 'string' && s.trim().startsWith('-');

// Format the tournament end date for the "Final · {Mon D}" label. UTC getters (the schedule's end is
// midnight-UTC) so the date doesn't shift a day in US timezones with local formatting.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtFinalDate = (ms: number): string => { const d = new Date(ms); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };

export default function GolfLeaderboard({ board }: { board: Leaderboard }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Live → today's "Round N · {status}". Final (most-recent-ended fallback) → an honest "Final · {Mon D}"
  // from the schedule endDate, so a finished board reads as intentional, not stale.
  const roundLine = board.isLive
    ? (board.currentRound ? `Round ${board.currentRound}${board.status ? ` · ${board.status}` : ''}` : board.status)
    : `Final${board.endDate ? ` · ${fmtFinalDate(board.endDate)}` : ''}`;

  return (
    <View style={styles.card}>
      {/* Header — tournament identity + live status */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{`🏆 ${board.name || 'Leaderboard'}`}</Text>
        {!!roundLine && <Text style={styles.subtitle}>{roundLine}</Text>}
      </View>

      {/* Column labels */}
      <View style={[styles.row, styles.colHeaderRow]}>
        <Text style={[styles.colHeader, styles.posCol]}>POS</Text>
        <Text style={[styles.colHeader, styles.nameCol]}>PLAYER</Text>
        <Text style={[styles.colHeader, styles.numCol]}>TOTAL</Text>
        <Text style={[styles.colHeader, styles.numCol]}>TODAY</Text>
        <Text style={[styles.colHeader, styles.thruCol]}>THRU</Text>
      </View>

      {/* Rows — pre-sorted leader-first by the provider; render with .map() (parent ScrollView) */}
      {board.rows.map((r, i) => (
        <View
          key={`${r.playerId || r.name}-${i}`}
          style={[styles.row, i < board.rows.length - 1 && styles.rowDivider]}>
          <Text style={[styles.cell, styles.posCol, styles.posText]} numberOfLines={1}>{r.position}</Text>
          <Text style={[styles.cell, styles.nameCol, styles.nameText]} numberOfLines={1}>
            {r.name}{r.isAmateur ? ' (a)' : ''}
          </Text>
          <Text style={[styles.cell, styles.numCol, styles.totalText, isUnderPar(r.total) && styles.under]} numberOfLines={1}>
            {r.total}
          </Text>
          <Text style={[styles.cell, styles.numCol, styles.todayText, isUnderPar(r.today) && styles.under]} numberOfLines={1}>
            {r.today}
          </Text>
          <Text style={[styles.cell, styles.thruCol, styles.thruText]} numberOfLines={1}>{r.thru}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Mirrors LiveScreen.tournamentCard (same surface/border/radius/margins) so it belongs to the app.
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },

  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  title: { color: t.textPrimary, fontSize: 16, fontWeight: '800' },
  subtitle: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },

  colHeaderRow: { paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, backgroundColor: t.surfaceAlt },
  colHeader: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  cell: { fontSize: 14 },
  posCol: { width: 42 },
  nameCol: { flex: 1, paddingRight: 8 },
  numCol: { width: 56, textAlign: 'right' },
  thruCol: { width: 44, textAlign: 'right' },

  posText: { color: t.textSecondary, fontWeight: '700' },
  nameText: { color: t.textPrimary, fontWeight: '600' },
  totalText: { color: t.textPrimary, fontWeight: '800' },   // headline number
  todayText: { color: t.textMuted, fontWeight: '600' },
  thruText: { color: t.textMuted, fontWeight: '600' },
  under: { color: t.accentCool },                            // restrained teal for under-par
});
