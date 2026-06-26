// Curated glossary — public entry point for the tappable-definition layer (Step B).
// Client-side only. The segmenter (Stage 2) calls getGlossary(sport) to get the
// vocabulary to match against the explanation text.

import { Sport } from '../api';
import { GlossaryEntry } from './types';
import { BASEBALL_GLOSSARY } from './baseball';
import { FOOTBALL_GLOSSARY } from './football';
import { RUGBY_GLOSSARY } from './rugby';
import { NBA_GLOSSARY } from './basketball';
import { NHL_GLOSSARY } from './hockey';
import { SOCCER_GLOSSARY } from './soccer';
import { TENNIS_GLOSSARY } from './tennis';
import { GOLF_GLOSSARY } from './golf';
import { CRICKET_GLOSSARY } from './cricket';

export type { GlossaryEntry, GlossarySport } from './types';

// Which app Sport maps to which term list. Sports not listed here have no glossary
// (getGlossary returns []), so the explanation renders with no tappable terms.
// Shared lists: both rugby league keys ('rugby' = URC, 'mlr' = MLR) share RUGBY; the
// WNBA category reuses the NBA list; and all soccer league keys share SOCCER.
const BY_SPORT: Partial<Record<Sport, GlossaryEntry[]>> = {
  mlb: BASEBALL_GLOSSARY,
  nfl: FOOTBALL_GLOSSARY,
  rugby: RUGBY_GLOSSARY,
  mlr: RUGBY_GLOSSARY,
  nba: NBA_GLOSSARY,
  wnba: NBA_GLOSSARY,
  nhl: NHL_GLOSSARY,
  soccer: SOCCER_GLOSSARY,
  epl: SOCCER_GLOSSARY,
  laliga: SOCCER_GLOSSARY,
  worldcup: SOCCER_GLOSSARY,
  tennis: TENNIS_GLOSSARY,
  golf: GOLF_GLOSSARY,
  cricket: CRICKET_GLOSSARY,
};

// Entries for a sport, or [] when that sport has no curated glossary yet.
export function getGlossary(sport: Sport): GlossaryEntry[] {
  return BY_SPORT[sport] ?? [];
}

// All entries flattened (handy for counts / future cross-sport tooling).
export const GLOSSARY: GlossaryEntry[] = [
  ...BASEBALL_GLOSSARY, ...FOOTBALL_GLOSSARY, ...RUGBY_GLOSSARY,
  ...NBA_GLOSSARY, ...NHL_GLOSSARY, ...SOCCER_GLOSSARY,
  ...TENNIS_GLOSSARY, ...GOLF_GLOSSARY, ...CRICKET_GLOSSARY,
];
