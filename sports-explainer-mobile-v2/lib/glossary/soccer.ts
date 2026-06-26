import { GlossaryEntry } from './types';

// Curated soccer glossary — 33 terms. Definitions are authored content
// shown verbatim in the tappable-definition box; do not rewrite them. Strings containing an
// apostrophe use double-quoted strings to keep the build safe. `match` is the short matching-
// game tile label.
export const SOCCER_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'ball',
    def: 'The round object players pass, dribble, and kick to score.',
    sport: 'soccer',
    match: 'the game ball',
  },
  {
    term: 'goal',
    def: 'A score when the whole ball crosses the line between the posts, under the bar. Worth one point.',
    sport: 'soccer',
    match: 'ball in net',
  },
  {
    term: 'goalkeeper',
    def: 'The player who guards the goal and can use hands inside their own penalty area.',
    sport: 'soccer',
    match: 'net protector',
  },
  {
    term: 'defender',
    def: 'A player whose main job is to stop the other team scoring, playing near their own goal.',
    sport: 'soccer',
    match: 'goal-side stopper',
  },
  {
    term: 'midfielder',
    def: 'A player who works between defense and attack, linking the two ends.',
    sport: 'soccer',
    match: 'middle-field connector',
  },
  {
    term: 'forward',
    def: "A player whose main job is to attack and score, playing nearest the opponent's goal.",
    sport: 'soccer',
    match: 'main attacker',
  },
  {
    term: 'striker',
    def: 'A forward focused on finishing chances, usually central.',
    sport: 'soccer',
    match: 'central finisher',
  },
  {
    term: 'save',
    def: 'When the goalkeeper stops a shot from becoming a goal.',
    sport: 'soccer',
    match: 'stopped attempt',
  },
  {
    term: 'shot',
    def: 'An attempt to score by kicking or heading toward goal.',
    sport: 'soccer',
    match: 'scoring attempt',
  },
  {
    term: 'shot on target',
    def: "A shot that would score if a defender or keeper didn't stop it. Wide or over doesn't count.",
    sport: 'soccer',
    match: 'on-frame attempt',
  },
  {
    term: 'pass',
    def: 'Deliberately moving the ball to a teammate.',
    sport: 'soccer',
    match: 'teammate delivery',
  },
  {
    term: 'cross',
    def: 'A ball played from a wide area toward the middle in front of goal.',
    sport: 'soccer',
    match: 'wide goal delivery',
  },
  {
    term: 'through ball',
    def: 'A pass into open space behind the defense for a teammate to run onto.',
    sport: 'soccer',
    match: 'space-splitting pass',
  },
  {
    term: 'dribble',
    def: 'Moving with the ball under close control to beat defenders or carry it forward.',
    sport: 'soccer',
    match: 'close-control run',
  },
  {
    term: 'header',
    def: 'Playing the ball with the head to pass, clear, or score.',
    sport: 'soccer',
    match: 'head contact play',
  },
  {
    term: 'tackle',
    def: 'A legal attempt to win the ball from an opponent.',
    sport: 'soccer',
    match: 'ball-winning challenge',
  },
  {
    term: 'clearance',
    def: 'Kicking or heading the ball away from danger near your own goal.',
    sport: 'soccer',
    match: 'danger removal',
  },
  {
    term: 'possession',
    def: 'When a team controls the ball and builds an attack.',
    sport: 'soccer',
    match: 'ball control',
  },
  {
    term: 'counterattack',
    def: 'A fast attack right after winning the ball, before the defense sets.',
    sport: 'soccer',
    match: 'quick break forward',
  },
  {
    term: 'offside',
    def: 'A rule stopping attackers from waiting too far ahead before the ball is played to them.',
    sport: 'soccer',
    match: 'too-far-ahead attack',
  },
  {
    term: 'foul',
    def: 'Illegal contact like tripping, pushing, or holding, giving the other team a restart.',
    sport: 'soccer',
    match: 'illegal contact',
  },
  {
    term: 'handball',
    def: 'Deliberately touching the ball with hand or arm; can give a free or penalty kick.',
    sport: 'soccer',
    match: 'illegal arm touch',
  },
  {
    term: 'free kick',
    def: 'A restart awarded after a foul, kicked from the spot of the call.',
    sport: 'soccer',
    match: 'foul restart',
  },
  {
    term: 'penalty kick',
    def: 'A one-on-one shot from the spot for a foul inside the penalty area.',
    sport: 'soccer',
    match: 'close-range punishment',
  },
  {
    term: 'penalty area',
    def: 'The big box in front of each goal where keepers use hands and penalties are given.',
    sport: 'soccer',
    match: "the keeper's box",
  },
  {
    term: 'corner kick',
    def: 'A restart from the corner after the defense last touched a ball over their goal line.',
    sport: 'soccer',
    match: 'corner restart',
  },
  {
    term: 'goal kick',
    def: 'A restart from inside the box after the attack put the ball over the goal line.',
    sport: 'soccer',
    match: 'defensive restart',
  },
  {
    term: 'throw-in',
    def: 'A two-handed restart from the sideline after the ball goes out.',
    sport: 'soccer',
    match: 'sideline restart',
  },
  {
    term: 'yellow card',
    def: 'A formal warning; two in a match means a red.',
    sport: 'soccer',
    match: 'official warning',
  },
  {
    term: 'red card',
    def: "A sending-off — the player leaves and isn't replaced.",
    sport: 'soccer',
    match: 'player ejection',
  },
  {
    term: 'substitution',
    def: 'Replacing one player with another for rest, tactics, or injury.',
    sport: 'soccer',
    match: 'player swap',
  },
  {
    term: 'stoppage time',
    def: "Extra minutes added at a half's end for time lost to delays.",
    sport: 'soccer',
    match: 'added minutes',
  },
  {
    term: 'penalty shootout',
    def: 'A tiebreaker after extra time — players take turns from the spot.',
    sport: 'soccer',
    match: 'spot-kick tiebreaker',
  },
];
