import { NextResponse } from 'next/server';
import { getEspnSinglesLive } from '../explain/espnTennisProvider';
import { getLiveTennisMatches, getTennisTimeline } from '../explain/tennisProvider';

// Name normalization for the ESPN↔RapidAPI join: strip diacritics ("Cerúndolo" → "cerundolo"),
// lowercase, trim, collapse internal whitespace. Two sources spell the same player slightly
// differently; this makes the set-equality match robust.
const normName = (s: string): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

// Standalone live-tennis endpoint — parallel to /api/leaderboard, deliberately OFF the explain path.
//
// The LIST path is ESPN-only (keyless, free, no rate limit): the merged live SINGLES list across both
// tours, with names/flags/round/court/seed/set-scores. RapidAPI is NOT on the list path — it stays the
// live-point ENRICHER for a single selected match (server / current-game points / timeline), wired in
// G2 behind the ?match=<espnId> param below.
//
// KILL-SWITCH: TENNIS_LIVE (default OFF — mirrors the cache's CACHE_ENABLED posture exactly). When OFF
// the handler returns { matches: [] } IMMEDIATELY and NEVER touches any upstream, so prod stays empty
// until Anthony flips TENNIS_LIVE=1 in Vercel.
//
// Best-effort throughout: the provider swallows its own failures (returns [] on any error), and the
// handler guards again — every path returns { matches: [] }, NEVER a 500.

const TENNIS_LIVE = process.env.TENNIS_LIVE === '1'; // default OFF

// Force per-request evaluation so the env flag is honored at runtime, never statically cached.
export const dynamic = 'force-dynamic';

// CORS — mirrors src/app/api/explain/route.ts so the mobile client reaches it the same way.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  // Kill-switch: OFF → empty envelope, NO upstream call. This branch must never reach RapidAPI.
  if (!TENNIS_LIVE) {
    return NextResponse.json({ matches: [] }, { headers: corsHeaders });
  }

  try {
    // ESPN-only list: merged live singles across both tours (best-effort → [] on failure).
    const matches = await getEspnSinglesLive();

    // ?match=<espnId> → enrich THAT match with RapidAPI live points (server / current-game points /
    // timeline), joined by player name to the ESPN match. Best-effort: any miss → ESPN-only card.
    const matchId = new URL(request.url).searchParams.get('match');
    if (matchId) {
      // 1) Find the ESPN match — its home/away NAMES are the canonical orientation the card renders.
      const espnMatch = matches.find((m) => m.espnId === matchId);
      if (!espnMatch) return NextResponse.json({ matches }, { headers: corsHeaders }); // unknown id → list

      // 2) Find the RapidAPI match by NAME (set-equality, order-independent — the two sources may list
      //    the players in opposite order). Normalize names to survive accents/spacing differences.
      const rapidList = (await getLiveTennisMatches()) || [];
      const espnHomeN = normName(espnMatch.home);
      const espnAwayN = normName(espnMatch.away);
      const espnNameSet = new Set([espnHomeN, espnAwayN]);
      const rapid = rapidList.find((r) => {
        const rHomeN = normName(r.home);
        const rAwayN = normName(r.away);
        // both RapidAPI names present in the ESPN pair, and distinct → the two unordered pairs are equal
        return rHomeN !== rAwayN && espnNameSet.has(rHomeN) && espnNameSet.has(rAwayN);
      });

      // No confident name-match (or RapidAPI down) → degrade: ESPN-only card, no live points.
      if (!rapid) return NextResponse.json({ match: { ...espnMatch, live: null } }, { headers: corsHeaders });

      // 3) ORIENTATION MAPPING (the landmine): ESPN and RapidAPI each have their OWN independent
      //    home/away. We map RapidAPI's server/currentGame into ESPN's orientation BY NAME so the serve
      //    dot lands on the correct player on the card. If espnHome === rapid.home the sources are
      //    ALIGNED (keep fields as-is); if espnHome === rapid.away they are SWAPPED (flip home↔away).
      const aligned = espnHomeN === normName(rapid.home);

      // server: 'home'|'away'|null in RapidAPI orientation → ESPN orientation. null stays null.
      let server = rapid.server;
      if (!aligned && server) server = server === 'home' ? 'away' : 'home';

      // currentGame: {home,away} in RapidAPI orientation → ESPN orientation (swap when SWAPPED).
      let currentGame = rapid.currentGame;
      if (!aligned && currentGame) currentGame = { home: currentGame.away, away: currentGame.home };

      // timeline: entries are keyed by PLAYER NAME (not home/away), so they need NO orientation flip —
      // the card counts breaks per ESPN player by matching names. Best-effort: null on failure/empty.
      const timeline = await getTennisTimeline(rapid.rawId);

      const live = { server, currentGame, timeline };
      return NextResponse.json({ match: { ...espnMatch, live } }, { headers: corsHeaders });
    }

    return NextResponse.json({ matches }, { headers: corsHeaders });
  } catch {
    // Guard the handler too: a broken live read must degrade to empty, never a 500.
    return NextResponse.json({ matches: [] }, { headers: corsHeaders });
  }
}
