// Curated glossary — shared entry type for the tappable-definition layer (Step B).
// Client-side only; independent of the backend / ExplanationResponse.

// Sports that currently have a curated glossary. (Baseball & football first, per the
// Step B plan; widen this union as more sports get term lists.)
export type GlossarySport = 'mlb' | 'nfl';

export interface GlossaryEntry {
  // Display headword shown (bold) in the definition box, e.g. "splitter".
  term: string;
  // The one-to-two-line definition, shown verbatim (authored content — not rewritten).
  def: string;
  // Which sport's glossary this belongs to.
  sport: GlossarySport;
  // Optional alternate surface forms that should ALSO match and reveal THIS term's
  // definition (plurals / conjugations / common phrasings), e.g. strikeout →
  // ["struck out", "strikes out"]. Matching is whole-word and case-insensitive (see
  // the Stage-2 segmenter); add aliases only for high-traffic terms whose
  // conjugated/plural forms actually show up in explanation text.
  aliases?: string[];
}
