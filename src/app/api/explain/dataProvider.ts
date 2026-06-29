// dataProvider — the adapter layer. ESPN is ALWAYS the base for every sport; a registered
// per-sport enricher OPTIONALLY merges its depth on top, into ONE normalized shape. Enrichment is
// best-effort: a missing / failing / rate-limited enricher is caught + logged and the ESPN base
// returns UNCHANGED — a sport degrades to "still good," never "broken." Generalizes Coach's
// Corner's normalizeCoachState seam.
//
// Topic-agnostic primitive (per the platform-vision bank): the registry + merge + normalized
// shape are generic; sport-specific parsing lives inside each enricher. A future [Topic]Wise app
// registers its own enrichers. NOT a plugin framework — just registry + merge + shape.
//
// SCOPE (this doc): the layer + the ESPN base only. NO enrichers are registered yet — GUMBO (MLB
// pitch-by-pitch) and a soccer API (events/lineups) plug in via follow-on docs with a one-line
// registry entry, no core change. Coach is the first consumer; explain/recap stay on their
// existing fetchers (the live 1.0 path) until migrated later behind byte-identical tests.

import { highlightlyEnricher } from './highlightlyEnricher';
import { gumboEnricher } from './gumboEnricher';

// --- Optional enrichment placeholders (PitchEvent for the GUMBO follow-on; MatchEvent populated
//     by the soccer enricher below) ---
export interface PitchEvent {
  index?: number; pitchType?: string; velocity?: number; result?: string; location?: string;
}
export interface MatchEvent {
  minute?: number; type?: string; team?: string; player?: string; detail?: string;
}
// Soccer boxscore team stats (Gate D-1) — possession % (0–100) + shot counts. All optional: only the
// stats both teams actually expose are filled; the rest stay undefined so the read degrades gracefully.
export interface SoccerTeamStats {
  possessionPct?: number; totalShots?: number; shotsOnTarget?: number;
}

// The normalized shape — the contract. ESPN base fields everyone uses + OPTIONAL enrichment
// fields (absent on ESPN-only). Consumers unaware of enrichment fields are unaffected.
export interface NormalizedGameData {
  // ESPN base — identity (all sports)
  sport: string; gameId: string;
  homeTeam: string; awayTeam: string; homeScore: string; awayScore: string;
  state: string; statusDetail: string;
  period?: number; clock?: string; lastPlay?: string;
  startTime?: number;   // epoch ms (ESPN event.date) — used by enrichers to date-match the game
  // ESPN base — situation (only where ESPN exposes it; today NFL/MLB; NBA/others identity-only)
  situation?: {
    down?: number; distance?: number; downDistanceText?: string; possession?: string; isRedZone?: boolean;
    balls?: number; strikes?: number; outs?: number; onBase?: string;
  };
  // OPTIONAL enrichment — populated only by a registered enricher
  pitchSequence?: PitchEvent[];                 // GUMBO (MLB)
  events?: MatchEvent[];                         // soccer (goals/cards/subs w/ minute)
  lineups?: { home: string[]; away: string[] }; // soccer
  // soccer — REAL boxscore team stats from the ESPN summary (Gate D-1). Present only when both teams
  // expose them; absent on thin-data games / non-soccer. xG is NOT in the feed and never appears here.
  teamStats?: { home: SoccerTeamStats; away: SoccerTeamStats };
  enrichedBy?: string;                          // which enricher ran (telemetry)
}

export type Enricher = (base: NormalizedGameData, gameId: string) => Promise<Partial<NormalizedGameData>>;

// Registered enrichers, keyed by sport. The soccer family uses Highlightly (adds match events on
// top of ESPN's soccer base). GUMBO (MLB pitch-by-pitch) registers here next. A sport with no
// entry gets the ESPN base only (today's behavior).
const enrichers: Partial<Record<string, Enricher>> = {
  worldcup: highlightlyEnricher,
  soccer: highlightlyEnricher,
  epl: highlightlyEnricher,
  laliga: highlightlyEnricher,
  mlb: gumboEnricher,
};

