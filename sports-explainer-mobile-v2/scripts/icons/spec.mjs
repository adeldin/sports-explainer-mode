// The icon specification — the real deliverable of the style bake-off.
//
// Four rounds established that the PROMPT is what makes a set cohere, not the model:
//   • naming a subject's STRUCTURE fixes it ("a soccer ball" invented panel layouts; naming the
//     black-pentagons-in-white-hexagons geometry produced a correct ball from every provider)
//   • a flat list of allowed colours makes every icon pick differently (a grey clip here, a red
//     button there); assigning each colour a ROLE, in exact hex, holds the set together
//   • those hexes are the APP's, from FieldEngine's FE and the theme — earlier rounds used generic
//     bright orange/blue that would have looked foreign dropped onto the navy UI
//
// Each entry is keyed by the emoji it replaces, so lib/iconAssets.ts can map without touching any
// of the 131 icon slots in the app's data files.

export const PALETTE =
  "STRICT COLOUR RULES — use ONLY these exact colours, each in its stated role: " +
  "outlines and line details are pure black #000000; " +
  "the primary object fill is deep navy #0d1b3e; " +
  "the accent fill is burnt orange #E87722; " +
  "the secondary accent is medium blue #378ADD; " +
  "highlights, paper and skin are off-white #F4F4EE. " +
  "Do NOT use grey, red, yellow, green, purple or any colour outside this list. " +
  "Do not invent shades — no tints, no darker or lighter variants";

export const STYLE =
  "flat minimalist cartoon illustration, bold uniform black outlines of even weight, " +
  "flat solid fills, no gradients, no shading, no shadows, no highlights, clean vector look, " +
  "simple bold chunky shapes that stay readable at 32 pixels, " +
  "absolutely no text, no letters, no numbers, no writing, no logos, no badges, no brand marks, " +
  "no team names, no league marks";

export const FRAME =
  "single object centered, isolated on a plain pure white background, filling most of the frame " +
  "with a small even margin on all sides, nothing cropped by the edge";

