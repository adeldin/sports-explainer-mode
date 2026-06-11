import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
};

const espnApis: Record<string, string> = {
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
};

function buildSystemPrompt(sport: string, level: string): string {
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

  return `${levelGuides[level] || levelGuides['beginner']}\n\nSport context: ${sportGuide}`;
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sport = 'nfl', level = 'beginner', action, question, context, gameId } = body;

    // Handle Follow-up Q&A
    if (action === 'ask' && question) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Helpful sports expert. Level: ${level}. Answer clearly and concisely in 2-3 sentences.` },
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
        const espnRes = await fetch(espnUrl, { cache: 'no-store' });
        const espnData = await espnRes.json();
        const liveGame = gameId 
          ? espnData?.events?.find((e: any) => e.id === gameId)
          : espnData?.events?.find((e: any) => e.status?.type?.state === 'in') || espnData?.events?.[0];

        if (liveGame) {
          const comp = liveGame.competitions?.[0];
          homeTeam = comp?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName || '';
          awayTeam = comp?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName || '';
          play = comp?.situation?.lastPlay?.text || comp?.lastPlay?.text || play;
          gameContext = `${awayTeam} vs ${homeTeam} — ${liveGame.status?.type?.shortDetail || ''}`;
          
          // MLB Deep Dive for play-by-play
          if (sport === 'mlb' && liveGame.id) {
            const mlbRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${liveGame.id}`, { cache: 'no-store' });
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
        { role: 'system', content: buildSystemPrompt(sport, level) },
        { role: 'user', content: buildUserPrompt(play, gameContext, sport, level) }
      ],
      temperature: level === 'expert' ? 0.2 : 0.6,
      response_format: { type: 'json_object' },
    });

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