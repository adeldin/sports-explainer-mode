import { Sport } from './api';

// Per-sport "Common Questions" — the "new to this sport? start here" entry point.
// Tapping a question routes through the existing ask path (askQuestion), so the
// answer adapts to the user's level + language. `label` drives the section heading.
export const SPORT_FAQS: Record<Sport, { label: string; questions: string[] }> = {
  mlb: {
    label: 'Baseball',
    questions: [
      "What's the difference between a ball and a strike?",
      'What does it mean to strike out?',
      "What's an RBI?",
      "What's the infield fly rule?",
      'What does a "full count" mean?',
      'Why do pitchers get taken out of the game?',
      "How long is a game — what's an inning?",
    ],
  },
  nfl: {
    label: 'Football',
    questions: [
      'What does "1st and 10" mean?',
      "What's the difference between a touchdown and a field goal?",
      'Why do teams punt the ball away?',
      "What's a turnover?",
      'What does the quarterback actually do?',
      "What's a sack?",
      "What's the difference between offense and defense?",
    ],
  },
  nba: {
    label: 'Basketball',
    questions: [
      "What's the shot clock and why does it matter?",
      "What's the difference between a 2-pointer and a 3-pointer?",
      "What's a foul, and when do you get free throws?",
      'What does "in the paint" mean?',
      "What's a pick-and-roll?",
      "What's a turnover?",
      "What's a double-double?",
    ],
  },
  nhl: {
    label: 'Hockey',
    questions: [
      'What is icing?',
      "What's offside in hockey?",
      "What's a power play?",
      'Why do players go to the penalty box?',
      "What's a hat trick?",
      'What happens at a face-off?',
      "What does the goalie's job involve?",
    ],
  },
  soccer: {
    label: 'Soccer',
    questions: [
      'What is offside?',
      "What's the difference between a yellow and a red card?",
      "What's a penalty kick?",
      'Why do games sometimes end in a tie?',
      "What's stoppage (injury) time?",
      "What's the difference between a free kick and a corner kick?",
      'What does a "clean sheet" mean?',
    ],
  },
  worldcup: {
    label: 'World Cup',
    questions: [
      'How does the group stage work?',
      "What's the knockout round?",
      'What happens if a knockout game ends in a tie?',
      'What is offside?',
      'What do yellow and red cards mean?',
      'How do countries qualify for the World Cup?',
      'Why is winning the World Cup such a huge deal?',
    ],
  },
  rugby: {
    label: 'Rugby',
    questions: [
      'What\'s a "try" and how many points is it?',
      'How is rugby different from American football?',
      "Why can't you pass the ball forward?",
      "What's a scrum?",
      "What's a lineout?",
      "What's a conversion?",
      "What's a ruck?",
      "What's the difference between rugby union and rugby league?",
    ],
  },
};