type EspnCfg = { sport: string; league: string; core?: boolean; learnMode?: boolean };
// The data layer owns its sport→endpoint map (avoids a circular import with route.ts; when explain
// migrates here later, route's espnConfig collapses into this one).
const ESPN_CONFIG: Record<string, EspnCfg> = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  wnba: { sport: 'basketball', league: 'wnba' },
  mlb: { sport: 'baseball', league: 'mlb' },
  soccer: { sport: 'soccer', league: 'usa.1' },
  worldcup: { sport: 'soccer', league: 'fifa.world' },
  epl: { sport: 'soccer', league: 'eng.1' },
  laliga: { sport: 'soccer', league: 'esp.1' },
  rugby: { sport: 'rugby', league: '270557', core: true },
  mlr: { sport: 'rugby', league: '289262', core: true },
  tennis: { sport: 'tennis', league: 'atp', learnMode: true },
  golf: { sport: 'golf', league: 'pga', learnMode: true },
};

// THE entry point. ESPN base (always) → optional enricher merge (best-effort) → normalized shape.
export async function getGameData(sport: string, gameId?: string): Promise<NormalizedGameData | null> {
  const base = await fetchEspnBase(sport, gameId);
  if (!base) return null;
  const enricher = enrichers[sport];
  if (!enricher) return base;
  try {
    const depth = await enricher(base, gameId || base.gameId);
    return { ...base, ...depth, enrichedBy: sport };
  } catch (e) {
    // Enrichment is never a hard dependency — degrade to the ESPN base.
    console.error(`dataProvider: enricher(${sport}) failed — using ESPN base:`, e);
    return base;
  }
}

