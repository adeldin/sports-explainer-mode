// Match Timeline (soccer) — PURE shaping for the Highlightly `events` the explain response now
// carries (no React / network). Unit-testable in isolation (mirrors lib/caps, lib/coach). The
// component just renders; sorting + icon + goal-emphasis live here.

// Mirrors the backend MatchEvent (all fields optional — the app must tolerate partial events).
export interface MatchEvent {
  minute?: number;
  type?: string;   // "Goal" | "Yellow Card" | "Red Card" | "Substitution" | "Missed Penalty" | …
  team?: string;
  player?: string;
  detail?: string; // "assist X" (goals) / "for X" (subs)
}

// Chronological by minute; events with no minute sort to the END (stable for equal minutes).
export function sortEvents(events: MatchEvent[]): MatchEvent[] {
  return [...(events || [])].sort((a, b) => {
    const am = typeof a.minute === 'number' ? a.minute : Infinity;
    const bm = typeof b.minute === 'number' ? b.minute : Infinity;
    return am - bm;
  });
}

// Type → glanceable icon. Case-insensitive; unknown types get a neutral dot (never blank).
export function eventIcon(type: string | undefined): string {
  switch ((type || '').toLowerCase()) {
    case 'goal': return '⚽';
    case 'yellow card': return '🟨';
    case 'red card': return '🟥';
    case 'substitution': return '🔁';
    case 'missed penalty': return '❌';
    default: return '•';
  }
}

// Goals are the marquee moments → emphasized in the UI.
export function isGoal(type: string | undefined): boolean {
  return (type || '').toLowerCase() === 'goal';
}

export function hasEvents(events: MatchEvent[] | undefined): boolean {
  return Array.isArray(events) && events.length > 0;
}
