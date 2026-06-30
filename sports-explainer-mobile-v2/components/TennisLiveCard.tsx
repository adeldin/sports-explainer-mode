import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { TennisLiveMatch, TennisTimelineEntry } from '../lib/api';

// Live tennis surface — the app's first single-match live card (mirrors GolfLeaderboard's role for
// liveFormat sports). It renders a DETERMINISTIC situation from parsed provider data: server, set
// grid, current-game points, and a conservative Break/Game-point tag. The optional `read` is the
// Gate-3 LLM situational explanation (simple + whyItMatters). No invented shot detail.
//
// Aesthetic mirrors GameCard/GolfLeaderboard exactly: theme tokens (no hardcoded hex, no custom font
// family), surface card + hairline dividers, accent for the live/serve cue, accentCool for momentum.

const POINT_RANK: Record<string, number> = { '0': 0, '15': 1, '30': 2, '40': 3, AD: 4 };
const rank = (p: string): number => (p in POINT_RANK ? POINT_RANK[p] : -1);

// Conservative break/game-point tag — SAME logic as the backend (route.ts tennisPointLabel). Points
// passed in SERVER-first order. Deuce / 40-40 / ambiguous → null (no tag).
function pointLabel(sPts: string, rPts: string): 'break' | 'game' | null {
  if (rPts === 'AD') return 'break';
  if (rPts === '40' && rank(sPts) < 3) return 'break';
  if (sPts === 'AD') return 'game';
  if (sPts === '40' && rank(rPts) < 3) return 'game';
  return null;
}

interface Labels { serving: string; breakPoint: string; gamePoint: string; }
interface Read { simple: string; whyItMatters: string; }

interface Props {
  match: TennisLiveMatch;
  timeline?: TennisTimelineEntry[] | null;
  read?: Read | null;
  labels: Labels;
}

export default function TennisLiveCard({ match, timeline, read, labels }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { home, away, sets, currentGame, server } = match;
  const lastIdx = sets.length - 1;

  // Server-first point values + the conservative tag (only when a server is known).
  const sPts = currentGame ? (server === 'home' ? currentGame.home : currentGame.away) : '';
  const rPts = currentGame ? (server === 'home' ? currentGame.away : currentGame.home) : '';
  const tag = server && currentGame ? pointLabel(sPts, rPts) : null;
  const tagText = tag === 'break' ? labels.breakPoint : tag === 'game' ? labels.gamePoint : null;

  // Momentum line: total breaks per player (timeline rows credit the game WINNER; 'break' = broke serve).
  const breaks = (name: string) => (timeline || []).filter(t => t.player === name && t.result === 'break').length;
  const bHome = breaks(home);
  const bAway = breaks(away);

  // One player row: name (+ serve dot when serving) and that player's set scores across columns.
  const renderRow = (name: string, side: 'home' | 'away') => (
    <View style={styles.playerRow}>
      <View style={styles.nameCell}>
        {server === side ? <View style={styles.serveDot} /> : <View style={styles.serveDotSpacer} />}
        <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
      </View>
      {sets.map((s, i) => {
        const games = side === 'home' ? s.home : s.away;
        const isCurrent = i === lastIdx;
        return (
          <Text
            key={i}
            style={[styles.setCell, isCurrent ? styles.setCellCurrent : styles.setCellDone]}
          >
            {games}
          </Text>
        );
      })}
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Header — LIVE cue + serve hint */}
      <View style={styles.header}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        {!!match.league && <Text style={styles.league} numberOfLines={1}>{match.league}</Text>}
      </View>

      {/* Set grid — two player rows, last (in-progress) set column highlighted */}
      <View style={styles.grid}>
        {renderRow(home, 'home')}
        <View style={styles.rowDivider} />
        {renderRow(away, 'away')}
      </View>

      {/* Current game — point score (server first) + conservative Break/Game-point tag */}
      {currentGame && server && (
        <View style={styles.gameRow}>
          <Text style={styles.servingLabel} numberOfLines={1}>
            {labels.serving}: {server === 'home' ? home : away}
          </Text>
          <View style={styles.gameRight}>
            <Text style={styles.points}>{sPts} – {rPts}</Text>
            {tagText && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tagText}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Momentum — breaks per player (only when there are any) */}
      {(bHome > 0 || bAway > 0) && (
        <Text style={styles.momentum} numberOfLines={2}>
          {[
            bHome > 0 ? `${home}: ${bHome} ${bHome === 1 ? 'break' : 'breaks'}` : null,
            bAway > 0 ? `${away}: ${bAway} ${bAway === 1 ? 'break' : 'breaks'}` : null,
          ].filter(Boolean).join('   ·   ')}
        </Text>
      )}

      {/* Gate-3 situational read (optional) — the LLM "what it means" layer */}
      {read && (!!read.simple || !!read.whyItMatters) && (
        <View style={styles.readBox}>
          {!!read.simple && <Text style={styles.readSimple}>{read.simple}</Text>}
          {!!read.whyItMatters && <Text style={styles.readWhy}>{read.whyItMatters}</Text>}
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Mirrors GolfLeaderboard.card / LiveScreen.tournamentCard so it belongs to the app.
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.live },
  liveText: { color: t.live, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  league: { color: t.textMuted, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },

  grid: { paddingHorizontal: 16, paddingBottom: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  nameCell: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, marginRight: 8 },
  serveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent },         // orange serve cue
  serveDotSpacer: { width: 7, height: 7 },                                                // keep names aligned
  playerName: { color: t.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },

  // Set columns — fixed-width, right-aligned numbers (scoreboard feel).
  setCell: { width: 26, textAlign: 'center', fontSize: 16, fontVariant: ['tabular-nums'] },
  setCellDone: { color: t.textSecondary, fontWeight: '700' },
  setCellCurrent: { color: t.textPrimary, fontWeight: '900' },                            // in-progress set stands out

  gameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, backgroundColor: t.surfaceAlt },
  servingLabel: { color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1, marginRight: 8 },
  gameRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  points: { color: t.textPrimary, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tag: { backgroundColor: t.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  momentum: { color: t.accentCool, fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },

  // Situational read — mirrors PlayCard/GolfLeaderboard's accent-stripe def box.
  readBox: { marginHorizontal: 16, marginTop: 10, marginBottom: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  readSimple: { color: t.textPrimary, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  readWhy: { color: t.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 },
});
