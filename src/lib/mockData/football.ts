import { FootballPlay, GameState } from '../types/sports';

export const mockFootballGameState: GameState = {
  sport: 'football',
  homeTeam: 'Bears',
  awayTeam: 'Packers',
  homeScore: 14,
  awayScore: 13,
  period: 'Q3',
  timeRemaining: '8:42',
  situation: '2nd & 7 at CHI 35'
};

export const mockFootballPlays: FootballPlay[] = [
  {
    id: 'fb-1',
    timestamp: new Date(),
    sport: 'football',
    playType: 'pass',
    description: '15-yard completion to wide receiver',
    metadata: { 
      down: 2, 
      yardsToGo: 7, 
      yardsGained: 15,
      possession: 'Bears',
      fieldPosition: 'CHI 35'
    }
  },
  {
    id: 'fb-2',
    timestamp: new Date(),
    sport: 'football',
    playType: 'run',
    description: 'Running back up the middle for 4 yards',
    metadata: { 
      down: 1, 
      yardsToGo: 10, 
      yardsGained: 4,
      possession: 'Bears',
      fieldPosition: 'CHI 20'
    }
  },
  {
    id: 'fb-3',
    timestamp: new Date(),
    sport: 'football',
    playType: 'penalty',
    description: 'Defensive pass interference on Packers',
    metadata: { 
      down: 3, 
      yardsToGo: 6, 
      yardsGained: 15,
      possession: 'Bears',
      fieldPosition: 'CHI 16'
    }
  },
  {
    id: 'fb-4',
    timestamp: new Date(),
    sport: 'football',
    playType: 'touchdown',
    description: 'Touchdown pass! Bears score!',
    metadata: { 
      down: 1, 
      yardsToGo: 10, 
      yardsGained: 16,
      possession: 'Bears',
      fieldPosition: 'CHI 16'
    }
  },
  {
    id: 'fb-5',
    timestamp: new Date(),
    sport: 'football',
    playType: 'field_goal',
    description: '42-yard field goal is good',
    metadata: { 
      down: 4, 
      yardsToGo: 8,
      possession: 'Packers',
      fieldPosition: 'GB 25'
    }
  },
  {
    id: 'fb-6',
    timestamp: new Date(),
    sport: 'football',
    playType: 'turnover',
    description: 'Interception by Bears defense!',
    metadata: { 
      down: 2, 
      yardsToGo: 10,
      possession: 'Packers',
      fieldPosition: 'GB 45'
    }
  }
];