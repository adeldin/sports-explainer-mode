import { NextRequest, NextResponse } from 'next/server';
import type { Game } from '../explain/zylaProvider';
import { normalizeCricsheet } from '../explain/cricsheetProvider';
import type { CricketMatch } from '../explain/cricketTypes';
import { CRICKET_INDEX, CRICKET_RAW, type CricketIndexEntry } from './matches.generated';

// Standalone cricket data endpoint — parallel to /api/rugby-live, deliberately OFF the explain
// path. Source is the COMMITTED Cricsheet snapshot (matches.generated.ts, refreshed by
// scripts/ingest-cricsheet.mjs) — post-match archival, so no upstream call happens here at all.
// Normalized server-side; the mobile fetcher does NO re-normalize.
//
// Contract:
//   GET /api/cricket?date=YYYY-MM-DD  -> { matches: Game[] }      (board for the date strip)
//   GET /api/cricket                  -> { matches: Game[] }      (all ingested matches)
//   GET /api/cricket?matchId=<id>     -> { match: CricketMatch | null }   (replay/recap payload)
//
// KILL-SWITCH: CRICKET_LIVE (default OFF — mirrors RUGBY_LIVE / TENNIS_LIVE). When OFF every
// path returns its empty envelope immediately. Best-effort throughout: NEVER a 500 — a payload
// that fails the normalizer's runs invariant degrades to { match: null } rather than emitting
// silently-wrong teaching data (the invariant also ran at ingest, so this is a double guard).

const CRICKET_LIVE = process.env.CRICKET_LIVE === '1'; // default OFF

// Force per-request evaluation so the env flag is honored at runtime, never statically cached.
export const dynamic = 'force-dynamic';

// CORS — mirrors /api/rugby-live so the mobile client reaches it the same way.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Index entry -> canonical Game (the shape the mobile scoreboard consumes, zero re-normalize).
// Cricsheet has no home/away concept; teams[0] renders as "home". Archival source -> always post.
function toGame(e: CricketIndexEntry): Game {
  const ms = Date.parse(`${e.date}T00:00:00Z`);
  return {
    id: e.id,
    homeTeam: e.teams[0],
    awayTeam: e.teams[1],
    homeScore: e.scores[e.teams[0]] ?? '',
    awayScore: e.scores[e.teams[1]] ?? '',
    status: e.note || 'No result',
    isLive: false,
    sport: 'cricket',
    state: 'post',
    ...(Number.isFinite(ms) ? { startTime: ms } : {}),
    ...(e.venue ? { venue: e.venue } : {}),
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const matchId = params.get('matchId');

  // Kill-switch: OFF -> empty envelope for whichever shape was asked for. No data reads.
  if (!CRICKET_LIVE) {
    return NextResponse.json(matchId ? { match: null } : { matches: [] }, { headers: corsHeaders });
  }

  if (matchId) {
    const raw = CRICKET_RAW[matchId];
    if (!raw) return NextResponse.json({ match: null }, { headers: corsHeaders });
    try {
      const match: CricketMatch = normalizeCricsheet(raw, matchId);
      return NextResponse.json({ match }, { headers: corsHeaders });
    } catch {
      // Invariant violation or malformed payload -> null, never a 500 and never bad data.
      return NextResponse.json({ match: null }, { headers: corsHeaders });
    }
  }

  const date = params.get('date');
  const entries = date ? CRICKET_INDEX.filter((e) => e.date === date) : CRICKET_INDEX;
  return NextResponse.json({ matches: entries.map(toGame) }, { headers: corsHeaders });
}
