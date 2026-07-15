// Sportmonks → canonical CricketMatch normalizer. LIVE source (verified 2026-07-15: balls[] grows
// ball-by-ball in-play with sub-minute latency — 3-poll growth test on fixture 70106, 2/2
// transitions). Normalizes the SAME shape Cricsheet does (cricketTypes.ts), so the reducer and
// everything above it never learns which source a match came from.
//
// PURE normalizer: takes an already-fetched fixture payload (the `data` object of
// GET /fixtures/{id}?include=balls,localteam,visitorteam,venue). The authenticated fetch lives
// with the route wiring (a later gate) — SPORTMONKS_TOKEN never appears here.
//
// Source quirks absorbed HERE (all verified against 1,152 real balls across 6 fixtures, 0
// invariant violations):
//  - WIDES have no dedicated field — recovered from score.name (~/wide/i) with the run value in
//    score.runs. bye/leg_bye/noball_runs are proper ints.
//  - runsOffBat: 0 on a wide; runs − noball_runs on a no-ball; else runs.
//  - runsTotal: runs + bye + leg_bye (wide runs already live in `runs`).
//  - COMPOUND outcomes exist ("Run Out + 1 Run", "1NB + 1 Run+ Run Out") — wicket detection uses
//    the is_wicket/out FLAGS, and kind uses substring matching, never exact names.
//  - balls[].ball is NOT unique (re-bowls repeat 0.3) — the stable key is ball.id.
//  - Innings arrive flat, keyed by scoreboard "S1"/"S2"; ball.team is the BATTING side.
//  - Dismissed batter arrives as batsmanout_id only; names resolve via a registry built from
//    every ball's batsman/bowler objects (a never-faced non-striker degrades to "Player <id>").

import type {
  CricketMatch, CricketInnings, CricketOver, CricketDelivery, CricketExtras,
  CricketWicket, DismissalKind, Player,
} from './cricketTypes';

// --- Raw Sportmonks shapes (only what we read; defensively optional) ---
interface SmPlayer { id?: number; fullname?: string; }
interface SmScore {
  id?: number; name?: string; runs?: number; four?: boolean; six?: boolean;
  bye?: number; leg_bye?: number; noball?: number; noball_runs?: number;
  is_wicket?: boolean; out?: boolean;
}
interface SmBall {
  id?: number; ball?: number; scoreboard?: string; team_id?: number;
  batsman_id?: number; bowler_id?: number;
  batsman_one_on_creeze_id?: number; batsman_two_on_creeze_id?: number;
  batsmanout_id?: number | null; catchstump_id?: number | null; runout_by_id?: number | null;
  batsman?: SmPlayer; bowler?: SmPlayer; score?: SmScore;
  team?: { id?: number; name?: string };
  updated_at?: string;
}
interface SmFixture {
  id?: number; type?: string; status?: string; note?: string; starting_at?: string;
  localteam?: { data?: { name?: string } } | { name?: string };
  visitorteam?: { data?: { name?: string } } | { name?: string };
  venue?: { data?: { name?: string } } | { name?: string };
  balls?: { data?: SmBall[] } | SmBall[];
}

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const str = (v: unknown): string => (v == null ? '' : String(v));
const unwrap = <T,>(v: { data?: T } | T | undefined): T | undefined =>
  v && typeof v === 'object' && 'data' in (v as object) ? (v as { data?: T }).data : (v as T | undefined);

// score.name → DismissalKind. SUBSTRING match (compound names!). Only called on flagged wickets.
function dismissalKind(name: string): DismissalKind {
  const n = name.toLowerCase();
  if (n.includes('catch')) return 'caught';
  if (n.includes('bowled')) return 'bowled';
  if (n.includes('lbw')) return 'lbw';
  if (n.includes('stump')) return 'stumped';
  if (n.includes('run out')) return 'run_out';
  if (n.includes('hit wicket')) return 'hit_wicket';
  return 'other';
}

