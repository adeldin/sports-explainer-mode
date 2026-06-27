// SoccerMatchPulse — PURE, deterministic "match state" engine for soccer (no React, no network,
// no LLM). Mirrors lib/coach.ts / lib/matchTimeline.ts in style + testability. It consumes the
// Highlightly event timeline (MatchEvent[]) + score + minute and computes a normalized strategic
// state object: phase, score state, leverage, manpower, discipline, substitution posture, and
// strategic tags — plus a SEPARATE trigger detector for "should this surface now?".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// HONESTY GUARDRAIL (load-bearing): this is PURE STATE only. The engine must NEVER infer or output
// possession, formation, pressing, "momentum as dominance", or field position — Highlightly's feed
// carries none of it, and inventing it is the cardinal sin. The ONLY pressure signal allowed is
// event CLUSTERING ("multiple events in a short window"), and it is labelled as such — never as
// "team X is dominating". Every field below is derivable from event TYPES + minute + score alone.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import { MatchEvent, sortEvents } from './matchTimeline';

export type GamePhase = 'opening' | 'early' | 'adjusting' | 'crunch' | 'closing';
export type ScoreState =
  | 'level'
  | 'home_leading_by_one' | 'home_leading_by_two_plus'
  | 'away_leading_by_one' | 'away_leading_by_two_plus';
export type Leverage = 'low' | 'medium' | 'high' | 'extreme';
export type ManpowerState = 'even' | 'home_advantage' | 'away_advantage';
export type Confidence = 'low' | 'medium' | 'high';
export type Side = 'home' | 'away';

export interface TeamScore { team: string; goals: number }

export interface SoccerMatchPulse {
  minute: number;
  score: { home: TeamScore; away: TeamScore };
  gamePhase: GamePhase;
  scoreState: ScoreState;
  leverage: Leverage;
  manpower: { home: number; away: number; state: ManpowerState; redCardMinute?: number };
  discipline: { homeYellows: number; awayYellows: number; reds: { team: string; minute: number }[] };
  recentEvents: MatchEvent[];
  substitutionPosture: string | null;
  derivedTags: string[];
  triggerReason: string | null;   // populated by the CALLER via detectTrigger(); null from compute
  confidence: Confidence;
  knownLimitations: string[];
}

// Canonical event types are matched case-insensitively (the feed emits Title Case verbatim).
const T = {
  goal: 'goal', yellow: 'yellow card', red: 'red card',
  sub: 'substitution', missedPen: 'missed penalty',
} as const;
const RELEVANT = new Set<string>([T.goal, T.yellow, T.red, T.sub, T.missedPen]);

const norm = (s?: string): string => (s || '').trim().toLowerCase();
const isType = (e: MatchEvent, t: string): boolean => norm(e.type) === t;

// The fixed honesty disclaimer — what this engine can NEVER know from the feed.
const KNOWN_LIMITATIONS: string[] = [
  'No possession or pass data',
  'No shots or xG',
  'No formation or tactical setup',
  'No player positions or field zones',
];

// minute → phase. opening 0-15 / early 16-45 / adjusting 46-60 / crunch 61-80 / closing 81+.
export function computePhase(minute: number): GamePhase {
  if (minute <= 15) return 'opening';
  if (minute <= 45) return 'early';
  if (minute <= 60) return 'adjusting';
  if (minute <= 80) return 'crunch';
  return 'closing';
}

// margin (home - away) → score state.
export function computeScoreState(homeGoals: number, awayGoals: number): ScoreState {
  const m = homeGoals - awayGoals;
  if (m === 0) return 'level';
  if (m === 1) return 'home_leading_by_one';
  if (m >= 2) return 'home_leading_by_two_plus';
  if (m === -1) return 'away_leading_by_one';
  return 'away_leading_by_two_plus';
}

// Leverage = score margin × phase, with a manpower bump in tight games. Documented table:
//   margin ≥3 (decided)        → low  at every phase.
//   margin 2                   → low early; medium in crunch/closing.
//   margin 1 (one-goal game)   → low / medium / medium / high / extreme   (by phase index 0-4).
//   margin 0 (level)           → low / medium / medium / high / high.
// Then: if manpower is uneven AND the game is within one goal, bump leverage one level (a red card
// raises the stakes of a tight game). Clamped low..extreme.
//
// A level game in the crunch phase (61-80') is HIGH — a late level World Cup game is genuinely
// high-stakes (the design-note reading, adopted over the earlier offhand "medium" test guess).
const ORDER: Leverage[] = ['low', 'medium', 'high', 'extreme'];
const PHASE_IDX: Record<GamePhase, number> = { opening: 0, early: 1, adjusting: 2, crunch: 3, closing: 4 };
const ONE_GOAL_LEVERAGE = [0, 1, 1, 2, 3];   // by phase index
const LEVEL_LEVERAGE = [0, 1, 1, 2, 2];      // by phase index (crunch=2 → level/crunch = HIGH)

