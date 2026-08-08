// Team alerts — follow a TEAM and get notified for every game it plays.
//
// The sibling of lib/gameAlerts.ts, and deliberately a separate concept rather than a flag on it.
// The two answer different questions:
//
//   a starred GAME  — "tell me when THIS fixture starts."   One intent, one notification, then spent.
//   a followed TEAM — "tell me whenever they play."         A standing rule that must keep producing
//                                                            notifications as new fixtures appear.
//
// That difference is the whole design. A game star is fire-and-forget; a team follow has to be
// RE-MATERIALIZED — every app launch, we look up that team's upcoming fixtures and schedule the ones
// we haven't scheduled yet. Modelling a team as "a game star with a flag" would have no way to do
// that, because there'd be nothing to re-resolve.
//
// Note this is NOT the same thing as `favorite_teams` in appState. That list stores DISPLAY
// ABBREVIATIONS ("CAR") and exists to sort the board — it can't safely key notifications, because
// abbreviations collide across leagues (multiple "LA"s). A followed team stores the ESPN team id
// alongside its sport, which is unique. The two can coexist; this one is about alerts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { Sport } from './api';
import { SPORT_CONFIG } from './scoreboard';

const STORAGE_KEY = 'followed_teams';

// iOS allows 64 pending local notifications per app. The quiz reminder holds one and starred games
// hold up to 32, so team fixtures get a deliberately smaller slice — and each team is capped so one
// followed baseball club (47 upcoming games in a probe) can't consume the entire budget alone.
export const MAX_TEAMS = 8;
export const FIXTURES_PER_TEAM = 3;

export interface FollowedTeam {
  teamId: string;      // ESPN team id — unique within a league, unlike the abbreviation
  sport: Sport;        // which league's id space this belongs to
  name: string;        // display name, stored so the UI needs no lookup
  abbr?: string;
}

const notifId = (teamId: string, gameId: string) => `team-alert-${teamId}-${gameId}`;

function notificationsUsable(): boolean {
  return Constants.appOwnership !== 'expo' && Device.isDevice;
}

export async function loadFollowedTeams(): Promise<FollowedTeam[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persist(list: FollowedTeam[]): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* best-effort */ }
}

export function isFollowed(list: FollowedTeam[], sport: string, teamId: string): boolean {
  return list.some(t => t.sport === sport && t.teamId === teamId);
}

/**
 * Upcoming fixtures for one team.
 *
 * ESPN exposes a real per-team schedule for the major US leagues (verified: 3 upcoming for an NFL
 * side, 47 for an MLB side). Soccer's team-schedule endpoint returns nothing useful, and the
 * core-API/backend leagues have no per-team route at all — so for those we fall back to scanning
 * the league board for fixtures involving this team. That fallback sees less of the future than a
 * real schedule endpoint would, which is a coverage limit, not a bug.
 */
export async function fetchTeamFixtures(team: FollowedTeam, now: number = Date.now()): Promise<
  { gameId: string; startTime: number; homeTeam: string; awayTeam: string }[]
