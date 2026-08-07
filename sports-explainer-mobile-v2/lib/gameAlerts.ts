// Game alerts — star an upcoming game, get a notification when it kicks off.
//
// Entirely ON-DEVICE. A local notification scheduled for the game's start time needs no push server,
// no token registry and no backend job, which is why this ships as a client feature rather than a
// piece of infrastructure. lib/notifications.ts already owns the permission flow and the presentation
// handler for the daily quiz reminder; this reuses both and adds a per-game schedule on top.
//
// The starred set is persisted separately from `favorite_teams`. They look similar but answer
// different questions: a favorite is a standing preference about a TEAM that sorts every board, a
// star is a one-shot intent about a single FIXTURE that expires when the game starts. Merging them
// would mean either starring a team forever or losing the sort.
//
// iOS caps pending local notifications at 64 per app; the quiz reminder holds one, so alerts are
// capped below that with room to spare. Past entries are pruned on load, which is also what keeps
// the cap from creeping — a star is spent once the game begins.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { UpcomingGame } from './upcomingGames';

const STORAGE_KEY = 'starred_games';
export const MAX_ALERTS = 32;

// A starred game, stored flat so a reschedule needs no network call.
export interface StarredGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: number;
}

const notifId = (gameId: string) => `game-alert-${gameId}`;

// expo-notifications is unavailable in Expo Go and a no-op on simulators. Every entry point checks
// this so the UI can be exercised in Expo Go without throwing — the star still persists, only the
// notification is skipped.
function notificationsUsable(): boolean {
  return Constants.appOwnership !== 'expo' && Device.isDevice;
}

export async function loadStarred(now: number = Date.now()): Promise<StarredGame[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StarredGame[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Prune anything already started — a start-time alert has no meaning afterwards.
    const live = parsed.filter(g => typeof g.startTime === 'number' && g.startTime > now);
    if (live.length !== parsed.length) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(live));
    return live.sort((a, b) => a.startTime - b.startTime);
  } catch {
    return [];
  }
}

async function persist(list: StarredGame[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* a failed write costs the alert, not the session */ }
}

/**
 * Star a game and schedule its kickoff notification.
 * Returns why it failed so the UI can say something specific instead of failing silently.
 */
export async function starGame(
  game: UpcomingGame,
): Promise<{ ok: true } | { ok: false; reason: 'permission' | 'full' | 'past' | 'unsupported' }> {
  const now = Date.now();
  if (game.startTime <= now) return { ok: false, reason: 'past' };

  const current = await loadStarred(now);
  if (current.some(g => g.id === game.id)) return { ok: true }; // already starred — idempotent
  if (current.length >= MAX_ALERTS) return { ok: false, reason: 'full' };

  const entry: StarredGame = {
    id: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    startTime: game.startTime,
  };

  if (!notificationsUsable()) {
    // Persist anyway: the star is a user intent, and it will schedule on a real device later.
    await persist([...current, entry]);
    return { ok: false, reason: 'unsupported' };
  }

  const Notifications = await import('expo-notifications');
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return { ok: false, reason: 'permission' };

  await Notifications.scheduleNotificationAsync({
    identifier: notifId(game.id),
    content: {
      title: `${game.awayTeam} at ${game.homeTeam} is starting 🏟️`,
      body: "Kickoff now — open SportsWise and we'll explain it as it happens.",
      data: { type: 'game-alert', gameId: game.id, sport: game.sport },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(game.startTime),
    },
  });

  await persist([...current, entry]);
  return { ok: true };
}

/** Unstar a game and cancel its pending notification. */
export async function unstarGame(gameId: string): Promise<void> {
  const current = await loadStarred();
  await persist(current.filter(g => g.id !== gameId));
  if (!notificationsUsable()) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notifId(gameId));
  } catch { /* nothing pending is a fine outcome */ }
}

/**
 * Re-sync scheduled notifications with the stored stars. Call on app foreground.
 *
 * Two things drift while the app is closed: games start (their alerts are spent and their stars are
 * pruned by loadStarred), and iOS can drop pending notifications across a reinstall or restore.
 * Re-scheduling by stable identifier is idempotent — an existing entry is replaced, not duplicated.
 *
 * What this deliberately does NOT do is re-check start times against the provider. A postponed game
 * would notify at its original time; catching that needs a schedule refetch, which is a bigger
 * feature than the alert itself and not worth doing on every foreground.
 */
export async function resyncGameAlerts(): Promise<void> {
  if (!notificationsUsable()) return;
  const starred = await loadStarred();
  if (starred.length === 0) return;
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    for (const g of starred) {
      await Notifications.scheduleNotificationAsync({
        identifier: notifId(g.id),
        content: {
          title: `${g.awayTeam} at ${g.homeTeam} is starting 🏟️`,
          body: "Kickoff now — open SportsWise and we'll explain it as it happens.",
          data: { type: 'game-alert', gameId: g.id, sport: g.sport },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(g.startTime),
        },
      });
    }
  } catch { /* best-effort */ }
}
