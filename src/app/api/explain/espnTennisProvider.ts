// ESPN tennis provider — a PARALLEL data source for the live SINGLES list (mirrors
// golfLeaderboardProvider.ts / tennisProvider.ts discipline). KEYLESS & FREE: ESPN's public site.api
// needs no key and has no per-second rate limit (unlike the RapidAPI feed), so this owns the match
// LIST (names, flags, round, court, seed, set scores). RapidAPI stays the live-point ENRICHER for a
// single selected match (server / current-game points / timeline) — wired in G2, NOT here.
//
// Best-effort throughout: EVERY failure path returns [] (never throws). Defensive parsing — the feed
// mixes shapes and omits keys for unseeded players, so never blanket-cast. ~30s module cache.

const ATP = 'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard';
const WTA = 'https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard';
const FETCH_TIMEOUT = 5000; // ms — bound each board fetch; on timeout the fetch aborts → that board → []

// --- Defensive coercion (the feed mixes string/number; never blanket-cast) ---
const asStr = (v: any): string => (v == null ? '' : String(v));
const asNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// --- Exported shape (the normalized ESPN singles match; the route + mobile consume this) ---
export interface EspnTennisMatch {
  espnId: string;            // competition.id (string)
  tour: 'atp' | 'wta';
  category: string;          // competition.type.text — "Men's Singles" | "Women's Singles"
  home: string; away: string;             // competitor with homeAway==='home'/'away' → athlete.displayName
  homeFlag?: string; awayFlag?: string;   // athlete.flag.href (full https PNG url; omitted if absent)
  homeFlagAlt?: string; awayFlagAlt?: string; // athlete.flag.alt (country name, e.g. "USA")
  homeSeed?: number; awaySeed?: number;   // curatedRank.current — OMITTED when the key is absent (unseeded)
  sets: { home: number; away: number }[]; // home vs away linescores[].value zipped by set index
  round?: string;            // competition.round.displayName ("Round 1")
  court?: string;            // competition.venue.court ("No. 2 Court")
  statusDetail?: string;     // status.type.detail ("3rd Set")
  isLive: true;
  sortRank?: number;         // min(homeSeed, awaySeed) of whichever exist; undefined if NEITHER seeded
}

// --- Fetch helper: keyless GET with an AbortController timeout. Returns parsed JSON or null. ---
async function boardFetch(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // timeout / network / parse error → null, never throw
  } finally {
    clearTimeout(timer);
  }
}

// --- 30s cache for the merged list (single entry; both boards share it) ---
const LIST_TTL = 30_000;
let listCache: { t: number; data: EspnTennisMatch[] } | null = null;

// Singles only — drop doubles/mixed/team categories.
function isSinglesCategory(text: string): boolean {
  return text === "Men's Singles" || text === "Women's Singles";
}

// Find the competitor entry by homeAway side (NOT by `order` — order is not home-first).
function competitorBySide(competitors: any[], side: 'home' | 'away'): any | null {
  for (const p of competitors) if (p?.homeAway === side) return p;
  return null;
}

