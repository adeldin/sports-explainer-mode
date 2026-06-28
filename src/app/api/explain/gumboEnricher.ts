// GUMBO / MLB Statcast enricher — adds real pitch data (type / velocity / result / zone) ON TOP of
// ESPN's MLB base, into NormalizedGameData.pitchSequence. Mirrors highlightlyEnricher's discipline:
// best-effort (any soft failure returns {} → the ESPN base is used unchanged; hard fetch/JSON errors
// throw into dataProvider's catch → same fallback), date+team-name cross-walk (NOT id — ESPN gameId
// ≠ MLB gamePk), and short-TTL caching so the 60s auto-refresh doesn't re-pull the heavy feed.
//
// KEYLESS: MLB StatsAPI is free, no auth. Schedule: /api/v1/schedule?sportId=1. Live feed:
// /api/v1.1/game/{gamePk}/feed/live (liveData.plays.{currentPlay,allPlays}).
//
// SCOPE (Gate 2): this only POPULATES pitchSequence. Nothing reads it yet (Gate 4 wires it into the
// prompt), so registering mlb here is OUTPUT-NEUTRAL — the enricher runs via getGameData (Coach's
// Corner today), but no read changes.
//
// import type — keeps this a type-only import so there's no runtime cycle with dataProvider
// (dataProvider imports this module's VALUE for the registry).
import type { NormalizedGameData, PitchEvent } from './dataProvider';

const BASE = 'https://statsapi.mlb.com';

// Minimal caches (no framework, mirrors the soccer enricher): the gameId→gamePk cross-walk is stable
// for a game (no TTL); the live feed is cached 60s so the 60s auto-refresh doesn't re-pull it.
const gamePkCache = new Map<string, number>();
const feedCache = new Map<number, { t: number; pitches: PitchEvent[] }>();
const FEED_TTL = 60_000;

// How many of the most-recent pitches to surface (sequence context for the read), and how far back
// through allPlays to look for the last real pitch when the current at-bat has none (e.g. a mound
// visit). Bounded so we never surface STALE pitch data as if it were the current beat.
const MAX_PITCHES = 3;
const MAX_LOOKBACK_PLAYS = 4;

function mlb(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { cache: 'no-store' });
}

