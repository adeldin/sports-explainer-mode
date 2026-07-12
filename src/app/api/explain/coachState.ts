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
import { getNationsCupMatch, RugbyTeamStats } from './zylaProvider';

// Rugby (nationscup, Zyla-sourced) — a carrier for structured team stats + minute, mirroring how
// `pulse` carries soccer stats. Momentum/derived-tag computation can come later (like soccer's engine);
// v1 just hands the coach prompt the real per-side stats.
type RugbyPulse = { homeStats?: RugbyTeamStats; awayStats?: RugbyTeamStats; minute?: number; triggerReason?: string };

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
  // rugby (nationscup) — structured Zyla team stats + minute. Present only on the rugby path.
  rugbyPulse?: RugbyPulse;
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
    if (d.teamStats) pulse.teamStats = d.teamStats;   // Gate D-1: real boxscore stats, post-compute (engine untouched)
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

// Rugby (nationscup) coach state — Zyla-sourced (getNationsCupMatch), NOT getGameData. LIVE-ONLY like
// soccer: finished games get a recap instead, so Coach's Read only shows for state==='in'. SAFE-BY-
// DEFAULT: not live / no teams / no stats / any error → null → client renders coming-soon (or recap).
async function normalizeRugbyCoachState(gameId?: string): Promise<CoachSituation | null> {
  try {
    const d = await getNationsCupMatch(gameId || '');
    if (!d || d.state !== 'in') return null;                       // finished/upcoming → recap/placeholder
    if (!d.homeTeam || !d.awayTeam) return null;
    if (!d.homeStats && !d.awayStats) return null;                 // no stats → nothing worth reading
    const rugbyPulse: RugbyPulse = { homeStats: d.homeStats, awayStats: d.awayStats, minute: d.minute };
    return {
      sport: 'nationscup',
      homeTeam: d.homeTeam, awayTeam: d.awayTeam,
      homeScore: String(d.homeScore ?? ''), awayScore: String(d.awayScore ?? ''),
      statusDetail: d.minute ? `${d.minute}'` : 'Live',
      rugbyPulse,
    };
  } catch (e) {
    console.error('normalizeRugbyCoachState failed — coming soon:', e);
    return null;
  }
}

