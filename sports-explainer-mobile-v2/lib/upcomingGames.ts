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
      });
    }
    return out;
  };

  try {
    const start = compact(new Date(now));
    const end = compact(new Date(now + UPCOMING_HORIZON_DAYS * DAY_MS));
    const ranged = parse(await (await fetch(`${base}?dates=${start}-${end}`)).json());
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

// Core-API and backend-served leagues: no range query exists, so take the board they do give and
// keep what hasn't started. Narrower reach than the ESPN path by nature, not by choice.
async function fromBoard(sportKey: Sport, label: string | undefined, now: number): Promise<UpcomingGame[]> {
  try {
    const games = await fetchScoreboard(sportKey);
    return games
      .map(g => toUpcoming(g, label))
      .filter((g): g is UpcomingGame => !!g && g.startTime > now);
  } catch {
    return [];
  }
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