export function normalizeSportmonks(raw: SmFixture, matchId?: string): CricketMatch {
  const balls: SmBall[] = (() => {
    const b = raw.balls;
    if (Array.isArray(b)) return b;
    return b?.data ?? [];
  })();

  // Player registry: id → Player, from every batsman/bowler object seen. Resolves batsmanout_id /
  // catchstump_id / runout_by_id, which arrive as bare ids.
  const registry = new Map<number, Player>();
  for (const b of balls) {
    for (const p of [b.batsman, b.bowler]) {
      if (p?.id != null && p.fullname) registry.set(p.id, { name: p.fullname, sourceId: String(p.id) });
    }
  }
  const byId = (id?: number | null): Player | undefined =>
    id == null ? undefined : registry.get(id) ?? { name: `Player ${id}`, sourceId: String(id) };

  const type = str(raw.type) || 'T20I';
  const isT20 = /t20/i.test(type);

  // Innings: group by scoreboard ("S1","S2"), preserving feed order (chronological — verified).
  const bySb = new Map<string, SmBall[]>();
  for (const b of balls) {
    const sb = str(b.scoreboard) || 'S1';
    if (!bySb.has(sb)) bySb.set(sb, []);
    bySb.get(sb)!.push(b);
  }
  const innings: CricketInnings[] = [...bySb.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sb, list], i) => normalizeInnings(list, i + 1, byId, isT20));

  const local = unwrap(raw.localteam) as { name?: string } | undefined;
  const visitor = unwrap(raw.visitorteam) as { name?: string } | undefined;
  const venue = unwrap(raw.venue) as { name?: string } | undefined;

  const match: CricketMatch = {
    source: 'sportmonks',
    matchId: str(matchId ?? raw.id),
    format: isT20 ? 'T20' : type,
    oversPerInnings: isT20 ? 20 : 50,
    teams: [str(local?.name), str(visitor?.name)],
    venue: str(venue?.name),
    date: str(raw.starting_at).slice(0, 10),
    innings,
  };

  // Outcome from the note ("England won by 56 runs") — light parse, omitted when it doesn't fit.
  const m = /^(.+?) won by (.+)$/.exec(str(raw.note).trim());
  if (m) match.outcome = { winner: m[1], by: m[2] };

  return match;
}

function normalizeInnings(
  list: SmBall[], index: number, byId: (id?: number | null) => Player | undefined, isT20: boolean,
): CricketInnings {
  const overs: CricketOver[] = [];
  let current: CricketOver | null = null;
  let legalInOver = 0;

  for (const b of list) {
    const overNum = Math.floor(num(b.ball));
    if (!current || current.over !== overNum) {
      current = { over: overNum, deliveries: [] };
      overs.push(current);
      legalInOver = 0;
    }
    const s = b.score ?? {};
    const name = str(s.name);
    const wide = /wide/i.test(name);
    const noball = num(s.noball) > 0;
    const isLegal = !wide && !noball;
    if (isLegal) legalInOver += 1;

    const runs = num(s.runs);
    const noballRuns = num(s.noball_runs);
    const extras: CricketExtras = {
      wides: wide ? runs : 0,
      noballs: noballRuns,
      byes: num(s.bye),
      legbyes: num(s.leg_bye),
    };
    const runsOffBat = wide ? 0 : noball ? runs - noballRuns : runs;
    const runsTotal = runs + extras.byes + extras.legbyes;
    // Same invariant as the Cricsheet normalizer — THROW, never emit silently-wrong data.
    if (runsTotal !== runsOffBat + extras.wides + extras.noballs + extras.byes + extras.legbyes) {
      throw new Error(
        `[sportmonks] runs invariant violated at ball ${b.ball} (id ${b.id}): '${name}' ` +
        `total=${runsTotal} !== offBat=${runsOffBat} + extras`,
      );
    }

    const striker = byId(b.batsman_id) ?? { name: str(b.batsman?.fullname) };
    const nonStrikerId = b.batsman_two_on_creeze_id === b.batsman_id ? b.batsman_one_on_creeze_id : b.batsman_two_on_creeze_id;
    const delivery: CricketDelivery = {
      key: String(b.id ?? `${index}.${b.ball}.${current.deliveries.length}`),
      over: overNum,
      ballInOver: isLegal ? legalInOver : legalInOver + 1,
      label: labelOf(num(b.ball)),
      isLegal,
      striker,
      nonStriker: byId(nonStrikerId) ?? { name: '' },
      bowler: byId(b.bowler_id) ?? { name: str(b.bowler?.fullname) },
      runsOffBat,
      extras,
      runsTotal,
    };
    if (b.updated_at) delivery.updatedAt = str(b.updated_at);

    if (s.is_wicket || s.out || b.batsmanout_id != null) {
      const wicket: CricketWicket = {
        kind: dismissalKind(name),
        playerOut: byId(b.batsmanout_id) ?? striker,
      };
      const fielder = byId(b.catchstump_id) ?? byId(b.runout_by_id);
      if (fielder) wicket.fielder = fielder;
      delivery.wicket = wicket;
    }
    current.deliveries.push(delivery);
  }

  const innings: CricketInnings = { index, battingTeam: str(list[0]?.team?.name), overs };
  // T20 LAW: the mandatory powerplay is the first 6 overs — a rule of the format, not source data
  // (Sportmonks exposes no powerplay object; Cricsheet's data confirms [0,6) in every T20I).
  // CAVEAT: a rain-shortened innings adjusts the powerplay; this default can overstate it there.
  if (isT20) innings.powerplayOvers = [0, 6];
  return innings;
}

// 0.30000000000000004-proof label: over.ballInLabel from the raw float, e.g. 17.1 → "17.1".
function labelOf(ball: number): string {
  return `${Math.floor(ball)}.${Math.round((ball % 1) * 10)}`;
}
