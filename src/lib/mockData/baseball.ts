import { BaseballPlay, GameState } from '../types/sports';

export const mockBaseballGameState: GameState = {
  sport: 'baseball',
  homeTeam: 'Cubs',
  awayTeam: 'Cardinals',
  homeScore: 4,
  awayScore: 3,
  period: 'Top 7th',
  timeRemaining: undefined, // Baseball doesn't have a clock
  situation: '2 outs, runner on 2nd, 2-1 count'
};

export const mockBaseballPlays: BaseballPlay[] = [
  {
    id: 'bb-1',
    timestamp: new Date(),
    sport: 'baseball',
    playType: 'strikeout',
    description: 'Swinging strike three! Batter is out.',
    metadata: {
      inning: 7,
      outs: 2,
      balls: 2,
      strikes: 2,
      baseRunners: ['2nd'],
      batter: 'Smith',
      pitcher: 'Johnson'
    }
  },
  {
    id: 'bb-2',
    timestamp: new Date(),
    sport: 'baseball',
    playType: 'hit',
    description: 'Line drive single to center field!',
    metadata: {
      inning: 7,
      outs: 1,
      balls: 1,
      strikes: 2,
      baseRunners: ['1st'],
      batter: 'Rodriguez',
      pitcher: 'Johnson'
    }
  },
  {
    id: 'bb-3',
    timestamp: new Date(),
    sport: 'baseball',
    playType: 'home_run',
    description: 'HOME RUN! Deep to left field!',
    metadata: {
      inning: 6,
      outs: 1,
      balls: 3,
      strikes: 1,
      baseRunners: ['1st', '2nd'],
      batter: 'Martinez',
      pitcher: 'Williams'
    }
  },
  {
    id: 'bb-4',
    timestamp: new Date(),
    sport: 'baseball',
    playType: 'walk',
    description: 'Ball four. Batter walks to first base.',
    metadata: {
      inning: 5,
      outs: 2,
      balls: 3,
      strikes: 2,
      baseRunners: [],
      batter: 'Davis',
      pitcher: 'Williams'
    }
  },
  {
    id: 'bb-5',
    timestamp: new Date(),
    sport: 'baseball',
    playType: 'double_play',
    description: 'Ground ball to short! Double play!',
    metadata: {
      inning: 4,
      outs: 0,
      balls: 1,
      strikes: 1,
      baseRunners: ['1st', '2nd'],
      batter: 'Thompson',
      pitcher: 'Anderson'
    }
  },
  {
    id: 'bb-6',
    timestamp: new Date(),
    sport: 'baseball',
    playType: 'stolen_base',
    description: 'Runner steals second base!',
    metadata: {
      inning: 3,
      outs: 1,
      balls: 2,
      strikes: 1,
      baseRunners: ['1st'],
      batter: 'Garcia',
      pitcher: 'Anderson'
    }
  }
];