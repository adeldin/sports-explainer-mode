// Read the Coverage — pre-snap shell data (from the read-the-coverage spike's rn/coverageData.ts,
// rebased onto the shared FootballField viewBox). The teaching point is the number of DEEP safeties:
// two-high = middle of field OPEN, one-high = middle CLOSED. Verdict copy (titles/bodies/expert
// notes + the rookie-simplified strings) is VERBATIM from the spike. Author a new shell = add an
// entry here; the module renders it without code changes.
//
// Coordinates share the FootballField viewBox (680×380, LOS at x=235) — converted from the spike's
// normalized 0..1 space via x×680 / y×380 (the spike's normalized LOS 0.345 lands exactly on 235).
// Pure data — zero RN imports.

export interface Pt { x: number; y: number }
export type SafetyPt = Pt & { id: string };
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';

export interface Coverage {
  key: string;
  name: string;
  mof: 'open' | 'closed';          // middle of field — the read the safeties give away
  safeties: SafetyPt[];            // the deep (high) safeties — the interactive tell
  corners: Pt[];
  front: Pt[];                     // defensive line — small dots, identified via the legend
  linebackers: Pt[];
  verdict: { title: string; body: string };
  expertNote: string;
}

// The middle-of-field shading drawn on reveal (teal when open / red when closed), between the
// underneath defenders and the deep safeties.
export const MOF_ZONE = { x: 286, y: 46, w: 136, h: 289 };

export const COVERAGES: Coverage[] = [
  {
    key: 'cover2',
    name: 'Cover 2',
    mof: 'open',
    safeties: [
      { id: 'S1', x: 408, y: 125 },
      { id: 'S2', x: 408, y: 255 },
    ],
    corners: [{ x: 265, y: 72 }, { x: 265, y: 308 }],
    front: [
      { x: 252, y: 137 }, { x: 252, y: 171 },
      { x: 252, y: 209 }, { x: 252, y: 243 },
    ],
    linebackers: [
      { x: 313, y: 148 }, { x: 313, y: 190 }, { x: 313, y: 232 },
    ],
    verdict: {
      title: 'Two-high → middle of field OPEN',
      body:
        'Two deep safeties split the field in half. The middle is soft. The offense ' +
        'likes throws over the middle (seams, digs) and the run — only six in the box.',
    },
    expertNote:
      'Classic 2-high look. Watch for a safety rotating down late (Cover 2 → Cover 3 disguise).',
  },
  {
    key: 'cover3',
    name: 'Cover 3',
    mof: 'closed',
    safeties: [{ id: 'S1', x: 422, y: 190 }],
    corners: [{ x: 272, y: 72 }, { x: 272, y: 308 }],
    front: [
      { x: 252, y: 137 }, { x: 252, y: 171 },
      { x: 252, y: 209 }, { x: 252, y: 243 },
    ],
    linebackers: [
      { x: 313, y: 160 }, { x: 313, y: 190 },
      { x: 313, y: 220 }, { x: 326, y: 270 },
    ],
    verdict: {
      title: 'One-high → middle of field CLOSED',
      body:
        'A single deep safety patrols the middle — it’s shut. The other safety dropped ' +
        'near the box (seven defenders), hinting run pressure. The offense looks outside ' +
        'and underneath.',
    },
    expertNote:
      'Single-high shell. The dropped safety = an extra run defender and a robber over the middle.',
  },
  {
    key: 'cover1',
    name: 'Cover 1 (man)',
    mof: 'closed',
    safeties: [{ id: 'S1', x: 428, y: 190 }],
    corners: [{ x: 258, y: 72 }, { x: 258, y: 308 }],
    front: [
      { x: 252, y: 137 }, { x: 252, y: 171 },
      { x: 252, y: 209 }, { x: 252, y: 243 },
    ],
    linebackers: [
      { x: 306, y: 163 }, { x: 306, y: 217 }, { x: 326, y: 270 },
    ],
    verdict: {
      title: 'One-high, press corners → man coverage',
      body:
        'One deep safety, corners pressed tight on receivers. Everyone’s locked in ' +
        'man-to-man with a free safety over the top. Beat your man and there’s grass — ' +
        'but the help is deep.',
    },
    expertNote:
      'Cover 1 = man-free. The free safety is the only deep help; a double-move can spring a receiver.',
  },
  {
    key: 'cover4',
    name: 'Cover 4 (quarters)',
    mof: 'open',
    safeties: [
      { id: 'S1', x: 408, y: 118 },
      { id: 'S2', x: 408, y: 262 },
    ],
    corners: [{ x: 272, y: 65 }, { x: 272, y: 315 }],
    front: [
      { x: 252, y: 141 }, { x: 252, y: 175 },
      { x: 252, y: 209 }, { x: 252, y: 239 },
    ],
    linebackers: [
      { x: 313, y: 163 }, { x: 313, y: 194 }, { x: 313, y: 228 },
    ],
    verdict: {
      title: 'Two-high, deep & wide → quarters',
      body:
        'Two safeties, but bailing deep into four equal zones. Heavy against deep passes; ' +
        'soft underneath. The offense takes the short stuff and the run all day.',
    },
    expertNote:
      'Quarters: four-deep, three-under. Great vs. verticals, vulnerable to the run and quick game.',
  },
];

// A simple static offense to line up across the LOS (same viewBox space).
export const OFFENSE = {
  ol: [
    { x: 218, y: 190 }, { x: 218, y: 160 }, { x: 218, y: 220 },
    { x: 218, y: 129 }, { x: 218, y: 251 },
  ] as Pt[],
  qb: { x: 190, y: 190 } as Pt,
  wr: [{ x: 218, y: 65 }, { x: 218, y: 315 }] as Pt[],
  rb: { x: 180, y: 217 } as Pt,
};

// ── level-dependent verdict copy (VERBATIM from the spike, incl. the rookie simplification and the
// expert ◆ note append). 'rookie' here maps from the app's 'kid' level. ──
export function verdictTitleFor(cov: Coverage, depth: Depth): string {
  if (depth === 'rookie') {
    const n = cov.safeties.length;
    return `${n} deep safet${n === 1 ? 'y' : 'ies'} → middle ${cov.mof === 'open' ? 'OPEN' : 'CLOSED'}`;
  }
  return cov.verdict.title;
}
export function verdictBodyFor(cov: Coverage, depth: Depth): string {
  if (depth === 'rookie') {
    return cov.mof === 'open'
      ? 'Two safeties split the deep field. The middle is soft — good for throws up the middle.'
      : 'One safety guards the deep middle. It’s covered — the offense looks to the outside.';
  }
  if (depth === 'expert') return `${cov.verdict.body}  ◆ ${cov.expertNote}`;
  return cov.verdict.body;
}
