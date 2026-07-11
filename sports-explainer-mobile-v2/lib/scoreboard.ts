// Shared scoreboard → Game[] fetcher (extracted from LiveScreen.fetchGames, Option A).
// BEHAVIOR-PRESERVING LIFT: the rugby $ref expansion, phantom dedup, status
// normalization, and timezone-safe local-date window are moved here verbatim — no
// logic changes. LiveScreen.fetchGames is now a thin wrapper around this (it keeps
// its own LiveScreen-only bits: learn-context, favorites sort, setGames, auto-select).
// Watch Next (lib/watchNext.ts) reuses this same function to gather candidates.

import { Sport, API_URL } from './api';
import { isOffSeason } from './sports';

// A probable starter (MLB probable pitcher today; other sports have no analog). `record` is ESPN's
// pre-formatted "(W-L, ERA)" string, ready to display verbatim.
export interface GameProbable {
  name: string;
  record?: string;
  headshot?: string;
}

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
  // --- ADDITIVE (Build 2): optional pre-game "tune-in" fields, retained WHEN PRESENT. All degrade
  // gracefully — MLB carries the full set; a bare World Cup fixture has only matchup/time/venue/TV.
  // Existing consumers (GameCard / live / recap / Watch Next) ignore these entirely. ---
  venue?: string;        // venue.fullName, e.g. "Truist Park"
  venueCity?: string;    // "City, ST" from venue.address (city + state when present)
  broadcasts?: string[]; // deduped network/streaming names from BOTH broadcasts + geoBroadcasts
  homeRecord?: string;   // overall W-L summary, e.g. "50-34" (MLB rich; empty for knockout soccer)
  awayRecord?: string;
  homeProbable?: GameProbable; // MLB probable starter (name + "(W-L, ERA)" + headshot)
  awayProbable?: GameProbable;
  weather?: { displayValue?: string; temperature?: number }; // outdoor-MLB color; absent elsewhere
  stage?: string;        // prettified season stage/round, e.g. "Round of 32" — educational stakes
                         // context for newcomers. From event.season.slug; "regular-season" suppressed.
  sport: string;
}

// ESPN config per sport. `core` sports (rugby) are NOT on the normal scoreboard API
// and need the two-step Core-API $ref fetch. Leagues match the backend so the gameId
// we send is found server-side. (Moved from LiveScreen; imported back there.)
// `liveFormat` is an ORTHOGONAL live-surface hint (independent of learnMode): 'leaderboard' marks a
// sport that, when a live event exists, renders a leaderboard instead of head-to-head game cards.
// Golf keeps learnMode:true (its Q&A/FAQ/Academy stay) AND gains liveFormat:'leaderboard'. Tennis
// likewise keeps learnMode:true AND gains liveFormat:'tennis' (its live matches come from the
// /api/tennis-live endpoint, not ESPN — fetchScoreboard still returns [] for it).
// `provider` selects the data source: absent/'espn' = ESPN base (default). Future: 'sportradar'.
export type SportCfg = { espnSport?: string; league?: string; core?: boolean; learnMode?: boolean; liveFormat?: 'leaderboard' | 'tennis'; provider?: 'espn' | 'zyla' };
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
  tennis: { espnSport: 'tennis', league: 'atp', learnMode: true, liveFormat: 'tennis' },
  golf: { espnSport: 'golf', league: 'pga', learnMode: true, liveFormat: 'leaderboard' },
  cricket: { learnMode: true },
};

