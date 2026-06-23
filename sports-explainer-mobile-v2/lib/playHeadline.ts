// Derive the Play Card's one-line headline from play text the app ALREADY has — no
// backend call, no added latency (Step D, locked decision). Pure + testable.
//
// Order: prefer the real ESPN play description; else the first sentence of the lesson
// ("THE PLAY" body); else the caller's localized fallback. Never empty/undefined.
// Visual truncation is the UI's job (numberOfLines) — this returns the chosen text.

// Lowercased placeholders that are NOT real play descriptions (the backend's default
// play/context strings + the "Latest Play" label) — these fall through to the lesson.
const GENERIC_PLAY = new Set([
  'a key play just happened',
  'live game in progress',
  'latest play',
]);

function firstSentence(s: string): string {
  // First terminator followed by whitespace/end — tolerant of decimals/abbreviations
  // (no split on "0.2" mid-number). Falls back to the whole string if none.
  const m = s.match(/^.*?[.!?]+(?=\s|$)/);
  return (m ? m[0] : s).trim();
}

export function derivePlayHeadline(
  playText: string | undefined,   // result.rawPlay ?? result.playType (ESPN description)
  simple: string | undefined,     // result.simple (the lesson body of THE PLAY)
  fallback: string,               // localized "A key play just happened"-style string
): string {
  const pt = (playText ?? '').trim();
  if (pt && !GENERIC_PLAY.has(pt.toLowerCase())) return pt;
  const sm = (simple ?? '').trim();
  if (sm) return firstSentence(sm);
  return fallback;
}
