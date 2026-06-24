// Coach's Corner (premium #3) — PURE logic (no React / network), unit-testable in isolation
// (mirrors lib/caps, lib/recap, lib/vision). Operates on the normalized situation the backend's
// 'state' mode returns; the model/provider/data-source swap never changes this.

export interface CoachSituation {
  sport: string;
  homeTeam: string; awayTeam: string; homeScore: string; awayScore: string;
  statusDetail: string; period?: number; clock?: string; lastPlay?: string;
  down?: number; distance?: number; downDistanceText?: string; possession?: string; isRedZone?: boolean;
  balls?: number; strikes?: number; outs?: number; onBase?: string;
}

export interface CoachFull { strategicRead: string; whatItSetsUp: string }

// Data-sufficiency gate (Pillar 1) — judged on whether the normalized situation actually has the
// per-sport fields needed to coach, NOT a hardcoded sport allowlist. Insufficient → coming-soon.
export function hasSufficientState(sport: string, s: CoachSituation | null): boolean {
  if (!s) return false;
  if (sport === 'nfl') return typeof s.down === 'number' && s.down > 0;
  if (sport === 'mlb') return typeof s.balls === 'number' && typeof s.outs === 'number';
  if (sport === 'nba' || sport === 'wnba') return typeof s.period === 'number' && !!s.clock;
  return false; // every other sport: not yet enough normalized state → coming-soon
}

const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

// A factual, language-neutral situation tag for the free hook (specific without an LLM call) and
// the Pro card header — built only from real fields (never invented).
export function deriveSituationTag(sport: string, s: CoachSituation | null): string {
  if (!s) return '';
  if (sport === 'nfl') {
    const dd = s.downDistanceText
      || (typeof s.down === 'number' && typeof s.distance === 'number' ? `${ORDINAL[s.down] || `${s.down}th`} & ${s.distance}` : '');
    return [dd, s.possession ? `${s.possession} ball` : '', s.isRedZone ? 'red zone' : ''].filter(Boolean).join(' · ');
  }
  if (sport === 'mlb') {
    const count = (typeof s.balls === 'number' && typeof s.strikes === 'number')
      ? (s.balls === 3 && s.strikes === 2 ? 'Full count' : `${s.balls}-${s.strikes}`) : '';
    const outs = typeof s.outs === 'number' ? `${s.outs} out${s.outs === 1 ? '' : 's'}` : '';
    return [count, outs, s.onBase ? `runners on ${s.onBase}` : ''].filter(Boolean).join(' · ');
  }
  if (sport === 'nba' || sport === 'wnba') {
    const per = typeof s.period === 'number' ? (s.period > 4 ? `OT${s.period - 4}` : `Q${s.period}`) : '';
    return [per, s.clock].filter(Boolean).join(' · ');
  }
  return s.statusDetail || '';
}

export function normalizeCoachFull(raw: any): CoachFull {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return { strategicRead: str(raw?.strategicRead), whatItSetsUp: str(raw?.whatItSetsUp) };
}

// Is there anything worth showing once expanded (guards an empty Pro card)?
export function hasCoachContent(c: CoachFull): boolean {
  return c.strategicRead.length > 0 || c.whatItSetsUp.length > 0;
}
