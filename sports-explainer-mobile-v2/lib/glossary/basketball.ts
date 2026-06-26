import { GlossaryEntry } from './types';

// Curated NBA glossary — 31 terms. Definitions are authored content
// shown verbatim in the tappable-definition box; do not rewrite them. Strings containing an
// apostrophe use double-quoted strings to keep the build safe. `match` is the short matching-
// game tile label.
export const NBA_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'basket',
    def: 'The raised hoop and net where players score. Also used to mean a made score.',
    sport: 'nba',
    match: 'the hoop',
  },
  {
    term: 'field goal',
    def: 'Any made shot during normal play, worth 2 or 3 points. Does not include free throws.',
    sport: 'nba',
    match: 'live-play score',
  },
  {
    term: 'three-pointer',
    def: 'A shot made from behind the long arc, worth 3 points instead of 2.',
    sport: 'nba',
    match: 'long-range score',
  },
  {
    term: 'free throw',
    def: 'An unguarded shot from the line after certain fouls, worth 1 point each.',
    sport: 'nba',
    match: 'one-point shot',
  },
  {
    term: 'layup',
    def: 'A close shot near the basket, usually while moving toward the hoop. One of the most common scores.',
    sport: 'nba',
    match: 'close moving finish',
  },
  {
    term: 'dunk',
    def: 'A shot where a player jumps and pushes the ball down through the rim.',
    sport: 'nba',
    match: 'power rim finish',
  },
  {
    term: 'jump shot',
    def: 'A shot released in the air before landing. Most mid- and long-range shots are jump shots.',
    sport: 'nba',
    match: 'airborne release',
  },
  {
    term: 'rebound',
    def: "Grabbing the ball after a missed shot, giving a fresh chance or ending the other team's.",
    sport: 'nba',
    match: 'missed-shot grab',
  },
  {
    term: 'assist',
    def: 'A pass that directly leads to a teammate scoring.',
    sport: 'nba',
    match: 'scoring setup pass',
  },
  {
    term: 'steal',
    def: 'When a defender legally takes the ball away from the other team.',
    sport: 'nba',
    match: 'defensive takeaway',
  },
  {
    term: 'block',
    def: 'When a defender legally stops a shot before it reaches the basket.',
    sport: 'nba',
    match: 'shot denial',
  },
  {
    term: 'turnover',
    def: 'Losing the ball before getting a shot — a bad pass, steal, or rule mistake.',
    sport: 'nba',
    match: 'lost possession',
  },
  {
    term: 'foul',
    def: 'Illegal contact or action against an opponent, often leading to free throws or lost ball.',
    sport: 'nba',
    match: 'illegal contact',
  },
  {
    term: 'personal foul',
    def: 'A foul charged to an individual player for illegal contact. Too many means disqualification.',
    sport: 'nba',
    match: 'player contact penalty',
  },
  {
    term: 'technical foul',
    def: 'A penalty for conduct rather than playing contact, like arguing with officials.',
    sport: 'nba',
    match: 'conduct penalty',
  },
  {
    term: 'flagrant foul',
    def: 'A serious foul with unnecessary or excessive contact, sometimes leading to ejection.',
    sport: 'nba',
    match: 'dangerous contact',
  },
  {
    term: 'possession',
    def: 'The time one team controls the ball and tries to score.',
    sport: 'nba',
    match: 'team control',
  },
  {
    term: 'shot clock',
    def: 'The countdown limiting how long a team can hold before shooting — 24 seconds in the NBA.',
    sport: 'nba',
    match: '24-second limit',
  },
  {
    term: 'backcourt',
    def: "The half a team is defending. The offense usually can't return there with the ball.",
    sport: 'nba',
    match: 'defensive half',
  },
  {
    term: 'frontcourt',
    def: 'The half a team attacks. Offensive plays run here.',
    sport: 'nba',
    match: 'attacking half',
  },
  {
    term: 'paint',
    def: 'The rectangular area near the basket where many close shots and battles happen.',
    sport: 'nba',
    match: 'crowded inside area',
  },
  {
    term: 'perimeter',
    def: 'The outside area near the three-point line where guards and shooters operate.',
    sport: 'nba',
    match: 'outside scoring area',
  },
  {
    term: 'fast break',
    def: 'A quick attack after a steal, rebound, or turnover, before the defense is set.',
    sport: 'nba',
    match: 'quick transition attack',
  },
  {
    term: 'pick-and-roll',
    def: 'One player screens a defender, then cuts to the basket for a pass. A staple NBA action.',
    sport: 'nba',
    match: 'screen then cut',
  },
  {
    term: 'screen',
    def: 'An offensive player standing still to legally block a defender and free a teammate.',
    sport: 'nba',
    match: 'legal path blocker',
  },
  {
    term: 'isolation',
    def: 'One player attacks a defender one-on-one while teammates clear out.',
    sport: 'nba',
    match: 'one-on-one attack',
  },
  {
    term: 'zone defense',
    def: 'Players guard areas of the court instead of specific opponents.',
    sport: 'nba',
    match: 'area-based guarding',
  },
  {
    term: 'man-to-man defense',
    def: 'Each player guards a specific opponent.',
    sport: 'nba',
    match: 'player-based guarding',
  },
  {
    term: 'buzzer-beater',
    def: 'A shot released just before the clock hits zero that counts.',
    sport: 'nba',
    match: 'last-second shot',
  },
  {
    term: 'overtime',
    def: 'Extra time played when the score is tied after regulation.',
    sport: 'nba',
    match: 'tied-game extra time',
  },
  {
    term: 'and-one',
    def: 'A made basket while fouled, earning one free throw.',
    sport: 'nba',
    match: 'score-plus-foul',
  },
];
