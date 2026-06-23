// Watch Next (Step C) — candidate gathering + the PURE selection function.
// v1 is NOT personalized: selection is a pure function of the current scoreboard
// snapshot + the just-finished game. No My Sports / level / language / history.
// (Personalization slots in later as an optional extra arg without a rewrite.)

import { Sport } from './api';
import { Game, SPORT_CONFIG, fetchScoreboard } from './scoreboard';

export type WatchStatus = 'live' | 'upcoming';

export interface WatchCandidate {
  sport: Sport;          // league key (used for the per-sport hook + navigation)
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  status: WatchStatus;   // normalized: ESPN 'in' → live, 'pre' → upcoming
  startTime: number;     // epoch ms — window filter + deterministic tiebreak
  statusLabel: string;   // display string for the card ("LIVE" / scheduled time)
  homeScore?: string;    // live "why" context only
  awayScore?: string;
}

// "Same sport vs. different sport" is judged at the PARENT-sport level — the app's
// keys are league-level. Without this, La Liga would rank as discovery after EPL.
export const LEAGUE_TO_SPORT: Partial<Record<Sport, string>> = {
  epl: 'soccer', laliga: 'soccer', soccer: 'soccer', worldcup: 'soccer',
  rugby: 'rugby', mlr: 'rugby',
  nba: 'basketball', wnba: 'basketball',
  // mlb, nhl, nfl, tennis, golf, cricket → each its own parent (fallback to the key).
};
export const parentSport = (s: Sport): string => LEAGUE_TO_SPORT[s] ?? s;

// Stable ordering for the final deterministic tiebreak (mirrors the SPORTS list).
export const SPORT_ORDER: Sport[] = [
  'mlb', 'nhl', 'nba', 'wnba', 'nfl', 'soccer', 'worldcup',
  'epl', 'laliga', 'rugby', 'mlr', 'tennis', 'golf', 'cricket',
];

// How far forward an "upcoming" game counts as recommendable. A few hours keeps the
// pick relevant ("on soon"), not a fixture days away. Tunable. NOTE: comparison is
// pure epoch-ms arithmetic (startTime vs injected `now`) — no toISOString()/UTC date
// math, so there's no timezone-rollover bug here.
export const UPCOMING_SOON_WINDOW = 3 * 60 * 60 * 1000; // 3 hours

// PURE: pick one recommendation, or null (→ render no card). No I/O, no user state,
// no Date.now() inside — `now` is injected for determinism + the tz-safe window.
export function selectWatchNext(
  candidates: WatchCandidate[],
  finishedSport: Sport,
  finishedGameId: string,
  now: number,
  excludeCurrentSport: boolean = false,
): WatchCandidate | null {
  const finishedParent = parentSport(finishedSport);

  // Pool: live (any) + upcoming within the window; exclude the just-finished game.
  // When excludeCurrentSport (Trigger B — "Live Now": the current sport has nothing
  // live), drop the ENTIRE current parent sport so the pick is always cross-sport
  // discovery (this is also what stops World Cup recommending World Cup).
  const pool = candidates.filter(c => {
    if (c.gameId === finishedGameId) return false;
    if (excludeCurrentSport && parentSport(c.sport) === finishedParent) return false;
    if (c.status === 'live') return true;
    return c.startTime > now && c.startTime - now <= UPCOMING_SOON_WINDOW;
  });
  if (pool.length === 0) return null;

  // Tier (lower = better): same-sport beats different-sport; live beats upcoming.
  // Discovery (different sport) is only reached when nothing in the same parent sport
  // qualifies — the decided same-sport-first bias.
  const tier = (c: WatchCandidate): number => {
    const same = parentSport(c.sport) === finishedParent;
    if (same && c.status === 'live') return 0;
    if (same && c.status === 'upcoming') return 1;
    if (!same && c.status === 'live') return 2;
    return 3; // different sport, upcoming
  };

  const sportIdx = (s: Sport) => {
    const i = SPORT_ORDER.indexOf(s);
    return i === -1 ? SPORT_ORDER.length : i;
  };

  const ranked = [...pool].sort((a, b) => {
    const ta = tier(a), tb = tier(b);
    if (ta !== tb) return ta - tb;
    // Within a tier, deterministic: live first, then soonest start, then stable sport
    // order, then gameId — so the pick never flickers across refreshes.
    if ((a.status === 'live') !== (b.status === 'live')) return a.status === 'live' ? -1 : 1;
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    const sa = sportIdx(a.sport), sb = sportIdx(b.sport);
    if (sa !== sb) return sa - sb;
    return a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0;
  });

  return ranked[0];
}

// Map a normalized Game (from fetchScoreboard) to a WatchCandidate, or null if it's
// not a usable candidate (final games and unknown states are dropped). Phantom
// duplicates are ALREADY removed upstream by fetchScoreboard's dedup.
function toCandidate(g: Game): WatchCandidate | null {
  if (g.state === 'post') return null;                 // exclude final
  const status: WatchStatus | null =
    g.state === 'in' ? 'live' : g.state === 'pre' ? 'upcoming' : null;
  if (!status) return null;
  return {
    sport: g.sport as Sport,
    gameId: g.id,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    status,
    startTime: g.startTime ?? 0,
    statusLabel: g.status,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
  };
}

// IMPURE: gather live/upcoming candidates across all head-to-head sports. Reuses the
// shared fetchScoreboard (so rugby $ref expansion + phantom dedup come for free).
// Promise.allSettled so one slow/failed sport can't block or crash the set; honors
// `isCancelled` so it writes nothing after the user navigates away.
export async function gatherWatchCandidates(
  isCancelled: () => boolean = () => false,
): Promise<WatchCandidate[]> {
  const sports = (Object.keys(SPORT_CONFIG) as Sport[]).filter(s => !SPORT_CONFIG[s].learnMode);
  const results = await Promise.allSettled(sports.map(s => fetchScoreboard(s, isCancelled)));
  if (isCancelled()) return [];
  const out: WatchCandidate[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const g of r.value) {
      const c = toCandidate(g);
      if (c) out.push(c);
    }
  }
  return out;
}
