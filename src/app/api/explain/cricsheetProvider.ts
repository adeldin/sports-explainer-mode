// Cricsheet → canonical CricketMatch normalizer. POST-MATCH source (ODC-BY 1.0, free), keyed on
// Cricinfo match ids at the FILENAME level (the id is not in the payload, so the caller passes it).
// Mirrors zylaProvider's defensive-parsing discipline (never blanket-cast; tolerate absent fields)
// without importing its unexported helpers. Source quirks are absorbed HERE so nothing leaks into
// the canonical model or the reducer.
//
// Verified against real match 1496578 (Eng v Ind 5th T20I, 2026-07-11): 256 deliveries, wides/
// no-balls/leg-byes, a caught dismissal, and a re-bowled over (over 0 = 7 entries).

import type {
  CricketMatch, CricketInnings, CricketOver, CricketDelivery, CricketExtras,
  CricketWicket, DismissalKind, Player,
} from './cricketTypes';

// --- Raw Cricsheet JSON shape (only the fields we read; all defensively optional). ---
interface CsRaw {
  info?: {
    teams?: string[];
    venue?: string;
    dates?: string[];
    match_type?: string;
    overs?: number;
    toss?: { winner?: string; decision?: string };
    outcome?: { winner?: string; by?: { runs?: number; wickets?: number; innings?: number }; result?: string };
    player_of_match?: string[];
    registry?: { people?: Record<string, string> };
  };
  innings?: CsInnings[];
}
interface CsInnings {
  team?: string;
  overs?: { over?: number; deliveries?: CsDelivery[] }[];
  powerplays?: { from?: number; to?: number; type?: string }[];
}
interface CsDelivery {
  actual_delivery?: string;
  batter?: string;
  bowler?: string;
  non_striker?: string;
  runs?: { batter?: number; extras?: number; total?: number };
  extras?: { wides?: number; noballs?: number; byes?: number; legbyes?: number; penalty?: number };
  wickets?: { player_out?: string; kind?: string; fielders?: { name?: string }[] }[];
}

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const str = (v: unknown): string => (v == null ? '' : String(v));

// Cricsheet dismissal `kind` strings → canonical DismissalKind. Unknown kinds map to 'other'
// (loud-enough via the normalized value) rather than being invented.
const DISMISSAL: Record<string, DismissalKind> = {
  bowled: 'bowled',
  caught: 'caught',
  'caught and bowled': 'caught',
  lbw: 'lbw',
  'run out': 'run_out',
  stumped: 'stumped',
  'hit wicket': 'hit_wicket',
};

export function normalizeCricsheet(raw: CsRaw, matchId: string): CricketMatch {
  const info = raw.info ?? {};
  const people = info.registry?.people ?? {};
  const player = (name?: string): Player => {
    const n = str(name);
    const id = people[n];
    return id ? { name: n, sourceId: id } : { name: n };
  };

  const innings: CricketInnings[] = (raw.innings ?? []).map((inn, i) =>
    normalizeInnings(inn, i + 1, player),
  );

  const match: CricketMatch = {
    source: 'cricsheet',
    matchId: str(matchId),
    format: str(info.match_type) || 'T20',
    oversPerInnings: num(info.overs) || 20,
    teams: [str(info.teams?.[0]), str(info.teams?.[1])],
    venue: str(info.venue),
    date: str(info.dates?.[0]),
    innings,
  };

  if (info.toss?.winner) {
    match.toss = { winner: str(info.toss.winner), decision: info.toss.decision === 'bat' ? 'bat' : 'field' };
  }
  if (info.outcome?.winner) {
    match.outcome = { winner: str(info.outcome.winner), by: outcomeBy(info.outcome.by) };
  }
  if (info.player_of_match?.[0]) match.playerOfMatch = str(info.player_of_match[0]);

  return match;
}

