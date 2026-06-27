// Shared scoreboard → Game[] fetcher (extracted from LiveScreen.fetchGames, Option A).
// BEHAVIOR-PRESERVING LIFT: the rugby $ref expansion, phantom dedup, status
// normalization, and timezone-safe local-date window are moved here verbatim — no
// logic changes. LiveScreen.fetchGames is now a thin wrapper around this (it keeps
// its own LiveScreen-only bits: learn-context, favorites sort, setGames, auto-select).
// Watch Next (lib/watchNext.ts) reuses this same function to gather candidates.

import { Sport } from './api';
import { isOffSeason } from './sports';

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  // Full ESPN display names (e.g. "Spain") — ADDITIVE, alongside the abbreviation-preferred
  // homeTeam/awayTeam (e.g. "ESP") which the score cards use. Needed to match Highlightly event
  // team names for the Match Timeline crest. Optional: absent for feeds without a displayName.
  homeTeamFull?: string;
  awayTeamFull?: string;
  homeScore: string;
  awayScore: string;
  homeLogo?: string;
  awayLogo?: string;
  status: string;       // display label: "FT" / "Scheduled" / live clock, etc.
  isLive: boolean;
  // --- ADDITIVE (beyond the pure lift) — needed by Watch Next selection; existing
  // LiveScreen consumers ignore these, so game-loading behavior is unchanged. ---
  state?: string;       // raw ESPN state: 'pre' | 'in' | 'post'
  startTime?: number;   // epoch ms from the event date (window filter + tiebreak)
  sport: string;
}

// ESPN config per sport. `core` sports (rugby) are NOT on the normal scoreboard API
// and need the two-step Core-API $ref fetch. Leagues match the backend so the gameId
// we send is found server-side. (Moved from LiveScreen; imported back there.)
// `liveFormat` is an ORTHOGONAL live-surface hint (independent of learnMode): 'leaderboard' marks a
// sport that, when a live event exists, renders a leaderboard instead of head-to-head game cards.
// Golf keeps learnMode:true (its Q&A/FAQ/Academy stay) AND gains liveFormat:'leaderboard'.
export type SportCfg = { espnSport?: string; league?: string; core?: boolean; learnMode?: boolean; liveFormat?: 'leaderboard' };
export const SPORT_CONFIG: Record<Sport, SportCfg> = {
  mlb: { espnSport: 'baseball', league: 'mlb' },
  nhl: { espnSport: 'hockey', league: 'nhl' },
  nba: { espnSport: 'basketball', league: 'nba' },
  nfl: { espnSport: 'football', league: 'nfl' },
  soccer: { espnSport: 'soccer', league: 'usa.1' },
  worldcup: { espnSport: 'soccer', league: 'fifa.world' },
  rugby: { espnSport: 'rugby', league: '270557', core: true },
  wnba: { espnSport: 'basketball', league: 'wnba' },
  epl: { espnSport: 'soccer', league: 'eng.1' },
  laliga: { espnSport: 'soccer', league: 'esp.1' },
  mlr: { espnSport: 'rugby', league: '289262', core: true },
  // Learn Mode sports — tennis/golf fetch tournament context; cricket has no data source.
  tennis: { espnSport: 'tennis', league: 'atp', learnMode: true },
  golf: { espnSport: 'golf', league: 'pga', learnMode: true, liveFormat: 'leaderboard' },
  cricket: { learnMode: true },
};