// Parse one competition (already known live + singles) into a match, tagged with its board. Returns
// null when the essential players can't be resolved (best-effort: skip, don't crash).
function parseCompetition(comp: any, tour: 'atp' | 'wta'): EspnTennisMatch | null {
  const competitors: any[] = Array.isArray(comp?.competitors) ? comp.competitors : [];
  const homeC = competitorBySide(competitors, 'home');
  const awayC = competitorBySide(competitors, 'away');
  if (!homeC || !awayC) return null;

  const home = asStr(homeC.athlete?.displayName);
  const away = asStr(awayC.athlete?.displayName);
  if (!home || !away) return null;

  const match: EspnTennisMatch = {
    espnId: asStr(comp.id),
    tour,
    category: asStr(comp.type?.text),
    home,
    away,
    sets: [],
    isLive: true,
  };

  // Flags — full https PNG url + country-name alt. Omit each field when absent (best-effort).
  const homeFlag = homeC.athlete?.flag?.href;
  const awayFlag = awayC.athlete?.flag?.href;
  if (homeFlag) match.homeFlag = asStr(homeFlag);
  if (awayFlag) match.awayFlag = asStr(awayFlag);
  const homeFlagAlt = homeC.athlete?.flag?.alt;
  const awayFlagAlt = awayC.athlete?.flag?.alt;
  if (homeFlagAlt) match.homeFlagAlt = asStr(homeFlagAlt);
  if (awayFlagAlt) match.awayFlagAlt = asStr(awayFlagAlt);

  // Seed — ONLY when the curatedRank KEY is present (it is ABSENT, not null, for unseeded players).
  if ('curatedRank' in homeC && homeC.curatedRank?.current != null) match.homeSeed = asNum(homeC.curatedRank.current);
  if ('curatedRank' in awayC && awayC.curatedRank?.current != null) match.awaySeed = asNum(awayC.curatedRank.current);

  // Set grid — zip the two competitors' linescores by index (guard unequal lengths → use the shorter).
  const homeLs: any[] = Array.isArray(homeC.linescores) ? homeC.linescores : [];
  const awayLs: any[] = Array.isArray(awayC.linescores) ? awayC.linescores : [];
  const n = Math.min(homeLs.length, awayLs.length);
  for (let i = 0; i < n; i++) {
    match.sets.push({ home: asNum(homeLs[i]?.value), away: asNum(awayLs[i]?.value) });
  }

  // Descriptive fields (all optional, omit when absent).
  const round = comp.round?.displayName;
  if (round) match.round = asStr(round);
  const court = comp.venue?.court;
  if (court) match.court = asStr(court);
  const statusDetail = comp.status?.type?.detail;
  if (statusDetail) match.statusDetail = asStr(statusDetail);

  // sortRank — min of whichever seeds exist; undefined when NEITHER player is seeded.
  const seeds = [match.homeSeed, match.awaySeed].filter((s): s is number => typeof s === 'number');
  if (seeds.length) match.sortRank = Math.min(...seeds);

  return match;
}

// Walk one board's JSON → its live-singles matches, in feed order. Best-effort: bad shape → [].
function parseBoard(json: any, tour: 'atp' | 'wta'): EspnTennisMatch[] {
  const out: EspnTennisMatch[] = [];
  const events: any[] = Array.isArray(json?.events) ? json.events : [];
  for (const ev of events) {
    const groupings: any[] = Array.isArray(ev?.groupings) ? ev.groupings : [];
    for (const g of groupings) {
      const comps: any[] = Array.isArray(g?.competitions) ? g.competitions : [];
      for (const comp of comps) {
        if (comp?.status?.type?.state !== 'in') continue;
        if (!isSinglesCategory(asStr(comp?.type?.text))) continue;
        const m = parseCompetition(comp, tour);
        if (m) out.push(m);
      }
    }
  }
  return out;
}

// Public: ALL live singles across BOTH tours, seeded-first then unseeded (stable feed order). Cached
// ~30s. Best-effort: a failed board contributes nothing; total failure → []. Never throws.
export async function getEspnSinglesLive(): Promise<EspnTennisMatch[]> {
  const now = Date.now();
  if (listCache && now - listCache.t < LIST_TTL) return listCache.data;

  // Fetch both boards in parallel; one board failing must not sink the other.
  const [atpJson, wtaJson] = await Promise.all([boardFetch(ATP), boardFetch(WTA)]);
  const merged = [
    ...(atpJson ? parseBoard(atpJson, 'atp') : []),
    ...(wtaJson ? parseBoard(wtaJson, 'wta') : []),
  ];

  // Stable sort: seeded matches (have sortRank) ascending first, then unseeded in original feed order.
  const seeded = merged.filter(m => typeof m.sortRank === 'number');
  const unseeded = merged.filter(m => typeof m.sortRank !== 'number');
  seeded.sort((a, b) => (a.sortRank as number) - (b.sortRank as number));
  const data = [...seeded, ...unseeded];

  listCache = { t: now, data };
  return data;
}
