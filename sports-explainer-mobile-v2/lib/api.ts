import { RecapResponse, normalizeRecap } from './recap';
import { VisionMode, VisionGameContext, VisionResponse, buildVisionBody, normalizeVision } from './vision';
import { CoachSituation, CoachFull, normalizeCoachFull } from './coach';
import { MatchEvent } from './matchTimeline';
export type { RecapResponse };
export type { VisionMode, VisionGameContext, VisionResponse };
export type { CoachSituation, CoachFull };
export type { MatchEvent };

export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer' | 'worldcup' | 'rugby' | 'wnba' | 'epl' | 'laliga' | 'mlr' | 'tennis' | 'golf' | 'cricket' | 'nationscup' | 'sixnations' | 'nationschamp';
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
  events?: MatchEvent[];   // soccer-only — Highlightly match events for the Match Timeline
}

export interface Play {
  id: string;
  text: string;
  period: string;   // human label, e.g. "Top 1st Inning" / "2nd Quarter 8:50"
  scoring: boolean; // true for scoring plays (home run, goal, etc.)
}

export const API_URL = 'https://sports-explainer-mode.vercel.app/api/explain';

// Live golf leaderboard lives at a SIBLING endpoint (/api/leaderboard) on the same host. API_URL
// hardcodes the full /api/explain path, so derive the sibling rather than reusing it verbatim.
const LEADERBOARD_URL = API_URL.replace('/api/explain', '/api/leaderboard');
const FEEDBACK_URL = API_URL.replace('/api/explain', '/api/feedback');
const TENNIS_LIVE_URL = API_URL.replace('/api/explain', '/api/tennis-live');

// Client-side mirror of the provider's exported shape (server types can't be imported across the
// app/backend boundary). Keep in sync with golfLeaderboardProvider.ts's Leaderboard/LeaderboardRow.
export interface LeaderboardRound {
  roundId: number;
  scoreToPar: string;   // "-6" (display string)
  strokes: number;
  courseName: string;
}
export interface LeaderboardRow {
  playerId: string;
  name: string;         // firstName + lastName joined
  position: string;     // "1" / "T3" — display string (keeps the tie "T" prefix)
  total: string;        // "-20" — to-par
  today: string;        // currentRoundScore "-4"
  thru: string;         // "17" while playing, "F" when the round's done
  roundComplete: boolean;
  isAmateur: boolean;
  status: string;       // "active" / "complete"
  teeTime?: string;
  rounds: LeaderboardRound[];
}
export interface Leaderboard {
  tournId: string;
  name?: string;
  status: string;
  currentRound?: number;
  roundStatus?: string;
  isLive: boolean;      // schedule-window derived: true = live, false = most-recent FINAL board
  endDate?: number;     // tournament end (epoch ms) — for the "Final · {date}" header label
  rows: LeaderboardRow[];
}

// GET the live golf leaderboard. Best-effort: on ANY failure (no live tournament, network, non-200,
// bad JSON) return null so the caller falls back to today's ESPN thin tournament line — never throws.
export async function fetchLeaderboard(): Promise<Leaderboard | null> {
  try {
    const response = await fetch(LEADERBOARD_URL, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.leaderboard ?? null;
  } catch {
    return null;
  }
}

// Client-side mirror of the backend espnTennisProvider.ts EspnTennisMatch shape (server types can't
// cross the app/backend boundary). The LIST (/api/tennis-live) is ESPN-rich (names/flags/round/court/
// seed/sets); a single match (/api/tennis-live?match=<espnId>) additionally carries a `live` overlay
// (server/currentGame/timeline) enriched from RapidAPI in ESPN's home/away orientation.
export interface TennisTimelineEntry {
  game: number;
  player: string;                         // the player who WON that game (result-owner)
  result: 'hold' | 'break';
  closeAt: string;
}
export interface TennisLiveOverlay {
  server: 'home' | 'away' | null;                       // in ESPN orientation
  currentGame: { home: string; away: string } | null;  // tennis points ('0'/'15'/'30'/'40'/'AD'), ESPN orientation
  timeline: TennisTimelineEntry[] | null;               // name-keyed (no orientation flip)
}
export interface TennisLiveMatch {
  espnId: string;
  tour: 'atp' | 'wta';
  category: string;                       // "Men's Singles" | "Women's Singles"
  home: string;
  away: string;
  homeFlag?: string; awayFlag?: string;   // full https PNG url (omitted if absent)
  homeFlagAlt?: string; awayFlagAlt?: string; // country name, e.g. "USA"
  homeSeed?: number; awaySeed?: number;   // present only for seeded players
  sets: { home: number; away: number }[]; // games per set, zipped home vs away (last = in-progress)
  round?: string;                         // "Round 1"
  court?: string;                         // "No. 2 Court"
  statusDetail?: string;                  // "3rd Set"
  isLive: boolean;
  sortRank?: number;                      // min seed of whichever exist (seeded-first sort)
  live?: TennisLiveOverlay | null;        // only on the ?match= response
}
export interface TennisLiveResponse {
  matches: TennisLiveMatch[];
}

// GET the live tennis SINGLES list (ESPN). Best-effort: on ANY failure (flag off returns {matches:[]}
// naturally, network, non-200, bad JSON) returns { matches: [] } so the caller falls through to
// today's learn-mode tennis view — never throws.
export async function fetchTennisLive(): Promise<TennisLiveResponse> {
  try {
    const response = await fetch(TENNIS_LIVE_URL, { method: 'GET' });
    if (!response.ok) return { matches: [] };
    const data = await response.json();
    return { matches: Array.isArray(data?.matches) ? data.matches : [] };
  } catch {
    return { matches: [] };
  }
}

// GET one match enriched with the RapidAPI live overlay (server/currentGame/timeline). Best-effort:
// null on any failure OR when the backend couldn't resolve the id (it returns { matches } instead of
// { match }), so the caller keeps the plain ESPN card.
export async function fetchTennisMatch(espnId: string): Promise<TennisLiveMatch | null> {
  try {
    const response = await fetch(`${TENNIS_LIVE_URL}?match=${encodeURIComponent(espnId)}`, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.match ? (data.match as TennisLiveMatch) : null;
  } catch {
    return null;
  }
}

// One-tap "I learned something" feedback ping. FIRE-AND-FORGET + best-effort: swallows ALL errors and
// returns void — a failed feedback write is invisible to the user (never throws, never surfaces).
export interface FeedbackPayload {
  sport: Sport;
  level: Level;
  language: Language;
  gameId?: string | null;
  playKey: string;
  playType: string;
  gameContext: string;
  helpful: boolean;
}
export async function fetchFeedback(payload: FeedbackPayload): Promise<void> {
  try {
    await fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // swallow — feedback is best-effort and never user-visible
  }
}

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
  // Tennis-only hints so the Gate-3 situational read can avoid gendered pronouns on women's matches,
  // key the right match by name, AND ground the read in ESPN's set scores when RapidAPI has no live
  // point data. All optional; omitted when absent.
  opts?: {
    tennisHome?: string; tennisAway?: string; tennisCategory?: string;
    tennisSets?: { home: number; away: number }[]; tennisStatusDetail?: string;
    // Cricket only: the tapped delivery's key. The backend reducer derives BOTH the play line
    // and the state snapshot for that exact ball — cricket rows send playKey INSTEAD of playText
    // (a client-built row label must never become the model-facing play string).
    playKey?: string;
  },
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
      tennisHome: opts?.tennisHome,         // omitted by JSON.stringify when undefined
      tennisAway: opts?.tennisAway,
      tennisCategory: opts?.tennisCategory, // "Men's Singles" | "Women's Singles" → pronoun guidance
      tennisSets: opts?.tennisSets,         // ESPN set scores → grounds the read when no RapidAPI data
      tennisStatusDetail: opts?.tennisStatusDetail, // e.g. "2nd Set"
      playKey: opts?.playKey,               // cricket only — omitted by JSON.stringify when undefined
    }),
  });

  if (!response.ok) throw new Error('Failed to fetch explanation');
  return response.json();
}

