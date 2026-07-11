import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage } from './visionProvider';
import { normalizeCoachState, buildCoachPrompt } from './coachState';
import { getGameData, type PitchEvent } from './dataProvider';
import { getNationsCupMatch } from './zylaProvider';
import { createChatCompletion } from './llmProvider';
import { cacheGet, cacheSet, normalizeQuestion, askKey, soccerSig, explainKey, cacheIsEnabled, cacheLog } from './explanationCache';
import { getLiveTennisMatches, getTennisTimeline, type TennisGame, type TennisTimelineEntry } from './tennisProvider';

// Model is configurable so we can swap/upgrade tiers without code changes.
// Defaults to the current free-tier model.
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const sportContext: Record<string, string> = {
  nfl: 'American football. Key concepts: downs, yards, line of scrimmage, end zone, touchdown, field goal, quarterback, snap, blitz.',
  nba: 'Basketball. Key concepts: possession, shot clock, paint, three-point line, pick and roll, fast break, turnover, foul.',
  mlb: 'Baseball. Key concepts: innings, outs, strikes, balls, bases, pitcher, batter, force out, double play, tag up.',
  nhl: 'Ice hockey. Key concepts: periods, power play, penalty kill, icing, offsides, crease, faceoff, hat trick.',
  soccer: 'Association football (soccer). Key concepts: goal, assist, offside, penalty kick, free kick, corner, yellow/red card, possession, formation.',
  worldcup: 'World Cup soccer (association football). Key concepts: group stage, knockout round, goal, offside, penalty kick, free kick, cards, extra time, penalty shootout.',
  rugby: 'Rugby. Key concepts: try, conversion, scrum, ruck, maul, lineout, knock-on, penalty kick, drop goal.',
  wnba: "Women's National Basketball Association (WNBA) basketball. Key concepts: possession, shot clock, paint, three-point line, pick and roll, fast break, turnover, foul.",
  epl: "English Premier League — England's top soccer (association football) division. Key concepts: goal, assist, offside, penalty kick, free kick, corner, yellow/red card, possession, formation, relegation.",
  laliga: "La Liga — Spain's top soccer (association football) division. Key concepts: goal, assist, offside, penalty kick, free kick, corner, yellow/red card, possession, formation, relegation.",
  mlr: 'Major League Rugby (MLR) — the premier professional rugby union league in the United States and Canada. Key concepts: try (5 points), conversion (2 points), penalty kick (3 points), drop goal (3 points), scrum, lineout, ruck, maul, offside, tackle, breakdown.',
  nationscup: 'The World Rugby Nations Cup — an international rugby union tournament for emerging nations (e.g. USA, Uruguay, Georgia, Portugal, Samoa, Tonga, Romania, Spain). Rugby union basics for a newcomer: a try (5 points) is scored by grounding the ball over the opponent\'s line, then a conversion kick (2 points) follows; a penalty kick or drop goal is worth 3 points. Play restarts with a scrum (forwards bind and push for the ball) or a lineout (a throw-in down a tunnel of lifted players). Yellow cards mean 10 minutes in the sin bin; a red card is a send-off. Other key terms: ruck, maul, knock-on, offside, breakdown, tackle.',
  tennis: "Tennis is an individual racket sport. Scoring: love=0, 15, 30, 40, game. Sets won by first to 6 games (win by 2). Tiebreak at 6-6. Match won by best of 3 or 5 sets. Key terms: ace, fault, deuce, advantage, break, hold, rally, volley, baseline, net.",
  golf: 'Golf is an individual sport where players complete 18 holes using as few strokes as possible. Scoring relative to par: eagle=-2, birdie=-1, par=0, bogey=+1, double bogey=+2. Key terms: fairway, rough, green, hazard, bunker, driver, iron, wedge, putter, handicap, cut, stroke play, match play.',
  cricket: 'Cricket is a bat-and-ball sport between two teams of eleven. Key concepts: wicket, over (6 balls), runs, boundary (4/6), batting, bowling, LBW, duck, innings; formats include Test (up to 5 days), ODI, and T20.',
};

// ESPN endpoint config. `core` sports are NOT on the normal scoreboard API and
// need the two-step Core-API $ref fetch (see fetchGameData). Soccer/World Cup
// use the normal site API with their own league slugs.
// `provider` selects the data source: absent/'espn' = ESPN base (default). `sport`/`league` are
// optional so a 'zyla' entry needn't supply meaningless ESPN values (every ESPN entry still sets both).
type EspnCfg = { sport?: string; league?: string; core?: boolean; learnMode?: boolean; provider?: 'espn' | 'zyla' };
const espnConfig: Record<string, EspnCfg> = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  mlb: { sport: 'baseball', league: 'mlb' },
  nhl: { sport: 'hockey', league: 'nhl' },
  soccer: { sport: 'soccer', league: 'usa.1' },
  worldcup: { sport: 'soccer', league: 'fifa.world' },
  // United Rugby Championship (id 270557): ~Sept–June, the longest/widest active
  // rugby season — chosen over Olympic 7s (282, Olympics-only), Six Nations
  // (~5 weeks) and Premiership (267979, ~9 months) for year-round coverage.
  rugby: { sport: 'rugby', league: '270557', core: true },
  // Major League Rugby (US/Canada, id 289262): same Core-API two-step fetch as URC.
  mlr: { sport: 'rugby', league: '289262', core: true },
  // World Rugby Nations Cup (internal key 'nationscup', Zyla comp_id 726): NOT on ESPN. The
  // provider:'zyla' branch in fetchGameData diverts to fetchZylaGameData (Gate-1 stub until Gate 4).
  nationscup: { provider: 'zyla' },
  // Drop-in site-API leagues sharing existing logic: WNBA uses the generic
  // scoreboard lastPlay (like NBA); EPL/La Liga reuse the soccer keyEvents path.
  wnba: { sport: 'basketball', league: 'wnba' },
  epl: { sport: 'soccer', league: 'eng.1' },
  laliga: { sport: 'soccer', league: 'esp.1' },
  // Learn Mode sports — individual/tournament formats with no play-by-play.
  // The explain endpoint returns an educational "what to watch for" response.
  tennis: { sport: 'tennis', league: 'atp', learnMode: true },
  golf: { sport: 'golf', league: 'pga', learnMode: true },
  // NOTE: cricket intentionally omitted from espnConfig — no usable ESPN data. — ESPN's public API has no usable cricket
  // data (site API 404s; Core API lists the sport but exposes zero leagues/events).
  // It needs a different source (e.g. ESPNcricinfo) before it can be added here.
};

const languageNames: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German',
  ja: 'Japanese', zh: 'Chinese', ko: 'Korean', it: 'Italian', ar: 'Arabic',
};

export function buildSystemPrompt(sport: string, level: string, language: string = 'en'): string {
  const sportGuide = sportContext[sport] || 'a professional sport';

  // Each persona teaches ONE primary lesson at a level-appropriate SUBJECT — the
  // difficulty changes WHAT concept is taught (rule → meaning → craft → strategy),
  // not just the tone. Every guide explicitly says: teach one thing, don't cram.
  const levelGuides: Record<string, string> = {
    kid: `You are an enthusiastic ${sport} commentator teaching an 8-year-old.
    TEACH EXACTLY ONE THING: the rule or the outcome — WHAT happened. (Shape: "He didn't swing and that's strike three — three strikes and you're out.")
    Rules: ZERO jargon. At most ONE vivid everyday analogy (playground, school, video games, family) and only if it truly makes it clearer. Teach that single thing well — do NOT list several lessons. 2-3 short sentences.`,

    beginner: `You are a friend teaching a brand-new ${sport} fan.
    TEACH EXACTLY ONE THING: the outcome plus its basic WHY — what it MEANS. (Shape: "A strikeout looking — the pitcher won the duel by fooling him with a pitch that dropped at the last second.")
    Rules: Do NOT define the play type as a dictionary entry ("a home run IS WHEN...", "a ground out IS WHEN..."). Say what happened and what it MEANT in THIS game situation — the reader can tap a term for its definition; your job is the meaning here. One natural everyday analogy only if it fits. Teach that single lesson — don't cram in extra ones. 2-3 sentences.`,

    intermediate: `You are a sharp ${sport} analyst for a regular viewer.
    TEACH EXACTLY ONE THING: the craft or tactic on display — the SKILL. Assume they already know the basic outcome. (Shape: "That's a splitter — it looks like a fastball then drops out of the zone; it's his put-away pitch with two strikes.")
    Rules: Skip basic definitions. Name the technique/tactic and what makes it work here. ONE lesson only. A brief cross-domain analogy (chess, business) only if it adds real insight. 3-4 sentences.`,

    expert: `You are a former professional ${sport} coach talking to a peer.
    TEACH EXACTLY ONE THING: the strategic layer — the WHY BEHIND THE WHY. The outcome is ASSUMED known. (Shape: "He sequenced him — fastballs up to lift the eye level, then the splitter below the zone, betting he'd chase.")
    ABSOLUTE RULES:
    1. NEVER define or explain what something IS (no "a splitter is...", no "is when...").
    2. Start DIRECTLY with the strategic read: intent, sequencing, scheme/matchup, game theory.
    3. ONE strategic idea, taught well — not a list. 3-4 dense sentences.
    4. If a sentence starts to define a term, cut it and go straight to the strategy.`
  };

  let prompt = `${levelGuides[level] || levelGuides['beginner']}\n\nSport context: ${sportGuide}`;
  if (language && language !== 'en') {
    const langName = languageNames[language] || language;
    prompt += `\n\nIMPORTANT: Write every value in the JSON response entirely in ${langName}. Translate sports terms naturally; do not output English.`;
  }
  return prompt;
}

