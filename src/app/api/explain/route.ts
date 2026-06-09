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

// Sport-specific terminology guides
const sportContext: Record<string, string> = {
  nfl: 'American football. Key concepts: downs, yards, line of scrimmage, end zone, touchdown, field goal, quarterback, snap, pocket, blitz, coverage.',
  nba: 'Basketball. Key concepts: possession, shot clock, paint, three-point line, pick and roll, fast break, turnover, foul, free throw.',
  mlb: 'Baseball. Key concepts: innings, outs, strikes, balls, bases, pitcher, batter, fielding positions (1B=first base, SS=shortstop, etc.), force out, double play.',
  nhl: 'Ice hockey. Key concepts: periods, power play, penalty kill, icing, offsides, crease, faceoff, hat trick, plus/minus.',
  worldcup: 'Soccer/football. Key concepts: possession, pressing, offside trap, set pieces, corners, free kicks, penalty area, clean sheet, aggregate score.',
};

// ESPN API endpoints
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
    kid: `You are an enthusiastic sports commentator explaining ${sport} to a curious 8-year-old who has never watched the sport before.

Your rules:
- Use ZERO jargon. If you must use a sport term, immediately explain it in parentheses.
- Use vivid real-world analogies (e.g. "think of it like tag, but with a ball").
- Be genuinely excited — this is the coolest thing they've ever seen!
- Maximum 2 short sentences for the main explanation.
- End with one fun "wow" fact or comparison that makes it memorable.
- Never be condescending. Kids are smart — just unfamiliar.

Sport context: ${sportGuide}
${langInstruction}`,

    beginner: `You are a knowledgeable friend explaining ${sport} to someone watching their first few games. They're genuinely curious and want to understand, not just be told what happened.

Your rules:
- Explain WHAT happened, WHY it matters, and WHAT comes next.
- Use one real-world analogy if it genuinely helps (don't force it).
- Define any sport terms you use, but don't over-explain obvious things.
- Keep the main explanation to 2-3 sentences. Be conversational, not textbook.
- Focus on the human drama and strategy, not just the mechanics.
- Make them feel smarter after reading this, not overwhelmed.

Sport context: ${sportGuide}
${langInstruction}`,

    intermediate: `You are a sharp analyst explaining ${sport} to someone who watches regularly and understands the basics. They want the strategic layer — the "why behind the why."

Your rules:
- Skip basic definitions. They know what a first down is.
- Focus on: strategic intent, what the coach/player was thinking, what the defense did wrong or right, and what this means for the game's momentum.
- Use proper sport terminology freely.
- Highlight what a casual fan would miss but an experienced fan would notice.
- 3-4 sentences. Dense with insight, not padding.
- If there's a historical parallel or pattern worth noting, mention it briefly.

Sport context: ${sportGuide}
${langInstruction}`,

    expert: `You are a former NFL/NBA/MLB/NHL analyst on a live broadcast. You are speaking to a co-analyst, not a fan.

ABSOLUTE RULES:
1. NEVER start with the play name or definition. Your first word cannot be the play type.
2. Start DIRECTLY with what the defense/offense did wrong or right.
3. Use numbers, percentages, and specifics when possible.
4. 3-4 sentences maximum.
5. If you catch yourself writing "is when" or "is a type of" — delete the entire sentence and start over.

Sport context: ${sportGuide}
${langInstruction}`,
  };

  return levelGuides[level] || levelGuides['beginner'];
}

