// Tolerant team-name normalizer — a MOBILE-SIDE COPY of the backend enricher's matcher
// (src/app/api/explain/highlightlyEnricher.ts: tokenSort + ALIAS + teamKey). Copied rather than
// shared because the backend (src/) and this Expo app are separate packages with no shared module
// path. ⚠️ KEEP ALIAS_GROUPS IN SYNC with the backend copy when either changes.
//
// Why it exists here: the Match Timeline crest match compares an event's Highlightly team NAME
// (e.g. "Spain", "Korea Republic") against the game's ESPN team name. A plain lowercase compare
// fails when the two feeds disagree (abbreviations, diacritics, "South Korea" vs "Korea Republic").
// teamKey() token-sorts, strips diacritics + club-suffix stop-words, and maps known aliases so the
// two names resolve to the same canonical key.

const STOP = new Set(['fc', 'cf', 'sc', 'afc', 'ac', 'club', 'de', 'cd']);

export function tokenSort(name: string): string {
  return (name || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(t => t && !STOP.has(t))
    .sort().join('');
}

// Nations ESPN and Highlightly name differently (token-sort can't bridge these). Each group is
// equivalent raw names; the first is canonical. Extend as more mismatches surface.
const ALIAS_GROUPS: string[][] = [
  ['South Korea', 'Korea Republic'],
  ['Iran', 'IR Iran'],
  ['Ivory Coast', "Côte d'Ivoire"],
  ['United States', 'USA'],
  ['China', 'China PR'],
];
const ALIAS: Record<string, string> = {};
for (const g of ALIAS_GROUPS) { const canon = tokenSort(g[0]); for (const n of g) ALIAS[tokenSort(n)] = canon; }

// Canonical match key: token-sorted, then mapped through the alias table.
export function teamKey(name: string): string {
  const ts = tokenSort(name);
  return ALIAS[ts] || ts;
}