// Lazy-loaded play-by-play list for a game, most-recent-first. [] if unsupported.
// Cricket deliveries → Play[] rows for the SAME PastPlays list MLB uses. The row text is a UI
// label ONLY — on tap, PastPlays sends the delivery's key (playKey) and the BACKEND reducer
// produces the model-facing play + gameContext for that exact ball, so this label never reaches
// the model. Chronological order REVERSED (most recent first) to match the MLB list.
const CRICKET_DATA_URL = API_URL.replace('/api/explain', '/api/cricket');
async function fetchCricketPlays(gameId: string): Promise<Play[]> {
  try {
    const res = await fetch(`${CRICKET_DATA_URL}?matchId=${gameId}`);
    if (!res.ok) return [];
    const match = (await res.json())?.match;
    if (!match?.innings) return [];
    const plays: Play[] = [];
    for (const inn of match.innings) {
      for (const over of inn.overs ?? []) {
        for (const d of over.deliveries ?? []) {
          const w = d.wicket;
          const outcome = w
            ? `OUT — ${w.playerOut?.name ?? ''} (${String(w.kind ?? '').replace('_', ' ')})`
            : d.runsOffBat === 6 ? 'SIX'
            : d.runsOffBat === 4 ? 'FOUR'
            : d.extras?.wides ? `wide${d.extras.wides > 1 ? ` (${d.extras.wides})` : ''}`
            : d.extras?.noballs ? 'no ball'
            : d.extras?.byes ? `${d.extras.byes} bye${d.extras.byes > 1 ? 's' : ''}`
            : d.extras?.legbyes ? `${d.extras.legbyes} leg bye${d.extras.legbyes > 1 ? 's' : ''}`
            : d.runsTotal === 0 ? 'no run'
            : `${d.runsTotal} run${d.runsTotal > 1 ? 's' : ''}`;
          plays.push({
            id: d.key,
            text: `${d.label} · ${d.bowler?.name ?? '?'} to ${d.striker?.name ?? '?'} — ${outcome}`,
            period: `${inn.battingTeam} innings`,
            scoring: !!w || d.runsOffBat === 4 || d.runsOffBat === 6,
          });
        }
      }
    }
    return plays.reverse().slice(0, 300); // a full T20 is ~250 deliveries — keep the whole match tappable
  } catch {
    return [];
  }
}

export async function fetchPlays(sport: Sport, gameId: string): Promise<Play[]> {
  if (sport === 'cricket') return fetchCricketPlays(gameId);
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

// Coach's Corner (premium #3). Two calls:
//   • fetchCoachState — cheap, NO Groq; returns the normalized situation (the only call free users
//     make → client derives the hook + data-sufficiency gate). null = coming-soon for this sport.
//   • fetchCoachFull — the Groq strategic read; fired ONLY for Pro, ONLY on expand.
export async function fetchCoachState(sport: Sport, gameId: string): Promise<CoachSituation | null> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'coach', mode: 'state', sport, gameId }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return (data?.situation as CoachSituation) ?? null;
}

export async function fetchCoachFull(sport: Sport, gameId: string, level: Level, language: Language): Promise<CoachFull> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'coach', mode: 'full', sport, gameId, level, language }),
  });
  if (!response.ok) throw new Error('Failed to fetch coach insight');
  return normalizeCoachFull(await response.json());
}