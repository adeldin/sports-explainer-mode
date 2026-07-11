// Zyla rugby live provider — a PARALLEL data source for the World Rugby Nations Cup (the second-tier
// tournament ESPN's Core API does NOT carry). Mirrors tennisProvider.ts's security + resilience shape:
// server-side key (NEVER leaves the backend), best-effort degrade (EVERY failure path returns []/stub,
// NEVER throws), defensive parsing, AbortController timeout, and a MANDATORY in-memory TTL cache.
// ISLAND until wired: /api/rugby-live (Gate 2) imports getNationsCupBoard; explain's fetchZylaGameData
// (Gate 4) will import getNationsCupMatch. No sport uses provider:'zyla' yet, so this changes nothing.

const KEY = process.env.ZYLA_API_KEY;
const BASE = 'https://zylalabs.com/api/796/rugby+live+data+api';
const FETCH_TIMEOUT = 2500; // ms — bound the call; on timeout the fetch aborts → [] (best-effort)

// --- Canonical Game shape emitted to the mobile client (matches lib/scoreboard.ts:19-52's required
//     fields and types): scores are STRING; startTime is epoch-ms NUMBER (optional — consumed by the
//     Watch-Next window filters). ---
export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
  isLive: boolean;
  sport: string;
  state: 'pre' | 'in' | 'post';
  startTime?: number;
  venue?: string;   // canonical Game.venue — retained when present
  stage?: string;   // canonical Game.stage — e.g. "Pool A"; retained when present
}

// --- Defensive parsing (the feed may mix string/number; never blanket-cast) ---
const asStr = (v: any): string => (v == null ? '' : String(v));

// Map a raw fixture status label → coarse state. Zyla's status vocabulary is CONFIRMED (the API's
// fields dictionary): "Not Started", "First Half", "Half Time", "Second Half", "Full Time",
// "Postponed", "Cancelled", "Result". Matched case-insensitively + trimmed for defense.
function deriveState(raw: string): 'pre' | 'in' | 'post' {
  const s = raw.trim().toLowerCase();
  if (s === 'full time' || s === 'result') return 'post';
  if (s === 'first half' || s === 'half time' || s === 'second half') return 'in';
  return 'pre'; // "Not Started" / "Postponed" / "Cancelled" / any unknown → 'pre'
}

// --- Request helper: single Authorization: Bearer header (Zyla direct, NOT RapidAPI-fronted) + the
//     exact tennisProvider AbortController+timeout pattern (timer cleared in .finally). ---
function zylaFetch(path: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  return fetch(`${BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${KEY || ''}` },
    cache: 'no-store',
    signal: ctrl.signal,
  }).finally(() => clearTimeout(timer));
}

// --- MANDATORY TTL cache (mirrors tennisProvider's liveCache). 60s live-score freshness bounds Zyla
//     hits under a polling caller — a live board doesn't change faster than that in practice. ---
const BOARD_TTL = 60_000; // 60s
let boardCache: { t: number; data: Game[] } | null = null;

// --- Public API ---

// The full World Rugby Nations Cup board (comp_id 726, season 2026), normalized to canonical Game[].
// Best-effort: no key / fetch error / non-200 / bad JSON → [] (never throws). Cached ~60s.
export async function getNationsCupBoard(): Promise<Game[]> {
  if (!KEY) return [];
  const now = Date.now();
  if (boardCache && now - boardCache.t < BOARD_TTL) return boardCache.data;
  try {
    const res = await zylaFetch('/534/get+fixtures?comp_id=726&season=2026');
    if (!res.ok) return [];
    const json: any = await res.json();
    const fixtures: any[] = Array.isArray(json?.results) ? json.results : [];
    const games: Game[] = [];
    for (const f of fixtures) {
      try {
        const rawStatus = asStr(f?.status);
        const state = deriveState(rawStatus);
        const ms = Date.parse(asStr(f?.date));
        const venue = asStr(f?.venue);
        const stage = asStr(f?.stage);
        games.push({
          id: asStr(f?.id),
          homeTeam: asStr(f?.home),
          awayTeam: asStr(f?.away),
          homeScore: asStr(f?.home_score),
          awayScore: asStr(f?.away_score),
          status: rawStatus,
          isLive: state === 'in',
          sport: 'nationscup',
          state,
          startTime: Number.isFinite(ms) ? ms : undefined,
          ...(venue ? { venue } : {}),
          ...(stage ? { stage } : {}),
        });
      } catch {
        continue; // skip a single malformed fixture rather than drop the whole board
      }
    }
    boardCache = { t: now, data: games };
    return games;
  } catch {
    return []; // best-effort: timeout / network / parse error → [], never throw
  }
}

// Per-match detail for the explain path (Gate 4 fills the body). Stub returns the shape the caller
// expects — defaults only — so wiring it in changes no behavior until the real fetch lands.
export async function getNationsCupMatch(
  matchId: string,
): Promise<{ play: string; gameContext: string; homeTeam: string; awayTeam: string; events: any[] }> {
  // TODO Gate 4: GET the per-match play/events from Zyla and normalize into explain's shape.
  return { play: '', gameContext: '', homeTeam: '', awayTeam: '', events: [] };
}