function outcomeBy(by?: { runs?: number; wickets?: number; innings?: number }): string {
  if (!by) return '';
  if (by.innings) return `an innings and ${num(by.runs)} runs`;
  if (by.runs) return `${by.runs} runs`;
  if (by.wickets) return `${by.wickets} wickets`;
  return '';
}

// Normalize Cricsheet's fractional powerplay {from:0.1,to:5.6|5.7} to an integer half-open
// over range [startOver, endOverExclusive). floor(from)=first over; floor(to)+1=exclusive end,
// which absorbs the {to:5.7} extras quirk (5.6 and 5.7 both → 6).
function powerplayRange(inn: CsInnings): [number, number] | undefined {
  const pp = (inn.powerplays ?? []).find((p) => p.type === 'mandatory') ?? inn.powerplays?.[0];
  if (!pp || pp.from == null || pp.to == null) return undefined;
  return [Math.floor(num(pp.from)), Math.floor(num(pp.to)) + 1];
}

function normalizeInnings(inn: CsInnings, index: number, player: (n?: string) => Player): CricketInnings {
  const overs: CricketOver[] = (inn.overs ?? []).map((ov) => {
    const overNum = num(ov.over);
    let legal = 0; // legal balls bowled so far IN THIS OVER — drives ballInOver
    const deliveries: CricketDelivery[] = (ov.deliveries ?? []).map((dd, seq) => {
      const extras = mapExtras(dd.extras);
      const isLegal = !(extras.wides || extras.noballs);
      if (isLegal) legal += 1;
      const ballInOver = isLegal ? legal : legal + 1; // a wide/no-ball is an attempt at the next legal ball

      const r = dd.runs ?? {};
      const batter = num(r.batter);
      const extrasTotal = num(r.extras);
      const total = num(r.total);
      // INVARIANT (throws loudly): silently-wrong cricket data yields confident, plausible,
      // incorrect teaching — the worst failure for this product. Never emit past a mismatch.
      if (total !== batter + extrasTotal) {
        throw new Error(
          `[cricsheet] runs invariant violated at innings ${index} delivery ${str(dd.actual_delivery)}: ` +
          `total=${total} !== batter=${batter} + extras=${extrasTotal}`,
        );
      }

      const delivery: CricketDelivery = {
        key: `${index}.${overNum}.${seq}`,
        over: overNum,
        ballInOver,
        label: str(dd.actual_delivery),
        isLegal,
        striker: player(dd.batter),
        nonStriker: player(dd.non_striker),
        bowler: player(dd.bowler),
        runsOffBat: batter,
        extras,
        // Authoritative total from the source (already invariant-checked). Note: a rare `penalty`
        // extra sits in r.extras but not the 4 canonical categories — runsTotal stays correct
        // regardless, so scoring folds are never wrong; revisit the categories if a penalty match appears.
        runsTotal: total,
      };
      const wk = mapWicket(dd.wickets, player);
      if (wk) delivery.wicket = wk;
      return delivery;
    });
    return { over: overNum, deliveries };
  });

  const innings: CricketInnings = { index, battingTeam: str(inn.team), overs };
  const pp = powerplayRange(inn);
  if (pp) innings.powerplayOvers = pp;
  return innings;
}

function mapExtras(e?: CsDelivery['extras']): CricketExtras {
  return {
    wides: num(e?.wides),
    noballs: num(e?.noballs),
    byes: num(e?.byes),
    legbyes: num(e?.legbyes),
  };
}

function mapWicket(
  wickets: CsDelivery['wickets'],
  player: (n?: string) => Player,
): CricketWicket | undefined {
  const w = wickets?.[0];
  if (!w) return undefined;
  const wicket: CricketWicket = {
    kind: DISMISSAL[str(w.kind).toLowerCase()] ?? 'other',
    playerOut: player(w.player_out),
  };
  const fielderName = w.fielders?.[0]?.name;
  if (fielderName) wicket.fielder = player(fielderName);
  return wicket;
}