// Pull current game context + the latest play text for any configured sport.
// Site-API sports read the scoreboard (+ a summary deep-dive for MLB play-by-play
// and soccer key events); Core-API sports (rugby) use the two-step $ref fetch.
// Zyla-provider base fetch (Gate 4): delegates to getNationsCupMatch, which returns the same
// { play, gameContext, homeTeam, awayTeam, ... } shape fetchGameData produces. The rich event narrative
// + team stats are baked INTO gameContext (the `else`/fetchGameData branch reads gameContext, not a
// separate events array — the "Recent events:" injection is enriched-path-only). Best-effort: on any
// Zyla failure getNationsCupMatch returns sane non-empty defaults, so the explain is never blank.
async function fetchZylaGameData(sport: string, gameId?: string) {
  return await getNationsCupMatch(gameId || '');
}

async function fetchGameData(sport: string, gameId?: string, skipPlayLookup = false) {
  let play = 'A key play just happened';
  let gameContext = 'Live game in progress';
  let homeTeam = '', awayTeam = '';

  const cfg = espnConfig[sport];
  if (!cfg) return { play, gameContext, homeTeam, awayTeam };
  // Zyla-provider sports divert BEFORE the ESPN learnMode/core/site branches.
  if (cfg.provider === 'zyla') return await fetchZylaGameData(sport, gameId);

  // Learn Mode (tennis/golf): tournament-shaped, not head-to-head. Build a
  // context string from the current tournament rather than home/away teams.
  if (cfg.learnMode) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      const ev = data?.events?.[0];
      if (ev) {
        if (cfg.sport === 'golf') {
          const comp = ev.competitions?.[0];
          const sorted = (comp?.competitors || []).slice().sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));
          const leader = sorted[0];
          gameContext = leader?.athlete?.displayName
            ? `${ev.name} — Leader: ${leader.athlete.displayName} (${leader.score})`
            : ev.name;
        } else {
          gameContext = ev.status?.type?.shortDetail ? `${ev.name} — ${ev.status.type.shortDetail}` : ev.name;
        }
      } else {
        gameContext = `No ${sport} tournaments are currently in progress.`;
      }
    } catch {
      gameContext = `Learning about ${sport}.`;
    }
    return { play, gameContext, homeTeam, awayTeam };
  }

  const teamName = (comp: any, side: string) =>
    comp?.competitors?.find((c: any) => c.homeAway === side)?.team?.displayName || '';

  try {
    if (cfg.core) {
      // Core API: list event $refs for today, then resolve each event.
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const evRes = await fetch(
        `https://sports.core.api.espn.com/v2/sports/${cfg.sport}/leagues/${cfg.league}/events?dates=${today}`,
        { cache: 'no-store' },
      );
      const evData = await evRes.json();
      const items: any[] = (evData.items || []).slice(0, 20);
      const events = (
        await Promise.all(
          items.map(async (it: any) => {
            try {
              const r = await fetch(it.$ref, { cache: 'no-store' });
              return await r.json();
            } catch {
              return null;
            }
          }),
        )
      ).filter(Boolean);

      const game = gameId
        ? events.find((e: any) => String(e.id) === String(gameId))
        : events.find((e: any) => e.status?.type?.state === 'in') || events[0];
      if (game) {
        const comp = game.competitions?.[0];
        homeTeam = teamName(comp, 'home');
        awayTeam = teamName(comp, 'away');
        gameContext = `${awayTeam} vs ${homeTeam} — ${game.status?.type?.shortDetail || ''}`;
        // Core-API play-by-play sits behind further $refs; use the best cue available.
        play = comp?.situation?.lastPlay?.text || game.status?.type?.detail || play;
      }
    } else {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      const game = gameId
        ? data?.events?.find((e: any) => String(e.id) === String(gameId))
        : data?.events?.find((e: any) => e.status?.type?.state === 'in') || data?.events?.[0];
      if (game) {
        const comp = game.competitions?.[0];
        homeTeam = teamName(comp, 'home');
        awayTeam = teamName(comp, 'away');
        play = comp?.situation?.lastPlay?.text || comp?.lastPlay?.text || play;
        gameContext = `${awayTeam} vs ${homeTeam} — ${game.status?.type?.shortDetail || ''}`;

        // MLB deep dive for play-by-play text.
        if (sport === 'mlb' && game.id && !skipPlayLookup) {
          const sumRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${game.id}`,
            { cache: 'no-store' },
          );
          const sum = await sumRes.json();
          const lastReal = sum?.plays?.reverse().find(
            (p: any) => p.text && !p.text.toLowerCase().includes('inning'),
          );
          if (lastReal) play = lastReal.text;
        }

        // Soccer leagues (MLS / World Cup / EPL / La Liga): no plays[] array —
        // use the latest key event / commentary from the summary endpoint.
        if (['soccer', 'worldcup', 'epl', 'laliga'].includes(sport) && game.id && !skipPlayLookup) {
          const sumRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/summary?event=${game.id}`,
            { cache: 'no-store' },
          );
          const sum = await sumRes.json();
          const ke: any[] = sum?.keyEvents || [];
          const comm: any[] = sum?.commentary || [];
          play = ke[ke.length - 1]?.text || comm[comm.length - 1]?.text || play;
        }
      }
    }
  } catch (e) {
    console.error('Data fetch error:', e);
  }

  return { play, gameContext, homeTeam, awayTeam };
}

// Post-Game Recap (premium #1) — gather the FINAL-game facts the recap is allowed to use.
// Returns ONLY what ESPN actually exposes (score always; richer summaryFacts where a summary
// endpoint exists). Thin sports (rugby/MLR core) come back with empty summaryFacts → the
// prompt produces a shorter recap rather than inventing one. Never synthesizes data.
type RecapData = {
  homeTeam: string; awayTeam: string; homeScore: string; awayScore: string;
  winner: string; statusDetail: string; summaryFacts: string[];
  // ESPN's own AP recap, pulled from the SAME summary response as summaryFacts (sum.article).
  // Captured but not yet wired into the prompt (Gate 1: output-neutral). Empty for thin sports
  // (golf/rugby) and on any error → graceful, matches the existing "thin → honest recap" path.
  articleHeadline: string; articleLede: string; articleLink: string;
};

const SOCCER_RECAP_KEYS = ['soccer', 'worldcup', 'epl', 'laliga'];

// Soccer-only: pull the EXACT goal tally (from keyEvents) + real boxscore team stats out of the SAME
// summary response fetchRecapData already fetches. Never fabricates: a goal tally is only shown when
// the parsed per-scorer goals SUM to the authoritative final score (else just the team total); a stat
// line is only added when BOTH teams expose that stat. xG is not in the feed and never appears.
function buildSoccerRecapExtras(
  sum: any, homeTeam: string, awayTeam: string, homeScore: string, awayScore: string,
): { goalFacts: string[]; statFacts: string[] } {
  const goalFacts: string[] = [];
  const statFacts: string[] = [];

  // --- Goal tally from keyEvents (scoringPlay === true = it changed the score; sums to the score) ---
  // Per team → per scorer surname → count, so a hat-trick is captured (Dembélé 3).
  const byTeam = new Map<string, Map<string, number>>();
  for (const e of (sum?.keyEvents || [])) {
    if (e?.scoringPlay !== true) continue;
    const team = e?.team?.displayName;
    if (!team) continue;
    const ownGoal = /own goal/i.test(String(e?.type?.text || '')) || String(e?.type?.type || '') === 'own-goal';
    const full = String(e?.participants?.[0]?.athlete?.displayName || '').trim();
    const label = ownGoal ? '(own goal)' : (full.split(/\s+/).pop() || '');
    if (!byTeam.has(team)) byTeam.set(team, new Map());
    if (label) { const m = byTeam.get(team)!; m.set(label, (m.get(label) || 0) + 1); }
  }
  const hs = parseInt(homeScore, 10), as = parseInt(awayScore, 10);
  if ((Number.isFinite(hs) && hs > 0) || (Number.isFinite(as) && as > 0)) {
    // Team total is the SCORE (ground truth); show the scorer breakdown only when it reconciles.
    const teamStr = (name: string, score: number): string => {
      const m = byTeam.get(name);
      if (!m || !Number.isFinite(score)) return `${name} ${score}`;
      const sum2 = [...m.values()].reduce((a, b) => a + b, 0);
      if (sum2 !== score) return `${name} ${score}`;   // parse incomplete → total only (honest)
      const brk = [...m.entries()].map(([n, c]) => `${n} ${c}`).join(', ');
      return brk ? `${name} ${score} (${brk})` : `${name} ${score}`;
    };
    goalFacts.push(`Goals — ${teamStr(awayTeam, as)}, ${teamStr(homeTeam, hs)}`);
  }

  // --- Boxscore team stats (real, from the same summary). Away–home order matches the Final line. ---
  const teams: any[] = sum?.boxscore?.teams || [];
  const statMap = (side: string): Record<string, string> => {
    const t = teams.find(x => x?.homeAway === side);
    const out: Record<string, string> = {};
    for (const s of (t?.statistics || [])) if (s?.name != null && s?.displayValue != null) out[s.name] = String(s.displayValue);
    return out;
  };
  const H = statMap('home'), A = statMap('away');
  const has = (k: string) => H[k] != null && A[k] != null;
  const p0 = (v: string) => `${Math.round(parseFloat(v))}%`;        // possessionPct is already 0–100
  const pf = (v: string) => `${Math.round(parseFloat(v) * 100)}%`;  // passPct is a 0–1 fraction
  if (has('possessionPct')) statFacts.push(`Possession: ${awayTeam} ${p0(A.possessionPct)} – ${homeTeam} ${p0(H.possessionPct)}`);
  if (has('totalShots') && has('shotsOnTarget')) statFacts.push(`Shots (on target): ${awayTeam} ${A.totalShots} (${A.shotsOnTarget}) – ${homeTeam} ${H.totalShots} (${H.shotsOnTarget})`);
  if (has('wonCorners')) statFacts.push(`Corners: ${awayTeam} ${A.wonCorners} – ${homeTeam} ${H.wonCorners}`);
  if (has('saves')) statFacts.push(`Saves: ${awayTeam} ${A.saves} – ${homeTeam} ${H.saves}`);
  if (has('accuratePasses') && has('passPct')) statFacts.push(`Passing: ${awayTeam} ${A.accuratePasses} (${pf(A.passPct)}) – ${homeTeam} ${H.accuratePasses} (${pf(H.passPct)})`);
  if (has('foulsCommitted')) statFacts.push(`Fouls: ${awayTeam} ${A.foulsCommitted} – ${homeTeam} ${H.foulsCommitted}`);
  const cardStr = (m: Record<string, string>) => `${parseInt(m.yellowCards) || 0}Y${(parseInt(m.redCards) || 0) > 0 ? ` ${parseInt(m.redCards)}R` : ''}`;
  if (has('yellowCards') && ((parseInt(H.yellowCards) || 0) + (parseInt(A.yellowCards) || 0) + (parseInt(H.redCards) || 0) + (parseInt(A.redCards) || 0) > 0)) {
    statFacts.push(`Cards: ${awayTeam} ${cardStr(A)} – ${homeTeam} ${cardStr(H)}`);
  }

  return { goalFacts, statFacts };
}

