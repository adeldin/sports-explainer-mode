import { NextRequest, NextResponse } from 'next/server';
import type { Game } from '../explain/zylaProvider';
import { normalizeCricsheet } from '../explain/cricsheetProvider';
import { normalizeSportmonks } from '../explain/sportmonksProvider';
import { getSmLiveBoard, getSmFixture, SM_ID_PREFIX } from '../explain/sportmonksLive';
import { cricketFlag } from '../explain/cricketFlags';
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
//
// Board scores are SHORT ("257/3") — GameCard is a 150px tile whose name column gets whatever
// width the score leaves behind, and the long "(20.0)" overs suffix crushes the team name out of
// the row (Gate 12 Bug 1). Overs detail lives in the recap facts instead. A side with no innings
// (rain-abandoned 1496574) emits "DNB" (did not bat) — never '' (which read as a missing row).
function shortScore(e: CricketIndexEntry, team: string): string {
  const s = e.scores[team];
  return s ? s.replace(/\s*\(.*\)\s*$/, '') : 'DNB';
}

function toGame(e: CricketIndexEntry): Game {
  const ms = Date.parse(`${e.date}T00:00:00Z`);
  const homeFlag = cricketFlag(e.teams[0]);
  const awayFlag = cricketFlag(e.teams[1]);
  return {
    id: e.id,
    homeTeam: e.teams[0],
    awayTeam: e.teams[1],
    homeScore: shortScore(e, e.teams[0]),
    awayScore: shortScore(e, e.teams[1]),
    status: e.note || 'No result',
    isLive: false,
    sport: 'cricket',
    state: 'post',
    ...(Number.isFinite(ms) ? { startTime: ms } : {}),
    ...(e.venue ? { venue: e.venue } : {}),
    ...(homeFlag ? { homeFlag } : {}),
    ...(awayFlag ? { awayFlag } : {}),
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
    // 'sm-' prefix routes to the LIVE (Sportmonks) source. The prefix is load-bearing: the two
    // id spaces (7-digit Cricinfo vs 5-digit Sportmonks) not colliding today is luck, not
    // contract. getSmFixture self-gates on CRICKET_SM_LIVE — off -> null, same as unknown id.
    if (matchId.startsWith(SM_ID_PREFIX)) {
      try {
        const raw = await getSmFixture(matchId.slice(SM_ID_PREFIX.length));
        if (!raw) return NextResponse.json({ match: null }, { headers: corsHeaders });
        const match: CricketMatch = normalizeSportmonks(raw, matchId);
        return NextResponse.json({ match }, { headers: corsHeaders });
      } catch {
        return NextResponse.json({ match: null }, { headers: corsHeaders });
      }
    }
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
  const archival = entries.map(toGame);

  // Live merge (no-op when CRICKET_SM_LIVE is off: getSmLiveBoard returns []).
  //
  // ═══ ARCHIVAL WINS ═══ The one genuinely new invariant of the live path: when the SAME real
  // match exists in both sources (Sportmonks 'Finished' + Cricsheet ingested 1-5 days later),
  // the ARCHIVAL entry is served and the sm- twin is DROPPED — Cricsheet is free (no quota),
  // richer (toss/officials/real powerplays), and keys the explain path we validated. Because the
  // id spaces differ, the dedupe keys on TEAMS+DATE equality, order-insensitive.
  const liveGames = await getSmLiveBoard(date ?? undefined);
  const seen = new Set(archival.map((g) => dedupeKey(g)));
  const merged = [...archival, ...liveGames.filter((g) => !seen.has(dedupeKey(g)))];
  return NextResponse.json({ matches: merged }, { headers: corsHeaders });
}

// Order-insensitive teams+local-date key for ARCHIVAL-WINS dedupe (ids can't be compared —
// different id spaces). Date from startTime's UTC day, matching Cricsheet's match-local date.
function dedupeKey(g: Game): string {
  const day = g.startTime ? new Date(g.startTime).toISOString().slice(0, 10) : '';
  return [...[g.homeTeam, g.awayTeam].map((t) => t.toLowerCase().trim())].sort().join('|') + '|' + day;
}
