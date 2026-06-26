import { GlossaryEntry } from './types';

// Curated golf glossary — 33 terms. Definitions are authored content
// shown verbatim in the tappable-definition box; do not rewrite them. Strings containing an
// apostrophe use double-quoted strings to keep the build safe. `match` is the short matching-
// game tile label.
export const GOLF_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'hole',
    def: 'One section of the course, tee to cup. A full round is usually 18.',
    sport: 'golf',
    match: 'course section',
  },
  {
    term: 'cup',
    def: 'The small hole in the green the ball must finish in.',
    sport: 'golf',
    match: 'final target',
  },
  {
    term: 'green',
    def: 'The very short, smooth grass around the cup where players putt.',
    sport: 'golf',
    match: 'smooth putting area',
  },
  {
    term: 'fairway',
    def: 'The short grass between tee and green — the best place to land.',
    sport: 'golf',
    match: 'best grass path',
  },
  {
    term: 'rough',
    def: 'The longer grass outside the fairway that makes shots harder.',
    sport: 'golf',
    match: 'longer trouble grass',
  },
  {
    term: 'tee',
    def: 'The peg that lifts the ball for the first shot; also the starting area.',
    sport: 'golf',
    match: 'starting spot',
  },
  {
    term: 'par',
    def: 'The expected number of strokes for a hole (par 3, 4, or 5).',
    sport: 'golf',
    match: 'expected score',
  },
  {
    term: 'stroke',
    def: 'One counted swing at the ball; fewer is better.',
    sport: 'golf',
    match: 'counted swing',
  },
  {
    term: 'round',
    def: 'A full set of holes, usually 18, played in one session.',
    sport: 'golf',
    match: 'full course play',
  },
  {
    term: 'birdie',
    def: 'One stroke under par on a hole.',
    sport: 'golf',
    match: 'one under expected',
  },
  {
    term: 'eagle',
    def: 'Two strokes under par — uncommon and impressive.',
    sport: 'golf',
    match: 'two under expected',
  },
  {
    term: 'bogey',
    def: 'One stroke over par on a hole.',
    sport: 'golf',
    match: 'one over expected',
  },
  {
    term: 'double bogey',
    def: 'Two strokes over par on a hole.',
    sport: 'golf',
    match: 'two over expected',
  },
  {
    term: 'ace',
    def: 'A hole-in-one — the ball goes in from the tee shot.',
    sport: 'golf',
    match: 'single-shot score',
  },
  {
    term: 'drive',
    def: 'The opening long shot, usually hit from the tee with a driver.',
    sport: 'golf',
    match: 'opening long shot',
  },
  {
    term: 'approach shot',
    def: 'A shot aimed at getting the ball onto the green.',
    sport: 'golf',
    match: 'shot toward green',
  },
  {
    term: 'chip',
    def: 'A short shot near the green that pops up briefly then rolls.',
    sport: 'golf',
    match: 'short pop-and-roll',
  },
  {
    term: 'pitch',
    def: 'A higher short shot that carries over trouble and lands softly.',
    sport: 'golf',
    match: 'high short shot',
  },
  {
    term: 'putt',
    def: 'A gentle rolling shot on or near the green toward the cup.',
    sport: 'golf',
    match: 'rolling finish shot',
  },
  {
    term: 'bunker',
    def: 'A sand-filled obstacle that makes shots harder.',
    sport: 'golf',
    match: 'sand trouble area',
  },
  {
    term: 'water hazard',
    def: 'A pond, lake, or stream; going in usually means a penalty.',
    sport: 'golf',
    match: 'water trouble area',
  },
  {
    term: 'out of bounds',
    def: 'Outside the playable course; usually a penalty and a replay.',
    sport: 'golf',
    match: 'outside playable area',
  },
  {
    term: 'penalty stroke',
    def: 'An extra stroke added for a rule issue, worsening the score.',
    sport: 'golf',
    match: 'added mistake point',
  },
  {
    term: 'lie',
    def: 'How and where the ball is sitting before a shot.',
    sport: 'golf',
    match: 'ball sitting condition',
  },
  {
    term: 'flagstick',
    def: "The pole-and-flag marking the hole's location on the green.",
    sport: 'golf',
    match: 'visible flag target',
  },
  {
    term: 'caddie',
    def: 'The person who carries the clubs and advises on strategy.',
    sport: 'golf',
    match: "player's course helper",
  },
  {
    term: 'driver',
    def: 'The club for the longest shots, usually off the tee.',
    sport: 'golf',
    match: 'longest-distance club',
  },
  {
    term: 'iron',
    def: 'A club for middle-distance shots toward the green.',
    sport: 'golf',
    match: 'middle-distance club',
  },
  {
    term: 'wedge',
    def: 'A club for short, high shots and tricky spots like sand.',
    sport: 'golf',
    match: 'short high-lift club',
  },
  {
    term: 'putter',
    def: 'The club built for rolling the ball on the green.',
    sport: 'golf',
    match: 'green rolling club',
  },
  {
    term: 'leaderboard',
    def: 'The list of player scores and rankings during a tournament.',
    sport: 'golf',
    match: 'tournament ranking list',
  },
  {
    term: 'cut',
    def: 'The score line deciding who continues after the early rounds.',
    sport: 'golf',
    match: 'survive-to-weekend line',
  },
  {
    term: 'fore',
    def: 'The warning shout when a ball heads toward people.',
    sport: 'golf',
    match: 'watch-out shout',
  },
];
