// Zyla rugby live provider — a PARALLEL data source for the World Rugby Nations Cup (the second-tier
// tournament ESPN's Core API does NOT carry). Mirrors tennisProvider.ts's security + resilience shape:
// server-side key (NEVER leaves the backend), best-effort degrade (EVERY failure path returns []/stub,
// NEVER throws), defensive parsing, AbortController timeout, and a MANDATORY in-memory TTL cache.
// ISLAND until wired: /api/rugby-live (Gate 2) imports getNationsCupBoard; explain's fetchZylaGameData
// (Gate 4) will import getNationsCupMatch. nationscup (comp_id 726) is now wired to provider:'zyla'.

import { type MatchEvent } from './dataProvider';
import { cachedFetch } from './explanationCache';

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
  // Team flag/crest presentation values (cricket national sides today). Emoji OR an https URL —
  // the mobile renderer branches Text-vs-Image on the value. Optional + unset by every non-cricket
  // builder, so existing sports' emitted JSON is byte-identical.
  homeFlag?: string;
  awayFlag?: string;
  // Match format (cricket today: "T20" / "ODI" / "Test"). Drives the extension's cricket
  // format dropdown. Optional + unset by every non-cricket builder — additive, so existing
  // consumers (the iOS app ignores unknown fields) are unaffected.
  format?: string;
}

