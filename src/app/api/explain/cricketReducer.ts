// Source-agnostic reducer: (CricketMatch, cursorKey) → the explain contract's TWO slots,
// `play` (the delivery being explained) + `gameContext` (digested state AS OF that delivery).
// NOT a window of recent balls — the surrounding deliveries collapse into cumulative STATE
// (validated at Gate 0.5 on the production model, openai/gpt-oss-120b, all 4 levels).
//
// ONE code path serves REPLAY (cursor = user's position) and LIVE (cursor = latest ball):
// a single O(n) fold up to AND INCLUDING the cursor delivery. No running state is stored on the
// model — every counter (score, figures, required rate, target) is folded here at reduction time.
//
// String shapes reproduce the Gate 0.5 validated examples. Example A (a 1st-innings powerplay
// wicket) is reproduced byte-for-byte. The current run rate is CUT (Gate 0.5: no output used it).

import type { CricketMatch, CricketInnings, CricketDelivery, CricketWicket } from './cricketTypes';

export interface ReducedExplain {
  play: string;
  gameContext: string;
}

export function reduceForExplain(match: CricketMatch, cursorKey: string): ReducedExplain {
  const located = locateCursor(match, cursorKey);
  if (!located) throw new Error(`[reducer] cursor key not found: ${cursorKey}`);
  const { innings } = located;

  // Fold this innings up to AND INCLUDING the cursor delivery.
  const f = foldInnings(innings, cursorKey);
  const cur = f.cursor;
  const oppTeam = match.teams.find((t) => t !== innings.battingTeam) ?? '';
  const ord = (n: number) => n + ordinalSuffix(n);
  const oversDisp = `${Math.floor(f.legalBalls / 6)}.${f.legalBalls % 6}`;

  // --- play: the cursor delivery ---
  const play = cur.wicket ? playWicket(cur, f) : playRuns(cur);

  // --- gameContext: sentence fragments joined by a space (each ends with its own period) ---
  const frags: string[] = [];
  frags.push(`Format ${match.format} (${match.oversPerInnings} overs).`);

  if (innings.index >= 2) {
    const target = firstInningsTotal(match) + 1;
    frags.push(`${innings.battingTeam} ${ord(innings.index)} innings chasing ${target}.`);
    frags.push(`${f.score}/${f.wkts} after ${oversDisp} overs.`);
    // required rate — 2nd innings only; NO current run rate (cut at Gate 0.5)
    const need = target - f.score;
    const ballsLeft = match.oversPerInnings * 6 - f.legalBalls;
    if (ballsLeft > 0) {
      const rrr = ((need / ballsLeft) * 6).toFixed(1);
      frags.push(`Phase: ${phaseClause(cur.over, innings, match.oversPerInnings)}`);
      frags.push(`Need ${need} off ${ballsLeft} — required run rate ${rrr}.`);
    } else {
      frags.push(`Phase: ${phaseClause(cur.over, innings, match.oversPerInnings)}`);
    }
  } else {
    frags.push(`${innings.battingTeam} ${ord(innings.index)} innings v ${oppTeam}, ${f.score}/${f.wkts} after ${oversDisp} overs.`);
    frags.push(`Phase: ${phaseClause(cur.over, innings, match.oversPerInnings)}`);
  }

  // batter + bowler — order mirrors the validated examples: on a wicket, bowler then dismissed
  // batter (Example A); otherwise striker then bowler (Example B).
  const bowlerFrag = `Bowler ${cur.bowler.name} ${bowlerFigures(f)}.`;
  if (cur.wicket) {
    const out = cur.wicket.playerOut;
    const fig = f.batters.get(out.name) ?? [0, 0];
    frags.push(bowlerFrag);
    frags.push(`Batter dismissed: ${out.name}, ${fig[0]} off ${fig[1]}.`);
  } else {
    const fig = f.batters.get(cur.striker.name) ?? [0, 0];
    frags.push(`Striker ${cur.striker.name} ${fig[0]} off ${fig[1]}.`);
    frags.push(bowlerFrag);
  }

  return { play, gameContext: frags.join(' ') };
}

// ---- fold ----

interface Fold {
  score: number;
  wkts: number;
  legalBalls: number;
  batters: Map<string, [number, number]>; // name -> [runs, balls faced]
  bowlers: Map<string, [number, number, number]>; // name -> [legalBalls, runsConceded, wickets]
  cursor: CricketDelivery;
}