// Team-name matching is ORDER-INDEPENDENT (token-sort), same approach as the soccer enricher. MLB's
// 30 team names are identical between ESPN and StatsAPI (Gate-1 recon: 15/15 matched on pure
// token-sort; the "Athletics" edge is a non-issue — both name it "Athletics"). ALIAS kept as a
// defensive seam in case a future naming drift appears.
const STOP = new Set(['fc', 'cf', 'sc', 'afc', 'ac', 'club', 'de', 'cd']);
function tokenSort(name: string): string {
  return (name || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(t => t && !STOP.has(t))
    .sort().join('');
}
const ALIAS_GROUPS: string[][] = [];
const ALIAS: Record<string, string> = {};
for (const g of ALIAS_GROUPS) { const canon = tokenSort(g[0]); for (const n of g) ALIAS[tokenSort(n)] = canon; }
function teamKey(name: string): string {
  const ts = tokenSort(name);
  return ALIAS[ts] || ts;
}

// Resolve an ESPN MLB game → its MLB gamePk via the schedule: match the home+away pair by canonical
// team key on the game's date (±1 day for the UTC edge). DOUBLEHEADER tiebreak: when >1 game matches
// the pair, pick the one whose gameDate start is nearest base.startTime. Can't-find → null → {}.
async function resolveGamePk(base: NormalizedGameData): Promise<number | null> {
  const h = teamKey(base.homeTeam), a = teamKey(base.awayTeam);
  if (!h || !a) return null;
  try {
    const res = await mlb(`/api/v1/schedule?sportId=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const games: any[] = (data?.dates || []).flatMap((d: any) => d?.games || []);

    // All games matching the team pair, within ±1 day of the ESPN start time.
    const seed = base.startTime ?? Date.now();
    const DAY = 86_400_000;
    const candidates = games.filter((g: any) => {
      const gh = teamKey(g?.teams?.home?.team?.name || '');
      const ga = teamKey(g?.teams?.away?.team?.name || '');
      const pairOk = (gh === h && ga === a) || (gh === a && ga === h);
      if (!pairOk) return false;
      const t = g?.gameDate ? Date.parse(g.gameDate) : NaN;
      return !Number.isFinite(t) || Math.abs(t - seed) <= DAY;
    });
    if (!candidates.length) return null;
    if (candidates.length === 1) return Number(candidates[0].gamePk) || null;

    // Doubleheader: same pair, same day → pick the game whose start is nearest the ESPN start time.
    const nearest = candidates.reduce((best: any, g: any) => {
      const gt = g?.gameDate ? Date.parse(g.gameDate) : NaN;
      const bt = best?.gameDate ? Date.parse(best.gameDate) : NaN;
      const gd = Number.isFinite(gt) ? Math.abs(gt - seed) : Infinity;
      const bd = Number.isFinite(bt) ? Math.abs(bt - seed) : Infinity;
      return gd < bd ? g : best;
    });
    return Number(nearest?.gamePk) || null;
  } catch {
    // A schedule fetch/parse miss is treated as "no enrichment" (soft), not a hard error.
    return null;
  }
}

// Map a StatsAPI pitch event (playEvents[] entry with isPitch:true) → our PitchEvent.
// location = the Statcast zone number as a short string for now; the human label ("low-outside") is
// derived in Gate 4. (PitchEvent has no pX/pZ field — the strike-zone visual follow-on extends it.)
function mapPitch(ev: any): PitchEvent {
  return {
    index: typeof ev?.pitchNumber === 'number' ? ev.pitchNumber : undefined,
    pitchType: ev?.details?.type?.description || undefined,
    velocity: typeof ev?.pitchData?.startSpeed === 'number' ? ev.pitchData.startSpeed : undefined,
    result: ev?.details?.call?.description || undefined,
    location: ev?.pitchData?.zone != null ? String(ev.pitchData.zone) : undefined,
  };
}

// Extract the last up-to-MAX_PITCHES real pitches: prefer the current at-bat; if it has none (mound
// visit / between batters), walk back through at most MAX_LOOKBACK_PLAYS prior plays to the last
// at-bat that DID throw pitches. Bounded so we never surface stale pitch data as the current beat.
function extractPitches(plays: any): PitchEvent[] {
  const pitchesOf = (play: any): any[] => (play?.playEvents || []).filter((e: any) => e?.isPitch);

  const current = plays?.currentPlay;
  const cur = current ? pitchesOf(current) : [];
  if (cur.length) return cur.slice(-MAX_PITCHES).map(mapPitch);

  const all: any[] = Array.isArray(plays?.allPlays) ? plays.allPlays : [];
  // Skip the current at-bat itself (it's the last allPlays entry and already had no pitches).
  const start = all.length - 1;
  for (let i = start; i >= 0 && start - i < MAX_LOOKBACK_PLAYS; i--) {
    const p = pitchesOf(all[i]);
    if (p.length) return p.slice(-MAX_PITCHES).map(mapPitch);
  }
  return [];
}

export async function gumboEnricher(base: NormalizedGameData, gameId: string): Promise<Partial<NormalizedGameData>> {
  if (base.sport !== 'mlb') return {};                     // registry-scoped to mlb; belt-and-suspenders

  let gamePk = gamePkCache.get(gameId);
  if (gamePk == null) {
    const found = await resolveGamePk(base);
    if (found == null) return {};                          // can't cross-walk → normal "no enrichment"
    gamePk = found;
    gamePkCache.set(gameId, gamePk);
  }

  const cached = feedCache.get(gamePk);
  if (cached && Date.now() - cached.t < FEED_TTL) {
    return cached.pitches.length ? { pitchSequence: cached.pitches } : {};
  }

  // Throwing here is fine — dataProvider catches it and falls back to the ESPN base.
  const feed = await (await mlb(`/api/v1.1/game/${gamePk}/feed/live`)).json();
  const liveState = feed?.gameData?.status?.abstractGameState;
  if (liveState && liveState !== 'Live') {                 // Final / Preview → no current pitch beat
    feedCache.set(gamePk, { t: Date.now(), pitches: [] });
    return {};
  }

  const pitches = extractPitches(feed?.liveData?.plays);
  feedCache.set(gamePk, { t: Date.now(), pitches });
  if (!pitches.length) return {};                          // no pitches yet (game just started, etc.)

  // TEMP (Gate 2 live-test proof — remove before commit): prove the data flows for one live game.
  console.log(`[gumbo] gamePk=${gamePk} pitchSequence=${JSON.stringify(pitches)}`);

  return { pitchSequence: pitches };
}