async function fetchRecapData(sport: string, gameId?: string): Promise<RecapData> {
  const out: RecapData = { homeTeam: '', awayTeam: '', homeScore: '', awayScore: '', winner: '', statusDetail: '', summaryFacts: [], articleHeadline: '', articleLede: '', articleLink: '' };
  const cfg = espnConfig[sport];
  if (!cfg || cfg.learnMode) return out;
  // No gameId → nothing to summarize. Return empty (graceful no-data path) — we do NOT scan a
  // scoreboard, since that only ever holds today's slate (the very bug this rewrite fixes).
  if (!gameId) return out;
  const teamName = (comp: any, side: string) => comp?.competitors?.find((c: any) => c.homeAway === side)?.team?.displayName || '';
  const scoreOf = (comp: any, side: string) => String(comp?.competitors?.find((c: any) => c.homeAway === side)?.score ?? '');
  try {
    // Summary-direct: ONE fetch resolves teams/score/status (header.competitions[0]) AND the AP
    // article + fact buckets — for ALL sports. The site-API summary serves core sports (rugby)
    // with inline teams/scores (no $ref), so the old core-vs-scoreboard split is gone. Crucially
    // this works for PAST games too (a scoreboard only holds today's slate), which is the fix:
    // the date strip can now reach any final's recap.
    const sum = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/summary?event=${gameId}`, { cache: 'no-store' })).json();
    const comp = sum?.header?.competitions?.[0];
    const st = comp?.status?.type;
    // Gate on the finished STATE, not the label — shortDetail varies ('Final' / 'FT' / 'Final/OT').
    if (comp && (st?.state === 'post' || st?.completed === true)) {
      out.homeTeam = teamName(comp, 'home'); out.awayTeam = teamName(comp, 'away');
      out.homeScore = scoreOf(comp, 'home'); out.awayScore = scoreOf(comp, 'away');
      const hc = comp?.competitors?.find((c: any) => c.homeAway === 'home');
      const ac = comp?.competitors?.find((c: any) => c.homeAway === 'away');
      out.winner = hc?.winner ? 'home' : ac?.winner ? 'away' : '';
      out.statusDetail = st?.shortDetail || st?.detail || '';
      // ESPN's own AP game recap lives in sum.article (same response). Headline + description
      // (clean plain text) are the grounding. Lede: strip the leading "— " AP-dateline artifact
      // (no-op when absent). Link: taken VERBATIM — the web href shape is sport-specific
      // (/{sport}/recap?gameId= vs /soccer/report/_/gameId/), so never reconstruct it. Rugby has
      // no article → these stay '' → stats-only Branch B (fine, like golf).
      out.articleHeadline = String(sum?.article?.headline || '');
      out.articleLede = String(sum?.article?.description || '').replace(/^—\s*/, '');
      out.articleLink = String(sum?.article?.links?.web?.href || '');
      // Order facts by SIGNIFICANCE, not recency, so the model leads with what mattered:
      // leaders (the "who dominated" signal) first, then scoring events earliest-first
      // (an opening burst precedes late/garbage-time scores, which fall last and get
      // trimmed first by the cap). Behavior-identical when both buckets are empty.
      const leaderFacts: string[] = [];
      const scoringFacts: string[] = [];
      for (const grp of (sum?.leaders || [])) {
        for (const cat of (grp?.leaders || []).slice(0, 2)) {
          const l = cat?.leaders?.[0];
          if (l?.athlete?.displayName && l?.displayValue) leaderFacts.push(`${l.athlete.displayName}: ${l.displayValue}${cat?.displayName ? ` (${cat.displayName})` : ''}`);
        }
      }
      for (const p of (sum?.scoringPlays || [])) { if (p?.text) scoringFacts.push(String(p.text)); }
      if (['soccer', 'worldcup', 'epl', 'laliga'].includes(sport)) {
        for (const e of (sum?.keyEvents || [])) { if (e?.text) scoringFacts.push(String(e.text)); }
      }
      if (SOCCER_RECAP_KEYS.includes(sport)) {
        // Goals (exact tally) + real stats LEAD and always survive; raw keyEvents text + leaders
        // fill the rest under a higher cap. Fixes the goal under-count + surfaces possession/shots.
        const { goalFacts, statFacts } = buildSoccerRecapExtras(sum, out.homeTeam, out.awayTeam, out.homeScore, out.awayScore);
        const dedup = (arr: string[]) => [...new Set(arr.filter(Boolean))];
        const priority = dedup([...goalFacts, ...statFacts]);
        const rest = dedup([...leaderFacts, ...scoringFacts]).filter(f => !priority.includes(f));
        out.summaryFacts = [...priority, ...rest].slice(0, 16);
      } else {
        out.summaryFacts.push(...leaderFacts, ...scoringFacts);
      }
    }
  } catch (e) {
    console.error('Recap data fetch error:', e);
  }
  // Soccer already assembled + capped above (priority-preserving). All OTHER sports: byte-identical
  // dedup + cap-10 as before.
  if (!SOCCER_RECAP_KEYS.includes(sport)) {
    out.summaryFacts = [...new Set(out.summaryFacts.filter(Boolean))].slice(0, 10);
  }
  return out;
}

// Build the never-fabricate recap prompt. Free users get ONLY score + story (cheaper, and
// the teaser's locked rows need no body); Pro/trial get all four narrative fields. The model
// is told to EMIT EMPTY STRINGS for anything the data doesn't support — graceful degradation,
// never invention.
function buildRecapPrompt(data: RecapData, sport: string, level: string, language: string, isPro: boolean) {
  const langName = languageNames[language] || 'English';
  const langLine = language && language !== 'en' ? ` Write entirely in ${langName}.` : '';
  const fields = isPro ? `"story", "turningPoint", "keyPerformance", "whyItMattered"` : `"story"`;
  // STORY leads with the lede — the single most significant fact AMONG THE DATA (ordering, not
  // invention). Hoisted into one shared const so the Pro/free story guidance can't drift.
  const storyLine = `- "story": Lead with the SINGLE most CONSEQUENTIAL storyline IN THE DATA below — what actually DROVE the result: a dominant individual performance, an early scoring burst that broke the game open, a comeback, a late goal that DECIDED a close game, or a record/milestone ONLY if the data explicitly states one. "Most significant" means most consequential to the OUTCOME, NOT the most recent event — in a one-sided result do NOT lead with the final or latest score (a late goal in a 5-0 game is immaterial once the result is decided; the dominant performance or the early burst is the story). Ask "what's the headline of this game?" and write toward it, using the other stats as SUPPORT rather than as the opening. 2-4 sentences at a ${level} level. Pick the lede ONLY from the facts provided — do NOT manufacture significance or add "historic"/"record"/"milestone" framing the data does not contain. If the facts are thin and nothing clearly stands out, say so plainly (e.g. note the detail isn't available) rather than inflating a minor stat into a headline.`;
  const guide = isPro
    ? `${storyLine}
- "turningPoint": the single moment the game shifted — ONLY if the data shows one, else "".
- "keyPerformance": the standout player or unit — ONLY if the data names one, else "".
- "whyItMattered": the significance/stakes in plain language — ONLY if supported, else "".`
    : storyLine;
  // Soccer-only: when a structured "Goals —" tally is present, force the model to honor it EXACTLY
  // (fixes the "said two, was three" under-count). Empty for every other sport → prompt unchanged.
  const goalRule = (SOCCER_RECAP_KEYS.includes(sport) && data.summaryFacts.some(f => f.startsWith('Goals —')))
    ? ' If a "Goals —" line is given, it is the AUTHORITATIVE tally: your recap MUST reflect those EXACT goal counts per team and per scorer — never state more or fewer goals than the tally shows (if it says a player scored 3, never write "two").'
    : '';
  // Branch A vs B pivots on whether ESPN gave us a real AP recap for this game (Gate 2).
  //   A (article present): the AP recap IS authoritative narrative — the model USES its significance
  //     and rewrites it at level. The old "never add drama the data doesn't contain" clause would
  //     FIGHT the source (the drama is now IN the data), so the cardinal rule is transformed to
  //     "use the story, don't invent past it, don't copy the words."
  //   B (no article — golf/thin games): the original never-fabricate-from-stats rule, byte-identical
  //     to before. Sports without an article regress nowhere.
  const hasArticle = !!data.articleLede;
  const cardinalRule = hasArticle
    ? `CARDINAL RULE — GROUND IN THE AP RECAP. The Official AP recap in the DATA below IS authoritative source narrative — use the significance, turning points, and standout performances it describes. Do NOT add anything beyond what the AP recap + stats support, and CRITICALLY do NOT reproduce the AP recap's wording — rewrite it in your own plain, ${level}-appropriate language. Never invent plays, players, scores, or stats the AP recap and data don't contain. If a field isn't supported by the AP recap or the stats, return an EMPTY STRING "". Explain any jargon in plain terms.`
    : `CARDINAL RULE — NEVER FABRICATE. Recap ONLY what the DATA below supports. If the data does not clearly show a turning point, a standout performer, or the significance, return an EMPTY STRING "" for that field. Never invent plays, players, scores, stats, or narrative. A short honest recap is correct; a confident made-up one is a failure. Leading with the most significant fact means ORDERING the real facts by importance — it NEVER means adding importance, records, or drama the data doesn't contain. Explain any jargon in plain terms.`;
  const system = `You are a sports broadcaster writing a post-game recap for a ${level}-level viewer (someone newer to ${sport}).${langLine}
${cardinalRule}${goalRule}`;
  const facts = data.summaryFacts.length ? data.summaryFacts.map(f => `- ${f}`).join('\n') : '(no detailed play/stat data available for this game)';
  const winnerName = data.winner === 'home' ? data.homeTeam : data.winner === 'away' ? data.awayTeam : '';
  // AP recap block — injected ONLY when present (Branch A). Empty string when absent → the user
  // message is byte-identical to before (Branch B). Headline + lede are the grounding; the prompt
  // above forces a rewrite-at-level, never a copy (copyright discipline).
  const apRecap = hasArticle
    ? `Official AP recap (authoritative source narrative — REWRITE in your own ${level}-level words, NEVER copy its sentences):
${data.articleHeadline ? `Headline: ${data.articleHeadline}\n` : ''}${data.articleLede}
`
    : '';
  const user = `DATA (the ONLY facts you may use):
Final: ${data.awayTeam} ${data.awayScore} — ${data.homeTeam} ${data.homeScore}${data.statusDetail ? ` (${data.statusDetail})` : ''}
${winnerName ? `Winner: ${winnerName}` : 'Winner: see score'}
${apRecap}Key facts:
${facts}

Respond with JSON containing EXACTLY these fields: { ${fields} }.
${guide}
Empty string for any field the data can't support. Do not exceed what the data shows.`;
  return { system, user };
}

// Vision (premium #2) — the LOAD-BEARING never-fabricate prompt. A vision model handed a
// glary/angled/blurry phone photo of a TV will confidently invent formations, misread scores,
// and name players it can't see. Bias HARD toward honest "I can't make that out." Provider/model
// are abstracted in visionProvider.ts; this prompt is provider-agnostic.
function buildVisionPrompt(level: string, language: string, mode: string, question: string, gameContext: any) {
  const langName = languageNames[language] || 'English';
  const langLine = language && language !== 'en' ? ` Respond entirely in ${langName}.` : '';
  const gc = gameContext || {};
  const ctxLine = (gc.homeTeam || gc.awayTeam)
    ? `\nContext — the app's selected game (use ONLY to inform what you ACTUALLY see; it is NOT permission to invent what isn't visible): ${gc.awayTeam || '?'} vs ${gc.homeTeam || '?'}${(gc.awayScore || gc.homeScore) ? `, score ${gc.awayScore}-${gc.homeScore}` : ''}${gc.status ? `, ${gc.status}` : ''}${gc.sport ? ` (${gc.sport})` : ''}.`
    : '';
  const system = `You are a sports broadcaster helping a ${level}-level viewer understand a PHOTO of a game — usually a phone photo of a TV, so expect glare, odd angles, blur, motion, and partial views.${langLine}
CARDINAL RULE — NEVER DESCRIBE WHAT YOU CANNOT CLEARLY SEE. Describe ONLY what is plainly visible in THIS image. If it is blurry, glary, dark, angled, or partial, SAY SO and describe only what's legible. Do NOT name specific players, exact scores, jersey numbers, or precise tactical formations unless they are clearly readable in the image. If you cannot clearly identify which SPORT this is, do NOT name a sport or use sport-specific terms (runs, goals, points, innings, sets, etc.) — say you can't make out which sport it is. NEVER assert a score or a score-type (runs vs. goals vs. points) you cannot actually read in the image. "I can see [X] clearly, but I can't make out [Y]" is a correct, good answer — preferred over any confident guess. A general, honest situational read ("the players look set for a restart — watch the…") beats a specific invented detail every time. Never fabricate. Explain any jargon in plain terms.`;
  const user = (mode === 'ask' && question)
    ? `Answer this question about the image, using ONLY what you can actually see (say so if you can't tell): "${question}".${ctxLine}`
    : `In 2-4 sentences at a ${level} level, explain what's happening on screen and what to watch for next — based ONLY on what you can clearly see.${ctxLine}`;
  return { system, user };
}

// Per-level lesson target — the SUBJECT the primary lesson should aim at. Mirrors
// the system-prompt personas so the rubric and persona pull in the same direction.
const lessonTargets: Record<string, string> = {
  kid: 'the rule or outcome — WHAT happened (the result and the basic rule behind it)',
  beginner: 'the outcome plus its basic WHY — what it MEANS for the game',
  intermediate: 'the craft or tactic on display — the SKILL/technique and why it worked here',
  expert: 'the strategic layer — the WHY BEHIND THE WHY (intent, sequencing, matchup), outcome assumed',
};

// MLB Statcast zone → a HANDEDNESS-NEUTRAL human label. Vertical (up/middle/down) is always correct;
// horizontal in/away is NOT (PitchEvent carries no batter side), so we never say in/away — corners stay
// "[height] corner", the middle column is the height alone, edges are "[height] edge", out-of-zone is
// "high/low, off the plate". buildPitchLine always appends "(zone N)" so the raw zone stays verifiable.
function mlbZoneLabel(zone: string): string {
  switch (parseInt(zone, 10)) {
    case 1: case 3: return 'up corner';
    case 2: return 'up in the zone';
    case 4: case 6: return 'middle edge';
    case 5: return 'middle';
    case 7: case 9: return 'down corner';
    case 8: return 'down in the zone';
    case 11: case 12: return 'high, off the plate';
    case 13: case 14: return 'low, off the plate';
    default: return 'off the plate';
  }
}

// Format the LAST pitch of the sequence into one prompt line. Missing fields are omitted (never
// "undefinedmph"); empty sequence / all-missing → '' (→ output-neutral, no line injected).
function buildPitchLine(seq: PitchEvent[]): string {
  const p = seq.length ? seq[seq.length - 1] : undefined;
  if (!p) return '';
  const lead = [typeof p.velocity === 'number' ? `${p.velocity}mph` : '', p.pitchType].filter(Boolean).join(' ');
  const loc = p.location ? `${mlbZoneLabel(p.location)} (zone ${p.location})` : '';
  const parts = [lead, p.result, loc].filter(Boolean);
  return parts.length ? `Last pitch: ${parts.join(', ')}` : '';
}

export function buildUserPrompt(play: string, gameContext: string, sport: string, level: string, forCache = false, pitchLine = ''): string {
  const target = lessonTargets[level] || lessonTargets['beginner'];

  // Generic-teaching addendum — appended ONLY for the cacheable path (forCache). A cached situation
  // entry may be replayed under a DIFFERENT match, so the teaching text must not bake in this match's
  // team/player/city names. Empty string when forCache is false → prompt byte-identical to today.
  const genericRule = forCache
    ? `\n\nGENERIC TEACHING (this explanation may be reused across different matches): In simple, whyItMatters, and ruleDetail, do NOT name specific teams, players, clubs, or cities. Refer to roles instead — "the attacking side", "the leading team", "the home side", "the defender". Teach the TYPE of situation, not this match's participants. The live play headline and scoreboard supply the actual identities separately.`
    : '';

  // Pitch-data conditional (MLB enriched): with a real "Last pitch:" line present, drop the pitch
  // specifics from the forbidden list and add an explicit permission clause. With pitchLine === '',
  // both reconstruct the grounding rule BYTE-IDENTICAL to today (forbiddenList = the original text,
  // pitchPermission = '').
  const forbiddenList = pitchLine
    ? 'a route type, coverage scheme, or baserunner'
    : 'a route type, coverage scheme, pitch count, pitch sequence, or baserunner';
  const pitchPermission = pitchLine
    ? ` The 'Last pitch' line is real data you may reference (the pitch type, velocity, and location shown). Do NOT invent any pitch detail beyond what that line states — no counts, no prior pitches in the sequence, no spin or movement not given.`
    : '';

  return `Sport: ${sport.toUpperCase()}
Game situation: ${gameContext}
Play data: "${play}"${pitchLine ? `\n${pitchLine}` : ''}

STEP 1 — Choose the lesson (reason silently; do NOT put this reasoning in the output):
From this play, consider the concepts someone could learn — the rule, the outcome, the technique/craft, the strategy, and the situational stakes. Pick the SINGLE best PRIMARY LESSON to teach a ${level}-level viewer. Choose the one that best balances:
- relevance: central to what actually happened;
- level-fit: the right depth for a ${level} viewer — for this level, aim at ${target};
- importance/novelty: worth teaching, not trivial or obvious;
- teachability: explainable clearly in 2-3 sentences.
Teach ONLY that one lesson. Do NOT enumerate the other candidates.

STEP 2 — Confidence: State observed facts plainly. But when you infer intent or strategy, hedge honestly — say "likely," "appears to," or "the idea is usually" rather than asserting the player's exact thoughts as fact.

STEP 3 — Respond with this EXACT JSON structure (content varies by level, structure does not):
{
  "simple": "The ONE primary lesson, taught at a ${level} level",
  "whyItMatters": "Why that lesson / this play matters in the game situation",
  "ruleDetail": "Explanation of the specific rule involved (or empty string if none)",
  "showRule": true/false,
  "complexity": "low" | "medium" | "high"
}

Rules for JSON flags:
- "showRule": true ONLY if a specific rule genuinely needs explaining (penalties, unusual calls, rare mechanics). If level is "expert", set false unless the rule is extremely obscure.
- "complexity": "high" if the play is rare or very difficult to understand; "low" for routine plays.
- If the play is routine/boring, keep the lesson modest and brief — do NOT invent significance or over-teach.

CRITICAL GROUNDING RULE: Teach the lesson using ONLY facts present in the play data and game situation provided. Do NOT invent specifics that aren't stated — do not name ${forbiddenList} that isn't in the data. If you don't know the specific mechanism, teach the general principle WITHOUT inventing details (e.g. "pitchers often use a pitch like this to..." not "he threw a backdoor slider to the outside corner" when the pitch/location wasn't given). Hedging words like "likely" do NOT license inventing facts — an inference must follow from what's actually stated. Check the game situation before referencing runners/base-state. Better to be slightly more general and TRUE than specific and invented.${pitchPermission}${genericRule}`;
}

// Learn Mode prompt — no specific play; explain the sport / current context.
function buildLearnUserPrompt(sport: string, gameContext: string, level: string): string {
  return `The user is watching ${sport}. Current context: ${gameContext}. Explain what is happening and what to watch for at a ${level} level. Be educational and engaging.

Respond with this exact JSON structure:
{
  "simple": "What is happening and what to watch for",
  "whyItMatters": "Why it's interesting / extra context",
  "complexity": "low" | "medium" | "high"
}`;
}

// --- Live tennis (Learn Mode pre-check helpers) ---------------------------------------------------
// The situation string is built DETERMINISTICALLY from parsed provider data — the LLM never invents
// score/serve/momentum facts. Semantics are LOCKED by reconciliation (timeline rows credit the player
// who WON the game; 'break' = broke opponent's serve). No invented shot detail (no aces/winners/UE).
const TENNIS_SET_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
const tennisOrdinal = (n: number): string => TENNIS_SET_ORDINALS[n - 1] || `${n}th`;
// Rank tennis points so we can compare them ('40' beats '30'); 'AD' is highest, unknown → -1.
const tennisPointRank = (p: string): number =>
  ({ '0': 0, '15': 1, '30': 2, '40': 3, AD: 4 } as Record<string, number>)[p] ?? -1;

// Conservative break/game-point label from the CURRENT game, point scores in SERVER-first order.
// Only labels when unambiguous (deuce / 40-40 / odd values → no label).
function tennisPointLabel(sPts: string, rPts: string): 'break' | 'game' | null {
  if (rPts === 'AD') return 'break';                              // returner has advantage → can break
  if (rPts === '40' && tennisPointRank(sPts) < 3) return 'break'; // returner one point from the game
  if (sPts === 'AD') return 'game';                               // server has advantage → can hold
  if (sPts === '40' && tennisPointRank(rPts) < 3) return 'game';  // server one point from the game
  return null;
}

// Pronoun guidance for the LLM free-text (the deterministic situation string is pronoun-free — it
// uses names + role nouns). Women's/Men's Singles → she/he; unknown → strictly gender-neutral.
function tennisPronounGuidance(category: any): string {
  const c = String(category || '');
  if (c === "Women's Singles") return 'Both players are women — use she/her pronouns.';
  if (c === "Men's Singles") return 'Both players are men — use he/his pronouns.';
  return 'Use gender-neutral phrasing (the server, the returner, the player, they) — do NOT assume gender.';
}

// "Nothing has happened yet" detector — first set 0-0 (or no sets), current game 0-0 (or none), and an
// empty/absent timeline. When true the read must NOT fabricate shot/tactic detail it cannot know.
function tennisJustStarted(match: TennisGame, timeline: TennisTimelineEntry[] | null): boolean {
  const { sets, currentGame } = match;
  const noSets = sets.length === 0 || (sets.length === 1 && sets[0].home === 0 && sets[0].away === 0);
  const noGame = !currentGame || (currentGame.home === '0' && currentGame.away === '0');
  const noTimeline = !timeline || timeline.length === 0;
  return noSets && noGame && noTimeline;
}

// Factual English situation string from the live match + game-by-game timeline.
function buildTennisSituation(match: TennisGame, timeline: TennisTimelineEntry[] | null): string {
  const { home, away, sets, currentGame, server } = match;
  const serverName = server === 'home' ? home : server === 'away' ? away : null;
  const returnerName = server === 'home' ? away : server === 'away' ? home : null;

  // Fresh start: no games played yet → say so plainly, name the opening server, and stop (no invented
  // texture). The prompt also forbids fabricating tactics in this case.
  if (tennisJustStarted(match, timeline)) {
    const intro = [`The match between ${home} and ${away} has just begun; no games have been played yet.`];
    if (serverName) intro.push(`${serverName} serves to open the match.`);
    return intro.join(' ');
  }

  const parts: string[] = [`${home} is playing ${away}.`];

  // Sets: all but the last are completed; the last entry is the in-progress set.
  if (sets.length) {
    const current = sets[sets.length - 1];
    sets.slice(0, -1).forEach((s, i) => {
      const winner = s.home > s.away ? home : away;
      parts.push(`${winner} won set ${i + 1} ${Math.max(s.home, s.away)}-${Math.min(s.home, s.away)}.`);
    });
    const ord = tennisOrdinal(sets.length);
    if (current.home === current.away) {
      parts.push(`The ${ord} set is level at ${current.home}-${current.away}.`);
    } else {
      const leader = current.home > current.away ? home : away;
      parts.push(`${leader} leads ${Math.max(current.home, current.away)}-${Math.min(current.home, current.away)} in the ${ord} set.`);
    }
  }

  // Current game + serve. Points rendered server-first; conservative break/game-point label.
  if (serverName && currentGame) {
    const sPts = server === 'home' ? currentGame.home : currentGame.away;
    const rPts = server === 'home' ? currentGame.away : currentGame.home;
    parts.push(`${serverName} is serving at ${sPts}-${rPts} (server's points first).`);
    const label = tennisPointLabel(sPts, rPts);
    if (label === 'break') parts.push(`It is break point — ${returnerName} can win ${serverName}'s service game.`);
    else if (label === 'game') parts.push(`It is game point for ${serverName}.`);
  } else if (serverName) {
    parts.push(`${serverName} is serving.`);
  }

  // Momentum from the timeline. Rows credit the WINNER of the game; foreground BREAKS. Do NOT assert
  // score==timeline equality (the timeline can lead by one game).
  if (timeline && timeline.length) {
    const breaks = (name: string) => timeline.filter(t => t.player === name && t.result === 'break').length;
    const bHome = breaks(home), bAway = breaks(away);
    if (bHome) parts.push(`${home} has broken serve ${bHome} time${bHome > 1 ? 's' : ''}.`);
    if (bAway) parts.push(`${away} has broken serve ${bAway} time${bAway > 1 ? 's' : ''}.`);
    // Current run: consecutive trailing rows won by the same player.
    const last = timeline[timeline.length - 1].player;
    let run = 0;
    for (let i = timeline.length - 1; i >= 0 && timeline[i].player === last; i--) run++;
    if (run >= 2 && (last === home || last === away)) {
      parts.push(`${last} has won the last ${run} games in a row.`);
    }
  }

  return parts.join(' ');
}

// Situation string from ESPN SET SCORES only (case (b): names present, no RapidAPI live-point data).
// Set scores are always available + free from ESPN, so the read reflects the real match state even
// without server/current-game/timeline. NO server/points/break content here — we don't have it.
function buildTennisSituationFromSets(
  home: string, away: string,
  sets: Array<{ home: number; away: number }>, statusDetail: string,
): string {
  const valid = (Array.isArray(sets) ? sets : []).filter(
    s => s && Number.isFinite(Number(s.home)) && Number.isFinite(Number(s.away)),
  ).map(s => ({ home: Number(s.home), away: Number(s.away) }));
  const anyGames = valid.some(s => s.home > 0 || s.away > 0);
  // No real games anywhere → genuine fresh start.
  if (!valid.length || !anyGames) {
    return `${home} is playing ${away}. The match has just begun; no games have been played yet.`;
  }
  const parts: string[] = [`${home} is playing ${away}.`];
  const last = valid[valid.length - 1];
  // Completed sets = all but the last (ESPN's last entry is the in-progress set); winner = more games.
  valid.slice(0, -1).forEach((s, i) => {
    const winner = s.home > s.away ? home : away;
    parts.push(`${winner} won the ${tennisOrdinal(i + 1)} set ${Math.max(s.home, s.away)}-${Math.min(s.home, s.away)}.`);
  });
  const ord = tennisOrdinal(valid.length);
  if (last.home === last.away) {
    parts.push(`The ${ord} set is level at ${last.home}-${last.away}.`);
  } else {
    const leader = last.home > last.away ? home : away;
    parts.push(`${leader} leads ${Math.max(last.home, last.away)}-${Math.min(last.home, last.away)} in the ${ord} set.`);
  }
  if (statusDetail) parts.push(`The match is currently in the ${statusDetail}.`);
  return parts.join(' ');
}

// Tennis-live SYSTEM prompt. The data limitation is framed as EPISTEMIC FACT (not a polite request) so
// the model can't rationalize inventing shot/stroke/surface detail — buried "do not" lines in the user
// prompt were being ignored. Gender is anchored here too (authoritative). Level tunes term-defining.
function buildTennisSystemPrompt(level: string, language: string, pronounGuidance: string): string {
  const isBasic = level === 'kid' || level === 'beginner';
  const levelLine = isBasic
    ? `Explain at a ${level} level: define tennis terms simply (break point, hold, serve) the first time they matter.`
    : `Explain at a ${level} level: assume the viewer knows tennis terms; focus on momentum and stakes.`;
  let prompt = `You explain live tennis to someone watching, at a ${level} level.

CRITICAL — what you can and cannot see:
You are working from a LIMITED live-scoring feed. The ONLY facts you have are the set scores, the current game's point score, who is serving, and how many breaks each player has. You have NOT watched a single point. You cannot see the court.

The one rule that matters: You may explain the SITUATION and the SPORT in general terms. You may NEVER state, imply, or guess what THIS player is doing right now.

ALLOWED — the situation and general knowledge:
- The score and what it means.
- What is at stake (break point, game point, holding serve).
- General truths about tennis (e.g. grass keeps the ball low and fast, which rewards aggressive serving).
- What a shot or tactic generally does (e.g. a slice stays low and can be hard to attack).

FORBIDDEN — any claim about THIS player's live actions, because you cannot see them:
- "She's hitting slices." / "He just ripped a backhand winner." / "Her forehand is controlling the point."
- Anything describing HOW a player is hitting, what they just did, or their tactics in THIS match.
- This holds even if phrased as "if" or "appears to" — you still cannot see the court, so do not make the determination.

Speak about the situation and the sport. Never narrate the player. ${levelLine} ${pronounGuidance}`;
  if (language && language !== 'en') {
    const langName = languageNames[language] || language;
    prompt += `\n\nIMPORTANT: Write every value in the JSON response entirely in ${langName}. Translate tennis terms naturally; do not output English.`;
  }
  return prompt;
}

// Tennis-live USER prompt — now LEAN: it just carries the situation + the level/just-started ask. The
// heavy data-limitation and pronoun constraints are authoritative in the SYSTEM prompt above (burying
// them here diluted them and the model ignored them).
function buildTennisLearnUserPrompt(situation: string, level: string, justStarted: boolean): string {
  const isBasic = level === 'kid' || level === 'beginner';
  const focus = justStarted
    ? `The match has just started, so there is no texture yet. Briefly note who is serving to open the match and what is generally at stake. Keep it to one or two short sentences.`
    : isBasic
      ? `Explain in plain terms what this situation MEANS. If there is a break point, explain that the returner has a chance to win the server's game — a big deal because the server normally has the advantage. Define the key term simply.`
      : `Assume the viewer knows the terms. Focus on the momentum and the stakes — what the breaks and any current run say about who is in control and what is at risk on this point.`;
  return `The user is watching a live tennis match. Current situation: ${situation}

${focus}

Respond with this exact JSON structure:
{
  "simple": "What the score situation is and what to watch for — the scoreboard reality only",
  "whyItMatters": "Why this situation matters — momentum and stakes",
  "complexity": "low" | "medium" | "high"
}`;
}

// Name normalization for the ESPN↔RapidAPI join (mirrors tennis-live route): NFD, strip diacritics,
// lowercase, trim, collapse whitespace — so "Cerúndolo" set-equals "cerundolo".
const normTennisName = (s: any): string =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// LIVE-ACTION CLAIM detector — NARROW + high-precision. The new rule ALLOWS general tennis knowledge
// ("a slice stays low on grass") but FORBIDS claims about what THIS player is doing ("she's hitting
// slices") since we cannot see the court. So this no longer bans knowledge words; it catches only an
// unambiguous player+live-action+shot claim, in two shapes:
//   (1) a possessive pronoun owning a shot noun — "her forehand", "his backhand";
//   (2) a player subject + a live-action verb + a shot noun in proximity — "she is hitting slices".
// The SYSTEM PROMPT is the primary control; this is a backstop that triggers ONE regen. Test-verified
// to catch the FORBIDDEN examples and allow general/conditional usage (incl. player + knowledge in the
// same sentence, and a pronoun near a shot noun with no action verb).
const TENNIS_SHOT_NOUN = 'forehand|backhand|slice|volley|dropshot|drop\\s?shot|lob|groundstroke';
const TENNIS_ACTION_VERB = 'hit|hits|hitting|ripped|rips|ripping|sliced|slices|slicing|volleyed|volleys|volleying|smashed|smashes|smashing|played|plays|playing|used|uses|using|struck|strikes';
const TENNIS_LIVE_CLAIM = new RegExp(
  `\\b(her|his)\\s+(?:\\w+\\s+){0,2}(${TENNIS_SHOT_NOUN})s?\\b` +
  '|' +
  `\\b(she|he|they|the player)\\b[^.]{0,25}\\b(${TENNIS_ACTION_VERB})\\b[^.]{0,25}\\b(${TENNIS_SHOT_NOUN})s?\\b`,
  'i',
);
const hasLivePlayerClaim = (s: any): boolean => TENNIS_LIVE_CLAIM.test(String(s || ''));

// Deterministic, guaranteed-clean "why it matters" — used as the last-resort fallback if the model
// keeps fabricating. Role nouns + names only, never shot detail.
function tennisDeterministicWhy(match: TennisGame | null): string {
  if (!match) return 'Live point-by-point updates are not available for this match right now; the score above reflects the latest data.';
  const { home, away, currentGame, server } = match;
  const serverName = server === 'home' ? home : server === 'away' ? away : null;
  if (serverName && currentGame) {
    const sPts = server === 'home' ? currentGame.home : currentGame.away;
    const rPts = server === 'home' ? currentGame.away : currentGame.home;
    const label = tennisPointLabel(sPts, rPts);
    if (label === 'break') return `It is break point — winning this point would let the returner take ${serverName}'s service game, a major momentum swing.`;
    if (label === 'game') return `It is game point — ${serverName} is one point from holding serve.`;
  }
  return 'Holding serve and converting break chances will decide which way this set turns.';
}

// Run the guarded tennis completion with a post-process safety net: if the output contains banned shot
// vocabulary, regenerate ONCE with an explicit correction; if it STILL does, fall back to a
// deterministic read (the situation string + a templated stakes line). Guarantees no fabricated shot
// detail ever ships, regardless of model behavior.
async function runTennisRead(
  situation: string, level: string, language: string, pronounGuidance: string,
  justStarted: boolean, langLine: string, fallbackMatch: TennisGame | null,
): Promise<{ simple: string; whyItMatters: string; complexity: string }> {
  const system = buildTennisSystemPrompt(level, language, pronounGuidance);
  const baseUser = buildTennisLearnUserPrompt(situation, level, justStarted) + langLine;
  const call = async (extra: string) => {
    const completion = await createChatCompletion({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: baseUser + extra },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  };

  let parsed = await call('');
  let simple = String(parsed.simple || '');
  let why = String(parsed.whyItMatters || '');
  let complexity = parsed.complexity || 'low';

  // The filter applies to simple + whyItMatters (the situation read).
  if (hasLivePlayerClaim(simple) || hasLivePlayerClaim(why)) {
    console.warn('[tennis read] live-player claim in first response — regenerating');
    parsed = await call('\n\nDo NOT describe what either player is doing — no shots, strokes, or tactics in THIS match. Describe ONLY the score, serve, breaks, and general context.');
    simple = String(parsed.simple || '');
    why = String(parsed.whyItMatters || '');
    complexity = parsed.complexity || complexity;
    if (hasLivePlayerClaim(simple) || hasLivePlayerClaim(why)) {
      console.warn('[tennis read] regen STILL contained a live-player claim — using deterministic fallback');
      simple = situation;
      why = tennisDeterministicWhy(fallbackMatch);
    }
  }
  return { simple, whyItMatters: why, complexity };
}

// playType is raw ESPN text, so it never passes through the explanation prompt.
// Translate it directly (deterministic) rather than relying on the model to echo
// a translated copy inside its JSON — which it drops unreliably. Returns null for
// English (and on any failure) so the caller keeps the raw ESPN text.
async function translatePlayText(play: string, language: string): Promise<string | null> {
  if (!language || language === 'en' || !play) return null;
  const langName = languageNames[language] || language;
  try {
    const c = await createChatCompletion({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `Translate the sports play description into ${langName}. Keep player names, team names, and numbers exactly as given. Output ONLY the translation — no quotes, no notes.`,
        },
        { role: 'user', content: play },
      ],
      temperature: 0,
    });
    return c.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('Play translation error:', e);
    return null;
  }
}

// Expert guard ("nuclear option"): if the model still slips into DEFINING what
// something is at expert level, strip that leading definition. Made robust vs. the
// old `.split('.')`: scan the first ~80 chars (case-insensitive) for definitional
// trigger phrases, and when dropping the first sentence use a boundary that ignores
// decimals/abbreviations (a terminator followed by whitespace + a capital/quote).
// Kept as a safety net on top of the reworked expert prompt (see note below).
export function applyExpertNuclearOption(parsed: any, level: string): any {
  if (level !== 'expert') return parsed;
  const triggers = ['is a type of', 'is when', 'is called', 'refers to', 'is defined as', 'is a pitch', 'is a play', 'is a foul'];
  const text = String(parsed?.simple || '');
  const head = text.slice(0, 80).toLowerCase();
  if (triggers.some(t => head.includes(t))) {
    const m = text.match(/^.*?[.!?]+["']?\s+(?=[A-Z"])/); // first real sentence boundary
    if (m && m[0].length < text.length) {
      parsed.simple = text.slice(m[0].length).trim() || parsed.whyItMatters || text;
    } else {
      // No clean second sentence to fall back to — prefer significance over a definition.
      parsed.simple = parsed.whyItMatters || text;
    }
  }
  parsed.ruleDetail = '';
  parsed.showRule = false;
  return parsed;
}

