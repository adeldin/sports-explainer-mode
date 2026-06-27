// Golf live-leaderboard provider — a PARALLEL data source, NOT an enricher. Recon proved golf does
// not fit the enricher model (getGameData('golf') returns null on the learn-mode short-circuit; a
// 72-player leaderboard has no home/away identity; the source is RapidAPI live-golf-data, not ESPN).
// So this is a sibling provider with its OWN shape (Leaderboard/LeaderboardRow). It REUSES the
// enricher's discipline — server-side key, best-effort degrade (null on any failure → the app keeps
// showing today's ESPN thin leader line), TTL cache, recursive Extended-JSON unwrap — but touches
// neither the enricher registry nor getGameData. Additive only: golf keeps learnMode everywhere.
//
// This build hits ONLY /schedule and /leaderboard. NEVER /scorecard (the 20/14h bucket is precious,
// reserved for a later lazy drill-in build).

const BASE = 'https://live-golf-data.p.rapidapi.com';
const HOST = 'live-golf-data.p.rapidapi.com';
const KEY = process.env.RAPIDAPI_KEY;

// --- The new normalized shape (exported — Build 2's UI + Build 3's teaching layer consume this) ---
export interface LeaderboardRound {
  roundId: number;
  scoreToPar: string;     // "-6" (kept as the display string)
  strokes: number;
  courseName: string;
}
export interface LeaderboardRow {
  playerId: string;
  name: string;           // firstName + lastName joined (the source has no single name field)
  position: string;       // "1" / "T3" — DISPLAY string, keeps the tie "T" prefix
  total: string;          // "-20" — to-par, display string
  today: string;          // currentRoundScore "-4"
  thru: string;           // "17" while playing, "F" when the round's done
  roundComplete: boolean;
  isAmateur: boolean;
  status: string;         // "active" / "complete"
  teeTime?: string;       // "2:00pm"
  rounds: LeaderboardRound[];
}
export interface Leaderboard {
  tournId: string;
  name?: string;          // tournament name (threaded from the schedule lookup)
  status: string;         // "In Progress" / "Official" …
  currentRound?: number;
  roundStatus?: string;
  // Authoritative live-vs-final flag, derived from the SCHEDULE window (not the leaderboard's status
  // string). isLive=true → a tournament is currently in its (padded) window; false → this is the
  // most-recently-ended tournament, shown as a "Final · {date}" board. endDate = date.end (epoch ms).
  isLive: boolean;
  endDate?: number;
  rows: LeaderboardRow[];
}

// --- Recursive Extended-JSON unwrap (MANDATORY — the source wraps every number/date). Mirrors the
//     recon spike: {"$numberInt":"4"}→4, {"$numberLong":"…"}→number, {"$date":{...}}→ms, etc. ---
function unwrap(x: any): any {
  if (Array.isArray(x)) return x.map(unwrap);
  if (x && typeof x === 'object') {
    if ('$numberInt' in x) return parseInt(x.$numberInt, 10);
    if ('$numberLong' in x) return Number(x.$numberLong);
    if ('$numberDouble' in x) return parseFloat(x.$numberDouble);
    if ('$numberDecimal' in x) return parseFloat(x.$numberDecimal);
    if ('$date' in x) return unwrap(x.$date);   // {$date:{$numberLong:"…"}} → ms number
    const out: Record<string, any> = {};
    for (const k of Object.keys(x)) out[k] = unwrap(x[k]);
    return out;
  }
  return x;
}

// Per-field coercion helpers — strings stay strings (position/total/thru carry display semantics),
// ints are parsed defensively. Never blanket-cast (mixed types per field, recon landmine #2).
const asStr = (v: any): string => (v == null ? '' : String(v));
const asNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const asBool = (v: any): boolean => v === true;

function golfFetch(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: { 'x-rapidapi-host': HOST, 'x-rapidapi-key': KEY || '' },
    cache: 'no-store',
  });
}

// --- Caches (no framework): the live tournId is stable for a tournament window (5 min TTL is plenty);
//     the leaderboard is cached ~45s so a polling client doesn't burn the 250-request budget. ---
let tournCache: { t: number; id: string | null; name?: string; isLive: boolean; endDate?: number } | null = null;
const TOURN_TTL = 5 * 60_000;
const lbCache = new Map<string, { t: number; data: Leaderboard }>();
const LB_TTL = 45_000;