// The ESPN base normalizer. Identity for every sport; situation only where ESPN exposes per-play
// fields (NFL down/distance, MLB count/outs/bases). This is the coach extraction (moved verbatim)
// generalized to the normalized shape. Learn-mode / no-config sports → null (no head-to-head base).
async function fetchEspnBase(sport: string, gameId?: string): Promise<NormalizedGameData | null> {
  const cfg = ESPN_CONFIG[sport];
  if (!cfg || cfg.learnMode) return null;
  const teamName = (comp: any, side: string) => comp?.competitors?.find((c: any) => c.homeAway === side)?.team?.displayName || '';
  const scoreOf = (comp: any, side: string) => String(comp?.competitors?.find((c: any) => c.homeAway === side)?.score ?? '');
  const teamAbbr = (comp: any, id: string) => comp?.competitors?.find((c: any) => String(c.id) === String(id))?.team?.abbreviation || '';
  try {
    if (cfg.core) {
      // Core-API sports (rugby/MLR): identity only — ESPN exposes no per-play situation.
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const evRes = await fetch(`https://sports.core.api.espn.com/v2/sports/${cfg.sport}/leagues/${cfg.league}/events?dates=${today}`, { cache: 'no-store' });
      const evData = await evRes.json();
      const items: any[] = (evData.items || []).slice(0, 20);
      const events = (await Promise.all(items.map(async (it: any) => {
        try { return await (await fetch(it.$ref, { cache: 'no-store' })).json(); } catch { return null; }
      }))).filter(Boolean);
      const game = gameId ? events.find((e: any) => String(e.id) === String(gameId)) : events[0];
      if (!game) return null;
      const comp = game.competitions?.[0];
      return {
        sport, gameId: String(game.id),
        homeTeam: teamName(comp, 'home'), awayTeam: teamName(comp, 'away'),
        homeScore: scoreOf(comp, 'home'), awayScore: scoreOf(comp, 'away'),
        state: game.status?.type?.state || '', statusDetail: game.status?.type?.shortDetail || game.status?.type?.detail || '',
        lastPlay: comp?.situation?.lastPlay?.text || undefined,
      };
    }

    // Site-API sports: identity + (where present) situation.
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`, { cache: 'no-store' });
    const data = await res.json();
    const game = gameId
      ? data?.events?.find((e: any) => e.id === gameId)
      : data?.events?.find((e: any) => e.status?.type?.state === 'in');
    if (!game) return null;
    const comp = game.competitions?.[0];
    const sit = comp?.situation || {};
    const st = game.status || {};

    const out: NormalizedGameData = {
      sport, gameId: String(game.id),
      homeTeam: teamName(comp, 'home'), awayTeam: teamName(comp, 'away'),
      homeScore: scoreOf(comp, 'home'), awayScore: scoreOf(comp, 'away'),
      state: st?.type?.state || '',
      statusDetail: st?.type?.shortDetail || '',
      period: typeof st?.period === 'number' ? st.period : undefined,
      clock: st?.displayClock || undefined,
      lastPlay: sit?.lastPlay?.text || undefined,
      startTime: game.date ? Date.parse(game.date) : undefined,
    };

    // Soccer family — the play text lives in the summary keyEvents/commentary (NOT the scoreboard
    // situation), exactly as the explain path's fetchGameData pulls it. Replicated here so routing
    // soccer-explain through getGameData is NO WORSE than today on ESPN fields (the audit fix).
    if (['soccer', 'worldcup', 'epl', 'laliga'].includes(sport)) {
      try {
        const sum = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/summary?event=${game.id}`, { cache: 'no-store' })).json();
        const ke: any[] = sum?.keyEvents || [];
        const comm: any[] = sum?.commentary || [];
        out.lastPlay = ke[ke.length - 1]?.text || comm[comm.length - 1]?.text || out.lastPlay;
        // Gate D-1: pull REAL team stats from the SAME summary (no extra fetch). Mirrors the recap's
        // parsing (route.ts buildSoccerRecapExtras): key by homeAway, possessionPct is already 0–100.
        // Only attach teamStats when BOTH sides expose a given stat (else leave it undefined → honest).
        const teams: any[] = sum?.boxscore?.teams || [];
        const statMap = (side: string): Record<string, string> => {
          const t = teams.find((x: any) => x?.homeAway === side);
          const o: Record<string, string> = {};
          for (const st of (t?.statistics || [])) if (st?.name != null && st?.displayValue != null) o[st.name] = String(st.displayValue);
          return o;
        };
        const H = statMap('home'), A = statMap('away');
        const both = (k: string) => H[k] != null && A[k] != null;
        const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };
        const home: SoccerTeamStats = {}, away: SoccerTeamStats = {};
        if (both('possessionPct')) { home.possessionPct = Math.round(parseFloat(H.possessionPct)); away.possessionPct = Math.round(parseFloat(A.possessionPct)); }
        if (both('totalShots')) { home.totalShots = num(H.totalShots); away.totalShots = num(A.totalShots); }
        if (both('shotsOnTarget')) { home.shotsOnTarget = num(H.shotsOnTarget); away.shotsOnTarget = num(A.shotsOnTarget); }
        if (Object.keys(home).length) out.teamStats = { home, away };
      } catch { /* keep the scoreboard lastPlay; teamStats stays undefined on any failure */ }
    }

    // MLB — the play-by-play text lives in the summary plays[] (NOT the scoreboard situation), exactly
    // as the explain path's fetchGameData pulls it (route.ts:198-211). Replicated here so routing live
    // MLB-explain through getGameData yields a BYTE-IDENTICAL play text (the Gate-3 contract). Mirrors
    // the soccer deep-dive above; live-only gating is at the caller (route.ts calls getGameData only for
    // !playText), so MLB past-plays are unaffected.
    if (sport === 'mlb') {
      // Match fetchGameData's scoreboard fallback chain (situation.lastPlay → comp.lastPlay) first…
      out.lastPlay = sit?.lastPlay?.text || comp?.lastPlay?.text || out.lastPlay;
      try {
        const sum = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/summary?event=${game.id}`, { cache: 'no-store' })).json();
        // …then the EXACT deep-dive: reverse, skip 'inning' entries, take the first match (route.ts:208-211).
        const lastReal = sum?.plays?.reverse().find((p: any) => p.text && !p.text.toLowerCase().includes('inning'));
        if (lastReal) out.lastPlay = lastReal.text;
      } catch { /* keep the scoreboard lastPlay on any summary failure (mirrors soccer) */ }
    }

    // Situation — extracted identically to the original coach normalizer (byte-identical output).
    const situation: NonNullable<NormalizedGameData['situation']> = {};
    if (sport === 'nfl') {
      if (typeof sit.down === 'number') situation.down = sit.down;
      if (typeof sit.distance === 'number') situation.distance = sit.distance;
      if (sit.shortDownDistanceText || sit.downDistanceText) situation.downDistanceText = sit.shortDownDistanceText || sit.downDistanceText;
      if (sit.possession) situation.possession = teamAbbr(comp, sit.possession);
      if (typeof sit.isRedZone === 'boolean') situation.isRedZone = sit.isRedZone;
    } else if (sport === 'mlb') {
      if (typeof sit.balls === 'number') situation.balls = sit.balls;
      if (typeof sit.strikes === 'number') situation.strikes = sit.strikes;
      if (typeof sit.outs === 'number') situation.outs = sit.outs;
      const bases = [sit.onFirst && '1st', sit.onSecond && '2nd', sit.onThird && '3rd'].filter(Boolean);
      if (bases.length) situation.onBase = bases.join(' & ');
    }
    if (Object.keys(situation).length) out.situation = situation;
    return out;
  } catch (e) {
    console.error('dataProvider: fetchEspnBase error:', e);
    return null;
  }
}