// Fetch a single sport's scoreboard and return normalized Game[] (post-dedup,
// pre-sort). Learn-mode / off-season sports return [] (no head-to-head games), which
// is also why the Watch Next gatherer can call this for every sport safely.
// `isCancelled` is checked once after the network work so a superseded caller commits
// nothing; the LiveScreen wrapper ALSO checks before setState (identical behavior).
export async function fetchScoreboard(
  sport: Sport,
  isCancelled: () => boolean = () => false,
): Promise<Game[]> {
  const cfg = SPORT_CONFIG[sport];
  if (!cfg || cfg.learnMode || isOffSeason(sport)) return [];

  // Team labels: prefer abbreviation, fall back for sports that lack it (rugby/soccer).
  const teamName = (c: any) =>
    c?.team?.abbreviation || c?.team?.shortDisplayName || c?.team?.displayName || '?';
  const scoreOf = (c: any) => {
    const s = c?.score;
    if (s == null) return '0';
    return typeof s === 'object' ? String(s.displayValue ?? s.value ?? '0') : String(s);
  };
  // Site API gives team.logo (a URL); Core API (rugby) gives team.logos[].href.
  const logoOf = (c: any): string | undefined =>
    c?.team?.logo || c?.team?.logos?.[0]?.href || undefined;
  const toGame = (e: any): Game => {
    const comp = e.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    // Core events carry status on competitions[0].status (resolved in expandEvent);
    // site events carry it on the event. Prefer whichever is present.
    const st = comp?.status?.type ? comp.status : e.status;
    return {
      id: String(e.id),
      homeTeam: teamName(home),
      awayTeam: teamName(away),
      homeTeamFull: home?.team?.displayName || home?.team?.shortDisplayName || teamName(home),
      awayTeamFull: away?.team?.displayName || away?.team?.shortDisplayName || teamName(away),
      homeScore: scoreOf(home),
      awayScore: scoreOf(away),
      homeLogo: logoOf(home),
      awayLogo: logoOf(away),
      status: st?.type?.shortDetail || st?.type?.description || '',
      isLive: st?.type?.state === 'in',
      state: st?.type?.state,                          // ADDITIVE
      startTime: e.date ? Date.parse(e.date) : undefined, // ADDITIVE
      sport,
    };
  };

  let parsed: Game[] = [];

  if (cfg.core) {
    // Rugby: Core-API two-step — list event $refs over a date window, then resolve +
    // dedup. ESPN returns nested $ref URLs as cleartext http:// (iOS ATS blocks it) —
    // normalize every $ref to https before fetch.
    const httpsRef = (u: string) => u.replace(/^http:\/\//i, 'https://');
    const today = new Date();
    // Build YYYYMMDD from LOCAL date parts — NOT toISOString() (UTC), which rolls the
    // day forward for users behind UTC and drops today's games off the window.
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const DAY = 24 * 60 * 60 * 1000;
    const start = fmt(new Date(today.getTime() - 3 * DAY)); // -3d..+7d window
    const end = fmt(new Date(today.getTime() + 7 * DAY));
    const evRes = await fetch(
      `https://sports.core.api.espn.com/v2/sports/${cfg.espnSport}/leagues/${cfg.league}/events?dates=${start}-${end}`,
    );
    const evData = await evRes.json();
    const items: any[] = (evData.items || []).slice(0, 25);
    const resolvedEvents = (await Promise.all(
      items.map(async (it: any) => {
        try {
          const r = await fetch(httpsRef(it.$ref));
          return await r.json();
        } catch {
          return null;
        }
      }),
    )).filter(Boolean);
    // Dedup by event ID — ESPN can list the same fixture twice.
    const seen = new Set<string>();
    const uniqueEvents = resolvedEvents.filter((ev: any) => {
      if (seen.has(ev.id)) return false;
      seen.add(ev.id);
      return true;
    });

    // Core API competitors carry $ref pointers for team + score — resolve those (3s
    // timeout, '?'/'0' fallback) so toGame reads the Site-API shape unchanged.
    const fetchRef = async (url: string): Promise<any> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      try {
        const r = await fetch(httpsRef(url), { signal: ctrl.signal });
        if (!r.ok) throw new Error(`ref ${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(t);
      }
    };
    const expandCompetitor = async (c: any): Promise<any> => {
      let team = c?.team;
      let score = c?.score;
      const jobs: Promise<void>[] = [];
      if (team?.$ref && !team.abbreviation) {
        jobs.push(fetchRef(team.$ref).then(t => { team = t; }).catch(() => { team = undefined; }));
      }
      if (score?.$ref && !score.displayValue) {
        jobs.push(fetchRef(score.$ref).then(s => { score = s; }).catch(() => { score = undefined; }));
      }
      await Promise.all(jobs);
      return { ...c, team, score };
    };
    const expandEvent = async (ev: any): Promise<any> => {
      const comp = ev.competitions?.[0];
      if (!comp?.competitors) return ev;
      const competitors = await Promise.all(comp.competitors.map(expandCompetitor));
      // Core events store status as a $ref too — resolve it so toGame can read
      // FT / Scheduled / LIVE. Resilient: leave undefined on failure.
      let status = comp.status;
      if (status?.$ref) status = await fetchRef(status.$ref).catch(() => undefined);
      return { ...ev, competitions: [{ ...comp, competitors, status }, ...ev.competitions.slice(1)] };
    };
    const expandedEvents = await Promise.all(uniqueEvents.map(expandEvent));

    // Collapse ESPN's phantom duplicates (a real post/scored event plus a pre/0-0
    // swapped-teams twin with a different ID). Group by order-independent team pair;
    // if any game in the group was played (post/in) keep those and drop the pre
    // phantoms; keep multiple played legs (home-and-away series); collapse pre/pre
    // swapped twins to the lowest-ID (real-sequence) one.
    const teamId = (c: any) => String(c?.team?.id ?? '');
    const pairKey = (ev: any) =>
      ((ev.competitions?.[0]?.competitors || []).map(teamId).sort()).join('-');
    const isPlayed = (ev: any) => {
      const s = ev.competitions?.[0]?.status?.type?.state;
      return s === 'post' || s === 'in';
    };
    const groups = new Map<string, any[]>();
    for (const ev of expandedEvents) {
      const arr = groups.get(pairKey(ev));
      if (arr) arr.push(ev); else groups.set(pairKey(ev), [ev]);
    }
    const deduped: any[] = [];
    for (const group of groups.values()) {
      const played = group.filter(isPlayed);
      if (played.length > 0) {
        deduped.push(...played);
      } else {
        deduped.push(group.reduce((a, b) => (Number(a.id) <= Number(b.id) ? a : b)));
      }
    }
    parsed = deduped.map(toGame);
  } else {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard`,
    );
    const data = await res.json();
    // Belt-and-suspenders: drop completed games older than 24h so a stale scoreboard
    // can't surface last season's results even if isOffSeason misses.
    const now = Date.now();
    parsed = (data?.events || [])
      .filter((e: any) => {
        const isFinal = e.status?.type?.state === 'post';
        const ageMs = e.date ? now - new Date(e.date).getTime() : 0;
        return !(isFinal && ageMs > 24 * 60 * 60 * 1000);
      })
      .map(toGame);

    // End-of-season guard (date-aware): clear the list only when ESPN returns nothing
    // live/upcoming AND no game dated today-or-later — i.e. genuinely past completed
    // games. Daily sports (MLB) briefly show today's slate as `post`; those are dated
    // today/future, so we keep them.
    const todayStr = new Date().toISOString().slice(0, 10);
    const hasCurrent = (data?.events || []).some((e: any) => {
      const st = e.status?.type?.state;
      if (st === 'in' || st === 'pre') return true;
      return (e.date || '').slice(0, 10) >= todayStr;
    });
    if (!hasCurrent && parsed.length > 0) {
      parsed = [];
    }
  }

  if (isCancelled()) return [];
  return parsed;
}
