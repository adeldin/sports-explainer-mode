// Sportmonks LIVE feed — the authenticated fetch layer for cricket's live path. Pairs with the
// PURE normalizer (sportmonksProvider.ts): this module fetches + caches + maps status; that one
// maps payloads. Mirrors zylaProvider's security + resilience posture: server-side key (never
// reaches the client), best-effort degrade (every failure → null/[], never a throw), fetch
// timeout, and a MANDATORY L1 in-memory TTL cache that works regardless of CACHE_ENABLED —
// bounding upstream calls no matter how many clients poll the 60s tick.
//
// KILL-SWITCH: CRICKET_SM_LIVE (default OFF), checked INSIDE every entry point (defense in depth
// — the /api/cricket route gates too). This flag is SEPARATE from CRICKET_LIVE on purpose:
// CRICKET_LIVE is the free archival tap; CRICKET_SM_LIVE is the PAID feed. When the trial (or a
// lapsed subscription) dies, unset THIS flag and archival replay/recaps survive untouched.
//
// Poll economics: mobile polls the shared 60s tick; L1 TTLs below collapse any number of clients
// to ≤2 upstream fixture calls/min (~≤360 per 3h T20I) against a 2,000/hr plan cap.

import type { Game } from './zylaProvider';
import { cricketFlag } from './cricketFlags';

const SM_LIVE = () => process.env.CRICKET_SM_LIVE === '1'; // read per-call: honored at runtime
const TOKEN = () => process.env.SPORTMONKS_TOKEN || '';
const BASE = 'https://cricket.sportmonks.com/api/v2.0';
const FETCH_TIMEOUT = 3000; // ms — live path must degrade fast, never hang the board

// Trial league set (Twenty20 International / Big Bash / CSA T20). The €29 Major plan carries 26
// leagues — widen this list when the subscription lands.
const LEAGUE_IDS = [3, 5, 10];

// ── STATUS → board state. THE HINGE of the live UX; mapped CONSERVATIVELY. ──────────────────
// OBSERVED on real fixtures this session: 'NS' (pre-start), '1st Innings' (in-play, growth test
// 2026-07-15), 'Finished', 'Aban.' (abandoned). ASSUMED, not yet observed: '2nd Innings' and
// 'Innings Break' (the /innings|break/i family — missing every 2nd innings would be absurd, and
// a break is mid-match); rain/'Int.', super-over, and DLS strings have NEVER been seen.
// RULE: anything unrecognized maps to 'pre', NEVER to 'in' — a false live card on a dead match
// is worse than a missed live card. NOTE: the fixture `live` FLAG is a lie (true on finished
// matches) — status is the only signal we trust.
export function smState(status: string): 'pre' | 'in' | 'post' {
  const s = status.toLowerCase();
  if (/innings|break/.test(s)) return 'in';
  if (/finish|aban|cancl/.test(s)) return 'post';
  return 'pre'; // 'NS' and every unobserved/unknown status
}

// ── L1 in-memory TTL caches (work with CACHE_ENABLED off — the zyla L1 precedent) ───────────
const TTL_FIXTURE = 30_000;    // live fixture w/ balls — balls arrive ~50s apart, 30s stays fresh
const TTL_SEASONS = 3_600_000; // league → current season id — changes yearly
const TTL_LIST = 600_000;      // season fixture lists — near-static during a season
const TTL_TEAM = 86_400_000;   // team names — static
const TTL_LIVESCORES = 30_000;

const memo = new Map<string, { t: number; v: unknown }>();
async function l1<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T | null> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  try {
    const v = await fetcher();
    memo.set(key, { t: Date.now(), v });
    return v;
  } catch {
    // Best-effort: keep serving the stale value if we have one, else null. Never throw upward.
    return hit ? (hit.v as T) : null;
  }
}

async function smGet(path: string, params = ''): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${BASE}${path}?api_token=${TOKEN()}${params}`, {
      signal: ctrl.signal, cache: 'no-store',
    });
    if (!res.ok) throw new Error(`sportmonks ${res.status}`);
    return (await res.json())?.data;
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown): string => (v == null ? '' : String(v));

async function teamName(id: number): Promise<string> {
  const t = await l1(`team:${id}`, TTL_TEAM, () => smGet(`/teams/${id}`));
  return str((t as any)?.name);
}

// One league's current-season fixtures (two cached steps: league → season_id → fixtures).
async function leagueFixtures(leagueId: number): Promise<any[]> {
  const league = await l1(`league:${leagueId}`, TTL_SEASONS, () => smGet(`/leagues/${leagueId}`));
  const seasonId = (league as any)?.season_id;
  if (!seasonId) return [];
  const season = await l1(`season:${seasonId}`, TTL_LIST, () =>
    smGet(`/seasons/${seasonId}`, '&include=fixtures'),
  );
  const fx = (season as any)?.fixtures;
  return Array.isArray(fx) ? fx : fx?.data ?? [];
}

// ── Live board: trial-league fixtures for a date (default today UTC), as canonical Game[] with
//    'sm-' PREFIXED ids. The prefix is load-bearing: Cricinfo and Sportmonks id spaces not
//    colliding today is LUCK, NOT CONTRACT — every consumer routes on the prefix. ──────────────
export const SM_ID_PREFIX = 'sm-';

export async function getSmLiveBoard(date?: string): Promise<Game[]> {
  if (!SM_LIVE() || !TOKEN()) return [];
  try {
    const day = date || new Date().toISOString().slice(0, 10);
    const lists = await Promise.all(LEAGUE_IDS.map((id) => leagueFixtures(id)));
    const todays = lists.flat().filter((f) => str(f?.starting_at).slice(0, 10) === day);
    const games: Game[] = [];
    for (const f of todays) {
      const status = str(f?.status);
      const state = smState(status);
      const [home, away] = await Promise.all([teamName(Number(f?.localteam_id)), teamName(Number(f?.visitorteam_id))]);
      const ms = Date.parse(str(f?.starting_at));
      const homeFlag = cricketFlag(home);
      const awayFlag = cricketFlag(away);
      games.push({
        id: `${SM_ID_PREFIX}${f?.id}`,
        homeTeam: home,
        awayTeam: away,
        ...(homeFlag ? { homeFlag } : {}),
        ...(awayFlag ? { awayFlag } : {}),
        // Board scores: the season fixture list carries no runs. v1 leaves them '' — the status/
        // note text carries the story. TODO(Gate 10b): the live-fire run will show whether
        // /livescores exposes a runs shape worth merging here.
        homeScore: '',
        awayScore: '',
        status: state === 'post' ? (str(f?.note) || 'Final') : state === 'in' ? status : 'Scheduled',
        isLive: state === 'in',
        sport: 'cricket',
        state,
        ...(Number.isFinite(ms) ? { startTime: ms } : {}),
      });
    }
    return games;
  } catch {
    return [];
  }
}

// ── One live fixture with balls — the normalizer's input. null on anything unhealthy. ─────────
export async function getSmFixture(fixtureId: string): Promise<any | null> {
  if (!SM_LIVE() || !TOKEN()) return null;
  if (!/^\d+$/.test(fixtureId)) return null;
  // Includes are MANDATORY: teams come back blank without localteam/visitorteam (verified on the
  // Gate-4 harvest fixtures), and balls IS the product.
  return await l1(`fixture:${fixtureId}`, TTL_FIXTURE, () =>
    smGet(`/fixtures/${fixtureId}`, '&include=balls,localteam,visitorteam,venue'),
  );
}