// Fetch a single sport's scoreboard and return normalized Game[] (post-dedup,
// pre-sort). Learn-mode / off-season sports return [] (no head-to-head games), which
// is also why the Watch Next gatherer can call this for every sport safely.
// `isCancelled` is checked once after the network work so a superseded caller commits
// nothing; the LiveScreen wrapper ALSO checks before setState (identical behavior).
// Zyla-provider board (Gate 2): the World Rugby Nations Cup board comes from OUR backend, which holds
// the Zyla key server-side and returns already-normalized canonical Game[]. This client holds NO key
// and does NO re-normalize — it only calls the backend. Best-effort: any failure → [] (never throws),
// and when RUGBY_LIVE is unset the backend returns { matches: [] }, so this naturally yields [].
// Backend endpoint derived from the shared API_URL (single source of truth in lib/api.ts).
const RUGBY_LIVE_URL = API_URL.replace('/api/explain', '/api/rugby-live');
async function fetchZylaBoard(
  sport: Sport,
  isCancelled: () => boolean = () => false,
  date?: Date,
): Promise<Game[]> {
  try {
    const response = await fetch(RUGBY_LIVE_URL, { method: 'GET' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.matches) ? data.matches : [];
  } catch {
    return [];
  }
}

export async function fetchScoreboard(
  sport: Sport,
  isCancelled: () => boolean = () => false,
  date?: Date,   // when set, fetch THAT local day's games (date strip). Default: today's bare scoreboard.
): Promise<Game[]> {
  const cfg = SPORT_CONFIG[sport];
  if (!cfg || cfg.learnMode) return [];
  // Zyla-provider sports bypass the entire ESPN path — placed BEFORE the off-season guard on purpose
  // (isOffSeason reads ESPN-shaped SEASON_WINDOWS, which would wrongly short-circuit a Zyla sport).
  if (cfg.provider === 'zyla') return fetchZylaBoard(sport, isCancelled, date);
  // Off-season → [] for the DEFAULT (today) fetch; an explicit date bypasses this, since the date
  // strip only asks for days discoverGameDays already found to have games (incl. across an
  // offseason gap — e.g. tapping a preseason day for a currently-out-of-season league).
  if (!date && isOffSeason(sport)) return [];

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
  // --- Build 2 pre-game extractors (all defensive: return undefined when the field is absent) ---
  // Overall W-L only (records[] is [overall, home, road]); prefer the total/overall entry.
  const recordOf = (c: any): string | undefined => {
    const recs: any[] = c?.records || [];
    const overall = recs.find((r: any) => r?.type === 'total' || r?.name === 'overall') || recs[0];
    return overall?.summary || undefined;
  };
  const probableOf = (c: any): GameProbable | undefined => {
    const p = (c?.probables || [])[0];
    const name = p?.athlete?.fullName || p?.athlete?.displayName;
    if (!name) return undefined;
    return { name: String(name), record: p?.record ? String(p.record) : undefined, headshot: p?.athlete?.headshot || undefined };
  };
  // Season stage/round for newcomer stakes context. Prettify the kebab slug ("round-of-32" →
  // "Round of 32"); suppress the noise cases (regular/pre season) → undefined so nothing renders.
  const prettyStage = (slug?: string): string | undefined => {
    if (!slug || slug === 'regular-season' || slug === 'preseason') return undefined;
    const small = new Set(['of', 'the', 'and']);
    return slug.split('-')
      .map((w, i) => (small.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  };
  // Weather condition TEXT. ESPN INCONSISTENTLY swaps displayValue <-> conditionId: usually the
  // human label is in displayValue ("Partly sunny", conditionId "3"), but sometimes it's flipped
  // (displayValue "1", conditionId "Sunny"). Pick whichever field is NON-numeric as the label;
  // undefined if neither is text (→ card shows temp only, no trailing ", 1").
  const weatherText = (w: any): string | undefined => {
    const isNum = (v: any) => typeof v === 'string' && /^\d+$/.test(v.trim());
    const dv = w?.displayValue, ci = w?.conditionId;
    if (dv && !isNum(dv)) return String(dv);
    if (ci && !isNum(ci)) return String(ci);
    return undefined;
  };
  // TV/streaming — merge BOTH broadcasts (names[]) and geoBroadcasts (media.shortName), deduped.
  const broadcastsOf = (comp: any): string[] | undefined => {
    const names: string[] = [];
    for (const b of (comp?.broadcasts || [])) for (const n of (b?.names || [])) if (n) names.push(String(n));
    for (const g of (comp?.geoBroadcasts || [])) { const sn = g?.media?.shortName; if (sn) names.push(String(sn)); }
    const uniq = Array.from(new Set(names));
    return uniq.length ? uniq : undefined;
  };
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
      // ADDITIVE (Build 2) — optional tune-in fields; undefined when the feed doesn't carry them.
      venue: comp?.venue?.fullName || undefined,
      venueCity: comp?.venue?.address?.city
        ? `${comp.venue.address.city}${comp.venue.address.state ? `, ${comp.venue.address.state}` : ''}`
        : undefined,
      broadcasts: broadcastsOf(comp),
      homeRecord: recordOf(home),
      awayRecord: recordOf(away),
      homeProbable: probableOf(home),
      awayProbable: probableOf(away),
      weather: e?.weather
        ? { displayValue: weatherText(e.weather),
            temperature: typeof e.weather.temperature === 'number' ? e.weather.temperature : undefined }
        : undefined,
      stage: prettyStage(e?.season?.slug),
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
    // Date strip: fetch a specific day via ?dates=YYYYMMDD; default (no date) = bare "today".
    const q = date ? `?dates=${compactLocal(date)}` : '';
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard${q}`,
    );
    const data = await res.json();
    if (date) {
      // Explicit day: return exactly that LOCAL day's games. ESPN's dates=YYYYMMDD bleeds ±1 day
      // at the UTC boundary, so filter to the requested local day. The two today-only guards in
      // the else-branch are DELIBERATELY skipped here — the 24h-stale drop and end-of-season
      // clear would delete the very past finals we're navigating to.
      const wantDay = dashedLocal(date);
      parsed = (data?.events || [])
        .filter((e: any) => e?.date && localDayOf(e.date) === wantDay)
        .map(toGame);
    } else {
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
  }

  if (isCancelled()) return [];
  return parsed;
}

// ============================================================================
// Event-model game-day discovery (for the prev/today/next date strip).
//
// Given a sport + anchor day, range-query a bounded window (±PRIMARY_REACH_DAYS)
// and group events by LOCAL day → the nearest game-day in each direction, widening
// FORWARD (Option-B) when the primary window is dry. Empty days simply don't
// appear in the grouping, so gap-skipping (e.g. a World Cup rest day, an MLB
// All-Star break) is free. Head-to-head SITE sports only: learn-mode
// (tennis/golf/cricket) and core (rugby/mlr) are excluded — they're not per-day
// head-to-head strips (golf is tournament-spanning). This is intentionally a
// LIGHT fetch: it reads only event.date (no team/score/$ref normalization), so
// it can scan a wide window cheaply, and it does NOT short-circuit on
// isOffSeason — the forward reach below is exactly how we find the next fixture
// across an offseason gap.
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;
// Primary window half-width: anchor ±PRIMARY_REACH_DAYS in one range call. Kept SMALL because
// ESPN's scoreboard caps a response at ~100 events, returned ASCENDING by date (first 100 kept,
// the rest silently dropped). A dense daily sport (MLB ≈ 15 games/day) blows past 100 in ~7 days,
// so a wide window (e.g. ±7d) truncates the FAR days and makes `next` skip real game-days. ±3d
// (≈7 days, ≤~100 even for MLB) captures the immediate prev/next reliably; the forward reach below
// handles anything sparser. NOTE: the cap is benign for `next`/the widen — ascending order means
// the nearest-future day always survives truncation.
const PRIMARY_REACH_DAYS = 3;
// Forward Option-B reach cap: never scan past +N days. Beyond this → "no upcoming games".
const FORWARD_REACH_DAYS = 45;

// LOCAL date formatters — mirror fetchScoreboard's timezone-safe `fmt` (NEVER toISOString/UTC,
// which rolls the day for users behind UTC). Compact YYYYMMDD feeds the ESPN `dates=` param;
// dashed YYYY-MM-DD is the day-key (lexicographic order == chronological order).
const compactLocal = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const dashedLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localDayOf = (iso: string) => dashedLocal(new Date(iso));

// Public local-day helpers for the date strip — keep the strip's Date <-> day-string math
// identical to the fetch filter above (never UTC).
export const toLocalDayString = (d: Date): string => dashedLocal(d);
// Parse a dashed YYYY-MM-DD as a LOCAL calendar day at NOON (noon dodges DST/tz edges that could
// shift the day). Feeding this back to fetchScoreboard(date) yields the same day it came from.
export function fromLocalDayString(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

const latestBefore = (days: string[], day: string): string | null => {
  const before = days.filter(d => d < day).sort();
  return before.length ? before[before.length - 1] : null;
};
const earliestAfter = (days: string[], day: string): string | null => {
  const after = days.filter(d => d > day).sort();
  return after.length ? after[0] : null;
};

// Light range/bare fetch: return the set of LOCAL game-days present for a site scoreboard
// query. `query` is '?dates=START-END', '?dates=SINGLE', or '' (bare = ESPN's current/next
// matchday). Network/parse failure → empty set (caller degrades to null prev/next).
async function fetchGameDays(cfg: SportCfg, query: string): Promise<Set<string>> {
  const days = new Set<string>();
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${cfg.espnSport}/${cfg.league}/scoreboard${query}`,
    );
    const data = await res.json();
    for (const e of (data?.events || [])) {
      if (e?.date) days.add(localDayOf(e.date));
    }
  } catch { /* leave empty */ }
  return days;
}

export interface GameDayDiscovery {
  anchor: string;                 // local YYYY-MM-DD the search pivots on
  gameDays: string[];             // sorted unique local game-days seen within the scanned reach
  previousGameDay: string | null; // latest game-day strictly before the anchor (null if none)
  nextGameDay: string | null;     // earliest game-day strictly after the anchor (null if none within reach)
}

// Discover the nearest game-days around `anchorDate` for the date strip. prev = latest game-day
// before the anchor; next = earliest after (gap-skipping). If the primary ±7d window has no
// next game-day (offseason / intermittent slate), Option-B forward reach: (1) widen the FORWARD
// query out to the +FORWARD_REACH_DAYS cap, then (2) fall back to the bare scoreboard's
// "next matchday" (soccer offseason exposes the next real fixture only there) — but still respect
// the cap, so a fixture beyond the reach reads as "no upcoming games".
export async function discoverGameDays(
  sport: Sport,
  anchorDate: Date = new Date(),
): Promise<GameDayDiscovery> {
  const anchor = dashedLocal(anchorDate);
  const empty: GameDayDiscovery = { anchor, gameDays: [], previousGameDay: null, nextGameDay: null };
  const cfg = SPORT_CONFIG[sport];
  if (!cfg || cfg.learnMode || cfg.core || !cfg.espnSport || !cfg.league) return empty;

  // Primary window: anchor −PRIMARY_REACH_DAYS … +PRIMARY_REACH_DAYS in ONE range call.
  const start = compactLocal(new Date(anchorDate.getTime() - PRIMARY_REACH_DAYS * DAY_MS));
  const end = compactLocal(new Date(anchorDate.getTime() + PRIMARY_REACH_DAYS * DAY_MS));
  const all = await fetchGameDays(cfg, `?dates=${start}-${end}`);

  const previousGameDay = latestBefore(Array.from(all), anchor);
  let nextGameDay = earliestAfter(Array.from(all), anchor);

  // Option-B forward reach — only when the primary window found no upcoming game-day.
  if (!nextGameDay) {
    // Contiguous with the primary window's forward edge (+PRIMARY_REACH_DAYS+1 … +cap).
    const wideStart = compactLocal(new Date(anchorDate.getTime() + (PRIMARY_REACH_DAYS + 1) * DAY_MS));
    const wideEnd = compactLocal(new Date(anchorDate.getTime() + FORWARD_REACH_DAYS * DAY_MS));
    const wide = await fetchGameDays(cfg, `?dates=${wideStart}-${wideEnd}`);
    wide.forEach(d => all.add(d));
    nextGameDay = earliestAfter(Array.from(all), anchor);
  }
  if (!nextGameDay) {
    const bare = await fetchGameDays(cfg, ''); // ESPN default = current/next matchday
    bare.forEach(d => all.add(d));
    const bareNext = earliestAfter(Array.from(all), anchor);
    const cap = dashedLocal(new Date(anchorDate.getTime() + FORWARD_REACH_DAYS * DAY_MS));
    if (bareNext && bareNext <= cap) nextGameDay = bareNext;
  }

  return { anchor, gameDays: Array.from(all).sort(), previousGameDay, nextGameDay };
}

// ============================================================================
// Multi-league RUGBY board (Phase 1 Gate 1) — fetch + merge ESPN's existing rugby
// leagues under the one "Rugby" tile. Each league is its own app Sport key, so we
// fetch them separately and CONCAT: every game keeps its OWN .sport (URC → 'rugby',
// MLR → 'mlr'), because fetchScoreboard stamps the arg into Game.sport. We never
// re-stamp/normalize to a single key — the per-game key is what the explain/recap
// backend routing needs. Mirrors watchNext.gatherWatchCandidates' allSettled+concat;
// per-league dedup already happens inside fetchScoreboard. No date param (Phase 1 has
// no date strip — the core −3d…+7d window is exactly what we want).
// ============================================================================
export const RUGBY_LEAGUES: { sportKey: Sport; label: string }[] = [
  { sportKey: 'rugby', label: 'URC' },
  { sportKey: 'mlr', label: 'MLR' },
];

export async function fetchRugbyBoard(
  isCancelled: () => boolean = () => false,
): Promise<Game[]> {
  const results = await Promise.allSettled(
    RUGBY_LEAGUES.map(l => fetchScoreboard(l.sportKey, isCancelled)),
  );
  if (isCancelled()) return [];
  const out: Game[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue; // one slow/failed league can't sink the board
    out.push(...r.value);                   // keep each game's own .sport — no normalize
  }
  return out;
}
