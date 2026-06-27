// SoccerMatchPulse — BACKEND COPY of the app's lib/soccerPulse.ts (Gate A engine), ported VERBATIM.
// ⚠️ KEEP IN SYNC with sports-explainer-mobile-v2/lib/soccerPulse.ts (same rules/tags/calibration,
// already unit-tested there). Copied rather than shared because the backend (src/) and the Expo app
// are separate packages with no shared module path — same pattern as the teamKey copy.
//
// PURE, deterministic "match state" engine for soccer (no LLM). Consumes the Highlightly event
// timeline (MatchEvent[]) + score + minute → a normalized strategic state object.
//
// HONESTY GUARDRAIL: PURE STATE only. NEVER infer possession, formation, pressing, momentum-as-
// dominance, or field position — the feed carries none of it. The only pressure signal allowed is
// event CLUSTERING, labelled as such. Every field is derivable from event TYPES + minute + score.

// --- Self-contained MatchEvent + sortEvents (mirror of the app's lib/matchTimeline.ts) ---
export interface MatchEvent {
  minute?: number;
  type?: string;
  team?: string;
  player?: string;
  detail?: string;
}
function sortEvents(events: MatchEvent[]): MatchEvent[] {
  return [...(events || [])].sort((a, b) => {
    const am = typeof a.minute === 'number' ? a.minute : Infinity;
    const bm = typeof b.minute === 'number' ? b.minute : Infinity;
    return am - bm;
  });
}

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
  // Gate D-1: REAL boxscore stats, CALLER-SET post-compute (like triggerReason) — NOT computed by the
  // pure engine, which never sees the boxscore. Absent on thin-data games. Self-contained type (no
  // import) to keep this engine a standalone copy. xG is not in the feed and never appears.
  teamStats?: { home: { possessionPct?: number; totalShots?: number; shotsOnTarget?: number };
                away: { possessionPct?: number; totalShots?: number; shotsOnTarget?: number } };
  confidence: Confidence;
  knownLimitations: string[];
}

const T = {
  goal: 'goal', yellow: 'yellow card', red: 'red card',
  sub: 'substitution', missedPen: 'missed penalty',
} as const;
const RELEVANT = new Set<string>([T.goal, T.yellow, T.red, T.sub, T.missedPen]);

const norm = (s?: string): string => (s || '').trim().toLowerCase();
const isType = (e: MatchEvent, t: string): boolean => norm(e.type) === t;

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

export function computeScoreState(homeGoals: number, awayGoals: number): ScoreState {
  const m = homeGoals - awayGoals;
  if (m === 0) return 'level';
  if (m === 1) return 'home_leading_by_one';
  if (m >= 2) return 'home_leading_by_two_plus';
  if (m === -1) return 'away_leading_by_one';
  return 'away_leading_by_two_plus';
}

const ORDER: Leverage[] = ['low', 'medium', 'high', 'extreme'];
const PHASE_IDX: Record<GamePhase, number> = { opening: 0, early: 1, adjusting: 2, crunch: 3, closing: 4 };
const ONE_GOAL_LEVERAGE = [0, 1, 1, 2, 3];
const LEVEL_LEVERAGE = [0, 1, 1, 2, 2];

export function computeLeverage(homeGoals: number, awayGoals: number, phase: GamePhase, manpowerEven: boolean): Leverage {
  const margin = Math.abs(homeGoals - awayGoals);
  const p = PHASE_IDX[phase];
  let idx: number;
  if (margin >= 3) idx = 0;
  else if (margin === 2) idx = p >= 3 ? 1 : 0;
  else if (margin === 1) idx = ONE_GOAL_LEVERAGE[p];
  else idx = LEVEL_LEVERAGE[p];
  if (!manpowerEven && margin <= 1) idx += 1;
  return ORDER[Math.max(0, Math.min(3, idx))];
}

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

  const margin = score.home - score.away;
  const absMargin = Math.abs(margin);
  const leadingSide: Side | null = margin > 0 ? 'home' : margin < 0 ? 'away' : null;
  const trailingSide: Side | null = margin > 0 ? 'away' : margin < 0 ? 'home' : null;
  const gamePhase = computePhase(minute);
  const scoreState = computeScoreState(score.home, score.away);

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
  const redCardMinute = reds.length ? reds[reds.length - 1].minute : undefined;

  const yellows = evs.filter(e => isType(e, T.yellow));
  const homeYellows = yellows.filter(e => sideOf(e.team) === 'home').length;
  const awayYellows = yellows.filter(e => sideOf(e.team) === 'away').length;

  const recentEvents = evs.filter(e => RELEVANT.has(norm(e.type))).slice(-6);

  const subs = evs.filter(e => isType(e, T.sub));
  const subsAfter = (side: Side, m: number) => subs.filter(e => sideOf(e.team) === side && (e.minute ?? 0) >= m);
  let substitutionPosture: string | null = null;
  if (reds.length) {
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

  if (tags.length === 0) {
    tags.push(scoreState === 'level' ? 'level game' : absMargin === 1 ? 'one-goal game' : 'two-goal-plus cushion');
  }

  let confidence: Confidence;
  if (!manpowerEven) confidence = 'high';
  else if (absMargin >= 1 && minute >= 60) confidence = 'high';
  else if (absMargin >= 1) confidence = 'medium';
  else if (minute >= 75) confidence = 'medium';
  else confidence = 'low';

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
    triggerReason: null,
    confidence,
    knownLimitations: KNOWN_LIMITATIONS,
  };
}

export function detectTrigger(
  events: MatchEvent[],
  minute: number,
  prevState?: SoccerMatchPulse | null,
): { triggered: boolean; reason: string | null } {
  const recent = (events || []).filter(e => typeof e.minute === 'number' && (e.minute as number) >= minute - 2 && (e.minute as number) <= minute);
  const has = (t: string) => recent.some(e => norm(e.type) === t);

  if (has(T.goal)) return { triggered: true, reason: 'Goal just scored' };
  if (has(T.red)) return { triggered: true, reason: 'Red card shown' };
  if (has(T.missedPen)) return { triggered: true, reason: 'Penalty missed' };

  const tight = !prevState || prevState.scoreState === 'level' || /leading_by_one$/.test(prevState.scoreState);
  if (minute >= 55 && has(T.sub) && tight) return { triggered: true, reason: 'Substitution in a tight game' };
  if (minute >= 60 && has(T.yellow) && tight) return { triggered: true, reason: 'Booking late in a tight game' };

  if ([45, 60, 75, 85, 90].includes(minute)) return { triggered: true, reason: `Match milestone (${minute}')` };

  return { triggered: false, reason: null };
}
