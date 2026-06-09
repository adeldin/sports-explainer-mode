import { Explanation } from '../types/sports';

interface AIExplanationParams {
  play: string;
  sport: string;
  gameContext: string;
  level: 'kid' | 'beginner' | 'intermediate';
}

export async function generateAIExplanation(params: AIExplanationParams): Promise<Explanation> {
  const { play, sport, gameContext, level } = params;

try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ play, sport, gameContext, level }),
    });

    // Log exactly what the server is returning
    const responseText = await response.text();
    console.log('API status:', response.status);
    console.log('API response:', responseText);

    if (!response.ok) {
      throw new Error(`API failed with status ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return {
      simple: data.simple || play,
      whyItMatters: data.whyItMatters || '',
      ruleDetail: data.ruleDetail || '',
    };

  } catch (error) {
    console.error('Explanation fetch error:', error);
    return {
      simple: play,
      whyItMatters: '',
      ruleDetail: '',
    };
  }
}