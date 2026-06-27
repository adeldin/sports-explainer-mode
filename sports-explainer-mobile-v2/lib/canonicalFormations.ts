// Canonical (textbook) formations for the read-the-play quiz — NOT real-game rosters. Each formation
// maps to its 11 position abbreviations using the SAME vocabulary layoutFormation/POSITION_TABLE knows,
// so synthTeam() → layoutFormation() renders the correct, recognizable shape (and compaction still works).
// Abbreviations chosen so each band's lateral spread reads cleanly (central pairs use *-L/*-R, not RM/LM).

import { FormationKey } from './formationExplanations';

export const CANONICAL_FORMATIONS: Record<FormationKey, string[]> = {
  // GK · defenders · (def-mids) · mids · (att-mids) · forwards — 11 each
  '4-3-3':   ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'LM', 'CM', 'RM', 'LF', 'F', 'RF'],
  '4-2-3-1': ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'LDM', 'RDM', 'AM-L', 'AM', 'AM-R', 'F'],
  '4-4-2':   ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'LM', 'CM-L', 'CM-R', 'RM', 'LS', 'RS'],
  '4-1-4-1': ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'DM', 'LM', 'CM-L', 'CM-R', 'RM', 'F'],
  '4-5-1':   ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'LM', 'CM-L', 'CM', 'CM-R', 'RM', 'F'],
  '3-5-2':   ['G', 'CD-L', 'CB', 'CD-R', 'LM', 'CM-L', 'CM', 'CM-R', 'RM', 'LS', 'RS'],
  '3-4-3':   ['G', 'CD-L', 'CB', 'CD-R', 'LM', 'CM-L', 'CM-R', 'RM', 'LF', 'F', 'RF'],
  '5-3-2':   ['G', 'LWB', 'CD-L', 'CB', 'CD-R', 'RWB', 'LM', 'CM', 'RM', 'LS', 'RS'],
  '4-4-1-1': ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'LM', 'CM-L', 'CM-R', 'RM', 'AM', 'F'],
  '5-4-1':   ['G', 'LWB', 'CD-L', 'CB', 'CD-R', 'RWB', 'LM', 'CM-L', 'CM-R', 'RM', 'F'],
  '4-2-2-2': ['G', 'LB', 'CD-L', 'CD-R', 'RB', 'LDM', 'RDM', 'AM-L', 'AM-R', 'LS', 'RS'],
  '3-4-1-2': ['G', 'CD-L', 'CB', 'CD-R', 'LM', 'CM-L', 'CM-R', 'RM', 'AM', 'LS', 'RS'],
};

// A synthetic summary.rosters[] team entry for a canonical formation — feeds layoutFormation /
// FormationDiagram exactly like a real team would (11 starters, jersey 1..11, blank names). The
// diagram shows numbers, no player names (correct for a textbook shape).
export function synthTeam(formation: FormationKey) {
  const abbrs = CANONICAL_FORMATIONS[formation];
  return {
    formation,
    team: { displayName: '' },
    roster: abbrs.map((abbr, i) => ({
      starter: true,
      jersey: String(i + 1),
      position: { abbreviation: abbr },
      athlete: { shortName: '' },
    })),
  };
}
