// Upcoming-game lookup — "when is the next game?" across every sport, whatever serves it.
//
// WHY THIS EXISTS: "no games today" was a dead end. The user's actual question at that moment is
// never "is there a game today", it's "when is the next one" — and the app already had every answer
// scattered across four providers with no single way to ask.
//
// PROVIDER SEAM: the sports do NOT share a schedule source, and this is where that stops mattering
// to callers. Three shapes, picked per sport by SPORT_CONFIG:
//   • ESPN site API — a real date-RANGE query (?dates=YYYYMMDD-YYYYMMDD). One call covers the whole
//     horizon, so this is the cheap path: mlb, nfl, nba, nhl, wnba, MLS, EPL, La Liga, World Cup.
//   • ESPN core API (`core: true`) — rugby's two-step $ref model. fetchScoreboard already anchors a
//     −90d…+14d window around a date, so we ask it once and keep what's in the future.
//   • Our backend (`provider: 'zyla' | 'cricket'`) — returns a whole board with no date parameter at
//     all, so the same "fetch, then filter forward" treatment applies.
// Tennis and golf are excluded on purpose: they're tournament sports with no head-to-head fixture to
// start-time, so a "next game" row would be a category error.
//
// Everything is best-effort. A provider that fails contributes nothing rather than failing the
// lookup — a partial answer to "what's coming up" is still useful, an error screen never is.

import { Sport } from './api';
import { Game, SPORT_CONFIG, fetchScoreboard, SOCCER_LEAGUES, RUGBY_LEAGUES } from './scoreboard';

export interface UpcomingGame {
  id: string;
  sport: Sport;           // the game's OWN league key, so notifications/deep links route correctly
  homeTeam: string;
  awayTeam: string;
  startTime: number;      // epoch ms — the whole point of the record
  leagueLabel?: string;   // "Premier League" etc, for merged tiles where the tile name isn't enough
  // ESPN team ids + full names. Carried so a user can follow a TEAM from this list: an abbreviation
  // is not a safe key (they collide across leagues), and the id is already in the response.
  homeId?: string;
  awayId?: string;
  homeName?: string;
  awayName?: string;
  // ESPN team logo URLs, where the feed carries them (site-API sports and backend boards; the
  // core-API forward probe has none without per-team resolves, so rows degrade to text there).
  homeLogo?: string;
  awayLogo?: string;
  // College conference ids per side, so the finder can offer the same conference filter the live
  // board does. Absent for every non-college sport (and for the core-API/backend paths).
  homeConferenceId?: string;
  awayConferenceId?: string;
}

// How far ahead to look. Long enough to cross a normal off-week or an international break, short
// enough that the answer is still actionable — past this, "next game" stops being a plan.
export const UPCOMING_HORIZON_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;
const compact = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// Merged tiles fan out to their member leagues; everything else is its own single league.
function leaguesFor(sport: Sport): { sportKey: Sport; label?: string }[] {
  if (sport === 'soccer') return SOCCER_LEAGUES.map(l => ({ sportKey: l.sportKey, label: l.label }));
  if (sport === 'nationscup') return RUGBY_LEAGUES.map(l => ({ sportKey: l.sportKey, label: l.label }));
  return [{ sportKey: sport }];
}

// A scheduled game in the future, within the horizon. `post`/`in` states are excluded by the caller
// filtering on startTime — a game already under way is not an upcoming one.
function toUpcoming(g: Game, label?: string): UpcomingGame | null {
  if (!g.startTime) return null;
  return {
    id: g.id,
    sport: g.sport as Sport,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    startTime: g.startTime,
    leagueLabel: label,
    homeLogo: g.homeLogo,
    awayLogo: g.awayLogo,
  };
}

