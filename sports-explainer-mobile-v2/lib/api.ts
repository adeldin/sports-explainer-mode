export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer' | 'worldcup' | 'rugby';
export type Level = 'kid' | 'beginner' | 'intermediate' | 'expert';
export type Language = 'en' | 'es' | 'fr' | 'pt' | 'de' | 'ja' | 'zh' | 'ko' | 'it' | 'ar';

export interface ExplanationResponse {
   simple: string;
  whyItMatters: string;
  ruleDetail: string;
  showRule: boolean;        // Added
  complexity: 'low' | 'medium' | 'high'; // Added
  playType: string;
  homeTeam: string;
  awayTeam: string;
  gameContext: string;
  rawPlay?: string;
}

const API_URL = 'https://sports-explainer-mode.vercel.app/api/explain';

export async function fetchExplanation(sport: Sport, level: Level, gameId?: string, language: Language = 'en'): Promise<ExplanationResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport,
      level,
      gameId, // Pass the ID to the backend
      language
    }),
  });

  if (!response.ok) throw new Error('Failed to fetch explanation');
  return response.json();
}

export async function askQuestion(
  question: string,
  sport: Sport,
  level: Level,
  context: string,
  language: Language = 'en'
): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ask',
      question,
      sport,
      level,
      context,
      language,
    }),
  });

  if (!response.ok) throw new Error('Failed to ask question');
  const data = await response.json();
  return data.answer;
}