// --- Defensive parsing (the feed may mix string/number; never blanket-cast) ---
const asStr = (v: any): string => (v == null ? '' : String(v));
const asNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

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
// Best-effort: no key / fetch error / non-200 / bad JSON → [] (never throws). L1 in-memory 60s; L2
// Upstash 45s flat (Gate 5) when CACHE_ENABLED=1.
export async function getNationsCupBoard(): Promise<Game[]> {
  if (!KEY) return [];
  const now = Date.now();
  if (boardCache && now - boardCache.t < BOARD_TTL) return boardCache.data;   // L1 (in-memory) first
  try {
    // L1 miss → L2 (Upstash, 45s — board carries live games, must stay fresh) → Zyla. cachedFetch no-ops
    // when CACHE_ENABLED is unset, collapsing to Gate-4's direct fetch. The fetcher THROWS on failure so
    // a bad fetch is never cached; a legit empty board (off-season) IS cacheable and self-heals in 45s.
    const games = await cachedFetch('zyla_board', 'nationscup:2026', 45, async (): Promise<Game[]> => {
      const res = await zylaFetch('/534/get+fixtures?comp_id=726&season=2026');
      if (!res.ok) throw new Error(`zyla board ${res.status}`);
      const json: any = await res.json();
      const fixtures: any[] = Array.isArray(json?.results) ? json.results : [];
      const out: Game[] = [];
      for (const f of fixtures) {
        try {
          const rawStatus = asStr(f?.status);
          const state = deriveState(rawStatus);
          const ms = Date.parse(asStr(f?.date));
          const venue = asStr(f?.venue);
          const stage = asStr(f?.stage);
          out.push({
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
      return out;
    });
    boardCache = { t: now, data: games };   // write-through L1
    return games;
  } catch {
    return []; // best-effort: upstream/cache failure → [], never throw (failure NOT cached)
  }
}

// The explain-path return shape. `events` is MatchEvent[] (route.ts's contract), but note the explain
// route's fetchGameData/`else` branch consumes gameContext ONLY — the "Recent events:" injection is
// enriched-path (soccer/mlb) exclusive and does NOT fire for nationscup. So the event narrative + stats
// are baked INTO gameContext here; `events` is returned for shape parity / future Match-Timeline use.
type MatchDetail = { play: string; gameContext: string; homeTeam: string; awayTeam: string; events: MatchEvent[]; homeStats?: RugbyTeamStats; awayStats?: RugbyTeamStats; state?: 'pre' | 'in' | 'post'; minute?: number; homeScore?: number; awayScore?: number };

// Sane non-empty fallback (matches fetchGameData's !cfg defaults) → the explain is never blank/thin even
// on total Zyla failure; the LLM still has sportContext.nationscup to work from.
const MATCH_EMPTY: MatchDetail = { play: 'A key play just happened', gameContext: 'Live game in progress', homeTeam: '', awayTeam: '', events: [] };

const MATCH_TTL = 120_000; // 120s L1 — Gate 5 adds L2 Upstash (60s flat); Path A later makes finished ('Result') matches long-lived
const matchCache = new Map<string, { t: number; data: MatchDetail }>();

// Pull one value from a Zyla team_stats block. CONFIRMED shape: team_stats is a DICT keyed by group
// (attack/defence/discipline/kicking/breakdown/lineouts/scrums/possession), each group a LIST of
// { stat: string, value: string } pairs. Defensive — missing group/stat → undefined, never throws.
function getStat(teamStats: any, group: string, statName: string): string | undefined {
  const arr = teamStats?.[group];
  if (!Array.isArray(arr)) return undefined;
  const hit = arr.find((p: any) => p?.stat === statName);
  return hit ? asStr(hit.value) : undefined;
}

// Structured per-side rugby stats for the (future) Coach's Read path. All optional: a missing group or
// stat stays undefined. Numbers throughout. NOTE the confirmed Zyla quirks preserved in the mapper:
// some keys live cross-group (turnovers_won under 'defence', turnovers_conceded under 'attack'), the
// lineout-lost key is misspelled 'lineouts_Lost' (capital L), and offloads is singular 'offload'.
export interface RugbyTeamStats {
  possessionPct?: number;
  penaltiesConceded?: number;
  yellowCards?: number;
  redCards?: number;
  turnoversWon?: number;
  turnoversConceded?: number;
  lineoutsWon?: number;
  lineoutsLost?: number;
  lineoutSuccessPct?: number;
  scrumsWon?: number;
  scrumsLost?: number;
  rucksWon?: number;
  rucksTotal?: number;
  carriesMetres?: number;
  cleanBreaks?: number;
  offloads?: number;
  defendersBeaten?: number;
  gainLineCrossed?: number;
  gainLineFailed?: number;
  tackles?: number;
  missedTackles?: number;
}

// Map one side's raw Zyla team_stats block → structured RugbyTeamStats. Every field is best-effort:
// a missing group/stat or non-numeric value → undefined (never throws). Keys are the EXACT confirmed
// /538 spellings — do not "correct" 'lineouts_Lost' (capital L) or 'offload' (singular).
function buildRugbyTeamStats(teamStats: any): RugbyTeamStats {
  const num = (v: string | undefined): number | undefined => {
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const poss = num(getStat(teamStats, 'possession', 'possession'));
  const lineoutSucc = num(getStat(teamStats, 'lineouts', 'lineout_success'));
  return {
    possessionPct: poss == null ? undefined : Math.round(poss * 100),
    penaltiesConceded: num(getStat(teamStats, 'discipline', 'penalties_conceded')),
    yellowCards: num(getStat(teamStats, 'discipline', 'yellow_cards')),
    redCards: num(getStat(teamStats, 'discipline', 'red_cards')),
    turnoversWon: num(getStat(teamStats, 'defence', 'turnovers_won')),        // cross-group: under 'defence'
    turnoversConceded: num(getStat(teamStats, 'attack', 'turnovers_conceded')), // cross-group: under 'attack'
    lineoutsWon: num(getStat(teamStats, 'lineouts', 'lineouts_won')),
    lineoutsLost: num(getStat(teamStats, 'lineouts', 'lineouts_Lost')),        // Zyla typo — capital L, match exactly
    lineoutSuccessPct: lineoutSucc == null ? undefined : Math.round(lineoutSucc * 100),
    scrumsWon: num(getStat(teamStats, 'scrums', 'scrums_won')),
    scrumsLost: num(getStat(teamStats, 'scrums', 'scrums_lost')),
    rucksWon: num(getStat(teamStats, 'breakdown', 'rucks_won')),
    rucksTotal: num(getStat(teamStats, 'breakdown', 'rucks_total')),
    carriesMetres: num(getStat(teamStats, 'attack', 'carries_metres')),
    cleanBreaks: num(getStat(teamStats, 'attack', 'clean_breaks')),
    offloads: num(getStat(teamStats, 'attack', 'offload')),                   // singular 'offload'
    defendersBeaten: num(getStat(teamStats, 'attack', 'defenders_beaten')),
    gainLineCrossed: num(getStat(teamStats, 'attack', 'carries_crossed_gain_line')),
    gainLineFailed: num(getStat(teamStats, 'attack', 'carries_not_made_gain_line')),
    tackles: num(getStat(teamStats, 'defence', 'tackles')),
    missedTackles: num(getStat(teamStats, 'defence', 'missed_tackles')),
  };
}

// Per-match detail for the explain path — real Zyla events + team stats, baked into gameContext.
// Best-effort: no key / no id / non-200 / bad JSON → MATCH_EMPTY (never throws). L1 in-memory 120s; L2
// Upstash 60s flat (Gate 5) when CACHE_ENABLED=1.
export async function getNationsCupMatch(matchId: string): Promise<MatchDetail> {
  if (!KEY || !matchId) return MATCH_EMPTY;
  const now = Date.now();
  const cached = matchCache.get(matchId);
  if (cached && now - cached.t < MATCH_TTL) return cached.data;   // L1 (in-memory) first
  try {
    // L1 miss → L2 (Upstash, 60s flat) → Zyla. cachedFetch no-ops when CACHE_ENABLED is unset, so this
    // collapses to Gate-4's direct fetch. The fetcher THROWS on failure → a bad fetch is never cached.
    const detail = await cachedFetch('zyla_match', matchId, 60, async (): Promise<MatchDetail> => {
      const res = await zylaFetch(`/538/get+match+data?match_id=${encodeURIComponent(matchId)}`);
      if (!res.ok) throw new Error(`zyla match ${res.status}`);
      const json: any = await res.json();
      const results: any = json?.results ?? {};
      const m: any = results?.match ?? {};
      const evs: any[] = Array.isArray(results?.events) ? results.events : [];

      const homeName = asStr(m?.home_team);
      const awayName = asStr(m?.away_team);

      // events → MatchEvent[] ({ minute?, type?, team?, player?, detail? } — route.ts:24 shape).
      const events: MatchEvent[] = evs.map((e: any): MatchEvent => ({
        minute: asNum(e?.time),
        type: asStr(e?.type),
        team: asStr(e?.home_or_away) === 'home' ? homeName : awayName,
        player: asStr(e?.player_1_name) + (e?.player_2_name ? ` (for ${asStr(e?.player_2_name)})` : ''),
        detail: asStr(e?.type),
      }));

      // gameContext: score + the rugby scoring breakdown.
      let gameContext =
        `${homeName} ${asStr(m?.home_score)} - ${asStr(m?.away_score)} ${awayName} (${asStr(m?.status)}). ` +
        `Tries: ${asStr(m?.home_tries)}-${asStr(m?.away_tries)}, ` +
        `Conversions: ${asStr(m?.home_conversions)}-${asStr(m?.away_conversions)}, ` +
        `Penalties: ${asStr(m?.home_penalties)}-${asStr(m?.away_penalties)}, ` +
        `Drop goals: ${asStr(m?.home_drop_goals)}-${asStr(m?.away_drop_goals)}. `;

      // "Match stats:" line — each sub-part is included ONLY when BOTH sides expose the value (else omit).
      const hs = results?.home?.team_stats;
      const as = results?.away?.team_stats;
      // Structured per-side stats for the (future) Coach's Read path — purely additive, ignored by the
      // explain path (which reads only play/gameContext/homeTeam/awayTeam).
      const homeStats = hs ? buildRugbyTeamStats(hs) : undefined;
      const awayStats = as ? buildRugbyTeamStats(as) : undefined;
      let statsLine = '';

      // Possession: a decimal fraction string ("0.56") → percent.
      const hPoss = getStat(hs, 'possession', 'possession');
      const aPoss = getStat(as, 'possession', 'possession');
      const pct = (v: string): string | undefined => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? `${Math.round(n * 100)}%` : undefined;
      };
      if (hPoss !== undefined && aPoss !== undefined) {
        const hp = pct(hPoss), ap = pct(aPoss);
        if (hp && ap) statsLine += `Possession ${homeName} ${hp} / ${awayName} ${ap}. `;
      }

      // Penalties conceded: plain integer string.
      const hPen = getStat(hs, 'discipline', 'penalties_conceded');
      const aPen = getStat(as, 'discipline', 'penalties_conceded');
      if (hPen !== undefined && aPen !== undefined) {
        statsLine += `Penalties conceded ${homeName} ${hPen} / ${awayName} ${aPen}. `;
      }

      // Cards: yellow + red, shown together as "1Y 0R" — only when both sides expose BOTH counts.
      const hY = getStat(hs, 'discipline', 'yellow_cards');
      const aY = getStat(as, 'discipline', 'yellow_cards');
      const hR = getStat(hs, 'discipline', 'red_cards');
      const aR = getStat(as, 'discipline', 'red_cards');
      if (hY !== undefined && aY !== undefined && hR !== undefined && aR !== undefined) {
        statsLine += `Cards ${homeName} ${hY}Y ${hR}R / ${awayName} ${aY}Y ${aR}R. `;
      }

      if (statsLine) gameContext += `Match stats: ${statsLine}`;

      // Recent events narrative, baked into gameContext (chronological, capped to bound the prompt).
      // Mirrors the enriched-path injection's `<minute>' <type> <player>` format for consistency.
      if (events.length) {
        const recent = [...events]
          .sort((a, b) => (a.minute ?? Infinity) - (b.minute ?? Infinity))
          .slice(0, 14)
          .map((e) => `${e.minute ?? '?'}' ${e.type}${e.player ? ` ${e.player}` : ''}`)
          .join('; ');
        if (recent) gameContext += ` Recent events: ${recent}`;
      }

      return {
        play: homeName && awayName ? `${homeName} v ${awayName}` : MATCH_EMPTY.play,
        gameContext: gameContext.trim() || MATCH_EMPTY.gameContext,
        homeTeam: homeName,
        awayTeam: awayName,
        events,
        homeStats,
        awayStats,
        // Structured match state/score/minute for the (future) Coach's Read live-guard — additive,
        // ignored by the explain path (reuses module-scope deriveState, same as the board).
        state: deriveState(asStr(m?.status)),
        minute: asNum(m?.match_minute),
        homeScore: asNum(m?.home_score),
        awayScore: asNum(m?.away_score),
      };
    });
    matchCache.set(matchId, { t: now, data: detail });   // write-through L1
    return detail;
  } catch {
    return MATCH_EMPTY; // best-effort: upstream/cache failure → sane defaults, never throw (not cached)
  }
}
