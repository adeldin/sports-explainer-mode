import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { Leaderboard } from '../lib/api';
import { GolfConcept, conceptForField, levelText } from '../lib/golfTeaching';

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

const COLLAPSED_COUNT = 15;

export default function GolfLeaderboard({ board }: { board: Leaderboard }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Weather-app north star: glanceable by default (top 15), deep on demand. Still .map() — no nested
  // scroll (this lives inside LiveScreen's parent ScrollView).
  const [expanded, setExpanded] = useState(false);
  const canToggle = board.rows.length > COLLAPSED_COUNT;
  const visibleRows = expanded ? board.rows : board.rows.slice(0, COLLAPSED_COUNT);

  // Teaching layer (Build 3): tap a column header or the leader's cell → reveal that concept at the
  // user's difficulty level, reusing the app's inline glossaryDefBox pattern (no modal). A missed
  // lookup is a safe no-op. Tapping the same concept toggles it closed; another swaps it (PlayCard UX).
  const { level } = useAppState();
  const [openConcept, setOpenConcept] = useState<GolfConcept | null>(null);
  const openField = (field: string) => {
    const c = conceptForField(field);
    if (!c) return;
    setOpenConcept(prev => (prev && prev.id === c.id ? null : c));
  };
  // Spread onto a leader-row <Text> only when tappable, so non-leader cells stay plain text.
  const tapProps = (field: string, enabled: boolean) =>
    enabled ? { onPress: () => openField(field), suppressHighlighting: true, accessibilityRole: 'button' as const } : {};

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
        {/* Quiet cue that the columns teach — recessive, always shown, no dismiss. */}
        <Text style={styles.hint}>Tap a column to learn what it means</Text>
      </View>

      {/* Tapped-concept reveal — reuses the app's inline glossaryDefBox pattern (PlayCard/RecapCard). */}
      {openConcept && (
        <View style={styles.defBox}>
          <View style={styles.defHeader}>
            <Text style={styles.defTerm}>{openConcept.term}</Text>
            <Pressable onPress={() => setOpenConcept(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.defClose}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.defText}>{levelText(openConcept, level)}</Text>
        </View>
      )}

      {/* Column labels — POS/TOTAL/TODAY/THRU read like links (amber + underline) → teach the concept;
          PLAYER stays plain/non-tappable. The amber headers + the hint line are the whole signal. */}
      <View style={[styles.row, styles.colHeaderRow]}>
        <Text style={[styles.colHeader, styles.posCol, styles.tappableHeader]} onPress={() => openField('position')} suppressHighlighting accessibilityRole="button">POS</Text>
        <Text style={[styles.colHeader, styles.nameCol]}>PLAYER</Text>
        <Text style={[styles.colHeader, styles.numCol, styles.tappableHeader]} onPress={() => openField('total')} suppressHighlighting accessibilityRole="button">TOTAL</Text>
        <Text style={[styles.colHeader, styles.numCol, styles.tappableHeader]} onPress={() => openField('today')} suppressHighlighting accessibilityRole="button">TODAY</Text>
        <Text style={[styles.colHeader, styles.thruCol, styles.tappableHeader]} onPress={() => openField('thru')} suppressHighlighting accessibilityRole="button">THRU</Text>
      </View>

      {/* Rows — pre-sorted leader-first by the provider; render with .map() (parent ScrollView).
          Truncated to the top COLLAPSED_COUNT unless expanded (Weather-app glanceable default). */}
      {visibleRows.map((r, i) => {
        const isLeader = i === 0; // leader-first (provider pre-sorted): only the leader row teaches in v1
        return (
          <View
            key={`${r.playerId || r.name}-${i}`}
            style={[styles.row, i < visibleRows.length - 1 && styles.rowDivider]}>
            <Text style={[styles.cell, styles.posCol, styles.posText, isLeader && styles.tappable]} numberOfLines={1} {...tapProps('position', isLeader)}>{r.position}</Text>
            <Text style={[styles.cell, styles.nameCol, styles.nameText]} numberOfLines={1}>
              {r.name}{r.isAmateur ? ' (a)' : ''}
            </Text>
            <Text style={[styles.cell, styles.numCol, styles.totalText, isUnderPar(r.total) && styles.under, isLeader && styles.tappable]} numberOfLines={1} {...tapProps('total', isLeader)}>
              {r.total}
            </Text>
            <Text style={[styles.cell, styles.numCol, styles.todayText, isUnderPar(r.today) && styles.under, isLeader && styles.tappable]} numberOfLines={1} {...tapProps('today', isLeader)}>
              {r.today}
            </Text>
            <Text style={[styles.cell, styles.thruCol, styles.thruText, isLeader && styles.tappable]} numberOfLines={1} {...tapProps('thru', isLeader)}>{r.thru}</Text>
          </View>
        );
      })}

      {/* Footer toggle — only when there are more rows than the collapsed count. Glanceable→deep. */}
      {canToggle && (
        <Pressable
          onPress={() => setExpanded(e => !e)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Show less' : `Show full leaderboard, ${board.rows.length} players`}
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
          <Text style={styles.toggleText}>
            {expanded ? 'Show less ↑' : `Show full leaderboard (${board.rows.length}) ↓`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Mirrors LiveScreen.tournamentCard (same surface/border/radius/margins) so it belongs to the app.
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },

  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  title: { color: t.textPrimary, fontSize: 16, fontWeight: '800' },
  subtitle: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  hint: { color: t.textMuted, fontSize: 12, fontWeight: '400', marginTop: 6 },

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

  // Tappable teaching affordance — a subtle underline (restrained; reads as "tap to learn", on-brand).
  // Used on the leader-row cells (the quieter secondary discovery path).
  tappable: { textDecorationLine: 'underline' },
  // Tappable COLUMN HEADERS read like links — amber + underline so they're clearly interactive
  // against the navy (the primary discovery path, paired with the hint line).
  tappableHeader: { color: t.accentText, textDecorationLine: 'underline' },

  // Concept reveal box — mirrors PlayCard's glossaryDefBox (surface bg + t.accent left stripe). The
  // card has no padding, so marginHorizontal: 16 aligns the box with the header/row content gutter.
  defBox: { marginHorizontal: 16, marginTop: 4, marginBottom: 12, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  defHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  defTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  defClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  defText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },

  // Footer expand/collapse toggle — centered full-width, hairline top border, ~44px tap target.
  toggle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  togglePressed: { backgroundColor: t.surfaceAlt },          // visible press state (reuses a token)
  toggleText: { color: t.accentText, fontSize: 13, fontWeight: '700' },
});
