import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import type { Sport } from '../lib/api';
import { findUpcomingGames, groupByDay, UpcomingGame, UPCOMING_HORIZON_DAYS } from '../lib/upcomingGames';
import { loadStarred, starGame, unstarGame, MAX_ALERTS } from '../lib/gameAlerts';

// Next Game Finder — the replacement for the "no games today" dead end.
//
// Presented as a modal over the Live screen rather than a route, because it is an ANSWER to a
// question the user just asked, not a place to be. Star a game, get a notification at kickoff, come
// back. Nothing here changes what sport the user is browsing.
//
// One deliberate omission: there is no "notify me 10 minutes before" option. Every added choice is a
// decision the user has to make before getting the thing they wanted, and kickoff is the moment that
// matters for an app whose whole job is explaining a game as it happens.
export default function NextGameFinder({
  visible, sport, onClose,
}: { visible: boolean; sport: Sport; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [found, starred] = await Promise.all([findUpcomingGames(sport), loadStarred()]);
      if (cancelled) return;
      setGames(found);
      setStarredIds(new Set(starred.map(s => s.id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible, sport]);

  const toggle = useCallback(async (g: UpcomingGame) => {
    if (busyId) return;
    setBusyId(g.id);
    await Haptics.selectionAsync();
    try {
      if (starredIds.has(g.id)) {
        await unstarGame(g.id);
        setStarredIds(prev => { const n = new Set(prev); n.delete(g.id); return n; });
        return;
      }
      const res = await starGame(g);
      if (res.ok) {
        setStarredIds(prev => new Set(prev).add(g.id));
        return;
      }
      // Each failure gets its own sentence — "couldn't set alert" tells the user nothing they can act on.
      if (res.reason === 'permission') {
        Alert.alert(
          'Notifications are off',
          'SportsWise needs notification permission to tell you when a game starts. You can turn it on in Settings → Notifications → SportsWise.',
        );
      } else if (res.reason === 'full') {
        Alert.alert(
          "That's a lot of games",
          `You can follow up to ${MAX_ALERTS} upcoming games at once. Un-star one you've changed your mind about and try again.`,
        );
      } else if (res.reason === 'unsupported') {
        // Starred, but this build/device can't schedule. Say so rather than implying an alert is set.
        setStarredIds(prev => new Set(prev).add(g.id));
        Alert.alert(
          'Saved, but no alert here',
          "This game is saved. Alerts only fire on a real device with the installed app — you won't get a notification in Expo Go or on a simulator.",
        );
      }
    } finally {
      setBusyId(null);
    }
  }, [busyId, starredIds]);

  const grouped = useMemo(() => groupByDay(games), [games]);
  const sportLabel = sport.toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Next games</Text>
            {/* Deliberately not "in the next N days": the off-season fallback can return a fixture
                further out than the horizon, and a count that contradicts the list reads as a bug. */}
            <Text style={styles.sub}>
              {loading
                ? 'Looking…'
                : `${games.length} ${games.length === 1 ? 'game' : 'games'} coming up`}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : games.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptyBody}>
              We couldn't find a scheduled {sportLabel} fixture. That usually means next season's
              schedule hasn't been published yet — check back once it's out.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            <Text style={styles.hint}>
              Star a game and we'll send you a notification the moment it starts.
            </Text>
            {grouped.map(section => (
              <View key={section.day} style={styles.section}>
                <Text style={styles.dayLabel}>{section.label}</Text>
                {section.games.map(g => {
                  const on = starredIds.has(g.id);
                  const time = new Date(g.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.row, on && styles.rowOn]}
                      onPress={() => toggle(g)}
                      activeOpacity={0.8}
                      disabled={busyId === g.id}>
                      <View style={styles.rowMain}>
                        <Text style={styles.matchup} numberOfLines={1}>
                          {g.awayTeam} <Text style={styles.at}>at</Text> {g.homeTeam}
                        </Text>
                        <Text style={styles.meta}>
                          {time}{g.leagueLabel ? ` · ${g.leagueLabel}` : ''}
                        </Text>
                      </View>
                      {busyId === g.id
                        ? <ActivityIndicator color={theme.textSecondary} />
                        : <Text style={[styles.star, on && styles.starOn]}>{on ? '★' : '☆'}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  title: { color: t.textPrimary, fontSize: 20, fontWeight: '900' },
  sub: { color: t.textSecondaryOnDark, fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  closeBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  closeTxt: { color: t.accent, fontSize: 15, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { color: t.textPrimary, fontSize: 17, fontWeight: '800' },
  emptyBody: { color: t.textSecondaryOnDark, fontSize: 13.5, lineHeight: 20, textAlign: 'center' },

  list: { padding: 16, paddingBottom: 32, gap: 8 },
  hint: { color: t.textSecondaryOnDark, fontSize: 12.5, lineHeight: 18, marginBottom: 4 },
  section: { gap: 6, marginBottom: 10 },
  dayLabel: {
    color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '900',
    letterSpacing: 1, textTransform: 'uppercase', marginTop: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  rowOn: { borderColor: t.accent },
  rowMain: { flex: 1, gap: 2 },
  matchup: { color: t.textPrimary, fontSize: 15, fontWeight: '800' },
  at: { color: t.textSecondaryOnDark, fontWeight: '600' },
  meta: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600' },
  star: { fontSize: 22, color: t.textSecondary },
  starOn: { color: t.accent },
});
