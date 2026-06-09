const API_URL = 'https://sports-explainer-mode.vercel.app/api/explain';

export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl';
export type Level = 'beginner' | 'intermediate' | 'expert';

export interface ExplanationResponse {
  simple: string;
  whyItMatters: string;
  ruleDetail: string;
  playType?: string;
  homeTeam?: string;
  awayTeam?: string;
}

export async function fetchExplanation(
  sport: Sport,
  level: Level
): Promise<ExplanationResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sport, level }),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return response.json();
}
export async function askQuestion(
  question: string,
  sport: Sport,
  level: Level,
  context: string
): Promise<string> {
  const res = await fetch(`${API_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ask',question, sport, level, context }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.answer || 'No answer available';
}