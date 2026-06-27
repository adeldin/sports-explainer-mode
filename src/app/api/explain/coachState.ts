// Coach's Corner (premium #3) — the normalized game-state seam (Pillar 1) + the Khan-voiced,
// never-platitude coaching prompt (Pillar 3). The vision/recap pattern: a sibling module the
// route imports; the route's shared explain/ask path is untouched.
//
// Pillar 1/2: Coach's Corner reads the normalized shape from the dataProvider adapter (ESPN base +
// any registered enrichment), never ESPN fields directly — so when GUMBO/soccer enrichers land,
// Coach's Corner gets richer for those sports with no change here. The v1 rich set is the sports
// whose ESPN feed exposes real per-play situation: NFL / NBA / WNBA / MLB. Everything else →
// normalizeCoachState returns null → the client renders "coming soon".
import { getGameData, NormalizedGameData } from './dataProvider';
import { computeSoccerPulse, detectTrigger, SoccerMatchPulse } from './soccerPulse';

// v1 rich sports only (all site-API). Absence here → null → client coming-soon. NOT a buried
// allowlist in the gating logic — it's the input to "which fields to read"; sufficiency itself
// is judged on whether those fields are actually present (client-side hasSufficientState).
const RICH: Record<string, { sport: string; league: string }> = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  wnba: { sport: 'basketball', league: 'wnba' },
  mlb: { sport: 'baseball', league: 'mlb' },
};

export interface CoachSituation {
  sport: string;
  homeTeam: string; awayTeam: string; homeScore: string; awayScore: string;
  statusDetail: string; period?: number; clock?: string; lastPlay?: string;
  // football
  down?: number; distance?: number; downDistanceText?: string; possession?: string; isRedZone?: boolean;
  // baseball
  balls?: number; strikes?: number; outs?: number; onBase?: string;
  // soccer — the deterministic SoccerMatchPulse (Gate B). Present only on the soccer path; the 4
  // rich sports never set it, so their CoachSituation is byte-identical to before.
  pulse?: SoccerMatchPulse;
}

// Read the normalized game-state through dataProvider (ESPN base + any registered enrichment) and
// map identity + situation into CoachSituation. The RICH gate stays coach POLICY (which sports
// Coach's Corner supports today). Output is byte-identical to the prior direct-fetch version — the
// ESPN extraction moved verbatim into dataProvider's fetchEspnBase. Returns null for non-rich
// sports / no live game → the client shows coming-soon (never a fabricated insight).
// Soccer family — uses the SoccerMatchPulse path (Gate B) instead of the football/baseball
// CoachSituation fields. The Highlightly enricher supplies the event timeline via getGameData.
const SOCCER = new Set(['soccer', 'worldcup', 'epl', 'laliga']);

// Parse the current match minute from ESPN's displayClock ("63'") → statusDetail → max event minute.
// Returns null when none is derivable (→ caller falls back to coming-soon, never a wrong pulse).
function parseSoccerMinute(d: NormalizedGameData): number | null {
  const fromClock = String(d.clock || '').match(/\d+/);
  if (fromClock) return parseInt(fromClock[0], 10);
  const fromStatus = String(d.statusDetail || '').match(/\d+/);
  if (fromStatus) return parseInt(fromStatus[0], 10);
  const evMins = (d.events || []).map(e => e.minute).filter((m): m is number => typeof m === 'number');
  return evMins.length ? Math.max(...evMins) : null;
}

// SAFE-BY-DEFAULT: any missing/invalid piece (not live, no minute, unparseable score, enricher
// failure) → null → the client renders the existing "coming soon". Never throws, never fabricates.
async function normalizeSoccerCoachState(sport: string, gameId?: string): Promise<CoachSituation | null> {
  try {
    const d = await getGameData(sport, gameId);
    if (!d || d.state !== 'in') return null;                       // live games only
    if (!d.homeTeam || !d.awayTeam) return null;
    const minute = parseSoccerMinute(d);
    if (minute == null || minute <= 0) return null;                // no reliable minute → coming-soon
    const home = parseInt(d.homeScore, 10);
    const away = parseInt(d.awayScore, 10);
    if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
    const events = Array.isArray(d.events) ? d.events : [];
    const pulse = computeSoccerPulse(events, { home, away }, minute, d.homeTeam, d.awayTeam);
    pulse.triggerReason = detectTrigger(events, minute, pulse).reason;
    return {
      sport,
      homeTeam: d.homeTeam, awayTeam: d.awayTeam, homeScore: d.homeScore, awayScore: d.awayScore,
      statusDetail: d.statusDetail,
      pulse,
    };
  } catch (e) {
    console.error(`normalizeSoccerCoachState(${sport}) failed — coming soon:`, e);
    return null;
  }
}

