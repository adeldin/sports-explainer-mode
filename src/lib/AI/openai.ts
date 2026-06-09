import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface ExplanationRequest {
  play: string;
  sport: string;
  gameContext: string;
  level: 'kid' | 'beginner' | 'intermediate';
}

interface Explanation {
  simple: string;
  whyItMatters: string;
  ruleDetail: string;
}

export async function generateAIExplanation(request: ExplanationRequest): Promise<Explanation> {
  const { play, sport, gameContext, level } = request;
  
  const systemPrompt = getSystemPrompt(level, sport);
  const userPrompt = `Game Context: ${gameContext}\n\nPlay: ${play}\n\nProvide a ${level}-level explanation.`;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });
    
    const content = response.choices[0]?.message?.content || '';
    
    // Parse the AI response into structured format
    return parseAIResponse(content, level);
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback explanation
    return {
      simple: play,
      whyItMatters: 'This play affects the game.',
      ruleDetail: 'Watch what happens next!'
    };
  }
}

function getSystemPrompt(level: string, sport: string): string {
  const prompts = {
    kid: `You are explaining ${sport} to a 6-year-old child. Use very simple words, short sentences, and fun comparisons. Focus on what happened in the most basic terms.`,
    
    beginner: `You are explaining ${sport} to someone who has never watched the sport before. Use clear language, explain basic rules as needed, and help them understand why this play matters.`,
    
    intermediate: `You are explaining ${sport} to someone who understands the basics but wants deeper insight. Include strategy, player decisions, and how this play affects the game situation.`
  };
  
  return prompts[level as keyof typeof prompts] || prompts.beginner;
}

function parseAIResponse(content: string, level: string): Explanation {
  // Try to parse structured response if AI provides it
  // Otherwise, use the full content as the simple explanation
  
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length >= 3) {
    return {
      simple: lines[0].replace(/^(Simple:|What happened:)/i, '').trim(),
      whyItMatters: lines[1].replace(/^(Why it matters:|Impact:)/i, '').trim(),
      ruleDetail: lines[2].replace(/^(Rule:|Detail:)/i, '').trim()
    };
  }
  
  // Fallback: use full content as simple explanation
  return {
    simple: content.trim(),
    whyItMatters: 'This play impacts the game situation.',
    ruleDetail: level === 'kid' ? 'Keep watching!' : 'Understanding this helps you follow the game better.'
  };
}