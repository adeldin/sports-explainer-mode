import type { ImageSourcePropType } from 'react-native';

/**
 * Custom icon art, keyed BY THE EMOJI IT REPLACES.
 *
 * WHY KEYED BY EMOJI: the app already carries its icons as emoji in 131 data slots across 8 files
 * (SPORTS, CC_CANDIDATES, academyGames, academyCategories, jeopardy, PIECE_META, …). Keying the
 * registry by the emoji character means NONE of that data has to change — a slot that says '🏈'
 * keeps saying '🏈', and the renderer decides whether to draw the emoji or the artwork. Rewriting
 * 131 literals would have been a one-way door; this is a lookup.
 *
 * ── HOW TO REVERT ────────────────────────────────────────────────────────────────────────────
 * There are four levels, smallest blast radius first:
 *
 *   1. ONE icon, back to emoji      → add its emoji to DISABLED_ICONS below.
 *   2. ONE icon, different art      → replace the PNG in assets/icons/ and rebuild. The filename
 *                                     is the contract, so nothing else changes.
 *   3. ONE icon, previous art       → `git checkout <sha> -- assets/icons/<name>.png`. Every
 *                                     generated PNG is committed, so history IS the archive.
 *   4. EVERYTHING, back to emoji    → set USE_IMAGE_ICONS to false. One line, whole app.
 *
 * Nothing here throws when art is missing: an unmapped or disabled emoji renders as the emoji, so a
 * half-finished set is a valid state and a deleted file degrades instead of crashing.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

/** Master switch. false → the app renders emoji exactly as it did before this system existed. */
export const USE_IMAGE_ICONS = true;

/** Per-icon opt-out. Anything listed here falls back to its emoji even if art exists. */
export const DISABLED_ICONS = new Set<string>([
  // '🧠',  ← example: brain art rejected, keep the emoji
]);

/**
 * The map. `require` is deliberate: Metro resolves these at build time, so a missing file is a
 * BUILD error rather than a blank space at runtime — the failure lands on us, not on a user.
 */
const ART: Record<string, ImageSourcePropType> = {
  // — sports —
  '🏈': require('../assets/icons/football.png'),
  '🏀': require('../assets/icons/basketball.png'),
  '⚽': require('../assets/icons/soccer.png'),
  '⚾': require('../assets/icons/baseball.png'),
  '🏉': require('../assets/icons/rugby.png'),
  '🏒': require('../assets/icons/hockey.png'),
  '🎾': require('../assets/icons/tennis.png'),
  '⛳': require('../assets/icons/golf.png'),
  '🏏': require('../assets/icons/cricket.png'),
  '🤾': require('../assets/icons/handball.png'),

  // — concepts & actions —
  '🎯': require('../assets/icons/target.png'),
  '⏱️': require('../assets/icons/stopwatch.png'),
  '🛡️': require('../assets/icons/shield.png'),
  '📋': require('../assets/icons/clipboard.png'),
  '🚩': require('../assets/icons/flag.png'),
  '🧠': require('../assets/icons/brain.png'),
  '🗣️': require('../assets/icons/speak.png'),
  '🧤': require('../assets/icons/glove.png'),
  '🧢': require('../assets/icons/cap.png'),
  '🏃': require('../assets/icons/runner.png'),
  '⚖️': require('../assets/icons/scales.png'),
  '📏': require('../assets/icons/ruler.png'),
  '📍': require('../assets/icons/pin.png'),
  '🔢': require('../assets/icons/numbers.png'),
  '🔄': require('../assets/icons/swap.png'),
  '📺': require('../assets/icons/tv.png'),
  '⚡': require('../assets/icons/bolt.png'),
  '💥': require('../assets/icons/impact.png'),
  '🚨': require('../assets/icons/alert.png'),
  '👋': require('../assets/icons/wave.png'),
  '🗺️': require('../assets/icons/map.png'),
  '🎙️': require('../assets/icons/mic.png'),
  '🧩': require('../assets/icons/puzzle.png'),
  '🎨': require('../assets/icons/palette.png'),
  '🎪': require('../assets/icons/arena.png'),
  '🌲': require('../assets/icons/tree.png'),
};

/** The artwork for an emoji, or undefined when it should render as the emoji. */
export function iconFor(emoji: string): ImageSourcePropType | undefined {
  if (!USE_IMAGE_ICONS) return undefined;
  if (DISABLED_ICONS.has(emoji)) return undefined;
  // Emoji arrive with and without the VS-16 presentation selector (U+FE0F) depending on where the
  // literal was typed. Normalising here means the data files don't have to be consistent about it.
  return ART[emoji] ?? ART[emoji.replace(/️/g, '')] ?? ART[`${emoji}️`];
}