// ESPN site sports: one range call covers the horizon. This is the only path that can see PAST the
// next scheduled day in a single request, which is what makes a 45-day view affordable.
async function fromEspnRange(sportKey: Sport, label: string | undefined, now: number): Promise<UpcomingGame[]> {
  const cfg = SPORT_CONFIG[sportKey];
  if (!cfg?.espnSport || !cfg.league) return [];
  const base = `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard`;

  const parse = (data: any): UpcomingGame[] => {
    const out: UpcomingGame[] = [];
    for (const e of data?.events || []) {
      const startTime = e?.date ? Date.parse(e.date) : NaN;
      if (!Number.isFinite(startTime) || startTime <= now) continue;
      const comp = e?.competitions?.[0];
      const cs = comp?.competitors || [];
      const home = cs.find((c: any) => c?.homeAway === 'home') ?? cs[0];
      const away = cs.find((c: any) => c?.homeAway === 'away') ?? cs[1];
      const nameOf = (c: any) =>
        c?.team?.abbreviation || c?.team?.shortDisplayName || c?.team?.displayName || '?';
      out.push({
        id: String(e.id),
        sport: sportKey,
        homeTeam: nameOf(home),
        awayTeam: nameOf(away),
        startTime,
        leagueLabel: label,
        homeId: home?.team?.id ? String(home.team.id) : undefined,
        awayId: away?.team?.id ? String(away.team.id) : undefined,
        homeName: home?.team?.displayName || undefined,
        awayName: away?.team?.displayName || undefined,
        homeLogo: home?.team?.logo || undefined,
        awayLogo: away?.team?.logo || undefined,
        homeConferenceId: home?.team?.conferenceId != null ? String(home.team.conferenceId) : undefined,
        awayConferenceId: away?.team?.conferenceId != null ? String(away.team.conferenceId) : undefined,
      });
    }
    return out;
  };

  // CHUNKED, not one call: ESPN silently truncates large range responses (measured — a 14-day MLB
  // range dropped a game only 3 days old), so a season-long range would come back with holes.
  // ~25-day slices stay comfortably under the cap; fetched in parallel, deduped on the seams.
  const CHUNK_DAYS = 25;
  const windowUpcoming = async (days: number): Promise<UpcomingGame[]> => {
    const chunks: [number, number][] = [];
    for (let d = 0; d < days; d += CHUNK_DAYS) chunks.push([d, Math.min(d + CHUNK_DAYS, days)]);
    const parts = await Promise.all(chunks.map(async ([a, b]) => {
      try {
        const q = `?dates=${compact(new Date(now + a * DAY_MS))}-${compact(new Date(now + b * DAY_MS))}`;
        return parse(await (await fetch(base + q)).json());
      } catch { return [] as UpcomingGame[]; }
    }));
    const seen = new Set<string>();
    return parts.flat().filter(g => !seen.has(g.id) && (seen.add(g.id), true));
  };

  try {
    // NFL gets the FULL season outright: its schedule is published in its entirety and starring a
    // Week 15 game in August is a reasonable thing to want. 200 days from an August open reaches
    // past the Super Bowl.
    //
    // Everything else WIDENS ADAPTIVELY instead of using a hand-tuned per-sport constant, because
    // whether 45 days is generous or starving depends on WHERE IN ITS SEASON a sport is, not on
    // which sport it is. Measured 2026-08-13: MLB had 191 fixtures inside 45 days and the NBA had
    // ZERO (its next game was 51 days out) — the same sport would flip to saturated in November.
    // A table of per-sport numbers would be wrong half the year; a rule that reacts to emptiness
    // is right all year. The wider passes only run when the narrow one comes up short, so dense
    // sports never pay for them.
    const MIN_USEFUL = 8;
    const ladder = sportKey === 'nfl' ? [200] : [UPCOMING_HORIZON_DAYS, 120, 200];
    let ranged: UpcomingGame[] = [];
    for (const days of ladder) {
      ranged = await windowUpcoming(days);
      if (ranged.length >= MIN_USEFUL) break;
    }
    if (ranged.length > 0) return ranged;

    // Nothing inside the horizon. Deep off-season: the next fixture can be further out than any
    // sane range query would reach (checked in August, the NBA's was 58 days away). ESPN's BARE
    // scoreboard answers exactly this — with no slate to show it returns the next scheduled events
    // regardless of distance. discoverGameDays already leans on the same fallback for the date
    // strip. Returning "October 3rd" beats "nothing scheduled" when the user asked when the next
    // game is; the caller's horizon filter is skipped for these, deliberately.
    return parse(await (await fetch(base)).json());
  } catch {
    return [];
  }
}

