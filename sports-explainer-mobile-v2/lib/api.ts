import { RecapResponse, normalizeRecap } from './recap';
import { VisionMode, VisionGameContext, VisionResponse, buildVisionBody, normalizeVision } from './vision';
export type { RecapResponse };
export type { VisionMode, VisionGameContext, VisionResponse };

export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer' | 'worldcup' | 'rugby' | 'wnba' | 'epl' | 'laliga' | 'mlr' | 'tennis' | 'golf' | 'cricket';
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

export interface Play {
  id: string;
  text: string;
  period: string;   // human label, e.g. "Top 1st Inning" / "2nd Quarter 8:50"
  scoring: boolean; // true for scoring plays (home run, goal, etc.)
}

const API_URL = 'https://sports-explainer-mode.vercel.app/api/explain';

// Sports whose ESPN summary endpoint exposes a play-by-play `plays[]` array.
const SUMMARY_PATHS: Partial<Record<Sport, string>> = {
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
  nba: 'basketball/nba',
  wnba: 'basketball/wnba',
};

export async function fetchExplanation(
  sport: Sport,
  level: Level,
  gameId?: string,
  language: Language = 'en',
  playText?: string, // explain THIS specific play instead of the latest
): Promise<ExplanationResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport,
      level,
      gameId, // Pass the ID to the backend
      language,
      playText, // omitted by JSON.stringify when undefined
    }),
  });

  if (!response.ok) throw new Error('Failed to fetch explanation');
  return response.json();
}

// Lazy-loaded play-by-play list for a game, most-recent-first. [] if unsupported.
export async function fetchPlays(sport: Sport, gameId: string): Promise<Play[]> {
  const path = SUMMARY_PATHS[sport];
  if (!path) return [];
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${gameId}`);
  if (!res.ok) return [];
  const data = await res.json();
  const raw: any[] = Array.isArray(data?.plays) ? data.plays : [];

  const plays: Play[] = [];
  for (const p of raw) {
    const text: string = p?.text || '';
    // Skip period markers ("Top of the 1st inning", "Start of 1st Period", "Game End").
    if (!text || /inning|^start of|^end of|game end/i.test(text)) continue;
    const per = p.period || {};
    const clock = p.clock?.displayValue;
    const period = [
      sport === 'mlb' && per.type ? per.type : null,
      per.displayValue || (per.number ? `Period ${per.number}` : null),
      sport !== 'mlb' && clock ? clock : null,
    ].filter(Boolean).join(' ');
    plays.push({ id: String(p.id ?? plays.length), text, period, scoring: !!p.scoringPlay });
  }
  // Most recent first, capped — the UI shows 30 with a "Load more" up to this cap.
  return plays.reverse().slice(0, 50);
}

// Batch-translate the (English) play list into `language`. Returns the input
// unchanged for English or on any failure, so callers always get a usable list.
export async function translatePlays(texts: string[], language: Language): Promise<string[]> {
  if (language === 'en' || texts.length === 0) return texts;
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'translate', texts, language }),
    });
    if (!response.ok) return texts;
    const data = await response.json();
    const out = data?.translations;
    return Array.isArray(out) && out.length === texts.length ? out : texts;
  } catch {
    return texts;
  }
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

// Post-Game Recap (premium #1) — for a FINAL game. `isPro` is passed so the backend sends
// only score + story to free users (cheaper + no content leak); Pro gets all narrative fields.
// Returns a normalized RecapResponse (empty strings for unsupported / withheld sections).
export async function fetchRecap(
  sport: Sport,
  gameId: string,
  level: Level,
  language: Language,
  isPro: boolean,
): Promise<RecapResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recap', sport, gameId, level, language, isPro }),
  });
  if (!response.ok) throw new Error('Failed to fetch recap');
  return normalizeRecap(await response.json());
}

// Vision (premium #2) — analyze a captured/picked image. Pro-gated client-side, so this only
// ever fires for Pro/trial users. mode 'explain' (auto) or 'ask' (with a question about the image).
export async function fetchVision(
  imageBase64: string,
  mode: VisionMode,
  question: string,
  level: Level,
  language: Language,
  gameContext?: VisionGameContext,
): Promise<VisionResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildVisionBody(imageBase64, mode, question, level, language, gameContext)),
  });
  if (!response.ok) throw new Error('Failed to analyze image');
  return normalizeVision(await response.json());
}