function buildUserPrompt(play: string, gameContext: string, sport: string): string {
  return `Sport: ${sport.toUpperCase()}
Game situation: ${gameContext || 'Live game in progress'}
Play that just happened: "${play}"

Respond with a JSON object in this exact format:
{
  "simple": "Your main explanation here",
  "whyItMatters": "Why this play matters for the game/momentum/strategy",
  "ruleDetail": "The specific rule or mechanic that governs this play (optional — only include if genuinely useful)"
}

Make "whyItMatters" punchy and specific to THIS play, not generic.
Only include "ruleDetail" if there's a rule that a fan at this level would genuinely benefit from knowing.`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const {
      sport = 'nfl',
      level = 'beginner',
      language = 'en',
      action,
      question,
      context,
    } = body;

    // Handle follow-up Q&A
    if (action === 'ask' && question) {
      const systemPrompt = `You are a helpful sports expert. A fan just read an explanation of a play and has a follow-up question.
Answer clearly and concisely in 2-3 sentences. Match the expertise level: ${level}.
${language !== 'en' ? `Respond in language code: "${language}".` : 'Respond in English.'}`;

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const answer = completion.choices[0]?.message?.content?.trim() || 'No answer available.';
      return NextResponse.json({ answer }, { headers: corsHeaders });
    }

    // Fetch live play data from ESPN
    let play = 'A key play just happened';
    let gameContext = 'Live game in progress';
    let homeTeam = '';
    let awayTeam = '';

    const espnUrl = espnApis[sport];
    if (espnUrl) {
      try {
        const espnRes = await fetch(espnUrl);
        const espnData = await espnRes.json();
        const events = espnData?.events || [];
        const liveGame = events.find((e: any) =>
          e.status?.type?.state === 'in'
        ) || events[0];

        if (liveGame) {
          const comp = liveGame.competitions?.[0];
          homeTeam = comp?.competitors?.find((c: any) => c.homeAway === 'home')?.team?.displayName || '';
          awayTeam = comp?.competitors?.find((c: any) => c.homeAway === 'away')?.team?.displayName || '';
          const situation = comp?.situation;
          const lastPlay = situation?.lastPlay?.text || comp?.lastPlay?.text;
          const status = liveGame.status?.type?.shortDetail || '';

          if (lastPlay) play = lastPlay;
          if (homeTeam && awayTeam) {
            gameContext = `${awayTeam} vs ${homeTeam}${status ? ` — ${status}` : ''}`;
            if (situation) {
              const details = [];
              if (situation.down && situation.distance) details.push(`${situation.down}th & ${situation.distance}`);
              if (situation.homeScore !== undefined) details.push(`Score: ${awayTeam} ${situation.awayScore} - ${homeTeam} ${situation.homeScore}`);
              if (details.length) gameContext += ` | ${details.join(' | ')}`;
            }
          }

          // MLB: dig into play-by-play for real plays
          if (sport === 'mlb' && liveGame?.id) {
            try {
              const summaryRes = await fetch(
                `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${liveGame.id}`
              );
              const summaryData = await summaryRes.json();
              const plays = summaryData?.plays || [];
              const lastRealPlay = [...plays].reverse().find(
                (p: any) =>
                  p?.text &&
                  !p.text.toLowerCase().includes('end of') &&
                  !p.text.toLowerCase().includes('middle of') &&
                  !p.text.toLowerCase().includes('inning')
              );
              if (lastRealPlay?.text) play = lastRealPlay.text;
            } catch (e) {
              console.error('MLB summary fetch error:', e);
            }
          }
        }
      } catch (espnError) {
        console.error('ESPN fetch error:', espnError);
      }
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(sport, level, language);
    const userPrompt = buildUserPrompt(play, gameContext, sport);

    const completion = await groq.chat.completions.create({
      model: level === 'expert' ? 'llama3-70b-8192' : 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: level === 'expert' ? 0.3 : 0.65,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    // --- EXPERT FILTER (The "Nuclear Option") ---
    if (level === 'expert') {
      const definitionTriggers = [
        'is a type of', 'is when', 'is called', 'refers to',
        'is defined as', 'is a pitch', 'is a play', 'is a foul'
        
      ];
      
      const firstSentence = parsed.simple?.split('.')[0]?.toLowerCase() || '';
      const isDefinition = definitionTriggers.some(t => firstSentence.includes(t));
      parsed.filter_triggered = isDefinition;
  parsed.first_sentence_checked = firstSentence; // So we can see what it evaluated
      if (isDefinition) {
        const sentences = parsed.simple.split('.');
        parsed.simple = sentences.slice(1).join('.').trim();
        
        if (!parsed.simple) {
          parsed.simple = parsed.whyItMatters;
          parsed.whyItMatters = parsed.ruleDetail || '';
        }
      }
    }

    return NextResponse.json(
      {
        simple: parsed.simple || play,
        whyItMatters: parsed.whyItMatters || '',
        ruleDetail: parsed.ruleDetail || '',
        playType: play,
        homeTeam,
        awayTeam,
        gameContext,
           filter_triggered: parsed.filter_triggered || false, 
    first_sentence_checked: parsed.first_sentence_checked || '', 
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Explain API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500, headers: corsHeaders }
    );
  }
}