// Glossary segmenter (Step B, Stage 2) — PURE, no UI.
// Splits an explanation string into plain-text and tappable-term runs by matching
// the curated glossary for a sport. Client-side only.
//
// Invariant: the segments' `value`s concatenated in order reproduce the input text
// EXACTLY (no characters dropped/added). The render layer relies on this.

import { Sport } from '../api';
import { getGlossary } from './index';

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'term'; value: string; term: string; def: string };

// Max distinct tappable terms per text block (too many underlines = clutter).
// Tunable to 2 later without touching logic.
export const MAX_TERMS = 3;

// Stoplist: trivial common words that are NEVER marked tappable. They stay in the
// match vocabulary (so longer terms like "ground ball" still win their spans) but are
// skipped at selection, so a block whose only matches are these renders clean — better
// to underline nothing than to underline "out". Matched against the PARENT term,
// lowercased; multi-word terms ("ground ball" / "first down") are NOT here.
const LOW_VALUE = new Set(['out', 'ball', 'hit', 'safe', 'run', 'single', 'double', 'tackle']);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function segmentText(text: string, sport: Sport): Segment[] {
  const entries = getGlossary(sport);
  if (!text || entries.length === 0) return [{ type: 'text', value: text }];

  // Surface form (lowercased) -> parent entry {term, def}. Every term AND alias is a
  // candidate surface form; the first entry to claim a surface keeps it.
  const surfaceToParent = new Map<string, { term: string; def: string }>();
  for (const e of entries) {
    const parent = { term: e.term, def: e.def };
    for (const form of [e.term, ...(e.aliases ?? [])]) {
      const key = form.toLowerCase();
      if (!surfaceToParent.has(key)) surfaceToParent.set(key, parent);
    }
  }

  // Longest-first so multi-word/longer forms win at a shared start position
  // (JS alternation is ordered: the first matching branch at a position wins).
  const surfaces = [...surfaceToParent.keys()].sort((a, b) => b.length - a.length);
  // \b on both ends = whole-word matching: "run" won't match in "running",
  // "down" won't match in "touchdown", "ball" won't match in "fastball".
  const pattern = new RegExp(`\\b(?:${surfaces.map(escapeRegExp).join('|')})\\b`, 'gi');

  // Collect accepted spans: first occurrence per parent term, capped at MAX_TERMS.
  // LOW_VALUE words are skipped entirely (never tappable) — so a block whose only
  // matches are trivial common words renders clean rather than underlining "out".
  const fired = new Set<string>();
  const spans: { start: number; end: number; term: string; def: string; value: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (spans.length >= MAX_TERMS) break;
    const value = m[0];
    const parent = surfaceToParent.get(value.toLowerCase());
    if (!parent) continue;                                  // shouldn't happen; stays plain text
    if (LOW_VALUE.has(parent.term.toLowerCase())) continue; // stoplist → never tappable
    if (fired.has(parent.term)) continue;                   // first-occurrence only → later ones plain
    fired.add(parent.term);
    spans.push({ start: m.index, end: m.index + value.length, term: parent.term, def: parent.def, value });
  }

  if (spans.length === 0) return [{ type: 'text', value: text }];

  // Walk the text, splitting at accepted spans; everything else stays plain text.
  // (Spans are already in left-to-right, non-overlapping order from the scan.)
  const segments: Segment[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) segments.push({ type: 'text', value: text.slice(cursor, s.start) });
    segments.push({ type: 'term', value: s.value, term: s.term, def: s.def });
    cursor = s.end;
  }
  if (cursor < text.length) segments.push({ type: 'text', value: text.slice(cursor) });
  return segments;
}
