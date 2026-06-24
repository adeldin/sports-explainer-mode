// Vision "analyze what's on screen" (premium #2) — PURE request-shaping + response normalization
// (no React / network), unit-testable in isolation (mirrors lib/caps, lib/recap). The model/
// provider swap is entirely backend (visionProvider.ts); the client shape never changes.

export type VisionMode = 'explain' | 'ask';

// Compact game context passed when a game is selected — enriches the analysis without becoming
// license to invent (the backend prompt enforces that).
export interface VisionGameContext {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  state: string;
  status: string;
}

export interface VisionResponse { text: string }

// Build the POST body. In 'explain' mode the question is dropped (the model auto-explains);
// in 'ask' mode it's trimmed through. gameContext is included only when present.
export function buildVisionBody(
  imageBase64: string,
  mode: VisionMode,
  question: string,
  level: string,
  language: string,
  gameContext?: VisionGameContext,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    action: 'vision',
    imageBase64,
    mode,
    question: mode === 'ask' ? (question || '').trim() : '',
    level,
    language,
  };
  if (gameContext && (gameContext.homeTeam || gameContext.awayTeam)) body.gameContext = gameContext;
  return body;
}

export function normalizeVision(raw: any): VisionResponse {
  return { text: typeof raw?.text === 'string' ? raw.text.trim() : '' };
}

export function hasVisionContent(r: VisionResponse): boolean {
  return r.text.length > 0;
}