export function computeLeverage(homeGoals: number, awayGoals: number, phase: GamePhase, manpowerEven: boolean): Leverage {
  const margin = Math.abs(homeGoals - awayGoals);
  const p = PHASE_IDX[phase];
  let idx: number;
  if (margin >= 3) idx = 0;
  else if (margin === 2) idx = p >= 3 ? 1 : 0;
  else if (margin === 1) idx = ONE_GOAL_LEVERAGE[p];
  else idx = LEVEL_LEVERAGE[p];
  if (!manpowerEven && margin <= 1) idx += 1;     // a red card in a tight game raises the stakes
  return ORDER[Math.max(0, Math.min(3, idx))];
}

// The main engine. Deterministic — same inputs always yield the same pulse.
export function computeSoccerPulse(
  events: MatchEvent[],
  score: { home: number; away: number },
  minute: number,
  homeTeam: string,
  awayTeam: string,
): SoccerMatchPulse {
  const evs = sortEvents(events || []);
  const sideOf = (team?: string): Side | null => {
    const t = norm(team);
    if (!t) return null;
    if (t === norm(homeTeam)) return 'home';
    if (t === norm(awayTeam)) return 'away';
    return null;
  };
  const teamName = (s: Side): string => (s === 'home' ? homeTeam : awayTeam);

  const margin = score.home - score.away;            // + = home leads
  const absMargin = Math.abs(margin);
  const leadingSide: Side | null = margin > 0 ? 'home' : margin < 0 ? 'away' : null;
  const trailingSide: Side | null = margin > 0 ? 'away' : margin < 0 ? 'home' : null;
  const gamePhase = computePhase(minute);
  const scoreState = computeScoreState(score.home, score.away);

  // --- Manpower from red cards (the only structural certainty the feed gives us) ---
  const reds = evs
    .filter(e => isType(e, T.red) && typeof e.minute === 'number')
    .map(e => ({ team: e.team || '', minute: e.minute as number }))
    .sort((a, b) => a.minute - b.minute);
  const homeReds = reds.filter(r => sideOf(r.team) === 'home').length;
  const awayReds = reds.filter(r => sideOf(r.team) === 'away').length;
  const homeMen = 11 - homeReds;
  const awayMen = 11 - awayReds;
  const mpState: ManpowerState = homeMen > awayMen ? 'home_advantage' : awayMen > homeMen ? 'away_advantage' : 'even';
  const manpowerEven = mpState === 'even';
  const manUpSide: Side | null = mpState === 'home_advantage' ? 'home' : mpState === 'away_advantage' ? 'away' : null;
  const manDownSide: Side | null = manUpSide ? (manUpSide === 'home' ? 'away' : 'home') : null;
  const redCardMinute = reds.length ? reds[reds.length - 1].minute : undefined;   // most recent red

  // --- Discipline ---
  const yellows = evs.filter(e => isType(e, T.yellow));
  const homeYellows = yellows.filter(e => sideOf(e.team) === 'home').length;
  const awayYellows = yellows.filter(e => sideOf(e.team) === 'away').length;

  // --- Recent relevant events (last ~6, filtered to meaningful types) ---
  const recentEvents = evs.filter(e => RELEVANT.has(norm(e.type))).slice(-6);

  // --- Substitution posture (NO positions — inferred from timing + score only) ---
  const subs = evs.filter(e => isType(e, T.sub));
  const subsAfter = (side: Side, m: number) => subs.filter(e => sideOf(e.team) === side && (e.minute ?? 0) >= m);
  let substitutionPosture: string | null = null;
  if (reds.length) {
    // Structural repair: the red-card side reshaping within ~12 min of going down a man.
    const lastRed = reds[reds.length - 1];
    const redSide = sideOf(lastRed.team);
    if (redSide && subs.some(e => sideOf(e.team) === redSide && (e.minute ?? -1) >= lastRed.minute && (e.minute ?? -1) <= lastRed.minute + 12)) {
      substitutionPosture = 'structural repair after the red card';
    }
  }
  if (!substitutionPosture && trailingSide && subsAfter(trailingSide, 60).length >= 2) {
    substitutionPosture = `${teamName(trailingSide)} chasing the game (multiple subs)`;
  }
  if (!substitutionPosture && leadingSide && subsAfter(leadingSide, 75).length >= 1) {
    substitutionPosture = `${teamName(leadingSide)} managing the game out`;
  }
  if (!substitutionPosture && margin === 0 && minute <= 72 && subsAfter('home', 60).length >= 1 && subsAfter('away', 60).length >= 1) {
    substitutionPosture = 'tactical chess — both reshaping while level';
  }

  // --- Derived strategic tags (emit ONLY when the condition genuinely holds) ---
  const tags: string[] = [];
  const goals = evs.filter(e => isType(e, T.goal));
  const lastGoalMinute = goals.length ? Math.max(...goals.map(g => g.minute ?? -Infinity)) : -Infinity;
  const totalBookings = homeYellows + awayYellows + reds.length;

  if (gamePhase === 'opening') tags.push('opening exchanges');
  if (goals.some(g => (g.minute ?? 99) <= 15)) tags.push('early goal');
  if (absMargin === 1) tags.push('one-goal game');
  if (absMargin === 1 && minute >= 80) tags.push('late one-goal game');
  if (absMargin >= 2) tags.push('two-goal-plus cushion');
  if (margin === 0 && minute >= 75) tags.push('tied late');
  if (!manpowerEven) tags.push('man advantage');
  if (manUpSide && leadingSide === manUpSide) tags.push('protecting the lead');
  if (manUpSide && trailingSide === manUpSide) tags.push('chasing with the extra man');
  if (manUpSide && margin === 0) tags.push('man advantage in a level game');
  if (manDownSide && leadingSide === manDownSide) tags.push('protecting with 10');
  if (manDownSide && trailingSide === manDownSide) tags.push('chasing with 10');
  if (trailingSide && minute >= 80 && absMargin >= 1 && absMargin <= 2) tags.push('desperation chase');
  if (leadingSide && minute >= 80 && absMargin <= 2) tags.push('game management');
  if (minute >= 85) tags.push('endgame approaching');
  if (totalBookings >= 4 || homeYellows >= 3 || awayYellows >= 3) tags.push('card accumulation');
  if (lastGoalMinute >= minute - 5 && lastGoalMinute > -Infinity) tags.push('post-goal response');
  if (evs.some(e => isType(e, T.missedPen) && (e.minute ?? -1) >= minute - 5)) tags.push('missed-penalty swing');

  // Never leave derivedTags empty — give the downstream LLM a light, honest anchor when no specific
  // strategic tag fired (e.g. a level, even-strength game before 75'). Generic, no fabricated drama.
  if (tags.length === 0) {
    tags.push(scoreState === 'level' ? 'level game' : absMargin === 1 ? 'one-goal game' : 'two-goal-plus cushion');
  }

  // --- Confidence: high when a red / clear score+late time imply strategy; medium for score OR
  // late time alone; low when the read would rest mainly on substitution inference (level + early). ---
  let confidence: Confidence;
  if (!manpowerEven) confidence = 'high';
  else if (absMargin >= 1 && minute >= 60) confidence = 'high';
  else if (absMargin >= 1) confidence = 'medium';
  else if (minute >= 75) confidence = 'medium';     // level but late = real, time-based stakes
  else confidence = 'low';                          // level + not late → rests on subs → low

  const leverage = computeLeverage(score.home, score.away, gamePhase, manpowerEven);

  return {
    minute,
    score: { home: { team: homeTeam, goals: score.home }, away: { team: awayTeam, goals: score.away } },
    gamePhase,
    scoreState,
    leverage,
    manpower: { home: homeMen, away: awayMen, state: mpState, redCardMinute },
    discipline: { homeYellows, awayYellows, reds },
    recentEvents,
    substitutionPosture,
    derivedTags: tags,
    triggerReason: null,    // computeSoccerPulse is the STATE engine; trigger is separate (below)
    confidence,
    knownLimitations: KNOWN_LIMITATIONS,
  };
}

