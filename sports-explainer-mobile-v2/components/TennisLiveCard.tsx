import { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { TennisLiveMatch, TennisLiveOverlay } from '../lib/api';

// Live tennis surface — the app's single-match detail card (mirrors GolfLeaderboard's role for
// liveFormat sports). The MATCH (names, flags, seeds, set grid, round/court) comes from ESPN; the
// LIVE overlay (server, current-game points, timeline) is the RapidAPI enrichment in ESPN orientation.
// The optional `read` is the Gate-3 LLM situational explanation. No invented shot detail.
//
// Aesthetic mirrors GameCard/GolfLeaderboard: theme tokens (no hardcoded hex, no custom font family),
// surface card + hairline dividers, accent for the live/serve cue, accentCool for momentum.

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
  match: TennisLiveMatch;        // ESPN shape (names, flags, seeds, sets, round/court)
  live?: TennisLiveOverlay | null; // RapidAPI overlay (server/currentGame/timeline), ESPN orientation
  read?: Read | null;
  labels: Labels;
}

export default function TennisLiveCard({ match, live, read, labels }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { home, away, sets } = match;
  const lastIdx = sets.length - 1;

  // Live overlay (only present when the ?match= enrichment resolved). Absent → plain ESPN card.
  const server = live?.server ?? null;
  const currentGame = live?.currentGame ?? null;
  const timeline = live?.timeline ?? null;

  // Server-first point values + the conservative tag (only when a server is known).
  const sPts = currentGame ? (server === 'home' ? currentGame.home : currentGame.away) : '';
  const rPts = currentGame ? (server === 'home' ? currentGame.away : currentGame.home) : '';
  const tag = server && currentGame ? pointLabel(sPts, rPts) : null;
  const tagText = tag === 'break' ? labels.breakPoint : tag === 'game' ? labels.gamePoint : null;

  // Momentum line: total breaks per player (timeline rows credit the game WINNER; 'break' = broke serve).
  const breaks = (name: string) => (timeline || []).filter(t => t.player === name && t.result === 'break').length;
  const bHome = breaks(home);
  const bAway = breaks(away);

  // One player row: serve dot + flag + seed + name, then that player's set scores across columns.
  const renderRow = (side: 'home' | 'away') => {
    const name = side === 'home' ? home : away;
    const flag = side === 'home' ? match.homeFlag : match.awayFlag;
    const seed = side === 'home' ? match.homeSeed : match.awaySeed;
    return (
      <View style={styles.playerRow}>
        <View style={styles.nameCell}>
          {server === side ? <View style={styles.serveDot} /> : <View style={styles.serveDotSpacer} />}
          {flag ? <Image source={{ uri: flag }} style={styles.flag} resizeMode="contain" /> : <View style={styles.flagSpacer} />}
          {seed != null && <Text style={styles.seed}>({seed})</Text>}
          <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
        </View>
        {sets.map((s, i) => {
          const games = side === 'home' ? s.home : s.away;
          return (
            <Text key={i} style={[styles.setCell, i === lastIdx ? styles.setCellCurrent : styles.setCellDone]}>
              {games}
            </Text>
          );
        })}
      </View>
    );
  };

  const caption = [match.round, match.court].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      {/* Header — LIVE cue + status detail, category on the right, round·court caption below */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            {!!match.statusDetail && <Text style={styles.statusDetail}>· {match.statusDetail}</Text>}
          </View>
          {!!match.category && <Text style={styles.league} numberOfLines={1}>{match.category}</Text>}
        </View>
        {!!caption && <Text style={styles.caption} numberOfLines={1}>{caption}</Text>}
      </View>

      {/* Set grid — two player rows, last (in-progress) set column highlighted */}
      <View style={styles.grid}>
        {renderRow('home')}
        <View style={styles.rowDivider} />
        {renderRow('away')}
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

  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.live },
  liveText: { color: t.live, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statusDetail: { color: t.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginLeft: 2 },
  league: { color: t.textMuted, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  caption: { color: t.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 },

  grid: { paddingHorizontal: 16, paddingBottom: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  nameCell: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 7, marginRight: 8 },
  serveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent },         // orange serve cue
  serveDotSpacer: { width: 7, height: 7 },                                                // keep names aligned
  flag: { width: 22, height: 16, borderRadius: 2 },
  flagSpacer: { width: 22, height: 16 },                                                  // reserve space when absent
  seed: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
  playerName: { color: t.textPrimary, fontSize: 17, fontWeight: '700', flexShrink: 1 },

  // Set columns — fixed-width, right-aligned numbers (scoreboard feel).
  setCell: { width: 26, textAlign: 'center', fontSize: 16, fontVariant: ['tabular-nums'] },
  setCellDone: { color: t.textSecondary, fontWeight: '700' },
  setCellCurrent: { color: t.textPrimary, fontWeight: '900' },                            // in-progress set stands out

  gameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, backgroundColor: t.surfaceAlt },
  servingLabel: { color: t.textSecondary, fontSize: 12, fontWeight: '600', flex: 1, marginRight: 8 },
  gameRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  points: { color: t.textPrimary, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tag: { backgroundColor: t.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  momentum: { color: t.accentCool, fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },

  // Situational read — mirrors PlayCard/GolfLeaderboard's accent-stripe def box.
  readBox: { marginHorizontal: 16, marginTop: 10, marginBottom: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  readSimple: { color: t.textPrimary, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  readWhy: { color: t.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 8 },
});
