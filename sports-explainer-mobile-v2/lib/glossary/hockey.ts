import { GlossaryEntry } from './types';

// Curated NHL glossary — 32 terms. Definitions are authored content
// shown verbatim in the tappable-definition box; do not rewrite them. Strings containing an
// apostrophe use double-quoted strings to keep the build safe. `match` is the short matching-
// game tile label.
export const NHL_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'puck',
    def: 'The small black rubber disc players shoot into the net to score.',
    sport: 'nhl',
    match: 'the game disc',
  },
  {
    term: 'stick',
    def: 'The curved tool players use to control, pass, and shoot the puck.',
    sport: 'nhl',
    match: 'puck-handling tool',
  },
  {
    term: 'goal',
    def: 'A score made when the puck fully crosses the line into the net. Worth one point.',
    sport: 'nhl',
    match: 'puck in net',
  },
  {
    term: 'net',
    def: 'The goal frame and mesh the goalie protects.',
    sport: 'nhl',
    match: 'scoring cage',
  },
  {
    term: 'goalie',
    def: 'The player who guards the net and stops shots, wearing larger pads.',
    sport: 'nhl',
    match: 'net protector',
  },
  {
    term: 'save',
    def: 'When the goalie stops a shot from going in.',
    sport: 'nhl',
    match: 'stopped shot',
  },
  {
    term: 'shot on goal',
    def: "A shot that would score if the goalie or frame didn't stop it. Misses wide don't count.",
    sport: 'nhl',
    match: 'on-target attempt',
  },
  {
    term: 'assist',
    def: 'Credit for helping set up a goal with a pass. Up to two per goal.',
    sport: 'nhl',
    match: 'scoring helper',
  },
  {
    term: 'faceoff',
    def: 'The restart where an official drops the puck between two players who battle for it.',
    sport: 'nhl',
    match: 'puck drop battle',
  },
  {
    term: 'blue line',
    def: 'A line separating the middle of the rink from each attacking zone. Key for offside.',
    sport: 'nhl',
    match: 'attack-zone border',
  },
  {
    term: 'red line',
    def: 'The line across the center of the rink, used for icing.',
    sport: 'nhl',
    match: 'center divider',
  },
  {
    term: 'neutral zone',
    def: 'The middle ice between the two blue lines, where teams build speed.',
    sport: 'nhl',
    match: 'middle ice space',
  },
  {
    term: 'offensive zone',
    def: 'The end where a team is trying to score.',
    sport: 'nhl',
    match: 'attacking end',
  },
  {
    term: 'defensive zone',
    def: 'The end where a team protects its own net.',
    sport: 'nhl',
    match: 'protecting end',
  },
  {
    term: 'offside',
    def: 'When an attacker enters the offensive zone before the puck does. Play stops.',
    sport: 'nhl',
    match: 'early zone entry',
  },
  {
    term: 'icing',
    def: 'Shooting the puck from your own side all the way past the far goal line untouched.',
    sport: 'nhl',
    match: 'long clear violation',
  },
  {
    term: 'power play',
    def: 'When one team has more skaters because the other has a player in the box.',
    sport: 'nhl',
    match: 'extra-player advantage',
  },
  {
    term: 'penalty kill',
    def: 'When a team is short a skater and defends until the penalty ends.',
    sport: 'nhl',
    match: 'short-handed defense',
  },
  {
    term: 'penalty box',
    def: 'Where a penalized player sits while their team plays short.',
    sport: 'nhl',
    match: 'punishment seat',
  },
  {
    term: 'minor penalty',
    def: 'A common two-minute penalty; the team usually plays short-handed.',
    sport: 'nhl',
    match: 'two-minute punishment',
  },
  {
    term: 'major penalty',
    def: 'A serious five-minute penalty for dangerous actions.',
    sport: 'nhl',
    match: 'five-minute punishment',
  },
  {
    term: 'slashing',
    def: 'Hitting an opponent illegally with the stick.',
    sport: 'nhl',
    match: 'illegal stick hit',
  },
  {
    term: 'tripping',
    def: 'Causing an opponent to fall by taking out their legs.',
    sport: 'nhl',
    match: 'knocked-down skater',
  },
  {
    term: 'slap shot',
    def: 'A hard shot with a big backswing, the fastest shot type.',
    sport: 'nhl',
    match: 'hardest shot',
  },
  {
    term: 'wrist shot',
    def: 'A quick, accurate shot flicked with the wrists.',
    sport: 'nhl',
    match: 'quick-flick shot',
  },
  {
    term: 'checking',
    def: 'Using the body legally to separate an opponent from the puck.',
    sport: 'nhl',
    match: 'body contact play',
  },
  {
    term: 'forecheck',
    def: "Pressure in the other team's end to force a turnover.",
    sport: 'nhl',
    match: 'attacking pressure',
  },
  {
    term: 'backcheck',
    def: 'Skating back toward your own net to break up an attack.',
    sport: 'nhl',
    match: 'chase-back defense',
  },
  {
    term: 'breakaway',
    def: 'When a player gets behind the defense, alone against the goalie.',
    sport: 'nhl',
    match: 'alone on goalie',
  },
  {
    term: 'empty net',
    def: 'Pulling the goalie for an extra skater, leaving the net open.',
    sport: 'nhl',
    match: 'unguarded goal setup',
  },
  {
    term: 'line change',
    def: 'Swapping tired players for fresh ones; shifts are short.',
    sport: 'nhl',
    match: 'fresh-legs swap',
  },
  {
    term: 'overtime',
    def: 'Extra time when the score is tied after regulation.',
    sport: 'nhl',
    match: 'tied-game extra time',
  },
];
