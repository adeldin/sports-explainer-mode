// Coach's Corner (premium #3) — the normalized game-state seam (Pillar 1) + the Khan-voiced,
// never-platitude coaching prompt (Pillar 3). The vision/recap pattern: a sibling module the
// route imports; the route's shared explain/ask path is untouched.
//
// Pillar 1/2: Coach's Corner reads THIS normalized shape, never ESPN fields directly. Today it's
// populated from ESPN's competitions[].situation; when the future dataProvider adapter lands it
// populates the SAME shape and Coach's Corner lights up for more sports with no rebuild. The
// v1 rich set is the sports whose ESPN feed exposes real per-play situation: NFL / NBA / WNBA /
// MLB. Everything else → normalizeCoachState returns null → the client renders "coming soon".

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
}

// Normalize ESPN's situation into our shape. Returns null for non-rich sports / no live game →
// the client shows the coming-soon state (never a fabricated insight).
export async function normalizeCoachState(sport: string, gameId?: string): Promise<CoachSituation | null> {
  const cfg = RICH[sport];
  if (!cfg) return null;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`, { cache: 'no-store' });
    const data = await res.json();
    const game = gameId
      ? data?.events?.find((e: any) => e.id === gameId)
      : data?.events?.find((e: any) => e.status?.type?.state === 'in');
    if (!game) return null;
    const comp = game.competitions?.[0];
    const sit = comp?.situation || {};
    const st = game.status || {};
    const teamName = (side: string) => comp?.competitors?.find((c: any) => c.homeAway === side)?.team?.displayName || '';
    const teamAbbr = (id: string) => comp?.competitors?.find((c: any) => String(c.id) === String(id))?.team?.abbreviation || '';

    const out: CoachSituation = {
      sport,
      homeTeam: teamName('home'), awayTeam: teamName('away'),
      homeScore: String(comp?.competitors?.find((c: any) => c.homeAway === 'home')?.score ?? ''),
      awayScore: String(comp?.competitors?.find((c: any) => c.homeAway === 'away')?.score ?? ''),
      statusDetail: st?.type?.shortDetail || '',
      period: typeof st?.period === 'number' ? st.period : undefined,
      clock: st?.displayClock || undefined,
      lastPlay: sit?.lastPlay?.text || undefined,
    };
    if (sport === 'nfl') {
      if (typeof sit.down === 'number') out.down = sit.down;
      if (typeof sit.distance === 'number') out.distance = sit.distance;
      if (sit.shortDownDistanceText || sit.downDistanceText) out.downDistanceText = sit.shortDownDistanceText || sit.downDistanceText;
      if (sit.possession) out.possession = teamAbbr(sit.possession);
      if (typeof sit.isRedZone === 'boolean') out.isRedZone = sit.isRedZone;
    } else if (sport === 'mlb') {
      if (typeof sit.balls === 'number') out.balls = sit.balls;
      if (typeof sit.strikes === 'number') out.strikes = sit.strikes;
      if (typeof sit.outs === 'number') out.outs = sit.outs;
      const bases = [sit.onFirst && '1st', sit.onSecond && '2nd', sit.onThird && '3rd'].filter(Boolean);
      if (bases.length) out.onBase = bases.join(' & ');
    }
    return out;
  } catch (e) {
    console.error('Coach state fetch error:', e);
    return null;
  }
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
