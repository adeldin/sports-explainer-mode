import { NextResponse } from 'next/server';
import { fetchGolfLeaderboard } from '../explain/golfLeaderboardProvider';

// Standalone live-golf-leaderboard endpoint — deliberately OFF the explain path. It calls the
// parallel golf provider directly (no getGameData, no explain handler, no enricher registry) and
// returns the normalized Leaderboard, or `{ leaderboard: null }` when nothing is live. The provider
// is best-effort (null on any failure), so the client reads null as "no live leaderboard" and keeps
// today's ESPN thin leader line — degrade to still-good, never broken. Hits only /schedule and
// /leaderboard via the provider; never /scorecard.

// CORS — mirrors src/app/api/explain/route.ts exactly so the mobile client reaches it the same way.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const leaderboard = await fetchGolfLeaderboard();
    // Always 200 with a uniform envelope: `leaderboard` is the board or null. The client branches on
    // null → ESPN fallback. (Uniform shape is simpler for the client than a 204 no-content branch.)
    return NextResponse.json({ leaderboard }, { headers: corsHeaders });
  } catch {
    // The provider already swallows its own failures, but guard the handler too so a live read can
    // never 500 — a broken leaderboard must degrade to the ESPN thin line, not an error.
    return NextResponse.json({ leaderboard: null }, { headers: corsHeaders });
  }
}