// Core-API leagues (rugby) only reach −90d..+14d through fetchScoreboard — a live-board window,
// not a schedule. Between seasons that is ALWAYS empty even when next season's fixtures are
// published: URC's opener sat ~6 weeks out in August, so "Find the next game" found nothing for
// the entire rugby tile. This probe asks the core events endpoint directly across a long forward
// range and resolves just enough refs to list the first fixtures. Team names come from the event's
// own "Home vs Away" name — resolving two more refs per game for logos isn't worth the requests.
async function fromCoreForward(sportKey: Sport, label: string | undefined, now: number): Promise<UpcomingGame[]> {
  const cfg = SPORT_CONFIG[sportKey];
  if (!cfg?.core || !cfg.espnSport || !cfg.league) return [];
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/${cfg.espnSport}/leagues/${cfg.league}/events` +
      `?dates=${compact(new Date(now))}-${compact(new Date(now + 270 * DAY_MS))}&limit=20`;
    const data = await (await fetch(url)).json();
    const items: any[] = (data?.items || []).slice(0, 8);
    const out: UpcomingGame[] = [];
    for (const it of items) {
      try {
        // Core $refs come back as cleartext http:// — iOS ATS blocks that, so upgrade first.
        const ev = await (await fetch(String(it.$ref).replace(/^http:\/\//i, 'https://'))).json();
        const t = ev?.date ? Date.parse(ev.date) : NaN;
        if (!Number.isFinite(t) || t <= now) continue;
        const [home, away] = String(ev?.name || '').split(' vs ');
        if (!home || !away) continue;
        out.push({ id: String(ev.id), sport: sportKey, homeTeam: home, awayTeam: away, startTime: t, leagueLabel: label });
      } catch { /* one bad ref shouldn't sink the league */ }
    }
    return out;
  } catch {
    return [];
  }
}

// Core-API and backend-served leagues: no range query exists, so take the board they do give and
// keep what hasn't started. Narrower reach than the ESPN path by nature, not by choice.
async function fromBoard(sportKey: Sport, label: string | undefined, now: number): Promise<UpcomingGame[]> {
  let upcoming: UpcomingGame[] = [];
  try {
    const games = await fetchScoreboard(sportKey);
    upcoming = games
      .map(g => toUpcoming(g, label))
      .filter((g): g is UpcomingGame => !!g && g.startTime > now);
  } catch { /* board unavailable — the probe below is still worth a shot */ }
  if (upcoming.length) return upcoming;
  // Empty (or failed) board + core league → the live window can't see far enough. The probe sits
  // OUTSIDE the try above on purpose: when it was inside, any board failure skipped it silently,
  // and "0 games" is indistinguishable from "didn't look".
  return fromCoreForward(sportKey, label, now);
}

/** Upcoming games for ONE sport (fanning out across member leagues for merged tiles). */
export async function findUpcomingGames(sport: Sport, now: number = Date.now()): Promise<UpcomingGame[]> {
  const cfg = SPORT_CONFIG[sport];
  if (!cfg || cfg.learnMode) return []; // tennis/golf: tournaments, not fixtures

  const results = await Promise.allSettled(
    leaguesFor(sport).map(l => {
      const lcfg = SPORT_CONFIG[l.sportKey];
      const useRange = !!lcfg?.espnSport && !!lcfg?.league && !lcfg.core && !lcfg.provider;
      return useRange
        ? fromEspnRange(l.sportKey, l.label, now)
        : fromBoard(l.sportKey, l.label, now);
    }),
  );

  const seen = new Set<string>();
  const out: UpcomingGame[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const g of r.value) {
      if (seen.has(g.id)) continue; // a fixture can appear in two league feeds (e.g. cup ties)
      seen.add(g.id);
      out.push(g);
    }
  }
  // NO horizon clamp here on purpose. Each provider already bounds what it asks for, and the
  // off-season fallback above deliberately returns fixtures beyond the horizon — clamping them
  // here would throw away the one answer the user came for.
  return out.sort((a, b) => a.startTime - b.startTime);
}

/** Group a flat list into local calendar days, preserving chronological order. */
export function groupByDay(games: UpcomingGame[]): { day: string; label: string; games: UpcomingGame[] }[] {
  const buckets = new Map<string, UpcomingGame[]>();
  for (const g of games) {
    const d = new Date(g.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(g);
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, gs]) => {
      const d = new Date(gs[0].startTime);
      const label =
        day === todayKey ? 'Today'
        : day === tomorrowKey ? 'Tomorrow'
        : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      return { day, label, games: gs };
    });
}
