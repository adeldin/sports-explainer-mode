// Tennis live provider — a PARALLEL data source (mirrors golfLeaderboardProvider.ts), NOT an enricher.
// Source: RapidAPI tennis-api-atp-wta-itf. Two endpoints — live events (all in-play matches) and a
// per-match game-by-game timeline (holds/breaks). It REUSES golf's discipline: server-side key,
// best-effort degrade (EVERY failure path returns null/empty, NEVER throws), defensive parsing, and
// TTL Map caches. The caches are MANDATORY — the BASIC plan rate-limits per SECOND, so uncached
// polling 429s in prod. ISLAND until Gate 2: nothing imports this yet (no route/dataProvider/enricher
// wiring), so creating it changes no behavior.

const BASE = 'https://tennis-api-atp-wta-itf.p.rapidapi.com';
const HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com';
const KEY = process.env.RAPIDAPI_KEY;
const FETCH_TIMEOUT = 2500; // ms — bound the call (gumbo pattern); on timeout the fetch aborts → null

// --- Defensive parsing (the feed mixes string/number; never blanket-cast) ---
const asStr = (v: any): string => (v == null ? '' : String(v));
const asNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// --- Exported shapes (the new normalized tennis shape; Gate 2's wiring consumes these) ---
export interface TennisGame {
  home: string;        // participant1
  away: string;        // participant2
  server: 'home' | 'away' | null;   // from indicator: "0,1" → away serving; "1,0" → home; else null
  sets: { home: number; away: number }[];   // parsed from score "6-2,6-4,4-0" (last entry = in-progress set)
  currentGame: { home: string; away: string } | null;  // from points "30-40" → {home:'30', away:'40'}
  status: string;      // raw status, e.g. "InPlay"
  isLive: boolean;     // status === 'InPlay'
  league: string;
  rawId: string;       // event.id (keys the timeline)
}

export interface TennisTimelineEntry {
  game: number;        // "Game 7 ..." → 7
  player: string;      // the player who WON that game (result-owner): 'hold'=held own serve, 'break'=broke opponent. NOT the server.
  result: 'hold' | 'break';
  closeAt: string;     // "to 40" / "to love" → "40" / "love"
}

// --- Fetch helper: golf's marketplace headers + gumbo's AbortController timeout ---
function tennisFetch(path: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  return fetch(`${BASE}${path}`, {
    headers: { 'x-rapidapi-host': HOST, 'x-rapidapi-key': KEY || '' },
    cache: 'no-store',
    signal: ctrl.signal,
  }).finally(() => clearTimeout(timer));
}

// --- TTL caches (mirror golf; ~30s each — the live list + per-id timeline). MANDATORY for the
//     per-second BASIC rate limit: a polling caller must not re-hit the API every render. ---
const LIVE_TTL = 30_000;
const TIMELINE_TTL = 30_000;
let liveCache: { t: number; data: TennisGame[] } | null = null;
const timelineCache = new Map<string, { t: number; data: TennisTimelineEntry[] }>();

// --- Parsers (the make-or-break correctness points) ---

// indicator "0,1" → server. parts[0]==='1' → home; parts[1]==='1' → away; neither → null.
function parseServer(indicator: any): 'home' | 'away' | null {
  const parts = asStr(indicator).split(',').map(s => s.trim());
  if (parts[0] === '1') return 'home';
  if (parts[1] === '1') return 'away';
  return null;
}

// score "6-2,6-4,4-0" → [{home,away}, …]. Keep ALL entries (completed + the in-progress last one).
// Skip malformed segments rather than crash.
function parseSets(score: any): { home: number; away: number }[] {
  const out: { home: number; away: number }[] = [];
  for (const seg of asStr(score).split(',')) {
    const m = seg.trim().match(/^(\d+)-(\d+)$/);
    if (!m) continue;
    out.push({ home: asNum(m[1]), away: asNum(m[2]) });
  }
  return out;
}

// points "30-40" → {home:'30', away:'40'}. KEEP AS STRINGS ('0'|'15'|'30'|'40'|'AD' all valid — do NOT
// coerce). "0-0" at match start → {home:'0',away:'0'} (kept). Missing/malformed → null.
function parseCurrentGame(points: any): { home: string; away: string } | null {
  const p = asStr(points);
  if (!p) return null;
  const parts = p.split('-').map(s => s.trim());
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return null;
  return { home: parts[0], away: parts[1] };
}

// "Game 7 - Titouan Droguet - breaks to 40" → entry. Tolerant: non-matching lines → null (skipped).
function parseTimelineText(text: any): TennisTimelineEntry | null {
  const m = asStr(text).match(/^Game (\d+) - (.+?) - (breaks|holds) to (\w+)$/);
  if (!m) return null;
  return { game: asNum(m[1]), player: m[2], result: m[3] === 'breaks' ? 'break' : 'hold', closeAt: m[4] };
}

// --- Public API ---

// ALL live tennis matches, parsed. Cached ~30s. Returns null only on total failure (no key / fetch
// error / non-200 / bad JSON). Does NOT filter by live — sets isLive per match; the caller filters.
export async function getLiveTennisMatches(): Promise<TennisGame[] | null> {
  if (!KEY) return null;
  const now = Date.now();
  if (liveCache && now - liveCache.t < LIVE_TTL) return liveCache.data;
  try {
    const res = await tennisFetch('/tennis/v2/extend/api/events/live');
    if (!res.ok) return null;
    const json: any = await res.json();
    const results: any[] = Array.isArray(json?.results) ? json.results : [];
    const games: TennisGame[] = results.map((e: any): TennisGame => {
      const status = asStr(e?.status);
      return {
        home: asStr(e?.participant1),
        away: asStr(e?.participant2),
        server: parseServer(e?.indicator),
        sets: parseSets(e?.score),
        currentGame: parseCurrentGame(e?.points),
        status,
        isLive: status === 'InPlay',
        league: asStr(e?.league),
        rawId: asStr(e?.id),
      };
    });
    liveCache = { t: now, data: games };
    return games;
  } catch {
    return null; // best-effort: timeout / network / parse error → null, never throw
  }
}

// The game-by-game timeline for one match id. Cached ~30s. Returns null on failure OR empty
// (no parseable entries). Best-effort: never throws.
export async function getTennisTimeline(rawId: string): Promise<TennisTimelineEntry[] | null> {
  if (!KEY || !rawId) return null;
  const now = Date.now();
  const cached = timelineCache.get(rawId);
  if (cached && now - cached.t < TIMELINE_TTL) return cached.data;
  try {
    const res = await tennisFetch(`/tennis/v2/extend/api/event/timeline/${encodeURIComponent(rawId)}`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const results: any[] = Array.isArray(json?.results) ? json.results : [];
    const entries: TennisTimelineEntry[] = [];
    for (const r of results) {
      const e = parseTimelineText(r?.text);
      if (e) entries.push(e);
    }
    if (entries.length === 0) return null;
    timelineCache.set(rawId, { t: now, data: entries });
    return entries;
  } catch {
    return null;
  }
}
