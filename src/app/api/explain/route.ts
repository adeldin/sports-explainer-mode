import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
};

// ESPN endpoint config. `core` sports are NOT on the normal scoreboard API and
// need the two-step Core-API $ref fetch (see fetchGameData). Soccer/World Cup
// use the normal site API with their own league slugs.
type EspnCfg = { sport: string; league: string; core?: boolean };
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
  // NOTE: cricket intentionally omitted — ESPN's public API has no usable cricket
  // data (site API 404s; Core API lists the sport but exposes zero leagues/events).
  // It needs a different source (e.g. ESPNcricinfo) before it can be added here.
};

const languageNames: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German',
  ja: 'Japanese', zh: 'Chinese', ko: 'Korean', it: 'Italian', ar: 'Arabic',
};

function buildSystemPrompt(sport: string, level: string, language: string = 'en'): string {
  const sportGuide = sportContext[sport] || 'a professional sport';

  const levelGuides: Record<string, string> = {
    kid: `You are an enthusiastic sports commentator explaining ${sport} to an 8-year-old. 
    Rules: Use ZERO jargon. Use vivid real-world analogies. Max 2 short sentences.`,

    beginner: `You are a friend explaining ${sport} to a new fan. 
    Rules: Explain WHAT happened and WHY it matters. Define terms simply. 2-3 sentences.`,

    intermediate: `You are a sharp analyst for a regular viewer. 
    Rules: Skip basic definitions. Focus on strategic intent and coaching decisions. 3-4 sentences.`,

    expert: `You are a former professional coach speaking to a peer. 
    ABSOLUTE RULES:
    1. NEVER explain what a play IS (e.g., do not say "A strike is..."). 
    2. Start DIRECTLY with strategic analysis: pre-play reads, scheme matchups, and game theory.
    3. 3-4 sentences of dense, high-level insight.
    4. If you catch yourself writing "is when" or "is a type of" — delete the entire sentence and start over.`
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
async function fetchGameData(sport: string, gameId?: string, skipPlayLookup = false) {
  let play = 'A key play just happened';
  let gameContext = 'Live game in progress';
  let homeTeam = '', awayTeam = '';

  const cfg = espnConfig[sport];
  if (!cfg) return { play, gameContext, homeTeam, awayTeam };

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
        ? data?.events?.find((e: any) => e.id === gameId)
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

        // Soccer / World Cup: no plays[] array — use the latest key event / commentary.
        if ((sport === 'soccer' || sport === 'worldcup') && game.id && !skipPlayLookup) {
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

function buildUserPrompt(play: string, gameContext: string, sport: string, level: string): string {
  return `Sport: ${sport.toUpperCase()}
Game situation: ${gameContext}
Play data: "${play}"

Respond with this exact JSON structure:
{
  "simple": "Main explanation/analysis",
  "whyItMatters": "Situational significance",
  "ruleDetail": "Explanation of the rule involved (or empty string if none)",
  "showRule": true/false,
  "complexity": "low" | "medium" | "high"
}

Rules for JSON flags:
- "showRule": Set to true ONLY if the play involves a specific rule that needs explaining (penalties, unusual calls, rare mechanics).
- "showRule": If level is "expert", always set to false unless the rule is extremely obscure.
- "complexity": "high" if the play is rare or very difficult to understand. "low" for routine plays.
- ONLY use information provided in the play data. Do not hallucinate details.`;
}

// playType is raw ESPN text, so it never passes through the explanation prompt.
// Translate it directly (deterministic) rather than relying on the model to echo
// a translated copy inside its JSON — which it drops unreliably. Returns null for
// English (and on any failure) so the caller keeps the raw ESPN text.
async function translatePlayText(play: string, language: string): Promise<string | null> {
  if (!language || language === 'en' || !play) return null;
  const langName = languageNames[language] || language;
  try {
    const c = await groq.chat.completions.create({
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
        const c = await groq.chat.completions.create({
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
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: `Helpful sports expert. Level: ${level}.${langLine} Answer clearly and concisely in 2-3 sentences.` },
          { role: 'user', content: `Context: ${context}\nQuestion: ${question}` }
        ],
        temperature: 0.7,
      });
      return NextResponse.json({ answer: completion.choices[0]?.message?.content?.trim() }, { headers: corsHeaders });
    }

    // Fetch live game context + latest play for the requested sport. When an
    // explicit playText is supplied (a past play), use it and skip the latest-play lookup.
    const fetched = await fetchGameData(sport, gameId, !!playText);
    const play = playText || fetched.play;
    const { gameContext, homeTeam, awayTeam } = fetched;

    // Run the explanation and the play-text translation concurrently (the
    // translation only needs `play`, already fetched) — no added latency.
    const [completion, translatedPlay] = await Promise.all([
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(sport, level, language) },
          { role: 'user', content: buildUserPrompt(play, gameContext, sport, level) }
        ],
        temperature: level === 'expert' ? 0.2 : 0.6,
        response_format: { type: 'json_object' },
      }),
      translatePlayText(play, language),
    ]);

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // Expert Filter (The "Nuclear Option")
    if (level === 'expert') {
      const triggers = ['is a type of', 'is when', 'is called', 'refers to', 'is defined as', 'is a pitch', 'is a play', 'is a foul'];
      const firstSentence = parsed.simple?.split('.')[0]?.toLowerCase() || '';
      if (triggers.some(t => firstSentence.includes(t))) {
        const sentences = parsed.simple.split('.');
        parsed.simple = sentences.slice(1).join('.').trim() || parsed.whyItMatters;
      }
      parsed.ruleDetail = "";
      parsed.showRule = false;
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
      gameContext
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500, headers: corsHeaders });
  }
}