export async function normalizeCoachState(sport: string, gameId?: string): Promise<CoachSituation | null> {
  if (SOCCER.has(sport)) return normalizeSoccerCoachState(sport, gameId);
  if (!RICH[sport]) return null;
  const d = await getGameData(sport, gameId);
  if (!d || (!d.homeTeam && !d.awayTeam)) return null;
  const s = d.situation || {};
  return {
    sport,
    homeTeam: d.homeTeam, awayTeam: d.awayTeam, homeScore: d.homeScore, awayScore: d.awayScore,
    statusDetail: d.statusDetail, period: d.period, clock: d.clock, lastPlay: d.lastPlay,
    down: s.down, distance: s.distance, downDistanceText: s.downDistanceText, possession: s.possession, isRedZone: s.isRedZone,
    balls: s.balls, strikes: s.strikes, outs: s.outs, onBase: s.onBase,
  };
}

const levelGuide: Record<string, string> = {
  kid: 'simplest version — the basic why + what to watch, everyday words, no jargon',
  beginner: 'the outcome + the basic strategic why',
  intermediate: 'the tactic/craft on display and why it fits THIS situation',
  expert: 'deep tactical reasoning; assume the basics are known',
};

// Khan-voiced, never-platitude, never-fabricate coaching prompt. Pure.
export function buildCoachPrompt(s: CoachSituation, sport: string, level: string, language: string) {
  const langNames: Record<string, string> = { es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', it: 'Italian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', ar: 'Arabic' };
  const langLine = language && language !== 'en' ? ` Respond entirely in ${langNames[language] || language}.` : '';
  const facts: string[] = [`${s.awayTeam} ${s.awayScore} – ${s.homeTeam} ${s.homeScore}`];
  if (s.statusDetail) facts.push(s.statusDetail);
  if (s.downDistanceText) facts.push(`Down & distance: ${s.downDistanceText}${s.possession ? `, ${s.possession} ball` : ''}${s.isRedZone ? ', red zone' : ''}`);
  if (typeof s.balls === 'number') facts.push(`Count: ${s.balls}-${s.strikes}, ${s.outs ?? 0} out(s)${s.onBase ? `, runners on ${s.onBase}` : ', bases empty'}`);
  if (s.lastPlay) facts.push(`Last play: ${s.lastPlay}`);

  const system = `You are a knowledgeable coach sitting beside a ${level}-level fan, teaching like Khan Academy — NOT a hype broadcaster.${langLine}
Your job: the STRATEGIC WHY behind what's happening RIGHT NOW, then what it sets up next. Walk the reasoning out loud so the viewer could read the NEXT situation themselves. Meet them at their level: ${levelGuide[level] || levelGuide.beginner}.
CARDINAL RULES:
- NEVER a platitude. BANNED: "big moment", "anything can happen", "both teams want to win", "watch closely", "huge play". If the situation has no genuine strategic angle, say so in one short honest sentence — brevity beats manufactured drama.
- NEVER fabricate. Use ONLY the situational facts below. Do not invent a play-call, route, coverage, pitch type/sequence, or baserunner that isn't stated. If a detail isn't given, teach the general principle without inventing specifics ("in this count a pitcher often…" not a specific pitch that wasn't provided).
- Explain the WHY behind the mechanic, not just the rule.`;
  const user = `Situation (the ONLY facts you may use):
${facts.map(f => `- ${f}`).join('\n')}

Respond as JSON with EXACTLY these fields: { "strategicRead", "whatItSetsUp" }.
- "strategicRead": the strategic why behind the CURRENT situation — 1-2 sentences at a ${level} level, reasoning walked out loud.
- "whatItSetsUp": what to watch on the NEXT play and why — 1 sentence.
Empty string for a field the facts can't support. No platitudes; substance or brevity.`;
  return { system, user };
}