// The real explanation call: build the leveled prompts, run the model, parse, and
// apply the expert guard. Shared by POST and the local lesson-test harness so the
// harness exercises the EXACT prompts/flow (not a copy).
export async function explainPlay(
  play: string, gameContext: string, sport: string, level: string, language: string = 'en', forCache = false, pitchLine = '',
): Promise<any> {
  const completion = await createChatCompletion({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt(sport, level, language) },
      { role: 'user', content: buildUserPrompt(play, gameContext, sport, level, forCache, pitchLine) },
    ],
    temperature: level === 'expert' ? 0.2 : 0.6,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
  return applyExpertNuclearOption(parsed, level);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sport = 'nfl', level = 'beginner', action, question, context, gameId, language = 'en', playText } = body;

    // Batch-translate a list of raw ESPN play descriptions (the play-by-play
    // list). Deterministic, one call for the whole list. Returns the input
    // unchanged for English or on any failure so the client keeps the raw text.
    if (action === 'translate') {
      const texts: string[] = Array.isArray(body.texts) ? body.texts.map((t: unknown) => String(t ?? '')) : [];
      if (!language || language === 'en' || texts.length === 0) {
        return NextResponse.json({ translations: texts }, { headers: corsHeaders });
      }
      const langName = languageNames[language] || language;
      try {
        const c = await createChatCompletion({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `Translate each sports play description into ${langName}. Keep player names, team names, and numbers exactly as given. Respond with JSON {"translations": [...]} containing EXACTLY ${texts.length} strings, in the same order as the input. Do not add, drop, merge, or reorder items.`,
            },
            { role: 'user', content: JSON.stringify(texts) },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(c.choices[0]?.message?.content || '{}');
        const out = parsed.translations;
        // Length must match or the list/translation rows would misalign — fall back.
        const safe = Array.isArray(out) && out.length === texts.length ? out.map((t: unknown) => String(t ?? '')) : texts;
        return NextResponse.json({ translations: safe }, { headers: corsHeaders });
      } catch (e) {
        console.error('Play list translation error:', e);
        return NextResponse.json({ translations: texts }, { headers: corsHeaders });
      }
    }

    // Handle Follow-up Q&A
    if (action === 'ask' && question) {
      const langName = languageNames[language] || 'English';
      const langLine = language && language !== 'en' ? ` Respond entirely in ${langName}.` : '';

      // Situation-keyed cache (sport-agnostic): a normalized-question HIT replays the exact success
      // shape; a miss/empty/failure falls through to the existing path UNCHANGED. Empty nq → no cache.
      const nq = normalizeQuestion(question);
      const aKey = nq ? askKey({ sport, level, lang: language, normQuestion: nq }) : '';
      if (nq) {
        const cached = await cacheGet(aKey);
        if (cached) {
          try {
            const stored = JSON.parse(cached);
            if (stored && typeof stored.answer === 'string') {
              cacheLog('[cache] ask HIT', aKey);
              return NextResponse.json({ answer: stored.answer }, { headers: corsHeaders });
            }
          } catch {
            // corrupted cache value → fall through to a normal live call (treat as miss)
          }
        }
        cacheLog('[cache] ask MISS', aKey);
      }

      const completion = await createChatCompletion({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: `Helpful sports expert. Level: ${level}.${langLine} Answer clearly and concisely in 2-3 sentences.` },
          { role: 'user', content: `Context: ${context}\nQuestion: ${question}` }
        ],
        temperature: 0.7,
      });
      const answer = completion.choices[0]?.message?.content?.trim();
      // Cache only a successful, non-empty answer (never errors/empties). 24h TTL per §2e.
      if (nq && answer) {
        await cacheSet(aKey, JSON.stringify({ answer }), 86400);
      }
      return NextResponse.json({ answer }, { headers: corsHeaders });
    }

    // Post-Game Recap (premium #1). `score` is built server-side from the real data (never
    // the model) so it can't be hallucinated. Free (isPro !== true) → only score + story
    // generated; Pro → all four narrative fields. Empty string = the data didn't support it.
    if (action === 'recap') {
      const isProReq = body.isPro === true;
      const data = await fetchRecapData(sport, gameId);
      const score = (data.homeTeam || data.awayTeam)
        ? `${data.awayTeam} ${data.awayScore} — ${data.homeTeam} ${data.homeScore}`.trim()
        : '';
      // No usable game data → empty recap; the client renders a graceful "not available" state.
      if (!data.homeTeam && !data.awayTeam) {
        return NextResponse.json({ score: '', story: '', turningPoint: '', keyPerformance: '', whyItMattered: '' }, { headers: corsHeaders });
      }
      try {
        const { system, user } = buildRecapPrompt(data, sport, level, language, isProReq);
        const completion = await createChatCompletion({
          model: GROQ_MODEL,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.5,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return NextResponse.json({
          score,
          story: String(parsed.story || ''),
          // Pro-only narrative fields — never sent to free users (cheaper + no content leak).
          turningPoint: isProReq ? String(parsed.turningPoint || '') : '',
          keyPerformance: isProReq ? String(parsed.keyPerformance || '') : '',
          whyItMattered: isProReq ? String(parsed.whyItMattered || '') : '',
          // Public ESPN recap link — sent to ALL users (not premium content, just a link-out).
          // Verbatim from the API; the empty/error returns omit it → client normalizes to ''.
          articleLink: data.articleLink,
        }, { headers: corsHeaders });
      } catch (e) {
        console.error('Recap error:', e);
        // Score is real even if the narrative call failed — still useful.
        return NextResponse.json({ score, story: '', turningPoint: '', keyPerformance: '', whyItMattered: '' }, { headers: corsHeaders });
      }
    }

    // Vision (premium #2) — analyze a captured/picked image. The model/provider lives behind
    // analyzeImage() (visionProvider.ts); this branch only builds the never-fabricate prompt.
    // Pro-gating is enforced client-side (no vision call fires for free users).
    if (action === 'vision') {
      const imageBase64: string = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
      if (!imageBase64) {
        return NextResponse.json({ error: 'Missing image' }, { status: 400, headers: corsHeaders });
      }
      const mode = body.mode === 'ask' ? 'ask' : 'explain';
      const question = typeof body.question === 'string' ? body.question : '';
      try {
        const { system, user } = buildVisionPrompt(level, language, mode, question, body.gameContext);
        const text = await analyzeImage({ imageBase64, system, user });
        return NextResponse.json({ text }, { headers: corsHeaders });
      } catch (e) {
        console.error('Vision error:', e);
        return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500, headers: corsHeaders });
      }
    }

    // Coach's Corner (premium #3). Two modes: 'state' (cheap, NO Groq — returns the normalized
    // situation so the client derives the hook + data-sufficiency gate; the only call free users
    // make) and 'full' (Groq — the strategic read, fired ONLY for Pro on expand). Pro-gating is
    // client-side; the free 'state' response carries only public situational facts, never the read.
    if (action === 'coach') {
      const state = await normalizeCoachState(sport, gameId);
      if (!state) {
        // Non-rich sport / no live game → client shows "coming soon" (never a fabricated insight).
        return NextResponse.json({ situation: null }, { headers: corsHeaders });
      }
      if (body.mode !== 'full') {
        return NextResponse.json({ situation: state }, { headers: corsHeaders });
      }
      try {
        const { system, user } = buildCoachPrompt(state, sport, level, language);
        const completion = await createChatCompletion({
          model: GROQ_MODEL,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.4,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return NextResponse.json({
          strategicRead: String(parsed.strategicRead || ''),
          whatItSetsUp: String(parsed.whatItSetsUp || ''),
        }, { headers: corsHeaders });
      } catch (e) {
        console.error('Coach error:', e);
        return NextResponse.json({ strategicRead: '', whatItSetsUp: '' }, { status: 500, headers: corsHeaders });
      }
    }

    // Learn Mode (tennis/golf, or any request with learnMode): no specific play —
    // explain the sport + current tournament context. No playType/rawPlay.
    const learn = (espnConfig[sport]?.learnMode || body.learnMode) === true;
    if (learn) {
      // Live-tennis pre-check (ADDITIVE, gated on sport==='tennis' AND TENNIS_LIVE==='1' AND a live
      // match existing). When the flag is unset, the sport isn't tennis, or nothing is live, this is
      // skipped ENTIRELY and the request falls through to the exact generic learn completion below —
      // byte-identical to today. Best-effort: any provider null/failure → fall through, never 500.
      if (sport === 'tennis' && process.env.TENNIS_LIVE === '1') {
        try {
          const tHome = typeof body.tennisHome === 'string' ? body.tennisHome : '';
          const tAway = typeof body.tennisAway === 'string' ? body.tennisAway : '';
          const hasNames = !!(tHome && tAway);
          const wanted = (typeof body.rawId === 'string' && body.rawId)
            || (typeof gameId === 'string' && gameId) || '';

          const matches = await getLiveTennisMatches();
          const live = (matches || []).filter(m => m.isLive);

          // NAME-FIRST match (lands the explain on the SELECTED match — mobile sends the ESPN names).
          // Set-equality, order-independent (same logic as tennis-live G2). Fall back to rawId/gameId.
          // Deliberately NO live[0] fallback — an arbitrary match = a read about the WRONG players.
          let match: TennisGame | null = null;
          if (hasNames) {
            const want = new Set([normTennisName(tHome), normTennisName(tAway)]);
            match = live.find(m => {
              const h = normTennisName(m.home), a = normTennisName(m.away);
              return h !== a && want.has(h) && want.has(a);
            }) || null;
          }
          if (!match && wanted) match = live.find(m => m.rawId === wanted) || null;

          // Fire the GUARDED tennis read whenever this is a real live-tennis request: a matched RapidAPI
          // match (full situation + timeline) OR a known selected match by name (minimal situation, no
          // live-point data — e.g. RapidAPI quota-blocked / match absent from its feed). In BOTH cases
          // we use buildTennisSystemPrompt with its no-fabrication guardrails — NEVER the generic
          // buildSystemPrompt path below, which solicits "the tactic on display" (the shot-detail source).
          if (match || hasNames) {
            const timeline = match ? await getTennisTimeline(match.rawId) : null; // null on failure/empty
            // Case (b) (no RapidAPI match): ground the situation in ESPN's SET SCORES (always present),
            // so the read reflects the real match state instead of "serving to open the match".
            const espnSets = Array.isArray(body.tennisSets) ? body.tennisSets : [];
            const espnSetsHaveGames = espnSets.some((s: any) => s && (Number(s.home) > 0 || Number(s.away) > 0));
            const situation = match
              ? buildTennisSituation(match, timeline)
              : buildTennisSituationFromSets(tHome, tAway, espnSets, typeof body.tennisStatusDetail === 'string' ? body.tennisStatusDetail : '');
            const pronounGuidance = tennisPronounGuidance(body.tennisCategory);
            // Case (a): from the real match. Case (b): NOT a fresh start when ESPN set scores show games.
            const justStarted = match ? tennisJustStarted(match, timeline) : !espnSetsHaveGames;
            const langLine = language && language !== 'en'
              ? ` Respond entirely in ${languageNames[language] || language}.`
              : '';

            // Guarded completion + banned-shot-vocabulary safety net (regen → deterministic fallback).
            const read = await runTennisRead(situation, level, language, pronounGuidance, justStarted, langLine, match);
            return NextResponse.json({
              simple: read.simple,
              whyItMatters: read.whyItMatters,
              ruleDetail: '',
              showRule: false,
              complexity: read.complexity,
              gameContext: situation,
              learnMode: true,
            }, { headers: corsHeaders });
          }
          // Not a groundable live-tennis request (no match AND no names) → fall through to generic.
        } catch (e) {
          console.error('Tennis live learn error (degrading to generic):', e);
          // fall through to the generic learn completion below
        }
      }

      const fetched = await fetchGameData(sport, gameId);
      const gameContext = fetched.gameContext;
      const langLine = language && language !== 'en'
        ? ` Respond entirely in ${languageNames[language] || language}.`
        : '';
      const completion = await createChatCompletion({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(sport, level, language) },
          { role: 'user', content: buildLearnUserPrompt(sport, gameContext, level) + langLine },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return NextResponse.json({
        simple: parsed.simple || '',
        whyItMatters: parsed.whyItMatters || '',
        ruleDetail: '',
        showRule: false,
        complexity: parsed.complexity || 'low',
        gameContext,
        learnMode: true,
      }, { headers: corsHeaders });
    }

    // Fetch live game context + latest play for the requested sport. When an
    // explicit playText is supplied (a past play), use it and skip the latest-play lookup.
    // Soccer family (live latest play only) routes through dataProvider → ESPN base + Highlightly
    // event context (the in-season visible win). EVERY other sport, soccer past-plays, and the
    // no-game edge fall to the EXISTING fetchGameData path, byte-identical. With no Highlightly
    // events the soccer branch is also identical to today (gameContext gets no events suffix).
    const SOCCER = ['soccer', 'worldcup', 'epl', 'laliga'];
    // Live MLB now ALSO routes through getGameData (enricher-aware → GUMBO pitch data on pitchSequence,
    // which nothing reads until Gate 4). Gated to live (!playText) so MLB past-plays stay on
    // fetchGameData. For MLB: enriched.events is undefined → no 'Recent events' suffix → gameContext
    // byte-identical; and the MLB summary deep-dive in fetchEspnBase makes enriched.lastPlay
    // byte-identical to fetchGameData's play. soccerSig(enriched) returns null for MLB (no events) →
    // eKey null → MLB is never cached and forCache stays false (vivid + named), so this is output-neutral.
    const ENRICHED = [...SOCCER, 'mlb'];
    const enriched = (ENRICHED.includes(sport) && !playText) ? await getGameData(sport, gameId) : null;
    let play: string, gameContext: string, homeTeam: string, awayTeam: string;
    let eKey: string | null = null;   // situation-cache key — set ONLY for cacheable English soccer requests
    let pitchLine = '';               // one "Last pitch:" line — set ONLY for enriched MLB (real pitchSequence)
    if (enriched) {
      homeTeam = enriched.homeTeam;
      awayTeam = enriched.awayTeam;
      play = enriched.lastPlay || 'A key play just happened';
      gameContext = `${awayTeam} vs ${homeTeam} — ${enriched.statusDetail || ''}`;
      // MLB only: real GUMBO pitch data → one pitch-context line. Absent / empty (no live pitch,
      // cross-walk miss, statsapi down) → '' → prompt byte-identical to today (output-neutral).
      if (sport === 'mlb' && enriched.pitchSequence?.length) {
        pitchLine = buildPitchLine(enriched.pitchSequence);
      }
      if (enriched.events?.length) {
        const recent = enriched.events.slice(-6)
          .map(e => `${e.minute ?? '?'}' ${e.type}${e.player ? ` ${e.player}` : ''}${e.detail ? ` (${e.detail})` : ''}`)
          .join('; ');
        gameContext += ` Recent events: ${recent}`;
      }
      // Situation cache (English soccer only for v1): key off the BUCKETED situation. soccerSig → null
      // when there's no usable last event → skip caching. Non-English skips entirely (its playType is a
      // translation we don't store yet — documented v2). eKey stays null for every non-cacheable case.
      const sig = (cacheIsEnabled() && language === 'en') ? soccerSig(enriched) : null;
      eKey = sig ? explainKey({ sport, level, lang: language, sig }) : null;
    } else {
      const fetched = await fetchGameData(sport, gameId, !!playText);
      play = playText || fetched.play;
      ({ gameContext, homeTeam, awayTeam } = fetched);
    }

    // Situation-cache HIT: replay the cached TEACHING CORE merged with LIVE values (playType/teams/
    // gameContext/events from THIS request — never the cached moment's). Returns BEFORE the Promise.all,
    // skipping BOTH Groq calls. Miss / corrupt / non-English / null-sig → fall through to the live path.
    if (eKey) {
      const cached = await cacheGet(eKey);
      if (cached) {
        try {
          const t = JSON.parse(cached);
          if (t && typeof t.simple === 'string') {
            cacheLog('[cache] explain HIT', eKey);
            return NextResponse.json({
              simple: t.simple,
              whyItMatters: t.whyItMatters ?? '',
              ruleDetail: t.ruleDetail ?? '',
              showRule: t.showRule ?? (level !== 'expert'),
              complexity: t.complexity ?? 'low',
              playType: play,            // live, English passthrough
              homeTeam,                  // live
              awayTeam,                  // live
              gameContext,               // live
              events: enriched?.events,  // live
            }, { headers: corsHeaders });
          }
        } catch {
          // corrupted value → fall through to a normal live call (treat as miss)
        }
      }
      cacheLog('[cache] explain MISS', eKey);
    }

    // Run the explanation and the play-text translation concurrently (the
    // translation only needs `play`, already fetched) — no added latency.
    // explainPlay builds the leveled prompts, calls the model, and applies the
    // expert guard (shared with the lesson-test harness).
    const [parsed, translatedPlay] = await Promise.all([
      explainPlay(play, gameContext, sport, level, language, !!eKey, pitchLine),
      translatePlayText(play, language),
    ]);

    // Cache ONLY the teaching core (the situation-dependent fields) under the sig key — never the
    // moment-specific playType/gameContext/events. 6h TTL per §2e. Best-effort (cacheSet swallows errors).
    if (eKey && typeof parsed.simple === 'string' && parsed.simple) {
      await cacheSet(eKey, JSON.stringify({
        simple: parsed.simple,
        whyItMatters: parsed.whyItMatters || '',
        ruleDetail: parsed.ruleDetail || '',
        showRule: parsed.showRule ?? (level !== 'expert'),
        complexity: parsed.complexity || 'low',
      }), 21600);
    }

    return NextResponse.json({
      simple: parsed.simple || play,
      whyItMatters: parsed.whyItMatters || '',
      ruleDetail: parsed.ruleDetail || '',
      showRule: parsed.showRule ?? (level !== 'expert'),
      complexity: parsed.complexity || 'low',
      // Raw ESPN play text, translated directly for non-English; English keeps it as-is.
      playType: translatedPlay || play,
      homeTeam,
      awayTeam,
      gameContext,
      // Soccer-only passthrough for the Match Timeline UI. `enriched` is null for every other
      // sport (and soccer past-plays) → undefined → JSON.stringify OMITS the key → non-soccer
      // responses are byte-identical. The app reads this to render the timeline.
      events: enriched?.events,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500, headers: corsHeaders });
  }
}