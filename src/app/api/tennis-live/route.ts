import { NextResponse } from 'next/server';
import { getLiveTennisMatches, getTennisTimeline } from '../explain/tennisProvider';

// Standalone live-tennis endpoint — parallel to /api/leaderboard, deliberately OFF the explain path.
// It calls the parallel tennis provider directly (no getGameData, no explain handler, no enricher).
//
// KILL-SWITCH: TENNIS_LIVE (default OFF — mirrors the cache's CACHE_ENABLED posture exactly). When OFF
// the handler returns { matches: [] } IMMEDIATELY and NEVER touches RapidAPI, so prod stays empty and
// burns zero rate-limit budget until Anthony flips TENNIS_LIVE=1 in Vercel. When ON it returns the live
// matches (isLive only), and — if ?timeline=<rawId> is present — that match's game-by-game timeline too,
// so mobile lazy-loads the timeline only for the viewed match (saves the per-second BASIC budget).
//
// Best-effort throughout: the provider already swallows its own failures (null/empty on any error), and
// the handler guards again — every path returns { matches: [] }, NEVER a 500.

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
    const all = await getLiveTennisMatches();
    // Provider null → total failure; degrade to empty (client keeps its learn-mode tennis view).
    const matches = (all ?? []).filter((m) => m.isLive === true);

    // Optional lazy timeline: only when the flag is on AND a specific match id was requested.
    const rawId = new URL(request.url).searchParams.get('timeline');
    if (rawId) {
      const timeline = await getTennisTimeline(rawId); // null on failure/empty — fine to pass through
      return NextResponse.json({ matches, timeline }, { headers: corsHeaders });
    }

    return NextResponse.json({ matches }, { headers: corsHeaders });
  } catch {
    // Guard the handler too: a broken live read must degrade to empty, never a 500.
    return NextResponse.json({ matches: [] }, { headers: corsHeaders });
  }
}
