// Highlightly soccer enricher — the FIRST dataProvider enricher. Adds match events (goals/cards/
// subs w/ minute) ON TOP of ESPN's soccer base. Best-effort: any failure / no-match returns {} or
// throws-into-dataProvider's-catch → the ESPN base is used unchanged (soccer still works).
//
// Direct Highlightly: base https://soccer.highlightly.net, single `X-RapidAPI-Key` header (no host
// header). Key is server-side only (HIGHLIGHTLY_API_KEY in Vercel) — never in the app, never
// committed. BASIC tier = 100 req/day → PROTOTYPE ONLY; a live match polled every 60s needs PRO.
//
// import type — keeps this a type-only import so there's no runtime cycle with dataProvider
// (dataProvider imports this module's VALUE for the registry).
import type { NormalizedGameData, MatchEvent } from './dataProvider';

const BASE = process.env.HIGHLIGHTLY_BASE || 'https://soccer.highlightly.net';
const KEY = process.env.HIGHLIGHTLY_API_KEY;

// sport key → Highlightly leagueId. World Cup 2026 = 1635 (confirmed). epl/laliga/mls IDs added
// once confirmed; an unmapped sport → no enrichment → ESPN base only (graceful).
const LEAGUE: Record<string, number> = {
  worldcup: 1635,
};

// Minimal caches (no framework): the gameId→matchId reconciliation is stable (no TTL); match
// detail is cached ~60s so the 60s auto-refresh doesn't double-call against the 100/day quota.
const idCache = new Map<string, string>();
const eventsCache = new Map<string, { t: number; events: MatchEvent[] }>();
const EVENTS_TTL = 60_000;

function hl(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { headers: { 'X-RapidAPI-Key': KEY || '' }, cache: 'no-store' });
}

// Normalize team names for ESPN↔Highlightly matching (case/accents/club-suffix/punctuation).
function norm(s: string): string {
  return (s || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(fc|cf|sc|afc|ac|club|de|cd)\b/g, '')
    .replace(/[^a-z0-9]/g, '').trim();
}

function toMinute(time: unknown): number | undefined {
  const m = parseInt(String(time ?? ''), 10); // "45+2" → 45
  return Number.isFinite(m) ? m : undefined;
}

function mapEvents(raw: any[]): MatchEvent[] {
  return (raw || []).map((e: any) => {
    const detail = e?.assist ? `assist ${e.assist}` : e?.substituted ? `for ${e.substituted}` : '';
    return {
      minute: toMinute(e?.time),
      type: e?.type || 'Event',
      team: e?.team?.name || '',
      player: e?.player || '',
      detail,
    };
  });
}

// Find the Highlightly matchId for an ESPN game: query the league's matches on the game's date
// (±1 day for the UTC/local edge), match on the normalized home+away pair (order-independent).
async function reconcile(base: NormalizedGameData, leagueId: number): Promise<string | null> {
  const h = norm(base.homeTeam), a = norm(base.awayTeam);
  if (!h || !a) return null;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const seed = base.startTime ? new Date(base.startTime) : new Date();
  const dates = [day(seed)];
  for (const off of [1, -1]) { const d = new Date(seed); d.setUTCDate(d.getUTCDate() + off); dates.push(day(d)); }

  for (const date of dates) {
    try {
      const res = await hl(`/matches?leagueId=${leagueId}&date=${date}`);
      if (!res.ok) continue;
      const data = await res.json();
      const matches: any[] = Array.isArray(data) ? data : (data?.data || data?.matches || []);
      const hit = matches.find((m: any) => {
        const mh = norm(m?.homeTeam?.name || m?.home?.name || m?.homeTeam || '');
        const ma = norm(m?.awayTeam?.name || m?.away?.name || m?.awayTeam || '');
        return (mh === h && ma === a) || (mh === a && ma === h);
      });
      if (hit?.id != null) return String(hit.id);
    } catch { /* try next date */ }
  }
  return null;
}

export async function highlightlyEnricher(base: NormalizedGameData, gameId: string): Promise<Partial<NormalizedGameData>> {
  if (!KEY) return {};                                   // no key configured → no enrichment
  const leagueId = LEAGUE[base.sport];
  if (!leagueId) return {};                              // sport not mapped → ESPN base only

  let matchId = idCache.get(gameId);
  if (!matchId) {
    const found = await reconcile(base, leagueId);
    if (!found) return {};                               // can't match → normal "no enrichment", not an error
    matchId = found;
    idCache.set(gameId, matchId);
  }

  const cached = eventsCache.get(matchId);
  if (cached && Date.now() - cached.t < EVENTS_TTL) return { events: cached.events };

  // Throwing here is fine — dataProvider catches it and falls back to the ESPN base.
  const detail = await (await hl(`/matches/${matchId}`)).json();
  const events = mapEvents(detail?.events || []);
  eventsCache.set(matchId, { t: Date.now(), events });
  return { events };
}
