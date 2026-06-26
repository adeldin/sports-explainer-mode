import { GlossaryEntry } from './types';

// Curated tennis glossary — 33 terms. Definitions are authored content
// shown verbatim in the tappable-definition box; do not rewrite them. Strings containing an
// apostrophe use double-quoted strings to keep the build safe. `match` is the short matching-
// game tile label.
export const TENNIS_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'serve',
    def: 'The shot that starts each point, hit from behind the baseline into the service box.',
    sport: 'tennis',
    match: 'point-starting hit',
  },
  {
    term: 'return',
    def: 'The shot hit back after the serve to start the rally.',
    sport: 'tennis',
    match: 'answer to serve',
  },
  {
    term: 'rally',
    def: 'A back-and-forth exchange after the serve until someone misses or wins it.',
    sport: 'tennis',
    match: 'back-and-forth exchange',
  },
  {
    term: 'ace',
    def: 'A legal serve the receiver never touches, winning the point instantly.',
    sport: 'tennis',
    match: 'untouched winning serve',
  },
  {
    term: 'fault',
    def: 'A missed serve that lands outside the box or in the net; the server gets a second try.',
    sport: 'tennis',
    match: 'missed service try',
  },
  {
    term: 'double fault',
    def: 'Two missed serves in a row, giving the point to the receiver.',
    sport: 'tennis',
    match: 'two serve misses',
  },
  {
    term: 'let',
    def: "A serve that clips the net but lands in; it doesn't count and is retaken.",
    sport: 'tennis',
    match: 'net-touch redo',
  },
  {
    term: 'forehand',
    def: "A shot hit on the dominant-hand side, often a player's most powerful groundstroke.",
    sport: 'tennis',
    match: 'strong-side swing',
  },
  {
    term: 'backhand',
    def: 'A shot hit on the opposite side from the forehand, one or two hands.',
    sport: 'tennis',
    match: 'opposite-side swing',
  },
  {
    term: 'groundstroke',
    def: 'A normal shot hit after the ball bounces.',
    sport: 'tennis',
    match: 'bounced-court shot',
  },
  {
    term: 'volley',
    def: 'A shot hit before the ball bounces, usually near the net.',
    sport: 'tennis',
    match: 'no-bounce hit',
  },
  {
    term: 'smash',
    def: 'A hard overhead shot off a high ball, often to finish the point.',
    sport: 'tennis',
    match: 'overhead finish',
  },
  {
    term: 'lob',
    def: 'A high shot lofted over an opponent at the net.',
    sport: 'tennis',
    match: 'high overhit',
  },
  {
    term: 'drop shot',
    def: 'A soft shot landing short to force the opponent to sprint forward.',
    sport: 'tennis',
    match: 'soft short touch',
  },
  {
    term: 'slice',
    def: 'A shot with underspin that stays low or slows after bouncing.',
    sport: 'tennis',
    match: 'low spinning shot',
  },
  {
    term: 'topspin',
    def: 'Forward spin that makes the ball dip and bounce higher.',
    sport: 'tennis',
    match: 'dipping forward spin',
  },
  {
    term: 'point',
    def: 'The smallest unit of scoring; points build games.',
    sport: 'tennis',
    match: 'smallest score unit',
  },
  {
    term: 'game',
    def: 'A scoring unit of points; usually four points and a two-point lead win it.',
    sport: 'tennis',
    match: 'points into score',
  },
  {
    term: 'set',
    def: 'A unit of games; usually six games with a two-game lead, or a tiebreak.',
    sport: 'tennis',
    match: 'games into round',
  },
  {
    term: 'match',
    def: 'The full contest, won by taking the required number of sets.',
    sport: 'tennis',
    match: 'full contest',
  },
  {
    term: 'love',
    def: 'The tennis word for zero in the score.',
    sport: 'tennis',
    match: 'zero score',
  },
  {
    term: 'deuce',
    def: 'A 40-40 tie; a player must win two points in a row from here.',
    sport: 'tennis',
    match: 'late tied score',
  },
  {
    term: 'advantage',
    def: 'The point after deuce, one away from winning the game.',
    sport: 'tennis',
    match: 'one-away edge',
  },
  {
    term: 'break point',
    def: 'A point where the receiver can win the game off the server.',
    sport: 'tennis',
    match: 'chance against server',
  },
  {
    term: 'break',
    def: 'Winning a game while the opponent is serving.',
    sport: 'tennis',
    match: 'win on their serve',
  },
  {
    term: 'hold',
    def: 'Winning your own service game.',
    sport: 'tennis',
    match: 'win on your serve',
  },
  {
    term: 'tiebreak',
    def: 'A special game at 6-6 decided by single points instead of 15/30/40.',
    sport: 'tennis',
    match: 'close-set decider',
  },
  {
    term: 'baseline',
    def: 'The back line at each end where players rally and serve from.',
    sport: 'tennis',
    match: 'back court line',
  },
  {
    term: 'service box',
    def: 'The diagonal target area a serve must land in.',
    sport: 'tennis',
    match: 'serve landing area',
  },
  {
    term: 'net',
    def: 'The barrier across the middle the ball must clear.',
    sport: 'tennis',
    match: 'middle barrier',
  },
  {
    term: 'winner',
    def: "A shot the opponent can't reach, winning the point outright.",
    sport: 'tennis',
    match: 'unreachable clean shot',
  },
  {
    term: 'unforced error',
    def: 'A missed shot not forced by the opponent — an avoidable mistake.',
    sport: 'tennis',
    match: 'avoidable miss',
  },
  {
    term: 'challenge',
    def: 'A request to review a line call with electronic tracking.',
    sport: 'tennis',
    match: 'line-call review',
  },
];