export async function normalizeCoachState(sport: string, gameId?: string): Promise<CoachSituation | null> {
  if (SOCCER.has(sport)) return normalizeSoccerCoachState(sport, gameId);
  if (sport === 'nationscup') return normalizeRugbyCoachState(gameId);
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

const langNamesMap: Record<string, string> = { es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', it: 'Italian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', ar: 'Arabic' };

// Soccer (Gate C) — the Pro 'full' coaching read, built from the SoccerMatchPulse ONLY (score, time,
// phase, leverage, manpower/reds, cards, subs, derived tags, trigger, recent events). Same
// {strategicRead, whatItSetsUp} JSON shape the app renders. HONESTY GUARDRAIL: no possession,
// formation, pressing, momentum-as-dominance, xG, shots, or "who's better" — none of that is in the
// feed. Reason ONLY from what the scoreline + clock + man advantage + cards + subs FORCE.
export function buildSoccerCoachPrompt(s: CoachSituation, level: string, language: string) {
  const langLine = language && language !== 'en' ? ` Respond entirely in ${langNamesMap[language] || language}.` : '';
  const p = s.pulse!;
  const h = p.score.home, a = p.score.away;
  const facts: string[] = [];
  facts.push(`Score: ${h.team} ${h.goals} – ${a.team} ${a.goals}, ${p.minute}' (${p.gamePhase} phase)`);
  facts.push(`Score state: ${p.scoreState.replace(/_/g, ' ')}; leverage (how much the next goal swings it): ${p.leverage}`);
  if (p.manpower.state !== 'even') {
    const up = p.manpower.state === 'home_advantage' ? h.team : a.team;
    const down = p.manpower.state === 'home_advantage' ? a.team : h.team;
    facts.push(`Manpower: ${up} have an extra man — ${down} down to 10${p.manpower.redCardMinute ? ` after a red card at ${p.manpower.redCardMinute}'` : ''}.`);
  }
  if (p.discipline.reds.length) facts.push(`Red cards: ${p.discipline.reds.map(r => `${r.team} ${r.minute}'`).join(', ')}.`);
  if (p.discipline.homeYellows || p.discipline.awayYellows) facts.push(`Bookings: ${h.team} ${p.discipline.homeYellows} yellow(s), ${a.team} ${p.discipline.awayYellows} yellow(s).`);
  if (p.substitutionPosture) facts.push(`Substitution posture (inferred from timing + score, NOT positions): ${p.substitutionPosture}.`);
  if (p.derivedTags.length) facts.push(`Strategic state tags: ${p.derivedTags.join(', ')}.`);
  if (p.triggerReason) facts.push(`What just happened: ${p.triggerReason}.`);
  if (p.recentEvents.length) facts.push(`Recent events: ${p.recentEvents.map(e => `${e.minute ?? '?'}' ${e.type}${e.team ? ` (${e.team}${e.player ? ` — ${e.player}` : ''})` : ''}`).join('; ')}.`);

  // Gate D-1: REAL run-of-play stats (possession % + shots), home-first to match the Score line above.
  // Built only from stats BOTH teams expose; drives the conditional guardrail relax below. Home-first.
  const ts = p.teamStats;
  const statParts: string[] = [];
  if (ts) {
    if (ts.home.possessionPct != null && ts.away.possessionPct != null)
      statParts.push(`possession ${h.team} ${ts.home.possessionPct}% – ${a.team} ${ts.away.possessionPct}%`);
    if (ts.home.totalShots != null && ts.away.totalShots != null) {
      const sot = (shots?: number, on?: number) => (on != null ? `${shots} (${on} on target)` : `${shots}`);
      statParts.push(`shots ${h.team} ${sot(ts.home.totalShots, ts.home.shotsOnTarget)} – ${a.team} ${sot(ts.away.totalShots, ts.away.shotsOnTarget)}`);
    }
  }
  const hasStats = statParts.length > 0;
  if (hasStats) facts.push(`Run of play — REAL stats (possession & shots ONLY; no xG, no positions): ${statParts.join('; ')}.`);

  // The data-honesty block RELAXES when real possession/shot stats are present (cite them, tie "on top"
  // to the number) and stays VERBATIM Gate C when absent (no possession claims at all — thin-data honest).
  const cardinalDataLines = hasStats
    ? `- Use ONLY the state facts below. You DO have real possession % and shot counts — cite them as given. You still have NO formation or lineup, NO pressing/territory, NO xG, and NO "who's playing better" signal beyond what possession and shots actually show.
- You MAY say a side is on top of the run of play ONLY when the possession or shot numbers support it, and you MUST tie the claim to the specific number ("outshooting them 8–2", "with 64% of the ball"). NEVER use "dominating," "controlling," "on top," or "the better side" without that number behind it. NEVER claim pressing, formation, territory, xG, or momentum-as-dominance — none of that is in the feed. Possession alone is NOT winning: a side can control the ball and lose, so weigh the stats AGAINST the scoreline, never above it.
- HIGH-VALUE ANGLE: possession and shots matter MOST when they COMPLICATE the scoreline — a leader being outshot or outpossessed, or a level game one side has created everything in. Use the stats to reveal when the score isn't telling the whole story. They are SECONDARY context that colors the read; the PRIMARY driver stays the scoreline, the clock, and the man advantage.`
    : `- Use ONLY the state facts below. You have NO possession data, NO formation or lineup, NO pressing/territory, NO xG, NO shot counts, and NO read on which side is "playing better."
- NEVER claim or imply any of those. Do NOT say a team is "dominating," "controlling possession," "on top," "pressing," "in form," or "the better side" — the data cannot support it. Reason ONLY from the scoreline, the clock, the man advantage, cards, and substitutions.`;
  const userGuardLine = hasStats
    ? `You MAY cite the real possession % and shot counts and flag where the scoreline and the run of play diverge — but tie any "on top" claim to the specific number, and never rate possession above the scoreline. No formation/pressing/territory/xG claims.`
    : `No possession/formation/pressing/xG/"who's better" claims.`;

  const system = `You are a knowledgeable soccer coach sitting beside a ${level}-level fan, teaching like Khan Academy — NOT a hype broadcaster.${langLine}
Your job: the STRATEGIC WHY of the match RIGHT NOW — what the SCORE + TIME + MANPOWER force each team to do — then what to watch next. Walk the reasoning out loud so the viewer could read the next moment themselves. Meet them at their level: ${levelGuide[level] || levelGuide.beginner}.
CARDINAL RULES — NEVER FABRICATE (honesty guardrail — do not weaken):
${cardinalDataLines}
- NEVER invent a player, a tactic, a pass, a chance, or a stat that is not in the facts.
- Explain any jargon in plain terms.
HOW TO WRITE THE READ (craft — this is what separates a real read from filler):
- LEAD WITH THE INSIGHT, not the setup. Open with the strategic point itself and weave the state in. Do NOT open with a "Given the early phase…", "Since [team] is leading…", or "With the score level…" preamble. Vary the opening — never reuse the same scaffolding.
- ANCHOR ON CONCRETE EVENTS. When the facts name a specific event — a missed penalty, a just-scored goal, a red card, a booking — TEACH from it concretely (e.g. a missed penalty → "the miss is a let-off for the side that gave away the spot-kick and a momentum check for the team that won it"), instead of vaguely noting that "the game has seen some big moments."
- LOW-ANGLE STATES → BE BRIEF, NOT PADDED. When nothing has forced a hand yet (level score, early, low leverage), the CORRECT read is ONE crisp sentence stating that plainly — never three sentences of hedging. Honest brevity is the GOAL for a flat state, not a fallback or a failure.
- BANNED FILLER — never write these or anything close to them: "feeling okay about their chances", "won't change their approach too much", "crucial to watch", "the next segment will be important", "introduce an element of unpredictability", "both teams will be looking to", "anything can happen", "it's all to play for", "big moments".`;
  const user = `Match state (the ONLY facts you may use):
${facts.map(f => `- ${f}`).join('\n')}

Respond as JSON with EXACTLY these fields: { "strategicRead", "whatItSetsUp" }.
- "strategicRead": the strategic why of the CURRENT state — what the scoreline + time + manpower force each side to do now. LEAD with the point (no "given the situation" preamble). If there's a real angle (a lead to protect, a man up or down, a chase, a recent goal or miss): 1-2 sentences at a ${level} level, reasoning walked out and anchored on the concrete event. If the state is flat (level + early, low leverage, nothing forced): ONE crisp sentence stating that plainly — no padding, no filler. Empty string only if there is truly nothing to say.
- "whatItSetsUp": what to watch for NEXT and why — 1 concrete sentence tied to a real next beat (the next goal's effect on the scoreline, a substitution window, the man advantage starting to tell). No filler.
${userGuardLine} Substance or honest brevity; never platitudes, never invented detail.`;
  return { system, user };
}

// Rugby (nationscup) — the Pro 'full' coaching read, built from the RugbyPulse (structured Zyla team
// stats + minute) ONLY. Same {strategicRead, whatItSetsUp} JSON shape. These are REAL stats, so the
// guardrail is "cite the numbers, never invent" — but rugby-union-specific tactical meaning + hard
// anti-fabrication rules (no invented territory geography, phases, players, subs, momentum).
export function buildRugbyCoachPrompt(s: CoachSituation, level: string, language: string) {
  const langLine = language && language !== 'en' ? ` Respond entirely in ${langNamesMap[language] || language}.` : '';
  const rp = s.rugbyPulse!;
  const hs = rp.homeStats;
  const as = rp.awayStats;
  const home = s.homeTeam, away = s.awayTeam;

  const facts: string[] = [];
  const minute = rp.minute ? `${rp.minute}'` : (s.statusDetail || 'Live');
  facts.push(`Score: ${home} ${s.homeScore} - ${away} ${s.awayScore} (${minute})`);

  // A stat line is included ONLY when BOTH sides expose the value (mirrors soccer's both-present gate).
  const both = (pick: (t: RugbyTeamStats) => number | undefined): [number, number] | null => {
    const h = hs ? pick(hs) : undefined;
    const a = as ? pick(as) : undefined;
    return (h != null && a != null) ? [h, a] : null;
  };
  let v: [number, number] | null;
  if ((v = both(t => t.possessionPct)))       facts.push(`Possession: ${home} ${v[0]}% - ${away} ${v[1]}%`);
  if ((v = both(t => t.penaltiesConceded)))   facts.push(`Penalties conceded: ${home} ${v[0]} - ${away} ${v[1]}`);
  if (hs && as && hs.yellowCards != null && hs.redCards != null && as.yellowCards != null && as.redCards != null)
    facts.push(`Cards: ${home} ${hs.yellowCards}Y ${hs.redCards}R - ${away} ${as.yellowCards}Y ${as.redCards}R`);
  if ((v = both(t => t.turnoversWon)))        facts.push(`Turnovers won: ${home} ${v[0]} - ${away} ${v[1]}`);
  if ((v = both(t => t.turnoversConceded)))   facts.push(`Turnovers conceded: ${home} ${v[0]} - ${away} ${v[1]}`);
  if (hs && as && hs.lineoutsWon != null && hs.lineoutsLost != null && as.lineoutsWon != null && as.lineoutsLost != null)
    facts.push(`Lineouts: ${home} ${hs.lineoutsWon} won / ${hs.lineoutsLost} lost - ${away} ${as.lineoutsWon} won / ${as.lineoutsLost} lost`);
  if (hs && as && hs.scrumsWon != null && hs.scrumsLost != null && as.scrumsWon != null && as.scrumsLost != null)
    facts.push(`Scrums: ${home} ${hs.scrumsWon} won / ${hs.scrumsLost} lost - ${away} ${as.scrumsWon} won / ${as.scrumsLost} lost`);
  if (hs && as && hs.gainLineCrossed != null && hs.gainLineFailed != null && as.gainLineCrossed != null && as.gainLineFailed != null)
    facts.push(`Gain-line: ${home} ${hs.gainLineCrossed} made / ${hs.gainLineFailed} not - ${away} ${as.gainLineCrossed} made / ${as.gainLineFailed} not`);
  if ((v = both(t => t.cleanBreaks)))         facts.push(`Clean breaks: ${home} ${v[0]} - ${away} ${v[1]}`);
  if ((v = both(t => t.carriesMetres)))       facts.push(`Metres carried: ${home} ${v[0]} - ${away} ${v[1]}`);
  if ((v = both(t => t.offloads)))            facts.push(`Offloads: ${home} ${v[0]} - ${away} ${v[1]}`);
  if (hs && as && hs.tackles != null && hs.missedTackles != null && as.tackles != null && as.missedTackles != null)
    facts.push(`Tackles: ${home} ${hs.tackles} (${hs.missedTackles} missed) - ${away} ${as.tackles} (${as.missedTackles} missed)`);

  const hasStats = facts.length > 2;
  const thinNote = hasStats ? '' : ' Only the scoreline and clock are available this update (no paired team stats) — reason from those alone and keep it brief.';

  const system = `You are a knowledgeable rugby union coach sitting beside a ${level}-level fan, teaching like Khan Academy — NOT a hype broadcaster.${langLine}
Your job: the STRATEGIC WHY of the match RIGHT NOW — what the scoreline, clock, and the team stats reveal about how each side is winning or losing the tactical battle — then what to watch next. Walk the reasoning out loud so the viewer could read the next moment themselves. Meet them at their level: ${levelGuide[level] || levelGuide.beginner}.
RUGBY UNION TACTICAL LOGIC (reason from the stats using these meanings):
- High penalties conceded = handing over territory, kickable points, lineout platforms, pressure relief; costly near own line.
- Turnovers WON = breakdown pressure, kills opponent multi-phase attack, short-field chances. Turnovers CONCEDED = attack failing to secure ruck ball. ALWAYS state who wins vs concedes — never confuse them.
- Lost OWN lineouts = major platform problem (lineout is a designed restart; losing your throw loses a clean attack/exit).
- Scrum losses = wrecked exits, conceded penalties, shaky restarts.
- Possession without a clean-breaks/metres edge = territorial/patient control or organized-but-blunt attack, NOT necessarily dominance. Lower possession + higher clean breaks = efficient, dangerous in transition.
- Many tackles + many missed = long defensive stretches + leakage; high tackle count alone is NOT praise.
- Kicking is a tactical CHOICE (territory, chase pressure, forcing exits) — never frame it as weakness.
HARD RULES (never break):
- This is rugby UNION (15s), NOT league: no "six tackles," no play-the-ball, no league possession cycles.
- Reason ONLY from the stats + scoreline + minute provided. NEVER invent field zones/territory geography, specific plays, players, phases, momentum, crowd, weather, referee, injuries, or subs not in the facts.
- Possession does NOT equal control. Do NOT claim exact territory (you MAY say "this may be handing over field position," never exact geography).
- Mention at most 2-3 tactical levers — do NOT list every stat.
- Only use "momentum" if multiple stats concretely support it.
- Prefer causal wording ("because," "which suggests"). If the evidence is mixed, say so.
- NEVER invent a player, a play, or a stat that is not in the facts. Explain any jargon in plain terms.
HOW TO WRITE THE READ (craft — this is what separates a real read from filler):
- LEAD WITH THE INSIGHT, not the setup. Open with the strategic point itself and weave the state in. Do NOT open with a "Given the score…", "Since [team] leads…", or "With 40 minutes played…" preamble. Vary the opening — never reuse the same scaffolding.
- ANCHOR ON THE STAT THAT MATTERS. When one lever is clearly driving the game — a lopsided penalty count, lost lineouts, a turnover edge — TEACH from it concretely (e.g. lost own lineouts → "losing your own throw hands back the clean attacking platform and forces scrappy exits"), instead of vaguely noting "the stats are interesting."
- LOW-ANGLE STATES → BE BRIEF, NOT PADDED. When the stats are even and nothing is forcing a hand, the CORRECT read is ONE crisp sentence stating that plainly — never three sentences of hedging. Honest brevity is the GOAL for a flat state, not a fallback.
- BANNED FILLER — never write these or anything close to them: "feeling okay about their chances", "won't change their approach too much", "crucial to watch", "the next phase will be important", "introduce an element of unpredictability", "both teams will be looking to", "anything can happen", "it's all to play for", "big moments".`;
  const user = `Here is the live match data (the ONLY facts you may use):
${facts.join('\n')}

Respond as JSON with EXACTLY these fields: { "strategicRead", "whatItSetsUp" }.
- "strategicRead": the strategic why of the CURRENT state at a ${level} level — 2-4 sentences (roughly: one on the game state, one on the clearest tactical driver in the stats, one on why it matters for a newcomer). LEAD with the point (no "given the situation" preamble). If the state is flat/even: ONE crisp honest sentence.${thinNote}
- "whatItSetsUp": what to watch for NEXT and why — 1-2 sentences tied to a real next tactical consequence of the stats above, NOT a dressed-up prediction.
Empty string for a field if there is nothing honest to say. Substance or honest brevity; never platitudes, never invented detail.`;
  return { system, user };
}

// Khan-voiced, never-platitude, never-fabricate coaching prompt. Pure.
export function buildCoachPrompt(s: CoachSituation, sport: string, level: string, language: string) {
  if (SOCCER.has(sport) && s.pulse) return buildSoccerCoachPrompt(s, level, language);   // Gate C: pulse-derived read
  if (sport === 'nationscup' && s.rugbyPulse) return buildRugbyCoachPrompt(s, level, language);   // rugby: Zyla-stats read
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
