import { NextResponse } from 'next/server';
import { getEspnSinglesLive } from '../explain/espnTennisProvider';

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

    // G2 TODO: ?match=<espnId> → enrich THAT match with RapidAPI live points (server / current-game
    // points / timeline), joined by player name. For now the param is accepted but ignored — the list
    // is returned unchanged so the client can already render flags/round/court/seed/sets.
    const matchId = new URL(request.url).searchParams.get('match');
    if (matchId) {
      // (G2 enrichment goes here.)
      return NextResponse.json({ matches }, { headers: corsHeaders });
    }

    return NextResponse.json({ matches }, { headers: corsHeaders });
  } catch {
    // Guard the handler too: a broken live read must degrade to empty, never a 500.
    return NextResponse.json({ matches: [] }, { headers: corsHeaders });
  }
}
