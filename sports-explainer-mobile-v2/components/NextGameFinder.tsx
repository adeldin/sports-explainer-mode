import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import type { Sport } from '../lib/api';
import { SPORTS } from '../lib/sports';
import FilterBar from './FilterSheet';
import { SOCCER_LEAGUES, RUGBY_LEAGUES } from '../lib/scoreboard';
import { CFB_CONFERENCE_OPTIONS, CBB_CONFERENCE_OPTIONS } from '../lib/collegeConferences';
import { findUpcomingGames, groupByDay, UpcomingGame, UPCOMING_HORIZON_DAYS } from '../lib/upcomingGames';
import { loadStarred, starGame, unstarGame, MAX_ALERTS } from '../lib/gameAlerts';
import {
  loadFollowedTeams, followTeam, unfollowTeam, isFollowed,
  FollowedTeam, MAX_TEAMS, FIXTURES_PER_TEAM,
} from '../lib/teamAlerts';

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
  const [followed, setFollowed] = useState<FollowedTeam[]>([]);
  const [showTeams, setShowTeams] = useState(false);
  const [facetKey, setFacetKey] = useState<string>('all');  // league / conference narrowing
  const [teamKey, setTeamKey] = useState<string | null>(null); // one team, chosen by search

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [found, starred, teams] = await Promise.all([
        findUpcomingGames(sport), loadStarred(), loadFollowedTeams(),
      ]);
      if (cancelled) return;
      setGames(found);
      setStarredIds(new Set(starred.map(s => s.id)));
      setFollowed(teams);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible, sport]);

  // The distinct teams appearing in this list — derived, so following costs no extra fetch. Only
  // teams whose ESPN id came through are offered: an abbreviation alone can't key an alert safely.
  const teamsInList = useMemo(() => {
    const seen = new Map<string, FollowedTeam>();
    for (const g of games) {
      for (const [id, name, abbr] of [
        [g.homeId, g.homeName ?? g.homeTeam, g.homeTeam],
        [g.awayId, g.awayName ?? g.awayTeam, g.awayTeam],
      ] as [string | undefined, string, string][]) {
        if (!id) continue;
        const key = `${g.sport}:${id}`;
        if (!seen.has(key)) seen.set(key, { teamId: id, sport: g.sport, name, abbr });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

  const toggleTeam = useCallback(async (team: FollowedTeam) => {
    const key = `team:${team.sport}:${team.teamId}`;
    if (busyId) return;
    setBusyId(key);
    await Haptics.selectionAsync();
    try {
      if (isFollowed(followed, team.sport, team.teamId)) {
        await unfollowTeam(team.sport, team.teamId);
        setFollowed(prev => prev.filter(t => !(t.sport === team.sport && t.teamId === team.teamId)));
        return;
      }
      const res = await followTeam(team);
      if (res.ok) {
        setFollowed(prev => [...prev, team]);
        return;
      }
      if (res.reason === 'full') {
        Alert.alert('Following a lot of teams',
          `You can follow up to ${MAX_TEAMS} teams. Unfollow one to make room.`);
      } else if (res.reason === 'permission') {
        Alert.alert('Notifications are off',
          'SportsWise needs notification permission to tell you when your team plays. Turn it on in Settings → Notifications → SportsWise.');
      } else if (res.reason === 'unsupported') {
        setFollowed(prev => [...prev, team]);
        Alert.alert('Saved, but no alert here',
          "This team is saved. Alerts only fire on a real device with the installed app — not in Expo Go or a simulator.");
      }
    } finally {
      setBusyId(null);
    }
  }, [busyId, followed]);

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

  // NARROWING — the finder listed every fixture the horizon could reach, which is 48 games for
  // rugby and several hundred for college football. A flat chronological wall answers "what's next"
  // but not "when does Notre Dame play", which is the question people actually arrive with.
  //
  // Same control as the live board, same reasoning (see components/FilterSheet.tsx): one bar, and a
  // sheet with search. The axis differs by sport — college narrows by CONFERENCE, merged tiles by
  // LEAGUE, and single-league sports get no bar at all since there'd be one option.
  const facet = useMemo(() => {
    if (sport === 'cfb' || sport === 'cbb') {
      const opts = sport === 'cfb' ? CFB_CONFERENCE_OPTIONS : CBB_CONFERENCE_OPTIONS;
      return { title: 'Conference', options: opts,
               keysOf: (g: UpcomingGame) => [g.homeConferenceId, g.awayConferenceId].filter((x): x is string => !!x) };
    }
    if (sport === 'soccer' || sport === 'nationscup') {
      const opts = (sport === 'soccer' ? SOCCER_LEAGUES : RUGBY_LEAGUES).map(l => ({ sportKey: l.sportKey as string, label: l.label }));
      return { title: 'League', options: opts, keysOf: (g: UpcomingGame) => [g.sport as string] };
    }
    return null;
  }, [sport]);

  // Offer only what's actually in the results, with counts — an option that filters to nothing is a
  // dead end, and the count tells you whether the tap is worth making.
  const facetOptions = useMemo(() => {
    if (!facet) return [];
    const count = new Map<string, number>();
    for (const g of games) for (const k of facet.keysOf(g)) count.set(k, (count.get(k) ?? 0) + 1);
    return facet.options
      .filter(o => count.has(o.sportKey))
      .map(o => ({ key: o.sportKey, label: o.label, count: count.get(o.sportKey) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [facet, games]);

  // Every team with a fixture ahead of it. Full names are the searchable label because that's what
  // people type — "notre" must reach the Fighting Irish without anyone guessing an abbreviation.
  const searchTeams = useMemo(() => {
    const seen = new Map<string, { key: string; label: string; logo?: string; sublabel?: string }>();
    for (const g of games) {
      for (const side of [
        { name: g.homeName || g.homeTeam, logo: g.homeLogo },
        { name: g.awayName || g.awayTeam, logo: g.awayLogo },
      ]) {
        if (!side.name || seen.has(side.name)) continue;
        seen.set(side.name, { key: side.name, label: side.name, logo: side.logo, sublabel: g.leagueLabel });
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [games]);

  const visibleGames = useMemo(() => {
    let out = games;
    if (teamKey) out = out.filter(g => (g.homeName || g.homeTeam) === teamKey || (g.awayName || g.awayTeam) === teamKey);
    else if (facet && facetKey !== 'all') out = out.filter(g => facet.keysOf(g).includes(facetKey));
    return out;
  }, [games, facet, facetKey, teamKey]);

  const grouped = useMemo(() => groupByDay(visibleGames), [visibleGames]);
  // The TILE's display label, never the internal key: 'nationscup' is the Rugby tile, and the old
  // sport.toUpperCase() printed "NATIONSCUP" into fan-facing copy.
  const sportLabel = SPORTS.find(t => t.key === sport)?.label ?? sport.toUpperCase();

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
                : `${visibleGames.length} ${visibleGames.length === 1 ? 'game' : 'games'} coming up`}
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
            {(facetOptions.length > 1 || searchTeams.length > 0) && (
              <FilterBar
                title={facet?.title ?? 'Team'}
                allLabel="All"
                valueLabel={teamKey ?? undefined}
                value={teamKey ? '__team' : facetKey}
                options={facetOptions}
                onChange={(k) => { setTeamKey(null); setFacetKey(k); }}
                teams={searchTeams}
                teamsTitle="Jump to a team"
                onSelectTeam={(name) => { setFacetKey('all'); setTeamKey(name); }}
                searchPlaceholder="Search teams, leagues, conferences"
                marginBottom={12}
              />
            )}
            {visibleGames.length === 0 ? (
              <Text style={styles.hint}>
                No upcoming games match that filter. Tap the bar above and choose All to see
                everything again.
              </Text>
            ) : (
              <Text style={styles.hint}>
                Star a game and we'll send you a notification the moment it starts.
              </Text>
            )}

            {/* Follow a TEAM — a standing rule rather than a one-off. Collapsed by default so the
                answer to "when's the next game" stays the first thing on screen. */}
            {teamsInList.length > 0 && (
              <View style={styles.teamsBlock}>
                <TouchableOpacity
                  style={styles.teamsHeader}
                  onPress={() => { Haptics.selectionAsync(); setShowTeams(v => !v); }}
                  activeOpacity={0.8}>
                  <Text style={styles.teamsTitle}>
                    Follow a team{followed.length ? ` · ${followed.length} followed` : ''}
                  </Text>
                  <Text style={styles.teamsChevron}>{showTeams ? '▾' : '▸'}</Text>
                </TouchableOpacity>
                {showTeams && (
                  <>
                    <Text style={styles.teamsBlurb}>
                      We'll alert you for their next {FIXTURES_PER_TEAM} games, and keep it topped up
                      as new fixtures are scheduled.
                    </Text>
                    {teamsInList.map(t => {
                      const on = isFollowed(followed, t.sport, t.teamId);
                      const key = `team:${t.sport}:${t.teamId}`;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.row, on && styles.rowOn]}
                          onPress={() => toggleTeam(t)}
                          activeOpacity={0.8}
                          disabled={busyId === key}>
                          <Text style={styles.teamName} numberOfLines={1}>{t.name}</Text>
                          {busyId === key
                            ? <ActivityIndicator color={theme.textSecondary} />
                            : <Text style={[styles.star, on && styles.starOn]}>{on ? '🔔' : '🔕'}</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </View>
            )}
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
                        {/* Crest → name, both sides. Logos come from the feed where it carries them;
                            a missing one just collapses (core-rugby rows are text-only). */}
                        <View style={styles.matchupRow}>
                          {!!g.awayLogo && <Image source={{ uri: g.awayLogo }} style={styles.teamLogo} />}
                          <Text style={styles.matchup}>{g.awayTeam}</Text>
                          <Text style={styles.at}>at</Text>
                          {!!g.homeLogo && <Image source={{ uri: g.homeLogo }} style={styles.teamLogo} />}
                          <Text style={styles.matchup}>{g.homeTeam}</Text>
                        </View>
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
  matchupRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  teamLogo: { width: 20, height: 20, resizeMode: 'contain' },
  matchup: { color: t.textPrimary, fontSize: 15, fontWeight: '800' },
  at: { color: t.textSecondaryOnDark, fontWeight: '600' },
  meta: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600' },
  star: { fontSize: 22, color: t.textSecondary },
  starOn: { color: t.accent },

  // Follow-a-team block.
  teamsBlock: { gap: 6, marginBottom: 6 },
  teamsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.explanationBg, borderRadius: 10, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  teamsTitle: { color: t.textPrimary, fontSize: 14, fontWeight: '800' },
  teamsChevron: { color: t.textSecondaryOnDark, fontSize: 14, fontWeight: '800' },
  teamsBlurb: { color: t.textSecondaryOnDark, fontSize: 12, lineHeight: 17, marginBottom: 2 },
  teamName: { flex: 1, color: t.textPrimary, fontSize: 14.5, fontWeight: '700' },
});