function foldInnings(innings: CricketInnings, cursorKey: string): Fold {
  let score = 0, wkts = 0, legalBalls = 0;
  const batters = new Map<string, [number, number]>();
  const bowlers = new Map<string, [number, number, number]>();
  let cursor: CricketDelivery | undefined;

  outer: for (const over of innings.overs) {
    for (const d of over.deliveries) {
      score += d.runsTotal;
      if (d.wicket) wkts += 1;
      if (d.isLegal) legalBalls += 1;

      const b = batters.get(d.striker.name) ?? [0, 0];
      b[0] += d.runsOffBat;
      if (d.isLegal) b[1] += 1; // balls faced counted on legal deliveries (matches validated figures)
      batters.set(d.striker.name, b);

      const bw = bowlers.get(d.bowler.name) ?? [0, 0, 0];
      if (d.isLegal) bw[0] += 1;
      bw[1] += d.runsOffBat + d.extras.wides + d.extras.noballs; // byes/leg-byes not charged to bowler
      if (d.wicket && bowlerCredited(d.wicket.kind)) bw[2] += 1;
      bowlers.set(d.bowler.name, bw);

      if (d.key === cursorKey) { cursor = d; break outer; }
    }
  }
  if (!cursor) throw new Error(`[reducer] cursor key not in innings: ${cursorKey}`);
  return { score, wkts, legalBalls, batters, bowlers, cursor };
}

function locateCursor(match: CricketMatch, cursorKey: string): { innings: CricketInnings } | null {
  for (const innings of match.innings) {
    for (const over of innings.overs) {
      for (const d of over.deliveries) if (d.key === cursorKey) return { innings };
    }
  }
  return null;
}

function firstInningsTotal(match: CricketMatch): number {
  const first = match.innings[0];
  if (!first) return 0;
  let t = 0;
  for (const over of first.overs) for (const d of over.deliveries) t += d.runsTotal;
  return t;
}

// ---- string builders ----

function bowlerFigures(f: Fold): string {
  const [balls, runs, wkts] = f.bowlers.get(f.cursor.bowler.name) ?? [0, 0, 0];
  return `${Math.floor(balls / 6)}.${balls % 6}–${runs}–${wkts}`; // en-dash separators
}

function playWicket(d: CricketDelivery, f: Fold): string {
  const w = d.wicket as CricketWicket;
  const out = w.playerOut;
  const fig = f.batters.get(out.name) ?? [0, 0];
  return `${d.bowler.name} to ${d.striker.name} — ${dismissalPhrase(w)}. ${shortName(out.name)} out for ${fig[0]} (${fig[1]} balls).`;
}

function playRuns(d: CricketDelivery): string {
  return `${d.bowler.name} to ${d.striker.name}, ${outcomePhrase(d)}.`;
}

function dismissalPhrase(w: CricketWicket): string {
  const fielder = w.fielder?.name;
  switch (w.kind) {
    case 'caught': return fielder ? `caught by ${fielder}` : 'caught';
    case 'bowled': return 'bowled';
    case 'lbw': return 'lbw';
    case 'stumped': return fielder ? `stumped by ${fielder}` : 'stumped';
    case 'run_out': return fielder ? `run out by ${fielder}` : 'run out';
    case 'hit_wicket': return 'hit wicket';
    default: return 'out';
  }
}

// Only "1 run" and the caught-wicket phrasing are frozen-validated; other outcomes are
// reasonable extrapolations in the same register.
function outcomePhrase(d: CricketDelivery): string {
  if (d.runsOffBat === 6) return 'SIX';
  if (d.runsOffBat === 4) return 'FOUR';
  const e = d.extras;
  if (e.wides) return e.wides === 1 ? 'wide' : `${e.wides} wides`;
  if (e.noballs) return d.runsOffBat > 0 ? `no ball, ${d.runsOffBat} run${plural(d.runsOffBat)}` : 'no ball';
  if (e.byes) return e.byes === 1 ? '1 bye' : `${e.byes} byes`;
  if (e.legbyes) return e.legbyes === 1 ? '1 leg bye' : `${e.legbyes} leg byes`;
  return d.runsTotal === 0 ? 'no run' : `${d.runsTotal} run${plural(d.runsTotal)}`;
}

// powerplay range from normalized boundaries; death by convention (last 4 overs, no source data);
// middle otherwise. "middle overs." is not in the validated set.
function phaseClause(over: number, innings: CricketInnings, oversPerInnings: number): string {
  const pp = innings.powerplayOvers;
  if (pp && over >= pp[0] && over < pp[1]) {
    return `powerplay (overs ${pp[0] + 1}–${pp[1]}, fielding restrictions).`;
  }
  if (over >= oversPerInnings - 4) {
    return `death (overs ${oversPerInnings - 4}–${oversPerInnings}).`;
  }
  return `middle overs.`;
}

function bowlerCredited(kind: CricketWicket['kind']): boolean {
  return kind === 'bowled' || kind === 'caught' || kind === 'lbw' || kind === 'stumped' || kind === 'hit_wicket';
}

const plural = (n: number) => (n === 1 ? '' : 's');
const shortName = (name: string) => name.trim().split(/\s+/).pop() ?? name;

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