// Sports keep their REAL colours — a navy football would be unrecognisable. Everything else uses
// the palette roles. This is the one deliberate exception and it is why `trueColour` exists.
export const ICONS = [
  // ── sports (true colours) ──
  { file: 'football',   emoji: '🏈', trueColour: true, subject: "an American football in classic rich brown leather, white laces along the top seam and a thin white stripe near each end" },
  { file: 'basketball', emoji: '🏀', trueColour: true, subject: "a basketball in classic bright orange with black curved seam lines" },
  { file: 'soccer',     emoji: '⚽', trueColour: true, subject: "a classic soccer ball with the traditional pattern of regular BLACK PENTAGONS each surrounded by WHITE HEXAGONS, coloured only white and black, one black pentagon centered facing the viewer" },
  { file: 'baseball',   emoji: '⚾', trueColour: true, subject: "a baseball in white leather with two curved red stitching seams" },
  { file: 'rugby',      emoji: '🏉', trueColour: true, subject: "a rugby union ball, white with a single bold navy band around the middle, noticeably rounder and fatter than an American football" },
  { file: 'hockey',     emoji: '🏒', trueColour: true, subject: "a black ice-hockey puck lying flat, with a wooden hockey stick angled behind it" },
  { file: 'tennis',     emoji: '🎾', trueColour: true, subject: "a tennis ball in bright yellow-green with a single curved white seam line" },
  { file: 'golf',       emoji: '⛳', trueColour: true, subject: "a golf flag on a thin pole planted in a small green mound, the flag burnt orange #E87722" },
  { file: 'cricket',    emoji: '🏏', trueColour: true, subject: "a red cricket ball with a raised white stitched seam, beside a pale wooden cricket bat" },
  { file: 'handball',   emoji: '🤾', subject: "a single player figure mid-throw, arm raised overhead holding a small ball, body in deep navy #0d1b3e, ball burnt orange #E87722" },

  // ── concepts, actions, objects (palette roles) ──
  { file: 'target',    emoji: '🎯', subject: "a target with three concentric rings: burnt orange #E87722 outer ring, off-white #F4F4EE middle ring, deep navy #0d1b3e bullseye centre, seen straight on" },
  { file: 'stopwatch', emoji: '⏱️', subject: "a stopwatch: a bold circle with a small button and ring on top, two short black hands, an off-white #F4F4EE face with no markings, the case deep navy #0d1b3e and the top button burnt orange #E87722" },
  { file: 'shield',    emoji: '🛡️', subject: "a heraldic shield shape filled deep navy #0d1b3e with a bold black outline and one burnt orange #E87722 chevron across it" },
  { file: 'clipboard', emoji: '📋', subject: "a coach's clipboard: an upright rounded rectangle board in deep navy #0d1b3e with a black clip at the top, holding an off-white #F4F4EE sheet marked ONLY with a few burnt orange #E87722 X shapes, O shapes and one curved dashed arrow — no words" },
  { file: 'flag',      emoji: '🚩', subject: "a referee's penalty flag: a burnt orange #E87722 cloth flag tied in a small knot, mid-air, folds drawn as simple flat shapes" },
  { file: 'brain',     emoji: '🧠', subject: "a human brain seen from ABOVE, perfectly symmetrical, the two hemispheres separated by one clean central line, the surface drawn as a few bold smooth curved black grooves, filled deep navy #0d1b3e, with small burnt orange #E87722 dots and short off-white highlight strokes" },
  { file: 'speak',     emoji: '🗣️', subject: "a side profile of a head in deep navy #0d1b3e speaking, with two curved burnt orange #E87722 sound arcs coming from the mouth" },
  { file: 'glove',     emoji: '🧤', subject: "a baseball catcher's mitt in burnt orange #E87722 with black stitching lines and an off-white webbing panel" },
  { file: 'cap',       emoji: '🧢', subject: "a baseball cap seen from the side, deep navy #0d1b3e crown with a black brim and a plain front panel, NO logo or badge" },
  { file: 'runner',    emoji: '🏃', subject: "a simple running figure in deep navy #0d1b3e mid-stride, arms and legs bent, seen from the side" },
  { file: 'scales',    emoji: '⚖️', subject: "a balance scale: a navy #0d1b3e central post with a horizontal beam and two burnt orange #E87722 pans hanging level" },
  { file: 'ruler',     emoji: '📏', subject: "a straight ruler seen at an angle, off-white #F4F4EE body with black tick marks along one edge and navy #0d1b3e ends, no numbers" },
  { file: 'pin',       emoji: '📍', subject: "a map location pin, burnt orange #E87722 teardrop shape with a navy #0d1b3e circular hole in the centre" },
  { file: 'numbers',   emoji: '🔢', subject: "four small navy #0d1b3e rounded squares in a two-by-two grid, each blank with no numerals, one square burnt orange #E87722" },
  { file: 'swap',      emoji: '🔄', subject: "two curved arrows chasing each other in a circle, one navy #0d1b3e and one burnt orange #E87722" },
  { file: 'tv',        emoji: '📺', subject: "a television set, navy #0d1b3e body with an off-white #F4F4EE blank screen, two short antennae on top" },
  { file: 'bolt',      emoji: '⚡', subject: "a lightning bolt, a bold angular zigzag filled burnt orange #E87722" },
  { file: 'impact',    emoji: '💥', subject: "a comic impact burst, a spiky star shape filled burnt orange #E87722 with a smaller navy #0d1b3e burst inside" },
  { file: 'alert',     emoji: '🚨', subject: "a rotating warning beacon: a navy #0d1b3e base with a burnt orange #E87722 dome and two short light beams either side" },
  { file: 'wave',      emoji: '👋', subject: "an open waving hand, off-white #F4F4EE palm with bold black finger lines and a navy #0d1b3e cuff at the wrist" },
  { file: 'map',       emoji: '🗺️', subject: "a folded map seen at an angle, off-white #F4F4EE with navy #0d1b3e fold lines and one burnt orange #E87722 dotted route" },
  { file: 'mic',       emoji: '🎙️', subject: "a broadcast microphone on a small stand, navy #0d1b3e body with an off-white #F4F4EE mesh head" },
  { file: 'puzzle',    emoji: '🧩', subject: "a single jigsaw puzzle piece, filled burnt orange #E87722 with a bold black outline" },
  { file: 'palette',   emoji: '🎨', subject: "an artist's palette, off-white #F4F4EE oval with a thumb hole and three round paint blobs in navy #0d1b3e, burnt orange #E87722 and medium blue #378ADD" },
  { file: 'arena',     emoji: '🎪', subject: "a stadium seen from outside, a navy #0d1b3e oval bowl with burnt orange #E87722 floodlight towers either side" },
  { file: 'tree',      emoji: '🌲', subject: "a simple evergreen tree, a navy #0d1b3e triangular canopy on a short black trunk" },
];

/** The exact prompt for one icon — the single place prompt assembly happens. */
export function promptFor(icon) {
  // trueColour subjects state their own colours, so the palette's "primary fill is navy" rule would
  // fight them. They still get the STYLE and FRAME rules, which is what keeps them in the family.
  return icon.trueColour
    ? `${icon.subject}. ${STYLE}. ${FRAME}`
    : `${icon.subject}. ${STYLE}. ${PALETTE}. ${FRAME}`;
}