// Resolve the tournament to show from the schedule: LIVE first (window spans now, padded +1 day to
// cover the final round), else fall back to the MOST-RECENTLY-ENDED (latest date.end <= now) so golf
// shows a rich board year-round instead of dropping to the thin line. NEVER hardcode an example id —
// they're perishable. Returns null only when the schedule is empty/unfetchable (→ ESPN thin line).
export async function getCurrentTournId(): Promise<{ id: string; name?: string; isLive: boolean; endDate?: number } | null> {
  if (!KEY) return null;
  const now = Date.now();
  if (tournCache && now - tournCache.t < TOURN_TTL) {
    return tournCache.id ? { id: tournCache.id, name: tournCache.name, isLive: tournCache.isLive, endDate: tournCache.endDate } : null;
  }
  try {
    const year = new Date().getFullYear();
    const res = await golfFetch(`/schedule?orgId=1&year=${year}`);
    if (!res.ok) { tournCache = { t: now, id: null, isLive: false }; return null; }
    const data = unwrap(await res.json());
    const sched: any[] = Array.isArray(data?.schedule) ? data.schedule : [];
    const DAY = 86_400_000;
    const hasWindow = (t: any) => typeof t?.date?.start === 'number' && typeof t?.date?.end === 'number';

    // PRIMARY (unchanged behavior when something IS live): window spans now (padded final round).
    const live = sched.find((t: any) => hasWindow(t) && t.date.start <= now && now <= t.date.end + DAY && t?.tournId);

    // FALLBACK: most-recently-ENDED tournament (latest date.end past the padded live window).
    const recent = !live
      ? sched
          .filter((t: any) => hasWindow(t) && t.date.end + DAY < now && t?.tournId)
          .sort((a: any, b: any) => b.date.end - a.date.end)[0]
      : undefined;

    const chosen = live || recent;
    if (!chosen?.tournId) { tournCache = { t: now, id: null, isLive: false }; return null; }

    const id = String(chosen.tournId);
    const name = chosen.name ? String(chosen.name) : undefined;
    const endDate = typeof chosen?.date?.end === 'number' ? chosen.date.end : undefined;
    const isLive = !!live;
    tournCache = { t: now, id, name, isLive, endDate };
    return { id, name, isLive, endDate };
  } catch {
    // Best-effort: a schedule failure means "no leaderboard" → the app keeps the ESPN thin line.
    tournCache = { t: now, id: null, isLive: false };
    return null;
  }
}

function mapRow(r: any): LeaderboardRow {
  const name = `${asStr(r?.firstName)} ${asStr(r?.lastName)}`.trim();
  const rounds: LeaderboardRound[] = Array.isArray(r?.rounds)
    ? r.rounds.map((rd: any) => ({
        roundId: asNum(rd?.roundId),
        scoreToPar: asStr(rd?.scoreToPar),
        strokes: asNum(rd?.strokes),
        courseName: asStr(rd?.courseName),
      }))
    : [];
  return {
    playerId: asStr(r?.playerId),
    name,
    position: asStr(r?.position),                 // keep "T3" tie prefix for display
    total: asStr(r?.total),                       // "-20"
    today: asStr(r?.currentRoundScore),           // "-4"
    thru: asStr(r?.thru),                         // "17" or "F"
    roundComplete: asBool(r?.roundComplete),
    isAmateur: asBool(r?.isAmateur),
    status: asStr(r?.status),
    teeTime: r?.teeTime != null ? asStr(r.teeTime) : undefined,
    rounds,
  };
}

// THE entry point. Resolve the live tournId → fetch + normalize the leaderboard. Best-effort: ANY
// failure (no key, nothing live, fetch error, parse miss, rate-limit) returns null and NEVER throws.
export async function fetchGolfLeaderboard(): Promise<Leaderboard | null> {
  if (!KEY) return null;
  try {
    const tourn = await getCurrentTournId();
    if (!tourn) return null;                       // nothing live → app keeps the ESPN thin line

    const cached = lbCache.get(tourn.id);
    if (cached && Date.now() - cached.t < LB_TTL) return cached.data;

    const year = new Date().getFullYear();
    const res = await golfFetch(`/leaderboard?orgId=1&tournId=${tourn.id}&year=${year}`);
    if (!res.ok) return null;
    const data = unwrap(await res.json());
    const rawRows: any[] = Array.isArray(data?.leaderboardRows) ? data.leaderboardRows : [];

    const board: Leaderboard = {
      tournId: tourn.id,
      name: tourn.name,
      status: asStr(data?.status),
      currentRound: data?.roundId != null ? asNum(data.roundId) : undefined,
      roundStatus: data?.roundStatus != null ? asStr(data.roundStatus) : undefined,
      isLive: tourn.isLive,                        // schedule-derived live-vs-final (authoritative)
      endDate: tourn.endDate,                      // for the "Final · {date}" label
      rows: rawRows.map(mapRow),                   // rows arrive PRE-SORTED (leader first) — no sort
    };
    lbCache.set(tourn.id, { t: Date.now(), data: board });
    return board;
  } catch {
    return null;
  }
}
