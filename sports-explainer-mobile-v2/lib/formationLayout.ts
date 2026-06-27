// Formation layout engine — PURE TS, no rendering. Standalone (pairs with formationExplanations.ts).
// Turns an ESPN summary.rosters[] team entry into placed players on a normalized pitch, ready for an
// SVG layer to draw. ESPN gives NO x/y coords and formationPlace is not plottable (defenders
// interleave 2,3,5,6), so the layout is DERIVED from position.abbreviation.
//
// Coordinate space (normalized 0..1):
//   y = DEPTH   — 0 = own goalkeeper end, 1 = attacking end (so sorting by y reads back-to-front).
//   x = LATERAL — 0 = left touchline, 1 = right touchline, 0.5 = center.
//
// Pipeline: filter starters → table lookup (table miss → band-inferring fallback + warn) →
// collision-spread overlapping players → return. Never drops a player, never throws.

export interface PlacedPlayer {
  abbr: string;       // raw position.abbreviation (as the feed gave it)
  jersey: string;
  shortName: string;
  x: number;          // 0..1 lateral
  y: number;          // 0..1 depth
}

type XY = { x: number; y: number };

// ---- Position table: abbreviation → {x, y}. Covers the FULL soccer vocabulary, BOTH the suffix
// style (CD-R) AND the prefix style (RCB) — feeds differ. Lookup is hyphen/space-insensitive (see
// STRIPPED below), so "CD-R", "CDR" and "CD R" all resolve to the same cell.
const POSITION_TABLE: Record<string, XY> = {
  // --- Goalkeeper (y 0.05) ---
  G: { x: 0.5, y: 0.05 }, GK: { x: 0.5, y: 0.05 },

  // --- Defenders (y 0.22; wing-backs widest) ---
  CB: { x: 0.5, y: 0.22 }, CD: { x: 0.5, y: 0.22 }, D: { x: 0.5, y: 0.22 },
  SW: { x: 0.5, y: 0.16 },                                  // sweeper, a touch deeper
  RB: { x: 0.82, y: 0.22 }, LB: { x: 0.18, y: 0.22 },
  RWB: { x: 0.88, y: 0.22 }, LWB: { x: 0.12, y: 0.22 },     // wing-backs wider than fullbacks
  WBR: { x: 0.88, y: 0.22 }, WBL: { x: 0.12, y: 0.22 },
  RCB: { x: 0.62, y: 0.22 }, 'CD-R': { x: 0.62, y: 0.22 }, 'CB-R': { x: 0.62, y: 0.22 },
  LCB: { x: 0.38, y: 0.22 }, 'CD-L': { x: 0.38, y: 0.22 }, 'CB-L': { x: 0.38, y: 0.22 },

  // --- Midfield (y 0.45; defensive mids slightly deeper at 0.40) ---
  CM: { x: 0.5, y: 0.45 }, M: { x: 0.5, y: 0.45 }, MC: { x: 0.5, y: 0.45 },
  CDM: { x: 0.5, y: 0.40 }, DM: { x: 0.5, y: 0.40 }, DMC: { x: 0.5, y: 0.40 },
  RM: { x: 0.80, y: 0.45 }, LM: { x: 0.20, y: 0.45 }, MR: { x: 0.80, y: 0.45 }, ML: { x: 0.20, y: 0.45 },
  RCM: { x: 0.60, y: 0.45 }, 'CM-R': { x: 0.60, y: 0.45 },
  LCM: { x: 0.40, y: 0.45 }, 'CM-L': { x: 0.40, y: 0.45 },
  RDM: { x: 0.60, y: 0.40 }, 'DM-R': { x: 0.60, y: 0.40 },
  LDM: { x: 0.40, y: 0.40 }, 'DM-L': { x: 0.40, y: 0.40 },

  // --- Attacking midfield (y 0.66) ---
  AM: { x: 0.5, y: 0.66 }, CAM: { x: 0.5, y: 0.66 }, AMC: { x: 0.5, y: 0.66 },
  RAM: { x: 0.72, y: 0.66 }, 'AM-R': { x: 0.72, y: 0.66 },
  LAM: { x: 0.28, y: 0.66 }, 'AM-L': { x: 0.28, y: 0.66 },

  // --- Forwards / wings (y 0.85) ---
  F: { x: 0.5, y: 0.85 }, CF: { x: 0.5, y: 0.85 }, ST: { x: 0.5, y: 0.85 }, S: { x: 0.5, y: 0.85 },
  RF: { x: 0.78, y: 0.85 }, RW: { x: 0.78, y: 0.85 }, 'F-R': { x: 0.78, y: 0.85 },
  LF: { x: 0.22, y: 0.85 }, LW: { x: 0.22, y: 0.85 }, 'F-L': { x: 0.22, y: 0.85 },
  RS: { x: 0.60, y: 0.85 }, LS: { x: 0.40, y: 0.85 },      // paired strikers, split around center
  SS: { x: 0.5, y: 0.76 },                                  // second striker, drops in
};

// Hyphen/space-insensitive index so "CD-R", "CDR", "CD R" all hit the same entry.
const stripKey = (s: string) => s.toUpperCase().replace(/[-\s]/g, '');
const STRIPPED: Record<string, XY> = {};
for (const [k, v] of Object.entries(POSITION_TABLE)) STRIPPED[stripKey(k)] = v;

