import { NextResponse } from 'next/server';
import { getNationsCupBoard } from '../explain/zylaProvider';

// Standalone live-rugby endpoint for the World Rugby Nations Cup — parallel to /api/tennis-live,
// deliberately OFF the explain path. The board comes from Zyla (server-side key; NEVER reaches the
// client — the mobile app only calls THIS backend). Normalized to canonical Game[] server-side, so the
// mobile fetcher does NO re-normalize.
//
// KILL-SWITCH: RUGBY_LIVE (default OFF — mirrors tennis-live's TENNIS_LIVE posture). When OFF the
// handler returns { matches: [] } IMMEDIATELY and NEVER touches Zyla, so prod stays empty until Anthony
// flips RUGBY_LIVE=1 in Vercel.
//
// Best-effort throughout: the provider swallows its own failures (returns [] on any error), and the
// handler guards again — every path returns { matches: [] }, NEVER a 500.

const RUGBY_LIVE = process.env.RUGBY_LIVE === '1'; // default OFF

// Force per-request evaluation so the env flag is honored at runtime, never statically cached.
export const dynamic = 'force-dynamic';

// CORS — mirrors src/app/api/tennis-live/route.ts so the mobile client reaches it the same way.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  // Kill-switch: OFF → empty envelope, NO upstream call. This branch must never reach Zyla.
  if (!RUGBY_LIVE) {
    return NextResponse.json({ matches: [] }, { headers: corsHeaders });
  }

  try {
    const games = await getNationsCupBoard();
    return NextResponse.json({ matches: games }, { headers: corsHeaders });
  } catch {
    // Guard the handler too: a broken live read must degrade to empty, never a 500.
    return NextResponse.json({ matches: [] }, { headers: corsHeaders });
  }
}
