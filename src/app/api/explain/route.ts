import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

const sportContext: Record<string, string> = {
  nfl: 'American football. Key concepts: downs, yards, line of scrimmage, end zone, touchdown, field goal, quarterback, snap, pocket, blitz, coverage.',
  nba: 'Basketball. Key concepts: possession, shot clock, paint, three-point line, pick and roll, fast break, turnover, foul, free throw.',
  mlb: 'Baseball. Key concepts: innings, outs, strikes, balls, bases, pitcher, batter, fielding positions, force out, double play.',
  nhl: 'Ice hockey. Key concepts: periods, power play, penalty kill, icing, offsides, crease, faceoff, hat trick, plus/minus.',
  worldcup: 'Soccer/football. Key concepts: possession, pressing, offside trap, set pieces, corners, free kicks, penalty area, clean sheet, aggregate score.',
};

const espnApis: Record<string, string> = {
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  worldcup: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
};

function buildSystemPrompt(sport: string, level: string, language: string): string {
  const sportGuide = sportContext[sport] || 'a professional sport';
  const langInstruction = language && language !== 'en'
    ? `Respond entirely in the language with code: "${language}".`
    : 'Respond in English.';

  const levelGuides: Record<string, string> = {
    kid: `You are an enthusiastic sports commentator explaining ${sport} to an 8-year-old. 
    Rules: Use ZERO jargon. Use vivid real-world analogies. Max 2 short sentences. End with one fun "wow" fact.`,

    beginner: `You are a friend explaining ${sport} to a new fan. 
    Rules: Explain WHAT happened, WHY it matters, and WHAT comes next. Define sport terms simply. 2-3 sentences.`,

    intermediate: `You are a sharp analyst for a regular viewer. 
    Rules: Skip basic definitions. Focus on strategic intent, coaching decisions, and what a casual fan would miss. 3-4 sentences.`,

    expert: `You are a former professional coach or lead analyst speaking to a peer. 
    ABSOLUTE RULES:
    1. NEVER explain what a play IS (e.g., do not say "A ball is..."). Assume the user knows the rules perfectly.
    2. NEVER invent statistics, percentages, or numbers not provided in the raw data.
    3. Start DIRECTLY with strategic analysis: pre-play reads, scheme matchups, and game theory.
    4. Leave "ruleDetail" EMPTY. Experts do not need rule explanations.
    5. 3-4 sentences of dense, high-level insight.`
  };

  const basePrompt = levelGuides[level] || levelGuides['beginner'];
  return `${basePrompt}\n\nSport context: ${sportGuide}\n${langInstruction}`;
}

function buildUserPrompt(play: string, gameContext: string, sport: string, level: string): string {
  return `Sport: ${sport.toUpperCase()}
Game situation: ${gameContext}
Play data (ONLY what you know): "${play}"

CRITICAL RULES:
- You ONLY know what is written in "Play data" above. Nothing else.
- Do NOT invent pitch speeds, locations, percentages, or statistics.
- Do NOT reference any numbers unless they appear verbatim in the play data.
- If the play data is sparse (e.g. "Pitch 1 : Strike 1 Looking"), analyze ONLY the strategic implications — do not fill gaps with invented details.
${level === 'expert' ? '- Leave "ruleDetail" as an empty string. No exceptions.' : 'Only include "ruleDetail" if a fan at this level would genuinely benefit from it.'}

Respond with this exact JSON:
{
  "simple": "Strategic analysis only — no invented facts",
  "whyItMatters": "Game theory and situational significance",
  "ruleDetail": "${level === 'expert' ? '' : 'Rule explanation if genuinely useful, otherwise empty'}"
}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { sport = 'nfl', level = 'beginner', language = 'en', action, question, context, gameId } = body;

    // Handle Follow-up Q&A
    if (action === 'ask' && question) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Helpful sports expert. Level: ${level}. Language: ${language}.` },
          { role: 'user', content: `Context: ${context}\nQuestion: ${question}` }
        ],
        temperature: 0.7,
      });
      return NextResponse.json({ answer: completion.choices[0]?.message?.content?.trim() }, { headers: corsHeaders });
    }

    // Fetch ESPN Data
    let play = 'A key play just happened';
    let gameContext = 'Live game in progress';
    let homeTeam = '', awayTeam = '';

    const espnUrl = espnApis[sport];
if (espnUrl) {
  try {
    const espnRes = await fetch(espnUrl);
    const espnData = await espnRes.json();
    
    // If a specific gameId was passed, use that game — otherwise fall back to first live game
    const liveGame = gameId
      ? espnData?.events?.find((e: any) => e.id === gameId)
      : espnData?.events?.find((e: any) => e.status?.type?.state === 'in') || espnData?.events?.[0];

        if (liveGame) {
          const comp = liveGame.competitions?.[0];
          homeTeam = comp?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName || '';
          awayTeam = comp?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName || '';
          play = comp?.situation?.lastPlay?.text || comp?.lastPlay?.text || play;
          gameContext = `${awayTeam} vs ${homeTeam} — ${liveGame.status?.type?.shortDetail || ''}`;
          
          if (sport === 'mlb' && liveGame.id) {
            const mlbRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${liveGame.id}`);
            const mlbData = await mlbRes.json();
            const lastReal = mlbData?.plays?.reverse().find((p: any) => p.text && !p.text.toLowerCase().includes('inning'));
            if (lastReal) play = lastReal.text;
          }
        }
      } catch (e) { console.error('Data fetch error:', e); }
    }

    // AI Generation
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemPrompt(sport, level, language) },
        { role: 'user', content: buildUserPrompt(play, gameContext, sport, level) }
      ],
      temperature: level === 'expert' ? 0.2 : 0.6,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // --- EXPERT FILTER (The "Nuclear Option") ---
    if (level === 'expert') {
      const triggers = ['is a type of', 'is when', 'is called', 'refers to', 'is defined as', 'is a pitch', 'is a play'];
      const firstSentence = parsed.simple?.split('.')[0]?.toLowerCase() || '';
      if (triggers.some(t => firstSentence.includes(t))) {
        // If the first sentence is a definition, skip it and use the rest
        const sentences = parsed.simple.split('.');
        parsed.simple = sentences.slice(1).join('.').trim() || parsed.whyItMatters;
      }
      parsed.ruleDetail = ""; // Force empty for experts
    }

    return NextResponse.json({
      simple: parsed.simple || play,
      whyItMatters: parsed.whyItMatters || '',
      ruleDetail: parsed.ruleDetail || '',
      playType: play,
      homeTeam,
      awayTeam,
      gameContext
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500, headers: corsHeaders });
  }
}