> {
  const cfg = SPORT_CONFIG[team.sport];
  if (!cfg?.espnSport || !cfg.league || cfg.core || cfg.provider) return fromLeagueBoard(team, now);
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/teams/${team.teamId}/schedule`,
    );
    const data = await res.json();
    const out = [];
    for (const e of data?.events || []) {
      const startTime = e?.date ? Date.parse(e.date) : NaN;
      if (!Number.isFinite(startTime) || startTime <= now) continue;
      const cs = e?.competitions?.[0]?.competitors || [];
      const nameOf = (c: any) => c?.team?.abbreviation || c?.team?.shortDisplayName || c?.team?.displayName || '?';
      const home = cs.find((c: any) => c?.homeAway === 'home') ?? cs[0];
      const away = cs.find((c: any) => c?.homeAway === 'away') ?? cs[1];
      out.push({ gameId: String(e.id), startTime, homeTeam: nameOf(home), awayTeam: nameOf(away) });
    }
    if (out.length) return out.sort((a, b) => a.startTime - b.startTime);
  } catch { /* fall through */ }
  return fromLeagueBoard(team, now);
}

// Fallback for leagues with no per-team schedule: read the league board and keep this team's games.
async function fromLeagueBoard(team: FollowedTeam, now: number) {
  const { findUpcomingGames } = await import('./upcomingGames');
  try {
    const all = await findUpcomingGames(team.sport, now);
    const mine = all.filter(g =>
      g.homeTeam === team.abbr || g.awayTeam === team.abbr ||
      g.homeTeam === team.name || g.awayTeam === team.name);
    return mine.map(g => ({ gameId: g.id, startTime: g.startTime, homeTeam: g.homeTeam, awayTeam: g.awayTeam }));
  } catch {
    return [];
  }
}

export async function followTeam(
  team: FollowedTeam,
): Promise<{ ok: true; scheduled: number } | { ok: false; reason: 'full' | 'permission' | 'unsupported' }> {
  const current = await loadFollowedTeams();
  if (isFollowed(current, team.sport, team.teamId)) return { ok: true, scheduled: 0 };
  if (current.length >= MAX_TEAMS) return { ok: false, reason: 'full' };

  const next = [...current, team];
  await persist(next);

  if (!notificationsUsable()) return { ok: false, reason: 'unsupported' };

  const Notifications = await import('expo-notifications');
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { ok: false, reason: 'permission' };

  const scheduled = await scheduleForTeam(team);
  return { ok: true, scheduled };
}

export async function unfollowTeam(sport: string, teamId: string): Promise<void> {
  const current = await loadFollowedTeams();
  await persist(current.filter(t => !(t.sport === sport && t.teamId === teamId)));
  if (!notificationsUsable()) return;
  try {
    const Notifications = await import('expo-notifications');
    // Cancel every pending alert belonging to this team. Identifiers carry the team id, so this
    // needs no record of which fixtures were scheduled — the pending list IS the record.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const prefix = `team-alert-${teamId}-`;
    await Promise.all(
      pending
        .filter(p => typeof p.identifier === 'string' && p.identifier.startsWith(prefix))
        .map(p => Notifications.cancelScheduledNotificationAsync(p.identifier)),
    );
  } catch { /* best-effort */ }
}

// Schedule this team's next few fixtures. Idempotent: identifiers are derived from team+game, so
// re-running replaces rather than duplicates.
async function scheduleForTeam(team: FollowedTeam): Promise<number> {
  const Notifications = await import('expo-notifications');
  const fixtures = (await fetchTeamFixtures(team)).slice(0, FIXTURES_PER_TEAM);
  let n = 0;
  for (const f of fixtures) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: notifId(team.teamId, f.gameId),
        content: {
          title: `${team.name} are playing 🏟️`,
          body: `${f.awayTeam} at ${f.homeTeam} is starting — open SportsWise and we'll explain it as it happens.`,
          data: { type: 'team-alert', gameId: f.gameId, sport: team.sport, teamId: team.teamId },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(f.startTime) },
      });
      n++;
    } catch { /* one bad fixture shouldn't sink the rest */ }
  }
  return n;
}

/**
 * Re-materialize every followed team's alerts. Call on app foreground.
 *
 * This is the piece a game-star doesn't need. Fixtures roll forward: the games scheduled last week
 * have been played, and new ones have appeared past the horizon we could see then. Without this, a
 * team follow would quietly stop notifying after its first few games and look broken.
 */
export async function resyncTeamAlerts(): Promise<void> {
  if (!notificationsUsable()) return;
  const teams = await loadFollowedTeams();
  if (!teams.length) return;
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    for (const t of teams) await scheduleForTeam(t);
  } catch { /* best-effort */ }
}