// Fallback band when an abbreviation isn't in the table: infer the row from its role letters, place
// at center x, and WARN (never drop, never crash). Collision-spread then separates any centered ties.
function inferBandY(abbr: string): number {
  const a = abbr.toUpperCase();
  if (a.startsWith('G')) return 0.05;                                   // keeper
  if (a.includes('AM')) return 0.66;                                    // attacking mid (before generic M)
  if (a.includes('WB') || a.startsWith('CD') || a.startsWith('CB') ||
      a === 'SW' || a === 'D' || /B$/.test(a)) return 0.22;            // defenders / backs
  if (a.includes('F') || a.includes('W') || a === 'ST' || /S$/.test(a)) return 0.85; // forwards / wings
  if (a.includes('M') || a.includes('DM')) return 0.45;                // midfield
  return 0.45;                                                         // unknown → mid
}

function positionToXY(abbrRaw: string): XY {
  const hit = STRIPPED[stripKey(abbrRaw)];
  if (hit) return { x: hit.x, y: hit.y };
  const y = inferBandY(abbrRaw);
  console.warn(`[formationLayout] unmapped position code "${abbrRaw}" — placed at center of inferred band (y=${y}). Consider adding it to POSITION_TABLE.`);
  return { x: 0.5, y };
}

// Spread players that landed on a near-identical cell (e.g. two plain "CM" both at 0.5,0.45) evenly
// across their band so they don't overlap. Mutates + returns the array.
function spreadCollisions(players: PlacedPlayer[]): PlacedPlayer[] {
  const groups = new Map<string, PlacedPlayer[]>();
  for (const p of players) {
    const key = `${p.y.toFixed(2)}:${p.x.toFixed(2)}`;
    const g = groups.get(key);
    if (g) g.push(p); else groups.set(key, [p]);
  }
  for (const group of groups.values()) {
    const n = group.length;
    if (n < 2) continue;
    const center = group[0].x;
    const step = 0.16;
    group.forEach((p, i) => {
      const x = center + (i - (n - 1) / 2) * step;
      p.x = Math.max(0.06, Math.min(0.94, x));
    });
  }
  return players;
}

// Parse a formation string into its row counts: "4-2-3-1" → [4,2,3,1]; "4-3-3" → [4,3,3].
function parseFormationRows(formation: string): number[] {
  return String(formation || '')
    .split('-')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

const WIDE_MID = new Set(['RM', 'LM', 'MR', 'ML']);
function isWideMid(p: PlacedPlayer): boolean {
  const a = p.abbr.toUpperCase().replace(/[-\s]/g, '');
  return WIDE_MID.has(a) || p.x <= 0.25 || p.x >= 0.75;
}

// COMPACTION PASS (formation-string-aware adjustment layer — NOT a table change). Narrowly gated: a
// "2" first-midfield band that ESPN labelled as two WIDE mids (e.g. France's Koné/Tchouaméni tagged
// LM/RM) plots at the touchlines with a hollow center, which reads wrong for a double pivot. The
// formation string's "2" is the trustworthy signal that this row is a central pair. So we pull them
// in — and ONLY then. Fires when ALL hold: (1) the formation's first midfield band == exactly 2;
// (2) exactly 2 placed players sit in the midfield depth band (y 0.38–0.46); (3) BOTH are wide. A
// genuine 3+ band (4-3-3) or any non-wide pair is left untouched, so legitimate wide mids never move.
function compactDoublePivot(players: PlacedPlayer[], formation: string): PlacedPlayer[] {
  const rows = parseFormationRows(formation);
  if (rows[1] !== 2) return players;                                  // first midfield band must be 2
  const band = players.filter((p) => p.y >= 0.38 && p.y <= 0.46);
  if (band.length !== 2) return players;                             // exactly 2 in the midfield band
  if (!band.every(isWideMid)) return players;                        // both must be wide (else not the broken case)
  const [left, right] = band[0].x <= band[1].x ? [band[0], band[1]] : [band[1], band[0]];
  left.x = 0.38;                                                     // center-split (same as CD-L/CD-R)
  right.x = 0.62;
  return players;
}

// THE entry point. Takes ONE team entry from summary.rosters[] and returns its 11 starters placed on
// the pitch. Filters to starter===true (warns if != 11), maps via the table (+ fallback), spreads
// ties, then applies the narrowly-gated double-pivot compaction using the entry's `formation` string.
export function layoutFormation(teamRoster: any): PlacedPlayer[] {
  const roster: any[] = Array.isArray(teamRoster?.roster) ? teamRoster.roster : [];
  const starters = roster.filter((p) => p?.starter === true);
  if (starters.length !== 11) {
    const who = teamRoster?.team?.displayName ?? 'unknown team';
    console.warn(`[formationLayout] expected 11 starters, got ${starters.length} for ${who}.`);
  }
  const placed: PlacedPlayer[] = starters.map((p) => {
    const abbr = String(p?.position?.abbreviation ?? '').trim();
    const { x, y } = positionToXY(abbr);
    return {
      abbr,
      jersey: String(p?.jersey ?? ''),
      shortName: String(p?.athlete?.shortName ?? p?.athlete?.displayName ?? ''),
      x,
      y,
    };
  });
  const spread = spreadCollisions(placed);
  return compactDoublePivot(spread, String(teamRoster?.formation ?? ''));
}