// Trigger detector — "should Coach's Corner surface NOW?" — kept separate so it's testable alone.
// Examines events that JUST happened (within ~2 min of `minute`) in priority order, plus time
// milestones as a fallback. `prevState` (optional) supplies score context for the conditional
// sub/yellow triggers (tied or one-goal only) — without it, those conditions are treated as met.
export function detectTrigger(
  events: MatchEvent[],
  minute: number,
  prevState?: SoccerMatchPulse | null,
): { triggered: boolean; reason: string | null } {
  const recent = (events || []).filter(e => typeof e.minute === 'number' && (e.minute as number) >= minute - 2 && (e.minute as number) <= minute);
  const has = (t: string) => recent.some(e => norm(e.type) === t);

  // Always-trigger major events.
  if (has(T.goal)) return { triggered: true, reason: 'Goal just scored' };
  if (has(T.red)) return { triggered: true, reason: 'Red card shown' };
  if (has(T.missedPen)) return { triggered: true, reason: 'Penalty missed' };

  // Tight game = level or one-goal (the only states where a sub/booking shifts strategy enough).
  const tight = !prevState || prevState.scoreState === 'level' || /leading_by_one$/.test(prevState.scoreState);
  if (minute >= 55 && has(T.sub) && tight) return { triggered: true, reason: 'Substitution in a tight game' };
  if (minute >= 60 && has(T.yellow) && tight) return { triggered: true, reason: 'Booking late in a tight game' };

  // Time milestones — only as a fallback when no major event fired (the checks above already returned).
  if ([45, 60, 75, 85, 90].includes(minute)) return { triggered: true, reason: `Match milestone (${minute}')` };

  return { triggered: false, reason: null };
}
