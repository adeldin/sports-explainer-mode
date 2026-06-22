// Curated glossary — public entry point for the tappable-definition layer (Step B).
// Client-side only. The segmenter (Stage 2) calls getGlossary(sport) to get the
// vocabulary to match against the explanation text.

import { Sport } from '../api';
import { GlossaryEntry } from './types';
import { BASEBALL_GLOSSARY } from './baseball';
import { FOOTBALL_GLOSSARY } from './football';

export type { GlossaryEntry, GlossarySport } from './types';

// Which app Sport maps to which term list. Sports not listed here have no glossary
// (getGlossary returns []), so the explanation renders with no tappable terms.
const BY_SPORT: Partial<Record<Sport, GlossaryEntry[]>> = {
  mlb: BASEBALL_GLOSSARY,
  nfl: FOOTBALL_GLOSSARY,
};

// Entries for a sport, or [] when that sport has no curated glossary yet.
export function getGlossary(sport: Sport): GlossaryEntry[] {
  return BY_SPORT[sport] ?? [];
}

// All entries flattened (handy for counts / future cross-sport tooling).
export const GLOSSARY: GlossaryEntry[] = [...BASEBALL_GLOSSARY, ...FOOTBALL_GLOSSARY];
